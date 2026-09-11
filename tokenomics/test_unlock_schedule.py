"""Unit test cho unlock_schedule.py. Chạy: pytest -q (trong thư mục tokenomics/)."""

import copy
import csv
import json
import os

import pytest

import unlock_schedule as us

HERE = os.path.dirname(os.path.abspath(__file__))
EXAMPLE = os.path.join(HERE, "config.example.json")


def base_config(**overrides):
    """Config tối giản hợp lệ (tổng 100%) dùng cho test; override từng nhóm bằng key."""
    data = {
        "token": {"name": "T", "ticker": "TST", "total_supply": 1_000_000},
        "buckets": [
            {"key": "community", "role": "community", "pct": 40, "tge_unlock_pct": 10, "cliff_months": 0, "vesting_months": 36},
            {"key": "team", "role": "team", "pct": 15, "tge_unlock_pct": 0, "cliff_months": 12, "vesting_months": 24},
            {"key": "investors", "role": "investors", "pct": 15, "tge_unlock_pct": 0, "cliff_months": 6, "vesting_months": 24},
            {"key": "treasury", "role": "treasury", "pct": 20, "tge_unlock_pct": 0, "cliff_months": 0, "vesting_months": 36},
            {"key": "liquidity", "role": "liquidity", "pct": 10, "tge_unlock_pct": 100, "cliff_months": 0, "vesting_months": 0},
        ],
    }
    for key, patch in overrides.items():
        for b in data["buckets"]:
            if b["key"] == key:
                b.update(patch)
                break
        else:
            data["buckets"].append({"key": key, "role": key, **patch})
    return data


def find_check(checks, prefix):
    for c in checks:
        if c.rule.startswith(prefix):
            return c
    raise AssertionError(f"không thấy rule bắt đầu bằng {prefix!r}")


# --------------------------------------------------------------------------- tổng phân bổ


def test_example_config_sums_to_100():
    cfg = us.load_config(EXAMPLE)
    assert cfg.allocation_sum() == pytest.approx(100.0)
    assert cfg.total_supply == 1_000_000_000
    assert cfg.ticker == "NEWC"


def test_sum_not_100_is_flagged():
    data = base_config(treasury={"pct": 25})  # 105%
    cfg = us.parse_config(data)
    checks = us.check_red_flags(us.build_schedule(cfg, 12))
    c = find_check(checks, "Tổng phân bổ")
    assert c.status == "WARN"
    assert "105" in c.detail


def test_sum_exactly_100_passes():
    cfg = us.parse_config(base_config())
    checks = us.check_red_flags(us.build_schedule(cfg, 12))
    assert find_check(checks, "Tổng phân bổ").status == "PASS"


# --------------------------------------------------------------------------- cliff


def test_cliff_blocks_unlock_until_cliff_ends():
    b = us.Bucket("x", "x", "x", pct=10, tge_unlock_pct=0, cliff_months=6, vesting_months=12)
    for m in range(0, 7):
        assert b.unlock_fraction(m) == 0.0, f"tháng {m} không được mở khóa trong cliff"
    assert b.unlock_fraction(7) == pytest.approx(1 / 12)
    assert b.cumulative_fraction(6) == 0.0
    assert b.last_unlock_month() == 18


def test_cliff_with_tge_unlock_only_releases_tge_portion():
    b = us.Bucket("x", "x", "x", pct=10, tge_unlock_pct=25, cliff_months=3, vesting_months=6)
    assert b.unlock_fraction(0) == pytest.approx(0.25)
    assert all(b.unlock_fraction(m) == 0.0 for m in (1, 2, 3))
    assert b.cumulative_fraction(3) == pytest.approx(0.25)
    assert b.unlock_fraction(4) == pytest.approx(0.75 / 6)


def test_vesting_zero_releases_remainder_at_cliff_month():
    b = us.Bucket("x", "x", "x", pct=10, tge_unlock_pct=0, cliff_months=6, vesting_months=0)
    assert b.cumulative_fraction(5) == 0.0
    assert b.unlock_fraction(6) == pytest.approx(1.0)
    assert b.cumulative_fraction(7) == 1.0
    assert b.last_unlock_month() == 6


def test_full_tge_unlock_has_nothing_after_month_zero():
    b = us.Bucket("x", "x", "x", pct=10, tge_unlock_pct=100, cliff_months=0, vesting_months=0)
    assert b.unlock_fraction(0) == 1.0
    assert all(b.unlock_fraction(m) == 0.0 for m in range(1, 40))
    assert b.last_unlock_month() == 0


# --------------------------------------------------------------------------- vesting tuyến tính


