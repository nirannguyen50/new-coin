'use strict';

/**
 * Test cho việc CHỌN kho lưu trữ (`src/storage.js`).
 *
 * Đây là hàm thuần: đưa vào một "bộ biến môi trường" giả, kiểm tra nó chọn đúng kho
 * và đúng biến. Không mở kết nối database, không đọc file nào.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { pickStorageBackend, looksLikePostgresUrl, POSTGRES_ENV_VARS } = require('../src/storage');

const PG = 'postgresql://user:matkhau@ep-abc-123.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const PG2 = 'postgres://user:matkhau@localhost:5432/khac';

test('pickStorageBackend: không có biến nào → dùng kho JSON như trước giờ', () => {
  const result = pickStorageBackend({});
  assert.equal(result.kind, 'json');
  assert.equal(result.connectionString, '');
  assert.equal(result.source, '');
  assert.deepEqual(result.candidates, []);
});

test('pickStorageBackend: có DATABASE_URL → dùng Postgres', () => {
  const result = pickStorageBackend({ DATABASE_URL: PG });
  assert.equal(result.kind, 'postgres');
  assert.equal(result.source, 'DATABASE_URL');
  assert.equal(result.connectionString, PG);
});

test('pickStorageBackend: nhận cả các tên biến mà Vercel/Neon tự tiêm vào', () => {
  for (const name of POSTGRES_ENV_VARS) {
    const result = pickStorageBackend({ [name]: PG });
    assert.equal(result.kind, 'postgres', `biến ${name} phải được nhận diện`);
    assert.equal(result.source, name);
  }
});

test('pickStorageBackend: thứ tự ưu tiên là DATABASE_URL > POSTGRES_URL > ... (chuỗi pooled trước)', () => {
  // Tích hợp Vercel + Neon có thể tiêm nhiều biến cùng lúc; phải chọn đúng cái đầu danh sách.
  const all = Object.fromEntries(POSTGRES_ENV_VARS.map((name) => [name, PG]));
  assert.equal(pickStorageBackend(all).source, 'DATABASE_URL');

  const withoutFirst = { ...all };
  delete withoutFirst.DATABASE_URL;
  assert.equal(pickStorageBackend(withoutFirst).source, 'POSTGRES_URL');

  const onlyNonPooling = {
    POSTGRES_URL_NON_POOLING: PG,
    DATABASE_URL_UNPOOLED: PG2,
  };
  assert.equal(pickStorageBackend(onlyNonPooling).source, 'POSTGRES_URL_NON_POOLING');

  // Danh sách các biến đang có giá trị được trả về đầy đủ để dễ chẩn đoán.
  assert.deepEqual(pickStorageBackend(onlyNonPooling).candidates, [
    'POSTGRES_URL_NON_POOLING',
    'DATABASE_URL_UNPOOLED',
  ]);
});

test('pickStorageBackend: giá trị rỗng/khoảng trắng bị bỏ qua (không bật Postgres nhầm)', () => {
  assert.equal(pickStorageBackend({ DATABASE_URL: '' }).kind, 'json');
  assert.equal(pickStorageBackend({ DATABASE_URL: '   ' }).kind, 'json');
  assert.equal(pickStorageBackend({ DATABASE_URL: undefined }).kind, 'json');
});

test('pickStorageBackend: chuỗi không phải Postgres bị bỏ qua (MySQL, Redis, ...)', () => {
  assert.equal(pickStorageBackend({ DATABASE_URL: 'mysql://a:b@c/d' }).kind, 'json');
  assert.equal(pickStorageBackend({ DATABASE_URL: 'redis://a:b@c' }).kind, 'json');
  // Nhưng nếu biến SAU trong danh sách là Postgres hợp lệ thì vẫn dùng được.
  const mixed = { DATABASE_URL: 'mysql://a:b@c/d', POSTGRES_URL: PG };
  assert.equal(pickStorageBackend(mixed).kind, 'postgres');
  assert.equal(pickStorageBackend(mixed).source, 'POSTGRES_URL');
});

test('looksLikePostgresUrl: chấp nhận cả postgres:// lẫn postgresql://', () => {
  assert.equal(looksLikePostgresUrl('postgres://a/b'), true);
  assert.equal(looksLikePostgresUrl('postgresql://a/b'), true);
  assert.equal(looksLikePostgresUrl('POSTGRES://a/b'), true);
  assert.equal(looksLikePostgresUrl('  postgres://a/b  '), true);
  assert.equal(looksLikePostgresUrl('http://a/b'), false);
  assert.equal(looksLikePostgresUrl(''), false);
  assert.equal(looksLikePostgresUrl(null), false);
});
