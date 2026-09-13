'use strict';

/**
 * storage.js — CHỌN kho lưu trữ, và một lớp bọc chung để lệnh bot không cần biết
 * dữ liệu đang nằm ở đâu.
 *
 * Có hai kho:
 *   - `postgres` — khi có biến môi trường chứa chuỗi kết nối Postgres (Neon/Supabase/
 *     Render Postgres). Dữ liệu BỀN VỮNG, dùng được trên serverless (Vercel).
 *   - `json`     — file JSON trong `bot/data/` (mặc định). Dùng khi chạy ở máy cá nhân.
 *
 * Hàm `pickStorageBackend(env)` là HÀM THUẦN (không mở kết nối, không đọc file) nên
 * unit test được đầy đủ — xem `test/storage.test.js`.
 */

const store = require('./store');
const ledger = require('./ledger');
const { safeErrorMessage } = require('./redact');

/**
 * Thứ tự ƯU TIÊN các biến môi trường chứa chuỗi kết nối Postgres.
 *
 * Vì sao nhiều tên như vậy: tuỳ tích hợp mà nhà cung cấp tiêm vào tên khác nhau.
 *   - `DATABASE_URL`              — tên chuẩn nhất; Neon (qua Vercel Marketplace) và
 *                                   Render Postgres đều dùng tên này. Là chuỗi POOLED.
 *   - `POSTGRES_URL`              — tích hợp Vercel Postgres/Neon kiểu cũ, cũng POOLED.
 *   - `POSTGRES_PRISMA_URL`       — như trên nhưng kèm tham số dành cho Prisma; vẫn là
 *                                   chuỗi kết nối Postgres hợp lệ nên dùng được.
 *   - `POSTGRES_URL_NON_POOLING`  — chuỗi KHÔNG pooled; chỉ dùng khi không còn lựa chọn
 *   - `DATABASE_URL_UNPOOLED`       nào khác, vì serverless mở rất nhiều kết nối.
 *   - `NEON_DATABASE_URL`         — một số mẫu (template) của Neon đặt tên này.
 *
 * Luôn ưu tiên chuỗi POOLED: trên serverless có thể có hàng trăm instance chạy song
 * song, nếu mỗi instance mở kết nối trực tiếp thì vượt hạn mức kết nối của gói free.
 */
const POSTGRES_ENV_VARS = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL_NON_POOLING',
  'DATABASE_URL_UNPOOLED',
  'NEON_DATABASE_URL',
];

/** Chuỗi có giống chuỗi kết nối Postgres không (tránh nhận nhầm MySQL/Redis). */
function looksLikePostgresUrl(value) {
  return /^postgres(ql)?:\/\//i.test(String(value || '').trim());
}

/**
 * Chọn kho lưu trữ dựa trên biến môi trường. HÀM THUẦN — không side effect.
 *
 * @returns {{kind: 'postgres'|'json', connectionString: string, source: string,
 *            candidates: string[]}}
 *   `source` là TÊN biến môi trường đã được dùng (để log cho dễ hiểu — KHÔNG bao giờ
 *   log giá trị, vì chuỗi kết nối chứa mật khẩu). `candidates` liệt kê mọi tên biến
 *   đang có giá trị, giúp chẩn đoán khi nhà cung cấp tiêm nhiều biến một lúc.
 */
function pickStorageBackend(env = process.env) {
  const candidates = POSTGRES_ENV_VARS.filter((name) =>
    looksLikePostgresUrl(env[name])
  );
  if (candidates.length === 0) {
    return { kind: 'json', connectionString: '', source: '', candidates: [] };
  }
  const source = candidates[0];
  return {
    kind: 'postgres',
    connectionString: String(env[source]).trim(),
    source,
    candidates,
  };
}

// ---------------------------------------------------------------------------
// Lớp bọc JSON — cùng một "hình dạng" API với PostgresLedger, nhưng bất đồng bộ giả
// (bên trong vẫn là fs.*Sync, đồng bộ và an toàn trong một tiến trình).
// ---------------------------------------------------------------------------

class JsonGroupStorage {
  constructor() {
    this.kind = 'json';
  }

  async ensureSchema() {
    store.ensureDataDir();
    return { ok: true, schema: 'file' };
  }

  async withGroup(chatId, mutator) {
    return store.withGroupState(chatId, mutator);
  }

  async readGroup(chatId) {
    return store.readGroupState(chatId);
  }

  async listGroupIds() {
    return store.listGroupIds();
  }

  async getBalance(chatId, userId) {
    return this.withGroup(chatId, (state) => ledger.getBalance(state, userId));
  }

  async credit(chatId, userId, amount, meta = {}, nowMs = Date.now()) {
    return this.withGroup(chatId, (state) => ledger.creditPure(state, userId, amount, meta, nowMs));
  }

  async debit(chatId, userId, amount, meta = {}, nowMs = Date.now()) {
    return this.withGroup(chatId, (state) => ledger.debitPure(state, userId, amount, meta, nowMs));
  }

  async transfer(chatId, fromUserId, toUserId, amount, meta = {}, nowMs = Date.now()) {
    return this.withGroup(chatId, (state) =>
      ledger.transferPure(state, fromUserId, toUserId, amount, meta, nowMs)
    );
  }

  async recordTransaction(chatId, tx, nowMs = Date.now()) {
    return this.withGroup(chatId, (state) => ledger.recordTransactionPure(state, tx, nowMs));
  }

  async listRecentTransactions(chatId, userId, limit = 10) {
    return this.withGroup(chatId, (state) =>
      ledger.listRecentTransactionsPure(state, userId, limit)
    );
  }