def test_linear_vesting_arithmetic_in_tokens():
    # 1,000 token: 10% TGE, cliff 2, vesting 6 -> 100 tại T0, 0 ở T1-2, 150/tháng T3-T8, 0 sau đó.
    data = {
        "token": {"total_supply": 1000},
        "buckets": [{"key": "a", "role": "a", "pct": 100, "tge_unlock_pct": 10, "cliff_months": 2, "vesting_months": 6}],
    }
    cfg = us.parse_config(data)
    sched = us.build_schedule(cfg, 10)
    unlocks = [r.unlock["a"] for r in sched.rows]
    assert unlocks[0] == pytest.approx(100)
    assert unlocks[1] == 0 and unlocks[2] == 0
    for m in range(3, 9):
        assert unlocks[m] == pytest.approx(150)
    assert unlocks[9] == pytest.approx(0) and unlocks[10] == pytest.approx(0)
    assert sched.rows[8].cumulative["a"] == pytest.approx(1000)
    assert sched.rows[10].circulating == pytest.approx(1000)
    assert sched.rows[10].pct_of_supply == pytest.approx(100.0)


def test_cumulative_equals_bucket_total_after_last_unlock():
    cfg = us.load_config(EXAMPLE)
    sched = us.build_schedule(cfg, 60)
    for b in cfg.buckets:
        assert sched.rows[b.last_unlock_month()].cumulative[b.key] == pytest.approx(b.tokens(cfg.total_supply))
        # đơn điệu không giảm
        cums = [r.cumulative[b.key] for r in sched.rows]
        assert all(cums[i] <= cums[i + 1] + 1e-9 for i in range(len(cums) - 1))
    assert sched.rows[-1].circulating == pytest.approx(cfg.total_supply)


def test_mom_ratio_uses_prior_month_circulating():
    data = {
        "token": {"total_supply": 1000},
        "buckets": [
            {"key": "lp", "role": "liquidity", "pct": 50, "tge_unlock_pct": 100, "cliff_months": 0, "vesting_months": 0},
            {"key": "a", "role": "community", "pct": 50, "tge_unlock_pct": 0, "cliff_months": 0, "vesting_months": 5},
        ],
    }
    sched = us.build_schedule(us.parse_config(data), 3)
    assert sched.rows[0].mom_pct_of_prior_circ is None
    # T0 lưu hành 500; T1 mở 100 -> 20%; T2 mở 100 trên 600 -> 16.67%
    assert sched.rows[1].mom_pct_of_prior_circ == pytest.approx(20.0)
    assert sched.rows[2].mom_pct_of_prior_circ == pytest.approx(100 / 600 * 100)


# --------------------------------------------------------------------------- red flag


def test_example_config_passes_all_rules():
    cfg = us.load_config(EXAMPLE)
    checks = us.check_red_flags(us.build_schedule(cfg, 36))
    failing = [f"{c.rule}: {c.detail}" for c in checks if not c.ok]
    assert failing == []


def test_team_tge_unlock_flagged():
    cfg = us.parse_config(base_config(team={"tge_unlock_pct": 5}))
    c = find_check(us.check_red_flags(us.build_schedule(cfg, 12)), "Đội ngũ 0% tại TGE")
    assert c.status == "WARN"
    assert "5%" in c.detail


def test_missing_team_bucket_is_warned():
    data = base_config()
    data["buckets"] = [b for b in data["buckets"] if b["key"] != "team"]
    data["buckets"][0]["pct"] += 15  # giữ tổng 100
    c = find_check(us.check_red_flags(us.build_schedule(us.parse_config(data), 12)), "Đội ngũ 0% tại TGE")
    assert c.status == "WARN"


def test_team_plus_investors_over_40_flagged():
    data = base_config(team={"pct": 25}, investors={"pct": 20}, community={"pct": 25})  # 25+20 = 45
    c = find_check(us.check_red_flags(us.build_schedule(us.parse_config(data), 12)), "Đội ngũ + nhà đầu tư")
    assert c.status == "WARN"
    assert "45" in c.detail


def test_team_plus_investors_at_exactly_40_passes():
    data = base_config(team={"pct": 20}, investors={"pct": 20}, community={"pct": 30})
    c = find_check(us.check_red_flags(us.build_schedule(us.parse_config(data), 12)), "Đội ngũ + nhà đầu tư")
    assert c.status == "PASS"


def test_monthly_unlock_over_8pct_flagged_with_offending_months():
    # LP 10% tại TGE, community 40% vesting 12 tháng -> T1 mở 3.33% tổng cung trên 10% lưu hành = 33%.
    data = base_config(community={"tge_unlock_pct": 0, "vesting_months": 12})
    c = find_check(us.check_red_flags(us.build_schedule(us.parse_config(data), 12)), "Không tháng nào unlock")
    assert c.status == "WARN"
    assert "T1=" in c.detail
    assert "cao nhất: tháng 1" in c.detail


def test_monthly_unlock_rule_ignores_tge_month():
    # Mọi thứ mở tại TGE trừ community vesting dài -> không có tháng vi phạm.
    data = base_config(
        community={"tge_unlock_pct": 50, "vesting_months": 48},
        treasury={"tge_unlock_pct": 50, "vesting_months": 48},
    )
    c = find_check(us.check_red_flags(us.build_schedule(us.parse_config(data), 36)), "Không tháng nào unlock")
    assert c.status == "PASS"


