'use strict';

/**
 * api/setup.js — TRANG CÀI ĐẶT MỘT LẦN (mở bằng trình duyệt).
 *
 * Mở `https://<tên-dự-án>.vercel.app/api/setup?key=<mã bí mật>` một lần sau khi deploy.
 * Trang này làm ba việc rồi báo kết quả bằng tiếng Việt:
 *
 *   1. Tạo các bảng trong database (nếu đã gắn Neon Postgres) — an toàn khi chạy lại.
 *   2. Đăng ký webhook với Telegram, trỏ về chính bản deploy này (`/api/telegram`),
 *      kèm header bí mật để chỉ Telegram gọi vào được.
 *   3. Kiểm tra các thứ còn thiếu (chưa gắn database, chưa đặt CRON_SECRET) và hướng
 *      dẫn bấm nút nào để sửa.
 *
 * ---------------------------------------------------------------------------
 * VÌ SAO PHẢI CÓ `?key=`
 * ---------------------------------------------------------------------------
 * Trang này TRỎ webhook của bot. Nếu ai cũng mở được, người lạ có thể bấm liên tục để
 * quấy rối, hoặc (khi bot chạy ở nơi khác) cướp luồng tin nhắn về bản deploy này.
 * Vì vậy bắt buộc có `?key=` khớp biến môi trường `SETUP_KEY`, hoặc khớp chuỗi bí mật
 * suy ra từ token bot (xem bot/README.md để biết cách lấy chuỗi đó bằng một lệnh).
 *
 * TUYỆT ĐỐI KHÔNG in ra token bot, `?key=`, chuỗi bí mật webhook, hay chuỗi kết nối
 * database — kể cả khi thành công lẫn khi lỗi.
 */

const {
  buildTelegramWebhookUrl,
  getApp,
  isAuthorizedSetupRequest,
  readQuery,
  sendHtml,
} = require('../bot/src/serverless');
const { escapeHtml } = require('../bot/src/commands/helpers');
const { safeErrorMessage } = require('../bot/src/redact');

function li(ok, text) {
  return `<li><span class="${ok ? 'ok' : 'bad'}">${ok ? '✅' : '❌'}</span> ${text}</li>`;
}

