# LiXi (LIXI) — Token lì xì cho cộng đồng trực tuyến Việt Nam

**LiXi** là token thưởng và tip (lì xì) dùng chung cho các cộng đồng trực tuyến Việt Nam — nhóm Telegram,
Discord, group Facebook, kênh streamer. Thay vì admin chuyển khoản tay hoặc phát gift code không truy vết được,
cộng đồng nạp LIXI vào một "pot", **Lì Xì Bot** (Telegram, v1) phát thưởng cho thành viên hoạt động, ai cũng tip
được bằng `/lixi @user 100`, mở bao lì xì chia ngẫu nhiên bằng `/lixi 1000 chia 10` dịp Tết, sinh nhật, cột mốc.
BEP-20 trên BNB Chain, cung cố định 1.000.000.000, không mint.

Repo này chứa quyết định, kế hoạch, mã nguồn và công cụ để đưa LiXi từ ý tưởng đến chỗ **người dùng mua bán được
và bot chạy thật**.

**Mục tiêu hiện tại:** Q4/2026 lên PancakeSwap + bot beta với 3 cộng đồng pilot; sàn tập trung nhỏ sau khi DEX có
giao dịch thật. Bắt đầu từ [docs/00-quyet-dinh-token.md](docs/00-quyet-dinh-token.md) rồi
[docs/09-ke-hoach-rut-gon-dex-va-san-nho.md](docs/09-ke-hoach-rut-gon-dex-va-san-nho.md).
Lộ trình Binance (docs/01, 02, 06) được giữ lại làm tham khảo; **dự án không nhắm Binance.**

## Cấu trúc tài liệu

| File | Nội dung |
|---|---|
| [docs/00-quyet-dinh-token.md](docs/00-quyet-dinh-token.md) | **Bản ghi quyết định.** Tên, ticker, lý do tồn tại, phạm vi Lì Xì Bot v1, chỉ số đo tiện ích, roadmap 4 quý, rủi ro đã chấp nhận (kể cả chưa có luật sư), việc còn để ngỏ |
| [docs/01-ke-hoach-tong-the.md](docs/01-ke-hoach-tong-the.md) | Kế hoạch tổng thể: 7 giai đoạn, timeline, nhân sự, KPI, cột mốc |
| [docs/02-checklist-ho-so-binance.md](docs/02-checklist-ho-so-binance.md) | Checklist hồ sơ và tiêu chí Binance đánh giá, chuẩn bị trước khi nộp đơn |
| [docs/03-tokenomics-template.md](docs/03-tokenomics-template.md) | Mẫu thiết kế tokenomics, lịch vesting, kiểm tra "red flag" |
| [docs/04-ngan-sach-va-rui-ro.md](docs/04-ngan-sach-va-rui-ro.md) | Ngân sách ước tính, sổ đăng ký rủi ro, kế hoạch dự phòng |
| [docs/05-whitepaper-draft.md](docs/05-whitepaper-draft.md) | Whitepaper LiXi v0.2, 18 mục: đã điền tóm tắt, vấn đề, sản phẩm Lì Xì Bot, kiến trúc (v1 custodial), tiện ích và chỉ số, roadmap 24 tháng, rủi ro; còn trống đội ngũ, đối tác, audit, địa chỉ |
| [docs/06-binance-listing-application-draft.md](docs/06-binance-listing-application-draft.md) | Bản nháp câu trả lời cho Binance Listing Application Portal (đề nghị Alpha), tài liệu đính kèm, những điều không được viết |
| [docs/07-one-pager-and-pitch.md](docs/07-one-pager-and-pitch.md) | Mẫu one-pager, dàn ý pitch deck 10 slide, bài pitch 60 giây |
| [docs/08-legal-checklist-vietnam.md](docs/08-legal-checklist-vietnam.md) | Checklist chuẩn bị pháp lý cho đội ngũ tại Việt Nam: câu hỏi cho luật sư, lựa chọn pháp nhân, hồ sơ KYB, thuế (không phải tư vấn pháp lý) |
| [docs/09-ke-hoach-rut-gon-dex-va-san-nho.md](docs/09-ke-hoach-rut-gon-dex-va-san-nho.md) | **Kế hoạch đang áp dụng.** Phạm vi Lì Xì Bot v1, lộ trình 6 tuần lên PancakeSwap (bot beta tuần 3–5), khóa LP, lên CoinGecko/CMC, tùy chọn CEX nhỏ, ngân sách rút gọn, checklist ngày ra mắt |
| [docs/10-huong-dan-vi-va-bnb.md](docs/10-huong-dan-vi-va-bnb.md) | Hướng dẫn từng bước cho người mới: tạo ví deploy, lấy BNB testnet, mua BNB thật từ Việt Nam, tạo ví Safe multisig, thứ tự lệnh ngày ra mắt |
| [docs/11-quyet-dinh-bot-off-chain-truoc.md](docs/11-quyet-dinh-bot-off-chain-truoc.md) | Quyết định: bot chạy bằng điểm off-chain trước, chưa cần ví/BNB; điều kiện để chuyển sang token thật |
| [docs/12-chay-bot-o-dau.md](docs/12-chay-bot-o-dau.md) | So sánh nơi chạy bot, chốt Vercel + Neon, quy tắc an toàn token |
| [docs/13-prompt-trien-khai-vercel.md](docs/13-prompt-trien-khai-vercel.md) | Prompt bàn giao việc bấm deploy cho trợ lý có trình duyệt |
| [docs/14-ke-hoach-tang-truong-tu-dong.md](docs/14-ke-hoach-tang-truong-tu-dong.md) | **Kế hoạch tăng trưởng gần như không cần con người:** vòng lặp bot tự lan truyền, phân công agent, phần con người tối thiểu, chỉ số duy nhất cần nhìn, điều kiện dừng |
| [docs/15-prompt-cowork-viec-con-lai.md](docs/15-prompt-cowork-viec-con-lai.md) | Prompt bàn giao cho trợ lý điều khiển máy tính: tạo bot mới có username tử tế, cập nhật Vercel, tạo kênh, đăng bài, gửi tin gieo hạt (có duyệt từng tin), đăng ký danh bạ |
| [docs/16-ke-hoach-xay-cong-dong-tu-so.md](docs/16-ke-hoach-xay-cong-dong-tu-so.md) | **Kế hoạch cộng đồng đang áp dụng.** Xây từ số 0 không dùng quan hệ cá nhân: nhóm demo công khai, tìm admin ở nơi công khai, lùi ngược từ Tết 6/2/2027, điều kiện dừng |

