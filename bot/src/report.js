'use strict';

/**
 * report.js — BÁO CÁO TIẾN ĐỘ HẰNG NGÀY, tự viết lên GitHub.
 *
 * VÌ SAO LẠI LÀ GITHUB: chủ dự án làm việc với hai trợ lý không nhắn được cho nhau, và
 * trợ lý điều phối chỉ ra được GitHub — không ra được Telegram, không ra được Vercel,
 * không mở được bot đang chạy. Vì vậy bot tự viết con số của chính nó vào một chỗ mà
 * phía kia đọc được, và vòng lặp khép lại mà không cần ai chép tay `/thongke` nữa.
 *
 * CÁCH GHI: thêm BÌNH LUẬN vào MỘT issue theo dõi cố định (`GITHUB_REPORT_ISSUE`) —
 * không mở issue mới mỗi ngày, để lịch sử nằm gọn một chỗ và không làm ngập danh sách
 * issue. Dùng `fetch` có sẵn của Node 22, không thêm dependency nào.
 *
 * BA ĐIỀU KHÔNG BAO GIỜ ĐƯỢC PHÉP XẢY RA:
 *   1. Token lọt vào log hoặc vào nội dung báo cáo → mọi thứ in ra đều đi qua
 *      `redact.js`, và `GITHUB_TOKEN` đã nằm trong danh sách biến nhạy cảm ở đó.
 *   2. Báo cáo hỏng làm hỏng cron → mọi hàm ở đây KHÔNG BAO GIỜ ném lỗi ra ngoài,
 *      chỉ trả về `{ ok: false, lyDo }`.
 *   3. Thiếu cấu hình mà vẫn "làm như đã gửi" → thiếu biến môi trường thì bỏ qua và
 *      ghi rõ lý do vào log.
 */

const growth = require('./growth');
const { redactSecrets, safeErrorMessage } = require('./redact');

/** Kho mã nguồn mặc định (đổi được bằng biến môi trường `GITHUB_REPO`). */
const DEFAULT_REPO = 'nirannguyen50/new-coin';

/** GitHub yêu cầu mọi request có User-Agent; thiếu là bị trả 403. */
const USER_AGENT = 'lixi-bot-daily-report';

/** Lệch giờ Việt Nam so với UTC (UTC+7, không có giờ mùa hè). */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Ngày/giờ Việt Nam dạng "13/09/2026 08:15" — cron chạy theo UTC nên phải quy đổi. */
function vnTimestamp(ms) {
  const d = new Date(Number(ms) + VN_OFFSET_MS);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return (
    `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`
  );
}

/** "+3" / "-1" / "0" — chênh lệch so với báo cáo trước, hiện luôn dấu. */
function delta(now, before) {
  const d = (Number(now) || 0) - (Number(before) || 0);
  return d > 0 ? `+${d}` : String(d);
}

/**
 * Soạn nội dung báo cáo (Markdown tiếng Việt). HÀM THUẦN — không mạng, không database.
 *
 * Dùng ĐÚNG những con số của `/thongke` (`growth.aggregateGrowthStats` /
 * `PostgresLedger.growthStats`) để báo cáo và lệnh trong Telegram không bao giờ lệch nhau.
 *
 * @param {{stats: object, previous?: object|null, channel?: object|null,
 *          nowMs?: number, postedCount?: number}} opts
 * @returns {string}
 */
