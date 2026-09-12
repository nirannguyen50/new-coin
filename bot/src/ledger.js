'use strict';

/**
 * ledger.js — Sổ cái điểm LIXI off-chain + các hàm nghiệp vụ thuần (pure).
 *
 * ============================================================================
 * INTERFACE "Ledger" (per docs/11-quyet-dinh-bot-off-chain-truoc.md)
 * ============================================================================
 * Mục tiêu: lớp lưu điểm off-chain (JsonLedger, file này) và lớp gọi hợp đồng
 * token thật sau này (OnChainLedger, chưa viết) dùng CHUNG một interface, để
 * chuyển từ off-chain sang on-chain là đổi 1 module, không viết lại bot/lệnh.
 *
 * Một Ledger implementation PHẢI cung cấp các phương thức sau (chatId, userId
 * là string hoặc number; amount luôn là số nguyên dương, đơn vị "điểm LIXI"
 * hoặc sau này "token LIXI" quy đổi theo decimals của contract):
 *
 *   - getBalance(chatId, userId): number
 *       Trả về số dư hiện tại của userId trong nhóm chatId.
 *
 *   - credit(chatId, userId, amount, meta): Transaction
 *       Cộng `amount` điểm cho userId (ví dụ: admin nạp pot, thưởng hoạt động,
 *       hoàn tiền bao lì xì không ai nhận hết). Với OnChainLedger, việc này sẽ
 *       tương ứng với ghi nhận sau khi có xác nhận on-chain đủ số block.
 *
 *   - debit(chatId, userId, amount, meta): Transaction
 *       Trừ `amount` điểm của userId; phải throw LedgerError code
 *       INSUFFICIENT_BALANCE nếu không đủ số dư. KHÔNG cho số dư âm.
 *
 *   - transfer(chatId, fromUserId, toUserId, amount, meta): {from, to}
 *       debit(from) rồi credit(to) trong một lần ghi (cùng transaction nhóm).
 *       Phải throw nếu fromUserId === toUserId (SELF_TRANSFER).
 *
 *   - recordTransaction(chatId, tx): Transaction
 *       Ghi một bản ghi lịch sử tùy ý (ví dụ: yêu cầu rút, log admin) không
 *       trực tiếp đổi số dư (số dư được đổi riêng bằng credit/debit).
 *
 *   - listRecentTransactions(chatId, userId, limit = 10): Transaction[]
 *       Trả về tối đa `limit` giao dịch gần nhất liên quan tới userId (gửi
 *       hoặc nhận), mới nhất trước.
 *
 * OnChainLedger tương lai sẽ implement lại đúng 5 phương thức trên bằng cách
 * gọi contracts/ (ví nóng, BscScan) thay vì đọc/viết file JSON, và có thể bổ
 * sung thêm việc chờ số block xác nhận trước khi credit — điều đó nằm trong
 * OnChainLedger, không ảnh hưởng lệnh bot hay logic chống lạm dụng ở trên.
 * ============================================================================
 */

const store = require('./store');

/** Lỗi nghiệp vụ có mã (code) để command layer dịch sang thông báo tiếng Việt. */
class LedgerError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = 'LedgerError';
    this.code = code;
  }
}

// ----------------------------------------------------------------------------
// Hằng số ngày, giúp test không phụ thuộc múi giờ thật của máy chạy test.
// ----------------------------------------------------------------------------
const DAY_MS = 24 * 60 * 60 * 1000;

/** Khóa ngày dạng YYYY-MM-DD theo UTC, dùng làm key cho hạn mức/ngày và thưởng/ngày. */
function dateKey(nowMs) {
  return new Date(nowMs).toISOString().slice(0, 10);
}

// ----------------------------------------------------------------------------
// Pure helpers trên state của một nhóm (không đọc/viết file — nhận state làm
// tham số, trả về / mutate state được truyền vào, để unit test dễ dàng).
// ----------------------------------------------------------------------------

/** Lấy (hoặc tạo mới) member record cho userId; đánh dấu firstSeenAt nếu là lần đầu. */
function ensureMember(state, userId, nowMs = Date.now()) {
  state.members = state.members || {};
  const key = String(userId);
  if (!state.members[key]) {
    state.members[key] = {
      userId: key,
      balance: 0,
      firstSeenAt: nowMs,
      lastCommandAt: 0,
      displayName: null, // tên để hiển thị trong tin nhắn (first_name, hoặc username)
      username: null, // @username công khai nếu có (không bắt buộc)
      dailyTipUsed: {}, // dateKey -> tổng điểm đã tip trong ngày
      messageCounts: {}, // dateKey -> số tin nhắn hợp lệ trong ngày
    };
  }
  return state.members[key];
}

// ----------------------------------------------------------------------------
// Tên hiển thị của thành viên — để tin nhắn nói "Đã cấp 2000 điểm cho Lan" thay vì
// "cho #985735377" (người đọc không biết số đó là ai).
//
// Tên là DỮ LIỆU KHÔNG TIN CẬY: người dùng tự đặt first_name/username trên Telegram,
// nên có thể chứa `<`, `>`, `&` hoặc dài hàng trăm ký tự. Vì vậy:
//   - luôn cắt bớt khoảng trắng và giới hạn độ dài (MAX_DISPLAY_NAME_LENGTH) trước khi
//     lưu, để một cái tên cố ý dài không phình bản ghi/dòng database;
//   - lớp lệnh PHẢI bọc `escapeHtml(...)` quanh kết quả `memberLabel` trước khi ghép
//     vào tin nhắn HTML (xem src/commands/*.js). Hàm ở đây trả về chuỗi THÔ.
// ----------------------------------------------------------------------------

/** Độ dài tối đa của tên hiển thị được lưu (ký tự). */
const MAX_DISPLAY_NAME_LENGTH = 64;

