# Danh sách nơi đăng ký / giới thiệu Lì Xì Bot — không trả tiền, không spam

> Mục tiêu: để người đang **tìm** một bot lì xì / bot tip điểm / bot thưởng thành viên cho nhóm Telegram tìm thấy
> Lì Xì Bot. Không mua vị trí, không đăng chéo hàng loạt, không nhắn riêng người lạ. Mỗi nơi đăng **một lần**,
> đúng chỗ, đúng luật của nơi đó, bằng tài khoản thật của chủ dự án.
>
> **Về link và tên nơi đăng:** tài liệu này viết tháng 9/2026 từ hiểu biết chung, **chưa kiểm tra lại từng nơi**.
> Nơi nào không chắc còn hoạt động được ghi rõ *"chưa chắc còn tồn tại — tìm bằng từ khóa …"* và **không có link**.
> Trước khi nộp ở đâu, mở nơi đó lên, đọc luật đăng bài, rồi mới dán hồ sơ. Nơi nào không mở được hoặc đòi trả phí thì bỏ.

## 0. Bốn quy tắc

1. **Bot phải sẵn sàng trước khi đăng ký:** username chính thức đã đổi (không còn `_test_`), ảnh đại diện, mô tả trong
   BotFather đã đặt, trang `website/them-bot.html` đã lên web, kênh Telegram công khai đã có bài ghim. Người bấm vào
   phải thêm được bot ngay; danh bạ không cho làm lại ấn tượng đầu.
2. **Không trả tiền** cho bất kỳ vị trí, "featured", "boost" nào. Nơi chỉ có gói trả phí thì bỏ qua.
3. **Không viết gì về giá trị điểm.** Mọi mô tả đều có câu "điểm không phải tiền / points have no cash value". Không nhắc
   token, blockchain, BNB Chain trong hồ sơ bot — bot hiện tại không có những thứ đó và nhắc đến chỉ làm người ta nghi ngờ.
4. **Ghi lại** mỗi lần nộp vào bảng ở mục 4 (ngày, nơi, trạng thái, link bài). Nộp xong không nhắc lại, không "bump".

## 1. Bộ hồ sơ chuẩn (dùng chung cho mọi nơi)

Chuẩn bị một lần, dán lại nhiều lần. Chỗ `[[...]]` điền trước khi dùng.

### Tên và link

| Mục | Giá trị |
|---|---|
| Tên hiển thị | **Lì Xì Bot** |
| Username | `[[@username_bot]]` (sau khi đổi tên chính thức) |
| Link thêm vào nhóm | `https://t.me/lixi_vn_bot?startgroup=true` = `https://t.me/[[username_bot]]?startgroup=true` |
| Link hướng dẫn | `https://new-coin-orcin.vercel.app` (trang `them-bot.html`) |
| Kênh Telegram | `https://t.me/lixibot_kenh` |
| Mã nguồn | `[[LINK_GITHUB]]` (nếu repo công khai) |
| Ảnh | Logo vuông 512×512 (nền đơn sắc, chữ "L" hoặc phong bao đỏ), 2–3 ảnh chụp màn hình: bao lì xì đang mở, lệnh `/nap` reply, `/sodu` |

### Tiếng Việt

**Một dòng (≤ 100 ký tự):**
> Bot lì xì cho nhóm Telegram: tip điểm, mở bao lì xì chia ngẫu nhiên, thưởng thành viên hoạt động. Miễn phí.

**Mô tả dài (~80 từ):**
> Lì Xì Bot giúp nhóm Telegram cảm ơn và khích lệ nhau mà admin không phải làm tay. Thành viên tip điểm cho nhau bằng
> `/lixi @user 50`, mở bao lì xì chia ngẫu nhiên bằng `/lixi 500 chia 5`, và nhận thưởng mỗi ngày khi hoạt động. Admin nạp
> pot, đặt luật chống lạm dụng, xem nhật ký bằng một lệnh. Thêm bot trong 2 phút, không cần liên hệ ai. Đang beta: điểm
> trong bot không phải tiền, không mua bán được. Tiếng Việt.

**Danh mục:** Cộng đồng / Công cụ cho nhóm / Giải trí
**Tags:** `bot lì xì`, `telegram`, `nhóm telegram`, `tip điểm`, `thưởng thành viên`, `bao lì xì`, `tiếng việt`, `cộng đồng`

### English

**One-liner (≤ 100 chars):**
> Red-envelope bot for Telegram groups: tip points, open random-split envelopes, reward active members. Free.

**Long description (~80 words):**
> Lì Xì Bot ("lì xì" is the Vietnamese red envelope) lets a Telegram group thank and cheer each other without the admin
> doing bookkeeping. Members tip points with `/lixi @user 50`, open envelopes that split randomly among the fastest
> claimers with `/lixi 500 chia 5`, and earn a daily reward for being active. Admins fund the pot, set anti-abuse limits and
> read the log with one command. Add it in two minutes, no sign-up. Beta: points have no cash value and cannot be traded.
> Vietnamese-language bot.

**Category:** Community / Group tools / Fun
**Tags:** `telegram-bot`, `red-envelope`, `tipping`, `community`, `group-rewards`, `vietnamese`, `telegraf`, `nodejs`

