# LiXi (LIXI) — Hợp đồng token BEP-20 và vesting

Dự án Hardhat cho **LiXi (LIXI)** — token thưởng / tip ("lì xì") dành cho cộng đồng trực tuyến
Việt Nam trên BNB Chain; sản phẩm đầu tiên là bot tip trên Telegram. Hợp đồng tuân theo các quy tắc
bảo mật trong `docs/01-ke-hoach-tong-the.md` (Giai đoạn 4) và `docs/03-tokenomics-template.md`.

## Tổng quan

| Hạng mục | Giá trị |
|---|---|
| Tên / ticker | LiXi / LIXI |
| Chuẩn | BEP-20 (ERC-20 của OpenZeppelin Contracts v5.7) |
| Decimals | 18 |
| Tổng cung | 1.000.000.000 LIXI, mint **một lần duy nhất** trong constructor cho địa chỉ treasury |
| Mint thêm | **Không có** hàm mint; tổng cung chỉ có thể giảm (burn) |
| Owner / admin | **Không có**. Không kế thừa Ownable/AccessControl, không có địa chỉ đặc quyền nào |
| Pause / blacklist / whitelist | **Không có** |
| Thuế giao dịch | **Không có** |
| Upgradeable | **Không** (hợp đồng thường, không proxy) |
| Tính năng thêm | `ERC20Burnable` (holder tự đốt), `ERC20Permit` (EIP-2612, phê duyệt bằng chữ ký) |
| Vesting | OpenZeppelin `VestingWallet` (đã audit), mỗi nhóm phân bổ một ví riêng; cliff = lùi thời điểm bắt đầu |

### Cấu trúc thư mục

```
contracts/
├── contracts/
│   ├── LiXi.sol                 # Token BEP-20 cố định cung, không admin
│   ├── LiXiVestingWallet.sol    # Wrapper để deploy OZ VestingWallet (không có logic tự viết)
│   └── test/                       # CHỈ DÙNG CHO TEST: Mock router/factory/pair/WETH giả lập PancakeSwap
├── config/
│   └── allocations.example.json    # Mẫu cấu hình phân bổ / vesting (khớp tokenomics/config.example.json)
├── scripts/
│   ├── new-wallet.js               # Tạo ví deploy ngẫu nhiên (in mnemonic/khóa riêng, tùy chọn ghi .env)
│   ├── check-setup.js              # Kiểm tra .env, RPC, số dư BNB, treasury trước khi deploy
│   ├── deploy.js                   # Deploy token
│   ├── deploy-vesting.js           # Deploy ví vesting theo config, in bảng tổng hợp
│   ├── verify.js                   # Verify mã nguồn trên BscScan
│   ├── add-liquidity.js            # Tạo cặp LIXI/BNB trên PancakeSwap V2 (approve + addLiquidityETH)
│   └── lib/                        # Hàm tính phân bổ, lưu file deployments, ABI/helper PancakeSwap
├── test/                           # Hardhat + ethers v6 + chai
├── deployments/                    # Ghi lại địa chỉ đã deploy theo network (không commit)
├── hardhat.config.js
├── .env.example
└── package.json
```

## Cài đặt

Yêu cầu Node.js >= 18 (đã kiểm tra với Node 22) và npm.

```bash
cd contracts
npm install
cp .env.example .env      # rồi điền giá trị thật (hoặc dùng Bước 0 bên dưới để tự tạo)
```

Trình biên dịch Solidity 0.8.28 được lấy từ package `solc` đã ghim phiên bản trong `package.json`
(không cần tải binary từ internet, build tái lập được trên mọi máy/CI). Nếu muốn dùng binary
gốc do Hardhat tải về: `USE_NATIVE_SOLC=true npm run compile`.

## Biên dịch và kiểm thử

```bash
npm run compile
npm test
```

Bộ test bao gồm:

