'use strict';

/**
 * api/telegram.js — CỬA NGÕ WEBHOOK trên Vercel.
 *
 * Telegram gửi mỗi tin nhắn/nút bấm vào đây bằng một request POST. Hàm này xác minh
 * request đúng là của Telegram, đưa update cho bot xử lý, rồi trả 200 thật nhanh.
 *
 * ---------------------------------------------------------------------------
 * VÌ SAO ĐƯỜNG DẪN KHÔNG CÒN BÍ MẬT NỮA — VÀ VÌ SAO VẪN AN TOÀN
 * ---------------------------------------------------------------------------
 * Khi chạy trên Render, bot lắng nghe ở một đường dẫn khó đoán suy ra từ token
 * (`/tg/<32 ký tự hex>`, xem `bot/src/webhook.js`). Trên Vercel thì KHÔNG làm vậy được:
 * đường dẫn của một serverless function chính là TÊN FILE, nên nó cố định là
 * `/api/telegram` và ai cũng đoán ra.
 *
 * Lớp bảo vệ thật sự vì vậy là HEADER BÍ MẬT `X-Telegram-Bot-Api-Secret-Token`:
 * lúc đăng ký webhook (xem `api/setup.js`) bot khai báo với Telegram một chuỗi bí mật
 * suy từ token bot; từ đó Telegram gắn chuỗi này vào MỌI request nó gửi tới. Request
 * nào không có đúng header đó sẽ bị từ chối ngay ở dòng đầu tiên bên dưới.
 *
 * Nói cách khác: đường dẫn công khai, nhưng nội dung chỉ được xử lý khi có header bí
 * mật — đây chính là ranh giới bảo mật của cửa ngõ này. So sánh header dùng hàm so
 * sánh an toàn trước tấn công đo thời gian (`secretsEqual`).
 *
 * TUYỆT ĐỐI không in token, secret hay chuỗi kết nối database ra log.
 */

const {
  getApp,
  readJsonBody,
  secretsEqual,
  sendJson,
} = require('../bot/src/serverless');
const { safeErrorMessage } = require('../bot/src/redact');

module.exports = async function handler(req, res) {
  // GET → dùng để kiểm tra "hàm còn sống không" (và để Vercel/UptimeRobot ping).
  // Không trả về bất kỳ dữ liệu người dùng hay cấu hình nào.
  if (req.method === 'GET') {
    sendJson(res, 200, { ok: true, mode: 'vercel-webhook' });
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false });
    return;
  }

  let app;
  try {
    app = getApp();
  } catch (err) {
    // Thiếu cấu hình (ví dụ chưa có TELEGRAM_BOT_TOKEN). Ghi log rõ ràng cho người vận hành.
    console.error('[telegram] Chưa cấu hình xong:', safeErrorMessage(err));
    sendJson(res, 500, { ok: false });
    return;
  }

  // === RANH GIỚI BẢO MẬT: chỉ Telegram mới biết chuỗi bí mật này. ===
  const provided = req.headers['x-telegram-bot-api-secret-token'];
  if (!secretsEqual(provided, app.secretToken)) {
    // Không nói lý do cụ thể để không giúp người dò tìm.
    sendJson(res, 401, { ok: false });
    return;
  }

  const update = await readJsonBody(req);
  if (!update || typeof update !== 'object') {
    sendJson(res, 400, { ok: false });
    return;
  }

  try {
    // Telegraf cần biết thông tin bot (để khớp lệnh dạng `/lixi@TenBot`). Lấy một lần
    // cho mỗi instance "nóng", các request sau dùng lại.
    if (!app.bot.botInfo) {
      app.bot.botInfo = await app.bot.telegram.getMe();
    }
    await app.bot.handleUpdate(update);
  } catch (err) {
    // Lỗi khi xử lý một update KHÔNG được trả về mã lỗi cho Telegram: Telegram sẽ gửi
    // lại update đó nhiều lần và có thể lặp vô hạn. Ghi log rồi vẫn trả 200.
    console.error('[telegram] Lỗi khi xử lý update:', safeErrorMessage(err));
  }

  sendJson(res, 200, { ok: true });
};
