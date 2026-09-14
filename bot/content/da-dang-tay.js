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
  // Tám bài dưới đây được đăng TAY lên kênh tối 13/9/2026 (19:20–19:35) lúc dựng kênh,
  // trước khi bộ đăng tự động chạy lần đầu. Nguồn: thẻ A14.
  //
  // BẰNG CHỨNG, vì thêm nhầm một mã ở đây là xoá sổ một bài mà không ai hay:
  //  1. Thực thi đọc kênh năm lần độc lập; tám dòng này khớp nhau giữa các lần.
  //  2. Quản lý đối chiếu lại 8/8 tiền tố với `text` trong channel-posts.js — khớp hết.
  //  3. Chốt hạ: Thực thi báo bài `ngay-06` TRÊN KÊNH hiện "tuần 1", trong khi trong repo
  //     nó vẫn là "tuần [[tuan]]". Chỉ người đọc kênh thật mới thấy được khác biệt đó.
  //
  // CHƯA CHẮC, và cố ý không đụng tới: tổng số bài trên kênh (các lần đọc cho 9/10/11), và
  // một bài viết tay "Nhóm thử Lì Xì Bot đã mở!" không có id nào trong channel-posts.js nên
  // không liên quan tới hàng đợi. Cả hai điều đó không đổi kết luận về tám mã này.
  'ghim',
  'ngay-01',
  'ngay-02',
  'ngay-03',
  'ngay-04',
  'ngay-05',
  'ngay-06',
  'ngay-07',
];

module.exports = { DA_DANG_TAY };
