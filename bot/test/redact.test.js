'use strict';

/**
 * Test cho `src/redact.js` — xoá bí mật khỏi thông báo lỗi.
 *
 * Đây KHÔNG phải test "cho đẹp": thư viện Telegram ném lỗi kèm nguyên URL đã gọi, mà
 * URL đó có dạng `https://api.telegram.org/bot<TOKEN>/setWebhook`. Nếu không xoá, một
 * thông báo lỗi bình thường sẽ in TRỌN VẸN token bot ra log của nhà cung cấp hosting
 * và lên trang `/api/setup` — tức là trao quyền điều khiển bot cho bất kỳ ai đọc được.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { redactSecrets, safeErrorMessage, MASK } = require('../src/redact');

const TOKEN = '123456789:ABCdefGhIJKlmNoPQRstuVwXyZ1234567890';

test('redactSecrets: xoá token bot nằm trong URL của Telegram API', () => {
  const raw =
    'invalid json response body at ' +
    `https://api.telegram.org/bot${TOKEN}/setWebhook reason: Unexpected token`;
  const clean = redactSecrets(raw, {});
  assert.ok(!clean.includes(TOKEN), 'token vẫn còn trong thông báo lỗi');
  assert.ok(!clean.includes('ABCdefGhIJKlmNoPQRstuVwXyZ1234567890'));
  assert.ok(clean.includes(MASK));
  // Phần còn lại của thông báo vẫn đọc được để chẩn đoán.
  assert.ok(clean.includes('api.telegram.org'));
  assert.ok(clean.includes('setWebhook'));
});

test('redactSecrets: xoá token đứng một mình (không nằm trong URL)', () => {
  const clean = redactSecrets(`Token sai: ${TOKEN}`, {});
  assert.ok(!clean.includes(TOKEN));
});

test('redactSecrets: xoá mật khẩu trong chuỗi kết nối database', () => {
  const raw =
    'connection error: postgresql://nguoidung:MatKhauSieuBiMat@ep-abc.neon.tech/neondb';
  const clean = redactSecrets(raw, {});
  assert.ok(!clean.includes('MatKhauSieuBiMat'));
  // Host vẫn giữ lại để còn biết đang nói tới database nào.
  assert.ok(clean.includes('ep-abc.neon.tech'));
});

test('redactSecrets: xoá đúng giá trị của các biến môi trường nhạy cảm', () => {
  const env = {
    TELEGRAM_BOT_TOKEN: TOKEN,
    CRON_SECRET: 'chuoi-bi-mat-cron-rat-dai',
    SETUP_KEY: 'chuoi-bi-mat-setup-rat-dai',
    DATABASE_URL: 'postgresql://u:p@host/db',
  };
  const raw =
    `lỗi ${env.CRON_SECRET} và ${env.SETUP_KEY} và ${env.DATABASE_URL} và ${TOKEN}`;
  const clean = redactSecrets(raw, env);
  for (const value of Object.values(env)) {
    assert.ok(!clean.includes(value), `còn lộ: ${value}`);
  }
});

test('redactSecrets: không xoá nhầm văn bản bình thường', () => {
  const raw = 'Số dư không đủ: có 10, cần 20.';
  assert.equal(redactSecrets(raw, { CRON_SECRET: 'x' }), raw);
  // Giá trị quá ngắn trong biến môi trường bị bỏ qua để không xoá nhầm từ thông thường.
  assert.equal(redactSecrets('có 10, cần 20', { SETUP_KEY: '10' }), 'có 10, cần 20');
});

test('redactSecrets: chịu được đầu vào rỗng / không phải chuỗi', () => {
  assert.equal(redactSecrets(null, {}), '');
  assert.equal(redactSecrets(undefined, {}), '');
  assert.equal(redactSecrets(123, {}), '123');
});

test('safeErrorMessage: lấy message từ Error và đã xoá bí mật', () => {
  const err = new Error(`fetch failed at https://api.telegram.org/bot${TOKEN}/getMe`);
  const clean = safeErrorMessage(err, {});
  assert.ok(!clean.includes(TOKEN));
  assert.ok(clean.includes('getMe'));
  assert.equal(safeErrorMessage('chuỗi thường', {}), 'chuỗi thường');
});
