'use strict';

/**
 * Test "đi hết đường" (end-to-end) cho lớp lệnh: đẩy một update Telegram giả vào bot
 * và kiểm tra bot trả lời đúng + sổ cái đổi đúng.
 *
 * KHÔNG chạm mạng: mọi lời gọi tới api.telegram.org được thay bằng một hàm giả ghi
 * lại lời gọi. Cũng không cần database: dùng kho JSON với một chatId riêng cho test.
 *
 * Vì sao cần test này: các lệnh bot vừa được chuyển sang BẤT ĐỒNG BỘ (await) để dùng
 * được cả kho Postgres lẫn kho JSON. Nếu quên một chữ `await` ở đâu đó thì bot vẫn
 * "chạy" nhưng trả lời sai hoặc mất dữ liệu — test này bắt được lỗi đó.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const { createBot } = require('../src/bot');
const { JsonGroupStorage } = require('../src/storage');
const store = require('../src/store');
const ledger = require('../src/ledger');

const TOKEN = '123456789:ABCdefGhIJKlmNoPQRstuVwXyZ1234567890';
const CHAT_ID = -1000000000 - (Date.now() % 100000);
const USER_A = 111;
const USER_B = 222;

const storage = new JsonGroupStorage();

// Telegraf tạo MỘT đối tượng Telegram mới cho mỗi update, nên phải chặn ở mức
// prototype thì mới bắt được hết lời gọi mạng. Khôi phục lại ở `test.after`.
const { Telegram } = require('telegraf');
const realCallApi = Telegram.prototype.callApi;
let calls = [];

Telegram.prototype.callApi = async function fakeCallApi(method, payload) {
  calls.push({ method, payload });
  if (method === 'sendMessage') return { message_id: calls.length, text: payload.text };
  if (method === 'getChatAdministrators') return [{ user: { id: USER_A } }];
  return true;
};

/** Bot mới + xoá sạch danh sách lời gọi API đã bị chặn. */
function makeBot() {
  calls = [];
  const bot = createBot(TOKEN, { storage, superAdminIds: [String(USER_A)] });
  bot.botInfo = { id: 7, is_bot: true, username: 'lixi_test_bot', first_name: 'Lì Xì Bot' };
  return { bot };
}

function textUpdate(id, userId, text) {
  const isCommand = text.startsWith('/');
  return {
    update_id: id,
    message: {
      message_id: id,
      date: Math.floor(Date.now() / 1000),
      chat: { id: CHAT_ID, type: 'supergroup', title: 'Nhóm test' },
      from: { id: userId, is_bot: false, first_name: `U${userId}` },
      text,
      ...(isCommand
        ? { entities: [{ type: 'bot_command', offset: 0, length: text.split(' ')[0].length }] }
        : {}),
    },
  };
}

/** Nội dung tin nhắn cuối cùng bot đã gửi. */
function lastText() {
  const sent = calls.filter((c) => c.method === 'sendMessage');
  return sent.length ? sent[sent.length - 1].payload.text : '';
}

test.after(() => {
  Telegram.prototype.callApi = realCallApi;
  try {
    fs.unlinkSync(store.groupFilePath(CHAT_ID));
  } catch (err) {
    /* không sao nếu file chưa từng được tạo */
  }
});

test('lệnh /sodu: đọc đúng số dư từ kho lưu trữ (lớp lệnh bất đồng bộ hoạt động)', async () => {
  const { bot } = makeBot();
  await storage.withGroup(CHAT_ID, (state) => {
    ledger.creditPure(state, USER_A, 250, { type: 'admin_credit' });
  });

  await bot.handleUpdate(textUpdate(1, USER_A, '/sodu'));
  assert.match(lastText(), /250 điểm LIXI/);
});

