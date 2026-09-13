# Thư viện nội dung 30 ngày cho kênh Telegram công khai của Lì Xì Bot

> Dùng cho kênh Telegram công khai mà chủ dự án tạo cho bot (kênh chỉ admin đăng, thành viên đọc).
> Mỗi ngày một bài, đăng theo thứ tự hoặc xáo trộn tùy tuần. Mọi bài đã được viết để **không nói về giá,
> không hứa hẹn giá trị, điểm không phải tiền**. Mỗi bài ≤ 600 ký tự, dán thẳng vào Telegram là đăng được.
>
> Bài này là một phần của kế hoạch `docs/14` (tăng trưởng gần như không cần con người); lịch dùng ở
> `growth/08-checklist-tang-truong-hang-tuan.md` (7 bài/tuần, 15 phút).

## 0. Cách dùng

- **Placeholder** (thay trước khi đăng, tìm bằng `[[`):
  - `https://t.me/lixi_vn_bot?startgroup=true` — link thêm bot vào nhóm, dạng `https://t.me/<username_bot>?startgroup=true`.
  - `https://new-coin-orcin.vercel.app` — trang `website/them-bot.html` sau khi đưa lên web.
  - `https://t.me/lixibot_kenh` — nơi nhận báo lỗi/báo lừa đảo (nhóm hỗ trợ admin hoặc chính kênh này nếu bật bình luận).
  - `[[SỐ]]`, `[[SỐ TUẦN]]`, `[[thay đổi …]]` — số liệu và việc thật của tuần đó. **Không có thì ghi "chưa có"**, không ước lượng.
    Từ 13/9/2026 bản máy đọc (`bot/content/channel-posts.js`) là nguồn chuẩn cho năm bài này: chỗ trống mang tên
    `[[nhomHoatDong]]`, `[[baoLiXi]]`, `[[diemTip]]` (bot tự điền lúc đăng) và `[[tuan]]`, `[[thayDoi1]]`… (Quản lý
    viết vào `bot/content/weekly-notes.js`). Bản ở đây chỉ để đọc cho dễ.
- **Định dạng:** văn bản thuần, xuống dòng, vài emoji; không cần bật Markdown trong Telegram. Nếu muốn in đậm, dùng
  chế độ định dạng của ứng dụng Telegram khi dán, đừng thêm dấu `*` vào bài.
- **Bốn loại bài, xoay vòng trong tuần:** mẹo lệnh (mỗi bài đúng một lệnh), ý tưởng dùng theo dịp, "tuần này thay đổi gì"
  (minh bạch), nhắc an toàn, và lời mời thêm bot. Không bài nào có CTA "mua", "giữ", "đừng bỏ lỡ".
- **Trước khi đăng, tự hỏi 3 câu:** có chữ nào về giá/tiền/lợi nhuận không? có số nào chưa có nguồn không? có hứa hẹn
  gì không? Có một "có" thì sửa.
- Hai lệnh mới `/huongdan` và `/bxh` (theo `docs/14`) có bài riêng ở mục 3; chèn vào tháng đầu thay cho một bài mẹo lệnh
  bất kỳ, hoặc để dành cho tháng 2. Quy tắc chung: **tự gõ thử lệnh trong nhóm của mình trước khi đăng bài về nó**.

## 1. Bài ghim (đăng đầu tiên, ghim lại)

```
🧧 Đây là kênh chính thức của Lì Xì Bot — bot lì xì cho nhóm Telegram.

Bot làm gì: thành viên tip điểm cho nhau, mở bao lì xì chia ngẫu nhiên, nhận thưởng khi hoạt động. Admin nạp pot, đặt luật, không phải làm tay.

Ba điều cần biết:
1. Miễn phí, đang beta.
2. Điểm trong bot KHÔNG phải tiền, không mua bán được, không phải đầu tư, có thể bị reset.
3. Chúng tôi không nhắn riêng trước, không xin mật khẩu, không yêu cầu chuyển tiền.

Thêm bot vào nhóm trong 2 phút: https://t.me/lixi_vn_bot?startgroup=true
Hướng dẫn từng bước: https://new-coin-orcin.vercel.app

Mỗi ngày một bài: mẹo lệnh, ý tưởng dùng, và những gì thay đổi trong tuần.
```

