'use strict';

/**
 * channel.test.js — Bộ ĐĂNG BÀI TỰ ĐỘNG lên kênh công khai (`src/channel.js`).
 *
 * Ba thứ phải đúng, vì kênh là nơi công khai và sai thì cả thế giới thấy:
 *   1. ĐÚNG THỨ TỰ và KHÔNG BAO GIỜ ĐĂNG TRÙNG — kể cả khi cron chạy hai lần.
 *   2. KHÔNG BAO GIỜ đăng bài còn chỗ trống (`needsManualData`).
 *   3. Dấu mốc "đã đăng" phải SỐNG QUA KHỞI ĐỘNG NGUỘI (cold start) — trên Vercel mỗi
 *      lần cron là một tiến trình mới toanh, không có bộ nhớ nào từ lần trước.
 *
 * Nhóm test Postgres tự BỎ QUA nếu chưa đặt TEST_DATABASE_URL.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

// Phải đặt TRƯỚC khi require store.js (DATA_DIR đọc biến này lúc nạp module).
const TMP_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'lixi-channel-'));
process.env.LIXI_DATA_DIR = TMP_DATA_DIR;

const test = require('node:test');
const assert = require('node:assert/strict');

const channel = require('../src/channel');
const ledger = require('../src/ledger');
const store = require('../src/store');
const growth = require('../src/growth');
const { CHANNEL_POSTS, CHANNEL_POST_IDS } = require('../content/channel-posts');
const { WEEKLY_NOTES } = require('../content/weekly-notes');

test.after(() => {
  fs.rmSync(TMP_DATA_DIR, { recursive: true, force: true });
});

/** Telegram giả: ghi lại mọi lần gửi, hoặc ném lỗi khi được yêu cầu. */
function fakeTelegram({ fail = null } = {}) {
  const sent = [];
  return {
    sent,
    async sendMessage(chatId, text, extra) {
      if (fail) throw fail;
      sent.push({ chatId, text, extra });
      return { message_id: sent.length };
    },
  };
}

/** Mỗi test một thư mục dữ liệu riêng → không test nào ảnh hưởng test nào. */
function freshStorage(name) {
  const dir = fs.mkdtempSync(path.join(TMP_DATA_DIR, `${name}-`));
  process.env.LIXI_DATA_DIR = dir;
  // store.js đọc DATA_DIR lúc nạp module, nên đổi biến môi trường giữa chừng không đủ:
  // xoá cache để module được nạp lại với thư mục mới.
  delete require.cache[require.resolve('../src/store')];
  delete require.cache[require.resolve('../src/storage')];
  const { JsonGroupStorage: Fresh } = require('../src/storage');
  return new Fresh();
}

const BASE_ENV = { CHANNEL_CHAT_ID: '@lixibot_kenh' };

/**
 * Mã các bài ĐĂNG TỰ ĐỘNG ĐƯỢC, theo đúng thứ tự hàng đợi.
 *
 * Tính bằng chính `isPostReady` + `ctxFor` mà bộ đăng bài dùng, KHÔNG hard-code danh
 * sách. Lý do: một bài `needsManualData` trở nên đăng được ngay khi Quản lý viết ghi chú
 * tuần cho nó vào `content/weekly-notes.js`. Nếu test chép cứng danh sách thì cứ mỗi lần
 * thêm ghi chú là test đỏ — đỏ vì test cũ, không phải vì code hỏng.
 */
async function readyIds(storage, nowMs) {
  const stats = await storage.growthStats(growth.statsWindowStart(nowMs));
  const ctx = { stats, notes: WEEKLY_NOTES };
  return CHANNEL_POSTS.filter((p) => channel.isPostReady(p, channel.ctxFor(p, ctx))).map(
    (p) => p.id
  );
}

// ===========================================================================
// 1) Thư viện nội dung: chuyển từ growth/05 sang, không được sai lệch
// ===========================================================================

