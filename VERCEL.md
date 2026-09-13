# Giải thích `vercel.json` (từng dòng)

`vercel.json` phải là **JSON hợp lệ**, mà JSON thì **không cho phép viết chú thích**
(`//` hay `/* */` đều làm Vercel báo lỗi cấu hình và deploy hỏng). Vì vậy phần giải
thích cho từng dòng được đặt ở đây.

Hướng dẫn bấm từng bước để deploy nằm ở **`bot/README.md`**, mục
*“Chạy trên Vercel (khuyến nghị)”*. File này chỉ giải thích **vì sao** cấu hình lại như vậy.

Xem thử trang web trên máy trước khi deploy: `cd website && python3 -m http.server 8080`
rồi mở `http://localhost:8080` (ra đúng trang chủ như trên Vercel). Xem thêm `website/README.md`.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "outputDirectory": "website",
  "redirects": [
    { "source": "/them-bot.html", "destination": "/", "permanent": false },
    { "source": "/them-bot", "destination": "/", "permanent": false }
  ],
  "rewrites": [
    { "source": "/token", "destination": "/token.html" }
  ],
  "functions": {
    "api/telegram.js": { "maxDuration": 30 },
    "api/setup.js": { "maxDuration": 30 },
    "api/cron.js": { "maxDuration": 30 }
  },
  "crons": [
    { "path": "/api/cron", "schedule": "0 1 * * *" }
  ]
}
```

## Địa chỉ nào phục vụ trang nào

| Địa chỉ | Nội dung | Ghi chú |
|---|---|---|
| `/` | `website/index.html` — **trang Lì Xì Bot** (bot làm gì, 7 bước thêm bot, bảng lệnh, hỏi đáp) | Đây là trang để đi chia sẻ. Là cửa trước của dự án. |
| `/token` và `/token.html` | `website/token.html` — bản nháp kế hoạch token | **Không** được liên kết từ thanh điều hướng của trang chủ vì chưa hoàn chỉnh; có `<meta name="robots" content="noindex, nofollow">`. Vẫn mở được nếu ai đó cần xem. |
| `/them-bot.html`, `/them-bot` | chuyển hướng 307 về `/` | Địa chỉ cũ của trang hướng dẫn; giữ để link đã lỡ chia sẻ không chết. |
| `/api/telegram`, `/api/setup`, `/api/cron` | ba hàm serverless trong `api/` | Không đổi gì. Bot chạy y như trước. |
| `/style.css`, `/script.js` | tài nguyên tĩnh của trang | Dùng chung cho cả hai trang. |

## Giải thích từng dòng

| Dòng | Ý nghĩa |
|---|---|
| `$schema` | Cho trình soạn thảo (VS Code…) tự gợi ý và báo lỗi chính tả trong file này. Không ảnh hưởng lúc deploy. |
| *(không dùng `installCommand`)* | **Bài học đã trả giá.** Trước đây file này đặt `installCommand: "npm ci --prefix bot"`. Vercel **bỏ qua** install command khi dự án không có Build Command, nên nó chỉ chạy `npm install` ở thư mục gốc; `telegraf` và `pg` không bao giờ được cài và hàm crash khi chạy với lỗi `Cannot find module 'telegraf'` (build vẫn xanh, nên rất dễ tưởng là ổn). Cách sửa: khai báo `pg` và `telegraf` ngay trong `package.json` **ở gốc**, để lần `npm install` mặc định của Vercel cài chúng. Node tự tìm ngược lên `node_modules` ở gốc khi `bot/src/*.js` gọi `require("telegraf")`, nên cả Vercel và máy cá nhân đều chạy. |
| `outputDirectory` | Dự án này không build gì cả (bot là JavaScript thuần). Vercel vẫn cần một thư mục “kết quả build” để phục vụ trang tĩnh — đó là **`website/`**. Trước đây trỏ vào `public/` (một trang giữ chỗ trống rỗng), nên trang thật trong `website/` không bao giờ được đưa lên. Thư mục `public/` đã bị xóa để không còn nhầm lẫn thư mục nào đang được phục vụ. |
| `redirects` | Chạy **trước** khi Vercel tìm file, nên dùng được để đổi hướng một địa chỉ cũ. Ở đây: `/them-bot.html` và `/them-bot` (tên cũ của trang hướng dẫn) chuyển về `/`. `permanent: false` = 307, để sau này đổi ý thì trình duyệt không nhớ mãi. |
| `rewrites` | Chạy **sau** khi Vercel tìm file. `/token` không có file nào trùng tên nên rewrite được kích hoạt và phục vụ `token.html`, giữ địa chỉ gọn. **Cái bẫy ở đây:** vì rewrite chạy sau bước tìm file, **không thể** dùng `{ "source": "/", "destination": "/them-bot.html" }` để đổi trang chủ — `/` luôn khớp `index.html` có sẵn trước, rewrite không bao giờ chạy. Vì vậy trang chủ được đổi bằng cách **đổi tên file**: trang bot thành `index.html`, trang token thành `token.html`. Ít mảnh vỡ hơn, và xem trên máy (`file://` hay `python3 -m http.server`) cũng ra đúng trang chủ như trên Vercel. |
| `functions` → `maxDuration` | Thời gian tối đa mỗi hàm được chạy. Đặt 30 giây cho cả ba hàm, là mức gói Hobby chắc chắn chấp nhận. 30 giây quá dư cho một lệnh bot, và cũng đủ cho `api/cron.js` duyệt vài nhóm thử nghiệm. Nếu sau này có rất nhiều nhóm, tách cron thành nhiều lần chạy thay vì tăng số này. |
| `crons` → `path` | Địa chỉ Vercel sẽ tự gọi theo lịch: `/api/cron` (phát thưởng hoạt động + đóng các bao lì xì đã hết giờ). |
| `crons` → `schedule` | Cú pháp cron 5 ô, theo giờ **UTC**. `0 1 * * *` = mỗi ngày một lần vào khung **01:00–01:59 UTC** (khoảng **08:00–08:59 giờ Việt Nam**). Chạy sau nửa đêm UTC để “ngày” vừa kết thúc đã được chốt xong. |

## Ba giới hạn của gói Hobby cần nhớ

1. **Tối đa 2 lịch cron mỗi dự án.** Ở đây chỉ dùng **1** lịch (làm cả hai việc trong
   cùng một lần chạy), nên vẫn còn dư một suất cho sau này.
2. **Tần suất tối thiểu là một lần mỗi ngày** — không thể đặt cron chạy mỗi giờ. Vì
   vậy việc đóng bao lì xì hết giờ **không** dựa vào cron: bot “dọn lười” ngay khi
   nhóm có hoạt động tiếp theo (xem `bot/src/ledger.js` → `settleDueEnvelopes`), còn
   cron chỉ là lưới an toàn cho nhóm im lặng hẳn.
3. **Vercel chạy cron vào một thời điểm bất kỳ trong khung giờ đã đặt**, không đúng
   phút. Không ảnh hưởng số điểm vì thưởng hoạt động tính theo **ngày** (UTC).

## Biến môi trường cần đặt trên Vercel

| Biến | Bắt buộc | Dùng để làm gì |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | **Có** | Token bot lấy từ @BotFather. |
| `CRON_SECRET` | **Có** (nếu muốn có thưởng hoạt động) | Một chuỗi ngẫu nhiên bất kỳ. Khi biến này tồn tại, Vercel gửi kèm `Authorization: Bearer <CRON_SECRET>` mỗi lần chạy cron; `api/cron.js` dùng nó để chặn người lạ tự bấm phát thưởng. |
| `DATABASE_URL` (hoặc tên tương đương) | **Có** | Vercel **tự thêm** khi bạn gắn database Neon ở tab **Storage** — không phải gõ tay. Thiếu nó thì bot không lưu được điểm (hệ thống file trên Vercel chỉ đọc). |
| `SETUP_KEY` | Không | Mã mở trang `/api/setup`. Không đặt thì dùng mã suy từ token bot (xem README). |
| `BOT_SUPER_ADMIN_IDS` | Không | Danh sách Telegram user id luôn được coi là admin. |
