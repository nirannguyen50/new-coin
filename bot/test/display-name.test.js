'use strict';

/**
 * Test cho phần "tên hiển thị của thành viên" — vì sao cần:
 *
 * Bot từng in thẳng số id Telegram vào tin nhắn người khác đọc
 * ("✅ Đã cấp 2000 điểm trực tiếp cho #985735377"). Không ai biết số đó là ai, và
 * `/lichsu` thì cả trang toàn số. Từ nay mỗi thành viên có `displayName` được ghi lại
 * mỗi lần bot thấy họ, và `ledger.memberLabel` là NƠI DUY NHẤT quyết định hiện gì —
 * số id chỉ còn xuất hiện khi thật sự chưa có tên nào trên sổ.
 *
 * Tên là dữ liệu người dùng tự đặt (không tin cậy) nên có hai yêu cầu bắt buộc được
 * test ở đây: giới hạn độ dài, và lớp lệnh phải escape HTML (test lớp lệnh nằm ở
 * `commands.test.js`).
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const ledger = require('../src/ledger');
const store = require('../src/store');

test('memberLabel: trả về tên đã lưu khi biết, và bản dự phòng khi chưa biết', () => {
  const state = store.defaultGroupState('g');
  ledger.rememberMember(state, { id: 985735377, first_name: 'Lan' });

  assert.equal(ledger.memberLabel(state, 985735377), 'Lan');
  assert.equal(ledger.memberLabel(state, '985735377'), 'Lan', 'nhận cả số và chuỗi');
  // Người chưa từng thấy -> bản dự phòng ổn định, KHÔNG ném lỗi.
  assert.equal(ledger.memberLabel(state, 42), 'người dùng #42');
});

test('memberLabel: thành viên cũ (bản ghi chưa có tên) vẫn chạy, hiện bản dự phòng', () => {
  const state = store.defaultGroupState('g');
  // Đúng hình dạng bản ghi cũ từ trước khi bot lưu tên: không có displayName/username.
  state.members['777'] = {
    userId: '777',
    balance: 1000,
    firstSeenAt: 0,
    lastCommandAt: 0,
    dailyTipUsed: {},
    messageCounts: {},
  };
  assert.equal(ledger.memberLabel(state, 777), 'người dùng #777');
  assert.equal(ledger.getBalance(state, 777), 1000, 'số dư cũ không bị ảnh hưởng');
  // Gặp lại người đó -> tên được điền vào, không cần di trú dữ liệu gì.
  ledger.rememberMember(state, { id: 777, first_name: 'Cũ' });
  assert.equal(ledger.memberLabel(state, 777), 'Cũ');
  assert.equal(ledger.getBalance(state, 777), 1000);
});

test('memberLabel: state rỗng/null cũng không ném lỗi (dùng được khi chưa nạp state)', () => {
  assert.equal(ledger.memberLabel(null, 5), 'người dùng #5');
  assert.equal(ledger.memberLabel({}, 5), 'người dùng #5');
});

test('rememberMember: tên được LÀM MỚI khi người đó đổi tên trên Telegram', () => {
  const state = store.defaultGroupState('g');
  const now = Date.now();
  ledger.rememberMember(state, { id: 1, first_name: 'Tên Cũ' }, now);
  assert.equal(ledger.memberLabel(state, 1), 'Tên Cũ');

  ledger.rememberMember(state, { id: 1, first_name: 'Tên Mới' }, now + 1000);
  assert.equal(ledger.memberLabel(state, 1), 'Tên Mới');
  assert.equal(state.members['1'].firstSeenAt, now, 'mốc thấy lần đầu KHÔNG bị dời');
});

test('rememberMember: update thiếu tên không xoá tên đã biết', () => {
  const state = store.defaultGroupState('g');
  ledger.rememberMember(state, { id: 1, first_name: 'Lan' });
  ledger.rememberMember(state, { id: 1 });
  assert.equal(ledger.memberLabel(state, 1), 'Lan');
});

test('rememberMember: không có first_name thì dùng username; không có gì thì dự phòng', () => {
  const state = store.defaultGroupState('g');
  ledger.rememberMember(state, { id: 2, username: 'nguoi_dung_2' });
  assert.equal(ledger.memberLabel(state, 2), 'nguoi_dung_2');

  ledger.rememberMember(state, { id: 3, first_name: '   ' });
  assert.equal(ledger.memberLabel(state, 3), 'người dùng #3');
  assert.equal(state.members['3'].displayName, null);
});

test('normalizeDisplayName: cắt khoảng trắng, gộp khoảng trắng, chuỗi rỗng -> null', () => {
  assert.equal(ledger.normalizeDisplayName('  Lan  '), 'Lan');
  assert.equal(ledger.normalizeDisplayName('Lan\n\tHương'), 'Lan Hương');
  assert.equal(ledger.normalizeDisplayName(''), null);
  assert.equal(ledger.normalizeDisplayName('   '), null);
  assert.equal(ledger.normalizeDisplayName(null), null);
  assert.equal(ledger.normalizeDisplayName(undefined), null);
});

test('giới hạn độ dài: tên dài bị cắt còn 64 ký tự (không để tên xấu phình bản ghi)', () => {
  const state = store.defaultGroupState('g');
  const long = 'A'.repeat(500);
  ledger.rememberMember(state, { id: 9, first_name: long });

  assert.equal(ledger.MAX_DISPLAY_NAME_LENGTH, 64);
  assert.equal(state.members['9'].displayName.length, 64);
  assert.equal(ledger.memberLabel(state, 9).length, 64);
  assert.equal(ledger.normalizeDisplayName(long).length, 64);
  // Cắt đúng 64 ký tự đầu, không thêm bớt gì.
  assert.equal(state.members['9'].displayName, 'A'.repeat(64));
});

test('memberLabel: tên có ký tự HTML được giữ NGUYÊN VĂN (việc escape là của lớp lệnh)', () => {
  const state = store.defaultGroupState('g');
  ledger.rememberMember(state, { id: 4, first_name: '<b>Lan</b> & <i>Huệ</i>' });
  // Hàm thuần trả chuỗi thô; `commands.test.js` kiểm tra lớp lệnh escape trước khi gửi.
  assert.equal(ledger.memberLabel(state, 4), '<b>Lan</b> & <i>Huệ</i>');
});

test('kho JSON: displayName được lưu ra đĩa và đọc lại đúng', () => {
  const chatId = `-100999${process.pid}`;
  try {
    store.withGroupState(chatId, (state) => {
      ledger.rememberMember(state, { id: 55, first_name: 'Mai', username: 'mai_vn' });
      ledger.creditPure(state, 55, 10, { type: 'admin_credit' });
    });
    const reloaded = store.readGroupState(chatId);
    assert.equal(reloaded.members['55'].displayName, 'Mai');
    assert.equal(reloaded.members['55'].username, 'mai_vn');
    assert.equal(ledger.memberLabel(reloaded, 55), 'Mai');
  } finally {
    try {
      require('fs').unlinkSync(store.groupFilePath(chatId));
    } catch (err) {
      /* không sao nếu file chưa từng được tạo */
    }
  }
});
