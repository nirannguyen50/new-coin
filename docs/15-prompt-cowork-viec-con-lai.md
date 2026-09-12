# Prompt bàn giao cho trợ lý điều khiển máy tính (Cowork)

Dùng khi muốn nhờ một trợ lý có quyền điều khiển trình duyệt và ứng dụng trên máy của chủ dự án
làm nốt những việc mà nền tảng bắt buộc phải có người thật thao tác (xem `docs/14` mục 4).

**Trước khi dán:** thay `[[...]]` bằng giá trị thật. **Không** lưu token thật vào file này rồi commit.

---

## Prompt (copy từ đây trở xuống)

Bạn giúp tôi hoàn tất phần thiết lập cuối cho một bot Telegram đang chạy thật. Tôi không rành kỹ thuật,
hãy làm trọn từ đầu đến cuối trên máy tôi và chỉ hỏi khi thực sự bắt buộc.

### Bối cảnh

- Bot Telegram tên **Lì Xì Bot** đang chạy thật trên Vercel, dự án `new-coin`, tên miền
  `https://new-coin-orcin.vercel.app`. Mã nguồn ở `https://github.com/nirannguyen50/new-coin`.
- Bot hiện tại là `@lixi_test_2026_bot` — username có chữ "test", nhìn thiếu nghiêm túc.
- **Telegram KHÔNG cho đổi username bot đã tạo.** Chỉ đổi được tên hiển thị. Muốn có username đẹp
  thì phải tạo bot MỚI và chuyển token sang. Việc này chỉ rẻ khi chưa có nhóm thật nào dùng bot —
  đúng tình trạng hiện tại.
- **Không sửa gì trong repo GitHub.** Người viết code đang theo dõi repo đó. Nếu cần sửa code, báo tôi.

### Việc 1 — Tạo bot mới với username tử tế

1. Mở Telegram, tìm **@BotFather**, gõ `/newbot`.
2. Tên hiển thị: `Lì Xì Bot`.
3. Username: thử lần lượt cho tới khi Telegram chấp nhận: `lixibot`, `lixi_vn_bot`, `lixivn_bot`,
   `lixi_thuong_bot`, `banlixi_bot`. Username phải kết thúc bằng `bot`, 5–32 ký tự, chỉ chữ, số, gạch dưới.
   **Không** dùng từ `test`, `tmp`, `demo`, hay số năm.
4. BotFather trả về một token dạng `123456:ABC...`. Ghi lại, đưa cho tôi ở cuối.
5. Vẫn trong BotFather, chọn bot mới: `/setdescription` đặt mô tả
   `Bot lì xì và tip điểm cho nhóm Telegram. Thưởng thành viên hoạt động, mở bao lì xì chia ngẫu nhiên.`
   và `/setabouttext` đặt `Lì Xì Bot — tip điểm, bao lì xì chia ngẫu nhiên cho nhóm Telegram.`

### Việc 2 — Lấy Telegram ID của tôi

Mở Telegram, tìm **@userinfobot**, bấm Start. Nó trả về một dãy số, đó là ID của tôi. Ghi lại.

### Việc 3 — Cập nhật Vercel

Vào `https://vercel.com`, mở dự án **new-coin**, vào **Settings → Environment Variables**:

1. Sửa `TELEGRAM_BOT_TOKEN` thành token của bot MỚI ở Việc 1.
2. Thêm mới `BOT_SUPER_ADMIN_IDS` = dãy số ở Việc 2.
3. Thêm mới `SETUP_KEY` = `[[ĐẶT_MỘT_CHUỖI_BẤT_KỲ_VÍ_DỤ_lixi-setup-9f2a7c]]`.
   (Bắt buộc: khoá mở trang cài đặt vốn suy ra từ token, đổi token là khoá cũ hết hiệu lực.)
4. Vào **Settings → Build and Deployment**, nếu ô **Build Command** đang có
   `cd bot && npm ci --omit=dev` thì **xoá trống** và bấm Save. (Repo đã sửa nên không cần nữa.)
5. Vào tab **Deployments**, bản mới nhất, menu ba chấm → **Redeploy**. Đợi khoảng 2 phút.
6. Mở trình duyệt tới
   `https://new-coin-orcin.vercel.app/api/setup?key=[[SETUP_KEY vừa đặt ở bước 3]]`
   Trang này in các dòng ✅ hoặc ❌ bằng tiếng Việt. Chụp lại hoặc chép nguyên văn cho tôi.

### Việc 4 — Kiểm tra bot mới chạy

1. Mở `https://t.me/[[username bot mới]]`, bấm Start. Bot phải trả lời lời chào tiếng Việt.
2. Tạo một nhóm Telegram mới tên `LiXi thử nghiệm 2`, thêm bot mới vào, cấp quyền admin
   (vào tên nhóm → Edit → Administrators → Add Admin → chọn bot → bật quyền → lưu).