function buildReportMarkdown({
  stats = {},
  previous = null,
  channel = null,
  nowMs = Date.now(),
  postedCount = null,
} = {}) {
  const n = (v) => Number(v) || 0;
  const prev = previous && typeof previous === 'object' ? previous : null;
  const groupsNew = prev ? n(stats.groupsTotal) - n(prev.groupsTotal) : null;
  const W = growth.STATS_WINDOW_DAYS;

  const lines = [];
  lines.push(`## Báo cáo tự động — ${vnTimestamp(nowMs)} (giờ Việt Nam)`);
  lines.push('');
  lines.push(
    'Bot tự ghi báo cáo này sau mỗi lần chạy lịch hằng ngày trên Vercel. ' +
      'Số liệu lấy đúng từ nguồn của lệnh `/thongke` — chỉ số đếm, không có tên và không có id.'
  );
  lines.push('');
  lines.push('| Chỉ số | Hôm nay | So với báo cáo trước |');
  lines.push('|---|---:|---:|');
  const rows = [
    ['Nhóm đang có bot', 'groupsTotal'],
    [`Nhóm hoạt động ${W} ngày qua`, 'groupsActive'],
    ['Thành viên đã thấy', 'membersSeen'],
    [`Bao lì xì đã mở ${W} ngày qua`, 'envelopesOpened'],
    [`Điểm đã tip ${W} ngày qua`, 'pointsTipped'],
    ['Nhóm đến từ nút giới thiệu', 'groupsReferred'],
  ];
  for (const [label, key] of rows) {
    lines.push(`| ${label} | ${n(stats[key])} | ${prev ? delta(stats[key], prev[key]) : '—'} |`);
  }
  lines.push('');

  lines.push('### Nhóm mới');
  if (groupsNew === null) {
    lines.push(
      '- Đây là báo cáo đầu tiên nên chưa có mốc để so sánh. Từ lần sau mục này cho biết ' +
        'số nhóm tăng thêm kể từ báo cáo trước.'
    );
  } else if (groupsNew > 0) {
    lines.push(`- **${groupsNew} nhóm mới** kể từ báo cáo trước.`);
  } else if (groupsNew < 0) {
    lines.push(`- Giảm ${Math.abs(groupsNew)} nhóm kể từ báo cáo trước (bot bị gỡ khỏi nhóm).`);
  } else {
    lines.push('- Không có nhóm mới kể từ báo cáo trước.');
  }
  lines.push('');

  lines.push('### Kênh công khai');
  if (!channel) {
    lines.push('- Lần chạy này không có thông tin về việc đăng bài kênh.');
  } else if (channel.daDang) {
    lines.push(`- Đã đăng bài \`${channel.maBai}\` — ${channel.tieuDe}.`);
    if (channel.conLai != null) {
      lines.push(`- Còn **${n(channel.conLai)} bài** đăng tự động được trong hàng đợi.`);
    }
  } else {
    lines.push(`- Không đăng bài nào. Lý do: ${channel.lyDo || 'không rõ'}.`);
  }
  if (postedCount != null) {
    lines.push(`- Tổng số bài đã đăng lên kênh từ trước tới nay: ${n(postedCount)}.`);
  }
  lines.push('');

  lines.push(
    '> Con số cần theo dõi là **nhóm hoạt động ' +
      `${W} ngày qua**: số nhóm có bot chỉ nói bot được thêm vào, còn số nhóm hoạt động mới ` +
      'nói có người dùng thật.'
  );

  // Lớp bảo vệ cuối: nếu vì lý do nào đó một bí mật lọt vào con số hay lý do lỗi ở trên,
  // nó bị xoá ngay tại đây — trước khi nội dung này rời khỏi tiến trình.
  return redactSecrets(lines.join('\n'));
}

/**
 * Đọc cấu hình GitHub từ biến môi trường. HÀM THUẦN.
 * @returns {{ok: true, repo: string, issue: number, token: string}
 *          |{ok: false, reason: string, message: string}}
 */
function readGithubConfig(env = process.env) {
  const token = String((env && env.GITHUB_TOKEN) || '').trim();
  const issueRaw = String((env && env.GITHUB_REPORT_ISSUE) || '').trim();
  if (!token) {
    return {
      ok: false,
      reason: 'thieu_token',
      message:
        'Chưa đặt GITHUB_TOKEN nên bỏ qua báo cáo hằng ngày (mọi việc khác của cron vẫn chạy).',
    };
  }
  if (!issueRaw) {
    return {
      ok: false,
      reason: 'thieu_issue',
      message:
        'Chưa đặt GITHUB_REPORT_ISSUE (số của issue theo dõi) nên bỏ qua báo cáo hằng ngày.',
    };
  }
  const issue = Number(issueRaw.replace(/^#/, ''));
  if (!Number.isSafeInteger(issue) || issue <= 0) {
    return {
      ok: false,
      reason: 'issue_khong_hop_le',
      message: 'GITHUB_REPORT_ISSUE phải là số thứ tự của issue (ví dụ 12).',
    };
  }
  const repo = String((env && env.GITHUB_REPO) || DEFAULT_REPO).trim();
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    return {
      ok: false,
      reason: 'repo_khong_hop_le',
      message: 'GITHUB_REPO phải có dạng <chủ sở hữu>/<tên repo>.',
    };
  }
  return { ok: true, repo, issue, token };
}

/**
 * Gửi một bình luận lên issue theo dõi. KHÔNG BAO GIỜ ném lỗi ra ngoài.
 *
 * @param {{body: string, env?: object, fetchImpl?: Function}} opts
 *        `fetchImpl` chỉ để test tiêm `fetch` giả; lúc chạy thật dùng `fetch` của Node 22.
 * @returns {Promise<{ok: boolean, reason: string, lyDo: string, status?: number, url?: string}>}
 */
async function postReportComment({ body, env = process.env, fetchImpl = null } = {}) {
  const config = readGithubConfig(env);
  if (!config.ok) {
    console.log(`[bao-cao] Bỏ qua: ${config.message}`);
    return { ok: false, reason: config.reason, lyDo: config.message };
  }

  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!doFetch) {
    const lyDo = 'Môi trường không có fetch (cần Node 22 trở lên) nên bỏ qua báo cáo.';
    console.error(`[bao-cao] ${lyDo}`);
    return { ok: false, reason: 'khong_co_fetch', lyDo };
  }

  const url = `https://api.github.com/repos/${config.repo}/issues/${config.issue}/comments`;
  let res;
  try {
    res = await doFetch(url, {
      method: 'POST',
      headers: {
        // `Bearer` là dạng GitHub khuyến nghị cho cả token cổ điển lẫn fine-grained.
        authorization: `Bearer ${config.token}`,
        accept: 'application/vnd.github+json',
        'content-type': 'application/json',
        'x-github-api-version': '2022-11-28',
        // Thiếu User-Agent thì GitHub trả 403 — đây là yêu cầu bắt buộc của API.
        'user-agent': USER_AGENT,
      },
      body: JSON.stringify({ body: String(body == null ? '' : body) }),
    });
  } catch (err) {
    // Mất mạng, DNS hỏng, GitHub sập — tất cả về đây và KHÔNG được làm hỏng cron.
    const lyDo = `Không gọi được GitHub: ${safeErrorMessage(err, env)}`;
    console.error(`[bao-cao] ${lyDo}`);
    return { ok: false, reason: 'loi_mang', lyDo };
  }

  const status = Number(res && res.status) || 0;
  if (status >= 200 && status < 300) {
    console.log(`[bao-cao] Đã gửi báo cáo lên issue #${config.issue} của ${config.repo}.`);
    return { ok: true, reason: '', lyDo: '', status };
  }

  let detail = '';
  try {
    detail = String(await res.text()).slice(0, 300);
  } catch (err) {
    detail = '';
  }
  const hint =
    status === 401 || status === 403
      ? ' Token sai, hết hạn, hoặc thiếu quyền Issues: Read and write trên đúng repo này.'
      : status === 404
        ? ' Không thấy repo hoặc issue — kiểm tra GITHUB_REPO và GITHUB_REPORT_ISSUE.'
        : '';
  // `redactSecrets` chạy trên cả phần GitHub trả về: thông báo lỗi của họ có thể chép
  // lại một phần thông tin xác thực mình vừa gửi lên.
  const lyDo = redactSecrets(`GitHub trả về ${status}.${hint} ${detail}`.trim(), env);
  console.error(`[bao-cao] ${lyDo}`);
  return { ok: false, reason: `http_${status}`, lyDo, status };
}

