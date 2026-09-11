'use strict';

/**
 * bot.js — Khởi tạo Telegraf, đăng ký các lệnh, và job thưởng hoạt động hằng ngày.
 */

const { Telegraf } = require('telegraf');
const store = require('./store');
const ledger = require('./ledger');

const startCmd = require('./commands/start');
const walletCmd = require('./commands/wallet');
const tipCmd = require('./commands/tip');
const withdrawCmd = require('./commands/withdraw');
const adminCmd = require('./commands/admin');

function isTrackedGroup(ctx) {
  return !!ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') && !!ctx.from;
}

function createBot(token, { superAdminIds = [] } = {}) {
  const bot = new Telegraf(token);

  // 1) Đánh dấu "đã thấy" người gửi trong nhóm — dùng cho hạn tuổi tài khoản
  //    (min account age). Chạy cho MỌI update có tin nhắn, kể cả lệnh.
  bot.use(async (ctx, next) => {
    if (isTrackedGroup(ctx)) {
      store.withGroupState(ctx.chat.id, (state) => {
        ledger.ensureMember(state, ctx.from.id);
      });
    }
    return next();
  });

  // 2) Đếm tin nhắn văn bản hợp lệ (không phải lệnh) cho thưởng hoạt động hằng ngày.
  //    Đăng ký trên bot.on('message', ...) và LUÔN gọi next() để các lệnh cụ thể
  //    (bot.command(...)) đăng ký sau vẫn được chạy bình thường.
  bot.on('message', async (ctx, next) => {
    const msg = ctx.message;
    const isCommand = !!(msg.text && msg.text.startsWith('/'));
    if (isTrackedGroup(ctx) && msg.text && !isCommand) {
      store.withGroupState(ctx.chat.id, (state) => {
        ledger.recordMessage(state, ctx.from.id);
      });
    }
    return next();
  });

  startCmd.register(bot);
  walletCmd.register(bot);
  tipCmd.register(bot);
  withdrawCmd.register(bot);
  adminCmd.register(bot, { superAdminIds });

  bot.catch((err, ctx) => {
    // Không để một lỗi lệnh làm crash cả tiến trình bot.
    console.error(`Lỗi khi xử lý update ${ctx.updateType}:`, err);
  });

  return bot;
}

/**
 * Chạy job "thưởng hoạt động" cho mọi nhóm đã có dữ liệu, mỗi lần gọi kiểm tra
 * idempotent theo ngày hiện tại (UTC) — an toàn khi gọi lại nhiều lần.
 *
 * LƯU Ý: dùng setInterval trong tiến trình bot — CHỈ phù hợp quy mô beta (3 nhóm
 * pilot). Trước khi mở rộng, thay bằng một scheduler thật (cron ngoài tiến trình,
 * hoặc queue) để không phụ thuộc vào việc tiến trình bot có đang chạy liên tục.
 */
function startDailyRewardJob(intervalMinutes) {
  const runOnce = () => {
    const now = Date.now();
    const dateStr = ledger.dateKey(now);
    for (const chatId of store.listGroupIds()) {
      try {
        store.withGroupState(chatId, (state) => ledger.runDailyReward(state, dateStr, now));
      } catch (err) {
        console.error(`[thuong-hoat-dong] Lỗi khi chạy cho nhóm ${chatId}:`, err.message);
      }
    }
  };
  runOnce(); // chạy ngay lúc khởi động (idempotent, không sao nếu đã chạy hôm nay rồi)
  const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
  return setInterval(runOnce, intervalMs);
}

module.exports = { createBot, startDailyRewardJob };
