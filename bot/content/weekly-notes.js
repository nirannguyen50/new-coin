'use strict';

/**
 * content/weekly-notes.js — GHI CHÚ TUẦN cho sáu bài "tuần này thay đổi gì" trên kênh.
 *
 * VÌ SAO CÓ FILE NÀY: sáu bài đó có hai loại chỗ trống. Con số (nhóm hoạt động, bao lì
 * xì, điểm đã tip) thì bot tự lấy từ chính database của nó lúc đăng — xem
 * `renderChannelPost` trong `src/channel.js`. Nhưng "tuần này đã làm gì, đang làm gì,
 * đã từ chối gì" thì không có database nào biết; phải có người viết. Người đó là trợ lý
 * quản lý dự án: mỗi tuần ghi vài dòng vào đây, push lên, Vercel deploy, bot đăng.
 *
 * LUẬT: bài nào CHƯA có ghi chú ở đây thì bộ đăng bài BỎ QUA bài đó (không dừng hàng
 * đợi), y như trước. Có ghi chú rồi mà thiếu một trường bắt buộc thì cũng bỏ qua — thà
 * không đăng còn hơn đăng một bài còn chỗ trống lên kênh công khai.
 *
 * Khoá là `id` của bài trong `channel-posts.js`. Trường nào bài đó dùng thì xem ngay
 * placeholder `[[...]]` trong bài: `[[tuan]]`, `[[thayDoi1]]`, `[[thayDoi2]]`,
 * `[[dangLam]]`, `[[loiDaBiet]]`, `[[daTuChoi]]`, `[[thangToi]]`.
 *
 * Ví dụ (bỏ dấu // để dùng):
 *
 *   'ngay-06': {
 *     tuan: 1,
 *     thayDoi1: 'sửa lỗi bot không đọc được tên người được reply',
 *     thayDoi2: 'thêm cảnh báo khi tắt thâm niên để thử',
 *     dangLam: 'viết thêm bài kênh cho tháng thứ hai',
 *   },
 *
 * Viết như nói chuyện, một dòng mỗi ý, không dấu chấm cuối (bài tự thêm dấu đầu dòng).
 * Không hứa hẹn, không nhắc giá, không nói "không có token" trống không.
 */

const WEEKLY_NOTES = {};

module.exports = { WEEKLY_NOTES };
