# Whitepaper NewCoin (NEWC) — Bản khung (draft v0.1)

> **Cách dùng tài liệu này.** Đây là bộ khung whitepaper theo cấu trúc mà bộ phận xét duyệt của Binance
> và nhà đầu tư nghiêm túc thường mong đợi. Mỗi mục có một đoạn hướng dẫn (trong blockquote) và phần nội dung
> mẫu với các chỗ trống dạng `[[ĐIỀN: ...]]`. Dưới mỗi chỗ trống có *ví dụ in nghiêng* để biết một câu trả lời tốt
> trông như thế nào; ví dụ chỉ để minh họa, **không** sao chép nguyên văn. Khi hoàn thiện, xóa toàn bộ blockquote
> hướng dẫn và ví dụ, giữ lại nội dung thật. Tuyệt đối không điền số liệu chưa có thật; nếu chưa có, ghi "chưa có"
> và để trống thay vì ước lượng.

| Trường | Giá trị |
|---|---|
| Tên dự án | NewCoin |
| Ticker | NEWC |
| Chain | BNB Chain (BEP-20) |
| Tổng cung | 1.000.000.000 NEWC (cố định, không mint thêm) |
| Phiên bản tài liệu | v0.1 — bản khung |
| Ngày | `[[ĐIỀN: ngày phát hành bản này]]` |
| Địa chỉ hợp đồng | `[[ĐIỀN: sau khi deploy và verify trên BscScan]]` |
| Website / Docs | `[[ĐIỀN]]` |

---

## Mục lục

1. Tóm tắt (Abstract)
2. Bối cảnh và vấn đề
3. Giải pháp và sản phẩm
4. Kiến trúc kỹ thuật
5. Token NEWC: vai trò và tiện ích
6. Tokenomics
7. Phân phối và lịch mở khóa
8. Quản trị
9. Bảo mật
10. Lộ trình 24 tháng
11. Đội ngũ và cố vấn
12. Đối tác và hệ sinh thái
13. Cạnh tranh và điểm khác biệt
14. Pháp lý và tuân thủ
15. Yếu tố rủi ro
16. Tuyên bố miễn trừ trách nhiệm
17. Thuật ngữ
18. Phụ lục

---

## 1. Tóm tắt (Abstract)

> Reviewer thường chỉ đọc kỹ trang này rồi quyết định có đọc tiếp hay không. Viết 150–250 từ, trả lời đúng 5 câu:
> vấn đề gì, cho ai, giải pháp là gì, token làm gì trong đó, và tại sao đội ngũ này. Không dùng tính từ hoa mỹ
> ("cách mạng", "đột phá"); dùng động từ và danh từ cụ thể. Không nhắc đến giá, lợi nhuận hay "tiềm năng tăng trưởng".

NewCoin là `[[ĐIỀN: một câu mô tả sản phẩm — loại sản phẩm + đối tượng + việc sản phẩm làm được]]`.

*Ví dụ: "NewCoin là nền tảng thanh toán định kỳ on-chain cho các cửa hàng nhỏ ở Đông Nam Á, cho phép chủ cửa hàng nhận thanh toán bằng stablecoin và tự động chia doanh thu cho nhà cung cấp mà không cần trung gian."*

Vấn đề chúng tôi giải quyết: `[[ĐIỀN: mô tả vấn đề sản phẩm giải quyết, trong 1–2 câu, có số liệu nguồn công khai nếu có]]`.

*Ví dụ: "Hơn 60% cửa hàng nhỏ trong khu vực vẫn đối soát doanh thu thủ công, mất trung bình 6 giờ/tuần và chịu phí trung gian 2–4% (nguồn: [[tên báo cáo, năm]])."*

Token NEWC được dùng để `[[ĐIỀN: 2–3 chức năng cốt lõi của token trong sản phẩm]]`.

*Ví dụ: "trả phí giao dịch trên mạng lưới, staking để trở thành node xác thực đối soát, và bỏ phiếu cho các thay đổi tham số phí."*

Tình trạng hiện tại: `[[ĐIỀN: sản phẩm đang ở giai đoạn nào — ý tưởng / testnet / beta / mainnet; nếu có số liệu thật thì ghi kèm nguồn xác minh]]`.

---

## 2. Bối cảnh và vấn đề

> Chứng minh rằng vấn đề có thật, đủ lớn và đang không được giải quyết tốt. Dùng số liệu từ nguồn công khai có thể
> kiểm chứng (báo cáo ngành, số liệu on-chain, khảo sát do đội ngũ tự làm và công bố phương pháp). Mô tả rõ
> "người dùng mục tiêu" là ai và họ đang làm gì hôm nay khi chưa có sản phẩm của bạn. Reviewer sẽ nghi ngờ mọi
> con số không có nguồn.

### 2.1 Người dùng mục tiêu

`[[ĐIỀN: mô tả 1–2 nhóm người dùng cụ thể: họ là ai, ở đâu, quy mô ước tính và nguồn ước tính]]`

*Ví dụ: "Nhóm 1: chủ cửa hàng bán lẻ có doanh thu 5.000–50.000 USD/tháng tại Việt Nam, Indonesia, Philippines (ước tính [[N]] cửa hàng theo [[nguồn]]). Nhóm 2: nhà cung cấp hàng hóa cho nhóm 1."*

### 2.2 Vấn đề hiện tại

