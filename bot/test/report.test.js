'use strict';

/**
 * report.test.js — BÁO CÁO HẰNG NGÀY gửi lên GitHub (`src/report.js`).
 *
 * Ba điều được canh gắt ở đây:
 *   1. TOKEN KHÔNG BAO GIỜ LỌT RA — không vào nội dung báo cáo, không vào lý do lỗi.
 *   2. Con số trong báo cáo đúng bằng con số của `/thongke` (cùng một nguồn).
 *   3. GitHub hỏng kiểu gì cũng KHÔNG được ném lỗi ra ngoài: 401, 404, 500, mất mạng,
 *      thiếu biến môi trường — tất cả đều phải trở thành `{ daGui: false, lyDo }`.
 *
 * `fetch` luôn được tiêm giả (`fetchImpl`), không test nào gọi ra Internet.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const report = require('../src/report');
const growth = require('../src/growth');
const { redactSecrets } = require('../src/redact');

/** Token giả nhưng ĐÚNG HÌNH DẠNG token fine-grained thật của GitHub. */
const FAKE_TOKEN = 'github_pat_11ABCDEFG0aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789';

const ENV = {
  GITHUB_TOKEN: FAKE_TOKEN,
  GITHUB_REPORT_ISSUE: '12',
  GITHUB_REPO: 'nirannguyen50/new-coin',
};

const STATS = {
  groupsTotal: 7,
  groupsActive: 4,
  membersSeen: 123,
  envelopesOpened: 19,
  pointsTipped: 4560,
  groupsReferred: 3,
};

/** `fetch` giả: ghi lại lời gọi, trả về status đặt trước (hoặc ném lỗi mạng). */
function fakeFetch({ status = 201, body = '{}', throws = null } = {}) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    if (throws) throw throws;
    return {
      status,
      ok: status >= 200 && status < 300,
      async text() {
        return body;
      },
    };
  };
  fn.calls = calls;
  return fn;
}

/** Kho giả đủ dùng cho `runDailyReport`. */
function fakeStorage({ stats = STATS, previous = null, postedIds = [] } = {}) {
  const written = [];
  return {
    written,
    async growthStats() {
      return stats;
    },
    async readReportState() {
      return previous;
    },
    async writeReportState(value) {
      written.push(value);
      return value;
    },
    async listPostedChannelPostIds() {
      return postedIds;
    },
  };
}

// ===========================================================================
// 1) Nội dung báo cáo — hàm thuần
// ===========================================================================

