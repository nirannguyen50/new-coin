# Website LiXi — trang tĩnh

Hai trang HTML, không thư viện, không bước build, **không tải bất kỳ tài nguyên nào từ bên thứ ba**
(không CDN, không font ngoài, không analytics). Chạy tốt từ 400px đến màn hình lớn; tự chuyển sáng/tối
theo `prefers-color-scheme`.

```
website/                 ← Vercel phục vụ đúng thư mục này (outputDirectory)
├── index.html     # TRANG CHỦ: Lì Xì Bot — bot làm gì, 7 bước thêm bot vào nhóm, bảng lệnh, hỏi đáp
├── token.html     # Bản nháp kế hoạch token (chưa hoàn chỉnh, noindex, KHÔNG liên kết từ trang chủ)
├── style.css      # giao diện, biến màu sáng/tối (dùng chung cho cả hai trang)
├── script.js      # CONFIG (link), ALLOCATIONS (tokenomics), biểu đồ, menu mobile (dùng chung)
└── README.md
```

| Địa chỉ khi đã deploy | File |
|---|---|
| `/` | `index.html` — trang Lì Xì Bot |
| `/token` (hoặc `/token.html`) | `token.html` |
| `/them-bot.html`, `/them-bot` | chuyển hướng về `/` (tên cũ của trang hướng dẫn) |

Cấu hình phục vụ nằm ở `vercel.json` ở thư mục gốc; lý do từng dòng ở `VERCEL.md`.

## Trang chủ viết cho ai

Cho **admin một nhóm Telegram** đang cân nhắc có nên thêm một con bot lạ vào nhóm của mình — phần lớn
không biết gì về crypto và không quan tâm. Vì vậy, mọi lần sửa trang chủ phải giữ ba điều sau đây
đúng **ngay trong màn hình đầu tiên**:

1. Bot này làm gì trong nhóm (tặng điểm cảm ơn, bao lì xì chia ngẫu nhiên, thưởng người chăm hoạt động).
2. Miễn phí.
3. **Điểm không phải tiền**, không đổi ra tiền, có thể bị xóa khi nâng cấp.

Và ba điều không được làm:

- **Không** đưa nội dung token/tokenomics/giá lên trang chủ. Người đọc sẽ hiểu là lừa đảo crypto và đi mất.
  Nội dung đó ở `token.html`, cố tình không liên kết từ thanh điều hướng.
- **Không** dùng từ chuyên ngành crypto (`seed phrase`, `on-chain`, `ví`, `tài sản mã hóa`) trên trang chủ.
- **Không** bịa số người dùng, lời chứng thực, đối tác hay báo chí. Chưa có thì không viết.

## Xem thử trên máy

```bash
cd website
python3 -m http.server 8080
# mở http://localhost:8080  → ra đúng trang chủ như trên Vercel
```

Mở thẳng file bằng trình duyệt (`file://…/website/index.html`) cũng xem được bố cục, nhưng các link
Telegram/GitHub sẽ không bấm được (xem mục dưới). Dùng `http.server` khi cần bấm thử link.

## Link ra ngoài viết dạng `//host/...` (không kèm `https:`)

Trang **không được tải** tài nguyên từ bên ngoài, và CI kiểm tra điều đó bằng cách tìm chuỗi `https://`
trong các file được phục vụ. Nhưng trang vẫn cần **liên kết** (người dùng bấm) sang Telegram và GitHub.
Giải pháp: viết link không kèm giao thức —

```html
<a href="//t.me/lixi_vn_bot?startgroup=true">Thêm Lì Xì Bot vào nhóm</a>
```

Trình duyệt tự thêm giao thức của trang, nên trên `https://…vercel.app` link chạy bình thường. Chỉ khi mở
bằng `file://` thì link không giải được — đó là hạn chế của cách xem thử, không phải của trang đã deploy.

### Khi đổi bot (đổi username) phải sửa đúng hai chỗ

Username bot nằm trong link `//t.me/<username>?startgroup=true`, hiện là `lixi_vn_bot`
(`docs/14` có kế hoạch tạo bot mới với username không chứa chữ "test" — Telegram **không** cho đổi
username bot đã tạo).

```bash
# 1. Xem đang trỏ vào đâu
grep -n "t.me/" website/index.html
# 2. Đổi toàn bộ
sed -i 's#//t.me/lixi_vn_bot#//t.me/<username_bot_moi>#g' website/index.html
```

Link mã nguồn (`//github.com/...`) nằm trong `website/index.html` (footer) và trong `CONFIG.github`
ở đầu `script.js` (dùng cho `token.html`).

## Trang token (`token.html`) — trạng thái

Trang này **chưa hoàn chỉnh** và cố tình không được liên kết từ thanh điều hướng của trang chủ. Đã làm:

- `<meta name="robots" content="noindex, nofollow">` để không bị Google lập chỉ mục khi chưa xong.
- Một dòng nhắc ở đầu trang: đây là bản nháp, chưa phát hành token, sản phẩm thật là Lì Xì Bot.
- Mọi placeholder `[[ĐIỀN: …]]` **hiển thị ra màn hình** đã được thay bằng câu trả lời thật
  ("Chưa có", "Chưa tạo", "Chưa ký hợp đồng kiểm toán…"), vì để nguyên markup `[[ĐIỀN:…]]` trên
  một trang công khai còn tệ hơn là nói thẳng "chưa có".
