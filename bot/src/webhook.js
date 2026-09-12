'use strict';

/**
 * webhook.js — Các hàm THUẦN (pure) phục vụ chế độ webhook.
 *
 * Vì sao cần webhook: gói miễn phí của Render.com chỉ có "web service" (không có
 * background worker), và service bị "ngủ" (spin down) sau ~15 phút không có request
 * HTTP nào đi vào. Long polling (bot tự gọi Telegram liên tục) KHÔNG sống sót qua
 * trạng thái ngủ đó. Ở chế độ webhook, chính Telegram gửi POST vào service — request
 * đó vừa đánh thức service vừa mang update tới, nên bot vẫn nhận được tin nhắn.
 *
 * Toàn bộ hàm trong file này là hàm thuần (không gọi mạng, không đọc/ghi file), để
 * có thể unit-test đầy đủ mà không cần kết nối tới api.telegram.org.
 *
 * BẢO MẬT: đường dẫn webhook và secret token được suy ra từ TELEGRAM_BOT_TOKEN bằng
 * SHA-256 (một chiều) nên:
 *   - không cần cấu hình thêm biến môi trường nào (deploy ít thao tác nhất),
 *   - không thể suy ngược ra token từ đường dẫn/secret,
 *   - KHÔNG BAO GIỜ được log token, đường dẫn đầy đủ hay secret ra console.
 */

const crypto = require('crypto');

/** Tiền tố đường dẫn webhook (phần sau là digest, khó đoán). */
const WEBHOOK_PATH_PREFIX = '/tg';

/** Số ký tự hex lấy từ digest cho đường dẫn (128 bit — quá đủ để không thể đoán). */
const PATH_DIGEST_LENGTH = 32;

/** Số ký tự hex lấy cho secret token (Telegram cho phép 1–256 ký tự A-Z a-z 0-9 _ -). */
const SECRET_DIGEST_LENGTH = 48;

/** Cổng HTTP mặc định khi không có biến môi trường PORT. */
const DEFAULT_PORT = 3000;

function sha256Hex(input) {
  return crypto.createHash('sha256').update(String(input), 'utf8').digest('hex');
}

/**
 * Suy ra đường dẫn webhook từ token bot.
 * Luôn cho cùng một kết quả với cùng một token (deterministic) — nhờ vậy sau khi
 * redeploy, bot vẫn lắng nghe đúng đường dẫn mà Telegram đang gọi.
 */
function deriveWebhookPath(token) {
  if (!token) {
    throw new Error('deriveWebhookPath: thiếu token bot.');
  }
  const digest = sha256Hex(`lixi-bot:webhook-path:v1:${token}`);
  return `${WEBHOOK_PATH_PREFIX}/${digest.slice(0, PATH_DIGEST_LENGTH)}`;
}

/**
 * Suy ra secret token gửi kèm webhook (Telegram gắn vào header
 * `X-Telegram-Bot-Api-Secret-Token`). Telegraf so khớp header này, nên POST lung tung
 * từ Internet sẽ bị từ chối ngay cả khi ai đó đoán trúng đường dẫn.
 * Dùng "chuỗi muối" khác với đường dẫn để hai giá trị không bao giờ trùng nhau.
 */
function deriveSecretToken(token) {
  if (!token) {
    throw new Error('deriveSecretToken: thiếu token bot.');
  }
  const digest = sha256Hex(`lixi-bot:webhook-secret:v1:${token}`);
  return digest.slice(0, SECRET_DIGEST_LENGTH);
}

/**
 * Chuẩn hoá tên miền công khai thành dạng `https://ten-mien` (không có dấu `/` cuối).
 * Nhận cả `lixi-bot.onrender.com`, `http://...` lẫn `https://.../`.
 * Trả về chuỗi rỗng nếu đầu vào rỗng/không hợp lệ.
 */
function normalizeDomain(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  let parsed;
  try {
    parsed = new URL(withScheme);
  } catch (err) {
    return '';
  }
  if (!parsed.hostname) return '';
  // Telegram chỉ chấp nhận webhook qua HTTPS — luôn ép về https.
  return `https://${parsed.host}`;
}

/** Ghép tên miền đã chuẩn hoá với đường dẫn webhook thành URL đầy đủ. */
function buildWebhookUrl(domain, path) {
  const base = normalizeDomain(domain);
  if (!base) return '';
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Đọc cổng HTTP từ biến môi trường PORT (Render tự đặt biến này). */
function parsePort(rawPort) {
  const port = Number.parseInt(String(rawPort == null ? '' : rawPort).trim(), 10);
  if (!Number.isFinite(port) || port <= 0 || port > 65535) return DEFAULT_PORT;
  return port;
}

/**
 * Có nơi lưu dữ liệu bền vững (database ngoài) hay không.
 *
 * Dùng để cảnh báo đúng lúc: nếu chạy webhook trên hosting không có đĩa bền vững
 * (Render gói free) mà cũng không khai báo database nào, dữ liệu JSON trong
 * `bot/data/` sẽ bị xoá sạch mỗi lần restart/redeploy.
 *
 * Khi CÓ chuỗi kết nối Postgres, bot dùng `src/postgres-store.js` (dữ liệu bền vững)
 * nên không in cảnh báo nữa. Danh sách tên biến Postgres nằm ở `src/storage.js` —
 * file này chỉ đọc lại để giữ mọi hàm ở đây là hàm thuần.
 */
function hasPersistentStore(env = process.env) {
  const { POSTGRES_ENV_VARS } = require('./storage');
  const hasPostgres = POSTGRES_ENV_VARS.some(
    (name) => env[name] && String(env[name]).trim()
  );
  return Boolean(hasPostgres || (env.REDIS_URL && String(env.REDIS_URL).trim()));
}

/**
 * Chọn chế độ chạy dựa trên biến môi trường (hàm thuần, không side effect).
 *
 *  - Có `WEBHOOK_DOMAIN` (tự đặt) hoặc `RENDER_EXTERNAL_URL` (Render tự tiêm vào)
 *    → chế độ `webhook`: mở HTTP server, Telegram POST update vào.
 *  - Không có gì → chế độ `polling`: bot tự hỏi Telegram (dùng khi chạy ở máy cá nhân).
 *
 * `WEBHOOK_DOMAIN` được ưu tiên hơn `RENDER_EXTERNAL_URL` để người dùng có thể ghi đè
 * (ví dụ khi gắn tên miền riêng).
 */
function chooseMode(env = process.env) {
  const source = String(env.WEBHOOK_DOMAIN || '').trim()
    ? 'WEBHOOK_DOMAIN'
    : String(env.RENDER_EXTERNAL_URL || '').trim()
      ? 'RENDER_EXTERNAL_URL'
      : '';
  const domain = source ? normalizeDomain(env[source]) : '';
  const port = parsePort(env.PORT);
  if (!domain) {
    return { mode: 'polling', domain: '', source: '', port };
  }
  return { mode: 'webhook', domain, source, port };
}

/** Thân JSON tí hon cho health check — TUYỆT ĐỐI không kèm dữ liệu người dùng/cấu hình. */
function healthBody(mode = 'webhook') {
  return JSON.stringify({ ok: true, mode });
}

module.exports = {
  DEFAULT_PORT,
  WEBHOOK_PATH_PREFIX,
  buildWebhookUrl,
  chooseMode,
  deriveSecretToken,
  deriveWebhookPath,
  hasPersistentStore,
  healthBody,
  normalizeDomain,
  parsePort,
};
