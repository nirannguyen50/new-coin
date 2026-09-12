'use strict';

/**
 * serverless.js — Phần dùng chung cho ba "cửa ngõ" chạy trên Vercel:
 *   - `api/telegram.js` — Telegram gửi update vào đây.
 *   - `api/cron.js`     — Vercel gọi mỗi ngày một lần (phát thưởng + quét bao lì xì).
 *   - `api/setup.js`    — mở bằng trình duyệt MỘT LẦN để hoàn tất cài đặt.
 *
 * Mọi hàm kiểm tra quyền và suy ra địa chỉ ở đây đều là HÀM THUẦN (không mạng, không
 * file) nên unit test được đầy đủ — xem `test/serverless.test.js`.
 *
 * NGUYÊN TẮC BẢO MẬT XUYÊN SUỐT: KHÔNG BAO GIỜ in ra token bot, secret, hay chuỗi kết
 * nối database — kể cả trong log và trong trang HTML trả về.
 */

const crypto = require('crypto');
const { createBot } = require('./bot');
const { createStorage } = require('./storage');
const { deriveSecretToken, normalizeDomain } = require('./webhook');
const { parseSuperAdminIds } = require('./config');

/** Đường dẫn webhook trên Vercel là CỐ ĐỊNH theo tên file trong thư mục `api/`. */
const TELEGRAM_WEBHOOK_PATH = '/api/telegram';

// ---------------------------------------------------------------------------
// So sánh bí mật an toàn trước tấn công đo thời gian (timing attack)
// ---------------------------------------------------------------------------

/**
 * So sánh hai chuỗi bí mật mà thời gian chạy không phụ thuộc nội dung.
 * So sánh bản băm SHA-256 để hai chuỗi khác độ dài cũng không làm lộ độ dài.
 */
