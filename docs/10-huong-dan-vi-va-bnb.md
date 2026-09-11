# Hướng dẫn tạo ví, mua BNB và chuẩn bị deploy (cho người chưa từng làm)

> Đây là phần **không ai làm thay bạn được**: ví và tiền phải nằm trong tay bạn. Khóa ví tạo ở máy người khác
> hoặc trên máy chủ thuê là khóa đã lộ. Làm theo thứ tự dưới đây, mỗi bước 5–15 phút.

## Bước 1. Tạo ví deploy trên máy của bạn (10 phút)

Cần cài Node.js 22 (nodejs.org) và Git. Sau đó trong terminal:

```bash
git clone https://github.com/nirannguyen50/new-coin.git
cd new-coin/contracts
npm ci
npm run wallet:new -- --write-env
```

Script in ra **địa chỉ ví**, **12 từ khôi phục** và ghi khóa riêng vào file `contracts/.env`.

- Chép 12 từ ra giấy, cất nơi an toàn. Mất 12 từ = mất ví, không ai khôi phục được.
- Không chụp màn hình, không gửi qua chat, không dán vào bất kỳ website nào.
- File `.env` đã nằm trong `.gitignore`, không bao giờ commit nó.
- Ví này chỉ dùng để deploy và vận hành. Không giữ nhiều tiền trong đó.

Muốn xem ví trong điện thoại: cài **Trust Wallet** hoặc **MetaMask**, chọn "Import wallet", nhập 12 từ. Thêm mạng BNB Smart Chain nếu app hỏi.

## Bước 2. Lấy BNB testnet miễn phí và chạy thử (30 phút)

Testnet là mạng giả lập, tiền không có giá trị, dùng để tập.

1. Vào faucet chính thức: https://www.bnbchain.org/en/testnet-faucet, dán địa chỉ ví, nhận 0.1–0.3 tBNB. Faucet có thể yêu cầu ví đã có chút BNB thật hoặc xác minh mạng xã hội; nếu bị chặn, tìm "BNB testnet faucet" trên Google, các faucet đổi thường xuyên.
2. Kiểm tra mọi thứ đã sẵn sàng:
   ```bash
   npm run check -- --network bscTestnet
   ```
3. Chạy trọn quy trình trên testnet:
   ```bash
   npm run deploy:testnet          # deploy token
   npm run verify -- --network bscTestnet
   npm run liquidity:testnet       # tạo pool PancakeSwap testnet
   ```
   Xem kết quả tại https://testnet.bscscan.com bằng địa chỉ in ra màn hình.

Làm bước này ít nhất một lần cho đến khi không còn lỗi. Mainnet lặp lại y hệt nhưng bằng tiền thật.

## Bước 3. Mua BNB thật (tiền thật, 1–2 ngày lần đầu vì phải xác minh danh tính)

Cần bao nhiêu:

| Mục đích | Lượng BNB |
|---|---|
| Gas deploy + verify + tạo pool + khóa LP | ~0.05 BNB là dư |
| Thanh khoản tối thiểu để có người lạ giao dịch được | tương đương 5.000–20.000 USD |
| Thanh khoản khuyến nghị cho dự án nghiêm túc | tương đương 20.000–50.000 USD |

Cách mua từ Việt Nam:

1. Tạo tài khoản trên một sàn lớn có P2P bằng VND (Binance, OKX, Bybit). Xác minh danh tính (CCCD + selfie).
2. Vào mục **P2P**, mua **USDT** bằng chuyển khoản ngân hàng từ người bán có uy tín cao (tỷ lệ hoàn thành > 98%, nhiều giao dịch).
3. Chuyển USDT sang **Spot**, mua **BNB**.
4. Rút BNB về ví deploy: chọn mạng **BNB Smart Chain (BEP20)**, dán địa chỉ ví. **Sai mạng là mất tiền.** Lần đầu rút thử số nhỏ (0.01 BNB) trước.

Mẹo: bạn có thể ghép cặp thanh khoản bằng **USDT** thay vì BNB nếu muốn giá token ổn định hơn theo USD; script hiện tại ghép với BNB, đổi sang USDT cần chỉnh script (`addLiquidity` thay vì `addLiquidityETH`).

## Bước 4. Tạo ví Safe multisig cho treasury (20 phút)

Safe là ví "két sắt" cần nhiều chữ ký để chuyển tiền, dùng để giữ phần token treasury, thanh khoản và ví vesting. Ngay cả khi bạn làm một mình, Safe vẫn có ích vì tách ví deploy (hay dùng, dễ lộ) khỏi ví giữ tài sản.

1. Vào https://app.safe.global, kết nối ví deploy (qua MetaMask/Trust WalletConnect), chọn mạng **BNB Smart Chain**.
2. Create new Safe. Chủ sở hữu (owners):
   - Làm một mình: thêm 2 địa chỉ của chính bạn từ hai thiết bị khác nhau (ví điện thoại + ví MetaMask máy tính, hoặc ví cứng Ledger), ngưỡng **2/2** hoặc **2/3**.
   - Có đồng đội: mỗi người một địa chỉ, ngưỡng 2/3 hoặc 3/5.
3. Trả gas tạo Safe (~0.005 BNB). Chép địa chỉ Safe vào `contracts/.env` ở dòng `TREASURY_ADDRESS=`.
4. Lặp lại trên testnet (app Safe có hỗ trợ BSC testnet) trước khi làm mainnet.

Từ lúc này, script `deploy:mainnet` sẽ mint toàn bộ 1 tỷ LIXI vào Safe; ví deploy không giữ token.

## Bước 5. Thứ tự ngày ra mắt mainnet

1. `npm run check -- --network bsc` phải báo mọi thứ sẵn sàng.
2. `npm run deploy:mainnet` rồi `npm run verify -- --network bsc`.
3. Từ Safe, chuyển phần token theo phân bổ: chạy `deploy-vesting.js` để tạo ví vesting và in ra danh sách lệnh chuyển; thực hiện các lệnh đó trong giao diện Safe.
4. Chuyển phần thanh khoản (8% = 80.000.000 LIXI) và BNB sang ví deploy, chạy `npm run liquidity:mainnet` với `CONFIRM_MAINNET=yes`.
5. Khóa LP: vào Team Finance hoặc UNCX, chọn mạng BSC, dán địa chỉ pair (script in ra), khóa 100% LP tối thiểu 12 tháng, chuyển quyền sở hữu khóa cho Safe. Lưu link khóa.
6. Cập nhật địa chỉ contract, pair, link khóa vào website và ghim ở mọi kênh cộng đồng.
7. Nộp form CoinGecko và CoinMarketCap.

## Nếu bạn muốn tôi làm phần kỹ thuật thay bạn

Tôi có thể chạy toàn bộ bước 2 (testnet) nếu bạn:
1. Tự tạo ví bằng bước 1 trên máy bạn.
2. Nạp tBNB từ faucet vào ví đó.
3. Gửi tôi **khóa riêng của ví testnet đó** (chỉ dùng cho testnet, không bao giờ đưa ví mainnet cho ai, kể cả tôi).

Với mainnet, tôi khuyên bạn tự bấm lệnh theo bước 5; mỗi lệnh chỉ là một dòng và tôi đã viết sẵn. Bạn có thể chat với tôi trong lúc làm để xử lý lỗi.
