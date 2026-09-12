'use strict';

/**
 * commands/admin.js — Các lệnh chỉ admin nhóm (Telegram chat admin, hoặc userId nằm
 * trong BOT_SUPER_ADMIN_IDS) dùng được:
 *
 *   /pot                       — xem số dư pot nhóm + log admin cấp điểm gần đây
 *   /nap <amount>               — "nạp pot" thủ công (off-chain, ghi log rõ ràng)
 *   /nap @user <amount>         — cấp điểm trực tiếp cho thành viên có @username
 *   (reply) /nap <amount>       — cấp điểm cho người được reply, dùng được cả khi
 *                                  họ KHÔNG đặt @username công khai
 *   /thuong <N> <M>              — đặt/cập nhật quy tắc thưởng: N điểm/ngày cho
 *                                  thành viên có >= M tin nhắn hợp lệ/ngày
 *   /caidat                      — xem cấu hình chống lạm dụng của nhóm
 *   /caidat <khoá> <giá trị>     — đổi một mục cấu hình, chỉ cho nhóm này
 *   /rut_duyet <id>              — duyệt yêu cầu rút đang 'pending'
 *   /rut_huy <id>                — từ chối yêu cầu rút đang 'pending' (hoàn điểm)
 *   /duyet <id>                  — duyệt giao dịch tip lớn đang chờ trong hàng đợi
 *   /tuchoi <id>                 — từ chối giao dịch tip lớn đang chờ trong hàng đợi
 */

const ledger = require('../ledger');
const {
  requireGroup,
  isChatAdmin,
  formatVNDateTime,
  escapeHtml,
  formatNumber,
} = require('./helpers');
const { safeErrorMessage } = require('../redact');

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

