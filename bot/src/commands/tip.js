'use strict';

/**
 * commands/tip.js — Lệnh /lixi: vừa là tip (`/lixi @user <số>`) vừa là bao lì xì
 * chia ngẫu nhiên (`/lixi <số> chia <n>`), cộng với nút bấm "Nhận lì xì" (callback
 * query `envcl:<id>`).
 *
 * ĐÓNG BAO LÌ XÌ KHI HẾT GIỜ — KHÔNG DÙNG `setTimeout` NỮA.
 * Bản trước hẹn giờ bằng `setTimeout` trong RAM của tiến trình bot. Cách đó chỉ chạy
 * được khi có một tiến trình sống liên tục; trên serverless (Vercel) hàm chỉ sống vài
 * giây cho mỗi request nên hẹn giờ không bao giờ nổ. Thay vào đó có hai lớp:
 *
 *   (a) DỌN LƯỜI (lazy settlement): trước khi xử lý BẤT KỲ hoạt động nào trong nhóm,
 *       bot đóng mọi bao lì xì đã quá giờ của nhóm đó và hoàn phần chưa ai nhận.
 *       Xem middleware trong `src/bot.js` và `ledger.settleDueEnvelopes`.
 *   (b) CRON HẰNG NGÀY: `api/cron.js` quét toàn bộ nhóm mỗi ngày một lần, làm lưới an
 *       toàn cho những nhóm im lặng hẳn sau khi mở bao lì xì.
 *
 * Hệ quả cần biết: nếu sau khi bao lì xì hết giờ mà nhóm không có hoạt động nào, tin
 * nhắn bao lì xì vẫn hiện nút "Nhận lì xì" cho tới lần dọn kế tiếp — nhưng bấm vào sẽ
 * bị từ chối vì đã hết giờ, nên KHÔNG có ai nhận nhầm và không có điểm nào bị sai.
 */

const ledger = require('../ledger');
const { requireGroup, mentionHtml, escapeHtml } = require('./helpers');

// ---------------------------------------------------------------------------
// Phân tích cú pháp `/lixi ...`
// ---------------------------------------------------------------------------

function parseLixiArgs(text) {
  const rest = String(text || '').replace(/^\/lixi(?:@\S+)?\s*/i, '').trim();
  let m = rest.match(/^(\d+)\s+chia\s+(\d+)$/i);
  if (m) {
    return { kind: 'envelope', amount: parseInt(m[1], 10), n: parseInt(m[2], 10) };
  }
  m = rest.match(/^(@\S+)\s+(\d+)$/);
  if (m) {
    return { kind: 'tip', usernameMention: m[1].slice(1), amount: parseInt(m[2], 10) };
  }
  m = rest.match(/^(\d+)$/);
  if (m) {
    return { kind: 'tip', amount: parseInt(m[1], 10) };
  }
  return null;
}

