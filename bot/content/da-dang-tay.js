'use strict';

/**
 * content/da-dang-tay.js — MÃ NHỮNG BÀI ĐÃ ĐĂNG TAY LÊN KÊNH, trước khi bot tự chạy.
 *
 * VÌ SAO CÓ FILE NÀY. Sổ "đã đăng" của bot nằm trong database của chính nó và chỉ ghi
 * những lần CHÍNH NÓ đăng. Con người đăng tay thì sổ không biết. Ngày 13/9/2026 chủ dự án
 * đăng tay một số bài lúc dựng kênh; tới 01:44 ngày 14/9 bộ đăng tự động chạy lần đầu, mở
 * sổ ra thấy trống, và đăng lại từ bài số một — bài `ghim` xuất hiện hai lần trên kênh.
 *
 * Đó không phải lỗi logic: bot làm đúng theo sổ của nó. Lỗi là sổ thiếu dữ liệu. Và hậu quả
 * còn ở phía trước — mọi bài đã đăng tay đều sẽ bị đăng lại, mỗi ngày một bài, cho tới khi
 * hết chỗ trùng. Một kênh lặp lại chính mình là thứ người lạ đầu tiên ghé vào sẽ thấy.
 *
 * CÁCH DÙNG: thêm mã bài (đúng `id` trong `channel-posts.js`) vào mảng dưới đây. Bộ đăng
 * bài coi chúng như đã đăng rồi và bỏ qua, y như bài nó tự đăng.
 *
 * KHÔNG đoán mã bài. Đối chiếu bằng những chữ ĐẦU TIÊN của bài thật trên kênh với `text`
 * trong `channel-posts.js`. Không chắc bài nào thì ĐỪNG thêm — thêm nhầm nghĩa là một bài
 * chưa ai đọc sẽ không bao giờ được đăng, và không ai phát hiện ra.
 */

const DA_DANG_TAY = [
  // Chờ thẻ A14: Thực thi liệt kê 11 bài đang có trên kênh kèm chữ đầu, rồi Quản lý dò mã
  // và điền vào đây. Để trống thì bộ đăng bài chạy y như cũ — an toàn, chỉ là còn trùng.
];

module.exports = { DA_DANG_TAY };
