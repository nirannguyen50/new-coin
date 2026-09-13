'use strict';

/**
 * channel.js — ĐĂNG BÀI TỰ ĐỘNG lên kênh Telegram công khai của bot (@lixibot_kenh).
 *
 * VÌ SAO CÓ FILE NÀY: kênh trống trơn trông như dự án bị bỏ hoang (xem
 * `docs/16-ke-hoach-xay-cong-dong-tu-so.md`, giai đoạn 0). Nhưng chủ dự án không thể
 * ngồi dán tay mỗi ngày một bài trong 30 ngày. Bot vốn đã là admin của kênh và vốn đã
 * có một lịch chạy hằng ngày trên Vercel (`api/cron.js`), nên chính bot đăng lấy.
 *
 * BA NGUYÊN TẮC:
 *   1. KHÔNG tải nội dung từ mạng lúc chạy — hàng đợi bài nằm ngay trong bản deploy
 *      (`bot/content/channel-posts.js`), nên không có lỗi mạng nào làm hỏng việc đăng.
 *   2. KHÔNG BAO GIỜ đăng trùng: mã bài được "xí phần" (claim) trong database TRƯỚC khi
 *      gọi Telegram. Cron chạy hai lần trong ngày, hay hai instance chạy song song, thì
 *      chỉ một lần xí được — lần kia thấy bài đã có chủ và bỏ qua.
 *   3. KHÔNG BAO GIỜ đăng bài còn chỗ trống: bài "tuần này thay đổi gì" cần số liệu thật
 *      của tuần đó (`needsManualData`) nên bộ đăng tự động bỏ qua, để người thật điền.
 *
 * CÔNG TẮC TẮT: đặt biến môi trường `CHANNEL_AUTOPOST=off` là dừng hẳn việc đăng
 * (không cần redeploy code, không cần sửa gì khác).
 *
 * Phần chọn bài và phần đọc cấu hình đều là HÀM THUẦN nên test được đầy đủ; chỉ
 * `runChannelAutopost` mới chạm vào Telegram và database.
 */

const { CHANNEL_POSTS } = require('../content/channel-posts');
const ledger = require('./ledger');
const { safeErrorMessage } = require('./redact');

/** Các giá trị của `CHANNEL_AUTOPOST` được hiểu là "tắt". */
const AUTOPOST_OFF_VALUES = new Set(['off', 'tat', 'khong', 'no', 'false', '0']);

/**
 * Bộ đăng bài tự động có đang bật không. HÀM THUẦN.
 * Mặc định BẬT — thiếu biến môi trường không phải là lý do để kênh im lặng; muốn tắt
 * thì phải nói rõ `CHANNEL_AUTOPOST=off`.
 */
function isAutopostEnabled(env = process.env) {
  const raw = String((env && env.CHANNEL_AUTOPOST) || '')
    .trim()
    .toLowerCase();
  return !AUTOPOST_OFF_VALUES.has(raw);
}

/**
 * Chuẩn hoá id kênh. HÀM THUẦN.
 * Chấp nhận cả hai dạng Telegram cho phép:
 *   - `@ten_kenh` (kênh công khai) — cả khi người dùng quên `@` hoặc dán nguyên URL
 *     `https://t.me/ten_kenh`.
 *   - id số (kênh riêng tư, dạng `-1001234567890`).
 * @returns {string|null} null khi chưa cấu hình hoặc giá trị không dùng được.
 */
function normalizeChannelChatId(raw) {
  let text = String(raw == null ? '' : raw).trim();
  if (!text) return null;
  text = text.replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '');
  if (/^-?\d+$/.test(text)) {
    const n = Number(text);
    return Number.isSafeInteger(n) && n !== 0 ? String(n) : null;
  }
  const username = text.replace(/^@/, '');
  return /^[A-Za-z0-9_]{4,64}$/.test(username) ? `@${username}` : null;
}

/**
 * Bài kế tiếp chưa đăng. HÀM THUẦN — không đụng database, không đụng mạng.
 *
 * Thứ tự đăng CHÍNH LÀ thứ tự mảng trong `content/channel-posts.js`. Bài đã đăng và bài
 * cần số liệu thật (`needsManualData`) đều bị bỏ qua; bỏ qua chứ không dừng lại, nên một
 * bài phải điền tay không chặn 25 bài phía sau.
 *
 * @param {Iterable<string>} postedIds mã các bài đã đăng
 * @param {object[]} [posts] hàng đợi (mặc định toàn bộ thư viện)
 * @returns {object|null} bài kế tiếp, hoặc null khi hết bài đăng tự động được
 */
