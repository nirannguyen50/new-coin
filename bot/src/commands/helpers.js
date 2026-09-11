'use strict';

/**
 * helpers.js — Hàm dùng chung cho các file lệnh: kiểm tra admin, định dạng
 * tin nhắn, mention, ngày giờ theo giờ Việt Nam. Đây là lớp "impure" nói
 * chuyện với Telegram; logic nghiệp vụ thật nằm ở src/ledger.js.
 */

// Cache danh sách admin theo chatId, TTL ngắn để đỡ gọi API Telegram liên tục.
// Đủ dùng cho quy mô beta (3 nhóm pilot); không cần Redis/cache ngoài tiến trình.
const ADMIN_CACHE_TTL_MS = 60 * 1000;
const adminCache = new Map(); // chatId -> { ids: Set<string>, expiresAt: number }

async function isChatAdmin(ctx, userId, superAdminIds = []) {
  const key = String(userId);
  if (superAdminIds.includes(key)) return true;
  if (!ctx.chat) return false;
  const chatId = ctx.chat.id;
  const now = Date.now();
  const cached = adminCache.get(chatId);
  if (cached && cached.expiresAt > now) {
    return cached.ids.has(key);
  }
  let admins = [];
  try {
    admins = await ctx.telegram.getChatAdministrators(chatId);
  } catch (err) {
    admins = [];
  }
  const ids = new Set(admins.map((a) => String(a.user.id)));
  adminCache.set(chatId, { ids, expiresAt: now + ADMIN_CACHE_TTL_MS });
  return ids.has(key);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Mention HTML bấm vào mở trang cá nhân, không cần user có @username công khai. */
function mentionHtml(user) {
  const name = escapeHtml(user.first_name || user.username || `user${user.id}`);
  return `<a href="tg://user?id=${user.id}">${name}</a>`;
}

function isGroupChat(ctx) {
  return !!ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup');
}

function formatVNDateTime(ms) {
  return new Date(ms).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false,
  });
}

function formatSeconds(ms) {
  return Math.ceil(ms / 1000);
}

async function requireGroup(ctx) {
  if (isGroupChat(ctx)) return true;
  await ctx.reply('Lệnh này chỉ dùng được trong nhóm, không dùng trong chat riêng.');
  return false;
}

module.exports = {
  isChatAdmin,
  escapeHtml,
  mentionHtml,
  isGroupChat,
  formatVNDateTime,
  formatSeconds,
  requireGroup,
};
