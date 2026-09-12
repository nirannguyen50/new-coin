# Kế hoạch tăng trưởng gần như không cần con người

> Mục tiêu: có cộng đồng dùng bot thật mà chủ dự án chỉ mất **15 phút mỗi tuần**.
> Cách làm: để chính cái bot tự lan truyền qua việc sử dụng, agent lo toàn bộ phần chuẩn bị,
> con người chỉ gieo vài hạt đầu tiên và bấm những nút mà nền tảng bắt buộc người thật bấm.

## 1. Ranh giới: cái gì tự động được, cái gì không

| Tự động được, agent làm hết | Không làm, kể cả khi làm được |
|---|---|
| Đặt lời mời "thêm bot vào nhóm bạn" ngay trong tin nhắn bot gửi ở nhóm đang dùng | Tài khoản giả người đi nhắn tin cho admin nhóm lạ |
| Bot tự hướng dẫn admin khi được thêm vào nhóm mới | Vào nhóm người khác đăng quảng cáo |
| Viết sẵn toàn bộ nội dung 30 ngày, trang hướng dẫn, hồ sơ đăng ký danh bạ bot | Mua follower, mua thành viên, tạo tương tác giả |
| Thống kê tự động để chủ dự án biết đang tăng hay không | Hứa hẹn giá trị tiền, nói bóng gió "sắp lên sàn" |
| Bảng xếp hạng, gợi ý lì xì theo dịp để nhóm dùng nhiều hơn | Tạo cảm giác khan hiếm, FOMO |

Lý do không làm cột phải: Telegram khóa tài khoản tự động rất nhanh, và một dự án crypto bị lộ dùng AI giả người
là dự án mất sạch lòng tin. Lòng tin là tài sản duy nhất dự án này có.

## 2. Cơ chế lõi: vòng lặp tự lan truyền

```
   Nhóm A dùng bot
        │
        ▼
   Ai đó mở bao lì xì, 5 người bấm nhận
        │
        ▼
   Tin nhắn "đã nhận đủ" có nút  ➕ Thêm Lì Xì Bot vào nhóm của bạn
        │
        ▼
   Một người trong 5 người đó là admin nhóm B, bấm nút, 1 chạm
        │
        ▼
   Bot vào nhóm B, tự đăng hướng dẫn 3 lệnh đầu tiên
        │
        ▼
   Nhóm B dùng bot  ──────────────────────────────►  lặp lại
```

Mỗi bao lì xì là một lần quảng cáo tự nhiên, gửi đúng lúc người ta vừa nhận được thứ vui.
Không ai phải đi mời ai. Bot ghi lại nhóm B đến từ nhóm A để biết vòng lặp có chạy không.

## 3. Phân công agent

| Agent | Việc | Đầu ra | Trạng thái |
|---|---|---|---|
| A. Sản phẩm | Nút thêm bot một chạm, tự hướng dẫn khi vào nhóm mới, ghi nguồn giới thiệu, `/huongdan`, `/bxh` bảng xếp hạng 7 ngày, `/thongke` cho chủ dự án | Code trong `bot/`, có test | Đang làm |
| B. Nội dung | Trang "Thêm bot trong 2 phút", thư viện 30 bài đăng, hồ sơ đăng ký danh bạ bot, bộ 10 tin nhắn gieo hạt, checklist 15 phút/tuần | `website/them-bot.html`, `growth/05`–`08` | Đang làm |
| C. Vận hành (định kỳ) | Mỗi tuần đọc `/thongke`, so với tuần trước, đề xuất chỉnh nội dung hoặc tính năng dựa trên số liệu thật | Báo cáo ngắn | Chạy khi có dữ liệu |

## 4. Phần con người, tối thiểu thật sự

Không thể bỏ, vì nền tảng bắt buộc hoặc vì cần một người thật chịu trách nhiệm:

| Việc | Mất bao lâu | Bao nhiêu lần |
|---|---|---|
| Tạo một kênh Telegram công khai cho bot, cho bot làm admin | 3 phút | 1 lần |
| **Tạo bot mới với username tử tế** (Telegram KHÔNG cho đổi username bot đã tạo — chỉ đổi được tên hiển thị). Username hiện tại chứa chữ "test", nhìn là biết chưa nghiêm túc, admin nhóm sẽ ngại thêm. Tạo bot mới qua BotFather, đổi `TELEGRAM_BOT_TOKEN` trên Vercel, mở lại `/api/setup`. **Làm ngay bây giờ hoặc không bao giờ:** dữ liệu nằm trong database theo từng nhóm nên không mất gì, nhưng khi đã có nhóm thật thêm bot cũ thì đổi đồng nghĩa bỏ lại họ | 10 phút | 1 lần |
| Gửi tin nhắn gieo hạt cho admin của 3 đến 5 nhóm **mình đang là thành viên** (mẫu có sẵn) | 10 phút | 1 lần |
| Bấm nút "gửi" ở vài danh bạ bot yêu cầu người thật (hồ sơ soạn sẵn) | 10 phút | 1 lần |
| Đọc `/thongke`, đăng 7 bài từ thư viện, trả lời admin nếu có | 15 phút | mỗi tuần |

Tổng: khoảng 30 phút một lần, rồi 15 phút mỗi tuần. Đó là mức thấp nhất mà một dự án thật có thể xuống tới.

## 5. Chỉ số duy nhất cần nhìn

**Số nhóm có giao dịch trong 7 ngày gần nhất.** Lệnh `/thongke` in ra con số này.

| Tuần | Nếu số nhóm hoạt động là | Nghĩa là |
|---|---|---|
| 4 | 0 | Vòng lặp chưa chạy, xem lại nội dung lời mời hoặc chọn loại nhóm khác |
| 4 | 1–2 | Có tín hiệu, tiếp tục, chưa đổi gì |
| 8 | ≥ 3, tuần sau cao hơn tuần trước | Vòng lặp đang chạy; đủ điều kiện 1 của `docs/11` để tính chuyện token thật |
| 8 | vẫn ≤ 2 | Sản phẩm chưa đủ hấp dẫn; sửa sản phẩm, không đổ tiền vào token |

## 6. Điều kiện dừng

Nếu sau 8 tuần vòng lặp không chạy dù nội dung và sản phẩm đã chỉnh hai lần, kết luận trung thực là
người dùng không cần thứ này, và dừng trước khi bỏ tiền vào thanh khoản. Đó không phải thất bại của kế hoạch,
đó chính là mục đích của việc làm bot trước, token sau.