function nextChannelPost(postedIds, posts = CHANNEL_POSTS) {
  const done = new Set([...(postedIds || [])].map(String));
  for (const post of posts) {
    if (!post || !post.id) continue;
    if (post.needsManualData) continue;
    if (done.has(String(post.id))) continue;
    return post;
  }
  return null;
}

/** Còn bao nhiêu bài đăng tự động được (để log và báo cáo). HÀM THUẦN. */
function countRemainingPosts(postedIds, posts = CHANNEL_POSTS) {
  const done = new Set([...(postedIds || [])].map(String));
  return posts.filter((p) => p && p.id && !p.needsManualData && !done.has(String(p.id))).length;
}

/** Lý do bỏ qua → câu log tiếng Việt (không có bí mật nào ở đây). */
const SKIP_REASONS = {
  tat_cong_tac: 'CHANNEL_AUTOPOST=off — bộ đăng bài tự động đang tắt.',
  thieu_kenh:
    'Chưa đặt biến môi trường CHANNEL_CHAT_ID (ví dụ @lixibot_kenh) nên không biết đăng vào đâu.',
  kenh_khong_hop_le:
    'CHANNEL_CHAT_ID không hợp lệ — phải là @ten_kenh hoặc id số dạng -1001234567890.',
  het_bai: 'Hàng đợi đã hết bài đăng tự động được (các bài còn lại cần số liệu thật).',
  da_co_nguoi_dang: 'Bài kế tiếp vừa được một lần chạy khác đăng — bỏ qua để không đăng trùng.',
  da_dang_hom_nay: 'Hôm nay đã đăng một bài rồi — mỗi ngày đúng một bài.',
};

/**
 * Hôm nay (theo UTC, cùng cách tính "ngày" với phần thưởng hoạt động) đã đăng bài chưa.
 * HÀM THUẦN.
 *
 * Vì sao cần thêm chốt này khi đã có khoá chính chống đăng trùng: khoá chính chỉ chặn
 * ĐÚNG MỘT bài không bị đăng hai lần. Nếu cron chạy hai lần trong một ngày (Vercel thử
 * lại, hoặc admin gọi tay `/api/cron`) thì lần thứ hai sẽ lấy bài KẾ TIẾP và kênh nhận
 * hai bài trong một ngày — đúng cú pháp nhưng sai ý định "mỗi ngày một bài".
 */
function alreadyPostedToday(lastPostedAt, nowMs = Date.now()) {
  const last = Number(lastPostedAt) || 0;
  if (last <= 0) return false;
  return ledger.dateKey(last) === ledger.dateKey(nowMs);
}

/**
 * Quyết định lần chạy này đăng bài nào. HÀM THUẦN.
 * @returns {{ok: true, chatId: string, post: object, remaining: number}
 *          |{ok: false, reason: string, message: string}}
 */
function planChannelPost({ env = process.env, postedIds = [], posts = CHANNEL_POSTS } = {}) {
  if (!isAutopostEnabled(env)) {
    return { ok: false, reason: 'tat_cong_tac', message: SKIP_REASONS.tat_cong_tac };
  }
  const raw = (env && env.CHANNEL_CHAT_ID) || '';
  if (!String(raw).trim()) {
    return { ok: false, reason: 'thieu_kenh', message: SKIP_REASONS.thieu_kenh };
  }
  const chatId = normalizeChannelChatId(raw);
  if (!chatId) {
    return { ok: false, reason: 'kenh_khong_hop_le', message: SKIP_REASONS.kenh_khong_hop_le };
  }
  const post = nextChannelPost(postedIds, posts);
  if (!post) return { ok: false, reason: 'het_bai', message: SKIP_REASONS.het_bai };
  return { ok: true, chatId, post, remaining: countRemainingPosts(postedIds, posts) };
}

