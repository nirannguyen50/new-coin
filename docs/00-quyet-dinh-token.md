# Quyết định token: LiXi (LIXI)

> Bản ghi quyết định (decision record). Chủ dự án đã chốt các mục dưới đây vào tháng 9/2026; mọi tài liệu khác
> trong repo (docs/03, 05, 09, `tokenomics/`, `growth/`, `contracts/`, `website/`) phải khớp với bản này.
> Khi đổi bất kỳ mục nào, sửa file này trước rồi cập nhật các nơi còn lại.

## 1. Đã chốt

| Mục | Quyết định |
|---|---|
| Tên | **LiXi** |
| Ticker | **LIXI** |
| Chain | BNB Chain (BEP-20) |
| Tổng cung | 1.000.000.000 LIXI, 18 decimals, cố định, không mint, không owner/pause/tax |
| Con đường lên sàn | DEX trước (PancakeSwap), sàn CEX nhỏ sau khi DEX có giao dịch thật — theo `docs/09`. **Không nhắm Binance.** |
| Sản phẩm v1 | Lì Xì Bot trên Telegram (xem mục 3) |
| Phân bổ token | Giữ nguyên bộ số trong `tokenomics/config.example.json` (32/18/15/13/8/5/5/4, lưu hành tại TGE 14,86%) |

### Tại sao tên này

- "Lì xì" là hành động ai ở Việt Nam cũng hiểu ngay: cho một khoản nhỏ để chúc mừng, cảm ơn, khích lệ. Không cần
  giải thích token dùng để làm gì — tên đã nói.
- Gắn với dịp có sẵn (Tết, sinh nhật, cột mốc của cộng đồng), nên có lý do tự nhiên để dùng token định kỳ.
- Ngắn, dễ gõ trong lệnh bot (`/lixi`), ticker 4 ký tự.
- Trước khi công bố phải kiểm tra lại ticker `LIXI` chưa trùng trên CoinGecko/CoinMarketCap và handle
  `@lixi...` còn trống trên X/Telegram.

## 2. Mục đích: token thưởng và tip cho cộng đồng trực tuyến Việt Nam

**Vấn đề.** Các cộng đồng (nhóm Telegram, Discord, group Facebook, kênh streamer) thưởng cho thành viên bằng
chuyển khoản ngân hàng/ví điện tử thủ công hoặc gift code. Cách này tốn thời gian của admin, không truy vết được
(ai nhận, bao nhiêu, vì việc gì), và mỗi cộng đồng một hệ riêng nên điểm thưởng không mang đi đâu được.

**Giải pháp.** Một đơn vị thưởng dùng chung (LIXI) cộng với một bot làm việc phát/nhận thưởng thay admin.
Admin nạp LIXI vào "pot" của cộng đồng; thành viên nhận LIXI khi hoạt động; ai cũng tip được cho ai;
lì xì kiểu bao đỏ chia ngẫu nhiên cho dịp Tết, sinh nhật, cột mốc. Lịch sử phát thưởng công khai và
kiểm chứng được; người nhận rút được về ví của mình.

## 3. Phạm vi sản phẩm v1 (Lì Xì Bot — Telegram)

| Tính năng | Mô tả |
|---|---|
| Pot cộng đồng | Admin nạp LIXI vào pot của nhóm; bot ghi sổ riêng cho từng nhóm |
| Thưởng hoạt động | Thành viên nhận LIXI theo quy tắc admin đặt (ví dụ: tin nhắn có ích, trả lời câu hỏi, điểm danh) — có giới hạn ngày |
| Tip | `/lixi @user 100` — chuyển 100 LIXI từ số dư người gửi sang người nhận |
| Bao lì xì | `/lixi 1000 chia 10` — chia ngẫu nhiên 1.000 LIXI cho 10 người nhận đầu tiên |
| Số dư và rút | `/sodu` xem số dư; `/rut <địa chỉ> <số>` rút LIXI về ví BEP-20 của mình |
| Chống lạm dụng | Giới hạn theo ngày/người/nhóm, chống spam lệnh, cooldown, cần admin xác nhận với khoản lớn |

v2 (Discord bot + dashboard web) và v3 (đổi LIXI lấy vé sự kiện, merchandise, voucher đối tác; cộng đồng giữ
LIXI trong pot được mở tính năng: mẫu bao lì xì riêng, bảng xếp hạng, hạn mức cao hơn) ghi trong `docs/05` mục 3 và 10.