/**
 * Chuẩn hoá một cái tên do người dùng tự đặt: gộp khoảng trắng, cắt hai đầu, giới hạn
 * độ dài. Trả về `null` nếu sau khi chuẩn hoá không còn gì (chuỗi rỗng, chỉ khoảng
 * trắng, hoặc không phải chuỗi).
 */
function normalizeDisplayName(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object') return null;
  const collapsed = String(raw).replace(/\s+/g, ' ').trim();
  if (!collapsed) return null;
  const capped = collapsed.slice(0, MAX_DISPLAY_NAME_LENGTH).trim();
  return capped || null;
}

/**
 * Tên hiển thị suy ra từ một đối tượng user của Telegram: ưu tiên `first_name`, sau đó
 * `username`, không có gì thì `null` (KHÔNG bao giờ trả về số id — số id là thứ ta đang
 * muốn tránh hiện ra).
 */
function displayNameFromUser(user) {
  if (!user || typeof user !== 'object') return null;
  return normalizeDisplayName(user.first_name) || normalizeDisplayName(user.username) || null;
}

/**
 * "Đã thấy" một thành viên KÈM tên: ensureMember + cập nhật lại tên mỗi lần gặp, nên
 * người đổi tên trên Telegram thì lần sau bot gọi đúng tên mới.
 *
 * Chỉ ghi khi có tên thật: một update thiếu `first_name`/`username` KHÔNG được xoá cái
 * tên đã biết trước đó.
 *
 * @param {object} state state của nhóm
 * @param {{id: string|number, first_name?: string, username?: string}} user user Telegram
 * @returns {object|null} member record, hoặc null nếu `user` không có id.
 */
function rememberMember(state, user, nowMs = Date.now()) {
  if (!user || user.id === undefined || user.id === null) return null;
  const member = ensureMember(state, user.id, nowMs);
  const displayName = displayNameFromUser(user);
  if (displayName) member.displayName = displayName;
  const username = normalizeDisplayName(user.username);
  if (username) member.username = username;
  return member;
}

/**
 * Tên để hiển thị cho `userId` trong nhóm này — HÀM THUẦN, trả về chuỗi THÔ (lớp lệnh
 * phải `escapeHtml` trước khi đưa vào tin nhắn HTML).
 *
 * Số id chỉ xuất hiện khi thật sự CHƯA có tên nào trên sổ (thành viên cũ từ trước khi
 * bot lưu tên, hoặc người chưa từng nhắn gì kể từ lúc nâng cấp) — lần tới họ xuất hiện
 * là tên được ghi vào và các tin nhắn sau đó gọi đúng tên.
 */
function memberLabel(state, userId) {
  const key = String(userId);
  const member = state && state.members ? state.members[key] : null;
  if (member) {
    const name = normalizeDisplayName(member.displayName) || normalizeDisplayName(member.username);
    if (name) return name;
  }
  return `người dùng #${key}`;
}

function getBalance(state, userId) {
  const key = String(userId);
  return state.members && state.members[key] ? state.members[key].balance : 0;
}

function assertPositiveInteger(amount, code, label = 'Số điểm') {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new LedgerError(code, `${label} phải là số nguyên dương.`);
  }
}

function nextId(state, counterField) {
  const id = state[counterField] || 1;
  state[counterField] = id + 1;
  return id;
}

/** Ghi một bản ghi giao dịch vào lịch sử (không tự đổi số dư). */
/**
 * Danh sach DUY NHAT cac loai giao dich. Them loai moi thi phai them o day VA them
 * nhan tieng Viet trong TX_LABELS (bot/src/commands/wallet.js), neu khong nguoi dung
 * se thay ma noi bo kieu "envelope_hold" trong /lichsu. Co test chan viec nay.
 */
const TX_TYPES = Object.freeze([
  'tip',
  'transfer',
  'credit',
  'debit',
  'reward',
  'admin_credit',
  'envelope_hold',
  'envelope_claim',
  'envelope_refund',
  'withdrawal_hold',
  'withdrawal_refund',
]);

function recordTransactionPure(state, tx, nowMs = Date.now()) {
  // Chi chan khi chay test: production khong bao gio vo vi mot nhan bi thieu.
  if (process.env.NODE_ENV === 'test' && tx && tx.type && !TX_TYPES.includes(tx.type)) {
    throw new Error(
      `Loai giao dich la: "${tx.type}". Them vao TX_TYPES (ledger.js) va TX_LABELS (wallet.js).`
    );
  }
  state.transactions = state.transactions || [];
  const id = nextId(state, 'nextTxId');
  const full = { id, ts: nowMs, ...tx };
  state.transactions.push(full);
  return full;
}

/** Cộng điểm cho userId + ghi lịch sử. meta.type mô tả loại giao dịch (credit/reward/...). */
function creditPure(state, userId, amount, meta = {}, nowMs = Date.now()) {
  assertPositiveInteger(amount, 'INVALID_AMOUNT');
  const member = ensureMember(state, userId, nowMs);
  member.balance += amount;
  return recordTransactionPure(
    state,
    { type: meta.type || 'credit', to: String(userId), amount, ...meta },
    nowMs
  );
}

/** Trừ điểm của userId; throw INSUFFICIENT_BALANCE nếu không đủ. */
function debitPure(state, userId, amount, meta = {}, nowMs = Date.now()) {
  assertPositiveInteger(amount, 'INVALID_AMOUNT');
  const member = ensureMember(state, userId, nowMs);
  if (member.balance < amount) {
    throw new LedgerError(
      'INSUFFICIENT_BALANCE',
      `Số dư không đủ: có ${member.balance}, cần ${amount}.`
    );
  }
  member.balance -= amount;
  return recordTransactionPure(
    state,
    { type: meta.type || 'debit', from: String(userId), amount, ...meta },
    nowMs
  );
}

