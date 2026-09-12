'use strict';

/**
 * Test cho phần "bot tự lan truyền" (src/growth.js, commands/growth.js, commands/start.js
 * và nút "thêm vào nhóm" trên tin nhắn bao lì xì):
 *
 *   - deep link `?startgroup=` đúng định dạng Telegram và mang được nhóm nguồn;
 *   - tin nhắn bao lì xì ĐÃ ĐÓNG có nút, bao ĐANG MỞ thì không;
 *   - my_chat_member: chào mừng đúng MỘT lần, bản "thiếu quyền admin" khi cần;
 *   - giới thiệu (referral) được ghi vào nhóm mới và KHÔNG BAO GIỜ hiện ra trong tin nhắn;
 *   - /huongdan, /bxh (xếp theo điểm NHẬN trong 7 ngày, bỏ qua /nap), /thongke (chỉ chủ
 *     bot, đếm đúng trên hai nhóm — kho JSON và kho Postgres).
 *
 * Kho JSON dùng một THƯ MỤC TẠM riêng (LIXI_DATA_DIR) để /thongke đếm đúng số nhóm mà
 * không dính file của các test khác đang chạy song song.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

// PHẢI đặt trước khi nạp bất kỳ module nào của bot (store.js đọc biến này lúc nạp).
const TMP_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'lixi-growth-'));
process.env.LIXI_DATA_DIR = TMP_DATA_DIR;

const test = require('node:test');
const assert = require('node:assert/strict');

const { Telegram } = require('telegraf');
const { createBot } = require('../src/bot');
const { JsonGroupStorage } = require('../src/storage');
const store = require('../src/store');
const ledger = require('../src/ledger');
const growth = require('../src/growth');
const tipCmd = require('../src/commands/tip');

assert.equal(store.DATA_DIR, TMP_DATA_DIR, 'kho JSON của test phải nằm trong thư mục tạm');

const TOKEN = '123456789:ABCdefGhIJKlmNoPQRstuVwXyZ1234567890';
const BOT_USER = { id: 7, is_bot: true, first_name: 'Lì Xì Bot', username: 'lixi_test_bot' };
const OWNER_ID = 999; // chủ bot (BOT_SUPER_ADMIN_IDS)
const A = { id: 111, is_bot: false, first_name: 'An' };
const B = { id: 222, is_bot: false, first_name: 'Bảo' };
const C = { id: 333, is_bot: false, first_name: '<b>Cường</b>' }; // tên có HTML, phải escape
const D = { id: 444, is_bot: false, first_name: 'Dung' };

const BASE = -1004000000000 - (Date.now() % 1000000);
const G_STATS_1 = BASE - 1;
const G_STATS_2 = BASE - 2;
const G_ENVELOPE = BASE - 3;
const G_ADDED_MEMBER = BASE - 4;
const G_ADDED_ADMIN = BASE - 5;
const G_RANK = BASE - 6;
const PRIVATE_CHAT = { id: OWNER_ID, type: 'private', first_name: 'Chủ bot' };

// ---------------------------------------------------------------------------
// Telegram giả
// ---------------------------------------------------------------------------
const realCallApi = Telegram.prototype.callApi;
let calls = [];
let messageSeq = 100;
let getMeCalls = 0;
let getMeResult = { id: 7, is_bot: true, first_name: 'Lì Xì Bot', username: 'lixi_getme_bot' };

Telegram.prototype.callApi = async function fakeCallApi(method, payload) {
  const entry = { method, payload, result: true };
  calls.push(entry);
  if (method === 'sendMessage') {
    messageSeq += 1;
    entry.result = { message_id: messageSeq, text: payload.text, chat: { id: payload.chat_id } };
    return entry.result;
  }
  if (method === 'editMessageText') return { message_id: payload.message_id, text: payload.text };
  if (method === 'getChatAdministrators') return [{ user: A, status: 'administrator' }];
  if (method === 'getMe') {
    getMeCalls += 1;
    if (getMeResult instanceof Error) throw getMeResult;
    return getMeResult;
  }
  return true;
};

test.after(() => {
  Telegram.prototype.callApi = realCallApi;
  fs.rmSync(TMP_DATA_DIR, { recursive: true, force: true });
});

const jsonStorage = new JsonGroupStorage();

function makeBot(storage = jsonStorage, { botUsername = 'lixi_test_bot' } = {}) {
  calls = [];
  const bot = createBot(TOKEN, { storage, superAdminIds: [String(OWNER_ID)], botUsername });
  bot.botInfo = BOT_USER;
  const errors = [];
  bot.catch((err) => errors.push(err));
  return { bot, errors };
}

let updateId = 0;
function groupChat(id) {
  return { id, type: 'supergroup', title: 'Nhóm test' };
}

function textUpdate(chat, user, text, extra = {}) {
  updateId += 1;
  const isCommand = text.startsWith('/');
  return {
    update_id: updateId,
    message: {
      message_id: updateId,
      date: Math.floor(Date.now() / 1000),
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

function myChatMemberUpdate(chat, user, oldStatus, newStatus) {
  updateId += 1;
  return {
    update_id: updateId,
    my_chat_member: {
      chat,
      from: user,
      date: Math.floor(Date.now() / 1000),
      old_chat_member: { user: BOT_USER, status: oldStatus },
      new_chat_member: { user: BOT_USER, status: newStatus },
    },
  };
}

function callbackUpdate(chat, user, messageId, data) {
  updateId += 1;
  return {
    update_id: updateId,
    callback_query: {
      id: `cbq-${updateId}`,
      from: user,
      chat_instance: 'ci-1',
      message: { message_id: messageId, date: Math.floor(Date.now() / 1000), chat, from: BOT_USER, text: 'bao' },
      data,
    },
  };
}

/** Tin nhắn bot đã gửi (payload + message_id Telegram giả trả về). */
function sentMessages() {
  return calls
    .filter((c) => c.method === 'sendMessage')
    .map((c) => ({ ...c.payload, message_id: c.result.message_id }));
}
function edits() {
  return calls.filter((c) => c.method === 'editMessageText').map((c) => c.payload);
}
function lastText() {
  const sent = sentMessages();
  return sent.length ? sent[sent.length - 1].text : '';
}
/** Mọi văn bản bot đã gửi/sửa từ lần `makeBot`/reset gần nhất. */
function allBotText() {
  return [...sentMessages().map((m) => m.text), ...edits().map((e) => e.text)].join('\n');
}

