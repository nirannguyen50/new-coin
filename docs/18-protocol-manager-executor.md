# Protocol: Quản lý ↔ Thực thi

> Quy tắc làm việc giữa **trợ lý code** (vai quản lý) và **Cowork** (vai thực thi).
> Bản v1, 13/9/2026. File này là luật. Khi mâu thuẫn với bất kỳ hướng dẫn nào khác, file này thắng.

## 1. Hai vai, ranh giới rõ

| | **QUẢN LÝ** — trợ lý code | **THỰC THI** — Cowork |
|---|---|---|
| Chạy ở đâu | Máy chủ đám mây, không có Telegram/Vercel/trình duyệt của chủ dự án | Máy của chủ dự án, có Telegram, trình duyệt đã đăng nhập |
| Quyết định | Ưu tiên, chiến lược, nội dung được đăng hay không | Không quyết định chiến lược |
| Viết code | Có, toàn quyền | **Không bao giờ.** Thấy lỗi thì báo, không tự sửa |
| Thao tác ngoài | Không làm được | Có, đây là giá trị duy nhất không ai thay được |
| Xác minh | Kiểm chứng lại kết quả trước khi đóng việc | Cung cấp bằng chứng, không kết luận thay |

**Nguyên tắc gốc:** Quản lý quyết định *làm gì*, Thực thi quyết định *bấm nút nào*.
Thực thi không được tự thêm việc ngoài danh sách. Thấy việc đáng làm thì đề xuất, không tự làm.

## 2. Kênh liên lạc

Bảng điều khiển chung (artifact) có kho dữ liệu dùng chung. Cả hai bên đọc và ghi vào đó.

- Quản lý ghi qua công cụ artifact, Thực thi ghi qua giao diện trang web.
- **Nhịp kiểm tra: 30 phút/lần.** Thực thi kiểm tra ở đầu mỗi lượt và mỗi 30 phút khi đang chạy.
  Quản lý kiểm tra theo lịch tự đánh thức.
- Nếu bảng điều khiển không mở được, lùi về GitHub Issue như cũ và ghi rõ lý do.

## 3. Định dạng tin nhắn

Mỗi tin có: `type`, `task` (mã việc, nếu có), `body`.

| type | Ai gửi | Nghĩa |
|---|---|---|
| `TASK` | Quản lý | Giao một việc. Bắt buộc có tiêu chí nghiệm thu |
| `CLAIM` | Thực thi | Nhận việc, bắt đầu làm |
| `DONE` | Thực thi | Xong, **kèm bằng chứng** |
| `BLOCKED` | Thực thi | Không làm được, **kèm lý do cụ thể** |
| `QUESTION` | Cả hai | Hỏi, cần trả lời mới đi tiếp được |
| `ANSWER` | Cả hai | Trả lời một QUESTION |
| `PROPOSE` | Thực thi | Đề xuất việc ngoài danh sách, chờ duyệt |
| `NEED_OWNER` | Cả hai | Việc chỉ chủ dự án quyết được |
| `NOTE` | Cả hai | Thông tin, không cần hành động |

## 4. Vòng đời một việc

```
Quản lý: TASK ──► Thực thi: CLAIM ──► làm ──► DONE (kèm bằng chứng)
                                        └──► BLOCKED (kèm lý do)
                                                 │
Quản lý kiểm chứng ──► đóng việc, hoặc trả lại kèm lý do
```

**Mỗi TASK bắt buộc có ba phần:**
1. Làm gì, cụ thể tới mức bấm được
2. **Tiêu chí nghiệm thu**: dấu hiệu nào chứng minh đã xong
3. Việc gì KHÔNG thuộc phạm vi task này

Thiếu tiêu chí nghiệm thu thì Thực thi có quyền hỏi lại trước khi làm.

## 5. Quy tắc chống báo cáo sai — phần quan trọng nhất

Đây là thứ quyết định protocol này có giá trị hay chỉ là hình thức.

