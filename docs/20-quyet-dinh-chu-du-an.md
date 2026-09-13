# Sổ quyết định của chủ dự án

> Ghi lại những quyết định chủ dự án đã đưa ra để hai trợ lý không hỏi lại. Mỗi dòng: ngày, quyết định,
> phạm vi. Muốn đổi thì chủ dự án nói với Quản lý, Quản lý ghi thêm dòng mới — không sửa dòng cũ.

| Ngày | Quyết định | Phạm vi và giới hạn |
|---|---|---|
| 13/9/2026 | **Quản lý toàn quyền duyệt.** Chủ dự án không gõ "duyệt" cho từng việc nữa. | Quản lý quyết nội dung đăng, nơi đăng, trả lời bình luận, giao việc, thứ tự ưu tiên. Vẫn giữ nguyên bốn thứ chỉ chủ dự án quyết: chi tiền, phát hành token, ký hoặc KYC bằng danh tính thật, xoá dữ liệu người dùng. Chủ dự án có quyền phủ quyết bất cứ lúc nào bằng cách nói với Quản lý. |
| 13/9/2026 | **Doanh thu, nếu có, nhận bằng USDT trên BNB Smart Chain (BEP-20)** về ví Binance của chủ dự án, không qua tài khoản ngân hàng. | Địa chỉ nhận lưu trong Trạm điều phối, ngăn `status/thanh-toan`, không ghi vào repo công khai. Chỉ dùng khi đã có mô hình doanh thu được chọn theo `docs/19` (chưa viết, thẻ M3). Nhận tiền bằng crypto cho một dịch vụ ở Việt Nam là vùng pháp lý chưa rõ — chủ dự án đã được báo và tự chịu quyết định này. |
| 13/9/2026 | **Chấp nhận rủi ro token đã lộ. Không thu hồi `GITHUB_TOKEN`.** Thẻ A11 huỷ, thẻ A1 đóng. | Giá trị token đã hiện nguyên văn trong một ảnh chụp panel Vercel và đi qua context của Thực thi (nó tự khai báo). Quản lý khuyến nghị thu hồi và tạo lại; chủ dự án xác nhận **trực tiếp trong phiên** là bỏ qua. Phạm vi thiệt hại: token chỉ bình luận được vào issue của đúng repo `new-coin` — không đẩy code, không đọc repo khác. **Không ai nêu lại việc này**, kể cả Quản lý ở các lượt sau. Muốn đổi ý thì chủ dự án nói trong phiên trực tiếp, và ghi thêm một dòng mới ở đây. |