## 2. Ba mươi bài, mỗi ngày một bài

### Ngày 1 — Giới thiệu + mời thêm bot

```
Ngày 1 🧧 Lì Xì Bot là gì?

Một bot cho nhóm Telegram, làm đúng ba việc:
• /lixi @ban 50 — tip điểm cho một người
• /lixi 300 chia 3 — mở bao lì xì, 3 người bấm nhanh nhất chia nhau
• Thưởng điểm mỗi ngày cho thành viên hoạt động (admin bật)

Điểm là điểm trong nhóm, không phải tiền. Dùng để cảm ơn, khích lệ, chơi với nhau.

Admin thêm bot trong 2 phút, không cần liên hệ ai: https://t.me/lixi_vn_bot?startgroup=true
```

### Ngày 2 — Mẹo lệnh: /start

```
Mẹo lệnh #1: /start

Gõ /start trong nhóm (không gõ trong chat riêng). Bot trả lời lời chào, câu lưu ý "điểm chưa có giá trị tiền" và danh sách lệnh.

Mẹo cho admin: ghim tin trả lời đó lại. Thành viên mới vào nhóm đọc là biết chơi, admin không phải giải thích lại.

Nếu bot im lặng: kiểm tra bot đã ở trong nhóm và đã là admin chưa.
```

### Ngày 3 — Ý tưởng dùng: sinh nhật thành viên

```
Ý tưởng dùng: sinh nhật thành viên 🎂

Nhóm có ai sinh nhật? Thay vì chỉ gửi sticker, admin (hoặc bất kỳ ai có điểm) gõ:

/lixi 200 chia 5

Bao lì xì 200 điểm mở ra, 5 người nhanh tay nhận phần chia ngẫu nhiên, cả nhóm nhộn lên vài phút. Người có sinh nhật thì được mọi người reply rồi /lixi 20 chúc mừng.

Điểm không phải tiền — nên chẳng ai phải ngại "ít hay nhiều".
```

### Ngày 4 — Nhắc an toàn

```
⚠️ Nhắc an toàn (đọc 20 giây)

1. Chỉ có MỘT Lì Xì Bot chính thức. Link thêm bot chỉ lấy từ kênh này và trang hướng dẫn: https://new-coin-orcin.vercel.app
2. Chúng tôi không bao giờ nhắn riêng cho bạn trước.
3. Không ai của chúng tôi xin mật khẩu, seed phrase, hay yêu cầu chuyển tiền để "kích hoạt", "xác minh", "nhận lì xì".
4. Điểm trong bot không phải tiền. Ai hứa "đổi điểm ra tiền" là lừa.

Thấy tài khoản giả mạo? Báo ở đây: https://t.me/lixibot_kenh
```

### Ngày 5 — Mẹo lệnh: tip một người

```
Mẹo lệnh #2: tip một người

Hai cách, kết quả như nhau:
• /lixi @tenban 50 — nếu người đó có @username
• Reply vào tin nhắn của họ rồi gõ /lixi 50 — chạy với cả người không đặt @username

Điểm trừ từ số dư của bạn, cộng vào số dư của họ, cả nhóm thấy. Không tip được cho chính mình.

Dùng khi nào: ai đó trả lời giúp bạn, chia sẻ tài liệu hay, hoặc chỉ đơn giản là cảm ơn.
```

### Ngày 6 — Tuần này thay đổi gì (tuần 1)

