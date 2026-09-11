# Ngân sách ước tính và sổ đăng ký rủi ro

## 1. Ngân sách (USD, ước tính 2026 cho một dự án nghiêm túc)

Binance không thu phí niêm yết. Chi phí dưới đây là chi phí xây dự án đủ chuẩn để được xét.
Con số tham khảo từ các nguồn ngành, cần điều chỉnh theo quy mô thực tế.

| Hạng mục | Tối thiểu | Khuyến nghị | Ghi chú |
|---|---|---|---|
| Pháp lý: pháp nhân, legal opinion, điều khoản, KYB | 15,000 | 40,000 | Bắt buộc, không cắt giảm |
| Audit smart contract (1–2 hãng) + bug bounty | 15,000 | 60,000 | Tùy độ phức tạp hợp đồng |
| Phát triển sản phẩm (6–9 tháng, đội 4–6 người) | 120,000 | 350,000 | Chi phí lớn nhất; có thể thấp hơn nếu đội ngũ góp vốn bằng công sức |
| Thanh khoản DEX ban đầu | 100,000 | 300,000 | Tiền khóa trong LP, không mất nhưng bị chôn vốn |
| Market maker (retainer 6–12 tháng hoặc token loan) | 50,000 | 150,000 | Ngoài ra thường phải cho MM vay 0.5–2% tổng cung |
| Marketing, cộng đồng, PR, KOL (6–9 tháng) | 60,000 | 200,000 | Ưu tiên tăng trưởng thật, không mua bot |
| Niêm yết sàn tier 2 (phí + thanh khoản) | 30,000 | 150,000 | Tùy sàn; nhiều sàn thu phí bằng token |
| Vận hành: hạ tầng, công cụ, kế toán, đi lại sự kiện | 20,000 | 60,000 | |
| Dự phòng (15–20%) | 60,000 | 200,000 | |
| **Tổng** | **≈ 470,000** | **≈ 1,500,000** | Chưa gồm phần token cho chương trình Binance (2–5% cung) |

Nguồn vốn thường gặp: vốn tự có, vòng seed/private (10–20% cung), grant từ hệ sinh thái BNB Chain (BNB Chain có các chương trình grant và incubation cho dự án build trên chain), doanh thu sản phẩm.

## 2. Sổ đăng ký rủi ro

| # | Rủi ro | Xác suất | Tác động | Biện pháp | Chủ trì |
|---|---|---|---|---|---|
| 1 | Binance không phản hồi/từ chối đơn Alpha | Cao | Cao | Coi Alpha là mục tiêu phụ; kế hoạch tăng trưởng không phụ thuộc Binance; nộp lại sau 3–6 tháng khi có số liệu mới | CEO |
| 2 | Lên Alpha nhưng không lên được Spot (≈ 90% dự án) | Cao | Trung bình | Duy trì volume thật, giao tiếp đều với Binance, không unlock lớn; chấp nhận Alpha/Futures là kết quả tốt | CEO, BD |
| 3 | Lỗ hổng smart contract sau TGE | Trung bình | Rất cao | 2 audit độc lập, bug bounty, multisig + timelock, kế hoạch ứng phó sự cố, quyền pause có kiểm soát | CTO |
| 4 | Thay đổi pháp lý (Việt Nam hoặc quốc tế) | Trung bình | Cao | Luật sư theo dõi định kỳ, pháp nhân ở khu vực ổn định, geo-block, dự phòng ngân sách pháp lý | CEO, luật sư |
| 5 | Giá giảm mạnh sau TGE, cộng đồng rời bỏ | Cao | Cao | Cung lưu hành TGE thấp, MM đủ sâu, không hype quá mức, roadmap sản phẩm rõ; runway ≥ 18 tháng bằng stablecoin | CEO, Growth |
| 6 | MM lạm dụng hoặc xả token | Trung bình | Cao | Hợp đồng có giới hạn bán, báo cáo hàng tuần, chọn MM có danh tiếng, không giao quá 2% cung | BD, CFO |
| 7 | Lừa đảo giả danh Binance/đại lý listing | Cao | Trung bình | Chỉ dùng portal chính thức; xác minh domain; không trả trước cho ai | Toàn đội |
| 8 | Traction không đạt KPI trước TGE | Trung bình | Cao | Lùi TGE thay vì phát hành sớm; token ra trước sản phẩm là red flag lớn nhất | CEO, Product |
| 9 | Đội ngũ thiếu người hoặc rời đi | Trung bình | Cao | Vesting đội ngũ, hợp đồng rõ ràng, tài liệu hóa hệ thống | CEO |
| 10 | Bị delist sau khi niêm yết | Thấp–Trung bình | Rất cao | KPI hàng tháng, liên hệ Binance định kỳ, không đổi tokenomics bất ngờ, bảo mật liên tục | CEO, CTO |

## 3. Kế hoạch dự phòng nếu không lên Binance

Dự án phải sống được mà không cần Binance:

1. **Tập trung sàn tier 2 và DEX**: Bybit, Bitget, KuCoin, Gate, MEXC, OKX; PancakeSwap/Uniswap với thanh khoản tốt.
2. **Tăng use case thật**: doanh thu, người dùng, đối tác. Đây cũng là thứ khiến Binance quay lại mời.
3. **Nộp lại**: mỗi 3–6 tháng với số liệu mới, thay đổi rõ so với lần trước.
4. **Cân nhắc sàn lớn khác song song**: OKX, Coinbase (yêu cầu pháp lý Mỹ khắt khe hơn), Upbit/Bithumb (Hàn Quốc, thị trường lớn).

## 4. Cột mốc "go/no-go"

Trước mỗi mốc, họp và quyết định đi tiếp hay dừng/hoãn:

| Mốc | Điều kiện đi tiếp |
|---|---|
| Kết thúc GĐ1 | Use case rõ, đội ngũ công khai, ngân sách tối thiểu có nguồn |
| Trước audit | Sản phẩm testnet có ≥ 1,000 người dùng thật |
| Trước TGE | Audit sạch, pháp lý xong, MM đã ký, KPI cộng đồng đạt, runway ≥ 18 tháng |
| Trước nộp Alpha | Giao dịch DEX ổn định ≥ 4–8 tuần, holder tăng, không sự cố |