async function drive(bot, errors, update) {
  await bot.handleUpdate(update);
  if (errors.length) throw errors.shift();
}

/** Nhóm mở sẵn để tip được ngay: không thâm niên, không cooldown. */
async function openGroup(storage, chatId, people, now) {
  await storage.withGroup(
    chatId,
    (state) => {
      state.config.minAccountAgeDays = 0;
      state.config.cooldownSeconds = 0;
      for (const p of people) ledger.rememberMember(state, p, now);
    },
    { nowMs: now }
  );
}

/**
 * Nhóm dùng cho /bxh: tip đôi (hai bản ghi), tip lớn đã duyệt (một bản ghi), nhận bao lì xì,
 * tip cũ hơn 7 ngày và một khoản /nap rất lớn cho admin — khoản /nap KHÔNG được xếp hạng.
 * Trả về kỳ vọng {userId: điểm nhận trong 7 ngày}.
 */
async function seedRankingGroup(storage, chatId, now) {
  await openGroup(storage, chatId, [A, B, C, D], now);
  await storage.withGroup(
    chatId,
    (state) => {
      ledger.adminCreditUser(state, A.id, A.id, 10000, 'Admin cấp điểm trực tiếp', now);
      ledger.adminCreditUser(state, A.id, B.id, 5000, 'Admin cấp điểm trực tiếp', now);
      ledger.transferPure(state, A.id, B.id, 500, { type: 'tip' }, now - 8 * ledger.DAY_MS); // quá cũ
      ledger.transferPure(state, A.id, B.id, 100, { type: 'tip' }, now - ledger.DAY_MS);
      ledger.transferPure(state, A.id, C.id, 50, { type: 'tip' }, now - 60000);
      ledger.creditPure(state, D.id, 20, { type: 'tip', note: 'Tip khoản lớn đã được admin duyệt' }, now - 1000);
      // Bao lì xì: A mở 30 chia 1, C nhận.
      ledger.debitPure(state, A.id, 30, { type: 'envelope_hold' }, now - 500);
      const env = ledger.createEnvelope(
        state,
        { senderId: A.id, senderName: 'An', amount: 30, recipientCount: 1, windowMs: 600000 },
        now - 500
      );
      ledger.claimEnvelopeAndCredit(state, env.id, C.id, now - 400);
    },
    { nowMs: now }
  );
  return { [String(B.id)]: 100, [String(C.id)]: 80, [String(D.id)]: 20 };
}

/** Hai nhóm cho /thongke: một nhóm sôi nổi + được giới thiệu, một nhóm bot đã rời và im lặng. */
async function seedStatsGroups(storage, activeId, quietId, now) {
  await openGroup(storage, activeId, [A, B, C], now);
  await storage.withGroup(
    activeId,
    (state) => {
      growth.growthOf(state).botStatus = 'administrator';
      growth.recordReferral(state, G_ENVELOPE, now);
      ledger.adminCreditUser(state, A.id, A.id, 1000, 'Admin cấp điểm trực tiếp', now);
      ledger.transferPure(state, A.id, B.id, 100, { type: 'tip' }, now - 1000);
      ledger.creditPure(state, C.id, 20, { type: 'tip', note: 'Tip lớn đã duyệt' }, now - 900);
      ledger.debitPure(state, A.id, 30, { type: 'envelope_hold' }, now - 500);
      ledger.createEnvelope(
        state,
        { senderId: A.id, senderName: 'An', amount: 30, recipientCount: 1, windowMs: 600000 },
        now - 500
      );
    },
    { nowMs: now }
  );
  await openGroup(storage, quietId, [A, D], now);
  await storage.withGroup(
    quietId,
    (state) => {
      growth.growthOf(state).botStatus = 'left';
      ledger.adminCreditUser(state, A.id, D.id, 300, 'Admin cấp điểm trực tiếp', now - 10 * ledger.DAY_MS);
      ledger.transferPure(state, D.id, A.id, 40, { type: 'tip' }, now - 9 * ledger.DAY_MS);
    },
    { nowMs: now }
  );
  return {
    groupsTotal: 1, // nhóm im lặng: bot đã rời
    groupsActive: 1,
    groupsReferred: 1,
    membersSeen: 4, // A, B, C, D — A ở cả hai nhóm chỉ tính một lần
    envelopesOpened: 1,
    pointsTipped: 120, // 100 (tip đôi, đếm một lần) + 20 (tip lớn đã duyệt); 40 quá cũ
  };
}