### Câu trả lời sẵn cho ba câu hỏi hay gặp ở mọi nơi

- *"Có phải crypto không?"* — Không. Bot hiện tại chạy bằng điểm nội bộ, không có token, không có ví, không có blockchain.
  Điểm không phải tiền và không mua bán được.
- *"Thu tiền bằng cách nào?"* — Chưa thu. Không phí, không quảng cáo, không bán dữ liệu. Đang beta để xem có nhóm nào dùng thật không.
- *"Bot đọc được gì?"* — Bot là admin nên đọc được tin nhắn trong nhóm; bot chỉ lưu **số** tin nhắn mỗi ngày của từng người
  để tính thưởng, không lưu nội dung. Chi tiết trong FAQ trang hướng dẫn.

## 2. Danh sách nơi đăng

Cột **Người thật bấm?**: "Có" nghĩa là nền tảng yêu cầu tài khoản thật, đăng nhập, xác nhận email hoặc captcha — chủ dự án
phải tự làm; agent chỉ soạn sẵn nội dung. Cột **Còn tồn tại?**: "Chắc" = nền tảng lớn, gần như chắc chắn còn; "Không chắc"
= từng tồn tại, chưa kiểm tra lại năm 2026, **không có link, tìm bằng từ khóa**.

### 2.1 Trong chính Telegram (làm đầu tiên, quan trọng nhất)

| # | Nơi | Họ cần gì | Người thật bấm? | Còn tồn tại? |
|---|---|---|---|---|
| 1 | **BotFather** — `/setdescription`, `/setabouttext`, `/setuserpic`, `/setcommands` | Mô tả (≤ 512 ký tự), "about" (≤ 120), ảnh, danh sách lệnh | Có (chat với BotFather) | Chắc |
| 2 | **Tìm kiếm toàn cục của Telegram** | Username chứa từ người ta gõ (`lixi`, `lixibot`); tên hiển thị có "Lì Xì" | Có (đổi username qua BotFather) | Chắc |
| 3 | **Kênh Telegram công khai của bot** | Bài ghim (có sẵn trong `growth/05` mục 1), link trong mô tả kênh | Có (tạo kênh) | Chắc |
| 4 | **Nhóm Telegram bàn về bot/dev** (ví dụ nhóm dành cho người viết bot, tiếng Anh) | Đọc luật nhóm trước; thường cấm quảng cáo, chỉ được hỏi kỹ thuật | Có | Không chắc — tìm bằng từ khóa "Telegram bot developers group"; không đăng nếu luật cấm tự quảng cáo |

**Nội dung cho BotFather** (dán khi được hỏi):

- `/setdescription` (hiện khi mở chat với bot lần đầu):
  ```
  Bot lì xì cho nhóm Telegram. Tip điểm cho nhau (/lixi @user 50), mở bao lì xì chia ngẫu nhiên (/lixi 500 chia 5), thưởng thành viên hoạt động mỗi ngày. Admin nạp pot, đặt luật, xem nhật ký. Miễn phí, đang beta. Điểm trong bot không phải tiền, không mua bán được. Thêm bot vào nhóm rồi gõ /start.
  ```
- `/setabouttext` (hiện trong hồ sơ bot, ≤ 120 ký tự):
  ```
  Bot lì xì cho nhóm Telegram: tip điểm, bao lì xì, thưởng thành viên. Miễn phí. Điểm không phải tiền.
  ```
- `/setcommands` (menu lệnh; mỗi dòng `lệnh - mô tả`, chữ thường, không dấu `/`):
  ```
  start - Lời chào và danh sách lệnh
  sodu - Xem số dư điểm của bạn trong nhóm
  lixi - Tip: /lixi @user 50 · Bao lì xì: /lixi 500 chia 5
  lichsu - 10 giao dịch gần nhất của bạn
  bxh - Top 10 người nhận nhiều điểm nhất 7 ngày qua
  huongdan - Hướng dẫn ngắn cho thành viên và admin
  pot - (admin) Số dư pot và nhật ký
  nap - (admin) /nap 1000 nạp pot · reply + /nap 100 cấp điểm
  thuong - (admin) /thuong 10 5 thưởng hoạt động
  caidat - (admin) Xem/đổi cấu hình chống lạm dụng
  ```

### 2.2 Danh bạ / catalog bot Telegram (miễn phí)

Hầu hết danh bạ bot Telegram là dự án bên thứ ba, sống chết thất thường. **Không nơi nào dưới đây có link** vì chưa kiểm
tra lại; tìm bằng từ khóa và tự đánh giá: nếu trang không cập nhật hơn 1 năm, đòi phí, hoặc bắt cấp token bot — bỏ.

