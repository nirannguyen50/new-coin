'use strict';

/**
 * Test TÍCH HỢP THẬT cho `src/postgres-store.js` — chạy trên một Postgres thật.
 *
 * Cách chạy:
 *   TEST_DATABASE_URL=postgresql://postgres:matkhau@127.0.0.1:5432/lixi_test npm test
 * (CI dùng "service container" postgres, xem .github/workflows/ci.yml.)
 *
 * Nếu KHÔNG có Postgres nào kết nối được, toàn bộ nhóm test này được BỎ QUA (skip)
 * kèm thông báo rõ ràng — để máy của người khác chạy `npm test` không bị đỏ chỉ vì
 * chưa cài Postgres.
 *
 * Mỗi lần chạy dùng một SCHEMA riêng (tên có mốc thời gian + pid) và tự xoá sạch ở
 * cuối, nên nhiều lần chạy song song không giẫm lên nhau và không đụng dữ liệu thật.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const ledger = require('../src/ledger');
const {
  PostgresLedger,
  buildPoolConfig,
  needsSsl,
  assertSafeSchemaName,
  closeAllPools,
} = require('../src/postgres-store');

const CONNECTION_STRING =
  process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || '';

const SCHEMA = `lixi_test_${process.pid}_${Date.now().toString(36)}`;

const SKIP_MESSAGE =
  'Bỏ qua test Postgres: không kết nối được tới database. ' +
  'Đặt biến môi trường TEST_DATABASE_URL (ví dụ ' +
  'postgresql://postgres:matkhau@127.0.0.1:5432/lixi_test) rồi chạy lại để bật nhóm test này.';

/** Thử kết nối nhanh; trả về null nếu được, hoặc lý do (string) nếu không. */
async function connectionProblem(db) {
  if (!CONNECTION_STRING) {
    return 'chưa đặt TEST_DATABASE_URL / DATABASE_URL';
  }
  try {
    await db.pool.query('SELECT 1');
    return null;
  } catch (err) {
    return err.message;
  }
}

// ---------------------------------------------------------------------------
// Phần thuần tuý — luôn chạy được, không cần database.
// ---------------------------------------------------------------------------

test('needsSsl: bật TLS cho host từ xa, tắt cho localhost và sslmode=disable', () => {
  assert.equal(needsSsl('postgresql://u:p@ep-abc-123.eu-central-1.aws.neon.tech/db'), true);
  assert.equal(needsSsl('postgresql://u:p@127.0.0.1:5432/lixi_test'), false);
  assert.equal(needsSsl('postgresql://u:p@localhost:5432/lixi_test'), false);
  assert.equal(needsSsl('postgresql://u:p@db.example.com/x?sslmode=disable'), false);
});

test('buildPoolConfig: pool nhỏ, hợp với serverless (nhiều instance chạy song song)', () => {
  const cfg = buildPoolConfig('postgresql://u:p@ep-abc.neon.tech/db');
  assert.equal(cfg.max, 2);
  assert.deepEqual(cfg.ssl, { rejectUnauthorized: true });
  assert.ok(cfg.connectionTimeoutMillis > 0);
  assert.equal(buildPoolConfig('postgresql://u:p@127.0.0.1/db').ssl, false);
});

test('assertSafeSchemaName: chặn tên schema có ký tự lạ (chống SQL injection)', () => {
  assert.equal(assertSafeSchemaName('public'), 'public');
  assert.equal(assertSafeSchemaName('lixi_test_1'), 'lixi_test_1');
  assert.throws(() => assertSafeSchemaName('public; DROP TABLE x'), /không hợp lệ/);
  assert.throws(() => assertSafeSchemaName('1abc'), /không hợp lệ/);
});

// ---------------------------------------------------------------------------
// Phần cần database thật.
// ---------------------------------------------------------------------------

