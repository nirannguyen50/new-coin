'use strict';

/**
 * index.js — Điểm khởi động Lì Xì Bot.
 * Đọc TELEGRAM_BOT_TOKEN từ biến môi trường; nếu thiếu, in lỗi rõ ràng và exit 1
 * (KHÔNG được thoát exit 0 im lặng — dễ khiến người vận hành tưởng bot chạy tốt).
 *
 * Hai chế độ chạy (tự chọn, xem src/webhook.js):
 *   - WEBHOOK: khi có WEBHOOK_DOMAIN hoặc RENDER_EXTERNAL_URL (Render tự tiêm vào).
 *     Mở HTTP server trên PORT, Telegram POST update vào — hợp với hosting miễn phí
 *     kiểu Render (service ngủ sau ~15 phút, request của Telegram sẽ đánh thức nó).
 *   - LONG POLLING: khi không có hai biến trên — dùng khi chạy ở máy cá nhân.
 */

const { loadConfig } = require('./src/config');
const { createStorage } = require('./src/storage');
const { safeErrorMessage } = require('./src/redact');
const {
  createBot,
  registerShutdownHandlers,
  startDailyRewardJob,
  startPollingMode,
  startWebhookMode,
} = require('./src/bot');

function loadDotEnvIfPresent() {
  // Không bắt buộc phải có package `dotenv` — tự đọc file .env đơn giản nếu tồn tại,
  // để giữ số dependency ở mức tối thiểu (đúng tinh thần "không cần native module").
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

/** In cảnh báo "dữ liệu sẽ bị xoá" khi chạy webhook mà chưa có kho lưu trữ bền vững. */
function warnEphemeralStorage() {
  console.warn(
    '\n==============================================================\n' +
      'CẢNH BÁO: DỮ LIỆU CÓ THỂ BỊ XOÁ SẠCH SAU MỖI LẦN KHỞI ĐỘNG LẠI\n' +
      '==============================================================\n' +
      'Bot đang chạy ở chế độ webhook nhưng CHƯA cấu hình kho lưu trữ bền vững\n' +
      '(chưa có DATABASE_URL hoặc REDIS_URL). Gói miễn phí của Render KHÔNG có đĩa\n' +
      'bền vững: toàn bộ sổ cái JSON trong bot/data/ sẽ bị XOÁ mỗi lần restart,\n' +
      'redeploy, hoặc khi service tự ngủ rồi thức dậy.\n' +
      '→ Số dư điểm LIXI của cả nhóm sẽ quay về 0 và KHÔNG khôi phục được.\n' +
      '→ Chỉ dùng cấu hình này để CHẠY THỬ. Đừng hứa với thành viên rằng điểm được giữ lâu dài.\n' +
      '→ Xem bot/README.md mục "Chạy 24/7 miễn phí trên Render" để biết cách xử lý.\n' +
      '==============================================================\n'
  );
}

async function main() {
  loadDotEnvIfPresent();
  const config = loadConfig();

  if (!config.telegramBotToken) {
    console.error(
      'LỖI: Không tìm thấy TELEGRAM_BOT_TOKEN.\n' +
        'Vui lòng tạo file bot/.env (xem bot/.env.example) hoặc set biến môi trường ' +
        'TELEGRAM_BOT_TOKEN với token lấy từ @BotFather trên Telegram (xem README.md ' +
        'mục "Tạo bot qua BotFather") rồi chạy lại.'
    );
    process.exit(1);
    return;
  }

  // Chọn kho lưu trữ: Postgres nếu có chuỗi kết nối trong biến môi trường, nếu không
  // thì file JSON như trước giờ. Chỉ in TÊN biến, không bao giờ in giá trị (có mật khẩu).
  const { storage, backend } = createStorage();
  if (backend.kind === 'postgres') {
    console.log(`Kho dữ liệu: PostgreSQL (lấy chuỗi kết nối từ biến ${backend.source}).`);
    try {
      await storage.ensureSchema();
      console.log('Đã kiểm tra/tạo xong các bảng trong database.');
    } catch (err) {
      console.error(
        'LỖI: Không kết nối/tạo được bảng trong Postgres: ' +
          safeErrorMessage(err) +
          `\nKiểm tra lại giá trị biến ${backend.source} (chuỗi kết nối) và xem database ` +
          'có cho phép kết nối từ máy này không. Bot sẽ dừng lại.'
      );
      process.exit(1);
      return;
    }
  } else {
    console.log('Kho dữ liệu: file JSON trong bot/data/ (chạy ở máy cá nhân).');
  }

  const bot = createBot(config.telegramBotToken, {
    superAdminIds: config.superAdminIds,
    storage,
  });

  // Lấy username bot một lần lúc khởi động (getMe, có cache) — cần cho nút "Thêm Lì Xì Bot
  // vào nhóm của bạn". Thất bại thì bot vẫn chạy, nút tạm ẩn và sẽ tự thử lại sau.
  bot.botIdentity
    .getUsername()
    .then((username) => {
      if (username) {
        console.log(`Bot Telegram: @${username} — nút "Thêm vào nhóm" đã sẵn sàng.`);
      } else {
        console.warn(
          'Chưa lấy được username bot (getMe) — nút "Thêm vào nhóm" tạm ẩn, bot sẽ tự thử lại.'
        );
      }
    })
    .catch(() => {});

  const rewardTimer = startDailyRewardJob(storage, config.dailyRewardCheckIntervalMinutes);

  if (config.mode === 'webhook') {
    console.log(
      `Chế độ chạy: WEBHOOK (lấy địa chỉ công khai từ ${config.webhookDomainSource}).`
    );
    if (!config.persistentStoreConfigured) {
      warnEphemeralStorage();
    }
    startWebhookMode(bot, {
      token: config.telegramBotToken,
      domain: config.webhookDomain,
      port: config.port,
    })
      .then((started) => {
        if (!started) return; // startWebhookMode đã in lỗi và thoát
        registerShutdownHandlers({ bot, storage, server: started.server, timers: [rewardTimer] });
      })
      .catch((err) => {
        console.error('Không khởi động được bot (chế độ webhook):', safeErrorMessage(err));
        process.exit(1);
      });
    return;
  }

  console.log(
    'Chế độ chạy: LONG POLLING (không thấy WEBHOOK_DOMAIN hay RENDER_EXTERNAL_URL — ' +
      'phù hợp khi chạy ở máy cá nhân).'
  );
  startPollingMode(bot);
  registerShutdownHandlers({ bot, storage, server: null, timers: [rewardTimer] });
}

main().catch((err) => {
  console.error('Không khởi động được bot:', safeErrorMessage(err));
  process.exit(1);
});
