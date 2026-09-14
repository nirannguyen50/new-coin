# Đường tới doanh thu

> Viết 14/9/2026 bởi Quản lý, theo thẩm quyền duyệt ở `docs/20`. Nguyên liệu: `growth/10` (khảo sát 4 bot
> tương tự), `docs/11` (off-chain trước), `docs/16` (kế hoạch cộng đồng).
>
> **Tài liệu này chọn HƯỚNG, không chốt GIÁ.** Giá chỉ điền được khi đã có người dùng thật để hỏi. Mọi ô
> giá trong đây để trống có chủ ý — điền vào lúc này là bịa.

## 1. Sự thật hiện tại, nói thẳng

| | |
|---|---|
| Nhóm có bot | 4 — đều là nhóm test của chủ dự án |
| Người dùng thật | **0** |
| Doanh thu | **0**, và chưa có cơ chế nào để thu |

Không có gì để bán cho ai cả. Mọi thứ dưới đây là *chuẩn bị hướng*, để bot được xây về đúng phía,
chứ không phải kế hoạch bán hàng có thể thực thi tuần này.

## 2. Ba hướng, và vì sao loại hai

| Hướng | Cách thu | Vì sao loại / giữ |
|---|---|---|
| **A. Thu phí trên mỗi lần tip** | Cắt % mỗi giao dịch, như sàn | **Loại.** `growth/10`: không bot nào trong nhóm khảo sát thu phí tip giữa thành viên. Tip là mồi để nhóm sôi động; thu phí trên mồi thì nhóm tắt. Ngoài ra điểm hiện không có giá trị tiền thật nên không có gì để cắt. |
| **B. Thu khi rút ra tiền thật** | Phí rút, như Wallet (3.5 USDT/lần TRC-20) | **Loại ở giai đoạn này.** Đòi ví thật, tức là on-chain, tức là phải đạt đủ ba điều kiện `docs/11` — chưa đạt điều nào. Còn kéo theo pháp lý tiền tệ ở Việt Nam (`docs/08`). Để dành, không xoá. |
| **C. Gói công cụ cho admin nhóm** | Nhóm dùng miễn phí đủ xài; admin muốn thêm thì trả theo tháng | **GIỮ.** Mô hình Combot (Free/Pro/Business). Không đụng tiền người dùng cuối, không đụng blockchain, không đụng pháp lý tiền tệ. Bán cho người đã thấy bot có ích — admin, không phải thành viên. |

**Hướng đã chọn: C.**

## 3. Hướng C cụ thể: bán gì cho admin

Bot hiện đã có sẵn phần lớn thứ admin cần — `/caidat`, `/thuong`, `/pot`, `/bxh`, `/thongke`. Gói trả phí
**không được là khoá bớt thứ đang miễn phí**. Nó phải là thứ chưa có và chỉ admin nhiều nhóm mới cần:

| Tầng | Ai dùng | Có gì |
|---|---|---|
| **Miễn phí** (mãi mãi) | Mọi nhóm | Toàn bộ chức năng hôm nay: lì xì, tip, điểm thưởng, chống lạm dụng, `/bxh`, `/thongke`. Không giới hạn thành viên. |
| **Gói admin** (chưa đặt giá) | Admin muốn thêm | Nhiều luật thưởng tuỳ biến hơn; thống kê theo tuần/tháng xuất được; quản lý nhiều nhóm từ một chỗ; đổi tên/nhãn điểm theo nhóm; hỗ trợ trả lời trong 24h |

**Ba việc tuyệt đối không làm khi dựng gói:** không hạ tính năng đang miễn phí xuống để ép mua; không giới
hạn số thành viên (giết đúng thứ đang cần là nhóm to); không hứa điểm sẽ có giá trị tiền.

Nhận tiền: USDT BEP-20 về địa chỉ ở `status/thanh-toan` theo `docs/20`. **Không tự động hoá khâu nhận
tiền** ở bản đầu — admin chuyển, chủ dự án xác nhận tay, Quản lý ghi sổ. Tự động hoá khi nào có ≥5 người trả.

## 4. Ba cửa phải qua, theo thứ tự — không nhảy cóc

| Cửa | Điều kiện qua | Trạng thái |
|---|---|---|
| **Cửa 1 — Có người lạ dùng** | ≥1 nhóm KHÔNG phải của chủ dự án dùng bot ≥7 ngày liên tục, có số trong `/thongke` | ❌ Chưa. Đây là thứ duy nhất đáng làm hôm nay. |
| **Cửa 2 — Có người ở lại** | ≥3 nhóm người lạ dùng đều ≥4 tuần. Rồi **hỏi thẳng từng admin**: "nếu có bản trả phí, anh sẽ trả cho thứ gì?" | ❌ Chưa mở |
| **Cửa 3 — Có người trả** | ≥1 admin trả tiền thật sau khi đã dùng bản miễn phí. Lúc này mới điền giá vào mục 3 | ❌ Chưa mở |

Chưa qua Cửa 1 thì **không viết thêm dòng code nào cho gói trả phí**. Không dựng trang giá, không dựng
thanh toán, không nhắc chuyện tiền với bất kỳ ai. Mọi công sức đổ vào đúng một việc: kiếm nhóm thật đầu tiên.

## 5. Cửa dừng

Theo `docs/16` mục 3: nếu đã thử ≥8 nơi đăng ký, sửa nội dung 2 lần, mà tới tuần 13 vẫn **0 nhóm người lạ**
— thì kết luận là không ai cần thứ này. Dừng, không đổ thêm tiền, không phát hành token. Điều đó không thay
đổi vì có tài liệu này.

## 6. Cái này nối vào kế hoạch token cũ thế nào

`docs/00`–`docs/10` (token, Binance, whitepaper) đã bị `docs/11` thay thế. Tài liệu này **không hồi sinh**
chúng. Thứ tự đúng là: người dùng thật → admin trả tiền → *rồi mới* cân nhắc on-chain nếu có lý do sản phẩm
thật, không phải vì muốn có token. Token là thứ đắt nhất và rủi ro nhất trong repo này; nó đứng cuối hàng.

## 7. Cần chủ dự án quyết, khi tới lúc

Chưa cần quyết gì hôm nay. Khi qua Cửa 3 sẽ cần: mức giá, và có xuất hoá đơn / kê khai thuế hay không
(`docs/08`). Quản lý sẽ hỏi lúc đó, kèm số liệu, không hỏi trước.