`[[ĐIỀN: 3 điểm đau lớn nhất, mỗi điểm 1–2 câu, có số liệu hoặc trích dẫn]]`

### 2.3 Tại sao các giải pháp hiện có chưa đủ

`[[ĐIỀN: liệt kê 2–4 cách người dùng đang giải quyết vấn đề (kể cả cách thủ công) và hạn chế của từng cách]]`

### 2.4 Tại sao cần blockchain

> Đây là câu hỏi reviewer chắc chắn đặt ra. Nếu một cơ sở dữ liệu thông thường làm được thì token là thừa và hồ sơ
> sẽ yếu. Trả lời thẳng: tính năng nào **chỉ** làm được (hoặc làm tốt hơn hẳn) nhờ on-chain.

`[[ĐIỀN: 2–3 lý do cụ thể]]`

*Ví dụ: "Các bên tham gia không tin nhau và không có trung gian chung; việc chia doanh thu cần được thực thi tự động và kiểm chứng công khai; người dùng cần mang lịch sử uy tín sang nền tảng khác."*

---

## 3. Giải pháp và sản phẩm

> Mô tả sản phẩm như một thứ có thể dùng được, không phải một tầm nhìn. Có ảnh chụp màn hình, link dùng thử,
> luồng người dùng từng bước. Nếu sản phẩm chưa chạy, nói rõ "chưa chạy" và ngày dự kiến; đừng viết như thể đã có.

### 3.1 Mô tả sản phẩm

`[[ĐIỀN: sản phẩm là gì, người dùng làm gì với nó, kết quả họ nhận được]]`

### 3.2 Luồng người dùng chính

`[[ĐIỀN: 4–7 bước từ lúc người dùng biết đến sản phẩm đến lúc nhận được giá trị; ghi rõ bước nào chạm vào token]]`

*Ví dụ: "1) Chủ cửa hàng tạo ví qua đăng nhập mạng xã hội → 2) Kết nối máy POS → 3) Khách thanh toán bằng stablecoin → 4) Hợp đồng tự động chia doanh thu theo tỷ lệ đã cài → 5) Phí mạng lưới trừ bằng NEWC (bước chạm token)."*

### 3.3 Tính năng theo phiên bản

| Phiên bản | Tính năng | Trạng thái | Ngày |
|---|---|---|---|
| Testnet công khai | `[[ĐIỀN]]` | `[[Đã xong / Đang làm / Kế hoạch]]` | `[[ĐIỀN]]` |
| Beta | `[[ĐIỀN]]` | | |
| Mainnet v1 | `[[ĐIỀN]]` | | |

### 3.4 Số liệu sử dụng (chỉ điền khi đã có thật)

> Chỉ điền số liệu có thể kiểm chứng bằng link công khai (Dune, DefiLlama, explorer, analytics công khai). Nếu chưa
> có, ghi rõ "Chưa có số liệu; sản phẩm dự kiến mở testnet vào [[thời điểm]]". Số liệu bịa là lý do bị từ chối
> vĩnh viễn.

`[[ĐIỀN: hoặc "Chưa có số liệu công khai tại thời điểm viết"]]`

---

## 4. Kiến trúc kỹ thuật

> Reviewer kỹ thuật muốn thấy: thành phần nào on-chain, thành phần nào off-chain, dữ liệu đi qua đâu, ai giữ khóa
> gì, điểm tin cậy tập trung (nếu có) nằm ở đâu. Một sơ đồ khối rõ ràng hơn ba trang chữ. Nêu thẳng các thành phần
> tập trung và kế hoạch phi tập trung hóa dần.

### 4.1 Sơ đồ tổng thể

```
[[ĐIỀN: sơ đồ khối — ví dụ:]]

  Người dùng (web/app)
        │
        ▼
  Backend API ──────► Indexer / cơ sở dữ liệu đọc
        │
        ▼
  Hợp đồng trên BNB Chain
   ├─ NEWC (BEP-20, cố định cung)
   ├─ [[Hợp đồng lõi sản phẩm]]
   ├─ Staking / Vesting
   └─ Governance + Timelock
```

### 4.2 Thành phần on-chain

| Hợp đồng | Chức năng | Có thể nâng cấp? | Quyền admin | Ai kiểm soát |
|---|---|---|---|---|
| NEWC Token | BEP-20 chuẩn OpenZeppelin, không mint, không blacklist, không thuế giao dịch | Không | Không có | — |
| `[[ĐIỀN: hợp đồng lõi]]` | `[[ĐIỀN]]` | `[[Có/Không]]` | `[[ĐIỀN]]` | Safe multisig + timelock |
| Vesting | Khóa token đội ngũ/nhà đầu tư | Không | Không có | — |
| Governance | Đề xuất và bỏ phiếu | `[[ĐIỀN]]` | Timelock | Token holder |

### 4.3 Thành phần off-chain

`[[ĐIỀN: backend, indexer, oracle, dịch vụ bên thứ ba; dữ liệu nào không lên chain và tại sao]]`

### 4.4 Điểm tập trung và lộ trình phi tập trung hóa

`[[ĐIỀN: liệt kê thành thật các điểm mà đội ngũ vẫn kiểm soát (ví dụ: backend, oracle, quyền nâng cấp) và mốc thời gian chuyển giao]]`

*Ví dụ: "Oracle giá hiện do đội ngũ vận hành 1 node; kế hoạch chuyển sang mạng oracle bên thứ ba trước Q2/2027. Quyền nâng cấp hợp đồng lõi sẽ được chuyển hoàn toàn cho governance sau khi có ≥ 3 audit và 6 tháng vận hành ổn định."*