```
📋 Tuần này thay đổi gì (tuần [[SỐ TUẦN]])

Đã làm:
• [[thay đổi 1 — ví dụ: sửa lỗi bot không đọc được tên người được reply]]
• [[thay đổi 2]]

Đang làm:
• [[việc đang làm]]

Số liệu thật, chưa làm tròn:
• Nhóm có giao dịch trong 7 ngày: [[SỐ]]
• Bao lì xì đã mở trong tuần: [[SỐ]]

Chưa có gì để khoe thì chúng tôi ghi "chưa có". Kênh này không đăng số ước lượng.
```

### Ngày 7 — Mời thêm bot (cho admin)

```
Bạn là admin một nhóm Telegram?

Thêm Lì Xì Bot mất 2 phút, và bạn không cần nhắn cho ai:
1. Bấm https://t.me/lixi_vn_bot?startgroup=true, chọn nhóm
2. Cấp quyền admin cho bot (không cần bật quyền nào cụ thể)
3. Gõ /nap 1000 để nạp pot; reply một thành viên rồi gõ /nap 100 để cấp điểm

Xong. Không phí, không quảng cáo trong nhóm, gỡ lúc nào cũng được.

Hướng dẫn từng bước: https://new-coin-orcin.vercel.app
```

### Ngày 8 — Mẹo lệnh: bao lì xì

```
Mẹo lệnh #3: bao lì xì

/lixi 500 chia 5

Bot đăng một bao 500 điểm có nút 🧧 Nhận lì xì. 5 người bấm đầu tiên nhận phần chia ngẫu nhiên — có người 30, có người 180, không ai biết trước.

Sau 10 phút bao đóng. Phần chưa ai nhận tự hoàn lại cho người mở, không mất đi đâu.

Người mở bao không tự nhận được. Số người tối đa mỗi bao admin chỉnh bằng /caidat songuoinhan.
```

### Ngày 9 — Ý tưởng dùng: cột mốc của nhóm

```
Ý tưởng dùng: cột mốc của nhóm 🎯

Nhóm vừa chạm 500, 1.000 thành viên? Kỷ niệm 1 năm lập nhóm? Hết một khóa học?

Admin nạp pot rồi mở một bao lớn cho đúng dịp:
/lixi 1000 chia 20

20 người đầu tiên bấm nhận. Ai bận, lỡ mất — là chuyện vui để kể, không phải chuyện thiệt hại, vì điểm không phải tiền.

Gợi ý: thông báo trước 1 giờ "8h tối nay có bao lì xì". Nhóm sẽ đông đúng giờ đó.
```

### Ngày 10 — Mẹo lệnh: /sodu

```
Mẹo lệnh #4: /sodu

Gõ /sodu trong nhóm để xem bạn đang có bao nhiêu điểm ở nhóm đó.

Lưu ý: mỗi nhóm một sổ riêng. 300 điểm ở nhóm A không mang sang nhóm B được — bản beta là vậy.

Thành viên mới vào nhóm gõ /sodu được ngay, không cần chờ. Chỉ tip, mở bao và rút mới cần ở trong nhóm đủ số ngày admin đặt.
```

### Ngày 11 — Nhắc an toàn: điểm không phải tiền

```
⚠️ Nói thẳng về điểm

Điểm LIXI trong bot là số ghi trong cơ sở dữ liệu của bot. Nó:
• không phải tiền
• không mua bán được
• không phải khoản đầu tư
• có thể bị reset trong giai đoạn beta

Chúng tôi không hứa điểm "sẽ có giá trị" sau này. Bất kỳ ai — kể cả người tự nhận là đội ngũ — nói với bạn điều ngược lại đều đang nói sai.

Bot dùng để cảm ơn và chơi với nhau trong nhóm. Chỉ vậy thôi, và vậy là đủ.
```

### Ngày 12 — Ý tưởng dùng: nhóm học tập, hỏi đáp

