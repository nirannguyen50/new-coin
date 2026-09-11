'use strict';

/**
 * scripts/backup.js — Sao lưu bot/data/ thành một file .tar.gz đặt tên theo
 * thời điểm chạy, trong bot/backups/ (gitignored). Dùng: `npm run backup`.
 *
 * Chỉ dùng module có sẵn của Node + lệnh `tar` có sẵn trên hầu hết Linux/macOS —
 * không thêm dependency mới.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const BACKUPS_DIR = path.join(ROOT_DIR, 'backups');

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

function main() {
  if (!fs.existsSync(DATA_DIR)) {
    console.log(`Chưa có dữ liệu ở ${DATA_DIR} — không có gì để backup.`);
    return;
  }
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });

  const fileName = `lixi-data-${timestamp()}.tar.gz`;
  const outPath = path.join(BACKUPS_DIR, fileName);

  const result = spawnSync('tar', ['-czf', outPath, '-C', ROOT_DIR, 'data'], {
    stdio: 'inherit',
  });

  if (result.error || result.status !== 0) {
    console.error('Backup thất bại. Nếu máy không có lệnh `tar`, hãy tự copy thủ công thư mục bot/data/.');
    process.exit(1);
    return;
  }

  console.log(`Đã backup dữ liệu vào: ${outPath}`);
}

main();
