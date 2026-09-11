# Kế hoạch tổng thể: Phát hành token và niêm yết trên Binance

> Cập nhật: 09/2026. Các tiêu chí của Binance thay đổi thường xuyên; trước mỗi cột mốc lớn,
> đối chiếu lại với trang Listing Application chính thức trên binance.com và các thông báo mới nhất.

## 0. Bức tranh tổng quan

Từ năm 2025, Binance công bố khung niêm yết ba tầng. Một dự án mới gần như luôn phải đi theo thứ tự này:

```
  Xây sản phẩm + cộng đồng
          │
          ▼
  TGE + thanh khoản DEX (PancakeSwap trên BNB Chain)
          │
          ▼
  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
  │  Binance Alpha   │ → │  Binance Futures │ → │   Binance Spot   │
  │  (khám phá sớm)  │   │  (đã có traction)│   │  (tầng cao nhất) │
  └──────────────────┘   └──────────────────┘   └──────────────────┘
          ▲
   Các chương trình phụ trợ có thể đi kèm: Binance Wallet TGE,
   Launchpool, HODLer Airdrops, Megadrop (Binance chủ động mời)
```

Mỗi tầng được đánh giá lại dựa trên: khối lượng giao dịch hữu cơ, biến động giá, số holder,
mức độ minh bạch của đội ngũ, và việc xử lý token có trách nhiệm (không xả, không unlock bất ngờ).

**Tổng thời gian thực tế:** 9–15 tháng từ lúc bắt đầu đến khi có cơ hội lên Alpha; Spot có thể thêm 3–12 tháng nữa, hoặc không bao giờ.

## 1. Lộ trình 7 giai đoạn

| # | Giai đoạn | Thời lượng | Song song với | Cột mốc kết thúc |
|---|---|---|---|---|
| 1 | Định hướng và quyết định nền tảng | 2–4 tuần | — | Whitepaper v0, chọn chain, chốt use case |
| 2 | Pháp lý và cấu trúc doanh nghiệp | 4–10 tuần | GĐ 3, 4 | Pháp nhân phát hành + ý kiến pháp lý về token |
| 3 | Sản phẩm và tokenomics | 8–16 tuần | GĐ 2, 4 | Sản phẩm dùng được (testnet/beta) + tokenomics chốt |
| 4 | Smart contract và kiểm toán | 6–10 tuần | GĐ 3 | Audit sạch (không lỗi Critical/High) |
| 5 | Cộng đồng, marketing, traction | Liên tục, tối thiểu 3 tháng trước TGE | Tất cả | KPI cộng đồng đạt ngưỡng |
| 6 | TGE, thanh khoản và market maker | 2–4 tuần | — | Token giao dịch ổn định trên DEX ≥ 4–8 tuần |
| 7 | Nộp hồ sơ Binance và thăng hạng | 4–12 tuần mỗi tầng | — | Alpha → Futures → Spot |

### Giai đoạn 1 — Định hướng và quyết định nền tảng (tuần 1–4)

Mục tiêu: trả lời bằng văn bản các câu hỏi mà Binance chắc chắn sẽ hỏi.

- **Token giải quyết vấn đề gì?** Token phải có vai trò thực trong sản phẩm (thanh toán phí, quản trị, staking bảo mật, quyền truy cập). Token chỉ để "đầu cơ" gần như bị loại ngay.
- **Chọn chain.** Khuyến nghị **BNB Chain (BEP-20)** vì: cùng hệ sinh thái Binance, Binance Alpha/Wallet ưu tiên, phí thấp, công cụ quen thuộc (Solidity/EVM). Phương án thay thế: Ethereum, Solana, Base. Có thể multi-chain sau.
- **Loại token.** Utility token (khuyến nghị). Tránh mọi thiết kế giống chứng khoán (hứa lợi nhuận, chia cổ tức, quyền sở hữu doanh nghiệp).
- **Đội ngũ công khai.** Binance yêu cầu KYB và đội ngũ có danh tính; founder ẩn danh là rào cản lớn. Chuẩn bị LinkedIn, hồ sơ năng lực, lịch sử dự án trước.
- **Đầu ra:** Whitepaper v0 (10–20 trang), one-pager, bảng so sánh đối thủ, quyết định chain.