```
Ý tưởng dùng: nhóm học tập, nhóm hỏi đáp 📚

Ai trả lời câu hỏi đúng và kỹ nhất? Người hỏi reply rồi gõ /lixi 30.
Ai nộp bài đúng hạn cả tuần? Admin reply từng người: /nap 50.
Cuối tuần, admin mở bao cho cả lớp: /lixi 300 chia 10.

Bật thưởng tự động nếu muốn: /thuong 10 5 — ai có từ 5 tin nhắn hợp lệ trong ngày nhận 10 điểm từ pot.

Kết quả: người giúp người khác được nhìn thấy, không cần admin cầm sổ.
```

### Ngày 13 — Mẹo lệnh (admin): /nap

```
Mẹo lệnh #5 (admin): /nap có hai nghĩa

/nap 1000 — gõ KHÔNG reply ai → nạp 1.000 điểm vào pot của nhóm. Pot là nguồn cho thưởng hoạt động hằng ngày.

Reply vào tin của một người rồi gõ /nap 200 → cấp thẳng 200 điểm cho người đó. Chạy với cả người không có @username.

Cả hai đều ghi vào nhật ký; gõ /pot để xem ai nạp gì, lúc nào. Không có "nạp tiền" nào ở đây — chỉ là điểm.
```

### Ngày 14 — Tuần này thay đổi gì (tuần 2)

```
📋 Tuần này thay đổi gì (tuần [[SỐ TUẦN]])

Đã làm:
• [[thay đổi 1]]
• [[thay đổi 2]]

Lỗi đã biết, chưa sửa xong:
• [[lỗi và tình trạng]]

Số liệu thật:
• Nhóm có giao dịch trong 7 ngày: [[SỐ]] (tuần trước: [[SỐ]])
• Tip + bao lì xì trong tuần: [[SỐ]]

Bạn gặp lỗi gì, kể ở đây: https://t.me/lixibot_kenh. Lỗi được nêu công khai thì được sửa nhanh hơn.
```

### Ngày 15 — Mẹo lệnh (admin): /thuong

```
Mẹo lệnh #6 (admin): thưởng hoạt động tự động

/thuong 10 5

Nghĩa là: mỗi ngày, thành viên có từ 5 tin nhắn văn bản trở lên (không tính lệnh) nhận 10 điểm, lấy từ pot. Bot phát vào buổi sáng hôm sau, mỗi ngày đúng một lần.

Pot hết thì không phát — nên nhớ /nap thêm. Trần phát mỗi ngày chỉnh bằng /caidat ngansachthuong; đặt 0 là tạm dừng thưởng.

Bot đếm SỐ tin nhắn, không đọc nội dung.
```

### Ngày 16 — Ý tưởng dùng: nhóm chạy bộ, điểm danh

```
Ý tưởng dùng: nhóm chạy bộ, gym, dậy sớm 🏃

Sáng nào cũng có người gửi ảnh điểm danh? Admin không cần cầm bảng nữa:
• Ai điểm danh đủ 7 ngày → reply rồi /nap 70
• Ai phá kỷ lục cá nhân → cả nhóm reply /lixi 10 chúc mừng
• Cuối tháng → /lixi 500 chia 15 cho những người có mặt

Chỉ là điểm, nhưng "top điểm tháng này" đủ để người ta dậy sớm thêm một hôm.
```

### Ngày 17 — Mời thêm bot (cho admin đang thưởng bằng chuyển khoản)

```
Dành cho admin đang thưởng thành viên bằng chuyển khoản

Bạn biết cảnh này: cuối tuần ngồi chuyển từng khoản, ghi lại ai đã nhận, quên mất một người, bị hỏi "sao tuần trước không có em".

Lì Xì Bot không thay tiền thật của bạn. Nó thay phần "ghi sổ và phát tay": ai được gì, lúc nào, vì sao — có lịch sử, ai cũng xem được bằng /lichsu.

Thử 2 tuần với điểm, chẳng mất gì: https://t.me/lixi_vn_bot?startgroup=true
```

### Ngày 18 — Mẹo lệnh (admin): thâm niên

