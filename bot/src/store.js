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
 * ĐÃ CÓ KHO BỀN VỮNG — KHI NÀO DÙNG FILE NÀY, KHI NÀO DÙNG POSTGRES
 * ===========================================================================
 * Kho JSON này giờ chỉ là MỘT trong hai lựa chọn:
 *
 *   - Chạy ở MÁY CÁ NHÂN, không khai báo database → dùng file JSON (file này).
 *   - Có chuỗi kết nối Postgres trong biến môi trường (DATABASE_URL, POSTGRES_URL,
 *     ... — xem `src/storage.js`) → dùng `src/postgres-store.js`, dữ liệu BỀN VỮNG.
 *
 * Việc chọn nằm ở `src/storage.js`; lệnh bot KHÔNG biết mình đang ghi vào đâu, đúng
 * tinh thần `docs/11-quyet-dinh-bot-off-chain-truoc.md`: đổi kho lưu trữ là đổi một
 * module, không sửa lệnh bot và không sửa logic chống lạm dụng.
 *
 * KHÔNG dùng file JSON khi deploy lên hosting không có đĩa bền vững:
 *   - Render gói miễn phí: `bot/data/` bị xoá sạch sau mỗi lần restart/redeploy.
 *   - Vercel (serverless): hệ thống file CHỈ ĐỌC, ghi sẽ lỗi ngay.
 * Trong hai trường hợp đó BẮT BUỘC gắn Postgres — xem `bot/README.md`.
 * ===========================================================================
 */

const fs = require('fs');
const path = require('path');

// `LIXI_DATA_DIR` (tuỳ chọn) đổi thư mục dữ liệu — test dùng để cách ly file của từng lần chạy.
const DATA_DIR = process.env.LIXI_DATA_DIR
  ? path.resolve(process.env.LIXI_DATA_DIR)
  : path.join(__dirname, '..', 'data', 'groups');

/**
 * Cấu hình chống lạm dụng mặc định — mỗi nhóm chỉnh riêng được bằng lệnh admin
 * `/caidat` (xem `CONFIG_SPECS` + `applyConfigChange` trong `src/ledger.js`; khoảng
 * giá trị cho phép của từng mục nằm ở đó, không phải ở đây).
 */
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

/**
 * Trạng thái TĂNG TRƯỞNG của nhóm (xem `src/growth.js`): bot còn trong nhóm không, đã
 * chào mừng chưa (đúng một lần), và nhóm này đến từ nhóm nào qua nút "Thêm vào nhóm".
 * `referredByChatId` CHỈ dùng cho thống kê của chủ bot — không bao giờ in ra tin nhắn.
 */
function defaultGrowth() {
  return {
    botStatus: null, // 'member' | 'administrator' | 'left' | 'kicked' | null (chưa rõ)
    onboardedAt: null, // mốc đã đăng lời chào mừng (idempotent)
    onboardedAsAdmin: null, // lúc chào mừng bot có quyền admin không
    adminConfirmedAt: null, // mốc đã báo "đã nhận quyền admin" (sau khi được cấp thêm)
    leftAt: null, // mốc bot bị gỡ khỏi nhóm (nếu có)
    referredByChatId: null, // id nhóm nguồn (chuỗi) — chỉ để thống kê
    referredAt: null,
  };
}

function defaultGroupState(chatId) {
  return {
    chatId: String(chatId),
    // userId(string) -> member record (xem `ensureMember` trong ledger.js):
    // { userId, balance, firstSeenAt, lastCommandAt, displayName, username,
    //   dailyTipUsed, messageCounts }
    // `displayName` là tên để hiển thị trong tin nhắn (thay cho số id); bản ghi cũ
    // chưa có tên thì là null/undefined và `ledger.memberLabel` tự dùng bản dự phòng.
    members: {},
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
    growth: defaultGrowth(), // trạng thái tăng trưởng (xem defaultGrowth / src/growth.js)
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
    growth: { ...fallback.growth, ...(parsed.growth || {}) },
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

// ---------------------------------------------------------------------------
// "Sổ tay chung" của bot (không thuộc nhóm nào)
// ---------------------------------------------------------------------------

/**
 * Những thứ KHÔNG thuộc về một nhóm cụ thể được để trong một file duy nhất:
 *   - `channelPosts` — mã các bài đã đăng lên kênh công khai (xem `src/channel.js`).
 *   - `reports`      — dấu mốc của báo cáo hằng ngày gửi lên GitHub (xem `src/report.js`).
 *
 * Tên file BẮT ĐẦU BẰNG DẤU CHẤM là cố ý: `listGroupIds()` chỉ lấy file `.json` KHÔNG
 * bắt đầu bằng dấu chấm, nên file này nằm chung thư mục mà không bao giờ bị nhầm là một
 * nhóm (nếu bị nhầm thì cron sẽ đi phát thưởng cho một "nhóm" không có thật).
 */
const BOT_STATE_FILE = '.bot-state.json';

function botStateFilePath() {
  return path.join(DATA_DIR, BOT_STATE_FILE);
}

function defaultBotState() {
  return {
    // mã bài -> { postedAt, chatId }
    channelPosts: {},
    // tên mốc -> giá trị tuỳ ý (JSON)
    reports: {},
  };
}

/** Đọc sổ tay chung; chưa có file thì trả về bản mặc định (chưa ghi ra đĩa). */
function readBotState() {
  ensureDataDir();
  const file = botStateFilePath();
  const fallback = defaultBotState();
  if (!fs.existsSync(file)) return fallback;
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`Không đọc được file trạng thái chung (${file}): ${err.message}`);
  }
  return {
    ...fallback,
    ...parsed,
    channelPosts: { ...fallback.channelPosts, ...(parsed.channelPosts || {}) },
    reports: { ...fallback.reports, ...(parsed.reports || {}) },
  };
}

/** Ghi sổ tay chung, atomic (write temp file + rename) — như `writeGroupState`. */
function writeBotState(state) {
  ensureDataDir();
  const file = botStateFilePath();
  const tmp = path.join(DATA_DIR, `.bot-state.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

/** Đọc → sửa tại chỗ → ghi lại, toàn bộ đồng bộ (không có await ở giữa). */
function withBotState(mutator) {
  const state = readBotState();
  const result = mutator(state);
  writeBotState(state);
  return result;
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
  BOT_STATE_FILE,
  DATA_DIR,
  flushPendingWrites,
  botStateFilePath,
  defaultBotState,
  defaultConfig,
  defaultGrowth,
  defaultGroupState,
  ensureDataDir,
  groupFilePath,
  readBotState,
  readGroupState,
  writeBotState,
  writeGroupState,
  withBotState,
  listGroupIds,
  withGroupState,
};