  async ensureMember(chatId, userId, nowMs = Date.now()) {
    return this.withGroup(chatId, (state) => ledger.ensureMember(state, userId, nowMs));
  }

  /**
   * Giao dịch của nhóm kể từ mốc `sinceMs` (tuỳ chọn lọc theo loại), cũ nhất trước.
   * Dùng cho bảng xếp hạng /bxh — kho JSON giữ toàn bộ lịch sử trong file nên chỉ cần lọc.
   */
  async listTransactionsSince(chatId, sinceMs, types = null) {
    const state = store.readGroupState(chatId);
    return (state.transactions || [])
      .filter((tx) => (Number(tx.ts) || 0) >= sinceMs && (!types || types.includes(tx.type)))
      .sort((a, b) => a.id - b.id);
  }

  /**
   * Thống kê tăng trưởng cho chủ bot (/thongke) — chỉ số đếm, gộp từ mọi nhóm.
   * Cùng định nghĩa với `PostgresLedger.growthStats` (xem `growth.aggregateGrowthStats`).
   */
  async growthStats(sinceMs) {
    const growth = require('./growth'); // require tại chỗ: growth.js cũng require ledger/store
    const states = store.listGroupIds().map((chatId) => store.readGroupState(chatId));
    return growth.aggregateGrowthStats(states, { sinceMs });
  }

  // -------------------------------------------------------------------------
  // Kênh công khai + báo cáo hằng ngày (không thuộc nhóm nào — xem store.js)
  // -------------------------------------------------------------------------

  /** Mã các bài đã đăng lên kênh (xem `src/channel.js`). */
  async listPostedChannelPostIds() {
    return Object.keys(store.readBotState().channelPosts || {});
  }

  /** Mốc thời gian của bài gần nhất đã đăng (0 = chưa đăng bài nào). */
  async lastChannelPostAt() {
    const posts = Object.values(store.readBotState().channelPosts || {});
    return posts.reduce((max, p) => Math.max(max, Number(p && p.postedAt) || 0), 0);
  }

  /**
   * "Xí phần" một bài trước khi gửi lên Telegram.
   * @returns {Promise<boolean>} true = lần chạy này được quyền đăng; false = đã có chủ.
   */
  async claimChannelPost(postId, nowMs = Date.now(), chatId = null) {
    const id = String(postId);
    return store.withBotState((state) => {
      if (state.channelPosts[id]) return false;
      state.channelPosts[id] = { postedAt: Number(nowMs) || Date.now(), chatId: chatId ? String(chatId) : null };
      return true;
    });
  }

  /** Trả mã bài về hàng đợi khi Telegram từ chối (để hôm sau đăng lại). */
  async releaseChannelPost(postId) {
    const id = String(postId);
    return store.withBotState((state) => {
      const existed = !!state.channelPosts[id];
      delete state.channelPosts[id];
      return existed;
    });
  }

  /** Dấu mốc của báo cáo hằng ngày (xem `src/report.js`); chưa có thì `null`. */
  async readReportState(key = 'daily') {
    const value = store.readBotState().reports[String(key)];
    return value == null ? null : value;
  }

  async writeReportState(value, key = 'daily') {
    return store.withBotState((state) => {
      state.reports[String(key)] = value;
      return value;
    });
  }

  async claimEnvelope(chatId, envelopeId, userId, nowMs = Date.now()) {
    return this.withGroup(chatId, (state) =>
      ledger.claimEnvelopeAndCredit(state, envelopeId, userId, nowMs)
    );
  }

  async settleDueEnvelopes(chatId, nowMs = Date.now()) {
    return this.withGroup(chatId, (state) => ledger.settleDueEnvelopes(state, nowMs));
  }

  async sweepDueEnvelopes(nowMs = Date.now()) {
    const results = [];
    for (const chatId of store.listGroupIds()) {
      const settled = await this.settleDueEnvelopes(chatId, nowMs);
      if (settled.length) results.push({ chatId, settled });
    }
    return results;
  }

  async runDailyReward(chatId, dateStr, nowMs = Date.now()) {
    return this.withGroup(chatId, (state) => ledger.runDailyReward(state, dateStr, nowMs));
  }

  async runDailyRewardAllGroups(dateStr, nowMs = Date.now()) {
    const results = [];
    for (const chatId of store.listGroupIds()) {
      try {
        const outcome = await this.runDailyReward(chatId, dateStr, nowMs);
        results.push({ chatId, ...outcome });
      } catch (err) {
        results.push({ chatId, error: safeErrorMessage(err) });
      }
    }
    return results;
  }

  async close() {
    store.flushPendingWrites();
  }
}

/**
 * Tạo đối tượng lưu trữ theo biến môi trường.
 * Trả về `{ storage, backend }` — `backend` là kết quả của `pickStorageBackend`, dùng
 * để in log "đang dùng kho nào" (chỉ in TÊN biến, không bao giờ in giá trị).
 */
function createStorage(env = process.env) {
  const backend = pickStorageBackend(env);
  if (backend.kind === 'postgres') {
    // require tại chỗ để môi trường chỉ chạy JSON không phải nạp driver `pg`.
    const { PostgresLedger } = require('./postgres-store');
    const schema = String(env.POSTGRES_SCHEMA || 'public').trim() || 'public';
    return { storage: new PostgresLedger(backend.connectionString, { schema }), backend };
  }
  return { storage: new JsonGroupStorage(), backend };
}

module.exports = {
  POSTGRES_ENV_VARS,
  JsonGroupStorage,
  createStorage,
  looksLikePostgresUrl,
  pickStorageBackend,
};
