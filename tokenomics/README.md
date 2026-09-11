# Công cụ lịch unlock và kiểm tra red flag tokenomics

Công cụ nhỏ bằng Python biến một file cấu hình phân bổ token thành **lịch unlock theo tháng**
(mặc định 36 tháng) và tự chấm các **red flag** nêu trong `docs/03-tokenomics-template.md`.
Mục đích: thay cho việc tự dựng `tokenomics.xlsx` bằng tay, để mỗi lần đổi số phân bổ/vesting
là có ngay bảng, biểu đồ và kết quả kiểm tra nhất quán để đưa vào whitepaper và hồ sơ Binance.

Chỉ dùng thư viện chuẩn của Python + `matplotlib` (vẽ biểu đồ) + `pytest` (chạy test).

## Cấu trúc thư mục

| File | Nội dung |
|---|---|
| `unlock_schedule.py` | Công cụ dòng lệnh: đọc config, tính lịch, kiểm tra red flag, ghi CSV/Markdown/PNG |
| `config.example.json` | Cấu hình mẫu: tổng cung 1 tỷ NEWC, 8 nhóm theo cột "ví dụ tham khảo" của template |
| `test_unlock_schedule.py` | Unit test (pytest) |
| `requirements.txt` | Phiên bản `matplotlib` và `pytest` đã ghim |
| `out/` | Kết quả sinh từ config mẫu: `schedule.csv`, `schedule.md`, `unlock_chart.png` |

## Cách chạy

```bash
cd tokenomics
python3 -m pip install -r requirements.txt

# Sinh lịch 36 tháng từ config mẫu, ghi vào thư mục out/
python3 unlock_schedule.py config.example.json --months 36 --out out/

# Chạy test
python3 -m pytest -q
```

Tùy chọn dòng lệnh:

| Tùy chọn | Ý nghĩa |
|---|---|
| `config` | Đường dẫn file JSON cấu hình (bắt buộc) |
| `--months N` | Số tháng sau TGE cần tính. Bỏ trống thì lấy `horizon_months` trong config (mặc định 36) |
| `--out DIR` | Thư mục ghi kết quả (mặc định `out/`, tự tạo nếu chưa có) |
| `--no-chart` | Không vẽ PNG (nhanh hơn, dùng khi chỉ cần bảng) |
| `--strict` | Trả mã thoát 1 nếu có bất kỳ WARN nào — dùng trong CI để chặn config có red flag |

Kết quả in ra màn hình gồm tóm tắt lưu hành và danh sách PASS/WARN; cùng nội dung được ghi vào `schedule.md`.

## Đầu ra

- **`schedule.csv`** — mỗi dòng là một tháng (tháng 0 = TGE). Cột:
  - `<key>_unlock`: số token nhóm đó mở khóa **trong** tháng;
  - `<key>_cum`: lũy kế nhóm đó đến hết tháng;
  - `total_unlock`: tổng mở trong tháng; `total_circulating`: tổng lưu hành; `pct_of_supply`: % tổng cung;
  - `mom_unlock_pct_of_prior_circ`: lượng mở trong tháng chia cho lưu hành **cuối tháng trước** (để trống ở tháng 0).
  Mở được bằng Excel/Google Sheets để dán vào `tokenomics.xlsx` hoặc gửi cho Tokenomist/CryptoRank.
- **`schedule.md`** — tóm tắt (lưu hành tại TGE, tháng 3/6/12/24/36, tháng unlock mạnh nhất, nhóm chưa mở hết),
  bảng phân bổ và vesting, bảng lịch theo tháng (đơn vị triệu token), bảng kết quả red flag, và nhúng biểu đồ.
- **`unlock_chart.png`** — stacked area cung lưu hành theo nhóm (% tổng cung), có đường tổng, mốc hết cliff
  của đội ngũ và nhà đầu tư.

## Cách sửa config

Sao chép `config.example.json` thành file mới (ví dụ `config.json`) rồi sửa. Cấu trúc:

```json
{
  "token": { "name": "New Coin", "ticker": "NEWC", "total_supply": 1000000000, "decimals": 18 },
  "horizon_months": 36,
  "rules": { "max_monthly_unlock_pct_of_prior_circ": 8.0 },
  "buckets": [
    {
      "key": "team_advisors",
      "name": "Đội ngũ & cố vấn",
      "role": "team",
      "pct": 18,
      "tge_unlock_pct": 0,
      "cliff_months": 12,
      "vesting_months": 36,
      "note": "..."
    }
  ]
}
```

Ý nghĩa từng trường của một nhóm (`bucket`):

| Trường | Ý nghĩa |
|---|---|
| `key` | Mã ngắn, không dấu, duy nhất; dùng làm tên cột trong CSV |
| `name` | Tên hiển thị trong bảng và biểu đồ |
| `role` | Vai trò để áp quy tắc kiểm tra. Các role được nhận diện: `team`, `investors`, `liquidity`. Các role khác (`community`, `treasury`, `binance`, `marketing`, `public`, ...) chỉ mang tính mô tả |
| `pct` | % tổng cung của nhóm. Tổng các nhóm phải bằng 100 |
| `tge_unlock_pct` | % **của nhóm** (không phải của tổng cung) mở ngay tại TGE (tháng 0). Ví dụ Marketing 5% tổng cung, `tge_unlock_pct` 20 → 1% tổng cung mở tại TGE |
| `cliff_months` | Số tháng sau TGE không mở thêm gì |
| `vesting_months` | Số tháng mở tuyến tính đều **sau cliff**: bắt đầu tháng `cliff + 1`, kết thúc tháng `cliff + vesting`. Đặt `0` nếu phần còn lại mở một lần tại tháng `cliff` (với cliff 0 và TGE 100% thì không còn gì để mở) |
| `note` | Ghi chú tự do, hiển thị trong bảng phân bổ của `schedule.md` |

