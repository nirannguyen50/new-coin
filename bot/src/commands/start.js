'use strict';

/**
 * commands/start.js — Lệnh /start: chào mừng + câu miễn trừ trách nhiệm bắt buộc
 * (per docs/09 muc 1 "Noi dung" va docs/11 "Rui ro cua viec chon off-chain truoc").
 * Luu y: KHONG nhac duong dan docs/... trong tin nhan gui nguoi dung — ho khong mo duoc.
 *
 * Hai việc thêm cho tăng trưởng (xem src/growth.js):
 *   - Trong CHAT RIÊNG: kèm nút "➕ Thêm Lì Xì Bot vào nhóm của bạn" (deep link
 *     `?startgroup=`), vì người đang chat riêng với bot là người đã quan tâm.
 *   - Trong NHÓM: nếu /start mang payload giới thiệu (người dùng vừa thêm bot qua nút ở một
 *     nhóm khác), ghi nhận nhóm nguồn vào `state.growth` — CHỈ để chủ bot thống kê; không
 *     bao giờ in id nhóm nguồn ra tin nhắn. Nếu bot vừa chào mừng nhóm (my_chat_member)
 *     thì không chào lần hai.
 */

const growth = require('../growth');
const { isGroupChat } = require('./helpers');

const WELCOME_TEXT = `👋 <b>Chào mừng đến với Lì Xì Bot!</b>

Bot giúp cả nhóm tip nhau, lì xì ngẫu nhiên và nhận thưởng hoạt động bằng <b>điểm LIXI</b>.

⚠️ <b>Lưu ý quan trọng (đọc trước khi dùng):</b>
Điểm LIXI <b>chưa có giá trị tiền thật và không phải khoản đầu tư</b>. Đây là bản thử nghiệm: điểm được lưu trong database của bot, chưa gắn với token thật, và <b>có thể bị reset</b> trong giai đoạn này.

<b>Lệnh cơ bản:</b>
• <code>/lixi @user 100</code> — tip 100 điểm cho một người
• <code>/lixi 500 chia 5</code> — mở bao lì xì 500 điểm cho 5 người nhận ngẫu nhiên
• <code>/sodu</code> — xem số dư của bạn trong nhóm này
• <code>/lichsu</code> — xem 10 giao dịch gần nhất của bạn
• <code>/bxh</code> — top 10 người nhận nhiều lì xì nhất 7 ngày qua
• <code>/rut 0x1a2b3c... 100</code> — gửi yêu cầu rút (admin xử lý thủ công, chưa chuyển tiền thật)
• <code>/pot</code> — (chỉ admin) xem tổng số dư pot của nhóm
• <code>/caidat</code> — (chỉ admin) xem/đổi cấu hình chống lạm dụng của nhóm
• <code>/huongdan</code> — hướng dẫn đầy đủ (thành viên + admin)

Hầu hết lệnh chỉ dùng được <b>trong nhóm</b>, không dùng trong chat riêng với bot. Chúc bạn nhận nhiều lì xì! 🧧`;

const PRIVATE_ADD_HINT = '\n\n👇 Bạn quản trị một nhóm? Bấm nút bên dưới để thêm bot vào nhóm chỉ với một chạm.';

function register(bot, { storage = null, identity = null } = {}) {
  // Dùng bot.command thay vì bot.start() vì /start cần hoạt động cả trong nhóm
  // (không chỉ lúc bắt đầu chat riêng với bot qua deep-link).
  bot.command('start', async (ctx) => {
    if (isGroupChat(ctx) && storage) {
      const now = Date.now();
      const sourceChatId = growth.decodeReferralPayload(ctx.payload);
      const { justOnboarded } = await storage.withGroup(
        ctx.chat.id,
        (state) => {
          if (sourceChatId) growth.recordReferral(state, sourceChatId, now);
          return { justOnboarded: growth.wasJustOnboarded(state, now) };
        },
        { nowMs: now }
      );
      // Bot vừa đăng lời chào mừng khi được thêm vào nhóm — /start do Telegram gửi kèm
      // ngay sau đó không cần chào lần hai.
      if (justOnboarded) return;
      await ctx.replyWithHTML(WELCOME_TEXT);
      return;
    }

    // Chat riêng: kèm nút "thêm vào nhóm" (nếu đã biết username bot). Không có nhóm nguồn.
    const url = identity ? await identity.addToGroupUrl(null) : null;
    const keyboard = growth.addToGroupKeyboard(url);
    if (keyboard) {
      await ctx.replyWithHTML(WELCOME_TEXT + PRIVATE_ADD_HINT, { reply_markup: keyboard });
      return;
    }
    await ctx.replyWithHTML(WELCOME_TEXT);
  });
}

module.exports = { register, WELCOME_TEXT };
