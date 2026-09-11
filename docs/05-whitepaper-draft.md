# Whitepaper LiXi (LIXI) — draft v0.2

> **Cách dùng tài liệu này.** Đây là bộ khung whitepaper theo cấu trúc mà sàn giao dịch, công cụ theo dõi
> (CoinGecko/CMC) và người mua nghiêm túc thường mong đợi. Các mục 1–5, 10, 15 đã điền theo quyết định trong
> `docs/00-quyet-dinh-token.md`; các mục còn lại (đội ngũ, đối tác, audit, địa chỉ, pháp lý) vẫn là chỗ trống. Mỗi mục có một đoạn hướng dẫn (trong blockquote) và phần nội dung
> mẫu với các chỗ trống dạng `[[ĐIỀN: ...]]`. Dưới mỗi chỗ trống có *ví dụ in nghiêng* để biết một câu trả lời tốt
> trông như thế nào; ví dụ chỉ để minh họa, **không** sao chép nguyên văn. Khi hoàn thiện, xóa toàn bộ blockquote
> hướng dẫn và ví dụ, giữ lại nội dung thật. Tuyệt đối không điền số liệu chưa có thật; nếu chưa có, ghi "chưa có"
> và để trống thay vì ước lượng.

| Trường | Giá trị |
|---|---|
| Tên dự án | LiXi |
| Ticker | LIXI |
| Chain | BNB Chain (BEP-20) |
| Tổng cung | 1.000.000.000 LIXI (cố định, không mint thêm) |
| Phiên bản tài liệu | v0.2 — đã điền use case, sản phẩm, kiến trúc, tiện ích, roadmap, rủi ro |
| Ngày | `[[ĐIỀN: ngày phát hành bản này]]` |
| Địa chỉ hợp đồng | `[[ĐIỀN: sau khi deploy và verify trên BscScan]]` |
| Website / Docs | `[[ĐIỀN]]` |
| Sản phẩm | Lì Xì Bot (Telegram, v1) — token thưởng và tip cho cộng đồng trực tuyến Việt Nam |

---

## Mục lục

1. Tóm tắt (Abstract)
2. Bối cảnh và vấn đề
3. Giải pháp và sản phẩm
4. Kiến trúc kỹ thuật
5. Token LIXI: vai trò và tiện ích
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

> Người đọc thường chỉ đọc kỹ trang này rồi quyết định có đọc tiếp hay không. Không nhắc đến giá, lợi nhuận hay
> "tiềm năng tăng trưởng".

LiXi là token thưởng và tip (lì xì) dùng chung cho các cộng đồng trực tuyến Việt Nam — nhóm Telegram, Discord,
group Facebook, kênh streamer — đi kèm một bot làm việc phát và nhận thưởng thay cho admin.

Vấn đề chúng tôi giải quyết: hôm nay các cộng đồng thưởng cho thành viên bằng chuyển khoản ngân hàng/ví điện tử
thủ công hoặc gift code. Cách này tốn thời gian của admin, không truy vết được (ai nhận, bao nhiêu, vì việc gì), và
mỗi cộng đồng một hệ điểm riêng nên phần thưởng không mang đi đâu được.

Token LIXI được dùng để: (1) nạp vào "pot" của cộng đồng để bot phát thưởng cho thành viên hoạt động; (2) tip
giữa các thành viên (`/lixi @user 100`) và bao lì xì chia ngẫu nhiên (`/lixi 1000 chia 10`) trong dịp Tết, sinh
nhật, cột mốc; (3) từ v3, đổi lấy vé sự kiện, merchandise, voucher đối tác, và mở tính năng bot cho cộng đồng giữ
LIXI trong pot.

Tình trạng hiện tại: sản phẩm **chưa chạy**. Lì Xì Bot v1 (Telegram) dự kiến beta với 3 cộng đồng pilot trong
Q4/2026, cùng thời điểm mở pool PancakeSwap. Chưa có số liệu sử dụng nào; mọi số liệu trong tài liệu này là mục
tiêu hoặc mô hình, không phải kết quả.

---

## 2. Bối cảnh và vấn đề

> Chỉ dùng số liệu có nguồn công khai. Các ô `[[ĐIỀN]]` dưới đây cần khảo sát thật (ví dụ hỏi 20–30 admin cộng
> đồng và công bố phương pháp) trước khi công bố whitepaper v1.