/**
 * Đăng bài kế tiếp lên kênh. KHÔNG BAO GIỜ ném lỗi ra ngoài — việc đăng bài kênh không
 * được phép làm hỏng phần phát thưởng của `api/cron.js`.
 *
 * Trình tự cố ý là XÍ PHẦN TRƯỚC, GỬI SAU:
 *   1. `claimChannelPost` chèn mã bài vào database; khoá chính chặn lần chạy thứ hai.
 *   2. Gửi tin lên kênh.
 *   3. Gửi hỏng → `releaseChannelPost` trả mã lại hàng đợi để mai đăng lại.
 * Nếu làm ngược lại (gửi trước, ghi sau) thì một lần crash giữa chừng sẽ làm bài được
 * đăng hai lần — điều duy nhất không được phép xảy ra trên một kênh công khai.
 *
 * @param {{telegram: object, storage: object, env?: object, nowMs?: number, posts?: object[]}} opts
 * @returns {Promise<{daDang: boolean, maBai: string|null, tieuDe: string|null,
 *                    lyDo: string, conLai: number|null}>}
 */
async function runChannelAutopost({
  telegram,
  storage,
  env = process.env,
  nowMs = Date.now(),
  posts = CHANNEL_POSTS,
} = {}) {
  const idle = (reason, message, extra = {}) => ({
    daDang: false,
    maBai: null,
    tieuDe: null,
    lyDo: message || SKIP_REASONS[reason] || reason,
    conLai: null,
    ...extra,
  });

  if (!isAutopostEnabled(env)) return idle('tat_cong_tac');

  let postedIds = [];
  try {
    postedIds = await storage.listPostedChannelPostIds();
    if (typeof storage.lastChannelPostAt === 'function') {
      const lastAt = await storage.lastChannelPostAt();
      if (alreadyPostedToday(lastAt, nowMs)) {
        console.log(`[kenh] Bỏ qua: ${SKIP_REASONS.da_dang_hom_nay}`);
        return idle('da_dang_hom_nay');
      }
    }
  } catch (err) {
    const message = `Không đọc được danh sách bài đã đăng: ${safeErrorMessage(err, env)}`;
    console.error('[kenh]', message);
    return idle('loi_doc', message);
  }

  const plan = planChannelPost({ env, postedIds, posts });
  if (!plan.ok) {
    console.log(`[kenh] Bỏ qua: ${plan.message}`);
    return idle(plan.reason, plan.message);
  }

  let claimed = false;
  try {
    claimed = await storage.claimChannelPost(plan.post.id, nowMs, plan.chatId);
  } catch (err) {
    const message = `Không ghi được dấu mốc "đã đăng": ${safeErrorMessage(err, env)}`;
    console.error('[kenh]', message);
    return idle('loi_ghi', message);
  }
  if (!claimed) {
    console.log(`[kenh] Bỏ qua: ${SKIP_REASONS.da_co_nguoi_dang}`);
    return idle('da_co_nguoi_dang');
  }

  try {
    await telegram.sendMessage(plan.chatId, plan.post.text, {
      // Bài là VĂN BẢN THUẦN (xem growth/05): không bật parse_mode để một dấu `_` hay `*`
      // trong bài không làm Telegram từ chối cả tin nhắn.
      disable_web_page_preview: true,
    });
  } catch (err) {
    const message = `Telegram từ chối bài ${plan.post.id}: ${safeErrorMessage(err, env)}`;
    console.error('[kenh]', message);
    try {
      await storage.releaseChannelPost(plan.post.id);
    } catch (releaseErr) {
      console.error('[kenh] Không trả được mã bài về hàng đợi:', safeErrorMessage(releaseErr, env));
    }
    return idle('loi_gui', message);
  }

  console.log(`[kenh] Đã đăng bài ${plan.post.id} (${plan.post.title}).`);
  return {
    daDang: true,
    maBai: plan.post.id,
    tieuDe: plan.post.title,
    lyDo: '',
    conLai: Math.max(0, plan.remaining - 1),
  };
}

module.exports = {
  AUTOPOST_OFF_VALUES,
  CHANNEL_POSTS,
  SKIP_REASONS,
  alreadyPostedToday,
  countRemainingPosts,
  isAutopostEnabled,
  nextChannelPost,
  normalizeChannelChatId,
  planChannelPost,
  runChannelAutopost,
};
