# Website LiXi (LIXI) — trang giới thiệu tĩnh

Trang landing của LiXi — token lì xì BEP-20 trên BNB Chain cho cộng đồng người Việt (Lì Xì Bot trên Telegram:
thưởng, tip, bao lì xì chia ngẫu nhiên). Một file HTML, không phụ thuộc thư viện, không bước build, không tải tài nguyên từ bên thứ ba
(không CDN, không font ngoài, không analytics). Hoạt động từ 400px đến màn hình lớn; tự chuyển sáng/tối theo
`prefers-color-scheme`.

```
website/
├── index.html     # trang chủ (tiếng Việt)
├── them-bot.html  # hướng dẫn admin tự thêm Lì Xì Bot vào nhóm trong 2 phút (tự phục vụ, có FAQ)
├── style.css      # giao diện, biến màu sáng/tối (dùng chung cho cả hai trang)
├── script.js      # CONFIG (link), ALLOCATIONS (tokenomics), biểu đồ, menu mobile (dùng chung)
└── README.md
```

`them-bot.html` dùng chung `style.css` và `script.js` với trang chủ, chỉ thêm một khối `<style>` nhỏ cho bố cục
các bước. Trang được viết cho admin nhóm Telegram đọc xong là làm được, không cần liên hệ đội ngũ; mọi câu chữ
giữ nguyên nguyên tắc: điểm trong bot chưa có giá trị tiền, không hứa hẹn giá trị, không nói về giá.

## Xem thử trên máy

Mở thẳng `index.html` bằng trình duyệt, hoặc chạy một server tĩnh bất kỳ:

```bash
cd website
python3 -m http.server 8080
# mở http://localhost:8080
```

## Thay placeholder trước khi công bố

Mọi chỗ cần điền đều có dạng `[[ĐIỀN: ...]]` và được tô màu vàng trên trang để không bỏ sót.

1. **Liệt kê chỗ cần điền:**
   ```bash
   grep -n "ĐIỀN\|LINK_BOT" index.html them-bot.html script.js
   ```
   Riêng `them-bot.html` có placeholder `[[LINK_BOT]]` (xuất hiện nhiều lần, trong `href`): thay **toàn bộ** bằng
   link thêm bot vào nhóm dạng `https://t.me/<username_bot>?startgroup=true` (username lấy từ BotFather; khi đổi
   username bot thì đổi lại link này). Ví dụ:
   ```bash
   sed -i 's#\[\[LINK_BOT\]\]#https://t.me/<username_bot>?startgroup=true#g' them-bot.html
   ```
2. **Link kênh chính thức** — sửa object `CONFIG` ở đầu `script.js`. Link để trống sẽ trỏ về `#` và
   được đánh dấu `*` trên trang; điền URL thật thì dấu `*` tự mất. Khóa `pancakeswap` (link pool LIXI)
   chỉ điền **sau khi** đã phát hành và tự kiểm tra địa chỉ hợp đồng.
3. **Tokenomics** — sửa mảng `ALLOCATIONS` trong `script.js`. Biểu đồ và bảng đều sinh từ mảng này;
   tổng `pct` phải bằng 100 (trang sẽ hiện cảnh báo nếu sai). `TOTAL_SUPPLY` cố định 1.000.000.000.
4. **Nội dung sản phẩm** (hero, vấn đề/giải pháp, 3 thẻ tiện ích, lộ trình, FAQ) đã được viết cho LiXi và
   Lì Xì Bot; nếu sản phẩm thay đổi, sửa trực tiếp trong `index.html`. Không thêm số liệu người dùng,
   đối tác hay cộng đồng thí điểm cụ thể khi chưa có nguồn công khai.
5. **Bảo mật** — chỉ điền địa chỉ hợp đồng, multisig, LP lock **sau khi** đã deploy và verify thật.
   Đổi nhãn kiểm toán từ "Đang chờ" sang tên hãng + link báo cáo khi có báo cáo công khai.
6. **Đội ngũ** — thay 4 thẻ placeholder bằng thông tin thật; có thể thêm/bớt thẻ.
7. **Pháp lý** — điền tên pháp nhân, email, danh sách khu vực bị hạn chế theo ý kiến luật sư.
   Không xóa các đoạn miễn trừ trách nhiệm.
