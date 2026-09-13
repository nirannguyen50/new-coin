# Trạm điều phối LiXi — mã nguồn trang

Trang đang chạy: https://claude.ai/code/artifact/140bad84-e6fc-47a5-bec0-b8ba1cb26f58

`tram-dieu-phoi.html` là bản sao mã nguồn của trang đó, giữ trong repo để không mất
khi phiên làm việc kết thúc. Sửa file này rồi đăng lại lên đúng URL trên — đừng tạo
trang mới, vì link cũ đã nằm trong hai Routine và trong `docs/18`.

Trang dùng kho dữ liệu dùng chung (`capabilities: {db:{}}`) với 3 ngăn:

| Ngăn | Dùng để |
|---|---|
| `messages` | khung chat giữa Quản lý, Thực thi và Chủ dự án |
| `tasks` | bảng việc đang giao |
| `status/current` | 4 con số ở đầu trang |

## Bẫy đã vấp, đừng vấp lại

`QuerySnapshot` **không có** `forEach` — chỉ có mảng `docs`. Và `data()` trả về object
**bị đóng băng**, gán thêm thuộc tính vào đó không ăn. Hàm `rowsOf()` trong trang xử lý
cả hai việc: đọc `snap.docs` và sao chép từng bản ghi ra object mới.

Lỗi này im lặng: trang vẫn báo "đã nối", nhưng khung chat và bảng việc trống trơn dù
kho dữ liệu có tin. Thấy trang trống mà `read_db` lại ra dữ liệu thì nghi ngay chỗ này.