// ===========================================================================
// 1) Deep link ?startgroup= và payload giới thiệu — hàm thuần
// ===========================================================================

test('payload giới thiệu: mã hoá/giải mã id nhóm, đúng bảng chữ Telegram, dưới 64 ký tự', () => {
  for (const id of [-1001234567890, -987654321, 42, String(G_ENVELOPE)]) {
    const payload = growth.encodeReferralPayload(id);
    assert.match(payload, growth.START_PAYLOAD_RE, `payload không hợp lệ: ${payload}`);
    assert.ok(payload.length <= 64);
    assert.ok(!payload.includes(String(Math.abs(Number(id)))), 'không in id thô vào payload');
    assert.equal(growth.decodeReferralPayload(payload), String(id));
  }
  assert.equal(growth.encodeReferralPayload('abc'), null);
  assert.equal(growth.encodeReferralPayload(0), null);
  for (const bad of ['', 'true', 'ref_', 'ref_x123', 'ref_n', '-1001234567890', 'ref_n1/2', 'a'.repeat(65)]) {
    assert.equal(growth.decodeReferralPayload(bad), null, `phải từ chối: "${bad}"`);
  }
});

test('URL thêm vào nhóm: đúng dạng https://t.me/<bot>?startgroup=<payload> và mang nhóm nguồn', () => {
  const url = growth.addToGroupUrl('lixi_test_bot', G_ENVELOPE);
  const m = url.match(/^https:\/\/t\.me\/lixi_test_bot\?startgroup=([A-Za-z0-9_-]{1,64})$/);
  assert.ok(m, `URL sai định dạng: ${url}`);
  assert.equal(growth.decodeReferralPayload(m[1]), String(G_ENVELOPE));

  assert.equal(growth.addToGroupUrl('@lixi_test_bot', null), 'https://t.me/lixi_test_bot?startgroup=true');
  assert.equal(growth.addToGroupUrl('', G_ENVELOPE), null, 'chưa biết username thì không có URL');
  assert.equal(growth.addToGroupUrl('bad name!', G_ENVELOPE), null);
  assert.equal(growth.addToGroupButton(url).text, growth.ADD_TO_GROUP_BUTTON_TEXT);
  assert.equal(growth.addToGroupKeyboard(null), null);
});

test('danh tính bot: hỏi getMe đúng một lần rồi cache; getMe lỗi thì không có nút, không ném lỗi', async () => {
  getMeCalls = 0;
  const identity = growth.createBotIdentity(new Telegram(TOKEN));
  assert.equal(await identity.getUsername(), 'lixi_getme_bot');
  assert.equal(await identity.getUsername(), 'lixi_getme_bot');
  assert.match(await identity.addToGroupUrl(G_ENVELOPE), /^https:\/\/t\.me\/lixi_getme_bot\?startgroup=ref_/);
  assert.equal(getMeCalls, 1, 'phải cache kết quả getMe');

  getMeResult = new Error('network down');
  const broken = growth.createBotIdentity(new Telegram(TOKEN));
  assert.equal(await broken.getUsername(), null);
  assert.equal(await broken.addToGroupUrl(G_ENVELOPE), null);
  assert.equal(await broken.getUsername(), null, 'không gọi lại ngay sau khi lỗi');
  assert.equal(getMeCalls, 2);
  getMeResult = { id: 7, is_bot: true, first_name: 'Lì Xì Bot', username: 'lixi_getme_bot' };

  const stubbed = growth.createBotIdentity(new Telegram(TOKEN), { botUsername: '@stub_bot' });
  assert.equal(await stubbed.getUsername(), 'stub_bot');
  assert.equal(getMeCalls, 2, 'có username sẵn thì không gọi getMe');
});

// ===========================================================================
// 2) /thongke — CHẠY TRƯỚC các test tạo nhóm khác, để kho JSON chỉ có đúng hai nhóm
// ===========================================================================

