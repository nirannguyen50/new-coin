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

**Thứ tự đăng rút ra:** đợt 1 = Viblo, Dev.to, Reddit (bài đã duyệt ở `growth/09`). Đợt 2 = Indie Hackers,
Show HN — chỉ sau khi đợt 1 có kết quả và bot có ít nhất một nhóm thật. AlternativeTo chờ bản tiếng Anh.

## 4. Bảng theo dõi (điền tay)

| Ngày | Nơi (#) | Link bài / hồ sơ | Trạng thái (đã nộp / được duyệt / từ chối / bỏ) | Có nhóm nào đến từ đây không? (hỏi admin khi họ thêm bot) |
|---|---|---|---|---|
| | | | | |
| | | | | |
| | | | | |

Sau 4 tuần, nơi nào không mang về nhóm nào thì không quay lại. Nơi nào có thì viết thêm một bài mới sau 2–3 tháng, với
số liệu mới.
