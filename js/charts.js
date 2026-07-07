/* Oakframe Media OS — SVG chart engine.
   Palette validated with the dataviz six-checks validator against surface #ffffff
   (all PASS; worst adjacent CVD ΔE 46.9). Categorical order is fixed, never cycled. */
(function () {
  const OM = (window.OM = window.OM || {});
  const U = OM.util;

  // Categorical palette validated for a white surface (dataviz six-checks, all
  // PASS; worst adjacent CVD ΔE 46.9). Gold leads to stay on-brand; the rest
  // are distinct hues in a CVD-safe fixed order. Never cycled.
  const SERIES = ["#b8860b", "#2a6fdb", "#1a9e6d", "#7a4bc4", "#d4483f", "#2d9bb5", "#d16a2c", "#c13a86"];
  const INK = { primary: "#1b1a17", secondary: "#56544e", muted: "#8f8c85", grid: "#eceae4", baseline: "#ddd9d0" };
  const STATUS = { good: "#1a7f4b", warning: "#b6791a", serious: "#d16a2c", critical: "#c1362f" };
  const SURFACE = "#ffffff";

  let tipEl = null;
  function tip() {
    if (!tipEl) {
      tipEl = document.createElement("div");
      tipEl.className = "chart-tip";
      document.body.appendChild(tipEl);
    }
    return tipEl;
  }
  function showTip(html, x, y) {
    const t = tip();
    t.innerHTML = html;
    t.style.display = "block";
    const r = t.getBoundingClientRect();
    let left = x + 14, top = y - r.height - 10;
    if (left + r.width > window.innerWidth - 8) left = x - r.width - 14;
    if (top < 8) top = y + 16;
    t.style.left = left + "px";
    t.style.top = top + "px";
  }
  function hideTip() { if (tipEl) tipEl.style.display = "none"; }
  document.addEventListener("scroll", hideTip, true);

  const fmtV = (v, money) => (money ? U.money(v, { compact: true }) : Math.round(v).toLocaleString());

  function niceMax(v) {
    if (v <= 0) return 10;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  }

  function legend(names) {
    if (names.length < 2) return "";
    return '<div class="chart-legend">' + names.map((n, i) =>
      '<span class="legend-item"><span class="legend-swatch" style="background:' + SERIES[i] + '"></span>' + U.esc(n) + "</span>").join("") + "</div>";
  }

  /* ---- Multi-series line chart with crosshair tooltip ----
     data: { labels: [...], series: [{name, values:[...]}], money:true } */
  function line(el, data, opts = {}) {
    const W = el.clientWidth || 560, H = opts.height || 220;
    const padL = 46, padR = 14, padT = 12, padB = 26;
    const iw = W - padL - padR, ih = H - padT - padB;
    const max = niceMax(Math.max(1, ...data.series.flatMap((s) => s.values)));
    const n = data.labels.length;
    const x = (i) => padL + (n > 1 ? (i / (n - 1)) * iw : iw / 2);
    const y = (v) => padT + ih - (v / max) * ih;

    let g = "";
    for (let k = 0; k <= 4; k++) {
      const gy = padT + (ih * k) / 4;
      g += `<line x1="${padL}" y1="${gy}" x2="${W - padR}" y2="${gy}" stroke="${INK.grid}" stroke-width="1"/>`;
      g += `<text x="${padL - 8}" y="${gy + 3.5}" text-anchor="end" class="ax">${fmtV(max - (max * k) / 4, data.money)}</text>`;
    }
    const step = Math.max(1, Math.ceil(n / 12));
    for (let i = 0; i < n; i += step) g += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" class="ax">${U.esc(data.labels[i])}</text>`;
    g += `<line x1="${padL}" y1="${padT + ih}" x2="${W - padR}" y2="${padT + ih}" stroke="${INK.baseline}" stroke-width="1"/>`;

    // direct end labels — collision-adjusted so converging lines never overlap text
    const endLabels = data.series.map((s, si) => ({ si, y: Math.max(padT + 9, y(s.values[n - 1]) - 6) })).sort((a, b) => a.y - b.y);
    for (let k = 1; k < endLabels.length; k++) {
      if (endLabels[k].y - endLabels[k - 1].y < 13) endLabels[k].y = endLabels[k - 1].y + 13;
    }
    data.series.forEach((s, si) => {
      const pts = s.values.map((v, i) => x(i) + "," + y(v)).join(" ");
      if (si === 0 && opts.area !== false) {
        g += `<polygon points="${x(0)},${padT + ih} ${pts} ${x(n - 1)},${padT + ih}" fill="${SERIES[0]}" opacity="0.10"/>`;
      }
      g += `<polyline points="${pts}" fill="none" stroke="${SERIES[si]}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      if (data.series.length > 1) {
        const lb = endLabels.find((e) => e.si === si);
        g += `<text x="${W - padR - 2}" y="${lb.y}" text-anchor="end" class="ax" fill="${INK.secondary}">${U.esc(s.name)}</text>`;
      }
    });
    g += `<line class="xh" x1="0" y1="${padT}" x2="0" y2="${padT + ih}" stroke="${INK.muted}" stroke-width="1" stroke-dasharray="3,3" style="display:none"/>`;
    data.series.forEach((s, si) => { g += `<circle class="xh-dot xh-dot-${si}" r="4" fill="${SERIES[si]}" stroke="${SURFACE}" stroke-width="2" style="display:none"/>`; });

    el.innerHTML = `<svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block">${g}</svg>` + legend(data.series.map((s) => s.name));
    const svg = el.querySelector("svg");
    const xh = svg.querySelector(".xh");
    svg.addEventListener("mousemove", (ev) => {
      const r = svg.getBoundingClientRect();
      const scale = W / r.width;
      const mx = (ev.clientX - r.left) * scale;
      let i = Math.round(((mx - padL) / iw) * (n - 1));
      i = Math.max(0, Math.min(n - 1, i));
      xh.setAttribute("x1", x(i)); xh.setAttribute("x2", x(i)); xh.style.display = "";
      data.series.forEach((s, si) => {
        const d = svg.querySelector(".xh-dot-" + si);
        d.setAttribute("cx", x(i)); d.setAttribute("cy", y(s.values[i])); d.style.display = "";
      });
      showTip('<div class="tip-title">' + U.esc(data.labels[i]) + "</div>" + data.series.map((s, si) =>
        `<div class="tip-row"><span class="legend-swatch" style="background:${SERIES[si]}"></span>${U.esc(s.name)}<b>${fmtV(s.values[i], data.money)}</b></div>`).join(""), ev.clientX, ev.clientY);
    });
    svg.addEventListener("mouseleave", () => {
      hideTip(); xh.style.display = "none";
      svg.querySelectorAll(".xh-dot").forEach((d) => (d.style.display = "none"));
    });
  }

  /* ---- Grouped/single bar chart ---- */
  function bars(el, data, opts = {}) {
    const W = el.clientWidth || 560, H = opts.height || 220;
    const padL = 46, padR = 10, padT = 12, padB = 26;
    const iw = W - padL - padR, ih = H - padT - padB;
    const nSeries = data.series.length;
    const max = niceMax(Math.max(1, ...data.series.flatMap((s) => s.values)));
    const n = data.labels.length;
    const slot = iw / n;
    const bw = Math.min(26, Math.max(4, (slot - 8) / nSeries - 2));
    const y = (v) => padT + ih - (v / max) * ih;

    let g = "";
    for (let k = 0; k <= 4; k++) {
      const gy = padT + (ih * k) / 4;
      g += `<line x1="${padL}" y1="${gy}" x2="${W - padR}" y2="${gy}" stroke="${INK.grid}" stroke-width="1"/>`;
      g += `<text x="${padL - 8}" y="${gy + 3.5}" text-anchor="end" class="ax">${fmtV(max - (max * k) / 4, data.money)}</text>`;
    }
    const step = Math.max(1, Math.ceil(n / 12));
    data.labels.forEach((lb, i) => { if (i % step === 0) g += `<text x="${padL + slot * i + slot / 2}" y="${H - 8}" text-anchor="middle" class="ax">${U.esc(lb)}</text>`; });

    const rects = [];
    data.labels.forEach((lb, i) => {
      data.series.forEach((s, si) => {
        const v = s.values[i];
        const groupW = nSeries * bw + (nSeries - 1) * 2;
        const bx = padL + slot * i + (slot - groupW) / 2 + si * (bw + 2);
        const by = y(v), bh = Math.max(0, padT + ih - by);
        rects.push({ i, si, v });
        g += `<rect data-i="${i}" data-si="${si}" x="${bx}" y="${bh < 3 ? padT + ih - Math.max(bh, v > 0 ? 2 : 0) : by}" width="${bw}" height="${Math.max(bh, v > 0 ? 2 : 0)}" rx="3" fill="${SERIES[si]}" class="bar"/>`;
      });
    });
    g += `<line x1="${padL}" y1="${padT + ih}" x2="${W - padR}" y2="${padT + ih}" stroke="${INK.baseline}" stroke-width="1"/>`;
    el.innerHTML = `<svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block">${g}</svg>` + legend(data.series.map((s) => s.name));
    el.querySelectorAll("rect.bar").forEach((r) => {
      r.addEventListener("mousemove", (ev) => {
        const i = +r.dataset.i, si = +r.dataset.si;
        showTip('<div class="tip-title">' + U.esc(data.labels[i]) + "</div>" +
          `<div class="tip-row"><span class="legend-swatch" style="background:${SERIES[si]}"></span>${U.esc(data.series[si].name)}<b>${fmtV(data.series[si].values[i], data.money)}</b></div>`, ev.clientX, ev.clientY);
      });
      r.addEventListener("mouseleave", hideTip);
    });
  }

  /* ---- Horizontal bars (single series, magnitude) with direct value labels ---- */
  function hbars(el, items, opts = {}) {
    // items: [{label, value, color?, sub?}]
    const max = Math.max(1, ...items.map((i) => i.value));
    el.innerHTML = '<div class="hbars">' + items.map((it, idx) => {
      const w = Math.max(1.5, (it.value / max) * 100);
      const color = it.color || SERIES[0];
      return `<div class="hbar-row" data-idx="${idx}">
        <div class="hbar-label" title="${U.esc(it.label)}">${U.esc(it.label)}</div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${w}%;background:${color}"></div></div>
        <div class="hbar-value">${opts.fmt ? opts.fmt(it.value) : fmtV(it.value, opts.money)}${it.sub ? ' <span class="muted">' + U.esc(it.sub) + "</span>" : ""}</div>
      </div>`;
    }).join("") + "</div>";
  }

  /* ---- Donut with 2px surface gaps + legend ---- */
  function donut(el, items, opts = {}) {
    const size = opts.size || 168, r = size / 2 - 6, cx = size / 2, cy = size / 2, sw = opts.thickness || 22;
    const total = items.reduce((s, i) => s + i.value, 0) || 1;
    let a0 = -Math.PI / 2;
    let g = "";
    items.forEach((it, i) => {
      const frac = it.value / total;
      const a1 = a0 + frac * Math.PI * 2;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      if (frac > 0.001) {
        g += `<path data-i="${i}" class="seg" d="M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}" fill="none" stroke="${it.color || SERIES[i % SERIES.length]}" stroke-width="${sw}"/>`;
      }
      a0 = a1;
    });
    // 2px gaps: draw hairline separators in surface color
    let a = -Math.PI / 2;
    items.forEach((it) => {
      const x0 = cx + (r - sw / 2 - 1) * Math.cos(a), y0 = cy + (r - sw / 2 - 1) * Math.sin(a);
      const x1 = cx + (r + sw / 2 + 1) * Math.cos(a), y1 = cy + (r + sw / 2 + 1) * Math.sin(a);
      g += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${SURFACE}" stroke-width="2.5"/>`;
      a += (it.value / total) * Math.PI * 2;
    });
    const center = opts.center ? `<text x="${cx}" y="${cy - 2}" text-anchor="middle" class="donut-big">${U.esc(opts.center)}</text><text x="${cx}" y="${cy + 15}" text-anchor="middle" class="ax">${U.esc(opts.centerSub || "")}</text>` : "";
    el.innerHTML = `<div class="donut-wrap"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${g}${center}</svg>
      <div class="chart-legend chart-legend-col">${items.map((it, i) =>
        `<span class="legend-item"><span class="legend-swatch" style="background:${it.color || SERIES[i % SERIES.length]}"></span>${U.esc(it.label)}<b class="legend-val">${opts.fmt ? opts.fmt(it.value) : fmtV(it.value, opts.money)}</b></span>`).join("")}</div></div>`;
    el.querySelectorAll(".seg").forEach((p) => {
      p.addEventListener("mousemove", (ev) => {
        const it = items[+p.dataset.i];
        showTip(`<div class="tip-row"><span class="legend-swatch" style="background:${it.color || SERIES[+p.dataset.i % SERIES.length]}"></span>${U.esc(it.label)}<b>${opts.fmt ? opts.fmt(it.value) : fmtV(it.value, opts.money)} · ${Math.round((it.value / total) * 100)}%</b></div>`, ev.clientX, ev.clientY);
      });
      p.addEventListener("mouseleave", hideTip);
    });
  }

  /* ---- Sparkline for stat tiles ---- */
  function spark(values, color = SERIES[0], w = 92, h = 28) {
    const max = Math.max(...values, 1), min = Math.min(...values, 0);
    const n = values.length;
    const x = (i) => (i / (n - 1)) * (w - 4) + 2;
    const y = (v) => h - 3 - ((v - min) / (max - min || 1)) * (h - 6);
    const pts = values.map((v, i) => x(i) + "," + y(v)).join(" ");
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" class="spark"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/><circle cx="${x(n - 1)}" cy="${y(values[n - 1])}" r="2.5" fill="${color}"/></svg>`;
  }

  /* ---- Simple progress meter ---- */
  function meter(pct, opts = {}) {
    const v = Math.max(0, Math.min(100, pct));
    const color = opts.color || (v >= 90 ? STATUS.critical : v >= 75 ? STATUS.warning : SERIES[0]);
    return `<div class="meter"><div class="meter-fill" style="width:${v}%;background:${color}"></div></div>`;
  }

  OM.charts = { line, bars, hbars, donut, spark, meter, SERIES, STATUS, INK };
})();
