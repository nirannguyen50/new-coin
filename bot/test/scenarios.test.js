'use strict';

/**
 * KỊCH BẢN "NGƯỜI THẬT" — chạy bot Telegraf THẬT với các handler THẬT, bằng cách đẩy
 * các update Telegram giả (tin nhắn, reply, bấm nút inline) vào `bot.handleUpdate`.
 *
 * Bốn người trong một nhóm: A là admin (Telegram trả về A trong getChatAdministrators),
 * B và C là thành viên bình thường, D là người thứ tư (bấm nút khi bao đã đóng...).
 *
 * Khác với test/commands.test.js (từng lệnh riêng lẻ), file này chạy CẢ LUỒNG nối tiếp
 * nhau như ngoài đời: mở bao lì xì → bấm nút nhận → hết giờ → hoàn điểm → tip → duyệt →
 * rút → thưởng hoạt động → "khởi động nguội" đọc lại từ database.
 *
 * Sau MỖI bước đều kiểm tra ĐỊNH LUẬT BẢO TOÀN ĐIỂM: tổng số dư mọi thành viên + pot
 * + phần đang bị giữ (bao lì xì đang mở, yêu cầu rút chờ/đã duyệt, tip lớn chờ duyệt)
 * phải bằng đúng tổng số điểm admin đã "đúc" ra (/nap). Không có điểm nào sinh ra hay
 * mất đi từ hư không.
 *
 * Chạy trên CẢ HAI kho: JSON (luôn) và Postgres (khi có TEST_DATABASE_URL — đây là
 * đường chạy thật trên Vercel nên là đường quan trọng nhất).
 *
 * Đồng hồ được giả lập (Date.now) để "đợi 11 phút cho bao hết giờ" hay "sang ngày mới"
 * không phải chờ thật.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const { Telegram } = require('telegraf');
const { createBot } = require('../src/bot');
const { JsonGroupStorage } = require('../src/storage');
const store = require('../src/store');
const ledger = require('../src/ledger');

const TOKEN = '123456789:ABCdefGhIJKlmNoPQRstuVwXyZ1234567890';
const BOT_USER = { id: 7, is_bot: true, first_name: 'Lì Xì Bot', username: 'lixi_test_bot' };

// Bốn con người trong nhóm.
const A = { id: 111, is_bot: false, first_name: 'An Admin', username: 'an_admin' };
const B = { id: 222, is_bot: false, first_name: 'Bảo', username: 'bao_b' };
const C = { id: 333, is_bot: false, first_name: 'Cường', username: 'cuong_c' };
const D = { id: 444, is_bot: false, first_name: 'Dung', username: 'dung_d' };
const PEOPLE = [A, B, C, D];

const WALLET = '0x' + 'ab12'.repeat(10); // địa chỉ BEP-20 hợp lệ (0x + 40 hex)
const MINUTE = 60 * 1000;

// ---------------------------------------------------------------------------
// Đồng hồ giả: mọi chỗ trong bot đều gọi Date.now() nên chỉ cần dịch nó đi.
// ---------------------------------------------------------------------------
const realDateNow = Date.now;
let clockOffset = 0;
Date.now = () => realDateNow() + clockOffset;
function tick(ms) {
  clockOffset += ms;
}

// ---------------------------------------------------------------------------
// Telegram giả: ghi lại MỌI lời gọi ra ngoài (tin nhắn gửi, tin nhắn sửa, trả lời nút).
// ---------------------------------------------------------------------------
const realCallApi = Telegram.prototype.callApi;
let outbox = [];
let messageSeq = 5000;

Telegram.prototype.callApi = async function fakeCallApi(method, payload) {
  const entry = { method, payload, result: true };
  outbox.push(entry);
  if (method === 'sendMessage') {
    messageSeq += 1;
    entry.result = { message_id: messageSeq, text: payload.text, chat: { id: payload.chat_id } };
  } else if (method === 'getChatAdministrators') {
    entry.result = [{ user: A, status: 'administrator' }];
  } else if (method === 'getChat') {
    const username = String(payload.chat_id || '').replace(/^@/, '');
    const person = PEOPLE.find((p) => p.username === username);
    if (!person) throw new Error('400: Bad Request: chat not found');
    entry.result = { id: person.id, type: 'private', first_name: person.first_name, username };
  } else if (method === 'editMessageText') {
    entry.result = { message_id: payload.message_id, text: payload.text };
  }
  return entry.result;
};

test.after(() => {
  Telegram.prototype.callApi = realCallApi;
  Date.now = realDateNow;
});

/** Những gì người dùng THẤY sau một update: tin nhắn bot gửi, tin nhắn bot sửa, popup. */
function collectOutbox() {
  const sent = outbox
    .filter((c) => c.method === 'sendMessage')
    .map((c) => ({ ...c.payload, message_id: c.result.message_id }));
  const edits = outbox.filter((c) => c.method === 'editMessageText').map((c) => c.payload);
  const alerts = outbox.filter((c) => c.method === 'answerCallbackQuery').map((c) => c.payload);
  return {
    sent,
    edits,
    alerts,
    last: sent.length ? sent[sent.length - 1].text : '',
    lastEdit: edits.length ? edits[edits.length - 1].text : '',
    lastAlert: alerts.length ? alerts[alerts.length - 1].text || '' : '',
  };
}

function shareFromAlert(out) {
  const m = out.lastAlert.match(/^🎉 Bạn nhận được (\d+) điểm!$/);
  assert.ok(m, `popup nhận lì xì không đúng: "${out.lastAlert}"`);
  return Number(m[1]);
}

