# NewCoin (NEWC) — Hợp đồng token BEP-20 và vesting

Dự án Hardhat cho token tiện ích **NewCoin (NEWC)** trên BNB Chain, tuân theo các quy tắc bảo mật
trong `docs/01-ke-hoach-tong-the.md` (Giai đoạn 4) và `docs/03-tokenomics-template.md`.

## Tổng quan

| Hạng mục | Giá trị |
|---|---|
| Tên / ticker | NewCoin / NEWC |
| Chuẩn | BEP-20 (ERC-20 của OpenZeppelin Contracts v5.7) |
| Decimals | 18 |
| Tổng cung | 1.000.000.000 NEWC, mint **một lần duy nhất** trong constructor cho địa chỉ treasury |
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
│   ├── NewCoin.sol                 # Token BEP-20 cố định cung, không admin
│   └── NewCoinVestingWallet.sol    # Wrapper để deploy OZ VestingWallet (không có logic tự viết)
├── config/
│   └── allocations.example.json    # Mẫu cấu hình phân bổ / vesting (khớp tokenomics/config.example.json)
├── scripts/
│   ├── deploy.js                   # Deploy token
│   ├── deploy-vesting.js           # Deploy ví vesting theo config, in bảng tổng hợp
│   ├── verify.js                   # Verify mã nguồn trên BscScan
│   └── lib/                        # Hàm tính phân bổ + lưu file deployments
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
cp .env.example .env      # rồi điền giá trị thật
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

Xem gas: `REPORT_GAS=true npm test`.

## Biến môi trường (`.env`)

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `PRIVATE_KEY` | Deploy | Khóa riêng ví deploy. Dùng ví riêng, chỉ nạp đủ BNB trả gas |
| `BSC_RPC_URL` | Mainnet | RPC BNB Chain mainnet (mặc định endpoint công khai) |
| `BSC_TESTNET_RPC_URL` | Testnet | RPC BNB testnet (mặc định endpoint công khai) |
| `BSCSCAN_API_KEY` | Verify | API key Etherscan v2 (dùng chung cho BscScan) |
| `TREASURY_ADDRESS` | Deploy token | Địa chỉ nhận toàn bộ 1 tỷ NEWC. **Mainnet phải là multisig** |
| `ALLOCATIONS_FILE` | Vesting | Đường dẫn file cấu hình (mặc định `config/allocations.example.json`) |
| `TGE_TIMESTAMP` | Vesting | Unix time (giây) của TGE; để trống = thời gian block hiện tại |
| `FUND_VESTING` | Vesting | `true` để script tự chuyển token từ ví ký vào các ví vesting |
| `TOKEN_ADDRESS` | Vesting | Ghi đè địa chỉ token (mặc định đọc từ `deployments/<network>.json`) |

## Deploy

### 1. Token trên testnet (chainId 97)

```bash
npm run deploy:testnet
```

Script sẽ: kiểm tra `TREASURY_ADDRESS`, deploy `NewCoin(treasury)`, chờ 3 xác nhận, in địa chỉ,
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

Script deploy một `NewCoinVestingWallet` cho mỗi nhóm có phần vesting > 0, in bảng
(nhóm, % cung, tổng NEWC, mở khóa TGE, số vào vesting, cliff, vesting, tháng mở hết, beneficiary,
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

## Checklist bảo mật trước khi lên mainnet

- [ ] **Treasury là multisig** (Safe, ngưỡng 3/5), không phải ví cá nhân. Địa chỉ đã được ít
      nhất 2 người xác nhận độc lập trước khi deploy.
- [ ] Ví deploy tách biệt với ví vận hành; chỉ nạp đủ BNB trả gas; khóa riêng không nằm trong
      repo, CI log hay chat.
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
- [ ] **Khóa LP** trên PancakeSwap tối thiểu 12 tháng qua dịch vụ khóa uy tín; công bố link khóa.
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
