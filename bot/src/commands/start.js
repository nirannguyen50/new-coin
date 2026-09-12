'use strict';

/**
 * commands/start.js — Lệnh /start: chào mừng + câu miễn trừ trách nhiệm bắt buộc
 * (per docs/09 muc 1 "Noi dung" va docs/11 "Rui ro cua viec chon off-chain truoc").
 * Luu y: KHONG nhac duong dan docs/... trong tin nhan gui nguoi dung — ho khong mo duoc.
 */

const WELCOME_TEXT = `👋 <b>Chào mừng đến với Lì Xì Bot!</b>

Bot giúp cả nhóm tip nhau, lì xì ngẫu nhiên và nhận thưởng hoạt động bằng <b>điểm LIXI</b>.

⚠️ <b>Lưu ý quan trọng (đọc trước khi dùng):</b>
Điểm LIXI <b>chưa có giá trị tiền thật và không phải khoản đầu tư</b>. Đây là bản thử nghiệm: điểm được lưu trong database của bot, chưa gắn với token thật, và <b>có thể bị reset</b> trong giai đoạn này.

<b>Lệnh cơ bản:</b>
• <code>/lixi @user 100</code> — tip 100 điểm cho một người
• <code>/lixi 500 chia 5</code> — mở bao lì xì 500 điểm cho 5 người nhận ngẫu nhiên
• <code>/sodu</code> — xem số dư của bạn trong nhóm này
• <code>/lichsu</code> — xem 10 giao dịch gần nhất của bạn
• <code>/rut 0x1a2b3c... 100</code> — gửi yêu cầu rút (admin xử lý thủ công, chưa chuyển tiền thật)
• <code>/pot</code> — (chỉ admin) xem tổng số dư pot của nhóm
• <code>/caidat</code> — (chỉ admin) xem/đổi cấu hình chống lạm dụng của nhóm

Hầu hết lệnh chỉ dùng được <b>trong nhóm</b>, không dùng trong chat riêng với bot. Chúc bạn nhận nhiều lì xì! 🧧`;

function register(bot) {
  // Dùng bot.command thay vì bot.start() vì /start cần hoạt động cả trong nhóm
  // (không chỉ lúc bắt đầu chat riêng với bot qua deep-link).
  bot.command('start', async (ctx) => {
    await ctx.replyWithHTML(WELCOME_TEXT);
  });
}

module.exports = { register, WELCOME_TEXT };
