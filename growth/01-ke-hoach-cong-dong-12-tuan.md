# Kế hoạch cộng đồng và marketing 12 tuần quanh ngày ra mắt

> Áp dụng cho: LiXi (LIXI) trên BNB Chain — token thưởng và tip cho cộng đồng trực tuyến Việt Nam, sản phẩm v1
> là Lì Xì Bot trên Telegram (`docs/00`, `docs/09` mục 1). Tổng cung cố định 1.000.000.000 LIXI.
> Tài liệu này là **kế hoạch mẫu**: mọi con số KPI và ngân sách là mục tiêu tự đặt của đội ngũ,
> không phải tiêu chí của bất kỳ sàn giao dịch nào. Điền các ô `[[ĐIỀN: ...]]` trước khi dùng.
>
> Liên hệ với kế hoạch kỹ thuật: tuần 1–6 ở đây trùng với 6 tuần lên DEX trong `docs/09` mục 2 (bot beta tuần 3–5,
> pool PancakeSwap tuần 5); tuần 7–12 là sau ra mắt, hướng tới mở bot công khai và chiến dịch Tết 2027.

## 0. Mục tiêu và nguyên tắc

**Mục tiêu sau 12 tuần:**

| Chỉ số | Tuần 0 (hiện tại) | Tuần 12 (mục tiêu) |
|---|---|---|
| Cộng đồng có pot hoạt động (nạp ≥ 1 lần, phát thưởng ≥ 1 lần/tuần) | 0 | 15 (3 pilot + 12 từ danh sách chờ) |
| Số lì xì (tip + bao lì xì) gửi mỗi tuần | 0 | 3.000 |
| Ví/tài khoản nhận LIXI duy nhất (lũy kế) | 0 | 4.000 |
| LIXI đang giữ trong các pot | 0 | `[[ĐIỀN: mục tiêu, tính theo grant pilot + nạp thật]]` |
| Tỷ lệ người nhận đã rút về ví riêng ≥ 1 lần | 0 | 25% |
| Thành viên Telegram kênh chính hoạt động (nhắn ≥ 1 lần/tuần) | `[[ĐIỀN]]` | 1.500 (trên 5.000 thành viên) |
| Follower X thật | `[[ĐIỀN]]` | 5.000 |
| Đối tác đổi quà (v3) đã cam kết bằng văn bản | 0 | 2 |
| Bài báo/podcast/AMA bên ngoài | 0 | 3 |

Số liệu về lì xì và pot lấy từ sổ cái bot, công bố hàng tuần cùng đối chiếu số dư on-chain.

**Bốn nguyên tắc bất di bất dịch** (vi phạm = dừng chiến dịch, họp lại):