// ---------------------------------------------------------------------------
// Bộ điều khiển một nhóm: dựng bot thật, đẩy update, kiểm tra bảo toàn điểm sau mỗi bước.
// ---------------------------------------------------------------------------
// Mọi mã (bao lì xì, yêu cầu rút, giao dịch chờ duyệt) đều đếm từ 1; liệt kê rộng để
// kho Postgres nạp cả bản ghi đã đóng khi tính tổng / so sánh.
const ALL_IDS = Array.from({ length: 50 }, (_, i) => String(i + 1));

/** Đọc TOÀN BỘ trạng thái nhóm (kể cả bản ghi đã đóng) từ một kho bất kỳ. */
async function readEverything(storage, chatId) {
  return storage.readGroup(chatId, {
    envelopeIds: ALL_IDS,
    withdrawalIds: ALL_IDS,
    approvalIds: ALL_IDS,
  });
}

/** Tổng điểm đang tồn tại trong nhóm, tách từng phần để báo lỗi dễ đọc. */
async function totalsOf(storage, chatId) {
  const state = await readEverything(storage, chatId);
  const balances = Object.values(state.members).reduce((s, m) => s + m.balance, 0);
  const pot = ledger.getPotBalance(state);
  let envelopeHeld = 0;
  for (const e of Object.values(state.envelopes || {})) {
    if (e.status !== 'active') continue;
    const claimed = Object.values(e.claims).reduce((s, x) => s + x, 0);
    envelopeHeld += e.totalAmount - claimed;
  }
  let withdrawalPending = 0;
  let withdrawalPaid = 0;
  for (const w of state.withdrawals || []) {
    if (w.status === 'pending') withdrawalPending += w.amount;
    if (w.status === 'approved') withdrawalPaid += w.amount;
  }
  let approvalHeld = 0;
  for (const a of state.pendingApprovals || []) {
    if (a.status === 'pending' && a.held) approvalHeld += a.amount;
  }
  const total = balances + pot + envelopeHeld + withdrawalPending + withdrawalPaid + approvalHeld;
  return {
    total,
    parts: { balances, pot, envelopeHeld, withdrawalPending, withdrawalPaid, approvalHeld },
    state,
  };
}

function makeGroup(storage, chatId) {
  const bot = createBot(TOKEN, { storage, superAdminIds: [] }); // A là admin THẬT của nhóm
  bot.botInfo = BOT_USER;
  const handlerErrors = [];
  bot.catch((err) => handlerErrors.push(err));

  const chat = { id: chatId, type: 'supergroup', title: 'Nhóm kịch bản' };
  let updateId = 1;
  const seconds = () => Math.floor(Date.now() / 1000);

  let minted = 0; // tổng điểm admin đã đúc ra bằng /nap

  async function assertConserved(label) {
    const t = await totalsOf(storage, chatId);
    assert.equal(
      t.total,
      minted,
      `Mất bảo toàn điểm sau bước "${label}": tổng ${t.total} != đã đúc ${minted}; ` +
        JSON.stringify(t.parts)
    );
  }

  async function drive(update, label) {
    outbox = [];
    await bot.handleUpdate(update);
    if (handlerErrors.length) {
      const err = handlerErrors.shift();
      throw new Error(`Handler ném lỗi ở bước "${label}": ${err.stack || err}`);
    }
    await assertConserved(label);
    return collectOutbox();
  }

  function textMessage(user, text, extra = {}) {
    updateId += 1;
    const isCommand = text.startsWith('/');
    return {
      update_id: updateId,
      message: {
        message_id: updateId,
        date: seconds(),
        chat,
        from: user,
        text,
        ...(isCommand
          ? { entities: [{ type: 'bot_command', offset: 0, length: text.split(' ')[0].length }] }
          : {}),
        ...extra,
      },
    };
  }

  /** Người `user` gõ `text`; nếu `replyTo` thì là reply vào một tin nhắn của người đó. */
  async function send(user, text, { replyTo = null, mint = 0 } = {}) {
    const extra = replyTo
      ? {
          reply_to_message: {
            message_id: 1,
            date: seconds(),
            chat,
            from: replyTo,
            text: 'tin nhắn trước đó',
          },
        }
      : {};
    minted += mint;
    return drive(textMessage(user, text, extra), `${user.first_name}: ${text}`);
  }

  /** Như `send` nhưng giả định người thật cách nhau vài giây (qua cooldown mặc định 3s). */
  async function step(user, text, opts) {
    tick(4000);
    return send(user, text, opts);
  }

  /** Người `user` bấm nút inline có `data` trên tin nhắn `messageId` của bot. */
  async function press(user, messageId, data) {
    tick(1500);
    updateId += 1;
    const update = {
      update_id: updateId,
      callback_query: {
        id: `cbq-${updateId}`,
        from: user,
        chat_instance: 'ci-1',
        message: { message_id: messageId, date: seconds(), chat, from: BOT_USER, text: 'bao lì xì' },
        data,
      },
    };
    return drive(update, `${user.first_name} bấm ${data}`);
  }

  async function balance(user) {
    const state = await storage.readGroup(chatId);
    return ledger.getBalance(state, user.id);
  }

  async function pot() {
    return (await totalsOf(storage, chatId)).parts.pot;
  }

  /** Đúng hai việc api/cron.js làm mỗi ngày, gọi cùng hàm của kho lưu trữ. */
  async function runVercelCron() {
    const now = Date.now();
    const dateStr = ledger.dateKey(now);
    const rewards = await storage.runDailyRewardAllGroups(dateStr, now);
    const swept = await storage.sweepDueEnvelopes(now);
    await assertConserved(`cron ngày ${dateStr}`);
    return {
      dateStr,
      reward: rewards.find((r) => String(r.chatId) === String(chatId)) || null,
      swept: swept.filter((r) => String(r.chatId) === String(chatId)),
    };
  }

  return { bot, send, step, press, balance, pot, runVercelCron, chatId };
}

