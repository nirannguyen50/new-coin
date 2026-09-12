# Prompt để nhờ một trợ lý khác triển khai bot lên Vercel

Dùng khi muốn nhờ Claude Cowork (hoặc bất kỳ trợ lý có quyền điều khiển trình duyệt) bấm giúp các bước deploy.

**Trước khi dùng:** thay `<DÁN_TOKEN_BOT>` và `<DÁN_SETUP_KEY>` bằng giá trị thật.
Không lưu giá trị thật vào file này rồi commit — token bot là bí mật, GitHub sẽ quét và cảnh báo.

Cách lấy `SETUP_KEY` nếu cần tính lại:

```bash
cd bot && node -e "console.log(require('./src/webhook.js').deriveSecretToken(process.env.TELEGRAM_BOT_TOKEN))"
```

---

## Prompt (copy từ đây trở xuống)

Bạn giúp tôi triển khai một bot Telegram lên Vercel. Tôi không biết lập trình, nên hãy làm trọn từ đầu đến cuối
và chỉ hỏi tôi khi thực sự bắt buộc.

### Bối cảnh

- Mã nguồn đã viết xong và đã đẩy lên GitHub: `https://github.com/nirannguyen50/new-coin`
- Repo chỉ có **một** nhánh tên `claude/binance-coin-plan-rthkem`, và đó cũng là nhánh mặc định.
  Không tạo nhánh mới, không tạo bản sao (fork/clone) của repo.
- Dự án đã có sẵn `vercel.json`, thư mục `api/` và `public/`. **Không cần sửa code.**
- Tôi đã đăng nhập Vercel bằng tài khoản GitHub trong trình duyệt.
- Bot Telegram đã tạo sẵn, địa chỉ: `https://t.me/lixi_test_2026_bot`

### Việc cần làm, theo đúng thứ tự

1. Vào `vercel.com`, bấm **Add New** → **Project**, tìm repo `new-coin` và bấm **Import**.
   Dùng đúng luồng **Import**; không dùng "Clone template" hay "Deploy template" vì chúng tạo ra repo trùng lặp.
2. **Trước khi** bấm Deploy, mở phần **Environment Variables** và thêm chính xác hai biến sau:
   - Tên `TELEGRAM_BOT_TOKEN`, giá trị `<DÁN_TOKEN_BOT>`
   - Tên `CRON_SECRET`, giá trị `<DÁN_CRON_SECRET>`
3. Bấm **Deploy** và đợi build xong.
4. Vào tab **Storage** của dự án, bấm **Create Database**, chọn **Neon** (Postgres), chọn gói **Free**,
   và gắn nó vào đúng dự án này. Bước này tự động thêm biến môi trường chứa chuỗi kết nối database.
5. Vào tab **Deployments**, ở bản deploy mới nhất bấm menu ba chấm rồi chọn **Redeploy**.
   Bước này bắt buộc, vì các hàm chỉ đọc được biến database mới sau khi deploy lại.
6. Lấy tên miền của dự án (dạng `https://<tên-dự-án>.vercel.app`) rồi mở **một lần** địa chỉ:
   `https://<tên-dự-án>.vercel.app/api/setup?key=<DÁN_SETUP_KEY>`
   Trang này in ra các dòng có dấu ✅ hoặc ❌ bằng tiếng Việt. Hãy đọc và báo lại cho tôi toàn bộ nội dung.
7. Mở `https://t.me/lixi_test_2026_bot`, gõ `/start`, và xác nhận bot có trả lời.

### Thế nào là xong

- Trang `/api/setup` báo đã đăng ký webhook thành công **và** đã tạo xong bảng trong database.
- Bot trả lời khi gõ `/start`.

Khi xong, báo lại cho tôi: tên miền dự án trên Vercel, nội dung trang `/api/setup`, và câu bot đã trả lời.

### Nếu gặp lỗi

- **Build đỏ:** mở tab **Logs** (hoặc **Build Logs**), copy nguyên văn đoạn lỗi và đưa cho tôi.
  Đừng tự sửa code trong repo, vì người viết code đang theo dõi repo này; chỉ báo lỗi cho tôi.
- **`/api/setup` trả về 401:** kiểm tra đã dán đúng và đủ `key=`, không thiếu ký tự.
- **`/api/setup` báo lỗi database:** kiểm tra bước 4 đã gắn Neon vào **đúng** dự án này,
  và đã **Redeploy** sau khi gắn.
- **Bot không trả lời:** mở lại `/api/setup?key=...` để đăng ký lại webhook, rồi thử `/start` lần nữa.
- **Nếu bạn không có quyền điều khiển trình duyệt đã đăng nhập của tôi:** nói thẳng ra ngay,
  và cho tôi biết chính xác bước nào tôi phải tự bấm. Đừng đoán hay giả vờ đã làm.

### Lưu ý bảo mật

- Token bot chỉ được dán vào ô **Environment Variables** của Vercel.
  Không đăng nó ra chỗ khác, không ghi vào file trong repo, không commit lên Git.
- Gói **Hobby** của Vercel không cho phép dùng cho mục đích thương mại. Đây chỉ là bản thử nghiệm.
