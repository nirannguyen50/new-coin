'use strict';

/**
 * cron.test.js — `api/cron.js`, lần chạy hằng ngày trên Vercel.
 *
 * Điều quan trọng nhất được canh ở đây: **việc phụ hỏng không được làm hỏng việc chính**.
 * Kênh Telegram bị xoá, token GitHub hết hạn, mất mạng giữa chừng — lần chạy vẫn phải
 * trả về 200 và phần phát thưởng vẫn phải chạy xong, vì đó là phần động vào ĐIỂM của
 * người dùng. Ngược lại, lỗi phát thưởng thì phải kêu lên (500) để người thật vào xem.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

// Phải đặt TRƯỚC khi require store.js (DATA_DIR đọc biến này lúc nạp module).
const TMP_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'lixi-cron-'));
process.env.LIXI_DATA_DIR = TMP_DATA_DIR;

// Cron phải chọn kho JSON: xoá mọi chuỗi kết nối Postgres có thể đang nằm trong môi trường.
const { POSTGRES_ENV_VARS } = require('../src/storage');
for (const name of POSTGRES_ENV_VARS) delete process.env[name];

const test = require('node:test');
const assert = require('node:assert/strict');

const { Telegram } = require('telegraf');
const ledger = require('../src/ledger');
const store = require('../src/store');
const { resetApp } = require('../src/serverless');
const { CHANNEL_POSTS } = require('../content/channel-posts');

const TOKEN = '123456789:ABCdefGhIJKlmNoPQRstuVwXyZ1234567890';
const CRON_SECRET = 'bi-mat-cua-cron-rat-dai-de-khong-bi-doan';
const CHAT_ID = -1004999000111;

process.env.TELEGRAM_BOT_TOKEN = TOKEN;
process.env.CRON_SECRET = CRON_SECRET;

const handler = require('../../api/cron');

// ---------------------------------------------------------------------------
// Telegram giả + fetch giả
// ---------------------------------------------------------------------------
const realCallApi = Telegram.prototype.callApi;
const realFetch = globalThis.fetch;

let telegramCalls = [];
let telegramFailure = null;
Telegram.prototype.callApi = async function fakeCallApi(method, payload) {
  telegramCalls.push({ method, payload });
  if (telegramFailure) throw telegramFailure;
  if (method === 'sendMessage') return { message_id: telegramCalls.length };
  return true;
};

let fetchCalls = [];
let fetchBehaviour = { status: 201, throws: null };
globalThis.fetch = async (url, init) => {
  fetchCalls.push({ url, init });
  if (fetchBehaviour.throws) throw fetchBehaviour.throws;
  return {
    status: fetchBehaviour.status,
    ok: fetchBehaviour.status >= 200 && fetchBehaviour.status < 300,
    async text() {
      return '{}';
    },
  };
};

test.after(() => {
  Telegram.prototype.callApi = realCallApi;
  globalThis.fetch = realFetch;
  fs.rmSync(TMP_DATA_DIR, { recursive: true, force: true });
});

/** `res` giả đủ dùng cho `sendJson`. */
function fakeRes() {
  const res = {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(k, v) {
      this.headers[k] = v;
    },
    end(body) {
      this.body = body;
    },
  };
  return res;
}

async function runCron() {
  const res = fakeRes();
  await handler(
    { headers: { authorization: `Bearer ${CRON_SECRET}` }, query: {}, url: '/api/cron' },
    res
  );
  return { status: res.statusCode, body: JSON.parse(res.body) };
}

function reset({ channel = true, github = true, keepChannelHistory = false } = {}) {
  // Mỗi test bắt đầu từ hàng đợi kênh trống, trừ khi test đó CỐ Ý muốn nối tiếp lịch sử
  // (chốt "mỗi ngày một bài" đọc đúng file này).
  if (!keepChannelHistory) {
    fs.rmSync(store.botStateFilePath(), { force: true });
  }
  telegramCalls = [];
  telegramFailure = null;
  fetchCalls = [];
  fetchBehaviour = { status: 201, throws: null };
  if (channel) {
    process.env.CHANNEL_CHAT_ID = '@lixibot_kenh';
  } else {
    delete process.env.CHANNEL_CHAT_ID;
  }
  delete process.env.CHANNEL_AUTOPOST;
  if (github) {
    process.env.GITHUB_TOKEN = 'github_pat_11ABCDEFG0aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789';
    process.env.GITHUB_REPORT_ISSUE = '12';
    process.env.GITHUB_REPO = 'nirannguyen50/new-coin';
  } else {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_REPORT_ISSUE;
  }
}

/** Một nhóm có pot và luật thưởng, để phần "việc chính" của cron có việc thật để làm. */
function seedGroup(nowMs) {
  store.withGroupState(CHAT_ID, (state) => {
    ledger.rememberMember(state, { id: 111, first_name: 'An' }, nowMs - 10 * ledger.DAY_MS);
    ledger.adminCreditPot(state, 111, 1000, 'nạp pot', nowMs);
    state.rewardRule = { pointsPerDay: 10, minMessages: 1, updatedAt: nowMs, updatedBy: '111' };
    ledger.recordMessage(state, 111, nowMs);
  });
}

// ===========================================================================