### 2.1 Người dùng mục tiêu

- **Nhóm 1 — admin/chủ cộng đồng:** người quản lý nhóm Telegram/Discord/Facebook từ vài trăm đến vài chục nghìn
  thành viên, hoặc streamer có kênh chat riêng, đang tự bỏ tiền hoặc dùng tiền tài trợ để thưởng cho thành viên.
  Quy mô ước tính: `[[ĐIỀN: số nhóm/kênh mục tiêu và nguồn ước tính]]`.
- **Nhóm 2 — thành viên cộng đồng:** người tham gia thảo luận, trả lời câu hỏi, làm minigame, xem stream; hôm nay
  nhận thưởng lẻ tẻ qua chuyển khoản hoặc code.

### 2.2 Vấn đề hiện tại

1. **Tốn công admin:** mỗi đợt thưởng phải xin số tài khoản, chuyển tay từng người, đối chiếu lại; với 50 người
   nhận là vài giờ làm việc. `[[ĐIỀN: số giờ/tuần theo khảo sát]]`
2. **Không truy vết:** gift code và chuyển khoản cá nhân không để lại lịch sử công khai; thành viên không biết pot
   còn bao nhiêu, ai được thưởng vì việc gì; dễ tranh cãi và dễ gian lận từ cả hai phía.
3. **Phân mảnh:** mỗi cộng đồng một hệ điểm/thưởng riêng; điểm ở nhóm này vô giá trị ở nhóm khác; khi cộng đồng
   giải tán, điểm mất theo.

### 2.3 Tại sao các giải pháp hiện có chưa đủ

| Cách đang dùng | Hạn chế |
|---|---|
| Chuyển khoản ngân hàng / ví điện tử thủ công | Tốn công, cần thu thập thông tin tài khoản cá nhân, không có lịch sử công khai, khó chia nhỏ (vài nghìn đồng) |
| Gift code, thẻ cào | Không truy vết, dễ bị lộ/đánh cắp, không dùng lại được, admin phải mua trước |
| Bot điểm nội bộ (XP, level, điểm danh) | Điểm không có giá trị ngoài nhóm, không rút được, admin đổi luật bất kỳ lúc nào |
| Tip bằng tài sản mã hóa trực tiếp on-chain | Người mới phải tự có ví, gas và hiểu địa chỉ; không có luồng "phát thưởng theo hoạt động" |

### 2.4 Tại sao cần blockchain

- **Người nhận thực sự sở hữu phần thưởng:** LIXI rút được về ví riêng và dùng ở cộng đồng khác; một cơ sở dữ
  liệu của riêng dự án không cho được điều này nếu dự án đóng cửa.
- **Pot và lịch sử phát thưởng kiểm chứng công khai:** số dư pot và lượng LIXI đã phát đối chiếu được với số dư
  on-chain, không phụ thuộc lời của admin hay của đội ngũ.
- **Một đơn vị dùng chung giữa nhiều cộng đồng** cần một sổ cái không do bất kỳ cộng đồng nào kiểm soát.

Chúng tôi nói thẳng: ở v1 phần lớn logic (thưởng hoạt động, tip trong nhóm) chạy off-chain trong bot để người
dùng không cần ví; blockchain đảm bảo quyền rút và tính kiểm chứng, không phải mọi giao dịch đều on-chain (mục 4).

---

## 3. Giải pháp và sản phẩm

> Mô tả sản phẩm như một thứ có thể dùng được. Sản phẩm chưa chạy — ngày dự kiến ghi rõ ở 3.3.

### 3.1 Mô tả sản phẩm

**Lì Xì Bot** là bot Telegram mà admin thêm vào nhóm của mình. Admin nạp LIXI vào pot của nhóm và đặt quy tắc
thưởng; bot tự phát LIXI cho thành viên hoạt động, cho phép mọi người tip nhau và mở bao lì xì chia ngẫu nhiên.
Thành viên xem số dư ngay trong Telegram và rút LIXI về ví BEP-20 của mình bất cứ lúc nào. Kết quả: admin thưởng
trong vài giây thay vì vài giờ; thành viên có phần thưởng thật, mang đi được; cả nhóm thấy pot còn bao nhiêu.

### 3.2 Luồng người dùng chính