module.exports = async function handler(req, res) {
  const query = readQuery(req);
  const auth = isAuthorizedSetupRequest({ headers: req.headers || {}, query }, process.env);
  if (!auth.ok) {
    sendHtml(
      res,
      401,
      `<h1>Không mở được trang cài đặt</h1>
       <p>Trang này cần mã bí mật để người lạ không đổi được cấu hình bot.</p>
       <p>Hãy mở lại địa chỉ có dạng <code>/api/setup?key=&lt;mã bí mật&gt;</code>.
       Cách lấy mã: xem mục <b>“Chạy trên Vercel (khuyến nghị)”</b> trong
       <code>bot/README.md</code>.</p>`
    );
    return;
  }

  let app;
  try {
    app = getApp();
  } catch (err) {
    sendHtml(
      res,
      500,
      `<h1>Chưa cấu hình xong</h1><p class="bad">${escapeHtml(safeErrorMessage(err))}</p>`
    );
    return;
  }

  const steps = [];
  let allOk = true;

  // --- 1) Tạo bảng trong database -----------------------------------------
  const usingPostgres = app.backend.kind === 'postgres';
  if (usingPostgres) {
    try {
      await app.storage.ensureSchema();
      steps.push(
        li(
          true,
          `Đã tạo/kiểm tra xong các bảng trong database PostgreSQL ` +
            `(lấy chuỗi kết nối từ biến <code>${escapeHtml(app.backend.source)}</code>).`
        )
      );
    } catch (err) {
      allOk = false;
      steps.push(
        li(
          false,
          `Không tạo được bảng trong database: <b>${escapeHtml(safeErrorMessage(err))}</b>. ` +
            `Kiểm tra lại phần <b>Storage</b> của dự án trên Vercel.`
        )
      );
    }
  } else {
    allOk = false;
    steps.push(
      li(
        false,
        `<b>CHƯA gắn database.</b> Trên Vercel, hệ thống file chỉ đọc nên bot ` +
          `<b>không lưu được điểm</b> nếu thiếu database. Vào dự án trên Vercel → tab ` +
          `<b>Storage</b> → <b>Create Database</b> → chọn <b>Neon (Postgres)</b> gói ` +
          `<b>Free</b> → <b>Connect</b>. Vercel sẽ tự thêm chuỗi kết nối vào biến môi ` +
          `trường. Sau đó vào tab <b>Deployments</b> → dấu <b>…</b> ở bản mới nhất → ` +
          `<b>Redeploy</b>, rồi mở lại trang này.`
      )
    );
  }

  // --- 2) Đăng ký webhook với Telegram ------------------------------------
  const { url, domain, source } = buildTelegramWebhookUrl(process.env);
  if (!url) {
    allOk = false;
    steps.push(
      li(
        false,
        'Không xác định được địa chỉ công khai của bản deploy này ' +
          '(thiếu cả <code>VERCEL_PROJECT_PRODUCTION_URL</code>, <code>VERCEL_URL</code> ' +
          'lẫn <code>WEBHOOK_DOMAIN</code>).'
      )
    );
  } else {
    try {
      await app.bot.telegram.setWebhook(url, {
        secret_token: app.secretToken,
        drop_pending_updates: false,
      });
      // In địa chỉ webhook là AN TOÀN ở đây: đường dẫn `/api/telegram` vốn công khai,
      // phần bí mật nằm ở header chứ không nằm trong URL (xem api/telegram.js).
      steps.push(
        li(
          true,
          `Đã báo cho Telegram gửi tin nhắn về <code>${escapeHtml(url)}</code> ` +
            `(địa chỉ lấy từ biến <code>${escapeHtml(source)}</code>).`
        )
      );
    } catch (err) {
      allOk = false;
      steps.push(
        li(
          false,
          `Không đăng ký được webhook với Telegram: <b>${escapeHtml(safeErrorMessage(err))}</b>. ` +
            `Thường là do <code>TELEGRAM_BOT_TOKEN</code> dán sai. Vào Vercel → ` +
            `<b>Settings</b> → <b>Environment Variables</b> để sửa rồi <b>Redeploy</b>.`
        )
      );
    }
  }

  // --- 3) Kiểm tra CRON_SECRET --------------------------------------------
  const hasCronSecret = Boolean(String(process.env.CRON_SECRET || '').trim());
  steps.push(
    hasCronSecret
      ? li(true, 'Đã đặt <code>CRON_SECRET</code> — công việc hằng ngày sẽ chạy được.')
      : li(
          false,
          `Chưa đặt <code>CRON_SECRET</code>. Thiếu biến này thì <b>thưởng hoạt động ` +
            `hằng ngày sẽ không được phát</b> (bot từ chối mọi lời gọi tới ` +
            `<code>/api/cron</code> vì không phân biệt được lịch chạy của Vercel với ` +
            `người lạ). Vào Vercel → <b>Settings</b> → <b>Environment Variables</b>, ` +
            `thêm <code>CRON_SECRET</code> với giá trị là một chuỗi ngẫu nhiên bất kỳ, ` +
            `rồi <b>Redeploy</b>.`
        )
  );
  if (!hasCronSecret) allOk = false;

  const heading = allOk
    ? '<h1 class="ok">🎉 Cài đặt xong!</h1>'
    : '<h1>Còn vài việc cần làm</h1>';

  const nextSteps = allOk
    ? `<h2>Tiếp theo</h2>
       <ol>
         <li>Mở Telegram, thêm bot vào nhóm của bạn và cấp <b>quyền admin</b> cho bot.</li>
         <li>Gõ <code>/start</code> trong nhóm — bot phải trả lời ngay.</li>
         <li>Admin gõ <code>/nap 1000</code> để nạp điểm vào pot, rồi
             <code>/thuong 10 5</code> để đặt quy tắc thưởng hoạt động.</li>
       </ol>
       <p>Bạn <b>không cần mở lại trang này</b> nữa, trừ khi đổi tên miền của dự án.</p>`
    : `<h2>Tiếp theo</h2>
       <p>Làm các mục dấu ❌ ở trên, bấm <b>Redeploy</b> trên Vercel, rồi mở lại chính
       địa chỉ này một lần nữa.</p>`;

  sendHtml(
    res,
    200,
    `${heading}
     <p>Kết quả kiểm tra bản deploy${domain ? ` tại <code>${escapeHtml(domain)}</code>` : ''}:</p>
     <ul>${steps.join('')}</ul>
     ${nextSteps}
     <hr>
     <p><small>Trang này không hiển thị token bot, mã bí mật hay chuỗi kết nối database.
     Hướng dẫn đầy đủ: <code>bot/README.md</code>, mục “Chạy trên Vercel (khuyến nghị)”.</small></p>`
  );
};