- Mục **Đội ngũ** (4 thẻ chỉ có `[[ĐIỀN: Họ tên]]`) đã được **ẩn hẳn bằng chú thích HTML** và gỡ khỏi
  thanh điều hướng. Khi có tên thật thì bỏ dấu chú thích và thêm lại mục vào `nav`.

Còn lại trong `script.js`: object `CONFIG` vẫn có nhiều khóa để trống (`docs`, `community`, `x`,
`telegram`, `discord`, `square`, `pancakeswap`, `terms`, `privacy`, `transparency`). Link để trống
trỏ về `#` và được đánh dấu `*` trên trang — chỉ xuất hiện ở `token.html`. Điền URL thật thì dấu `*`
tự mất. Khóa `pancakeswap` chỉ điền **sau khi** đã phát hành và tự kiểm tra địa chỉ hợp đồng.

**Tokenomics** sinh từ mảng `ALLOCATIONS` trong `script.js`; tổng `pct` phải bằng 100 (trang hiện
cảnh báo nếu sai), `TOTAL_SUPPLY` cố định 1.000.000.000.

### Những điều không được làm trên trang token

- Không dùng logo hoặc tên sàn giao dịch như đối tác, không viết "sắp lên sàn X".
- Không nêu tên hãng kiểm toán, nhà đầu tư, đối tác, KOL chưa ký hợp đồng và chưa công bố chính thức.
- Không thêm nội dung về giá, lợi nhuận kỳ vọng, hay đếm ngược listing.
- Không điền địa chỉ hợp đồng, multisig, LP lock khi chưa deploy và verify thật.
- Không xóa các đoạn miễn trừ trách nhiệm.
- Không thêm script/CSS từ CDN hoặc analytics bên thứ ba.

## Kiểm tra trước khi đẩy lên

```bash
# 1. Không tải tài nguyên ngoài (CI chạy đúng lệnh này — phải không ra dòng nào)
grep -nE 'https?://|//cdn|@import' website/index.html website/token.html website/style.css website/script.js

# 2. Không còn placeholder hiển thị ra màn hình
grep -n "ĐIỀN\|LINK_BOT" website/index.html website/token.html

# 3. Mọi liên kết nội bộ trỏ tới file/neo có thật
#    (script nhỏ đi qua từng thẻ a/link/script, bỏ qua link ngoài)
python3 - <<'EOF'
import os, re
from html.parser import HTMLParser
ROOT = "website"
class P(HTMLParser):
    def __init__(s):
        super().__init__(convert_charrefs=True); s.links=[]; s.ids=set()
    def handle_starttag(s, tag, attrs):
        d=dict(attrs)
        if d.get("id"): s.ids.add(d["id"])
        for a in ("href","src"):
            if d.get(a): s.links.append((a,d[a]))
bad=0
for fn in sorted(f for f in os.listdir(ROOT) if f.endswith(".html")):
    p=P(); p.feed(open(os.path.join(ROOT,fn),encoding="utf-8").read())
    for attr,u in p.links:
        if u.startswith("//") or re.match(r"^[a-zA-Z][\w+.-]*:", u): continue
        if u.startswith("#"):
            if u[1:] and u[1:] not in p.ids: print("THIEU NEO",fn,u); bad+=1
            continue
        t,_,frag=u.partition("#")
        fp=os.path.normpath(os.path.join(ROOT,t))
        if not os.path.isfile(fp): print("THIEU FILE",fn,u); bad+=1; continue
        if frag and fp.endswith(".html"):
            q=P(); q.feed(open(fp,encoding="utf-8").read())
            if frag not in q.ids: print("THIEU NEO",fn,u); bad+=1
print("OK" if not bad else f"{bad} loi")
EOF

# 4. vercel.json vẫn hợp lệ
node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'));console.log('vercel.json hop le')"
```

Kiểm tra thủ công: thu cửa sổ về ~400px (menu chuyển thành nút *Menu*, các thẻ xếp dọc, **không có
thanh cuộn ngang**), bật chế độ tối của hệ điều hành, dùng phím Tab đi qua thanh điều hướng và mục hỏi đáp.

## Thêm tiếng Anh (i18n)

Cách đơn giản nhất, không cần build:

1. Sao chép `index.html` thành `en/index.html`, dịch nội dung, đổi `lang="en"` và sửa đường dẫn
   `../style.css`, `../script.js`.
2. Thêm nút chuyển ngôn ngữ vào `nav` của cả hai trang (`<a href="/en/">EN</a>` / `<a href="/">VI</a>`).
3. Nếu muốn một file duy nhất: đặt mọi chuỗi vào object `I18N = { vi: {...}, en: {...} }` trong
   `script.js`, gắn `data-i18n="key"` lên phần tử và thay `textContent` khi đổi ngôn ngữ.

## Triển khai ở nơi khác ngoài Vercel

Bất kỳ dịch vụ nào phục vụ file tĩnh đều được: trỏ thư mục gốc về `website/`, không cần build.

- **Cloudflare Pages**: Framework preset *None*, Build command để trống, **Build output directory: `website`**.
- **GitHub Pages**: chỉ cho chọn `/ (root)` hoặc `/docs`, nên cần một Action copy `website/` sang
  branch `gh-pages`, hoặc chuyển nội dung sang `/docs`.
- **Netlify / S3 / nginx**: publish directory = `website`.

Nếu host cho đặt header, thêm CSP chặt (trang không cần tài nguyên ngoài nào):

```
Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

(`'unsafe-inline'` cho `style-src` là vì `index.html` có một khối `<style>` nội tuyến cho bố cục các bước.)
