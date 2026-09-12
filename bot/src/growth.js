'use strict';

/**
 * growth.js — Bot TỰ LAN TRUYỀN qua việc dùng bình thường (product-led growth), để chủ
 * dự án không phải đi mời từng nhóm bằng tay.
 *
 * QUY TẮC TRUNG THỰC (không đổi):
 *   - Không tài khoản giả, không nhắn tin cho ai chưa từng tương tác với bot, không gửi
 *     tin nhắn không ai yêu cầu.
 *   - Lời mời "thêm bot vào nhóm" CHỈ xuất hiện bên trong những tin nhắn bot vốn đã gửi,
 *     trong những nhóm vốn đã dùng bot (tin nhắn bao lì xì khi đã đóng, và trả lời /start
 *     trong chat riêng). Không gắn vào mọi tin nhắn — không được gây cảm giác spam.
 *   - Thống kê tăng trưởng chỉ đếm số, không in tên hay id người dùng; id nhóm nguồn
 *     không bao giờ hiện ra trong tin nhắn của bot ở nhóm khác.
 *
 * File này gồm các HÀM THUẦN (mã hoá payload, soạn URL/nút bấm, phân loại update
 * my_chat_member, gộp thống kê) + một "danh tính bot" nhỏ có cache (username lấy qua
 * getMe). Lệnh Telegram nằm ở `commands/growth.js` và `commands/start.js`.
 */

const ledger = require('./ledger');
const { defaultGrowth } = require('./store');

// ---------------------------------------------------------------------------
// Payload của deep link `https://t.me/<bot>?startgroup=<payload>`
// ---------------------------------------------------------------------------

/** Telegram chỉ cho phép A–Z, a–z, 0–9, `_` và `-`, tối đa 64 ký tự. */
const START_PAYLOAD_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** Tiền tố nhận diện payload giới thiệu (referral) do bot này tạo ra. */
const REFERRAL_PREFIX = 'ref_';

/**
 * Mã hoá id nhóm nguồn thành payload hợp lệ: `ref_` + dấu (`n` âm / `p` dương) + trị tuyệt
 * đối ở hệ 36. Id nhóm Telegram luôn là số nguyên (thường âm, ví dụ -1001234567890).
 * Không dùng số thô để id nhóm không "đập vào mắt" người ở nhóm khác (payload vẫn có thể
 * giải mã được — mục đích là thống kê cho chủ bot, không phải bảo mật).
 *
 * @returns {string|null} null nếu chatId không phải số nguyên hợp lệ.
 */
function encodeReferralPayload(chatId) {
  const n = Number(chatId);
  if (!Number.isSafeInteger(n) || n === 0) return null;
  const payload = `${REFERRAL_PREFIX}${n < 0 ? 'n' : 'p'}${Math.abs(n).toString(36)}`;
  return START_PAYLOAD_RE.test(payload) ? payload : null;
}

/**
 * Giải mã payload về id nhóm nguồn (chuỗi, ví dụ "-1001234567890").
 * Trả về null cho mọi thứ không phải payload do `encodeReferralPayload` tạo ra.
 */
function decodeReferralPayload(payload) {
  const text = String(payload == null ? '' : payload).trim();
  if (!START_PAYLOAD_RE.test(text)) return null;
  const m = text.match(/^ref_([np])([0-9a-z]{1,12})$/);
  if (!m) return null;
  const abs = Number.parseInt(m[2], 36);
  if (!Number.isSafeInteger(abs) || abs === 0) return null;
  return String(m[1] === 'n' ? -abs : abs);
}

// ---------------------------------------------------------------------------
// Nút "Thêm Lì Xì Bot vào nhóm của bạn"
// ---------------------------------------------------------------------------

const ADD_TO_GROUP_BUTTON_TEXT = '➕ Thêm Lì Xì Bot vào nhóm của bạn';

/** Username bot không có `@`, chỉ chữ/số/gạch dưới (như Telegram quy định); null nếu rỗng/sai. */
function normalizeBotUsername(raw) {
  const text = String(raw == null ? '' : raw)
    .trim()
    .replace(/^@/, '');
  return /^[A-Za-z0-9_]{1,64}$/.test(text) ? text : null;
}