test('/thongke: người thường bị từ chối; chủ bot thấy đúng số đếm trên hai nhóm (kho JSON), không có tên/id', async () => {
  const now = Date.now();
  const expected = await seedStatsGroups(jsonStorage, G_STATS_1, G_STATS_2, now);
  assert.deepEqual(
    await jsonStorage.growthStats(growth.statsWindowStart(now)),
    expected,
    'growthStats của kho JSON'
  );

  const { bot, errors } = makeBot();
  // Người thường, kể cả admin nhóm (A), không xem được.
  await drive(bot, errors, textUpdate(groupChat(G_STATS_1), A, '/thongke'));
  assert.equal(lastText(), 'Lệnh này chỉ dành cho chủ bot.');
  await drive(bot, errors, textUpdate({ id: A.id, type: 'private', first_name: 'An' }, A, '/thongke'));
  assert.equal(lastText(), 'Lệnh này chỉ dành cho chủ bot.');

  // Chủ bot, trong chat riêng.
  await drive(bot, errors, textUpdate(PRIVATE_CHAT, { id: OWNER_ID, is_bot: false, first_name: 'Chủ bot' }, '/thongke'));
  const text = lastText();
  assert.match(text, /Nhóm đang có bot: <b>1<\/b>/);
  assert.match(text, /Nhóm hoạt động 7 ngày qua[^<]*<b>1<\/b>/);
  assert.match(text, /Thành viên đã thấy[^<]*<b>4<\/b>/);
  assert.match(text, /Bao lì xì đã mở 7 ngày qua: <b>1<\/b>/);
  assert.match(text, /Điểm đã tip 7 ngày qua: <b>120<\/b>/);
  assert.match(text, /giới thiệu\): <b>1<\/b>/);
  assert.match(text, /Con số cần theo dõi/);
  for (const forbidden of ['An', 'Bảo', 'Dung', String(A.id), String(B.id), String(G_STATS_1), String(G_ENVELOPE)]) {
    assert.ok(!text.includes(forbidden), `thống kê lộ "${forbidden}": ${text}`);
  }
  // Chat riêng của chủ bot không được tạo ra một "nhóm" trong kho.
  assert.ok(!store.listGroupIds().includes(String(OWNER_ID)));
});

// ===========================================================================
// 3) Nút "thêm vào nhóm" trên tin nhắn bao lì xì
// ===========================================================================

test('bao lì xì: đang mở KHÔNG có nút thêm vào nhóm; đủ người nhận thì có, URL mang nhóm nguồn', async () => {
  const now = Date.now();
  await openGroup(jsonStorage, G_ENVELOPE, [A, B], now);
  await jsonStorage.withGroup(G_ENVELOPE, (state) => {
    ledger.adminCreditUser(state, A.id, A.id, 100, 'Admin cấp điểm trực tiếp', now);
  });
  const { bot, errors } = makeBot();
  const chat = groupChat(G_ENVELOPE);

  await drive(bot, errors, textUpdate(chat, A, '/lixi 10 chia 1'));
  const opened = sentMessages();
  assert.equal(opened.length, 1);
  const keyboard = opened[0].reply_markup.inline_keyboard;
  assert.equal(keyboard.length, 1);
  assert.equal(keyboard[0][0].text, '🧧 Nhận lì xì');
  assert.equal(keyboard[0][0].url, undefined, 'bao đang mở không có nút URL');
  assert.ok(!opened[0].text.includes(growth.ADD_TO_GROUP_BUTTON_TEXT));

  // B nhận → đủ 1/1 → bao đóng → nút thêm vào nhóm xuất hiện thay nút nhận.
  await drive(bot, errors, callbackUpdate(chat, B, opened[0].message_id, keyboard[0][0].callback_data));
  const edit = edits().find((e) => e.message_id === opened[0].message_id);
  assert.ok(edit, 'tin nhắn bao phải được sửa');
  assert.match(edit.text, /Đã có đủ 1\/1 người nhận/);
  const buttons = edit.reply_markup.inline_keyboard;
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].length, 1);
  assert.equal(buttons[0][0].text, growth.ADD_TO_GROUP_BUTTON_TEXT);
  assert.equal(buttons[0][0].callback_data, undefined);
  const m = buttons[0][0].url.match(/^https:\/\/t\.me\/lixi_test_bot\?startgroup=([A-Za-z0-9_-]{1,64})$/);
  assert.ok(m, `URL nút sai: ${buttons[0][0].url}`);
  assert.equal(growth.decodeReferralPayload(m[1]), String(G_ENVELOPE), 'payload phải trỏ về nhóm đang hiện nút');

  // Nút KHÔNG xuất hiện trên tin nhắn tip thường (không gắn vào mọi tin nhắn).
  calls = [];
  await drive(bot, errors, textUpdate(chat, A, '/lixi 5', {
    reply_to_message: { message_id: 1, date: 1, chat, from: B, text: 'hi' },
  }));
  assert.match(lastText(), /Đã tip/);
  assert.equal(sentMessages()[0].reply_markup, undefined);
});

test('bao lì xì hết giờ (dọn lười) cũng mang nút; không biết username thì KHÔNG có nút nhưng vẫn sửa tin nhắn', async () => {
  const now = Date.now();
  const chat = groupChat(G_ENVELOPE);
  const envelopeId = await jsonStorage.withGroup(G_ENVELOPE, (state) => {
    ledger.debitPure(state, A.id, 20, { type: 'envelope_hold' }, now);
    const env = ledger.createEnvelope(
      state,
      { senderId: A.id, senderName: 'An', amount: 20, recipientCount: 2, windowMs: -1000 },
      now
    );
    env.messageId = 777;
    return env.id;
  });

  const { bot, errors } = makeBot();
  await drive(bot, errors, textUpdate(chat, B, 'tin nhắn bất kỳ'));
  const edit = edits().find((e) => e.message_id === 777);
  assert.ok(edit, 'bao hết giờ phải được sửa khi nhóm có hoạt động');
  assert.match(edit.text, /Đã hết giờ nhận/);
  assert.equal(edit.reply_markup.inline_keyboard[0][0].text, growth.ADD_TO_GROUP_BUTTON_TEXT);

  // Không có username (getMe lỗi) → sửa tin nhắn bình thường, bàn phím rỗng.
  getMeResult = new Error('network down');
  const noName = makeBot(jsonStorage, { botUsername: null });
  await tipCmd.renderEnvelopeMessage(noName.bot.telegram, jsonStorage, G_ENVELOPE, envelopeId, {
    identity: noName.bot.botIdentity,
  });
  getMeResult = { id: 7, is_bot: true, first_name: 'Lì Xì Bot', username: 'lixi_getme_bot' };
  const plain = edits().find((e) => e.message_id === 777);
  assert.ok(plain);
  assert.deepEqual(plain.reply_markup.inline_keyboard, []);
});

