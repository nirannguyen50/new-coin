'use strict';

/**
 * Test cho phần webhook — CHỈ gọi hàm thuần, không kết nối Telegram, không mở cổng mạng.
 * (Các đoạn code bắt buộc phải nói chuyện với api.telegram.org — setWebhook/getWebhookInfo —
 * không test được ở đây; phần suy ra đường dẫn/secret và chọn chế độ thì test đầy đủ.)
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const webhook = require('../src/webhook');
const { loadConfig } = require('../src/config');
const { createWebhookRequestHandler } = require('../src/bot');

const TOKEN = '123456789:ABCdefGhIJKlmNoPQRstuVwXyZ1234567890';
const OTHER_TOKEN = '987654321:ZYXwvuTSRqpONmlKJIhgFEdcba0987654321';

// ---------------------------------------------------------------------------
// Suy ra đường dẫn webhook
// ---------------------------------------------------------------------------

test('deriveWebhookPath: cùng token luôn cho cùng một đường dẫn (deterministic)', () => {
  assert.equal(webhook.deriveWebhookPath(TOKEN), webhook.deriveWebhookPath(TOKEN));
});

test('deriveWebhookPath: token khác nhau cho đường dẫn khác nhau', () => {
  assert.notEqual(webhook.deriveWebhookPath(TOKEN), webhook.deriveWebhookPath(OTHER_TOKEN));
});

test('deriveWebhookPath: đúng định dạng /tg/<32 ký tự hex>', () => {
  assert.match(webhook.deriveWebhookPath(TOKEN), /^\/tg\/[0-9a-f]{32}$/);
});

test('deriveWebhookPath: KHÔNG chứa token (không rò rỉ bí mật)', () => {
  const path = webhook.deriveWebhookPath(TOKEN);
  assert.ok(!path.includes(TOKEN));
  assert.ok(!path.includes('123456789')); // phần bot id
  assert.ok(!path.includes('ABCdefGhIJKlmNoPQRstuVwXyZ1234567890')); // phần bí mật
});

test('deriveWebhookPath: thiếu token thì báo lỗi', () => {
  assert.throws(() => webhook.deriveWebhookPath(''), /thiếu token/i);
});

// ---------------------------------------------------------------------------
// Suy ra secret token
// ---------------------------------------------------------------------------

test('deriveSecretToken: cùng token luôn cho cùng một secret (deterministic)', () => {
  assert.equal(webhook.deriveSecretToken(TOKEN), webhook.deriveSecretToken(TOKEN));
});

test('deriveSecretToken: token khác nhau cho secret khác nhau', () => {
  assert.notEqual(webhook.deriveSecretToken(TOKEN), webhook.deriveSecretToken(OTHER_TOKEN));
});

test('deriveSecretToken: KHÔNG chứa token và khác với đường dẫn', () => {
  const secret = webhook.deriveSecretToken(TOKEN);
  const path = webhook.deriveWebhookPath(TOKEN);
  assert.ok(!secret.includes(TOKEN));
  assert.ok(!secret.includes('123456789'));
  assert.ok(!secret.includes('ABCdefGhIJKlmNoPQRstuVwXyZ1234567890'));
  assert.ok(!path.includes(secret));
  assert.notEqual(secret, path.split('/').pop());
});

test('deriveSecretToken: hợp lệ với Telegram (1–256 ký tự A-Z a-z 0-9 _ -)', () => {
  const secret = webhook.deriveSecretToken(TOKEN);
  assert.equal(secret.length, 48);
  assert.match(secret, /^[A-Za-z0-9_-]{1,256}$/);
});

test('deriveSecretToken: thiếu token thì báo lỗi', () => {
  assert.throws(() => webhook.deriveSecretToken(''), /thiếu token/i);
});

// ---------------------------------------------------------------------------
// Chuẩn hoá tên miền + ghép URL
// ---------------------------------------------------------------------------

test('normalizeDomain: tự thêm https:// khi thiếu và bỏ dấu / ở cuối', () => {
  assert.equal(webhook.normalizeDomain('lixi-bot.onrender.com'), 'https://lixi-bot.onrender.com');
  assert.equal(webhook.normalizeDomain('https://lixi-bot.onrender.com/'), 'https://lixi-bot.onrender.com');
  assert.equal(webhook.normalizeDomain('  lixi-bot.onrender.com  '), 'https://lixi-bot.onrender.com');
});

test('normalizeDomain: ép http:// về https:// (Telegram chỉ nhận HTTPS)', () => {
  assert.equal(webhook.normalizeDomain('http://lixi-bot.onrender.com'), 'https://lixi-bot.onrender.com');
});

test('normalizeDomain: đầu vào rỗng hoặc không hợp lệ trả về chuỗi rỗng', () => {
  assert.equal(webhook.normalizeDomain(''), '');
  assert.equal(webhook.normalizeDomain('   '), '');
  assert.equal(webhook.normalizeDomain(undefined), '');
});

test('buildWebhookUrl: ghép tên miền với đường dẫn thành URL đầy đủ', () => {
  const path = webhook.deriveWebhookPath(TOKEN);
  assert.equal(
    webhook.buildWebhookUrl('lixi-bot.onrender.com', path),
    `https://lixi-bot.onrender.com${path}`
  );
  assert.equal(webhook.buildWebhookUrl('', path), '');
});

// ---------------------------------------------------------------------------
// parsePort
// ---------------------------------------------------------------------------

test('parsePort: đọc PORT hợp lệ, còn lại dùng mặc định 3000', () => {
  assert.equal(webhook.parsePort('10000'), 10000);
  assert.equal(webhook.parsePort(8080), 8080);
  assert.equal(webhook.parsePort(undefined), 3000);
  assert.equal(webhook.parsePort(''), 3000);
  assert.equal(webhook.parsePort('khong-phai-so'), 3000);
  assert.equal(webhook.parsePort('0'), 3000);
  assert.equal(webhook.parsePort('99999'), 3000);
});

// ---------------------------------------------------------------------------
// Chọn chế độ chạy
// ---------------------------------------------------------------------------

test('chooseMode: có WEBHOOK_DOMAIN → chế độ webhook', () => {
  const result = webhook.chooseMode({ WEBHOOK_DOMAIN: 'lixi-bot.example.com' });
  assert.equal(result.mode, 'webhook');
  assert.equal(result.domain, 'https://lixi-bot.example.com');
  assert.equal(result.source, 'WEBHOOK_DOMAIN');
});

test('chooseMode: có RENDER_EXTERNAL_URL → chế độ webhook', () => {
  const result = webhook.chooseMode({ RENDER_EXTERNAL_URL: 'https://lixi-bot.onrender.com' });
  assert.equal(result.mode, 'webhook');
  assert.equal(result.domain, 'https://lixi-bot.onrender.com');
  assert.equal(result.source, 'RENDER_EXTERNAL_URL');
});

test('chooseMode: WEBHOOK_DOMAIN được ưu tiên hơn RENDER_EXTERNAL_URL', () => {
  const result = webhook.chooseMode({
    WEBHOOK_DOMAIN: 'ten-mien-rieng.example.com',
    RENDER_EXTERNAL_URL: 'https://lixi-bot.onrender.com',
  });
  assert.equal(result.domain, 'https://ten-mien-rieng.example.com');
  assert.equal(result.source, 'WEBHOOK_DOMAIN');
});

test('chooseMode: không có biến nào → chế độ long polling', () => {
  const result = webhook.chooseMode({});
  assert.equal(result.mode, 'polling');
  assert.equal(result.domain, '');
  assert.equal(result.source, '');
  assert.equal(result.port, 3000);
});

test('chooseMode: biến rỗng/chỉ có khoảng trắng vẫn là long polling', () => {
  assert.equal(webhook.chooseMode({ WEBHOOK_DOMAIN: '' }).mode, 'polling');
  assert.equal(webhook.chooseMode({ WEBHOOK_DOMAIN: '   ' }).mode, 'polling');
  assert.equal(webhook.chooseMode({ RENDER_EXTERNAL_URL: '  ' }).mode, 'polling');
});

test('chooseMode: lấy cổng từ PORT', () => {
  const result = webhook.chooseMode({ WEBHOOK_DOMAIN: 'a.example.com', PORT: '10000' });
  assert.equal(result.port, 10000);
});

// ---------------------------------------------------------------------------
// Cảnh báo dữ liệu tạm thời
// ---------------------------------------------------------------------------

test('hasPersistentStore: chỉ true khi có DATABASE_URL hoặc REDIS_URL', () => {
  assert.equal(webhook.hasPersistentStore({}), false);
  assert.equal(webhook.hasPersistentStore({ DATABASE_URL: '  ' }), false);
  assert.equal(webhook.hasPersistentStore({ DATABASE_URL: 'postgres://x' }), true);
  assert.equal(webhook.hasPersistentStore({ REDIS_URL: 'redis://x' }), true);
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

test('healthBody: JSON tí hon, không lộ dữ liệu nào khác', () => {
  const body = webhook.healthBody('webhook');
  assert.equal(body, '{"ok":true,"mode":"webhook"}');
  assert.deepEqual(Object.keys(JSON.parse(body)), ['ok', 'mode']);
});

test('loadConfig: phản ánh đúng chế độ chạy từ biến môi trường', () => {
  const polling = loadConfig({ TELEGRAM_BOT_TOKEN: TOKEN });
  assert.equal(polling.mode, 'polling');
  assert.equal(polling.webhookDomain, '');
  assert.equal(polling.port, 3000);
  assert.equal(polling.persistentStoreConfigured, false);

  const hook = loadConfig({
    TELEGRAM_BOT_TOKEN: TOKEN,
    RENDER_EXTERNAL_URL: 'https://lixi-bot.onrender.com',
    PORT: '10000',
    DATABASE_URL: 'postgres://user@host/db',
  });
  assert.equal(hook.mode, 'webhook');
  assert.equal(hook.webhookDomain, 'https://lixi-bot.onrender.com');
  assert.equal(hook.webhookDomainSource, 'RENDER_EXTERNAL_URL');
  assert.equal(hook.port, 10000);
  assert.equal(hook.persistentStoreConfigured, true);
});

// ---------------------------------------------------------------------------
// Handler HTTP (không mở cổng thật — gọi thẳng handler với req/res giả)
// ---------------------------------------------------------------------------

function fakeRes() {
  return {
    statusCode: 0,
    headers: null,
    body: '',
    writableEnded: false,
    writeHead(code, headers) {
      this.statusCode = code;
      this.headers = headers;
      return this;
    },
    end(chunk) {
      if (chunk) this.body += chunk;
      this.writableEnded = true;
      return this;
    },
  };
}

/** Bot giả: chỉ cần có webhookCallback, không đụng tới mạng. */
function fakeBot(calls) {
  return {
    webhookCallback(path, opts) {
      calls.push({ path, opts });
      return async (req, res, next) => {
        // Giả lập Telegraf: chỉ nhận POST đúng đường dẫn, còn lại gọi next().
        if (req.method === 'POST' && req.url === path) {
          res.writeHead(200).end('OK-update');
          return;
        }
        return next();
      };
    },
  };
}

