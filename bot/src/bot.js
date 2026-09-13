'use strict';

/**
 * bot.js — Khởi tạo Telegraf, đăng ký các lệnh, và job thưởng hoạt động hằng ngày.
 */

const http = require('http');
const { Telegraf } = require('telegraf');
const ledger = require('./ledger');
const { createBotIdentity } = require('./growth');
const { safeErrorMessage } = require('./redact');
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
const growthCmd = require('./commands/growth');

function isTrackedGroup(ctx) {
  return !!ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') && !!ctx.from;
}

/**
 * Tạo bot Telegraf và đăng ký toàn bộ lệnh.
 *
 * @param {string} token token bot từ @BotFather
 * @param {{superAdminIds?: string[], storage: object, botUsername?: string|null,
 *          env?: object}} options
 *        `storage` là kho lưu trữ đã chọn (JSON hoặc Postgres — xem src/storage.js).
 *        Mọi lệnh chỉ nói chuyện với `storage`, nên đổi kho KHÔNG phải sửa lệnh nào.
 *        `botUsername` (tuỳ chọn): username bot để dựng nút "Thêm vào nhóm"; không truyền
 *        thì bot tự hỏi Telegram (`getMe`) một lần và cache — test truyền thẳng để khỏi
 *        gọi mạng (xem `growth.createBotIdentity`).
 *        `env` (tuỳ chọn): biến môi trường để đọc cấu hình lúc chạy (hiện dùng cho
 *        `IGNORED_CHAT_IDS` — các nhóm không đáng báo "có nhóm mới"); mặc định `process.env`.
 */
function createBot(token, { superAdminIds = [], storage, botUsername = null, env = process.env } = {}) {
  if (!storage) {
    throw new Error('createBot: thiếu tham số `storage` (kho lưu trữ).');
  }
  const bot = new Telegraf(token);
  // Danh tính bot (username qua getMe, cache) — dùng cho các nút "thêm vào nhóm".
  // Gắn lên `bot` để điểm khởi động (index.js) làm ấm cache và log username lúc chạy.
  const identity = createBotIdentity(bot.telegram, { botUsername });
  bot.botIdentity = identity;

  // 1) Đánh dấu "đã thấy" người gửi trong nhóm — dùng cho hạn tuổi tài khoản
  //    (min account age) — VÀ "dọn lười" các bao lì xì đã hết giờ của nhóm này.
  //
  //    Dọn lười thay cho `setTimeout` của bản trước: trên serverless không có tiến
  //    trình sống lâu để hẹn giờ, nên mỗi lần nhóm có hoạt động là một cơ hội để đóng
  //    các bao lì xì quá hạn và hoàn điểm chưa ai nhận (xem `ledger.settleDueEnvelopes`).
  bot.use(async (ctx, next) => {
    if (isTrackedGroup(ctx)) {
      const now = Date.now();
      let settled = [];
      try {
        settled = await storage.withGroup(
          ctx.chat.id,
          (state) => {
            // `rememberMember` (thay cho `ensureMember`) ghi/làm mới luôn TÊN hiển thị
            // của người gửi, để mọi tin nhắn sau đó gọi tên thay vì số id Telegram.
            ledger.rememberMember(state, ctx.from, now);
            return ledger.settleDueEnvelopes(state, now);
          },
          { nowMs: now }
        );
      } catch (err) {
        console.error('Lỗi khi dọn bao lì xì hết giờ:', safeErrorMessage(err));
      }
      if (settled && settled.length) {
        await tipCmd.renderSettledEnvelopes(ctx.telegram, storage, ctx.chat.id, settled, { identity });
      }
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
      await storage.withGroup(ctx.chat.id, (state) => {
        ledger.rememberMember(state, ctx.from);
        ledger.recordMessage(state, ctx.from.id);
      });
    }
    return next();
  });

  startCmd.register(bot, { storage, identity });
  walletCmd.register(bot, { storage });
  tipCmd.register(bot, { storage, identity });
  withdrawCmd.register(bot, { storage });
  adminCmd.register(bot, { superAdminIds, storage });
  growthCmd.register(bot, { superAdminIds, storage, env });

  bot.catch((err, ctx) => {
    // Không để một lỗi lệnh làm crash cả tiến trình bot.
    console.error(`Lỗi khi xử lý update ${ctx.updateType}:`, err);
  });

  return bot;
}

/**
 * Công việc định kỳ khi chạy ở MÁY CÁ NHÂN (long polling): phát thưởng hoạt động cho
 * mọi nhóm + quét các bao lì xì đã hết giờ. Cả hai đều idempotent nên gọi lại bao
 * nhiêu lần cũng an toàn.
 *
 * Trên Vercel KHÔNG dùng hàm này — serverless không có tiến trình chạy liên tục để
 * `setInterval` sống được; ở đó việc này do `api/cron.js` (cron mỗi ngày một lần của
 * Vercel) và phần "dọn lười" trong middleware đảm nhiệm.
 */
function startDailyRewardJob(storage, intervalMinutes) {
  const runOnce = async () => {
    const now = Date.now();
    const dateStr = ledger.dateKey(now);
    try {
      await storage.runDailyRewardAllGroups(dateStr, now);
    } catch (err) {
      console.error('[thuong-hoat-dong] Lỗi khi chạy:', safeErrorMessage(err));
    }
    try {
      await storage.sweepDueEnvelopes(now);
    } catch (err) {
      console.error('[bao-li-xi] Lỗi khi quét bao hết giờ:', safeErrorMessage(err));
    }
  };
  // Chạy ngay lúc khởi động (idempotent, không sao nếu hôm nay đã phát thưởng rồi).
  runOnce().catch((err) => console.error('[job] Lỗi lần chạy đầu:', safeErrorMessage(err)));
  const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
  return setInterval(() => {
    runOnce().catch((err) => console.error('[job] Lỗi:', safeErrorMessage(err)));
  }, intervalMs);
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
      console.error('Lỗi khi xử lý request webhook:', safeErrorMessage(err));
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
        safeErrorMessage(err) +
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
      console.error('Không khởi động được bot (chế độ long polling):', safeErrorMessage(err));
      process.exit(1);
    });
}

/**
 * Đăng ký tắt máy êm cho SIGTERM/SIGINT (Render gửi SIGTERM mỗi lần redeploy/spin down):
 * dừng bot → dừng job định kỳ → ghi nốt dữ liệu JSON → đóng HTTP server → thoát.
 */
function registerShutdownHandlers({ bot, server = null, timers = [], storage = null } = {}) {
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
      // Kho JSON: mọi thao tác ghi đều đồng bộ (fs.*Sync) nên không có gì "đang chờ".
      // Kho Postgres: đóng pool kết nối để tiến trình thoát được sạch sẽ.
      if (storage) await storage.close();
    } catch (err) {
      console.error('Lỗi khi đóng kho dữ liệu:', safeErrorMessage(err));
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
