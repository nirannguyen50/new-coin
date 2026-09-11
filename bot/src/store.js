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

module.exports = {
  DATA_DIR,
  defaultConfig,
  defaultGroupState,
  ensureDataDir,
  groupFilePath,
  readGroupState,
  writeGroupState,
  listGroupIds,
  withGroupState,
};