/** Chuyển điểm giữa hai thành viên trong cùng nhóm. */
function transferPure(state, fromUserId, toUserId, amount, meta = {}, nowMs = Date.now()) {
  if (String(fromUserId) === String(toUserId)) {
    throw new LedgerError('SELF_TRANSFER', 'Không thể tự chuyển điểm cho chính mình.');
  }
  assertPositiveInteger(amount, 'INVALID_AMOUNT');
  const fromTx = debitPure(state, fromUserId, amount, { type: meta.type || 'transfer', to: String(toUserId), ...meta }, nowMs);
  const toTx = creditPure(state, toUserId, amount, { type: meta.type || 'transfer', from: String(fromUserId), ...meta }, nowMs);
  return { fromTx, toTx };
}

/** Lấy tối đa `limit` giao dịch gần nhất liên quan tới userId, mới nhất trước. */
function listRecentTransactionsPure(state, userId, limit = 10) {
  const key = String(userId);
  const all = state.transactions || [];
  const related = all.filter((tx) => tx.from === key || tx.to === key);
  return related.slice(-limit).reverse();
}

// ----------------------------------------------------------------------------
// Chống lạm dụng — mỗi hàm là một pure function nhỏ, test độc lập được.
// ----------------------------------------------------------------------------

/** Kiểm tra hạn mức tip/ngày/người còn lại có đủ cho `amount` không. */
function checkDailyTipLimit(state, userId, amount, nowMs = Date.now()) {
  const limit = state.config.dailyTipLimitPerUser;
  const key = String(userId);
  const day = dateKey(nowMs);
  const used = (state.members[key] && state.members[key].dailyTipUsed[day]) || 0;
  const remaining = limit - used;
  return { ok: amount <= remaining, limit, used, remaining: Math.max(0, remaining), day };
}

/** Ghi nhận đã dùng `amount` điểm tip trong ngày hiện tại (gọi sau khi tip thành công). */
function recordDailyTipUsage(state, userId, amount, nowMs = Date.now()) {
  const member = ensureMember(state, userId, nowMs);
  const day = dateKey(nowMs);
  member.dailyTipUsed[day] = (member.dailyTipUsed[day] || 0) + amount;
  return member.dailyTipUsed[day];
}

/** Kiểm tra cooldown giữa hai lệnh của cùng một người trong nhóm. */
function checkCooldown(state, userId, nowMs = Date.now()) {
  const cooldownMs = state.config.cooldownSeconds * 1000;
  const key = String(userId);
  const member = state.members && state.members[key];
  const last = member ? member.lastCommandAt : 0;
  const waitMs = cooldownMs - (nowMs - last);
  return { ok: waitMs <= 0, waitMs: Math.max(0, waitMs) };
}

/** Ghi nhận thời điểm chạy lệnh mới nhất của userId (dùng để tính cooldown lần sau). */
function recordCommandTime(state, userId, nowMs = Date.now()) {
  const member = ensureMember(state, userId, nowMs);
  member.lastCommandAt = nowMs;
}

/** Kiểm tra userId đã "ở trong nhóm" (firstSeenAt) đủ số ngày tối thiểu chưa. */
function checkMinAccountAge(state, userId, nowMs = Date.now()) {
  const minDays = state.config.minAccountAgeDays;
  const key = String(userId);
  const member = state.members && state.members[key];
  // Chưa từng thấy user này trong nhóm -> coi như tuổi = 0, chưa đủ điều kiện.
  const firstSeenAt = member ? member.firstSeenAt : nowMs;
  const ageMs = nowMs - firstSeenAt;
  const ok = ageMs >= minDays * DAY_MS;
  return { ok, ageDays: ageMs / DAY_MS, minDays };
}

/** Địa chỉ có đúng định dạng BEP-20/EVM (0x + 40 hex) không — KHÔNG kiểm tra on-chain. */
function isValidBep20Address(address) {
  return typeof address === 'string' && /^0x[0-9a-fA-F]{40}$/.test(address);
}

/** Giao dịch có vượt ngưỡng cần admin duyệt trước khi thực hiện không. */
function needsAdminApproval(state, amount) {
  return amount > state.config.adminApprovalThreshold;
}

/** Đưa một giao dịch vào hàng đợi chờ admin duyệt (chưa thực hiện). */
function queueApproval(state, approval, nowMs = Date.now()) {
  state.pendingApprovals = state.pendingApprovals || [];
  const id = nextId(state, 'nextApprovalId');
  const full = { id, status: 'pending', createdAt: nowMs, ...approval };
  state.pendingApprovals.push(full);
  return full;
}

// ----------------------------------------------------------------------------
// Hàng đợi chờ admin duyệt cho giao dịch tip lớn (vượt adminApprovalThreshold).
// Không thực hiện transfer ngay — chỉ ghi hàng đợi; admin approve/reject sau.
// ----------------------------------------------------------------------------

/** Đưa một lượt tip vượt ngưỡng vào hàng đợi chờ duyệt (chưa trừ/cộng điểm ai cả). */
function queueTipApproval(state, fromUserId, toUserId, amount, nowMs = Date.now()) {
  return queueApproval(
    state,
    { type: 'tip', fromUserId: String(fromUserId), toUserId: String(toUserId), amount },
    nowMs
  );
}

/** Admin duyệt một giao dịch đang chờ trong hàng đợi -> thực hiện transfer thật lúc này. */
function approveQueuedTransfer(state, approvalId, adminId, nowMs = Date.now()) {
  const approval = (state.pendingApprovals || []).find((a) => a.id === Number(approvalId) || a.id === approvalId);
  if (!approval) {
    throw new LedgerError('APPROVAL_NOT_FOUND', 'Không tìm thấy giao dịch đang chờ duyệt với mã này.');
  }
  if (approval.status !== 'pending') {
    throw new LedgerError('APPROVAL_ALREADY_DECIDED', 'Giao dịch này đã được xử lý trước đó.');
  }
  if (approval.type === 'tip') {
    transferPure(
      state,
      approval.fromUserId,
      approval.toUserId,
      approval.amount,
      { type: 'tip', note: 'Tip khoản lớn đã được admin duyệt' },
      nowMs
    );
    recordDailyTipUsage(state, approval.fromUserId, approval.amount, nowMs);
  } else {
    throw new LedgerError('UNKNOWN_APPROVAL_TYPE', `Không hỗ trợ loại giao dịch chờ duyệt: ${approval.type}`);
  }
  approval.status = 'approved';
  approval.decidedAt = nowMs;
  approval.decidedBy = String(adminId);
  return approval;
}

