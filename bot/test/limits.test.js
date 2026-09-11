'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const ledger = require('../src/ledger');
const store = require('../src/store');

const DAY_MS = 24 * 60 * 60 * 1000;

test('checkDailyTipLimit: cho phép trong hạn mức, từ chối khi vượt', () => {
  const state = store.defaultGroupState('g');
  const now = Date.now();
  assert.equal(state.config.dailyTipLimitPerUser, 500);

  const check1 = ledger.checkDailyTipLimit(state, 'a', 500, now);
  assert.equal(check1.ok, true);
  assert.equal(check1.remaining, 500);

  ledger.recordDailyTipUsage(state, 'a', 500, now);

  const check2 = ledger.checkDailyTipLimit(state, 'a', 1, now);
  assert.equal(check2.ok, false);
  assert.equal(check2.remaining, 0);
});

test('checkDailyTipLimit: hạn mức tính riêng theo từng ngày', () => {
  const state = store.defaultGroupState('g');
  const day1 = Date.parse('2026-01-01T00:00:00.000Z');
  const day2 = Date.parse('2026-01-02T00:00:00.000Z');
  ledger.recordDailyTipUsage(state, 'a', 500, day1);
  const checkDay1 = ledger.checkDailyTipLimit(state, 'a', 1, day1);
  assert.equal(checkDay1.ok, false);
  const checkDay2 = ledger.checkDailyTipLimit(state, 'a', 500, day2);
  assert.equal(checkDay2.ok, true);
});

test('checkCooldown: chặn lệnh thứ hai trong thời gian cooldown, cho phép sau đó', () => {
  const state = store.defaultGroupState('g');
  const now = Date.now();
  // Chưa dùng lệnh nào -> luôn ok.
  assert.equal(ledger.checkCooldown(state, 'a', now).ok, true);

  ledger.recordCommandTime(state, 'a', now);
  const cooldownMs = state.config.cooldownSeconds * 1000;

  const tooSoon = ledger.checkCooldown(state, 'a', now + cooldownMs - 1);
  assert.equal(tooSoon.ok, false);
  assert.ok(tooSoon.waitMs > 0);

  const afterCooldown = ledger.checkCooldown(state, 'a', now + cooldownMs + 1);
  assert.equal(afterCooldown.ok, true);
});

test('checkMinAccountAge: user mới trong nhóm chưa đủ điều kiện, đủ ngày thì được', () => {
  const state = store.defaultGroupState('g');
  const now = Date.now();
  ledger.ensureMember(state, 'newbie', now);

  const tooNew = ledger.checkMinAccountAge(state, 'newbie', now + DAY_MS); // mới 1 ngày
  assert.equal(tooNew.ok, false);

  const minDays = state.config.minAccountAgeDays;
  const oldEnough = ledger.checkMinAccountAge(state, 'newbie', now + minDays * DAY_MS + 1000);
  assert.equal(oldEnough.ok, true);
});

test('checkMinAccountAge: user chưa từng thấy trong nhóm coi như tuổi 0 (chưa đủ điều kiện)', () => {
  const state = store.defaultGroupState('g');
  const result = ledger.checkMinAccountAge(state, 'ghost', Date.now());
  assert.equal(result.ok, false);
  assert.equal(result.ageDays, 0);
});

test('needsAdminApproval: đúng ngưỡng cấu hình', () => {
  const state = store.defaultGroupState('g');
  const threshold = state.config.adminApprovalThreshold;
  assert.equal(ledger.needsAdminApproval(state, threshold), false);
  assert.equal(ledger.needsAdminApproval(state, threshold + 1), true);
});

test('admin-approval-required threshold: giao dịch lớn được đưa vào hàng đợi, không chuyển ngay', () => {
  const state = store.defaultGroupState('g');
  const now = Date.now();
  const threshold = state.config.adminApprovalThreshold;
  const bigAmount = threshold + 500;

  ledger.creditPure(state, 'sender', bigAmount, {}, now);
  assert.equal(ledger.needsAdminApproval(state, bigAmount), true);

  const approval = ledger.queueTipApproval(state, 'sender', 'receiver', bigAmount, now);
  assert.equal(approval.status, 'pending');
  // Chưa chuyển tiền: người gửi vẫn giữ nguyên số dư, người nhận chưa có gì.
  assert.equal(ledger.getBalance(state, 'sender'), bigAmount);
  assert.equal(ledger.getBalance(state, 'receiver'), 0);

  const approved = ledger.approveQueuedTransfer(state, approval.id, 'admin1', now + 1000);
  assert.equal(approved.status, 'approved');
  assert.equal(ledger.getBalance(state, 'sender'), 0);
  assert.equal(ledger.getBalance(state, 'receiver'), bigAmount);
});

test('admin-approval-required threshold: admin từ chối thì không có gì được thực hiện', () => {
  const state = store.defaultGroupState('g');
  const now = Date.now();
  const threshold = state.config.adminApprovalThreshold;
  const bigAmount = threshold + 1;

  ledger.creditPure(state, 'sender', bigAmount, {}, now);
  const approval = ledger.queueTipApproval(state, 'sender', 'receiver', bigAmount, now);
  const rejected = ledger.rejectQueuedTransfer(state, approval.id, 'admin1', now + 1000);

  assert.equal(rejected.status, 'rejected');
  assert.equal(ledger.getBalance(state, 'sender'), bigAmount);
  assert.equal(ledger.getBalance(state, 'receiver'), 0);
});

test('approveQueuedTransfer: không cho duyệt hai lần', () => {
  const state = store.defaultGroupState('g');
  const now = Date.now();
  ledger.creditPure(state, 'sender', 3000, {}, now);
  const approval = ledger.queueTipApproval(state, 'sender', 'receiver', 3000, now);
  ledger.approveQueuedTransfer(state, approval.id, 'admin1', now);
  assert.throws(
    () => ledger.approveQueuedTransfer(state, approval.id, 'admin1', now + 1),
    (err) => err.code === 'APPROVAL_ALREADY_DECIDED'
  );
});
