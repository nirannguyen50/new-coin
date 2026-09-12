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

## 2. So sánh các lựa chọn (cập nhật tháng 9/2026)

| Nơi chạy | Miễn phí | Cần thẻ | Chạy 24/7 | Lưu dữ liệu | Độ khó |
|---|---|---|---|---|---|
| **Vercel (Hobby) + Neon Postgres** ⭐ | Có | Không | Có (serverless, không ngủ) | **Giữ được** (Postgres) | Thấp, bấm chuột trên web |
| Render (web service + webhook), **không** gắn database | Có, 750 giờ/tháng | Không | Ngủ sau 15 phút, Telegram tự đánh thức | **Mất khi khởi động lại** | Thấp, bấm chuột trên web |
| Render + database Postgres miễn phí (đặt `DATABASE_URL`) | Có | Không | Ngủ sau 15 phút, Telegram tự đánh thức | **Giữ được** | Thấp–trung bình |
| Máy tính của bạn | Có | Không | Chỉ khi máy bật | Giữ được (file JSON) | Trung bình, cần cài Node.js |
| Oracle Cloud Always Free | Có | **Có** | Có | Giữ được | Cao |
| VPS trả phí (Hetzner, DigitalOcean…) | Không, ~5 USD/tháng | Có | Có | Giữ được | Trung bình |
| Fly.io | Không còn free thật sự | Có | Có | Giữ được | Trung bình |

⭐ = lựa chọn được khuyến nghị hiện nay.

## 3. Quyết định cho giai đoạn này

**Chạy trên Vercel gói Hobby, kèm database Neon Postgres miễn phí.** Hướng dẫn bấm từng bước:
`bot/README.md`, mục *“Chạy trên Vercel (khuyến nghị)”*.

Lý do đổi từ Render sang Vercel:

1. **Render free xoá sạch dữ liệu mỗi lần dịch vụ khởi động lại.** Đây là lý do quyết định.
   Gói free của Render không có ổ đĩa bền vững; mỗi lần redeploy, restart, hoặc dịch vụ ngủ
   rồi thức dậy, **toàn bộ số dư điểm, lịch sử giao dịch, pot, yêu cầu rút, quy tắc thưởng đều
   quay về 0 và không khôi phục được**. Với một bot mà giá trị duy nhất là “sổ cái điểm”, đó
   là lỗi chí mạng chứ không phải bất tiện nhỏ.
2. **Vercel gắn database chỉ bằng vài cú bấm.** Trong trang dự án có tab **Storage** →
   *Create Database* → **Neon (Postgres)** gói **Free**. Vercel **tự tiêm chuỗi kết nối** vào
   biến môi trường, người dùng **không phải copy/dán chuỗi kết nối** đi đâu cả — bớt đúng cái
   bước dễ sai nhất và dễ rò rỉ bí mật nhất.
3. **Không ngủ.** Vercel chạy theo mô hình serverless: mỗi tin nhắn Telegram gọi thẳng vào một
   hàm. Không có chuyện “dịch vụ ngủ 15 phút, tin nhắn đầu tiên mất cả phút mới được trả lời”
   như Render free. (Lần gọi đầu sau một thời gian dài vẫn có “khởi động nguội” khoảng 1 giây,
   không đáng kể.)
4. **Không cần thẻ ngân hàng**, đăng nhập bằng chính tài khoản GitHub đang chứa mã nguồn.

**Những đánh đổi phải chấp nhận (nói thẳng):**

- **Cron chỉ chạy được MỘT LẦN MỖI NGÀY** trên gói Hobby (tối đa 2 lịch/dự án), và Vercel chạy
  vào một thời điểm bất kỳ trong khung giờ đã đặt. Vì vậy bot **không** dựa vào cron để đóng
  bao lì xì hết giờ — việc đó được làm ngay khi nhóm có hoạt động tiếp theo (“dọn lười”), còn
  cron chỉ là lưới an toàn. Thưởng hoạt động vẫn phát mỗi ngày một lần, lệch giờ vài chục phút
  nhưng không lệch số điểm (thưởng tính theo ngày).
- **Gói Hobby KHÔNG cho phép dùng vào mục đích thương mại.** Điều khoản của Vercel giới hạn
  gói Hobby cho dự án cá nhân, phi thương mại. Chạy pilot/demo/nhóm bạn bè thì được; ngay khi
  bot gắn với hoạt động có doanh thu (bán token, quảng cáo, dịch vụ của một công ty) thì
  **bắt buộc** chuyển sang gói trả phí hoặc sang nơi khác (VPS, Render trả phí). Đây là ràng
  buộc pháp lý, không phải giới hạn kỹ thuật.
- **Không có tiến trình chạy liên tục.** Mọi công việc nền phải là “dọn lười + cron”, không
  được dùng `setInterval`/`setTimeout`. Mã nguồn đã được viết theo đúng ràng buộc này.
- **Neon gói Free cũng có hạn mức** dung lượng và giờ tính toán mỗi tháng — dư cho vài nhóm
  pilot, không phải hạ tầng cho hàng nghìn người dùng.

**Render vẫn được hỗ trợ làm phương án dự phòng.** File `render.yaml` vẫn nằm trong repo và
`bot/README.md` vẫn giữ nguyên hướng dẫn. Nếu vì lý do nào đó không dùng được Vercel, hãy chạy
trên Render **và nhớ đặt biến `DATABASE_URL`** trỏ tới một Postgres miễn phí — khi đó dữ liệu
được giữ y hệt, không phải sửa một dòng mã nào.

## 4. Việc “giữ dữ liệu” đã làm xong (không còn là TODO)

Trước đây mục này ghi *“khi nào thì gắn cơ sở dữ liệu”*. Việc đó **đã làm xong**:

- `bot/src/postgres-store.js` implement đúng interface `Ledger` mô tả ở đầu `bot/src/ledger.js`.
- `bot/src/storage.js` chọn kho lưu trữ theo biến môi trường: có chuỗi kết nối Postgres thì
  dùng Postgres, không có thì dùng file JSON như cũ.
- **Lệnh bot và logic chống lạm dụng không bị sửa** — đúng thiết kế của `docs/11`.

Hai điểm kỹ thuật đáng ghi lại, vì serverless chạy nhiều bản song song:

1. Mọi thao tác đổi điểm nằm trong một transaction mở đầu bằng `SELECT … FOR UPDATE` trên
   hàng của nhóm → các thao tác trong cùng một nhóm bị xếp nối tiếp nhau, dù chạy trên hai máy
   khác nhau.
2. Cột số dư có ràng buộc `CHECK (balance >= 0)` ở mức database — lưới an toàn cuối cùng
   chống việc tạo điểm từ hư không, kể cả khi mã nguồn có lỗi.

Cả hai đều có test tích hợp chạy trên Postgres thật (kể cả một test bắn 10 lệnh tip song song),
và CI chạy đầy đủ nhóm test đó.

## 5. Khi nào trả tiền

Trả tiền khi **một trong ba** điều sau xảy ra:

1. Bot bắt đầu phục vụ hoạt động **có tính thương mại** → gói Hobby của Vercel không còn hợp lệ.
2. Cần công việc nền **thường xuyên hơn một lần mỗi ngày** (ví dụ tổng kết theo giờ).
3. Số nhóm/người dùng vượt quá hạn mức miễn phí của Vercel hoặc Neon.

Mức hợp lý: Vercel Pro, hoặc một VPS khoảng 4–6 USD/tháng chạy được cả bot lẫn cơ sở dữ liệu,
không giới hạn giờ và không giới hạn tần suất cron.