- Token: tên/ticker/decimals, tổng cung cố định mint cho treasury, từ chối treasury = 0x0,
  ABI **không có** hàm mint/owner/pause/blacklist/fee, chuyển đúng số lượng (không thuế),
  `burn` / `burnFrom`, `permit` (chữ ký EIP-712 hợp lệ, replay, hết hạn, sai người ký).
- Vesting: không giải phóng gì trước cliff, đúng 0 tại thời điểm hết cliff (không có "cục" unlock),
  50 % tại giữa kỳ vesting, giải phóng hết tại `cliff + vesting` (đội ngũ: tháng 48), cliff = 0
  tuyến tính từ TGE, `vestingMonths = 0` mở một lần khi hết cliff.
- Script: file cấu hình mẫu khớp từng nhóm với `tokenomics/config.example.json`; hàm tính phân bổ
  (tổng 100 %, lưu hành TGE = 148,6 triệu như mô hình Python, phần trăm lẻ 2 chữ số, cấu hình sai);
  chạy end-to-end `deploy-vesting.js` trên mạng Hardhat.
- Script cài đặt: `generateWallet()` trả về địa chỉ / mnemonic 12 từ / khóa riêng khớp nhau,
  `writeEnv()` tạo `.env` từ `.env.example` và từ chối ghi đè `PRIVATE_KEY` đã có (trong thư mục
  tạm); `summarize()` của `check-setup.js` với các trạng thái thiếu/sai/sẵn sàng, và CLI thoát mã 1
  với thông báo rõ ràng khi RPC không kết nối được (không in khóa riêng).
- Thanh khoản: hàm thuần `computeMinAmounts` / `impliedPrice` (bigint), đọc cấu hình từ biến môi
  trường, và chạy end-to-end `add-liquidity.js` với **router giả lập** trong `contracts/test/`
  (approve đúng số lượng, gọi `addLiquidityETH` với đúng min amount/deadline, LP token về đúng ví,
  bỏ qua approve khi allowance đã đủ, cảnh báo khi pool đã có reserve, từ chối khi thiếu LIXI/BNB).

Xem gas: `REPORT_GAS=true npm test`.

## Biến môi trường (`.env`)

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `PRIVATE_KEY` | Deploy | Khóa riêng ví deploy. Tạo bằng `npm run wallet:new -- --write-env`; dùng ví riêng, chỉ nạp đủ BNB trả gas |
| `BSC_RPC_URL` | Mainnet | RPC BNB Chain mainnet (mặc định endpoint công khai) |
| `BSC_TESTNET_RPC_URL` | Testnet | RPC BNB testnet (mặc định endpoint công khai) |
| `BSCSCAN_API_KEY` | Verify | API key Etherscan v2 (dùng chung cho BscScan) |
| `TREASURY_ADDRESS` | Deploy token | Địa chỉ nhận toàn bộ 1 tỷ LIXI. **Mainnet phải là multisig** |
| `ALLOCATIONS_FILE` | Vesting | Đường dẫn file cấu hình (mặc định `config/allocations.example.json`) |
| `TGE_TIMESTAMP` | Vesting | Unix time (giây) của TGE; để trống = thời gian block hiện tại |
| `FUND_VESTING` | Vesting | `true` để script tự chuyển token từ ví ký vào các ví vesting |
| `TOKEN_ADDRESS` | Vesting, thanh khoản | Ghi đè địa chỉ token (mặc định đọc từ `deployments/<network>.json`) |
| `LIQUIDITY_TOKEN_AMOUNT` | Thanh khoản | Số LIXI (đơn vị nguyên, ví dụ `80000000`) đưa vào pool |
| `LIQUIDITY_BNB_AMOUNT` | Thanh khoản | Số BNB (đơn vị nguyên, cho phép thập phân, ví dụ `100` hoặc `12.5`) ghép cặp |
| `LP_RECIPIENT` | Thanh khoản | Ví nhận LP token (mặc định = ví ký). Nên là multisig |
| `SLIPPAGE_BPS` | Thanh khoản | Dung sai trượt giá theo basis point (mặc định `100` = 1 %) |
| `DEADLINE_MINUTES` | Thanh khoản | Hạn giao dịch tính bằng phút (mặc định `20`) |
| `ROUTER_ADDRESS` | Thanh khoản | Ghi đè router PancakeSwap V2 (mặc định theo chainId 56/97) |
| `CONFIRM_MAINNET` | Thanh khoản | Phải đúng bằng `yes` mới cho phép thêm thanh khoản trên mainnet |