test('PostgresLedger (cần Postgres thật)', async (t) => {
  const db = CONNECTION_STRING
    ? new PostgresLedger(CONNECTION_STRING, { schema: SCHEMA })
    : null;

  const problem = db ? await connectionProblem(db) : 'chưa đặt TEST_DATABASE_URL / DATABASE_URL';
  if (problem) {
    t.skip(`${SKIP_MESSAGE} (chi tiết: ${problem})`);
    return;
  }

  try {
    // -----------------------------------------------------------------------
    await t.test('ensureSchema: tạo bảng được, và gọi lại lần hai vẫn an toàn', async () => {
      await db.ensureSchema();
      // Gọi lại — mọi câu lệnh đều IF NOT EXISTS nên không được ném lỗi.
      await db.ensureSchema();

      const { rows } = await db.pool.query(
        `SELECT table_name FROM information_schema.tables
          WHERE table_schema = $1 ORDER BY table_name`,
        [SCHEMA]
      );
      const tables = rows.map((r) => r.table_name);
      for (const expected of [
        'lixi_admin_credit_log',
        'lixi_approvals',
        'lixi_daily_counters',
        'lixi_envelope_claims',
        'lixi_envelopes',
        'lixi_groups',
        'lixi_members',
        'lixi_reward_runs',
        'lixi_transactions',
        'lixi_withdrawals',
      ]) {
        assert.ok(tables.includes(expected), `thiếu bảng ${expected}`);
      }
    });

    // -----------------------------------------------------------------------
    await t.test('tip: chuyển điểm nguyên tử, tổng điểm không đổi', async () => {
      const chat = 'g-tip';
      await db.credit(chat, 'a', 100, { type: 'admin_credit' });
      assert.equal(await db.getBalance(chat, 'a'), 100);
      assert.equal(await db.getBalance(chat, 'b'), 0);

      await db.transfer(chat, 'a', 'b', 40, { type: 'tip' });
      assert.equal(await db.getBalance(chat, 'a'), 60);
      assert.equal(await db.getBalance(chat, 'b'), 40);

      // Lịch sử ghi lại cả hai chiều.
      const txs = await db.listRecentTransactions(chat, 'a', 10);
      assert.ok(txs.some((tx) => tx.type === 'tip' && tx.from === 'a' && tx.amount === 40));
    });

    // -----------------------------------------------------------------------
    await t.test('số dư không đủ: bị từ chối và KHÔNG đổi số dư của ai', async () => {
      const chat = 'g-insufficient';
      await db.credit(chat, 'a', 10, { type: 'admin_credit' });

      await assert.rejects(
        () => db.transfer(chat, 'a', 'b', 11, { type: 'tip' }),
        (err) => err.code === 'INSUFFICIENT_BALANCE'
      );

      assert.equal(await db.getBalance(chat, 'a'), 10);
      assert.equal(await db.getBalance(chat, 'b'), 0);
    });

    // -----------------------------------------------------------------------
    await t.test('ràng buộc CHECK: database TỪ CHỐI ghi số dư âm', async () => {
      const chat = 'g-check';
      await db.credit(chat, 'a', 5, { type: 'admin_credit' });

      // Ghi thẳng vào database, bỏ qua mọi logic của bot — đây chính là "lưới an toàn".
      await assert.rejects(
        () =>
          db.pool.query(
            `UPDATE ${SCHEMA}.lixi_members SET balance = -1 WHERE chat_id = $1 AND user_id = $2`,
            [chat, 'a']
          ),
        /violates check constraint/i
      );
      assert.equal(await db.getBalance(chat, 'a'), 5);
    });

    // -----------------------------------------------------------------------
    await t.test(
      'CHẠY SONG SONG: 10 lệnh tip cùng lúc của một người KHÔNG thể tiêu quá số dư',
      async () => {
        const chat = 'g-race';
        await db.credit(chat, 'a', 100, { type: 'admin_credit' });

        // 10 lệnh tip 30 điểm chạy đồng thời. Chỉ 3 lệnh được phép thành công (90 điểm),
        // 7 lệnh phải bị từ chối vì không đủ số dư.
        const attempts = Array.from({ length: 10 }, () =>
          db.transfer(chat, 'a', 'b', 30, { type: 'tip' }).then(
            () => 'ok',
            (err) => err.code || err.message
          )
        );
        const results = await Promise.all(attempts);

        const okCount = results.filter((r) => r === 'ok').length;
        const rejected = results.filter((r) => r === 'INSUFFICIENT_BALANCE').length;

        const balanceA = await db.getBalance(chat, 'a');
        const balanceB = await db.getBalance(chat, 'b');

        assert.equal(okCount, 3, `phải có đúng 3 lệnh thành công, thực tế ${okCount}`);
        assert.equal(rejected, 7, `phải có đúng 7 lệnh bị từ chối, thực tế ${rejected}`);
        assert.equal(balanceB, 90);
        assert.equal(balanceA, 10);
        // BẤT BIẾN quan trọng nhất: tổng điểm trong nhóm vẫn đúng bằng 100.
        assert.equal(balanceA + balanceB, 100);
      }
    );

    // -----------------------------------------------------------------------
    await t.test('bao lì xì: nhận, hết giờ, hoàn phần chưa nhận — tổng điểm không đổi', async () => {
      const chat = 'g-envelope';
      const now = Date.now();
      await db.credit(chat, 'sender', 100, { type: 'admin_credit' }, now);

      // Mở bao 60 điểm chia 3 người, cửa sổ nhận 1 phút.
      const envelope = await db.withGroup(
        chat,
        (state) => {
          ledger.debitPure(state, 'sender', 60, { type: 'envelope_hold' }, now);
          return ledger.createEnvelope(
            state,
            {
              senderId: 'sender',
              senderName: 'Người gửi',
              amount: 60,
              recipientCount: 3,
              windowMs: 60000,
            },
            now
          );
        },
        { nowMs: now }
      );
      assert.equal(await db.getBalance(chat, 'sender'), 40);

      // Hai người nhận, người thứ ba không ai nhận.
      const c1 = await db.claimEnvelope(chat, envelope.id, 'u1', now + 1000);
      const c2 = await db.claimEnvelope(chat, envelope.id, 'u2', now + 2000);
      assert.equal(c1.ok, true);
      assert.equal(c2.ok, true);
      assert.equal(await db.getBalance(chat, 'u1'), c1.amount);
      assert.equal(await db.getBalance(chat, 'u2'), c2.amount);

      // Nhận hai lần bị chặn.
      const again = await db.claimEnvelope(chat, envelope.id, 'u1', now + 3000);
      assert.equal(again.ok, false);
      assert.equal(again.reason, 'already_claimed');

      // Hết giờ → dọn lười, hoàn phần chưa ai nhận cho người gửi.
      const settled = await db.settleDueEnvelopes(chat, now + 61000);
      assert.equal(settled.length, 1);
      const refunded = settled[0].refunded;
      assert.equal(refunded, 60 - c1.amount - c2.amount);
      assert.equal(await db.getBalance(chat, 'sender'), 40 + refunded);

      // Gọi lại lần nữa: không hoàn thêm lần hai (idempotent).
      const again2 = await db.settleDueEnvelopes(chat, now + 62000);
      assert.equal(again2.length, 0);

      // Tổng điểm trong nhóm vẫn đúng 100 — không rò rỉ, không sinh thêm.
      const total =
        (await db.getBalance(chat, 'sender')) +
        (await db.getBalance(chat, 'u1')) +
        (await db.getBalance(chat, 'u2'));
      assert.equal(total, 100);
    });

    // -----------------------------------------------------------------------
    await t.test('quét bao lì xì hết giờ trên mọi nhóm (lưới an toàn của cron)', async () => {
      const chat = 'g-sweep';
      const now = Date.now();
      await db.credit(chat, 'sender', 30, { type: 'admin_credit' }, now);
      await db.withGroup(
        chat,
        (state) => {
          ledger.debitPure(state, 'sender', 30, { type: 'envelope_hold' }, now);
          ledger.createEnvelope(
            state,
            { senderId: 'sender', amount: 30, recipientCount: 2, windowMs: 1000 },
            now
          );
        },
        { nowMs: now }
      );
      assert.equal(await db.getBalance(chat, 'sender'), 0);

      const swept = await db.sweepDueEnvelopes(now + 5000);
      const forThisChat = swept.find((r) => r.chatId === chat);
      assert.ok(forThisChat, 'nhóm có bao lì xì hết giờ phải xuất hiện trong kết quả quét');
      assert.equal(await db.getBalance(chat, 'sender'), 30);
    });

    // -----------------------------------------------------------------------
    await t.test('thưởng hoạt động: chỉ phát MỘT LẦN cho mỗi (nhóm, ngày)', async () => {
      const chat = 'g-reward';
      const now = Date.parse('2026-05-01T12:00:00.000Z');
      const day = ledger.dateKey(now);

      await db.adminCreditPot(chat, 'admin', 1000, 'nạp pot để thưởng', now);
      await db.withGroup(
        chat,
        (state) => {
          state.rewardRule = { pointsPerDay: 10, minMessages: 3, updatedAt: now, updatedBy: 'admin' };
          ledger.ensureMember(state, 'active', now);
          ledger.ensureMember(state, 'lazy', now);
          ledger.recordMessage(state, 'active', now);
          ledger.recordMessage(state, 'active', now);
          ledger.recordMessage(state, 'active', now);
          ledger.recordMessage(state, 'lazy', now);
        },
        { nowMs: now, days: [day] }
      );

      const first = await db.runDailyReward(chat, day, now);
      assert.equal(first.alreadyRan, false);
      assert.deepEqual(first.grants, { active: 10 });
      assert.equal(await db.getBalance(chat, 'active'), 10);
      assert.equal(await db.getBalance(chat, 'lazy'), 0);

      // Chạy lại (cron bị gọi hai lần, hoặc người lạ bấm lại) — KHÔNG phát thêm.
      const second = await db.runDailyReward(chat, day, now + 1000);
      assert.equal(second.alreadyRan, true);
      assert.equal(await db.getBalance(chat, 'active'), 10);

      // Ngay cả khi gọi 5 lần cùng lúc, số dư vẫn đúng 10.
      await Promise.all([1, 2, 3, 4, 5].map(() => db.runDailyReward(chat, day, now + 2000)));
      assert.equal(await db.getBalance(chat, 'active'), 10);

      // Dấu mốc idempotency nằm trong database, đúng một dòng cho (nhóm, ngày).
      const { rows } = await db.pool.query(
        `SELECT count(*)::int AS n FROM ${SCHEMA}.lixi_reward_runs WHERE chat_id = $1 AND day = $2`,
        [chat, day]
      );
      assert.equal(rows[0].n, 1);
    });

    // -----------------------------------------------------------------------
    await t.test('yêu cầu rút: pending → approved và pending → rejected (hoàn điểm)', async () => {
      const chat = 'g-withdraw';
      const now = Date.now();
      const address = '0x1234567890123456789012345678901234567890';
      await db.credit(chat, 'a', 300, { type: 'admin_credit' }, now);

      // Tạo yêu cầu → điểm bị GIỮ ngay (trừ khỏi số dư) để không tiêu trùng.
      const w1 = await db.createWithdrawalRequest(chat, 'a', address, 100, now);
      assert.equal(w1.status, 'pending');
      assert.equal(await db.getBalance(chat, 'a'), 200);

      // Duyệt → trạng thái approved, KHÔNG hoàn điểm (điểm đã ra khỏi hệ thống).
      const approved = await db.decideWithdrawal(chat, w1.id, 'approve', 'admin', now + 1000);
      assert.equal(approved.status, 'approved');
      assert.equal(await db.getBalance(chat, 'a'), 200);

      // Xử lý lần hai bị chặn.
      await assert.rejects(
        () => db.decideWithdrawal(chat, w1.id, 'reject', 'admin', now + 2000),
        (err) => err.code === 'WITHDRAWAL_ALREADY_DECIDED'
      );

      // Yêu cầu thứ hai, từ chối → hoàn lại điểm.
      const w2 = await db.createWithdrawalRequest(chat, 'a', address, 50, now + 3000);
      assert.equal(await db.getBalance(chat, 'a'), 150);
      const rejected = await db.decideWithdrawal(chat, w2.id, 'reject', 'admin', now + 4000);
      assert.equal(rejected.status, 'rejected');
      assert.equal(await db.getBalance(chat, 'a'), 200);

      // Địa chỉ sai định dạng bị chặn, không trừ điểm.
      await assert.rejects(
        () => db.createWithdrawalRequest(chat, 'a', 'khong-phai-dia-chi', 10, now + 5000),
        (err) => err.code === 'INVALID_ADDRESS'
      );
      assert.equal(await db.getBalance(chat, 'a'), 200);

      // Mã không tồn tại.
      await assert.rejects(
        () => db.decideWithdrawal(chat, '9999', 'approve', 'admin', now + 6000),
        (err) => err.code === 'WITHDRAWAL_NOT_FOUND'
      );
    });

    // -----------------------------------------------------------------------
    await t.test('/lichsu: lấy đúng giao dịch của một người dù nhóm có rất nhiều giao dịch', async () => {
      const chat = 'g-history';
      const now = Date.now();
      // Nhóm đông: 250 giao dịch giữa hai người khác, vượt quá cửa sổ nạp vào bộ nhớ.
      await db.credit(chat, 'noisy', 1000, { type: 'admin_credit' }, now);
      await db.withGroup(
        chat,
        (state) => {
          for (let i = 0; i < 250; i++) {
            ledger.transferPure(state, 'noisy', 'other', 1, { type: 'tip' }, now + i);
          }
        },
        { nowMs: now }
      );
      // Giao dịch của "hiếm" nằm TRƯỚC 250 giao dịch ồn ào đó.
      await db.credit(chat, 'hiem', 5, { type: 'admin_credit' }, now - 1000);

      const txs = await db.listRecentTransactions(chat, 'hiem', 10);
      assert.equal(txs.length, 1, 'phải tìm được giao dịch cũ nằm ngoài cửa sổ bộ nhớ');
      assert.equal(txs[0].amount, 5);
      assert.equal(txs[0].to, 'hiem');

      // Mới nhất trước, và tôn trọng `limit`.
      const noisy = await db.listRecentTransactions(chat, 'noisy', 10);
      assert.equal(noisy.length, 10);
      assert.ok(noisy[0].id > noisy[noisy.length - 1].id);
    });

    // -----------------------------------------------------------------------
    await t.test('dữ liệu sống sót qua "lần chạy khác" (bền vững thật sự)', async () => {
      const chat = 'g-persist';
      await db.credit(chat, 'a', 77, { type: 'admin_credit' });

      // Một đối tượng PostgresLedger hoàn toàn mới — như một instance serverless khác.
      const other = new PostgresLedger(CONNECTION_STRING, { schema: SCHEMA });
      assert.equal(await other.getBalance(chat, 'a'), 77);
      const ids = await other.listGroupIds();
      assert.ok(ids.includes(chat));
    });
    // -----------------------------------------------------------------------
    await t.test('/caidat: cấu hình riêng theo nhóm, sống sót và đổi thật hành vi', async () => {
      const chat = 'g-config';
      const otherChat = 'g-config-khac';
      const now = Date.now();

      // Nhóm chưa chỉnh gì -> lấy đúng mặc định.
      const before = await db.readGroup(chat);
      assert.equal(before.config.minAccountAgeDays, 3);

      const result = await db.withGroup(
        chat,
        (state) => ledger.applyConfigChange(state, 'thâm niên', '0', { adminId: 'admin1', nowMs: now }),
        { nowMs: now }
      );
      assert.equal(result.ok, true);
      assert.equal(result.oldValue, 3);
      assert.equal(result.newValue, 0);

      // Một đối tượng PostgresLedger hoàn toàn mới — như một instance serverless khác.
      const fresh = new PostgresLedger(CONNECTION_STRING, { schema: SCHEMA });
      const reloaded = await fresh.readGroup(chat);
      assert.equal(reloaded.config.minAccountAgeDays, 0, 'cấu hình phải bền vững');
      // 0 phải đổi THẬT hành vi: người vừa vào nhóm qua được kiểm tra thâm niên.
      ledger.ensureMember(reloaded, 'newbie', now);
      assert.equal(ledger.checkMinAccountAge(reloaded, 'newbie', now).ok, true);

      // Chỉ nhóm đó đổi; nhóm khác vẫn giữ mặc định (cấu hình là RIÊNG từng nhóm).
      const untouched = await fresh.readGroup(otherChat);
      assert.equal(untouched.config.minAccountAgeDays, 3);

      // Lần đổi được ghi vào đúng bảng log mà /nap dùng, và cũng bền vững.
      const entry = reloaded.adminCreditLog[reloaded.adminCreditLog.length - 1];
      assert.equal(entry.target, 'config:minAccountAgeDays');
      assert.equal(entry.adminId, 'admin1');
      assert.equal(entry.amount, 0);
      assert.match(entry.note, /minAccountAgeDays/);

      // cooldown = 0 cũng lưu được (0 không bị hiểu lẫn thành "chưa đặt").
      await db.withGroup(
        chat,
        (state) => ledger.applyConfigChange(state, 'cooldown', '0', { adminId: 'admin1', nowMs: now }),
        { nowMs: now }
      );
      const again = await new PostgresLedger(CONNECTION_STRING, { schema: SCHEMA }).readGroup(chat);
      assert.equal(again.config.cooldownSeconds, 0);
      ledger.recordCommandTime(again, 'a', now);
      assert.equal(ledger.checkCooldown(again, 'a', now).ok, true);
    });

  } finally {
    // Dọn sạch: xoá schema riêng của lần chạy này rồi đóng mọi kết nối.
    try {
      await db.dropSchema();
    } catch (err) {
      console.error('Không xoá được schema test:', err.message);
    }
    await closeAllPools();
  }
});
