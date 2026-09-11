# Kế hoạch rút gọn: Token giao dịch được trên DEX và sàn nhỏ

> Mục tiêu mới: **người dùng có thể mua bán token một cách an toàn**, không nhắm Binance.
> Kế hoạch này thay thế lộ trình 7 giai đoạn trong `docs/01` về mặt ưu tiên; các tài liệu khác vẫn dùng được nhưng
> có thể bỏ qua phần liên quan tới Binance Alpha/Futures/Spot.

## 0. Ba con đường và nên chọn gì

| Con đường | Ai duyệt | Chi phí | Thời gian | Người mua cần gì |
|---|---|---|---|---|
| **DEX (PancakeSwap trên BNB Chain)** | Không ai, hoàn toàn tự do | Chỉ tiền thanh khoản + vài USD gas | 1 ngày sau khi có token | Ví Web3 (MetaMask, Trust, Binance Wallet) và BNB |
| **Sàn CEX nhỏ** (CoinEx, LBank, XT, BingX, MEXC, Gate…) | Sàn duyệt, thường dễ | Phí niêm yết 10–80 nghìn USD + token ký quỹ + phí MM | 2–8 tuần sau khi nộp | Tài khoản sàn, không cần ví |
| **Launchpad DEX** (PinkSale, Four.meme, DxSale) | Tự động | Phí nền tảng 1–5% số tiền gọi | Vài ngày | Ví Web3 |

**Khuyến nghị:** Lên PancakeSwap trước (bước bắt buộc, rẻ, không thể bị từ chối). Chỉ trả tiền cho CEX nhỏ khi DEX đã có
giao dịch thật và cộng đồng, vì CEX nhỏ không tự tạo ra người mua; họ chỉ bán "cửa vào" cho người đã muốn mua.

## 1. Lộ trình 6 tuần lên DEX

| Tuần | Việc | Kết quả |
|---|---|---|
| 1 | Chốt tên, ticker, tổng cung, phân bổ; lập pháp nhân tối thiểu hoặc xác nhận với luật sư; đăng ký domain, X, Telegram | Whitepaper ngắn 3–5 trang, kênh cộng đồng mở |
| 2 | Deploy token lên BSC testnet bằng `contracts/`; thử toàn bộ quy trình (deploy → verify → add liquidity → lock LP) trên testnet | Quy trình chạy trọn vẹn không lỗi trên testnet |
| 3 | Audit nhanh (xem mục 4), tạo ví multisig Safe cho treasury, chuẩn bị BNB thanh khoản | Audit report, Safe 2/3 hoặc 3/5 |
| 4 | Deploy mainnet, verify trên BscScan, chuyển token theo phân bổ vào ví vesting/Safe | Contract có mã nguồn công khai |
| 5 | Tạo pool PancakeSwap, **khóa 100% LP ≥ 12 tháng**, nộp thông tin lên BscScan, DexScreener, CoinGecko, CoinMarketCap | Token mua bán được, có biểu đồ giá |
| 6 | Truyền thông ra mắt, hướng dẫn mua từng bước, chương trình airdrop nhỏ cho người dùng thật | Có holder thật ngoài đội ngũ |

## 2. Chi tiết từng bước kỹ thuật (tất cả đã có sẵn trong `contracts/`)

1. **Deploy token:** `npm run deploy:mainnet` với `TREASURY_ADDRESS` là ví Safe multisig, không phải ví cá nhân.
2. **Verify mã nguồn:** `npm run verify` để BscScan hiển thị mã nguồn; người mua và các công cụ quét (GoPlus, Token Sniffer, DexScreener) sẽ đánh dấu token là an toàn hơn vì không có mint, không thuế, không blacklist.
3. **Phân bổ token:** `deploy-vesting.js` tạo ví vesting cho đội ngũ, nhà đầu tư, cộng đồng; phần liquidity chuyển sang ví sẽ tạo pool.
4. **Tạo thanh khoản:** `npm run liquidity:mainnet` (script `add-liquidity.js`) ghép NEWC với BNB trên PancakeSwap V2. Giá ban đầu = BNB bỏ vào ÷ NEWC bỏ vào.
5. **Khóa LP:** dùng Team Finance, UNCX hoặc PinkLock; khóa toàn bộ LP token (địa chỉ pair) tối thiểu 12 tháng; đăng link khóa công khai.
6. **Nộp thông tin công khai:**
   - BscScan: cập nhật logo, website, mạng xã hội cho contract.
   - DexScreener: tự động có biểu đồ sau vài phút; có thể mua "Enhanced Token Info" để hiện logo/link.
   - CoinGecko và CoinMarketCap: nộp form miễn phí; cần website, whitepaper, mã nguồn verify, pool có khối lượng, mạng xã hội hoạt động. Duyệt 1–4 tuần.
   - GoPlus/Token Sniffer: kiểm tra token đạt điểm an toàn cao, chụp màn hình để chia sẻ.

## 3. Bao nhiêu thanh khoản là đủ

| Thanh khoản ban đầu (BNB + NEWC) | Ý nghĩa |
|---|---|
| 5–10 nghìn USD | Chỉ đủ cho bạn bè, cộng đồng nhỏ; lệnh 500 USD đã trượt giá vài phần trăm |
| 20–50 nghìn USD | Mức tối thiểu hợp lý cho dự án nghiêm túc muốn có người lạ giao dịch |
| 100 nghìn USD trở lên | Đủ để CEX nhỏ và công cụ theo dõi coi là đáng chú ý |

