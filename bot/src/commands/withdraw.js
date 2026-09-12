'use strict';

/**
 * commands/withdraw.js — Lệnh /rut <address> <amount>.
 * v0 KHÔNG gửi crypto thật (per docs/11): chỉ ghi nhận yêu cầu trạng thái `pending`,
 * giữ (trừ ngay) số điểm tương ứng, và admin xử lý thủ công bằng /rut_duyet, /rut_huy.
 */

const ledger = require('../ledger');
const { requireGroup } = require('./helpers');
const { safeErrorMessage } = require('../redact');

function parseRutArgs(text) {
  const rest = String(text || '').replace(/^\/rut(?:@\S+)?\s*/i, '').trim();
  const m = rest.match(/^(\S+)\s+(\d+)$/);
  if (!m) return null;
  return { address: m[1], amount: parseInt(m[2], 10) };
}

function register(bot, { storage }) {
  bot.command('rut', async (ctx) => {
    if (!(await requireGroup(ctx))) return;
    const parsed = parseRutArgs(ctx.message.text || '');
    if (!parsed) {
      await ctx.replyWithHTML(
        'Cú pháp: <code>/rut 0xĐịaChỉBEP20 100</code> (địa chỉ dạng 0x + 40 ký tự hex).'
      );
      return;
    }

    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const now = Date.now();

    let outcome;
    try {
      outcome = await storage.withGroup(chatId, (state) => {
        ledger.ensureMember(state, userId, now);

        const cooldown = ledger.checkCooldown(state, userId, now);
        if (!cooldown.ok) return { type: 'cooldown', waitMs: cooldown.waitMs };
        ledger.recordCommandTime(state, userId, now);

        const age = ledger.checkMinAccountAge(state, userId, now);
        if (!age.ok) return { type: 'too_new', ageDays: age.ageDays, minDays: age.minDays };

        if (!ledger.isValidBep20Address(parsed.address)) {
          return { type: 'invalid_address' };
        }
        if (!Number.isInteger(parsed.amount) || parsed.amount <= 0) {
          return { type: 'invalid_amount' };
        }
        if (ledger.getBalance(state, userId) < parsed.amount) {
          return { type: 'insufficient', balance: ledger.getBalance(state, userId) };
        }

        const record = ledger.createWithdrawalRequest(state, userId, parsed.address, parsed.amount, now);
        return { type: 'ok', record };
      });
    } catch (err) {
      await ctx.reply(`Không tạo được yêu cầu rút: ${safeErrorMessage(err)}`);
      return;
    }

    await replyOutcome(ctx, outcome);
  });
}

async function replyOutcome(ctx, outcome) {
  switch (outcome.type) {
    case 'cooldown':
      await ctx.reply(`⏳ Vui lòng đợi ${Math.ceil(outcome.waitMs / 1000)}s trước khi dùng lệnh tiếp theo.`);
      return;
    case 'too_new':
      await ctx.reply(
        `Bạn cần tham gia nhóm ít nhất ${outcome.minDays} ngày mới rút được ` +
          `(hiện tại: ${outcome.ageDays.toFixed(1)} ngày).`
      );
      return;
    case 'invalid_address':
      await ctx.reply('Địa chỉ ví không đúng định dạng BEP-20/EVM (phải là 0x + 40 ký tự hex).');
      return;
    case 'invalid_amount':
      await ctx.reply('Số điểm rút phải là số nguyên dương.');
      return;
    case 'insufficient':
      await ctx.reply(`Số dư không đủ. Số dư hiện tại của bạn: ${outcome.balance} điểm.`);
      return;
    case 'ok':
      await ctx.replyWithHTML(
        `✅ Đã ghi nhận yêu cầu rút <b>#${outcome.record.id}</b>: <b>${outcome.record.amount} điểm</b> ` +
          `về địa chỉ <code>${outcome.record.address}</code>.\n` +
          '⚠️ Đây là bản off-chain beta: bot <b>chưa gửi tiền thật</b>. ' +
          'Admin sẽ xử lý thủ công và thông báo lại cho bạn (xem docs/11).'
      );
      return;
    default:
      await ctx.reply('Có lỗi xảy ra, vui lòng thử lại.');
  }
}

module.exports = { register, parseRutArgs };
