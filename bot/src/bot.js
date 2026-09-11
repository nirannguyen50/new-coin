'use strict';

/**
 * bot.js — Khởi tạo Telegraf, đăng ký các lệnh, và job thưởng hoạt động hằng ngày.
 */

const http = require('http');
const { Telegraf } = require('telegraf');
const store = require('./store');
const ledger = require('./ledger');
const {
  buildWebhookUrl,
  deriveSecretToken,
  deriveWebhookPath,
  healthBody,
} = require('./webhook');

const startCmd = require('./commands/start');
const walletCmd = require('./commands/wallet');
const tipCmd = require('./commands/tip');
const withdrawCmd = require('./commands/withdraw');
const adminCmd = require('./commands/admin');

function isTrackedGroup(ctx) {
  return !!ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') && !!ctx.from;
}

function createBot(token, { superAdminIds = [] } = {}) {
  const bot = new Telegraf(token);

  // 1) Đánh dấu "đã thấy" người gửi trong nhóm — dùng cho hạn tuổi tài khoản
  //    (min account age). Chạy cho MỌI update có tin nhắn, kể cả lệnh.
  bot.use(async (ctx, next) => {
    if (isTrackedGroup(ctx)) {
      store.withGroupState(ctx.chat.id, (state) => {
        ledger.ensureMember(state, ctx.from.id);
      });
    }
    return next();
  });

  // 2) Đếm tin nhắn văn bản hợp lệ (không phải lệnh) cho thưởng hoạt động hằng ngày.
  //    Đăng ký trên bot.on('message', ...) và LUÔN gọi next() để các lệnh cụ thể
  //    (bot.command(...)) đăng ký sau vẫn được chạy bình thường.
  bot.on('message', async (ctx, next) => {
    const msg = ctx.message;
    const isCommand = !!(msg.text && msg.text.startsWith('/'));
    if (isTrackedGroup(ctx) && msg.text && !isCommand) {
      store.withGroupState(ctx.chat.id, (state) => {
        ledger.recordMessage(state, ctx.from.id);
      });
    }
    return next();
  });

  startCmd.register(bot);
  walletCmd.register(bot);
  tipCmd.register(bot);
  withdrawCmd.register(bot);
  adminCmd.register(bot, { superAdminIds });

  bot.catch((err, ctx) => {
    // Không để một lỗi lệnh làm crash cả tiến trình bot.
    console.error(`Lỗi khi xử lý update ${ctx.updateType}:`, err);
  });

  return bot;
}

/**
 * Chạy job "thưởng hoạt động" cho mọi nhóm đã có dữ liệu, mỗi lần gọi kiểm tra
 * idempotent theo ngày hiện tại (UTC) — an toàn khi gọi lại nhiều lần.
 *
 * LƯU Ý: dùng setInterval trong tiến trình bot — CHỈ phù hợp quy mô beta (3 nhóm
 * pilot). Trước khi mở rộng, thay bằng một scheduler thật (cron ngoài tiến trình,
 * hoặc queue) để không phụ thuộc vào việc tiến trình bot có đang chạy liên tục.
 */
function startDailyRewardJob(intervalMinutes) {
  const runOnce = () => {
    const now = Date.now();
    const dateStr = ledger.dateKey(now);
    for (const chatId of store.listGroupIds()) {
      try {
        store.withGroupState(chatId, (state) => ledger.runDailyReward(state, dateStr, now));
      } catch (err) {
        console.error(`[thuong-hoat-dong] Lỗi khi chạy cho nhóm ${chatId}:`, err.message);
      }
    }
  };
  runOnce(); // chạy ngay lúc khởi động (idempotent, không sao nếu đã chạy hôm nay rồi)
  const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
  return setInterval(runOnce, intervalMs);
}

// ---------------------------------------------------------------------------
// Chế độ chạy: WEBHOOK (deploy lên Render) và LONG POLLING (chạy ở máy cá nhân)
// ---------------------------------------------------------------------------

/**
 * Tạo handler cho HTTP server ở chế độ webhook:
 *   - `GET /` và `GET /healthz` → 200 + JSON tí hon, để health check của Render và
 *     mọi dịch vụ "ping" bên ngoài đều thành công (và qua đó đánh thức service).
 *     TUYỆT ĐỐI không trả về số dư, số nhóm, thông tin người dùng hay cấu hình.
 *   - `POST <đường dẫn bí mật>` → chuyển cho Telegraf xử lý update (Telegraf tự kiểm
 *     tra header secret token, sai thì không xử lý).
 *   - Còn lại → 404, không tiết lộ gì thêm.
 */
function createWebhookRequestHandler(bot, { webhookPath, secretToken }) {
  const telegrafCallback = bot.webhookCallback(webhookPath, { secretToken });
  const body = healthBody('webhook');

  return async (req, res) => {
    const pathOnly = String(req.url || '/').split('?')[0];
    if (req.method === 'GET' && (pathOnly === '/' || pathOnly === '/healthz')) {
      res.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'content-length': Buffer.byteLength(body),
        'cache-control': 'no-store',
      });
      res.end(body);
      return;
    }
    try {
      await telegrafCallback(req, res, () => {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('404');
      });
    } catch (err) {
      console.error('Lỗi khi xử lý request webhook:', err.message);
      if (!res.writableEnded) {
        res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('500');
      }
    }
  };
}

/**
 * Đăng ký webhook với Telegram nếu URL hiện tại khác URL mong muốn.
 * Nhờ vậy khi redeploy dưới một tên miền mới, bot TỰ sửa (self-heal) mà không cần
 * ai vào BotFather hay gọi API tay.
 * Không log URL đầy đủ (chứa phần bí mật) và không log secret.
 */
