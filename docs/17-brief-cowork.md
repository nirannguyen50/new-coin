# Hộp thư chung với Cowork

> **Cowork: đọc file này mỗi khi bắt đầu một lượt làm việc.** Đây luôn là bản chỉ dẫn mới nhất.
> Đừng làm theo trí nhớ từ lượt trước — kế hoạch có thể đã đổi.
>
> **Cách báo cáo:** mở một **GitHub Issue** tại
> https://github.com/nirannguyen50/new-coin/issues/new với tiêu đề bắt đầu bằng `[cowork]`.
> Không sửa code, không tạo Pull Request. Issue là kênh duy nhất để báo cáo.

Cập nhật lần cuối: 13/9/2026.

## 0. Kênh liên lạc chính: Trạm điều phối

**Bảng điều khiển chung:** https://claude.ai/code/artifact/140bad84-e6fc-47a5-bec0-b8ba1cb26f58

Mở link đó trong trình duyệt. Ở đó có:

- **Kênh liên lạc** — khung chat chung giữa Quản lý và Thực thi. Đọc tin mới, gửi tin mới ở ô dưới cùng.
- **Việc đang giao** — thẻ việc kèm tiêu chí nghiệm thu.
- Số liệu, mốc tới Tết, link hạ tầng, tài liệu.

**Giao thức bắt buộc đọc một lần:**
https://github.com/nirannguyen50/new-coin/blob/main/docs/18-protocol-manager-executor.md

Ba luật quan trọng nhất, nhắc lại ở đây:

1. **Báo DONE phải kèm bằng chứng** — link thật, hoặc số liệu chép nguyên văn. Không bằng chứng thì chưa xong.
2. **Không xác minh được thì nói thẳng là chưa xác minh được.** Đó là câu trả lời tốt, không phải thất bại.
3. **Không tự hạ tiêu chí nghiệm thu** để việc trông như đã xong. Không đạt thì gửi tin `BLOCKED` kèm lý do cụ thể.

**Nhịp:** kiểm tra bảng điều khiển ở đầu mỗi lượt làm việc, và mỗi 30 phút trong lúc đang chạy.
Quản lý cũng tự kiểm tra mỗi 30 phút.

**Nếu bảng điều khiển không mở được:** lùi về GitHub Issue #1 như cũ, và ghi rõ lý do không mở được.

## 1. Trạng thái hiện tại

| Thứ | Giá trị |
|---|---|
| Bot đang chạy | `@lixi_vn_bot` |
| Link thêm bot vào nhóm | `https://t.me/lixi_vn_bot?startgroup=true` |
| Nhóm demo công khai | `https://t.me/lixibot_demo` |
| Kênh thông báo | `https://t.me/lixibot_kenh` |
| Trang hướng dẫn | `https://new-coin-orcin.vercel.app` |
| Mã nguồn | `https://github.com/nirannguyen50/new-coin` |
| Kế hoạch đang áp dụng | `docs/16-ke-hoach-xay-cong-dong-tu-so.md` |
| Hạn chót mùa vụ | Tết 6/2/2027 |

## 2. Câu trả lời cho câu hỏi Cowork đang chờ

**Stack kỹ thuật** (dùng cho bài Reddit và mọi bài kỹ thuật khác):

- Node.js 22, thư viện Telegraf v4 cho Telegram Bot API
- PostgreSQL (Neon, gói miễn phí) để lưu số dư và lịch sử
- Chạy dạng serverless function trên Vercel (webhook, không long-polling)
- Test: `node:test` có sẵn của Node, 217 test, có cả test chạy với Postgres thật
- Không dùng framework web, không dùng ORM

## 3. SỬA GẤP trước khi đăng bất kỳ bài nào

Ba bản nháp hiện tại nói "không crypto, không token". Điều đó **không khớp** với repo, vốn có
`docs/00`–`docs/10` về tokenomics, whitepaper, hồ sơ Binance, và nhánh tên `binance-coin-plan`.
Người đọc bấm vào link sẽ thấy mâu thuẫn và tố là nói dối. Với dự án này, mất uy tín là mất tất cả.

README đã được viết lại để nói thẳng sự thật. **Mọi bài đăng phải dùng đúng cách diễn đạt này:**

> Bot miễn phí, mã nguồn mở. Điểm trong bot **không phải tiền**: không mua bán được, không quy đổi được,
> admin đặt lại về 0 lúc nào cũng được. **Chưa có token nào được phát hành** — repo có tài liệu kế hoạch
> cho một token trong tương lai, nhưng đó là kế hoạch, chưa tồn tại, và **bot không phụ thuộc vào nó**.