1. Admin thêm Lì Xì Bot vào nhóm Telegram, chạy `/start` (bot hiện hướng dẫn và câu miễn trừ trách nhiệm).
2. Admin mua LIXI trên PancakeSwap (hoặc nhận từ chương trình pilot) và **nạp vào pot** của nhóm bằng một giao dịch
   on-chain kèm mã nhóm *(bước chạm token)*.
3. Admin đặt quy tắc thưởng (ví dụ 20 LIXI/ngày cho thành viên có ≥ 5 tin nhắn hợp lệ, hạn mức 500 LIXI/ngày/nhóm).
4. Thành viên hoạt động → bot ghi có LIXI vào số dư của họ; `/sodu` để xem.
5. Thành viên **tip** nhau: `/lixi @user 100`; admin mở **bao lì xì**: `/lixi 1000 chia 10` *(bước chạm token)*.
6. Thành viên `/rut <địa chỉ> <số>` để nhận LIXI về ví riêng; bot gửi on-chain và trả link BscScan *(bước chạm token)*.
7. (v3) Thành viên đổi LIXI lấy vé sự kiện, merchandise, voucher đối tác; cộng đồng giữ ≥ N LIXI trong pot mở
   tính năng riêng *(bước chạm token)*.

### 3.3 Tính năng theo phiên bản

| Phiên bản | Tính năng | Trạng thái | Thời điểm |
|---|---|---|---|
| v1 beta | Telegram bot: pot, thưởng hoạt động, tip, bao lì xì, số dư, rút; hạn mức chống lạm dụng | Kế hoạch | Q4/2026, 3 cộng đồng pilot |
| v1 public | Mở cho mọi cộng đồng đăng ký; bảng xếp hạng người lì xì/người nhận theo tuần; đối tác đổi quà đầu tiên | Kế hoạch | Q1/2027 |
| v2 | Discord bot; dashboard web cho admin (pot, lịch sử, xuất báo cáo) | Kế hoạch | Q2/2027 |
| v3 | Chợ voucher/đổi quà; tính năng mở khóa theo LIXI trong pot (mẫu bao lì xì riêng, bảng xếp hạng, hạn mức cao hơn); cộng đồng bỏ phiếu về quỹ thưởng | Kế hoạch | Q3/2027 |

### 3.4 Số liệu sử dụng (chỉ điền khi đã có thật)

Chưa có số liệu công khai tại thời điểm viết. Bot beta dự kiến chạy Q4/2026; sau beta sẽ công bố hàng tuần:
số lì xì gửi, số ví nhận duy nhất, LIXI trong pot, và (từ v3) số lượt đổi quà.

---

## 4. Kiến trúc kỹ thuật

> Nêu thẳng thành phần nào on-chain, thành phần nào off-chain, ai giữ khóa gì, điểm tin cậy tập trung nằm ở đâu.

### 4.1 Sơ đồ tổng thể

```
  Thành viên / Admin (Telegram)
        │  lệnh /lixi, /sodu, /rut ...
        ▼
  Lì Xì Bot (backend off-chain)
   ├─ Sổ cái theo từng cộng đồng (pot, số dư thành viên, lịch sử)
   ├─ Quy tắc thưởng + hạn mức chống lạm dụng
   └─ Hàng đợi rút / theo dõi nạp
        │  nạp (on-chain vào địa chỉ nạp)      rút (on-chain từ ví nóng)
        ▼
  Ví nóng của bot  ◄──── nạp/rút định kỳ ────►  Safe multisig (giữ phần lớn số dư)
        │
        ▼
  BNB Chain
   ├─ LIXI (BEP-20, cung cố định, không admin)
   ├─ Vesting (đội ngũ, nhà đầu tư, cộng đồng)
   └─ (v3) Hợp đồng đổi quà / quản trị quỹ thưởng — chưa thiết kế
```

### 4.2 Thành phần on-chain

| Hợp đồng | Chức năng | Có thể nâng cấp? | Quyền admin | Ai kiểm soát |
|---|---|---|---|---|
| LIXI Token | BEP-20 chuẩn OpenZeppelin, không mint, không blacklist, không thuế giao dịch | Không | Không có | — |
| Vesting | Khóa token đội ngũ/nhà đầu tư/cộng đồng theo lịch mục 7 | Không | Không có | — |
| Ví Safe (không phải hợp đồng riêng của dự án) | Giữ treasury, thanh khoản, và phần lớn LIXI của các pot | — | Người ký multisig | Đội ngũ (giai đoạn 1, mục 8) |
| Hợp đồng đổi quà / quản trị quỹ thưởng | `[[ĐIỀN khi thiết kế v3]]` | `[[ĐIỀN]]` | `[[ĐIỀN]]` | Safe multisig + timelock |

