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
  assert.equal(approval.held, true);
  // Chưa chuyển cho người nhận, nhưng điểm người gửi đã bị GIỮ (không tiêu được nơi khác).
  assert.equal(ledger.getBalance(state, 'sender'), 0);
  assert.equal(ledger.getBalance(state, 'receiver'), 0);
  assert.equal(ledger.getTotalCirculatingBalance(state) + approval.amount, bigAmount, 'bảo toàn điểm');

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
  assert.equal(ledger.getBalance(state, 'sender'), 0, 'đã giữ điểm lúc xếp hàng');
  const rejected = ledger.rejectQueuedTransfer(state, approval.id, 'admin1', now + 1000);

  assert.equal(rejected.status, 'rejected');
  assert.equal(ledger.getBalance(state, 'sender'), bigAmount, 'từ chối thì hoàn đủ');
  assert.equal(ledger.getBalance(state, 'receiver'), 0);
});

test('queueTipApproval: bản ghi CŨ (chưa giữ điểm) vẫn duyệt/từ chối đúng, không trừ hai lần', () => {
  const state = store.defaultGroupState('g');
  const now = Date.now();
  ledger.creditPure(state, 'sender', 3000, {}, now);
  // Bản ghi do bản bot trước tạo: không có `held`, người gửi chưa bị trừ.
  const legacy = ledger.queueApproval(
    state,
    { type: 'tip', fromUserId: 'sender', toUserId: 'receiver', amount: 2500 },
    now
  );
  assert.equal(ledger.getBalance(state, 'sender'), 3000);
  ledger.approveQueuedTransfer(state, legacy.id, 'admin1', now + 1);
  assert.equal(ledger.getBalance(state, 'sender'), 500, 'chỉ trừ đúng một lần lúc duyệt');
  assert.equal(ledger.getBalance(state, 'receiver'), 2500);

  const legacy2 = ledger.queueApproval(
    state,
    { type: 'tip', fromUserId: 'sender', toUserId: 'receiver', amount: 400 },
    now
  );
  ledger.rejectQueuedTransfer(state, legacy2.id, 'admin1', now + 2);
  assert.equal(ledger.getBalance(state, 'sender'), 500, 'không hoàn thứ chưa từng giữ');
});

test('queueTipApproval: không đủ số dư thì ném lỗi, không để lại bản ghi chờ duyệt nửa vời', () => {
  const state = store.defaultGroupState('g');
  const now = Date.now();
  ledger.creditPure(state, 'sender', 10, {}, now);
  assert.throws(
    () => ledger.queueTipApproval(state, 'sender', 'receiver', 3000, now),
    (err) => err.code === 'INSUFFICIENT_BALANCE'
  );
  assert.equal(ledger.getBalance(state, 'sender'), 10);
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

// ===========================================================================
// Cửa sổ ân hạn lúc cài bot — nhóm mới không bị đóng băng ba ngày
// ===========================================================================

test('nhóm vừa thêm bot: thành viên có sẵn tip được ngay, người tới sau vẫn bị chặn', () => {
  const now = Date.UTC(2026, 8, 14, 12, 0, 0);
  const catBot = now - 2 * 60 * 60 * 1000; // bot vào nhóm 2 giờ trước

  const state = store.defaultGroupState('g');
  state.growth = { onboardedAt: catBot };
  assert.equal(state.config.minAccountAgeDays, 3, 'mặc định vẫn là 3 ngày, không nới lỏng');

  // Thành viên CÓ SẴN: bot gặp lần đầu ngay sau khi vào nhóm. Trước khi có cửa sổ ân hạn,
  // cả nhóm — kể cả nhóm 5 năm tuổi — bị chặn tip suốt 3 ngày đầu.
  ledger.rememberMember(state, { id: 111, first_name: 'An' }, catBot + 60 * 1000);
  const coSan = ledger.checkMinAccountAge(state, 111, now);
  assert.equal(coSan.ok, true, 'không được đóng băng cả nhóm trong 3 ngày đầu');
  assert.equal(coSan.grandfathered, true);

  // Người xuất hiện SAU cửa sổ: vẫn phải đủ thâm niên — đó mới là thứ lớp chắn bảo vệ.
  ledger.rememberMember(state, { id: 222, first_name: 'Bình' }, catBot + 30 * 60 * 60 * 1000);
  const sau = ledger.checkMinAccountAge(state, 222, catBot + 31 * 60 * 60 * 1000);
  assert.equal(sau.ok, false, 'nick lập sau khi cài bot vẫn bị chặn');
  assert.equal(sau.grandfathered, false);

  // Nhóm cũ chưa có mốc onboardedAt: giữ nguyên hành vi cũ, không nới lỏng âm thầm.
  const cu = store.defaultGroupState('cu');
  ledger.rememberMember(cu, { id: 333, first_name: 'Cường' }, now - 60 * 1000);
  assert.equal(ledger.checkMinAccountAge(cu, 333, now).ok, false);

  // Và đủ thâm niên thật thì vẫn qua, không phụ thuộc cửa sổ ân hạn.
  const lau = store.defaultGroupState('lau');
  ledger.rememberMember(lau, { id: 444, first_name: 'Dung' }, now - 5 * DAY_MS);
  const du = ledger.checkMinAccountAge(lau, 444, now);
  assert.equal(du.ok, true);
  assert.equal(du.grandfathered, false, 'qua vì đủ tuổi thật, không phải vì ân hạn');
});