| # | Nơi (tên từng biết) | Họ thường cần gì | Người thật bấm? | Còn tồn tại? |
|---|---|---|---|---|
| 5 | Danh bạ kiểu "BotList" | Username, tên, mô tả ngắn, danh mục, ảnh; đôi khi cần đăng nhập Telegram | Có | Không chắc — tìm "telegram bot list directory submit" |
| 6 | Danh bạ kiểu "StoreBot" | Tương tự; từng có đánh giá sao | Có | Không chắc — tìm "telegram bot store submit bot" |
| 7 | Catalog thống kê kênh/bot (kiểu "tgstat", "telemetr") | Thêm kênh/bot bằng cách đăng nhập Telegram; chủ yếu liệt kê kênh, bot là phụ | Có | Không chắc — tìm "telegram channel catalog add bot"; **không cấp token bot** cho bất kỳ dịch vụ nào |
| 8 | Trung tâm ứng dụng Telegram (Mini Apps) | Chỉ nhận Mini App (web app trong Telegram); Lì Xì Bot là bot lệnh, **không đủ điều kiện** | — | Không áp dụng cho tới khi có mini app |
| 9 | Các trang "top telegram bots" tiếng Anh (blog liệt kê) | Thường có form "suggest a bot" hoặc email | Có | Không chắc — tìm "best telegram bots for groups submit" |

Hồ sơ dán vào: **một dòng + mô tả dài** ở mục 1 (bản EN cho danh bạ quốc tế, bản VI nếu có trường tiếng Việt), danh mục
"Community" hoặc "Fun/Games", tags như mục 1.

### 2.3 Cộng đồng lập trình và công nghệ Việt Nam

Đăng **một bài chia sẻ cách làm**, không phải bài quảng cáo. Người đọc ở đây quan tâm "xây bot Telegram chạy trên
serverless miễn phí, dữ liệu không mất" hơn là "bot lì xì". Bot là ví dụ minh họa, link để ở cuối.

| # | Nơi | Họ cần gì | Người thật bấm? | Còn tồn tại? |
|---|---|---|---|---|
| 10 | **Viblo** (blog kỹ thuật tiếng Việt) | Tài khoản; bài viết Markdown; tag | Có | Chắc (tự kiểm tra lại) |
| 11 | **Dạy Nhau Học** (diễn đàn hỏi đáp lập trình) | Tài khoản; đăng ở mục chia sẻ dự án; đọc luật, tránh mục hỏi đáp | Có | Chắc (tự kiểm tra lại) |
| 12 | **Voz** (diễn đàn, có mục lập trình / phần mềm) | Tài khoản có thâm niên; bài trong đúng box; cấm link rút gọn, cấm spam | Có | Chắc (tự kiểm tra lại) |
| 13 | **Tinh tế** (diễn đàn công nghệ) | Tài khoản; bài ở mục phần mềm/ứng dụng; đọc luật quảng cáo | Có | Chắc (tự kiểm tra lại) |
| 14 | Nhóm Facebook lập trình viên Việt (ví dụ nhóm cộng đồng lập trình lớn có mục "chia sẻ dự án") | Bài phải được admin duyệt; thường cấm link trần trong bài, phải để bình luận | Có | Không chắc tên nhóm cụ thể — tìm "cộng đồng lập trình viên Việt Nam chia sẻ dự án" |
| 15 | **Dev.to / Hashnode** (tiếng Anh) | Tài khoản; bài Markdown; tag `telegram`, `nodejs`, `serverless` | Có | Chắc (tự kiểm tra lại) |

**Bài mẫu (tiếng Việt, cho Viblo / Dạy Nhau Học / Voz / Tinh tế / nhóm FB — chỉnh độ dài theo nơi):**

```
Tiêu đề: Mình làm một bot Telegram "lì xì" cho nhóm, chạy miễn phí trên serverless, dữ liệu không mất — chia sẻ cách làm

Chào mọi người. Mình vừa làm xong bản beta của Lì Xì Bot: bot cho nhóm Telegram để thành viên tip điểm cho nhau, mở bao lì xì chia ngẫu nhiên (ai bấm nhanh thì nhận), và thưởng điểm cho người hoạt động mỗi ngày. Admin nạp pot, đặt luật chống lạm dụng bằng lệnh.

Vài thứ kỹ thuật có thể hữu ích cho ai đang làm bot:
• Chạy bằng webhook trên serverless gói miễn phí + Postgres miễn phí, nên không mất dữ liệu khi restart (bài học đau: gói free của một nền tảng khác xóa sạch ổ đĩa mỗi lần ngủ).
• Không dùng hẹn giờ trong RAM: bao lì xì hết giờ được "dọn lười" khi nhóm có hoạt động, cộng thêm cron mỗi ngày làm lưới an toàn.
• Mọi thao tác đổi điểm nằm trong transaction có SELECT … FOR UPDATE, cộng CHECK (balance >= 0) ở database — 10 lệnh tip song song của cùng một người không tiêu quá số dư.
• Chống lạm dụng bằng cấu hình theo nhóm: thâm niên tối thiểu, cooldown, hạn mức tip/ngày, ngưỡng admin duyệt.

Nói rõ: đang beta, điểm trong bot chỉ là điểm, không phải tiền, không mua bán được, không có token gì cả. Mình làm để xem có nhóm nào dùng thật không.

Ai có nhóm muốn thử thì thêm bot trong 2 phút theo hướng dẫn: https://new-coin-orcin.vercel.app
Mã nguồn (nếu công khai): [[LINK_GITHUB]]
Rất mong góp ý về cách làm, đặc biệt phần chống lạm dụng.
```

