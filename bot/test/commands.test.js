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

// ---------------------------------------------------------------------------
// TÊN thay cho SỐ ID trong mọi tin nhắn người đọc.
//
// Lỗi thật gặp khi dùng: bot trả lời "✅ Đã cấp 2000 điểm trực tiếp cho #985735377" —
// không ai biết số đó là ai; `/lichsu` thì cả trang toàn số. Nhóm test này chốt lại
// hành vi đúng cho từng lệnh, và chốt cả việc ESCAPE tên (tên do người dùng tự đặt).
// ---------------------------------------------------------------------------

const USER_EVIL = 666; // tên chứa thẻ HTML, cố ý phá tin nhắn của bot

/** Như `textUpdate` nhưng đặt được `first_name` của người gửi. */
function namedTextUpdate(id, userId, text, firstName) {
  const base = textUpdate(id, userId, text);
  return {
    ...base,
    message: { ...base.message, from: { ...base.message.from, first_name: firstName } },
  };
}

test('/nap khi reply: câu xác nhận gọi TÊN người nhận, không phải số id', async () => {
  const { bot } = makeBot();
  await bot.handleUpdate(
    replyUpdate(50, USER_A, '/nap 2000', {
      id: USER_NO_NAME,
      is_bot: false,
      first_name: 'Chị Lan',
    })
  );
  const text = lastText();
  assert.match(text, /Đã cấp/);
  assert.match(text, /Chị Lan/, 'phải gọi tên người nhận');
  assert.ok(!text.includes(`#${USER_NO_NAME}`), `vẫn còn số id trong: ${text}`);

  // Tên cũng được ghi vào sổ để các lệnh sau dùng lại.
  const state = await storage.readGroup(CHAT_ID);
  assert.equal(state.members[String(USER_NO_NAME)].displayName, 'Chị Lan');
});

test('/nap: tên chứa HTML bị escape — thẻ thô KHÔNG lọt vào tin nhắn', async () => {
  const { bot } = makeBot();
  await bot.handleUpdate(
    replyUpdate(51, USER_A, '/nap 10', {
      id: USER_EVIL,
      is_bot: false,
      first_name: '<script>alert(1)</script> & "bạn"',
    })
  );
  const text = lastText();
  assert.ok(!text.includes('<script'), `thẻ thô lọt vào tin nhắn: ${text}`);
  assert.ok(!text.includes('</script>'), `thẻ thô lọt vào tin nhắn: ${text}`);
  assert.match(text, /&lt;script&gt;/, 'tên phải được escape thành &lt;script&gt;');
  assert.match(text, /&amp;/, 'dấu & trong tên cũng phải được escape');
});

test('/nap: tên dài bị cắt còn 64 ký tự trước khi lưu (chống tên phá bản ghi)', async () => {
  const { bot } = makeBot();
  await bot.handleUpdate(
    replyUpdate(52, USER_A, '/nap 10', {
      id: 777,
      is_bot: false,
      first_name: 'X'.repeat(300),
    })
  );
  const state = await storage.readGroup(CHAT_ID);
  assert.equal(state.members['777'].displayName.length, ledger.MAX_DISPLAY_NAME_LENGTH);
  assert.equal(lastText().includes('X'.repeat(65)), false, 'tin nhắn cũng chỉ chứa tên đã cắt');
});

test('/lichsu: hiện TÊN ở cả hai chiều (nhận từ ai, gửi cho ai), không hiện số id', async () => {
  const { bot } = makeBot();
  const now = Date.now();

  // Dựng sẵn hai chiều giao dịch giữa A và B, và tên của cả hai.
  await storage.withGroup(CHAT_ID, (state) => {
    ledger.rememberMember(state, { id: USER_A, first_name: 'Anh Admin' }, now);
    ledger.rememberMember(state, { id: USER_B, first_name: 'Bảo Béo' }, now);
    ledger.creditPure(state, USER_A, 100, { type: 'admin_credit' }, now);
    ledger.creditPure(state, USER_B, 100, { type: 'admin_credit' }, now);
    ledger.transferPure(state, USER_A, USER_B, 7, { type: 'tip' }, now); // A -> B
    ledger.transferPure(state, USER_B, USER_A, 9, { type: 'tip' }, now); // B -> A
  });

  await bot.handleUpdate(namedTextUpdate(53, USER_A, '/lichsu', 'Anh Admin'));
  const text = lastText();
  assert.match(text, /cho Bảo Béo/, 'chiều gửi phải gọi tên người nhận');
  assert.match(text, /từ Bảo Béo/, 'chiều nhận phải gọi tên người gửi');
  assert.ok(!text.includes(`#${USER_B}`), `vẫn còn số id trong: ${text}`);
  assert.ok(!text.includes(`#${USER_A}`), `vẫn còn số id trong: ${text}`);
});

