# New Coin — Kế hoạch phát hành token và niêm yết trên Binance

Repo này chứa bộ tài liệu kế hoạch để đưa một token từ ý tưởng đến niêm yết trên Binance
(theo lộ trình chính thức **Binance Alpha → Binance Futures → Binance Spot**).

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

1. **Binance không bán suất niêm yết.** Không có phí niêm yết chính thức; bất kỳ ai hứa "bảo đảm lên Binance" đều là lừa đảo hoặc môi giới không có thẩm quyền.
2. **Tỷ lệ thành công thấp.** Hàng nghìn dự án nộp đơn mỗi năm; theo số liệu công khai giữa 2025, chỉ khoảng 9–10% token trên Binance Alpha lên được Spot.
3. **Niêm yết là kết quả, không phải mục tiêu.** Binance chấm điểm sản phẩm thật, người dùng thật, thanh khoản thật, đội ngũ minh bạch và tuân thủ pháp lý. Kế hoạch này vì vậy đặt trọng tâm vào việc xây một dự án đủ tốt để Binance *muốn* niêm yết.

## Bắt đầu từ đâu

1. Đọc `docs/01-ke-hoach-tong-the.md` để nắm lộ trình 7 giai đoạn.
2. **Chốt use case sản phẩm.** Đây là quyết định duy nhất chưa có trong repo và mọi thứ khác phụ thuộc vào nó.
3. Điền `docs/05` (whitepaper) trước, rồi dùng nó làm nguồn cho `docs/06` (hồ sơ Binance) và `docs/07` (pitch).
4. Điều chỉnh `tokenomics/config.example.json` nếu cần, chạy công cụ để xác nhận không còn WARN, rồi đồng bộ contract config và website.
5. Đọc `docs/08` trước khi gặp luật sư; đọc `contracts/README.md` mục checklist bảo mật trước khi deploy mainnet.
6. Bắt đầu `growth/01-ke-hoach-cong-dong-12-tuan.md` tối thiểu 12 tuần trước TGE.

## Trạng thái hiện tại

| Hạng mục | Trạng thái |
|---|---|
| Kế hoạch, checklist, mẫu tài liệu | Hoàn thành (cần điền số liệu thật) |
| Smart contract + test | Hoàn thành, chưa audit, chưa deploy |
| Công cụ tokenomics | Hoàn thành, cấu hình ví dụ pass 7/7 red flag |
| Landing page, growth kit | Hoàn thành (placeholder) |
| Use case sản phẩm | **Chưa chốt** |
| Pháp nhân, luật sư, audit, market maker, cộng đồng thật | Chưa bắt đầu; không thể tự động hóa |