## Bước 0: tạo ví và kiểm tra

Trước khi deploy lên testnet, cần một **ví deploy/vận hành** riêng (không dùng ví cá nhân đang giữ
tài sản) và một `.env` đúng. Hai script sau làm việc đó mà không cần Hardhat, không cần mạng
(script tạo ví) và không bao giờ in khóa riêng ra ngoài terminal.

### 0.1 Tạo ví mới

```bash
npm run wallet:new                    # chỉ in ra màn hình
npm run wallet:new -- --write-env     # in ra màn hình VÀ ghi PRIVATE_KEY= vào contracts/.env
```

Script dùng `ethers.Wallet.createRandom()` ngay trên máy bạn (không gọi dịch vụ nào), in **địa chỉ**,
**12 từ khôi phục (mnemonic)** và **khóa riêng**. Với `--write-env`:

- Nếu chưa có `.env`, script sao chép `.env.example` thành `.env` rồi điền `PRIVATE_KEY`.
- Nếu `.env` đã có `PRIVATE_KEY` khác rỗng, script **từ chối ghi đè** (tránh mất ví cũ); hãy xóa
  dòng đó thủ công nếu thật sự muốn đổi ví.
- `.env` được tạo với quyền `600` và đã nằm trong `.gitignore`.

**Cảnh báo (script cũng in ra):** viết 12 từ ra giấy ngay lập tức và cất nơi an toàn; không chụp
màn hình, không gửi qua chat/email/Telegram, không dán vào website hay bot nào; không commit
`.env`; đây là ví deploy/vận hành nên **chỉ nạp đúng số BNB/token cần cho từng bước** — treasury và
LP token phải ở multisig. Nếu máy dùng chung, xóa lịch sử terminal sau khi chạy.

### 0.2 Kiểm tra cấu hình

```bash
npm run check                          # mặc định --network bscTestnet
npm run check -- --network bscTestnet
npm run check -- --network bsc         # trước khi lên mainnet
```

Script đọc `.env` và báo (không in bí mật nào; URL RPC chỉ hiện tên host):

| Mục | Kiểm tra |
|---|---|
| `PRIVATE_KEY` | đã đặt chưa, có hợp lệ không, địa chỉ ví suy ra |
| RPC | có kết nối được không, `chainId` trả về có đúng mạng (97 testnet / 56 mainnet) |
| Số dư | BNB của ví deploy (0 → còn thiếu; < 0,05 BNB → cảnh báo) |
| `TREASURY_ADDRESS` | đã đặt, hợp lệ, khác 0x0; là **hợp đồng** (nhiều khả năng là Safe) hay **ví thường (EOA)** — EOA chỉ được chấp nhận trên testnet |
| `BSCSCAN_API_KEY` | tùy chọn, chỉ cần cho `npm run verify` |

Cuối cùng là checklist tiếng Việt những gì **còn thiếu trước `npm run deploy:testnet`** (hoặc
`deploy:mainnet`). Exit code `0` = sẵn sàng; `1` = còn thiếu hoặc không kết nối được RPC (script
in lỗi rõ ràng thay vì treo). Ví dụ kết quả khi chưa có gì:

```
  [!!]   PRIVATE_KEY chưa đặt
  [OK]   RPC https://data-seed-prebsc-1-s1.bnbchain.org:8545 (mặc định, endpoint công khai) phản hồi, chainId 97
  [!!]   TREASURY_ADDRESS chưa đặt (ví nhận toàn bộ 1.000.000.000 LIXI khi deploy)
  ...
CHƯA SẴN SÀNG cho `npm run deploy:testnet`. Còn thiếu:
  1. Tạo ví deploy: `npm run wallet:new -- --write-env` ...
  2. Điền TREASURY_ADDRESS trong .env ...
```

### 0.3 Lấy BNB testnet (tBNB)

Ví deploy cần BNB testnet để trả gas (deploy token ~0,01–0,02 BNB, mỗi ví vesting thêm ~0,01 BNB;
nên có ≥ 0,05 BNB). Nguồn chính thức: **faucet của BNB Chain tại
<https://www.bnbchain.org/en/testnet-faucet>** — dán địa chỉ ví deploy (dòng `địa chỉ ví deploy`
mà `npm run check` in ra). Lưu ý faucet này **có thể yêu cầu ví có một ít BNB mainnet** hoặc xác
minh qua mạng xã hội/Discord để chống spam, và giới hạn số lần nhận mỗi ngày. Các faucet thay thế
(của nhà cung cấp RPC, cộng đồng...) thay đổi thường xuyên; chỉ dùng faucet mà bạn xác minh được là
của tổ chức đáng tin cậy và **không bao giờ nhập mnemonic/khóa riêng vào bất kỳ faucet nào** — faucet
chỉ cần địa chỉ ví.

Sau khi nhận tBNB, chạy lại `npm run check` cho tới khi thấy `SẴN SÀNG`, rồi sang mục Deploy.

## Deploy

### 1. Token trên testnet (chainId 97)

```bash
npm run deploy:testnet
```

Script sẽ: kiểm tra `TREASURY_ADDRESS`, deploy `LiXi(treasury)`, chờ 3 xác nhận, in địa chỉ,
tổng cung, số dư treasury và lưu vào `deployments/bscTestnet.json`. Chạy lại sẽ không deploy đè
(xóa file deployments nếu thật sự muốn deploy mới).

### 2. Token trên mainnet (chainId 56)

```bash
npm run deploy:mainnet
```

Trên mainnet script cảnh báo nếu `TREASURY_ADDRESS` không phải hợp đồng (tức không phải multisig).

### 3. Ví vesting

1. Sao chép `config/allocations.example.json` thành `config/allocations.json`, điền địa chỉ thật
   và đặt `ALLOCATIONS_FILE=config/allocations.json` trong `.env`.
2. Đặt `TGE_TIMESTAMP` (khuyến nghị đặt rõ ràng thay vì để mặc định).
3. Chạy:

```bash
npm run deploy:vesting:testnet     # hoặc deploy:vesting:mainnet
```

Script deploy một `LiXiVestingWallet` cho mỗi nhóm có phần vesting > 0, in bảng
(nhóm, % cung, tổng LIXI, mở khóa TGE, số vào vesting, cliff, vesting, tháng mở hết, beneficiary,
địa chỉ ví) và ghi vào `deployments/<network>.json`.

**Chuyển token vào ví:**

- Nếu treasury là multisig (khuyến nghị): để `FUND_VESTING` trống. Script in danh sách lệnh
  `transfer(địa_chỉ, số_lượng)` để bạn tạo giao dịch trên Safe.
- Nếu ví ký đang giữ token (testnet): `FUND_VESTING=true` để script tự chuyển.

**Ý nghĩa các trường cấu hình** (mỗi tháng = 30 ngày; cùng quy ước với
`tokenomics/unlock_schedule.py`, nên hai file config phải khớp nhau):

