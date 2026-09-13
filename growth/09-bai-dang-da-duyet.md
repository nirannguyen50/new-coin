# Ba bài đăng đầu tiên — bản cuối, đã duyệt

> Quản lý soạn và duyệt ngày 13/9/2026. Thực thi **đăng nguyên văn**, không sửa, không thêm link.
> Ba bài cố ý viết khác nhau: cùng một sản phẩm nhưng ba góc nhìn, vì dán một đoạn ra ba nơi là
> vi phạm mục 7 của `docs/18`. Mỗi nơi cách nhau tối thiểu một ngày. Bị mod xoá hoặc nhắc thì
> dừng hẳn ở nơi đó, chép nguyên văn lời nhắc vào tin `BLOCKED`.

Số liệu trong bài lấy từ repo lúc soạn: 236 test tự động (`cd bot && npm test`), 27 bài kênh tự đăng.
Nếu đăng sau ngày 30/9 thì hỏi lại Quản lý con số mới trước khi đăng.

---

## 1. Viblo — tiếng Việt, tag: `telegram`, `nodejs`, `serverless`, `postgresql`

**Tiêu đề:** Làm bot lì xì cho nhóm Telegram chạy hoàn toàn trên gói miễn phí — ba chỗ khó hơn tưởng

Chào mọi người. Mình vừa làm xong một bot Telegram cho nhóm chat: thành viên tip điểm cho nhau bằng
`/lixi @ban 100`, mở bao lì xì chia ngẫu nhiên bằng `/lixi 1000 chia 10` (ai bấm nhanh thì nhận), và
admin đặt luật tự thưởng điểm cho người hoạt động mỗi ngày. Bot chạy thật, mã nguồn mở, miễn phí.

Bài này không phải bài giới thiệu sản phẩm. Mình muốn kể ba chỗ tưởng dễ mà hoá ra không, vì mình
tìm trên Viblo không thấy ai viết về chúng cho trường hợp bot Telegram.

**1. Tip song song và bài toán âm số dư**

Hai người cùng tip từ một tài khoản trong cùng một giây là chuyện xảy ra thật khi nhóm đông. Bản đầu
mình đọc số dư, trừ, ghi lại — và test 10 lệnh tip 30 điểm chạy song song từ tài khoản có 100 điểm cho
ra kết quả âm. Cách sửa không mới nhưng phải làm đúng: `SELECT ... FOR UPDATE` khoá đúng một dòng
người gửi trong transaction, cộng thêm `CHECK (balance >= 0)` ở tầng database làm lưới cuối. Test đó
giờ cho đúng 3 lệnh thành công, 7 lệnh bị từ chối, tổng điểm toàn hệ thống không đổi.

**2. Cron trên gói miễn phí chỉ chạy một lần mỗi ngày, và không đúng phút**

Vercel Hobby cho tối đa 2 cron, tần suất tối thiểu là một lần/ngày, chạy vào một lúc bất kỳ trong giờ
đã đặt. Nghĩa là mọi việc theo lịch phải **idempotent**: chạy lại không gây hại. Thưởng hoạt động tính
theo ngày UTC và ghi dấu `(nhóm, ngày)` vào bảng riêng trước khi phát. Bao lì xì hết giờ thì "dọn lười":
đóng ngay khi nhóm có tin nhắn tiếp theo, cron chỉ là lưới an toàn cho nhóm im hẳn. Bài đăng lên kênh
thì **xí mã bài trong database trước rồi mới gửi**, nên có chạy hai lần cũng không đăng trùng.

**3. Hàm serverless không được ném lỗi vì chuyện phụ**

Đăng bài kênh hỏng, token GitHub hết hạn — không cái nào được phép làm hỏng phần phát thưởng đã chạy
xong trước đó. Mình tách rõ: việc động vào điểm của người dùng thì lỗi là HTTP 500 để có người vào
xem; việc truyền thông và báo cáo thì tự nuốt lỗi và ghi lý do vào log.

**Stack:** Node.js 22, Telegraf v4 (webhook, không long-polling), PostgreSQL trên Neon gói miễn phí,
Vercel Hobby. Không framework web, không ORM. 236 test bằng `node:test` có sẵn, có cả test chạy với
Postgres thật.