/** Admin từ chối một giao dịch đang chờ trong hàng đợi -> không có gì được thực hiện. */
function rejectQueuedTransfer(state, approvalId, adminId, nowMs = Date.now()) {
  const approval = (state.pendingApprovals || []).find((a) => a.id === Number(approvalId) || a.id === approvalId);
  if (!approval) {
    throw new LedgerError('APPROVAL_NOT_FOUND', 'Không tìm thấy giao dịch đang chờ duyệt với mã này.');
  }
  if (approval.status !== 'pending') {
    throw new LedgerError('APPROVAL_ALREADY_DECIDED', 'Giao dịch này đã được xử lý trước đó.');
  }
  approval.status = 'rejected';
  approval.decidedAt = nowMs;
  approval.decidedBy = String(adminId);
  return approval;
}

// ----------------------------------------------------------------------------
// Rút điểm (yêu cầu rút) — v0 KHÔNG chuyển tiền thật, chỉ ghi trạng thái pending
// và giữ (debit ngay) số điểm để tránh người dùng chi tiêu trùng trong lúc chờ.
// ----------------------------------------------------------------------------

/** Tạo yêu cầu rút: kiểm tra định dạng địa chỉ, giữ điểm (debit ngay), trạng thái 'pending'. */
function createWithdrawalRequest(state, userId, address, amount, nowMs = Date.now()) {
  if (!isValidBep20Address(address)) {
    throw new LedgerError(
      'INVALID_ADDRESS',
      'Địa chỉ ví không đúng định dạng BEP-20/EVM (phải là 0x + 40 ký tự hex).'
    );
  }
  assertPositiveInteger(amount, 'INVALID_AMOUNT');
  debitPure(
    state,
    userId,
    amount,
    { type: 'withdrawal_hold', note: 'Giữ điểm chờ admin xử lý yêu cầu rút' },
    nowMs
  );
  const id = String(nextId(state, 'nextWithdrawalId'));
  const record = {
    id,
    userId: String(userId),
    address,
    amount,
    status: 'pending', // pending | approved | rejected
    createdAt: nowMs,
    decidedAt: null,
    decidedBy: null,
  };
  state.withdrawals = state.withdrawals || [];
  state.withdrawals.push(record);
  return record;
}

/** Admin duyệt hoặc từ chối một yêu cầu rút đang 'pending'. Không chuyển tiền thật khi approve. */
function decideWithdrawal(state, withdrawalId, decision, adminId, nowMs = Date.now()) {
  const record = (state.withdrawals || []).find((w) => w.id === String(withdrawalId));
  if (!record) {
    throw new LedgerError('WITHDRAWAL_NOT_FOUND', 'Không tìm thấy yêu cầu rút với mã này.');
  }
  if (record.status !== 'pending') {
    throw new LedgerError('WITHDRAWAL_ALREADY_DECIDED', 'Yêu cầu rút này đã được xử lý trước đó.');
  }
  if (decision === 'approve') {
    record.status = 'approved';
  } else if (decision === 'reject') {
    record.status = 'rejected';
    creditPure(
      state,
      record.userId,
      record.amount,
      { type: 'withdrawal_refund', withdrawalId: record.id, note: 'Hoàn điểm do yêu cầu rút bị từ chối' },
      nowMs
    );
  } else {
    throw new LedgerError('INVALID_DECISION', "Quyết định phải là 'approve' hoặc 'reject'.");
  }
  record.decidedAt = nowMs;
  record.decidedBy = String(adminId);
  return record;
}

// ----------------------------------------------------------------------------
// Bao lì xì (envelope) — chia ngẫu nhiên + claim + hoàn tiền khi hết giờ.
// ----------------------------------------------------------------------------

/**
 * Chia `amount` điểm ngẫu nhiên cho `n` người, mỗi phần >= 1, tổng đúng bằng amount.
 * Dùng "stick-breaking": random n-1 điểm cắt trong [0, amount-n], khoảng cách giữa
 * các điểm cắt (đã sắp xếp) là phần "thêm" cho mỗi người, cộng với phần nền 1 mỗi người.
 * `rng` là hàm trả số thực [0,1) — cho phép truyền rng xác định (seeded) khi test.
 */
function splitEnvelope(amount, n, rng = Math.random) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new LedgerError('INVALID_AMOUNT', 'Số điểm lì xì phải là số nguyên dương.');
  }
  if (!Number.isInteger(n) || n <= 0) {
    throw new LedgerError('INVALID_RECIPIENT_COUNT', 'Số người nhận phải là số nguyên dương.');
  }
  if (n > amount) {
    throw new LedgerError(
      'TOO_MANY_RECIPIENTS_FOR_AMOUNT',
      'Số người nhận không thể nhiều hơn số điểm lì xì (mỗi người tối thiểu 1 điểm).'
    );
  }

  const shares = new Array(n).fill(1);
  const remainder = amount - n;

  if (remainder > 0) {
    if (n === 1) {
      shares[0] += remainder;
    } else {
      const cuts = [];
      for (let i = 0; i < n - 1; i++) cuts.push(rng() * remainder);
      cuts.sort((a, b) => a - b);
      const bounds = [0, ...cuts, remainder];
      for (let i = 0; i < n; i++) {
        shares[i] += Math.round(bounds[i + 1] - bounds[i]);
      }
      // Làm tròn có thể lệch tổng đi vài đơn vị -> chỉnh lại cho khớp chính xác amount.
      let diff = amount - shares.reduce((s, x) => s + x, 0);
      let guard = 0;
      while (diff !== 0 && guard < n * 4 + 8) {
        const idx = guard % n;
        if (diff > 0) {
          shares[idx] += 1;
          diff -= 1;
        } else if (shares[idx] > 1) {
          shares[idx] -= 1;
          diff += 1;
        }
        guard += 1;
      }
    }
  }

  // Xáo thứ tự để phần lớn/nhỏ không tương ứng cố định với thứ tự claim.
  for (let i = shares.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = shares[i];
    shares[i] = shares[j];
    shares[j] = tmp;
  }

  return shares;
}