3. Trong nhóm gõ lần lượt và chụp màn hình từng bước:
   `/caidat thamnien 0` → `/nap 5000` → (reply vào tin nhắn của chính tôi) `/nap 2000` →
   `/sodu` → `/lixi 300 chia 2` → `/bxh` → `/huongdan`
4. Nhắn riêng cho bot (chat 1-1) gõ `/thongke`. Phải ra số liệu, không được báo "chỉ dành cho admin".
   Nếu báo vậy nghĩa là `BOT_SUPER_ADMIN_IDS` ở Việc 3 sai, kiểm tra lại rồi Redeploy.

### Việc 5 — Tạo kênh Telegram công khai

1. Telegram → nút bút chì/dấu cộng → **New Channel**.
2. Tên: `Lì Xì Bot`. Mô tả: `Bot lì xì và tip điểm cho nhóm Telegram người Việt. Hướng dẫn, cập nhật, mẹo dùng.`
3. Đặt **Public**, username thử: `lixibot_kenh`, `lixi_channel`, `kenh_lixibot`.
4. Thêm bot mới vào kênh làm **admin** với quyền đăng bài.
5. Cho tôi biết link kênh.

### Việc 6 — Đăng bài đầu tiên

Mở `https://github.com/nirannguyen50/new-coin/blob/claude/binance-coin-plan-rthkem/growth/05-thu-vien-noi-dung-30-ngay.md`
Lấy **bài ghim (pinned)** và **7 bài đầu tiên**. Trong mỗi bài, thay `[[LINK_BOT]]` bằng
`https://t.me/[[username bot mới]]?startgroup=true`. Đăng bài ghim lên kênh và **ghim** nó.
Đăng tiếp 7 bài, mỗi bài cách nhau vài phút. **Không** đổi nội dung, **không** thêm lời hứa về giá
hay lợi nhuận.

### Việc 7 — Gửi tin nhắn gieo hạt (BẮT BUỘC HỎI TÔI TRƯỚC MỖI LẦN GỬI)

Mở `https://github.com/nirannguyen50/new-coin/blob/claude/binance-coin-plan-rthkem/growth/07-bo-tin-nhan-gieo-hat.md`

1. Mở Telegram, liệt kê cho tôi các **nhóm tôi đang là thành viên** có khoảng 30 người trở lên.
2. Tôi sẽ chọn 3–5 nhóm và nói cho bạn biết ai là admin tôi quen.
3. Với mỗi người, chọn mẫu hợp loại nhóm đó, thay `[[LINK_BOT]]`, rồi **đưa tôi xem bản nháp
   và chờ tôi đồng ý** trước khi gửi. Tôi phải duyệt từng tin một.
4. **Tuyệt đối không** nhắn cho người lạ, không đăng vào nhóm mà tôi không phải admin,
   không nhắn hàng loạt. Đây là tin nhắn cá nhân gửi người tôi quen thật.

### Việc 8 — Đăng ký danh bạ bot

Mở `https://github.com/nirannguyen50/new-coin/blob/claude/binance-coin-plan-rthkem/growth/06-danh-sach-noi-dang-ky-bot.md`
Làm những mục đánh dấu là miễn phí và không cần trả tiền. Với mỗi nơi, dùng đúng phần mô tả đã soạn sẵn
trong file, thay `[[LINK_BOT]]`. Chỗ nào file ghi "tìm bằng từ khóa" thì tìm, nếu không thấy trang còn
hoạt động thì bỏ qua và ghi lại cho tôi. **Không** tạo tài khoản trả phí, **không** nhập thẻ.

### Báo cáo cuối

Cho tôi: username bot mới và token, ID Telegram của tôi, nội dung trang `/api/setup`, ảnh chụp các lệnh
ở Việc 4, link kênh, số bài đã đăng, danh sách tin gieo hạt đã gửi (và cho ai), danh bạ đã đăng ký được
và nơi nào thất bại.

### Quy tắc bắt buộc

- **Không sửa code trong repo GitHub.** Lỗi thì báo tôi.
- **Token bot chỉ dán vào ô Environment Variables trên Vercel** và đưa cho tôi. Không đăng chỗ khác.
- **Không hứa hẹn về giá, lợi nhuận, hay việc token sắp lên sàn.** Điểm LIXI hiện chưa có giá trị tiền thật,
  mọi nội dung phải nói đúng như vậy.
- **Không tạo tài khoản giả, không mua thành viên, không nhắn tin hàng loạt.**
- Nếu bạn **không điều khiển được máy tôi** hoặc không đăng nhập được Telegram/Vercel, nói thẳng ngay,
  và cho tôi biết chính xác việc nào tôi phải tự làm. Đừng đoán, đừng giả vờ đã làm.