8. Khi đã điền xong, lệnh `grep -n "ĐIỀN" index.html script.js` phải không trả về dòng nào, và bỏ
   class `placeholder-text` / `placeholder-list` khỏi các phần tử đã điền để tắt tô vàng.

### Những điều không được làm trên trang

- Không dùng logo hoặc tên sàn giao dịch như đối tác, không viết "sắp lên sàn X".
- Không nêu tên hãng kiểm toán, nhà đầu tư, đối tác, KOL chưa ký hợp đồng và chưa công bố chính thức.
- Không thêm nội dung về giá, lợi nhuận kỳ vọng, hay đếm ngược listing.
- Không thêm script/CSS từ CDN hoặc analytics bên thứ ba nếu chưa cập nhật chính sách quyền riêng tư.

## Thêm tiếng Anh (i18n)

Cách đơn giản nhất, không cần build:

1. Sao chép `index.html` thành `en/index.html`, dịch nội dung, đổi `lang="en"` và sửa đường dẫn
   `../style.css`, `../script.js`.
2. Thêm nút chuyển ngôn ngữ vào `nav` của cả hai trang (`<a href="/en/">EN</a>` / `<a href="/">VI</a>`).
3. Nếu muốn một file duy nhất: đặt mọi chuỗi vào object `I18N = { vi: {...}, en: {...} }` trong
   `script.js`, gắn `data-i18n="key"` lên phần tử và thay `textContent` khi đổi ngôn ngữ. Mảng
   `ALLOCATIONS` giữ nguyên; chỉ dịch `name`, `cliff`, `vesting`.

## Triển khai

### GitHub Pages

1. Đẩy repo lên GitHub. Vào **Settings → Pages → Build and deployment**.
2. Source: *Deploy from a branch*; chọn branch (ví dụ `main`) và thư mục. GitHub Pages chỉ cho chọn
   `/ (root)` hoặc `/docs`, nên chọn một trong hai cách:
   - Tạo GitHub Action đơn giản copy `website/` lên branch `gh-pages` rồi chọn branch đó, hoặc
   - Chuyển nội dung `website/` vào `/docs` của một branch riêng dành cho trang web.
3. Tên miền riêng: thêm file `CNAME` chứa tên miền vào thư mục xuất bản và cấu hình DNS
   (`CNAME` → `<user>.github.io`). Bật **Enforce HTTPS**.

### Cloudflare Pages

1. **Workers & Pages → Create → Pages → Connect to Git**, chọn repo.
2. Framework preset: *None*. Build command: để trống. **Build output directory: `website`**.
3. Deploy. Gắn tên miền riêng trong **Custom domains**; Cloudflare tự cấp HTTPS.
4. (Tùy chọn) thêm `website/_headers` để đặt CSP chặt, ví dụ:
   ```
   /*
     Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'
     X-Content-Type-Options: nosniff
     Referrer-Policy: strict-origin-when-cross-origin
   ```

### Host tĩnh khác

Bất kỳ dịch vụ nào phục vụ file tĩnh (Netlify, Vercel, S3 + CloudFront, nginx) đều được: trỏ thư mục
gốc về `website/`, không cần build.

## Kiểm tra trước khi đẩy lên

```bash
# 1. HTML đóng mở thẻ đúng (script Python dùng html.parser, xem ví dụ trong lịch sử repo hoặc tự viết)
# 2. Không tải tài nguyên ngoài:
grep -nE "https?://|//cdn|@import|url\(" website/index.html website/them-bot.html website/style.css website/script.js
#    → không được có dòng nào (README này không tính vì không được trình duyệt tải).
# 3. Còn placeholder chưa điền?
grep -n "ĐIỀN\|LINK_BOT" website/index.html website/them-bot.html website/script.js
```

Kiểm tra thủ công: thu cửa sổ về ~400px (menu chuyển thành nút *Menu*, biểu đồ xếp dọc), bật chế độ tối
của hệ điều hành, dùng phím Tab đi qua các thanh biểu đồ và mục FAQ.