### 4.5 Lý do chọn BNB Chain

`[[ĐIỀN: lý do kỹ thuật và hệ sinh thái; tham chiếu docs/01 mục Giai đoạn 1]]`

---

## 5. Token NEWC: vai trò và tiện ích

> Đây là mục quan trọng nhất đối với Binance. Mỗi tiện ích phải: (a) gắn với một hành động cụ thể trong sản phẩm,
> (b) có chỉ số đo được on-chain, (c) tạo cầu tự nhiên khi sản phẩm được dùng nhiều hơn. Tránh các tiện ích mơ hồ
> ("tham gia hệ sinh thái", "được ưu đãi"). Tránh mọi cơ chế giống chứng khoán: chia lợi nhuận, cam kết lãi, quyền
> sở hữu công ty. Nếu có "mua lại/đốt" thì mô tả như cơ chế vận hành sản phẩm, không như lời hứa về giá.

### 5.1 Bảng tiện ích

| # | Tiện ích | Cơ chế cụ thể | Chỉ số đo được (on-chain) | Bắt buộc hay tùy chọn |
|---|---|---|---|---|
| 1 | `[[ĐIỀN: ví dụ "Phí sử dụng"]]` | `[[ĐIỀN: người dùng trả X NEWC cho hành động Y; hoặc giảm Z% phí khi trả bằng NEWC]]` | Số NEWC chi trả/tháng; số giao dịch có phí | `[[ĐIỀN]]` |
| 2 | `[[ĐIỀN: ví dụ "Staking để vận hành node / mở tính năng"]]` | `[[ĐIỀN: khóa N NEWC để có quyền ...; bị phạt (slash) nếu ...]]` | Số NEWC đang khóa; số địa chỉ staking | `[[ĐIỀN]]` |
| 3 | `[[ĐIỀN: ví dụ "Quản trị"]]` | 1 NEWC = 1 phiếu; đề xuất cần `[[N]]` NEWC để tạo; quorum `[[%]]` | Số đề xuất; số ví bỏ phiếu; % cung tham gia | Tùy chọn |
| 4 | `[[ĐIỀN: ví dụ "Bảo chứng / ký quỹ"]]` | `[[ĐIỀN]]` | `[[ĐIỀN]]` | `[[ĐIỀN]]` |

*Ví dụ dòng 1: "Phí mạng lưới: mỗi giao dịch chia doanh thu trả 0,1% giá trị bằng NEWC (quy đổi theo oracle). Người dùng trả bằng stablecoin sẽ được hợp đồng tự mua NEWC trên DEX để trả phí. Chỉ số: tổng NEWC dùng làm phí/tháng, hiển thị công khai trên dashboard."*

### 5.2 Vòng đời của token trong sản phẩm

`[[ĐIỀN: token đi từ đâu đến đâu — ai mua, ai nhận, phần nào bị khóa, phần nào bị đốt, phần nào quay lại treasury]]`

### 5.3 Cơ chế cân bằng cung – cầu (nếu có)

> Mô tả trung tính, mang tính kỹ thuật. Không viết "giảm phát sẽ đẩy giá lên".

`[[ĐIỀN: ví dụ "X% phí thu được sẽ được đốt; Y% chuyển vào treasury; Z% thưởng cho staker" — hoặc ghi "Không có" nếu không có]]`

### 5.4 Những gì NEWC KHÔNG phải

NEWC không đại diện cho cổ phần, quyền sở hữu, quyền hưởng lợi nhuận hay bất kỳ nghĩa vụ tài chính nào của
pháp nhân phát hành. NEWC không phải là phương tiện thanh toán pháp định tại bất kỳ quốc gia nào.

---

## 6. Tokenomics

> Tham chiếu `docs/03-tokenomics-template.md`. Bảng dưới đây là **phân bổ khuyến nghị tham chiếu** nằm trong các
> khoảng của docs/03; đội ngũ cần chốt con số cuối cùng và giải thích *tại sao* chọn con số đó. Tổng phải bằng 100%.
> Reviewer sẽ đối chiếu bảng này với số dư ví thật trên chain, nên mọi con số phải khớp với hợp đồng vesting.
> Nguồn số liệu duy nhất là `tokenomics/config.example.json` (cùng bộ số với `contracts/config/allocations.example.json`);
> khi đổi số, làm theo `tokenomics/README.md` để sinh lại bảng, biểu đồ và kết quả kiểm tra red flag rồi cập nhật lại mục 6–7 này.

### 6.1 Thông số cơ bản

| Trường | Giá trị |
|---|---|
| Tổng cung | 1.000.000.000 NEWC |
| Cơ chế phát hành | Mint một lần khi deploy; hàm mint bị vô hiệu hóa vĩnh viễn |
| Decimals | 18 |
| Cung lưu hành tại TGE (mục tiêu) | `[[ĐIỀN: khuyến nghị 10–20% — bảng tham chiếu dưới cho ra 148.600.000 NEWC = 14,86%]]` |
| Cơ chế giảm cung | `[[ĐIỀN: đốt từ phí / không có]]` |

### 6.2 Phân bổ khuyến nghị tham chiếu

