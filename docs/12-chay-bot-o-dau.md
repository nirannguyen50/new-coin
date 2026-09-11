# Chạy bot ở đâu: so sánh và lộ trình

> Bối cảnh: Railway đã hết hạn mức miễn phí. Tài liệu này chốt nơi chạy bot ở giai đoạn beta và
> điều kiện để nâng cấp. Xem thêm `docs/11` (vì sao bot chạy điểm off-chain trước).

## 1. Quy tắc an toàn trước khi chọn chỗ chạy

Token bot là chìa khóa điều khiển bot. Ai có token đều có thể đọc tin nhắn bot nhận được và nhắn tin dưới danh nghĩa bot.

- **Chỉ dán token vào nhà cung cấp có tên tuổi** (Render, Fly, Google, Oracle, Cloudflare, Hetzner, hoặc máy của chính bạn).
- **Không dùng các trang quảng cáo "free telegram bot hosting"** không rõ chủ sở hữu. Tìm trên mạng ra rất nhiều trang loại này;
  đưa token cho họ là đưa quyền điều khiển bot.
- Nếu nghi token bị lộ: mở BotFather, gõ `/revoke`, chọn bot, nhận token mới, cập nhật lại nơi chạy.
- Không commit token vào Git. File `bot/.env` đã nằm trong `.gitignore`.

## 2. So sánh các lựa chọn (tháng 9/2026)

| Nơi chạy | Miễn phí | Cần thẻ | Chạy 24/7 | Lưu dữ liệu | Độ khó |
|---|---|---|---|---|---|
| **Render (web service + webhook)** | Có, 750 giờ/tháng | Không | Ngủ sau 15 phút, Telegram tự đánh thức | **Mất khi khởi động lại** | Thấp, bấm chuột trên web |
| Máy tính của bạn | Có | Không | Chỉ khi máy bật | Giữ được | Trung bình, cần cài Node.js |
| Oracle Cloud Always Free | Có | **Có** | Có | Giữ được | Cao |
| VPS trả phí (Hetzner, DigitalOcean…) | Không, ~5 USD/tháng | Có | Có | Giữ được | Trung bình |
| Fly.io | Không còn free thật sự | Có | Có | Giữ được | Trung bình |

## 3. Quyết định cho giai đoạn này

**Chạy trên Render, gói free, chế độ webhook.** Lý do:

- Không cần thẻ ngân hàng, đăng nhập bằng chính tài khoản GitHub đang chứa mã nguồn.
- Chỉ cần bấm chuột, không cần cài gì trên máy.
- Chế độ webhook hợp với việc dịch vụ hay ngủ: Telegram gửi tin nhắn đến, dịch vụ tự thức dậy.

**Chấp nhận đánh đổi:** gói free không có ổ đĩa lưu lâu dài. Mỗi lần dịch vụ khởi động lại (redeploy, hoặc Render tự
khởi động lại), **toàn bộ số dư điểm và lịch sử sẽ bị xóa về 0**.

Ở giai đoạn này điều đó chấp nhận được, vì mục tiêu chỉ là trả lời một câu hỏi: *có nhóm nào thật sự dùng bot mỗi ngày không?*
Không được hứa với người dùng thử rằng điểm sẽ được giữ vĩnh viễn.

## 4. Khi nào nâng cấp để giữ dữ liệu

Gắn cơ sở dữ liệu miễn phí (Supabase, Neon, Upstash — đều không cần thẻ) khi **một trong hai** điều sau xảy ra:

1. Có ít nhất một nhóm dùng bot liên tục trên 1 tuần.
2. Có người phàn nàn vì mất điểm.

Khi đó: viết một lớp lưu trữ mới theo đúng giao diện `Ledger` trong `bot/src/store.js`, đổi cấu hình, không phải sửa lệnh bot.
Việc này tốn khoảng nửa buổi, vẫn miễn phí.

## 5. Khi nào trả tiền

Chỉ trả tiền khi đã có người dùng thật và việc bot ngủ/mất dữ liệu gây khó chịu thấy rõ. Mức hợp lý là một VPS khoảng
4–6 USD/tháng, chạy được cả bot lẫn cơ sở dữ liệu, không giới hạn giờ.