v1 **không có hợp đồng lõi nào ngoài token và vesting**. Mọi logic của bot chạy off-chain.

### 4.3 Thành phần off-chain

- **Backend bot:** nhận lệnh từ Telegram Bot API, ghi sổ cái, áp hạn mức, tạo giao dịch rút.
- **Sổ cái theo cộng đồng:** cơ sở dữ liệu ghi pot của từng nhóm, số dư từng thành viên (theo Telegram ID), lịch sử
  thưởng/tip/bao lì xì. Tip và thưởng trong nhóm **không lên chain** để không tốn gas và không bắt người dùng có ví.
- **Theo dõi nạp:** đọc giao dịch LIXI vào địa chỉ nạp, ghi có cho pot sau đủ số block xác nhận.
- **Chống lạm dụng:** hạn mức ngày, cooldown, tuổi tài khoản, xác nhận admin với khoản lớn.

### 4.4 Điểm tập trung và lộ trình phi tập trung hóa

**v1 là mô hình custodial.** Cụ thể:

- Bot giữ LIXI của các pot: phần lớn nằm trong ví Safe multisig của dự án, một phần nhỏ trong ví nóng để trả lệnh
  rút. Sổ cái theo từng cộng đồng do đội ngũ vận hành; số dư của thành viên là bút toán trong sổ cái đó.
- Người dùng **luôn rút được** về ví riêng; hạn mức rút/ngày chỉ để giới hạn thiệt hại nếu ví nóng bị xâm nhập.
- Cam kết minh bạch: tổng số dư sổ cái ≤ số dư on-chain (ví nóng + Safe) và công bố đối chiếu hàng ngày; công bố
  địa chỉ ví nóng, địa chỉ nạp và Safe.
- Rủi ro: ví nóng bị xâm nhập, lỗi sổ cái, đội ngũ ngừng vận hành. Xem mục 15.

Lộ trình giảm tập trung: v2 cho phép tip trực tiếp từ ví riêng (không custodial) như tùy chọn; v3 chuyển đổi quà
và quản trị quỹ thưởng lên hợp đồng; mốc chuyển giao quyền ký Safe cho hội đồng công khai ghi ở mục 8.

### 4.5 Lý do chọn BNB Chain

- Phí giao dịch thấp (thường dưới 0,05 USD), phù hợp với lệnh rút nhỏ vài chục LIXI.
- Ví phổ biến với người dùng Việt Nam (Trust, MetaMask, Binance Wallet) đều hỗ trợ sẵn; không phải cài thêm mạng lạ.
- PancakeSwap cho phép tạo thanh khoản không cần ai duyệt (`docs/09`).

---

## 5. Token LIXI: vai trò và tiện ích

> Mỗi tiện ích gắn với một hành động cụ thể trong sản phẩm và có chỉ số đo được. Tránh mọi cơ chế giống chứng khoán.

### 5.1 Bảng tiện ích

| # | Tiện ích | Cơ chế cụ thể | Chỉ số đo được | Bắt buộc hay tùy chọn |
|---|---|---|---|---|
| 1 | Đơn vị thưởng và tip | Admin nạp LIXI vào pot; bot phát cho thành viên hoạt động; thành viên tip `/lixi @user <số>`; bao lì xì `/lixi <số> chia <n>` | **Số lì xì (tip + bao) gửi mỗi tuần**; **số ví/tài khoản nhận duy nhất** | Bắt buộc — bot chỉ chạy bằng LIXI |
| 2 | Pot cộng đồng | Cộng đồng phải giữ LIXI trong pot để phát thưởng; từ v3, pot ≥ ngưỡng mở tính năng (mẫu bao lì xì riêng, bảng xếp hạng, hạn mức cao hơn) | **Tổng LIXI đang giữ trong các pot**; số cộng đồng có pot hoạt động | Bắt buộc |
| 3 | Đổi quà (v3) | Đổi LIXI lấy vé sự kiện, merchandise, voucher đối tác theo giá niêm yết bằng LIXI | **Số lượt đổi**; LIXI đã đổi/tháng | Tùy chọn |
| 4 | Quản trị quỹ thưởng (v3) | Cộng đồng giữ LIXI bỏ phiếu về cách chi phần "Cộng đồng và hệ sinh thái" (grant cho cộng đồng mới, sự kiện) | Số đề xuất; số ví bỏ phiếu | Tùy chọn |

