'use strict';

/**
 * Chan loi da tung xay ra that: /lichsu hien ma noi bo "envelope_hold" thay vi
 * ten tieng Viet, vi loai giao dich moi khong duoc them vao TX_LABELS.
 */

const test = require('node:test');
const assert = require('node:assert');

const { TX_TYPES } = require('../src/ledger.js');
const { TX_LABELS, describeTx } = require('../src/commands/wallet.js');

test('moi loai giao dich deu co nhan tieng Viet', () => {
  const missing = TX_TYPES.filter((t) => !TX_LABELS || !TX_LABELS[t]);
  assert.deepStrictEqual(missing, [], `Thieu nhan cho: ${missing.join(', ')}`);
});

test('khong co nhan mo (nhan cho loai giao dich khong ton tai)', () => {
  const orphans = Object.keys(TX_LABELS || {}).filter((k) => !TX_TYPES.includes(k));
  assert.deepStrictEqual(orphans, [], `Nhan mo: ${orphans.join(', ')}`);
});

test('khong dong lich su nao lot ma noi bo dang snake_case', () => {
  for (const type of TX_TYPES) {
    const line = describeTx({ id: 1, ts: Date.now(), type, amount: 100, to: '7' }, '7', null);
    assert.ok(!line.includes(type), `Dong lich su cho "${type}" van lot ma noi bo: ${line}`);
  }
});