**Bài mẫu (tiếng Anh, cho Dev.to / Hashnode):**

```
Title: I built a "red envelope" tipping bot for Telegram groups on a free serverless stack — lessons on state, timers and abuse limits

Lì Xì Bot ("lì xì" = Vietnamese red envelope) lets a Telegram group tip points to each other, open envelopes that split randomly among the fastest claimers, and pay a daily activity reward. Admins fund a pot and tune anti-abuse limits with commands.

Things worth sharing:
• Webhook mode on a free serverless tier + free Postgres, so nothing is lost on restarts.
• No in-memory timers: expired envelopes are settled lazily on the next group activity, with a once-a-day cron as a safety net.
• Every balance change runs in a transaction with SELECT … FOR UPDATE plus a CHECK (balance >= 0) constraint; ten parallel tips from one user cannot overspend.
• Per-group config: minimum tenure, cooldown, daily tip cap, admin-approval threshold.

Honest scope: beta, points have no cash value, no token, no wallet. I'm testing whether groups actually use it.

Setup guide (Vietnamese): https://new-coin-orcin.vercel.app · Source: [[LINK_GITHUB]]
Feedback on the abuse limits especially welcome.
```

### 2.4 GitHub

| # | Nơi | Họ cần gì | Người thật bấm? | Còn tồn tại? |
|---|---|---|---|---|
| 16 | **Repo công khai — mô tả + topics** | Vào Settings của repo: description một dòng, website = `https://new-coin-orcin.vercel.app`, topics | Có (chủ repo) | Chắc |
| 17 | **Danh sách "awesome" về Telegram bot** (repo tổng hợp do cộng đồng duy trì) | Mở pull request thêm một dòng theo đúng định dạng của họ; đọc CONTRIBUTING | Có (tạo PR) | Không chắc repo nào còn nhận PR — tìm trên GitHub "awesome telegram bots" và chọn repo có commit trong 12 tháng gần nhất |

- **Description (EN, một dòng):** `Red-envelope tipping bot for Telegram groups: tip points, random-split envelopes, daily activity rewards. Vietnamese. Beta, points have no cash value.`
- **Topics:** `telegram-bot`, `telegraf`, `nodejs`, `postgresql`, `serverless`, `vercel`, `red-envelope`, `tipping-bot`, `community`, `vietnamese`, `lixi`
- **Dòng cho awesome-list (EN):** `- [Lì Xì Bot](LINK) - Red-envelope tipping bot for Telegram groups (tip points, random-split envelopes, daily rewards). Vietnamese.`

Chỉ làm khi repo công khai. Repo công khai đồng nghĩa mọi `docs/` cũng công khai — đọc lại `docs/00` mục 6 trước khi mở.

### 2.5 Trang giới thiệu sản phẩm (kiểu Product Hunt)

| # | Nơi | Họ cần gì | Người thật bấm? | Còn tồn tại? |
|---|---|---|---|---|
| 18 | **Product Hunt** (quốc tế) | Tài khoản, tagline ≤ 60 ký tự, mô tả, 3+ ảnh, link; ra mắt theo ngày; **phải trả lời bình luận trong ngày** | Có, và tốn cả một ngày | Chắc — nhưng chỉ làm khi có ≥ 5 nhóm dùng thật; không thì bỏ, một lần ra mắt là hết |
| 19 | Trang ra mắt sản phẩm Việt Nam (từng có vài trang kiểu "Product Hunt Việt Nam") | Form đăng sản phẩm, tiếng Việt | Có | Không chắc — tìm "product hunt việt nam", "ra mắt sản phẩm việt"; bỏ nếu trang không cập nhật trong 6 tháng |
| 20 | **BetaList** và các trang liệt kê sản phẩm beta | Form, link, ảnh; có hàng đợi miễn phí nhiều tuần | Có | Chắc (tự kiểm tra lại); chỉ nhận sản phẩm có landing page tiếng Anh — cân nhắc sau khi có bản EN của trang hướng dẫn |

- **Tagline (EN, ≤ 60):** `Red-envelope tipping bot for Telegram groups`
- **Tagline (VI, ≤ 60):** `Bot lì xì cho nhóm Telegram: tip, bao lì xì, thưởng`
- Mô tả: dùng bản dài ở mục 1. Bình luận đầu tiên của maker: kể lý do làm (admin phải ghi sổ tay) và nói rõ beta, điểm không phải tiền.

### 2.6 Reddit và cộng đồng nước ngoài

| # | Nơi | Họ cần gì | Người thật bấm? | Còn tồn tại? |
|---|---|---|---|---|
| 21 | Subreddit về bot Telegram | Tài khoản có lịch sử; đọc luật tự quảng cáo (nhiều sub chỉ cho 1 bài/tháng hoặc yêu cầu flair); bài dạng "I made" | Có | Chắc có sub như vậy (tự kiểm tra tên và luật) |
| 22 | Subreddit của người Việt | Thường cấm quảng cáo; chỉ đăng nếu luật cho phép bài "chia sẻ dự án" | Có | Chắc có; đọc luật trước, không chắc cho đăng |

