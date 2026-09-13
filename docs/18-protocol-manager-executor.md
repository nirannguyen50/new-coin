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

## 1b. Hai loại phiên Thực thi — phân biệt trước khi giao việc

Cowork chạy ở hai dạng, khả năng khác nhau hoàn toàn. Giao nhầm là việc bị chặn vô ích.

| | **Phiên trên máy** | **Phiên theo lịch, trên đám mây** |
|---|---|---|
| Khi nào | Chủ dự án mở Cowork trên máy mình | Routine tự chạy mỗi giờ |
| Telegram đã đăng nhập | Có | **Không** |
| Trình duyệt đã đăng nhập Vercel, GitHub, Facebook | Có | **Không** |
| Đọc web công khai, tìm kiếm, đọc tài liệu | Có | Có |
| Soạn nội dung, phân tích, đọc repo | Có | Có |

**Mọi thẻ việc phải ghi rõ `CẦN MÁY` hay không.**

Việc `CẦN MÁY`: mọi thứ đụng tới tài khoản thật — đăng nhập Vercel, tạo token GitHub, nhắn Telegram,
đăng bài lên diễn đàn cần tài khoản, thêm bot làm admin kênh.

Việc không cần máy: đọc nội quy diễn đàn, tra cứu, soạn bản nháp, phân tích số liệu công khai, đọc GitHub công khai.

**Quy tắc cho phiên theo lịch trên đám mây:** thấy thẻ `CẦN MÁY` thì **bỏ qua hoàn toàn** — không nhận việc,
không gửi `BLOCKED`. Việc đã được đánh dấu rồi; gửi `BLOCKED` mỗi giờ chỉ làm ngập khung chat và che mất
tin thật. Chỉ nhận những thẻ không có nhãn đó.

## 2. Kênh liên lạc

Bảng điều khiển chung (artifact) có kho dữ liệu dùng chung. Cả hai bên đọc và ghi vào đó.

- Quản lý ghi qua công cụ artifact, Thực thi ghi qua giao diện trang web.
- **Nhịp kiểm tra: mỗi giờ một lần.** Đây là nhịp dày nhất mà lịch tự đánh thức cho phép — đặt ngắn hơn
  sẽ bị từ chối. Hai bên lệch nhau để không đọc dở lượt của nhau: Thực thi ở phút 53, Quản lý ở phút 10 giờ kế tiếp.
  Thực thi khi chạy tương tác trên máy thì kiểm tra ở đầu mỗi lượt, không phải đợi tới giờ.
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

## 6b-2. Ai được viết với tên Chủ dự án

Chỉ chủ dự án. Thực thi — kể cả khi chạy trên tài khoản của chủ dự án — **không bao giờ** chọn người gửi
"Chủ dự án". Quản lý khi thấy tin `from: chu-du-an` có mốc giờ rơi đúng vào lúc Routine Thực thi đang
chạy thì coi là chưa duyệt và hỏi lại chủ dự án.

Chủ dự án cũng có thể duyệt bằng cách nói với Quản lý (trong phiên chat hoặc bình luận trên trang).
Khi đó Quản lý ghi tin duyệt vào khung chat thay, thêm `relayedBy: quan-ly` để phân biệt.

## 6d. Duyệt một lần cho cả loại việc

Mục tiêu là hai bên tự chạy không cần người. Nhưng mỗi lần đăng ra nơi mới mà phải chờ chủ dự án gõ
"duyệt" thì vòng lặp đứt ở đúng chỗ cần chạy nhất.

Vì vậy chủ dự án có thể **duyệt theo loại**, một lần, bằng tin `ANSWER` với `task` là mã loại:

| Mã loại | Bao gồm | Vẫn phải hỏi lại |
|---|---|---|
| `LOAI-DANG` | Đăng bài giới thiệu ở nơi đã xác minh nội quy cho phép, theo nội dung đã có trong repo | Nơi chưa xác minh; bài trả lời tranh cãi; bất cứ gì nhắc tới token |
| `LOAI-TRALOI` | Trả lời bình luận dưới bài đã đăng, đúng sự thật, không hứa hẹn | Bình luận hỏi về giá, lợi nhuận, pháp lý |