| Nhóm | % tổng cung | Số NEWC | Cliff | Vesting | Mở khóa tại TGE (% của nhóm → % tổng cung) | Mục đích |
|---|---|---|---|---|---|---|
| Cộng đồng và hệ sinh thái | 32% | 320.000.000 | — | 48 tháng tuyến tính | 5% → 1,6% | Airdrop người dùng thật, quest, grant nhà phát triển, thưởng staking |
| Đội ngũ và cố vấn | 18% | 180.000.000 | 12 tháng | 36 tháng tuyến tính sau cliff | 0% → 0% | Bắt buộc 0% tại TGE |
| Nhà đầu tư (seed/private) | 15% | 150.000.000 | 9 tháng | 24 tháng tuyến tính sau cliff | 0% → 0% | Công khai giá vòng và điều khoản; cliff 9 tháng để tháng đầu mở khóa không trùng cliff đội ngũ |
| Treasury | 13% | 130.000.000 | — | 36 tháng tuyến tính (mô hình hóa); thực tế giải ngân theo đề xuất quản trị, tối đa `[[ĐIỀN]]`%/quý | 2% → 0,26% | Vận hành dài hạn, dự phòng |
| Thanh khoản (DEX/CEX/MM) | 8% | 80.000.000 | — | Toàn bộ tại TGE | 100% → 8% | LP khóa ≥ 12 tháng; phần cho MM ≤ 2% tổng cung |
| Chương trình Binance | 5% | 50.000.000 | 3 tháng | 24 tháng tuyến tính sau cliff (mô hình hóa); thực tế giải ngân theo chương trình (Alpha airdrop, Launchpool, HODLer…) | 0% → 0% | Giữ riêng, không dùng cho mục đích khác |
| Marketing và KOL | 5% | 50.000.000 | — | 24 tháng tuyến tính | 20% → 1% | Mọi hợp đồng KOL có vesting |
| Public sale | 4% | 40.000.000 | — | Toàn bộ tại TGE | 100% → 4% | Giá không thấp hơn vòng private quá xa |
| **Tổng** | **100%** | **1.000.000.000** | | | **148.600.000 = 14,86%** | |

`[[ĐIỀN: giải thích ngắn tại sao chọn từng con số; nếu thay đổi so với bảng tham chiếu, ghi rõ lý do]]`

*Ví dụ: "Phần cộng đồng chiếm lớn nhất (32%) vì mô hình tăng trưởng của sản phẩm dựa vào thưởng cho cửa hàng mới trong 24 tháng đầu; 60% phần này dành riêng cho thưởng sử dụng, 25% cho grant nhà phát triển tích hợp, 15% cho quest và airdrop."*

### 6.3 Kế hoạch sử dụng từng nhóm

`[[ĐIỀN: với mỗi nhóm, ai quyết định chi, chi cho việc gì, báo cáo ở đâu và bao lâu một lần]]`

### 6.4 Gọi vốn (nếu có)

> Chỉ điền vòng đã đóng và có bằng chứng. Không ghi tên nhà đầu tư chưa ký. Nếu chưa gọi vốn, ghi "Chưa gọi vốn".

| Vòng | Ngày | Số token | Giá/token | Định giá FDV | Cliff/Vesting | Nhà đầu tư (công khai) |
|---|---|---|---|---|---|---|
| `[[ĐIỀN hoặc "Chưa gọi vốn"]]` | | | | | | |

---

## 7. Phân phối và lịch mở khóa

> Binance yêu cầu lịch unlock 36 tháng dạng bảng và biểu đồ, kiểm tra được bằng hợp đồng vesting on-chain.
> Quy tắc tự kiểm: không tháng nào (trừ TGE) unlock quá 5–8% cung lưu hành hiện tại; tháng kết thúc cliff của
> đội ngũ/nhà đầu tư không trùng với mốc chương trình Binance. Đính kèm file sheet và link Tokenomist/CryptoRank
> sau khi TGE.

### 7.1 Lịch unlock theo tháng (rút gọn; bảng đầy đủ trong phụ lục / sheet)

| Tháng | Cộng đồng | Đội ngũ | Nhà đầu tư | Treasury | Thanh khoản | Binance | Marketing | Public | Tổng lưu hành | % tổng cung | Unlock so với lưu hành tháng trước |
|---|---|---|---|---|---|---|---|---|---|---|---|
| T0 (TGE) | 16.000.000 | 0 | 0 | 2.600.000 | 80.000.000 | 0 | 10.000.000 | 40.000.000 | 148.600.000 | 14,86% | — |
| T1 | 6.333.333 | 0 | 0 | 3.538.889 | 0 | 0 | 1.666.667 | 0 | 160.138.889 | 16,01% | 7,77% |
| T3 | 6.333.333 | 0 | 0 | 3.538.889 | 0 | 0 | 1.666.667 | 0 | 183.216.667 | 18,32% | 6,72% |
| T6 | 6.333.333 | 0 | 0 | 3.538.889 | 0 | 2.083.333 | 1.666.667 | 0 | 224.083.333 | 22,41% | 6,47% |
| T9 | 6.333.333 | 0 | 0 | 3.538.889 | 0 | 2.083.333 | 1.666.667 | 0 | 264.950.000 | 26,50% | 5,42% |
| T12 | 6.333.333 | 0 | 6.250.000 | 3.538.889 | 0 | 2.083.333 | 1.666.667 | 0 | 324.566.667 | 32,46% | 6,52% |
| T24 | 6.333.333 | 5.000.000 | 6.250.000 | 3.538.889 | 0 | 2.083.333 | 1.666.667 | 0 | 623.033.333 | 62,30% | 4,16% |
| T36 | 6.333.333 | 5.000.000 | 0 | 3.538.889 | 0 | 0 | 0 | 0 | 864.000.000 | 86,40% | 1,75% |