| Trường | Ý nghĩa |
|---|---|
| `percent` | % tổng cung của nhóm (tối đa 2 chữ số thập phân). Tổng tất cả nhóm phải = 100 |
| `tgeUnlockPercent` | % **của nhóm** chuyển thẳng cho beneficiary tại TGE, phần còn lại vào ví vesting |
| `cliffMonths` | Khóa hoàn toàn: không giải phóng gì trước `TGE + cliffMonths`, và đúng 0 tại thời điểm hết cliff |
| `vestingMonths` | Sau cliff, phần vesting giải phóng tuyến tính trong `vestingMonths` tháng; mở hết tại `TGE + cliffMonths + vestingMonths` |

Trên chuỗi, mỗi ví là OpenZeppelin `VestingWallet` với `start = TGE + cliffMonths` và
`duration = vestingMonths` — không có công thức tự viết. Ví dụ đội ngũ cliff 12 / vesting 36:
0 % đến hết tháng 12, 50 % tại tháng 30, 100 % tại tháng 48.

Trường hợp đặc biệt: `vestingMonths = 0` và `cliffMonths > 0` → mở một lần tại `TGE + cliffMonths`
(ví có `duration = 0`); cả hai = 0 → toàn bộ nhóm thanh khoản ngay tại TGE, không deploy ví.

Ai cũng có thể gọi `release(token)` trên ví vesting; token luôn về beneficiary. Beneficiary là
`owner()` của ví (thiết kế của OpenZeppelin) nhưng owner không thể rút sớm hay đổi lịch.

## Verify mã nguồn trên BscScan

```bash
npm run verify -- --network bscTestnet
npm run verify -- --network bsc
```

Script đọc `deployments/<network>.json` và verify token cùng toàn bộ ví vesting đã ghi nhận.
Verify thủ công một hợp đồng:

```bash
npx hardhat verify --network bsc <TOKEN_ADDRESS> <TREASURY_ADDRESS>
npx hardhat verify --network bsc <WALLET_ADDRESS> <BENEFICIARY> <START> <DURATION>
```

Sau khi verify, gửi thông tin token (logo, website, mạng xã hội) cho BscScan, CoinGecko và
CoinMarketCap.

## Tạo thanh khoản trên PancakeSwap

Mục tiêu hiện tại của dự án là token **giao dịch được trên PancakeSwap (DEX) và các sàn tập trung
nhỏ**, không nhắm tới niêm yết Binance. Cặp LIXI/BNB trên PancakeSwap V2 là nơi giá được hình thành
đầu tiên, và giao dịch `addLiquidityETH` đầu tiên chính là giao dịch **đặt giá khởi điểm** cho mọi
người. Script `scripts/add-liquidity.js` tự động hóa bước này.

### Thứ tự thực hiện

1. **Deploy token** (`npm run deploy:testnet` / `deploy:mainnet`) và **deploy ví vesting**.
2. **Verify** mã nguồn trên BscScan (`npm run verify -- --network ...`). Verify trước khi có
   thanh khoản để người mua sớm nhất cũng đọc được mã nguồn.
3. **Chuyển phần phân bổ thanh khoản** (nhóm `liquidity`, 8 % = 80.000.000 LIXI) từ treasury
   (multisig) sang ví ký của script, kèm đủ BNB cho pool + gas. Ví ký chỉ nên giữ đúng số cần dùng.
4. **Thêm thanh khoản**: `npm run liquidity:testnet` rồi `npm run liquidity:mainnet` (xem dưới).
5. **Khóa LP token** ngay sau đó (xem mục "Khóa LP").
6. **Gửi thông tin** cho DexScreener (tự index cặp, chỉ cần cập nhật logo/social), CoinGecko và
   CoinMarketCap (form niêm yết, cần link khóa LP, verify BscScan, website, mạng xã hội).

### Chọn giá khởi điểm

Giá ban đầu chỉ phụ thuộc vào tỷ lệ hai lượng đưa vào pool:

```
giá (BNB/LIXI) = LIQUIDITY_BNB_AMOUNT / LIQUIDITY_TOKEN_AMOUNT
LIXI mỗi BNB   = LIQUIDITY_TOKEN_AMOUNT / LIQUIDITY_BNB_AMOUNT
FDV (USD)      = giá × 1.000.000.000 × giá BNB (USD)
```

Ví dụ với toàn bộ nhóm thanh khoản **8 % cung = 80.000.000 LIXI**:

| BNB ghép cặp | Giá 1 LIXI | 1 BNB đổi được | FDV (giả sử BNB = 600 USD) | Giá trị pool |
|---|---|---|---|---|
| 50 BNB | 0,000000625 BNB (~0,000375 USD) | 1.600.000 LIXI | ~375.000 USD | ~60.000 USD |
| **100 BNB** | **0,00000125 BNB (~0,00075 USD)** | **800.000 LIXI** | **~750.000 USD** | **~120.000 USD** |
| 200 BNB | 0,0000025 BNB (~0,0015 USD) | 400.000 LIXI | ~1.500.000 USD | ~240.000 USD |

Cách chọn: quyết định FDV mục tiêu (thường bằng hoặc thấp hơn một chút so với giá vòng private để
nhà đầu tư không bán ngay), suy ra giá, rồi chọn lượng BNB sao cho giá trị pool đủ lớn để lệnh mua
vài trăm USD không làm giá nhảy quá 1–2 % (pool càng mỏng, giá càng dễ bị thao túng). Toàn bộ LIXI
của nhóm thanh khoản nên vào pool cùng lúc; đừng giữ lại để "thêm sau" vì phần thêm sau sẽ theo giá
thị trường lúc đó. Script in ra giá suy ra từ hai con số trước khi gửi giao dịch — hãy đọc kỹ dòng
`Implied price`.

### Chạy script

Điền vào `.env`:

```
LIQUIDITY_TOKEN_AMOUNT=80000000
LIQUIDITY_BNB_AMOUNT=100
LP_RECIPIENT=0x...        # multisig nhận LP; để trống = ví ký
SLIPPAGE_BPS=100
DEADLINE_MINUTES=20
```

```bash
npm run liquidity:testnet                       # chainId 97, router testnet
CONFIRM_MAINNET=yes npm run liquidity:mainnet   # chainId 56, router mainnet
```

Script sẽ:

1. Đọc địa chỉ token từ `deployments/<network>.json` (hoặc `TOKEN_ADDRESS`), chọn router
   PancakeSwap V2 theo chainId (mainnet `0x10ED43C718714eb63d5aA57B78B54704E256024E`, testnet
   `0xD99D1c33F9fC3444f8101754aBC46c52416550D1`, ghi đè bằng `ROUTER_ADDRESS`), kiểm tra router và
   token có mã hợp đồng, ví ký có đủ LIXI và BNB.
2. Trên **mainnet**: in cảnh báo lớn và **dừng lại nếu không có `CONFIRM_MAINNET=yes`**.
3. Cảnh báo nếu cặp đã tồn tại và đã có reserve (khi đó giá do pool quyết định, không phải hai con
   số bạn nhập, và giao dịch có thể bị từ chối bởi giới hạn trượt giá).
4. `approve(router, đúng số LIXI)` — bỏ qua nếu allowance đã đủ. Không approve vô hạn.
5. Gọi `addLiquidityETH(token, amount, amountTokenMin, amountETHMin, LP_RECIPIENT, deadline)` kèm
   `value = BNB`.
6. Đọc `router.factory()` → `getPair(token, WBNB)`, in **địa chỉ cặp (chính là LP token)**, reserve,
   số LP nhận được, giá khởi điểm (BNB/LIXI và LIXI/BNB), link BscScan, PancakeSwap và DexScreener.
7. Ghi `liquidity` (router, factory, pair, số lượng, LP, tx hash, link) vào
   `deployments/<network>.json`.