Ngưỡng kiểm tra có thể đổi trong `rules` (bỏ trống thì dùng mặc định):

| Quy tắc | Mặc định |
|---|---|
| `max_monthly_unlock_pct_of_prior_circ` | 8 (% lưu hành tháng trước) |
| `tge_circulating_min_pct` / `tge_circulating_max_pct` | 8 / 25 (% tổng cung) |
| `team_plus_investors_max_pct` | 40 (% tổng cung) |
| `first_3_months_max_pct_of_tge_circ` | 30 (% lưu hành tại TGE) |

Biểu đồ hỗ trợ tối đa 8 nhóm (bảng màu cố định đã kiểm tra tách biệt cho người mù màu). Nếu có hơn 8 nhóm,
gộp các nhóm nhỏ lại hoặc chạy với `--no-chart`.

## Cách đọc kết quả red flag

Mỗi dòng có dạng `[PASS|WARN] <quy tắc>: <số liệu>`. `WARN` không làm công cụ dừng (trừ khi dùng `--strict`);
nó chỉ ra chỗ cần giải trình hoặc sửa trước khi đưa tokenomics vào hồ sơ.

| Quy tắc | PASS khi | Khi WARN nên làm gì |
|---|---|---|
| Tổng phân bổ = 100% | Tổng `pct` các nhóm = 100 | Sửa `pct`; số liệu in ra cho biết lệch bao nhiêu |
| Đội ngũ 0% tại TGE | Nhóm `role: team` có `tge_unlock_pct` = 0 | Đặt về 0. Template và Binance coi đội ngũ có unlock tại TGE là red flag rõ ràng. Cũng WARN nếu không có nhóm `team` |
| Đội ngũ + nhà đầu tư ≤ 40% | `pct(team) + pct(investors)` ≤ ngưỡng | Giảm phần đội ngũ/nhà đầu tư, chuyển sang cộng đồng/treasury |
| Không tháng nào unlock > 8% lưu hành tháng trước | Với mọi tháng ≥ 1, `total_unlock / lưu hành tháng trước` ≤ ngưỡng | Số liệu in ra tháng cao nhất và danh sách tháng vi phạm (`T13=9.5%` ...). Cách sửa thường gặp: kéo dài `vesting_months`, tăng lưu hành tại TGE (nhưng vẫn trong ngưỡng), lệch `cliff_months` để các nhóm không hết cliff cùng lúc |
| Lưu hành tại TGE trong [8%, 25%] | % tổng cung mở tại tháng 0 nằm trong khoảng | Quá thấp: giá dễ bị thao túng, khó qua tiêu chí thanh khoản; quá cao: áp lực bán lớn. Chỉnh `tge_unlock_pct` các nhóm cộng đồng/thanh khoản/public sale |
| Có nhóm thanh khoản (LP) | Có nhóm `role: liquidity` với `pct` > 0 | Thêm nhóm thanh khoản 5–10% tổng cung; nhớ khóa LP ≥ 12 tháng (công cụ không kiểm tra được việc khóa on-chain) |
| Unlock 3 tháng đầu ≤ 30% lưu hành TGE | Tổng mở tháng 1–3 chia cho lưu hành tại TGE ≤ ngưỡng | Bổ sung từ bảng red flag của template (">30% cung lưu hành mở khóa trong 3 tháng đầu"). Cách sửa như quy tắc 8%/tháng |

Lưu ý: công cụ chỉ kiểm tra được **số học của lịch unlock**. Các red flag khác trong template (quyền mint,
ví không multisig, LP không khóa, use case của token, điều khoản với market maker) phải tự rà soát.

## Kết quả với config mẫu

Config mẫu (`config.example.json`) cho lưu hành tại TGE 14,86%, tháng unlock mạnh nhất là tháng 1 (7,77% lưu
hành tháng trước) và qua cả 7 quy tắc. Xem `out/schedule.md`. Điểm cần lưu ý khi dùng làm mẫu:

- Nhà đầu tư dùng cliff 9 tháng (thay vì 6) để tháng đầu sau cliff (T10) không trùng tháng hết cliff đội ngũ
  (T13) và mốc giải ngân chương trình Binance (T4), đồng thời giữ mọi tháng dưới 8%.
- Cộng đồng vest 48 tháng và đội ngũ cliff 12 + vest 36 nên đến tháng 36 mới lưu hành 86,4%; hai nhóm này mở hết
  ở tháng 48. Chạy `--months 48` để xem toàn bộ.
- Nhóm Treasury và Chương trình Binance thực tế giải ngân theo đề xuất quản trị/theo chương trình, ở đây được
  mô hình hóa tuyến tính để có con số ước lượng; khi đã có lịch thật, sửa lại config cho khớp.