/**
 * URL một chạm để thêm bot vào một nhóm người dùng đang quản trị.
 * `sourceChatId` (nếu có) là nhóm đang hiện nút — dùng để ghi nhận "nhóm mới đến từ đâu".
 * Không có nhóm nguồn (chat riêng) thì payload là `true` (Telegram yêu cầu phải có payload).
 *
 * @returns {string|null} null nếu chưa biết username bot (không thể dựng link).
 */
function addToGroupUrl(botUsername, sourceChatId = null) {
  const username = normalizeBotUsername(botUsername);
  if (!username) return null;
  const payload = (sourceChatId != null && encodeReferralPayload(sourceChatId)) || 'true';
  return `https://t.me/${username}?startgroup=${payload}`;
}

/** Một nút inline mở URL ở trên. */
function addToGroupButton(url) {
  return { text: ADD_TO_GROUP_BUTTON_TEXT, url };
}

/** Bàn phím inline chỉ có nút "thêm vào nhóm"; `null` khi không có URL (không gắn gì cả). */
function addToGroupKeyboard(url) {
  if (!url) return null;
  return { inline_keyboard: [[addToGroupButton(url)]] };
}

// ---------------------------------------------------------------------------
// Danh tính bot: username lấy qua `getMe`, cache trong tiến trình
// ---------------------------------------------------------------------------

/** Sau một lần `getMe` thất bại, chờ bấy nhiêu lâu mới thử lại (tránh gọi API liên tục). */
const IDENTITY_RETRY_MS = 60 * 1000;

/**
 * Tạo đối tượng "danh tính bot".
 *
 * Vì sao không dùng `ctx.botInfo` của Telegraf: danh tính này phải (a) stub được độc lập
 * trong test (`botUsername`), và (b) xuống cấp êm — không biết username thì tin nhắn vẫn
 * gửi bình thường, chỉ thiếu nút "thêm vào nhóm"; không bao giờ làm hỏng lệnh.
 *
 * @param {{getMe: () => Promise<object>}} telegram đối tượng Telegram của Telegraf
 * @param {{botUsername?: string|null}} [opts] username biết trước (test / cấu hình)
 */
function createBotIdentity(telegram, { botUsername = null } = {}) {
  let username = normalizeBotUsername(botUsername);
  let pending = null;
  let failedAt = 0;

  async function getUsername() {
    if (username) return username;
    if (failedAt && Date.now() - failedAt < IDENTITY_RETRY_MS) return null;
    if (!pending) {
      pending = Promise.resolve()
        .then(() => telegram.getMe())
        .then((me) => {
          username = normalizeBotUsername(me && me.username);
          if (!username) failedAt = Date.now();
          return username;
        })
        .catch(() => {
          failedAt = Date.now();
          return null;
        })
        .finally(() => {
          pending = null;
        });
    }
    return pending;
  }

  return {
    getUsername,
    /** URL "thêm vào nhóm" có gắn nhóm nguồn, hoặc null nếu chưa biết username. */
    async addToGroupUrl(sourceChatId = null) {
      return addToGroupUrl(await getUsername(), sourceChatId);
    },
  };
}

// ---------------------------------------------------------------------------
// Trạng thái tăng trưởng lưu trong state nhóm (`state.growth`)
// ---------------------------------------------------------------------------

/** Lấy (và chuẩn hoá) `state.growth`; các nhóm tạo trước bản này chưa có trường đó. */
function growthOf(state) {
  state.growth = { ...defaultGrowth(), ...(state.growth || {}) };
  return state.growth;
}

/** Bot còn đang ở trong nhóm không (theo update my_chat_member gần nhất; chưa rõ = có). */
function botStillInGroup(state) {
  const status = state && state.growth ? state.growth.botStatus : null;
  return status !== 'left' && status !== 'kicked';
}

/**
 * Ghi nhận nhóm này đến từ nhóm nguồn nào (chỉ lần đầu; không tự giới thiệu chính mình).
 * @returns {boolean} true nếu vừa ghi nhận.
 */
