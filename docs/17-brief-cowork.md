# Hộp thư chung với Cowork

> **Cowork: đọc file này mỗi khi bắt đầu một lượt làm việc.** Đây luôn là bản chỉ dẫn mới nhất.
> Đừng làm theo trí nhớ từ lượt trước — kế hoạch có thể đã đổi.
>
> **Cách báo cáo:** mở một **GitHub Issue** tại
> https://github.com/nirannguyen50/new-coin/issues/new với tiêu đề bắt đầu bằng `[cowork]`.
> Không sửa code, không tạo Pull Request. Issue là kênh duy nhất để báo cáo.

Cập nhật lần cuối: 13/9/2026.

## 0. Chu trình làm việc giữa hai bên

Hai trợ lý không nhắn trực tiếp cho nhau được. Trao đổi qua repo này:

```
   Chủ dự án bảo Cowork: "đọc brief rồi làm tiếp"
            │
            ▼
   Cowork đọc file này  →  làm việc  →  mở GitHub Issue "[cowork] ..."
            │
            ▼
   Trợ lý code tự thức dậy 2 lần/ngày (8:37 và 20:37), đọc issue,
   sửa code nếu cần, cập nhật file này, trả lời vào issue
            │
            ▼
   Lượt sau Cowork đọc lại file này và thấy việc mới
```

**Cowork lưu ý:** luôn đọc lại file này ở đầu mỗi lượt, kể cả khi nhớ việc từ lượt trước.
Trả lời của trợ lý code nằm trong phần bình luận của chính issue bạn đã mở.

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

0. **Dọn tên nhánh (làm trước, 2 phút).** Repo giờ có nhánh `main` sạch tên. Nhánh cũ tên
   `claude/binance-coin-plan-rthkem` nhìn rất giống dự án coin và nó đang là nhánh mặc định,
   tức tên đó hiện ngay trên URL khi ai đó mở repo.
   - Vào https://github.com/nirannguyen50/new-coin/settings/branches → mục **Default branch**
     → bấm nút đổi → chọn **`main`** → xác nhận.
   - Vào Vercel, dự án `new-coin` → **Settings → Git → Production Branch** → đổi sang **`main`** → Save.
     (Hai nhánh luôn trỏ cùng một commit nên đổi không làm gián đoạn bot.)
   - **Không xoá** nhánh cũ.
1. Sửa 3 bản nháp theo mục 3, gửi duyệt.
2. Đăng lần lượt, **giãn cách tối thiểu 1 ngày giữa các nơi**, không đăng ồ ạt.
3. Theo dõi bình luận ở mỗi nơi, trả lời thật lòng, nhất là câu hỏi kỹ thuật.
4. Bài bị xoá hoặc bị mod nhắc: dừng ở nơi đó ngay, ghi lý do, không đăng lại.
5. Sau mỗi đợt: nhắn riêng `@lixi_vn_bot` lệnh `/thongke`, chép kết quả vào issue báo cáo.

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