// ---------------------------------------------------------------------------
// Các kịch bản — dùng chung cho cả hai kho.
// ---------------------------------------------------------------------------
async function runScenarios(t, storage, chatId) {
  const g = makeGroup(storage, chatId);
  const { send, step, press, balance } = g;
  const EXPIRED_STATUS_RE = /⌛ Đã hết giờ nhận \(\d\/\d người đã nhận\)\. Phần chưa nhận đã hoàn lại cho người gửi\./;

  // ---- Chuẩn bị: mọi người vào nhóm, nói chuyện, rồi 10 ngày trôi qua (đủ thâm niên). ----
  await t.test('chuẩn bị: mọi người chào nhóm, 10 ngày sau admin cấp điểm', async () => {
    for (const p of PEOPLE) await send(p, `chào cả nhà, ${p.first_name} đây`);
    tick(10 * ledger.DAY_MS);

    let out = await step(A, '/nap 1000', { replyTo: A, mint: 1000 });
    assert.match(out.last, /Đã cấp <b>1000 điểm<\/b> trực tiếp cho <b>An Admin<\/b>/);
    out = await step(A, '/nap 1000', { replyTo: B, mint: 1000 });
    assert.match(out.last, /cho <b>Bảo<\/b>/);
    out = await step(A, '/nap 500', { replyTo: C, mint: 500 });
    assert.match(out.last, /cho <b>Cường<\/b>/);

    assert.equal(await balance(A), 1000);
    assert.equal(await balance(B), 1000);
    assert.equal(await balance(C), 500);
    assert.equal(await balance(D), 0);
    assert.equal(await g.pot(), 0);
  });

  // ---- 1) Bao lì xì: mở → bấm nút nhận → đủ người → đóng. ----
  await t.test('1) bao lì xì 300 chia 2: B và C bấm nút nhận, A tự nhận bị chặn, D bấm khi đã đóng', async () => {
    const aBefore = await balance(A);
    const opened = await step(A, '/lixi 300 chia 2');
    assert.equal(opened.sent.length, 1, 'bot gửi đúng một tin nhắn bao lì xì');
    const envelopeMsg = opened.sent[0];
    assert.match(envelopeMsg.text, /<b>An Admin<\/b> vừa mở bao lì xì <b>300 điểm<\/b> cho <b>2<\/b> người/);
    assert.match(envelopeMsg.text, /Đã nhận: 0\/2\. Còn khoảng 10 phút để bấm nút nhận\./);
    const button = envelopeMsg.reply_markup.inline_keyboard[0][0];
    assert.equal(button.text, '🧧 Nhận lì xì');
    assert.match(button.callback_data, /^envcl:\d+$/);
    assert.equal(await balance(A), aBefore - 300, 'A bị trừ ngay 300 khi mở bao');

    // B bấm nút.
    let out = await press(B, envelopeMsg.message_id, button.callback_data);
    const bShare = shareFromAlert(out);
    assert.ok(bShare >= 1 && bShare <= 299, `phần của B phải trong [1, 299]: ${bShare}`);
    assert.equal(await balance(B), 1000 + bShare);
    assert.equal(out.edits.length, 1, 'tin nhắn bao lì xì được sửa lại');
    assert.equal(out.edits[0].message_id, envelopeMsg.message_id);
    assert.equal(out.edits[0].parse_mode, 'HTML');
    assert.match(out.lastEdit, /Đã nhận: 1\/2\. Còn khoảng \d+ phút/);
    assert.equal(out.edits[0].reply_markup.inline_keyboard.length, 1, 'nút vẫn còn vì chưa đủ người');

    // A bấm nút của chính mình.
    out = await press(A, envelopeMsg.message_id, button.callback_data);
    assert.equal(out.lastAlert, 'Bạn không thể tự nhận lì xì của chính mình.');
    assert.equal(out.alerts[0].show_alert, true);
    assert.equal(out.edits.length, 0);
    assert.equal(await balance(A), aBefore - 300);

    // B bấm lần hai.
    out = await press(B, envelopeMsg.message_id, button.callback_data);
    assert.equal(out.lastAlert, 'Bạn đã nhận phần của mình trong bao lì xì này rồi.');
    assert.equal(await balance(B), 1000 + bShare, 'không được cộng thêm lần hai');

    // C bấm nút -> nhận phần còn lại, bao đóng.
    out = await press(C, envelopeMsg.message_id, button.callback_data);
    const cShare = shareFromAlert(out);
    assert.equal(bShare + cShare, 300, 'hai phần cộng lại đúng 300');
    assert.equal(await balance(C), 500 + cShare);
    assert.match(out.lastEdit, /✅ Đã có đủ 2\/2 người nhận\. Bao lì xì đã đóng\./);
    assert.deepEqual(out.edits[0].reply_markup.inline_keyboard, [], 'nút bấm phải biến mất khi bao đóng');

    // D bấm khi bao đã đóng.
    out = await press(D, envelopeMsg.message_id, button.callback_data);
    assert.equal(out.lastAlert, 'Bao lì xì này đã đóng.');
    assert.equal(await balance(D), 0);
    assert.equal(await balance(A), aBefore - 300, 'A không được hoàn gì vì bao đã nhận hết');

    // Bấm nút với mã bao không tồn tại.
    out = await press(D, envelopeMsg.message_id, 'envcl:777');
    assert.equal(out.lastAlert, 'Bao lì xì này không còn tồn tại.');

    // /lichsu của B: nhãn tiếng Việt, không lộ mã nội bộ.
    out = await step(B, '/lichsu');
    assert.match(out.last, new RegExp(`Nhận bao lì xì: \\+${bShare} điểm`));
    assert.ok(!out.last.includes('envelope_claim'), `mã nội bộ lọt vào /lichsu: ${out.last}`);
    out = await step(A, '/lichsu');
    assert.match(out.last, /Mở bao lì xì \(tạm giữ điểm\): -300 điểm/);
  });

  // ---- 2) Bao lì xì nhận dở dang rồi hết giờ: hoàn đúng phần chưa nhận, đúng MỘT lần. ----
  await t.test('2a) bao 500 chia 5: chỉ B nhận, hết giờ -> lệnh kế tiếp dọn lười, cron sau đó không hoàn lần hai', async () => {
    const aBefore = await balance(A);
    const bBefore = await balance(B);
    const opened = await step(A, '/lixi 500 chia 5');
    const envelopeMsg = opened.sent[0];
    const data = envelopeMsg.reply_markup.inline_keyboard[0][0].callback_data;
    assert.equal(await balance(A), aBefore - 500);

    const bShare = shareFromAlert(await press(B, envelopeMsg.message_id, data));

    // 11 phút trôi qua (cửa sổ mặc định envelopeWindowMinutes = 10).
    tick(11 * MINUTE);

    // Bất kỳ ai gõ bất kỳ lệnh gì -> dọn lười.
    const out = await step(C, '/sodu');
    assert.match(out.last, /Số dư của bạn/);
    const edit = out.edits.find((e) => e.message_id === envelopeMsg.message_id);
    assert.ok(edit, 'tin nhắn bao lì xì phải được sửa thành "hết giờ"');
    assert.match(edit.text, EXPIRED_STATUS_RE);
    assert.match(edit.text, /1\/5 người đã nhận/);
    assert.deepEqual(edit.reply_markup.inline_keyboard, []);

    assert.equal(await balance(B), bBefore + bShare, 'B giữ phần đã nhận');
    assert.equal(await balance(A), aBefore - bShare, 'A được hoàn đúng 500 - phần của B');

    // Cron chạy sau đó: không có gì để dọn, không hoàn lần hai.
    const cron = await g.runVercelCron();
    assert.deepEqual(cron.swept, []);
    assert.equal(await balance(A), aBefore - bShare, 'cron không được hoàn lần hai');

    // Ai đó bấm nút cũ trên tin nhắn đã hết giờ.
    const late = await press(D, envelopeMsg.message_id, data);
    assert.equal(late.lastAlert, 'Bao lì xì này đã hết giờ nhận.');
    assert.equal(await balance(D), 0);
    assert.equal(await balance(A), aBefore - bShare);

    // /lichsu của A hiện hoàn điểm bằng tiếng Việt, đúng một dòng.
    const hist = await step(A, '/lichsu');
    const refundLines = hist.last.split('\n').filter((l) => l.includes('Hoàn điểm bao lì xì'));
    assert.equal(refundLines.length, 1, `phải có đúng MỘT dòng hoàn điểm:\n${hist.last}`);
    assert.match(refundLines[0], new RegExp(`\\+${500 - bShare} điểm`));
  });

  await t.test('2b) bao 90 chia 3: cron quét trước, lệnh kế tiếp không hoàn lần hai, nút cũ bấm vào được cập nhật', async () => {
    const aBefore = await balance(A);
    const opened = await step(A, '/lixi 90 chia 3');
    const envelopeMsg = opened.sent[0];
    const data = envelopeMsg.reply_markup.inline_keyboard[0][0].callback_data;
    const cShare = shareFromAlert(await press(C, envelopeMsg.message_id, data));

    tick(11 * MINUTE);
    const cron = await g.runVercelCron();
    assert.equal(cron.swept.length, 1, 'cron phải đóng đúng một bao');
    assert.equal(cron.swept[0].settled.length, 1);
    assert.equal(cron.swept[0].settled[0].refunded, 90 - cShare);
    assert.equal(await balance(A), aBefore - cShare);

    const out = await step(B, '/sodu');
    assert.equal(out.edits.length, 0, 'không còn bao nào để dọn nên không sửa tin nhắn');
    assert.equal(await balance(A), aBefore - cShare, 'dọn lười sau cron không được hoàn lần hai');

    // Cron không sửa được tin nhắn (không có ctx), nên nút "Nhận lì xì" vẫn hiện.
    // Người bấm vào phải được báo là hết giờ và tin nhắn phải được cập nhật cho khớp.
    const late = await press(D, envelopeMsg.message_id, data);
    assert.equal(late.lastAlert, 'Bao lì xì này đã hết giờ nhận.');
    const edit = late.edits.find((e) => e.message_id === envelopeMsg.message_id);
    assert.ok(edit, 'bấm nút trên bao đã hết giờ phải cập nhật lại tin nhắn cho khớp');
    assert.match(edit.text, EXPIRED_STATUS_RE);
    assert.deepEqual(edit.reply_markup.inline_keyboard, []);
    assert.equal(await balance(D), 0);
    assert.equal(await balance(A), aBefore - cShare);
  });

  // ---- 3) Tip trực tiếp. ----
  await t.test('3) tip: reply, @username, tự tip, thiếu điểm, hạn mức ngày, cooldown', async () => {
    let out = await step(A, '/caidat hanmuctip 300');
    assert.match(out.last, /dailyTipLimitPerUser/);

    const bStart = await balance(B);
    const cStart = await balance(C);

    // Reply vào tin nhắn của C rồi gõ /lixi 100.
    out = await step(B, '/lixi 100', { replyTo: C });
    assert.equal(out.last, '🧧 Đã tip <b>100 điểm</b> cho <a href="tg://user?id=333">Cường</a>!');
    assert.equal(await balance(B), bStart - 100);
    assert.equal(await balance(C), cStart + 100);

    // Tip bằng @username công khai.
    out = await step(B, '/lixi @cuong_c 50');
    assert.match(out.last, /Đã tip <b>50 điểm<\/b> cho <a href="tg:\/\/user\?id=333">Cường<\/a>!/);
    assert.equal(await balance(B), bStart - 150);
    assert.equal(await balance(C), cStart + 150);

    // @username không tồn tại.
    out = await step(B, '/lixi @khong_co_ai 5');
    assert.match(out.last, /Không xác định được người nhận/);
    assert.equal(await balance(B), bStart - 150);

    // Tự tip cho mình (cả hai cách).
    out = await step(B, '/lixi 10', { replyTo: B });
    assert.equal(out.last, 'Bạn không thể tip cho chính mình.');
    out = await step(B, '/lixi @bao_b 10');
    assert.equal(out.last, 'Bạn không thể tip cho chính mình.');
    assert.equal(await balance(B), bStart - 150);

    // Thiếu điểm: số dư không đổi ở cả hai bên.
    out = await step(D, '/lixi 1', { replyTo: C });
    assert.equal(out.last, 'Số dư không đủ. Số dư hiện tại của bạn: 0 điểm.');
    assert.equal(await balance(D), 0);
    assert.equal(await balance(C), cStart + 150);

    // Hạn mức 300/ngày: đã dùng 150, xin 200 -> từ chối; 150 -> vừa đủ; 1 -> hết hạn mức.
    out = await step(B, '/lixi 200', { replyTo: C });
    assert.equal(out.last, 'Bạn đã dùng 150/300 điểm hạn mức tip hôm nay, chỉ còn 150 điểm.');
    assert.equal(await balance(B), bStart - 150);
    out = await step(B, '/lixi 150', { replyTo: C });
    assert.match(out.last, /Đã tip <b>150 điểm<\/b>/);
    assert.equal(await balance(B), bStart - 300);
    out = await step(B, '/lixi 1', { replyTo: C });
    assert.equal(out.last, 'Bạn đã dùng 300/300 điểm hạn mức tip hôm nay, chỉ còn 0 điểm.');
    assert.equal(await balance(B), bStart - 300);

    // Sang ngày mới, hạn mức được tính lại.
    tick(ledger.DAY_MS);
    out = await step(B, '/lixi 120', { replyTo: C });
    assert.match(out.last, /Đã tip <b>120 điểm<\/b>/);
    assert.equal(await balance(B), bStart - 420);
    assert.equal(await balance(C), cStart + 420);

    // Cooldown 3 giây: hai lệnh liên tiếp cách nhau 1 giây.
    tick(4000);
    out = await send(C, '/lixi 5', { replyTo: B });
    assert.match(out.last, /Đã tip <b>5 điểm<\/b>/);
    tick(1000);
    out = await send(C, '/lixi 5', { replyTo: B });
    assert.equal(out.last, '⏳ Vui lòng đợi 2s trước khi dùng lệnh tiếp theo.');
    assert.equal(await balance(B), bStart - 415);
    assert.equal(await balance(C), cStart + 415);
    // Hết cooldown thì lại được.
    tick(2500);
    out = await send(C, '/lixi 5', { replyTo: B });
    assert.match(out.last, /Đã tip <b>5 điểm<\/b>/);
    assert.equal(await balance(B), bStart - 410);

    // Trả hạn mức về rộng để các kịch bản sau không vướng.
    await step(A, '/caidat hanmuctip 10000');
  });

  // ---- 4) Tip lớn phải chờ admin duyệt. ----
  await t.test('4) tip vượt ngưỡng: xếp hàng (giữ điểm người gửi), /duyet chuyển, /tuchoi hoàn, sai mã báo rõ', async () => {
    let out = await step(A, '/caidat nguongduyet 100');
    assert.match(out.last, /adminApprovalThreshold/);

    const bStart = await balance(B);
    const cStart = await balance(C);

    out = await step(B, '/lixi 150', { replyTo: C });
    assert.match(
      out.last,
      /Khoản tip 150 điểm vượt ngưỡng 100 điểm nên được đưa vào hàng đợi chờ admin duyệt \(mã <code>#\d+<\/code>\)\./
    );
    const id1 = out.last.match(/#(\d+)/)[1];
    assert.equal(await balance(C), cStart, 'C chưa nhận gì khi còn chờ duyệt');
    // Điểm của B bị GIỮ ngay lúc xếp hàng (phương án an toàn cho bảo toàn điểm): B không
    // thể tiêu số điểm đó ở nơi khác trong lúc chờ, nên /duyet không bao giờ thất bại vì
    // "số dư không đủ" và không có đường nào tiêu một khoản hai lần.
    assert.equal(await balance(B), bStart - 150, 'điểm của B phải bị giữ ngay khi xếp hàng');

    // B cố tiêu phần đã bị giữ: số dư khả dụng không còn nên bị chặn.
    out = await step(B, `/rut ${WALLET} ${bStart - 149}`);
    assert.equal(out.last, `Số dư không đủ. Số dư hiện tại của bạn: ${bStart - 150} điểm.`);

    // Người thường gọi /duyet.
    out = await step(B, `/duyet ${id1}`);
    assert.equal(out.last, 'Lệnh này chỉ dành cho admin của nhóm.');
    assert.equal(await balance(C), cStart);

    // Admin duyệt.
    out = await step(A, `/duyet ${id1}`);
    assert.equal(
      out.last,
      `✅ Đã duyệt giao dịch <b>#${id1}</b> (tip 150 điểm từ <b>Bảo</b> cho <b>Cường</b>).`
    );
    assert.equal(await balance(B), bStart - 150);
    assert.equal(await balance(C), cStart + 150);

    // Duyệt lại mã đã xử lý / mã không tồn tại / sai cú pháp.
    out = await step(A, `/duyet ${id1}`);
    assert.equal(out.last, 'Không xử lý được: Giao dịch này đã được xử lý trước đó.');
    out = await step(A, '/duyet 9999');
    assert.equal(out.last, 'Không xử lý được: Không tìm thấy giao dịch đang chờ duyệt với mã này.');
    out = await step(A, '/duyet abc');
    assert.equal(out.last, 'Cú pháp: /duyet <mã giao dịch> hoặc /tuchoi <mã giao dịch>.');
    assert.equal(await balance(C), cStart + 150, 'các lệnh lỗi không được chuyển điểm');

    // Khoản thứ hai bị từ chối -> hoàn đủ cho B.
    out = await step(B, '/lixi 200', { replyTo: C });
    const id2 = out.last.match(/#(\d+)/)[1];
    assert.notEqual(id2, id1);
    assert.equal(await balance(B), bStart - 350);
    out = await step(A, `/tuchoi ${id2}`);
    assert.equal(
      out.last,
      `✅ Đã từ chối giao dịch <b>#${id2}</b> (tip 200 điểm từ <b>Bảo</b> cho <b>Cường</b>).`
    );
    assert.equal(await balance(B), bStart - 150, 'từ chối phải hoàn đủ 200 cho B');
    assert.equal(await balance(C), cStart + 150);
    out = await step(A, `/tuchoi ${id2}`);
    assert.equal(out.last, 'Không xử lý được: Giao dịch này đã được xử lý trước đó.');
    out = await step(A, `/duyet ${id2}`);
    assert.equal(out.last, 'Không xử lý được: Giao dịch này đã được xử lý trước đó.');
    assert.equal(await balance(B), bStart - 150);

    // Lịch sử của B và C gọi tên bằng tiếng Việt.
    out = await step(B, '/lichsu');
    assert.ok(!/approval_hold|approval_refund/.test(out.last), `mã nội bộ lọt vào /lichsu: ${out.last}`);
    assert.match(out.last, new RegExp(`Giữ điểm chờ duyệt tip lớn: -150 điểm — Giữ điểm chờ admin duyệt tip lớn cho Cường \\(mã #${id1}\\)`));
    assert.match(out.last, /Giữ điểm chờ duyệt tip lớn: -200 điểm/);
    assert.match(out.last, /Hoàn điểm \(tip lớn bị từ chối\): \+200 điểm — Hoàn điểm do tip lớn bị admin từ chối/);
    // Số dư của B chỉ giảm MỘT lần (lúc giữ) nên lịch sử không được hiện thêm dòng "-150" nữa.
    assert.ok(!/-150 điểm — Tip khoản lớn/.test(out.last), `tip đã duyệt bị hiện hai lần trong lịch sử người gửi:\n${out.last}`);
    out = await step(C, '/lichsu');
    assert.match(out.last, /Tip: \+150 điểm — Tip khoản lớn từ Bảo đã được admin duyệt/);
    assert.ok(!/-150|-200|\+200/.test(out.last), `C không được thấy khoản giữ/hoàn của B:\n${out.last}`);

    // Bao lì xì vượt ngưỡng bị chặn thẳng (không có hàng đợi cho bao).
    out = await step(B, '/lixi 150 chia 2');
    assert.match(out.last, /Bao lì xì lớn hơn ngưỡng 100 điểm cần admin xác nhận trước/);
    assert.equal(await balance(B), bStart - 150);

    await step(A, '/caidat nguongduyet 2000');
  });

  // ---- 5) Rút điểm. ----
  await t.test('5) rút: giữ điểm, địa chỉ sai, thiếu điểm, admin duyệt/huỷ, lịch sử tiếng Việt', async () => {
    const bStart = await balance(B);

    let out = await step(B, `/rut ${WALLET} 150`);
    assert.match(out.last, /Đã ghi nhận yêu cầu rút <b>#\d+<\/b>: <b>150 điểm<\/b> về địa chỉ <code>0xab12/);
    assert.match(out.last, /chưa gửi tiền thật/);
    const w1 = out.last.match(/#(\d+)/)[1];
    assert.equal(await balance(B), bStart - 150, 'điểm bị giữ ngay khi yêu cầu');

    out = await step(B, '/rut 0x1234 10');
    assert.equal(out.last, 'Địa chỉ ví không đúng định dạng BEP-20/EVM (phải là 0x + 40 ký tự hex).');
    out = await step(B, `/rut ${WALLET} 999999`);
    assert.equal(out.last, `Số dư không đủ. Số dư hiện tại của bạn: ${bStart - 150} điểm.`);
    out = await step(B, `/rut ${WALLET}`);
    assert.match(out.last, /Cú pháp: <code>\/rut 0x/);
    out = await step(B, `/rut ${WALLET} 0`);
    assert.equal(out.last, 'Số điểm rút phải là số nguyên dương.');
    assert.equal(await balance(B), bStart - 150);

    // Người thường không duyệt được.
    out = await step(C, `/rut_duyet ${w1}`);
    assert.equal(out.last, 'Lệnh này chỉ dành cho admin của nhóm.');

    // Admin duyệt: điểm KHÔNG quay lại (đã "rút" ra ngoài), trạng thái approved.
    out = await step(A, `/rut_duyet ${w1}`);
    assert.equal(
      out.last,
      `✅ Đã duyệt yêu cầu rút <b>#${w1}</b> của <b>Bảo</b> (150 điểm, ${WALLET}).`
    );
    assert.equal(await balance(B), bStart - 150);
    out = await step(A, `/rut_duyet ${w1}`);
    assert.equal(out.last, 'Không xử lý được: Yêu cầu rút này đã được xử lý trước đó.');
    out = await step(A, `/rut_huy ${w1}`);
    assert.equal(out.last, 'Không xử lý được: Yêu cầu rút này đã được xử lý trước đó.');
    out = await step(A, '/rut_huy 9999');
    assert.equal(out.last, 'Không xử lý được: Không tìm thấy yêu cầu rút với mã này.');
    out = await step(A, '/rut_huy');
    assert.equal(out.last, 'Cú pháp: /rut_duyet <mã yêu cầu> hoặc /rut_huy <mã yêu cầu>.');
    assert.equal(await balance(B), bStart - 150);

    // Yêu cầu thứ hai bị huỷ -> hoàn đủ.
    out = await step(B, `/rut ${WALLET} 20`);
    const w2 = out.last.match(/#(\d+)/)[1];
    assert.notEqual(w2, w1);
    assert.equal(await balance(B), bStart - 170);
    out = await step(A, `/rut_huy ${w2}`);
    assert.equal(
      out.last,
      `✅ Đã từ chối (đã hoàn điểm) yêu cầu rút <b>#${w2}</b> của <b>Bảo</b> (20 điểm, ${WALLET}).`
    );
    assert.equal(await balance(B), bStart - 150);

    const { state } = await totalsOf(storage, chatId);
    const byId = Object.fromEntries(state.withdrawals.map((w) => [w.id, w]));
    assert.equal(byId[w1].status, 'approved');
    assert.equal(byId[w1].decidedBy, String(A.id));
    assert.equal(byId[w1].amount, 150);
    assert.equal(byId[w2].status, 'rejected');

    out = await step(B, '/lichsu');
    assert.match(out.last, /Giữ điểm để rút: -150 điểm/);
    assert.match(out.last, /Giữ điểm để rút: -20 điểm/);
    assert.match(out.last, /Hoàn điểm \(rút bị từ chối\): \+20 điểm/);
    assert.ok(!/withdrawal_/.test(out.last), `mã nội bộ lọt vào /lichsu: ${out.last}`);
  });

  // ---- 6) Thưởng hoạt động hằng ngày. ----
  await t.test('6) thưởng hoạt động: đủ tin nhắn mới được thưởng, không phát hai lần, pot/ngân sách thiếu thì giới hạn và nói rõ', async () => {
    let out = await step(A, '/thuong 10 3');
    assert.match(out.last, /<b>10 điểm\/ngày<\/b> cho thành viên có <b>&ge; 3 tin nhắn<\/b>/);
    out = await step(B, '/thuong 99 1');
    assert.equal(out.last, 'Lệnh này chỉ dành cho admin của nhóm.');

    // Pot chỉ có 25 điểm: đủ cho ngày 1 (10) và thiếu cho ngày 2 (cần 30, còn 15).
    out = await step(A, '/nap 25', { mint: 25 });
    assert.equal(out.last, '✅ Đã nạp <b>25 điểm</b> vào pot nhóm.');
    assert.equal(await g.pot(), 25);

    // Ngày 1: B nói 3 câu, C nói 1 câu, D chỉ gõ lệnh.
    tick(ledger.DAY_MS);
    const bDay1 = await balance(B);
    const cDay1 = await balance(C);
    for (const line of ['sáng rồi', 'ăn gì chưa', 'đi làm thôi']) await step(B, line);
    await step(C, 'ừ');
    await step(D, '/sodu');
    await step(D, '/sodu');
    await step(D, '/sodu');

    let cron = await g.runVercelCron();
    assert.equal(cron.reward.alreadyRan, false);
    assert.deepEqual(cron.reward.grants, { [String(B.id)]: 10 });
    assert.equal(cron.reward.limited, false, 'pot đủ nên không bị giới hạn');
    assert.equal(await balance(B), bDay1 + 10);
    assert.equal(await balance(C), cDay1);
    assert.equal(await balance(D), 0);
    assert.equal(await g.pot(), 15);

    // Cron chạy lại cùng ngày (Vercel có thể gọi hai lần / admin gọi tay).
    cron = await g.runVercelCron();
    assert.equal(cron.reward.alreadyRan, true);
    assert.equal(await balance(B), bDay1 + 10, 'không được phát thưởng hai lần');
    assert.equal(await g.pot(), 15);

    out = await step(B, '/lichsu');
    assert.match(out.last, /Thưởng hoạt động: \+10 điểm — Thưởng hoạt động ngày \d{4}-\d{2}-\d{2} \(&gt;= 3 tin nhắn\)/);
    assert.ok(!out.last.includes('reward:'), `mã nội bộ lọt vào /lichsu: ${out.last}`);

    // Ngày 2: B, C, D đều đủ điều kiện (cần 30) nhưng pot chỉ còn 15.
    tick(ledger.DAY_MS);
    const bDay2 = await balance(B);
    const cDay2 = await balance(C);
    for (const p of [B, C, D]) {
      for (const line of ['một', 'hai', 'ba']) await step(p, `${line} ${p.first_name}`);
    }
    cron = await g.runVercelCron();
    assert.equal(cron.reward.alreadyRan, false);
    assert.deepEqual(cron.reward.grants, { [String(B.id)]: 10, [String(C.id)]: 5 }, 'phát theo thứ tự id tới khi hết pot');
    assert.equal(cron.reward.limited, true, 'kết quả phải nói rõ là bị giới hạn');
    assert.equal(cron.reward.shortfall, 15, 'thiếu 15 điểm so với nhu cầu 30');
    assert.equal(await balance(B), bDay2 + 10);
    assert.equal(await balance(C), cDay2 + 5);
    assert.equal(await balance(D), 0);
    assert.equal(await g.pot(), 0);
    out = await step(C, '/lichsu');
    assert.match(out.last, /Thưởng hoạt động: \+5 điểm — .*chỉ còn đủ 5\/10 điểm/);

    // Ngày 3: pot đầy nhưng ngân sách/ngày/nhóm chỉ 15.
    out = await step(A, '/nap 1000', { mint: 1000 });
    out = await step(A, '/caidat ngansachthuong 15');
    assert.match(out.last, /dailyRewardBudgetPerGroup/);
    tick(ledger.DAY_MS);
    const bDay3 = await balance(B);
    const cDay3 = await balance(C);
    for (const p of [B, C, D]) {
      for (const line of ['một', 'hai', 'ba']) await step(p, `${line} ${p.first_name}`);
    }
    cron = await g.runVercelCron();
    assert.deepEqual(cron.reward.grants, { [String(B.id)]: 10, [String(C.id)]: 5 });
    assert.equal(cron.reward.limited, true);
    assert.equal(cron.reward.shortfall, 15);
    assert.equal(await balance(B), bDay3 + 10);
    assert.equal(await balance(C), cDay3 + 5);
    assert.equal(await balance(D), 0);
    assert.equal(await g.pot(), 1000 - 15, 'pot chỉ bị trừ đúng ngân sách ngày');

    // Cron chạy thêm lần nữa trong ngày: vẫn không phát thêm dù pot còn.
    cron = await g.runVercelCron();
    assert.equal(cron.reward.alreadyRan, true);
    assert.equal(await g.pot(), 985);
  });

  return g;
}

// ---------------------------------------------------------------------------
// Chạy trên kho JSON (luôn) và Postgres (khi có TEST_DATABASE_URL).
// ---------------------------------------------------------------------------
const JSON_CHAT_ID = -1002000000000 - (realDateNow() % 1000000);

test('kịch bản người thật — kho JSON', async (t) => {
  const storage = new JsonGroupStorage();
  try {
    await runScenarios(t, storage, JSON_CHAT_ID);
  } finally {
    try {
      fs.unlinkSync(store.groupFilePath(JSON_CHAT_ID));
    } catch (err) {
      /* chưa có file thì thôi */
    }
  }
});

const CONNECTION_STRING = process.env.TEST_DATABASE_URL || '';
const PG_SCHEMA = `lixi_scn_${process.pid}_${realDateNow().toString(36)}`;
const PG_CHAT_ID = -1003000000000 - (realDateNow() % 1000000);

test('kịch bản người thật — kho Postgres (đường chạy thật trên Vercel)', async (t) => {
  if (!CONNECTION_STRING) {
    t.skip('Bỏ qua: chưa đặt TEST_DATABASE_URL.');
    return;
  }
  const { PostgresLedger, closeAllPools } = require('../src/postgres-store');
  const storage = new PostgresLedger(CONNECTION_STRING, { schema: PG_SCHEMA });
  try {
    await storage.pool.query('SELECT 1');
  } catch (err) {
    t.skip(`Bỏ qua: không kết nối được Postgres (${err.message}).`);
    return;
  }
  try {
    await storage.ensureSchema();
    const g = await runScenarios(t, storage, PG_CHAT_ID);

    // ---- 7) "Khởi động nguội": một instance hoàn toàn mới đọc lại y hệt. ----
    await t.test('7) khởi động nguội: instance Postgres mới đọc lại đúng từng số dư, bao lì xì, yêu cầu rút', async () => {
      const before = await readEverything(storage, PG_CHAT_ID);
      const beforeTotals = await totalsOf(storage, PG_CHAT_ID);

      // Đóng mọi pool (như instance cũ bị Vercel thu hồi) rồi mở instance mới tinh.
      await closeAllPools();
      const fresh = new PostgresLedger(CONNECTION_STRING, { schema: PG_SCHEMA });
      const after = await readEverything(fresh, PG_CHAT_ID);

      assert.deepEqual(after.members, before.members, 'số dư/tên từng thành viên phải y hệt');
      assert.deepEqual(after.envelopes, before.envelopes, 'trạng thái mọi bao lì xì phải y hệt');
      assert.deepEqual(after.withdrawals, before.withdrawals, 'mọi yêu cầu rút phải y hệt');
      assert.deepEqual(after.pendingApprovals, before.pendingApprovals);
      assert.deepEqual(after.pot, before.pot);
      assert.deepEqual(after.config, before.config);
      assert.deepEqual(after.rewardRule, before.rewardRule);
      assert.equal(after.nextTxId, before.nextTxId);
      assert.equal(after.nextEnvelopeId, before.nextEnvelopeId);
      assert.equal(after.nextWithdrawalId, before.nextWithdrawalId);
      assert.equal(after.nextApprovalId, before.nextApprovalId);

      // Những con số cụ thể đã đi qua cả 6 kịch bản.
      assert.equal(Object.keys(after.envelopes).length, 3);
      assert.equal(after.envelopes['1'].status, 'completed');
      assert.equal(after.envelopes['2'].status, 'expired');
      assert.equal(after.envelopes['3'].status, 'expired');
      assert.equal(Object.values(after.envelopes['1'].claims).reduce((s, x) => s + x, 0), 300);
      assert.equal(after.withdrawals.length, 2);
      assert.equal(after.pendingApprovals.length, 2);
      assert.ok(after.pendingApprovals.every((a) => a.status !== 'pending'));
      assert.equal((await totalsOf(fresh, PG_CHAT_ID)).total, beforeTotals.total);

      // Instance mới vẫn phục vụ được lệnh tiếp theo với đúng số dư.
      const g2 = makeGroup(fresh, PG_CHAT_ID);
      // g2 chưa biết tổng đã đúc — sao chép từ tổng hiện có.
      const bBalance = before.members[String(B.id)].balance;
      const out = await g2.send(B, '/sodu', { mint: beforeTotals.total });
      assert.equal(out.last, `💰 Số dư của bạn trong nhóm này: <b>${bBalance} điểm LIXI</b>.`);
      assert.equal(await g.balance(B), bBalance);
    });
  } finally {
    try {
      await storage.dropSchema();
    } catch (err) {
      console.error('Không xoá được schema test:', err.message);
    }
    await closeAllPools();
  }
});