function recordReferral(state, sourceChatId, nowMs = Date.now()) {
  const source = sourceChatId == null ? null : String(sourceChatId);
  if (!source || source === String(state.chatId)) return false;
  const growth = growthOf(state);
  if (growth.referredByChatId) return false;
  growth.referredByChatId = source;
  growth.referredAt = nowMs;
  return true;
}

// ---------------------------------------------------------------------------
// Update `my_chat_member`: bot vừa được thêm / cấp admin / bị gỡ khỏi nhóm
// ---------------------------------------------------------------------------

const IN_GROUP_STATUSES = new Set(['member', 'administrator', 'restricted']);

/**
 * Phân loại một update my_chat_member. HÀM THUẦN.
 * @returns {{event: 'added'|'promoted'|'demoted'|'left'|'none', isAdmin: boolean, status: string}}
 */
function classifyMyChatMember(update) {
  const oldStatus = String((update && update.old_chat_member && update.old_chat_member.status) || '');
  const newStatus = String((update && update.new_chat_member && update.new_chat_member.status) || '');
  const wasIn = IN_GROUP_STATUSES.has(oldStatus);
  const isIn = IN_GROUP_STATUSES.has(newStatus);
  const isAdmin = newStatus === 'administrator';
  if (!wasIn && isIn) return { event: 'added', isAdmin, status: newStatus };
  if (wasIn && !isIn) return { event: 'left', isAdmin: false, status: newStatus || 'left' };
  if (wasIn && isIn && oldStatus !== 'administrator' && isAdmin) {
    return { event: 'promoted', isAdmin, status: newStatus };
  }
  if (wasIn && isIn && oldStatus === 'administrator' && !isAdmin) {
    return { event: 'demoted', isAdmin, status: newStatus };
  }
  return { event: 'none', isAdmin, status: newStatus };
}

/**
 * Quyết định phải đăng gì sau một update my_chat_member — MUTATE `state.growth`, HÀM THUẦN
 * về mặt I/O (không gọi Telegram). Chào mừng đúng MỘT lần cho mỗi nhóm (`onboardedAt`).
 * @returns {'welcome'|'admin_ok'|null}
 */
function applyMyChatMember(state, info, nowMs = Date.now()) {
  const growth = growthOf(state);
  growth.botStatus = info.status;
  if (info.event === 'left') {
    growth.leftAt = nowMs;
    return null;
  }
  if ((info.event === 'added' || info.event === 'promoted') && !growth.onboardedAt) {
    growth.onboardedAt = nowMs;
    growth.onboardedAsAdmin = info.isAdmin;
    return 'welcome';
  }
  if (info.event === 'promoted' && !growth.adminConfirmedAt) {
    growth.adminConfirmedAt = nowMs;
    return 'admin_ok';
  }
  return null;
}

/** Vừa chào mừng xong (trong cửa sổ này) thì /start kèm payload không chào lần hai. */
const RECENT_ONBOARDING_MS = 10 * 60 * 1000;

function wasJustOnboarded(state, nowMs = Date.now()) {
  const at = state && state.growth ? state.growth.onboardedAt : null;
  return !!at && nowMs - at >= 0 && nowMs - at < RECENT_ONBOARDING_MS;
}

// ---------------------------------------------------------------------------
// Văn bản tiếng Việt
// ---------------------------------------------------------------------------

const RIGHTS_NEEDED_TEXT =
  '🔧 <b>Bot chưa có quyền admin.</b> Vào Cài đặt nhóm → Quản trị viên → thêm Lì Xì Bot ' +
  '(không cần bật quyền nào đặc biệt).\n' +
  'Vì sao: Telegram chỉ cho bot là admin đọc tin nhắn thường của nhóm — bot cần đọc để đếm ' +
  'hoạt động và phát thưởng hằng ngày (<code>/thuong</code>). Chưa có quyền admin thì tip và ' +
  'bao lì xì vẫn chạy, nhưng thưởng hoạt động sẽ không hoạt động.';

