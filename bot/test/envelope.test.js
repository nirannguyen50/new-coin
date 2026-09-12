'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const ledger = require('../src/ledger');
const store = require('../src/store');

/** RNG xác định (deterministic) để test không bị flaky. */
function seededRng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function next() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

test('splitEnvelope: tổng đúng bằng amount và mỗi phần >= 1 (n bình thường)', () => {
  const rng = seededRng(42);
  const shares = ledger.splitEnvelope(100, 5, rng);
  assert.equal(shares.length, 5);
  assert.equal(sum(shares), 100);
  for (const s of shares) assert.ok(s >= 1, `share ${s} phải >= 1`);
});

test('splitEnvelope: không luôn chia đều (randomized)', () => {
  const rng = seededRng(7);
  const shares = ledger.splitEnvelope(1000, 4, rng);
  assert.equal(sum(shares), 1000);
  const allEqual = shares.every((s) => s === shares[0]);
  assert.equal(allEqual, false, 'các phần không nên luôn bằng nhau');
});

test('splitEnvelope: edge case n=1 không crash, share = toàn bộ amount', () => {
  const rng = seededRng(1);
  const shares = ledger.splitEnvelope(77, 1, rng);
  assert.deepEqual(shares, [77]);
});

test('splitEnvelope: edge case amount === n -> mỗi người đúng 1 điểm', () => {
  const rng = seededRng(2);
  const shares = ledger.splitEnvelope(5, 5, rng);
  assert.equal(sum(shares), 5);
  for (const s of shares) assert.equal(s, 1);
});

test('splitEnvelope: n > amount phải throw, không được tạo share < 1', () => {
  assert.throws(() => ledger.splitEnvelope(3, 5, seededRng(3)), (err) => err.code === 'TOO_MANY_RECIPIENTS_FOR_AMOUNT');
});

test('splitEnvelope: amount hoặc n không hợp lệ phải throw', () => {
  assert.throws(() => ledger.splitEnvelope(0, 2), (err) => err.code === 'INVALID_AMOUNT');
  assert.throws(() => ledger.splitEnvelope(10, 0), (err) => err.code === 'INVALID_RECIPIENT_COUNT');
  assert.throws(() => ledger.splitEnvelope(10.5, 2), (err) => err.code === 'INVALID_AMOUNT');
});

test('splitEnvelope: chạy nhiều lần với Math.random thật không crash và luôn đúng tổng', () => {
  for (let trial = 0; trial < 50; trial++) {
    const n = 1 + Math.floor(Math.random() * 10);
    const amount = n + Math.floor(Math.random() * 200);
    const shares = ledger.splitEnvelope(amount, n);
    assert.equal(shares.length, n);
    assert.equal(sum(shares), amount);
    for (const s of shares) assert.ok(s >= 1);
  }
});

test('claimEnvelope: luồng claim bình thường tới khi completed', () => {
  const state = store.defaultGroupState('g1');
  const now = Date.now();
  const envelope = ledger.createEnvelope(
    state,
    { senderId: 'sender', amount: 10, recipientCount: 3, windowMs: 60000, rng: seededRng(9) },
    now
  );

  const r1 = ledger.claimEnvelope(envelope, 'a', now + 10);
  assert.equal(r1.ok, true);
  assert.equal(envelope.status, 'active');

  const r2 = ledger.claimEnvelope(envelope, 'a', now + 20);
  assert.equal(r2.ok, false);
  assert.equal(r2.reason, 'already_claimed');

  const rSelf = ledger.claimEnvelope(envelope, 'sender', now + 25);
  assert.equal(rSelf.ok, false);
  assert.equal(rSelf.reason, 'self');

  const r3 = ledger.claimEnvelope(envelope, 'b', now + 30);
  assert.equal(r3.ok, true);
  assert.equal(r3.completed, false);

  const r4 = ledger.claimEnvelope(envelope, 'c', now + 40);
  assert.equal(r4.ok, true);
  assert.equal(r4.completed, true);
  assert.equal(envelope.status, 'completed');

  // Envelope đã completed (status flip ngay khi đủ người) -> claim tiếp bị chặn ở
  // vòng kiểm tra "status !== active", báo 'closed' (lý do 'full' chỉ dùng nếu có
  // trường hợp status vẫn 'active' nhưng claimOrder đã đầy — hiện tại không xảy ra).
  const r5 = ledger.claimEnvelope(envelope, 'd', now + 50);
  assert.equal(r5.ok, false);
  assert.equal(r5.reason, 'closed');

  // Tổng các phần đã claim phải bằng đúng tổng envelope (không rò điểm).
  const claimedTotal = Object.values(envelope.claims).reduce((a, b) => a + b, 0);
  assert.equal(claimedTotal, 10);
});

test('claimEnvelope: hết giờ (expired) không cho claim nữa', () => {
  const state = store.defaultGroupState('g2');
  const now = Date.now();
  const envelope = ledger.createEnvelope(
    state,
    { senderId: 'sender', amount: 10, recipientCount: 2, windowMs: 1000, rng: seededRng(11) },
    now
  );
  const result = ledger.claimEnvelope(envelope, 'a', now + 5000); // sau expiresAt
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'expired');
});