async function ensureWebhookRegistered(telegram, url, secretToken) {
  let currentUrl = '';
  try {
    const info = await telegram.getWebhookInfo();
    currentUrl = (info && info.url) || '';
  } catch (err) {
    // Không đọc được trạng thái hiện tại — cứ đăng ký lại cho chắc.
    console.warn('Không đọc được trạng thái webhook hiện tại, sẽ đăng ký lại.');
    currentUrl = '';
  }

  if (currentUrl === url) {
    console.log('Webhook đã trỏ đúng địa chỉ hiện tại, không cần đăng ký lại.');
    return { changed: false };
  }

  await telegram.setWebhook(url, {
    secret_token: secretToken,
    drop_pending_updates: false,
  });
  console.log(
    currentUrl
      ? 'Địa chỉ webhook cũ đã khác — đã đăng ký lại webhook mới với Telegram.'
      : 'Đã đăng ký webhook với Telegram.'
  );
  return { changed: true };
}

/**
 * Khởi động ở CHẾ ĐỘ WEBHOOK: mở HTTP server trên PORT, đăng ký webhook với Telegram.
 * Trả về { server, webhookPath, stop } — `stop` dùng cho tắt máy êm (graceful shutdown).
 * Nếu `setWebhook` thất bại: in lỗi tiếng Việt rõ ràng và thoát với mã khác 0.
 */
async function startWebhookMode(bot, { token, domain, port }) {
  const webhookPath = deriveWebhookPath(token);
  const secretToken = deriveSecretToken(token);
  const url = buildWebhookUrl(domain, webhookPath);

  const server = http.createServer(createWebhookRequestHandler(bot, { webhookPath, secretToken }));

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', () => {
      server.removeListener('error', reject);
      resolve();
    });
  });
  console.log(`Đang lắng nghe HTTP ở cổng ${port} (health check: GET / và GET /healthz).`);

  try {
    await ensureWebhookRegistered(bot.telegram, url, secretToken);
  } catch (err) {
    console.error(
      'LỖI: Không đăng ký được webhook với Telegram: ' +
        err.message +
        '\nKiểm tra lại: (1) TELEGRAM_BOT_TOKEN có đúng không, (2) địa chỉ công khai ' +
        '(WEBHOOK_DOMAIN / RENDER_EXTERNAL_URL) có truy cập được từ Internet qua HTTPS không, ' +
        '(3) máy chủ có ra được Internet để gọi api.telegram.org không.\n' +
        'Bot sẽ dừng lại (không chạy "giả vờ thành công").'
    );
    await new Promise((resolve) => server.close(resolve));
    process.exit(1);
    return null;
  }

  console.log(`Lì Xì Bot đã khởi động ở CHẾ ĐỘ WEBHOOK tại ${domain}, đang chờ tin nhắn...`);
  return { server, webhookPath, secretToken };
}

/**
 * Khởi động ở CHẾ ĐỘ LONG POLLING (giữ nguyên hành vi cũ) — dùng khi chạy ở máy cá nhân.
 * `bot.launch()` chỉ resolve khi bot dừng, nên KHÔNG await ở đây.
 */
function startPollingMode(bot) {
  bot
    // Callback chạy ngay sau khi kết nối Telegram thành công (getMe) — nhờ vậy dòng log
    // "đã khởi động" chỉ xuất hiện khi bot thật sự nói chuyện được với Telegram.
    .launch(() => {
      console.log('Lì Xì Bot đã khởi động ở CHẾ ĐỘ LONG POLLING, đang chờ tin nhắn...');
    })
    .then(() => {
      console.log('Lì Xì Bot đã dừng.');
    })
    .catch((err) => {
      console.error('Không khởi động được bot (chế độ long polling):', err.message);
      process.exit(1);
    });
}

/**
 * Đăng ký tắt máy êm cho SIGTERM/SIGINT (Render gửi SIGTERM mỗi lần redeploy/spin down):
 * dừng bot → dừng job định kỳ → ghi nốt dữ liệu JSON → đóng HTTP server → thoát.
 */
function registerShutdownHandlers({ bot, server = null, timers = [] } = {}) {
  let stopping = false;

  const shutdown = async (signal) => {
    if (stopping) return;
    stopping = true;
    console.log(`Nhận tín hiệu ${signal}, đang tắt bot một cách an toàn...`);

    for (const timer of timers) {
      if (timer) clearInterval(timer);
    }

    try {
      bot.stop(signal);
    } catch (err) {
      // Telegraf ném lỗi nếu bot chưa "launch" (chế độ webhook dùng HTTP server riêng).
      // Không sao — không có gì để dừng.
    }

    try {
      // Mọi thao tác ghi sổ cái đều đồng bộ (fs.*Sync) nên không có gì "đang chờ";
      // gọi cho tường minh để nếu sau này chuyển sang ghi bất đồng bộ thì có chỗ móc vào.
      store.flushPendingWrites();
    } catch (err) {
      console.error('Lỗi khi ghi nốt dữ liệu:', err.message);
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
      console.log('Đã đóng HTTP server.');
    }

    console.log('Đã tắt xong.');
    process.exit(0);
  };

  process.once('SIGINT', () => {
    shutdown('SIGINT');
  });
  process.once('SIGTERM', () => {
    shutdown('SIGTERM');
  });

  return shutdown;
}

module.exports = {
  createBot,
  createWebhookRequestHandler,
  ensureWebhookRegistered,
  registerShutdownHandlers,
  startDailyRewardJob,
  startPollingMode,
  startWebhookMode,
};