Bài dùng bản EN ở mục 2.3 rút xuống ~120 từ; tiêu đề bắt đầu bằng "I made …".

### 2.7 Nơi **không** đăng

- Nhóm Telegram/Facebook của người lạ, kể cả "nhóm giao lưu admin": vào đăng bài bot là spam, và là đúng thứ `docs/14` cấm.
- Nhóm tín hiệu / giao dịch crypto: bot không phải crypto, và đăng ở đó biến bot thành công cụ shill (`growth/01` mục 5.6).
- Dịch vụ "list bot của bạn, 5 USD", "boost bot lên top", "mua review".
- Bất kỳ nơi nào yêu cầu **token bot** để "xác minh" — token là toàn quyền điều khiển bot.

## 3. Thứ tự làm (khoảng 60 phút người thật, một lần)

1. BotFather: đổi username chính thức, đặt mô tả, about, ảnh, danh sách lệnh (10 phút). *Mọi thứ khác chờ bước này.*
2. Tạo kênh Telegram công khai, đăng bài ghim (5 phút).
3. Repo GitHub: description, website, topics (3 phút, nếu công khai).
4. Một bài Viblo hoặc Dạy Nhau Học (bản VI mục 2.3) — chọn **một** nơi tuần này, nơi khác tuần sau (15 phút).
5. Tìm 2–3 danh bạ bot còn sống bằng từ khóa mục 2.2, nộp hồ sơ EN (15 phút). Bỏ qua nơi nào đòi token hoặc phí.
6. Ghi tất cả vào bảng mục 4.
7. Product Hunt, BetaList, awesome-list: **để dành** tới khi `/thongke` (lệnh của chủ bot, xem `bot/README.md`) cho thấy ≥ 5 nhóm hoạt động trong 7 ngày.

## 3b. Kết quả xác minh nội quy — 13/9/2026

Do Thực thi (phiên đám mây) đọc trực tiếp và trích nguyên văn; Quản lý nghiệm thu nhưng **chưa đối chiếu độc lập**
(sandbox của Quản lý bị chặn ra các trang này). Nguồn: tin `DONE` A4 trên Trạm điều phối.

| Nơi | Kết luận | Bằng chứng |
|---|---|---|
| **Spiderum** | **Loại hẳn.** Điều khoản cấm quảng bá sản phẩm dưới mọi hình thức; ngoài ra tình trạng vận hành từ 7/2026 không rõ | aboutus.spiderum.com/dieu-khoan/ mục III: *"Nghiêm cấm quảng bá bất kỳ sản phẩm dưới bất kỳ hình thức nào, bao gồm nhưng không giới hạn việc gửi, truyền bất kỳ thông điệp nào mang tính quảng cáo, mời gọi, thư dây truyền, cơ hội đầu tư trên Mạng xã hội Spiderum."* |
| **Tinh tế** | **Chưa xác minh được.** Trang nội quy trả 403 cho truy cập tự động (3 lần) | Cần phiên trên máy mở bằng trình duyệt thật rồi chép nguyên văn |
| **Indie Hackers** | **Được.** Tự giới thiệu là cốt lõi của trang; Terms chỉ cấm spam kiểu auto-responder. Không thấy yêu cầu tuổi tài khoản | indiehackers.com/terms: *"Runs Maillist, Listserv, any form of auto-responder or spam on the Services"* (điều cấm duy nhất liên quan) |
| **Hacker News — Show HN** (mới) | **Được, có điều kiện.** Đăng dự án của mình được, nhưng không dùng HN làm kênh quảng bá chính | news.ycombinator.com/newsguidelines.html: *"Please don't use HN primarily for promotion. It's ok to post your own stuff part of the time, but the primary use of the site should be for curiosity."* |
| **AlternativeTo** (mới) | **Để dành.** Cấm quảng cáo qua profile; kênh chính thức là "Suggest new application", duyệt vài ngày tới một tuần. **Yêu cầu ứng dụng hỗ trợ tiếng Anh** — bot hiện chỉ tiếng Việt | alternativeto.net/faq: *"Using user profiles to advertize products or software is not allowed."* · *"All applications added to the database must also support the English language"* |

Bổ sung cùng ngày (A6), cùng cách đọc; Thực thi ghi rõ các trích đoạn đi qua mô hình tóm tắt của công cụ fetch:

| Nơi | Kết luận | Bằng chứng |
|---|---|---|
| **Voz** | **Không đăng** nếu chưa được BQT duyệt trước. Muốn đăng phải liên hệ BQT xin phép — đó là việc chạm người thật, chưa làm | voz.vn nội quy: *"Mọi hình thức quảng cáo, rủ rê, lôi kéo, mua bán, v.v... liên quan đến lợi nhuận nếu chưa thông qua BQT đều bị nghiêm cấm."* |
| **Dạy Nhau Học** | **Chưa rõ.** Guidelines và FAQ không có điều nào về tự giới thiệu dự án; mục "share" có người tự đăng công cụ cá nhân nhưng đó là quan sát, không phải nội quy | daynhauhoc.com/guidelines, /faq — không có điều khoản liên quan |
| **Hashnode** | **Được, có điều kiện.** Bài phải có giá trị kỹ thuật thật, không dùng nền tảng chủ yếu để tự quảng bá | hashnode.com/code-of-conduct: cấm *"using the platform primarily for self-promotion without contributing to the community"*; khuyến khích *"Linking to documentation, repositories, articles, code samples, or other relevant references"* |
| **Product Hunt** | **Được**, tự đăng là chức năng chính. Cần tài khoản cá nhân thật, hồ sơ đầy đủ; không xin upvote. Vẫn giữ nguyên quyết định cũ: **để dành** tới khi ≥ 5 nhóm hoạt động | help.producthunt.com: *"You'll need a personal account to post a product on Product Hunt."* · *"Self-promoting in comments will also be removed."* |