**Thành thật về v1:** bot giữ LIXI của các pot trong một ví nóng, phần lớn số dư nằm ở ví Safe multisig của dự án,
sổ cái theo từng cộng đồng nằm off-chain. Đây là mô hình **custodial**. Người dùng rút được về ví riêng bất cứ lúc
nào; bản không custodial (kết nối ví riêng để tip) là việc của v2 trở đi.

## 4. Chỉ số đo được của tiện ích token

| Chỉ số | Nguồn |
|---|---|
| Số lì xì (tip + bao lì xì) gửi mỗi tuần | Sổ cái bot, công bố hàng tuần |
| Số ví nhận LIXI duy nhất | Sổ cái bot + on-chain (ví đã rút) |
| Tổng LIXI đang giữ trong các pot cộng đồng | Sổ cái bot, đối chiếu với số dư on-chain ví bot + Safe |
| Số lượt đổi quà (từ v3) | Sổ cái bot / hợp đồng đổi quà |

## 5. Lộ trình

| Quý | Cột mốc |
|---|---|
| Q4/2026 | Lên PancakeSwap; Lì Xì Bot beta với 3 cộng đồng pilot |
| Q1/2027 | Bot mở công khai; bảng xếp hạng; đối tác đổi quà đầu tiên; chiến dịch Tết 2027 |
| Q2/2027 | Discord bot; dashboard web; niêm yết 1 sàn CEX nhỏ |
| Q3/2027 | Chợ voucher; cộng đồng bỏ phiếu về quỹ thưởng |

## 6. Rủi ro đã chấp nhận

| Rủi ro | Quyết định | Giảm nhẹ |
|---|---|---|
| **Không có tư vấn pháp lý ở giai đoạn này** | Chấp nhận, làm tiếp | Giữ nguyên toàn bộ câu chữ miễn trừ trách nhiệm trong docs/05, website, bot; không bán token cho công chúng ở Việt Nam khi chưa có ý kiến luật sư; xem lại `docs/08` trước mainnet |
| v1 custodial (ví nóng do dự án giữ) | Chấp nhận cho beta | Phần lớn số dư ở Safe multisig; ví nóng chỉ giữ lượng nhỏ; hạn mức rút/ngày; công bố đối chiếu số dư |
| Phụ thuộc nền tảng Telegram | Chấp nhận | v2 thêm Discord; người dùng luôn rút được về ví riêng |
| Lạm dụng thưởng hoạt động (spam, tài khoản ảo) | Chấp nhận có giới hạn | Hạn mức ngày, cooldown, admin xác nhận, công bố số tài khoản bị loại |

**Cảnh báo về việc chưa có luật sư.** Tài liệu trong repo này do đội ngũ tự soạn, không phải tư vấn pháp lý và
chưa được luật sư nào rà soát. Phát hành, phân phối, thưởng hoặc bán tài sản mã hóa từ Việt Nam có thể phát sinh
nghĩa vụ về thuế, chống rửa tiền, bảo vệ người tiêu dùng và các quy định về tài sản mã hóa đang thay đổi; nếu
LIXI bị coi là sản phẩm được quản lý ở một nước nào đó, đội ngũ có thể phải chịu trách nhiệm cá nhân. Chủ dự án
đã biết điều này và quyết định tiếp tục mà chưa thuê luật sư; đây là lựa chọn có rủi ro, cần xem lại trước khi
deploy mainnet và trước bất kỳ đợt bán token nào.

## 7. Còn để ngỏ

| Mục | Ghi chú |
|---|---|
| Danh tính đội ngũ | Chưa quyết định công khai tên thật hay dùng KYC qua bên thứ ba (`docs/09` mục 5) |
| Số BNB đưa vào thanh khoản | Chưa chốt; khung tham khảo 20–50 nghìn USD trong `docs/09` mục 4 |
| Ngày ra mắt | Trong Q4/2026, chưa có ngày cụ thể; phụ thuộc audit nhỏ và kết quả bot beta |
| 3 cộng đồng pilot | Chưa chọn; tiêu chí trong `growth/01` |
| Ví Safe, người ký | Chưa tạo |