**Không được viết:** "no crypto", "không liên quan crypto", "no token" trống không. Đó là nói thiếu.
**Phải viết:** "chưa phát hành token nào, bot không cần token để chạy" — và nếu ai hỏi thêm thì chỉ thẳng
vào phần "Về phần token" ở đầu README.

Sửa lại cả ba bản nháp theo hướng này rồi gửi chủ dự án duyệt lần nữa.

## 4. Thứ tự việc tiếp theo

> Đọc hết danh sách này. Việc quan trọng nhất là việc A, chi tiết nằm ở **mục 7** cuối file —
> lượt trước đã bỏ sót vì nó nằm cuối, nên lần này làm A trước tiên.

### A. Thêm 3 biến môi trường trên Vercel — ƯU TIÊN CAO NHẤT, ~5 phút

Bot đã được lập trình để **tự chạy hằng ngày**: tự đăng bài lên kênh (33 bài đã nằm sẵn trong bản
deploy), tự nhắn chủ dự án ngay khi có nhóm thật thêm bot, và tự ghi báo cáo số liệu lên GitHub.
**Toàn bộ phần này đang nằm im** vì thiếu 3 biến môi trường. Thêm xong là không ai phải đăng bài tay nữa.

Làm theo **mục 7** ở cuối file này. Tóm tắt: `CHANNEL_CHAT_ID`, `GITHUB_REPORT_ISSUE`, `GITHUB_TOKEN`.
Dùng Issue **#1** (issue bạn vừa mở) làm issue theo dõi, tức `GITHUB_REPORT_ISSUE=1`.

Sau khi thêm xong: Redeploy, rồi báo lại trong issue là đã thêm đủ 3 biến chưa.

### B. Lấy số liệu gốc

Nhắn riêng `@lixi_vn_bot` lệnh `/thongke`, chép nguyên văn vào issue. Đây là mốc 0 để tuần sau so sánh.

### C. Đăng bài — chỉ khi chủ dự án đã gõ "ok"

Ba bản nháp đã sửa theo mục 3 và đang chờ duyệt. **Không đăng trước khi được duyệt.**
Khi có "ok": đăng lần lượt, **giãn cách tối thiểu 1 ngày giữa các nơi**, theo dõi bình luận và trả lời
thật lòng. Bài bị xoá hoặc bị mod nhắc thì dừng hẳn ở nơi đó, ghi lý do, không đăng lại.

### KHÔNG cần làm

- **Đổi Production Branch trên Vercel: bỏ qua.** Trợ lý code đẩy code lên cả hai nhánh nên deploy chạy
  bình thường dù Vercel đang trỏ vào nhánh nào. Đừng tốn thời gian vào việc này.

## 5. Việc KHÔNG làm

- Không nhắn cho bất kỳ ai trong danh bạ Telegram hiện tại của chủ dự án (đồng nghiệp công ty cũ).
- Không nhắn tin riêng cho người lạ chưa từng tương tác.
- Không tạo tài khoản giả, không mua thành viên, không nhờ tương tác giả.
- Không dán cùng một đoạn text ra nhiều nơi.
- Không sửa code trong repo, không tạo Pull Request.
- Không nhập thẻ ngân hàng, không tạo tài khoản trả phí.
- Không hứa hẹn về giá, lợi nhuận, hay việc token sắp lên sàn.

## 6. Mẫu issue báo cáo

Tiêu đề: `[cowork] Báo cáo <ngày>`

```
## Đã làm
- ...
## Link đã đăng
- <nơi> — <link> — <lượt xem/bình luận nếu có>
## Bị chặn / không làm được
- <việc> — <lý do cụ thể>
## Kết quả /thongke
<dán nguyên văn>
## Cần quyết định
- <câu hỏi, nếu có>
```

## 7. Bàn giao: ba việc con người phải làm MỘT LẦN trên Vercel

Từ bản cập nhật này, bot tự làm ba việc vốn phải làm tay: đăng bài lên kênh mỗi ngày,
nhắn riêng cho chủ bot khi có nhóm mới, và tự viết báo cáo tiến độ lên GitHub.
Code đã xong và đã có test. **Chỉ còn ba biến môi trường phải đặt tay.**

Cho tới khi ba biến này được đặt, bot vẫn chạy bình thường: nó chỉ ghi lý do bỏ qua vào
log Vercel, không báo lỗi và không làm hỏng phần phát thưởng.

Nơi đặt biến (dùng chung cho cả ba): Vercel → dự án `new-coin` → **Settings** →
**Environment Variables** → **Add New** → chọn cả ba môi trường (Production, Preview,
Development) → **Save**. Đặt xong cả ba rồi mới bấm **Redeploy** một lần.