/**
 * Toàn bộ việc báo cáo cho một lần chạy cron: đọc số liệu → soạn báo cáo → gửi lên
 * GitHub → ghi lại mốc để lần sau so sánh. KHÔNG BAO GIỜ ném lỗi ra ngoài.
 *
 * Mốc chỉ được ghi lại khi GỬI THÀNH CÔNG: gửi hỏng thì mai báo cáo vẫn so với mốc cũ,
 * nên không có "nhóm mới" nào bị mất khỏi báo cáo vì một lần lỗi mạng.
 *
 * @param {{storage: object, env?: object, channel?: object|null, nowMs?: number,
 *          fetchImpl?: Function}} opts
 */
async function runDailyReport({
  storage,
  env = process.env,
  channel = null,
  nowMs = Date.now(),
  fetchImpl = null,
} = {}) {
  // Kiểm tra cấu hình TRƯỚC khi truy vấn database: thiếu biến môi trường thì không việc
  // gì phải bắt database làm mấy câu COUNT cho một báo cáo sẽ không được gửi.
  const config = readGithubConfig(env);
  if (!config.ok) {
    console.log(`[bao-cao] Bỏ qua: ${config.message}`);
    return { daGui: false, lyDo: config.message };
  }

  let stats;
  let previous = null;
  let postedCount = null;
  try {
    stats = await storage.growthStats(growth.statsWindowStart(nowMs));
    if (typeof storage.readReportState === 'function') {
      previous = await storage.readReportState();
    }
    if (typeof storage.listPostedChannelPostIds === 'function') {
      postedCount = (await storage.listPostedChannelPostIds()).length;
    }
  } catch (err) {
    const lyDo = `Không lấy được số liệu cho báo cáo: ${safeErrorMessage(err, env)}`;
    console.error(`[bao-cao] ${lyDo}`);
    return { daGui: false, lyDo };
  }

  const body = buildReportMarkdown({ stats, previous, channel, nowMs, postedCount });
  const sent = await postReportComment({ body, env, fetchImpl });
  if (!sent.ok) return { daGui: false, lyDo: sent.lyDo };

  try {
    if (typeof storage.writeReportState === 'function') {
      await storage.writeReportState({ ...stats, at: nowMs });
    }
  } catch (err) {
    // Báo cáo ĐÃ lên GitHub rồi; không ghi được mốc chỉ làm cột "so với báo cáo trước"
    // của ngày mai kém chính xác, không đáng để coi là thất bại.
    console.error('[bao-cao] Không ghi được mốc báo cáo:', safeErrorMessage(err, env));
  }
  return { daGui: true, lyDo: '' };
}

module.exports = {
  DEFAULT_REPO,
  USER_AGENT,
  buildReportMarkdown,
  postReportComment,
  readGithubConfig,
  runDailyReport,
  vnTimestamp,
};