function register(bot, { superAdminIds = [], storage } = {}) {
  const adminGate = requireAdmin(superAdminIds);

  bot.command('pot', adminGate, async (ctx) => {
    const chatId = ctx.chat.id;
    const state = await storage.readGroup(chatId);
    const potBalance = ledger.getPotBalance(state);
    const circulating = ledger.getTotalCirculatingBalance(state);
    const recentLog = (state.adminCreditLog || []).slice(-10).reverse();

    const logLines =
      recentLog.length === 0
        ? 'Chưa có lần nạp/cấp điểm nào.'
        : recentLog
            .map((entry) => {
              const when = formatVNDateTime(entry.ts);
              // Tên người, không phải số id: `memberLabel` trả chuỗi THÔ do người dùng
              // tự đặt nên BẮT BUỘC escapeHtml trước khi ghép vào tin nhắn HTML.
              const admin = escapeHtml(ledger.memberLabel(state, entry.adminId));
              // Log đổi cấu hình (/caidat) dùng chung bảng này nhưng không phải "cấp điểm".
              if (String(entry.target || '').startsWith('config:')) {
                return `• [${when}] admin ${admin} ${escapeHtml(
                  entry.note || `đổi cấu hình ${entry.target.slice('config:'.length)}`
                )}`;
              }
              const target =
                entry.target === 'pot'
                  ? 'pot nhóm'
                  : escapeHtml(ledger.memberLabel(state, entry.target));
              return `• [${when}] admin ${admin} cấp ${entry.amount} điểm cho ${target}${
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

  // Cú pháp của /nap in ra khi admin gõ sai — dùng lại ở nhiều nhánh nên tách riêng.
  const NAP_SYNTAX_HELP =
    'Cú pháp:\n' +
    '<code>/nap 1000</code> — nạp 1000 điểm vào pot nhóm\n' +
    '<code>/nap @user 100</code> — cấp 100 điểm cho thành viên CÓ @username công khai\n' +
    'reply vào tin nhắn của một người rồi gõ <code>/nap 100</code> — cấp 100 điểm cho ' +
    'người đó, dùng được cả khi họ KHÔNG đặt @username';

  bot.command('nap', adminGate, async (ctx) => {
    const chatId = ctx.chat.id;
    const adminId = ctx.from.id;
    const now = Date.now();
    const rest = (ctx.message.text || '').replace(/^\/nap(?:@\S+)?\s*/i, '').trim();
    const reply = ctx.message.reply_to_message;

    // Một biểu thức cho cả hai dạng: "<số>" và "@user <số>".
    const parsed = rest.match(/^(?:@(\S+)\s+)?(\d+)$/);
    if (!parsed) {
      await ctx.replyWithHTML(NAP_SYNTAX_HELP);
      return;
    }
    const usernameMention = parsed[1] || null;
    const amount = parseInt(parsed[2], 10);
    if (!Number.isInteger(amount) || amount <= 0) {
      await ctx.reply('Số điểm phải là số nguyên dương.');
      return;
    }

    // Thứ tự tìm người nhận GIỐNG /lixi (xem commands/tip.js): reply trước, rồi @username.
    // Nhánh reply là cách duy nhất cấp điểm cho người KHÔNG đặt @username công khai —
    // rất nhiều thành viên không đặt, nên trước đây admin không cấp điểm cho họ được.
    let target = null;
    if (reply) {
      if (!reply.from) {
        // Reply vào tin của channel / admin ẩn danh: không có user nào để cấp điểm.
        // KHÔNG âm thầm rơi xuống nhánh nạp pot — admin đang nhắm tới một người.
        await ctx.reply(
          'Không xác định được người nhận từ tin nhắn được reply. Hãy reply vào tin nhắn của một thành viên, hoặc dùng /nap @username <số điểm>.'
        );
        return;
      }
      if (reply.from.is_bot) {
        await ctx.reply(
          'Không cấp điểm cho bot (kể cả tin nhắn của chính bot này). Hãy reply vào tin nhắn của một thành viên thật.'
        );
        return;
      }
      target = reply.from;
    } else if (usernameMention) {
      const entities = ctx.message.entities || [];
      for (const e of entities) {
        if (e.type === 'text_mention' && e.user) target = e.user;
      }
      if (!target) {
        try {
          const chat = await ctx.telegram.getChat(`@${usernameMention}`);
          if (chat && chat.id) {
            target = {
              id: chat.id,
              first_name: chat.first_name || chat.username,
              username: chat.username || usernameMention,
            };
          }
        } catch (err) {
          target = null;
        }
      }
      if (!target) {
        await ctx.reply(
          'Không xác định được người nhận. Hãy dùng đúng @username công khai, hoặc reply vào tin nhắn của người đó rồi gõ /nap <số điểm>.'
        );
        return;
      }
      if (target.is_bot) {
        await ctx.reply('Không cấp điểm cho bot. Hãy chọn một thành viên thật.');
        return;
      }
    }

    if (target) {
      const outcome = await storage.withGroup(chatId, (state) => {
        // Ghi luôn tên người được reply/nhắc (`reply_to_message.from` hoặc text_mention)
        // để câu xác nhận — và mọi tin nhắn sau — gọi tên thay vì số id.
        ledger.rememberMember(state, target, now);
        const entry = ledger.adminCreditUser(
          state,
          adminId,
          target.id,
          amount,
          'Admin cấp điểm trực tiếp',
          now
        );
        return { entry, label: ledger.memberLabel(state, target.id) };
      });
      await ctx.replyWithHTML(
        `✅ Đã cấp <b>${outcome.entry.amount} điểm</b> trực tiếp cho <b>${escapeHtml(
          outcome.label
        )}</b>.`
      );
      return;
    }

    // Không reply ai, không @username -> nạp pot nhóm (giữ nguyên hành vi cũ).
    const entry = await storage.withGroup(chatId, (state) =>
      ledger.adminCreditPot(state, adminId, amount, 'Nạp pot thủ công (off-chain, xem docs/11)', now)
    );
    await ctx.replyWithHTML(`✅ Đã nạp <b>${entry.amount} điểm</b> vào pot nhóm.`);
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
    await storage.withGroup(chatId, (state) => {
      state.rewardRule = { pointsPerDay, minMessages, updatedAt: now, updatedBy: String(adminId) };
    });
    await ctx.replyWithHTML(
      `✅ Đã cập nhật quy tắc thưởng hoạt động: <b>${pointsPerDay} điểm/ngày</b> cho thành viên có ` +
        `<b>&ge; ${minMessages} tin nhắn</b> hợp lệ/ngày. Chi từ số dư pot hiện có (<code>/pot</code>).`
    );
  });

  // /caidat — xem và chỉnh cấu hình chống lạm dụng RIÊNG cho nhóm này.
  // Logic (nhận khoá/alias, kiểm tra khoảng giá trị, ghi log) nằm ở ledger.js để
  // test được không cần Telegram; ở đây chỉ đọc tin nhắn và soạn câu trả lời.
  bot.command('caidat', adminGate, async (ctx) => {
    const chatId = ctx.chat.id;
    const adminId = ctx.from.id;
    const rest = (ctx.message.text || '').replace(/^\/caidat(?:@\S+)?\s*/i, '').trim();

    const syntaxLine =
      'Đổi một mục: <code>/caidat &lt;mục&gt; &lt;giá trị&gt;</code> — ví dụ <code>/caidat thamnien 0</code>';

    if (!rest) {
      const state = await storage.readGroup(chatId);
      const lines = ledger.describeConfig(state).map(
        (item) =>
          `• <code>${item.alias}</code>: <b>${formatNumber(item.value)}</b> ${escapeHtml(item.unit)}\n` +
          `   ${escapeHtml(item.description)}\n` +
          `   <i>cho phép ${formatNumber(item.min)}–${formatNumber(item.max)}; tên đầy đủ <code>${item.key}</code></i>`
      );
      await ctx.replyWithHTML(
        `⚙️ <b>Cấu hình chống lạm dụng của nhóm này</b>\n\n${lines.join('\n')}\n\n${syntaxLine}`
      );
      return;
    }

    const parts = rest.split(/\s+/);
    if (parts.length < 2) {
      await ctx.replyWithHTML(
        `Thiếu giá trị. ${syntaxLine}\nXem cấu hình hiện tại: <code>/caidat</code>`
      );
      return;
    }
    // Giá trị luôn là từ CUỐI; phần còn lại là tên mục (để "thâm niên" có dấu cách
    // cũng nhận ra được, vì dấu cách bị bỏ khi so khớp tên mục).
    const rawValue = parts[parts.length - 1];
    const rawKey = parts.slice(0, -1).join(' ');

    const result = await storage.withGroup(chatId, (state) =>
      ledger.applyConfigChange(state, rawKey, rawValue, { adminId, nowMs: Date.now() })
    );

    if (!result.ok) {
      // ctx.reply (không HTML) — thông báo có chứa nguyên văn thứ admin vừa gõ.
      await ctx.reply(result.error.message);
      return;
    }

    let message =
      `✅ Đã đổi <code>${result.key}</code> của nhóm này: <b>${result.oldValue}</b> → ` +
      `<b>${result.newValue}</b> ${escapeHtml(result.unit)}.`;
    if (result.warning) {
      message += `\n\n⚠️ <b>Cảnh báo:</b> ${escapeHtml(result.warning)}`;
    }
    await ctx.replyWithHTML(message);
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
      const outcome = await storage.withGroup(
        chatId,
        (state) => {
          const record = ledger.decideWithdrawal(state, id[1], decision, adminId, Date.now());
          // Tên người rút (lấy trong mutator — chỉ ở đây mới có state của nhóm).
          return { record, label: ledger.memberLabel(state, record.userId) };
        },
        // Kho Postgres chỉ nạp sẵn các yêu cầu đang chờ; hỏi đích danh mã này để
        // yêu cầu ĐÃ xử lý cũng được nạp (báo "đã xử lý rồi" thay vì "không tìm thấy").
        { withdrawalIds: [String(id[1])] }
      );
      const { record } = outcome;
      const verb = decision === 'approve' ? 'duyệt' : 'từ chối (đã hoàn điểm)';
      await ctx.replyWithHTML(
        `✅ Đã ${verb} yêu cầu rút <b>#${record.id}</b> của <b>${escapeHtml(outcome.label)}</b> ` +
          `(${record.amount} điểm, ${escapeHtml(record.address)}).`
      );
    } catch (err) {
      await ctx.reply(`Không xử lý được: ${safeErrorMessage(err)}`);
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
      const outcome = await storage.withGroup(
        chatId,
        (state) => {
          const approval =
            decision === 'approve'
              ? ledger.approveQueuedTransfer(state, id[1], adminId, Date.now())
              : ledger.rejectQueuedTransfer(state, id[1], adminId, Date.now());
          // Tên hai bên phải lấy TRONG mutator (chỉ ở đây mới có state của nhóm).
          return {
            approval,
            fromLabel: ledger.memberLabel(state, approval.fromUserId),
            toLabel: ledger.memberLabel(state, approval.toUserId),
          };
        },
        { approvalIds: [id[1]] }
      );
      const { approval } = outcome;
      const verb = decision === 'approve' ? 'duyệt' : 'từ chối';
      await ctx.replyWithHTML(
        `✅ Đã ${verb} giao dịch <b>#${approval.id}</b> (tip ${approval.amount} điểm từ ` +
          `<b>${escapeHtml(outcome.fromLabel)}</b> cho <b>${escapeHtml(outcome.toLabel)}</b>).`
      );
    } catch (err) {
      await ctx.reply(`Không xử lý được: ${safeErrorMessage(err)}`);
    }
  }
}

module.exports = { register, requireAdmin };