def test_tge_circulating_below_range_flagged():
    data = base_config(liquidity={"tge_unlock_pct": 30, "vesting_months": 12}, community={"tge_unlock_pct": 0})  # TGE = 3%
    c = find_check(us.check_red_flags(us.build_schedule(us.parse_config(data), 12)), "Lưu hành tại TGE")
    assert c.status == "WARN"
    assert "3.00%" in c.detail


def test_tge_circulating_above_range_flagged():
    data = base_config(community={"tge_unlock_pct": 50})  # 20 + 10 = 30%
    c = find_check(us.check_red_flags(us.build_schedule(us.parse_config(data), 12)), "Lưu hành tại TGE")
    assert c.status == "WARN"
    assert "30.00%" in c.detail


def test_lp_bucket_missing_flagged():
    data = base_config()
    data["buckets"] = [b for b in data["buckets"] if b["key"] != "liquidity"]
    data["buckets"][0]["pct"] += 10
    c = find_check(us.check_red_flags(us.build_schedule(us.parse_config(data), 12)), "Có nhóm thanh khoản")
    assert c.status == "WARN"


def test_first_three_months_rule_flagged():
    data = base_config(community={"tge_unlock_pct": 0, "vesting_months": 12})  # 3.33%/tháng x3 = 10% trên 10% TGE = 100%
    c = find_check(us.check_red_flags(us.build_schedule(us.parse_config(data), 12)), "Unlock 3 tháng đầu")
    assert c.status == "WARN"


def test_rules_thresholds_are_configurable():
    data = base_config()
    data["rules"] = {"team_plus_investors_max_pct": 25}  # team 15 + inv 15 = 30 > 25
    c = find_check(us.check_red_flags(us.build_schedule(us.parse_config(data), 12)), "Đội ngũ + nhà đầu tư")
    assert c.status == "WARN"
    assert "25%" in c.rule


def test_render_checks_prints_pass_warn_lines():
    cfg = us.parse_config(base_config(team={"tge_unlock_pct": 5}))
    text = us.render_checks(us.check_red_flags(us.build_schedule(cfg, 12)))
    assert "[WARN] Đội ngũ 0% tại TGE" in text
    assert "[PASS] Tổng phân bổ = 100%" in text
    assert "WARN" in text.splitlines()[-1]


# --------------------------------------------------------------------------- kiểm tra config


@pytest.mark.parametrize(
    "patch,msg",
    [
        ({"tge_unlock_pct": 120}, "tge_unlock_pct"),
        ({"cliff_months": -1}, "cliff_months"),
        ({"pct": -5}, "pct"),
    ],
)
def test_invalid_bucket_values_rejected(patch, msg):
    with pytest.raises(ValueError, match=msg):
        us.parse_config(base_config(team=patch))


def test_duplicate_key_rejected():
    data = base_config()
    data["buckets"].append(copy.deepcopy(data["buckets"][0]))
    with pytest.raises(ValueError, match="trùng"):
        us.parse_config(data)


def test_unknown_rule_rejected():
    data = base_config()
    data["rules"] = {"khong_ton_tai": 1}
    with pytest.raises(ValueError, match="không hỗ trợ"):
        us.parse_config(data)


# --------------------------------------------------------------------------- CLI end-to-end


def test_cli_writes_all_outputs(tmp_path, capsys):
    out = tmp_path / "out"
    rc = us.main([EXAMPLE, "--months", "24", "--out", str(out)])
    assert rc == 0
    for name in ("schedule.csv", "schedule.md", "unlock_chart.png"):
        assert (out / name).is_file(), name
    with open(out / "schedule.csv", encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    assert len(rows) == 25  # tháng 0..24
    assert rows[0]["month"] == "0" and rows[0]["mom_unlock_pct_of_prior_circ"] == ""
    assert float(rows[-1]["pct_of_supply"]) > float(rows[0]["pct_of_supply"])
    md = (out / "schedule.md").read_text(encoding="utf-8")
    assert "## Kiểm tra red flag" in md and "| **PASS** |" in md
    assert (out / "unlock_chart.png").stat().st_size > 10_000
    captured = capsys.readouterr().out
    assert "Kiểm tra red flag:" in captured and "[PASS]" in captured


def test_cli_strict_returns_1_on_warn(tmp_path):
    data = base_config(team={"tge_unlock_pct": 5})
    cfg_path = tmp_path / "bad.json"
    cfg_path.write_text(json.dumps(data), encoding="utf-8")
    assert us.main([str(cfg_path), "--out", str(tmp_path / "o"), "--no-chart", "--strict"]) == 1
    assert us.main([str(cfg_path), "--out", str(tmp_path / "o"), "--no-chart"]) == 0


def test_cli_invalid_config_returns_2(tmp_path):
    cfg_path = tmp_path / "broken.json"
    cfg_path.write_text("{not json", encoding="utf-8")
    assert us.main([str(cfg_path), "--out", str(tmp_path / "o"), "--no-chart"]) == 2
