'use strict';

/**
 * commands/start.js — Lệnh /start: chào mừng + câu miễn trừ trách nhiệm bắt buộc
 * (per docs/09 mục 1 "Nội dung" và docs/11 "Rủi ro của việc chọn off-chain trước").
 */

const WELCOME_TEXT = `👋 <b>Chào mừng đến với Lì Xì Bot!</b>

Bot giúp cả nhóm tip nhau, lì xì ngẫu nhiên và nhận thưởng hoạt động bằng <b>điểm LIXI</b>.

⚠️ <b>Lưu ý quan trọng (đọc trước khi dùng):</b>
Điểm LIXI hiện tại <b>chưa có giá trị tiền thật, không phải khoản đầu tư</b>, và có thể
bị <b>reset trong giai đoạn beta</b>. Đây là bản thử nghiệm off-chain (điểm lưu trong
database của bot, chưa gắn với token on-chain thật) — xem chi tiết trong <code>docs/11</code>.

<b>Lệnh cơ bản:</b>
• <code>/lixi @user 100</code> — tip 100 điểm cho một người
• <code>/lixi 500 chia 5</code> — mở bao lì xì 500 điểm cho 5 người nhận ngẫu nhiên
• <code>/sodu</code> — xem số dư của bạn trong nhóm này
• <code>/lichsu</code> — xem 10 giao dịch gần nhất của bạn
• <code>/rut 0xĐịaChỉ... 100</code> — gửi yêu cầu rút (admin xử lý thủ công, v0 chưa chuyển tiền thật)
• <code>/pot</code> — (chỉ admin) xem tổng số dư pot của nhóm

Gõ lệnh trong nhóm để dùng. Chúc bạn nhận nhiều lì xì! 🧧`;

function register(bot) {
  // Dùng bot.command thay vì bot.start() vì /start cần hoạt động cả trong nhóm
  // (không chỉ lúc bắt đầu chat riêng với bot qua deep-link).
  bot.command('start', async (ctx) => {
    await ctx.replyWithHTML(WELCOME_TEXT);
  });
}

module.exports = { register, WELCOME_TEXT };