**Một điều nói rõ:** repo có tài liệu kế hoạch cho một token trong tương lai. Nhưng **chưa phát hành
token nào**, và **bot không cần token để chạy**. Điểm trong bot chỉ là con số trong database: không
mua bán, không quy đổi được, admin đặt lại về 0 lúc nào cũng được.

- Mã nguồn: https://github.com/nirannguyen50/new-coin
- Thử trong nhóm demo: https://t.me/lixibot_demo

Mình đang muốn nghe góp ý về hai thứ: cách chống lạm dụng khi nhóm có người tạo nhiều tài khoản, và
có nên chuyển bao lì xì sang cơ chế "bấm để mở" thay vì ai nhắn trước nhận trước. Ai từng làm bot cho
nhóm đông xin chia sẻ.

---

## 2. Dev.to — English, tags: `showdev`, `node`, `serverless`, `postgres`

**Title:** Three things that broke when I put a Telegram tipping bot on a free serverless tier

I built Lì Xì Bot — "lì xì" is the Vietnamese red envelope — for Telegram groups. Members tip points
to each other, open envelopes that split randomly among the fastest claimers, and admins set daily
activity rewards. It runs on Vercel's free tier with Neon Postgres, and it's open source.

Here are the three things that broke, in the order they broke.

**Concurrent tips went negative.** Read balance, subtract, write. Ten parallel tips of 30 from an
account holding 100 produced a negative balance in a test. The fix is boring and has to be exact:
`SELECT ... FOR UPDATE` on the sender's row inside the transaction, plus a `CHECK (balance >= 0)`
constraint as the last line of defense. The same test now yields exactly 3 successes, 7 rejections,
and the system total unchanged.

**Free-tier cron runs once a day, at some minute of the hour, and may run twice.** Every scheduled job
had to become idempotent. Daily rewards are keyed by `(group, UTC date)` in their own table before
anything is paid. Expired envelopes settle lazily on the group's next message; cron is only the safety
net for silent groups. Channel posts reserve their post id in the database *before* sending, so a
double run can't double post.

**A failed side effect took down the main job.** A dead channel or an expired GitHub token must never
fail the reward run that already completed. So: anything touching user points fails loudly (HTTP 500);
anything that is reporting or announcements swallows its error and logs the reason.

Stack: Node 22, Telegraf 4 over webhooks, Postgres, no web framework, no ORM. 236 tests with the
built-in `node:test`, some against a real Postgres.

One thing to be upfront about: the repo contains planning docs for a possible future token. **No token
has been issued**, and **the bot does not need one to run**. Points are a number in a database — not
tradeable, not convertible, and resettable by the group admin.

Source: https://github.com/nirannguyen50/new-coin — try it in the public demo group:
https://t.me/lixibot_demo

I'd like to hear how others handle sock-puppet accounts in tipping systems. Account-age and
cooldown limits are what I have so far.

---

## 3. Reddit r/SideProject — English, flair "Telegram bot" nếu có, không flair thì bỏ trống

**Title:** I made a free red-envelope tipping bot for Telegram groups (open source, runs on free tier)

Lì xì is the red envelope Vietnamese people give at Tết (Lunar New Year). I wanted the same thing in
Telegram groups: tip a friend some points, or drop an envelope that splits randomly among whoever
grabs it first. Admins can also set a small daily reward for active members.

What it is: free, open source, runs entirely on Vercel's free tier + Neon Postgres. About 236
automated tests, mostly because concurrent tips kept breaking things early on.

What it isn't: there's no token, no crypto, nothing to buy. Points are just a number the group admin
controls and can reset. The repo has some planning docs about a possible future token — that's a
plan, not a thing that exists, and the bot doesn't depend on it.

Try it in the demo group before adding it anywhere: https://t.me/lixibot_demo
Code: https://github.com/nirannguyen50/new-coin

Honest ask: I have zero real groups using it yet. If you run a Telegram group and try it, I'd love
to know what confused you in the first five minutes.
