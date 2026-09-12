'use strict';

/**
 * Test cho ba "cửa ngõ" serverless (`src/serverless.js`).
 *
 * Chỉ gọi hàm THUẦN: kiểm tra quyền và suy ra địa chỉ. Không mở cổng mạng, không gọi
 * api.telegram.org, không kết nối database.
 *
 * Phần quan trọng nhất ở đây là `isAuthorizedCronRequest`: nếu nó sai, người lạ có thể
 * vào thẳng địa chỉ `/api/cron` bằng trình duyệt và kích hoạt phát điểm.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  bearerToken,
  buildTelegramWebhookUrl,
  deriveDeploymentUrl,
  isAuthorizedCronRequest,
  isAuthorizedSetupRequest,
  secretsEqual,
  TELEGRAM_WEBHOOK_PATH,
} = require('../src/serverless');
const { deriveSecretToken } = require('../src/webhook');

const TOKEN = '123456789:ABCdefGhIJKlmNoPQRstuVwXyZ1234567890';
const TOKEN_SECRET = deriveSecretToken(TOKEN);
const CRON_SECRET = 'mot-chuoi-ngau-nhien-rat-dai-123456';

function bearer(value) {
  return { authorization: `Bearer ${value}` };
}

// ---------------------------------------------------------------------------
// So sánh bí mật
// ---------------------------------------------------------------------------

test('secretsEqual: đúng thì true, sai/rỗng thì false (và không ném lỗi khi khác độ dài)', () => {
  assert.equal(secretsEqual('abc', 'abc'), true);
  assert.equal(secretsEqual('abc', 'abd'), false);
  assert.equal(secretsEqual('abc', 'abcdef'), false);
  assert.equal(secretsEqual('', ''), false);
  assert.equal(secretsEqual(null, 'abc'), false);
  assert.equal(secretsEqual('abc', undefined), false);
});

test('bearerToken: đọc được header Authorization ở mọi kiểu viết hoa/thường', () => {
  assert.equal(bearerToken({ authorization: 'Bearer xyz' }), 'xyz');
  assert.equal(bearerToken({ Authorization: 'bearer xyz' }), 'xyz');
  assert.equal(bearerToken({ authorization: 'Bearer   xyz  ' }), 'xyz');
  assert.equal(bearerToken({ authorization: 'Basic xyz' }), '');
  assert.equal(bearerToken({}), '');
});

// ---------------------------------------------------------------------------
// Chặn người lạ gọi /api/cron
// ---------------------------------------------------------------------------

test('cron: CÓ CRON_SECRET và header đúng → cho chạy', () => {
  const result = isAuthorizedCronRequest(
    { headers: bearer(CRON_SECRET) },
    { CRON_SECRET, TELEGRAM_BOT_TOKEN: TOKEN }
  );
  assert.equal(result.ok, true);
  assert.equal(result.via, 'CRON_SECRET');
});

test('cron: CÓ CRON_SECRET nhưng KHÔNG có header → từ chối (người lạ mở bằng trình duyệt)', () => {
  const result = isAuthorizedCronRequest({ headers: {} }, { CRON_SECRET });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'thieu_bi_mat');
});

test('cron: CÓ CRON_SECRET nhưng header sai → từ chối', () => {
  const result = isAuthorizedCronRequest({ headers: bearer('doan-mo') }, { CRON_SECRET });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'sai_bi_mat');
});

test('cron: CHƯA đặt CRON_SECRET → từ chối luôn, kèm lý do để người vận hành biết sửa', () => {
  // Đây chính là lúc Vercel KHÔNG gắn header nào: không phân biệt được lịch chạy tự
  // động với người lạ, nên thà không phát thưởng còn hơn để ai cũng kích hoạt được.
  const result = isAuthorizedCronRequest({ headers: {} }, { TELEGRAM_BOT_TOKEN: TOKEN });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'chua_dat_CRON_SECRET');
});

test('cron: CHƯA đặt CRON_SECRET nhưng admin dùng secret suy từ token bot → cho chạy tay', () => {
  const viaHeader = isAuthorizedCronRequest(
    { headers: bearer(TOKEN_SECRET) },
    { TELEGRAM_BOT_TOKEN: TOKEN }
  );
  assert.equal(viaHeader.ok, true);
  assert.equal(viaHeader.via, 'token-secret');

  const viaQuery = isAuthorizedCronRequest(
    { headers: {}, query: { key: TOKEN_SECRET } },
    { TELEGRAM_BOT_TOKEN: TOKEN }
  );
  assert.equal(viaQuery.ok, true);
});

test('cron: KHÔNG dùng chính token bot làm mật khẩu (chỉ chấp nhận secret suy ra từ nó)', () => {
  const result = isAuthorizedCronRequest(
    { headers: bearer(TOKEN) },
    { TELEGRAM_BOT_TOKEN: TOKEN }
  );
  assert.equal(result.ok, false);
});

test('cron: không có cấu hình gì cả → từ chối (không "mở toang" khi thiếu biến)', () => {
  assert.equal(isAuthorizedCronRequest({ headers: {} }, {}).ok, false);
  assert.equal(isAuthorizedCronRequest({ headers: bearer('') }, {}).ok, false);
  assert.equal(isAuthorizedCronRequest({ headers: bearer('bat-ky') }, {}).ok, false);
});

// ---------------------------------------------------------------------------
// Chặn người lạ gọi /api/setup
// ---------------------------------------------------------------------------

test('setup: thiếu ?key= → từ chối', () => {
  const result = isAuthorizedSetupRequest({ query: {} }, { SETUP_KEY: 'abc', TELEGRAM_BOT_TOKEN: TOKEN });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'thieu_key');
});

test('setup: ?key= khớp SETUP_KEY → cho vào', () => {
  const result = isAuthorizedSetupRequest(
    { query: { key: 'ma-bi-mat-cua-toi' } },
    { SETUP_KEY: 'ma-bi-mat-cua-toi' }
  );
  assert.equal(result.ok, true);
  assert.equal(result.via, 'SETUP_KEY');
});

test('setup: chưa đặt SETUP_KEY thì dùng secret suy từ token bot', () => {
  const result = isAuthorizedSetupRequest(
    { query: { key: TOKEN_SECRET } },
    { TELEGRAM_BOT_TOKEN: TOKEN }
  );
  assert.equal(result.ok, true);
  assert.equal(result.via, 'token-secret');
});

test('setup: key sai → từ chối, kể cả khi đoán bằng chính token bot', () => {
  assert.equal(
    isAuthorizedSetupRequest({ query: { key: 'sai' } }, { SETUP_KEY: 'dung', TELEGRAM_BOT_TOKEN: TOKEN }).ok,
    false
  );
  assert.equal(
    isAuthorizedSetupRequest({ query: { key: TOKEN } }, { TELEGRAM_BOT_TOKEN: TOKEN }).ok,
    false
  );
});

test('setup: không cấu hình gì cả → không ai vào được', () => {
  assert.equal(isAuthorizedSetupRequest({ query: { key: 'bat-ky' } }, {}).ok, false);
});

// ---------------------------------------------------------------------------
// Suy ra địa chỉ công khai của bản deploy
// ---------------------------------------------------------------------------

test('deriveDeploymentUrl: ưu tiên tên miền production cố định hơn tên miền từng lần deploy', () => {
  const result = deriveDeploymentUrl({
    VERCEL_URL: 'lixi-bot-abc123xyz.vercel.app',
    VERCEL_PROJECT_PRODUCTION_URL: 'lixi-bot.vercel.app',
  });
  assert.equal(result.domain, 'https://lixi-bot.vercel.app');
  assert.equal(result.source, 'VERCEL_PROJECT_PRODUCTION_URL');
});

test('deriveDeploymentUrl: WEBHOOK_DOMAIN (tên miền riêng) được ưu tiên cao nhất', () => {
  const result = deriveDeploymentUrl({
    WEBHOOK_DOMAIN: 'bot.tenmiencuatoi.vn',
    VERCEL_PROJECT_PRODUCTION_URL: 'lixi-bot.vercel.app',
    VERCEL_URL: 'lixi-bot-abc.vercel.app',
  });
  assert.equal(result.domain, 'https://bot.tenmiencuatoi.vn');
  assert.equal(result.source, 'WEBHOOK_DOMAIN');
});

test('deriveDeploymentUrl: Vercel tiêm biến KHÔNG kèm https:// → phải tự thêm vào', () => {
  const result = deriveDeploymentUrl({ VERCEL_URL: 'lixi-bot-abc.vercel.app' });
  assert.equal(result.domain, 'https://lixi-bot-abc.vercel.app');
});

test('deriveDeploymentUrl: vẫn hỗ trợ Render (phương án dự phòng)', () => {
  const result = deriveDeploymentUrl({ RENDER_EXTERNAL_URL: 'https://lixi-bot.onrender.com' });
  assert.equal(result.domain, 'https://lixi-bot.onrender.com');
  assert.equal(result.source, 'RENDER_EXTERNAL_URL');
});

test('deriveDeploymentUrl: không có biến nào → chuỗi rỗng (api/setup sẽ báo lỗi rõ ràng)', () => {
  assert.deepEqual(deriveDeploymentUrl({}), { domain: '', source: '' });
});

test('buildTelegramWebhookUrl: ghép thành địa chỉ cố định /api/telegram', () => {
  const result = buildTelegramWebhookUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'lixi-bot.vercel.app' });
  assert.equal(result.url, 'https://lixi-bot.vercel.app/api/telegram');
  assert.equal(TELEGRAM_WEBHOOK_PATH, '/api/telegram');
  assert.equal(buildTelegramWebhookUrl({}).url, '');
});

test('buildTelegramWebhookUrl: địa chỉ webhook KHÔNG chứa token hay secret', () => {
  // Trên Vercel đường dẫn là công khai; phần bí mật nằm ở header, không nằm trong URL.
  const { url } = buildTelegramWebhookUrl({
    VERCEL_PROJECT_PRODUCTION_URL: 'lixi-bot.vercel.app',
    TELEGRAM_BOT_TOKEN: TOKEN,
  });
  assert.ok(!url.includes(TOKEN));
  assert.ok(!url.includes(TOKEN_SECRET));
});