// ===========================================================================
// 4) my_chat_member: chào mừng đúng một lần, bản thiếu quyền admin
// ===========================================================================

test('bot được thêm KHÔNG có quyền admin: chào mừng kèm quyền cần thiết, đúng một lần; cấp admin sau → xác nhận ngắn', async () => {
  const { bot, errors } = makeBot();
  const chat = groupChat(G_ADDED_MEMBER);

  await drive(bot, errors, myChatMemberUpdate(chat, A, 'left', 'member'));
  assert.equal(sentMessages().length, 1, 'đúng một tin chào mừng');
  const welcome = lastText();
  assert.match(welcome, /Cảm ơn đã thêm Lì Xì Bot vào nhóm/);
  assert.match(welcome, /\/nap 1000/);
  assert.match(welcome, /reply[^\n]*\/nap 100/);
  assert.match(welcome, /\/lixi 100 chia 3/);
  assert.match(welcome, /không có giá trị tiền thật/);
  assert.match(welcome, /\/huongdan/);
  assert.match(welcome, /chưa có quyền admin/i);
  assert.match(welcome, /Quản trị viên/);
  assert.match(welcome, /thưởng hoạt động/);
  assert.equal(sentMessages()[0].chat_id, G_ADDED_MEMBER);

  // Telegram gửi lại update y hệt (hoặc bot bị gỡ rồi thêm lại) → không chào lần hai.
  await drive(bot, errors, myChatMemberUpdate(chat, A, 'left', 'member'));
  assert.equal(sentMessages().length, 1, 'không được chào mừng lần hai');
  let state = await jsonStorage.readGroup(G_ADDED_MEMBER);
  assert.ok(state.growth.onboardedAt);
  assert.equal(state.growth.onboardedAsAdmin, false);
  assert.equal(state.growth.botStatus, 'member');

  // Được cấp admin sau đó: xác nhận ngắn, không lặp lại cả bài chào mừng.
  await drive(bot, errors, myChatMemberUpdate(chat, A, 'member', 'administrator'));
  assert.equal(sentMessages().length, 2);
  assert.equal(lastText(), growth.ADMIN_GRANTED_TEXT);
  await drive(bot, errors, myChatMemberUpdate(chat, A, 'member', 'administrator'));
  assert.equal(sentMessages().length, 2, 'xác nhận admin cũng chỉ một lần');
  state = await jsonStorage.readGroup(G_ADDED_MEMBER);
  assert.equal(state.growth.botStatus, 'administrator');

  // Bị gỡ: không nhắn gì (không thể nhắn vào nhóm đã rời), chỉ ghi trạng thái.
  await drive(bot, errors, myChatMemberUpdate(chat, A, 'administrator', 'kicked'));
  assert.equal(sentMessages().length, 2);
  state = await jsonStorage.readGroup(G_ADDED_MEMBER);
  assert.equal(state.growth.botStatus, 'kicked');
  assert.ok(state.growth.leftAt);
  assert.equal(growth.botStillInGroup(state), false);

  // Chat riêng (người dùng bấm Start/chặn bot) không phải nhóm → bỏ qua.
  await drive(bot, errors, myChatMemberUpdate(PRIVATE_CHAT, A, 'kicked', 'member'));
  assert.equal(sentMessages().length, 2);
  assert.ok(!store.listGroupIds().includes(String(OWNER_ID)));
});

test('bot được thêm với quyền admin ngay: chào mừng KHÔNG có đoạn thiếu quyền', async () => {
  const { bot, errors } = makeBot();
  await drive(bot, errors, myChatMemberUpdate(groupChat(G_ADDED_ADMIN), A, 'left', 'administrator'));
  assert.equal(sentMessages().length, 1);
  const welcome = lastText();
  assert.match(welcome, /Cảm ơn đã thêm Lì Xì Bot vào nhóm/);
  assert.ok(!/chưa có quyền admin/i.test(welcome), `không được nhắc thiếu quyền: ${welcome}`);
  assert.ok(!welcome.includes(growth.RIGHTS_NEEDED_TEXT));
  const state = await jsonStorage.readGroup(G_ADDED_ADMIN);
  assert.equal(state.growth.onboardedAsAdmin, true);
});

