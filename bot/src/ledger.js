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
      dailyTipUsed: {}, // dateKey -> tổng điểm đã tip trong ngày
      messageCounts: {}, // dateKey -> số tin nhắn hợp lệ trong ngày
    };
  }
  return state.members[key];
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
function recordTransactionPure(state, tx, nowMs = Date.now()) {
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
  JsonLedger,
  DAY_MS,
  dateKey,
  ensureMember,
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
  settleExpiredEnvelope,
  recordMessage,
  runDailyReward,
  getPotBalance,
  getTotalCirculatingBalance,
  adminCreditPot,
  adminCreditUser,
};
