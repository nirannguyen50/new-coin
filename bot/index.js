'use strict';

/**
 * index.js — Điểm khởi động Lì Xì Bot.
 * Đọc TELEGRAM_BOT_TOKEN từ biến môi trường; nếu thiếu, in lỗi rõ ràng và exit 1
 * (KHÔNG được thoát exit 0 im lặng — dễ khiến người vận hành tưởng bot chạy tốt).
 */

const { loadConfig } = require('./src/config');
const { createBot, startDailyRewardJob } = require('./src/bot');

function loadDotEnvIfPresent() {
  // Không bắt buộc phải có package `dotenv` — tự đọc file .env đơn giản nếu tồn tại,
  // để giữ số dependency ở mức tối thiểu (đúng tinh thần "không cần native module").
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function main() {
  loadDotEnvIfPresent();
  const config = loadConfig();

  if (!config.telegramBotToken) {
    console.error(
      'LỖI: Không tìm thấy TELEGRAM_BOT_TOKEN.\n' +
        'Vui lòng tạo file bot/.env (xem bot/.env.example) hoặc set biến môi trường ' +
        'TELEGRAM_BOT_TOKEN với token lấy từ @BotFather trên Telegram (xem README.md ' +
        'mục "Tạo bot qua BotFather") rồi chạy lại.'
    );
    process.exit(1);
    return;
  }

  const bot = createBot(config.telegramBotToken, { superAdminIds: config.superAdminIds });

  startDailyRewardJob(config.dailyRewardCheckIntervalMinutes);

  bot
    .launch()
    .then(() => {
      console.log('Lì Xì Bot đã khởi động, đang chờ tin nhắn...');
    })
    .catch((err) => {
      console.error('Không khởi động được bot:', err.message);
      process.exit(1);
    });

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

main();