Cột theo nhóm là số token mở khóa **trong** tháng đó (đội ngũ bắt đầu mở từ T13, nhà đầu tư từ T10, chương trình Binance từ T4); số liệu lấy từ `tokenomics/out/schedule.csv`, làm tròn đến token. Tháng unlock mạnh nhất so với lưu hành tháng trước là T1 (7,77%), dưới ngưỡng 8% của bộ quy tắc trong `tokenomics/config.example.json`.

### 7.2 Cam kết minh bạch

- Mọi ví phân bổ có nhãn công khai trên BscScan và docs; đều là Safe multisig hoặc hợp đồng vesting.
- Mọi thay đổi lịch unlock phải qua governance và thông báo trước ≥ 30 ngày.
- Dashboard công khai (Dune hoặc tương đương) cập nhật cung lưu hành, số holder, top 10 ví.

### 7.3 Địa chỉ ví phân bổ

| Nhóm | Loại ví | Ngưỡng ký | Timelock | Địa chỉ |
|---|---|---|---|---|
| Treasury | Safe multisig | 3/5 | 48 giờ | `[[ĐIỀN sau khi tạo]]` |
| Vesting đội ngũ | Hợp đồng vesting đã audit | — | — | `[[ĐIỀN]]` |
| Vesting nhà đầu tư | Hợp đồng vesting đã audit | — | — | `[[ĐIỀN]]` |
| Cộng đồng | Safe multisig | 3/5 | 24 giờ | `[[ĐIỀN]]` |
| Thanh khoản/MM | Safe multisig | 2/3 | 24 giờ | `[[ĐIỀN]]` |
| Chương trình Binance | Safe multisig | 3/5 | — | `[[ĐIỀN]]` |
| Marketing | Safe multisig | 2/3 | 24 giờ | `[[ĐIỀN]]` |

---

## 8. Quản trị

> Mô tả cách quyết định được đưa ra hôm nay và sẽ được đưa ra khi nào bởi ai. Giai đoạn đầu thường là "quản trị
> bởi đội ngũ có ràng buộc" rồi chuyển dần sang holder. Nêu rõ phạm vi governance được quyết (tham số phí, chi
> treasury, nâng cấp hợp đồng) và không được quyết (thay đổi tổng cung). Reviewer coi lộ trình chuyển giao thực tế
> quan trọng hơn khẩu hiệu "hoàn toàn phi tập trung".

### 8.1 Giai đoạn quản trị

| Giai đoạn | Thời điểm | Ai quyết định | Phạm vi | Cơ chế kiểm soát |
|---|---|---|---|---|
| 1 — Khởi động | TGE → `[[ĐIỀN]]` | Hội đồng đa chữ ký `[[N]]` người (công khai danh tính) | Vận hành, chi treasury theo ngân sách đã công bố | Multisig 3/5 + timelock 48 giờ; báo cáo hàng tháng |
| 2 — Tín hiệu từ holder | `[[ĐIỀN]]` | Holder bỏ phiếu off-chain (Snapshot), hội đồng thực thi | Tham số phí, phân bổ grant | Hội đồng cam kết thực thi kết quả bỏ phiếu hợp lệ |
| 3 — On-chain | `[[ĐIỀN]]` | Holder bỏ phiếu on-chain, Timelock thực thi | Toàn bộ trừ tổng cung | Governor + Timelock; hội đồng chỉ còn quyền phủ quyết khẩn cấp trong `[[N]]` tháng |

### 8.2 Tham số quản trị (giai đoạn 3)

| Tham số | Giá trị |
|---|---|
| Ngưỡng tạo đề xuất | `[[ĐIỀN: ví dụ 0,5% tổng cung]]` |
| Thời gian bỏ phiếu | `[[ĐIỀN: ví dụ 5 ngày]]` |
| Quorum | `[[ĐIỀN: ví dụ 4% tổng cung]]` |
| Timelock thực thi | `[[ĐIỀN: ví dụ 48 giờ]]` |
| Không thể thay đổi qua governance | Tổng cung; hàm mint |

### 8.3 Minh bạch tài chính

`[[ĐIỀN: tần suất báo cáo treasury, nơi công bố, ai ký xác nhận]]`

---

## 9. Bảo mật

> Reviewer muốn thấy chuỗi bằng chứng: audit công khai → lỗi đã sửa và được xác nhận lại → mã nguồn verify →
> quyền admin còn lại được liệt kê và kiểm soát → bug bounty đang chạy → kế hoạch ứng phó sự cố. Không có audit
> hoặc audit chưa công khai là lý do loại hồ sơ. Tham chiếu docs/01 Giai đoạn 4.

### 9.1 Kiểm toán

| Hãng audit | Phạm vi | Ngày | Kết quả | Link báo cáo |
|---|---|---|---|---|
| `[[ĐIỀN: tên hãng, chỉ khi đã ký hợp đồng hoặc đã xong]]` | `[[Token / Vesting / Hợp đồng lõi]]` | `[[ĐIỀN]]` | `[[N Critical, N High — tất cả đã sửa và xác nhận lại]]` | `[[ĐIỀN]]` |