/** Lời chào khi bot vừa được thêm vào nhóm (dành cho admin vừa thêm bot). */
function onboardingText({ isAdmin = true } = {}) {
  const lines = [
    '👋 <b>Cảm ơn đã thêm Lì Xì Bot vào nhóm!</b>',
    'Bot giúp cả nhóm tip nhau, mở bao lì xì chia ngẫu nhiên và nhận thưởng hoạt động bằng điểm LIXI.',
    'Mọi thứ chạy ngay trong nhóm này; admin cấp điểm và xem được toàn bộ log.',
    '',
    '<b>Bắt đầu trong 3 bước (admin):</b>',
    '1. <code>/nap 1000</code> — nạp 1000 điểm vào pot nhóm',
    '2. reply tin nhắn của một thành viên rồi gõ <code>/nap 100</code> — cấp 100 điểm cho người đó',
    '3. <code>/lixi 100 chia 3</code> — mở bao lì xì 100 điểm cho 3 người bấm nhận đầu tiên',
    '(Nhóm mới muốn thử ngay: <code>/caidat thamnien 0</code>, xong nhớ đặt lại <code>3</code>.)',
    '',
    '⚠️ Điểm LIXI trong bản thử nghiệm <b>không có giá trị tiền thật</b> và có thể bị reset.',
    'Gõ <code>/huongdan</code> để xem toàn bộ lệnh.',
  ];
  if (!isAdmin) lines.push('', RIGHTS_NEEDED_TEXT);
  return lines.join('\n');
}

const ADMIN_GRANTED_TEXT =
  '✅ Lì Xì Bot đã có quyền admin — thưởng hoạt động (<code>/thuong</code>) giờ chạy được. ' +
  'Gõ <code>/huongdan</code> để bắt đầu.';

/** Hướng dẫn ngắn (/huongdan) — dưới 25 dòng để đọc tốt trên điện thoại. */
const GUIDE_TEXT = [
  '📖 <b>Hướng dẫn Lì Xì Bot</b>',
  'Tip nhau, mở bao lì xì, nhận thưởng hoạt động bằng điểm LIXI — ngay trong nhóm.',
  '',
  '<b>Thành viên</b>',
  '• <code>/lixi @user 100</code> hoặc reply + <code>/lixi 100</code> — tip 100 điểm',
  '• <code>/lixi 500 chia 5</code> — bao lì xì 500 điểm cho 5 người bấm nhận đầu tiên',
  '• <code>/sodu</code> — số dư của bạn · <code>/lichsu</code> — 10 giao dịch gần nhất',
  '• <code>/bxh</code> — top 10 người nhận nhiều lì xì nhất trong 7 ngày qua',
  '• <code>/rut 0x... 100</code> — yêu cầu rút (admin xử lý thủ công, chưa chuyển tiền thật)',
  '',
  '<b>Admin nhóm</b>',
  '• <code>/nap 1000</code> — nạp pot · reply + <code>/nap 100</code> — cấp điểm cho một người',
  '• <code>/thuong 10 5</code> — thưởng 10 điểm/ngày cho ai có ≥ 5 tin nhắn/ngày (trừ từ pot)',
  '• <code>/pot</code> — số dư pot + log cấp điểm · <code>/caidat</code> — xem/đổi cấu hình',
  '• <code>/duyet</code> / <code>/tuchoi &lt;mã&gt;</code> — duyệt tip lớn · <code>/rut_duyet</code> / <code>/rut_huy &lt;mã&gt;</code> — xử lý rút',
  '',
  '<b>Hai chốt chống lạm dụng admin nên biết</b>',
  '• <code>/caidat thamnien 3</code> — phải ở trong nhóm 3 ngày mới được tip/mở bao (0 = tắt, chỉ khi thử nghiệm)',
  '• <code>/caidat nguongduyet 2000</code> — tip lớn hơn mức này phải chờ admin <code>/duyet</code>',
  '',
  '⚠️ Điểm LIXI chưa có giá trị tiền thật — bản thử nghiệm, có thể bị reset.',
].join('\n');

// ---------------------------------------------------------------------------
// Thống kê cho chủ bot (/thongke) — CHỈ SỐ ĐẾM, không tên, không id
// ---------------------------------------------------------------------------

