'use strict';

/**
 * store.js — Lưu trữ JSON file theo nhóm (per-group), có ghi atomic (write-then-rename).
 *
 * Mỗi nhóm Telegram (chatId) có một file riêng: bot/data/groups/<chatId>.json
 * (thư mục `data/` bị gitignore — không commit dữ liệu người dùng).
 *
 * Ghi atomic: viết ra file tạm (<file>.tmp) rồi `rename` sang tên thật. `rename` trên cùng
 * một filesystem là atomic ở cấp hệ điều hành, nên nếu tiến trình bị crash giữa lúc viết,
 * file .json cũ vẫn còn nguyên vẹn (không bao giờ có file .json half-written).
 *
 * KHÔNG dùng dependency native-compiled (better-sqlite3, ...) để giữ khả năng chạy trên
 * hosting rẻ/free tier không có toolchain build C++. Đây chỉ là JS thuần + fs của Node.
 *
 * Giới hạn đã biết: mỗi lệnh đọc/viết cả file JSON của nhóm. Với vài chục thành viên và
 * vài nghìn giao dịch (đủ cho 3 nhóm pilot) thì rất nhanh; KHÔNG phù hợp nếu số nhóm hoặc
 * số giao dịch tăng lên nhiều (nên chuyển sang SQLite/Postgres/OnChainLedger khi đó).
 *
 * ===========================================================================
 * TODO (bước kế tiếp, BẮT BUỘC trước khi mời người thật dùng trên Render):
 * thay kho lưu trữ file JSON này bằng một kho DỮ LIỆU BỀN VỮNG ngoài tiến trình —
 * Postgres miễn phí (ví dụ Neon/Supabase/Render Postgres free) hoặc Redis miễn phí
 * (ví dụ Upstash) — implement ĐÚNG interface `Ledger` mô tả ở đầu `src/ledger.js`
 * (getBalance, credit, debit, transfer, recordTransaction, listRecentTransactions),
 * đúng tinh thần `docs/11-quyet-dinh-bot-off-chain-truoc.md`: đổi một module lưu trữ,
 * KHÔNG sửa lệnh bot và không sửa logic chống lạm dụng.
 *
 * Lý do gấp: gói miễn phí của Render KHÔNG có đĩa bền vững (no persistent disk) —
 * toàn bộ `bot/data/` bị xoá sạch sau mỗi lần restart/redeploy/spin down. Khi chưa
 * làm xong việc này, dữ liệu điểm chạy trên Render chỉ mang tính tạm thời.
 * Chưa implement trong lần thay đổi này (cố ý), xem `bot/README.md` mục
 * "Chạy 24/7 miễn phí trên Render".
 * ===========================================================================
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'groups');

/** Cấu hình chống lạm dụng mặc định — có thể chỉnh riêng theo từng nhóm qua lệnh admin. */
function defaultConfig() {
  return {
    dailyTipLimitPerUser: 500, // hạn mức tip/ngày/người (điểm)
    dailyRewardBudgetPerGroup: 1000, // hạn mức phát thưởng/ngày/nhóm (điểm)
    cooldownSeconds: 3, // cooldown giữa hai lệnh của cùng một người
    maxEnvelopeRecipients: 50, // số người nhận tối đa mỗi bao lì xì
    minAccountAgeDays: 3, // số ngày tối thiểu "đã ở trong nhóm" để dùng lệnh chuyển điểm
    adminApprovalThreshold: 2000, // giao dịch lớn hơn mức này phải chờ admin duyệt
    envelopeWindowMinutes: 10, // thời gian chờ nhận bao lì xì
  };
}

function defaultGroupState(chatId) {
  return {
    chatId: String(chatId),
    members: {}, // userId(string) -> member record (xem ledger.js)
    transactions: [], // lịch sử giao dịch, mới nhất ở cuối
    nextTxId: 1,
    envelopes: {}, // envelopeId(string) -> envelope record đang hoạt động hoặc đã đóng
    nextEnvelopeId: 1,
    withdrawals: [], // yêu cầu rút: {id, userId, address, amount, status, ...}
    nextWithdrawalId: 1,
    pot: { balance: 0 }, // "pot" nhóm: reserve admin nạp thủ công, dùng để phát thưởng hoạt động
    adminCreditLog: [], // log các lần admin "nạp pot"/cấp điểm thủ công
    rewardRule: null, // { pointsPerDay, minMessages, updatedAt, updatedBy } | null
    rewardGrants: {}, // dateStr -> { userId: amount } — dùng để chống phát thưởng 2 lần/ngày
    pendingApprovals: [], // giao dịch lớn đang chờ admin duyệt: {id, type, ...}
    nextApprovalId: 1,
    config: defaultConfig(),
  };
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function groupFilePath(chatId) {
  return path.join(DATA_DIR, `${chatId}.json`);
}

/** Đọc state của một nhóm; nếu chưa có file thì trả về state mặc định (chưa ghi ra đĩa). */
function readGroupState(chatId) {
  ensureDataDir();
  const file = groupFilePath(chatId);
  const fallback = defaultGroupState(chatId);
  if (!fs.existsSync(file)) {
    return fallback;
  }
  const raw = fs.readFileSync(file, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Không đọc được file dữ liệu nhóm ${chatId} (${file}): ${err.message}`);
  }
  // Trộn với default để các field mới thêm sau này (nâng cấp bot) không bị "undefined".
  return {
    ...fallback,
    ...parsed,
    config: { ...fallback.config, ...(parsed.config || {}) },
  };
}

/** Ghi state của một nhóm ra đĩa, atomic (write temp file + rename). */
function writeGroupState(chatId, state) {
  ensureDataDir();
  const file = groupFilePath(chatId);
  const tmp = path.join(DATA_DIR, `.${chatId}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

/** Danh sách chatId đã có dữ liệu (dùng cho job thưởng hoạt động chạy mỗi ngày). */
function listGroupIds() {
  ensureDataDir();
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.json') && !f.startsWith('.'))
    .map((f) => f.slice(0, -'.json'.length));
}

/**
 * Đọc state, cho `mutator` sửa trực tiếp (mutate) rồi ghi lại — toàn bộ chạy đồng bộ
 * (fs.*Sync) nên không có await ở giữa, tránh race condition giữa hai lệnh cùng lúc
 * cho cùng một nhóm trong một tiến trình Node.
 */
function withGroupState(chatId, mutator) {
  const state = readGroupState(chatId);
  const result = mutator(state);
  writeGroupState(chatId, state);
  return result;
}

/**
 * "Ghi nốt" dữ liệu còn đang chờ trước khi tắt tiến trình.
 *
 * Hiện tại MỌI thao tác ghi đều đồng bộ (fs.writeFileSync + fs.renameSync) và xong ngay
 * trong lệnh gọi `withGroupState`, nên không có gì nằm chờ trong bộ nhớ — hàm này không
 * phải làm gì. Vẫn giữ hàm để `registerShutdownHandlers` gọi tường minh: khi sau này
 * chuyển sang ghi bất đồng bộ hoặc sang database ngoài (xem TODO ở đầu file), chỉ cần
 * thêm phần "flush" ở đây mà không phải sửa luồng tắt máy.
 *
 * @returns {{pending: number}} số thao tác ghi còn chờ (luôn là 0 với bản file JSON).
 */
function flushPendingWrites() {
  return { pending: 0 };
}

module.exports = {
  DATA_DIR,
  flushPendingWrites,
  defaultConfig,
  defaultGroupState,
  ensureDataDir,
  groupFilePath,
  readGroupState,
  writeGroupState,
  listGroupIds,
  withGroupState,
};