### Giai đoạn 2 — Pháp lý và cấu trúc doanh nghiệp (tuần 2–12)

- **Pháp nhân phát hành token.** Thông lệ ngành: foundation hoặc công ty tại khu vực pháp lý thân thiện (Singapore, BVI, Cayman, Panama, UAE/ADGM, Thụy Sĩ). Cần luật sư crypto có kinh nghiệm chọn cấu trúc.
- **Việt Nam.** Từ 2025–2026, Việt Nam đã có khung pháp lý bước đầu cho tài sản mã hóa (Luật Công nghiệp công nghệ số và cơ chế thí điểm thị trường tài sản mã hóa). Khung này còn mới và đang thay đổi; **bắt buộc** có ý kiến luật sư Việt Nam về: phát hành từ Việt Nam hay từ pháp nhân nước ngoài, thuế, và nghĩa vụ với nhà đầu tư trong nước.
- **Ý kiến pháp lý (legal opinion)** xác nhận token không phải chứng khoán tại các thị trường chính. Binance thường yêu cầu.
- **KYB và nguồn vốn.** Chuẩn bị giấy tờ công ty, cổ đông, người thụ hưởng cuối cùng, nguồn tiền. Binance kiểm tra nội bộ.
- **Điều khoản.** Terms of token sale, privacy policy, disclaimer, geo-block cho các nước bị cấm.
- **Sở hữu trí tuệ.** Đăng ký nhãn hiệu tên/ticker, mua domain, khóa handle mạng xã hội.

### Giai đoạn 3 — Sản phẩm và tokenomics (tuần 4–20)

- **Sản phẩm phải chạy trước TGE.** Ít nhất testnet công khai hoặc beta có người dùng thật. Binance đo: số ví hoạt động, giao dịch, đối tác tích hợp.
- **Tokenomics** (chi tiết trong `03-tokenomics-template.md`): tổng cung, phân bổ, vesting, lịch unlock 36 tháng, cơ chế tạo cầu cho token, phần dành cho marketing trên Binance (Alpha gần đây thường đề nghị 2–5% tổng cung cho airdrop/khuyến khích người dùng Binance).
- **Tránh red flag:** đội ngũ nắm > 20–25% không vesting; > 30% cung lưu hành mở khóa trong 3 tháng đầu; ví "treasury" không multisig; không có kế hoạch dùng quỹ.
- **Đầu ra:** Whitepaper v1, tokenomics sheet, roadmap 24 tháng, sản phẩm beta.

### Giai đoạn 4 — Smart contract và kiểm toán (tuần 8–18)

- **Hợp đồng token:** dùng OpenZeppelin ERC20 chuẩn; tối giản tính năng. Không mint không giới hạn, không blacklist tùy tiện, không thuế giao dịch ẩn, không pause vĩnh viễn. Mọi quyền admin phải qua multisig (Safe) và có timelock.
- **Hợp đồng vesting/khóa token:** dùng giải pháp đã được audit (OpenZeppelin VestingWallet, Sablier, Team Finance) thay vì tự viết.
- **Kiểm toán:** ít nhất 1 hãng uy tín (CertiK, Hacken, Trail of Bits, OpenZeppelin, Quantstamp, PeckShield, SlowMist). Báo cáo phải công khai, mọi lỗi Critical/High đã sửa và được xác nhận lại.
- **Bug bounty** (Immunefi hoặc tự vận hành) sau audit.
- **Xác minh mã nguồn** trên BscScan, gửi thông tin token (logo, website) cho BscScan/CoinGecko/CoinMarketCap.
- **Vận hành:** multisig 3/5 cho treasury, tách ví deploy/ví vận hành, quy trình ký duyệt bằng văn bản.

### Giai đoạn 5 — Cộng đồng, marketing và traction (liên tục, tối thiểu 12 tuần trước TGE)

Binance đo "cộng đồng thật" chứ không đo số follower mua. Ưu tiên:

- **Kênh:** X (Twitter), Telegram, Discord, Binance Square (đăng đều đặn, Binance Square là kênh Binance nhìn thấy trực tiếp).
- **Nội dung:** cập nhật sản phẩm hàng tuần, AMA, tài liệu kỹ thuật, minh bạch quỹ.
- **Tăng trưởng thật:** chương trình testnet có thưởng, quest (Galxe, Zealy), đối tác dự án cùng hệ BNB Chain, KOL có chọn lọc và công khai hợp đồng tài trợ.
- **Truyền thông:** 3–5 bài trên báo crypto (CoinDesk, The Block, Cointelegraph, hoặc báo khu vực uy tín), podcast.
- **KPI tối thiểu trước khi nộp Alpha (tham khảo, không phải ngưỡng chính thức):** 20–50 nghìn follower thật trên X, 10–20 nghìn thành viên Telegram/Discord hoạt động, 5–10 nghìn ví on-chain tương tác với sản phẩm, 3–5 đối tác tích hợp.
- **Tuyệt đối tránh:** bot follower, wash trading, mua "trending", hứa hẹn giá, dùng logo Binance khi chưa được cho phép.

### Giai đoạn 6 — TGE, thanh khoản và market maker (2–4 tuần)

- **Gọi vốn (nếu cần):** seed/private round với nhà đầu tư có tên tuổi giúp hồ sơ Binance đáng tin hơn. Công khai danh sách và điều khoản vesting.
- **Phân phối công bằng:** public sale nhỏ, airdrop cho người dùng thật, hoặc TGE qua Binance Wallet/launchpad BNB Chain nếu được mời.
- **Thanh khoản DEX:** tạo pool trên PancakeSwap (cặp với BNB hoặc USDT), khóa LP tối thiểu 12 tháng qua dịch vụ khóa uy tín. Thanh khoản ban đầu tối thiểu 100–300 nghìn USD để không bị trượt giá quá mức.
- **Market maker (MM):** ký hợp đồng với MM có uy tín (Wintermute, GSR, Keyrock, Flowdesk, Amber, Kairon…). Chọn mô hình *retainer* hoặc *loan + call option* nhưng đọc kỹ điều khoản, tránh MM có quyền bán token không giới hạn. Binance yêu cầu có cam kết thanh khoản trước khi nộp đơn.
- **Niêm yết trên sàn tier 2** (Gate, MEXC, KuCoin, Bitget, Bybit) để tạo lịch sử giao dịch và giá tham chiếu. Điều này thường xảy ra trước hoặc song song với Alpha.
- **Theo dõi:** giá không biến động quá 50% trong ngày do nội bộ; không có ví lớn xả; dashboard công khai (Dune) về holder và khối lượng.

### Giai đoạn 7 — Nộp hồ sơ Binance và thăng hạng

**7a. Binance Alpha (tầng 1)**
- Nộp đơn qua Binance Listing Application Portal (form chính thức; không có email "listing@" nào nhận đơn ngoài kênh này). Ngoài ra, Alpha còn chọn token theo tín hiệu on-chain và cộng đồng, nên chỉ số thật quan trọng hơn thư giới thiệu.
- Hồ sơ theo `02-checklist-ho-so-binance.md`.
- Sau khi nộp: Binance kiểm tra KYB, kỹ thuật, tuân thủ; nếu vào danh sách ngắn sẽ liên hệ trực tiếp và phỏng vấn. Thời gian thường 4–12 tuần. Không có phản hồi không đồng nghĩa bị từ chối, nhưng không nên nộp lại liên tục.
- Chuẩn bị ngân sách token cho airdrop tới người dùng Binance (Alpha thường đề nghị 2–5% tổng cung).

**7b. Binance Futures (tầng 2)**
- Điều kiện thực tế: đã lên Alpha, giá ổn định, khối lượng giao dịch bền vững, không có sự cố bảo mật hoặc unlock bất ngờ.
- Không cần nộp đơn riêng trong nhiều trường hợp; Binance chủ động chọn theo hiệu suất trên Alpha.

**7c. Binance Spot (tầng 3)**
- Điều kiện: khối lượng giao dịch bền vững trên Binance và sàn khác, holder tăng, đội ngũ giao tiếp đều đặn với Binance, minh bạch lịch unlock, tuân thủ pháp lý liên tục.
- Có thể đi kèm Launchpool, HODLer Airdrops hoặc Megadrop nếu Binance mời; những chương trình này yêu cầu dành thêm phần token (thường 1–5% tổng cung).

