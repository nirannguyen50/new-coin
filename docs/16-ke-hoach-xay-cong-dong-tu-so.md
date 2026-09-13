# Kế hoạch xây cộng đồng từ số 0, không dùng quan hệ cá nhân

> Thay cho `growth/07` (bộ tin gieo hạt cho người quen). Bối cảnh: chủ dự án **không quen admin nhóm nào**,
> và không muốn liên hệ đồng nghiệp công ty cũ. Mọi cộng đồng phải xây mới hoàn toàn.
> Khảo sát ngày 13/9/2026: nhóm lớn nhất chủ dự án đang tham gia chỉ có 12 thành viên, không nhóm nào đạt mốc 30.

## 1. Một điều phải nói thẳng trước khi lập kế hoạch

Lì Xì Bot là **công cụ cho cộng đồng đã có sẵn**, không phải là một cộng đồng. Khách hàng thật của nó là
**admin của các nhóm Telegram đang hoạt động**, không phải thành viên lẻ.

Vì vậy "xây dựng nhóm" theo nghĩa gom người lạ vào một nhóm mới rồi cho họ dùng bot là đi đường vòng:
tốn nhiều tháng để có thứ mà một admin nhóm 300 người đã có sẵn.

Nhưng có **đúng một nhóm bắt buộc phải tự xây**, và nó là nhu cầu sản phẩm chứ không phải marketing:

> **Nhóm demo công khai.** Không admin nào thêm một bot lạ vào nhóm thật của mình nếu chưa thử được.
> Phải có một nơi bất kỳ ai cũng vào thử tip, mở bao lì xì, xem bot phản hồi ra sao, trước khi quyết định.

Nhóm demo đồng thời là: bằng chứng bot chạy thật, nơi để dẫn admin quan tâm tới, và tập dữ liệu thật đầu tiên.
Kế hoạch này vì vậy xây nhóm demo trước, rồi đi tìm admin ở nơi họ vốn đã tụ tập.

## 2. Mốc thời gian quyết định: Tết 6/2/2027

Hôm nay 13/9/2026. Còn **21 tuần** tới mùng 1 Tết Đinh Mùi.

Sản phẩm tên "Lì Xì" có đỉnh mùa vụ tự nhiên vào Tết. Đây là lợi thế lớn nhất và cũng là hạn chót thật:

| Nếu tới Tết 2027 | Kết quả |
|---|---|
| Đã có 5–10 nhóm dùng đều | Tết là cú hích, mỗi nhóm mở hàng chục bao lì xì, vòng lan truyền chạy mạnh nhất |
| Chưa có nhóm nào | Mất trọn mùa vụ, phải chờ Tết 2028, tức thêm 12 tháng |

Toàn bộ kế hoạch dưới đây lùi ngược từ mốc này.

## 3. Bốn giai đoạn

### Giai đoạn 0 — Dựng mặt tiền (tuần 1)

Không đi mời ai khi chưa có gì để xem. Cần đủ ba thứ:

| Thứ | Vì sao bắt buộc |
|---|---|
| Trang web công khai giới thiệu bot | Admin sẽ tìm hiểu trước khi thêm bot; không có trang nào để xem là mất lòng tin ngay |
| Nhóm demo công khai, ghim hướng dẫn thử | Cho phép thử trước khi cam kết; đây là thứ thay thế cho "quen biết" |
| Kênh thông báo đã có nội dung | Kênh trống trơn trông như bị bỏ hoang |

### Giai đoạn 1 — Tìm admin ở nơi họ vốn tụ tập (tuần 2–5)

Không nhắn tin cho người lạ. Thay vào đó **đăng nội dung có giá trị** ở nơi công khai mà admin nhóm và
người mê công nghệ Việt Nam đã ở sẵn, rồi để ai quan tâm tự tìm đến.

Loại nơi cần tìm (Cowork tự xác minh còn hoạt động, không tin danh sách cũ):

- Diễn đàn công nghệ Việt Nam (voz, Tinhte), nền tảng viết cho lập trình viên Việt (Viblo, Spiderum)
- Nhóm Facebook về công nghệ, về quản trị cộng đồng, về Telegram
- Cộng đồng quốc tế về bot Telegram (Reddit r/TelegramBots, r/Telegram)
- Danh bạ bot Telegram, danh sách "awesome telegram bots" trên GitHub
- Nơi giới thiệu sản phẩm mới (kiểu Product Hunt)

**Quy tắc sống còn:** mỗi cộng đồng có luật riêng về tự quảng cáo. Đọc luật trước. Vi phạm là bị khóa tài khoản,
và một khi danh tính bị đánh dấu spam thì không lấy lại được. Thà đăng 3 nơi đúng luật còn hơn 20 nơi bị xoá.

**Góc tiếp cận mạnh nhất là mã nguồn mở.** Repo công khai, bot miễn phí, điểm không phải tiền. Câu chuyện
"tôi viết một bot lì xì mã nguồn mở cho nhóm Telegram người Việt" là thứ cộng đồng lập trình viên thật sự quan tâm,
khác hẳn một quảng cáo.

### Giai đoạn 2 — Lặp và đo (tuần 6–13)

Mỗi tuần: đăng nội dung, xem `/thongke`, ghi số vào `growth/03`, giữ lại nơi nào ra người dùng, bỏ nơi nào không.

Chỉ số duy nhất: **số nhóm có giao dịch trong 7 ngày**. Mọi thứ khác là phù phiếm.

| Cuối tuần 13 | Kết luận |
|---|---|
| ≥ 3 nhóm hoạt động | Vòng lặp chạy. Dồn toàn lực cho chiến dịch Tết |
| 1–2 nhóm | Có tín hiệu yếu. Phỏng vấn chính những admin đó xem thiếu gì, sửa sản phẩm |
| 0 nhóm sau khi đã thử ≥ 8 nơi và sửa nội dung 2 lần | Người dùng không cần thứ này. Dừng trước khi đổ tiền vào token |

### Giai đoạn 3 — Chiến dịch Tết (tuần 14–21, tới 6/2/2027)

Chuyển thông điệp từ "bot thưởng thành viên" sang "lì xì online cho nhóm dịp Tết". Đây là lúc sản phẩm
tự giải thích: mọi người Việt đều hiểu lì xì mà không cần ai giảng.

Chuẩn bị trước: bộ nội dung Tết, mẫu bao lì xì theo dịp, hướng dẫn admin tổ chức lì xì đầu năm cho nhóm.

## 4. Việc gì tuyệt đối không làm

- Tạo tài khoản giả, mua thành viên, bot đi tự động vào nhóm người khác.
- Nhắn tin riêng cho người lạ chưa từng tương tác.
- Đăng cùng một đoạn quảng cáo vào hàng loạt nơi. Vừa bị đánh dấu spam, vừa mất uy tín.
- Đăng vào nhóm mà mình không phải admin và luật nhóm cấm quảng cáo.
- Nói bóng gió về giá, lợi nhuận, hay việc token sắp lên sàn. Điểm LIXI hiện không phải tiền.
- Liên hệ đồng nghiệp công ty cũ. Chủ dự án đã quyết định không đụng tới nhóm quan hệ này.

## 5. Vì sao không mua quảng cáo

Chưa có bằng chứng ai muốn dùng. Trả tiền để đẩy một sản phẩm chưa được kiểm chứng chỉ làm ta mất tiền
nhanh hơn mà vẫn không biết vì sao thất bại. Khi nào có 3 nhóm dùng đều và hiểu vì sao họ thích, lúc đó
quảng cáo mới có nghĩa.