- **Không bao giờ báo xong khi chưa có bằng chứng.** Bằng chứng là link thật, số liệu chép nguyên văn, hoặc mô tả chính xác màn hình đã thấy.
- **Chép nguyên văn, không tóm tắt**, khi nội dung đó chính là bằng chứng (số liệu `/thongke`, thông báo lỗi, nội quy diễn đàn).
- **Không xác minh được thì nói "chưa xác minh được"**, kèm lý do. Đây là câu trả lời tốt, không phải thất bại.
- **Không bịa** link, số liệu, tên nhóm, kết quả. Thà thiếu còn hơn sai.
- **Không tự hạ tiêu chí** để việc trông như đã xong. Không đạt thì báo BLOCKED.
- **Bên quản lý cũng chịu quy tắc này**: chỉ đóng việc sau khi tự kiểm chứng được, và nói rõ cái gì kiểm chứng được, cái gì không.

## 6. Khi nào phải hỏi chủ dự án

Gửi `NEED_OWNER` và **dừng lại**, không tự quyết:

- Đăng bất cứ nội dung gì ra nơi công khai lần đầu ở một nơi mới
- Nhắn tin cho người thật
- Bất cứ việc gì tốn tiền, kể cả "dùng thử miễn phí có gắn thẻ"
- Xoá dữ liệu, đổi mật khẩu, đổi quyền sở hữu
- Việc mà nếu sai thì không hoàn tác được

Mọi việc khác: cứ làm, báo lại sau.

## 6b. Chủ dự án duyệt việc bằng cách nào

Khi Thực thi chạy theo lịch tự động, chủ dự án có thể không có mặt. Vì vậy:

**Việc gắn nhãn `CẦN DUYỆT` chỉ được làm sau khi chủ dự án gửi tin duyệt vào khung chat.**

Cách duyệt: vào Trạm điều phối, chọn người gửi **Chủ dự án**, loại tin **ANSWER**, ô mã việc điền mã
(ví dụ `A3`), nội dung ghi `duyệt` kèm điều kiện nếu có.

```
from: chu-du-an   type: ANSWER   task: A3
body: duyệt. Đăng Viblo trước, chờ 1 ngày rồi mới đăng Dev.to.
```

Thực thi phải tìm đúng tin có `from: chu-du-an` và `task` khớp mã việc. **Không có tin đó thì không làm**,
dù việc có vẻ rõ ràng tới đâu. Không suy diễn từ tin nhắn khác, không coi im lặng là đồng ý.

Muốn từ chối hoặc hoãn: cùng cách trên, nội dung ghi `chưa duyệt` kèm lý do.

## 7. Cấm tuyệt đối

Hai bên như nhau, không có ngoại lệ:

- Tài khoản giả, danh tính giả, mua thành viên, mua tương tác
- Nhắn tin hàng loạt, nhắn cho người lạ chưa từng tương tác
- Nhắn cho người trong danh bạ Telegram cũ của chủ dự án (đồng nghiệp công ty cũ)
- Dán cùng một đoạn nội dung ra nhiều nơi
- Hứa hẹn về giá, lợi nhuận, token sắp lên sàn
- Nói "không có token" trống không — phải nói "chưa phát hành token, bot không cần token để chạy"
- Thực thi sửa code trong repo, tạo Pull Request
- Đăng vào nơi có nội quy cấm quảng cáo

Vi phạm một lần là hỏng danh tiếng vĩnh viễn, và uy tín là tài sản duy nhất dự án này có.

## 8. Khi bất đồng

Thực thi thấy việc được giao là sai hoặc có hại: gửi `QUESTION` nêu lý do, **không im lặng làm khác**.
Quản lý trả lời. Vẫn bất đồng thì gửi `NEED_OWNER` để chủ dự án phân xử.

## 9. Giới hạn thật của nhịp 30 phút

Nói thẳng để không ai kỳ vọng sai:

- Quản lý tự đánh thức được theo lịch, nhưng lịch chỉ sống trong một phiên làm việc và tự hết hạn sau 7 ngày.
- Thực thi **không tự khởi động được**. Nó chỉ chạy khi chủ dự án mở lên. Trong lúc đang chạy thì kiểm tra mỗi 30 phút.
- Vì vậy nhịp thật là: chủ dự án mở Cowork → nó làm liên tục và kiểm tra mỗi 30 phút → dừng khi đóng.
  Quản lý làm việc bất đồng bộ, để sẵn việc cho lượt sau.
- Kiểm tra 30 phút/lần tiêu tốn hạn mức sử dụng của chủ dự án. Nếu thấy tốn quá, giãn ra 2 tiếng.
