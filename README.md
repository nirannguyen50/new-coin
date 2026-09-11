# New Coin — Phát hành token và đưa lên sàn để giao dịch

Repo này chứa kế hoạch, mã nguồn và công cụ để đưa một token từ ý tưởng đến chỗ **người dùng mua bán được**.

**Mục tiêu hiện tại:** giao dịch được trên DEX (PancakeSwap, BNB Chain) và sàn tập trung nhỏ.
Bắt đầu từ [docs/09-ke-hoach-rut-gon-dex-va-san-nho.md](docs/09-ke-hoach-rut-gon-dex-va-san-nho.md).
Lộ trình Binance (docs/01, 02, 06) được giữ lại làm tham khảo nếu sau này muốn đi xa hơn.

## Cấu trúc tài liệu

| File | Nội dung |
|---|---|
| [docs/01-ke-hoach-tong-the.md](docs/01-ke-hoach-tong-the.md) | Kế hoạch tổng thể: 7 giai đoạn, timeline, nhân sự, KPI, cột mốc |
| [docs/02-checklist-ho-so-binance.md](docs/02-checklist-ho-so-binance.md) | Checklist hồ sơ và tiêu chí Binance đánh giá, chuẩn bị trước khi nộp đơn |
| [docs/03-tokenomics-template.md](docs/03-tokenomics-template.md) | Mẫu thiết kế tokenomics, lịch vesting, kiểm tra "red flag" |
| [docs/04-ngan-sach-va-rui-ro.md](docs/04-ngan-sach-va-rui-ro.md) | Ngân sách ước tính, sổ đăng ký rủi ro, kế hoạch dự phòng |
| [docs/05-whitepaper-draft.md](docs/05-whitepaper-draft.md) | Bản khung whitepaper 18 mục: hướng dẫn viết từng mục, chỗ trống cần điền, phân bổ token tham chiếu, roadmap 24 tháng |
| [docs/06-binance-listing-application-draft.md](docs/06-binance-listing-application-draft.md) | Bản nháp câu trả lời cho Binance Listing Application Portal (đề nghị Alpha), tài liệu đính kèm, những điều không được viết |
| [docs/07-one-pager-and-pitch.md](docs/07-one-pager-and-pitch.md) | Mẫu one-pager, dàn ý pitch deck 10 slide, bài pitch 60 giây |
| [docs/08-legal-checklist-vietnam.md](docs/08-legal-checklist-vietnam.md) | Checklist chuẩn bị pháp lý cho đội ngũ tại Việt Nam: câu hỏi cho luật sư, lựa chọn pháp nhân, hồ sơ KYB, thuế (không phải tư vấn pháp lý) |
| [docs/09-ke-hoach-rut-gon-dex-va-san-nho.md](docs/09-ke-hoach-rut-gon-dex-va-san-nho.md) | **Kế hoạch đang áp dụng.** Lộ trình 6 tuần lên PancakeSwap, khóa LP, lên CoinGecko/CMC, tùy chọn CEX nhỏ, ngân sách rút gọn, checklist ngày ra mắt |

## Cấu trúc mã nguồn và công cụ

| Thư mục | Nội dung | Kiểm tra |
|---|---|---|
| [contracts/](contracts/) | Hợp đồng BEP-20 `NewCoin` (cung cố định, không mint/owner/pause/tax), ví vesting theo từng nhóm, script deploy và verify BSC testnet/mainnet | `cd contracts && npm ci && npm test` (28 test) |
| [tokenomics/](tokenomics/) | Công cụ tính lịch unlock 36 tháng từ file cấu hình, xuất CSV/Markdown/biểu đồ, tự kiểm tra red flag | `cd tokenomics && pip install -r requirements.txt && python -m pytest` (31 test) |
| [website/](website/) | Landing page tĩnh, không phụ thuộc bên ngoài, hỗ trợ dark mode và mobile | Mở `website/index.html` |
| [growth/](growth/) | Kế hoạch cộng đồng 12 tuần, lịch nội dung, template KPI, mẫu liên hệ đối tác/MM/sàn | — |
| [.github/workflows/ci.yml](.github/workflows/ci.yml) | CI chạy toàn bộ test contract, tokenomics và kiểm tra website mỗi lần push | — |

**Nguồn sự thật duy nhất về phân bổ token** là `tokenomics/config.example.json`. File `contracts/config/allocations.example.json`, biểu đồ trên website và các bảng trong docs/05–07 đều dùng cùng bộ số này (32/18/15/13/8/5/5/4, cung lưu hành tại TGE 14,86%). Khi đổi tokenomics, sửa file cấu hình rồi chạy lại công cụ và cập nhật các nơi còn lại.

## Ba sự thật cần chấp nhận trước khi bắt đầu

1. **Lên DEX không cần ai duyệt.** Bất kỳ ai cũng tạo được pool PancakeSwap trong một ngày; khó là làm cho người lạ tin và mua.
2. **Sàn nhỏ bán "cửa vào", không bán người mua.** Trả phí niêm yết CEX chỉ có ý nghĩa khi DEX đã có giao dịch thật.
3. **Ba thứ người mua kiểm tra đầu tiên:** mã nguồn verify không có quyền admin, LP đã khóa, token đội ngũ có vesting. Thiếu một trong ba, token bị coi là rug pull tiềm năng.

## Bắt đầu từ đâu

1. Đọc `docs/09` (kế hoạch 6 tuần lên DEX). Các tài liệu Binance chỉ đọc khi cần.
2. **Chốt tên, ticker, lý do tồn tại của token.** Đổi placeholder NewCoin/NEWC trong `contracts/contracts/NewCoin.sol`, `tokenomics/config.example.json` và `website/`.
3. Điều chỉnh `tokenomics/config.example.json` nếu cần, chạy công cụ để xác nhận không còn WARN, rồi đồng bộ `contracts/config/allocations.example.json`.
4. Chạy trọn quy trình trên BSC testnet theo `contracts/README.md`: deploy → verify → vesting → add liquidity.
5. Đọc `docs/08` và hỏi luật sư trước khi deploy mainnet; làm audit nhỏ.
6. Deploy mainnet, tạo pool, khóa LP, nộp CoinGecko/CMC, rồi chạy `growth/` để có người mua thật.

## Trạng thái hiện tại

| Hạng mục | Trạng thái |
|---|---|
| Kế hoạch, checklist, mẫu tài liệu | Hoàn thành (cần điền số liệu thật) |
| Smart contract + test | Hoàn thành, chưa audit, chưa deploy |
| Công cụ tokenomics | Hoàn thành, cấu hình ví dụ pass 7/7 red flag |
| Landing page, growth kit | Hoàn thành (placeholder) |
| Script tạo thanh khoản PancakeSwap | Hoàn thành, test bằng mock router; chưa chạy trên mạng thật |
| Tên token, ticker, lý do tồn tại | **Chưa chốt** (đang dùng placeholder NewCoin/NEWC) |
| Pháp lý, audit, ví Safe, BNB thanh khoản, cộng đồng thật | Chưa bắt đầu; cần người thật thực hiện |