Bốn chỉ số in đậm là chỉ số công bố hàng tuần sau beta (`docs/00` mục 4).

### 5.2 Vòng đời của token trong sản phẩm

- **Vào:** admin mua LIXI trên DEX hoặc nhận grant pilot từ phần "Cộng đồng và hệ sinh thái" → nạp pot.
- **Lưu chuyển:** bot phát từ pot cho thành viên → thành viên tip nhau, mở bao lì xì → số dư đổi chủ trong sổ cái.
- **Ra:** thành viên rút về ví riêng (on-chain) để giữ, dùng ở cộng đồng khác, hoặc bán trên DEX; (v3) đổi quà —
  LIXI đổi quà chuyển cho đối tác cung cấp quà, hoặc về treasury nếu quà do dự án cung cấp.
- **Khóa:** token đội ngũ/nhà đầu tư/cộng đồng nằm trong hợp đồng vesting theo mục 7; không dùng để phát thưởng
  ngoài lịch.

### 5.3 Cơ chế cân bằng cung – cầu

Không có cơ chế đốt hay mua lại. Cung cố định; phần "Cộng đồng và hệ sinh thái" giải ngân theo lịch vesting để cấp
grant pot cho cộng đồng pilot và sự kiện, không phát vượt lịch.

### 5.4 Những gì LIXI KHÔNG phải

LIXI không đại diện cho cổ phần, quyền sở hữu, quyền hưởng lợi nhuận hay bất kỳ nghĩa vụ tài chính nào của
pháp nhân phát hành. LIXI không phải là phương tiện thanh toán pháp định tại bất kỳ quốc gia nào. Bao lì xì và
tip là quà giữa các thành viên; dự án không cam kết LIXI đổi được ra tiền hay có giá trị nhất định.

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
| Tổng cung | 1.000.000.000 LIXI |
| Cơ chế phát hành | Mint một lần khi deploy; hàm mint bị vô hiệu hóa vĩnh viễn |
| Decimals | 18 |
| Cung lưu hành tại TGE | 148.600.000 LIXI = 14,86% (theo bảng 6.2) |
| Cơ chế giảm cung | Không có (mục 5.3) |

### 6.2 Phân bổ khuyến nghị tham chiếu

| Nhóm | % tổng cung | Số LIXI | Cliff | Vesting | Mở khóa tại TGE (% của nhóm → % tổng cung) | Mục đích |
|---|---|---|---|---|---|---|
| Cộng đồng và hệ sinh thái | 32% | 320.000.000 | — | 48 tháng tuyến tính | 5% → 1,6% | Airdrop người dùng thật, quest, grant nhà phát triển, thưởng staking |
| Đội ngũ và cố vấn | 18% | 180.000.000 | 12 tháng | 36 tháng tuyến tính sau cliff | 0% → 0% | Bắt buộc 0% tại TGE |
| Nhà đầu tư (seed/private) | 15% | 150.000.000 | 9 tháng | 24 tháng tuyến tính sau cliff | 0% → 0% | Công khai giá vòng và điều khoản; cliff 9 tháng để tháng đầu mở khóa không trùng cliff đội ngũ |
| Treasury | 13% | 130.000.000 | — | 36 tháng tuyến tính (mô hình hóa); thực tế giải ngân theo đề xuất quản trị, tối đa `[[ĐIỀN]]`%/quý | 2% → 0,26% | Vận hành dài hạn, dự phòng |
| Thanh khoản (DEX/CEX/MM) | 8% | 80.000.000 | — | Toàn bộ tại TGE | 100% → 8% | LP khóa ≥ 12 tháng; phần cho MM ≤ 2% tổng cung |
| Chương trình sàn tập trung (cấu hình mẫu gọi là "Chương trình Binance") | 5% | 50.000.000 | 3 tháng | 24 tháng tuyến tính sau cliff (mô hình hóa); thực tế giải ngân theo chương trình của sàn nếu có | 0% → 0% | Giữ riêng; dự án không nhắm Binance, chưa có kế hoạch dùng |
| Marketing và KOL | 5% | 50.000.000 | — | 24 tháng tuyến tính | 20% → 1% | Mọi hợp đồng KOL có vesting |
| Public sale | 4% | 40.000.000 | — | Toàn bộ tại TGE | 100% → 4% | Giá không thấp hơn vòng private quá xa |
| **Tổng** | **100%** | **1.000.000.000** | | | **148.600.000 = 14,86%** | |