1. **Không bot, không mua follower, không mua "trending".** Mọi kênh đo bằng tỷ lệ tương tác và số lì xì thật, không đo bằng số lượng thô. Tài khoản ảo trong bot bị loại và công bố số bị loại.
2. **Không nói về giá.** Không dự đoán giá, không "x10", không "sắp lên sàn lớn", không đếm ngược listing. Lì xì là quà, không phải "đầu tư". Áp dụng cho đội ngũ, mod, admin pilot, KOL, ambassador. Quy tắc này ghi trong mọi hợp đồng KOL, cam kết pilot và nội quy kênh.
3. **Mọi hợp đồng KOL và grant pilot đều được công khai.** Bài được tài trợ phải gắn nhãn (#ad / "Bài viết có tài trợ"). Danh sách KOL, cộng đồng pilot nhận grant và số LIXI đăng trên trang minh bạch của dự án.
4. **Không dùng logo, tên hay hàm ý quan hệ với sàn nào** khi chưa có chấp thuận bằng văn bản. Dự án không nhắm Binance; không nói "sắp lên Binance" dưới bất kỳ hình thức nào.

## 1. Kênh và vai trò của từng kênh

| Kênh | Vai trò | Tần suất | Người phụ trách |
|---|---|---|---|
| **Telegram (kênh chính + nhóm cộng đồng)** | Nơi bot sống. Nhóm chính của LiXi cũng chạy Lì Xì Bot để mọi người thử; kênh thông báo riêng (chỉ admin đăng); nhóm hỗ trợ admin cộng đồng | Trực 16h/ngày | `[[ĐIỀN]]` |
| **Nhóm Telegram/Discord/Facebook của cộng đồng pilot** | Nơi số liệu thật sinh ra; đội ngũ không điều hành, chỉ hỗ trợ admin và thu feedback | Theo lịch với admin pilot | `[[ĐIỀN]]` |
| **X (Twitter)** | Thông báo, thread giải thích, số liệu tuần, cập nhật minh bạch | 1 bài/ngày, 1 thread/tuần | `[[ĐIỀN]]` |
| **Facebook (page + group admin cộng đồng)** | Tiếp cận admin group Facebook và streamer — nhóm người dùng lớn nhất ở Việt Nam nhưng ít ở X | 3 bài/tuần | `[[ĐIỀN]]` |
| **Streamer / kênh livestream** | Bao lì xì trên stream là kịch bản dễ hiểu nhất; 1–2 streamer pilot | Theo lịch stream | `[[ĐIỀN]]` |
| **Blog / Docs** | Hướng dẫn admin, hướng dẫn thành viên, tokenomics, changelog, báo cáo tuần | 1 bài/tuần | `[[ĐIỀN]]` |
| **Báo chí / podcast** | Uy tín bên ngoài; góc tiếp cận "cách cộng đồng thưởng cho thành viên" | Theo cột mốc | `[[ĐIỀN]]` |

Discord chỉ mở kênh giữ chỗ; bot Discord là việc của Q2/2027.

## 2. Kế hoạch theo tuần

```
Tuần 1–2   NỀN MÓNG       kênh, nội quy, chọn 3 pilot, hướng dẫn admin, bot nội bộ
Tuần 3–5   BOT BETA       pilot 1 → 3 pilot, số liệu tuần, sửa lỗi; tuần 5 pool PancakeSwap + khóa LP
Tuần 6–8   RA MẮT         hướng dẫn mua/rút, báo cáo beta, danh sách chờ, streamer đầu tiên
Tuần 9–12  MỞ RỘNG + TẾT  mở bot cho đợt 2, bảng xếp hạng, đối tác đổi quà, chuẩn bị chiến dịch Tết 2027
```

### Tuần 1 — Dựng kênh, chọn pilot

- Việc: Khóa handle Telegram, X, Facebook cùng tên (kiểm tra `LIXI` chưa trùng trên CoinGecko/CMC). Nội quy kênh (không nói giá, không DM lạ). Tuyển 2–3 mod. **Chọn 3 cộng đồng pilot** theo tiêu chí mục 5.6, ký cam kết thử nghiệm (mục 5.7). Viết hướng dẫn admin (nạp pot, đặt quy tắc thưởng) và hướng dẫn thành viên (xem số dư, rút).
- Nội dung: Bài giới thiệu "LiXi là gì, không phải là gì" (Telegram + X + Facebook), bài "Chúng tôi là ai" theo quyết định về danh tính đội ngũ (`docs/00` mục 7).
- KPI tuần: 3 pilot ký cam kết; nội quy ghim; ≥ 200 thành viên hữu cơ ở nhóm chính.

### Tuần 2 — Bot nội bộ, docs công khai

- Việc: Bot chạy trong nhóm nội bộ với LIXI testnet; đội ngũ và mod tự tip/rút để tìm lỗi. Xuất bản docs (vấn đề, giải pháp, cách LIXI được dùng, roadmap, câu miễn trừ trách nhiệm). Họp với admin 3 pilot: đặt quy tắc thưởng, hạn mức, lịch beta.
- Nội dung: Thread "Vì sao cộng đồng cần một đơn vị thưởng dùng chung" (X), bài "Lì Xì Bot hoạt động thế nào" có ảnh màn hình (Blog + Facebook), video 60 giây demo `/lixi 1000 chia 10`.
- KPI tuần: ≥ 500 lượt xem docs; bot nội bộ chạy 7 ngày không mất số dư; 3 quy tắc thưởng của pilot đã chốt.

### Tuần 3 — Beta pilot 1

- Việc: Bot vào nhóm pilot 1 (LIXI testnet, hạn mức thấp). Kênh feedback riêng với admin pilot; trực 16h/ngày. Ghi lỗi, thời gian phản hồi lệnh, số lì xì/ngày. Bắt đầu weekly update cố định (thứ Sáu) với số liệu thật.
- Nội dung: Weekly update #1, bài "Tuần đầu của pilot 1: 5 điều học được" (Blog), 3 bài X ngắn từ tình huống thật (ẩn tên nếu cần).
- KPI tuần: ≥ 300 lì xì trong pilot 1; ≥ 60% thành viên hoạt động của pilot nhận ≥ 1 lì xì; ≥ 20 lỗi/feedback được ghi nhận.

### Tuần 4 — 3 pilot trên mainnet

- Việc: Token đã deploy mainnet (`docs/09`); bot chuyển sang LIXI thật, 3 pilot nạp pot bằng grant pilot + LIXI tự mua (nếu muốn), hạn mức thấp. Bật đối chiếu số dư sổ cái/on-chain hàng ngày và công bố. Kịch bản bao lì xì đầu tiên: cột mốc của pilot (sinh nhật nhóm, đạt N thành viên).
- Nội dung: Bài "Bot chạy thật: ví nóng, Safe, cách chúng tôi giữ LIXI của bạn — và tại sao v1 là custodial" (Blog + X), weekly update #2, ảnh bao lì xì đầu tiên (xin phép pilot).
- KPI tuần: 3 pilot có pot hoạt động; ≥ 800 lì xì/tuần tổng; ≥ 50 người đã rút về ví riêng thành công; 0 sai lệch số dư.

### Tuần 5 — Kết thúc beta, mở pool

- Việc: Pool PancakeSwap tạo, LP khóa, form CoinGecko/CMC nộp (`docs/09`). Công bố **báo cáo beta**: số lì xì, ví nhận, LIXI trong pot, lỗi đã sửa, số tài khoản ảo bị loại. Chốt hạn mức cho đợt mở công khai. Bảng xếp hạng tuần đầu tiên (top người lì xì, top người nhận, theo từng pilot).
- Nội dung: Báo cáo beta (Blog + thread X + Facebook), bài "Chỉ có 1 địa chỉ hợp đồng" ghim mọi kênh, hướng dẫn mua LIXI từng bước (ảnh), weekly update #3.
- KPI tuần: Báo cáo beta công khai; LP khóa có link; 100% kênh ghim địa chỉ chính thức; ≥ 1.200 lì xì/tuần.

### Tuần 6 — Ra mắt

- Việc: Truyền thông ra mắt tập trung vào **việc bot làm được**, không vào token. Airdrop nhỏ cho thành viên pilot đã nhận và rút LIXI thật (tiêu chí công khai). Mở danh sách chờ cho cộng đồng muốn dùng bot đợt 2 (form: loại nhóm, số thành viên, cách thưởng hiện tại). AMA #1 trên Telegram voice/X Spaces với admin pilot làm khách.
- Nội dung: Bài ra mắt, AMA #1 và tóm tắt, video "Một tuần lì xì ở nhóm X" (kể chuyện, số thật), weekly update #4.
- KPI tuần: ≥ 100 cộng đồng đăng ký danh sách chờ; ≥ 300 người nghe AMA; holder thật ngoài đội ngũ ≥ `[[ĐIỀN]]`.

### Tuần 7 — Streamer đầu tiên, hỗ trợ admin

- Việc: 1–2 streamer pilot dùng bao lì xì trên stream (thù lao bằng LIXI có vesting, công khai). Mở nhóm Telegram "Admin LiXi" để admin các cộng đồng hỏi đáp, chia sẻ quy tắc thưởng. Thu 10 câu hỏi thường gặp thành FAQ.
- Nội dung: Clip bao lì xì trên stream (streamer đăng, gắn nhãn tài trợ), bài "5 quy tắc thưởng admin pilot đang dùng" (Blog), weekly update #5.
- KPI tuần: ≥ 2 stream có bao lì xì; ≥ 50 admin trong nhóm Admin LiXi; FAQ ≥ 20 mục.

### Tuần 8 — Đợt 2 chọn lọc

- Việc: Chọn 5–7 cộng đồng từ danh sách chờ (ưu tiên khác loại: group Facebook, nhóm học tập, nhóm game) và cấp grant pot nhỏ có điều kiện (phát thưởng ≥ 3 tuần liên tiếp). Công bố tiêu chí chọn và danh sách nhận grant.
- Nội dung: Bài "Đợt 2: 7 cộng đồng mới và tại sao chọn họ", thread "Cách chúng tôi loại tài khoản ảo trong bot" (X), weekly update #6.
- KPI tuần: 10 cộng đồng có pot hoạt động; ≥ 2.000 lì xì/tuần; giữ chân 7 ngày của người nhận ≥ 40%.

### Tuần 9 — Bảng xếp hạng và đối tác đổi quà

- Việc: Bảng xếp hạng công khai theo tuần (top người lì xì, top người nhận, top cộng đồng theo số lì xì) — chỉ hiện tên hiển thị/handle, không hiện số dư. Tiếp cận 5–10 đối tác đổi quà cho v3 (ban tổ chức sự kiện, shop merchandise của cộng đồng, quán quen của nhóm) theo `04-partner-outreach-templates.md` mục A; mục tiêu 2 cam kết bằng văn bản.
- Nội dung: Bảng xếp hạng tuần #1 (ảnh, mọi kênh), bài "Đổi LIXI lấy gì: kế hoạch v3 và những gì chưa có" (Blog), weekly update #7.
- KPI tuần: Bảng xếp hạng đăng đúng lịch; ≥ 1 đối tác đổi quà ký; ≥ 2.500 lì xì/tuần.

### Tuần 10 — Minh bạch tokenomics và số dư

- Việc: Công bố tokenomics cuối cùng (phân bổ, vesting, lịch unlock 36 tháng từ `tokenomics/out/`), địa chỉ Safe, ví nóng, địa chỉ nạp; báo cáo đối chiếu số dư tháng đầu. AMA #2 về tokenomics và cách dự án giữ LIXI của pot.
- Nội dung: Bài "Tokenomics LIXI giải thích từng dòng" (Blog + Facebook), thread X, infographic, AMA #2, weekly update #8.
- KPI tuần: ≥ 2.000 lượt đọc bài tokenomics; ≥ 50 câu hỏi được trả lời; 0 thay đổi tokenomics sau công bố (nếu phải sửa, thông báo trước ≥ 30 ngày).

### Tuần 11 — Chuẩn bị chiến dịch Tết 2027

- Việc: Lên kịch bản chiến dịch Tết (mục 4): mẫu bao lì xì Tết, lịch "giờ lì xì" giao thừa, grant pot Tết cho cộng đồng đủ điều kiện, giới hạn chống lạm dụng riêng cho dịp cao điểm. Diễn tập tải: mô phỏng 50 bao lì xì mở cùng lúc. Chiến dịch an toàn: cảnh báo token giả, DM giả mạo admin, "bao lì xì" lừa đảo.
- Nội dung: Bài an toàn (mọi kênh), video "3 dấu hiệu bao lì xì lừa đảo", thông báo trước chiến dịch Tết, weekly update #9.
- KPI tuần: Kịch bản Tết duyệt; bot chịu tải diễn tập không lỗi; thời gian phản hồi báo cáo lừa đảo < 1 giờ.

### Tuần 12 — Mở bot công khai (đầu Q1/2027)

- Việc: Mở đăng ký bot cho mọi cộng đồng (tự phục vụ, hạn mức mặc định thấp, tăng theo thời gian hoạt động của pot). Công bố lịch chiến dịch Tết. Bàn giao mục 6.
- Nội dung: Bài "Lì Xì Bot mở cho mọi cộng đồng", hướng dẫn admin bản đầy đủ, AMA #3, weekly update #10.
- KPI tuần: Đạt bảng mục tiêu ở mục 0; ≥ 30 cộng đồng mới thêm bot trong 7 ngày đầu; kế hoạch nội dung Tết đã duyệt.

## 3. KPI theo dõi hàng tuần (bảng tổng hợp)

Cập nhật mỗi thứ Hai. Chỉ số **in đậm** là chỉ số quyết định; nếu 2 tuần liên tiếp không đạt 70% mục tiêu, họp điều chỉnh kế hoạch.

| Tuần | **Cộng đồng có pot hoạt động** | **Lì xì/tuần** | Ví nhận duy nhất (lũy kế) | **Đã rút về ví riêng %** | TG kênh chính thành viên | **TG hoạt động %** | X follower | X tương tác % | Đối tác đổi quà | Bài báo |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 (3 ký) | — | — | — | 200 | 30 | 300 | 3 | 0 | 0 |
| 2 | 0 (nội bộ) | 100 | 20 | — | 400 | 30 | 600 | 3 | 0 | 0 |
| 3 | 1 | 300 | 150 | — | 700 | 25 | 900 | 3 | 0 | 0 |
| 4 | 3 | 800 | 500 | 10 | 1.000 | 25 | 1.300 | 3 | 0 | 0 |
| 5 | 3 | 1.200 | 800 | 15 | 1.500 | 25 | 1.800 | 3 | 0 | 0 |
| 6 | 3 | 1.300 | 1.000 | 18 | 2.200 | 25 | 2.400 | 3 | 0 | 1 |
| 7 | 5 | 1.600 | 1.400 | 20 | 2.800 | 25 | 2.900 | 3 | 0 | 1 |
| 8 | 10 | 2.000 | 2.000 | 22 | 3.300 | 25 | 3.400 | 3 | 0 | 2 |
| 9 | 11 | 2.500 | 2.600 | 23 | 3.800 | 25 | 3.900 | 3 | 1 | 2 |
| 10 | 12 | 2.700 | 3.100 | 24 | 4.200 | 25 | 4.300 | 3 | 1 | 3 |
| 11 | 13 | 2.800 | 3.500 | 25 | 4.600 | 25 | 4.700 | 3 | 2 | 3 |
| 12 | 15 | 3.000 | 4.000 | 25 | 5.000 | 25 | 5.000 | 3 | 2 | 3 |

Định nghĩa:
- *Cộng đồng có pot hoạt động* = nạp ≥ 1 lần và bot phát thưởng hoặc có lì xì ≥ 1 lần trong tuần.
- *Lì xì/tuần* = số lệnh tip thành công + số bao lì xì đã mở (mỗi bao tính 1), trừ giao dịch của tài khoản bị loại.
- *Đã rút về ví riêng %* = số người nhận đã rút ≥ 1 lần / tổng người nhận; chỉ số này cho biết phần thưởng có "thật" với người dùng không.
- *TG hoạt động %* = số thành viên gửi ≥ 1 tin/tuần / tổng thành viên kênh chính.
- *Tương tác %* = (like + trả lời + repost + lưu) / lượt hiển thị, trung bình 7 ngày.
- Ghi số liệu vào `03-kpi-dashboard-template.csv` hàng tháng.

## 4. Chiến dịch Tết 2027 (Tết Nguyên đán: 17/02/2027)

Tết là dịp tên "LiXi" tự giải thích. Chiến dịch chạy từ 23 tháng Chạp (31/01/2027) đến mùng 10 (26/02/2027).

| Hạng mục | Nội dung | Điều kiện |
|---|---|---|
| Mẫu bao lì xì Tết | 3–5 mẫu (ảnh/sticker) cho lệnh `/lixi ... chia ...`; cộng đồng có pot ≥ ngưỡng được mẫu riêng | Tính năng v3 sớm hoặc mẫu chung nếu chưa kịp |
| "Giờ lì xì" giao thừa | Đội ngũ mở bao lì xì ở nhóm chính đúng giao thừa; admin các cộng đồng được gợi ý làm cùng | Hạn mức riêng cho 2 giờ cao điểm, đã diễn tập tải tuần 11 |
| Grant pot Tết | Cộng đồng đủ điều kiện (pot hoạt động ≥ 4 tuần, không vi phạm) nhận grant LIXI để lì xì thành viên | Từ phần "Cộng đồng và hệ sinh thái", công khai danh sách và số LIXI |
| Bảng xếp hạng Tết | Top người lì xì, top người nhận, top cộng đồng trong 2 tuần Tết | Chỉ hiện handle, không hiện số dư; loại tài khoản ảo trước khi đăng |
| Nội dung | Thiệp chúc Tết có hướng dẫn `/lixi`, clip streamer mở bao lì xì đêm giao thừa, bài "Lì xì on-chain khác gì lì xì phong bì" | Không nói giá; không "lì xì đầu năm x10" |
| Chống lạm dụng | Giới hạn số bao/người/ngày, số người nhận/bao, tuổi tài khoản; cảnh báo bao lì xì giả mạo | Ghim cảnh báo ở mọi kênh từ 23 tháng Chạp |

KPI chiến dịch: số lì xì trong 2 tuần Tết ≥ 3× tuần thường; ≥ 20 cộng đồng dùng grant Tết; 0 sự cố số dư; báo cáo sau Tết trong 7 ngày.

## 5. Quy tắc vận hành

### 5.1. Nội quy kênh (ghim ở mọi kênh)

1. Không thảo luận giá, không dự đoán giá, không hỏi/đáp "khi nào lên sàn X".
2. Không quảng cáo dự án khác, không link rút gọn, không DM thành viên để "hỗ trợ".
3. Admin/mod **không bao giờ** nhắn riêng trước và không bao giờ xin seed phrase hay yêu cầu chuyển tiền.
4. Địa chỉ hợp đồng chính thức chỉ có ở website và bài ghim; mọi địa chỉ khác là giả. Bot chính thức chỉ có một username, ghim kèm.
5. Lì xì là quà; không dùng bot để "bán", "đổi tiền", hay hứa hẹn bất cứ điều gì về giá trị.
6. Tôn trọng lẫn nhau; vi phạm lần 1 cảnh cáo, lần 2 mute 24h, lần 3 ban.

### 5.2. Quy tắc cho đội ngũ, mod, admin pilot, ambassador, KOL

- Ký "cam kết truyền thông" gồm: không nói giá, không hứa listing, không dùng logo sàn, gắn nhãn tài trợ, không dùng tài khoản phụ để nhận thưởng hay tạo tương tác.
- Mọi phát ngôn về sàn giao dịch chỉ dùng dạng: "Chúng tôi sẽ nộp hồ sơ theo quy trình công khai; quyết định thuộc về sàn."
- Không đăng ảnh chụp trò chuyện với nhân viên sàn, quỹ đầu tư, hay đối tác chưa công bố.

### 5.3. Hợp đồng KOL / streamer — điều khoản bắt buộc

- Gắn nhãn tài trợ rõ ràng trong mọi bài/stream.
- Nội dung phải được đội ngũ duyệt về **tính chính xác** (không duyệt về giọng văn).
- Thù lao: tiền mặt `[[ĐIỀN]]` + token `[[ĐIỀN]]` LIXI, cliff 3 tháng, vesting 6–12 tháng, mất phần chưa unlock nếu vi phạm. Với streamer, thêm một pot LIXI để lì xì khán giả trên stream — pot này ghi riêng, công khai.
- Cấm: nói giá, hứa lợi nhuận, dùng logo sàn, xóa bài sớm hơn 30 ngày, mua tương tác, tự tip cho tài khoản phụ.
- Công khai: dự án đăng danh sách KOL/streamer và điều khoản chính.
- Mẫu tin nhắn tiếp cận: xem `04-partner-outreach-templates.md`.

### 5.4. Chống tài khoản ảo và lạm dụng trong bot

- Thưởng hoạt động chỉ tính tin nhắn hợp lệ (độ dài tối thiểu, không lặp, không chỉ emoji); admin có thể tắt thưởng tự động và chỉ giữ tip.
- Hạn mức tip/ngày/người, hạn mức phát thưởng/ngày/nhóm, cooldown, tuổi tài khoản Telegram và thời gian tham gia nhóm tối thiểu.
- Lọc: nhiều tài khoản cùng rút về một địa chỉ, tip vòng tròn, tài khoản tạo cùng lúc; công bố số tài khoản bị loại và lý do tổng quát.
- Tuyệt đối không thưởng "follow + retweet" đơn thuần; airdrop chỉ cho ví đã nhận và rút LIXI thật.

### 5.5. Xử lý khủng hoảng truyền thông

| Tình huống | Phản ứng trong | Người phát ngôn | Hành động |
|---|---|---|---|
| Token giả / bot giả / bao lì xì lừa đảo | 1 giờ | Head of Growth | Ghim cảnh báo mọi kênh, báo cáo nền tảng |
| Tin sai về đội ngũ/quỹ | 4 giờ | Founder | Bài giải thích có bằng chứng, không tranh cãi cá nhân |
| Lỗi bot / sai lệch số dư / ví nóng | 30 phút (tắt rút + nạp), 2 giờ (xác nhận), 72 giờ (báo cáo) | CTO + Founder | Theo kế hoạch ứng phó `docs/05` mục 9.5; bù từ Safe nếu thiếu; post-mortem |
| Mod/KOL/admin pilot vi phạm nội quy | 24 giờ | Head of Growth | Chấm dứt hợp đồng/grant, thông báo công khai nếu ảnh hưởng cộng đồng |

### 5.6. Tiêu chí chọn cộng đồng pilot

- Đang thưởng thành viên bằng tiền/quà thật ít nhất 1 lần/tháng (có nỗi đau thật).
- 300–5.000 thành viên, hoạt động hằng ngày, admin trả lời trong 24 giờ.
- Ba pilot khác loại nhau: ví dụ 1 nhóm Telegram chủ đề (công nghệ/học tập), 1 nhóm game hoặc fan, 1 kênh streamer.
- Admin đồng ý công khai số liệu tổng (số lì xì, số người nhận) và nội quy không nói giá.
- Không phải nhóm giao dịch/tín hiệu crypto — tránh biến bot thành công cụ shill.

### 5.7. Cam kết pilot (ký với admin, công khai bản tóm tắt)

- Dự án cấp grant pot `[[ĐIỀN]]` LIXI, hỗ trợ kỹ thuật 16h/ngày, sửa lỗi ưu tiên; admin không phải trả gì.
- Admin cam kết chạy bot ≥ 4 tuần, phát thưởng theo quy tắc đã đặt, không tự tip cho tài khoản phụ, báo lỗi trong kênh riêng.
- Số liệu tổng của nhóm được công bố trong báo cáo beta; không công bố danh tính thành viên.
- Hai bên có quyền dừng bất cứ lúc nào; LIXI còn trong pot khi dừng được trả về quỹ cộng đồng.

## 6. Bàn giao sau tuần 12

- Bảng KPI 12 tuần đã điền số thật (đầu vào cho `03-kpi-dashboard-template.csv`).
- Báo cáo beta và báo cáo tháng đầu sau ra mắt (số lì xì, ví nhận, LIXI trong pot, đối chiếu số dư).
- Danh sách cộng đồng nhận grant, KOL/streamer và điều khoản (công khai).
- Danh sách ví đủ điều kiện airdrop (đã nhận và rút LIXI thật, đã lọc tài khoản ảo, tiêu chí công bố).
- Kịch bản chiến dịch Tết 2027 đã duyệt và kế hoạch nội dung 4 tuần Tết.
