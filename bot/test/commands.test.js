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
// Thành viên KHÔNG có @username (chỉ cấp điểm được bằng cách reply tin nhắn của họ).
const USER_NO_NAME = 333;
// Thành viên có @username công khai (tra được qua getChat).
const USER_PUBLIC = 444;
// Thành viên được nhắc bằng text_mention (Telegram gửi kèm cả object user).
const USER_MENTIONED = 555;

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
  // Tra @username công khai -> trả về một "chat" kiểu user, như Telegram thật.
  if (method === 'getChat') {
    const username = String(payload.chat_id || '').replace(/^@/, '');
    return { id: USER_PUBLIC, type: 'private', first_name: 'Public', username };
  }
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

// ---------------------------------------------------------------------------
// /nap — ba dạng: nạp pot, @username, và REPLY vào tin nhắn của một người.
// Dạng reply là cách duy nhất cấp điểm cho thành viên không đặt @username.
// ---------------------------------------------------------------------------

/** Update dạng "reply vào tin nhắn của `repliedFrom` rồi gõ `text`". */
function replyUpdate(id, userId, text, repliedFrom) {
  const base = textUpdate(id, userId, text);
  return {
    ...base,
    message: {
      ...base.message,
      reply_to_message: {
        message_id: id - 1,
        date: base.message.date,
        chat: base.message.chat,
        from: repliedFrom,
        text: 'xin chào cả nhóm',
      },
    },
  };
}

test('/nap khi reply tin nhắn: cấp điểm cho người được reply (dù họ không có @username)', async () => {
  const { bot } = makeBot();
  const before = await storage.readGroup(CHAT_ID);
  const potBefore = ledger.getPotBalance(before);

  await bot.handleUpdate(
    replyUpdate(20, USER_A, '/nap 150', { id: USER_NO_NAME, is_bot: false, first_name: 'Không tên' })
  );
  assert.match(lastText(), /Đã cấp/);
  assert.match(lastText(), /150 điểm/);

  const after = await storage.readGroup(CHAT_ID);
  assert.equal(ledger.getBalance(after, USER_NO_NAME), 150);
  assert.equal(ledger.getPotBalance(after), potBefore, 'KHÔNG được nạp vào pot khi đang reply ai');
  const entry = after.adminCreditLog[after.adminCreditLog.length - 1];
  assert.equal(entry.target, String(USER_NO_NAME));
  assert.equal(entry.amount, 150);
});

test('/nap 1000 khi KHÔNG reply ai: vẫn nạp vào pot nhóm như trước', async () => {
  const { bot } = makeBot();
  const before = await storage.readGroup(CHAT_ID);
  const potBefore = ledger.getPotBalance(before);

  await bot.handleUpdate(textUpdate(21, USER_A, '/nap 1000'));
  assert.match(lastText(), /Đã nạp/);

  const after = await storage.readGroup(CHAT_ID);
  assert.equal(ledger.getPotBalance(after), potBefore + 1000);
  assert.equal(after.adminCreditLog[after.adminCreditLog.length - 1].target, 'pot');
});

test('/nap khi reply tin nhắn của bot: bị từ chối, không cấp cho ai, không nạp pot', async () => {
  const { bot } = makeBot();
  const before = await storage.readGroup(CHAT_ID);
  const potBefore = ledger.getPotBalance(before);
  const logBefore = before.adminCreditLog.length;

  await bot.handleUpdate(
    replyUpdate(22, USER_A, '/nap 500', { id: 7, is_bot: true, first_name: 'Lì Xì Bot' })
  );
  assert.match(lastText(), /Không cấp điểm cho bot/);

  const after = await storage.readGroup(CHAT_ID);
  assert.equal(ledger.getPotBalance(after), potBefore);
  assert.equal(after.adminCreditLog.length, logBefore, 'không được ghi log khi bị từ chối');
  assert.equal(ledger.getBalance(after, 7), 0);
});

test('/nap @user <số>: vẫn tra được @username công khai như trước', async () => {
  const { bot } = makeBot();
  await bot.handleUpdate(textUpdate(23, USER_A, '/nap @cong_khai 40'));
  assert.match(lastText(), /Đã cấp/);

  const after = await storage.readGroup(CHAT_ID);
  assert.equal(ledger.getBalance(after, USER_PUBLIC), 40);
});

test('/nap @user <số>: nhận người nhận từ text_mention (người không có @username nhưng được nhắc)', async () => {
  const { bot } = makeBot();
  const base = textUpdate(24, USER_A, '/nap @ai_do 60');
  await bot.handleUpdate({
    ...base,
    message: {
      ...base.message,
      entities: [
        ...base.message.entities,
        {
          type: 'text_mention',
          offset: 5,
          length: 7,
          user: { id: USER_MENTIONED, is_bot: false, first_name: 'Được nhắc' },
        },
      ],
    },
  });
  assert.match(lastText(), /Đã cấp/);

  const after = await storage.readGroup(CHAT_ID);
  assert.equal(ledger.getBalance(after, USER_MENTIONED), 60);
});