`[[ĐIỀN: giải thích ngắn tại sao chọn từng con số; nếu thay đổi so với bảng tham chiếu, ghi rõ lý do]]`

*Gợi ý cho LiXi: phần cộng đồng lớn nhất (32%) vì bot chỉ có ích khi nhiều cộng đồng có pot; dự kiến dùng phần này cho grant pot cho cộng đồng pilot và cộng đồng mới, thưởng Tết/sự kiện, và airdrop cho ví đã thực sự nhận/rút LIXI. Tỷ lệ chia trong nhóm này `[[ĐIỀN]]`. Nhóm "Chương trình Binance" (5%) giữ nguyên số trong cấu hình mẫu nhưng dự án không nhắm Binance; ghi rõ đây là dự trữ cho chương trình của sàn tập trung nói chung, chưa có kế hoạch dùng.*

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
| `[[ĐIỀN: tên hãng, chỉ khi đã ký hợp đồng hoặc đã xong]]` | `[[Token / Vesting]]` | `[[ĐIỀN]]` | `[[N Critical, N High — tất cả đã sửa và xác nhận lại]]` | `[[ĐIỀN]]` |

Nếu chưa có audit: "Audit dự kiến với `[[hãng]]` vào `[[thời điểm]]`; TGE sẽ không diễn ra trước khi có báo cáo công khai."

### 9.2 Quyền admin còn lại

| Hợp đồng | Quyền | Ai giữ | Kiểm soát | Kế hoạch từ bỏ |
|---|---|---|---|---|
| LIXI Token | Không có | — | — | — |
| Ví nóng Lì Xì Bot (không phải hợp đồng) | Ký lệnh rút từ số dư ví nóng | Backend bot, khóa trong HSM/KMS `[[ĐIỀN]]` | Hạn mức rút/ngày; nạp từ Safe theo nhu cầu; đối chiếu số dư hàng ngày | v2: tùy chọn không custodial |
| Hợp đồng đổi quà / quỹ thưởng (v3) | `[[ĐIỀN khi thiết kế]]` | Safe multisig 3/5 | Timelock 48 giờ, công bố trước khi thực thi | `[[ĐIỀN mốc thời gian]]` |

### 9.3 Quản lý khóa và vận hành

- Ví deploy tách biệt ví vận hành; khóa deploy bị vô hiệu sau khi chuyển quyền cho multisig.
- Người ký multisig: `[[N]]` người, danh tính công khai, ở `[[N]]` địa điểm địa lý khác nhau, dùng ví phần cứng.
- Quy trình ký duyệt bằng văn bản: ai đề xuất, ai duyệt, thời gian chờ tối thiểu.

### 9.4 Bug bounty

`[[ĐIỀN: nền tảng (Immunefi hoặc tự vận hành), mức thưởng theo mức độ, phạm vi, link]]`

### 9.5 Kế hoạch ứng phó sự cố

`[[ĐIỀN: ai có quyền pause (nếu có), kênh liên lạc khẩn cấp, thời gian cam kết thông báo cộng đồng và sàn, quy trình hậu sự cố]]`

*Gợi ý cho LiXi: token không có pause. Sự cố có thể xảy ra là ví nóng bị xâm nhập hoặc lỗi sổ cái bot: (1) tắt lệnh `/rut` và nạp trong ≤ 30 phút; (2) thông báo trên Telegram/X trong ≤ 1 giờ; (3) đối chiếu sổ cái với on-chain, bù từ Safe nếu thiếu, báo cáo công khai trong ≤ 72 giờ; (4) đổi khóa ví nóng và mở lại rút theo hạn mức thấp.*

---

## 10. Lộ trình 24 tháng

> Roadmap theo quý, mỗi quý có cột mốc **đo được**. Roadmap trễ mà không giải thích là điểm trừ lớn. Không đưa
> "niêm yết Binance" thành cột mốc; dự án không nhắm Binance (`docs/00`).