Nếu chưa có audit: "Audit dự kiến với `[[hãng]]` vào `[[thời điểm]]`; TGE sẽ không diễn ra trước khi có báo cáo công khai."

### 9.2 Quyền admin còn lại

| Hợp đồng | Quyền | Ai giữ | Kiểm soát | Kế hoạch từ bỏ |
|---|---|---|---|---|
| NEWC Token | Không có | — | — | — |
| `[[Hợp đồng lõi]]` | `[[pause / upgrade / cấu hình tham số]]` | Safe multisig 3/5 | Timelock 48 giờ, công bố trước khi thực thi | `[[ĐIỀN mốc thời gian]]` |

### 9.3 Quản lý khóa và vận hành

- Ví deploy tách biệt ví vận hành; khóa deploy bị vô hiệu sau khi chuyển quyền cho multisig.
- Người ký multisig: `[[N]]` người, danh tính công khai, ở `[[N]]` địa điểm địa lý khác nhau, dùng ví phần cứng.
- Quy trình ký duyệt bằng văn bản: ai đề xuất, ai duyệt, thời gian chờ tối thiểu.

### 9.4 Bug bounty

`[[ĐIỀN: nền tảng (Immunefi hoặc tự vận hành), mức thưởng theo mức độ, phạm vi, link]]`

### 9.5 Kế hoạch ứng phó sự cố

`[[ĐIỀN: ai có quyền pause (nếu có), kênh liên lạc khẩn cấp, thời gian cam kết thông báo cộng đồng và sàn, quy trình hậu sự cố]]`

*Ví dụ: "Khi phát hiện khai thác: (1) 2/5 người ký kích hoạt pause hợp đồng lõi trong ≤ 30 phút; (2) thông báo trên X/Telegram và gửi email cho các sàn trong ≤ 1 giờ; (3) báo cáo sự cố công khai trong ≤ 72 giờ; (4) mọi thay đổi khắc phục phải qua audit lại trước khi bỏ pause."*

---

## 10. Lộ trình 24 tháng

> Roadmap theo quý, mỗi quý có cột mốc **đo được** (không phải "mở rộng cộng đồng"). Reviewer đối chiếu roadmap
> đã công bố với tiến độ thực tế; roadmap trễ mà không giải thích là điểm trừ lớn. Bám theo timeline mẫu trong
> docs/01 mục 2 nhưng điều chỉnh theo thực tế. Không đưa "niêm yết Binance" thành cột mốc trong roadmap công khai
> — Binance không thích điều đó; thay bằng "niêm yết trên sàn tập trung".

| Quý | Sản phẩm | Token và thanh khoản | Cộng đồng và đối tác | Pháp lý và bảo mật | Cột mốc đo được |
|---|---|---|---|---|---|
| Q4/2026 | Chốt use case, thiết kế kỹ thuật, prototype | Tokenomics v1 | Mở kênh X/Telegram/Discord/Binance Square | Chọn luật sư, bắt đầu lập pháp nhân | `[[ĐIỀN: ví dụ "Whitepaper v1 công bố; prototype nội bộ chạy end-to-end"]]` |
| Q1/2027 | Testnet công khai | Hợp đồng token + vesting viết xong | Chương trình testnet có thưởng | Pháp nhân xong; audit bắt đầu | `[[ĐIỀN: ví dụ "≥ 1.000 ví thật trên testnet"]]` |
| Q2/2027 | Beta mainnet giới hạn | Audit hoàn tất, sửa lỗi; ký MM; khóa LP | Đối tác tích hợp đầu tiên; PR | Legal opinion; điều khoản token | `[[ĐIỀN: ví dụ "Audit công khai, 0 Critical/High mở; ≥ N người dùng beta"]]` |
| Q3/2027 | Mainnet v1 | TGE; pool DEX; 1–2 sàn tập trung tier 2 | Airdrop cho người dùng thật | Geo-block; AML/KYC nếu bán token | `[[ĐIỀN: ví dụ "TGE hoàn tất; LP khóa 12 tháng; ≥ N holder"]]` |
| Q4/2027 | `[[ĐIỀN: tính năng v1.1]]` | Nộp hồ sơ sàn tập trung lớn; dashboard công khai | `[[ĐIỀN]]` | Báo cáo treasury quý đầu | `[[ĐIỀN: ví dụ "≥ N ví hoạt động/tháng; unlock đúng lịch"]]` |
| Q1/2028 | `[[ĐIỀN: v2]]` | Governance giai đoạn 2 (Snapshot) | `[[ĐIỀN]]` | Audit lại nếu có nâng cấp | `[[ĐIỀN]]` |
| Q2/2028 | `[[ĐIỀN]]` | `[[ĐIỀN]]` | `[[ĐIỀN]]` | `[[ĐIỀN]]` | `[[ĐIỀN]]` |
| Q3/2028 | `[[ĐIỀN]]` | Governance on-chain giai đoạn 3 | `[[ĐIỀN]]` | Chuyển giao quyền admin theo kế hoạch mục 9.2 | `[[ĐIỀN]]` |

---

## 11. Đội ngũ và cố vấn

> Binance yêu cầu đội ngũ chủ chốt công khai danh tính và xác minh được (LinkedIn, lịch sử làm việc, dự án trước).
> Chỉ liệt kê người thật đang làm việc cho dự án và đã đồng ý được nêu tên. Không liệt kê cố vấn chưa ký thỏa
> thuận. Nêu rõ ai làm toàn thời gian. Nếu có thành viên từng tham gia dự án thất bại, giải trình ngắn gọn còn hơn
> để reviewer tự tìm ra.