**Trượt giá và hạn giao dịch.** `SLIPPAGE_BPS` xác định `amountTokenMin` và `amountETHMin` =
số lượng × (10000 − bps) / 10000. Với pool **mới** (chưa có reserve) router dùng đúng hai lượng bạn
đưa nên `100` bps (1 %) là dư thừa an toàn; giá trị này chỉ có tác dụng khi pool đã có reserve và tỷ
lệ pool khác tỷ lệ bạn nhập. Đừng đặt quá lớn (ví dụ 5.000 bps) vì đó là khoảng mà bot có thể tận
dụng. `DEADLINE_MINUTES` là hạn mà router từ chối thực thi nếu giao dịch bị kẹt trong mempool lâu
hơn; 20 phút là mặc định của giao diện PancakeSwap. Nếu giao dịch hết hạn, chạy lại script — approve
đã có sẽ được dùng lại.

### Khóa LP token

Ai giữ LP token có thể rút toàn bộ pool (cả LIXI lẫn BNB). Vì vậy:

- **LP token = địa chỉ cặp** (dòng `Pair (LP token)` script in ra, cũng lưu ở
  `deployments/<network>.json` → `liquidity.pair`). Đây là hợp đồng BEP-20 "Cake-LP"; số dư LP
  của `LP_RECIPIENT` là thứ cần khóa.
- Dùng dịch vụ khóa bên thứ ba đã được biết đến rộng rãi: **Team Finance** (team.finance),
  **UNCX / Unicrypt** (app.uncx.network) hoặc **PinkLock** (pinksale.finance/pinklock). Quy trình
  chung: kết nối ví giữ LP → chọn "Lock liquidity" / "LP token lock" → dán địa chỉ cặp → chọn số
  lượng và thời hạn → approve LP cho hợp đồng khóa → xác nhận khóa → nhận link công khai.
- **Khóa 100 % LP, tối thiểu 12 tháng** (tốt hơn là 24 tháng hoặc có gia hạn). Khóa một phần hoặc
  thời hạn ngắn bị các công cụ kiểm tra (DexScreener, GoPlus, TokenSniffer) và CoinGecko/CMC coi là
  rủi ro.
- **Chỉ tương tác với hợp đồng khóa đã verify và được biết đến**: kiểm tra địa chỉ hợp đồng khóa
  trên trang tài liệu chính thức của dịch vụ và trên BscScan (mã nguồn verify, nhiều giao dịch, nhiều
  người dùng). Có nhiều trang giả mạo các dịch vụ khóa; mất LP token vào hợp đồng giả đồng nghĩa với
  mất toàn bộ pool.
- Ví giữ LP (và là chủ khóa) nên là **multisig** (`LP_RECIPIENT`); phí khóa trả bằng BNB.
- Công bố link khóa trên website/docs và trong hồ sơ gửi CoinGecko/CMC; ghi lại vào
  `deployments/<network>.json` (trường `liquidity.lock`, thêm thủ công) để có nguồn đối chiếu.

### Giới hạn kiểm thử

- Bộ test chạy `add-liquidity.js` với **router/factory/pair giả lập** trong `contracts/contracts/test/`
  (`MockRouter`, `MockFactory`, `MockPair`, `MockWETH`). Đây là hợp đồng **chỉ dùng cho test**,
  không deploy và không verify lên bất kỳ mạng công khai nào; `verify.js` cũng không động tới chúng.
- **Không thể kiểm thử với router PancakeSwap thật từ môi trường sandbox này** (không có kết nối tới
  BNB Chain). Trước khi chạy mainnet, hãy chạy trọn bộ trên **bscTestnet** với router testnet, mở
  link PancakeSwap testnet để xác nhận swap được, rồi mới dùng `CONFIRM_MAINNET=yes`.

## Checklist bảo mật trước khi lên mainnet

- [ ] **Treasury là multisig** (Safe, ngưỡng 3/5), không phải ví cá nhân. Địa chỉ đã được ít
      nhất 2 người xác nhận độc lập trước khi deploy.