test('cron chạy đủ 4 việc: thưởng, bao lì xì, đăng bài kênh, báo cáo GitHub', async () => {
  resetApp();
  reset();
  seedGroup(Date.now());

  const { status, body } = await runCron();
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.ok(body.thuong, 'phải có phần thưởng hoạt động');
  assert.ok(body.baoLiXi, 'phải có phần quét bao lì xì');

  // Kênh: đúng một bài, đúng bài đầu tiên của hàng đợi.
  assert.equal(body.kenh.daDang, true);
  assert.equal(body.kenh.maBai, 'ghim');
  const sent = telegramCalls.filter((c) => c.method === 'sendMessage');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].payload.chat_id, '@lixibot_kenh');
  assert.equal(sent[0].payload.text, CHANNEL_POSTS[0].text);

  // Báo cáo: đúng một lời gọi tới GitHub, đúng issue, không lộ token trong nội dung.
  assert.equal(body.baoCao.daGui, true);
  assert.equal(fetchCalls.length, 1);
  assert.match(fetchCalls[0].url, /\/repos\/nirannguyen50\/new-coin\/issues\/12\/comments$/);
  const reportBody = JSON.parse(fetchCalls[0].init.body).body;
  assert.ok(!reportBody.includes(process.env.GITHUB_TOKEN));
  assert.match(reportBody, /Đã đăng bài `ghim`/);
});

test('chạy lần thứ hai trong ngày: không đăng lại bài nào, vẫn thành công', async () => {
  resetApp();
  reset();

  const first = await runCron();
  assert.equal(first.body.kenh.daDang, true);
  assert.equal(first.body.kenh.maBai, 'ghim');

  // Vercel thử lại, hoặc admin tự gọi /api/cron — lần chạy thứ hai không được đăng thêm.
  telegramCalls = [];
  const second = await runCron();
  assert.equal(second.status, 200);
  assert.equal(second.body.ok, true);
  assert.equal(second.body.kenh.daDang, false, 'mỗi ngày đúng một bài');
  assert.equal(
    telegramCalls.filter((c) => c.method === 'sendMessage').length,
    0,
    'không được gửi thêm tin nào lên kênh'
  );

  // Và bài đã đăng không bao giờ bị đăng lại: mã 'ghim' vẫn nằm trong dấu mốc.
  assert.deepEqual(Object.keys(store.readBotState().channelPosts), ['ghim']);
});

test('GitHub hỏng (401) hoặc mất mạng: cron VẪN thành công và vẫn phát thưởng', async () => {
  resetApp();
  reset();
  fetchBehaviour = { status: 401, throws: null };

  let out = await runCron();
  assert.equal(out.status, 200, 'lỗi báo cáo không được làm hỏng lần chạy');
  assert.equal(out.body.ok, true);
  assert.deepEqual(out.body.loi, [], 'lỗi báo cáo không được lọt vào danh sách lỗi');
  assert.equal(out.body.baoCao.daGui, false);
  assert.match(out.body.baoCao.lyDo, /401/);
  assert.ok(out.body.thuong, 'phần phát thưởng vẫn phải chạy');

  resetApp();
  reset();
  fetchBehaviour = { status: 0, throws: new Error('getaddrinfo ENOTFOUND api.github.com') };
  out = await runCron();
  assert.equal(out.status, 200);
  assert.equal(out.body.ok, true);
  assert.equal(out.body.baoCao.daGui, false);
  assert.match(out.body.baoCao.lyDo, /ENOTFOUND/);
});

test('thiếu cấu hình GitHub: bỏ qua báo cáo, không gọi mạng, cron vẫn thành công', async () => {
  resetApp();
  reset({ github: false });

  const { status, body } = await runCron();
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.baoCao.daGui, false);
  assert.match(body.baoCao.lyDo, /GITHUB_TOKEN/);
  assert.equal(fetchCalls.length, 0);
});

test('kênh hỏng (Telegram từ chối) hoặc chưa cấu hình: cron VẪN thành công', async () => {
  resetApp();
  reset();
  telegramFailure = new Error('Bad Request: chat not found');

  let out = await runCron();
  assert.equal(out.status, 200, 'kênh hỏng không được làm hỏng lần chạy');
  assert.equal(out.body.ok, true);
  assert.deepEqual(out.body.loi, []);
  assert.equal(out.body.kenh.daDang, false);
  assert.match(out.body.kenh.lyDo, /chat not found/);

  resetApp();
  reset({ channel: false });
  out = await runCron();
  assert.equal(out.status, 200);
  assert.equal(out.body.ok, true);
  assert.equal(out.body.kenh.daDang, false);
  assert.match(out.body.kenh.lyDo, /CHANNEL_CHAT_ID/);
  assert.equal(
    telegramCalls.filter((c) => c.method === 'sendMessage').length,
    0,
    'chưa cấu hình kênh thì không gửi đi đâu cả'
  );
});

test('công tắc CHANNEL_AUTOPOST=off dừng hẳn việc đăng bài, không đụng gì khác', async () => {
  resetApp();
  reset();
  process.env.CHANNEL_AUTOPOST = 'off';

  const { status, body } = await runCron();
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.kenh.daDang, false);
  assert.match(body.kenh.lyDo, /CHANNEL_AUTOPOST=off/);
  assert.equal(telegramCalls.filter((c) => c.method === 'sendMessage').length, 0);
  assert.equal(body.baoCao.daGui, true, 'tắt kênh không được tắt luôn báo cáo');
});

test('không có bí mật: cron từ chối request thiếu/ sai CRON_SECRET', async () => {
  resetApp();
  reset();
  const res = fakeRes();
  await handler({ headers: {}, query: {}, url: '/api/cron' }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(telegramCalls.length, 0);
  assert.equal(fetchCalls.length, 0);
});
