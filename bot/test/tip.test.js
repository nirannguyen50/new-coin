'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const ledger = require('../src/ledger');
const store = require('../src/store');
const { parseLixiArgs } = require('../src/commands/tip');
const { parseRutArgs } = require('../src/commands/withdraw');

test('creditPure / debitPure: toán số dư cơ bản', () => {
  const state = store.defaultGroupState('g');
  ledger.creditPure(state, 'a', 100);
  assert.equal(ledger.getBalance(state, 'a'), 100);
  ledger.debitPure(state, 'a', 40);
  assert.equal(ledger.getBalance(state, 'a'), 60);
});

test('debitPure: số dư không đủ bị từ chối (throw INSUFFICIENT_BALANCE)', () => {
  const state = store.defaultGroupState('g');
  ledger.creditPure(state, 'a', 10);
  assert.throws(() => ledger.debitPure(state, 'a', 11), (err) => err.code === 'INSUFFICIENT_BALANCE');
  // Số dư không bị thay đổi khi giao dịch bị từ chối.
  assert.equal(ledger.getBalance(state, 'a'), 10);
});

test('transferPure: tự tip cho chính mình bị từ chối (SELF_TRANSFER)', () => {
  const state = store.defaultGroupState('g');
  ledger.creditPure(state, 'a', 100);
  assert.throws(() => ledger.transferPure(state, 'a', 'a', 10), (err) => err.code === 'SELF_TRANSFER');
});

test('transferPure: chuyển điểm đúng giữa hai người', () => {
  const state = store.defaultGroupState('g');
  ledger.creditPure(state, 'a', 100);
  ledger.transferPure(state, 'a', 'b', 30, { type: 'tip' });
  assert.equal(ledger.getBalance(state, 'a'), 70);
  assert.equal(ledger.getBalance(state, 'b'), 30);
});

test('transferPure: số dư không đủ thì không tip được, không đổi số dư người nhận', () => {
  const state = store.defaultGroupState('g');
  ledger.creditPure(state, 'a', 5);
  assert.throws(() => ledger.transferPure(state, 'a', 'b', 10), (err) => err.code === 'INSUFFICIENT_BALANCE');
  assert.equal(ledger.getBalance(state, 'a'), 5);
  assert.equal(ledger.getBalance(state, 'b'), 0);
});

test('listRecentTransactionsPure: giới hạn số lượng và thứ tự mới nhất trước', () => {
  const state = store.defaultGroupState('g');
  ledger.creditPure(state, 'a', 1000);
  for (let i = 1; i <= 15; i++) {
    ledger.transferPure(state, 'a', 'b', 1, { type: 'tip' }, Date.now() + i);
  }
  const txs = ledger.listRecentTransactionsPure(state, 'a', 10);
  assert.equal(txs.length, 10);
  // Giao dịch đầu tiên trả về phải mới nhất (ts lớn nhất).
  assert.ok(txs[0].ts >= txs[txs.length - 1].ts);
});

test('parseLixiArgs: nhận diện cú pháp tip và bao lì xì', () => {
  assert.deepEqual(parseLixiArgs('/lixi @an 100'), { kind: 'tip', usernameMention: 'an', amount: 100 });
  assert.deepEqual(parseLixiArgs('/lixi 100'), { kind: 'tip', amount: 100 });
  assert.deepEqual(parseLixiArgs('/lixi 500 chia 5'), { kind: 'envelope', amount: 500, n: 5 });
  assert.equal(parseLixiArgs('/lixi'), null);
  assert.equal(parseLixiArgs('/lixi chia 5'), null);
});

test('parseRutArgs: nhận diện địa chỉ + số điểm', () => {
  assert.deepEqual(parseRutArgs('/rut 0x1234567890123456789012345678901234567890 100'), {
    address: '0x1234567890123456789012345678901234567890',
    amount: 100,
  });
  assert.equal(parseRutArgs('/rut khong-hop-le'), null);
});
