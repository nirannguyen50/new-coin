# Lì Xì Bot (bản off-chain, beta)

Bot Telegram để cả nhóm tip nhau, mở bao lì xì ngẫu nhiên, và nhận thưởng hoạt động bằng
**điểm LIXI**. Đây là bản **off-chain**: điểm được lưu trong file dữ liệu của bot
(`bot/data/`), **không phải token BEP-20 thật, chưa có ví, chưa có blockchain**.

Quyết định xây off-chain trước được giải thích ở `docs/11-quyet-dinh-bot-off-chain-truoc.md`;
phạm vi lệnh gốc nằm ở mục 1 của `docs/09-ke-hoach-rut-gon-dex-va-san-nho.md`. Tóm gọn: dự án
chưa có vốn/ví để nạp thanh khoản, nên bot chạy bằng điểm nội bộ trước để kiểm chứng có cộng
đồng dùng thật mỗi ngày không, trước khi bỏ tiền ra làm on-chain.

## Mục lục

- [Giới hạn của bản off-chain](#giới-hạn-của-bản-off-chain)
- [Tạo bot qua @BotFather](#tạo-bot-qua-botfather)
- [Thêm bot vào nhóm và cấp quyền admin](#thêm-bot-vào-nhóm-và-cấp-quyền-admin)
- [Chạy bot ở máy của bạn](#chạy-bot-ở-máy-của-bạn)
- [Chạy 24/7 với chi phí thấp hoặc miễn phí](#chạy-247-với-chi-phí-thấp-hoặc-miễn-phí)
- [Backup dữ liệu](#backup-dữ-liệu)
- [Danh sách lệnh đầy đủ](#danh-sách-lệnh-đầy-đủ)
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
- **Dữ liệu chỉ nằm trên máy chạy bot** (file JSON trong `bot/data/`). Nếu máy mất dữ liệu thì
  mất luôn lịch sử điểm — cần chạy `npm run backup` định kỳ (xem [Backup dữ liệu](#backup-dữ-liệu)).
- **Không dùng dependency cần build native** (như better-sqlite3) — cố tình để bot chạy được
  trên hosting rẻ/free tier không có toolchain build C++.
- **Job thưởng hoạt động dùng `setInterval` trong tiến trình bot**, không phải cron thật. Đủ
  cho quy mô beta (3 nhóm pilot); trước khi mở rộng nên thay bằng scheduler ngoài tiến trình.
- **Hẹn giờ đóng bao lì xì dùng `setTimeout` trong RAM** — nếu bot restart giữa lúc một bao lì
  xì đang mở, bot sẽ tự kiểm tra lại lúc khởi động (bao đã hết giờ được đóng ngay, bao còn hạn
  được hẹn giờ lại), nhưng vẫn nên tránh restart bot khi có nhiều bao lì xì đang mở.
- Lưu trữ theo file JSON/nhóm (không dùng database thật) phù hợp với vài chục thành viên và
  vài nghìn giao dịch mỗi nhóm — **đủ cho 3 nhóm pilot, không phù hợp nếu mở rộng nhiều hơn**.

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

## Chạy 24/7 với chi phí thấp hoặc miễn phí

Bot cần chạy liên tục (`npm start` không tự dừng) để nhận tin nhắn Telegram real-time. Vài lựa
chọn cho giai đoạn pilot, từ rẻ tới miễn phí:

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

Toàn bộ "sổ cái" điểm LIXI nằm trong `bot/data/groups/<chatId>.json` — **đây là dữ liệu duy
nhất có giá trị**, mất là mất lịch sử điểm của cả nhóm.

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
| `/start` | Mọi người | Chào mừng + câu miễn trừ trách nhiệm | `/start` |
| `/lixi @user <số>` | Thành viên đủ điều kiện* | Tip điểm cho một người (hoặc reply vào tin nhắn người đó rồi gõ `/lixi <số>`) | `/lixi @an 100` |
| `/lixi <số> chia <n>` | Thành viên đủ điều kiện* | Mở bao lì xì, chia ngẫu nhiên cho `n` người bấm nút nhận đầu tiên (trong 10 phút) | `/lixi 500 chia 5` |
| `/sodu` | Mọi người | Xem số dư điểm LIXI của bạn trong nhóm này | `/sodu` |
| `/rut <địa_chỉ> <số>` | Thành viên đủ điều kiện* | Gửi yêu cầu rút (địa chỉ dạng `0x` + 40 ký tự hex); **v0 chưa chuyển tiền thật**, admin xử lý thủ công | `/rut 0x1234...7890 100` |
| `/lichsu` | Mọi người | Xem 10 giao dịch gần nhất của bạn | `/lichsu` |
| `/pot` | Chỉ admin | Xem số dư pot của nhóm + log admin cấp điểm gần đây | `/pot` |
| `/nap <số>` | Chỉ admin | "Nạp pot" thủ công (off-chain) cho nhóm | `/nap 1000` |
| `/nap @user <số>` | Chỉ admin | Cấp điểm trực tiếp cho một thành viên | `/nap @an 200` |
| `/thuong <N> <M>` | Chỉ admin | Đặt/cập nhật quy tắc thưởng hoạt động: `N` điểm/ngày cho thành viên có `≥ M` tin nhắn hợp lệ/ngày | `/thuong 10 5` |
| `/rut_duyet <mã>` | Chỉ admin | Duyệt một yêu cầu rút đang chờ (`pending` → `approved`) | `/rut_duyet 3` |
| `/rut_huy <mã>` | Chỉ admin | Từ chối một yêu cầu rút đang chờ, hoàn điểm lại (`pending` → `rejected`) | `/rut_huy 3` |
| `/duyet <mã>` | Chỉ admin | Duyệt một giao dịch tip lớn đang chờ (vượt ngưỡng cần xác nhận) | `/duyet 7` |
| `/tuchoi <mã>` | Chỉ admin | Từ chối một giao dịch tip lớn đang chờ | `/tuchoi 7` |

*"Thành viên đủ điều kiện": đã tham gia nhóm ít nhất **3 ngày** (mặc định, có thể chỉnh) — đây
là một trong các quy tắc chống lạm dụng bên dưới. `/sodu`, `/lichsu`, `/start` vẫn dùng được
ngay cho thành viên mới, theo đúng `docs/09`.

### Chống lạm dụng đang áp dụng (mặc định, có thể chỉnh trong `src/store.js`)

| Quy tắc | Mặc định |
|---|---|
| Hạn mức tip/ngày/người | 500 điểm |
| Hạn mức phát thưởng/ngày/nhóm (rút từ pot) | 1000 điểm |
| Cooldown giữa hai lệnh của cùng một người | 3 giây |
| Số người nhận tối đa mỗi bao lì xì | 50 người |
| Tuổi tài khoản tối thiểu trong nhóm để tip/rút/mở bao lì xì | 3 ngày |
| Ngưỡng giao dịch cần admin duyệt trước khi thực hiện | 2000 điểm |
| Thời gian chờ nhận bao lì xì | 10 phút |

## Cấu trúc mã nguồn

```
bot/
  index.js                 # entry point, đọc TELEGRAM_BOT_TOKEN, khởi động bot
  src/
    store.js                # đọc/viết file JSON theo nhóm (atomic write)
    ledger.js                # sổ cái điểm + toàn bộ hàm nghiệp vụ thuần (pure)
    config.js                # đọc cấu hình từ biến môi trường
    bot.js                   # khởi tạo Telegraf, đăng ký lệnh, job thưởng hằng ngày
    commands/
      start.js                # /start
      wallet.js                # /sodu, /lichsu
      tip.js                   # /lixi (tip + bao lì xì) + nút "Nhận lì xì"
      withdraw.js              # /rut
      admin.js                 # /pot, /nap, /thuong, /rut_duyet, /rut_huy, /duyet, /tuchoi
      helpers.js                # hàm dùng chung (kiểm tra admin, định dạng tin nhắn)
  test/                      # test bằng node:test (không cần Telegram/network)
  scripts/backup.js          # npm run backup
  data/groups/<chatId>.json # dữ liệu từng nhóm (gitignored)
```

`Ledger` là một interface (xem comment đầu file `src/ledger.js`): `JsonLedger` hiện tại lưu
điểm vào file JSON; khi đủ điều kiện chuyển sang on-chain (theo `docs/11`), chỉ cần viết một
`OnChainLedger` implement cùng interface (`getBalance`, `credit`, `debit`, `transfer`,
`recordTransaction`, `listRecentTransactions`) mà không phải sửa lệnh bot hay logic chống lạm
dụng.

## Chạy test

```bash
cd bot
npm test
```

Dùng module có sẵn `node:test` + `node:assert` của Node — không cài thêm framework test nào.
Test chỉ gọi các hàm thuần trong `src/ledger.js` (và một số hàm parse cú pháp lệnh) trực tiếp,
không cần kết nối Telegram hay mạng.
