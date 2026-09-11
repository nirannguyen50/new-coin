'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const ledger = require('../src/ledger');
const store = require('../src/store');

function buildStateWithActivity() {
  const state = store.defaultGroupState('g');
  const now = Date.parse('2026-05-01T12:00:00.000Z');
  const day = ledger.dateKey(now);

  ledger.ensureMember(state, 'active1', now);
  ledger.ensureMember(state, 'active2', now);
  ledger.ensureMember(state, 'lazy', now);

  state.members['active1'].messageCounts[day] = 10;
  state.members['active2'].messageCounts[day] = 7;
  state.members['lazy'].messageCounts[day] = 1; // dưới minMessages

  state.rewardRule = { pointsPerDay: 10, minMessages: 5, updatedAt: now, updatedBy: 'admin1' };
  state.pot = { balance: 1000 };

  return { state, now, day };
}

test('runDailyReward: cấp đúng cho thành viên đủ điều kiện, bỏ qua người chưa đủ tin nhắn', () => {
  const { state, now, day } = buildStateWithActivity();
  const result = ledger.runDailyReward(state, day, now);

  assert.equal(result.alreadyRan, false);
  assert.equal(result.grants['active1'], 10);
  assert.equal(result.grants['active2'], 10);
  assert.equal(result.grants['lazy'], undefined);

  assert.equal(ledger.getBalance(state, 'active1'), 10);
  assert.equal(ledger.getBalance(state, 'active2'), 10);
  assert.equal(ledger.getBalance(state, 'lazy'), 0);
  assert.equal(state.pot.balance, 980); // 1000 - 10 - 10
});

test('runDailyReward: idempotent — chạy lại lần 2 cùng ngày KHÔNG cấp thêm', () => {
  const { state, now, day } = buildStateWithActivity();

  const first = ledger.runDailyReward(state, day, now);
  assert.equal(first.alreadyRan, false);

  const balanceAfterFirst = ledger.getBalance(state, 'active1');
  const potAfterFirst = state.pot.balance;

  const second = ledger.runDailyReward(state, day, now + 60000);
  assert.equal(second.alreadyRan, true);
  assert.deepEqual(second.grants, first.grants);

  assert.equal(ledger.getBalance(state, 'active1'), balanceAfterFirst, 'không được cộng điểm lần 2');
  assert.equal(state.pot.balance, potAfterFirst, 'pot không bị trừ lần 2');
});

test('runDailyReward: hết pot thì một số thành viên đủ điều kiện không được thưởng', () => {
  const { state, now, day } = buildStateWithActivity();
  state.pot.balance = 10; // chỉ đủ cho 1 người (mỗi người 10 điểm)

  const result = ledger.runDailyReward(state, day, now);
  const grantedCount = Object.keys(result.grants).length;
  assert.equal(grantedCount, 1);
  assert.equal(state.pot.balance, 0);
});

test('runDailyReward: chưa có rule thì không cấp gì nhưng vẫn ghi nhận đã chạy (idempotent)', () => {
  const state = store.defaultGroupState('g');
  const now = Date.now();
  const day = ledger.dateKey(now);

  const first = ledger.runDailyReward(state, day, now);
  assert.deepEqual(first.grants, {});

  const second = ledger.runDailyReward(state, day, now + 1000);
  assert.equal(second.alreadyRan, true);
});

test('runDailyReward: mỗi ngày tính độc lập, không bị khoá chéo ngày', () => {
  const { state } = buildStateWithActivity();
  const day1 = '2026-05-01';
  const day2 = '2026-05-02';
  const now1 = Date.parse('2026-05-01T12:00:00.000Z');
  const now2 = Date.parse('2026-05-02T12:00:00.000Z');

  state.members['active1'].messageCounts[day2] = 20;

  ledger.runDailyReward(state, day1, now1);
  const balanceAfterDay1 = ledger.getBalance(state, 'active1');

  const resultDay2 = ledger.runDailyReward(state, day2, now2);
  assert.equal(resultDay2.alreadyRan, false);
  assert.equal(ledger.getBalance(state, 'active1'), balanceAfterDay1 + 10);
});