test('/lichsu: người chưa có tên trên sổ hiện "người dùng #<id>" (không crash)', async () => {
  const { bot } = makeBot();
  const now = Date.now();
  const GHOST = 888; // thành viên cũ: có số dư nhưng chưa từng được ghi tên

  await storage.withGroup(CHAT_ID, (state) => {
    ledger.rememberMember(state, { id: USER_B, first_name: 'Bảo Béo' }, now);
    ledger.creditPure(state, GHOST, 50, { type: 'admin_credit' }, now);
    // Xoá tên cho giống bản ghi cũ trước khi bot biết lưu tên.
    delete state.members[String(GHOST)].displayName;
    delete state.members[String(GHOST)].username;
    ledger.transferPure(state, GHOST, USER_B, 5, { type: 'tip' }, now);
  });

  await bot.handleUpdate(namedTextUpdate(54, USER_B, '/lichsu', 'Bảo Béo'));
  const text = lastText();
  assert.match(text, new RegExp(`từ người dùng #${GHOST}`));
});

test('/pot: log admin gọi TÊN admin và TÊN người được cấp, không hiện số id', async () => {
  const { bot } = makeBot();
  const now = Date.now();

  await storage.withGroup(CHAT_ID, (state) => {
    ledger.rememberMember(state, { id: USER_A, first_name: 'Anh Admin' }, now);
    ledger.rememberMember(state, { id: USER_B, first_name: 'Bảo Béo' }, now);
    ledger.adminCreditUser(state, USER_A, USER_B, 25, 'Admin cấp điểm trực tiếp', now);
  });

  await bot.handleUpdate(namedTextUpdate(55, USER_A, '/pot', 'Anh Admin'));
  const text = lastText();
  assert.match(text, /admin Anh Admin cấp 25 điểm cho Bảo Béo/);
  assert.ok(!text.includes(`admin #${USER_A}`), `vẫn còn số id admin trong: ${text}`);
  assert.ok(!text.includes(`#${USER_B}`), `vẫn còn số id người nhận trong: ${text}`);
});

test('/pot: tên admin chứa HTML cũng bị escape trong log', async () => {
  const { bot } = makeBot();
  const now = Date.now();
  await storage.withGroup(CHAT_ID, (state) => {
    ledger.rememberMember(state, { id: USER_EVIL, first_name: '<i>xấu</i>' }, now);
    ledger.adminCreditPot(state, USER_EVIL, 5, 'Nạp pot thủ công', now);
  });
  await bot.handleUpdate(namedTextUpdate(56, USER_A, '/pot', 'Anh Admin'));
  const text = lastText();
  assert.match(text, /&lt;i&gt;xấu&lt;\/i&gt;/);
  assert.ok(!text.includes('<i>xấu</i>'), `thẻ thô lọt vào tin nhắn: ${text}`);
});

test('/duyet: câu xác nhận giao dịch lớn gọi tên hai bên thay cho số id', async () => {
  const { bot } = makeBot();
  const now = Date.now();

  const approvalId = await storage.withGroup(CHAT_ID, (state) => {
    ledger.rememberMember(state, { id: USER_A, first_name: 'Anh Admin' }, now);
    ledger.rememberMember(state, { id: USER_B, first_name: 'Bảo Béo' }, now);
    ledger.creditPure(state, USER_A, 5000, { type: 'admin_credit' }, now);
    return ledger.queueTipApproval(state, USER_A, USER_B, 2500, now).id;
  });

  await bot.handleUpdate(namedTextUpdate(57, USER_A, `/duyet ${approvalId}`, 'Anh Admin'));
  const text = lastText();
  assert.match(text, /từ <b>Anh Admin<\/b> cho <b>Bảo Béo<\/b>/);
  assert.ok(!text.includes(`#${USER_B}`), `vẫn còn số id trong: ${text}`);
});

test('tin nhắn thường: tên được ghi/làm mới mỗi lần thấy người đó nói', async () => {
  const { bot } = makeBot();
  await bot.handleUpdate(namedTextUpdate(58, USER_B, 'chào cả nhà', 'Bảo Tên Cũ'));
  let state = await storage.readGroup(CHAT_ID);
  assert.equal(state.members[String(USER_B)].displayName, 'Bảo Tên Cũ');

  // Đổi tên trên Telegram -> lần nói tiếp theo bot cập nhật luôn.
  await bot.handleUpdate(namedTextUpdate(59, USER_B, 'vẫn là tôi', 'Bảo Tên Mới'));
  state = await storage.readGroup(CHAT_ID);
  assert.equal(state.members[String(USER_B)].displayName, 'Bảo Tên Mới');
});
