'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const store = require('../src/store');

const TEST_CHAT_ID = `test-store-${Date.now()}`;

test.after(() => {
  try {
    fs.unlinkSync(store.groupFilePath(TEST_CHAT_ID));
  } catch (err) {
    // không sao nếu file chưa từng được tạo
  }
});

test('readGroupState: chưa có file thì trả về state mặc định', () => {
  const state = store.readGroupState(TEST_CHAT_ID);
  assert.equal(state.chatId, String(TEST_CHAT_ID));
  assert.deepEqual(state.members, {});
  assert.equal(state.config.dailyTipLimitPerUser, 500);
});

test('writeGroupState + readGroupState: ghi rồi đọc lại đúng dữ liệu (atomic write)', () => {
  const state = store.readGroupState(TEST_CHAT_ID);
  state.members['u1'] = { userId: 'u1', balance: 42, firstSeenAt: 1, lastCommandAt: 0, dailyTipUsed: {}, messageCounts: {} };
  store.writeGroupState(TEST_CHAT_ID, state);

  // Không còn file .tmp nào sót lại sau khi rename.
  const dir = fs.readdirSync(store.DATA_DIR);
  const leftoverTmp = dir.filter((f) => f.includes(String(TEST_CHAT_ID)) && f.endsWith('.tmp'));
  assert.equal(leftoverTmp.length, 0);

  const reloaded = store.readGroupState(TEST_CHAT_ID);
  assert.equal(reloaded.members['u1'].balance, 42);
});

test('withGroupState: đọc, sửa, ghi lại trong một bước', () => {
  const result = store.withGroupState(TEST_CHAT_ID, (state) => {
    state.members['u1'].balance += 8;
    return state.members['u1'].balance;
  });
  assert.equal(result, 50);
  const reloaded = store.readGroupState(TEST_CHAT_ID);
  assert.equal(reloaded.members['u1'].balance, 50);
});

test('listGroupIds: chatId đã ghi phải xuất hiện trong danh sách', () => {
  const ids = store.listGroupIds();
  assert.ok(ids.includes(String(TEST_CHAT_ID)));
});