test('handler HTTP: GET / và GET /healthz trả 200 + JSON tí hon', async () => {
  const calls = [];
  const handler = createWebhookRequestHandler(fakeBot(calls), {
    webhookPath: webhook.deriveWebhookPath(TOKEN),
    secretToken: webhook.deriveSecretToken(TOKEN),
  });

  for (const url of ['/', '/healthz', '/healthz?from=uptime-robot']) {
    const res = fakeRes();
    await handler({ method: 'GET', url, headers: {} }, res);
    assert.equal(res.statusCode, 200, `url=${url}`);
    assert.equal(res.body, '{"ok":true,"mode":"webhook"}');
  }
});

test('handler HTTP: health check không lộ token, secret hay đường dẫn webhook', async () => {
  const path = webhook.deriveWebhookPath(TOKEN);
  const secret = webhook.deriveSecretToken(TOKEN);
  const handler = createWebhookRequestHandler(fakeBot([]), {
    webhookPath: path,
    secretToken: secret,
  });
  const res = fakeRes();
  await handler({ method: 'GET', url: '/', headers: {} }, res);
  assert.ok(!res.body.includes(TOKEN));
  assert.ok(!res.body.includes(secret));
  assert.ok(!res.body.includes(path));
});

test('handler HTTP: đường dẫn lạ trả 404, đường dẫn webhook đúng thì Telegraf xử lý', async () => {
  const path = webhook.deriveWebhookPath(TOKEN);
  const calls = [];
  const handler = createWebhookRequestHandler(fakeBot(calls), {
    webhookPath: path,
    secretToken: webhook.deriveSecretToken(TOKEN),
  });

  const notFound = fakeRes();
  await handler({ method: 'POST', url: '/khong-ton-tai', headers: {} }, notFound);
  assert.equal(notFound.statusCode, 404);

  const ok = fakeRes();
  await handler({ method: 'POST', url: path, headers: {} }, ok);
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.body, 'OK-update');

  // secretToken phải được truyền xuống Telegraf để nó kiểm tra header.
  assert.equal(calls[0].opts.secretToken, webhook.deriveSecretToken(TOKEN));
});