**Thứ tự đăng rút ra:** đợt 1 = Viblo, Dev.to, Reddit (bài đã duyệt ở `growth/09`). Đợt 2 = Indie Hackers,
Show HN, Hashnode — chỉ sau khi đợt 1 có kết quả và bot có ít nhất một nhóm thật. Product Hunt chờ ≥ 5 nhóm.
AlternativeTo chờ bản tiếng Anh. Voz và Spiderum bỏ. Dạy Nhau Học chưa quyết.

### 3c. Nơi công khai admin nhóm Telegram Việt liệt kê nhóm — 13/9/2026 (A8)

Cùng cách đọc, cùng giới hạn (Quản lý chưa đối chiếu độc lập). Tìm được 3/5; các trang "nhóm kín 18+" thấy
nhiều nhưng loại hẳn.

| Nơi | Kết luận | Bằng chứng |
|---|---|---|
| **telegram-groups.com** (mục Việt Nam) | **Dùng được, để dành.** Nộp miễn phí qua mẫu liên hệ; nhưng chỉ nhận nhóm *"100+ members and are publicly joinable without invitation"* — nhóm demo hiện 2 thành viên | telegram-groups.com/vietnam-telegram-groups/ — *"Updated September 2026"*, *"You can add an active community that you know. Submit it here."* |
| **tgram.io** (mục tiếng Việt) | **Chưa rõ cách nộp.** Trang sống (nhóm đầu bảng 41,131 thành viên) nhưng không thấy mục "thêm nhóm" | tgram.io/?lang=vi |
| **Voz — Khu thương mại** | **Bỏ**, trả phí hoặc phải BQT duyệt (xem A6) | voz.vn nội quy 1583 |

Từ khoá đã thử không ra thêm: danh bạ nhóm Telegram VN, TGStat (không có mục Việt Nam), awesome-telegram trên
GitHub (không có mục Việt Nam), otofun, 5giay (chỉ mua bán đồ vật).

## 4. Bảng theo dõi (điền tay)

> **ĐÂY LÀ CON SỐ QUYẾT ĐỊNH DỰ ÁN.** Luật dừng ở `docs/16` mục 3 chỉ có hiệu lực khi **đã thử ≥8 nơi**.
> Tới 7/12/2026 mà mới thử 1–2 nơi thì không kết luận được gì: không đủ căn cứ nói "không ai cần", cũng
> không có người dùng để nói "có tín hiệu" — đi hết 12 tuần rồi về tay không **và** không học được gì.
> Đó là kết cục tệ nhất, tệ hơn dừng sớm. Số nơi đã thử hiện trên Trạm điều phối, ô "Nơi đã đăng bài".