| Quý | Sản phẩm | Token và thanh khoản | Cộng đồng và đối tác | Pháp lý và bảo mật | Cột mốc đo được |
|---|---|---|---|---|---|
| Q4/2026 | Lì Xì Bot v1 beta (Telegram) với 3 cộng đồng pilot | Deploy mainnet, pool PancakeSwap, khóa LP ≥ 12 tháng, nộp CoinGecko/CMC | 3 pilot ký cam kết; kênh Telegram/X mở | Audit nhỏ token + vesting; Safe multisig; chưa có luật sư (rủi ro chấp nhận) | 3 pilot dùng bot ≥ 4 tuần; ≥ `[[N]]` lì xì/tuần; LP khóa công khai |
| Q1/2027 | Bot mở công khai; bảng xếp hạng tuần; hạn mức theo cấp cộng đồng | Công bố lịch unlock; dashboard cung lưu hành | Chiến dịch Tết 2027; đối tác đổi quà đầu tiên (vé/merch) | Xem lại `docs/08`; điều khoản sử dụng bot | ≥ `[[N]]` cộng đồng có pot hoạt động; ≥ `[[N]]` ví nhận duy nhất; ≥ 1 đối tác đổi quà chạy thật |
| Q2/2027 | Discord bot; dashboard web cho admin; tùy chọn tip từ ví riêng | Niêm yết 1 sàn CEX nhỏ (chỉ khi DEX có giao dịch thật) | Cộng đồng Discord/streamer đầu tiên | Audit lại nếu thêm hợp đồng | Discord ≥ `[[N]]` server; dashboard dùng bởi ≥ `[[N]]`% admin |
| Q3/2027 | Chợ voucher/đổi quà; tính năng mở khóa theo LIXI trong pot | Hợp đồng đổi quà on-chain (nếu triển khai) | Cộng đồng bỏ phiếu về quỹ thưởng (Snapshot) | Legal opinion nếu ngân sách cho phép | ≥ `[[N]]` lượt đổi/tháng; ≥ 1 đề xuất được bỏ phiếu |
| Q4/2027 | `[[ĐIỀN: v3.1 — ví dụ API cho cộng đồng tự tích hợp]]` | Báo cáo treasury quý; đối chiếu số dư công khai | Chiến dịch Tết 2028 chuẩn bị | Báo cáo treasury quý đầu | `[[ĐIỀN]]` |
| Q1/2028 | `[[ĐIỀN]]` | Governance giai đoạn 2 mở rộng | `[[ĐIỀN]]` | `[[ĐIỀN]]` | `[[ĐIỀN]]` |
| Q2/2028 | `[[ĐIỀN]]` | `[[ĐIỀN]]` | `[[ĐIỀN]]` | `[[ĐIỀN]]` | `[[ĐIỀN]]` |
| Q3/2028 | `[[ĐIỀN]]` | Governance on-chain giai đoạn 3 | `[[ĐIỀN]]` | Chuyển giao quyền ký Safe theo mục 8/9.2 | `[[ĐIỀN]]` |

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

| Tiêu chí | LiXi | `[[Bot tip crypto 1]]` | `[[Bot điểm nội bộ]]` | Chuyển khoản / gift code |
|---|---|---|---|---|
| Người nhận cần ví/gas không? | Không (rút khi muốn) | | | Cần số tài khoản |
| Truy vết công khai? | Có (sổ cái + on-chain) | | | Không |
| Mang được sang cộng đồng khác? | Có | | | Không |
| Có luồng thưởng theo hoạt động? | Có | | | Không |
| Thời gian admin phát thưởng cho 50 người | Vài giây | | | Vài giờ |
| Chain | BNB Chain | | — | — |

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