test('báo cáo chứa đúng những con số của /thongke, bằng tiếng Việt, dạng Markdown', () => {
  const body = report.buildReportMarkdown({
    stats: STATS,
    previous: null,
    channel: { daDang: true, maBai: 'ngay-03', tieuDe: 'Ngày 3 — Ý tưởng dùng', conLai: 24 },
    nowMs: Date.UTC(2026, 8, 13, 1, 30, 0),
    postedCount: 4,
  });

  assert.match(body, /^## Báo cáo tự động/m);
  // 01:30 UTC = 08:30 giờ Việt Nam.
  assert.match(body, /13\/09\/2026 08:30 \(giờ Việt Nam\)/);

  assert.match(body, /\| Nhóm đang có bot \| 7 \|/);
  assert.match(body, /\| Nhóm hoạt động 7 ngày qua \| 4 \|/);
  assert.match(body, /\| Thành viên đã thấy \| 123 \|/);
  assert.match(body, /\| Bao lì xì đã mở 7 ngày qua \| 19 \|/);
  assert.match(body, /\| Điểm đã tip 7 ngày qua \| 4560 \|/);
  assert.match(body, /\| Nhóm đến từ nút giới thiệu \| 3 \|/);

  assert.match(body, /Đã đăng bài `ngay-03`/);
  assert.match(body, /Còn \*\*24 bài\*\*/);
  assert.match(body, /Tổng số bài đã đăng lên kênh từ trước tới nay: 4/);
  assert.match(body, /báo cáo đầu tiên/, 'chưa có mốc trước thì phải nói thẳng');

  // Cửa sổ thống kê phải khớp với /thongke, không được viết cứng số khác.
  assert.ok(body.includes(`${growth.STATS_WINDOW_DAYS} ngày qua`));
});

test('báo cáo cho biết có bao nhiêu nhóm MỚI kể từ báo cáo trước', () => {
  const nowMs = Date.UTC(2026, 8, 14, 1, 0, 0);
  const grew = report.buildReportMarkdown({
    stats: STATS,
    previous: { ...STATS, groupsTotal: 4, groupsActive: 2 },
    nowMs,
  });
  assert.match(grew, /\*\*3 nhóm mới\*\* kể từ báo cáo trước/);
  assert.match(grew, /\| Nhóm đang có bot \| 7 \| \+3 \|/);
  assert.match(grew, /\| Nhóm hoạt động 7 ngày qua \| 4 \| \+2 \|/);

  const same = report.buildReportMarkdown({ stats: STATS, previous: STATS, nowMs });
  assert.match(same, /Không có nhóm mới/);
  assert.match(same, /\| Nhóm đang có bot \| 7 \| 0 \|/);

  const shrank = report.buildReportMarkdown({
    stats: STATS,
    previous: { ...STATS, groupsTotal: 9 },
    nowMs,
  });
  assert.match(shrank, /Giảm 2 nhóm/, 'mất nhóm cũng phải nói, không giấu');
});

test('báo cáo nói rõ vì sao kênh không đăng được bài nào', () => {
  const body = report.buildReportMarkdown({
    stats: STATS,
    channel: { daDang: false, maBai: null, tieuDe: null, lyDo: 'CHANNEL_AUTOPOST=off', conLai: null },
    nowMs: Date.now(),
  });
  assert.match(body, /Không đăng bài nào\. Lý do: CHANNEL_AUTOPOST=off/);
});

test('TOKEN KHÔNG BAO GIỜ có mặt trong nội dung báo cáo, kể cả khi lọt vào lý do lỗi', () => {
  const body = report.buildReportMarkdown({
    stats: STATS,
    // Mô phỏng trường hợp xấu nhất: một thông báo lỗi có kèm token bị nhét vào lý do.
    channel: { daDang: false, lyDo: `lỗi lạ với token ${FAKE_TOKEN}`, conLai: null },
    nowMs: Date.now(),
  });
  assert.ok(!body.includes(FAKE_TOKEN), 'token tuyệt đối không được nằm trong báo cáo');
  assert.match(body, /\*\*\*/, 'phải bị thay bằng dấu che');
});

test('redactSecrets xoá mọi dạng token GitHub', () => {
  assert.ok(!redactSecrets(`xin chào ${FAKE_TOKEN} tạm biệt`, {}).includes(FAKE_TOKEN));
  const classic = 'ghp_AbCdEf0123456789AbCdEf0123456789AbCd';
  assert.ok(!redactSecrets(`lỗi: ${classic}`, {}).includes(classic));
  // Xoá theo GIÁ TRỊ biến môi trường cũng phải chạy (token dạng lạ).
  const odd = 'mot-token-rat-la-nhung-van-la-bi-mat';
  assert.ok(!redactSecrets(`lỗi: ${odd}`, { GITHUB_TOKEN: odd }).includes(odd));
});

// ===========================================================================
// 2) Đọc cấu hình GitHub — hàm thuần
// ===========================================================================

test('readGithubConfig: thiếu hoặc sai biến môi trường thì báo lý do rõ ràng', () => {
  assert.equal(report.readGithubConfig({}).reason, 'thieu_token');
  assert.equal(report.readGithubConfig({ GITHUB_TOKEN: FAKE_TOKEN }).reason, 'thieu_issue');
  assert.equal(
    report.readGithubConfig({ GITHUB_TOKEN: FAKE_TOKEN, GITHUB_REPORT_ISSUE: 'mười hai' }).reason,
    'issue_khong_hop_le'
  );
  assert.equal(
    report.readGithubConfig({ ...ENV, GITHUB_REPO: 'thiếu-dấu-gạch-chéo' }).reason,
    'repo_khong_hop_le'
  );

  const ok = report.readGithubConfig(ENV);
  assert.equal(ok.ok, true);
  assert.equal(ok.issue, 12);
  assert.equal(ok.repo, 'nirannguyen50/new-coin');

  // `#12` (người dùng chép cả dấu thăng) vẫn hiểu được; thiếu GITHUB_REPO thì dùng mặc định.
  const hash = report.readGithubConfig({ GITHUB_TOKEN: FAKE_TOKEN, GITHUB_REPORT_ISSUE: '#12' });
  assert.equal(hash.issue, 12);
  assert.equal(hash.repo, report.DEFAULT_REPO);
});

// ===========================================================================
// 3) Gửi lên GitHub — fetch giả: thành công, 401, lỗi mạng
// ===========================================================================

test('gửi thành công: đúng địa chỉ, đúng header, có User-Agent, không lộ token ra log', async () => {
  const doFetch = fakeFetch({ status: 201 });
  const res = await report.postReportComment({ body: '## xin chào', env: ENV, fetchImpl: doFetch });

  assert.equal(res.ok, true);
  assert.equal(res.status, 201);
  assert.equal(doFetch.calls.length, 1);

  const { url, init } = doFetch.calls[0];
  assert.equal(url, 'https://api.github.com/repos/nirannguyen50/new-coin/issues/12/comments');
  assert.equal(init.method, 'POST');
  assert.equal(init.headers.authorization, `Bearer ${FAKE_TOKEN}`);
  assert.equal(init.headers.accept, 'application/vnd.github+json');
  assert.ok(init.headers['user-agent'], 'GitHub trả 403 nếu thiếu User-Agent');
  assert.equal(JSON.parse(init.body).body, '## xin chào');

  // Địa chỉ là BÌNH LUẬN của một issue có sẵn — không bao giờ mở issue mới.
  assert.match(url, /\/issues\/12\/comments$/);
});

test('GitHub trả 401: không ném lỗi, có gợi ý sửa, và không in token ra', async () => {
  const doFetch = fakeFetch({
    status: 401,
    body: '{"message":"Bad credentials","documentation_url":"https://docs.github.com"}',
  });
  const res = await report.postReportComment({ body: 'x', env: ENV, fetchImpl: doFetch });

  assert.equal(res.ok, false);
  assert.equal(res.status, 401);
  assert.equal(res.reason, 'http_401');
  assert.match(res.lyDo, /401/);
  assert.match(res.lyDo, /Issues: Read and write/);
  assert.ok(!res.lyDo.includes(FAKE_TOKEN));
});

test('GitHub trả 404: nói thẳng phải kiểm tra repo và số issue', async () => {
  const doFetch = fakeFetch({ status: 404, body: '{"message":"Not Found"}' });
  const res = await report.postReportComment({ body: 'x', env: ENV, fetchImpl: doFetch });
  assert.equal(res.ok, false);
  assert.match(res.lyDo, /GITHUB_REPORT_ISSUE/);
});

test('mất mạng: không ném lỗi ra ngoài, chỉ trả về lý do (đã xoá bí mật)', async () => {
  const boom = new Error(`getaddrinfo ENOTFOUND api.github.com (token ${FAKE_TOKEN})`);
  const doFetch = fakeFetch({ throws: boom });
  const res = await report.postReportComment({ body: 'x', env: ENV, fetchImpl: doFetch });

  assert.equal(res.ok, false);
  assert.equal(res.reason, 'loi_mang');
  assert.match(res.lyDo, /ENOTFOUND/);
  assert.ok(!res.lyDo.includes(FAKE_TOKEN), 'lý do lỗi không được chứa token');
});

test('thiếu GITHUB_TOKEN / GITHUB_REPORT_ISSUE: bỏ qua êm, KHÔNG gọi mạng', async () => {
  const doFetch = fakeFetch({ status: 201 });
  const noToken = await report.postReportComment({ body: 'x', env: {}, fetchImpl: doFetch });
  assert.equal(noToken.ok, false);
  assert.match(noToken.lyDo, /GITHUB_TOKEN/);

  const noIssue = await report.postReportComment({
    body: 'x',
    env: { GITHUB_TOKEN: FAKE_TOKEN },
    fetchImpl: doFetch,
  });
  assert.equal(noIssue.ok, false);
  assert.match(noIssue.lyDo, /GITHUB_REPORT_ISSUE/);

  assert.equal(doFetch.calls.length, 0, 'thiếu cấu hình thì không được gọi GitHub');
});

// ===========================================================================
// 4) Cả quy trình báo cáo
// ===========================================================================

test('runDailyReport: lấy số liệu, gửi, rồi ghi mốc để lần sau so sánh', async () => {
  const storage = fakeStorage({ postedIds: ['ghim', 'ngay-01'] });
  const doFetch = fakeFetch({ status: 201 });
  const nowMs = Date.UTC(2026, 8, 13, 1, 0, 0);

  const res = await report.runDailyReport({
    storage,
    env: ENV,
    channel: { daDang: true, maBai: 'ngay-02', tieuDe: 'Ngày 2', conLai: 25 },
    nowMs,
    fetchImpl: doFetch,
  });

  assert.equal(res.daGui, true);
  assert.equal(doFetch.calls.length, 1);
  const body = JSON.parse(doFetch.calls[0].init.body).body;
  assert.match(body, /\| Nhóm đang có bot \| 7 \|/);
  assert.match(body, /Đã đăng bài `ngay-02`/);
  assert.match(body, /Tổng số bài đã đăng lên kênh từ trước tới nay: 2/);
  assert.ok(!body.includes(FAKE_TOKEN));

  assert.deepEqual(storage.written, [{ ...STATS, at: nowMs }], 'mốc phải được ghi lại');
});

test('runDailyReport: gửi hỏng thì KHÔNG ghi mốc (mai báo cáo vẫn so với mốc cũ)', async () => {
  const storage = fakeStorage({ previous: { ...STATS, groupsTotal: 5 } });
  const doFetch = fakeFetch({ status: 500, body: 'server error' });

  const res = await report.runDailyReport({ storage, env: ENV, nowMs: Date.now(), fetchImpl: doFetch });
  assert.equal(res.daGui, false);
  assert.match(res.lyDo, /500/);
  assert.deepEqual(storage.written, [], 'gửi hỏng mà ghi mốc là làm mất "nhóm mới" của ngày đó');
});

test('runDailyReport: thiếu cấu hình thì không hỏi database câu nào', async () => {
  let asked = 0;
  const storage = {
    async growthStats() {
      asked += 1;
      return STATS;
    },
  };
  const res = await report.runDailyReport({ storage, env: {}, nowMs: Date.now() });
  assert.equal(res.daGui, false);
  assert.match(res.lyDo, /GITHUB_TOKEN/);
  assert.equal(asked, 0);
});

test('runDailyReport: database hỏng cũng chỉ là "không gửi được", không ném lỗi', async () => {
  const storage = {
    async growthStats() {
      throw new Error('connection terminated');
    },
  };
  const res = await report.runDailyReport({
    storage,
    env: ENV,
    nowMs: Date.now(),
    fetchImpl: fakeFetch({ status: 201 }),
  });
  assert.equal(res.daGui, false);
  assert.match(res.lyDo, /connection terminated/);
});