/**
 * Tạo một envelope record mới (chưa persist) — command layer sẽ lưu vào
 * state.envelopes[id] và lên lịch hết giờ (setTimeout, xem bot.js).
 */
function createEnvelope(state, { senderId, senderName, amount, recipientCount, windowMs, rng }, nowMs = Date.now()) {
  const shares = splitEnvelope(amount, recipientCount, rng);
  const id = String(nextId(state, 'nextEnvelopeId'));
  const envelope = {
    id,
    senderId: String(senderId),
    senderName: senderName || null,
    totalAmount: amount,
    totalRecipients: recipientCount,
    shares,
    claims: {}, // userId -> amount nhận được
    claimOrder: [],
    status: 'active', // active | completed | expired
    createdAt: nowMs,
    expiresAt: nowMs + windowMs,
    messageId: null, // gán sau khi bot gửi tin nhắn kèm nút bấm
  };
  state.envelopes = state.envelopes || {};
  state.envelopes[id] = envelope;
  return envelope;
}

/** Một người bấm nút "Nhận lì xì" — trả {ok, amount, completed} hoặc {ok:false, reason}. */
function claimEnvelope(envelope, userId, nowMs = Date.now()) {
  const key = String(userId);
  if (envelope.status !== 'active') {
    return { ok: false, reason: 'closed' };
  }
  if (nowMs > envelope.expiresAt) {
    return { ok: false, reason: 'expired' };
  }
  if (key === envelope.senderId) {
    return { ok: false, reason: 'self' };
  }
  if (Object.prototype.hasOwnProperty.call(envelope.claims, key)) {
    return { ok: false, reason: 'already_claimed' };
  }
  if (envelope.claimOrder.length >= envelope.totalRecipients) {
    return { ok: false, reason: 'full' };
  }
  const idx = envelope.claimOrder.length;
  const amount = envelope.shares[idx];
  envelope.claims[key] = amount;
  envelope.claimOrder.push(key);
  const completed = envelope.claimOrder.length >= envelope.totalRecipients;
  if (completed) envelope.status = 'completed';
  return { ok: true, amount, completed };
}

/**
 * Nhận lì xì VÀ cộng điểm cho người nhận, trong cùng một lần ghi state.
 *
 * `claimEnvelope` ở trên chỉ ghi vào bản ghi bao lì xì (ai nhận phần nào) — nó không
 * biết tới state của nhóm nên không cộng được số dư. Hàm này ghép hai việc lại:
 * người gửi đã bị trừ đủ `totalAmount` lúc mở bao (`envelope_hold`), nên mỗi phần được
 * nhận phải được cộng vào số dư người nhận, phần không ai nhận sẽ hoàn lại cho người
 * gửi lúc hết giờ (`settleExpiredEnvelope`). Nhờ vậy tổng điểm trong nhóm không đổi.
 */
function claimEnvelopeAndCredit(state, envelopeId, userId, nowMs = Date.now()) {
  const envelope = state.envelopes && state.envelopes[String(envelopeId)];
  if (!envelope) return { ok: false, reason: 'not_found' };
  const result = claimEnvelope(envelope, userId, nowMs);
  if (result.ok) {
    creditPure(
      state,
      userId,
      result.amount,
      { type: 'envelope_claim', envelopeId: envelope.id, note: 'Nhận bao lì xì' },
      nowMs
    );
  }
  return result;
}

/**
 * Hết giờ (hoặc gọi thủ công) mà bao lì xì chưa nhận hết -> hoàn lại phần chưa nhận
 * cho người gửi. Idempotent: gọi nhiều lần trên envelope đã 'expired'/'completed' không
 * hoàn tiền lần hai.
 */
function settleExpiredEnvelope(state, envelope, nowMs = Date.now()) {
  if (envelope.status === 'completed' || envelope.status === 'expired') {
    return { refunded: 0 };
  }
  const claimedCount = envelope.claimOrder.length;
  const unclaimedShares = envelope.shares.slice(claimedCount);
  const refundAmount = unclaimedShares.reduce((s, x) => s + x, 0);
  if (refundAmount > 0) {
    creditPure(
      state,
      envelope.senderId,
      refundAmount,
      { type: 'envelope_refund', envelopeId: envelope.id, note: 'Hoàn điểm bao lì xì hết giờ chưa nhận hết' },
      nowMs
    );
  }
  envelope.status = 'expired';
  return { refunded: refundAmount };
}

/**
 * "Dọn lười" (lazy settlement): đóng MỌI bao lì xì của nhóm đã quá giờ và hoàn phần
 * chưa ai nhận cho người gửi.
 *
 * VÌ SAO CẦN: bản cũ hẹn giờ đóng bao bằng `setTimeout` trong RAM của tiến trình bot.
 * Trên môi trường serverless (Vercel) KHÔNG có tiến trình chạy liên tục — hàm chỉ sống
 * vài giây rồi tắt, nên `setTimeout` không bao giờ chạy. Thay vào đó:
 *   (a) mỗi khi có bất kỳ hoạt động nào trong nhóm, gọi hàm này TRƯỚC (dọn lười), và
 *   (b) một cron chạy mỗi ngày quét toàn bộ nhóm làm lưới an toàn (xem api/cron.js).
 *
 * Idempotent: bao đã 'completed'/'expired' không bị hoàn tiền lần hai.
 * Trả về danh sách các bao vừa được đóng: [{ id, refunded }].
 */
