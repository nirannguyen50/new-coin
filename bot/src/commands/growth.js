'use strict';

/**
 * commands/growth.js — Các lệnh/sự kiện giúp bot TỰ LAN TRUYỀN qua việc dùng bình thường
 * (xem quy tắc trung thực ở đầu src/growth.js):
 *
 *   my_chat_member   — bot vừa được thêm vào nhóm / được cấp admin: chào mừng admin ĐÚNG
 *                      MỘT LẦN (idempotent), nói rõ cần quyền gì nếu thiếu, VÀ nhắn riêng
 *                      cho chủ bot biết "có nhóm mới" (bỏ qua các nhóm trong IGNORED_CHAT_IDS).
 *   /huongdan        — hướng dẫn ngắn, ai cũng gõ được, trong nhóm hay chat riêng.
 *   /bxh             — top 10 người NHẬN nhiều điểm nhất 7 ngày qua (tip + bao lì xì).
 *   /thongke         — chỉ chủ bot (BOT_SUPER_ADMIN_IDS): số nhóm, nhóm hoạt động, ...
 *                      CHỈ SỐ ĐẾM, không tên, không id.
 */

const ledger = require('../ledger');
const growth = require('../growth');
const { requireGroup, escapeHtml, formatNumber } = require('./helpers');
const { safeErrorMessage } = require('../redact');

const RANK_MARKS = ['🥇', '🥈', '🥉'];

function rankMark(index) {
  return RANK_MARKS[index] || `${index + 1}.`;
}

/**
 * Nhắn riêng cho chủ bot khi một nhóm THẬT vừa thêm bot.
 *
 * Chạy đúng MỘT LẦN cho mỗi nhóm vì chỉ được gọi khi `applyMyChatMember` trả về
 * 'welcome' — mốc `onboardedAt` trong state đã lo phần idempotent, không cần cờ riêng.
 *
 * KHÔNG BAO GIỜ ném lỗi ra ngoài: lời chào mừng trong nhóm mới là việc chính, còn tin
 * báo cho chủ bot là việc phụ. Chủ bot chưa bấm Start với bot thì Telegram trả lỗi
 * "can't initiate conversation" — chuyện bình thường, không được để nó làm hỏng gì cả.
 */
async function alertOwnersAboutNewGroup(ctx, { storage, superAdminIds, env, chat, info, referred }) {
  try {
    if (!superAdminIds || superAdminIds.length === 0) return;
    const ignored = growth.parseIgnoredChatIds(env.IGNORED_CHAT_IDS);
    if (growth.isIgnoredChatId(chat.id, ignored)) {
      console.log('[nhom-moi] Bỏ qua tin báo: nhóm nằm trong IGNORED_CHAT_IDS.');
      return;
    }

    // Số thành viên: "rẻ thì lấy" — một lệnh API, hỏng thì thôi, không thử lại.
    let memberCount = null;
    try {
      memberCount = await ctx.telegram.getChatMembersCount(chat.id);
    } catch (err) {
      memberCount = null;
    }

    let groupsTotal = null;
    try {
      const stats = await storage.growthStats(growth.statsWindowStart(Date.now()));
      groupsTotal = stats.groupsTotal;
    } catch (err) {
      groupsTotal = null;
    }

    const text = growth.newGroupAlertText(
      { title: chat.title, memberCount, referred, groupsTotal, isAdmin: info.isAdmin },
      { escapeHtml, formatNumber }
    );
    await growth.notifySuperAdmins(ctx.telegram, superAdminIds, text);
  } catch (err) {
    console.error('Không gửi được tin báo nhóm mới:', safeErrorMessage(err));
  }
}

