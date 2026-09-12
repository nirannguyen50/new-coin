'use strict';

/**
 * postgres-store.js — Kho lưu trữ BỀN VỮNG bằng PostgreSQL (Neon free tier, Supabase,
 * Render Postgres, hoặc một Postgres tự dựng).
 *
 * ============================================================================
 * VÌ SAO CẦN FILE NÀY
 * ============================================================================
 * `src/store.js` lưu sổ cái vào file JSON trong `bot/data/`. Cách đó rất tốt khi chạy
 * ở máy cá nhân, nhưng KHÔNG dùng được ở hai chỗ:
 *
 *   1. Hosting miễn phí không có đĩa bền vững (Render free): file bị xoá mỗi lần
 *      restart/redeploy → mất sạch số dư.
 *   2. Môi trường serverless (Vercel): hệ thống file CHỈ ĐỌC (trừ `/tmp` tạm thời),
 *      và mỗi request có thể chạy trên một máy khác → không thể chia sẻ file.
 *
 * `PostgresLedger` trong file này implement ĐÚNG interface `Ledger` mô tả ở đầu
 * `src/ledger.js` (getBalance, credit, debit, transfer, recordTransaction,
 * listRecentTransactions) — chỉ khác là mọi phương thức đều BẤT ĐỒNG BỘ (trả Promise),
 * vì nói chuyện với database luôn phải qua mạng. Ngoài 6 phương thức bắt buộc, lớp này
 * còn cung cấp các thao tác mà lệnh bot cần (bao lì xì, yêu cầu rút, pot, thưởng
 * hoạt động) — tất cả đều dùng lại các HÀM THUẦN đã có trong `src/ledger.js`, nên
 * KHÔNG có logic nghiệp vụ nào bị viết lại hai lần.
 *
 * ============================================================================
 * MÔ HÌNH AN TOÀN KHI NHIỀU BẢN CHẠY CÙNG LÚC (serverless)
 * ============================================================================
 * Trên serverless, nhiều bản (instance) của hàm có thể xử lý hai lệnh của CÙNG một
 * nhóm ở CÙNG một thời điểm. Nếu cả hai cùng đọc số dư 100 rồi cùng trừ 100 thì nhóm
 * mất 100 điểm từ hư không. Hai lớp bảo vệ (cả hai đều nằm ở phía database):
 *
 *   1. KHOÁ HÀNG (row lock): mọi thao tác đều mở một transaction và bắt đầu bằng
 *      `SELECT ... FROM lixi_groups WHERE chat_id = $1 FOR UPDATE`, rồi
 *      `SELECT ... FROM lixi_members WHERE chat_id = $1 FOR UPDATE`. Postgres cho
 *      đúng MỘT transaction giữ khoá đó; transaction thứ hai phải xếp hàng chờ.
 *      Nhờ vậy mọi thay đổi trong cùng một nhóm được xếp nối tiếp nhau (serialize),
 *      kể cả khi chúng chạy trên hai máy khác nhau ở hai châu lục.
 *      Khoá luôn lấy theo THỨ TỰ CỐ ĐỊNH (nhóm trước, thành viên sau) nên không có
 *      deadlock.
 *
 *   2. RÀNG BUỘC CHECK: cột `lixi_members.balance` có `CHECK (balance >= 0)`.
 *      Đây là "lưới an toàn cuối cùng": kể cả khi một lỗi lập trình nào đó bỏ quên
 *      khoá, database vẫn TỪ CHỐI ghi số dư âm và cả transaction bị huỷ (rollback).
 *      Không có đường nào tạo ra điểm từ hư không.
 *
 * Mọi thao tác chuyển tiền (tip, nhận lì xì, hoàn lì xì hết giờ, giữ/duyệt/hoàn điểm
 * yêu cầu rút, admin cấp điểm, phát thưởng) đều đi qua `withGroup()` → nghĩa là đều
 * nằm trong một transaction có khoá. Nếu hàm nghiệp vụ ném lỗi (ví dụ
 * INSUFFICIENT_BALANCE) thì transaction ROLLBACK: không có gì bị thay đổi.
 *
 * ============================================================================
 * KẾT NỐI (POOL) TRONG MÔI TRƯỜNG SERVERLESS
 * ============================================================================
 * Mỗi "instance nóng" (warm invocation) giữ lại một pool NHỎ và dùng lại cho các
 * request sau. Pool được cache trên `globalThis` để không bị tạo lại khi module bị
 * nạp nhiều lần. `max: 2` để hàng trăm instance cộng lại không vượt hạn mức kết nối
 * của Neon free tier (nên dùng chuỗi kết nối POOLED của Neon, xem `src/storage.js`).
 */

const { Pool } = require('pg');
const ledger = require('./ledger');
const { safeErrorMessage } = require('./redact');
const { defaultConfig, defaultGroupState, defaultGrowth } = require('./store');

/** Số giao dịch gần nhất nạp vào bộ nhớ mỗi lần mở nhóm (đủ cho lệnh /lichsu 10 dòng). */
const RECENT_TX_LIMIT = 200;

/** Số dòng log admin cấp điểm nạp vào bộ nhớ (lệnh /pot chỉ hiển thị 10 dòng). */
const RECENT_ADMIN_LOG_LIMIT = 50;

/** Kích thước pool cho mỗi instance — nhỏ, vì serverless chạy rất nhiều instance. */
const POOL_MAX_CLIENTS = 2;

// ---------------------------------------------------------------------------
// Cấu hình pool (hàm thuần — unit test được, không mở kết nối nào)
// ---------------------------------------------------------------------------

/**
 * Có cần bật TLS cho chuỗi kết nối này không.
 * - Postgres chạy ngay trên máy (localhost/127.0.0.1) → không cần TLS.
 * - `sslmode=disable` trong chuỗi kết nối → người dùng đã nói rõ là không.
 * - Còn lại (Neon, Supabase, Render...) → BẮT BUỘC TLS.
 */
function needsSsl(connectionString) {
  const value = String(connectionString || '');
  if (/[?&]sslmode=disable\b/i.test(value)) return false;
  let host = '';
  try {
    host = new URL(value).hostname;
  } catch (err) {
    host = '';
  }
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '') return false;
  return true;
}

/** Dựng cấu hình cho `new Pool(...)` — nhỏ gọn, hợp với serverless. */
function buildPoolConfig(connectionString) {
  return {
    connectionString,
    max: POOL_MAX_CLIENTS,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    // Neon/Supabase dùng chứng chỉ công khai hợp lệ → kiểm tra chứng chỉ đầy đủ.
    ssl: needsSsl(connectionString) ? { rejectUnauthorized: true } : false,
  };
}

// ---------------------------------------------------------------------------
// Pool dùng chung, cache trên globalThis để sống sót qua các lần nạp lại module
// ---------------------------------------------------------------------------

const POOL_CACHE_KEY = Symbol.for('lixi-bot.postgres.pools');

function poolCache() {
  if (!globalThis[POOL_CACHE_KEY]) {
    globalThis[POOL_CACHE_KEY] = new Map();
  }
  return globalThis[POOL_CACHE_KEY];
}

/** Lấy (hoặc tạo) pool cho một chuỗi kết nối. Dùng lại giữa các lần gọi "nóng". */
function getPool(connectionString) {
  const cache = poolCache();
  let pool = cache.get(connectionString);
  if (!pool) {
    pool = new Pool(buildPoolConfig(connectionString));
    // Không để lỗi socket nền (Neon tự ngắt kết nối rỗi) làm sập tiến trình.
    pool.on('error', (err) => {
      console.error('[postgres] Lỗi kết nối nền (sẽ tự kết nối lại):', safeErrorMessage(err));
    });
    cache.set(connectionString, pool);
  }
  return pool;
}