function settleDueEnvelopes(state, nowMs = Date.now()) {
  const settled = [];
  for (const envelope of Object.values(state.envelopes || {})) {
    if (envelope.status !== 'active') continue;
    if (envelope.expiresAt > nowMs) continue;
    const { refunded } = settleExpiredEnvelope(state, envelope, nowMs);
    settled.push({ id: envelope.id, refunded, messageId: envelope.messageId });
  }
  return settled;
}

// ----------------------------------------------------------------------------
// Thưởng hoạt động hằng ngày — idempotent theo (group, date).
// ----------------------------------------------------------------------------

/** Ghi nhận một tin nhắn hợp lệ (không phải lệnh) của userId trong ngày hiện tại. */
function recordMessage(state, userId, nowMs = Date.now()) {
  const member = ensureMember(state, userId, nowMs);
  const day = dateKey(nowMs);
  member.messageCounts[day] = (member.messageCounts[day] || 0) + 1;
}

/**
 * Chạy phát thưởng hoạt động cho ngày `dateStr` (mặc định = hôm nay theo nowMs).
 * Idempotent: nếu ngày này đã chạy rồi (state.rewardGrants[dateStr] tồn tại) thì
 * KHÔNG cấp lại, trả về { alreadyRan: true, grants: <kết quả lần chạy trước> }.
 * Chạy lại hàm này nhiều lần trong ngày (do interval "for beta scale only") an toàn.
 *
 * Thưởng được trả từ `state.pot.balance` (admin nạp bằng /nap), giới hạn thêm bởi
 * `state.config.dailyRewardBudgetPerGroup` (hạn mức chi/ngày/nhóm) — hết cái nào
 * trước thì dừng ở đó. Nếu pot không đủ, một số thành viên đủ điều kiện có thể
 * không được thưởng ngày đó (admin cần /nap thêm).
 */
function runDailyReward(state, dateStr, nowMs = Date.now()) {
  state.rewardGrants = state.rewardGrants || {};
  if (Object.prototype.hasOwnProperty.call(state.rewardGrants, dateStr)) {
    return { alreadyRan: true, grants: state.rewardGrants[dateStr] };
  }

  const rule = state.rewardRule;
  const grants = {};

  if (rule && rule.pointsPerDay > 0 && rule.minMessages > 0) {
    state.pot = state.pot || { balance: 0 };
    let budgetLeft = Math.min(state.config.dailyRewardBudgetPerGroup, state.pot.balance);
    // Sắp xếp theo userId để thứ tự phát thưởng ổn định/dự đoán được khi hết budget.
    const userIds = Object.keys(state.members || {}).sort();
    for (const userId of userIds) {
      const member = state.members[userId];
      const msgCount = member.messageCounts[dateStr] || 0;
      if (msgCount < rule.minMessages) continue;
      if (budgetLeft <= 0) continue;
      const amount = Math.min(rule.pointsPerDay, budgetLeft);
      if (amount <= 0) continue;
      state.pot.balance -= amount;
      creditPure(
        state,
        userId,
        amount,
        { type: 'reward', note: `Thưởng hoạt động ngày ${dateStr} (>= ${rule.minMessages} tin nhắn)` },
        nowMs
      );
      grants[userId] = amount;
      budgetLeft -= amount;
    }
  }

  state.rewardGrants[dateStr] = grants;
  return { alreadyRan: false, grants };
}

// ----------------------------------------------------------------------------
// Pot nhóm + log admin cấp điểm — /pot và /nap (per docs/11: thay "nạp on-chain"
// bằng "admin cấp điểm trực tiếp qua lệnh admin, ghi log").
// ----------------------------------------------------------------------------

function getPotBalance(state) {
  return (state.pot && state.pot.balance) || 0;
}

/** Tổng số dư hiện có của mọi thành viên trong nhóm (mọi điểm đang lưu hành đều bắt
 * nguồn từ admin cấp/thưởng, vì hệ thống off-chain không có nguồn điểm nào khác). */
function getTotalCirculatingBalance(state) {
  return Object.values(state.members || {}).reduce((sum, m) => sum + m.balance, 0);
}

/** Admin "nạp pot": tăng reserve chung của nhóm (chưa gán cho ai), dùng để phát thưởng. */
function adminCreditPot(state, adminId, amount, note, nowMs = Date.now()) {
  assertPositiveInteger(amount, 'INVALID_AMOUNT');
  state.pot = state.pot || { balance: 0 };
  state.pot.balance += amount;
  const logEntry = {
    ts: nowMs,
    adminId: String(adminId),
    target: 'pot',
    amount,
    note: note || 'Nạp pot (thủ công/off-chain)',
  };
  state.adminCreditLog = state.adminCreditLog || [];
  state.adminCreditLog.push(logEntry);
  recordTransactionPure(state, { type: 'admin_credit', to: 'pot', amount, note: logEntry.note }, nowMs);
  return logEntry;
}

/** Admin cấp điểm trực tiếp cho một thành viên cụ thể (không rút từ pot). */
function adminCreditUser(state, adminId, userId, amount, note, nowMs = Date.now()) {
  const tx = creditPure(
    state,
    userId,
    amount,
    { type: 'admin_credit', note: note || 'Admin cấp điểm trực tiếp' },
    nowMs
  );
  const logEntry = {
    ts: nowMs,
    adminId: String(adminId),
    target: String(userId),
    amount,
    note: tx.note,
  };
  state.adminCreditLog = state.adminCreditLog || [];
  state.adminCreditLog.push(logEntry);
  return logEntry;
}

