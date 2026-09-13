'use strict';

/**
 * content/channel-posts-thang-2.js — THÁNG THỨ HAI của kênh: 30 bài tiếp theo.
 *
 * Nối vào sau tháng đầu trong `channel-posts.js` (cùng hình dạng, cùng luật). Viết theo
 * `growth/05` mục 0: bốn loại bài xoay vòng (mẹo lệnh — mỗi bài đúng một lệnh; ý tưởng dùng
 * theo dịp; "tuần này thay đổi gì"; nhắc an toàn; lời mời), không chữ nào về giá hay lợi
 * nhuận, không số nào không có nguồn, không hứa hẹn. Bốn bài "tuần này thay đổi gì" và bài
 * tổng kết dùng chỗ trống có tên — số bot tự điền, chữ lấy từ `weekly-notes.js`.
 *
 * Mọi lệnh nhắc trong bài đều có thật trong bot (xem `src/growth.js` GUIDE_TEXT và
 * `src/commands/`). Bài nào nói về một lệnh thì nói đúng một lệnh.
 */

const THANG_2 = [
  {
    id: 't2-01',
    title: 'T2 ngày 1 — Tháng thứ hai: kênh này sẽ đăng gì',
    text: `Tháng thứ hai của kênh 🧧

Tháng đầu là 30 bài để ai mới vào cũng dùng được bot. Tháng này đi sâu hơn: những cài đặt admin ít người đụng tới, những cách dùng chúng tôi thấy nhóm thật đang làm, và mỗi tuần một bài nói thẳng đã làm gì, hỏng gì.

Luật của kênh không đổi: không nói về giá, không hứa hẹn, số nào cũng có nguồn, và điểm trong bot vẫn không phải tiền.

Chưa thêm bot: https://t.me/lixi_vn_bot?startgroup=true — 2 phút, gỡ lúc nào cũng được.`,
  },
  {
    id: 't2-02',
    title: 'T2 ngày 2 — Mẹo lệnh (admin): /duyet và /tuchoi',
    text: `Mẹo lệnh (admin): /duyet và /tuchoi

Khi một người tip nhiều hơn ngưỡng duyệt của nhóm (mặc định 2.000 điểm), bot KHÔNG chuyển ngay. Nó tạm giữ số điểm đó khỏi số dư người gửi, đăng một mã chờ, và đợi admin.

• /duyet <mã> — chuyển cho người nhận
• /tuchoi <mã> — trả điểm về cho người gửi

Vì sao giữ điểm ngay lúc chờ: nếu không giữ, người gửi có thể tip tiếp chỗ điểm đó cho người khác trong lúc admin chưa xem. Chúng tôi từng có lỗi này và đã sửa; giờ có test riêng cho nó.

Đổi ngưỡng: /caidat nguongduyet 5000.`,
  },
  {
    id: 't2-03',
    title: 'T2 ngày 3 — Ý tưởng dùng: nhóm lớp, nhóm phụ huynh',
    text: `Ý tưởng dùng: nhóm lớp học

Nhóm lớp thường im cho tới khi có bài kiểm tra. Một cách làm cho nó sống hơn mà không cần ai làm "hoạt náo viên":

• Ai giải giúp một bài, người hỏi reply /lixi 20
• Cuối tuần lớp trưởng gõ /bxh, ba người được cảm ơn nhiều nhất nhận một bao nhỏ từ pot lớp
• /thuong 5 3 — ai nhắn từ 3 tin có ích mỗi ngày được 5 điểm

Điểm chỉ là điểm của lớp, không đổi ra gì. Cái được là người giải bài thấy mình được nhìn thấy.

Nhóm phụ huynh cũng dùng được với cùng cách, thay "giải bài" bằng "chia sẻ lịch, tài liệu".`,
  },
  {
    id: 't2-04',
    title: 'T2 ngày 4 — Nhắc an toàn: bot thật chỉ có một tên',
    text: `Nhắc an toàn: bot thật chỉ có một tên 🔒

Bot của chúng tôi là @lixi_vn_bot, viết đúng như vậy, có chữ "vn". Bất kỳ bot nào tên gần giống — thêm số, đổi chữ, thêm "official" — không phải của chúng tôi.

Cách kiểm tra trong 5 giây: mở hồ sơ bot trong nhóm, nhìn username. Trang hướng dẫn của chúng tôi chỉ dẫn tới đúng một bot: https://new-coin-orcin.vercel.app

Bot thật không bao giờ: nhắn riêng bạn trước, xin mật khẩu, xin mã OTP, hay bảo bạn chuyển tiền để "kích hoạt". Gặp là chặn, báo lại ở đây.`,
  },
  {
    id: 't2-05',
    title: 'T2 ngày 5 — Mẹo lệnh: tip người không có @username',
    text: `Mẹo lệnh: tip người không đặt @username

Nhiều người dùng Telegram không đặt username. /lixi @tenban 50 không tìm được họ. Cách làm:

Reply vào bất kỳ tin nhắn nào của người đó, rồi gõ /lixi 50.

Bot lấy đúng người đã viết tin được reply. Cách này chạy với mọi người, có username hay không, nên nếu chỉ nhớ một cách thì nhớ cách reply.

Admin cấp điểm cũng vậy: reply rồi /nap 200. Không reply thì /nap là nạp vào pot chung.`,
  },
  {
    id: 't2-06',
    title: 'T2 ngày 6 — Ý tưởng dùng: 20/10',
    text: `Ý tưởng dùng: 20/10 — Ngày Phụ nữ Việt Nam 🌸

Một cách chúc mừng không cần mua gì:

• Sáng 20/10, admin mở /lixi 500 chia 10 kèm một dòng chúc
• Ai trong nhóm cũng có thể tự tip: reply tin của người muốn chúc, /lixi 20
• Tối gõ /bxh xem ai được cả nhóm cảm ơn nhiều nhất hôm đó

Nhớ: bao chia ngẫu nhiên, ai bấm trước nhận trước, 10 phút là đóng và phần thừa tự về người mở. Điểm không phải quà thật — nó là cách nói "hôm nay nhớ tới bạn" mà cả nhóm cùng thấy.`,
  },
  {
    id: 't2-07',
    title: 'T2 ngày 7 — Tuần này thay đổi gì (tuần 5)',
    // Số bot tự điền lúc đăng; chữ lấy từ weekly-notes.js — chưa có thì bỏ qua.
    needsManualData: true,
    text: `📋 Tuần này thay đổi gì (tuần [[tuan]])

Đã làm:
• [[thayDoi1]]
• [[thayDoi2]]

Đang làm:
• [[dangLam]]

Số liệu thật, chưa làm tròn:
• Nhóm có giao dịch trong 7 ngày: [[nhomHoatDong]]
• Bao lì xì đã mở trong 7 ngày: [[baoLiXi]]

Số do chính bot đếm từ database của nó, cùng nguồn với lệnh /thongke. Không ai gõ tay.`,
  },
  {
    id: 't2-08',
    title: 'T2 ngày 8 — Mẹo lệnh (admin): /caidat thoigianbao',
    text: `Mẹo lệnh (admin): /caidat thoigianbao

Bao lì xì mặc định mở trong 10 phút. Nhóm đông, ai cũng online thì 10 phút là dài; nhóm nhỏ, người ta vào đọc lúc rảnh thì 10 phút là ngắn.

/caidat thoigianbao 3 — bao đóng sau 3 phút
/caidat thoigianbao 60 — bao đóng sau 1 giờ

Đóng rồi thì phần chưa ai nhận tự hoàn về người mở, không mất đi đâu. Cài đặt này áp dụng cho mọi bao mở SAU khi đổi; bao đang mở giữ giờ cũ.`,
  },
  {
    id: 't2-09',
    title: 'T2 ngày 9 — Ý tưởng dùng: nhóm cư dân, nhóm xóm',
    text: `Ý tưởng dùng: nhóm cư dân chung cư

Nhóm cư dân có một việc lặp mãi: ai đó giúp — nhận hộ hàng, báo mất điện, cho mượn thang — rồi được một dòng "cảm ơn nha" chìm trong 200 tin.

Với bot: reply tin người giúp, /lixi 10. Cuối tháng ban quản trị gõ /bxh, biết ai là người hàng xóm được cảm ơn nhiều nhất. Không cần giải thưởng thật; được nêu tên trước cả toà là đủ.

Cài cho nhóm cư dân: /caidat thamnien 3 để người mới vào không giật bao ngay, /caidat hanmuctip 100 để không ai tip quá đà.`,
  },
  {
    id: 't2-10',
    title: 'T2 ngày 10 — Nhắc an toàn: bot không cần quyền gì ngoài admin',
    text: `Nhắc an toàn: bot xin gì, và không xin gì 🔒

Lì Xì Bot cần quyền admin trong nhóm để biết ai là admin và đếm được tin nhắn cho phần thưởng hoạt động. Chỉ vậy.

Bot KHÔNG cần và KHÔNG dùng: xoá tin của người khác, cấm thành viên, mời người, đổi tên nhóm, ghim tin. Bạn có thể tắt hết những quyền đó khi cấp admin — bot vẫn chạy bình thường.

Bot không lưu nội dung tin nhắn. Nó chỉ đếm số tin mỗi người trong ngày, để tính thưởng. Mã nguồn mở ở https://github.com/nirannguyen50/new-coin, ai muốn tự đọc thì đọc.`,
  },
  {
    id: 't2-11',
    title: 'T2 ngày 11 — Mẹo lệnh (admin): /pot đọc thế nào',
    text: `Mẹo lệnh (admin): đọc /pot

/pot hiện hai thứ: số dư quỹ chung của nhóm, và nhật ký admin — ai nạp bao nhiêu, ai cấp điểm cho ai, ai đổi cài đặt gì, lúc nào.

Dùng khi có người hỏi "sao pot hụt?": mở /pot, nhìn dòng gần nhất. Thưởng hoạt động hằng ngày trừ từ pot, bao lì xì admin mở cũng trừ từ pot; cả hai đều có dòng trong nhật ký.

Nhật ký không xoá được, kể cả admin. Đó là cố ý: một nhóm tin bot được vì mọi thay đổi điểm đều có dấu.`,
  },
  {
    id: 't2-12',
    title: 'T2 ngày 12 — Ý tưởng dùng: nhóm game, guild',
    text: `Ý tưởng dùng: nhóm game, guild

Guild nào cũng có người gánh: người tổ chức raid, người viết hướng dẫn, người dạy tân thủ. Thường không ai ghi nhận.

• Sau mỗi buổi chơi, người được gánh reply /lixi 30 cho người gánh
• Trưởng guild mở /lixi 1000 chia 20 sau mỗi mốc lớn của guild
• /caidat songuoinhan 100 để bao chia được cho cả guild đông

Điểm ở đây là điểm của guild, không liên quan gì tới vật phẩm trong game và không đổi ra được. Nó là bảng "ai gánh nhiều nhất tháng này" mà cả guild cùng thấy qua /bxh.`,
  },
  {
    id: 't2-13',
    title: 'T2 ngày 13 — Mời: cho admin đang cảm ơn bằng lời',
    text: `Cho admin đang cảm ơn thành viên bằng lời 🧧

Nếu nhóm bạn có những người luôn trả lời câu hỏi của người khác, và bạn chỉ có thể nói "cảm ơn bạn" — bot này làm việc đó rõ hơn.

Thêm vào nhóm: https://t.me/lixi_vn_bot?startgroup=true
Hướng dẫn 2 phút: https://new-coin-orcin.vercel.app

Miễn phí, mã nguồn mở, không quảng cáo, không nhắn riêng thành viên của bạn. Thử một tuần, không hợp thì gỡ — điểm biến mất cùng bot, không để lại gì.`,
  },
  {
    id: 't2-14',
    title: 'T2 ngày 14 — Tuần này thay đổi gì (tuần 6)',
    needsManualData: true,
    text: `📋 Tuần này thay đổi gì (tuần [[tuan]])

Đã làm:
• [[thayDoi1]]
• [[thayDoi2]]

Lỗi đã biết, chưa sửa xong:
• [[loiDaBiet]]

Số liệu thật:
• Nhóm có giao dịch trong 7 ngày: [[nhomHoatDong]]
• Điểm đã tip trong 7 ngày: [[diemTip]]

Gặp lỗi, kể ở đây. Lỗi nêu công khai được sửa trước.`,
  },
  {
    id: 't2-15',
    title: 'T2 ngày 15 — Mẹo lệnh: /lichsu đọc thế nào',
    text: `Mẹo lệnh: đọc /lichsu

/lichsu hiện 10 giao dịch gần nhất của bạn, mỗi dòng ghi loại: Tip, Nhận bao lì xì, Thưởng hoạt động, Admin cấp điểm, và vài loại "tạm giữ".

Hai dòng hay gây thắc mắc:
• "Mở bao lì xì (tạm giữ điểm)" rồi "Hoàn điểm bao lì xì": bạn mở bao 300, chỉ 180 được nhận, 120 tự về.
• "Giữ điểm chờ duyệt tip lớn": tip lớn đang chờ admin, chưa mất, chưa tới người nhận. Bị từ chối thì có dòng hoàn.

Số dư hiện tại luôn là /sodu. /lichsu là để hiểu vì sao nó ra số đó.`,
  },
  {
    id: 't2-16',
    title: 'T2 ngày 16 — Ý tưởng dùng: 20/11',
    text: `Ý tưởng dùng: 20/11 — Ngày Nhà giáo 🍎

Nhóm lớp, nhóm cựu học sinh, nhóm phụ huynh — cùng một cách:

• Ai cũng có thể tip thầy cô trong nhóm: reply tin của thầy cô, /lixi 20 kèm một câu
• Hoặc admin gom: mở /lixi 200 chia 1 vào đúng tin của thầy cô — bao 1 người, ai bấm là người đó nhận, nên nhớ nói rõ để lớp nhường

Điểm không phải quà. Cái có giá trị là 40 dòng cảm ơn nối nhau trong nhóm mà thầy cô đọc được.`,
  },
  {
    id: 't2-17',
    title: 'T2 ngày 17 — Nhắc an toàn: "đổi điểm ra tiền" là lừa đảo',
    text: `Nhắc an toàn: ai nói "đổi điểm ra tiền" là lừa 🔒

Điểm trong Lì Xì Bot không đổi ra tiền, không đổi ra coin, không đổi ra thẻ cào. Không có "sàn", không có "tỷ giá", không có "đợt quy đổi". Chưa phát hành token nào, và bot không cần token để chạy.

Nếu có người — kể cả tự xưng admin của chúng tôi — nhắn riêng bảo bạn gửi điểm, gửi tiền, hay cài gì đó để "quy đổi": đó là lừa đảo. Chặn, và báo ở đây để chúng tôi cảnh báo nhóm khác.

Chúng tôi không nhắn riêng ai trước. Chưa bao giờ.`,
  },
  {
    id: 't2-18',
    title: 'T2 ngày 18 — Mẹo lệnh (admin): /caidat ngansachthuong',
    text: `Mẹo lệnh (admin): /caidat ngansachthuong

Thưởng hoạt động (/thuong) trừ từ pot mỗi ngày. Nhóm đông, ai cũng đủ tin nhắn, pot cạn nhanh hơn bạn nghĩ.

/caidat ngansachthuong 500 — mỗi ngày phát tối đa 500 điểm thưởng, dù bao nhiêu người đủ điều kiện

Chạm trần thì những người còn lại hôm đó nhận thiếu hoặc không nhận; dòng thưởng trong /lichsu ghi rõ "chỉ còn đủ X/Y điểm" thay vì im lặng. Pot hết thì không phát, không âm. Xem còn bao nhiêu bằng /pot.`,
  },
  {
    id: 't2-19',
    title: 'T2 ngày 19 — Ý tưởng dùng: nhóm freelancer, nhóm nghề',
    text: `Ý tưởng dùng: nhóm nghề, nhóm freelancer

Nhóm nghề sống bằng người chịu chia sẻ: mẫu hợp đồng, kinh nghiệm deal giá với khách, cảnh báo khách xù. Người chia sẻ nhiều nhất thường im lặng nhất.

• Nhận được gì có ích: reply /lixi 30
• Admin mỗi tháng mở /lixi 1000 chia 10 "cho những người đã giúp tôi tháng này"
• /bxh cuối tháng là bảng "ai đóng góp nhiều nhất" của nhóm, không ai phải tự kể công

Điểm không phải phí, không phải hoa hồng, không đổi ra gì. Nó là cách nhóm ghi nhận nhau mà không cần ai làm sổ.`,
  },
  {
    id: 't2-20',
    title: 'T2 ngày 20 — Mẹo lệnh (admin): /caidat songuoinhan',
    text: `Mẹo lệnh (admin): /caidat songuoinhan

/lixi 500 chia 50 — số 50 là số người tối đa nhận một bao. Mặc định nhóm cho phép tới 50. Nhóm nhỏ muốn chặn ai đó mở bao "chia 50" cho nhóm 8 người thì hạ xuống:

/caidat songuoinhan 10

Bao chia N với N lớn hơn giới hạn bị từ chối ngay, không trừ điểm. Nhóm rất đông dịp Tết thì nâng lên trước, đừng đợi đến giao thừa mới sửa.`,
  },
  {
    id: 't2-21',
    title: 'T2 ngày 21 — Tuần này thay đổi gì (tuần 7)',
    needsManualData: true,
    text: `📋 Tuần này thay đổi gì (tuần [[tuan]])

Đã làm:
• [[thayDoi1]]
• [[thayDoi2]]

Đã từ chối làm:
• [[daTuChoi]]

Số liệu thật:
• Nhóm có giao dịch trong 7 ngày: [[nhomHoatDong]]
• Bao lì xì đã mở trong 7 ngày: [[baoLiXi]]

Số không tăng thì chúng tôi nói là không tăng, và sửa sản phẩm.`,
  },
  {
    id: 't2-22',
    title: 'T2 ngày 22 — Mẹo lệnh: /start trong chat riêng',
    text: `Mẹo lệnh: /start với bot ở chat riêng

Mở chat riêng với @lixi_vn_bot và gõ /start. Bot trả lời hướng dẫn ngắn và một nút "➕ Thêm Lì Xì Bot vào nhóm của bạn" — bấm là chọn nhóm, không cần tìm bot lần nữa.

Chat riêng cũng dùng được /sodu và /lichsu? Không — điểm thuộc về từng nhóm, nên hai lệnh đó phải gõ trong nhóm. Chat riêng chỉ để đọc hướng dẫn và thêm bot.

Bot không bao giờ tự nhắn vào chat riêng của bạn. Chỉ trả lời khi bạn gõ trước.`,
  },
  {
    id: 't2-23',
    title: 'T2 ngày 23 — Ý tưởng dùng: nhóm gia đình',
    text: `Ý tưởng dùng: nhóm gia đình 👨‍👩‍👧

Nhóm gia đình có một thứ mọi nhóm khác không có: ông bà. Và ông bà bấm nút nhận lì xì rất giỏi.

• Ngày sinh nhật ai đó, người khác reply /lixi 10 kèm lời chúc
• Cuối tuần, người lớn nhất nhà mở /lixi 200 chia 5 cho cả nhà tranh
• /caidat thamnien 0 vì nhóm gia đình không có người lạ

Điểm không mua được gì. Nhưng cháu tip cho bà 10 điểm kèm "cảm ơn bà nấu canh" là một tin nhắn cả nhà đọc được, và bà giữ mãi.`,
  },
  {
    id: 't2-24',
    title: 'T2 ngày 24 — Nhắc an toàn: link giả trang hướng dẫn',
    text: `Nhắc an toàn: trang hướng dẫn thật chỉ có một địa chỉ 🔒

https://new-coin-orcin.vercel.app — đó là trang hướng dẫn của chúng tôi. Nó không đòi đăng nhập, không đòi kết nối ví, không có nút "nhận thưởng".

Trang nào giống giao diện nhưng bắt bạn đăng nhập Telegram, nhập số điện thoại, hay kết nối ví: không phải của chúng tôi. Đóng lại.

Nếu link tới từ một tin nhắn riêng, càng đáng ngờ: chúng tôi không nhắn riêng ai.`,
  },
  {
    id: 't2-25',
    title: 'T2 ngày 25 — Mời chia sẻ: một câu nói với admin của bạn',
    text: `Bạn không phải admin, nhưng muốn nhóm mình có bot này? 🧧

Gửi admin đúng một câu, không cần dài:

"Nhóm mình thử Lì Xì Bot không? Miễn phí, mã nguồn mở, thêm 2 phút, gỡ được ngay: https://new-coin-orcin.vercel.app"

Admin hỏi "nó lấy dữ liệu gì?" — trả lời: chỉ đếm số tin mỗi người trong ngày, không lưu nội dung, không nhắn riêng ai. Hỏi "có mất tiền không?" — không, và điểm cũng không phải tiền.

Chúng tôi không có đội bán hàng. Người chia sẻ là bạn, hoặc không ai cả.`,
  },
  {
    id: 't2-26',
    title: 'T2 ngày 26 — Mẹo lệnh (admin): /rut_duyet và /rut_huy',
    text: `Mẹo lệnh (admin): /rut_duyet và /rut_huy

Thành viên gõ /rut 0x... 100 thì bot ghi một YÊU CẦU và giữ 100 điểm. Bot không chuyển gì đi đâu. Admin quyết:

• /rut_duyet <mã> — đánh dấu đã xử lý, 100 điểm bị trừ hẳn. Xử lý thế nào là chuyện của nhóm (đổi quà nội bộ chẳng hạn).
• /rut_huy <mã> — hoàn 100 điểm về cho người đó.

Chúng tôi giữ luồng này để thử cơ chế "xin → admin duyệt". Nó không phải cách đổi điểm ra tiền, và không có cách đó.`,
  },
  {
    id: 't2-27',
    title: 'T2 ngày 27 — Ý tưởng dùng: cuối năm, tổng kết nhóm',
    text: `Ý tưởng dùng: tổng kết cuối năm của nhóm

Tháng 12 nhóm nào cũng có bài "một năm nhìn lại". Bot cho một cách làm bằng số thật của chính nhóm:

• Admin gõ /bxh — top 10 người được cảm ơn nhiều nhất 7 ngày qua; làm mỗi tuần tháng 12 rồi gom lại
• Mở một bao lớn cuối năm: /lixi 2027 chia 20 — con số tự nói
• Ai muốn cảm ơn ai, reply /lixi 10, không cần lý do

Tết 2027 rơi vào 6/2. Từ giờ tới đó, /caidat thamnien 3 để người lạ dịp Tết không giật bao.`,
  },
  {
    id: 't2-28',
    title: 'T2 ngày 28 — Tuần này thay đổi gì (tuần 8) + câu hỏi',
    needsManualData: true,
    text: `📋 Tuần này thay đổi gì (tuần [[tuan]]) — và một câu hỏi

Đã làm:
• [[thayDoi1]]
• [[thayDoi2]]

Số liệu thật:
• Nhóm có giao dịch trong 7 ngày: [[nhomHoatDong]]
• Bao lì xì đã mở trong 7 ngày: [[baoLiXi]]

Câu hỏi tháng này: cài đặt admin nào bạn KHÔNG hiểu để làm gì? Kể ở đây. Cài đặt không ai hiểu thì chúng tôi viết lại hướng dẫn, hoặc bỏ.`,
  },
  {
    id: 't2-29',
    title: 'T2 ngày 29 — Mẹo lệnh (admin): /caidat không tham số',
    text: `Mẹo lệnh (admin): /caidat — gõ trống

Gõ /caidat không kèm gì, bot liệt kê toàn bộ cài đặt hiện tại của nhóm: thâm niên, hạn mức tip, cooldown, ngưỡng duyệt, thời gian bao, số người nhận tối đa, ngân sách thưởng.

Dùng khi nhận lại nhóm từ admin cũ, hoặc khi "sao nhóm này khác nhóm kia": đặt hai màn hình /caidat cạnh nhau là thấy.

Mọi lần đổi cài đặt đều có dòng trong /pot — ai đổi, đổi gì, lúc nào.`,
  },
  {
    id: 't2-30',
    title: 'T2 ngày 30 — Tổng kết tháng thứ hai',
    needsManualData: true,
    text: `Ngày 60: hai tháng của kênh này 🧧

Tháng này: 9 mẹo lệnh, 8 ý tưởng dùng, 4 bản "tuần này thay đổi gì", 4 nhắc an toàn, 3 lời mời, và bài này.

Số thật lúc đăng bài này: [[nhomHoatDong]] nhóm có giao dịch trong 7 ngày gần nhất, [[baoLiXi]] bao lì xì đã mở trong 7 ngày đó. Số nhỏ thì chúng tôi vẫn ghi số nhỏ.

Tháng tới: [[thangToi]].

Chưa thêm bot: https://t.me/lixi_vn_bot?startgroup=true. Không hợp thì gỡ, chúng tôi không giận.`,
  },
];

module.exports = { THANG_2 };