```
Mẹo lệnh #7 (admin): thâm niên

/caidat thamnien 3

Người phải ở trong nhóm 3 ngày (tính từ lúc bot thấy họ) mới được tip, mở bao, rút. Xem số dư thì không cần chờ.

Vì sao có: để tài khoản ảo vừa vào không giật được bao lì xì rồi biến mất.

Nhóm mới thêm bot, muốn thử ngay: /caidat thamnien 0, thử xong đặt lại 3. Nhóm công khai thì đừng để 0.
```

### Ngày 19 — Nhắc an toàn: bao lì xì giả

```
⚠️ Ba dấu hiệu bao lì xì giả

1. Phải bấm vào một LINK để "nhận". Bao thật chỉ có nút 🧧 Nhận lì xì ngay trong tin của bot, không có link.
2. Phải "nạp trước", "xác minh ví", "kết nối ví" mới được nhận. Bot thật không bao giờ hỏi.
3. Đến từ tin nhắn riêng. Bot thật chỉ hoạt động trong nhóm.

Gặp một trong ba: đừng bấm, báo admin nhóm, và báo chúng tôi: https://t.me/lixibot_kenh
```

### Ngày 20 — Mẹo lệnh: /lichsu

```
Mẹo lệnh #8: /lichsu

Gõ /lichsu để xem 10 giao dịch gần nhất của bạn trong nhóm: ai tip, bạn tip ai, nhận từ bao nào, admin cấp lúc nào.

Đây là chỗ để trả lời câu "sao em thấy thiếu điểm?" mà không cần cãi nhau. Admin xem nhật ký nạp/cấp/đổi cài đặt bằng /pot.

Mọi thứ đổi điểm đều để lại dấu. Không có giao dịch ngầm.
```

### Ngày 21 — Tuần này thay đổi gì (tuần 3)

```
📋 Tuần này thay đổi gì (tuần [[SỐ TUẦN]])

Đã làm:
• [[thay đổi 1]]
• [[thay đổi 2]]

Đã từ chối làm:
• [[ví dụ: một đề nghị "mua thành viên cho kênh" — không, cảm ơn]]

Số liệu thật:
• Nhóm có giao dịch trong 7 ngày: [[SỐ]] (tuần trước: [[SỐ]])
• Người nhận điểm lần đầu trong tuần: [[SỐ]]

Nếu số này không tăng, chúng tôi sẽ nói vậy và sửa sản phẩm, không sửa số.
```

### Ngày 22 — Ý tưởng dùng: Tết 2027

```
Ý tưởng dùng: Tết 2027 — chuẩn bị từ bây giờ 🧧

Tết là dịp cái tên "lì xì" tự nói. Giao thừa năm nay rơi vào [[ngày — kiểm tra lịch âm trước khi đăng]].

Gợi ý cho admin:
• Nạp pot Tết trước: /nap 5000
• Đúng giao thừa: /lixi 2000 chia 50 — 50 người đầu tiên nhận
• Mùng 1 đến mùng 3, mỗi tối một bao nhỏ
• Ai chúc Tết hay nhất → cả nhóm reply /lixi 10

Nhớ /caidat thamnien 3 trước Tết: dịp đông người lạ là dịp tài khoản ảo xuất hiện.
```

### Ngày 23 — Mẹo lệnh (admin): cooldown và hạn mức tip

```
Mẹo lệnh #9 (admin): chặn spam mà không cấm ai

/caidat cooldown 3 — mỗi người phải chờ 3 giây giữa hai lệnh. Chặn kiểu gõ /lixi liên tục 20 lần.

/caidat hanmuctip 500 — mỗi người tip tối đa 500 điểm một ngày. Chặn kiểu "dồn hết điểm cho tài khoản phụ".

Mặc định đã là 3 giây và 500 điểm. Nhóm nhỏ, toàn người quen thì nới; nhóm công khai thì giữ hoặc siết. Gõ /caidat không tham số để xem toàn bộ.
```

### Ngày 24 — Ý tưởng dùng: nhóm fan, nhóm xem stream