// ----------------------------------------------------------------------------
// Cấu hình chống lạm dụng theo từng nhóm (lệnh /caidat).
//
// `defaultConfig()` trong store.js chỉ là mặc định; mỗi nhóm có thể chỉnh riêng.
// Phần dưới đây là logic THUẦN: nhận state + chuỗi người dùng gõ, trả về kết quả,
// không nói chuyện với Telegram và không biết mình đang ghi vào JSON hay Postgres
// (cả hai kho đều lưu `state.config`, nên chỉ cần sửa state là xong).
// ----------------------------------------------------------------------------

/**
 * Bỏ dấu tiếng Việt + hạ chữ thường + bỏ mọi ký tự không phải chữ/số.
 * Nhờ vậy "thamnien", "ThamNien", "thâm niên", "thâm-niên" đều thành "thamnien".
 */
function normalizeConfigAlias(raw) {
  return String(raw == null ? '' : raw)
    .normalize('NFD') // tách chữ và dấu thành hai ký tự
    .replace(/[\u0300-\u036f]/g, '') // xoá dấu (huyền, sắc, hỏi, ngã, nặng, mũ, móc...)
    .toLowerCase()
    .replace(/đ/g, 'd') // "đ" KHÔNG bị NFD tách ra nên phải thay riêng
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Mô tả từng khoá cấu hình: tên tiếng Việt ngắn (alias) để admin gõ nhanh, đơn vị,
 * giải thích một dòng, và khoảng giá trị cho phép.
 *
 * Vì sao có chặn trên/chặn dưới: đây là các con số chống lạm dụng, gõ sai một chữ số
 * (ví dụ cooldown 30000 giây) sẽ làm nhóm đứng im mà admin không hiểu vì sao.
 * Chặn dưới luôn >= 0 nên KHÔNG bao giờ lưu được số âm.
 */
const CONFIG_SPECS = [
  {
    key: 'minAccountAgeDays',
    aliases: ['thamnien', 'tuoinhom'],
    unit: 'ngày',
    description:
      'Phải ở trong nhóm bao nhiêu ngày mới được dùng lệnh chuyển điểm (/lixi, /rut).',
    min: 0,
    max: 30,
    zeroWarning:
      'Đặt 0 nghĩa là người vừa vào nhóm đã tip được ngay — TẮT lớp chắn tài khoản ảo/nick mới lập ra để nhận lì xì. Chỉ dùng khi đang thử nghiệm, đừng để 0 ở nhóm công khai.',
  },
  {
    key: 'cooldownSeconds',
    aliases: ['cooldown', 'chodoi'],
    unit: 'giây',
    description: 'Một người phải chờ bao nhiêu giây giữa hai lệnh.',
    min: 0,
    max: 300,
    zeroWarning:
      'Đặt 0 nghĩa là một người có thể gõ lệnh liên tục không giới hạn — TẮT lớp chắn spam/bot. Chỉ dùng khi đang thử nghiệm, đừng để 0 ở nhóm công khai.',
  },
  {
    key: 'dailyTipLimitPerUser',
    aliases: ['hanmuctip'],
    unit: 'điểm/ngày/người',
    description: 'Mỗi người tip được tối đa bao nhiêu điểm trong một ngày.',
    min: 0,
    max: 10000000,
  },
  {
    key: 'dailyRewardBudgetPerGroup',
    aliases: ['ngansachthuong'],
    unit: 'điểm/ngày/nhóm',
    description: 'Cả nhóm phát thưởng hoạt động tối đa bao nhiêu điểm trong một ngày.',
    min: 0,
    max: 10000000,
  },
  {
    key: 'maxEnvelopeRecipients',
    aliases: ['songuoinhan'],
    unit: 'người',
    description: 'Một bao lì xì chia được cho tối đa bao nhiêu người.',
    min: 1,
    max: 100,
  },
  {
    key: 'adminApprovalThreshold',
    aliases: ['nguongduyet'],
    unit: 'điểm',
    description: 'Giao dịch lớn hơn mức này phải chờ admin duyệt (/duyet, /tuchoi).',
    min: 0,
    max: 10000000,
  },
  {
    key: 'envelopeWindowMinutes',
    aliases: ['thoigianbao'],
    unit: 'phút',
    description: 'Bao lì xì mở bao nhiêu phút trước khi hết giờ và hoàn điểm cho người gửi.',
    min: 1,
    max: 1440,
  },
];

const CONFIG_SPEC_BY_KEY = new Map(CONFIG_SPECS.map((spec) => [spec.key, spec]));

/** normalize(alias hoặc tên khoá thật) -> tên khoá thật. Dựng một lần lúc nạp module. */
const CONFIG_ALIAS_INDEX = (() => {
  const index = new Map();
  for (const spec of CONFIG_SPECS) {
    index.set(normalizeConfigAlias(spec.key), spec.key);
    for (const alias of spec.aliases) {
      index.set(normalizeConfigAlias(alias), spec.key);
    }
  }
  return index;
})();

/** Tên khoá thật ứng với thứ admin vừa gõ, hoặc null nếu không nhận ra. */
function resolveConfigKey(raw) {
  return CONFIG_ALIAS_INDEX.get(normalizeConfigAlias(raw)) || null;
}

/** Danh sách alias ngắn để in ra khi admin gõ sai khoá. */
function listConfigAliases() {
  return CONFIG_SPECS.map((spec) => spec.aliases[0]);
}

/** Cấu hình hiện tại của nhóm kèm đơn vị + giải thích, để lệnh /caidat in ra. */
function describeConfig(state) {
  const config = { ...store.defaultConfig(), ...((state && state.config) || {}) };
  return CONFIG_SPECS.map((spec) => ({
    key: spec.key,
    alias: spec.aliases[0],
    value: config[spec.key],
    unit: spec.unit,
    description: spec.description,
    min: spec.min,
    max: spec.max,
  }));
}

/**
 * Đổi MỘT khoá cấu hình của nhóm (mutate `state.config`) + ghi vào log admin.
 *
 * Không throw: mọi lỗi đều trả về trong `error` để lớp lệnh dịch thẳng thành câu
 * trả lời tiếng Việt.
 *
 * @param {object} state  state của nhóm (JSON hoặc Postgres đều cùng hình dạng)
 * @param {string} key    alias hoặc tên khoá thật admin vừa gõ
 * @param {string|number} rawValue giá trị thô admin vừa gõ
 * @param {{adminId?: string|number, nowMs?: number}} [opts]
 * @returns {{ok: boolean, key: string|null, oldValue: number|undefined,
 *            newValue: number|undefined, unit?: string, warning?: string|null,
 *            logEntry?: object, error: {code: string, message: string}|null}}
 */
function applyConfigChange(state, key, rawValue, opts = {}) {
  const nowMs = opts.nowMs || Date.now();
  const resolved = resolveConfigKey(key);
  if (!resolved) {
    return {
      ok: false,
      key: null,
      oldValue: undefined,
      newValue: undefined,
      error: {
        code: 'UNKNOWN_CONFIG_KEY',
        message:
          `Không có mục cấu hình "${String(key == null ? '' : key).trim()}". ` +
          `Các mục dùng được: ${listConfigAliases().join(', ')}.`,
      },
    };
  }
  const spec = CONFIG_SPEC_BY_KEY.get(resolved);
  const text = String(rawValue == null ? '' : rawValue).trim();
  const range = `từ ${spec.min} đến ${spec.max} ${spec.unit}`;

  if (!/^[+-]?\d+$/.test(text)) {
    return {
      ok: false,
      key: resolved,
      oldValue: undefined,
      newValue: undefined,
      error: {
        code: 'NOT_AN_INTEGER',
        message:
          `Giá trị của "${spec.aliases[0]}" phải là SỐ NGUYÊN (không chữ, không dấu phẩy, ` +
          `không số thập phân). Cho phép ${range}.`,
      },
    };
  }

  const value = Number.parseInt(text, 10);
  if (!Number.isSafeInteger(value) || value < spec.min || value > spec.max) {
    return {
      ok: false,
      key: resolved,
      oldValue: undefined,
      newValue: undefined,
      error: {
        code: 'OUT_OF_RANGE',
        message: `Giá trị của "${spec.aliases[0]}" chỉ được ${range} (bạn vừa nhập ${text}).`,
      },
    };
  }

  state.config = { ...store.defaultConfig(), ...(state.config || {}) };
  const oldValue = state.config[resolved];
  state.config[resolved] = value;

  // Ghi vào ĐÚNG log mà /nap dùng, để /pot hiện ai đổi gì lúc nào.
  // Bảng log chỉ có các cột ts/adminId/target/amount/note (xem postgres-store.js),
  // nên khoá + giá trị cũ + giá trị mới được đặt trong `target` và `note`.
  const logEntry = {
    ts: nowMs,
    adminId: String(opts.adminId == null ? 'system' : opts.adminId),
    target: `config:${resolved}`,
    amount: value,
    note: `đổi cấu hình ${resolved}: ${oldValue} → ${value} (${spec.unit})`,
  };
  state.adminCreditLog = state.adminCreditLog || [];
  state.adminCreditLog.push(logEntry);

  return {
    ok: true,
    key: resolved,
    oldValue,
    newValue: value,
    unit: spec.unit,
    warning: value === 0 && spec.zeroWarning ? spec.zeroWarning : null,
    logEntry,
    error: null,
  };
}

// ----------------------------------------------------------------------------
// JsonLedger — implementation của interface "Ledger" bằng file JSON (store.js).
// Đây là phần "impure" duy nhất: đọc/viết state qua store.withGroupState.
// ----------------------------------------------------------------------------

class JsonLedger {
  getBalance(chatId, userId) {
    return store.withGroupState(chatId, (state) => getBalance(state, userId));
  }

  credit(chatId, userId, amount, meta = {}) {
    return store.withGroupState(chatId, (state) => creditPure(state, userId, amount, meta));
  }

  debit(chatId, userId, amount, meta = {}) {
    return store.withGroupState(chatId, (state) => debitPure(state, userId, amount, meta));
  }

  transfer(chatId, fromUserId, toUserId, amount, meta = {}) {
    return store.withGroupState(chatId, (state) =>
      transferPure(state, fromUserId, toUserId, amount, meta)
    );
  }

  recordTransaction(chatId, tx) {
    return store.withGroupState(chatId, (state) => recordTransactionPure(state, tx));
  }

  listRecentTransactions(chatId, userId, limit = 10) {
    return store.withGroupState(chatId, (state) => listRecentTransactionsPure(state, userId, limit));
  }
}

module.exports = {
  LedgerError,
  TX_TYPES,
  JsonLedger,
  DAY_MS,
  dateKey,
  ensureMember,
  MAX_DISPLAY_NAME_LENGTH,
  normalizeDisplayName,
  displayNameFromUser,
  rememberMember,
  memberLabel,
  getBalance,
  creditPure,
  debitPure,
  transferPure,
  recordTransactionPure,
  listRecentTransactionsPure,
  checkDailyTipLimit,
  recordDailyTipUsage,
  checkCooldown,
  recordCommandTime,
  checkMinAccountAge,
  isValidBep20Address,
  needsAdminApproval,
  queueApproval,
  queueTipApproval,
  approveQueuedTransfer,
  rejectQueuedTransfer,
  createWithdrawalRequest,
  decideWithdrawal,
  splitEnvelope,
  createEnvelope,
  claimEnvelope,
  claimEnvelopeAndCredit,
  settleExpiredEnvelope,
  settleDueEnvelopes,
  recordMessage,
  runDailyReward,
  getPotBalance,
  getTotalCirculatingBalance,
  adminCreditPot,
  adminCreditUser,
  CONFIG_SPECS,
  normalizeConfigAlias,
  resolveConfigKey,
  listConfigAliases,
  describeConfig,
  applyConfigChange,
};