| Ngày | Nơi (#) | Link bài / hồ sơ | Trạng thái | Có nhóm nào đến từ đây không? |
|---|---|---|---|---|
| 13/9/2026 | Viblo | [bài](https://viblo.asia/p/lam-bot-li-xi-cho-nhom-telegram-chay-hoan-toan-tren-goi-mien-phi-ba-cho-kho-hon-tuong-AoJe8lXA41j) | đã đăng | chưa — 6 lượt xem sau 1 giờ, 0 bình luận (đo 22:40 13/9) |
| | Dev.to | | chưa nộp — thẻ A3, cần máy | |
| | Reddit r/SideProject | | chưa nộp — thẻ A3, cần máy | |
| | | | | |

Sau 4 tuần, nơi nào không mang về nhóm nào thì không quay lại. Nơi nào có thì viết thêm một bài mới sau 2–3 tháng, với
số liệu mới.

## 5. Đếm lại 14/9: bao nhiêu nơi THẬT SỰ có thể ra người dùng Việt?

> Viết sau khi rà mục 3, 3b, 3c. Con số "1/8 nơi" ở mục 4 vẫn đúng, nhưng nó che một chuyện
> nặng hơn: **phần lớn nơi đã xác minh là nơi nói tiếng Anh.** Bot hiện chỉ có tiếng Việt, và
> người cần nó là **admin nhóm Telegram người Việt**. Đủ 8 nơi mà 6 nơi không thể ra một admin
> Việt nào thì tới 7/12 ta vẫn không kết luận được gì — chỉ là không kết luận được một cách
> bận rộn hơn.

### Nơi CÓ THỂ ra người dùng Việt

| Nơi | Trạng thái | Chặn ở đâu |
|---|---|---|
| **Viblo** | ✅ đã đăng 13/9 | — |
| **Tinh tế** | ⛔ chưa xác minh được nội quy | Trang trả 403 cho truy cập tự động. Cần phiên **trên máy** mở bằng trình duyệt thật |
| **Dạy Nhau Học** | ⚠️ chưa rõ | Guidelines không có điều nào cấm, cũng không có điều nào cho phép. Cần đọc kỹ hơn |
| **Voz** | ⛔ phải xin BQT duyệt trước | Chạm người thật, chưa làm |
| **Spiderum** | ❌ loại hẳn | Điều khoản cấm quảng bá sản phẩm dưới mọi hình thức |
| **Nhóm Facebook về Telegram / quản trị cộng đồng** | ❓ **chưa ai khảo sát** | `docs/16` có nêu, nhưng chưa nơi nào được xác minh — đây là lỗ hổng lớn nhất |
| **telegram-groups.com** | ⏸ để dành | Chỉ nhận nhóm ≥100 thành viên công khai; nhóm demo đang 2 người |

**Tức là: đúng MỘT nơi tiếng Việt đã dùng được, và nó đã dùng rồi.**

### Nơi nói tiếng Anh — làm được, nhưng đừng nhầm nó là kênh ra người dùng

Indie Hackers, Show HN, Hashnode đều đã xác minh là **được đăng**. Nhưng người đọc ở đó không
phải admin nhóm Telegram Việt, và bot hiện **chưa có tiếng Anh** — ai thêm bot vào cũng gặp
giao diện tiếng Việt. Ba nơi này đáng làm để có chỗ tham chiếu và phản hồi kỹ thuật thật, **không**
đáng tính vào kỳ vọng ra người dùng.

### Việc phải làm, theo đúng thứ tự quan trọng

1. **Tìm cho ra nơi tiếng Việt thứ hai.** Đây là việc cấp nhất, và chưa ai làm. → thẻ A16.
2. Xác minh Tinh tế và Dạy Nhau Học — Tinh tế cần máy, Dạy Nhau Học đám mây đọc thêm được.
3. Rồi mới tới ba nơi tiếng Anh, và ghi rõ chúng là nơi lấy phản hồi, không phải nơi lấy người dùng.

### 5b. Kết quả A16 (14/9): phiên đám mây đã chạm trần khảo sát

Thực thi tìm 5 nơi tiếng Việt mới. Kết quả: **0 nơi đủ điều kiện.** Không phải vì không có, mà vì
**hai hướng hứa hẹn nhất đều không kiểm được từ đám mây.**

| Nơi | Kết luận | Bằng chứng |
|---|---|---|
| **Nhóm Facebook** | ⛔ **Không đọc được từ đám mây.** `facebook.com/groups/*` bị `robots.txt` chặn toàn bộ — công cụ trả `ROBOTS_DISALLOWED` cho mọi nhóm đã thử | Đây là hướng `docs/16` và mục 5 ở trên đánh giá cao nhất, và nó **chỉ mở được bằng máy có Facebook đã đăng nhập** |
| **Reddit** | ⛔ Chặn ở tầng mạng (`SITE_BLOCKED`), kể cả `old.reddit.com` | Không đọc được nội quy r/VietNam |
| **VN-Zoom** (vn-z.vn) | ❌ **Loại** | Nội quy: *"Cấm post link dẫn gián tiếp / trực tiếp trong 1 bài viết / bài trả lời nhằm quảng cáo cho 1 Forums / Website"* |
| **quantrinet.com** | ⚠️ chưa xác minh được nội quy | Diễn đàn còn sống (bài mới nhất 22/12/2025) nhưng không mở được thread nội quy. Đối tượng là quản trị mạng, chỉ gần đúng |
| **tgram.vn** | ⚠️ chưa xác minh được cách nộp | Danh bạ nhóm, cập nhật 17/6/2026. Không thấy form đề xuất nhóm — giống `telegram-groups.com` |
| **kipalog.com** | ⚠️ chưa rõ còn hoạt động | Trang tải được, copyright "2022-2026", không đọc được ngày bài mới nhất |
| **Tinh tế** | ⛔ vẫn 403 | Không có gì mới so với A4 |

**Năm nhóm Facebook ứng viên** (mới chỉ có tên và link từ kết quả tìm kiếm — **chưa xác minh** số thành viên,
nội quy, hay cách nộp): Cộng đồng Telegram VietNam · Nhóm Telegram · Python Việt Nam · J2TEAM Community ·
NoCode Việt Nam.

### Điều này đổi kế hoạch thế nào

Trước A16 tôi tưởng nút thắt là "chưa ai đi tìm". Sai. Nút thắt là **đám mây không với tới nơi cần tìm.**
Ba kênh có khả năng ra người dùng Việt nhất — Facebook, Reddit, Tinh tế — đều nằm sau một bức tường mà chỉ
**máy của chủ dự án** đi qua được.

Vì vậy con số cần theo dõi không còn là "đã thử mấy nơi", mà là **đã có mấy phiên Cowork chạy trên máy**.
Không có phiên nào thì số nơi đăng đứng im ở 1, và mốc 7/12 sẽ tới mà không kết luận được gì.

## 6. A17 (14/9): người tìm bằng tiếng Việt có thấy ta không

> Câu chưa ai hỏi: một admin đang cần thứ này, tự gõ vào ô tìm kiếm, có thấy ta không? Khảo sát qua
> công cụ tìm kiếm của phiên đám mây, không đăng nhập, không bấm quảng cáo. Giới hạn: công cụ không
> hiện snippet hay thứ hạng gốc công khai; số kết quả mỗi cụm dao động 7–10, không đều 10 — coi thứ tự
> trả về là gần đúng, không phải thứ hạng Google thật 100%.

| Cụm từ | Ta có xuất hiện? | Đối thủ thật trong top 3 |
|---|---|---|
| "bot lì xì telegram" | Có — GitHub #1, Viblo #2 | Không |
| "bot tip điểm nhóm telegram" | Có — Viblo #3 | Không |
| "bot thưởng thành viên nhóm telegram" | Có — Viblo #1 | Có thể — **TeleMe** (#2), bot "thưởng tham dự hàng ngày" cho cộng đồng Telegram |
| "bao lì xì telegram nhóm chat" | Có — Viblo #2 | Có thể — **Combot** (#1), qua trang danh mục nhóm |
| "bot quản lý nhóm telegram tiếng việt" | **KHÔNG — vắng mặt hoàn toàn** | Có thể — **ChoiLongGaBot** (#1), bot quản trị group tiếng Việt |
| "lì xì bot" | Có — GitHub #1, Viblo #5 | Không |

### Hai điều đáng chú ý

1. **Chỉ có GitHub repo và bài Viblo được tìm thấy — chưa bao giờ là chính sản phẩm.** `t.me/lixi_vn_bot`,
   `t.me/lixibot_kenh`, `new-coin-orcin.vercel.app` không xuất hiện ở **bất kỳ** cụm từ nào trong cả 6.
   Người tìm kiếm hiện chỉ có thể chạm được ta qua đúng hai cửa, không phải qua chính bot.

2. **Combot xếp #1 đúng cụm từ khớp với hướng doanh thu đã chọn** (`docs/19` mô hình C — "kiểu Combot").
   Chưa xác minh được Combot có tính năng lì xì/tip điểm giống ta hay không — trang tìm thấy chỉ là danh
   mục nhóm, không phải trang giới thiệu tính năng. Ba tên mới ngoài khảo sát `growth/10` cũ: **TeleMe**,
   **Combot**, **ChoiLongGaBot** — cả ba chưa xác minh tính năng, chỉ ghi nhận có mặt.

**Không suy luận cần làm gì ngay.** Đây là số liệu nền để so sánh mỗi lần khảo sát lại, không phải lý do
để đổi kế hoạch — con số duy nhất còn quyết định là nhóm người lạ đầu tiên (Cửa 1, `docs/19`).

## 7. A18 (15/9): năm nhóm Facebook, lần này đọc được thật — vẫn 0/5

Từ 15/9, phiên Thực thi có quyền dùng thiết bị chạy 24/7 của chủ dự án — bức tường robots.txt ở mục 5b
không còn chặn. Đọc lại đúng 5 nhóm A16 tìm được bằng Browser pane thật (không cần đăng nhập, cả 5 đều
là Public group). Kết quả: **vẫn 0/5 đủ điều kiện — nhưng lần này là đọc được thật, không phải bị chặn.**

| Nhóm | Thành viên | Hoạt động | Kết luận |
|---|---:|---|---|
| Cộng đồng Telegram VietNam | 6.5K | Chết — "No posts in the last month" | ❌ Nhóm chết |
| Nhóm Telegram | — | Không mở được ("content isn't available") | ❌ Không xem được |
| Python Việt Nam | 93.5K | Sống (1 bài hôm nay, 74/tháng) | ❌ Nội quy: *"Nghiêm cấm các hình thức quảng cáo, spam và đăng liên kết không phù hợp"* |
| J2TEAM Community | 779.4K | Rất sống (9 bài hôm nay, 259/tháng) | ❌ Nội quy: *"Bạn không được tự quảng bá, spam và đăng liên kết không phù hợp"* |
| NoCode Việt Nam | 13.7K | Sống nhẹ (14/tháng) | ❌ Sai chủ đề (không phải NoCode/LowCode) + cấm quảng cáo không liên quan |

**Đáng chú ý nhất:** nhóm lớn nhất và sống nhất trong cả năm — J2TEAM, 779K thành viên, đúng đối tượng
dev Việt — vẫn loại vì nội quy cấm tự quảng bá rõ ràng. Không phải "chưa ai tìm ra nhóm đúng"; là **quy
mô lớn và nội quy chống spam đi cùng nhau** — nhóm Facebook công nghệ Việt lớn đều tự bảo vệ khỏi đúng
kiểu bài mà một dự án cá nhân muốn đăng.

**Kết luận cho hướng Facebook:** đóng, không mở lại trừ khi tìm được nhóm mới ngoài 5 nhóm này. Việc kế
tiếp có ý nghĩa hơn: A15 (sửa BotFather) và A3 (Dev.to/Reddit) — giờ máy đã dùng được, làm theo đúng thứ
tự A15 → A3.
