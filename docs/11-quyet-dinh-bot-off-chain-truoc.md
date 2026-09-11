# Quyết định: xây Lì Xì Bot bằng điểm off-chain trước, chưa gắn token on-chain

> Bổ sung cho `docs/09` (mục 1 — phạm vi bot) và `docs/00` (quyết định token).

## Quyết định

Vì dự án chưa có ví, chưa có BNB và chưa có vốn cho thanh khoản, **bot bắt đầu bằng điểm LIXI nội bộ
(off-chain, lưu trong database của bot)**, không phải token BEP-20 thật. Mục tiêu: có sản phẩm dùng được
ngay, không cần một đồng vốn nào, để kiểm chứng có cộng đồng nào thật sự dùng bot mỗi ngày hay không trước khi
bỏ tiền vào thanh khoản.

## Vì sao chọn cách này

- 3/4 việc trong kế hoạch gốc (tạo ví, mua BNB, tạo Safe) cần tiền hoặc thời gian mà người dùng hiện chưa có.
- Toàn bộ giá trị của dự án nằm ở việc cộng đồng có dùng bot không, không nằm ở việc token có on-chain từ ngày đầu.
- Lớp lưu trữ điểm và lớp gọi hợp đồng token gần như cùng một giao diện (`Ledger`), nên chuyển từ off-chain sang
  on-chain sau này là đổi một module, không phải viết lại bot.

## Khác gì so với `docs/09` mục 1

| Mục | `docs/09` (giả định có token thật) | Bản off-chain (đang xây) |
|---|---|---|
| `/pot` | Nạp bằng LIXI on-chain, bot đọc block | Admin cấp điểm trực tiếp qua lệnh admin, ghi log |
| `/rut` | Gửi LIXI thật từ ví nóng ra BSC | Ghi nhận "yêu cầu rút", đánh dấu `pending`, admin duyệt thủ công; chưa chuyển tiền thật |
| Đối chiếu sổ cái | So khớp với số dư on-chain | Không có "on-chain" để so khớp; sổ cái của bot là nguồn sự thật duy nhất |
| Thưởng hoạt động, tip, bao lì xì chia ngẫu nhiên, hạn mức chống lạm dụng | Giữ nguyên | Giữ nguyên, hoạt động y hệt |

## Điều kiện để chuyển sang on-chain thật

Chuyển sang bản on-chain (theo đúng `docs/09`) khi **cả ba** điều sau đúng:
1. Ít nhất 1 trong 3 cộng đồng pilot dùng bot đều tay ≥ 4 tuần liên tục (có số liệu, không phải cảm giác).
2. Đã có ví Safe và BNB theo `docs/10`.
3. Đã quyết định số tiền thanh khoản ban đầu (xem bảng ngân sách `docs/09` mục 4).

Khi đó: đổi `Ledger` từ `JsonLedger` sang `OnChainLedger` (gọi `contracts/`), giữ nguyên toàn bộ lệnh và logic
chống lạm dụng, không đổi trải nghiệm người dùng.

## Rủi ro của việc chọn off-chain trước

- Điểm không có giá trị tài chính thật; không được truyền thông là "tiền" hay "sắp đổi ra tiền" cho người dùng thử,
  tránh vướng vấn đề pháp lý/kỳ vọng sai. Ghi rõ trong `/start` và mọi thông báo.
- Dữ liệu lưu trên máy chủ chạy bot; nếu máy chủ mất dữ liệu, mất luôn lịch sử điểm. Cần backup file dữ liệu định kỳ
  (bot có script `backup`, xem `bot/README.md`).