test('lệnh /nap của admin: cộng điểm thật vào pot và ghi log', async () => {
  const { bot } = makeBot();
  await bot.handleUpdate(textUpdate(2, USER_A, '/nap 1000'));
  assert.match(lastText(), /Đã nạp/);

  const state = await storage.readGroup(CHAT_ID);
  assert.equal(ledger.getPotBalance(state), 1000);
  assert.equal(state.adminCreditLog.length, 1);
});

test('lệnh /lixi tip: chặn khi tài khoản quá mới, cho phép khi đã đủ tuổi nhóm', async () => {
  const { bot } = makeBot();
  const longAgo = Date.now() - 10 * ledger.DAY_MS;

  // Lần đầu: cả hai vừa "được thấy" nên chưa đủ 3 ngày trong nhóm → bị chặn.
  await bot.handleUpdate({
    ...textUpdate(3, USER_A, '/lixi 50'),
    message: {
      ...textUpdate(3, USER_A, '/lixi 50').message,
      reply_to_message: { message_id: 1, from: { id: USER_B, is_bot: false, first_name: 'B' } },
    },
  });
  assert.match(lastText(), /ít nhất 3 ngày/);

  // Lùi mốc "thấy lần đầu" về 10 ngày trước rồi thử lại.
  await storage.withGroup(CHAT_ID, (state) => {
    ledger.ensureMember(state, USER_A).firstSeenAt = longAgo;
    ledger.ensureMember(state, USER_B).firstSeenAt = longAgo;
    // Cooldown 3 giây giữa hai lệnh — lùi mốc lệnh gần nhất để không bị chặn.
    state.members[String(USER_A)].lastCommandAt = 0;
  });

  await bot.handleUpdate({
    ...textUpdate(4, USER_A, '/lixi 50'),
    message: {
      ...textUpdate(4, USER_A, '/lixi 50').message,
      reply_to_message: { message_id: 1, from: { id: USER_B, is_bot: false, first_name: 'B' } },
    },
  });
  assert.match(lastText(), /Đã tip/);

  const state = await storage.readGroup(CHAT_ID);
  assert.equal(ledger.getBalance(state, USER_B), 50);
  assert.equal(ledger.getBalance(state, USER_A), 200);
});

test('đếm tin nhắn thường: tin nhắn không phải lệnh được ghi nhận cho thưởng hoạt động', async () => {
  const { bot } = makeBot();
  await bot.handleUpdate(textUpdate(5, USER_B, 'chào cả nhà'));
  const state = await storage.readGroup(CHAT_ID);
  const day = ledger.dateKey(Date.now());
  assert.equal(state.members[String(USER_B)].messageCounts[day], 1);
});

test('dọn lười: bao lì xì hết giờ được đóng ngay khi nhóm có hoạt động tiếp theo', async () => {
  const { bot } = makeBot();
  const now = Date.now();

  // Tạo sẵn một bao lì xì đã quá giờ (giả lập bot vừa khởi động lại / vừa "nguội").
  await storage.withGroup(CHAT_ID, (state) => {
    ledger.creditPure(state, USER_B, 30, { type: 'admin_credit' }, now);
    ledger.debitPure(state, USER_B, 30, { type: 'envelope_hold' }, now);
    ledger.createEnvelope(
      state,
      { senderId: USER_B, amount: 30, recipientCount: 2, windowMs: -1000 },
      now
    );
  });
  const before = await storage.readGroup(CHAT_ID);
  assert.equal(ledger.getBalance(before, USER_B), 50); // 50 từ lần tip ở test trước

  // Bất kỳ hoạt động nào trong nhóm cũng kích hoạt việc dọn.
  await bot.handleUpdate(textUpdate(6, USER_A, 'một tin nhắn bất kỳ'));

  const after = await storage.readGroup(CHAT_ID);
  assert.equal(ledger.getBalance(after, USER_B), 80, 'phải hoàn đủ 30 điểm cho người gửi');
  const envelope = Object.values(after.envelopes)[0];
  assert.equal(envelope.status, 'expired');
});
