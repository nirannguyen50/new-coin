'use strict';

/**
 * Test cho lệnh /caidat — chỉnh cấu hình chống lạm dụng RIÊNG theo từng nhóm.
 *
 * Ở đây chỉ test phần THUẦN trong `src/ledger.js` (`applyConfigChange`,
 * `resolveConfigKey`, `describeConfig`): không cần Telegram, không cần database.
 *
 * Phần "đi hết đường" qua lệnh Telegram nằm ở `test/commands.test.js`; phần cấu hình
 * sống sót qua Postgres nằm ở `test/postgres.test.js`.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const ledger = require('../src/ledger');
const store = require('../src/store');

const DAY_MS = 24 * 60 * 60 * 1000;

function freshState() {
  return store.defaultGroupState('g-config');
}

// ---------------------------------------------------------------------------
// Nhận tên mục: tên khoá thật, tên ngắn, hoa/thường, và CÓ DẤU tiếng Việt.
// ---------------------------------------------------------------------------

test('resolveConfigKey: nhận tên khoá thật, tên ngắn, không phân biệt hoa/thường và dấu', () => {
  assert.equal(ledger.resolveConfigKey('minAccountAgeDays'), 'minAccountAgeDays');
  assert.equal(ledger.resolveConfigKey('minaccountagedays'), 'minAccountAgeDays');
  assert.equal(ledger.resolveConfigKey('thamnien'), 'minAccountAgeDays');
  assert.equal(ledger.resolveConfigKey('ThamNien'), 'minAccountAgeDays');
  assert.equal(ledger.resolveConfigKey('THAMNIEN'), 'minAccountAgeDays');
  // Có dấu tiếng Việt (người Việt gõ tự nhiên) — kể cả khi dính liền hoặc có dấu cách.
  assert.equal(ledger.resolveConfigKey('thâmniên'), 'minAccountAgeDays');
  assert.equal(ledger.resolveConfigKey('thâm niên'), 'minAccountAgeDays');
  assert.equal(ledger.resolveConfigKey('Thâm Niên'), 'minAccountAgeDays');

  assert.equal(ledger.resolveConfigKey('cooldown'), 'cooldownSeconds');
  assert.equal(ledger.resolveConfigKey('chờ đợi'), 'cooldownSeconds');
  assert.equal(ledger.resolveConfigKey('hanmuctip'), 'dailyTipLimitPerUser');
  assert.equal(ledger.resolveConfigKey('hạn mức tip'), 'dailyTipLimitPerUser');
  // Cả hai cách viết trong tài liệu đều phải nhận ra.
  assert.equal(ledger.resolveConfigKey('nganSachThuong'), 'dailyRewardBudgetPerGroup');
  assert.equal(ledger.resolveConfigKey('ngansachthuong'), 'dailyRewardBudgetPerGroup');
  assert.equal(ledger.resolveConfigKey('ngân sách thưởng'), 'dailyRewardBudgetPerGroup');
  assert.equal(ledger.resolveConfigKey('songuoinhan'), 'maxEnvelopeRecipients');
  assert.equal(ledger.resolveConfigKey('nguongduyet'), 'adminApprovalThreshold');
  assert.equal(ledger.resolveConfigKey('thoigianbao'), 'envelopeWindowMinutes');
});

test('resolveConfigKey: tên lạ trả về null (không "đoán bừa" sang mục khác)', () => {
  assert.equal(ledger.resolveConfigKey('khongcokhoanay'), null);
  assert.equal(ledger.resolveConfigKey(''), null);
  assert.equal(ledger.resolveConfigKey(undefined), null);
  assert.equal(ledger.resolveConfigKey('balance'), null);
});

test('describeConfig: liệt kê đủ mọi mục kèm đơn vị, giải thích và khoảng cho phép', () => {
  const state = freshState();
  const items = ledger.describeConfig(state);
  assert.equal(items.length, ledger.CONFIG_SPECS.length);
  for (const item of items) {
    assert.equal(typeof item.key, 'string');
    assert.equal(typeof item.alias, 'string');
    assert.equal(typeof item.unit, 'string');
    assert.ok(item.description.length > 10, `mục ${item.key} thiếu giải thích`);
    assert.equal(item.value, state.config[item.key]);
    assert.ok(item.min >= 0, `mục ${item.key} cho phép giá trị âm`);
    assert.ok(item.max > item.min);
  }
  // Đúng 7 mục trong defaultConfig() — không bỏ sót mục nào.
  assert.deepEqual(
    items.map((i) => i.key).sort(),
    Object.keys(store.defaultConfig()).sort()
  );
});

// ---------------------------------------------------------------------------
// Từ chối đầu vào sai.
// ---------------------------------------------------------------------------

test('applyConfigChange: khoá không tồn tại bị từ chối, thông báo liệt kê các mục hợp lệ', () => {
  const state = freshState();
  const before = { ...state.config };
  const result = ledger.applyConfigChange(state, 'khoaLa', '5', { adminId: 1 });

  assert.equal(result.ok, false);
  assert.equal(result.key, null);
  assert.equal(result.error.code, 'UNKNOWN_CONFIG_KEY');
  for (const alias of ledger.listConfigAliases()) {
    assert.ok(result.error.message.includes(alias), `thông báo thiếu mục ${alias}`);
  }
  assert.deepEqual(state.config, before, 'không được đổi gì khi khoá sai');
  assert.equal((state.adminCreditLog || []).length, 0, 'không được ghi log khi thất bại');
});

test('applyConfigChange: giá trị không phải số nguyên bị từ chối kèm khoảng cho phép', () => {
  const state = freshState();
  for (const bad of ['abc', '1.5', '3,5', '', '  ', '1e3', '5 ngày', '0x10']) {
    const result = ledger.applyConfigChange(state, 'thamnien', bad, { adminId: 1 });
    assert.equal(result.ok, false, `"${bad}" phải bị từ chối`);
    assert.equal(result.error.code, 'NOT_AN_INTEGER', `"${bad}" sai mã lỗi`);
    assert.match(result.error.message, /từ 0 đến 30 ngày/);
  }
  assert.equal(state.config.minAccountAgeDays, 3, 'giá trị cũ phải giữ nguyên');
});

test('applyConfigChange: số âm luôn bị từ chối (mọi mục có chặn dưới >= 0)', () => {
  for (const spec of ledger.CONFIG_SPECS) {
    const state = freshState();
    const result = ledger.applyConfigChange(state, spec.key, '-1', { adminId: 1 });
    assert.equal(result.ok, false, `${spec.key} nhận số âm`);
    assert.equal(result.error.code, 'OUT_OF_RANGE');
    assert.ok(state.config[spec.key] >= 0);
  }
});

test('applyConfigChange: chặn cả hai đầu của mọi mục, và nhận đúng hai giá trị biên', () => {
  for (const spec of ledger.CONFIG_SPECS) {
    // Dưới chặn dưới.
    const low = ledger.applyConfigChange(freshState(), spec.key, String(spec.min - 1), {
      adminId: 1,
    });
    assert.equal(low.ok, false, `${spec.key}: ${spec.min - 1} phải bị từ chối`);
    assert.equal(low.error.code, 'OUT_OF_RANGE');
    assert.ok(low.error.message.includes(String(spec.min)));
    assert.ok(low.error.message.includes(String(spec.max)));

    // Trên chặn trên.
    const high = ledger.applyConfigChange(freshState(), spec.key, String(spec.max + 1), {
      adminId: 1,
    });
    assert.equal(high.ok, false, `${spec.key}: ${spec.max + 1} phải bị từ chối`);
    assert.equal(high.error.code, 'OUT_OF_RANGE');

    // Đúng hai giá trị biên thì được.
    const atMin = ledger.applyConfigChange(freshState(), spec.key, String(spec.min), {
      adminId: 1,
    });
    assert.equal(atMin.ok, true, `${spec.key}: ${spec.min} phải được chấp nhận`);
    assert.equal(atMin.newValue, spec.min);

    const atMax = ledger.applyConfigChange(freshState(), spec.key, String(spec.max), {
      adminId: 1,
    });
    assert.equal(atMax.ok, true, `${spec.key}: ${spec.max} phải được chấp nhận`);
    assert.equal(atMax.newValue, spec.max);
  }
});

// ---------------------------------------------------------------------------
// Đổi thành công.
// ---------------------------------------------------------------------------

test('applyConfigChange: trả về giá trị cũ → giá trị mới và chỉ đổi đúng một mục', () => {
  const state = freshState();
  const before = { ...state.config };
  const result = ledger.applyConfigChange(state, 'hạn mức tip', ' 250 ', { adminId: 77 });

  assert.equal(result.ok, true);
  assert.equal(result.error, null);
  assert.equal(result.key, 'dailyTipLimitPerUser');
  assert.equal(result.oldValue, 500);
  assert.equal(result.newValue, 250);
  assert.equal(result.unit, 'điểm/ngày/người');
  assert.equal(state.config.dailyTipLimitPerUser, 250);

  for (const key of Object.keys(before)) {
    if (key === 'dailyTipLimitPerUser') continue;
    assert.equal(state.config[key], before[key], `mục ${key} bị đổi ngoài ý muốn`);
  }
});

test('applyConfigChange: cảnh báo khi tắt lớp chống lạm dụng (thâm niên hoặc cooldown = 0)', () => {
  const ageOff = ledger.applyConfigChange(freshState(), 'thamnien', '0', { adminId: 1 });
  assert.equal(ageOff.ok, true);
  assert.ok(ageOff.warning, 'thamnien = 0 phải có cảnh báo');
  assert.match(ageOff.warning, /thử nghiệm/i);
  assert.match(ageOff.warning, /công khai/i);

  const cooldownOff = ledger.applyConfigChange(freshState(), 'cooldown', '0', { adminId: 1 });
  assert.equal(cooldownOff.ok, true);
  assert.ok(cooldownOff.warning, 'cooldown = 0 phải có cảnh báo');
  assert.match(cooldownOff.warning, /thử nghiệm/i);

  // Giá trị khác 0 thì không cảnh báo, và các mục khác đặt 0 cũng không cảnh báo.
  assert.equal(ledger.applyConfigChange(freshState(), 'thamnien', '1', { adminId: 1 }).warning, null);
  assert.equal(
    ledger.applyConfigChange(freshState(), 'nguongduyet', '0', { adminId: 1 }).warning,
    null
  );
});

test('applyConfigChange: ghi vào ĐÚNG log admin mà /nap dùng (ai, đổi gì, lúc nào)', () => {
  const state = freshState();
  const now = Date.parse('2026-02-10T03:04:05.000Z');

  // Một lần nạp pot trước đó — hai loại bản ghi phải nằm chung một log.
  ledger.adminCreditPot(state, 42, 1000, 'Nạp pot thủ công', now);
  const result = ledger.applyConfigChange(state, 'thamnien', '0', { adminId: 42, nowMs: now + 1 });

  assert.equal(state.adminCreditLog.length, 2);
  const entry = state.adminCreditLog[1];
  assert.equal(entry, result.logEntry);
  assert.equal(entry.ts, now + 1);
  assert.equal(entry.adminId, '42');
  assert.equal(entry.target, 'config:minAccountAgeDays');
  assert.equal(entry.amount, 0, 'cột amount của bảng log là giá trị mới');
  // Khoá + giá trị cũ + giá trị mới đều đọc được từ bản ghi.
  assert.match(entry.note, /minAccountAgeDays/);
  assert.match(entry.note, /3/);
  assert.match(entry.note, /0/);
});

// ---------------------------------------------------------------------------
// Đổi cấu hình phải ĐỔI THẬT hành vi của các hàm chống lạm dụng.
// ---------------------------------------------------------------------------

test('sau khi đặt thamnien = 0: thành viên vừa vào nhóm đã qua được kiểm tra thâm niên', () => {
  const state = freshState();
  const now = Date.now();
  ledger.ensureMember(state, 'newbie', now);

  // Mặc định 3 ngày -> người mới bị chặn.
  assert.equal(ledger.checkMinAccountAge(state, 'newbie', now).ok, false);
  assert.equal(ledger.checkMinAccountAge(state, 'newbie', now + DAY_MS).ok, false);

  assert.equal(ledger.applyConfigChange(state, 'thamnien', '0', { adminId: 1, nowMs: now }).ok, true);

  const after = ledger.checkMinAccountAge(state, 'newbie', now);
  assert.equal(after.ok, true, 'đặt 0 ngày thì người vừa vào nhóm phải dùng được lệnh ngay');
  assert.equal(after.minDays, 0);
});

test('sau khi đặt thamnien = 30: người ở nhóm 10 ngày bị chặn (chỉnh tăng cũng có tác dụng)', () => {
  const state = freshState();
  const now = Date.now();
  ledger.ensureMember(state, 'user', now - 10 * DAY_MS);
  assert.equal(ledger.checkMinAccountAge(state, 'user', now).ok, true);

  ledger.applyConfigChange(state, 'thamnien', '30', { adminId: 1, nowMs: now });
  assert.equal(ledger.checkMinAccountAge(state, 'user', now).ok, false);
});

test('sau khi đặt cooldown = 0: hai lệnh liền nhau đều được phép', () => {
  const state = freshState();
  const now = Date.now();

  ledger.recordCommandTime(state, 'a', now);
  assert.equal(ledger.checkCooldown(state, 'a', now).ok, false, 'mặc định 3 giây phải chặn');

  assert.equal(ledger.applyConfigChange(state, 'cooldown', '0', { adminId: 1, nowMs: now }).ok, true);

  assert.equal(ledger.checkCooldown(state, 'a', now).ok, true);
  ledger.recordCommandTime(state, 'a', now);
  assert.equal(ledger.checkCooldown(state, 'a', now).ok, true, 'lệnh thứ hai ngay lập tức vẫn được');
});

test('đổi hanmuctip / nguongduyet / songuoinhan / thoigianbao đổi luôn hành vi kiểm tra', () => {
  const state = freshState();
  const now = Date.now();

  // Hạn mức tip/ngày/người.
  assert.equal(ledger.checkDailyTipLimit(state, 'a', 600, now).ok, false);
  ledger.applyConfigChange(state, 'hanmuctip', '1000', { adminId: 1, nowMs: now });
  assert.equal(ledger.checkDailyTipLimit(state, 'a', 600, now).ok, true);
  assert.equal(ledger.checkDailyTipLimit(state, 'a', 600, now).limit, 1000);

  // Ngưỡng cần admin duyệt.
  assert.equal(ledger.needsAdminApproval(state, 2001), true);
  ledger.applyConfigChange(state, 'nguongduyet', '5000', { adminId: 1, nowMs: now });
  assert.equal(ledger.needsAdminApproval(state, 2001), false);
  assert.equal(ledger.needsAdminApproval(state, 5001), true);

  // Số người nhận tối đa mỗi bao và thời gian mở bao.
  ledger.applyConfigChange(state, 'songuoinhan', '5', { adminId: 1, nowMs: now });
  assert.equal(state.config.maxEnvelopeRecipients, 5);
  ledger.applyConfigChange(state, 'thoigianbao', '30', { adminId: 1, nowMs: now });
  assert.equal(state.config.envelopeWindowMinutes, 30);
});

test('applyConfigChange: nhóm chưa có config (dữ liệu cũ) vẫn đổi được, mục khác lấy mặc định', () => {
  const state = freshState();
  delete state.config;
  const result = ledger.applyConfigChange(state, 'cooldown', '10', { adminId: 1 });
  assert.equal(result.ok, true);
  assert.equal(result.oldValue, 3, 'giá trị cũ phải lấy từ mặc định');
  assert.equal(state.config.cooldownSeconds, 10);
  assert.equal(state.config.minAccountAgeDays, store.defaultConfig().minAccountAgeDays);
});
