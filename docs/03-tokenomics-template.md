# Mẫu thiết kế tokenomics

Điền số liệu thật vào mẫu này. Các con số dưới đây là ví dụ tham khảo phổ biến trong ngành,
không phải khuyến nghị tài chính và không phải tiêu chí chính thức của Binance.

## 1. Thông tin cơ bản

| Trường | Giá trị |
|---|---|
| Tên token | `<Tên>` |
| Ticker | `<TICKER>` (3–5 ký tự, chưa trùng trên CoinGecko/CMC) |
| Chain | BNB Chain (BEP-20) |
| Tổng cung | `1,000,000,000` (cố định, không mint thêm) |
| Decimals | 18 |
| Cung lưu hành tại TGE | `10–20%` tổng cung |
| Cơ chế giảm phát (nếu có) | `<burn từ phí / mua lại>` |

## 2. Phân bổ và vesting (ví dụ tham khảo)

| Nhóm | % tổng cung | Cliff | Vesting | Mở khóa tại TGE | Ghi chú |
|---|---|---|---|---|---|
| Cộng đồng và hệ sinh thái (airdrop, quest, grant) | 25–35% | — | 36–48 tháng tuyến tính | 3–5% | Phần lớn nhất; chứng minh dự án hướng người dùng |
| Đội ngũ và cố vấn | 15–20% | 12 tháng | 24–36 tháng tuyến tính | 0% | Bắt buộc 0% tại TGE |
| Nhà đầu tư (seed/private) | 10–20% | 6–12 tháng | 12–24 tháng | 0–5% | Công khai giá vòng |
| Treasury/quỹ dự trữ | 10–15% | — | Theo đề xuất quản trị | 0–2% | Multisig, kế hoạch chi tiêu công khai |
| Thanh khoản (DEX/CEX/MM) | 5–10% | — | Theo nhu cầu | 5–8% | Khóa LP ≥ 12 tháng |
| Chương trình Binance (airdrop Alpha/Launchpool/HODLer) | 3–6% | — | Giải ngân theo chương trình | 0% | Giữ riêng, không dùng cho việc khác |
| Marketing/KOL | 3–5% | — | 12–24 tháng | 1% | Hợp đồng KOL phải có vesting |
| Public sale (nếu có) | 2–5% | — | 0–6 tháng | 50–100% | Giá không thấp hơn vòng private quá xa |

Tổng phải bằng 100%.

## 3. Lịch unlock 36 tháng

Tạo file `tokenomics.xlsx` hoặc Google Sheet với các cột: tháng, số token unlock theo nhóm,
tổng lưu hành, % lưu hành, tỷ lệ unlock so với lưu hành tháng trước. Kiểm tra:

- Không tháng nào unlock > 5–8% cung lưu hành hiện tại (trừ TGE).
- Tháng đầu sau cliff đội ngũ/nhà đầu tư không trùng với các mốc chương trình Binance.
- Công bố lịch trên docs và cập nhật trên các trang theo dõi unlock (Tokenomist, CryptoRank).

## 4. Cơ chế tạo cầu (utility)

Liệt kê cụ thể, mỗi cơ chế có số liệu đo được:

| Cơ chế | Cách hoạt động | Chỉ số đo |
|---|---|---|
| Phí sử dụng sản phẩm bằng token | Người dùng trả `<X>` token/giao dịch, giảm giá `<Y>%` khi dùng token | Số token chi/tháng |
| Staking để mở tính năng | Khóa `<N>` token để có quyền `<...>` | Số token đang khóa |
| Quản trị | 1 token = 1 phiếu, đề xuất cần `<%>` quorum | Số ví bỏ phiếu |
| Mua lại/đốt | `<%>` doanh thu dùng mua lại token và đốt | Token đã đốt |

## 5. Quản trị ví và quyền admin

| Ví | Loại | Ngưỡng ký | Timelock | Địa chỉ |
|---|---|---|---|---|
| Treasury | Safe multisig | 3/5 | 48h | `0x...` |
| Vesting đội ngũ | Hợp đồng vesting | — | — | `0x...` |
| Thanh khoản/MM | Safe multisig | 2/3 | 24h | `0x...` |
| Chương trình Binance | Safe multisig | 3/5 | — | `0x...` |

Quyền còn lại trên hợp đồng token: `<none / pause / upgrade>` — nếu có, giải thích và cam kết từ bỏ theo mốc thời gian.

## 6. Kiểm tra red flag (tự chấm)

| Red flag | Có/Không | Giải trình |
|---|---|---|
| Đội ngũ + nhà đầu tư > 40% tổng cung | | |
| Đội ngũ có unlock tại TGE | | |
| > 30% cung lưu hành mở khóa trong 3 tháng đầu | | |
| Hợp đồng còn quyền mint không giới hạn | | |
| Ví lớn không nhãn, không multisig | | |
| Không có use case đo được cho token | | |
| LP không khóa hoặc khóa < 6 tháng | | |
| Phần dành cho MM có quyền bán không giới hạn | | |