function secretsEqual(a, b) {
  const left = String(a == null ? '' : a);
  const right = String(b == null ? '' : b);
  if (!left || !right) return false;
  const hashA = crypto.createHash('sha256').update(left, 'utf8').digest();
  const hashB = crypto.createHash('sha256').update(right, 'utf8').digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/** Lấy phần bí mật từ header `Authorization: Bearer <...>` (không phân biệt hoa/thường). */
function bearerToken(headers = {}) {
  const raw = headers.authorization || headers.Authorization || '';
  const m = String(raw).match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

// ---------------------------------------------------------------------------
// Suy ra địa chỉ công khai của chính bản deploy này
// ---------------------------------------------------------------------------

/**
 * Địa chỉ công khai để đăng ký webhook với Telegram. HÀM THUẦN.
 *
 * Thứ tự ưu tiên và lý do:
 *   1. `WEBHOOK_DOMAIN`                 — người dùng tự đặt (tên miền riêng) → ưu tiên nhất.
 *   2. `VERCEL_PROJECT_PRODUCTION_URL`  — tên miền CỐ ĐỊNH của bản production; không đổi
 *                                         sau mỗi lần deploy → webhook không phải đăng ký lại.
 *   3. `VERCEL_URL`                     — tên miền RIÊNG của từng lần deploy (đổi mỗi lần
 *                                         deploy); chỉ dùng khi không có (2).
 *   4. `RENDER_EXTERNAL_URL`            — khi chạy trên Render (phương án dự phòng).
 *
 * Vercel tiêm các biến này KHÔNG kèm `https://`, nên phải chuẩn hoá lại.
 */
function deriveDeploymentUrl(env = process.env) {
  const order = [
    'WEBHOOK_DOMAIN',
    'VERCEL_PROJECT_PRODUCTION_URL',
    'VERCEL_URL',
    'RENDER_EXTERNAL_URL',
  ];
  for (const source of order) {
    const domain = normalizeDomain(env[source]);
    if (domain) return { domain, source };
  }
  return { domain: '', source: '' };
}

/** URL webhook đầy đủ mà Telegram sẽ gọi. */
function buildTelegramWebhookUrl(env = process.env) {
  const { domain, source } = deriveDeploymentUrl(env);
  return { url: domain ? `${domain}${TELEGRAM_WEBHOOK_PATH}` : '', domain, source };
}

// ---------------------------------------------------------------------------
// Kiểm tra quyền cho api/cron.js
// ---------------------------------------------------------------------------

/**
 * Request này có đúng là do CRON của Vercel gọi (hoặc do admin gọi tay) không?
 * HÀM THUẦN — chỉ nhìn header/query và biến môi trường.
 *
 * Vì sao phải chặn: cron phát thưởng điểm cho thành viên. Nếu ai vào thẳng địa chỉ
 * `https://<tên>.vercel.app/api/cron` bằng trình duyệt cũng chạy được thì người lạ có
 * thể gọi liên tục để quấy rối (dù mỗi ngày chỉ phát thưởng một lần nhờ tính idempotent).
 *
 * Cách Vercel làm: khi dự án CÓ biến môi trường `CRON_SECRET`, mỗi lần cron chạy Vercel
 * gửi kèm header `Authorization: Bearer <CRON_SECRET>`. Nếu KHÔNG đặt `CRON_SECRET`,
 * request của cron không kèm gì cả — không có cách nào phân biệt với người lạ, nên ở
 * đây ta TỪ CHỐI và báo rõ phải đặt `CRON_SECRET` (thà không phát thưởng còn hơn để
 * bất kỳ ai cũng kích hoạt được).
 *
 * Ngoài ra chấp nhận "secret suy từ token bot" để admin gọi tay được khi cần
 * (ví dụ muốn phát thưởng ngay mà không chờ tới giờ cron).
 *
 * @returns {{ok: boolean, via: string, reason: string}}
 */
function isAuthorizedCronRequest({ headers = {}, query = {} } = {}, env = process.env) {
  const provided = bearerToken(headers) || String(query.key || '');
  const cronSecret = String(env.CRON_SECRET || '').trim();

  if (cronSecret) {
    if (secretsEqual(provided, cronSecret)) {
      return { ok: true, via: 'CRON_SECRET', reason: '' };
    }
    return {
      ok: false,
      via: '',
      reason: provided ? 'sai_bi_mat' : 'thieu_bi_mat',
    };
  }

  // Chưa đặt CRON_SECRET → chỉ chấp nhận secret suy từ token bot (admin gọi tay).
  const token = String(env.TELEGRAM_BOT_TOKEN || '').trim();
  if (token && secretsEqual(provided, deriveSecretToken(token))) {
    return { ok: true, via: 'token-secret', reason: '' };
  }
  return { ok: false, via: '', reason: 'chua_dat_CRON_SECRET' };
}

/** Thông báo tiếng Việt tương ứng với lý do bị từ chối (không lộ bí mật nào). */
const CRON_REJECT_MESSAGES = {
  thieu_bi_mat:
    'Thiếu thông tin xác thực. Địa chỉ này chỉ dành cho lịch chạy tự động của Vercel.',
  sai_bi_mat: 'Thông tin xác thực không đúng.',
  chua_dat_CRON_SECRET:
    'Dự án chưa đặt biến môi trường CRON_SECRET nên không thể xác minh đây có đúng là ' +
    'lịch chạy tự động của Vercel hay không. Vào Vercel → dự án → Settings → ' +
    'Environment Variables, thêm CRON_SECRET (một chuỗi ngẫu nhiên bất kỳ), rồi bấm ' +
    'Redeploy. Khi đó lịch chạy hằng ngày sẽ hoạt động.',
};

// ---------------------------------------------------------------------------
// Kiểm tra quyền cho api/setup.js
// ---------------------------------------------------------------------------

/**
 * Request này có được phép chạy cài đặt (đăng ký lại webhook, tạo bảng) không?
 * HÀM THUẦN.
 *
 * Vì sao phải chặn: `api/setup.js` TRỎ webhook của bot về địa chỉ này. Nếu không có
 * bí mật, người lạ mở link là có thể làm bot ngừng nhận tin nhắn (hoặc trỏ đi nơi khác).
 *
 * Chấp nhận: `?key=` khớp `SETUP_KEY`, hoặc `?key=` khớp secret suy từ token bot
 * (để không phải đặt thêm biến môi trường nào — người dùng lấy chuỗi này ở đâu thì
 * xem hướng dẫn trong bot/README.md).
 */
function isAuthorizedSetupRequest({ headers = {}, query = {} } = {}, env = process.env) {
  const provided = String(query.key || '') || bearerToken(headers);
  if (!provided) return { ok: false, reason: 'thieu_key' };

  const setupKey = String(env.SETUP_KEY || '').trim();
  if (setupKey && secretsEqual(provided, setupKey)) {
    return { ok: true, via: 'SETUP_KEY', reason: '' };
  }

  const token = String(env.TELEGRAM_BOT_TOKEN || '').trim();
  if (token && secretsEqual(provided, deriveSecretToken(token))) {
    return { ok: true, via: 'token-secret', reason: '' };
  }
  return { ok: false, reason: 'sai_key' };
}

// ---------------------------------------------------------------------------
// Khởi tạo bot + kho dữ liệu, dùng lại giữa các lần gọi "nóng" (warm invocation)
// ---------------------------------------------------------------------------

const APP_CACHE_KEY = Symbol.for('lixi-bot.serverless.app');

/**
 * Tạo (hoặc lấy lại) bot + kho dữ liệu cho môi trường serverless.
 *
 * Trên Vercel, một instance đã "nóng" sẽ phục vụ nhiều request liên tiếp. Cache ở đây
 * giúp không phải dựng lại Telegraf và pool kết nối database cho mỗi request.
 */
function getApp(env = process.env) {
  if (globalThis[APP_CACHE_KEY]) return globalThis[APP_CACHE_KEY];

  const token = String(env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!token) {
    throw new Error(
      'Thiếu biến môi trường TELEGRAM_BOT_TOKEN. Vào Vercel → dự án → Settings → ' +
        'Environment Variables để thêm token lấy từ @BotFather, rồi Redeploy.'
    );
  }

  const { storage, backend } = createStorage(env);
  const bot = createBot(token, {
    superAdminIds: parseSuperAdminIds(env.BOT_SUPER_ADMIN_IDS),
    storage,
  });

  const app = {
    bot,
    storage,
    backend,
    secretToken: deriveSecretToken(token),
    telegramWebhookPath: TELEGRAM_WEBHOOK_PATH,
  };
  globalThis[APP_CACHE_KEY] = app;
  return app;
}

/** Xoá cache (chỉ dùng trong test). */
function resetApp() {
  delete globalThis[APP_CACHE_KEY];
}

// ---------------------------------------------------------------------------
// Tiện ích HTTP
// ---------------------------------------------------------------------------

/**
 * Đọc body JSON của request.
 * Vercel thường tự phân tích sẵn vào `req.body`; vẫn giữ nhánh đọc thủ công để hàm
 * chạy được cả khi không có lớp phân tích đó (ví dụ khi test bằng http server thường).
 */
async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) {
    try {
      return JSON.parse(req.body);
    } catch (err) {
      return null;
    }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return null;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (err) {
    return null;
  }
}

/** Lấy query string dưới dạng object, dù chạy trên Vercel hay http server thường. */
function readQuery(req) {
  if (req.query && typeof req.query === 'object') return req.query;
  const url = new URL(String(req.url || '/'), 'http://localhost');
  return Object.fromEntries(url.searchParams.entries());
}

/** Trả về một trang HTML tiếng Việt (dùng cho api/setup.js). */
function sendHtml(res, statusCode, html) {
  const body = `<!doctype html><html lang="vi"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>Lì Xì Bot — cài đặt</title>` +
    `<style>body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;` +
    `max-width:44rem;margin:0 auto;padding:2rem 1rem;line-height:1.6;color:#1a1a1a;` +
    `background:#fafafa}h1{font-size:1.5rem}code{background:#eee;padding:.1em .35em;` +
    `border-radius:4px}li{margin:.4rem 0}.ok{color:#0a7d32}.bad{color:#b00020}</style>` +
    `</head><body>${html}</body></html>`;
  res.statusCode = statusCode;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(body);
}

/** Trả về JSON (dùng cho api/cron.js và các lỗi máy móc). */
function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(payload));
}

module.exports = {
  TELEGRAM_WEBHOOK_PATH,
  CRON_REJECT_MESSAGES,
  bearerToken,
  buildTelegramWebhookUrl,
  deriveDeploymentUrl,
  getApp,
  isAuthorizedCronRequest,
  isAuthorizedSetupRequest,
  readJsonBody,
  readQuery,
  resetApp,
  secretsEqual,
  sendHtml,
  sendJson,
};
