'use strict';

/**
 * api/cron.js — CÔNG VIỆC HẰNG NGÀY trên Vercel (xem `crons` trong `vercel.json`).
 *
 * Bốn việc, tất cả đều idempotent (chạy lại không gây hại):
 *   1. Phát thưởng hoạt động cho mọi nhóm — mỗi (nhóm, ngày) chỉ phát ĐÚNG MỘT LẦN,
 *      dấu mốc nằm trong bảng `lixi_reward_runs` của database.
 *   2. Quét các bao lì xì đã hết giờ và hoàn phần chưa ai nhận cho người gửi.
 *      Đây là LƯỚI AN TOÀN cho cơ chế "dọn lười": bình thường bao lì xì được đóng ngay
 *      khi nhóm có hoạt động tiếp theo, nhưng nếu nhóm im lặng hẳn thì cron này dọn.
 *   3. Đăng MỘT bài lên kênh Telegram công khai (`bot/src/channel.js`). Mã bài được xí
 *      phần trong bảng `lixi_channel_posts` trước khi gửi, nên không bao giờ đăng trùng.
 *   4. Ghi báo cáo tiến độ hằng ngày lên GitHub (`bot/src/report.js`).
 *
 * ---------------------------------------------------------------------------
 * THỨ TỰ ƯU TIÊN KHI CÓ LỖI
 * ---------------------------------------------------------------------------
 * Việc 1 và 2 động vào ĐIỂM CỦA NGƯỜI DÙNG — lỗi ở đó làm cả lần chạy bị coi là hỏng
 * (HTTP 500) để Vercel hiện lên và người thật vào xem.
 *
 * Việc 3 và 4 chỉ là TRUYỀN THÔNG và BÁO CÁO. Kênh bị xoá, token GitHub hết hạn, mất
 * mạng giữa chừng — không cái nào được phép làm lần chạy bị coi là hỏng, và tuyệt đối
 * không được chặn phần phát thưởng (vốn đã chạy xong từ trước). Vì vậy lý do bỏ qua
 * của hai việc này nằm ở `summary.kenh` / `summary.baoCao`, KHÔNG nằm ở `summary.loi`.
 *
 * ---------------------------------------------------------------------------
 * CHẶN NGƯỜI LẠ
 * ---------------------------------------------------------------------------
 * Địa chỉ `/api/cron` là công khai, ai cũng mở được bằng trình duyệt. Vì hàm này phát
 * điểm cho thành viên nên PHẢI xác minh đúng là lịch chạy của Vercel:
 * khi dự án có biến môi trường `CRON_SECRET`, Vercel gửi kèm header
 * `Authorization: Bearer <CRON_SECRET>` mỗi lần chạy. Không có/không đúng → 401.
 * Chi tiết và các trường hợp biên nằm ở `isAuthorizedCronRequest` trong
 * `bot/src/serverless.js` (có unit test riêng).
 *
 * ---------------------------------------------------------------------------
 * GIỚI HẠN CỦA GÓI HOBBY (miễn phí)
 * ---------------------------------------------------------------------------
 * Gói Hobby chỉ cho tối đa 2 lịch cron mỗi dự án và TẦN SUẤT TỐI THIỂU LÀ MỘT LẦN MỖI
 * NGÀY; Vercel chạy vào một thời điểm bất kỳ trong khung giờ đã đặt (không đúng phút).
 * Vì vậy "thưởng hoạt động hằng ngày" có thể được phát lệch giờ vài chục phút — không
 * ảnh hưởng số điểm, vì việc phát thưởng tính theo NGÀY (UTC) chứ không theo giờ.
 */

const ledger = require('../bot/src/ledger');
const {
  CRON_REJECT_MESSAGES,
  getApp,
  isAuthorizedCronRequest,
  readQuery,
  sendJson,
} = require('../bot/src/serverless');
const { safeErrorMessage } = require('../bot/src/redact');
const channel = require('../bot/src/channel');
const report = require('../bot/src/report');

module.exports = async function handler(req, res) {
  const auth = isAuthorizedCronRequest(
    { headers: req.headers || {}, query: readQuery(req) },
    process.env
  );
  if (!auth.ok) {
    sendJson(res, 401, {
      ok: false,
      message: CRON_REJECT_MESSAGES[auth.reason] || 'Không được phép.',
    });
    return;
  }

  let app;
  try {
    app = getApp();
  } catch (err) {
    const message = safeErrorMessage(err);
    console.error('[cron] Chưa cấu hình xong:', message);
    sendJson(res, 500, { ok: false, message });
    return;
  }

  const now = Date.now();
  const dateStr = ledger.dateKey(now);
  const summary = {
    ok: true,
    ngay: dateStr,
    thuong: null,
    baoLiXi: null,
    kenh: null,
    baoCao: null,
    loi: [],
  };

  // 1) Thưởng hoạt động (idempotent theo nhóm + ngày).
  try {
    const results = await app.storage.runDailyRewardAllGroups(dateStr, now);
    summary.thuong = {
      soNhom: results.length,
      soNhomVuaPhat: results.filter((r) => r.alreadyRan === false).length,
      soNhomDaPhatTruocDo: results.filter((r) => r.alreadyRan === true).length,
    };
    for (const r of results) {
      if (r.error) summary.loi.push(`thưởng nhóm ${r.chatId}: ${r.error}`);
    }
  } catch (err) {
    console.error('[cron] Lỗi phát thưởng:', safeErrorMessage(err));
    summary.loi.push(`thưởng: ${safeErrorMessage(err)}`);
  }

  // 2) Quét bao lì xì hết giờ (lưới an toàn cho cơ chế dọn lười).
  try {
    const swept = await app.storage.sweepDueEnvelopes(now);
    summary.baoLiXi = {
      soNhomCoBaoHetGio: swept.length,
      soBaoDaDong: swept.reduce((sum, r) => sum + r.settled.length, 0),
    };
  } catch (err) {
    console.error('[cron] Lỗi quét bao lì xì:', safeErrorMessage(err));
    summary.loi.push(`bao lì xì: ${safeErrorMessage(err)}`);
  }

  // 3) Đăng một bài lên kênh công khai. `runChannelAutopost` đã tự bắt mọi lỗi bên
  //    trong; try/catch này chỉ là lớp chắn cuối cùng cho những gì không lường trước.
  try {
    summary.kenh = await channel.runChannelAutopost({
      telegram: app.bot.telegram,
      storage: app.storage,
      env: process.env,
      nowMs: now,
    });
  } catch (err) {
    const message = safeErrorMessage(err);
    console.error('[cron] Lỗi đăng bài kênh (bỏ qua, không làm hỏng lần chạy):', message);
    summary.kenh = { daDang: false, maBai: null, tieuDe: null, lyDo: message, conLai: null };
  }

  // 4) Báo cáo tiến độ lên GitHub. Cũng đã tự bắt lỗi bên trong.
  try {
    summary.baoCao = await report.runDailyReport({
      storage: app.storage,
      env: process.env,
      channel: summary.kenh,
      nowMs: now,
    });
  } catch (err) {
    const message = safeErrorMessage(err);
    console.error('[cron] Lỗi gửi báo cáo (bỏ qua, không làm hỏng lần chạy):', message);
    summary.baoCao = { daGui: false, lyDo: message };
  }

  // CHỈ việc 1 và 2 (phát thưởng, bao lì xì) mới quyết định lần chạy này thành công hay
  // không — xem phần "THỨ TỰ ƯU TIÊN KHI CÓ LỖI" ở đầu file.
  summary.ok = summary.loi.length === 0;
  sendJson(res, summary.ok ? 200 : 500, summary);
};
