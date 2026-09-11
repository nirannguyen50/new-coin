'use strict';

/**
 * commands/admin.js — Các lệnh chỉ admin nhóm (Telegram chat admin, hoặc userId nằm
 * trong BOT_SUPER_ADMIN_IDS) dùng được:
 *
 *   /pot                       — xem số dư pot nhóm + log admin cấp điểm gần đây
 *   /nap <amount>               — "nạp pot" thủ công (off-chain, ghi log rõ ràng)
 *   /nap @user <amount>         — cấp điểm trực tiếp cho một thành viên
 *   /thuong <N> <M>              — đặt/cập nhật quy tắc thưởng: N điểm/ngày cho
 *                                  thành viên có >= M tin nhắn hợp lệ/ngày
 *   /rut_duyet <id>              — duyệt yêu cầu rút đang 'pending'
 *   /rut_huy <id>                — từ chối yêu cầu rút đang 'pending' (hoàn điểm)
 *   /duyet <id>                  — duyệt giao dịch tip lớn đang chờ trong hàng đợi
 *   /tuchoi <id>                 — từ chối giao dịch tip lớn đang chờ trong hàng đợi
 */

const store = require('../store');
const ledger = require('../ledger');
const { requireGroup, isChatAdmin, formatVNDateTime, escapeHtml } = require('./helpers');

function requireAdmin(superAdminIds) {
  return async (ctx, next) => {
    if (!(await requireGroup(ctx))) return;
    const ok = await isChatAdmin(ctx, ctx.from.id, superAdminIds);
    if (!ok) {
      await ctx.reply('Lệnh này chỉ dành cho admin của nhóm.');
      return;
    }
    return next();
  };
}

