'use strict';

/**
 * redact.js — Xoá mọi thứ bí mật ra khỏi thông báo lỗi TRƯỚC khi in ra log hoặc hiện
 * lên trang web.
 *
 * VÌ SAO CẦN: thư viện Telegram ném lỗi kèm nguyên URL đã gọi, mà URL của Telegram Bot
 * API có dạng `https://api.telegram.org/bot<TOKEN>/setWebhook`. Nghĩa là một câu
 * "invalid json response body at https://api.telegram.org/bot123456789:ABC.../setWebhook"
 * chứa TRỌN VẸN token bot. In câu đó ra log Vercel/Render, hay hiện nó lên trang
 * `/api/setup`, là làm lộ quyền điều khiển bot.
 *
 * Tương tự, lỗi từ driver Postgres có thể kèm chuỗi kết nối (có mật khẩu database).
 *
 * Hàm ở đây là hàm THUẦN và được gọi ở MỌI chỗ hiển thị lỗi ra ngoài.
 */

/** Thay thế cho phần đã bị xoá — ngắn gọn, không gợi ý gì về độ dài bí mật. */
const MASK = '***';

/**
 * Xoá bí mật khỏi một đoạn văn bản.
 *
 * Hai lớp, cố ý chồng lên nhau:
 *   1. Theo MẪU: bắt `bot<số>:<chuỗi>` trong URL của Telegram và `://user:pass@host`
 *      trong chuỗi kết nối — chặn được cả những bí mật không nằm trong biến môi trường
 *      (ví dụ token của một bot khác lọt vào thông báo lỗi).
 *   2. Theo GIÁ TRỊ: xoá đúng giá trị của các biến môi trường nhạy cảm nếu chúng xuất
 *      hiện nguyên văn — chặn được cả những dạng mà mẫu ở trên không đoán trước được.
 *
 * @param {unknown} text thông báo lỗi (hoặc bất kỳ chuỗi nào sắp bị in ra)
 * @param {object} env biến môi trường (mặc định `process.env`)
 * @returns {string}
 */
function redactSecrets(text, env = process.env) {
  let out = String(text == null ? '' : text);

  // (1) Theo mẫu.
  // Token bot trong URL Telegram: .../bot123456789:AAH.../sendMessage
  out = out.replace(/\bbot\d{5,}:[A-Za-z0-9_-]+/g, `bot${MASK}`);
  // Token bot đứng một mình: 123456789:AAH...
  out = out.replace(/\b\d{5,}:[A-Za-z0-9_-]{20,}/g, MASK);
  // Mật khẩu trong chuỗi kết nối: postgres://user:matkhau@host/db
  out = out.replace(/(\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@]+):[^\s@]+@/gi, `$1:${MASK}@`);

  // (2) Theo giá trị của các biến môi trường nhạy cảm.
  const sensitive = [
    'TELEGRAM_BOT_TOKEN',
    'CRON_SECRET',
    'SETUP_KEY',
    'DATABASE_URL',
    'POSTGRES_URL',
    'POSTGRES_PRISMA_URL',
    'POSTGRES_URL_NON_POOLING',
    'DATABASE_URL_UNPOOLED',
    'NEON_DATABASE_URL',
    'REDIS_URL',
  ];
  for (const name of sensitive) {
    const value = env && env[name] ? String(env[name]).trim() : '';
    // Bỏ qua giá trị quá ngắn để không xoá nhầm những từ thông thường.
    if (value.length < 8) continue;
    out = out.split(value).join(MASK);
  }

  return out;
}

/** Lấy thông báo lỗi ĐÃ được xoá bí mật từ một Error bất kỳ. */
function safeErrorMessage(err, env = process.env) {
  const raw = err && err.message ? err.message : String(err);
  return redactSecrets(raw, env);
}

module.exports = { MASK, redactSecrets, safeErrorMessage };