test('/nap gõ sai cú pháp: in đủ ba dạng dùng được', async () => {
  const { bot } = makeBot();
  await bot.handleUpdate(textUpdate(25, USER_A, '/nap abc'));
  const text = lastText();
  assert.match(text, /\/nap 1000/);
  assert.match(text, /\/nap @user 100/);
  assert.match(text, /reply/i);
});

// ---------------------------------------------------------------------------
// /caidat — xem và đổi cấu hình chống lạm dụng của nhóm.
// ---------------------------------------------------------------------------

test('/caidat không tham số: liệt kê mọi mục kèm giá trị, đơn vị và cú pháp đổi', async () => {
  const { bot } = makeBot();
  await bot.handleUpdate(textUpdate(30, USER_A, '/caidat'));
  const text = lastText();
  for (const item of ledger.describeConfig(await storage.readGroup(CHAT_ID))) {
    assert.ok(text.includes(item.alias), `thiếu mục ${item.alias}`);
    assert.ok(text.includes(item.key), `thiếu tên khoá đầy đủ ${item.key}`);
    assert.ok(text.includes(item.unit), `thiếu đơn vị của ${item.alias}`);
  }
  assert.match(text, /\/caidat/);
});

test('/caidat chỉ dành cho admin: thành viên thường bị từ chối', async () => {
  const { bot } = makeBot();
  await bot.handleUpdate(textUpdate(31, USER_B, '/caidat cooldown 0'));
  assert.match(lastText(), /chỉ dành cho admin/);
  const state = await storage.readGroup(CHAT_ID);
  assert.equal(state.config.cooldownSeconds, 3, 'người thường không được đổi cấu hình');
});

test('/caidat khoá lạ hoặc giá trị sai: từ chối và không đổi gì', async () => {
  const { bot } = makeBot();
  await bot.handleUpdate(textUpdate(32, USER_A, '/caidat khonghieu 5'));
  assert.match(lastText(), /Không có mục cấu hình/);

  await bot.handleUpdate(textUpdate(33, USER_A, '/caidat cooldown 999'));
  assert.match(lastText(), /từ 0 đến 300 giây/);

  await bot.handleUpdate(textUpdate(34, USER_A, '/caidat cooldown -5'));
  assert.match(lastText(), /từ 0 đến 300 giây/);

  await bot.handleUpdate(textUpdate(35, USER_A, '/caidat cooldown 1.5'));
  assert.match(lastText(), /SỐ NGUYÊN/);

  const state = await storage.readGroup(CHAT_ID);
  assert.equal(state.config.cooldownSeconds, 3);
});

test('/caidat thâmniên 0: đổi cấu hình nhóm, cảnh báo tắt bảo vệ, và /pot hiện log đổi', async () => {
  const { bot } = makeBot();

  // Gõ có dấu tiếng Việt vẫn nhận ra mục cần đổi.
  await bot.handleUpdate(textUpdate(36, USER_A, '/caidat thâmniên 0'));
  const text = lastText();
  assert.match(text, /minAccountAgeDays/);
  assert.match(text, /3/);
  assert.match(text, /0/);
  assert.match(text, /Cảnh báo/);
  assert.match(text, /thử nghiệm/);

  const state = await storage.readGroup(CHAT_ID);
  assert.equal(state.config.minAccountAgeDays, 0);
  const entry = state.adminCreditLog[state.adminCreditLog.length - 1];
  assert.equal(entry.target, 'config:minAccountAgeDays');
  assert.equal(entry.adminId, String(USER_A));

  // Log đổi cấu hình phải hiện ra ở /pot, đọc được là ai đổi gì.
  await bot.handleUpdate(textUpdate(37, USER_A, '/pot'));
  assert.match(lastText(), /đổi cấu hình minAccountAgeDays/);

  // Và thành viên vừa vào nhóm đã tip được ngay (chính là lý do có lệnh này).
  await storage.withGroup(CHAT_ID, (state2) => {
    ledger.ensureMember(state2, USER_NO_NAME, Date.now());
    state2.members[String(USER_NO_NAME)].lastCommandAt = 0;
    state2.config.cooldownSeconds = 0;
  });
  await bot.handleUpdate(
    replyUpdate(38, USER_NO_NAME, '/lixi 10', { id: USER_A, is_bot: false, first_name: 'A' })
  );
  assert.match(lastText(), /Đã tip/);
});