test('thư viện bài đăng: mã duy nhất, có nội dung, và cờ needsManualData khớp với chỗ trống thật', () => {
  assert.ok(CHANNEL_POSTS.length >= 60, 'phải có ít nhất bài ghim + 30 bài tháng đầu + 30 bài tháng hai');
  assert.equal(CHANNEL_POSTS.filter((p) => p.id.startsWith('t2-')).length, 30, 'tháng hai đủ 30 bài');
  assert.equal(new Set(CHANNEL_POST_IDS).size, CHANNEL_POSTS.length, 'mã bài phải duy nhất');
  assert.equal(CHANNEL_POSTS[0].id, 'ghim', 'bài ghim phải đăng đầu tiên');

  for (const post of CHANNEL_POSTS) {
    assert.match(post.id, /^[a-z0-9-]+$/, `mã bài ${post.id} phải gọn và ổn định`);
    assert.ok(post.title && post.title.length > 0, `bài ${post.id} thiếu tiêu đề`);
    assert.ok(post.text && post.text.trim().length > 50, `bài ${post.id} quá ngắn`);
    // Telegram giới hạn 4096 ký tự một tin nhắn; thư viện tự đặt trần 600.
    assert.ok(post.text.length <= 1000, `bài ${post.id} dài bất thường`);

    const hasBlank = post.text.includes('[[');
    assert.equal(
      !!post.needsManualData,
      hasBlank,
      `bài ${post.id}: cờ needsManualData phải đúng bằng việc bài còn chỗ trống [[...]]`
    );
  }

  // Không bài tự động nào được chứa link giữ chỗ chưa thay.
  for (const post of CHANNEL_POSTS.filter((p) => !p.needsManualData)) {
    assert.ok(!/\[\[/.test(post.text), `bài ${post.id} còn chỗ trống mà không được đánh dấu`);
  }
});

// ===========================================================================
// 2) Chọn bài kế tiếp — hàm thuần
// ===========================================================================

test('nextChannelPost: đúng thứ tự, bỏ qua bài đã đăng và bài cần số liệu thật', () => {
  assert.equal(channel.nextChannelPost([]).id, 'ghim');
  assert.equal(channel.nextChannelPost(['ghim']).id, 'ngay-01');

  // Ngày 6 là bài "tuần này thay đổi gì" — còn [[SỐ]] nên KHÔNG được đăng tự động.
  const doneThroughDay5 = ['ghim', 'ngay-01', 'ngay-02', 'ngay-03', 'ngay-04', 'ngay-05'];
  const next = channel.nextChannelPost(doneThroughDay5);
  assert.equal(next.id, 'ngay-07', 'phải NHẢY QUA ngày 6, không dừng lại ở đó');

  // Một bài phải điền tay không được chặn những bài phía sau.
  const manualIds = CHANNEL_POSTS.filter((p) => p.needsManualData).map((p) => p.id);
  assert.ok(manualIds.length > 0);
  for (const id of manualIds) {
    assert.notEqual(channel.nextChannelPost([]).id, id);
  }

  // Đăng hết → null, không quay vòng lại từ đầu.
  const autoIds = CHANNEL_POSTS.filter((p) => !p.needsManualData).map((p) => p.id);
  assert.equal(channel.nextChannelPost(autoIds), null);
  assert.equal(channel.countRemainingPosts(autoIds), 0);
  assert.equal(channel.countRemainingPosts([]), autoIds.length);

  // Mã lạ trong danh sách "đã đăng" không làm hỏng gì.
  assert.equal(channel.nextChannelPost(['khong-ton-tai']).id, 'ghim');
});

test('normalizeChannelChatId: nhận @username, id số, và cả URL dán nhầm', () => {
  assert.equal(channel.normalizeChannelChatId('@lixibot_kenh'), '@lixibot_kenh');
  assert.equal(channel.normalizeChannelChatId('lixibot_kenh'), '@lixibot_kenh');
  assert.equal(channel.normalizeChannelChatId('  https://t.me/lixibot_kenh '), '@lixibot_kenh');
  assert.equal(channel.normalizeChannelChatId('-1001234567890'), '-1001234567890');
  assert.equal(channel.normalizeChannelChatId(''), null);
  assert.equal(channel.normalizeChannelChatId(null), null);
  assert.equal(channel.normalizeChannelChatId('có dấu cách'), null);
  assert.equal(channel.normalizeChannelChatId('ab'), null, 'username Telegram tối thiểu 4 ký tự');
});

test('công tắc tắt CHANNEL_AUTOPOST và các lý do bỏ qua', () => {
  assert.equal(channel.isAutopostEnabled({}), true, 'thiếu biến = vẫn đăng');
  assert.equal(channel.isAutopostEnabled({ CHANNEL_AUTOPOST: 'off' }), false);
  assert.equal(channel.isAutopostEnabled({ CHANNEL_AUTOPOST: ' OFF ' }), false);
  assert.equal(channel.isAutopostEnabled({ CHANNEL_AUTOPOST: 'on' }), true);

  assert.equal(
    channel.planChannelPost({ env: { ...BASE_ENV, CHANNEL_AUTOPOST: 'off' } }).reason,
    'tat_cong_tac'
  );
  assert.equal(channel.planChannelPost({ env: {} }).reason, 'thieu_kenh');
  assert.equal(channel.planChannelPost({ env: { CHANNEL_CHAT_ID: '!!' } }).reason, 'kenh_khong_hop_le');
  const autoIds = CHANNEL_POSTS.filter((p) => !p.needsManualData).map((p) => p.id);
  assert.equal(channel.planChannelPost({ env: BASE_ENV, postedIds: autoIds }).reason, 'het_bai');

  const plan = channel.planChannelPost({ env: BASE_ENV, postedIds: [] });
  assert.equal(plan.ok, true);
  assert.equal(plan.chatId, '@lixibot_kenh');
  assert.equal(plan.post.id, 'ghim');
});

test('alreadyPostedToday: cùng ngày UTC thì thôi, ngày khác thì đăng tiếp', () => {
  const now = Date.UTC(2026, 8, 13, 10, 0, 0);
  assert.equal(channel.alreadyPostedToday(0, now), false, 'chưa đăng bài nào');
  assert.equal(channel.alreadyPostedToday(now - 60 * 1000, now), true);
  assert.equal(channel.alreadyPostedToday(now - ledger.DAY_MS, now), false);
});

// ===========================================================================
// 3) Chạy thật với kho JSON: thứ tự, không đăng trùng, ghi mốc bền vững
// ===========================================================================

test('đăng lần lượt qua nhiều lần chạy, mỗi ngày đúng một bài, không bao giờ trùng', async () => {
  const storage = freshStorage('order');
  const telegram = fakeTelegram();
  let day = Date.UTC(2026, 8, 13, 1, 30, 0);

  const results = [];
  for (let i = 0; i < 8; i += 1) {
    results.push(
      await channel.runChannelAutopost({ telegram, storage, env: BASE_ENV, nowMs: day })
    );
    day += ledger.DAY_MS;
  }

  const postedIds = results.map((r) => r.maBai);
  const expected = (await readyIds(storage, Date.UTC(2026, 8, 13, 1, 30, 0))).slice(0, 8);
  assert.deepEqual(
    postedIds,
    expected,
    'đúng thứ tự hàng đợi, và nhảy qua mọi bài chưa điền được hết chỗ trống'
  );
  const skipped = CHANNEL_POSTS.slice(0, CHANNEL_POST_IDS.indexOf(postedIds[7]) + 1)
    .map((p) => p.id)
    .filter((id) => !postedIds.includes(id));
  for (const id of skipped) {
    const post = CHANNEL_POSTS.find((p) => p.id === id);
    assert.equal(post.needsManualData, true, `chỉ bài cần số liệu thật mới được nhảy qua: ${id}`);
  }
  assert.equal(new Set(postedIds).size, postedIds.length, 'không bài nào đăng hai lần');
  assert.ok(results.every((r) => r.daDang === true));
  assert.equal(telegram.sent.length, 8);
  assert.equal(telegram.sent[0].chatId, '@lixibot_kenh');
  assert.equal(telegram.sent[0].text, CHANNEL_POSTS[0].text, 'gửi nguyên văn, không cắt xén');
  // Bài là văn bản thuần: không được bật parse_mode (một dấu `_` sẽ làm Telegram từ chối).
  assert.ok(!('parse_mode' in telegram.sent[0].extra));

  // Cron chạy lần thứ hai TRONG CÙNG NGÀY → không đăng thêm gì.
  const again = await channel.runChannelAutopost({
    telegram,
    storage,
    env: BASE_ENV,
    nowMs: day - ledger.DAY_MS + 3600 * 1000,
  });
  assert.equal(again.daDang, false);
  assert.match(again.lyDo, /mỗi ngày đúng một bài/);
  assert.equal(telegram.sent.length, 8, 'không có tin nhắn nào phát sinh thêm');

  // Dấu mốc nằm trên đĩa, không phải trong bộ nhớ.
  const ids = await storage.listPostedChannelPostIds();
  assert.deepEqual([...ids].sort(), [...postedIds].sort());
});

test('bài cần số liệu thật không bao giờ được đăng, dù chạy hết cả hàng đợi', async () => {
  const storage = freshStorage('manual');
  const telegram = fakeTelegram();
  let day = Date.UTC(2026, 8, 13, 1, 0, 0);

  const ready = await readyIds(storage, day);
  const autoCount = ready.length;
  for (let i = 0; i < autoCount + 3; i += 1) {
    await channel.runChannelAutopost({ telegram, storage, env: BASE_ENV, nowMs: day });
    day += ledger.DAY_MS;
  }

  assert.equal(telegram.sent.length, autoCount, 'đăng đúng số bài tự động được, không hơn');
  const manualTexts = CHANNEL_POSTS.filter((p) => !ready.includes(p.id)).map((p) => p.text);
  for (const sent of telegram.sent) {
    assert.ok(!sent.text.includes('[['), 'không tin nào được phép còn chỗ trống');
    assert.ok(!manualTexts.includes(sent.text));
  }

  // Hết hàng đợi → bỏ qua êm, không lỗi.
  const done = await channel.runChannelAutopost({ telegram, storage, env: BASE_ENV, nowMs: day });
  assert.equal(done.daDang, false);
  assert.match(done.lyDo, /hết bài/i);
});

test('Telegram từ chối: trả mã bài về hàng đợi để hôm sau đăng lại, không mất bài', async () => {
  const storage = freshStorage('reject');
  const broken = fakeTelegram({ fail: new Error('Bad Request: chat not found') });
  const day = Date.UTC(2026, 8, 13, 1, 0, 0);

  const failed = await channel.runChannelAutopost({
    telegram: broken,
    storage,
    env: BASE_ENV,
    nowMs: day,
  });
  assert.equal(failed.daDang, false);
  assert.match(failed.lyDo, /chat not found/);
  assert.deepEqual(await storage.listPostedChannelPostIds(), [], 'mã bài phải được trả lại');

  // Hôm sau Telegram bình thường trở lại → vẫn là bài đầu tiên, không nhảy cóc.
  const telegram = fakeTelegram();
  const ok = await channel.runChannelAutopost({
    telegram,
    storage,
    env: BASE_ENV,
    nowMs: day + ledger.DAY_MS,
  });
  assert.equal(ok.daDang, true);
  assert.equal(ok.maBai, 'ghim');
});

test('công tắc tắt và thiếu cấu hình: bỏ qua êm, không gửi gì, không ném lỗi', async () => {
  const storage = freshStorage('skip');
  const telegram = fakeTelegram();
  const day = Date.UTC(2026, 8, 13, 1, 0, 0);

  const off = await channel.runChannelAutopost({
    telegram,
    storage,
    env: { ...BASE_ENV, CHANNEL_AUTOPOST: 'off' },
    nowMs: day,
  });
  assert.equal(off.daDang, false);
  assert.match(off.lyDo, /CHANNEL_AUTOPOST=off/);

  const noChannel = await channel.runChannelAutopost({ telegram, storage, env: {}, nowMs: day });
  assert.equal(noChannel.daDang, false);
  assert.match(noChannel.lyDo, /CHANNEL_CHAT_ID/);

  assert.equal(telegram.sent.length, 0);
  assert.deepEqual(await storage.listPostedChannelPostIds(), []);
});

test('kho hỏng (không đọc/ghi được) không làm sập việc đăng bài', async () => {
  const telegram = fakeTelegram();
  const day = Date.UTC(2026, 8, 13, 1, 0, 0);

  const unreadable = {
    async listPostedChannelPostIds() {
      throw new Error('database đang bảo trì');
    },
  };
  const r1 = await channel.runChannelAutopost({ telegram, storage: unreadable, env: BASE_ENV, nowMs: day });
  assert.equal(r1.daDang, false);
  assert.match(r1.lyDo, /database đang bảo trì/);

  const unwritable = {
    async listPostedChannelPostIds() {
      return [];
    },
    async lastChannelPostAt() {
      return 0;
    },
    async claimChannelPost() {
      throw new Error('hết chỗ ghi');
    },
  };
  const r2 = await channel.runChannelAutopost({ telegram, storage: unwritable, env: BASE_ENV, nowMs: day });
  assert.equal(r2.daDang, false);
  assert.match(r2.lyDo, /hết chỗ ghi/);
  assert.equal(telegram.sent.length, 0, 'không xí được phần thì tuyệt đối không gửi');
});

test('hai lần chạy SONG SONG chỉ đăng được một bài (xí phần trước, gửi sau)', async () => {
  const storage = freshStorage('race');
  const telegram = fakeTelegram();
  const day = Date.UTC(2026, 8, 13, 1, 0, 0);

  // `claimChannelPost` của kho JSON là đồng bộ bên trong nên hai lời gọi nối nhau:
  // lần đầu xí được, lần sau thấy đã có chủ.
  assert.equal(await storage.claimChannelPost('ghim', day, '@lixibot_kenh'), true);
  assert.equal(await storage.claimChannelPost('ghim', day, '@lixibot_kenh'), false);

  // Một lần chạy khác (cùng ngày) thấy bài đã có chủ → không gửi gì.
  const result = await channel.runChannelAutopost({ telegram, storage, env: BASE_ENV, nowMs: day });
  assert.equal(result.daDang, false);
  assert.equal(telegram.sent.length, 0);
});

test('file trạng thái chung KHÔNG bị nhầm là một nhóm', () => {
  const dir = fs.mkdtempSync(path.join(TMP_DATA_DIR, 'notagroup-'));
  process.env.LIXI_DATA_DIR = dir;
  delete require.cache[require.resolve('../src/store')];
  const fresh = require('../src/store');
  fresh.withBotState((state) => {
    state.channelPosts.ghim = { postedAt: Date.now(), chatId: '@lixibot_kenh' };
  });
  assert.deepEqual(fresh.listGroupIds(), [], 'cron không được đi phát thưởng cho một "nhóm" không có thật');
  assert.ok(fs.existsSync(path.join(dir, store.BOT_STATE_FILE)));
  delete require.cache[require.resolve('../src/store')];
  delete require.cache[require.resolve('../src/storage')];
});

// ===========================================================================
// 3b) Bài có chỗ trống: bot tự điền SỐ, người quản lý viết CHỮ (ghi chú tuần)
// ===========================================================================

const NOTES_DAY6 = {
  tuan: 1,
  thayDoi1: 'sửa lỗi đọc tên người được reply',
  thayDoi2: 'thêm cảnh báo khi tắt thâm niên để thử',
  dangLam: 'viết bài kênh cho tháng thứ hai',
};
const STATS = {
  groupsTotal: 3,
  groupsActive: 2,
  groupsReferred: 0,
  membersSeen: 9,
  envelopesOpened: 4,
  pointsTipped: 350,
};

test('renderChannelPost: số từ thống kê, chữ từ ghi chú; số 0 là giá trị thật, chuỗi rỗng là thiếu', () => {
  const day6 = CHANNEL_POSTS.find((p) => p.id === 'ngay-06');
  const out = channel.renderChannelPost(day6, { stats: STATS, notes: NOTES_DAY6 });
  assert.equal(out.ok, true);
  assert.ok(!out.text.includes('[['), 'không còn chỗ trống nào');
  assert.match(out.text, /\(tuần 1\)/);
  assert.match(out.text, /Nhóm có giao dịch trong 7 ngày: 2\n/);
  assert.match(out.text, /Bao lì xì đã mở trong 7 ngày: 4\n/);
  assert.match(out.text, /• sửa lỗi đọc tên người được reply\n/);

  const zero = channel.renderChannelPost(day6, {
    stats: { ...STATS, groupsActive: 0, envelopesOpened: 0 },
    notes: NOTES_DAY6,
  });
  assert.equal(zero.ok, true, 'kho trống thì số thật là 0, vẫn đăng được');
  assert.match(zero.text, /7 ngày: 0\n/);

  const noNotes = channel.renderChannelPost(day6, { stats: STATS, notes: null });
  assert.equal(noNotes.ok, false);
  assert.deepEqual(noNotes.missing, ['tuan', 'thayDoi1', 'thayDoi2', 'dangLam']);

  const noStats = channel.renderChannelPost(day6, { stats: null, notes: NOTES_DAY6 });
  assert.equal(noStats.ok, false);
  assert.deepEqual(noStats.missing, ['nhomHoatDong', 'baoLiXi']);

  const blank = channel.renderChannelPost(day6, {
    stats: STATS,
    notes: { ...NOTES_DAY6, dangLam: '   ' },
  });
  assert.equal(blank.ok, false, 'chuỗi toàn khoảng trắng là thiếu, không được đăng');
  assert.deepEqual(blank.missing, ['dangLam']);
});

test('mọi chỗ trống trong thư viện đều có nguồn điền: số từ thống kê, chữ từ ghi chú tuần', () => {
  const NUMBER_KEYS = new Set(['nhomHoatDong', 'baoLiXi', 'diemTip']);
  const NOTE_KEYS = new Set([
    'tuan',
    'thayDoi1',
    'thayDoi2',
    'dangLam',
    'loiDaBiet',
    'daTuChoi',
    'thangToi',
  ]);
  const manual = CHANNEL_POSTS.filter((p) => p.needsManualData);
  assert.ok(manual.length >= 5);
  for (const post of manual) {
    const keys = channel.placeholdersOf(post);
    assert.ok(keys.length > 0, `bài ${post.id} đánh dấu có chỗ trống mà không có`);
    for (const k of keys) {
      assert.ok(
        NUMBER_KEYS.has(k) || NOTE_KEYS.has(k),
        `bài ${post.id}: chỗ trống [[${k}]] không ai điền được`
      );
    }
    assert.ok(
      keys.some((k) => NUMBER_KEYS.has(k)),
      `bài ${post.id} phải có ít nhất một con số thật, đó là lý do bài tồn tại`
    );
  }
});

test('có ghi chú tuần thì bài "tuần này thay đổi gì" đăng đúng thứ tự, số lấy từ kho thật', async () => {
  const storage = freshStorage('notes');
  const telegram = fakeTelegram();
  let day = Date.UTC(2026, 8, 13, 1, 30, 0);
  const notes = { 'ngay-06': NOTES_DAY6 };

  const ids = [];
  for (let i = 0; i < 7; i += 1) {
    const r = await channel.runChannelAutopost({
      telegram,
      storage,
      env: BASE_ENV,
      nowMs: day,
      notes,
    });
    ids.push(r.maBai);
    day += ledger.DAY_MS;
  }
  assert.deepEqual(ids, ['ghim', 'ngay-01', 'ngay-02', 'ngay-03', 'ngay-04', 'ngay-05', 'ngay-06']);

  const sent = telegram.sent[6];
  assert.ok(!sent.text.includes('[['), 'lên kênh là bài đã điền hết');
  assert.match(sent.text, /Nhóm có giao dịch trong 7 ngày: 0\n/, 'kho trống → 0, không phải chỗ trống');
  assert.match(sent.text, /• viết bài kênh cho tháng thứ hai/);

  // Các bài có chỗ trống còn lại vẫn đang chờ ghi chú — báo cáo phải biết để nhắc.
  const last = await channel.runChannelAutopost({ telegram, storage, env: BASE_ENV, nowMs: day, notes });
  assert.equal(last.maBai, 'ngay-07');
  assert.deepEqual(last.choGhiChu.slice(0, 2), ['ngay-14', 'ngay-21']);
  assert.ok(!last.choGhiChu.includes('ngay-06'), 'bài đã đăng thì không còn chờ');
});

test('ghi chú thiếu một trường: bài bị bỏ qua, hàng đợi đi tiếp, và vẫn tính là đang chờ ghi chú', () => {
  const notes = { 'ngay-06': { tuan: 1, thayDoi1: 'x' } };
  const done = ['ghim', 'ngay-01', 'ngay-02', 'ngay-03', 'ngay-04', 'ngay-05'];
  assert.equal(channel.nextChannelPost(done, CHANNEL_POSTS, { stats: STATS, notes }).id, 'ngay-07');
  assert.ok(channel.postsWaitingForNotes(done, CHANNEL_POSTS, notes).includes('ngay-06'));
  assert.ok(!channel.postsWaitingForNotes(done, CHANNEL_POSTS, { 'ngay-06': NOTES_DAY6 }).includes('ngay-06'));
  // Không có ghi chú nào → không bài có chỗ trống nào được chọn, y như trước khi có tính năng này.
  assert.equal(channel.nextChannelPost(done, CHANNEL_POSTS, { stats: STATS, notes: {} }).id, 'ngay-07');
});

test('không lấy được thống kê: bài có chỗ trống bị bỏ qua lần này, bài thường vẫn đăng', async () => {
  const storage = freshStorage('nostats');
  storage.growthStats = async () => {
    throw new Error('database down');
  };
  const telegram = fakeTelegram();
  for (const id of ['ghim', 'ngay-01', 'ngay-02', 'ngay-03', 'ngay-04', 'ngay-05']) {
    await storage.claimChannelPost(id, Date.UTC(2026, 8, 1), '@lixibot_kenh');
  }
  const r = await channel.runChannelAutopost({
    telegram,
    storage,
    env: BASE_ENV,
    nowMs: Date.UTC(2026, 8, 20, 1, 0, 0),
    notes: { 'ngay-06': NOTES_DAY6 },
  });
  assert.equal(r.daDang, true);
  assert.equal(r.maBai, 'ngay-07', 'nhảy qua bài cần số liệu, không chặn hàng đợi');
  assert.ok(!telegram.sent[0].text.includes('[['));
});

// ===========================================================================
// 4) Kho Postgres: dấu mốc sống qua KHỞI ĐỘNG NGUỘI (đường chạy thật trên Vercel)
// ===========================================================================

const CONNECTION_STRING = process.env.TEST_DATABASE_URL || '';
const PG_SCHEMA = `lixi_channel_${process.pid}_${Date.now().toString(36)}`;

test('kho Postgres: mã bài đã đăng sống qua khởi động nguội, và không đăng trùng', async (t) => {
  if (!CONNECTION_STRING) {
    t.skip('Bỏ qua: chưa đặt TEST_DATABASE_URL.');
    return;
  }
  const { PostgresLedger, closeAllPools } = require('../src/postgres-store');
  const storage = new PostgresLedger(CONNECTION_STRING, { schema: PG_SCHEMA });
  try {
    await storage.pool.query('SELECT 1');
  } catch (err) {
    t.skip(`Bỏ qua: không kết nối được Postgres (${err.message}).`);
    return;
  }

  try {
    await storage.ensureSchema();
    const telegram = fakeTelegram();
    let day = Date.UTC(2026, 8, 13, 1, 0, 0);

    for (let i = 0; i < 3; i += 1) {
      const r = await channel.runChannelAutopost({ telegram, storage, env: BASE_ENV, nowMs: day });
      assert.equal(r.daDang, true, `lần chạy ${i + 1} phải đăng được`);
      day += ledger.DAY_MS;
    }
    assert.deepEqual(
      telegram.sent.map((m) => m.text),
      CHANNEL_POSTS.slice(0, 3).map((p) => p.text)
    );

    // KHỞI ĐỘNG NGUỘI: đóng hết kết nối, dựng instance mới như một lần chạy cron mới.
    await closeAllPools();
    const fresh = new PostgresLedger(CONNECTION_STRING, { schema: PG_SCHEMA });
    assert.deepEqual(
      (await fresh.listPostedChannelPostIds()).sort(),
      ['ghim', 'ngay-01', 'ngay-02'],
      'dấu mốc phải nằm trong database, không phải trong bộ nhớ tiến trình'
    );
    assert.ok((await fresh.lastChannelPostAt()) > 0);

    const coldTelegram = fakeTelegram();
    const next = await channel.runChannelAutopost({
      telegram: coldTelegram,
      storage: fresh,
      env: BASE_ENV,
      nowMs: day,
    });
    assert.equal(next.maBai, 'ngay-03', 'tiến trình mới phải đăng tiếp đúng bài kế tiếp');

    // Xí phần hai lần cho cùng một mã: lần hai phải trượt (khoá chính của database).
    assert.equal(await fresh.claimChannelPost('ngay-04', day, '@lixibot_kenh'), true);
    assert.equal(await fresh.claimChannelPost('ngay-04', day, '@lixibot_kenh'), false);
    assert.equal(await fresh.releaseChannelPost('ngay-04'), true);
    assert.equal(await fresh.releaseChannelPost('ngay-04'), false);

    // Sổ tay chung (mốc báo cáo) cũng phải đọc/ghi được và sống qua khởi động nguội.
    assert.equal(await fresh.readReportState(), null);
    await fresh.writeReportState({ groupsTotal: 4, at: day });
    await closeAllPools();
    const fresher = new PostgresLedger(CONNECTION_STRING, { schema: PG_SCHEMA });
    assert.deepEqual(await fresher.readReportState(), { groupsTotal: 4, at: day });
  } finally {
    try {
      await storage.dropSchema();
    } catch (err) {
      console.error('Không xoá được schema test:', err.message);
    }
    await closeAllPools();
  }
});