async function resolveTipTarget(ctx, parsed) {
  if (ctx.message.reply_to_message && ctx.message.reply_to_message.from) {
    return ctx.message.reply_to_message.from;
  }
  if (parsed.usernameMention) {
    const entities = ctx.message.entities || [];
    for (const e of entities) {
      if (e.type === 'text_mention' && e.user) return e.user;
    }
    try {
      const chat = await ctx.telegram.getChat(`@${parsed.usernameMention}`);
      if (chat && chat.id) {
        return {
          id: chat.id,
          first_name: chat.first_name || chat.username || parsed.usernameMention,
          username: chat.username,
        };
      }
    } catch (err) {
      return null;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tip: /lixi @user <amount>  (hoặc reply + /lixi <amount>)
// ---------------------------------------------------------------------------

async function handleTip(ctx, parsed, storage) {
  const chatId = ctx.chat.id;
  const sender = ctx.from;
  const target = await resolveTipTarget(ctx, parsed);

  if (!target) {
    await ctx.replyWithHTML(
      'Không xác định được người nhận. Hãy <b>reply</b> vào tin nhắn của người đó rồi gõ ' +
        '<code>/lixi 100</code>, hoặc dùng <code>/lixi @username 100</code> với username công khai.'
    );
    return;
  }
  if (String(target.id) === String(sender.id)) {
    await ctx.reply('Bạn không thể tip cho chính mình.');
    return;
  }

  const amount = parsed.amount;
  const now = Date.now();

  const outcome = await storage.withGroup(
    chatId,
    (state) => {
      // `rememberMember` ghi/làm mới TÊN của cả hai bên (thay cho `ensureMember`).
      ledger.rememberMember(state, sender, now);
      ledger.rememberMember(state, target, now);

      const cooldown = ledger.checkCooldown(state, sender.id, now);
      if (!cooldown.ok) return { type: 'cooldown', waitMs: cooldown.waitMs };
      ledger.recordCommandTime(state, sender.id, now);

      const age = ledger.checkMinAccountAge(state, sender.id, now);
      if (!age.ok) return { type: 'too_new', ageDays: age.ageDays, minDays: age.minDays };

      if (!Number.isInteger(amount) || amount <= 0) return { type: 'invalid_amount' };

      const limitCheck = ledger.checkDailyTipLimit(state, sender.id, amount, now);
      if (!limitCheck.ok) return { type: 'daily_limit', ...limitCheck };

      if (ledger.getBalance(state, sender.id) < amount) {
        return { type: 'insufficient', balance: ledger.getBalance(state, sender.id) };
      }

      if (ledger.needsAdminApproval(state, amount)) {
        const approval = ledger.queueTipApproval(state, sender.id, target.id, amount, now);
        return { type: 'queued', approval, threshold: state.config.adminApprovalThreshold };
      }

      ledger.transferPure(state, sender.id, target.id, amount, { type: 'tip' }, now);
      ledger.recordDailyTipUsage(state, sender.id, amount, now);
      return { type: 'ok', amount };
    },
    { nowMs: now }
  );

  await replyTipOutcome(ctx, outcome, target);
}

async function replyTipOutcome(ctx, outcome, target) {
  switch (outcome.type) {
    case 'cooldown':
      await ctx.reply(`⏳ Vui lòng đợi ${Math.ceil(outcome.waitMs / 1000)}s trước khi dùng lệnh tiếp theo.`);
      return;
    case 'too_new':
      await ctx.reply(
        `Bạn cần tham gia nhóm ít nhất ${outcome.minDays} ngày mới dùng được lệnh này ` +
          `(hiện tại: ${outcome.ageDays.toFixed(1)} ngày).`
      );
      return;
    case 'invalid_amount':
      await ctx.reply('Số điểm tip phải là số nguyên dương.');
      return;
    case 'daily_limit':
      await ctx.reply(
        `Bạn đã dùng ${outcome.used}/${outcome.limit} điểm hạn mức tip hôm nay, chỉ còn ${outcome.remaining} điểm.`
      );
      return;
    case 'insufficient':
      await ctx.reply(`Số dư không đủ. Số dư hiện tại của bạn: ${outcome.balance} điểm.`);
      return;
    case 'queued':
      await ctx.replyWithHTML(
        `Khoản tip ${outcome.approval.amount} điểm vượt ngưỡng ${outcome.threshold} điểm nên được đưa vào ` +
          `hàng đợi chờ admin duyệt (mã <code>#${outcome.approval.id}</code>).`
      );
      return;
    case 'ok':
      await ctx.replyWithHTML(`🧧 Đã tip <b>${outcome.amount} điểm</b> cho ${mentionHtml(target)}!`);
      return;
    default:
      await ctx.reply('Có lỗi xảy ra, vui lòng thử lại.');
  }
}

// ---------------------------------------------------------------------------
// Bao lì xì: /lixi <amount> chia <n>
// ---------------------------------------------------------------------------

/**
 * `state` (không bắt buộc) dùng để tra tên người gửi khi bản ghi bao lì xì chưa lưu
 * `senderName` — ví dụ bao được tạo bởi bản bot cũ. Tên luôn được `escapeHtml`.
 */
function renderEnvelopeText(envelope, state = null) {
  const claimed = envelope.claimOrder.length;
  const total = envelope.totalRecipients;
  const senderLabel = escapeHtml(
    ledger.normalizeDisplayName(envelope.senderName) || ledger.memberLabel(state, envelope.senderId)
  );
  const header = `🧧 <b>${senderLabel}</b> vừa mở bao lì xì <b>${envelope.totalAmount} điểm</b> cho <b>${total}</b> người!`;
  let statusLine;
  if (envelope.status === 'active') {
    const minutesLeft = Math.max(0, Math.ceil((envelope.expiresAt - Date.now()) / 60000));
    statusLine = `Đã nhận: ${claimed}/${total}. Còn khoảng ${minutesLeft} phút để bấm nút nhận.`;
  } else if (envelope.status === 'completed') {
    statusLine = `✅ Đã có đủ ${total}/${total} người nhận. Bao lì xì đã đóng.`;
  } else {
    statusLine = `⌛ Đã hết giờ nhận (${claimed}/${total} người đã nhận). Phần chưa nhận đã hoàn lại cho người gửi.`;
  }
  return `${header}\n${statusLine}`;
}

function envelopeKeyboard(envelope) {
  if (envelope.status !== 'active') return { inline_keyboard: [] };
  return { inline_keyboard: [[{ text: '🧧 Nhận lì xì', callback_data: `envcl:${envelope.id}` }]] };
}

async function handleEnvelope(ctx, parsed, storage) {
  const chatId = ctx.chat.id;
  const sender = ctx.from;
  const { amount, n } = parsed;
  const now = Date.now();

  const outcome = await storage.withGroup(
    chatId,
    (state) => {
      ledger.rememberMember(state, sender, now);

      const cooldown = ledger.checkCooldown(state, sender.id, now);
      if (!cooldown.ok) return { type: 'cooldown', waitMs: cooldown.waitMs };
      ledger.recordCommandTime(state, sender.id, now);

      const age = ledger.checkMinAccountAge(state, sender.id, now);
      if (!age.ok) return { type: 'too_new', ageDays: age.ageDays, minDays: age.minDays };

      if (!Number.isInteger(amount) || amount <= 0) return { type: 'invalid_amount' };
      if (!Number.isInteger(n) || n <= 0) return { type: 'invalid_count' };
      if (n > state.config.maxEnvelopeRecipients) {
        return { type: 'too_many_recipients', max: state.config.maxEnvelopeRecipients };
      }
      if (n > amount) return { type: 'too_many_for_amount' };

      if (ledger.getBalance(state, sender.id) < amount) {
        return { type: 'insufficient', balance: ledger.getBalance(state, sender.id) };
      }

      if (ledger.needsAdminApproval(state, amount)) {
        return { type: 'needs_admin_approval', threshold: state.config.adminApprovalThreshold };
      }

      ledger.debitPure(state, sender.id, amount, { type: 'envelope_hold', note: `Mở bao lì xì chia ${n} người` }, now);
      const windowMs = state.config.envelopeWindowMinutes * 60 * 1000;
      const envelope = ledger.createEnvelope(
        state,
        {
          senderId: sender.id,
          senderName: ledger.displayNameFromUser(sender),
          amount,
          recipientCount: n,
          windowMs,
        },
        now
      );
      return { type: 'created', envelope, windowMs };
    },
    { nowMs: now }
  );

  if (outcome.type === 'created') {
    const { envelope } = outcome;
    const sent = await ctx.replyWithHTML(renderEnvelopeText(envelope), {
      reply_markup: envelopeKeyboard(envelope),
    });
    // Ghi lại messageId để lần dọn sau còn sửa được đúng tin nhắn đó.
    await storage.withGroup(
      chatId,
      (state) => {
        const e = state.envelopes[envelope.id];
        if (e) e.messageId = sent.message_id;
      },
      { nowMs: now, envelopeIds: [envelope.id] }
    );
    return;
  }

  await replyEnvelopeOutcome(ctx, outcome);
}

async function replyEnvelopeOutcome(ctx, outcome) {
  switch (outcome.type) {
    case 'cooldown':
      await ctx.reply(`⏳ Vui lòng đợi ${Math.ceil(outcome.waitMs / 1000)}s trước khi dùng lệnh tiếp theo.`);
      return;
    case 'too_new':
      await ctx.reply(
        `Bạn cần tham gia nhóm ít nhất ${outcome.minDays} ngày mới dùng được lệnh này ` +
          `(hiện tại: ${outcome.ageDays.toFixed(1)} ngày).`
      );
      return;
    case 'invalid_amount':
      await ctx.reply('Số điểm bao lì xì phải là số nguyên dương.');
      return;
    case 'invalid_count':
      await ctx.reply('Số người nhận phải là số nguyên dương.');
      return;
    case 'too_many_recipients':
      await ctx.reply(`Số người nhận tối đa cho mỗi bao lì xì là ${outcome.max} người.`);
      return;
    case 'too_many_for_amount':
      await ctx.reply('Số người nhận không thể nhiều hơn số điểm lì xì (mỗi người tối thiểu 1 điểm).');
      return;
    case 'insufficient':
      await ctx.reply(`Số dư không đủ. Số dư hiện tại của bạn: ${outcome.balance} điểm.`);
      return;
    case 'needs_admin_approval':
      await ctx.reply(
        `Bao lì xì lớn hơn ngưỡng ${outcome.threshold} điểm cần admin xác nhận trước. ` +
          'Vui lòng nhờ admin nhóm dùng lệnh cấp điểm/nạp pot thủ công, hoặc chia thành các bao nhỏ hơn.'
      );
      return;
    default:
      await ctx.reply('Có lỗi xảy ra, vui lòng thử lại.');
  }
}

// ---------------------------------------------------------------------------
// Nút "Nhận lì xì" + cập nhật lại tin nhắn sau khi đóng bao
// ---------------------------------------------------------------------------

/** Sửa lại tin nhắn bao lì xì cho khớp trạng thái hiện tại (đếm người nhận, hết giờ...). */
async function renderEnvelopeMessage(telegram, storage, chatId, envelopeId) {
  const state = await storage.readGroup(chatId, { envelopeIds: [String(envelopeId)] });
  const envelope = state.envelopes && state.envelopes[String(envelopeId)];
  if (!envelope || !envelope.messageId) return;
  try {
    await telegram.editMessageText(chatId, envelope.messageId, undefined, renderEnvelopeText(envelope, state), {
      parse_mode: 'HTML',
      reply_markup: envelopeKeyboard(envelope),
    });
  } catch (err) {
    // Bỏ qua lỗi "message is not modified" hoặc tin nhắn đã bị xoá — không quan trọng ở đây.
  }
}

/**
 * Sau khi dọn lười đóng một loạt bao lì xì hết giờ, sửa lại các tin nhắn tương ứng.
 * Lỗi Telegram ở đây không được làm hỏng lệnh mà người dùng vừa gõ.
 */
async function renderSettledEnvelopes(telegram, storage, chatId, settled) {
  for (const item of settled || []) {
    try {
      await renderEnvelopeMessage(telegram, storage, chatId, item.id);
    } catch (err) {
      /* bỏ qua — chỉ là cập nhật hiển thị */
    }
  }
}

const CLAIM_FAIL_MESSAGES = {
  not_found: 'Bao lì xì này không còn tồn tại.',
  closed: 'Bao lì xì này đã đóng.',
  expired: 'Bao lì xì này đã hết giờ nhận.',
  self: 'Bạn không thể tự nhận lì xì của chính mình.',
  already_claimed: 'Bạn đã nhận phần của mình trong bao lì xì này rồi.',
  full: 'Bao lì xì này đã có đủ người nhận.',
};

async function handleClaim(ctx, envelopeId, storage) {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const now = Date.now();

  const result = await storage.withGroup(
    chatId,
    (state) => {
      const envelope = state.envelopes && state.envelopes[String(envelopeId)];
      if (!envelope) return { ok: false, reason: 'not_found' };
      ledger.rememberMember(state, ctx.from, now);
      const age = ledger.checkMinAccountAge(state, userId, now);
      if (!age.ok) {
        return { ok: false, reason: 'too_new', minDays: age.minDays, ageDays: age.ageDays };
      }
      // Nhận phần lì xì VÀ cộng điểm cho người nhận trong cùng một transaction.
      return ledger.claimEnvelopeAndCredit(state, envelopeId, userId, now);
    },
    { nowMs: now, envelopeIds: [String(envelopeId)] }
  );

  if (!result.ok) {
    const message =
      result.reason === 'too_new'
        ? `Bạn cần tham gia nhóm ít nhất ${result.minDays} ngày mới nhận lì xì được.`
        : CLAIM_FAIL_MESSAGES[result.reason] || 'Không nhận được lì xì.';
    await ctx.answerCbQuery(message, { show_alert: true });
    if (result.reason === 'expired') {
      // Bao đã quá giờ mà chưa ai dọn — dọn ngay rồi cập nhật lại tin nhắn.
      const settled = await storage.settleDueEnvelopes(chatId, now);
      await renderSettledEnvelopes(ctx.telegram, storage, chatId, settled);
    }
    return;
  }

  await ctx.answerCbQuery(`🎉 Bạn nhận được ${result.amount} điểm!`);
  await renderEnvelopeMessage(ctx.telegram, storage, chatId, envelopeId);
}

function register(bot, { storage }) {
  bot.command('lixi', async (ctx) => {
    if (!(await requireGroup(ctx))) return;
    const parsed = parseLixiArgs(ctx.message.text || '');
    if (!parsed) {
      await ctx.replyWithHTML(
        'Cú pháp không đúng. Dùng:\n' +
          '<code>/lixi @user 100</code> — tip 100 điểm\n' +
          '<code>/lixi 500 chia 5</code> — bao lì xì 500 điểm cho 5 người'
      );
      return;
    }
    if (parsed.kind === 'tip') {
      await handleTip(ctx, parsed, storage);
    } else {
      await handleEnvelope(ctx, parsed, storage);
    }
  });

  bot.action(/^envcl:(\d+)$/, async (ctx) => {
    await handleClaim(ctx, ctx.match[1], storage);
  });
}

module.exports = {
  register,
  parseLixiArgs,
  renderEnvelopeText,
  renderEnvelopeMessage,
  renderSettledEnvelopes,
};