Quy tắc: phần token đưa vào pool nên bằng đúng phần "Thanh khoản" trong tokenomics (8% tổng cung theo cấu hình mẫu).
Giá khởi điểm nên khiêm tốn; giá cao với thanh khoản mỏng là công thức sụp đổ ngay ngày đầu.

## 4. Bảo mật tối thiểu (không cắt được)

- **Audit:** với contract chuẩn OpenZeppelin, không cần audit đắt tiền. Phương án đủ dùng: một hãng nhỏ uy tín (SolidProof, Cyberscope, Coinsult, Hashex) khoảng 1–5 nghìn USD, cộng chạy Slither/Mythril miễn phí. Chi phí này chủ yếu để có "tem" hiển thị trên các trang theo dõi.
- **Không giữ token bằng ví cá nhân:** treasury và ví liquidity phải là Safe multisig.
- **Khóa LP và vesting đội ngũ** là hai thứ đầu tiên người mua kiểm tra. Không có hai thứ này thì token bị coi là rug pull tiềm năng.
- **KYC đội ngũ** qua dịch vụ như Assure DeFi/SolidProof KYC nếu founder không muốn công khai danh tính đầy đủ nhưng vẫn cần lòng tin.

## 5. Lên sàn CEX nhỏ (bước tùy chọn, chỉ làm sau khi DEX có giao dịch)

| Sàn | Chi phí tham khảo 2026 | Ghi chú |
|---|---|---|
| CoinEx | ~10 nghìn USDT + 10 nghìn USD token; MM 6 tháng ~3 nghìn USDT | Rẻ nhất trong nhóm sàn có tên tuổi |
| LBank, XT.com, BingX | Thường 20–50 nghìn USD + token | Dễ vào, nhưng khối lượng phần lớn là bot; cân nhắc kỹ |
| MEXC | ~40–80 nghìn USD | Nhiều người dùng thật hơn, đôi khi miễn phí nếu dự án đã có volume DEX tốt |
| Gate | Thương lượng, thường cao hơn MEXC | Yêu cầu hồ sơ đầy đủ hơn |

Quy trình chung: nộp form trên website sàn → sàn báo giá → ký hợp đồng → nạp token ký quỹ và phí → sàn mở nạp/rút rồi mở giao dịch.
Sàn thường yêu cầu: contract verify, audit, thanh khoản DEX, cộng đồng, cam kết MM. Không bao giờ chuyển tiền cho "đại diện sàn" liên hệ qua Telegram; luôn xác minh qua kênh chính thức trên website sàn.

**Lưu ý về BitMart:** sàn này đã thông báo dừng giao dịch từ 8/2026 và đóng cửa đầu 2027; không nộp đơn.

## 6. Ngân sách rút gọn (USD)

| Hạng mục | Chỉ DEX | DEX + 1 CEX nhỏ |
|---|---|---|
| Thanh khoản (chôn vốn, có thể rút sau khi hết khóa) | 20,000–50,000 | 50,000–100,000 |
| Audit nhỏ + KYC đội ngũ | 2,000–6,000 | 2,000–6,000 |
| Khóa LP, DexScreener enhanced, công cụ | 500–1,500 | 500–1,500 |
| Pháp lý cơ bản (tư vấn, điều khoản, disclaimer) | 2,000–10,000 | 5,000–15,000 |
| Website, nội dung, cộng đồng 3 tháng | 3,000–15,000 | 10,000–30,000 |
| Phí niêm yết CEX + token ký quỹ + MM | — | 15,000–60,000 |
| **Tổng** | **≈ 28,000–83,000** | **≈ 83,000–210,000** |

## 7. Việc gì có thể bỏ so với kế hoạch Binance

- Không cần market maker chuyên nghiệp (PancakeSwap là AMM, tự tạo giá).
- Không cần hồ sơ Binance (`docs/06`), pitch cho sàn lớn, KPI cộng đồng hàng chục nghìn người.
- Không cần pháp nhân offshore phức tạp ngay lập tức, nhưng vẫn cần tư vấn luật sư về việc phát hành từ Việt Nam.
- Audit đắt tiền (CertiK) không cần thiết cho contract chuẩn.

## 8. Việc gì vẫn bắt buộc

- Sản phẩm hoặc lý do tồn tại của token; không có thì giá chỉ đi xuống sau ngày đầu.
- Khóa LP, vesting đội ngũ, multisig, mã nguồn verify.
- Minh bạch với người mua: công bố phân bổ, địa chỉ ví, lịch unlock; không hứa hẹn giá.
- Tuân thủ pháp luật: token vẫn là tài sản mã hóa; bán cho người Việt Nam và người nước ngoài đều có nghĩa vụ pháp lý.

## 9. Checklist ngày ra mắt

- [ ] Contract mainnet đã verify, không còn quyền admin
- [ ] Token đã chuyển đúng vào ví vesting/Safe, ví deploy còn 0 token
- [ ] Pool PancakeSwap đã tạo, giá khởi điểm đúng dự kiến
- [ ] LP đã khóa ≥ 12 tháng, link khóa công khai
- [ ] BscScan có logo/website; DexScreener hiện biểu đồ
- [ ] Bài hướng dẫn mua có hình từng bước (thêm BNB Chain vào ví, dán địa chỉ contract, đặt slippage 0.5–1%)
- [ ] Cảnh báo lừa đảo: chỉ có một địa chỉ contract chính thức, ghim ở mọi kênh
- [ ] Form CoinGecko và CoinMarketCap đã nộp
