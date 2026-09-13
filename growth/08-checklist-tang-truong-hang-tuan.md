# Checklist tăng trưởng hằng tuần — 15 phút, một người, một lần mỗi tuần

> Đây là toàn bộ phần "con người" định kỳ của `docs/14` mục 4. Làm vào **cùng một ngày, cùng một giờ mỗi tuần**
> (gợi ý: tối Chủ nhật hoặc sáng thứ Hai). Không làm thêm việc gì ngoài danh sách này, kể cả khi số liệu xấu — sửa gì
> thì ghi vào mục "việc cho tuần sau" và làm ở một phiên khác, không lẫn vào 15 phút này.
>
> Tài liệu liên quan: thư viện bài `growth/05`, danh sách nơi đăng ký `growth/06`, bộ tin gieo hạt `growth/07`,
> bảng số liệu `growth/03-kpi-dashboard-template.csv`.

## Chỉ số duy nhất quyết định

**Số nhóm có giao dịch trong 7 ngày gần nhất** — dòng "Nhóm hoạt động 7 ngày qua" trong `/thongke`.

Số nhóm *có bot* chỉ nói bot được thêm vào; số nhóm *hoạt động* mới nói có người dùng thật. Mọi việc trong checklist này
tồn tại để làm con số đó tăng đều tuần này qua tuần khác. Ngưỡng đọc số (theo `docs/14` mục 5):

| Sau tuần | Nhóm hoạt động 7 ngày | Nghĩa là | Làm gì |
|---|---|---|---|
| 4 | 0 | Vòng lặp chưa chạy | Xem lại lời mời trong bot và trang hướng dẫn; đổi loại nhóm gieo hạt |
| 4 | 1–2 | Có tín hiệu | Tiếp tục y nguyên, không đổi gì |
| 8 | ≥ 3 và tuần sau cao hơn tuần trước | Vòng lặp đang chạy | Đủ điều kiện 1 của `docs/11`; bắt đầu bàn chuyện token thật |
| 8 | ≤ 2 | Sản phẩm chưa đủ hấp dẫn | Sửa sản phẩm theo phản hồi admin; **không** đổ tiền vào token |

## Checklist 15 phút

Đánh dấu từng ô. Thời gian là trần, không phải mục tiêu — xong sớm thì dừng.

### 1. Đọc số — 3 phút

- [ ] Mở chat riêng với bot, gõ `/thongke` (chỉ chủ bot, tài khoản trong `BOT_SUPER_ADMIN_IDS`, chạy được trong chat riêng).
- [ ] Chép 6 con số vào bảng ở mục "Ghi số" bên dưới: nhóm đang có bot · **nhóm hoạt động 7 ngày** · thành viên đã thấy ·
      bao lì xì đã mở 7 ngày · điểm đã tip 7 ngày · nhóm đến từ nút "Thêm vào nhóm".
- [ ] So với tuần trước, trả lời đúng một câu: *nhóm hoạt động tăng, giữ, hay giảm?* Ghi một chữ.
- [ ] Nếu `/thongke` lỗi hoặc bot không trả lời: ghi "không lấy được số", mở `/api/telegram` xem bot còn sống không
      (`bot/README.md`, mục "Nếu bot không trả lời"), và dừng checklist ở đây — tuần này việc duy nhất là làm bot sống lại.

### 2. Đăng 7 bài — 5 phút

- [ ] Lấy 7 bài tiếp theo trong `growth/05` (theo lịch mục 4 của file đó, hoặc đánh dấu bài đã dùng).
- [ ] Bài "tuần này thay đổi gì": điền `[[SỐ]]` bằng số vừa chép từ `/thongke`, điền `[[thay đổi …]]` bằng việc thật
      (đọc `git log` tuần qua nếu cần). Không có thay đổi thì viết "tuần này không đổi gì".
- [ ] Thay `https://t.me/lixi_vn_bot?startgroup=true`, `https://new-coin-orcin.vercel.app`, `https://t.me/lixibot_kenh` nếu bài có.
- [ ] Dùng tính năng **hẹn giờ đăng** của Telegram (giữ nút gửi → "Schedule message") để rải 7 bài ra 7 ngày, 20:00.
      Không đăng dồn một lúc.
- [ ] Kiểm tra nhanh trước khi bấm: không chữ nào về giá/tiền/lợi nhuận, số nào cũng có nguồn, không hứa gì.

### 3. Gieo hạt — tối đa 2 tin, 3 phút

- [ ] Còn admin nào trong danh sách "nhóm mình đang là thành viên và quen admin" chưa nhắn? Chọn **tối đa 2**.
- [ ] Dùng mẫu đúng loại nhóm trong `growth/07`; đổi xưng hô cho thật; gửi. Không nhắn người lạ, không nhắn lại người đã im lặng.
- [ ] Ghi vào bảng "Gieo hạt" bên dưới: ngày, nhóm, mẫu số mấy, kết quả (chờ / đồng ý / từ chối / im lặng).
- [ ] Hết danh sách thì bỏ mục này và để vòng lặp trong bot tự chạy. **Không** đi tìm nhóm lạ để nhắn.

