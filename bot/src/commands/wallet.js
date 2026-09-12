'use strict';

/**
 * commands/wallet.js — Lệnh xem thông tin cá nhân: /sodu, /lichsu.
 * Đây là hai lệnh KHÔNG di chuyển giá trị, nên không cần kiểm tra tuổi tài khoản
 * trong nhóm (per docs/09: "/sodu, /lichsu, /start" vẫn dùng được cho user mới).
 */

const ledger = require('../ledger');
const { requireGroup, formatVNDateTime, escapeHtml } = require('./helpers');

const TX_LABELS = {
  tip: 'Tip',
  transfer: 'Chuyển điểm',
  credit: 'Được cấp điểm',
  debit: 'Bị trừ điểm',
  reward: 'Thưởng hoạt động',
  envelope_refund: 'Hoàn điểm bao lì xì',
  withdrawal_hold: 'Giữ điểm để rút',
  withdrawal_refund: 'Hoàn điểm (rút bị từ chối)',
  admin_credit: 'Admin cấp điểm',
};

/**
 * Một dòng lịch sử. `state` dùng để tra TÊN của người ở đầu kia giao dịch — không có
 * state (hoặc chưa lưu tên) thì `ledger.memberLabel` trả về "người dùng #<id>".
 *
 * Tên do người dùng tự đặt nên luôn phải `escapeHtml` trước khi ghép vào tin nhắn HTML.
 */
function describeTx(tx, userId, state = null) {
  const key = String(userId);
  const label = TX_LABELS[tx.type] || tx.type;
  const time = formatVNDateTime(tx.ts);
  const who = (id) => escapeHtml(ledger.memberLabel(state, id));
  let direction = '';
  if (tx.to === key && tx.from) direction = ` từ ${tx.from === 'pot' ? 'pot' : who(tx.from)}`;
  if (tx.from === key && tx.to) direction = ` cho ${tx.to === 'pot' ? 'pot' : who(tx.to)}`;
  const sign = tx.to === key ? '+' : tx.from === key ? '-' : '';
  const note = tx.note ? ` — ${escapeHtml(tx.note)}` : '';
  return `• [${time}] ${label}${direction}: ${sign}${tx.amount} điểm${note}`;
}

function register(bot, { storage }) {
  bot.command('sodu', async (ctx) => {
    if (!(await requireGroup(ctx))) return;
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const balance = await storage.withGroup(chatId, (state) => {
      ledger.rememberMember(state, ctx.from);
      return ledger.getBalance(state, userId);
    });
    await ctx.replyWithHTML(`💰 Số dư của bạn trong nhóm này: <b>${balance} điểm LIXI</b>.`);
  });

  bot.command('lichsu', async (ctx) => {
    if (!(await requireGroup(ctx))) return;
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    await storage.withGroup(chatId, (state) => ledger.rememberMember(state, ctx.from));
    // Dùng phương thức của kho lưu trữ (không lọc trong bộ nhớ): với kho Postgres đây là
    // một truy vấn có chỉ mục, nên vẫn đúng cả khi nhóm đã có rất nhiều giao dịch.
    const txs = await storage.listRecentTransactions(chatId, userId, 10);
    if (txs.length === 0) {
      await ctx.reply('Bạn chưa có giao dịch nào trong nhóm này.');
      return;
    }
    // Đọc state (chỉ đọc, không khoá) để tra TÊN của người ở đầu kia mỗi giao dịch —
    // trước đây dòng lịch sử hiện số id Telegram, đọc lên không biết là ai.
    const state = await storage.readGroup(chatId);
    const lines = txs.map((tx) => describeTx(tx, userId, state));
    await ctx.replyWithHTML(`🧾 <b>10 giao dịch gần nhất của bạn:</b>\n${lines.join('\n')}`);
  });
}

module.exports = { register, describeTx };