function register(bot, { storage, superAdminIds = [], env = process.env } = {}) {
  // -------------------------------------------------------------------------
  // Bot vừa được thêm vào nhóm / cấp admin / gỡ khỏi nhóm
  // -------------------------------------------------------------------------
  bot.on('my_chat_member', async (ctx) => {
    const update = ctx.myChatMember;
    const chat = update && update.chat;
    if (!chat || !(chat.type === 'group' || chat.type === 'supergroup')) return;
    const info = growth.classifyMyChatMember(update);
    if (info.event === 'none') return;

    const now = Date.now();
    const outcome = await storage.withGroup(
      chat.id,
      (state) => {
        const post = growth.applyMyChatMember(state, info, now);
        // Đọc luôn trong cùng transaction: nhóm đến từ nút "Thêm vào nhóm" hay không.
        // (Thường payload /start tới ngay SAU update này nên phần lớn trường hợp là
        // "chưa ghi nhận" — tin báo nói đúng những gì biết tại thời điểm đó.)
        return { post, referred: !!(state.growth && state.growth.referredByChatId) };
      },
      { nowMs: now }
    );
    if (outcome.post === 'welcome') {
      await ctx.replyWithHTML(growth.onboardingText({ isAdmin: info.isAdmin }));
      await alertOwnersAboutNewGroup(ctx, {
        storage,
        superAdminIds,
        env,
        chat,
        info,
        referred: outcome.referred,
      });
    } else if (outcome.post === 'admin_ok') {
      await ctx.replyWithHTML(growth.ADMIN_GRANTED_TEXT);
    }
  });

  // -------------------------------------------------------------------------
  // /huongdan — ai cũng dùng được, ở đâu cũng được
  // -------------------------------------------------------------------------
  bot.command('huongdan', async (ctx) => {
    await ctx.replyWithHTML(growth.GUIDE_TEXT);
  });

  // -------------------------------------------------------------------------
  // /bxh — bảng xếp hạng điểm NHẬN ĐƯỢC trong 7 ngày (không phải số dư)
  // -------------------------------------------------------------------------
  bot.command('bxh', async (ctx) => {
    if (!(await requireGroup(ctx))) return;
    const chatId = ctx.chat.id;
    const now = Date.now();
    const sinceMs = growth.statsWindowStart(now);
    const txs = await storage.listTransactionsSince(chatId, sinceMs, ledger.RECEIVED_TX_TYPES);
    const ranked = ledger.rankReceivers(txs, { sinceMs, untilMs: now, limit: 10 });
    if (ranked.length === 0) {
      await ctx.replyWithHTML(
        `🏆 Chưa ai nhận lì xì trong ${growth.STATS_WINDOW_DAYS} ngày qua. ` +
          'Mở bao đầu tiên: <code>/lixi 100 chia 3</code>'
      );
      return;
    }
    // Đọc state (chỉ đọc) để tra TÊN; tên do người dùng tự đặt nên phải escapeHtml.
    const state = await storage.readGroup(chatId);
    const lines = ranked.map(
      (r, i) =>
        `${rankMark(i)} ${escapeHtml(ledger.memberLabel(state, r.userId))} — <b>${formatNumber(
          r.amount
        )} điểm</b>`
    );
    await ctx.replyWithHTML(
      `🏆 <b>Bảng xếp hạng ${growth.STATS_WINDOW_DAYS} ngày qua</b> ` +
        '(điểm nhận được từ tip và bao lì xì)\n' +
        lines.join('\n')
    );
  });

  // -------------------------------------------------------------------------
  // /thongke — chỉ chủ bot; chạy được trong chat riêng
  // -------------------------------------------------------------------------
  bot.command('thongke', async (ctx) => {
    if (!ctx.from || !superAdminIds.includes(String(ctx.from.id))) {
      await ctx.reply('Lệnh này chỉ dành cho chủ bot.');
      return;
    }
    const now = Date.now();
    try {
      const stats = await storage.growthStats(growth.statsWindowStart(now));
      await ctx.replyWithHTML(growth.statsText(stats, { formatNumber }));
    } catch (err) {
      await ctx.reply(`Không lấy được thống kê: ${safeErrorMessage(err)}`);
    }
  });
}

module.exports = { alertOwnersAboutNewGroup, register, rankMark };