**7d. Sau niêm yết — tránh bị delist**
- Lý do delist Binance công bố: khối lượng thấp, thao túng giá, đội ngũ không phản hồi, lỗ hổng bảo mật, vi phạm tuân thủ. Alpha cũng định kỳ loại token không đạt tiêu chí.
- Duy trì: báo cáo hàng tháng cho Binance, cập nhật sản phẩm, MM hoạt động liên tục, không thay đổi tokenomics bất ngờ.

## 2. Timeline mẫu (dự án bắt đầu từ tháng 10/2026)

| Tháng | Việc chính |
|---|---|
| T10–T11/2026 | GĐ1 xong; bắt đầu GĐ2 (luật sư, pháp nhân) và GĐ3 (build sản phẩm) |
| T12/2026–T2/2027 | Tokenomics chốt; testnet công khai; mở kênh cộng đồng; viết contract |
| T3–T4/2027 | Audit; sửa lỗi; beta có người dùng; gọi vốn seed (nếu có) |
| T5/2027 | Mainnet sản phẩm; chuẩn bị TGE; ký MM; khóa LP |
| T6/2027 | TGE + DEX + 1–2 sàn tier 2 |
| T7–T8/2027 | Nộp đơn Binance Alpha; tiếp tục tăng traction |
| T9–T12/2027 | Alpha (nếu được chọn) → Futures |
| 2028 | Mục tiêu Spot |

## 3. Nhân sự tối thiểu

| Vai trò | Số lượng | Ghi chú |
|---|---|---|
| Founder/CEO (công khai) | 1 | Đầu mối với Binance, nhà đầu tư, pháp lý |
| CTO + dev blockchain | 1 + 2 | Solidity, backend, bảo mật |
| Dev sản phẩm (frontend/backend) | 2 | Sản phẩm phải dùng được |
| Head of Growth/Community | 1 | X, Telegram, Discord, Binance Square |
| Content/PR | 1 | Có thể thuê ngoài |
| BD (đối tác, sàn, MM) | 1 | Quan hệ với hệ sinh thái BNB Chain |
| Luật sư crypto | Thuê ngoài | Bắt buộc |
| Kế toán/tài chính | Thuê ngoài | Quản lý quỹ, thuế |

## 4. KPI theo dõi hàng tháng

- Người dùng hoạt động (ví duy nhất/tháng) và giao dịch on-chain của sản phẩm.
- Số holder token, phân bố top 10/top 100 ví (Binance xem tập trung sở hữu là rủi ro).
- Khối lượng giao dịch 30 ngày trên DEX/CEX, độ sâu sổ lệnh ±2%.
- Tăng trưởng cộng đồng thật (tỷ lệ tương tác, không chỉ số lượng).
- Tình trạng bảo mật: lỗi mở, bug bounty, sự cố.
- Lịch unlock 90 ngày tới và truyền thông trước cho cộng đồng.

## 5. Quyết định lớn cần chốt sớm

1. Use case và sản phẩm cốt lõi (không có thứ này thì mọi việc khác vô nghĩa).
2. Chain phát hành (khuyến nghị BNB Chain).
3. Cấu trúc pháp nhân và nơi đặt.
4. Có gọi vốn VC hay bootstrap.
5. Ngân sách tổng và nguồn (xem `04-ngan-sach-va-rui-ro.md`).

## Nguồn tham khảo

- Khung niêm yết/hủy niêm yết Binance công bố (Alpha, Futures, Spot, Launchpool, Megadrop, HODLer Airdrops): tìm "Binance listing framework" trên binance.com/support và Binance Square.
- Tổng hợp tiêu chí và số liệu 2026: listing.help (Binance Listing Requirements, Binance Alpha Listing Cost), motiontrade.com (How to Get Listed on Binance in 2026), techbullion.com (Binance Listing Requirements Checklist 2026).
- Lưu ý: các nguồn ngoài Binance chỉ để tham khảo; con số ngưỡng không phải tiêu chí chính thức.