### 11.1 Đội ngũ chủ chốt

| Họ tên | Vai trò | Toàn thời gian? | Kinh nghiệm liên quan (xác minh được) | LinkedIn / hồ sơ công khai |
|---|---|---|---|---|
| `[[ĐIỀN]]` | Founder / CEO | `[[Có/Không]]` | `[[ĐIỀN: 2–3 dòng, có tên công ty/dự án và thời gian]]` | `[[ĐIỀN]]` |
| `[[ĐIỀN]]` | CTO | | | |
| `[[ĐIỀN]]` | `[[ĐIỀN]]` | | | |

### 11.2 Cố vấn

| Họ tên | Lĩnh vực | Cam kết (giờ/tháng) | Thù lao (token có vesting?) |
|---|---|---|---|
| `[[ĐIỀN hoặc "Chưa có cố vấn chính thức"]]` | | | |

### 11.3 Kế hoạch tuyển dụng 12 tháng

`[[ĐIỀN: vị trí, thời điểm, nguồn ngân sách — tham chiếu docs/01 mục 3]]`

---

## 12. Đối tác và hệ sinh thái

> Chỉ ghi đối tác đã có thỏa thuận bằng văn bản hoặc tích hợp đã chạy, kèm bằng chứng công khai (bài đăng của cả
> hai bên, hợp đồng on-chain). "Đang trao đổi" không phải đối tác. Không được nhắc Binance là đối tác dưới bất kỳ
> hình thức nào khi chưa có văn bản.

| Đối tác | Loại hợp tác | Trạng thái | Bằng chứng công khai |
|---|---|---|---|
| `[[ĐIỀN hoặc "Chưa có đối tác chính thức"]]` | `[[Tích hợp kỹ thuật / phân phối / thanh khoản]]` | `[[Đã ký / Đã chạy]]` | `[[link]]` |

---

## 13. Cạnh tranh và điểm khác biệt

> So sánh trung thực với 3–5 dự án hoặc giải pháp truyền thống. Reviewer biết thị trường; nếu bạn viết "không có
> đối thủ", họ sẽ coi là chưa nghiên cứu. Chọn tiêu chí so sánh mà người dùng thực sự quan tâm.

| Tiêu chí | NewCoin | `[[Đối thủ 1]]` | `[[Đối thủ 2]]` | `[[Giải pháp truyền thống]]` |
|---|---|---|---|---|
| `[[ĐIỀN: ví dụ "Phí cho người dùng cuối"]]` | | | | |
| `[[ĐIỀN: ví dụ "Thời gian đối soát"]]` | | | | |
| `[[ĐIỀN: ví dụ "Cần trung gian?"]]` | | | | |
| Chain | BNB Chain | | | — |

Điểm khác biệt cốt lõi (1–2 câu): `[[ĐIỀN]]`

---

## 14. Pháp lý và tuân thủ

> Tham chiếu `docs/08-legal-checklist-vietnam.md`. Nêu pháp nhân phát hành, khu vực pháp lý, tình trạng legal
> opinion, các quốc gia bị hạn chế, chính sách AML/KYC (nếu bán token). Không viết "token đã được cơ quan X chấp
> thuận" trừ khi có văn bản. Không tự kết luận về bản chất pháp lý của token; dẫn ý kiến luật sư.

| Mục | Nội dung |
|---|---|
| Pháp nhân phát hành | `[[ĐIỀN: tên, loại hình, quốc gia, số đăng ký]]` |
| Quan hệ với đội ngũ tại Việt Nam | `[[ĐIỀN: công ty vận hành/phát triển tại Việt Nam (nếu có) và hợp đồng dịch vụ giữa hai pháp nhân]]` |
| Legal opinion | `[[ĐIỀN: hãng luật, khu vực pháp lý được phân tích, ngày; hoặc "Đang thực hiện"]]` |
| Khu vực bị hạn chế | `[[ĐIỀN: danh sách theo tư vấn luật sư; tối thiểu gồm các quốc gia bị trừng phạt và các thị trường luật sư khuyến nghị loại trừ]]` |
| AML/KYC | `[[ĐIỀN: áp dụng cho public sale/airdrop hay không; nhà cung cấp]]` |
| Điều khoản | Link Terms of Token Sale, Terms of Service, Privacy Policy, Risk Disclosure |

---

## 15. Yếu tố rủi ro

> Viết thật và đầy đủ; đây là mục bảo vệ dự án về mặt pháp lý và là dấu hiệu đội ngũ trưởng thành. Luật sư cần
> rà soát mục này. Thêm rủi ro đặc thù của sản phẩm.