test('phân loại my_chat_member (hàm thuần)', () => {
  const c = (o, n) => growth.classifyMyChatMember({ old_chat_member: { status: o }, new_chat_member: { status: n } });
  assert.deepEqual(c('left', 'member'), { event: 'added', isAdmin: false, status: 'member' });
  assert.deepEqual(c('kicked', 'administrator'), { event: 'added', isAdmin: true, status: 'administrator' });
  assert.deepEqual(c('member', 'administrator'), { event: 'promoted', isAdmin: true, status: 'administrator' });
  assert.deepEqual(c('administrator', 'member'), { event: 'demoted', isAdmin: false, status: 'member' });
  assert.deepEqual(c('member', 'left'), { event: 'left', isAdmin: false, status: 'left' });
  assert.deepEqual(c('member', 'member'), { event: 'none', isAdmin: false, status: 'member' });
  assert.equal(growth.classifyMyChatMember(null).event, 'none');
});

// ===========================================================================
// 5) Giới thiệu (referral): ghi vào nhóm mới, không bao giờ hiện ra
// ===========================================================================

test('/start <payload> trong nhóm vừa được thêm: ghi referredByChatId, không chào lần hai, không lộ id nhóm nguồn', async () => {
  const { bot, errors } = makeBot();
  const chat = groupChat(G_ADDED_ADMIN); // vừa được chào mừng ở test trước (trong 10 phút)
  const payload = growth.encodeReferralPayload(G_ENVELOPE);

  await drive(bot, errors, textUpdate(chat, A, `/start ${payload}`));
  assert.equal(sentMessages().length, 0, 'vừa chào mừng xong thì /start kèm payload không chào lại');
  let state = await jsonStorage.readGroup(G_ADDED_ADMIN);
  assert.equal(state.growth.referredByChatId, String(G_ENVELOPE));
  assert.ok(state.growth.referredAt);

  // Payload thứ hai không ghi đè nguồn đầu tiên; tự giới thiệu chính mình bị bỏ qua.
  await drive(bot, errors, textUpdate(chat, B, `/start ${growth.encodeReferralPayload(G_RANK)}`));
  await drive(bot, errors, textUpdate(chat, B, `/start ${growth.encodeReferralPayload(G_ADDED_ADMIN)}`));
  state = await jsonStorage.readGroup(G_ADDED_ADMIN);
  assert.equal(state.growth.referredByChatId, String(G_ENVELOPE));

  // Sau cửa sổ chào mừng, /start trong nhóm vẫn trả lời như trước — và KHÔNG có nút, KHÔNG lộ nguồn.
  await jsonStorage.withGroup(G_ADDED_ADMIN, (s) => {
    s.growth.onboardedAt = Date.now() - growth.RECENT_ONBOARDING_MS - 1000;
  });
  await drive(bot, errors, textUpdate(chat, A, `/start ${payload}`));
  await drive(bot, errors, textUpdate(chat, A, '/start'));
  await drive(bot, errors, textUpdate(chat, A, '/huongdan'));
  await drive(bot, errors, textUpdate(chat, A, '/bxh'));
  await drive(bot, errors, textUpdate(chat, A, '/sodu'));
  assert.equal(sentMessages().length, 5);
  assert.match(sentMessages()[0].text, /Chào mừng đến với Lì Xì Bot/);
  assert.equal(sentMessages()[0].reply_markup, undefined, '/start trong nhóm không gắn nút');
  const everything = allBotText();
  assert.ok(!everything.includes(String(G_ENVELOPE)), `lộ id nhóm nguồn: ${everything}`);
  assert.ok(!everything.includes(String(Math.abs(G_ENVELOPE))), `lộ id nhóm nguồn: ${everything}`);
  assert.ok(!everything.includes(payload), `lộ payload nguồn: ${everything}`);
  assert.ok(!everything.includes('referredBy'), everything);
  assert.equal(JSON.stringify(sentMessages()).includes(String(G_ENVELOPE)), false);
});

test('/start trong nhóm chưa từng được chào (bot thêm theo cách cũ): payload lạ bị bỏ qua, vẫn chào như trước', async () => {
  const { bot, errors } = makeBot();
  const chat = groupChat(G_RANK);
  await drive(bot, errors, textUpdate(chat, A, '/start khong_phai_payload'));
  assert.match(lastText(), /Chào mừng đến với Lì Xì Bot/);
  const state = await jsonStorage.readGroup(G_RANK);
  assert.equal(state.growth.referredByChatId, null);
  assert.equal(growth.recordReferral(state, null), false);
});

test('/start trong chat riêng: kèm nút thêm vào nhóm (startgroup=true, không nhóm nguồn)', async () => {
  const { bot, errors } = makeBot();
  await drive(bot, errors, textUpdate(PRIVATE_CHAT, { id: OWNER_ID, is_bot: false, first_name: 'X' }, '/start'));
  const sent = sentMessages();
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /Chào mừng đến với Lì Xì Bot/);
  assert.match(sent[0].text, /thêm bot vào nhóm/);
  const button = sent[0].reply_markup.inline_keyboard[0][0];
  assert.equal(button.text, growth.ADD_TO_GROUP_BUTTON_TEXT);
  assert.equal(button.url, 'https://t.me/lixi_test_bot?startgroup=true');
  assert.ok(!store.listGroupIds().includes(String(OWNER_ID)), 'chat riêng không tạo state nhóm');

  // Không biết username → vẫn chào, không có nút.
  getMeResult = new Error('network down');
  const noName = makeBot(jsonStorage, { botUsername: null });
  await drive(noName.bot, noName.errors, textUpdate(PRIVATE_CHAT, { id: OWNER_ID, is_bot: false, first_name: 'X' }, '/start'));
  getMeResult = { id: 7, is_bot: true, first_name: 'Lì Xì Bot', username: 'lixi_getme_bot' };
  assert.match(lastText(), /Chào mừng đến với Lì Xì Bot/);
  assert.equal(sentMessages()[0].reply_markup, undefined);
});

