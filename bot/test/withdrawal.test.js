'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const ledger = require('../src/ledger');
const store = require('../src/store');

test('isValidBep20Address: đúng định dạng 0x + 40 hex thì hợp lệ', () => {
  assert.equal(ledger.isValidBep20Address('0x1234567890123456789012345678901234567890'), true);
  assert.equal(ledger.isValidBep20Address('0xABCDEFabcdef1234567890ABCDEFabcdef12345678'.slice(0, 42)), true);
});

test('isValidBep20Address: sai định dạng thì bị từ chối', () => {
  assert.equal(ledger.isValidBep20Address('0x123'), false); // quá ngắn
  assert.equal(ledger.isValidBep20Address('1234567890123456789012345678901234567890'), false); // thiếu 0x
  assert.equal(ledger.isValidBep20Address('0x123456789012345678901234567890123456789g'), false); // ký tự không phải hex
  assert.equal(ledger.isValidBep20Address(''), false);
  assert.equal(ledger.isValidBep20Address(null), false);
});

test('createWithdrawalRequest: từ chối địa chỉ sai định dạng, không trừ điểm', () => {
  const state = store.defaultGroupState('g');
  ledger.creditPure(state, 'a', 100);
  assert.throws(
    () => ledger.createWithdrawalRequest(state, 'a', 'khong-hop-le', 50),
    (err) => err.code === 'INVALID_ADDRESS'
  );
  assert.equal(ledger.getBalance(state, 'a'), 100);
});

test('createWithdrawalRequest: số dư không đủ thì bị từ chối', () => {
  const state = store.defaultGroupState('g');
  ledger.creditPure(state, 'a', 10);
  const address = '0x1234567890123456789012345678901234567890';
  assert.throws(
    () => ledger.createWithdrawalRequest(state, 'a', address, 50),
    (err) => err.code === 'INSUFFICIENT_BALANCE'
  );
  assert.equal(ledger.getBalance(state, 'a'), 10);
});

test('createWithdrawalRequest: thành công thì giữ điểm ngay và trạng thái pending', () => {
  const state = store.defaultGroupState('g');
  const now = Date.now();
  ledger.creditPure(state, 'a', 100, {}, now);
  const address = '0x1234567890123456789012345678901234567890';
  const record = ledger.createWithdrawalRequest(state, 'a', address, 40, now);

  assert.equal(record.status, 'pending');
  assert.equal(record.amount, 40);
  assert.equal(record.address, address);
  assert.equal(ledger.getBalance(state, 'a'), 60); // đã giữ 40 điểm
});

test('decideWithdrawal: approve giữ nguyên số dư đã trừ, không chuyển tiền thật', () => {
  const state = store.defaultGroupState('g');
  const now = Date.now();
  ledger.creditPure(state, 'a', 100, {}, now);
  const address = '0x1234567890123456789012345678901234567890';
  const record = ledger.createWithdrawalRequest(state, 'a', address, 40, now);

  const decided = ledger.decideWithdrawal(state, record.id, 'approve', 'admin1', now + 1000);
  assert.equal(decided.status, 'approved');
  assert.equal(ledger.getBalance(state, 'a'), 60); // không đổi thêm khi approve
});

test('decideWithdrawal: reject thì hoàn điểm lại cho người dùng', () => {
  const state = store.defaultGroupState('g');
  const now = Date.now();
  ledger.creditPure(state, 'a', 100, {}, now);
  const address = '0x1234567890123456789012345678901234567890';
  const record = ledger.createWithdrawalRequest(state, 'a', address, 40, now);

  const decided = ledger.decideWithdrawal(state, record.id, 'reject', 'admin1', now + 1000);
  assert.equal(decided.status, 'rejected');
  assert.equal(ledger.getBalance(state, 'a'), 100); // hoàn lại đủ
});

test('decideWithdrawal: không xử lý hai lần trên cùng một yêu cầu', () => {
  const state = store.defaultGroupState('g');
  const now = Date.now();
  ledger.creditPure(state, 'a', 100, {}, now);
  const address = '0x1234567890123456789012345678901234567890';
  const record = ledger.createWithdrawalRequest(state, 'a', address, 40, now);
  ledger.decideWithdrawal(state, record.id, 'approve', 'admin1', now);

  assert.throws(
    () => ledger.decideWithdrawal(state, record.id, 'reject', 'admin1', now + 1),
    (err) => err.code === 'WITHDRAWAL_ALREADY_DECIDED'
  );
});

test('decideWithdrawal: mã không tồn tại thì báo lỗi rõ ràng', () => {
  const state = store.defaultGroupState('g');
  assert.throws(
    () => ledger.decideWithdrawal(state, '999', 'approve', 'admin1'),
    (err) => err.code === 'WITHDRAWAL_NOT_FOUND'
  );
});
