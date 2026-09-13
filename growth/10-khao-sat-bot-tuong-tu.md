# Khảo sát bot Telegram tương tự — ai thu tiền, thu bao nhiêu, thu cách nào

> Nguyên liệu cho `docs/19` (đường tới doanh thu, chưa viết — thẻ M3). Thực thi khảo sát ngày 13/9/2026
> bằng công cụ đọc web, không cài, không thêm bot vào nhóm nào, không nhắn ai. Quản lý nghiệm thu nhưng
> **chưa đối chiếu độc lập** (sandbox bị chặn ra các trang này). Nguồn: tin `DONE` A7 trên Trạm điều phối.
> Chỗ nào trang không niêm yết giá thì ghi "chưa xác minh được", không đoán.

| Bot | Còn sống? | Thu tiền? | Bằng chứng |
|---|---|---|---|
| **Crypto Bot** — t.me/CryptoBot | Có. Trang xem trước: *"1 488 380 monthly users"* | **Chưa xác minh được** mức phí tip/cheque. Tài liệu Crypto Pay API chỉ có trường kỹ thuật *"fee_amount (Number) Optional. Amount of service fees charged when the invoice was paid."*, không nêu % | help.send.tg/en/articles/10279948-crypto-pay-api |
| **Wallet** — t.me/wallet | Có. Trang xem trước: *"Trusted by 150M users"* | **Có, chỉ khi rút ra ngoài Telegram.** *"There's no fee for direct transfers to your Telegram contacts."* Rút USDT (TRC-20): 3.5 USDT/lần; BTC: 0.00008 BTC. *"Fees are subject to change."* | help.wallet.tg/article/50-fee-rates-and-limits |
| **xRocket** — t.me/xRocket_bot | **Chưa xác minh được** bằng số liệu; chỉ có bằng chứng gián tiếp là tài liệu chính thức còn tồn tại | **Chưa xác minh được.** FAQ: *"To check current limits and fees, from the bot main menu navigate to Settings → Limits and Fees"* — phí chỉ hiện trong bot | docs.xrocket.exchange/help/faq |
| **Combot** — combot.org | Có. Kênh t.me/s/combotnews đăng đều (bài /386, /387, /389); ngày dương lịch chưa xác minh được | **Có, theo gói cho admin.** Ba hạng Free/Pro/Business: *"Free accounts support up to 2 rules; Pro accounts up to 50 ... Business accounts up to 100"*. Giá tiền không niêm yết công khai; trang /pricing chặn bot đọc | t.me/combotnews/389 |

**Không tìm được bot thứ 5** đủ bằng chứng. Từ khoá đã thử: "red envelope/red packet telegram bot",
"hongbao 红包 telegram bot" (chỉ ra cộng đồng ở Trung Quốc không rõ tính hợp pháp — loại), "GroupHelp bot
points shop economy" (có giá Stars nhưng không có tip giữa thành viên — không tính là tương tự), "DogeTip bot
telegram alive", "virtual currency in-group tip bot free no crypto".

## Điều Quản lý rút ra cho docs/19

- **Không bot nào trong nhóm này thu tiền cho việc tip giữa thành viên.** Tip là mồi, không phải nguồn thu.
- Tiền đến từ hai chỗ: **rút ra ngoài** (Wallet — cần là ví thật, tức là on-chain, tức là điều kiện của
  `docs/11` chưa đạt) hoặc **gói công cụ cho admin** (Combot — Free/Pro/Business, trả theo nhóm).
- Hướng gần nhất với Lì Xì Bot hiện tại là kiểu Combot: nhóm miễn phí dùng đủ, admin muốn thêm (nhiều luật
  thưởng hơn, thống kê, nhiều nhóm) thì trả gói. Nhận bằng USDT BEP-20 theo quyết định `docs/20`.
- Chưa viết docs/19 vì chưa có nhóm thật nào hoạt động 7 ngày — viết lúc này là viết trên giấy trắng.
