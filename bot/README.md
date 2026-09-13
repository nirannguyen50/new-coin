# Lì Xì Bot (bản off-chain, beta)

Bot Telegram để cả nhóm tip nhau, mở bao lì xì ngẫu nhiên, và nhận thưởng hoạt động bằng
**điểm LIXI**. Đây là bản **off-chain**: điểm được lưu trong kho dữ liệu của bot (PostgreSQL
khi deploy, hoặc file JSON trong `bot/data/` khi chạy ở máy cá nhân), **không phải token
BEP-20 thật, chưa có ví, chưa có blockchain**.

> **Muốn bot chạy 24/7 ngay?** Đọc mục [Chạy trên Vercel (khuyến nghị)](#chạy-trên-vercel-khuyến-nghị)
> — miễn phí, không cần thẻ ngân hàng, và **dữ liệu điểm được giữ lại**.

Quyết định xây off-chain trước được giải thích ở `docs/11-quyet-dinh-bot-off-chain-truoc.md`;
phạm vi lệnh gốc nằm ở mục 1 của `docs/09-ke-hoach-rut-gon-dex-va-san-nho.md`. Tóm gọn: dự án
chưa có vốn/ví để nạp thanh khoản, nên bot chạy bằng điểm nội bộ trước để kiểm chứng có cộng
đồng dùng thật mỗi ngày không, trước khi bỏ tiền ra làm on-chain.

## Mục lục

- [Giới hạn của bản off-chain](#giới-hạn-của-bản-off-chain)
- [Tạo bot qua @BotFather](#tạo-bot-qua-botfather)
- [Thêm bot vào nhóm và cấp quyền admin](#thêm-bot-vào-nhóm-và-cấp-quyền-admin)
- [Chạy bot ở máy của bạn](#chạy-bot-ở-máy-của-bạn)
- [**Chạy trên Vercel (khuyến nghị)**](#chạy-trên-vercel-khuyến-nghị)
- [Chạy 24/7 miễn phí trên Render (phương án dự phòng)](#chạy-247-miễn-phí-trên-render-phương-án-dự-phòng)
- [Chạy 24/7 với chi phí thấp hoặc miễn phí](#chạy-247-với-chi-phí-thấp-hoặc-miễn-phí)
- [Backup dữ liệu](#backup-dữ-liệu)
- [Danh sách lệnh đầy đủ](#danh-sách-lệnh-đầy-đủ)
- [Bot tự lan truyền như thế nào](#bot-tự-lan-truyền-như-thế-nào)
- [Cấu trúc mã nguồn](#cấu-trúc-mã-nguồn)
- [Chạy test](#chạy-test)

## Giới hạn của bản off-chain

Xem chi tiết ở `docs/11-quyet-dinh-bot-off-chain-truoc.md`. Vài điểm quan trọng:

- **Điểm LIXI chưa có giá trị tiền thật**, không phải khoản đầu tư, có thể bị reset trong
  giai đoạn beta. Không truyền thông với thành viên rằng điểm "sắp đổi ra tiền".
- **`/rut` chưa gửi crypto thật.** Bot chỉ ghi nhận yêu cầu ở trạng thái `pending`; admin xử
  lý thủ công (ví dụ chuyển tay sau khi có token/ví thật) rồi cập nhật trạng thái bằng
  `/rut_duyet` hoặc `/rut_huy`.
- **`/pot` không đọc block on-chain.** Admin "nạp pot" bằng lệnh `/nap`, ghi log rõ ràng đây
  là hành động thủ công/off-chain, không phải giao dịch blockchain.
- **Dữ liệu nằm ở đâu là tuỳ cấu hình.** Bot tự chọn một trong hai kho:
  - **PostgreSQL** — khi có chuỗi kết nối trong biến môi trường (`DATABASE_URL`,
    `POSTGRES_URL`, …). Dữ liệu **bền vững**, sống sót qua mọi lần deploy lại. Đây là cách
    dùng khi chạy trên Vercel hoặc Render.
  - **File JSON** trong `bot/data/` — khi không có biến nào ở trên. Dùng khi chạy ở máy cá
    nhân; nhớ chạy `npm run backup` định kỳ (xem [Backup dữ liệu](#backup-dữ-liệu)).

  **Không bao giờ dùng kho JSON khi deploy lên Vercel hay Render gói miễn phí**: Vercel có
  hệ thống file **chỉ đọc**, còn Render free **không có ổ đĩa bền vững** (dữ liệu bị xoá sạch
  sau mỗi lần restart). Xem [Chạy trên Vercel (khuyến nghị)](#chạy-trên-vercel-khuyến-nghị).
- **Không dùng dependency cần build native** (như better-sqlite3) — cố tình để bot chạy được
  trên hosting rẻ/free tier không có toolchain build C++. (Driver `pg` là JavaScript thuần.)
- **Thưởng hoạt động và đóng bao lì xì không dùng hẹn giờ trong RAM nữa.** Bản trước dùng
  `setInterval`/`setTimeout`, chỉ chạy được khi có một tiến trình sống liên tục — điều không
  có trên serverless. Nay có hai lớp:
  - **Dọn lười**: mỗi khi nhóm có hoạt động, bot đóng ngay các bao lì xì đã quá giờ và hoàn
    phần chưa ai nhận cho người gửi.
  - **Cron hằng ngày** (`/api/cron` trên Vercel, hoặc job định kỳ khi chạy ở máy cá nhân):
    phát thưởng hoạt động + quét các bao lì xì còn sót.

  Hệ quả cần biết: nếu nhóm **im lặng hẳn** sau khi bao lì xì hết giờ, tin nhắn vẫn còn hiện
  nút “Nhận lì xì” cho tới lần dọn kế tiếp — nhưng bấm vào sẽ bị từ chối vì đã hết giờ, nên
  **không ai nhận nhầm và không có điểm nào bị sai**.
- Kho JSON (không phải database thật) phù hợp với vài chục thành viên và vài nghìn giao dịch
  mỗi nhóm — **đủ cho 3 nhóm pilot**. Kho PostgreSQL thì không có giới hạn đó.

## Tạo bot qua @BotFather

1. Mở Telegram, tìm và mở chat với **[@BotFather](https://t.me/BotFather)** (tài khoản chính
   thức của Telegram để tạo bot).
2. Gửi lệnh `/newbot`.
3. BotFather hỏi **tên hiển thị** của bot (ví dụ: `LiXi Bot`) — gõ tên rồi Enter.
4. BotFather hỏi **username** của bot — phải kết thúc bằng `bot`, ví dụ `LiXiPilotBot` hoặc
   `lixi_pilot_bot`. Nếu username đã có người dùng, BotFather sẽ báo và bạn thử tên khác.
5. BotFather trả về một đoạn **token** dạng
   `123456789:ABCdefGhIJKlmNoPQRstuVwXyZ1234567890` — **giữ kín token này**, ai có token là
   toàn quyền điều khiển bot.
6. Dán token đó vào biến môi trường `TELEGRAM_BOT_TOKEN` (xem phần [Chạy bot ở máy của
   bạn](#chạy-bot-ở-máy-của-bạn)).
7. (Tuỳ chọn) Gửi `/setdescription`, `/setabouttext`, `/setuserpic` tới BotFather để chỉnh mô
   tả và ảnh đại diện của bot.

## Thêm bot vào nhóm và cấp quyền admin

Cách nhanh nhất: mở chat riêng với bot, gõ `/start` và bấm nút **➕ Thêm Lì Xì Bot vào nhóm
của bạn** — Telegram cho chọn nhóm bạn đang quản trị và thêm bot chỉ với một chạm (nút này
cũng hiện dưới mỗi bao lì xì đã đóng, xem [Bot tự lan truyền như thế nào](#bot-tự-lan-truyền-như-thế-nào)).
Ngay khi vào nhóm, bot tự đăng một lời chào ngắn cho admin: ba lệnh để bắt đầu, và nói rõ
nếu còn thiếu quyền admin. Cách thủ công:

1. Mở nhóm Telegram (nhóm pilot), bấm **Thêm thành viên** (Add members).
2. Tìm đúng username bot vừa tạo (ví dụ `@LiXiPilotBot`) và thêm vào nhóm.
3. Vào **Quản trị nhóm → Quản trị viên (Administrators) → Thêm quản trị viên**, chọn bot vừa
   thêm, cấp quyền admin.
4. Bot **cần quyền admin** vì:
   - Lệnh `/pot` và các lệnh quản trị phải kiểm tra ai là admin nhóm qua API
     `getChatAdministrators` — API này hoạt động tốt nhất khi bot cũng là admin.
   - Bot cần đọc được tin nhắn trong nhóm để đếm tin nhắn hợp lệ cho thưởng hoạt động; nếu
     nhóm ở chế độ giới hạn quyền riêng tư (privacy mode) cho bot thường, cấp quyền admin sẽ
     đảm bảo bot đọc được đầy đủ.
5. Không cần cấp quyền "Xoá tin nhắn" hay "Cấm thành viên" nếu không muốn — chỉ cần bot có mặt
   trong danh sách quản trị viên là đủ để các lệnh admin-check hoạt động đúng.

## Chạy bot ở máy của bạn

Yêu cầu: **Node.js 22** (kiểm tra bằng `node --version`).

```bash
cd bot
npm install
cp .env.example .env
# Mở file .env, dán TELEGRAM_BOT_TOKEN lấy từ BotFather
npm start
```

Nếu thiếu `TELEGRAM_BOT_TOKEN`, bot sẽ in lỗi rõ ràng và dừng lại (exit code 1) — không chạy
"giả vờ thành công" khi chưa cấu hình đúng.

Test cục bộ: không cần thẻ ngân hàng, không cần trả tiền cho bất kỳ dịch vụ gì — mọi thứ chạy
trên máy của bạn, dữ liệu lưu trong `bot/data/` (đã gitignore, không bị commit).

Biến môi trường tuỳ chọn khác trong `.env.example`:

- `BOT_SUPER_ADMIN_IDS`: danh sách Telegram user id (cách nhau bằng dấu phẩy) luôn được coi
  là admin ở mọi nhóm — hữu ích khi test hoặc khi admin nhóm là "admin ẩn danh".
- `DAILY_REWARD_CHECK_INTERVAL_MINUTES`: chu kỳ (phút) bot tự kiểm tra "hôm nay đã phát thưởng
  hoạt động chưa" (mặc định 60 phút, an toàn để chạy lại nhiều lần vì có kiểm tra idempotent).
- `WEBHOOK_DOMAIN`: tên miền công khai để chạy ở **chế độ webhook**. **Để trống khi chạy ở máy
  cá nhân** — khi đó bot chạy ở **chế độ long polling** như trước giờ (bot tự hỏi Telegram, không
  cần mở cổng, không cần tên miền).
- `PORT`: cổng HTTP khi chạy ở chế độ webhook (mặc định 3000). Không cần đặt khi chạy ở máy cá nhân.
- `DATABASE_URL`: chuỗi kết nối PostgreSQL. **Để trống khi chạy ở máy cá nhân** — khi đó bot
  lưu vào file JSON trong `bot/data/` như trước giờ. Nếu có, bot tự chuyển sang lưu vào
  Postgres và tự tạo bảng lúc khởi động (không phải chạy lệnh migration nào).

  **Nâng cấp trên database ĐÃ CÓ dữ liệu:** khi bản mới cần thêm cột, bot dùng các câu
  `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (xem `MIGRATION_STATEMENTS` trong
  `src/postgres-store.js`) — chỉ THÊM, không bao giờ xoá hay tạo lại bảng, nên **số dư
  hiện có không bị ảnh hưởng**. Các câu này chạy khi mở `/api/setup`, và cũng tự chạy một
  lần ở lần khởi động nguội (cold start) kế tiếp, nên bản deploy cũ tự nâng cấp được.

Lúc khởi động, bot luôn in rõ đang chạy ở chế độ nào ("CHẾ ĐỘ LONG POLLING" hoặc "CHẾ ĐỘ
WEBHOOK"), không in token hay bất kỳ giá trị bí mật nào.

## Chạy trên Vercel (khuyến nghị)

Đây là cách **được khuyến nghị** để bot chạy suốt ngày đêm: **miễn phí, không cần thẻ ngân
hàng**, và quan trọng nhất — **dữ liệu điểm được giữ lại** nhờ một database PostgreSQL miễn
phí (Neon) gắn thẳng vào dự án. Khác hẳn Render gói free, nơi điểm của cả nhóm bị xoá về 0
sau mỗi lần dịch vụ khởi động lại.

Toàn bộ quá trình khoảng **15 phút**, chỉ bấm chuột. Hãy đọc mục
[Hạn chế của gói Hobby](#hạn-chế-của-gói-hobby-đọc-trước-khi-mời-người-thật-vào) ở cuối
**trước khi** mời thành viên thật vào dùng.

### Chuẩn bị

- **Token bot** lấy từ @BotFather (xem [Tạo bot qua @BotFather](#tạo-bot-qua-botfather)).
  Dạng `123456789:ABCdef...` — giữ kín.
- **Hai chuỗi bí mật do bạn tự nghĩ ra.** Không cần phức tạp, chỉ cần dài và khó đoán, ví dụ
  `lixi-cron-2026-xyz-9f3k` và `lixi-setup-2026-abc-7d2m`. Ghi tạm vào đâu đó, lát nữa sẽ dán.

### Bước 1 — Đăng nhập Vercel bằng GitHub

1. Mở trình duyệt, vào **https://vercel.com**.
2. Bấm nút **Sign Up** (hoặc **Log In** nếu đã có tài khoản) ở góc trên bên phải.
3. Chọn **Continue with GitHub** → đăng nhập tài khoản GitHub đang chứa mã nguồn →
   bấm **Authorize Vercel**.
4. Nếu Vercel hỏi chọn loại tài khoản, chọn **Hobby** (gói miễn phí) và điền tên bất kỳ.

### Bước 2 — Nhập (import) repo `new-coin`

1. Ở trang chính (**Dashboard**), bấm nút **Add New…** ở góc trên bên phải → chọn **Project**.
2. Vercel hiện danh sách repo GitHub của bạn. Tìm **`new-coin`** → bấm **Import** bên cạnh nó.
   - Không thấy repo? Bấm **Adjust GitHub App Permissions** (hoặc **Configure GitHub App**)
     ở cuối danh sách, chọn repo `new-coin` rồi **Save**, quay lại và thử lại.
3. Ở màn hình cấu hình, tìm phần **Git Branch** (có thể nằm trong mục **Build and Output
   Settings** hoặc ngay dưới tên repo) và đổi nhánh thành **`claude/binance-coin-plan-rthkem`**.
   **Chọn sai nhánh thì sẽ không có mã nguồn của bot.**
   - Nếu màn hình import không cho đổi nhánh, cứ import với nhánh mặc định, rồi sau đó vào
     **Settings → Git → Production Branch**, đổi thành `claude/binance-coin-plan-rthkem`,
     bấm **Save**, và deploy lại ở Bước 5.
4. **Framework Preset** để nguyên **Other**. **Không cần sửa** Build Command / Output Directory
   — file `vercel.json` ở gốc repo đã cấu hình sẵn (giải thích từng dòng ở `VERCEL.md`).

### Bước 3 — Thêm biến môi trường

Vẫn ở màn hình import, mở mục **Environment Variables** (bấm vào để bung ra). Thêm **ba** biến,
mỗi biến gõ tên vào ô **Key**, giá trị vào ô **Value**, rồi bấm **Add**:

| Key | Value | Để làm gì |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | token lấy từ @BotFather | Để bot đăng nhập Telegram. |
| `CRON_SECRET` | chuỗi bí mật thứ nhất bạn đã nghĩ ra | Để **chỉ Vercel** kích hoạt được việc phát thưởng hằng ngày. Thiếu biến này thì **thưởng hoạt động sẽ không được phát**. |
| `SETUP_KEY` | chuỗi bí mật thứ hai | Để **chỉ bạn** mở được trang cài đặt ở Bước 6. |

### Bước 4 — Deploy lần đầu

Bấm nút **Deploy** màu đen. Chờ khoảng **1–3 phút**. Khi xong Vercel hiện pháo giấy và một
ảnh chụp trang web — **chưa xong đâu**, còn hai bước nữa.

Bấm **Continue to Dashboard** để về trang quản lý dự án.

### Bước 5 — Tạo database Neon miễn phí (bước quan trọng nhất)

Không có bước này, bot **không lưu được điểm** (hệ thống file của Vercel chỉ đọc).

1. Trong trang dự án, bấm tab **Storage** ở thanh trên cùng.
2. Bấm **Create Database**.
3. Trong danh sách, chọn **Neon** (ghi chú *Serverless Postgres*) → bấm **Continue**.
4. Chọn gói **Free** → bấm **Continue**.
5. Đặt tên tuỳ ý (ví dụ `lixi-db`), chọn khu vực gần Việt Nam nhất nếu có (ví dụ *Singapore*),
   rồi bấm **Create**.
6. Màn hình tiếp theo hỏi kết nối database vào dự án nào — chọn dự án bot của bạn, đánh dấu
   cả ba môi trường (**Production / Preview / Development**) nếu được hỏi, rồi bấm **Connect**.

Vercel **tự động thêm chuỗi kết nối** (`DATABASE_URL` và vài biến tương tự) vào biến môi
trường của dự án — **bạn không phải gõ tay gì cả**, và cũng không nên copy chuỗi đó đi đâu.

**Deploy lại để bot nhìn thấy database mới:**

7. Bấm tab **Deployments**.
8. Ở dòng trên cùng (bản mới nhất), bấm dấu **…** bên phải → chọn **Redeploy** → bấm
   **Redeploy** để xác nhận. Chờ thêm 1–2 phút.

### Bước 6 — Mở trang cài đặt một lần

1. Bấm tab **Project** (hoặc **Overview**) và copy **địa chỉ** của dự án — dạng
   `https://new-coin-xxxx.vercel.app` (nằm ngay dưới tên dự án, mục **Domains**).
   Mở thẳng địa chỉ đó sẽ ra **trang giới thiệu Lì Xì Bot** (`website/index.html`) — đây cũng
   chính là link đi chia sẻ cho admin các nhóm. Xem `VERCEL.md` để biết địa chỉ nào phục vụ trang nào.
2. Mở một tab trình duyệt mới và dán địa chỉ đó, **thêm vào cuối**:
   `/api/setup?key=` rồi dán tiếp `SETUP_KEY` bạn đã đặt ở Bước 3.

   Kết quả trông như:
   ```
   https://new-coin-xxxx.vercel.app/api/setup?key=lixi-setup-2026-abc-7d2m
   ```
3. Nhấn Enter. Trang sẽ hiện tiếng Việt, mỗi việc một dòng:

   ```
   🎉 Cài đặt xong!
   ✅ Đã tạo/kiểm tra xong các bảng trong database PostgreSQL (…)
   ✅ Đã báo cho Telegram gửi tin nhắn về https://…/api/telegram (…)
   ✅ Đã đặt CRON_SECRET — công việc hằng ngày sẽ chạy được.
   ```

   Dòng nào có ❌ thì bên cạnh có ghi rõ phải bấm nút nào để sửa. Sửa xong → **Redeploy**
   (Bước 5.8) → mở lại chính địa chỉ này.

   Trang này **không bao giờ hiển thị** token, mã bí mật hay chuỗi kết nối database.
4. **Xong.** Mở Telegram, thêm bot vào nhóm, cấp **quyền admin** (xem
   [Thêm bot vào nhóm và cấp quyền admin](#thêm-bot-vào-nhóm-và-cấp-quyền-admin)), rồi gõ
   `/start` trong nhóm. Bot phải trả lời ngay.

Sau này mỗi khi mã nguồn trên nhánh đó được cập nhật, Vercel **tự deploy lại**. Bạn **không
phải mở lại** `/api/setup`, trừ khi đổi tên miền của dự án.

### Nếu bạn đã tự thêm Build Command trên Vercel (không còn cần nữa)

Bản deploy đầu tiên của dự án này từng crash với lỗi `Cannot find module 'telegraf'`, và cách
chữa cháy lúc đó là vào **Settings → Build and Deployment → Build Command** đặt
`cd bot && npm ci --omit=dev`.

Lỗi đó **đã sửa trong repo**: `pg` và `telegraf` giờ được khai báo trong `package.json` ở
thư mục gốc, nên lần `npm install` mặc định của Vercel tự cài chúng. Không cần Build Command
thủ công nữa.

Thứ tự an toàn để dọn lại (đừng làm ngược):

1. **Redeploy** một lần với Build Command vẫn còn đó, xác nhận bot còn trả lời.
2. Vào **Settings → Build and Deployment**, xóa Build Command (để trống), **Save**.
3. **Redeploy** lần nữa, rồi thử `/start`.
4. Nếu bot hỏng, đặt lại Build Command cũ và báo cho người viết code.

Để nguyên Build Command cũng **không gây hỏng** — nó chỉ cài dependency thêm một lần nữa.
Nếu không thích mạo hiểm, cứ để nguyên.

### Nếu bot không trả lời

- Mở `https://<địa-chỉ-dự-án>/api/telegram` bằng trình duyệt: phải thấy
  `{"ok":true,"mode":"vercel-webhook"}`. Nếu thấy, máy chủ đang sống → vấn đề nằm ở token
  hoặc ở webhook; mở lại `/api/setup?key=…` để đăng ký lại.
- Mở lại `/api/setup?key=…` và đọc các dòng ❌ — mỗi dòng đều nói rõ phải bấm nút nào.
- Vào tab **Logs** (hoặc **Observability → Logs**) của dự án trên Vercel để đọc dòng lỗi
  tiếng Việt. Bot **không bao giờ in token** ra log.
- Thấy dòng `Thiếu biến môi trường TELEGRAM_BOT_TOKEN` → vào **Settings → Environment
  Variables**, kiểm tra lại, rồi **Redeploy**.

### Hạn chế của gói Hobby (đọc trước khi mời người thật vào)

- **⚠️ Gói Hobby KHÔNG cho phép sử dụng vào mục đích thương mại.** Điều khoản của Vercel quy
  định gói Hobby chỉ dành cho dự án **cá nhân, phi thương mại**. Chạy thử nghiệm, làm demo,
  nhóm bạn bè — được. Nhưng ngay khi bot phục vụ một hoạt động **có doanh thu, có bán token,
  có quảng cáo, hoặc gắn với một công ty**, bạn **phải** chuyển sang gói trả phí (Pro) hoặc
  sang một nơi chạy khác (VPS, Render trả phí). Đây là điều kiện pháp lý, không phải giới hạn
  kỹ thuật — Vercel có quyền khoá dự án nếu vi phạm.
- **Cron chỉ chạy MỘT LẦN MỖI NGÀY.** Gói Hobby cho tối đa **2 lịch cron** mỗi dự án và
  **tần suất tối thiểu là một lần mỗi ngày** (không thể đặt mỗi giờ). Vercel còn chạy vào một
  thời điểm **bất kỳ trong khung giờ** đã đặt, không đúng phút. Hệ quả:
  - Thưởng hoạt động hằng ngày được phát vào khoảng **08:00–09:00 giờ Việt Nam**, không cố định
    phút. Số điểm **không bị ảnh hưởng** vì thưởng tính theo **ngày**, không theo giờ.
  - Bao lì xì hết giờ **không** chờ cron: bot đóng ngay khi nhóm có hoạt động tiếp theo
    (“dọn lười”). Cron chỉ là lưới an toàn cho nhóm im lặng hẳn.
- **Mỗi lời gọi tối đa ~60 giây.** Quá đủ cho một lệnh bot, nhưng nếu số nhóm tăng lên rất
  nhiều thì việc phát thưởng cho tất cả trong một lần chạy có thể chạm giới hạn — lúc đó cần
  chia nhỏ công việc hoặc chuyển sang gói trả phí.
- **Neon gói Free cũng có hạn mức** (dung lượng và số giờ tính toán mỗi tháng). Với vài nhóm
  pilot thì không tới đâu, nhưng đừng coi đây là hạ tầng cho hàng nghìn người dùng.
- **Đọc lại các giới hạn của bản off-chain** ở đầu README này: điểm LIXI chưa có giá trị tiền
  thật, `/rut` chưa gửi crypto thật.

### Dành cho người rành kỹ thuật

- Không muốn đặt `SETUP_KEY`? Bot chấp nhận cả mã bí mật suy ra từ token, lấy bằng:

  ```bash
  node -e "console.log(require('crypto').createHash('sha256').update('lixi-bot:webhook-secret:v1:'+process.env.TELEGRAM_BOT_TOKEN).digest('hex').slice(0,48))"
  ```

  Chuỗi này cũng dùng được cho `/api/cron?key=…` khi muốn chạy phát thưởng ngay bằng tay.
- Ba hàm serverless nằm ở `api/telegram.js`, `api/cron.js`, `api/setup.js` — mỗi file đều có
  chú thích đầy đủ về ranh giới bảo mật ở đầu file.
- Trên Vercel, đường dẫn webhook **cố định** là `/api/telegram` (không bí mật được, vì đường
  dẫn của serverless function chính là tên file). Ranh giới bảo mật là header
  `X-Telegram-Bot-Api-Secret-Token` mà Telegram gửi kèm mọi request.
- Muốn dùng Postgres khi chạy ở máy cá nhân: đặt `DATABASE_URL` trong `bot/.env` rồi
  `npm start` như bình thường — bot tự nhận ra và tự tạo bảng.
- **Thông báo lỗi luôn được lọc trước khi in ra.** Thư viện Telegram ném lỗi kèm nguyên URL
  đã gọi (`https://api.telegram.org/bot<TOKEN>/...`), tức là thông báo lỗi thô chứa trọn vẹn
  token bot. `src/redact.js` xoá token, mật khẩu database và các mã bí mật khỏi mọi thông báo
  trước khi chúng lên log hoặc lên trang `/api/setup` (có test riêng trong
  `test/redact.test.js`).

## Chạy 24/7 miễn phí trên Render (phương án dự phòng)

> **Ghi chú:** cách này vẫn hoạt động và vẫn được hỗ trợ, nhưng **không còn là cách được
> khuyến nghị**. Gói miễn phí của Render **không có ổ đĩa bền vững**, nên nếu dùng kho JSON
> thì điểm của cả nhóm bị xoá về 0 sau mỗi lần khởi động lại. Nếu vẫn muốn dùng Render, hãy
> gắn thêm một database Postgres miễn phí và đặt biến `DATABASE_URL` — khi đó dữ liệu được
> giữ y như trên Vercel. Xem [Chạy trên Vercel (khuyến nghị)](#chạy-trên-vercel-khuyến-nghị)
> và `docs/12-chay-bot-o-dau.md`.

Đây là cách **miễn phí, không cần thẻ ngân hàng, không cần biết kỹ thuật** để bot chạy suốt
ngày đêm. Hãy đọc hết mục [Hạn chế của gói miễn phí](#hạn-chế-của-gói-miễn-phí-đọc-trước-khi-mời-người-thật-vào)
bên dưới **trước khi** mời thành viên thật vào dùng.

### Vì sao trên Render bot chạy ở "chế độ webhook"

Gói miễn phí của Render chỉ có **web service** (dịch vụ web nhận request HTTP), không có
"background worker" (tiến trình chạy nền). Dịch vụ miễn phí còn tự **ngủ** sau khoảng **15 phút**
không ai gọi vào. Cách chạy cũ (long polling — bot liên tục hỏi Telegram "có tin mới không?")
không sống sót qua trạng thái ngủ đó.

Vì vậy khi phát hiện đang chạy trên Render, bot tự chuyển sang **webhook**: chính Telegram gửi
request HTTP vào bot mỗi khi có tin nhắn. Request đó vừa **đánh thức** dịch vụ đang ngủ, vừa
mang tin nhắn tới — nên bot vẫn hoạt động. Bạn **không phải cấu hình gì thêm**: địa chỉ webhook
và "mã bí mật" (secret token) được tự suy ra từ token bot, và bot tự đăng ký với Telegram lúc
khởi động (kể cả khi địa chỉ đổi sau mỗi lần deploy lại).

### Các bước bấm (làm một lần, khoảng 10 phút)

1. Chuẩn bị sẵn **token bot** lấy từ @BotFather (xem mục
   [Tạo bot qua @BotFather](#tạo-bot-qua-botfather)). Token có dạng
   `123456789:ABCdef...` — giữ kín, đừng gửi cho ai.
2. Mở trình duyệt, vào **https://render.com** → bấm **Get Started** (hoặc **Sign In**) →
   chọn **GitHub** → đăng nhập tài khoản GitHub của bạn → bấm **Authorize Render** để cho phép
   Render đọc repo.
3. Nếu Render hỏi chọn repo được phép truy cập, chọn repo **`new-coin`** (hoặc "All repositories"
   cho nhanh) rồi bấm **Install / Save**.
4. Ở trang chính (Dashboard), bấm nút **New +** ở góc trên bên phải → chọn **Blueprint**.
5. Trong danh sách repo, tìm **`new-coin`** → bấm **Connect**.
6. Ở ô **Branch**, chọn nhánh **`claude/binance-coin-plan-rthkem`**
   (nếu đang hiện `main` thì bấm vào ô đó và đổi lại — chọn sai nhánh sẽ không thấy cấu hình).
   Render sẽ tự đọc file `render.yaml` ở gốc repo và hiện sẵn một dịch vụ tên
   **`lixi-bot-telegram`**. Bạn **không cần sửa gì** trong phần này.
7. Render hiện ô nhập cho biến **`TELEGRAM_BOT_TOKEN`** (vì token cố ý **không** được lưu trong
   repo). **Dán token của bạn vào ô đó.** Nếu Render hỏi đặt tên cho Blueprint, đặt gì cũng được
   (ví dụ `lixi-bot`).
8. Bấm nút **Apply** (có nơi hiện là **Create New Resources** / **Deploy Blueprint**).
9. Chờ lần deploy đầu tiên: thường **3–7 phút**. Bấm vào tên dịch vụ để xem tab **Logs**.
   Khi thấy các dòng sau là **đã xong**:

   ```
   Chế độ chạy: WEBHOOK (lấy địa chỉ công khai từ RENDER_EXTERNAL_URL).
   Đang lắng nghe HTTP ở cổng 10000 (health check: GET / và GET /healthz).
   Đã đăng ký webhook với Telegram.
   Lì Xì Bot đã khởi động ở CHẾ ĐỘ WEBHOOK tại https://....onrender.com, đang chờ tin nhắn...
   ```

   Ở đầu log cũng có một khung **CẢNH BÁO** về việc dữ liệu bị xoá khi khởi động lại — đó là
   cảnh báo cố ý, không phải lỗi (đọc mục hạn chế bên dưới).
10. Mở Telegram, vào **[t.me/lixi_vn_bot](https://t.me/lixi_vn_bot)** (hoặc bot của
    bạn), bấm **Start** hoặc gõ `/start`. Bot trả lời là thành công.
11. Muốn dùng trong nhóm: thêm bot vào nhóm và cấp quyền admin theo mục
    [Thêm bot vào nhóm và cấp quyền admin](#thêm-bot-vào-nhóm-và-cấp-quyền-admin).

Sau này mỗi khi code trên nhánh đó được cập nhật, Render **tự deploy lại** — bot tự đăng ký lại
webhook với địa chỉ mới, bạn không phải làm gì.

### Nếu bot không trả lời

- Mở tab **Logs** của dịch vụ trên Render và đọc dòng lỗi tiếng Việt (bot luôn in lý do rõ ràng,
  không bao giờ in token).
- Thấy dòng `LỖI: Không đăng ký được webhook với Telegram` → gần như chắc chắn **token dán sai**.
  Vào tab **Environment** của dịch vụ, sửa lại `TELEGRAM_BOT_TOKEN`, bấm **Save**, rồi
  **Manual Deploy → Deploy latest commit**.
- Mở địa chỉ công khai của dịch vụ (dạng `https://<tên>.onrender.com`) bằng trình duyệt: phải
  thấy đúng `{"ok":true,"mode":"webhook"}`. Nếu thấy, tức là dịch vụ sống; vấn đề nằm ở token
  hoặc ở việc bot chưa được thêm vào nhóm.

### Hạn chế của gói miễn phí (đọc trước khi mời người thật vào)

- **Ngủ sau ~15 phút không ai dùng.** Tin nhắn **đầu tiên** sau khi bot ngủ có thể mất tới
  **khoảng 1 phút** mới được trả lời, hoặc **bị lỡ và phải gửi lại**. Những tin sau đó nhanh bình
  thường. Cách giảm bớt: dùng một dịch vụ "ping" miễn phí (ví dụ UptimeRobot) gọi
  `https://<tên>.onrender.com/healthz` mỗi 10 phút để giữ bot thức — lưu ý việc này tiêu tốn
  số giờ chạy miễn phí bên dưới.
- **750 giờ chạy/tháng** cho toàn bộ tài khoản miễn phí. Một dịch vụ chạy liên tục cả tháng tốn
  khoảng 730 giờ → **đủ cho đúng một bot**, nhưng nếu bạn "ping" cho bot thức 24/7 thì gần như
  dùng hết hạn mức, và không còn dư cho dịch vụ miễn phí nào khác.
- **KHÔNG có ổ đĩa lưu trữ bền vững.** Đây là hạn chế **quan trọng nhất** — và là lý do
  Vercel + Neon đã thay Render làm cách chạy được khuyến nghị:
  - Nếu **không** gắn database, "sổ cái" điểm LIXI nằm trong file JSON ở `bot/data/`. Trên
    Render free, thư mục này nằm trong bộ nhớ tạm của container.
  - **Mỗi lần deploy lại, bot restart, hoặc dịch vụ ngủ rồi thức dậy, toàn bộ dữ liệu bị xoá
    sạch**: số dư, lịch sử giao dịch, pot, yêu cầu rút, quy tắc thưởng — tất cả quay về 0 và
    **không khôi phục được**. `npm run backup` cũng không cứu được vì file backup nằm cùng chỗ
    và cũng bị xoá.
  - Bot **luôn in một khung cảnh báo lớn khi khởi động** ở chế độ webhook mà chưa có kho dữ liệu
    bền vững, để không ai vô tình quên điều này.
  - **Cách khắc phục (đã có sẵn trong mã nguồn):** tạo một database PostgreSQL miễn phí
    (Neon, Supabase, hoặc Render Postgres) rồi vào tab **Environment** của dịch vụ trên Render,
    thêm biến **`DATABASE_URL`** với chuỗi kết nối của database đó, bấm **Save** và
    **Manual Deploy → Deploy latest commit**. Bot tự nhận ra, tự tạo bảng, và dữ liệu được giữ
    y như trên Vercel — **không phải sửa một dòng mã nào**. Khi đó khung cảnh báo cũng biến mất.
  - Nếu **không** làm bước trên: **chỉ dùng Render free để chạy thử/demo**. Đừng nói với thành
    viên rằng điểm được giữ lâu dài, và đừng dùng cấu hình này cho nhóm pilot thật muốn giữ số
    liệu ≥ 4 tuần (điều kiện chuyển on-chain ở `docs/11`).
- Muốn giữ dữ liệu chắc chắn ngay từ bây giờ mà không cần code thêm: chạy bot trên **VPS hoặc
  Raspberry Pi** (có ổ đĩa thật) theo mục
  [Chạy 24/7 với chi phí thấp hoặc miễn phí](#chạy-247-với-chi-phí-thấp-hoặc-miễn-phí) và
  backup định kỳ theo mục [Backup dữ liệu](#backup-dữ-liệu).

## Chạy 24/7 với chi phí thấp hoặc miễn phí

Cách **nhanh nhất, miễn phí và giữ được dữ liệu** là
[Chạy trên Vercel (khuyến nghị)](#chạy-trên-vercel-khuyến-nghị) ở mục trên — không cần đọc
tiếp phần này trừ khi bạn muốn tự làm chủ máy chủ.

Các cách dưới đây dành cho trường hợp muốn bot chạy trên **máy của chính mình** (`npm start`
chạy liên tục, không tự dừng). Tất cả đều giữ được dữ liệu, và đều dùng được với cả kho JSON
lẫn kho PostgreSQL (chỉ cần đặt `DATABASE_URL`):

1. **Railway.app (free tier / hobby plan)** — dễ nhất để bắt đầu:
   - Tạo repo Git chứa thư mục `bot/` (hoặc trỏ Railway vào repo hiện tại, chọn thư mục `bot`
     làm root).
   - Trên Railway, "New Project" → "Deploy from GitHub repo" → chọn repo.
   - Vào tab **Variables**, thêm `TELEGRAM_BOT_TOKEN` (và các biến khác nếu cần).
   - Railway tự chạy `npm install && npm start`. Free tier có giới hạn giờ chạy/tháng, đủ để
     thử nghiệm với 3 nhóm pilot ở quy mô nhỏ.
2. **VPS ~5 USD/tháng** (DigitalOcean, Vultr, Linode, Contabo, …):
   - Tạo VPS Ubuntu, SSH vào, cài Node 22 (`nvm install 22` hoặc theo hướng dẫn NodeSource).
   - Clone code, `cd bot && npm install`, tạo `.env` với token.
   - Chạy nền bằng `pm2` (`npm install -g pm2 && pm2 start index.js --name lixi-bot`) hoặc một
     `systemd` service để bot tự khởi động lại khi VPS reboot.
3. **Raspberry Pi / máy tính cũ ở nhà (home server)** — hoàn toàn miễn phí ngoài tiền điện:
   - Cài Node 22 trên Raspberry Pi OS hoặc Linux bất kỳ.
   - Giống bước VPS: clone code, `npm install`, tạo `.env`, chạy bằng `pm2` hoặc `systemd`.
   - Nhược điểm: nếu mất điện/mất mạng ở nhà, bot ngừng hoạt động — chấp nhận được cho pilot
     nội bộ, không nên dùng khi mở rộng công khai.

Không có phương án nào ở trên yêu cầu thẻ ngân hàng để bắt đầu thử nghiệm cục bộ; chỉ khi triển
khai 24/7 ngoài máy cá nhân (Railway trả phí, VPS) mới cần thanh toán.

## Backup dữ liệu

> **Chỉ áp dụng cho kho JSON.** Khi bot dùng PostgreSQL (có `DATABASE_URL`), dữ liệu nằm
> trong database chứ không nằm trong `bot/data/`, nên `npm run backup` sẽ không có gì để sao
> lưu. Với Neon, hãy dùng tính năng sao lưu/khôi phục theo thời điểm của chính Neon, hoặc
> chạy `pg_dump` định kỳ với chuỗi kết nối lấy từ tab **Storage** trên Vercel.

Khi dùng kho JSON, toàn bộ "sổ cái" điểm LIXI nằm trong `bot/data/groups/<chatId>.json` —
**đây là dữ liệu duy nhất có giá trị**, mất là mất lịch sử điểm của cả nhóm.

Chạy backup thủ công (đóng gói `bot/data/` thành file `.tar.gz` có timestamp, lưu vào
`bot/backups/`, cả hai thư mục đều đã gitignore):

```bash
cd bot
npm run backup
```

Khuyến nghị: đặt lệnh này chạy định kỳ bằng `cron` trên VPS/Raspberry Pi (ví dụ mỗi ngày), rồi
copy file backup ra một nơi khác (Google Drive, S3, email cho admin, ...) — file `.tar.gz` nằm
trên cùng máy với bot không bảo vệ được nếu ổ đĩa hỏng hoàn toàn.

## Danh sách lệnh đầy đủ

Bảng dưới khớp với bảng lệnh ở `docs/09` mục 1 (điều chỉnh theo bản off-chain của `docs/11`).
Tất cả lệnh chạy trong nhóm (không dùng trong chat riêng với bot), trừ khi ghi chú khác.

| Lệnh | Ai dùng được | Mô tả | Ví dụ |
|---|---|---|---|
| `/start` | Mọi người | Chào mừng + câu miễn trừ trách nhiệm. Trong **chat riêng** kèm nút **➕ Thêm Lì Xì Bot vào nhóm của bạn** | `/start` |
| `/huongdan` | Mọi người (nhóm hoặc chat riêng) | Hướng dẫn ngắn: lệnh cho thành viên, lệnh cho admin, hai chốt chống lạm dụng (`thamnien`, `nguongduyet`) | `/huongdan` |
| `/bxh` | Mọi người | Top 10 người **nhận** nhiều điểm nhất trong 7 ngày qua (tip + bao lì xì) — tính theo điểm nhận được, không theo số dư, nên admin được `/nap` không chiếm bảng | `/bxh` |
| `/lixi @user <số>` | Thành viên đủ điều kiện* | Tip điểm cho một người (hoặc reply vào tin nhắn người đó rồi gõ `/lixi <số>`) | `/lixi @an 100` |
| `/lixi <số> chia <n>` | Thành viên đủ điều kiện* | Mở bao lì xì, chia ngẫu nhiên cho `n` người bấm nút nhận đầu tiên (trong 10 phút) | `/lixi 500 chia 5` |
| `/sodu` | Mọi người | Xem số dư điểm LIXI của bạn trong nhóm này | `/sodu` |
| `/rut <địa_chỉ> <số>` | Thành viên đủ điều kiện* | Gửi yêu cầu rút (địa chỉ dạng `0x` + 40 ký tự hex); **v0 chưa chuyển tiền thật**, admin xử lý thủ công | `/rut 0x1234...7890 100` |
| `/lichsu` | Mọi người | Xem 10 giao dịch gần nhất của bạn | `/lichsu` |
| `/pot` | Chỉ admin | Xem số dư pot của nhóm + log admin cấp điểm gần đây | `/pot` |
| `/nap <số>` | Chỉ admin | "Nạp pot" thủ công (off-chain) cho nhóm — **khi KHÔNG reply tin nhắn của ai** | `/nap 1000` |
| `/nap @user <số>` | Chỉ admin | Cấp điểm trực tiếp cho một thành viên **có `@username` công khai** | `/nap @an 200` |
| (reply) `/nap <số>` | Chỉ admin | Reply vào tin nhắn của một người rồi gõ `/nap <số>` → cấp điểm cho chính người đó. Đây là cách cấp điểm cho thành viên **không đặt `@username`** (rất phổ biến). Reply vào tin của bot bị từ chối. Thứ tự tìm người nhận giống `/lixi`: reply trước, rồi `@username` | reply tin của An + `/nap 200` |
| `/thuong <N> <M>` | Chỉ admin | Đặt/cập nhật quy tắc thưởng hoạt động: `N` điểm/ngày cho thành viên có `≥ M` tin nhắn hợp lệ/ngày | `/thuong 10 5` |
| `/caidat` | Chỉ admin | Xem cấu hình chống lạm dụng của nhóm (thâm niên, cooldown, hạn mức tip, ngân sách thưởng, số người nhận, ngưỡng duyệt, thời gian bao) | `/caidat` |
| `/caidat <mục> <giá trị>` | Chỉ admin | Đổi một mục cấu hình, **chỉ cho nhóm này**; nhận cả tên đầy đủ (`minAccountAgeDays`) và tên ngắn không cần dấu (`thamnien`, `cooldown`, `hanmuctip`, `ngansachthuong`, `songuoinhan`, `nguongduyet`, `thoigianbao`). Mọi lần đổi đều ghi vào log admin (xem `/pot`) | `/caidat thamnien 0` |
| `/rut_duyet <mã>` | Chỉ admin | Duyệt một yêu cầu rút đang chờ (`pending` → `approved`) | `/rut_duyet 3` |
| `/rut_huy <mã>` | Chỉ admin | Từ chối một yêu cầu rút đang chờ, hoàn điểm lại (`pending` → `rejected`) | `/rut_huy 3` |
| `/duyet <mã>` | Chỉ admin | Duyệt một giao dịch tip lớn đang chờ (vượt ngưỡng cần xác nhận) | `/duyet 7` |
| `/tuchoi <mã>` | Chỉ admin | Từ chối một giao dịch tip lớn đang chờ | `/tuchoi 7` |
| `/thongke` | Chỉ **chủ bot** (`BOT_SUPER_ADMIN_IDS`), dùng được trong chat riêng | Số nhóm có bot, nhóm hoạt động 7 ngày qua, thành viên đã thấy, bao lì xì đã mở và điểm đã tip 7 ngày qua, số nhóm đến từ nút "Thêm vào nhóm". **Chỉ số đếm** — không tên, không id | `/thongke` |

*"Thành viên đủ điều kiện": đã tham gia nhóm ít nhất **3 ngày** (mặc định, có thể chỉnh) — đây
là một trong các quy tắc chống lạm dụng bên dưới. `/sodu`, `/lichsu`, `/start` vẫn dùng được
ngay cho thành viên mới, theo đúng `docs/09`.

### Chống lạm dụng đang áp dụng (mặc định, admin chỉnh được cho từng nhóm bằng `/caidat`)

Mặc định nằm ở `defaultConfig()` trong `src/store.js`; khoảng giá trị cho phép nằm ở
`CONFIG_SPECS` trong `src/ledger.js`. Admin **không cần sửa mã** — gõ `/caidat` để xem,
`/caidat <mục> <giá trị>` để đổi, và lần đổi nào cũng ghi vào log admin (`/pot`).

| Quy tắc | Mục gõ trong `/caidat` | Mặc định | Cho phép |
|---|---|---|---|
| Hạn mức tip/ngày/người | `hanmuctip` | 500 điểm | 0 – 10.000.000 |
| Hạn mức phát thưởng/ngày/nhóm (rút từ pot) | `ngansachthuong` | 1000 điểm | 0 – 10.000.000 |
| Cooldown giữa hai lệnh của cùng một người | `cooldown` | 3 giây | 0 – 300 |
| Số người nhận tối đa mỗi bao lì xì | `songuoinhan` | 50 người | 1 – 100 |
| Tuổi tài khoản tối thiểu trong nhóm để tip/rút/mở bao lì xì | `thamnien` | 3 ngày | 0 – 30 |
| Ngưỡng giao dịch cần admin duyệt trước khi thực hiện | `nguongduyet` | 2000 điểm | 0 – 10.000.000 |
| Thời gian chờ nhận bao lì xì | `thoigianbao` | 10 phút | 1 – 1440 |

⚠️ Đặt `thamnien 0` hoặc `cooldown 0` là **tắt** một lớp chống lạm dụng (tài khoản ảo,
spam). Hai giá trị đó chỉ nên dùng khi đang thử nghiệm trong nhóm riêng — bot cũng in
cảnh báo ngay trong câu trả lời. Nhóm mới lập muốn thử `/lixi` ngay thì đặt `thamnien 0`,
xong việc nhớ đặt lại `3`.

## Bot tự lan truyền như thế nào

Mục tiêu: bot tự lớn lên qua việc dùng bình thường (product-led growth), để chủ dự án không
phải đi mời từng nhóm bằng tay. Cơ chế nằm ở `src/growth.js` và `src/commands/growth.js`:

1. **Nút một chạm "➕ Thêm Lì Xì Bot vào nhóm của bạn"** — deep link
   `https://t.me/<bot>?startgroup=<payload>` của Telegram. Nút CHỈ xuất hiện ở hai chỗ:
   dưới tin nhắn **bao lì xì đã đóng** (đủ người nhận hoặc hết giờ — lúc vài người vừa nhận
   điểm) và trong trả lời `/start` ở **chat riêng**. Không gắn vào mọi tin nhắn.
2. **Tự chào mừng khi được thêm vào nhóm** (update `my_chat_member`): hai dòng bot làm gì,
   ba lệnh để bắt đầu (`/nap 1000` → reply + `/nap 100` → `/lixi 100 chia 3`), câu "điểm
   chưa có giá trị tiền thật", và `/huongdan`. Nếu bot được thêm **không có quyền admin**,
   lời chào nói rõ cần cấp admin và vì sao (chỉ admin mới đọc được tin nhắn thường để phát
   thưởng hoạt động). Mỗi nhóm chỉ chào **đúng một lần** (cờ `growth.onboardedAt`).
3. **Ghi nhận nhóm mới đến từ đâu**: payload của nút mã hoá id nhóm đang hiện nút; khi bot
   vào nhóm mới, Telegram gửi `/start <payload>` và bot ghi `growth.referredByChatId` +
   `referredAt` vào nhóm mới. Chỉ để chủ bot xem qua `/thongke`; **không bao giờ** in id
   nhóm nguồn ra tin nhắn ở nhóm khác.
4. **`/thongke`** cho chủ bot: con số cần theo dõi mỗi tuần là **nhóm hoạt động 7 ngày qua**.

**Quy tắc trung thực (không đổi):** không tài khoản giả; không nhắn cho ai chưa từng tương
tác với bot; không gửi tin nhắn không ai yêu cầu; lời mời chỉ nằm trong tin nhắn bot vốn đã
gửi, ở nhóm vốn đã dùng bot; thống kê chỉ đếm số, không tên, không id.

Lưu ý vận hành: nút cần username của bot — bot tự hỏi Telegram (`getMe`) một lần lúc khởi
động và cache; nếu chưa lấy được thì tin nhắn vẫn gửi bình thường, chỉ tạm thiếu nút. Lời
chào khi vào nhóm cần bot nhận được update `my_chat_member` (Telegram gửi mặc định; nếu
webhook được đăng ký với `allowed_updates` tự đặt thì phải có `my_chat_member` trong đó).

## Cấu trúc mã nguồn

```
(gốc repo)
  vercel.json               # cấu hình deploy lên Vercel (cron, install, functions)
  VERCEL.md                 # giải thích từng dòng của vercel.json (JSON không cho chú thích)
  render.yaml               # cấu hình deploy lên Render (phương án dự phòng)
  website/                  # trang web tĩnh — Vercel phục vụ đúng thư mục này
    index.html              # TRANG CHỦ: hướng dẫn admin thêm Lì Xì Bot vào nhóm
    token.html              # bản nháp kế hoạch token (noindex, không liên kết từ trang chủ)
    style.css, script.js    # dùng chung cho hai trang; không tải gì từ bên ngoài
  api/
    telegram.js              # cửa ngõ webhook trên Vercel (kiểm tra header bí mật của Telegram)
    cron.js                  # công việc hằng ngày: thưởng hoạt động + quét bao lì xì hết giờ
    setup.js                 # trang cài đặt một lần (tạo bảng + đăng ký webhook)
bot/
  index.js                 # entry point khi chạy ở máy cá nhân / Render
  src/
    store.js                # đọc/viết file JSON theo nhóm (atomic write)
    postgres-store.js        # kho PostgreSQL: schema, transaction, khoá hàng, CHECK số dư >= 0
    storage.js               # CHỌN kho (Postgres hay JSON) + lớp bọc chung cho lệnh bot
    ledger.js                # sổ cái điểm + toàn bộ hàm nghiệp vụ thuần (pure)
    config.js                # đọc cấu hình từ biến môi trường
    webhook.js               # hàm thuần cho chế độ webhook (chọn chế độ, suy ra đường dẫn/secret)
    serverless.js            # phần dùng chung cho api/: kiểm tra quyền, suy ra địa chỉ deploy
    redact.js                # xoá token/mật khẩu khỏi thông báo lỗi trước khi in ra
    growth.js                # bot tự lan truyền: deep link ?startgroup=, chào mừng khi vào nhóm, thống kê
    bot.js                   # khởi tạo Telegraf, đăng ký lệnh, job định kỳ, khởi động 2 chế độ
    commands/
      start.js                # /start (+ nút "Thêm vào nhóm" ở chat riêng, ghi nhận nhóm giới thiệu)
      growth.js                # my_chat_member (chào mừng), /huongdan, /bxh, /thongke
      wallet.js                # /sodu, /lichsu
      tip.js                   # /lixi (tip + bao lì xì) + nút "Nhận lì xì"
      withdraw.js              # /rut
      admin.js                 # /pot, /nap, /thuong, /caidat, /rut_duyet, /rut_huy, /duyet, /tuchoi
      helpers.js                # hàm dùng chung (kiểm tra admin, định dạng tin nhắn)
  test/                      # test bằng node:test (không cần Telegram/network)
  scripts/backup.js          # npm run backup
  data/groups/<chatId>.json # dữ liệu từng nhóm khi dùng kho JSON (gitignored)
```

`Ledger` là một interface (xem comment đầu file `src/ledger.js`) gồm `getBalance`, `credit`,
`debit`, `transfer`, `recordTransaction`, `listRecentTransactions`. Hiện có **hai** bản
implement — `JsonLedger` (file JSON) và `PostgresLedger` (`src/postgres-store.js`) — và
`src/storage.js` chọn bản nào dựa trên biến môi trường. Khi đủ điều kiện chuyển sang on-chain
(theo `docs/11`), chỉ cần viết thêm một `OnChainLedger` implement cùng interface mà **không
phải sửa lệnh bot hay logic chống lạm dụng**.

**Vì sao kho Postgres an toàn khi nhiều bản chạy cùng lúc** (quan trọng trên serverless, nơi
hàng chục instance có thể xử lý cùng một nhóm cùng lúc):

1. Mọi thao tác đổi điểm đều nằm trong một **transaction** bắt đầu bằng
   `SELECT … FOR UPDATE` trên hàng của nhóm và các hàng thành viên → Postgres xếp các thao
   tác trong cùng một nhóm **nối tiếp nhau**, dù chúng chạy trên hai máy khác nhau.
2. Cột số dư có ràng buộc **`CHECK (balance >= 0)`** ở mức database — lưới an toàn cuối cùng:
   kể cả khi một lỗi lập trình bỏ quên khoá, database vẫn từ chối ghi số dư âm và huỷ cả
   transaction. **Không có đường nào tạo ra điểm từ hư không.**

Cả hai điều trên đều có test tích hợp chạy trên Postgres thật (xem [Chạy test](#chạy-test)).

## Chạy test

```bash
cd bot
npm test
```

Lệnh trên chạy toàn bộ test **không cần mạng, không cần Telegram**. Nhóm test tích hợp cho
kho PostgreSQL sẽ **tự bỏ qua (skip)** kèm thông báo rõ ràng nếu máy bạn không có Postgres —
`npm test` vẫn xanh.

Muốn chạy **cả** nhóm test Postgres (khuyến nghị trước khi sửa `src/postgres-store.js`), trỏ
tới một Postgres bất kỳ:

```bash
# Cách nhanh nhất nếu máy có Docker:
docker run --rm -d -p 5432:5432 -e POSTGRES_PASSWORD=matkhau -e POSTGRES_DB=lixi_test --name lixi-pg postgres:16

TEST_DATABASE_URL=postgresql://postgres:matkhau@127.0.0.1:5432/lixi_test npm test
```

Mỗi lần chạy dùng một **schema riêng** (tên có mốc thời gian) và tự xoá sạch ở cuối, nên
không đụng vào dữ liệu thật và chạy song song được. Nhóm test này kiểm chứng những thứ chỉ
database thật mới chứng minh được:

- tạo bảng hai lần vẫn an toàn (idempotent);
- **di trú cộng thêm**: database tạo bởi bản deploy cũ (thiếu cột mới) được thêm cột mà
  không mất số dư, và dữ liệu mới ghi/đọc lại đúng;
- tip chuyển điểm nguyên tử, tổng điểm nhóm không đổi;
- số dư không đủ thì bị từ chối và **không ai bị đổi số dư**;
- ràng buộc `CHECK` chặn ghi số dư âm ngay cả khi ghi thẳng bằng SQL;
- **10 lệnh tip chạy song song** của cùng một người không thể tiêu quá số dư;
- số học nhận / hết giờ / hoàn tiền của bao lì xì;
- thưởng hoạt động chỉ phát **một lần** cho mỗi (nhóm, ngày), kể cả khi gọi 5 lần cùng lúc;
- các bước chuyển trạng thái của yêu cầu rút.

CI (`.github/workflows/ci.yml`) luôn chạy **đầy đủ** nhóm test này bằng một service container
Postgres 16.

Dùng module có sẵn `node:test` + `node:assert` của Node — không cài thêm framework test nào.
Test chỉ gọi các hàm thuần trong `src/ledger.js` (và một số hàm parse cú pháp lệnh) trực tiếp,
không cần kết nối Telegram hay mạng.