Tin duyệt loại có hiệu lực cho tới khi chủ dự án gửi `chưa duyệt` cùng mã loại. Việc đã có duyệt loại
thì Quản lý gắn nhãn `ĐÃ DUYỆT LOẠI` trên thẻ và Thực thi làm không cần hỏi. Không có tin duyệt loại
thì mọi thứ vẫn theo 6b.

## 6c. Khi cần Quản lý xử lý GẤP

Quản lý đọc khung chat theo lịch tự đánh thức mỗi giờ. Lịch đó nay là một Routine thật, nằm trong danh sách
Routines của chủ dự án, không tự hết hạn. Nhưng nó **gắn vào đúng một phiên làm việc của Quản lý**: phiên đó
đóng hoặc bị lưu trữ thì mỗi lần thức dậy đều rơi vào khoảng không. Và gửi tin vào khung chat **không**
đánh thức Quản lý — tin chỉ được đọc ở lần thức kế tiếp, chậm nhất là một giờ sau.

Có một kênh bền hơn, do dịch vụ artifact giữ chứ không phụ thuộc phiên nào:

> **Bình luận trên chính trang Trạm điều phối, và gửi bình luận đó cho Claude.**
> Việc này đánh thức Quản lý ngay cả khi lịch mỗi giờ đã chết.

Dùng khi nào:

| Tình huống | Làm gì |
|---|---|
| Báo cáo thường, việc xong xuôi | Gửi tin vào khung chat, đủ rồi |
| `BLOCKED` chặn không đi tiếp được | Tin vào khung chat **và** bình luận gửi cho Claude |
| `NEED_OWNER` | Tin vào khung chat, rồi báo chủ dự án |
| Quản lý im lặng quá 2 tiếng dù có tin `BLOCKED` | Bình luận gửi cho Claude, ghi rõ "lịch có thể đã chết" |

Nội dung bình luận chỉ cần một dòng: mã việc và lý do cần gấp. Chi tiết để trong khung chat.

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

## 9. Giới hạn thật của nhịp mỗi giờ

Nói thẳng để không ai kỳ vọng sai:

- Cả hai bên nay đều tự khởi động được theo lịch: Thực thi có Routine riêng chạy mỗi giờ trên đám mây,
  Quản lý có Routine riêng đánh thức phiên của mình mỗi giờ.
- Nhịp thật vì vậy là **một giờ**, không phải tức thời. Gửi tin xong thì chờ, đừng gửi lại.
- Phiên đám mây của Thực thi không đăng nhập tài khoản nào. Việc `CẦN MÁY` chỉ nhúc nhích khi chủ dự án
  mở Cowork trên máy mình. Xem mục 1b.
- Routine của Quản lý gắn vào một phiên cụ thể. Phiên đó chết thì lịch vẫn chạy nhưng không ai đọc.
  Khi nghi ngờ, dùng kênh bình luận ở mục 6c.
- **Nhịp sống:** mỗi lần thức, Quản lý ghi mốc giờ vào `status/heartbeat` (kể cả khi không có việc), và
  chép luôn lần chạy gần nhất của Routine Thực thi vào đó. Trang Trạm điều phối hiện hai mốc này ngay
  cạnh chấm "đã nối". Quản lý im quá 3 giờ thì dòng đó đổi màu đỏ.
- **Bộ giám sát dự phòng:** một Routine thứ ba, mỗi 4 giờ mở phiên mới hoàn toàn, chỉ đọc `status/heartbeat`.
  Quản lý còn sống thì nó thoát im lặng. Chết quá 3 giờ thì nó làm thay đúng một lượt (trả lời tin đang
  chờ, không sửa code, không giao việc mới) và báo chủ dự án bằng thông báo đẩy.
- Giờ chạy: Thực thi phút 53, Quản lý phút 10 giờ kế tiếp (17 phút sau, đủ để lượt Thực thi xong hẳn),
  giám sát phút 30 mỗi 4 giờ.
- Mỗi lần thức đều tiêu hạn mức sử dụng của chủ dự án, kể cả lượt không có việc gì. Thấy tốn thì giãn
  lịch ra 2 tiếng hoặc tạm tắt Routine.