// ===========================================================================
// 6) /huongdan
// ===========================================================================

test('/huongdan: hiện trong nhóm và chat riêng, đủ hai phần + hai chốt chống lạm dụng, dưới 25 dòng', async () => {
  const { bot, errors } = makeBot();
  await drive(bot, errors, textUpdate(groupChat(G_RANK), B, '/huongdan'));
  const text = lastText();
  assert.equal(text, growth.GUIDE_TEXT);
  assert.ok(text.split('\n').length <= 25, `quá dài: ${text.split('\n').length} dòng`);
  assert.match(text, /<b>Thành viên<\/b>/);
  assert.match(text, /<b>Admin nhóm<\/b>/);
  for (const cmd of ['/lixi', '/sodu', '/lichsu', '/bxh', '/rut', '/nap', '/thuong', '/pot', '/caidat', '/duyet', '/tuchoi', '/rut_duyet', '/rut_huy']) {
    assert.ok(text.includes(cmd), `thiếu lệnh ${cmd}`);
  }
  assert.match(text, /\/caidat thamnien/);
  assert.match(text, /\/caidat nguongduyet/);
  assert.match(text, /chưa có giá trị tiền thật/);

  await drive(bot, errors, textUpdate(PRIVATE_CHAT, { id: 5, is_bot: false, first_name: 'Ai đó' }, '/huongdan'));
  assert.equal(lastText(), growth.GUIDE_TEXT);
  assert.equal(sentMessages()[1].parse_mode, 'HTML');
});

// ===========================================================================
// 7) /bxh
// ===========================================================================

test('rankReceivers (hàm thuần): tip đôi đếm một lần, tip đã duyệt đếm đủ, bỏ /nap và giao dịch cũ', () => {
  const now = Date.now();
  const state = store.defaultGroupState(1);
  ledger.adminCreditUser(state, 1, 1, 10000, 'x', now);
  ledger.transferPure(state, 1, 2, 100, { type: 'tip' }, now);
  ledger.transferPure(state, 1, 2, 100, { type: 'tip' }, now); // hai tip giống hệt cùng lúc
  ledger.creditPure(state, 3, 20, { type: 'tip' }, now);
  ledger.transferPure(state, 1, 3, 999, { type: 'tip' }, now - 8 * ledger.DAY_MS);
  ledger.creditPure(state, 4, 7, { type: 'envelope_claim' }, now);
  ledger.creditPure(state, 5, 50, { type: 'reward' }, now);
  const since = now - 7 * ledger.DAY_MS;
  assert.deepEqual(ledger.receivedTotals(state.transactions, { sinceMs: since }), { 2: 200, 3: 20, 4: 7 });
  assert.deepEqual(ledger.rankReceivers(state.transactions, { sinceMs: since, limit: 2 }), [
    { userId: '2', amount: 200 },
    { userId: '3', amount: 20 },
  ]);
  assert.equal(ledger.tipVolume(state.transactions, { sinceMs: since }), 220);
  assert.equal(ledger.tipVolume(state.transactions), 220 + 999);
});

test('/bxh (kho JSON): xếp theo điểm NHẬN 7 ngày qua, admin được /nap nhiều không lọt bảng, tên được escape', async () => {
  const now = Date.now();
  const expected = await seedRankingGroup(jsonStorage, G_RANK, now);
  const { bot, errors } = makeBot();
  await drive(bot, errors, textUpdate(groupChat(G_RANK), D, '/bxh'));
  const text = lastText();
  const lines = text.split('\n').slice(1);
  assert.equal(lines.length, 3, text);
  assert.match(lines[0], /^🥇 Bảo — <b>100 điểm<\/b>$/);
  assert.match(lines[1], /^🥈 &lt;b&gt;Cường&lt;\/b&gt; — <b>80 điểm<\/b>$/);
  assert.match(lines[2], /^🥉 Dung — <b>20 điểm<\/b>$/);
  assert.ok(!text.includes('An —'), `admin được /nap 10000 không được lọt bảng: ${text}`);
  assert.ok(!text.includes('<b>Cường</b>'), 'tên chứa HTML phải được escape');
  assert.ok(!text.includes(`#${B.id}`));
  assert.deepEqual(
    Object.fromEntries(
      ledger
        .rankReceivers(await jsonStorage.listTransactionsSince(G_RANK, growth.statsWindowStart(now)), {
          sinceMs: growth.statsWindowStart(now),
        })
        .map((r) => [r.userId, r.amount])
    ),
    expected
  );

  // Nhóm chưa ai nhận gì → gợi ý mở bao đầu tiên; chat riêng → từ chối.
  await drive(bot, errors, textUpdate(groupChat(BASE - 99), A, '/bxh'));
  assert.match(lastText(), /Chưa ai nhận lì xì/);
  await drive(bot, errors, textUpdate(PRIVATE_CHAT, { id: 5, is_bot: false, first_name: 'X' }, '/bxh'));
  assert.match(lastText(), /chỉ dùng được trong nhóm/);
});

