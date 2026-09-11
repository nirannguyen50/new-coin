#!/usr/bin/env python3
"""Sinh lịch unlock token theo tháng và kiểm tra red flag tokenomics.

Cách dùng:
    python unlock_schedule.py config.example.json --months 36 --out out/

Đầu ra (trong thư mục --out):
    schedule.csv      lịch unlock chi tiết (theo tháng, theo nhóm, lũy kế, lưu hành)
    schedule.md       bảng dễ đọc + tóm tắt + kết quả kiểm tra red flag
    unlock_chart.png  biểu đồ stacked area cung lưu hành theo nhóm

Quy ước mô hình:
    - Tháng 0 là TGE. `tge_unlock_pct` là % CỦA NHÓM được mở tại TGE.
    - `cliff_months` tháng sau TGE không mở khóa gì thêm.
    - Phần còn lại mở tuyến tính đều trong `vesting_months` tháng, bắt đầu từ tháng
      `cliff_months + 1` và kết thúc tại tháng `cliff_months + vesting_months`.
    - `vesting_months == 0`: phần còn lại (nếu có) mở một lần tại tháng `cliff_months`.

Chỉ dùng thư viện chuẩn + matplotlib.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from dataclasses import dataclass, field
from typing import Dict, List, Optional

DEFAULT_RULES: Dict[str, float] = {
    "max_monthly_unlock_pct_of_prior_circ": 8.0,
    "tge_circulating_min_pct": 8.0,
    "tge_circulating_max_pct": 25.0,
    "team_plus_investors_max_pct": 40.0,
    "first_3_months_max_pct_of_tge_circ": 30.0,
}

PCT_TOLERANCE = 1e-6


# ---------------------------------------------------------------------------
# Cấu trúc dữ liệu
# ---------------------------------------------------------------------------


@dataclass
class Bucket:
    key: str
    name: str
    role: str
    pct: float
    tge_unlock_pct: float
    cliff_months: int
    vesting_months: int
    note: str = ""

    def tokens(self, total_supply: float) -> float:
        return total_supply * self.pct / 100.0

    def cumulative_fraction(self, month: int) -> float:
        """Tỷ lệ (0..1) của nhóm đã mở khóa tính đến hết tháng `month`."""
        if month < 0:
            return 0.0
        tge = self.tge_unlock_pct / 100.0
        remaining = 1.0 - tge
        if remaining <= 0:
            return 1.0
        if self.vesting_months <= 0:
            return 1.0 if month >= self.cliff_months else tge
        elapsed = month - self.cliff_months
        if elapsed <= 0:
            return tge
        frac = min(elapsed / self.vesting_months, 1.0)
        return tge + remaining * frac

    def unlock_fraction(self, month: int) -> float:
        """Tỷ lệ của nhóm mở khóa TRONG tháng `month` (tháng 0 = TGE)."""
        return self.cumulative_fraction(month) - self.cumulative_fraction(month - 1)

    def last_unlock_month(self) -> int:
        if self.tge_unlock_pct >= 100:
            return 0
        if self.vesting_months <= 0:
            return self.cliff_months
        return self.cliff_months + self.vesting_months


@dataclass
class Config:
    name: str
    ticker: str
    total_supply: float
    decimals: int
    horizon_months: int
    rules: Dict[str, float]
    buckets: List[Bucket]

    def bucket_by_role(self, role: str) -> Optional[Bucket]:
        for b in self.buckets:
            if b.role == role:
                return b
        return None

    def allocation_sum(self) -> float:
        return sum(b.pct for b in self.buckets)


@dataclass
class MonthRow:
    month: int
    unlock: Dict[str, float]
    cumulative: Dict[str, float]
    total_unlock: float
    circulating: float
    pct_of_supply: float
    mom_pct_of_prior_circ: Optional[float]  # None ở tháng 0 (TGE)


@dataclass
class Check:
    rule: str
    status: str  # "PASS" | "WARN"
    detail: str

    @property
    def ok(self) -> bool:
        return self.status == "PASS"


@dataclass
class Schedule:
    config: Config
    rows: List[MonthRow] = field(default_factory=list)

    @property
    def months(self) -> int:
        return len(self.rows) - 1


# ---------------------------------------------------------------------------
# Đọc cấu hình
# ---------------------------------------------------------------------------


def _num(d: dict, key: str, ctx: str, default=None) -> float:
    if key not in d:
        if default is not None:
            return default
        raise ValueError(f"{ctx}: thiếu trường '{key}'")
    v = d[key]
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        raise ValueError(f"{ctx}: trường '{key}' phải là số, nhận {v!r}")
    return v


def parse_config(data: dict) -> Config:
    token = data.get("token", {})
    total_supply = _num(token, "total_supply", "token")
    if total_supply <= 0:
        raise ValueError("token.total_supply phải > 0")

    rules = dict(DEFAULT_RULES)
    for k, v in (data.get("rules") or {}).items():
        if k not in DEFAULT_RULES:
            raise ValueError(f"rules: quy tắc không hỗ trợ '{k}'")
        rules[k] = float(v)

    raw_buckets = data.get("buckets")
    if not raw_buckets:
        raise ValueError("config phải có danh sách 'buckets' không rỗng")

    buckets: List[Bucket] = []
    seen = set()
    for i, rb in enumerate(raw_buckets):
        ctx = f"buckets[{i}]"
        key = rb.get("key")
        if not key:
            raise ValueError(f"{ctx}: thiếu 'key'")
        if key in seen:
            raise ValueError(f"{ctx}: key '{key}' bị trùng")
        seen.add(key)
        b = Bucket(
            key=key,
            name=rb.get("name", key),
            role=rb.get("role", key),
            pct=float(_num(rb, "pct", ctx)),
            tge_unlock_pct=float(_num(rb, "tge_unlock_pct", ctx, 0.0)),
            cliff_months=int(_num(rb, "cliff_months", ctx, 0)),
            vesting_months=int(_num(rb, "vesting_months", ctx, 0)),
            note=rb.get("note", ""),
        )
        if b.pct < 0:
            raise ValueError(f"{ctx}: pct phải >= 0")
        if not (0 <= b.tge_unlock_pct <= 100):
            raise ValueError(f"{ctx}: tge_unlock_pct phải trong [0, 100]")
        if b.cliff_months < 0 or b.vesting_months < 0:
            raise ValueError(f"{ctx}: cliff_months/vesting_months phải >= 0")
        buckets.append(b)

    return Config(
        name=token.get("name", ""),
        ticker=token.get("ticker", ""),
        total_supply=float(total_supply),
        decimals=int(token.get("decimals", 18)),
        horizon_months=int(data.get("horizon_months", 36)),
        rules=rules,
        buckets=buckets,
    )


def load_config(path: str) -> Config:
    with open(path, "r", encoding="utf-8") as f:
        return parse_config(json.load(f))


# ---------------------------------------------------------------------------
# Tính lịch unlock
# ---------------------------------------------------------------------------


def build_schedule(config: Config, months: int) -> Schedule:
    if months < 0:
        raise ValueError("months phải >= 0")
    sched = Schedule(config=config)
    prev_circ = 0.0
    for m in range(0, months + 1):
        unlock: Dict[str, float] = {}
        cumulative: Dict[str, float] = {}
        for b in config.buckets:
            tokens = b.tokens(config.total_supply)
            unlock[b.key] = tokens * b.unlock_fraction(m)
            cumulative[b.key] = tokens * b.cumulative_fraction(m)
        total_unlock = sum(unlock.values())
        circ = sum(cumulative.values())
        if m == 0:
            mom = None
        else:
            mom = (total_unlock / prev_circ * 100.0) if prev_circ > 0 else None
        sched.rows.append(
            MonthRow(
                month=m,
                unlock=unlock,
                cumulative=cumulative,
                total_unlock=total_unlock,
                circulating=circ,
                pct_of_supply=circ / config.total_supply * 100.0,
                mom_pct_of_prior_circ=mom,
            )
        )
        prev_circ = circ
    return sched


# ---------------------------------------------------------------------------
# Kiểm tra red flag
# ---------------------------------------------------------------------------


def check_red_flags(schedule: Schedule) -> List[Check]:
    cfg = schedule.config
    rules = cfg.rules
    checks: List[Check] = []

    # 1. Tổng phân bổ = 100%
    total = cfg.allocation_sum()
    ok = abs(total - 100.0) <= PCT_TOLERANCE
    checks.append(
        Check(
            "Tổng phân bổ = 100%",
            "PASS" if ok else "WARN",
            f"tổng = {total:.4f}%" + ("" if ok else f" (lệch {total - 100.0:+.4f}%)"),
        )
    )

    # 2. Đội ngũ không unlock tại TGE
    team = cfg.bucket_by_role("team")
    if team is None:
        checks.append(Check("Đội ngũ 0% tại TGE", "WARN", "không tìm thấy nhóm role='team'"))
    else:
        ok = team.tge_unlock_pct == 0
        checks.append(
            Check(
                "Đội ngũ 0% tại TGE",
                "PASS" if ok else "WARN",
                f"{team.name}: TGE unlock = {team.tge_unlock_pct:g}% của nhóm"
                + ("" if ok else f" = {team.pct * team.tge_unlock_pct / 100:.2f}% tổng cung"),
            )
        )

    # 3. Đội ngũ + nhà đầu tư <= ngưỡng
    inv = cfg.bucket_by_role("investors")
    team_pct = team.pct if team else 0.0
    inv_pct = inv.pct if inv else 0.0
    limit = rules["team_plus_investors_max_pct"]
    ok = team_pct + inv_pct <= limit + PCT_TOLERANCE
    checks.append(
        Check(
            f"Đội ngũ + nhà đầu tư <= {limit:g}%",
            "PASS" if ok else "WARN",
            f"đội ngũ {team_pct:g}% + nhà đầu tư {inv_pct:g}% = {team_pct + inv_pct:g}%",
        )
    )

    # 4. Không tháng nào (sau TGE) unlock > X% cung lưu hành tháng trước
    limit = rules["max_monthly_unlock_pct_of_prior_circ"]
    offenders = [
        r for r in schedule.rows[1:] if r.mom_pct_of_prior_circ is not None and r.mom_pct_of_prior_circ > limit + PCT_TOLERANCE
    ]
    worst = max(
        (r for r in schedule.rows[1:] if r.mom_pct_of_prior_circ is not None),
        key=lambda r: r.mom_pct_of_prior_circ,
        default=None,
    )
    if worst is None:
        detail = "không có tháng nào sau TGE trong khoảng tính"
    else:
        detail = f"cao nhất: tháng {worst.month} = {worst.mom_pct_of_prior_circ:.2f}%"
    if offenders:
        detail += " | vi phạm: " + ", ".join(f"T{r.month}={r.mom_pct_of_prior_circ:.2f}%" for r in offenders[:12])
        if len(offenders) > 12:
            detail += f", ... ({len(offenders)} tháng)"
    checks.append(
        Check(
            f"Không tháng nào unlock > {limit:g}% lưu hành tháng trước",
            "WARN" if offenders else "PASS",
            detail,
        )
    )

    # 5. Cung lưu hành tại TGE trong khoảng
    lo, hi = rules["tge_circulating_min_pct"], rules["tge_circulating_max_pct"]
    tge_pct = schedule.rows[0].pct_of_supply if schedule.rows else 0.0
    ok = lo - PCT_TOLERANCE <= tge_pct <= hi + PCT_TOLERANCE
    checks.append(
        Check(
            f"Lưu hành tại TGE trong [{lo:g}%, {hi:g}%]",
            "PASS" if ok else "WARN",
            f"TGE = {tge_pct:.2f}% tổng cung ({schedule.rows[0].circulating:,.0f} token)",
        )
    )

    # 6. Có nhóm thanh khoản (LP)
    lp = cfg.bucket_by_role("liquidity")
    ok = lp is not None and lp.pct > 0
    checks.append(
        Check(
            "Có nhóm thanh khoản (LP)",
            "PASS" if ok else "WARN",
            (f"{lp.name}: {lp.pct:g}% tổng cung, TGE {lp.tge_unlock_pct:g}% của nhóm" if lp else "không có nhóm role='liquidity'")
            + ("" if ok else " — cần dành riêng token cho pool DEX/MM và khóa LP >= 12 tháng"),
        )
    )

    # 7. (Bổ sung từ template) unlock trong 3 tháng đầu <= X% lưu hành TGE
    limit = rules["first_3_months_max_pct_of_tge_circ"]
    tge_circ = schedule.rows[0].circulating if schedule.rows else 0.0
    first3 = sum(r.total_unlock for r in schedule.rows[1:4])
    if tge_circ > 0:
        ratio = first3 / tge_circ * 100.0
        ok = ratio <= limit + PCT_TOLERANCE
        detail = f"tháng 1–3 mở {first3 / cfg.total_supply * 100:.2f}% tổng cung = {ratio:.2f}% lưu hành TGE"
    else:
        ok = False
        detail = "lưu hành TGE = 0, không tính được"
    checks.append(Check(f"Unlock 3 tháng đầu <= {limit:g}% lưu hành TGE", "PASS" if ok else "WARN", detail))

    return checks


# ---------------------------------------------------------------------------
# Ghi đầu ra
# ---------------------------------------------------------------------------


def write_csv(schedule: Schedule, path: str) -> None:
    cfg = schedule.config
    header = ["month"]
    for b in cfg.buckets:
        header.append(f"{b.key}_unlock")
    for b in cfg.buckets:
        header.append(f"{b.key}_cum")
    header += ["total_unlock", "total_circulating", "pct_of_supply", "mom_unlock_pct_of_prior_circ"]
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        for r in schedule.rows:
            row = [r.month]
            row += [f"{r.unlock[b.key]:.2f}" for b in cfg.buckets]
            row += [f"{r.cumulative[b.key]:.2f}" for b in cfg.buckets]
            row += [
                f"{r.total_unlock:.2f}",
                f"{r.circulating:.2f}",
                f"{r.pct_of_supply:.4f}",
                "" if r.mom_pct_of_prior_circ is None else f"{r.mom_pct_of_prior_circ:.4f}",
            ]
            w.writerow(row)


def _fmt_tokens(x: float) -> str:
    return f"{x:,.0f}"


def _fmt_m(x: float) -> str:
    """Định dạng theo triệu token."""
    return f"{x / 1e6:,.2f}M"


def render_checks(checks: List[Check]) -> str:
    lines = []
    for c in checks:
        lines.append(f"[{c.status}] {c.rule}: {c.detail}")
    n_warn = sum(1 for c in checks if not c.ok)
    lines.append(f"Kết quả: {len(checks) - n_warn} PASS, {n_warn} WARN")
    return "\n".join(lines)


def write_md(schedule: Schedule, checks: List[Check], path: str) -> None:
    cfg = schedule.config
    rows = schedule.rows
    tge = rows[0]
    out: List[str] = []
    title = f"{cfg.name} ({cfg.ticker})" if cfg.name or cfg.ticker else "Token"
    out.append(f"# Lịch unlock {title} — {schedule.months} tháng")
    out.append("")
    out.append("_File này được sinh tự động bởi `unlock_schedule.py`; sửa `config` rồi chạy lại, không sửa tay._")
    out.append("")
    out.append("## Tóm tắt")
    out.append("")
    out.append(f"- Tổng cung: **{_fmt_tokens(cfg.total_supply)} {cfg.ticker}** (cố định)")
    out.append(f"- Lưu hành tại TGE (tháng 0): **{_fmt_tokens(tge.circulating)}** = **{tge.pct_of_supply:.2f}%** tổng cung")
    for m in (3, 6, 12, 24, 36):
        if m <= schedule.months:
            r = rows[m]
            out.append(f"- Lưu hành cuối tháng {m}: {_fmt_tokens(r.circulating)} = {r.pct_of_supply:.2f}%")
    last = rows[-1]
    if schedule.months not in (3, 6, 12, 24, 36):
        out.append(f"- Lưu hành cuối tháng {schedule.months}: {_fmt_tokens(last.circulating)} = {last.pct_of_supply:.2f}%")
    mom_rows = [r for r in rows[1:] if r.mom_pct_of_prior_circ is not None]
    if mom_rows:
        worst = max(mom_rows, key=lambda r: r.mom_pct_of_prior_circ)
        out.append(
            f"- Tháng unlock mạnh nhất so với lưu hành tháng trước: tháng {worst.month} "
            f"({worst.mom_pct_of_prior_circ:.2f}%, {_fmt_tokens(worst.total_unlock)} token)"
        )
    pending = [b for b in cfg.buckets if b.last_unlock_month() > schedule.months]
    if pending:
        out.append(
            "- Nhóm chưa mở hết trong khoảng tính: "
            + ", ".join(f"{b.name} (xong tháng {b.last_unlock_month()})" for b in pending)
        )
    out.append("")

    out.append("## Phân bổ và vesting")
    out.append("")
    out.append("| Nhóm | Role | % tổng cung | Số token | Mở tại TGE (% nhóm) | Cliff (tháng) | Vesting (tháng) | Mở hết tại tháng | Ghi chú |")
    out.append("|---|---|---:|---:|---:|---:|---:|---:|---|")
    for b in cfg.buckets:
        out.append(
            f"| {b.name} | `{b.role}` | {b.pct:g}% | {_fmt_tokens(b.tokens(cfg.total_supply))} | "
            f"{b.tge_unlock_pct:g}% | {b.cliff_months} | {b.vesting_months} | {b.last_unlock_month()} | {b.note} |"
        )
    out.append(f"| **Tổng** | | **{cfg.allocation_sum():g}%** | **{_fmt_tokens(cfg.total_supply * cfg.allocation_sum() / 100)}** | | | | | |")
    out.append("")

    out.append("## Lịch unlock theo tháng (đơn vị: triệu token)")
    out.append("")
    out.append("Cột theo nhóm là số token mở khóa **trong** tháng đó; lũy kế từng nhóm xem trong `schedule.csv`.")
    out.append("")
    head = "| Tháng | " + " | ".join(b.name for b in cfg.buckets) + " | Tổng mở trong tháng | Lưu hành | % tổng cung | Unlock / lưu hành tháng trước |"
    out.append(head)
    out.append("|---:|" + "---:|" * len(cfg.buckets) + "---:|---:|---:|---:|")
    for r in rows:
        cells = [str(r.month) if r.month else "0 (TGE)"]
        cells += [_fmt_m(r.unlock[b.key]) if r.unlock[b.key] else "–" for b in cfg.buckets]
        cells += [
            _fmt_m(r.total_unlock),
            _fmt_m(r.circulating),
            f"{r.pct_of_supply:.2f}%",
            "–" if r.mom_pct_of_prior_circ is None else f"{r.mom_pct_of_prior_circ:.2f}%",
        ]
        out.append("| " + " | ".join(cells) + " |")
    out.append("")

    out.append("## Kiểm tra red flag")
    out.append("")
    out.append("| Kết quả | Quy tắc | Số liệu |")
    out.append("|---|---|---|")
    for c in checks:
        out.append(f"| **{c.status}** | {c.rule} | {c.detail} |")
    n_warn = sum(1 for c in checks if not c.ok)
    out.append("")
    out.append(f"**{len(checks) - n_warn} PASS, {n_warn} WARN.** " + ("Không có red flag theo các quy tắc trên." if n_warn == 0 else "Xem lại các dòng WARN và điều chỉnh config."))
    out.append("")
    out.append("![Biểu đồ cung lưu hành theo nhóm](unlock_chart.png)")
    out.append("")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(out))


# Bảng màu 8 nhóm (thứ tự cố định, đã kiểm tra tách biệt cho người mù màu).
SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"]
INK = "#0b0b0b"
INK_SECONDARY = "#52514e"
INK_MUTED = "#898781"
GRID = "#e1e0d9"
SURFACE = "#fcfcfb"


def write_chart(schedule: Schedule, path: str) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.ticker import MultipleLocator

    cfg = schedule.config
    rows = schedule.rows
    if len(cfg.buckets) > len(SERIES_COLORS):
        raise ValueError(f"Biểu đồ hỗ trợ tối đa {len(SERIES_COLORS)} nhóm; gộp bớt nhóm nhỏ vào 'Khác'.")

    x = [r.month for r in rows]
    series = [[r.cumulative[b.key] / cfg.total_supply * 100.0 for r in rows] for b in cfg.buckets]
    labels = [b.name for b in cfg.buckets]
    colors = SERIES_COLORS[: len(cfg.buckets)]

    fig, ax = plt.subplots(figsize=(12, 6.5), dpi=150)
    fig.patch.set_facecolor(SURFACE)
    ax.set_facecolor(SURFACE)
    ax.stackplot(x, *series, labels=labels, colors=colors, edgecolor=SURFACE, linewidth=1.2, alpha=0.95)

    # Đường tổng lưu hành
    total = [r.pct_of_supply for r in rows]
    ax.plot(x, total, color=INK, linewidth=1.4)
    ax.annotate(
        f"{total[-1]:.1f}% tại tháng {x[-1]}",
        xy=(x[-1], total[-1]),
        xytext=(-6, 8),
        textcoords="offset points",
        ha="right",
        va="bottom",
        fontsize=9,
        color=INK,
    )
    ax.annotate(
        f"TGE {total[0]:.1f}%",
        xy=(x[0], total[0]),
        xytext=(6, 8),
        textcoords="offset points",
        ha="left",
        va="bottom",
        fontsize=9,
        color=INK,
    )

    # Mốc hết cliff của đội ngũ / nhà đầu tư
    for role, label in (("team", "hết cliff đội ngũ"), ("investors", "hết cliff nhà đầu tư")):
        b = cfg.bucket_by_role(role)
        if b and 0 < b.cliff_months < schedule.months:
            ax.axvline(b.cliff_months + 0.5, color=INK_MUTED, linestyle=(0, (3, 3)), linewidth=0.9)
            ax.text(
                b.cliff_months + 0.7,
                99,
                f"{label} (T{b.cliff_months + 1})",
                rotation=90,
                va="top",
                ha="left",
                fontsize=8,
                color=INK_SECONDARY,
            )

    ax.set_xlim(0, x[-1])
    ax.set_ylim(0, 100)
    ax.xaxis.set_major_locator(MultipleLocator(3 if x[-1] >= 18 else 1))
    ax.yaxis.set_major_locator(MultipleLocator(10))
    ax.set_xlabel("Tháng sau TGE (tháng 0 = TGE)", color=INK_SECONDARY, fontsize=10)
    ax.set_ylabel("Cung lưu hành (% tổng cung)", color=INK_SECONDARY, fontsize=10)
    ax.yaxis.set_major_formatter(lambda v, _pos: f"{v:.0f}%")
    ax.grid(axis="y", color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color(GRID)
    ax.tick_params(colors=INK_MUTED, labelsize=9)

    title = f"{cfg.name} ({cfg.ticker})" if cfg.name or cfg.ticker else "Token"
    ax.set_title(
        f"Cung lưu hành theo nhóm — {title}, {schedule.months} tháng sau TGE",
        loc="left",
        fontsize=13,
        color=INK,
        pad=14,
    )
    handles, lbls = ax.get_legend_handles_labels()
    # Legend theo thứ tự stack (nhóm dưới cùng ở dưới cùng)
    ax.legend(
        handles[::-1],
        lbls[::-1],
        loc="upper left",
        bbox_to_anchor=(1.01, 1.0),
        frameon=False,
        fontsize=9,
        labelcolor=INK_SECONDARY,
        title="Nhóm (từ trên xuống)",
        title_fontsize=9,
    )
    fig.tight_layout()
    fig.savefig(path, facecolor=SURFACE)
    plt.close(fig)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def run(config_path: str, months: Optional[int], out_dir: str, chart: bool = True) -> List[Check]:
    cfg = load_config(config_path)
    horizon = cfg.horizon_months if months is None else months
    schedule = build_schedule(cfg, horizon)
    checks = check_red_flags(schedule)

    os.makedirs(out_dir, exist_ok=True)
    csv_path = os.path.join(out_dir, "schedule.csv")
    md_path = os.path.join(out_dir, "schedule.md")
    png_path = os.path.join(out_dir, "unlock_chart.png")
    write_csv(schedule, csv_path)
    write_md(schedule, checks, md_path)
    written = [csv_path, md_path]
    if chart:
        write_chart(schedule, png_path)
        written.append(png_path)

    tge = schedule.rows[0]
    last = schedule.rows[-1]
    print(f"Token: {cfg.name} ({cfg.ticker}) — tổng cung {_fmt_tokens(cfg.total_supply)}")
    print(f"Khoảng tính: {horizon} tháng sau TGE")
    print(f"Lưu hành tại TGE: {_fmt_tokens(tge.circulating)} ({tge.pct_of_supply:.2f}%)")
    print(f"Lưu hành cuối tháng {horizon}: {_fmt_tokens(last.circulating)} ({last.pct_of_supply:.2f}%)")
    print("Đã ghi: " + ", ".join(written))
    print()
    print("Kiểm tra red flag:")
    print(render_checks(checks))
    return checks


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(description="Sinh lịch unlock token và kiểm tra red flag tokenomics.")
    p.add_argument("config", help="đường dẫn file JSON cấu hình phân bổ (xem config.example.json)")
    p.add_argument("--months", type=int, default=None, help="số tháng sau TGE cần tính (mặc định: horizon_months trong config, hoặc 36)")
    p.add_argument("--out", default="out", help="thư mục ghi kết quả (mặc định: out/)")
    p.add_argument("--no-chart", action="store_true", help="bỏ qua vẽ biểu đồ PNG")
    p.add_argument("--strict", action="store_true", help="trả mã thoát 1 nếu có bất kỳ WARN nào")
    args = p.parse_args(argv)
    try:
        checks = run(args.config, args.months, args.out, chart=not args.no_chart)
    except (ValueError, OSError, json.JSONDecodeError) as e:
        print(f"Lỗi: {e}", file=sys.stderr)
        return 2
    if args.strict and any(not c.ok for c in checks):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
