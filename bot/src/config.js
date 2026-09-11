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

function loadConfig(env = process.env) {
  return {
    telegramBotToken: env.TELEGRAM_BOT_TOKEN || '',
    // Danh sách userId luôn được coi là admin (hữu ích khi test, hoặc admin ẩn danh nhóm).
    superAdminIds: parseSuperAdminIds(env.BOT_SUPER_ADMIN_IDS),
    // Job thưởng hoạt động chạy lại mỗi X phút để kiểm tra "hôm nay đã phát chưa" (idempotent).
    // Đây KHÔNG phải cron thật — chỉ setInterval trong tiến trình bot, đủ cho quy mô beta
    // (3 nhóm pilot). Trước khi mở rộng, thay bằng scheduler thật (cron/queue ngoài tiến trình).
    dailyRewardCheckIntervalMinutes: Number(env.DAILY_REWARD_CHECK_INTERVAL_MINUTES) || 60,
  };
}

module.exports = { loadConfig, parseSuperAdminIds };