## Cấu trúc mã nguồn và công cụ

| Thư mục | Nội dung | Kiểm tra |
|---|---|---|
| [contracts/](contracts/) | Hợp đồng BEP-20 `LiXi` (cung cố định, không mint/owner/pause/tax), ví vesting theo từng nhóm, script deploy và verify BSC testnet/mainnet | `cd contracts && npm ci && npm test` (61 test) |
| [tokenomics/](tokenomics/) | Công cụ tính lịch unlock 36 tháng từ file cấu hình, xuất CSV/Markdown/biểu đồ, tự kiểm tra red flag | `cd tokenomics && pip install -r requirements.txt && python -m pytest` (31 test) |
| [bot/](bot/) | Lì Xì Bot trên Telegram (bản off-chain, `docs/11`): tip, bao lì xì chia ngẫu nhiên, thưởng hoạt động, rút (chờ admin duyệt), chống lạm dụng. Lưu dữ liệu vào PostgreSQL (bền vững) hoặc file JSON (chạy ở máy cá nhân) | `cd bot && npm ci && npm test` (120 test; 131 khi có Postgres) |
| [api/](api/) + [vercel.json](vercel.json) | Ba hàm serverless để chạy bot trên Vercel gói Hobby (miễn phí) kèm database Neon Postgres — cách chạy được khuyến nghị, xem `docs/12` và `VERCEL.md` | `node --check api/*.js` |
| [website/](website/) | Landing page tĩnh, không phụ thuộc bên ngoài, hỗ trợ dark mode và mobile | Mở `website/index.html` |
| [growth/](growth/) | Kế hoạch cộng đồng 12 tuần quanh ngày ra mắt (pilot, bot beta, bảng xếp hạng, chiến dịch Tết 2027), lịch nội dung, template KPI, mẫu liên hệ cộng đồng pilot/đối tác đổi quà/KOL/sàn | — |
| [.github/workflows/ci.yml](.github/workflows/ci.yml) | CI chạy toàn bộ test contract, tokenomics và kiểm tra website mỗi lần push | — |

**Nguồn sự thật duy nhất về phân bổ token** là `tokenomics/config.example.json`. File `contracts/config/allocations.example.json`, biểu đồ trên website và các bảng trong docs/05–07 đều dùng cùng bộ số này (32/18/15/13/8/5/5/4, cung lưu hành tại TGE 14,86%). Khi đổi tokenomics, sửa file cấu hình rồi chạy lại công cụ và cập nhật các nơi còn lại.

## Ba sự thật cần chấp nhận trước khi bắt đầu