function register(bot, { superAdminIds = [] } = {}) {
  const adminGate = requireAdmin(superAdminIds);

  bot.command('pot', adminGate, async (ctx) => {
    const chatId = ctx.chat.id;
    const state = store.readGroupState(chatId);
    const potBalance = ledger.getPotBalance(state);
    const circulating = ledger.getTotalCirculatingBalance(state);
    const recentLog = (state.adminCreditLog || []).slice(-10).reverse();

    const logLines =
      recentLog.length === 0
        ? 'Chưa có lần nạp/cấp điểm nào.'
        : recentLog
            .map((entry) => {
              const target = entry.target === 'pot' ? 'pot nhóm' : `#${entry.target}`;
              return `• [${formatVNDateTime(entry.ts)}] admin #${entry.adminId} cấp ${entry.amount} điểm cho ${target}${
                entry.note ? ` — ${escapeHtml(entry.note)}` : ''
              }`;
            })
            .join('\n');

    await ctx.replyWithHTML(
      `🏦 <b>Pot nhóm</b>\n` +
        `Số dư pot (đã nạp, dùng để phát thưởng): <b>${potBalance} điểm</b>\n` +
        `Tổng số dư đang lưu hành trong nhóm (mọi thành viên): <b>${circulating} điểm</b>\n\n` +
        `<b>Log admin cấp điểm gần đây:</b>\n${logLines}`
    );
  });

  bot.command('nap', adminGate, async (ctx) => {
    const chatId = ctx.chat.id;
    const adminId = ctx.from.id;
    const now = Date.now();
    const rest = (ctx.message.text || '').replace(/^\/nap(?:@\S+)?\s*/i, '').trim();

    const withUser = rest.match(/^@(\S+)\s+(\d+)$/);
    const potOnly = rest.match(/^(\d+)$/);

    if (withUser) {
      const usernameOrTarget = withUser[1];
      const amount = parseInt(withUser[2], 10);
      let target = null;
      const entities = ctx.message.entities || [];
      for (const e of entities) {
        if (e.type === 'text_mention' && e.user) target = e.user;
      }
      if (!target) {
        try {
          const chat = await ctx.telegram.getChat(`@${usernameOrTarget}`);
          if (chat && chat.id) target = { id: chat.id, first_name: chat.first_name || chat.username };
        } catch (err) {
          target = null;
        }
      }
      if (!target) {
        await ctx.reply('Không xác định được người nhận. Hãy dùng đúng @username công khai.');
        return;
      }
      if (!Number.isInteger(amount) || amount <= 0) {
        await ctx.reply('Số điểm phải là số nguyên dương.');
        return;
      }
      const entry = store.withGroupState(chatId, (state) => {
        ledger.ensureMember(state, target.id, now);
        return ledger.adminCreditUser(state, adminId, target.id, amount, 'Admin cấp điểm trực tiếp', now);
      });
      await ctx.replyWithHTML(`✅ Đã cấp <b>${entry.amount} điểm</b> trực tiếp cho #${entry.target}.`);
      return;
    }

    if (potOnly) {
      const amount = parseInt(potOnly[1], 10);
      if (!Number.isInteger(amount) || amount <= 0) {
        await ctx.reply('Số điểm phải là số nguyên dương.');
        return;
      }
      const entry = store.withGroupState(chatId, (state) =>
        ledger.adminCreditPot(state, adminId, amount, 'Nạp pot thủ công (off-chain, xem docs/11)', now)
      );
      await ctx.replyWithHTML(`✅ Đã nạp <b>${entry.amount} điểm</b> vào pot nhóm.`);
      return;
    }

    await ctx.replyWithHTML(
      'Cú pháp:\n<code>/nap 1000</code> — nạp pot nhóm\n<code>/nap @user 100</code> — cấp điểm trực tiếp cho thành viên'
    );
  });

  bot.command('thuong', adminGate, async (ctx) => {
    const rest = (ctx.message.text || '').replace(/^\/thuong(?:@\S+)?\s*/i, '').trim();
    const m = rest.match(/^(\d+)\s+(\d+)$/);
    if (!m) {
      await ctx.replyWithHTML(
        'Cú pháp: <code>/thuong 10 5</code> — 10 điểm/ngày cho thành viên có >= 5 tin nhắn hợp lệ/ngày.'
      );
      return;
    }
    const pointsPerDay = parseInt(m[1], 10);
    const minMessages = parseInt(m[2], 10);
    if (pointsPerDay <= 0 || minMessages <= 0) {
      await ctx.reply('Cả hai số phải là số nguyên dương.');
      return;
    }
    const chatId = ctx.chat.id;
    const adminId = ctx.from.id;
    const now = Date.now();
    store.withGroupState(chatId, (state) => {
      state.rewardRule = { pointsPerDay, minMessages, updatedAt: now, updatedBy: String(adminId) };
    });
    await ctx.replyWithHTML(
      `✅ Đã cập nhật quy tắc thưởng hoạt động: <b>${pointsPerDay} điểm/ngày</b> cho thành viên có ` +
        `<b>&ge; ${minMessages} tin nhắn</b> hợp lệ/ngày. Chi từ số dư pot hiện có (<code>/pot</code>).`
    );
  });

  bot.command('rut_duyet', adminGate, async (ctx) => withdrawalDecision(ctx, 'approve'));
  bot.command('rut_huy', adminGate, async (ctx) => withdrawalDecision(ctx, 'reject'));

  async function withdrawalDecision(ctx, decision) {
    const rest = (ctx.message.text || '').replace(/^\/\S+\s*/, '').trim();
    const id = rest.match(/^(\d+)$/);
    if (!id) {
      await ctx.reply('Cú pháp: /rut_duyet <mã yêu cầu> hoặc /rut_huy <mã yêu cầu>.');
      return;
    }
    const chatId = ctx.chat.id;
    const adminId = ctx.from.id;
    try {
      const record = store.withGroupState(chatId, (state) =>
        ledger.decideWithdrawal(state, id[1], decision, adminId, Date.now())
      );
      const verb = decision === 'approve' ? 'duyệt' : 'từ chối (đã hoàn điểm)';
      await ctx.replyWithHTML(
        `✅ Đã ${verb} yêu cầu rút <b>#${record.id}</b> (${record.amount} điểm, ${record.address}).`
      );
    } catch (err) {
      await ctx.reply(`Không xử lý được: ${err.message}`);
    }
  }

  bot.command('duyet', adminGate, async (ctx) => approvalDecision(ctx, 'approve'));
  bot.command('tuchoi', adminGate, async (ctx) => approvalDecision(ctx, 'reject'));

  async function approvalDecision(ctx, decision) {
    const rest = (ctx.message.text || '').replace(/^\/\S+\s*/, '').trim();
    const id = rest.match(/^(\d+)$/);
    if (!id) {
      await ctx.reply('Cú pháp: /duyet <mã giao dịch> hoặc /tuchoi <mã giao dịch>.');
      return;
    }
    const chatId = ctx.chat.id;
    const adminId = ctx.from.id;
    try {
      const approval = store.withGroupState(chatId, (state) =>
        decision === 'approve'
          ? ledger.approveQueuedTransfer(state, id[1], adminId, Date.now())
          : ledger.rejectQueuedTransfer(state, id[1], adminId, Date.now())
      );
      const verb = decision === 'approve' ? 'duyệt' : 'từ chối';
      await ctx.replyWithHTML(
        `✅ Đã ${verb} giao dịch <b>#${approval.id}</b> (tip ${approval.amount} điểm từ #${approval.fromUserId} cho #${approval.toUserId}).`
      );
    } catch (err) {
      await ctx.reply(`Không xử lý được: ${err.message}`);
    }
  }
}

module.exports = { register, requireAdmin };
