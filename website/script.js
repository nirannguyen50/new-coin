/* NewCoin landing page — dependency-free.
   1. CONFIG: fill in real URLs; empty strings stay as placeholder links.
   2. ALLOCATIONS: the single source of truth for the tokenomics chart and table.
   3. Small UI helpers: mobile nav toggle, footer year. */

(function () {
  "use strict";

  // ---------------------------------------------------------------
  // 1. Links. Leave "" until the real URL exists; the link then points
  //    to "#" and is marked with a small * so nobody ships a dead link.
  // ---------------------------------------------------------------
  var CONFIG = {
    docs: "",          // [[ĐIỀN: URL tài liệu / whitepaper]]
    community: "",     // [[ĐIỀN: URL Telegram hoặc Discord chính]]
    x: "",             // [[ĐIỀN: URL X (Twitter)]]
    telegram: "",      // [[ĐIỀN: URL Telegram]]
    discord: "",       // [[ĐIỀN: URL Discord]]
    square: "",        // [[ĐIỀN: URL hồ sơ Binance Square]]
    github: "",        // [[ĐIỀN: URL mã nguồn]]
    terms: "",         // [[ĐIỀN: URL điều khoản sử dụng]]
    privacy: "",       // [[ĐIỀN: URL chính sách quyền riêng tư]]
    transparency: "",  // [[ĐIỀN: URL trang minh bạch]]
    team1: "",         // [[ĐIỀN: hồ sơ chuyên môn thành viên 1]]
    team2: "",
    team3: "",
    team4: ""
  };

  // ---------------------------------------------------------------
  // 2. Token allocations. Percentages must sum to exactly 100.
  //    TOTAL_SUPPLY is fixed; token counts are derived, never typed.
  // ---------------------------------------------------------------
  var TOTAL_SUPPLY = 1000000000;

  var ALLOCATIONS = [
    { name: "Cộng đồng và hệ sinh thái", pct: 32, tge: "1,6% tổng cung", cliff: "—",        vesting: "48 tháng tuyến tính" },
    { name: "Đội ngũ và cố vấn",         pct: 18, tge: "0%",             cliff: "12 tháng", vesting: "36 tháng tuyến tính sau cliff" },
    { name: "Nhà đầu tư (seed/private)", pct: 15, tge: "0%",             cliff: "9 tháng",  vesting: "24 tháng tuyến tính sau cliff" },
    { name: "Treasury / quỹ dự trữ",     pct: 13, tge: "0,26% tổng cung", cliff: "—",       vesting: "36 tháng tuyến tính, multisig 3/5" },
    { name: "Thanh khoản (DEX/CEX/MM)",  pct: 8,  tge: "8% tổng cung",   cliff: "—",        vesting: "LP khóa tối thiểu 12 tháng" },
    { name: "Dự trữ chương trình sàn",   pct: 5,  tge: "0%",             cliff: "3 tháng",  vesting: "24 tháng, giải ngân theo chương trình nếu được mời" },
    { name: "Marketing / KOL",           pct: 5,  tge: "1% tổng cung",   cliff: "—",        vesting: "24 tháng; hợp đồng KOL có vesting" },
    { name: "Public sale",               pct: 4,  tge: "4% tổng cung",   cliff: "—",        vesting: "Mở khóa toàn bộ tại TGE" }
  ];

  var vi = { format: function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); } };
  if (typeof Intl !== "undefined" && Intl.NumberFormat) {
    try { vi = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }); } catch (e) { /* keep fallback */ }
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") { node.textContent = attrs[k]; }
        else if (k === "class") { node.className = attrs[k]; }
        else { node.setAttribute(k, attrs[k]); }
      });
    }
    (children || []).forEach(function (c) { node.appendChild(c); });
    return node;
  }

  function renderTokenomics() {
    var chart = document.getElementById("allocation-chart");
    var tbody = document.querySelector("#allocation-table tbody");
    if (!chart || !tbody) { return; }

    var total = ALLOCATIONS.reduce(function (s, a) { return s + a.pct; }, 0);
    if (total !== 100) {
      chart.appendChild(el("p", { class: "fine-print", text: "Lỗi cấu hình: tổng phân bổ là " + total + "%, phải bằng 100%. Sửa mảng ALLOCATIONS trong script.js." }));
    }

    var maxPct = Math.max.apply(null, ALLOCATIONS.map(function (a) { return a.pct; }));

    ALLOCATIONS.forEach(function (a) {
      var tokens = Math.round(TOTAL_SUPPLY * a.pct / 100);
      var tokensText = vi.format(tokens);
      var tip = a.name + ": " + a.pct + "% · " + tokensText + " NEWC";

      // Chart row: label | bar | value. Hover/focus reveals the tooltip;
      // the value is also visible at the bar end and in the table below.
      var fill = el("div", { class: "bar-fill" });
      fill.style.width = (a.pct / maxPct * 100).toFixed(2) + "%";
      var row = el("div", { class: "bar-row", tabindex: "0", "aria-label": tip }, [
        el("span", { class: "bar-label", text: a.name }),
        el("div", { class: "bar-track" }, [ fill, el("span", { class: "bar-tip", text: tip, "aria-hidden": "true" }) ]),
        el("span", { class: "bar-value", text: a.pct + "%" })
      ]);
      chart.appendChild(row);

      // Table row (the accessible, JS-independent twin once rendered).
      tbody.appendChild(el("tr", null, [
        el("th", { scope: "row", text: a.name }),
        el("td", { class: "num", text: a.pct + "%" }),
        el("td", { class: "num", text: tokensText }),
        el("td", { class: "num", text: a.tge }),
        el("td", { text: a.cliff }),
        el("td", { text: a.vesting })
      ]));
    });

    var totalPct = document.getElementById("allocation-total-pct");
    var totalTokens = document.getElementById("allocation-total-tokens");
    if (totalPct) { totalPct.textContent = total + "%"; }
    if (totalTokens) { totalTokens.textContent = vi.format(Math.round(TOTAL_SUPPLY * total / 100)); }
  }

  function applyLinks() {
    var anchors = document.querySelectorAll("a[data-link]");
    Array.prototype.forEach.call(anchors, function (a) {
      var key = a.getAttribute("data-link");
      var url = CONFIG[key];
      if (url) {
        a.setAttribute("href", url);
        a.setAttribute("rel", "noopener");
        a.setAttribute("target", "_blank");
        a.classList.remove("is-placeholder");
      } else {
        a.setAttribute("href", "#");
        a.classList.add("is-placeholder");
        a.setAttribute("title", "Liên kết chưa được điền (xem CONFIG trong script.js)");
        a.addEventListener("click", function (ev) { ev.preventDefault(); });
      }
    });
  }

  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("site-nav");
    if (!toggle || !nav) { return; }
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (ev) {
      if (ev.target.tagName === "A" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  function initYear() {
    var y = document.getElementById("year");
    if (y) { y.textContent = String(new Date().getFullYear()); }
  }

  function init() {
    renderTokenomics();
    applyLinks();
    initNav();
    initYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
