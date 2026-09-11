'use strict';

/**
 * commands/wallet.js — Lệnh xem thông tin cá nhân: /sodu, /lichsu.
 * Đây là hai lệnh KHÔNG di chuyển giá trị, nên không cần kiểm tra tuổi tài khoản
 * trong nhóm (per docs/09: "/sodu, /lichsu, /start" vẫn dùng được cho user mới).
 */

const store = require('../store');
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

function describeTx(tx, userId) {
  const key = String(userId);
  const label = TX_LABELS[tx.type] || tx.type;
  const time = formatVNDateTime(tx.ts);
  let direction = '';
  if (tx.to === key && tx.from) direction = ` từ ${tx.from === 'pot' ? 'pot' : `#${tx.from}`}`;
  if (tx.from === key && tx.to) direction = ` cho #${tx.to}`;
  const sign = tx.to === key ? '+' : tx.from === key ? '-' : '';
  const note = tx.note ? ` — ${escapeHtml(tx.note)}` : '';
  return `• [${time}] ${label}${direction}: ${sign}${tx.amount} điểm${note}`;
}

function register(bot) {
  bot.command('sodu', async (ctx) => {
    if (!(await requireGroup(ctx))) return;
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const balance = store.withGroupState(chatId, (state) => {
      ledger.ensureMember(state, userId);
      return ledger.getBalance(state, userId);
    });
    await ctx.replyWithHTML(`💰 Số dư của bạn trong nhóm này: <b>${balance} điểm LIXI</b>.`);
  });

  bot.command('lichsu', async (ctx) => {
    if (!(await requireGroup(ctx))) return;
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const txs = store.withGroupState(chatId, (state) => {
      ledger.ensureMember(state, userId);
      return ledger.listRecentTransactionsPure(state, userId, 10);
    });
    if (txs.length === 0) {
      await ctx.reply('Bạn chưa có giao dịch nào trong nhóm này.');
      return;
    }
    const lines = txs.map((tx) => describeTx(tx, userId));
    await ctx.replyWithHTML(`🧾 <b>10 giao dịch gần nhất của bạn:</b>\n${lines.join('\n')}`);
  });
}

module.exports = { register, describeTx };
