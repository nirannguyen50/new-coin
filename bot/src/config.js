'use strict';

/**
 * config.js — Đọc cấu hình từ biến môi trường (không lưu bí mật trong code).
 */

function parseSuperAdminIds(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const { chooseMode, hasPersistentStore } = require('./webhook');

function loadConfig(env = process.env) {
  // Chế độ chạy: webhook (khi deploy lên Render / có tên miền công khai) hoặc
  // long polling (khi chạy ở máy cá nhân). Xem src/webhook.js để biết vì sao.
  const runtime = chooseMode(env);
  return {
    telegramBotToken: env.TELEGRAM_BOT_TOKEN || '',
    // 'webhook' | 'polling'
    mode: runtime.mode,
    // Tên miền công khai đã chuẩn hoá (https://..., không có dấu / cuối), rỗng nếu polling.
    webhookDomain: runtime.domain,
    // Tên biến môi trường đã cung cấp tên miền — chỉ dùng để log cho dễ hiểu.
    webhookDomainSource: runtime.source,
    // Cổng HTTP để lắng nghe ở chế độ webhook (Render tự đặt biến PORT).
    port: runtime.port,
    // Có cấu hình kho dữ liệu bền vững ngoài (DATABASE_URL/REDIS_URL) hay chưa.
    // Hiện bot CHƯA dùng database; cờ này chỉ để bật cảnh báo mất dữ liệu khi cần.
    persistentStoreConfigured: hasPersistentStore(env),
    // Danh sách userId luôn được coi là admin (hữu ích khi test, hoặc admin ẩn danh nhóm).
    superAdminIds: parseSuperAdminIds(env.BOT_SUPER_ADMIN_IDS),
    // Job thưởng hoạt động chạy lại mỗi X phút để kiểm tra "hôm nay đã phát chưa" (idempotent).
    // Đây KHÔNG phải cron thật — chỉ setInterval trong tiến trình bot, đủ cho quy mô beta
    // (3 nhóm pilot). Trước khi mở rộng, thay bằng scheduler thật (cron/queue ngoài tiến trình).
    dailyRewardCheckIntervalMinutes: Number(env.DAILY_REWARD_CHECK_INTERVAL_MINUTES) || 60,
  };
}

module.exports = { loadConfig, parseSuperAdminIds };