1. **Lên DEX không cần ai duyệt.** Bất kỳ ai cũng tạo được pool PancakeSwap trong một ngày; khó là làm cho người lạ tin và mua.
2. **Sàn nhỏ bán "cửa vào", không bán người mua.** Trả phí niêm yết CEX chỉ có ý nghĩa khi DEX đã có giao dịch thật.
3. **Ba thứ người mua kiểm tra đầu tiên:** mã nguồn verify không có quyền admin, LP đã khóa, token đội ngũ có vesting. Thiếu một trong ba, token bị coi là rug pull tiềm năng.

## Bắt đầu từ đâu

1. Đọc `docs/00` (đã chốt: LiXi/LIXI, mục đích, phạm vi bot v1, rủi ro chấp nhận) rồi `docs/09` (6 tuần lên DEX, bot beta tuần 3–5). Các tài liệu Binance chỉ đọc khi cần.
2. **Chốt những gì còn để ngỏ trong `docs/00` mục 7:** danh tính đội ngũ (công khai hay KYC bên thứ ba), số BNB đưa vào thanh khoản, ngày ra mắt, 3 cộng đồng pilot. Kiểm tra ticker `LIXI` chưa trùng trên CoinGecko/CMC.
3. Xây Lì Xì Bot theo phạm vi `docs/09` mục 1 (lệnh, nạp pot, rút, hạn mức chống lạm dụng); chạy nội bộ với LIXI testnet.
4. Điều chỉnh `tokenomics/config.example.json` nếu cần, chạy công cụ để xác nhận không còn WARN, rồi đồng bộ `contracts/config/allocations.example.json`.
5. Chạy trọn quy trình trên BSC testnet theo `contracts/README.md`: deploy → verify → vesting → add liquidity.
6. Đọc lại `docs/08` và cảnh báo trong `docs/00` mục 6 trước khi deploy mainnet (chưa có luật sư là rủi ro đã chấp nhận, không phải việc đã xong); làm audit nhỏ; tạo Safe.
7. Deploy mainnet, bot beta với 3 pilot, tạo pool, khóa LP, nộp CoinGecko/CMC, rồi chạy `growth/` để có cộng đồng và người mua thật.

## Trạng thái hiện tại

Cập nhật 12/9/2026. Kế hoạch đang áp dụng: `docs/09` (6 tuần lên DEX), đã sắp xếp lại theo `docs/11` (bot off-chain trước, token on-chain chỉ khi đủ điều kiện).

### Phần kỹ thuật (tôi làm được)

| Hạng mục | Trạng thái |
|---|---|
| Tên token, ticker, lý do tồn tại, phạm vi sản phẩm v1 | **Đã chốt** — LiXi / LIXI, Lì Xì Bot (`docs/00`) |
| Kế hoạch, checklist, whitepaper, tài liệu pháp lý, growth kit | Hoàn thành; whitepaper còn trống đội ngũ, đối tác, audit, địa chỉ |
| Smart contract BEP-20 + vesting + script thanh khoản | Hoàn thành, 61 test; **chưa deploy** vì chưa có ví/BNB |
| Công cụ tokenomics | Hoàn thành, cấu hình mẫu pass 7/7 red flag |
| Landing page | Hoàn thành, còn placeholder địa chỉ contract, đội ngũ, audit |
| **Lì Xì Bot (off-chain)** | **Đang chạy thật** trên Vercel + Neon Postgres, bot `@lixi_vn_bot`; đã kiểm chứng trong nhóm thật: `/start`, `/pot`, `/nap`, `/sodu`, mở bao lì xì, hết giờ hoàn điểm, `/lichsu`, `/caidat`; các luồng còn lại (nhận lì xì, tip, duyệt tip lớn, rút, thưởng ngày, cold start) kiểm chứng bằng giả lập nhiều người dùng trên Postgres thật; 201 test |
| Chuyển bot sang token on-chain | Chưa làm, **cố ý** — chỉ làm khi đủ 3 điều kiện trong `docs/11` |

### Phần vận hành (cần người thật hoặc tiền)

| Hạng mục | Trạng thái |
|---|---|
| 3 cộng đồng pilot đồng ý dùng thử | **0/3** — nút thắt lớn nhất, mọi bước sau đều chờ cái này |
| Số liệu sử dụng thật (lì xì/tuần, ví nhận) | 0 tuần dữ liệu; mới có nhóm thử 2 thành viên của chủ dự án |
| Kênh cộng đồng công khai (Telegram, X), domain | Chưa có |
| Danh tính đội ngũ | Chưa chốt |
| Ví Safe, BNB thanh khoản, mức thanh khoản ban đầu | Chưa có; cần trước khi deploy token (`docs/10`) |
| Audit, KYC đội ngũ | Chưa bắt đầu |
| Pháp lý | Không có luật sư — rủi ro đã chấp nhận (`docs/00` mục 6) |
| Dọn Build Command thủ công trên Vercel | Chưa dọn; để nguyên không hỏng (`bot/README.md`) |