/** Đóng toàn bộ pool (dùng khi tắt bot cục bộ hoặc kết thúc test). */
async function closeAllPools() {
  const cache = poolCache();
  const pools = [...cache.values()];
  cache.clear();
  await Promise.all(pools.map((p) => p.end().catch(() => {})));
}

// ---------------------------------------------------------------------------
// Lược đồ (schema) — tạo lại bao nhiêu lần cũng không sao (idempotent)
// ---------------------------------------------------------------------------

/**
 * Câu lệnh tạo bảng. Tất cả đều `IF NOT EXISTS` nên gọi lại nhiều lần là vô hại —
 * điều này quan trọng vì `api/setup.js` có thể bị bấm nhiều lần, và vì mỗi lần
 * redeploy người dùng có thể chạy lại.
 *
 * `$SCHEMA$` được thay bằng tên schema thật lúc chạy (mặc định `public`; test dùng
 * một schema riêng để không đụng dữ liệu thật).
 */
const SCHEMA_STATEMENTS = [
  // --- Nhóm: pot chung + các bộ đếm id + quy tắc thưởng + cấu hình chống lạm dụng ---
  `CREATE TABLE IF NOT EXISTS $SCHEMA$.lixi_groups (
     chat_id             TEXT PRIMARY KEY,
     pot_balance         BIGINT NOT NULL DEFAULT 0 CHECK (pot_balance >= 0),
     next_tx_id          BIGINT NOT NULL DEFAULT 1,
     next_envelope_id    BIGINT NOT NULL DEFAULT 1,
     next_withdrawal_id  BIGINT NOT NULL DEFAULT 1,
     next_approval_id    BIGINT NOT NULL DEFAULT 1,
     reward_rule         JSONB,
     config              JSONB NOT NULL DEFAULT '{}'::jsonb,
     growth              JSONB NOT NULL DEFAULT '{}'::jsonb,
     created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,

  // --- Thành viên: số dư + mốc "thấy lần đầu" (tuổi tài khoản) + mốc lệnh gần nhất ---
  // CHECK (balance >= 0) là lớp bảo vệ cuối cùng chống tạo điểm từ hư không.
  `CREATE TABLE IF NOT EXISTS $SCHEMA$.lixi_members (
     chat_id         TEXT   NOT NULL REFERENCES $SCHEMA$.lixi_groups(chat_id) ON DELETE CASCADE,
     user_id         TEXT   NOT NULL,
     balance         BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
     first_seen_at   BIGINT NOT NULL,
     last_command_at BIGINT NOT NULL DEFAULT 0,
     display_name    TEXT,
     username        TEXT,
     PRIMARY KEY (chat_id, user_id)
   )`,

  // --- Bộ đếm theo ngày: hạn mức tip/ngày và số tin nhắn/ngày (thưởng hoạt động) ---
  `CREATE TABLE IF NOT EXISTS $SCHEMA$.lixi_daily_counters (
     chat_id       TEXT   NOT NULL,
     user_id       TEXT   NOT NULL,
     day           TEXT   NOT NULL,
     tip_used      BIGINT NOT NULL DEFAULT 0 CHECK (tip_used >= 0),
     message_count BIGINT NOT NULL DEFAULT 0 CHECK (message_count >= 0),
     PRIMARY KEY (chat_id, user_id, day),
     FOREIGN KEY (chat_id, user_id)
       REFERENCES $SCHEMA$.lixi_members(chat_id, user_id) ON DELETE CASCADE
   )`,

  // --- Lịch sử giao dịch (append-only) ---
  `CREATE TABLE IF NOT EXISTS $SCHEMA$.lixi_transactions (
     chat_id   TEXT   NOT NULL REFERENCES $SCHEMA$.lixi_groups(chat_id) ON DELETE CASCADE,
     id        BIGINT NOT NULL,
     ts        BIGINT NOT NULL,
     type      TEXT   NOT NULL,
     from_user TEXT,
     to_user   TEXT,
     amount    BIGINT,
     meta      JSONB  NOT NULL DEFAULT '{}'::jsonb,
     PRIMARY KEY (chat_id, id)
   )`,
  `CREATE INDEX IF NOT EXISTS lixi_tx_from_idx ON $SCHEMA$.lixi_transactions (chat_id, from_user, id DESC)`,
  `CREATE INDEX IF NOT EXISTS lixi_tx_to_idx   ON $SCHEMA$.lixi_transactions (chat_id, to_user, id DESC)`,
  // Bảng xếp hạng /bxh (giao dịch của nhóm trong 7 ngày) và /thongke (nhóm hoạt động).
  `CREATE INDEX IF NOT EXISTS lixi_tx_ts_idx   ON $SCHEMA$.lixi_transactions (chat_id, ts)`,

  // --- Yêu cầu rút ---
  `CREATE TABLE IF NOT EXISTS $SCHEMA$.lixi_withdrawals (
     chat_id    TEXT   NOT NULL REFERENCES $SCHEMA$.lixi_groups(chat_id) ON DELETE CASCADE,
     id         TEXT   NOT NULL,
     user_id    TEXT   NOT NULL,
     address    TEXT   NOT NULL,
     amount     BIGINT NOT NULL CHECK (amount > 0),
     status     TEXT   NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
     created_at BIGINT NOT NULL,
     decided_at BIGINT,
     decided_by TEXT,
     PRIMARY KEY (chat_id, id)
   )`,
  `CREATE INDEX IF NOT EXISTS lixi_withdrawals_pending_idx
     ON $SCHEMA$.lixi_withdrawals (chat_id, status)`,

  // --- Giao dịch lớn chờ admin duyệt ---
  `CREATE TABLE IF NOT EXISTS $SCHEMA$.lixi_approvals (
     chat_id    TEXT   NOT NULL REFERENCES $SCHEMA$.lixi_groups(chat_id) ON DELETE CASCADE,
     id         BIGINT NOT NULL,
     type       TEXT   NOT NULL,
     from_user  TEXT,
     to_user    TEXT,
     amount     BIGINT NOT NULL CHECK (amount > 0),
     status     TEXT   NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
     created_at BIGINT NOT NULL,
     decided_at BIGINT,
     decided_by TEXT,
     -- true = điểm người gửi đã bị trừ (giữ) lúc xếp hàng; false = bản ghi cũ, chưa giữ.
     held       BOOLEAN NOT NULL DEFAULT false,
     PRIMARY KEY (chat_id, id)
   )`,
  `CREATE INDEX IF NOT EXISTS lixi_approvals_pending_idx
     ON $SCHEMA$.lixi_approvals (chat_id, status)`,

  // --- Bao lì xì + các phần đã nhận ---
  `CREATE TABLE IF NOT EXISTS $SCHEMA$.lixi_envelopes (
     chat_id          TEXT   NOT NULL REFERENCES $SCHEMA$.lixi_groups(chat_id) ON DELETE CASCADE,
     id               TEXT   NOT NULL,
     sender_id        TEXT   NOT NULL,
     sender_name      TEXT,
     total_amount     BIGINT NOT NULL CHECK (total_amount > 0),
     total_recipients INT    NOT NULL CHECK (total_recipients > 0),
     shares           JSONB  NOT NULL,
     status           TEXT   NOT NULL CHECK (status IN ('active', 'completed', 'expired')),
     created_at       BIGINT NOT NULL,
     expires_at       BIGINT NOT NULL,
     message_id       BIGINT,
     PRIMARY KEY (chat_id, id)
   )`,
  // Chỉ mục cho "quét bao lì xì đã hết giờ" (cron hằng ngày + dọn lười khi có lệnh mới).
  `CREATE INDEX IF NOT EXISTS lixi_envelopes_due_idx
     ON $SCHEMA$.lixi_envelopes (status, expires_at)`,
  `CREATE TABLE IF NOT EXISTS $SCHEMA$.lixi_envelope_claims (
     chat_id     TEXT   NOT NULL,
     envelope_id TEXT   NOT NULL,
     user_id     TEXT   NOT NULL,
     amount      BIGINT NOT NULL CHECK (amount > 0),
     claim_index INT    NOT NULL CHECK (claim_index >= 0),
     PRIMARY KEY (chat_id, envelope_id, user_id),
     UNIQUE (chat_id, envelope_id, claim_index),
     FOREIGN KEY (chat_id, envelope_id)
       REFERENCES $SCHEMA$.lixi_envelopes(chat_id, id) ON DELETE CASCADE
   )`,

  // --- Dấu mốc "đã phát thưởng ngày X cho nhóm Y" (chống phát thưởng hai lần) ---
  // Khoá chính (chat_id, day) chính là ràng buộc idempotency ở mức database: kể cả khi
  // cron bị gọi hai lần cùng lúc, chỉ một transaction chèn được dòng này.
  `CREATE TABLE IF NOT EXISTS $SCHEMA$.lixi_reward_runs (
     chat_id TEXT   NOT NULL REFERENCES $SCHEMA$.lixi_groups(chat_id) ON DELETE CASCADE,
     day     TEXT   NOT NULL,
     grants  JSONB  NOT NULL DEFAULT '{}'::jsonb,
     ran_at  BIGINT NOT NULL,
     PRIMARY KEY (chat_id, day)
   )`,

  // --- Log admin nạp pot / cấp điểm thủ công ---
  `CREATE TABLE IF NOT EXISTS $SCHEMA$.lixi_admin_credit_log (
     chat_id  TEXT   NOT NULL REFERENCES $SCHEMA$.lixi_groups(chat_id) ON DELETE CASCADE,
     seq      BIGSERIAL,
     ts       BIGINT NOT NULL,
     admin_id TEXT   NOT NULL,
     target   TEXT   NOT NULL,
     amount   BIGINT NOT NULL,
     note     TEXT,
     PRIMARY KEY (chat_id, seq)
   )`,
];

/**
 * DI TRÚ CỘNG THÊM (additive migration) — CHO DATABASE ĐÃ TỒN TẠI.
 *
 * VÌ SAO PHẢI CÓ RIÊNG: mọi câu ở `SCHEMA_STATEMENTS` đều là `CREATE TABLE IF NOT
 * EXISTS`. Trên một database ĐÃ được tạo bởi bản deploy trước, câu đó KHÔNG làm gì cả —
 * nên một cột mới thêm vào phần `CREATE TABLE` sẽ không bao giờ xuất hiện ở đó. Muốn
 * database cũ có cột mới thì phải `ALTER TABLE ... ADD COLUMN`.
 *
 * QUY TẮC cho mọi câu đặt ở đây:
 *   1. Chỉ THÊM (add column, add index). TUYỆT ĐỐI không DROP/RENAME/đổi kiểu cột, không
 *      tạo lại bảng — số dư của người dùng đang nằm trong đó.
 *   2. Luôn `IF NOT EXISTS` để chạy lại bao nhiêu lần cũng vô hại (idempotent).
 *   3. Cột mới phải cho phép NULL (hoặc có DEFAULT) — các dòng cũ không có giá trị, và
 *      code phải đọc được dòng thiếu giá trị mà không lỗi.
 *
 * Được chạy ở hai chỗ: `ensureSchema()` (khi mở `/api/setup`) và một lần cho mỗi tiến
 * trình ngay trước thao tác ghi đầu tiên (`_ensureAdditiveMigrations`), nên một bản
 * deploy cũ tự có cột mới ở lần "khởi động nguội" (cold start) kế tiếp.
 */
const MIGRATION_STATEMENTS = [
  // Tên hiển thị của thành viên (2026-09) — để tin nhắn gọi tên thay vì số id Telegram.
  `ALTER TABLE $SCHEMA$.lixi_members ADD COLUMN IF NOT EXISTS display_name TEXT`,
  `ALTER TABLE $SCHEMA$.lixi_members ADD COLUMN IF NOT EXISTS username TEXT`,
  // Tip lớn chờ duyệt giữ điểm người gửi ngay khi xếp hàng (2026-09) — xem
  // `queueTipApproval` trong ledger.js. Dòng cũ mặc định false = chưa giữ.
  `ALTER TABLE $SCHEMA$.lixi_approvals ADD COLUMN IF NOT EXISTS held BOOLEAN NOT NULL DEFAULT false`,
  // Trạng thái tăng trưởng của nhóm (2026-09): bot còn trong nhóm, đã chào mừng, nhóm
  // nguồn giới thiệu — xem `defaultGrowth` (store.js) và `src/growth.js`.
  // (Chỉ mục `lixi_tx_ts_idx` cho /bxh KHÔNG nằm ở đây — danh sách này chỉ gồm ADD COLUMN;
  // chỉ mục là tối ưu, được tạo khi mở /api/setup vì `ensureSchema` chạy lại SCHEMA_STATEMENTS.)
  `ALTER TABLE $SCHEMA$.lixi_groups ADD COLUMN IF NOT EXISTS growth JSONB NOT NULL DEFAULT '{}'::jsonb`,
];

/**
 * Cache "đã chạy di trú cộng thêm" theo (chuỗi kết nối + schema), dùng chung cho cả
 * tiến trình. Giá trị là Promise<boolean>: true = các cột mới chắc chắn có.
 */
const migrationCache = new Map();

function migrationCacheKey(connectionString, schema) {
  return `${connectionString}::${schema}`;
}

/** Tên schema chỉ được chứa chữ/số/gạch dưới — chặn SQL injection qua biến môi trường. */
function assertSafeSchemaName(schema) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(String(schema))) {
    throw new Error(`Tên schema Postgres không hợp lệ: ${schema}`);
  }
  return schema;
}

// ---------------------------------------------------------------------------
// Chuyển đổi giữa hàng trong database và "state" của nhóm (cùng hình dạng với
// store.defaultGroupState, để dùng lại 100% hàm thuần trong ledger.js)
// ---------------------------------------------------------------------------

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Một hàng `lixi_transactions` → bản ghi giao dịch cùng hình dạng với kho JSON. */
function rowToTransaction(row) {
  return {
    id: toNumber(row.id),
    ts: toNumber(row.ts),
    type: row.type,
    ...(row.from_user ? { from: row.from_user } : {}),
    ...(row.to_user ? { to: row.to_user } : {}),
    ...(row.amount === null ? {} : { amount: toNumber(row.amount) }),
    ...(row.meta || {}),
  };
}

/** Ngày hôm nay + hôm qua (UTC) — luôn phải nạp để hạn mức/ngày tính đúng. */
function defaultDays(nowMs = Date.now()) {
  return [ledger.dateKey(nowMs - ledger.DAY_MS), ledger.dateKey(nowMs)];
}

// ---------------------------------------------------------------------------
// PostgresLedger
// ---------------------------------------------------------------------------

class PostgresLedger {
  /**
   * @param {string} connectionString chuỗi kết nối Postgres (xem src/storage.js).
   * @param {{schema?: string}} options schema riêng (test dùng để cách ly dữ liệu).
   */
  constructor(connectionString, { schema = 'public' } = {}) {
    if (!connectionString) {
      throw new Error('PostgresLedger: thiếu chuỗi kết nối Postgres.');
    }
    this.connectionString = connectionString;
    this.schema = assertSafeSchemaName(schema);
    this.kind = 'postgres';
  }

  get pool() {
    return getPool(this.connectionString);
  }

  /**
   * Tạo toàn bộ bảng nếu chưa có, RỒI thêm những cột mới vào các bảng đã tồn tại từ
   * bản deploy trước (xem `MIGRATION_STATEMENTS`). Gọi lại bao nhiêu lần cũng an toàn
   * (idempotent) và KHÔNG xoá/tạo lại gì — số dư đang có không bị ảnh hưởng.
   */
  async ensureSchema() {
    const client = await this.pool.connect();
    try {
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${this.schema}`);
      for (const statement of SCHEMA_STATEMENTS) {
        await client.query(statement.split('$SCHEMA$').join(this.schema));
      }
      // Database cũ: bảng đã có nên CREATE TABLE IF NOT EXISTS ở trên không làm gì —
      // các cột thêm sau này chỉ vào được bằng ALTER TABLE ADD COLUMN IF NOT EXISTS.
      for (const statement of MIGRATION_STATEMENTS) {
        await client.query(statement.split('$SCHEMA$').join(this.schema));
      }
    } finally {
      client.release();
    }
    // Đã chắc chắn có các cột mới -> khỏi chạy lại phần di trú lười bên dưới.
    migrationCache.set(
      migrationCacheKey(this.connectionString, this.schema),
      Promise.resolve(true)
    );
    return { ok: true, schema: this.schema };
  }

  /**
   * Chạy phần di trú cộng thêm MỘT LẦN cho mỗi tiến trình, trước thao tác ghi đầu tiên.
   * Trả về true khi MỌI cột mới (tên thành viên, cờ `held` của giao dịch chờ duyệt)
   * chắc chắn đã có.
   *
   * Vì sao cần: trên Vercel, `ensureSchema()` chỉ chạy khi ai đó mở `/api/setup`. Nếu
   * chỉ dựa vào đó thì một bản deploy đã có database cũ sẽ thiếu cột mới cho tới khi
   * chủ bot nhớ mở trang cài đặt. Ở đây bot tự thêm cột ở lần khởi động nguội kế tiếp.
   *
   * KHÔNG BAO GIỜ ném lỗi ra ngoài: nếu ALTER TABLE thất bại (chưa có bảng, hoặc tài
   * khoản database không có quyền ALTER) thì trả về `false` và lớp ghi bên dưới tự
   * dùng câu lệnh KHÔNG có cột mới — bot vẫn chạy đúng, chỉ là chưa hiện được tên.
   *
   * @returns {Promise<boolean>} các cột mới đã chắc chắn tồn tại chưa.
   */
  _ensureAdditiveMigrations() {
    const key = migrationCacheKey(this.connectionString, this.schema);
    const cached = migrationCache.get(key);
    if (cached) return cached;
    const schema = this.schema;
    const promise = (async () => {
      const client = await this.pool.connect();
      try {
        for (const statement of MIGRATION_STATEMENTS) {
          await client.query(statement.split('$SCHEMA$').join(schema));
        }
        return true;
      } finally {
        client.release();
      }
    })().catch((err) => {
      console.error(
        'Không thêm được cột mới vào bảng lixi_members (bot vẫn chạy, tạm thời hiện ' +
          'số id thay cho tên). Mở /api/setup để thử lại:',
        safeErrorMessage(err)
      );
      return false;
    });
    migrationCache.set(key, promise);
    return promise;
  }

  /** Xoá toàn bộ bảng (CHỈ dùng trong test — không có lệnh bot nào gọi hàm này). */
  async dropSchema() {
    const client = await this.pool.connect();
    try {
      await client.query(`DROP SCHEMA IF EXISTS ${this.schema} CASCADE`);
    } finally {
      client.release();
    }
    // Bảng vừa bị xoá -> "đã di trú" không còn đúng nữa.
    migrationCache.delete(migrationCacheKey(this.connectionString, this.schema));
  }

  async close() {
    // Pool dùng chung theo chuỗi kết nối; đóng tất cả (chỉ gọi lúc tắt tiến trình/test).
    await closeAllPools();
  }

  // -------------------------------------------------------------------------
  // Cỗ máy trung tâm: một transaction + khoá hàng + nạp state + ghi lại phần đổi
  // -------------------------------------------------------------------------

  /**
   * Mở transaction, KHOÁ nhóm (và các thành viên của nhóm), nạp state, cho `mutator`
   * sửa trực tiếp trên state đó (đúng như `store.withGroupState` của bản JSON), rồi
   * ghi lại những gì đã đổi và COMMIT.
   *
   * Nếu `mutator` ném lỗi → ROLLBACK, không có gì thay đổi trong database.
   *
   * @param {string|number} chatId
   * @param {(state: object) => any} mutator hàm đồng bộ, sửa state tại chỗ
   * @param {{days?: string[], envelopeIds?: string[], withdrawalIds?: string[],
   *          approvalIds?: (string|number)[], nowMs?: number}} [opts]
   *        `days`: các ngày (YYYY-MM-DD) cần nạp bộ đếm/dấu mốc thưởng.
   *        `envelopeIds`/`withdrawalIds`/`approvalIds`: nạp thêm bản ghi đã đóng
   *        theo mã cụ thể (mặc định chỉ nạp bản ghi đang mở/đang chờ).
   */
  async withGroup(chatId, mutator, opts = {}) {
    const key = String(chatId);
    // Thêm cột mới cho database cũ — một lần cho mỗi tiến trình, NGOÀI transaction
    // (ALTER TABLE khoá bảng rất ngắn, không nên nằm trong transaction đang giữ khoá
    // hàng của nhóm). Không bao giờ ném lỗi: false = ghi theo lược đồ cũ.
    const migrated = await this._ensureAdditiveMigrations();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { state, snapshot } = await this._loadState(client, key, opts);
      const result = mutator(state);
      await this._persist(client, key, state, snapshot, { migrated });
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        // Kết nối có thể đã hỏng — lỗi gốc mới là thứ cần báo ra ngoài.
      }
      throw err;
    } finally {
      client.release();
    }
  }

  /** Đọc state mà KHÔNG sửa gì (dùng cho các lệnh chỉ xem: /sodu, /lichsu, /pot). */
  async readGroup(chatId, opts = {}) {
    const client = await this.pool.connect();
    try {
      // Vẫn dùng transaction để ảnh chụp dữ liệu nhất quán, nhưng không khoá ghi.
      await client.query('BEGIN READ ONLY');
      const { state } = await this._loadState(client, String(chatId), { ...opts, lock: false });
      await client.query('COMMIT');
      return state;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        /* bỏ qua */
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async listGroupIds() {
    const { rows } = await this.pool.query(
      `SELECT chat_id FROM ${this.schema}.lixi_groups ORDER BY chat_id`
    );
    return rows.map((r) => r.chat_id);
  }

  // -------------------------------------------------------------------------
  // Nạp state từ database
  // -------------------------------------------------------------------------

  async _loadState(client, chatId, opts) {
    const s = this.schema;
    const lock = opts.lock !== false;
    const nowMs = opts.nowMs || Date.now();
    const days = [...new Set([...defaultDays(nowMs), ...(opts.days || [])])];
    const envelopeIds = (opts.envelopeIds || []).map(String);
    const withdrawalIds = (opts.withdrawalIds || []).map(String);
    const approvalIds = (opts.approvalIds || []).map((x) => Number(x)).filter(Number.isFinite);

    const state = defaultGroupState(chatId);

    // 1) Hàng nhóm — tạo nếu chưa có, rồi KHOÁ. Đây là điểm serialize mọi thao tác
    //    trong cùng một nhóm (xem phần "MÔ HÌNH AN TOÀN" ở đầu file).
    if (lock) {
      await client.query(
        `INSERT INTO ${s}.lixi_groups (chat_id, config) VALUES ($1, $2::jsonb)
         ON CONFLICT (chat_id) DO NOTHING`,
        [chatId, JSON.stringify(defaultConfig())]
      );
    }
    const groupRes = await client.query(
      `SELECT * FROM ${s}.lixi_groups WHERE chat_id = $1${lock ? ' FOR UPDATE' : ''}`,
      [chatId]
    );
    const groupRow = groupRes.rows[0] || null;
    if (groupRow) {
      state.pot = { balance: toNumber(groupRow.pot_balance) };
      state.nextTxId = toNumber(groupRow.next_tx_id, 1);
      state.nextEnvelopeId = toNumber(groupRow.next_envelope_id, 1);
      state.nextWithdrawalId = toNumber(groupRow.next_withdrawal_id, 1);
      state.nextApprovalId = toNumber(groupRow.next_approval_id, 1);
      state.rewardRule = groupRow.reward_rule || null;
      state.config = { ...defaultConfig(), ...(groupRow.config || {}) };
      // Database cũ chưa có cột `growth` (undefined) → giữ mặc định.
      state.growth = { ...defaultGrowth(), ...(groupRow.growth || {}) };
    }

    // 2) Thành viên — KHOÁ luôn để không ai sửa số dư song song.
    const memberRes = await client.query(
      `SELECT * FROM ${s}.lixi_members WHERE chat_id = $1 ORDER BY user_id${
        lock ? ' FOR UPDATE' : ''
      }`,
      [chatId]
    );
    for (const row of memberRes.rows) {
      state.members[row.user_id] = {
        userId: row.user_id,
        balance: toNumber(row.balance),
        firstSeenAt: toNumber(row.first_seen_at),
        lastCommandAt: toNumber(row.last_command_at),
        // `?? null`: database cũ chưa có cột này (row.display_name là `undefined`) và
        // các dòng cũ chưa có tên (NULL) — cả hai đều thành null, `memberLabel` tự
        // dùng bản dự phòng "người dùng #<id>" cho tới khi gặp lại người đó.
        displayName: row.display_name ?? null,
        username: row.username ?? null,
        dailyTipUsed: {},
        messageCounts: {},
      };
    }

    // 3) Bộ đếm theo ngày (chỉ các ngày cần dùng — dữ liệu cũ để yên trong database).
    const counterRes = await client.query(
      `SELECT * FROM ${s}.lixi_daily_counters WHERE chat_id = $1 AND day = ANY($2::text[])`,
      [chatId, days]
    );
    for (const row of counterRes.rows) {
      const member = state.members[row.user_id];
      if (!member) continue;
      if (toNumber(row.tip_used) > 0) member.dailyTipUsed[row.day] = toNumber(row.tip_used);
      if (toNumber(row.message_count) > 0) member.messageCounts[row.day] = toNumber(row.message_count);
    }

    // 4) Lịch sử giao dịch — chỉ vài trăm dòng gần nhất (lệnh /lichsu chỉ hiện 10).
    const txRes = await client.query(
      `SELECT * FROM (
         SELECT * FROM ${s}.lixi_transactions WHERE chat_id = $1 ORDER BY id DESC LIMIT $2
       ) recent ORDER BY id ASC`,
      [chatId, RECENT_TX_LIMIT]
    );
    state.transactions = txRes.rows.map(rowToTransaction);

    // 5) Bao lì xì: các bao đang mở + bao được hỏi đích danh (để render lại tin nhắn).
    const envRes = await client.query(
      `SELECT * FROM ${s}.lixi_envelopes
        WHERE chat_id = $1 AND (status = 'active' OR id = ANY($2::text[]))`,
      [chatId, envelopeIds]
    );
    const envIds = envRes.rows.map((r) => r.id);
    const claimRes = envIds.length
      ? await client.query(
          `SELECT * FROM ${s}.lixi_envelope_claims
            WHERE chat_id = $1 AND envelope_id = ANY($2::text[])
            ORDER BY claim_index ASC`,
          [chatId, envIds]
        )
      : { rows: [] };
    for (const row of envRes.rows) {
      state.envelopes[row.id] = {
        id: row.id,
        senderId: row.sender_id,
        senderName: row.sender_name,
        totalAmount: toNumber(row.total_amount),
        totalRecipients: toNumber(row.total_recipients),
        shares: row.shares || [],
        claims: {},
        claimOrder: [],
        status: row.status,
        createdAt: toNumber(row.created_at),
        expiresAt: toNumber(row.expires_at),
        messageId: row.message_id === null ? null : toNumber(row.message_id),
      };
    }
    for (const row of claimRes.rows) {
      const envelope = state.envelopes[row.envelope_id];
      if (!envelope) continue;
      envelope.claims[row.user_id] = toNumber(row.amount);
      envelope.claimOrder.push(row.user_id);
    }

    // 6) Yêu cầu rút: đang chờ + hỏi đích danh.
    const wdRes = await client.query(
      `SELECT * FROM ${s}.lixi_withdrawals
        WHERE chat_id = $1 AND (status = 'pending' OR id = ANY($2::text[]))
        ORDER BY created_at ASC`,
      [chatId, withdrawalIds]
    );
    state.withdrawals = wdRes.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      address: row.address,
      amount: toNumber(row.amount),
      status: row.status,
      createdAt: toNumber(row.created_at),
      decidedAt: row.decided_at === null ? null : toNumber(row.decided_at),
      decidedBy: row.decided_by,
    }));

    // 7) Giao dịch lớn chờ duyệt: đang chờ + hỏi đích danh.
    const apRes = await client.query(
      `SELECT * FROM ${s}.lixi_approvals
        WHERE chat_id = $1 AND (status = 'pending' OR id = ANY($2::bigint[]))
        ORDER BY id ASC`,
      [chatId, approvalIds]
    );
    state.pendingApprovals = apRes.rows.map((row) => ({
      id: toNumber(row.id),
      type: row.type,
      fromUserId: row.from_user,
      toUserId: row.to_user,
      amount: toNumber(row.amount),
      status: row.status,
      createdAt: toNumber(row.created_at),
      // Database cũ chưa có cột (undefined) hoặc dòng cũ (false): coi như chưa giữ điểm.
      held: row.held === true,
      ...(row.decided_at === null ? {} : { decidedAt: toNumber(row.decided_at) }),
      ...(row.decided_by === null ? {} : { decidedBy: row.decided_by }),
    }));

    // 8) Dấu mốc đã phát thưởng cho các ngày quan tâm.
    const rewardRes = await client.query(
      `SELECT day, grants FROM ${s}.lixi_reward_runs WHERE chat_id = $1 AND day = ANY($2::text[])`,
      [chatId, days]
    );
    for (const row of rewardRes.rows) {
      state.rewardGrants[row.day] = row.grants || {};
    }

    // 9) Log admin cấp điểm (chỉ để hiển thị).
    const logRes = await client.query(
      `SELECT * FROM (
         SELECT * FROM ${s}.lixi_admin_credit_log WHERE chat_id = $1 ORDER BY seq DESC LIMIT $2
       ) recent ORDER BY seq ASC`,
      [chatId, RECENT_ADMIN_LOG_LIMIT]
    );
    state.adminCreditLog = logRes.rows.map((row) => ({
      ts: toNumber(row.ts),
      adminId: row.admin_id,
      target: row.target,
      amount: toNumber(row.amount),
      note: row.note,
    }));

    return { state, snapshot: snapshotOf(state) };
  }

  // -------------------------------------------------------------------------
  // Ghi lại phần đã thay đổi
  // -------------------------------------------------------------------------

  async _persist(client, chatId, state, snapshot, { migrated = true } = {}) {
    // `migrated` = các cột thêm sau này (tên thành viên, cờ `held`) đã có trong bảng.
    const hasNameColumns = migrated;
    const s = this.schema;

    // --- Nhóm (pot, các bộ đếm id, quy tắc thưởng, cấu hình, trạng thái tăng trưởng) ---
    // Cột `growth` chỉ có sau di trú cộng thêm; database cũ chưa di trú được thì ghi theo
    // lược đồ cũ (mất phần tăng trưởng, KHÔNG mất điểm).
    await client.query(
      `INSERT INTO ${s}.lixi_groups
         (chat_id, pot_balance, next_tx_id, next_envelope_id, next_withdrawal_id,
          next_approval_id, reward_rule, config, updated_at${migrated ? ', growth' : ''})
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, now()${migrated ? ', $9::jsonb' : ''})
       ON CONFLICT (chat_id) DO UPDATE SET
         pot_balance        = EXCLUDED.pot_balance,
         next_tx_id         = EXCLUDED.next_tx_id,
         next_envelope_id   = EXCLUDED.next_envelope_id,
         next_withdrawal_id = EXCLUDED.next_withdrawal_id,
         next_approval_id   = EXCLUDED.next_approval_id,
         reward_rule        = EXCLUDED.reward_rule,
         config             = EXCLUDED.config,
         updated_at         = now()${migrated ? ',\n         growth             = EXCLUDED.growth' : ''}`,
      [
        chatId,
        ledger.getPotBalance(state),
        state.nextTxId,
        state.nextEnvelopeId,
        state.nextWithdrawalId,
        state.nextApprovalId,
        state.rewardRule ? JSON.stringify(state.rewardRule) : null,
        JSON.stringify(state.config || {}),
        ...(migrated ? [JSON.stringify({ ...defaultGrowth(), ...(state.growth || {}) })] : []),
      ]
    );

    // --- Thành viên: chỉ ghi những người có thay đổi.
    //     CHECK (balance >= 0) ở đây sẽ huỷ cả transaction nếu số dư âm lọt xuống. ---
    for (const [userId, member] of Object.entries(state.members || {})) {
      const before = snapshot.members[userId];
      const displayName = ledger.normalizeDisplayName(member.displayName);
      const username = ledger.normalizeDisplayName(member.username);
      if (
        before &&
        before.balance === member.balance &&
        before.firstSeenAt === member.firstSeenAt &&
        before.lastCommandAt === member.lastCommandAt &&
        (!hasNameColumns ||
          (before.displayName === displayName && before.username === username))
      ) {
        // không đổi gì ở phần số dư / tên — vẫn phải kiểm tra bộ đếm ngày bên dưới
      } else if (hasNameColumns) {
        await client.query(
          `INSERT INTO ${s}.lixi_members
             (chat_id, user_id, balance, first_seen_at, last_command_at, display_name, username)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (chat_id, user_id) DO UPDATE SET
             balance         = EXCLUDED.balance,
             first_seen_at   = LEAST(${s}.lixi_members.first_seen_at, EXCLUDED.first_seen_at),
             last_command_at = GREATEST(${s}.lixi_members.last_command_at, EXCLUDED.last_command_at),
             -- COALESCE: một lần ghi không kèm tên KHÔNG được xoá tên đã biết.
             display_name    = COALESCE(EXCLUDED.display_name, ${s}.lixi_members.display_name),
             username        = COALESCE(EXCLUDED.username, ${s}.lixi_members.username)`,
          [chatId, userId, member.balance, member.firstSeenAt, member.lastCommandAt, displayName, username]
        );
      } else {
        // Database cũ chưa thêm được cột tên (xem `_ensureAdditiveMigrations`): ghi
        // theo lược đồ cũ để số dư vẫn đúng, tên sẽ được ghi sau khi di trú xong.
        await client.query(
          `INSERT INTO ${s}.lixi_members (chat_id, user_id, balance, first_seen_at, last_command_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (chat_id, user_id) DO UPDATE SET
             balance         = EXCLUDED.balance,
             first_seen_at   = LEAST(${s}.lixi_members.first_seen_at, EXCLUDED.first_seen_at),
             last_command_at = GREATEST(${s}.lixi_members.last_command_at, EXCLUDED.last_command_at)`,
          [chatId, userId, member.balance, member.firstSeenAt, member.lastCommandAt]
        );
      }

      // --- Bộ đếm theo ngày ---
      const beforeCounters = before || { dailyTipUsed: {}, messageCounts: {} };
      const days = new Set([
        ...Object.keys(member.dailyTipUsed || {}),
        ...Object.keys(member.messageCounts || {}),
      ]);
      for (const day of days) {
        const tipUsed = (member.dailyTipUsed || {})[day] || 0;
        const messageCount = (member.messageCounts || {})[day] || 0;
        const wasTip = (beforeCounters.dailyTipUsed || {})[day] || 0;
        const wasMsg = (beforeCounters.messageCounts || {})[day] || 0;
        if (tipUsed === wasTip && messageCount === wasMsg) continue;
        await client.query(
          `INSERT INTO ${s}.lixi_daily_counters (chat_id, user_id, day, tip_used, message_count)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (chat_id, user_id, day) DO UPDATE SET
             tip_used      = EXCLUDED.tip_used,
             message_count = EXCLUDED.message_count`,
          [chatId, userId, day, tipUsed, messageCount]
        );
      }
    }

    // --- Giao dịch mới (id >= nextTxId lúc nạp) ---
    for (const tx of state.transactions || []) {
      if (tx.id < snapshot.nextTxId) continue;
      const { id, ts, type, from, to, amount, ...meta } = tx;
      await client.query(
        `INSERT INTO ${s}.lixi_transactions (chat_id, id, ts, type, from_user, to_user, amount, meta)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
         ON CONFLICT (chat_id, id) DO NOTHING`,
        [
          chatId,
          id,
          ts,
          type,
          from === undefined ? null : String(from),
          to === undefined ? null : String(to),
          amount === undefined ? null : amount,
          JSON.stringify(meta),
        ]
      );
    }

    // --- Bao lì xì (thêm mới hoặc đổi trạng thái/messageId) ---
    for (const envelope of Object.values(state.envelopes || {})) {
      const before = snapshot.envelopes[envelope.id];
      if (
        !before ||
        before.status !== envelope.status ||
        before.messageId !== envelope.messageId
      ) {
        await client.query(
          `INSERT INTO ${s}.lixi_envelopes
             (chat_id, id, sender_id, sender_name, total_amount, total_recipients,
              shares, status, created_at, expires_at, message_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11)
           ON CONFLICT (chat_id, id) DO UPDATE SET
             status     = EXCLUDED.status,
             message_id = EXCLUDED.message_id`,
          [
            chatId,
            envelope.id,
            envelope.senderId,
            envelope.senderName,
            envelope.totalAmount,
            envelope.totalRecipients,
            JSON.stringify(envelope.shares),
            envelope.status,
            envelope.createdAt,
            envelope.expiresAt,
            envelope.messageId,
          ]
        );
      }
      // --- Phần lì xì mới được nhận ---
      const beforeClaims = (before && before.claimOrder) || [];
      for (let i = beforeClaims.length; i < envelope.claimOrder.length; i++) {
        const userId = envelope.claimOrder[i];
        await client.query(
          `INSERT INTO ${s}.lixi_envelope_claims (chat_id, envelope_id, user_id, amount, claim_index)
           VALUES ($1, $2, $3, $4, $5)`,
          [chatId, envelope.id, userId, envelope.claims[userId], i]
        );
      }
    }

    // --- Yêu cầu rút (mới hoặc đổi trạng thái) ---
    for (const w of state.withdrawals || []) {
      const before = snapshot.withdrawals[w.id];
      if (before && before.status === w.status) continue;
      await client.query(
        `INSERT INTO ${s}.lixi_withdrawals
           (chat_id, id, user_id, address, amount, status, created_at, decided_at, decided_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (chat_id, id) DO UPDATE SET
           status     = EXCLUDED.status,
           decided_at = EXCLUDED.decided_at,
           decided_by = EXCLUDED.decided_by`,
        [chatId, w.id, w.userId, w.address, w.amount, w.status, w.createdAt, w.decidedAt, w.decidedBy]
      );
    }

    // --- Giao dịch lớn chờ duyệt (mới hoặc đổi trạng thái) ---
    for (const a of state.pendingApprovals || []) {
      const before = snapshot.approvals[String(a.id)];
      if (before && before.status === a.status) continue;
      if (!before && a.held && !migrated) {
        // Không có cột `held` thì lần đọc sau sẽ coi bản ghi này là "chưa giữ điểm" và
        // /duyet sẽ trừ người gửi LẦN HAI. Thà từ chối cả giao dịch (ROLLBACK, không
        // trừ gì) còn hơn ghi một bản ghi sai.
        throw new Error(
          'Không ghi được giao dịch chờ duyệt: bảng lixi_approvals chưa có cột `held`. ' +
            'Mở /api/setup để cập nhật lược đồ rồi thử lại.'
        );
      }
      await client.query(
        `INSERT INTO ${s}.lixi_approvals
           (chat_id, id, type, from_user, to_user, amount, status, created_at, decided_at, decided_by${
             migrated ? ', held' : ''
           })
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10${migrated ? ', $11' : ''})
         ON CONFLICT (chat_id, id) DO UPDATE SET
           status     = EXCLUDED.status,
           decided_at = EXCLUDED.decided_at,
           decided_by = EXCLUDED.decided_by`,
        [
          chatId,
          a.id,
          a.type,
          a.fromUserId === undefined ? null : a.fromUserId,
          a.toUserId === undefined ? null : a.toUserId,
          a.amount,
          a.status,
          a.createdAt,
          a.decidedAt === undefined ? null : a.decidedAt,
          a.decidedBy === undefined ? null : a.decidedBy,
          ...(migrated ? [a.held === true] : []),
        ]
      );
    }

    // --- Dấu mốc phát thưởng theo ngày (khoá chính chat_id+day = chống phát 2 lần) ---
    for (const [day, grants] of Object.entries(state.rewardGrants || {})) {
      if (Object.prototype.hasOwnProperty.call(snapshot.rewardGrants, day)) continue;
      await client.query(
        `INSERT INTO ${s}.lixi_reward_runs (chat_id, day, grants, ran_at)
         VALUES ($1, $2, $3::jsonb, $4)
         ON CONFLICT (chat_id, day) DO NOTHING`,
        [chatId, day, JSON.stringify(grants), Date.now()]
      );
    }

    // --- Log admin cấp điểm (chỉ thêm dòng mới) ---
    for (let i = snapshot.adminCreditLogLength; i < (state.adminCreditLog || []).length; i++) {
      const entry = state.adminCreditLog[i];
      await client.query(
        `INSERT INTO ${s}.lixi_admin_credit_log (chat_id, ts, admin_id, target, amount, note)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [chatId, entry.ts, entry.adminId, entry.target, entry.amount, entry.note || null]
      );
    }
  }

  // =========================================================================
  // Interface "Ledger" (xem đầu src/ledger.js) — bản bất đồng bộ.
  // Mọi phương thức đổi tiền đều chạy trong transaction + khoá hàng.
  // =========================================================================

  async getBalance(chatId, userId) {
    const { rows } = await this.pool.query(
      `SELECT balance FROM ${this.schema}.lixi_members WHERE chat_id = $1 AND user_id = $2`,
      [String(chatId), String(userId)]
    );
    return rows.length ? toNumber(rows[0].balance) : 0;
  }

  async credit(chatId, userId, amount, meta = {}, nowMs = Date.now()) {
    return this.withGroup(
      chatId,
      (state) => ledger.creditPure(state, userId, amount, meta, nowMs),
      { nowMs }
    );
  }

  async debit(chatId, userId, amount, meta = {}, nowMs = Date.now()) {
    return this.withGroup(
      chatId,
      (state) => ledger.debitPure(state, userId, amount, meta, nowMs),
      { nowMs }
    );
  }

  async transfer(chatId, fromUserId, toUserId, amount, meta = {}, nowMs = Date.now()) {
    return this.withGroup(
      chatId,
      (state) => ledger.transferPure(state, fromUserId, toUserId, amount, meta, nowMs),
      { nowMs }
    );
  }

  async recordTransaction(chatId, tx, nowMs = Date.now()) {
    return this.withGroup(chatId, (state) => ledger.recordTransactionPure(state, tx, nowMs), {
      nowMs,
    });
  }

  /**
   * Giao dịch gần nhất liên quan tới userId (gửi hoặc nhận), mới nhất trước.
   *
   * Truy vấn thẳng vào database thay vì lọc trong bộ nhớ: state nạp theo nhóm chỉ giữ
   * `RECENT_TX_LIMIT` giao dịch gần nhất của CẢ NHÓM, nên với nhóm đông người, 10 giao
   * dịch gần nhất của một người có thể đã nằm ngoài cửa sổ đó. Hai chỉ mục
   * `lixi_tx_from_idx` / `lixi_tx_to_idx` phục vụ đúng truy vấn này.
   */
  async listRecentTransactions(chatId, userId, limit = 10) {
    const key = String(userId);
    const { rows } = await this.pool.query(
      `SELECT * FROM ${this.schema}.lixi_transactions
        WHERE chat_id = $1 AND (from_user = $2 OR to_user = $2)
        ORDER BY id DESC
        LIMIT $3`,
      [String(chatId), key, Math.max(1, Number(limit) || 10)]
    );
    return rows.map(rowToTransaction);
  }

  /**
   * Giao dịch của nhóm kể từ mốc `sinceMs` (tuỳ chọn lọc theo loại), cũ nhất trước.
   * Truy vấn thẳng database (chỉ mục `lixi_tx_ts_idx`) thay vì lọc `RECENT_TX_LIMIT`
   * giao dịch trong bộ nhớ: nhóm sôi nổi có thể vượt 200 giao dịch trong 7 ngày, và bảng
   * xếp hạng /bxh phải ĐÚNG trước đã.
   */
  async listTransactionsSince(chatId, sinceMs, types = null) {
    const params = [String(chatId), Number(sinceMs) || 0];
    let typeFilter = '';
    if (Array.isArray(types) && types.length) {
      params.push(types.map(String));
      typeFilter = ` AND type = ANY($${params.length}::text[])`;
    }
    const { rows } = await this.pool.query(
      `SELECT * FROM ${this.schema}.lixi_transactions
        WHERE chat_id = $1 AND ts >= $2${typeFilter}
        ORDER BY id ASC`,
      params
    );
    return rows.map(rowToTransaction);
  }

  /**
   * Thống kê tăng trưởng cho chủ bot (/thongke) — CHỈ SỐ ĐẾM, gộp toàn bộ nhóm bằng một
   * truy vấn (không nạp state từng nhóm). Định nghĩa từng con số PHẢI khớp với
   * `growth.aggregateGrowthStats` (kho JSON):
   *   - groupsTotal:     nhóm có bot (loại nhóm mà update my_chat_member gần nhất báo bot đã
   *                      rời/bị gỡ; nhóm chưa rõ trạng thái tính là còn).
   *   - groupsActive:    nhóm có ít nhất một giao dịch kể từ `sinceMs`.
   *   - membersSeen:     số người khác nhau đã thấy trên mọi nhóm.
   *   - envelopesOpened: bao lì xì tạo kể từ `sinceMs`.
   *   - pointsTipped:    tổng điểm tip kể từ `sinceMs`; mỗi bản ghi 'tip' là một lần tip,
   *                      đếm trọn `amount` (cùng quy tắc với `receivedTotals` trong ledger.js).
   *   - groupsReferred:  nhóm có `growth.referredByChatId` (đến từ nút "Thêm vào nhóm").
   */
  async growthStats(sinceMs) {
    const s = this.schema;
    const since = Number(sinceMs) || 0;
    // Không có cột `growth` (database cũ chưa di trú được) thì hai con số dựa vào nó
    // dùng giá trị "không biết": mọi nhóm đều tính là còn bot, không nhóm nào là giới thiệu.
    const migrated = await this._ensureAdditiveMigrations();
    const groupsTotalSql = migrated
      ? `SELECT COUNT(*) FROM ${s}.lixi_groups
           WHERE COALESCE(growth->>'botStatus', '') NOT IN ('left', 'kicked')`
      : `SELECT COUNT(*) FROM ${s}.lixi_groups`;
    const groupsReferredSql = migrated
      ? `SELECT COUNT(*) FROM ${s}.lixi_groups WHERE growth->>'referredByChatId' IS NOT NULL`
      : `SELECT 0`;
    const { rows } = await this.pool.query(
      `SELECT
         (${groupsTotalSql}) AS groups_total,
         (${groupsReferredSql}) AS groups_referred,
         (SELECT COUNT(DISTINCT chat_id) FROM ${s}.lixi_transactions WHERE ts >= $1) AS groups_active,
         (SELECT COUNT(DISTINCT user_id) FROM ${s}.lixi_members) AS members_seen,
         (SELECT COUNT(*) FROM ${s}.lixi_envelopes WHERE created_at >= $1) AS envelopes_opened,
         (SELECT COALESCE(SUM(amount), 0)
            FROM ${s}.lixi_transactions
           WHERE ts >= $1 AND type = 'tip' AND to_user IS NOT NULL AND to_user <> 'pot'
             AND amount IS NOT NULL AND amount > 0) AS points_tipped`,
      [since]
    );
    const row = rows[0] || {};
    return {
      groupsTotal: toNumber(row.groups_total),
      groupsActive: toNumber(row.groups_active),
      groupsReferred: toNumber(row.groups_referred),
      membersSeen: toNumber(row.members_seen),
      envelopesOpened: toNumber(row.envelopes_opened),
      pointsTipped: toNumber(row.points_tipped),
    };
  }

  // =========================================================================
  // Các thao tác mở rộng mà lệnh bot cần — đều dùng lại hàm thuần của ledger.js
  // =========================================================================

  /** Đánh dấu "đã thấy" một thành viên trong nhóm (mốc tính tuổi tài khoản). */
  async ensureMember(chatId, userId, nowMs = Date.now()) {
    return this.withGroup(chatId, (state) => ledger.ensureMember(state, userId, nowMs), { nowMs });
  }

  /** Admin nạp pot nhóm. */
  async adminCreditPot(chatId, adminId, amount, note, nowMs = Date.now()) {
    return this.withGroup(
      chatId,
      (state) => ledger.adminCreditPot(state, adminId, amount, note, nowMs),
      { nowMs }
    );
  }

  /** Admin cấp điểm trực tiếp cho một thành viên. */
  async adminCreditUser(chatId, adminId, userId, amount, note, nowMs = Date.now()) {
    return this.withGroup(
      chatId,
      (state) => ledger.adminCreditUser(state, adminId, userId, amount, note, nowMs),
      { nowMs }
    );
  }

  /** Tạo yêu cầu rút: giữ (trừ ngay) điểm, trạng thái `pending`. */
  async createWithdrawalRequest(chatId, userId, address, amount, nowMs = Date.now()) {
    return this.withGroup(
      chatId,
      (state) => ledger.createWithdrawalRequest(state, userId, address, amount, nowMs),
      { nowMs }
    );
  }

  /** Admin duyệt/từ chối một yêu cầu rút (từ chối = hoàn điểm). */
  async decideWithdrawal(chatId, withdrawalId, decision, adminId, nowMs = Date.now()) {
    return this.withGroup(
      chatId,
      (state) => ledger.decideWithdrawal(state, withdrawalId, decision, adminId, nowMs),
      { nowMs, withdrawalIds: [String(withdrawalId)] }
    );
  }

  /** Nhận một phần bao lì xì (nút bấm trong nhóm). */
  async claimEnvelope(chatId, envelopeId, userId, nowMs = Date.now()) {
    return this.withGroup(
      chatId,
      (state) => ledger.claimEnvelopeAndCredit(state, envelopeId, userId, nowMs),
      { nowMs, envelopeIds: [String(envelopeId)] }
    );
  }

  /**
   * Dọn LƯỜI (lazy settlement): đóng mọi bao lì xì của nhóm đã quá giờ và hoàn phần
   * chưa ai nhận cho người gửi. Gọi trước mỗi lệnh — thay cho `setTimeout` (không
   * dùng được trên serverless).
   */
  async settleDueEnvelopes(chatId, nowMs = Date.now()) {
    return this.withGroup(chatId, (state) => ledger.settleDueEnvelopes(state, nowMs), { nowMs });
  }

  /** Quét TOÀN BỘ nhóm có bao lì xì quá giờ (cron hằng ngày — lưới an toàn dự phòng). */
  async sweepDueEnvelopes(nowMs = Date.now()) {
    const { rows } = await this.pool.query(
      `SELECT DISTINCT chat_id FROM ${this.schema}.lixi_envelopes
        WHERE status = 'active' AND expires_at <= $1`,
      [nowMs]
    );
    const results = [];
    for (const row of rows) {
      const settled = await this.settleDueEnvelopes(row.chat_id, nowMs);
      if (settled.length) results.push({ chatId: row.chat_id, settled });
    }
    return results;
  }

  /** Phát thưởng hoạt động cho một nhóm, idempotent theo (nhóm, ngày). */
  async runDailyReward(chatId, dateStr, nowMs = Date.now()) {
    return this.withGroup(chatId, (state) => ledger.runDailyReward(state, dateStr, nowMs), {
      nowMs,
      days: [dateStr],
    });
  }

  /** Phát thưởng hoạt động cho MỌI nhóm (cron hằng ngày). */
  async runDailyRewardAllGroups(dateStr, nowMs = Date.now()) {
    const chatIds = await this.listGroupIds();
    const results = [];
    for (const chatId of chatIds) {
      try {
        const outcome = await this.runDailyReward(chatId, dateStr, nowMs);
        results.push({ chatId, ...outcome });
      } catch (err) {
        results.push({ chatId, error: safeErrorMessage(err) });
      }
    }
    return results;
  }
}

// ---------------------------------------------------------------------------
// Ảnh chụp (snapshot) state lúc vừa nạp — dùng để biết cái gì đã đổi khi ghi lại.
// ---------------------------------------------------------------------------

function snapshotOf(state) {
  const members = {};
  for (const [userId, m] of Object.entries(state.members || {})) {
    members[userId] = {
      balance: m.balance,
      firstSeenAt: m.firstSeenAt,
      lastCommandAt: m.lastCommandAt,
      displayName: ledger.normalizeDisplayName(m.displayName),
      username: ledger.normalizeDisplayName(m.username),
      dailyTipUsed: { ...m.dailyTipUsed },
      messageCounts: { ...m.messageCounts },
    };
  }
  const envelopes = {};
  for (const [id, e] of Object.entries(state.envelopes || {})) {
    envelopes[id] = { status: e.status, messageId: e.messageId, claimOrder: [...e.claimOrder] };
  }
  const withdrawals = {};
  for (const w of state.withdrawals || []) withdrawals[w.id] = { status: w.status };
  const approvals = {};
  for (const a of state.pendingApprovals || []) approvals[String(a.id)] = { status: a.status };
  return {
    members,
    envelopes,
    withdrawals,
    approvals,
    rewardGrants: { ...(state.rewardGrants || {}) },
    nextTxId: state.nextTxId,
    adminCreditLogLength: (state.adminCreditLog || []).length,
  };
}

module.exports = {
  PostgresLedger,
  SCHEMA_STATEMENTS,
  MIGRATION_STATEMENTS,
  RECENT_TX_LIMIT,
  POOL_MAX_CLIENTS,
  buildPoolConfig,
  needsSsl,
  getPool,
  closeAllPools,
  assertSafeSchemaName,
};