- **Rủi ro công nghệ:** lỗi hợp đồng thông minh, lỗi trong thành phần off-chain, sự cố của BNB Chain, lỗi trong backend hoặc sổ cái của Lì Xì Bot, ví nóng bị xâm nhập.
- **Rủi ro thị trường:** giá LIXI có thể biến động mạnh hoặc mất toàn bộ giá trị; thanh khoản có thể không đủ để bán ở mức giá mong muốn.
- **Rủi ro pháp lý:** quy định về tài sản mã hóa tại Việt Nam và các nước khác đang thay đổi; token có thể bị coi là sản phẩm được quản lý tại một số nước; sàn giao dịch có thể hủy niêm yết.
- **Rủi ro vận hành:** đội ngũ có thể không đạt được roadmap; mất khóa; lỗi quy trình ký multisig.
- **Rủi ro sản phẩm:** người dùng không tiếp nhận; đối thủ mạnh hơn; thay đổi của nền tảng bên thứ ba.
- **Rủi ro tập trung / custodial:** ở v1, LIXI trong các pot do dự án giữ (ví nóng + Safe) và sổ cái do đội ngũ vận hành (mục 4.4). Nếu ví nóng bị xâm nhập, sổ cái lỗi, hoặc đội ngũ ngừng vận hành, người dùng có thể mất số dư chưa rút.
- **Rủi ro thuế:** nghĩa vụ thuế của người nắm giữ và của người nhận thưởng phụ thuộc vào từng quốc gia và có thể thay đổi.
- **Chưa có tư vấn pháp lý:** tại thời điểm viết, dự án chưa thuê luật sư (`docs/00` mục 6). Việc phát hành, thưởng và phân phối LIXI từ Việt Nam có thể thuộc phạm vi quy định về tài sản mã hóa, thanh toán, chống rửa tiền hoặc khuyến mại mà đội ngũ chưa được tư vấn; đội ngũ có thể phải thay đổi hoặc dừng sản phẩm để tuân thủ.
- **Phụ thuộc nền tảng bên thứ ba:** bot chạy trên Telegram (và Discord từ v2); thay đổi chính sách hoặc gián đoạn của nền tảng có thể làm bot ngừng hoạt động.
- **Lạm dụng và gian lận:** tài khoản ảo, spam để nhận thưởng, thông đồng giữa admin và thành viên; hạn mức và bộ lọc có thể không đủ.
- **Rủi ro đối tác đổi quà:** đối tác có thể ngừng nhận LIXI hoặc không giao quà; dự án không bảo đảm giá trị đổi quà.
- **Rủi ro tiếp nhận:** cộng đồng có thể không muốn thay cách thưởng hiện tại; số lì xì/tuần có thể thấp hơn kỳ vọng.

---

## 16. Tuyên bố miễn trừ trách nhiệm

> Luật sư phải viết hoặc duyệt mục này. Nội dung dưới đây chỉ là khung; **chưa được luật sư nào rà soát**
> (`docs/00` mục 6). Vẫn giữ nguyên câu chữ này ở mọi nơi công bố cho đến khi có bản do luật sư duyệt.

Tài liệu này chỉ nhằm mục đích cung cấp thông tin và không cấu thành bản cáo bạch, lời mời chào, lời khuyên đầu tư,
tài chính, pháp lý hay thuế. LIXI là token tiện ích dùng trong Lì Xì Bot; LIXI không phải chứng khoán,
không đại diện cho cổ phần, quyền sở hữu, khoản nợ hay quyền hưởng lợi nhuận của bất kỳ pháp nhân nào. Không có
bất kỳ cam kết nào về giá trị, tính thanh khoản hay khả năng giao dịch của LIXI trên bất kỳ nền tảng nào. Thông tin
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
| Pot | Số dư LIXI của một cộng đồng trong Lì Xì Bot, do admin nạp, dùng để phát thưởng |
| Bao lì xì | Lệnh chia một khoản LIXI ngẫu nhiên cho n người nhận đầu tiên |
| Custodial | Mô hình dự án giữ token thay người dùng; người dùng có số dư trong sổ cái và rút khi muốn |

---

## 18. Phụ lục

### 18.1 Địa chỉ hợp đồng và ví (điền sau khi deploy)

| Tên | Địa chỉ | Verify trên BscScan |
|---|---|---|
| LIXI Token | `[[ĐIỀN]]` | `[[link]]` |
| Vesting | `[[ĐIỀN]]` | `[[link]]` |
| Ví nóng Lì Xì Bot / địa chỉ nạp | `[[ĐIỀN]]` | — |
| Hợp đồng đổi quà (v3) | `[[ĐIỀN]]` | `[[link]]` |
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
| v0.2 | 2026-09 | Điền use case LiXi, sản phẩm Lì Xì Bot, kiến trúc, tiện ích, roadmap, rủi ro |
| v1.0 | `[[ĐIỀN]]` | Chốt đội ngũ, địa chỉ ví, audit |
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