test('settleExpiredEnvelope: hoàn điểm chưa nhận hết cho người gửi, idempotent', () => {
  const state = store.defaultGroupState('g3');
  const now = Date.now();
  const envelope = ledger.createEnvelope(
    state,
    { senderId: 'sender', amount: 10, recipientCount: 3, windowMs: 1000, rng: seededRng(13) },
    now
  );
  ledger.claimEnvelope(envelope, 'a', now + 10); // chỉ 1 người nhận
  const unclaimedShares = envelope.shares.length - envelope.claimOrder.length;
  assert.equal(unclaimedShares, 2);

  const before = ledger.getBalance(state, 'sender');
  const result1 = ledger.settleExpiredEnvelope(state, envelope, now + 2000);
  assert.ok(result1.refunded > 0);
  assert.equal(envelope.status, 'expired');
  const after1 = ledger.getBalance(state, 'sender');
  assert.equal(after1, before + result1.refunded);

  // Gọi lại lần 2 -> không hoàn thêm lần nữa (idempotent).
  const result2 = ledger.settleExpiredEnvelope(state, envelope, now + 3000);
  assert.equal(result2.refunded, 0);
  const after2 = ledger.getBalance(state, 'sender');
  assert.equal(after2, after1);
});

// ---------------------------------------------------------------------------
// Dọn lười (lazy settlement) — thay cho setTimeout, xem src/commands/tip.js
// ---------------------------------------------------------------------------

test('claimEnvelopeAndCredit: người nhận được CỘNG điểm thật, tổng nhóm không đổi', () => {
  const state = store.defaultGroupState('g4');
  const now = Date.now();
  ledger.creditPure(state, 'sender', 100, { type: 'admin_credit' }, now);
  ledger.debitPure(state, 'sender', 60, { type: 'envelope_hold' }, now);
  const envelope = ledger.createEnvelope(
    state,
    { senderId: 'sender', amount: 60, recipientCount: 3, windowMs: 60000, rng: seededRng(21) },
    now
  );

  const r1 = ledger.claimEnvelopeAndCredit(state, envelope.id, 'a', now + 10);
  assert.equal(r1.ok, true);
  assert.equal(ledger.getBalance(state, 'a'), r1.amount);

  // Nhận lần hai không được cộng thêm.
  const r2 = ledger.claimEnvelopeAndCredit(state, envelope.id, 'a', now + 20);
  assert.equal(r2.ok, false);
  assert.equal(ledger.getBalance(state, 'a'), r1.amount);

  // Mã bao lì xì không tồn tại.
  assert.deepEqual(ledger.claimEnvelopeAndCredit(state, '999', 'b', now + 30), {
    ok: false,
    reason: 'not_found',
  });

  // Hết giờ: phần chưa nhận hoàn về người gửi, tổng vẫn đúng 100 điểm.
  ledger.settleDueEnvelopes(state, now + 61000);
  assert.equal(ledger.getTotalCirculatingBalance(state), 100);
});

test('settleDueEnvelopes: chỉ đóng bao ĐÃ quá giờ, bao còn hạn giữ nguyên', () => {
  const state = store.defaultGroupState('g5');
  const now = Date.now();
  ledger.creditPure(state, 'sender', 100, { type: 'admin_credit' }, now);

  ledger.debitPure(state, 'sender', 20, { type: 'envelope_hold' }, now);
  const expired = ledger.createEnvelope(
    state,
    { senderId: 'sender', amount: 20, recipientCount: 2, windowMs: 1000, rng: seededRng(5) },
    now
  );
  ledger.debitPure(state, 'sender', 30, { type: 'envelope_hold' }, now);
  const stillOpen = ledger.createEnvelope(
    state,
    { senderId: 'sender', amount: 30, recipientCount: 2, windowMs: 600000, rng: seededRng(7) },
    now
  );

  const settled = ledger.settleDueEnvelopes(state, now + 5000);
  assert.equal(settled.length, 1);
  assert.equal(settled[0].id, expired.id);
  assert.equal(settled[0].refunded, 20);
  assert.equal(state.envelopes[expired.id].status, 'expired');
  assert.equal(state.envelopes[stillOpen.id].status, 'active');
  assert.equal(ledger.getBalance(state, 'sender'), 70);
});

test('settleDueEnvelopes: gọi lại lần hai không hoàn tiền thêm (idempotent)', () => {
  const state = store.defaultGroupState('g6');
  const now = Date.now();
  ledger.creditPure(state, 'sender', 50, { type: 'admin_credit' }, now);
  ledger.debitPure(state, 'sender', 50, { type: 'envelope_hold' }, now);
  ledger.createEnvelope(
    state,
    { senderId: 'sender', amount: 50, recipientCount: 2, windowMs: 1000, rng: seededRng(3) },
    now
  );

  assert.equal(ledger.settleDueEnvelopes(state, now + 2000).length, 1);
  assert.equal(ledger.getBalance(state, 'sender'), 50);
  assert.equal(ledger.settleDueEnvelopes(state, now + 3000).length, 0);
  assert.equal(ledger.getBalance(state, 'sender'), 50);
});

test('settleDueEnvelopes: bao đã đủ người nhận (completed) không bị hoàn tiền', () => {
  const state = store.defaultGroupState('g7');
  const now = Date.now();
  ledger.creditPure(state, 'sender', 10, { type: 'admin_credit' }, now);
  ledger.debitPure(state, 'sender', 10, { type: 'envelope_hold' }, now);
  const envelope = ledger.createEnvelope(
    state,
    { senderId: 'sender', amount: 10, recipientCount: 2, windowMs: 1000, rng: seededRng(17) },
    now
  );
  ledger.claimEnvelopeAndCredit(state, envelope.id, 'a', now + 10);
  ledger.claimEnvelopeAndCredit(state, envelope.id, 'b', now + 20);
  assert.equal(state.envelopes[envelope.id].status, 'completed');

  assert.equal(ledger.settleDueEnvelopes(state, now + 5000).length, 0);
  assert.equal(ledger.getBalance(state, 'sender'), 0);
  assert.equal(ledger.getTotalCirculatingBalance(state), 10);
});