- **Rủi ro công nghệ:** lỗi hợp đồng thông minh, lỗi trong thành phần off-chain, sự cố của BNB Chain, tấn công vào oracle hoặc cầu nối.
- **Rủi ro thị trường:** giá NEWC có thể biến động mạnh hoặc mất toàn bộ giá trị; thanh khoản có thể không đủ để bán ở mức giá mong muốn.
- **Rủi ro pháp lý:** quy định về tài sản mã hóa tại Việt Nam và các nước khác đang thay đổi; token có thể bị coi là sản phẩm được quản lý tại một số nước; sàn giao dịch có thể hủy niêm yết.
- **Rủi ro vận hành:** đội ngũ có thể không đạt được roadmap; mất khóa; lỗi quy trình ký multisig.
- **Rủi ro sản phẩm:** người dùng không tiếp nhận; đối thủ mạnh hơn; thay đổi của nền tảng bên thứ ba.
- **Rủi ro tập trung:** ở giai đoạn đầu, đội ngũ vẫn kiểm soát một số thành phần (mục 4.4, 9.2).
- **Rủi ro thuế:** nghĩa vụ thuế của người nắm giữ phụ thuộc vào từng quốc gia và có thể thay đổi.
- `[[ĐIỀN: rủi ro đặc thù của sản phẩm]]`

---

## 16. Tuyên bố miễn trừ trách nhiệm

> Luật sư phải viết hoặc duyệt mục này. Nội dung dưới đây chỉ là khung; không dùng nguyên văn khi chưa được luật
> sư xác nhận.

Tài liệu này chỉ nhằm mục đích cung cấp thông tin và không cấu thành bản cáo bạch, lời mời chào, lời khuyên đầu tư,
tài chính, pháp lý hay thuế. NEWC là token tiện ích dùng trong `[[tên sản phẩm]]`; NEWC không phải chứng khoán,
không đại diện cho cổ phần, quyền sở hữu, khoản nợ hay quyền hưởng lợi nhuận của bất kỳ pháp nhân nào. Không có
bất kỳ cam kết nào về giá trị, tính thanh khoản hay khả năng giao dịch của NEWC trên bất kỳ nền tảng nào. Thông tin
về kế hoạch và roadmap là dự kiến, có thể thay đổi mà không cần báo trước. Người đọc tự chịu trách nhiệm tìm hiểu
và tuân thủ pháp luật tại nơi cư trú. Tài liệu này không dành cho cư dân của `[[danh sách khu vực bị hạn chế theo tư
vấn luật sư]]`. `[[Pháp nhân phát hành]]` không chịu trách nhiệm với bất kỳ tổn thất nào phát sinh từ việc sử dụng
tài liệu này.

---

## 17. Thuật ngữ

| Thuật ngữ | Giải thích |
|---|---|
| BEP-20 | Chuẩn token trên BNB Chain, tương thích ERC-20 |
| TGE | Token Generation Event — thời điểm token được phát hành và bắt đầu lưu hành |
| Cliff | Khoảng thời gian không mở khóa token nào kể từ TGE |
| Vesting | Lịch mở khóa dần token theo thời gian |
| Cung lưu hành | Số token đã mở khóa và có thể giao dịch tự do |
| FDV | Fully Diluted Valuation — định giá tính trên tổng cung |
| Multisig | Ví cần nhiều chữ ký để thực hiện giao dịch |
| Timelock | Cơ chế buộc giao dịch admin phải chờ một khoảng thời gian trước khi thực thi |
| LP | Liquidity Pool / Liquidity Provider — pool thanh khoản trên DEX |
| MM | Market Maker — đơn vị tạo lập thị trường |
| KYB / KYC | Xác minh doanh nghiệp / khách hàng |
| Legal opinion | Ý kiến pháp lý bằng văn bản của hãng luật về bản chất token |
| Oracle | Nguồn dữ liệu ngoài chuỗi đưa vào hợp đồng |
| `[[ĐIỀN: thuật ngữ riêng của sản phẩm]]` | |

---

## 18. Phụ lục

### 18.1 Địa chỉ hợp đồng và ví (điền sau khi deploy)

| Tên | Địa chỉ | Verify trên BscScan |
|---|---|---|
| NEWC Token | `[[ĐIỀN]]` | `[[link]]` |
| Vesting | `[[ĐIỀN]]` | `[[link]]` |
| `[[Hợp đồng lõi]]` | `[[ĐIỀN]]` | `[[link]]` |
| Timelock | `[[ĐIỀN]]` | `[[link]]` |

### 18.2 Tài liệu liên quan

- Tokenomics sheet: `[[link]]`
- Báo cáo audit: `[[link]]`
- Legal opinion (bản tóm tắt công khai nếu có): `[[link]]`
- Dashboard công khai: `[[link]]`
- Mã nguồn: `[[link repo]]`

### 18.3 Lịch sử phiên bản

| Phiên bản | Ngày | Thay đổi |
|---|---|---|
| v0.1 | `[[ĐIỀN]]` | Bản khung |
| v1.0 | `[[ĐIỀN]]` | Chốt use case, tokenomics, roadmap |
| v1.1 | `[[ĐIỀN]]` | Bổ sung địa chỉ hợp đồng, audit |

### 18.4 Tự kiểm trước khi công bố

- [ ] Không còn `[[ĐIỀN]]` nào trong tài liệu.
- [ ] Mọi con số có nguồn hoặc link kiểm chứng.
- [ ] Tổng phân bổ = 100%; khớp với hợp đồng vesting.
- [ ] Không có câu nào nói về giá, lợi nhuận, "tiềm năng x lần".
- [ ] Không có tên đối tác, nhà đầu tư, cố vấn chưa ký.
- [ ] Không có tên/logo Binance ngoài ngữ cảnh "chương trình dành riêng token cho các chương trình của sàn tập trung".
- [ ] Luật sư đã duyệt mục 5.4, 14, 15, 16.
- [ ] Có số phiên bản và ngày trên trang bìa.