- [ ] Ví deploy tách biệt với ví cá nhân (tạo bằng `npm run wallet:new`, mnemonic đã ghi ra giấy);
      chỉ nạp đủ BNB trả gas; khóa riêng không nằm trong repo, CI log hay chat.
      `npm run check -- --network bsc` báo `SẴN SÀNG` và treasury là hợp đồng.
- [ ] Đã deploy và chạy toàn bộ quy trình trên **testnet** (token + vesting + verify + release thử).
- [ ] `config/allocations.json` khớp với `tokenomics/config.json` đã công bố (cùng nhóm, %, cliff,
      vesting); tổng = 100 %; đội ngũ 0 % tại TGE; `unlock_schedule.py --strict` không còn WARN.
- [ ] `TGE_TIMESTAMP` đặt rõ ràng và trùng với lịch công bố.
- [ ] Beneficiary của các ví vesting lớn (đội ngũ, treasury, chương trình Binance) là multisig.
- [ ] **Audit** bởi hãng uy tín (CertiK, Hacken, Trail of Bits, OpenZeppelin, Quantstamp,
      PeckShield, SlowMist). Báo cáo công khai, mọi lỗi Critical/High đã sửa và được xác nhận lại.
      Phạm vi audit gồm cả script deploy và cấu hình phân bổ.
- [ ] Bug bounty (Immunefi hoặc tự vận hành) sau audit.
- [ ] **Mã nguồn đã verify** trên BscScan cho token và mọi ví vesting; bytecode khớp với commit
      đã audit (không thay đổi code sau audit).
- [ ] Đã xác nhận trên BscScan: không có hàm mint/owner/pause/blacklist, `totalSupply` = 1 tỷ,
      toàn bộ số dư nằm ở treasury ngay sau deploy.
- [ ] **Thanh khoản**: `LIQUIDITY_TOKEN_AMOUNT` / `LIQUIDITY_BNB_AMOUNT` và giá suy ra đã được ít nhất
      2 người kiểm tra; đã chạy thử trọn bộ trên testnet; `LP_RECIPIENT` là multisig.
- [ ] **Khóa 100 % LP** trên PancakeSwap tối thiểu 12 tháng qua dịch vụ khóa uy tín (hợp đồng khóa đã
      verify, đúng địa chỉ chính thức); công bố link khóa.
- [ ] Hợp đồng với market maker không cho quyền bán token không giới hạn.
- [ ] Công bố địa chỉ token, ví vesting, ví treasury, lịch unlock trên docs/website và các trang
      theo dõi unlock (Tokenomist, CryptoRank).
- [ ] Quy trình ký duyệt multisig bằng văn bản; kế hoạch xử lý sự cố (ai liên hệ, làm gì nếu
      khóa deploy bị lộ, v.v.).
- [ ] Nâng cấp phụ thuộc (`npm audit`) và ghim phiên bản; không đổi phiên bản OpenZeppelin sau audit.

## Ghi chú kỹ thuật

- Hardhat 2.29.1, `@nomicfoundation/hardhat-toolbox` 5.0.0 (ethers v6, chai matchers,
  hardhat-verify, network-helpers), OpenZeppelin Contracts 5.7.0, solc 0.8.28 — tất cả ghim
  phiên bản chính xác trong `package.json`.
- `evmVersion: cancun`: OpenZeppelin 5.7 dùng opcode `MCOPY`; BNB Chain đã hỗ trợ Cancun từ các
  hardfork năm 2024.
- Phiên bản compiler ghi trong build-info là `0.8.28+commit.7893614a`, trùng với binary gốc nên
  verify trên BscScan bình thường.
- `deployments/*.json` bị bỏ qua khi commit theo mặc định. Với mainnet, nên lưu file này vào nơi
  an toàn và công bố các địa chỉ trong tài liệu dự án.