/** Cửa sổ "hoạt động gần đây" dùng chung cho /bxh và /thongke. */
const STATS_WINDOW_DAYS = 7;

function statsWindowStart(nowMs = Date.now()) {
  return nowMs - STATS_WINDOW_DAYS * ledger.DAY_MS;
}

/**
 * Gộp thống kê từ danh sách state nhóm (kho JSON; kho Postgres có truy vấn riêng nhưng
 * PHẢI trả về cùng các trường này với cùng định nghĩa).
 *
 * @param {object[]} states state ĐẦY ĐỦ của từng nhóm
 * @param {{sinceMs: number}} opts mốc bắt đầu cửa sổ "gần đây"
 */
function aggregateGrowthStats(states, { sinceMs }) {
  const users = new Set();
  const stats = {
    groupsTotal: 0,
    groupsActive: 0,
    groupsReferred: 0,
    membersSeen: 0,
    envelopesOpened: 0,
    pointsTipped: 0,
  };
  for (const state of states || []) {
    if (botStillInGroup(state)) stats.groupsTotal += 1;
    if (state.growth && state.growth.referredByChatId) stats.groupsReferred += 1;
    const txs = state.transactions || [];
    if (txs.some((tx) => tx.ts >= sinceMs)) stats.groupsActive += 1;
    for (const userId of Object.keys(state.members || {})) users.add(userId);
    for (const e of Object.values(state.envelopes || {})) {
      if (e.createdAt >= sinceMs) stats.envelopesOpened += 1;
    }
    stats.pointsTipped += ledger.tipVolume(txs, { sinceMs });
  }
  stats.membersSeen = users.size;
  return stats;
}

/** Tin nhắn /thongke. Chỉ số đếm — không bao giờ in tên hay id. */
function statsText(stats, { formatNumber = (n) => String(n) } = {}) {
  const f = (n) => formatNumber(Number(n) || 0);
  return [
    '📊 <b>Thống kê Lì Xì Bot</b> (chỉ số đếm, không có tên hay id)',
    `• Nhóm đang có bot: <b>${f(stats.groupsTotal)}</b>`,
    `• Nhóm hoạt động ${STATS_WINDOW_DAYS} ngày qua (có ít nhất một giao dịch): <b>${f(stats.groupsActive)}</b>`,
    `• Thành viên đã thấy (tính một lần dù ở nhiều nhóm): <b>${f(stats.membersSeen)}</b>`,
    `• Bao lì xì đã mở ${STATS_WINDOW_DAYS} ngày qua: <b>${f(stats.envelopesOpened)}</b>`,
    `• Điểm đã tip ${STATS_WINDOW_DAYS} ngày qua: <b>${f(stats.pointsTipped)}</b>`,
    `• Nhóm đến từ nút "Thêm vào nhóm" (giới thiệu): <b>${f(stats.groupsReferred)}</b>`,
    '',
    `👉 Con số cần theo dõi mỗi tuần là <b>nhóm hoạt động ${STATS_WINDOW_DAYS} ngày qua</b>: ` +
      'số nhóm có bot chỉ nói bot được thêm vào, còn số nhóm hoạt động mới nói có người ' +
      'dùng thật. Tăng đều là dấu hiệu bot tự lan truyền được.',
  ].join('\n');
}

module.exports = {
  ADD_TO_GROUP_BUTTON_TEXT,
  ADMIN_GRANTED_TEXT,
  GUIDE_TEXT,
  IDENTITY_RETRY_MS,
  RECENT_ONBOARDING_MS,
  REFERRAL_PREFIX,
  RIGHTS_NEEDED_TEXT,
  START_PAYLOAD_RE,
  STATS_WINDOW_DAYS,
  addToGroupButton,
  addToGroupKeyboard,
  addToGroupUrl,
  aggregateGrowthStats,
  applyMyChatMember,
  botStillInGroup,
  classifyMyChatMember,
  createBotIdentity,
  decodeReferralPayload,
  encodeReferralPayload,
  growthOf,
  normalizeBotUsername,
  onboardingText,
  recordReferral,
  statsText,
  statsWindowStart,
  wasJustOnboarded,
};