### 7.1. `CHANNEL_CHAT_ID` — để bot tự đăng bài lên kênh

1. Mở kênh `https://t.me/lixibot_kenh` → biểu tượng kênh → **Edit** → **Administrators**
2. **Add Admin** → chọn `@lixi_vn_bot` → bật quyền **Post Messages** → **Save**
3. Vercel → thêm biến `CHANNEL_CHAT_ID` với giá trị `@lixibot_kenh`

Từ lần cron chạy kế tiếp, mỗi ngày bot đăng **đúng một bài**, theo thứ tự trong
`bot/content/channel-posts.js` (chuyển nguyên văn từ `growth/05-thu-vien-noi-dung-30-ngay.md`).

**Sáu bài vẫn phải đăng tay** — các bài "tuần này thay đổi gì" và bài tổng kết tháng
(ngày 6, 14, 21, 22, 28, 30) còn chỗ trống `[[SỐ]]` cần số liệu thật của tuần đó. Bot
**cố ý bỏ qua** chúng: đăng một bài minh bạch mà để trống số liệu còn tệ hơn không đăng.

**Công tắc tắt:** đặt `CHANNEL_AUTOPOST=off` là dừng hẳn việc đăng bài, không cần sửa
code. Các bài đã đăng vẫn được ghi nhớ; bật lại là đăng tiếp đúng chỗ cũ.

### 7.2. Issue theo dõi trên GitHub — nơi bot ghi báo cáo hằng ngày

1. Mở https://github.com/nirannguyen50/new-coin/issues/new
2. Tiêu đề: `Báo cáo tự động hằng ngày` — nội dung: một dòng bất kỳ
3. **Submit new issue**
4. Nhìn địa chỉ trang vừa tạo: `.../issues/12` → số `12` chính là giá trị cần đặt
5. Vercel → thêm biến `GITHUB_REPORT_ISSUE` = `12` (chỉ con số, không có dấu `#`)

Bot **chỉ thêm bình luận** vào đúng issue này, không bao giờ tự mở issue mới. Đây là
kênh để trợ lý điều phối (chỉ đọc được GitHub) thấy con số thật mà không cần ai chép tay.

### 7.3. `GITHUB_TOKEN` — token fine-grained, quyền nhỏ nhất

1. Mở https://github.com/settings/personal-access-tokens/new
2. **Token name**: `lixi-bot-bao-cao` · **Expiration**: chọn thời hạn (ví dụ 1 năm)
3. **Resource owner**: tài khoản sở hữu repo (`nirannguyen50`)
4. **Repository access**: chọn **Only select repositories** → chọn **đúng một** repo `new-coin`
5. **Permissions** → **Repository permissions** → tìm mục **Issues** → đổi sang **Read and write**
   (không bật thêm quyền nào khác; *Metadata: Read-only* tự bật, đó là bình thường)
6. **Generate token** → chép chuỗi bắt đầu bằng `github_pat_...`
7. Vercel → thêm biến `GITHUB_TOKEN` = chuỗi vừa chép

Token này chỉ bình luận được vào issue của **đúng một repo** — không đẩy được code, không
đọc được repo khác. Lỡ lộ thì vào lại trang ở bước 1 bấm **Revoke**, tạo cái mới, dán lại.

Token **không bao giờ** bị in ra log: nó nằm trong danh sách bí mật của `bot/src/redact.js`,
và mọi thông báo lỗi (kể cả phần GitHub trả về) đều đi qua đó trước khi được in.

### 7.4. Tuỳ chọn: `IGNORED_CHAT_IDS` — bớt làm phiền

Khi một nhóm thêm bot, bot nhắn riêng cho mọi id trong `BOT_SUPER_ADMIN_IDS`: tên nhóm,
số thành viên xấp xỉ, có phải đến từ nút giới thiệu không, và tổng số nhóm hiện có.

Nhóm demo và nhóm thử của chủ dự án không đáng báo. Thêm id của chúng vào
`IGNORED_CHAT_IDS` (cách nhau bằng dấu phẩy) là bot im lặng với riêng những nhóm đó.

### 7.5. Kiểm tra sau khi Redeploy

- Vercel → **Deployments** → bản mới nhất → **Functions** → `/api/cron` → xem log lần chạy.
  Log tiếng Việt nói rõ đã đăng bài nào, hoặc vì sao bỏ qua.
- Kênh `@lixibot_kenh`: sáng hôm sau phải có bài ghim xuất hiện.
- Issue theo dõi: sáng hôm sau phải có một bình luận mới với bảng số liệu.
- Nếu chưa có gì: xem log — bot luôn ghi lý do cụ thể (thiếu biến nào, GitHub trả về mã gì).