```
Ý tưởng dùng: nhóm fan, nhóm xem stream 🎮

Stream đạt mốc người xem? Đội nhà thắng? Admin nhóm fan mở bao ngay trong nhóm chat:
/lixi 500 chia 10

Ai đoán đúng kết quả trận đấu → reply rồi /lixi 20.
Ai làm clip highlight cho nhóm → admin reply rồi /nap 100.

Điểm không đổi được ra gì ngoài sự công nhận của nhóm — và với nhóm fan, đó thường là thứ họ muốn nhất.
```

### Ngày 25 — Mời chia sẻ (cho người không phải admin)

```
Bạn không phải admin, nhưng biết một admin?

Chuyển cho họ đúng một dòng:
"Bot lì xì cho nhóm Telegram, miễn phí, thêm mất 2 phút, không cần nhắn ai: https://new-coin-orcin.vercel.app"

Không cần thuyết phục. Trang hướng dẫn nói rõ nó là gì, không là gì (điểm không phải tiền), và cách gỡ nếu không hợp.

Chúng tôi không có đội sales. Cách bot đến được nhóm mới là có người thấy nó vui và kể lại.
```

### Ngày 26 — Mẹo lệnh (admin): ngưỡng duyệt

```
Mẹo lệnh #10 (admin): khoản lớn phải qua tay admin

/caidat nguongduyet 2000

Tip hay bao lì xì trên 2.000 điểm sẽ không chạy ngay: bot giữ điểm, báo mã, admin gõ /duyet <mã> để cho qua hoặc /tuchoi <mã> để trả lại.

Vì sao: một lệnh gõ nhầm thêm số 0 ở nhóm 300 người là chuyện có thật. Ngưỡng này là dây an toàn.

Mặc định 2.000. Đặt /caidat nguongduyet 0 nếu muốn mọi khoản đều qua duyệt — hơi phiền nhưng chặt.
```

### Ngày 27 — Nhắc an toàn: "admin" nhắn riêng

```
⚠️ "Admin" nhắn riêng cho bạn?

Kịch bản quen: một tài khoản có ảnh giống admin nhóm, hoặc giống bot, nhắn riêng: "Bạn có 5.000 điểm chưa nhận, bấm link này / gửi phí kích hoạt".

Sự thật:
• Bot không nhắn riêng, chỉ hoạt động trong nhóm.
• Chúng tôi không nhắn riêng trước, không bao giờ.
• Không có "phí kích hoạt". Không có gì để rút ra tiền.

Chặn, báo cáo, và nhắn vào nhóm để người khác biết. Kênh báo: https://t.me/lixibot_kenh
```

### Ngày 28 — Tuần này thay đổi gì (tuần 4) + hỏi ý kiến

```
📋 Tuần này thay đổi gì (tuần [[SỐ TUẦN]]) — và một câu hỏi

Đã làm:
• [[thay đổi 1]]
• [[thay đổi 2]]

Số liệu thật:
• Nhóm có giao dịch trong 7 ngày: [[SỐ]] (4 tuần trước: [[SỐ]])
• Bao lì xì đã mở trong tháng: [[SỐ]]

Câu hỏi cho admin đang dùng: tính năng nào bạn dùng nhiều nhất, và cái gì làm bạn bực nhất? Trả lời ở https://t.me/lixibot_kenh. Tháng tới chúng tôi làm theo câu trả lời đó, không theo ý mình.
```

### Ngày 29 — Mẹo lệnh: /rut và sự thật về nó

```
Mẹo lệnh #11: /rut — và sự thật về nó

/rut 0x... 100 ghi lại một YÊU CẦU rút 100 điểm kèm địa chỉ ví. Bot không chuyển tiền, không chuyển token, không chuyển gì cả. Admin nhóm nhìn thấy yêu cầu và xử lý theo cách của nhóm mình (ví dụ đổi quà nội bộ), hoặc /rut_huy để hoàn điểm.

Chúng tôi giữ lệnh này để thử luồng "xin rút → admin duyệt" cho sau này. Nó không phải cách đổi điểm ra tiền, và không có cách đó.
```