### 4. Trả lời admin — 3 phút

- [ ] Mở kênh nhận phản hồi (`https://t.me/lixibot_kenh`, bình luận kênh, tin nhắn từ admin đã đồng ý dùng). Trả lời mọi câu hỏi
      còn treo — ngắn, thật, không hứa ngày.
- [ ] Admin nào đã dùng đủ 2 tuần: hỏi đúng một câu "giữ hay gỡ?". Từ chối thì hỏi "vì sao?" và ghi lại nguyên văn.
- [ ] Có báo lỗi: ghi vào "việc cho tuần sau", trả lời "đã ghi nhận" — không sửa ngay trong 15 phút này.
- [ ] Có báo lừa đảo / bot giả: đây là ngoại lệ duy nhất được vượt khung giờ — ghim cảnh báo (mẫu Ngày 4 hoặc Ngày 27
      trong `growth/05`) ngay.

### 5. Ghi số — 1 phút

- [ ] Thêm một dòng vào `growth/03-kpi-dashboard-template.csv`. File này có cột theo tháng; cách ghi theo tuần mà
      không đổi cấu trúc file: cột `thang` ghi `2026-W38` (năm-Wtuần ISO), cột `trang_thai` ghi `WEEKLY`, các cột không có
      số thì để `0`, và ghi phần còn lại vào `ghi_chu`. Ánh xạ:

| Con số từ `/thongke` | Cột trong CSV |
|---|---|
| Nhóm hoạt động 7 ngày qua | `cong_dong_co_pot_hoat_dong` |
| Bao lì xì đã mở 7 ngày + số lệnh tip (nếu ghi được) | `li_xi_gui_tuan_tb` |
| Thành viên đã thấy | `vi_nhan_duy_nhat_luy_ke` (tạm dùng cột này; bản off-chain chưa có ví) |
| Nhóm đang có bot · nhóm đến từ nút giới thiệu · điểm đã tip | `ghi_chu`, dạng `co_bot=12; gioi_thieu=3; diem_tip=4500` |
| Thành viên kênh Telegram công khai | `telegram_thanh_vien` |

- [ ] Dòng cuối cùng của file là dòng mới nhất. Không sửa dòng cũ.

## Sổ tuần (điền ngay trong 15 phút)

### Ghi số

| Tuần (ISO) | Nhóm có bot | **Nhóm hoạt động 7 ngày** | Thành viên đã thấy | Bao đã mở 7 ngày | Điểm đã tip 7 ngày | Nhóm từ nút giới thiệu | Tăng/giữ/giảm |
|---|---|---|---|---|---|---|---|
| | | | | | | | |
| | | | | | | | |
| | | | | | | | |
| | | | | | | | |

### Gieo hạt

| Ngày | Nhóm | Mẫu (# trong `growth/07`) | Kết quả | Lý do từ chối (nguyên văn) |
|---|---|---|---|---|
| | | | | |
| | | | | |

### Việc cho tuần sau (không làm trong 15 phút này)

- [ ] `[[...]]`
- [ ] `[[...]]`

## Những việc **không** nằm trong checklist

- Không xem số mỗi ngày. Số theo ngày nhảy loạn, số theo tuần mới có nghĩa.
- Không đăng thêm bài ngoài 7 bài. Kênh nhỏ đăng nhiều hơn không có ai đọc nhiều hơn.
- Không nhắn admin nhóm lạ, không vào nhóm người khác đăng bài, không mua thành viên/follower (`docs/14` mục 1).
- Không đổi tính năng bot vì một phản hồi đơn lẻ. Gom phản hồi 2–3 tuần, thấy lặp lại mới sửa.
- Không viết gì về giá, token, "sắp có gì" — kể cả khi admin hỏi. Câu trả lời sẵn ở `growth/07` mục 2.

## Mỗi 4 tuần (thêm 10 phút, làm một lần)

- [ ] Nhìn 4 dòng "Ghi số" liên tiếp. Đối chiếu bảng ngưỡng ở đầu file. Viết ba câu: số nói gì, tuần sau giữ gì, đổi gì.
- [ ] Đọc lại lý do từ chối trong bảng "Gieo hạt". Lý do nào xuất hiện ≥ 2 lần là việc sửa sản phẩm hoặc sửa trang hướng dẫn.
- [ ] Bài Ngày 28 trong `growth/05` (hỏi admin dùng gì nhiều nhất, bực gì nhất) — đọc câu trả lời, chọn đúng **một** việc cho tháng tới.
- [ ] Nếu đủ điều kiện dòng "tuần 8, ≥ 3 nhóm, tăng đều": mở `docs/11` và bắt đầu bàn hai điều kiện còn lại. Nếu chạm dòng
      "tuần 8, ≤ 2 nhóm" lần thứ hai: đọc `docs/14` mục 6 và quyết định thật thà.