// ===========================================================================
// 8) Kho Postgres: cùng con số với kho JSON (đường chạy thật trên Vercel)
// ===========================================================================

const CONNECTION_STRING = process.env.TEST_DATABASE_URL || '';
const PG_SCHEMA = `lixi_growth_${process.pid}_${Date.now().toString(36)}`;

test('kho Postgres: /bxh và /thongke cho đúng con số như kho JSON; trạng thái tăng trưởng sống qua khởi động nguội', async (t) => {
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
    const now = Date.now();
    const PG_STATS_1 = BASE - 21;
    const PG_STATS_2 = BASE - 22;
    const PG_RANK = BASE - 23;

    // /thongke trên hai nhóm.
    const expectedStats = await seedStatsGroups(storage, PG_STATS_1, PG_STATS_2, now);
    assert.deepEqual(await storage.growthStats(growth.statsWindowStart(now)), expectedStats);

    // /bxh — thêm nhóm thứ ba (nhóm này cũng làm tăng số nhóm/thành viên/điểm tip).
    const expectedRank = await seedRankingGroup(storage, PG_RANK, now);
    const txs = await storage.listTransactionsSince(PG_RANK, growth.statsWindowStart(now), ledger.RECEIVED_TX_TYPES);
    assert.ok(txs.every((tx) => ledger.RECEIVED_TX_TYPES.includes(tx.type) && tx.ts >= growth.statsWindowStart(now)));
    assert.deepEqual(
      Object.fromEntries(
        ledger.rankReceivers(txs, { sinceMs: growth.statsWindowStart(now) }).map((r) => [r.userId, r.amount])
      ),
      expectedRank
    );

    const { bot, errors } = makeBot(storage);
    await drive(bot, errors, textUpdate(groupChat(PG_RANK), D, '/bxh'));
    let text = lastText();
    assert.match(text, /🥇 Bảo — <b>100 điểm<\/b>/);
    assert.match(text, /🥈 &lt;b&gt;Cường&lt;\/b&gt; — <b>80 điểm<\/b>/);
    assert.match(text, /🥉 Dung — <b>20 điểm<\/b>/);
    assert.ok(!text.includes('An —'));

    await drive(bot, errors, textUpdate(PRIVATE_CHAT, { id: OWNER_ID, is_bot: false, first_name: 'Chủ bot' }, '/thongke'));
    text = lastText();
    assert.match(text, /Nhóm đang có bot: <b>2<\/b>/); // nhóm sôi nổi + nhóm xếp hạng
    assert.match(text, /Nhóm hoạt động 7 ngày qua[^<]*<b>2<\/b>/);
    assert.match(text, /Thành viên đã thấy[^<]*<b>4<\/b>/);
    assert.match(text, /Bao lì xì đã mở 7 ngày qua: <b>2<\/b>/);
    // 120 (hai nhóm thống kê) + 100 + 50 + 20 (nhóm xếp hạng; tip 500 quá cũ) = 290
    assert.match(text, /Điểm đã tip 7 ngày qua: <b>290<\/b>/);
    assert.match(text, /giới thiệu\): <b>1<\/b>/);
    await drive(bot, errors, textUpdate(groupChat(PG_RANK), A, '/thongke'));
    assert.equal(lastText(), 'Lệnh này chỉ dành cho chủ bot.');

    // my_chat_member + referral trên Postgres, rồi instance mới đọc lại đúng.
    const PG_NEW = BASE - 24;
    await drive(bot, errors, myChatMemberUpdate(groupChat(PG_NEW), A, 'left', 'member'));
    assert.match(lastText(), /chưa có quyền admin/i);
    await drive(bot, errors, myChatMemberUpdate(groupChat(PG_NEW), A, 'left', 'member'));
    await drive(bot, errors, textUpdate(groupChat(PG_NEW), A, `/start ${growth.encodeReferralPayload(PG_RANK)}`));
    assert.equal(sentMessages().filter((m) => m.chat_id === PG_NEW).length, 1, 'chào mừng đúng một lần');

    await closeAllPools();
    const fresh = new PostgresLedger(CONNECTION_STRING, { schema: PG_SCHEMA });
    const state = await fresh.readGroup(PG_NEW);
    assert.equal(state.growth.botStatus, 'member');
    assert.equal(state.growth.onboardedAsAdmin, false);
    assert.ok(state.growth.onboardedAt);
    assert.equal(state.growth.referredByChatId, String(PG_RANK));
    assert.ok(state.growth.referredAt);
    const stats = await fresh.growthStats(growth.statsWindowStart(now));
    assert.equal(stats.groupsReferred, 2);
    assert.equal(stats.groupsTotal, 3);
  } finally {
    try {
      await storage.dropSchema();
    } catch (err) {
      console.error('Không xoá được schema test:', err.message);
    }
    await closeAllPools();
  }
});