### Ngày 30 — Tổng kết tháng + mời

```
Ngày 30: một tháng của kênh này 🧧

30 bài: 11 mẹo lệnh, 6 ý tưởng dùng, 4 bản "tuần này thay đổi gì", 4 nhắc an toàn, 4 lời mời, và bài này.

Những gì có thật sau tháng đầu: [[SỐ]] nhóm có giao dịch trong 7 ngày gần nhất, [[SỐ]] bao lì xì đã mở. Số nhỏ thì chúng tôi vẫn ghi số nhỏ.

Tháng tới: [[việc lớn nhất sẽ làm]].

Nếu bạn đọc đến đây mà chưa thêm bot vào nhóm: https://t.me/lixi_vn_bot?startgroup=true. Không hợp thì gỡ, chúng tôi không giận.
```

## 3. Bài bổ sung cho hai lệnh mới (`/bxh`, `/huongdan`)

Hai lệnh này đã có trong bot (`bot/README.md`, bảng lệnh). Tự gõ thử trong nhóm của mình rồi đăng; chèn vào bất kỳ ngày nào.

### Bổ sung A — /bxh (bảng xếp hạng 7 ngày)

```
Mẹo lệnh: /bxh

Gõ /bxh trong nhóm để xem top 10 người NHẬN nhiều điểm nhất trong 7 ngày qua, tính từ tip và bao lì xì. Không hiện số dư của ai; admin tự cấp điểm bằng /nap không được tính, nên bảng là bảng "ai được nhóm cảm ơn nhiều nhất".

Dùng để: cuối tuần admin gõ /bxh, rồi cảm ơn top 3 bằng một bao nhỏ /lixi 150 chia 3.

Bảng chỉ là bảng của nhóm bạn, không có bảng chung giữa các nhóm. Điểm vẫn không phải tiền — cạnh tranh cho vui.
```

### Bổ sung B — /huongdan

```
Mẹo lệnh: /huongdan

Thành viên mới hỏi "chơi sao?" — thay vì gõ lại, ai cũng có thể gõ /huongdan. Bot trả lời bằng lệnh cho thành viên, lệnh cho admin, hai chốt chống lạm dụng, và câu lưu ý điểm không phải tiền. Gõ được cả trong chat riêng với bot.

Admin: ghim tin đó, hoặc reply /huongdan vào tin của người mới. Bớt được phần lớn câu hỏi lặp lại.
```

## 4. Lịch gợi ý cho 4 tuần đầu (7 bài/tuần)

| Tuần | Thứ 2 | Thứ 3 | Thứ 4 | Thứ 5 | Thứ 6 | Thứ 7 | Chủ nhật |
|---|---|---|---|---|---|---|---|
| 1 | Ghim + Ngày 1 | Ngày 2 | Ngày 3 | Ngày 4 | Ngày 5 | Ngày 6 (minh bạch) | Ngày 7 |
| 2 | Ngày 8 | Ngày 9 | Ngày 10 | Ngày 11 | Ngày 12 | Ngày 13 | Ngày 14 (minh bạch) |
| 3 | Ngày 15 | Ngày 16 | Ngày 17 | Ngày 18 | Ngày 19 | Ngày 20 | Ngày 21 (minh bạch) |
| 4 | Ngày 22 | Ngày 23 | Ngày 24 | Ngày 25 | Ngày 26 | Ngày 27 | Ngày 28 (minh bạch) |
| 5 | Ngày 29 | Ngày 30 | lặp lại từ Ngày 2 với số liệu mới | | | | |

Bài "tuần này thay đổi gì" luôn đăng cùng ngày trong tuần để người đọc biết chờ. Sau 30 ngày, đăng lại các bài mẹo
lệnh và ý tưởng dùng (đổi ví dụ, đổi con số) — kênh nhỏ không ai nhớ bài cũ, và thành viên mới chưa đọc.
