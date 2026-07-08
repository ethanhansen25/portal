/* Oakframe Media OS — Executive Command Center (exec roles only; routes are gated) */
(function () {
  const OM = window.OM;
  const U = OM.util, ui = OM.ui, ch = OM.charts;
  const S = OM.store, M = OM.metrics;
  const esc = U.esc;

  function gate(el) {
    if (!S.moduleAccess("exec")) {
      el.innerHTML = ui.empty("This area doesn't exist for your role.", "🔒");
      S.audit("view", "exec", "*", "DENIED — attempted to open an executive page", { denied: true, skipPermission: true });
      return false;
    }
    return true;
  }

  /* ================= EXECUTIVE DASHBOARD ================= */
  OM.pages.exec = function (el) {
    if (!gate(el)) return;
    const series = M.monthlySeries(12);
    const mtdRev = M.revenueMTD(), mtdExp = M.expensesMTD();
    const ytdRev = M.revenueYTD(), ytdExp = M.expensesYTD();
    const pay = M.payrollDue();
    const behind = M.projectsBehind(), atRisk = M.projectsAtRisk();
    const pending = M.approvalsPending();
    const deadlines = M.upcomingDeadlines(10).slice(0, 6);
    const online = M.staffOnline();
    const recentAudit = S.db.audit.slice(-7).reverse();
    const callsToday = M.callsToday();
    const meetings = M.meetingsUpcoming().slice(0, 5);
    const eqAlerts = S.db.equipment.filter((e) => e.status === "damaged" || e.status === "maintenance");

    el.innerHTML = ui.pageHead("Executive command", "The whole company on one screen — " + new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })) +
      ui.kpi([
        { label: "Revenue today", value: U.money(M.revenueToday(), { compact: true }), icon: "dollar" },
        { label: "Revenue MTD", value: U.money(mtdRev, { compact: true }), spark: ch.spark(series.map((s) => s.revenue)) },
        { label: "Revenue YTD", value: U.money(ytdRev, { compact: true }), icon: "trending" },
        { label: "Profit YTD", value: U.money(ytdRev - ytdExp, { compact: true }), tone: ytdRev - ytdExp >= 0 ? "good" : "bad", sub: "Expenses " + U.money(ytdExp, { compact: true }), icon: "ledger" },
        { label: "Accounts receivable", value: U.money(M.arTotal(), { compact: true }), sub: M.overdue().length + " overdue invoices", tone: M.overdue().length ? "bad" : null, link: "#/finance/invoices", icon: "dollar" },
        { label: "Payroll due", value: pay ? U.money(pay.total, { compact: true }) : "—", sub: pay ? U.until(pay.runDate) : "", link: "#/finance/payroll", icon: "users" },
        { label: "Pipeline value", value: U.money(M.pipelineValue(), { compact: true }), sub: M.conversionRate() + "% conversion", link: "#/sales/pipeline", icon: "diamond" },
        { label: "Cold calls today", value: callsToday.length, sub: M.meetingsBookedThisMonth() + " meetings booked MTD", link: "#/exec/sales", icon: "phone" },
        { label: "Projects at risk", value: atRisk.length + behind.length, sub: behind.length + " behind schedule", tone: atRisk.length + behind.length ? "warn" : "good", link: "#/projects", icon: "layers" },
        { label: "Approvals waiting", value: pending.length, tone: pending.length ? "warn" : null, link: "#/approvals", icon: "checkCircle" },
        { label: "Client satisfaction", value: M.avgSatisfaction() + "/10", tone: "good", icon: "target" },
        { label: "Staff online", value: online.length + "/" + S.db.users.filter((u) => u.status === "active").length, link: "#/exec/ops", icon: "compass" },
      ]) +
      `<div class="grid-2">
        <div>
          ${ui.sectionCard("Revenue vs expenses — trailing 12 months", '<div id="execRev"></div>')}
          ${ui.sectionCard("Needs attention", [
            ...M.overdue().map((i) => ({ tone: "bad", icon: "$", label: `Invoice ${i.number} overdue — ${U.money(i.total)}`, sub: (S.find("client", i.clientId) || {}).name + " · due " + U.date(i.dueAt), link: "#/finance/invoices" })),
            ...behind.map((p) => ({ tone: "bad", icon: "▣", label: p.name + " — behind schedule", sub: "Due " + U.until(p.dueDate) + " · " + p.progress + "% complete", link: "#/project/" + p.id })),
            ...atRisk.map((p) => ({ tone: "warn", icon: "▣", label: p.name + " — at risk", sub: "Led by " + S.userName(p.leadId), link: "#/project/" + p.id })),
            ...eqAlerts.map((e) => ({ tone: "warn", icon: "⚙", label: e.name + " — " + U.cap(e.status), sub: e.note || e.assetTag, link: "#/equipment" })),
          ].slice(0, 8).map((a) => `<div class="list-row clickable" onclick="location.hash='${a.link}'"><span class="list-icon tone-text-${a.tone}">${a.icon}</span><span class="list-main"><b>${esc(a.label)}</b><span class="muted">${esc(a.sub)}</span></span><span class="badge tone-${a.tone}">${a.tone === "bad" ? "Action" : "Watch"}</span></div>`).join("") || ui.empty("Nothing is on fire. Rare — enjoy it.", "✓"))}
          ${ui.sectionCard("Approvals waiting", pending.slice(0, 5).map((a) => `<div class="list-row clickable" onclick="location.hash='#/approvals'"><span class="list-main"><b>${esc(a.title)}</b><span class="muted">${esc(S.userName(a.requestedBy))} · ${U.ago(a.requestedAt)}</span></span>${a.amount ? `<span class="lead-value">${U.money(a.amount)}</span>` : ""}</div>`).join("") || ui.empty("Queue clear."), { action: '<a class="link" href="#/approvals">Approval Center →</a>' })}
        </div>
        <div>
          ${ui.sectionCard("Upcoming deadlines", deadlines.map((d) => `<div class="list-row clickable" onclick="location.hash='${d.link}'"><span class="list-icon">⏱</span><span class="list-main"><b>${esc(d.label)}</b><span class="muted">${U.cap(d.kind)}</span></span><span class="badge tone-${d.ts < Date.now() ? "bad" : "info"}">${U.until(d.ts)}</span></div>`).join("") || ui.empty("No deadlines in 10 days."))}
          ${ui.sectionCard("Today's meetings", meetings.map((m) => `<div class="list-row"><span class="list-icon">◫</span><span class="list-main"><b>${esc(m.title)}</b><span class="muted">${U.dateShort(m.ts)} ${U.time(m.ts)} · ${esc(m.location || "")}</span></span></div>`).join("") || ui.empty("No meetings scheduled."))}
          ${ui.sectionCard("Live activity", recentAudit.map((a) => `<div class="list-row"><span class="list-icon">${a.denied ? "⛔" : "•"}</span><span class="list-main"><b>${esc(S.userName(a.userId))}</b><span class="muted">${esc(a.summary)}</span></span><span class="muted">${U.ago(a.ts)}</span></div>`).join(""), { action: '<a class="link" href="#/exec/audit">Audit Center →</a>' })}
          ${ui.sectionCard("Staff online now", `<div class="online-grid">${online.map((u) => `<span class="online-chip">${ui.avatar(u)}<span>${esc(u.name.split(" ")[0])}</span></span>`).join("")}</div>`)}
        </div>
      </div>`;
    ch.line(el.querySelector("#execRev"), { labels: series.map((s) => s.label), series: [{ name: "Revenue", values: series.map((s) => s.revenue) }, { name: "Expenses", values: series.map((s) => s.expenses) }], money: true }, { height: 230 });
  };

  /* ================= COMPANY ANALYTICS ================= */
  OM.pages.execAnalytics = function (el, tab) {
    if (!gate(el)) return;
    tab = tab || "growth";
    el.innerHTML = ui.pageHead("Company analytics", "Growth, revenue quality, delivery, and people health") + `<div id="atabs"></div><div id="abody" class="tab-body"></div>`;
    ui.tabs(el.querySelector("#atabs"), [
      { id: "growth", label: "Growth" }, { id: "revenue", label: "Revenue quality" },
      { id: "delivery", label: "Delivery" }, { id: "people", label: "People" },
    ], tab, (t) => (location.hash = "#/exec/analytics/" + t));
    const body = el.querySelector("#abody");
    const series = M.monthlySeries(12);

    if (tab === "growth") {
      const h1 = series.slice(0, 6).reduce((s, x) => s + x.revenue, 0);
      const h2 = series.slice(6).reduce((s, x) => s + x.revenue, 0);
      const growth = h1 ? Math.round(((h2 - h1) / h1) * 100) : 0;
      body.innerHTML = ui.kpi([
        { label: "Half-over-half growth", value: (growth >= 0 ? "+" : "") + growth + "%", tone: growth >= 0 ? "good" : "bad" },
        { label: "Active clients", value: S.db.clients.filter((c) => c.status === "active").length, sub: "1 paused" },
        { label: "Avg deal size (won)", value: U.money(S.db.leads.filter((l) => l.stage === "won").reduce((s, l) => s + l.value, 0) / Math.max(1, S.db.leads.filter((l) => l.stage === "won").length), { compact: true }) },
        { label: "Pipeline coverage", value: (M.pipelineValue() / Math.max(1, M.revenueMTD() * 3)).toFixed(1) + "×", sub: "pipeline vs next-quarter target" },
      ]) + ui.sectionCard("Monthly revenue — trailing 12", '<div id="gRev"></div>') +
      ui.sectionCard("Strategic initiatives", S.db.initiatives.map((i) => `
        <div class="list-row"><span class="list-main"><b>${esc(i.title)}</b><span class="muted">${esc(i.quarter)} · owner ${esc(S.userName(i.ownerId))} · ${i.keyResults.map((k) => (k.done >= k.target ? "✓ " : "") + esc(k.text)).join(" · ")}</span></span>${ch.meter(i.progress)}${ui.badge(i.status)}</div>`).join(""), { action: '<a class="link" href="#/exec/board">Board room →</a>' });
      ch.bars(body.querySelector("#gRev"), { labels: series.map((s) => s.label), series: [{ name: "Revenue", values: series.map((s) => s.revenue) }], money: true }, { height: 220 });
    } else if (tab === "revenue") {
      const byClient = M.revenueByClientYTD();
      const total = byClient.reduce((s, r) => s + r.amt, 0) || 1;
      const top3 = byClient.slice(0, 3).reduce((s, r) => s + r.amt, 0);
      body.innerHTML = ui.kpi([
        { label: "Top-3 client concentration", value: Math.round((top3 / total) * 100) + "%", tone: top3 / total > 0.45 ? "warn" : "good", sub: "risk threshold 45%" },
        { label: "AR total", value: U.money(M.arTotal(), { compact: true }) },
        { label: "Overdue AR", value: U.money(M.overdue().reduce((s, i) => s + i.total, 0), { compact: true }), tone: M.overdue().length ? "bad" : "good" },
        { label: "Avg satisfaction", value: M.avgSatisfaction() + "/10" },
      ]) + `<div class="grid-2">
        <div>${ui.sectionCard("Revenue by client — YTD", '<div id="rCli"></div>')}</div>
        <div>${ui.sectionCard("Revenue by service — YTD", '<div id="rSvc"></div>')}</div></div>`;
      ch.hbars(body.querySelector("#rCli"), byClient.slice(0, 8).map((r) => ({ label: r.client.name, value: r.amt })), { money: true, fmt: (v) => U.money(v, { compact: true }) });
      const svcMap = {};
      S.db.projects.forEach((p) => { svcMap[p.service] = (svcMap[p.service] || 0) + p.spent; });
      ch.donut(body.querySelector("#rSvc"), Object.entries(svcMap).map(([k, v]) => ({ label: k, value: v })).sort((a, b) => b.value - a.value).slice(0, 6), { money: true, fmt: (v) => U.money(v, { compact: true }) });
    } else if (tab === "delivery") {
      const active = S.db.projects.filter((p) => p.status === "active");
      body.innerHTML = ui.kpi([
        { label: "Active projects", value: active.length },
        { label: "On track", value: active.filter((p) => p.health === "on_track").length, tone: "good" },
        { label: "At risk / behind", value: active.filter((p) => p.health !== "on_track").length, tone: "warn" },
        { label: "Avg budget burn", value: Math.round(active.reduce((s, p) => s + (p.spent / p.budget) * 100, 0) / Math.max(1, active.length)) + "%" },
      ]) + ui.sectionCard("Project health board", active.map((p) => `
        <div class="list-row clickable" onclick="location.hash='#/project/${p.id}'">
          <span class="list-main"><b>${esc(p.name)}</b><span class="muted">${esc(p.code)} · ${esc(S.userName(p.leadId))} · due ${U.dateShort(p.dueDate)}</span></span>
          <span class="proj-burn muted">${Math.round((p.spent / p.budget) * 100)}% budget</span>${ch.meter(p.progress)}${ui.badge(p.health)}
        </div>`).join(""));
    } else if (tab === "people") {
      const depts = {};
      S.db.users.filter((u) => u.status === "active").forEach((u) => (depts[u.dept] = (depts[u.dept] || 0) + 1));
      body.innerHTML = ui.kpi([
        { label: "Headcount", value: S.db.users.filter((u) => u.status === "active").length },
        { label: "Open roles", value: [...new Set(S.db.candidates.filter((c) => !["hired", "rejected"].includes(c.stage)).map((c) => c.roleApplied))].length, link: "#/exec/hiring" },
        { label: "Avg review score", value: (S.db.reviews.reduce((s, r) => s + r.score, 0) / Math.max(1, S.db.reviews.length)).toFixed(1) + "/5" },
        { label: "Pending time off", value: S.db.timeOff.filter((t) => t.status === "pending").length },
      ]) + `<div class="grid-2">
        <div>${ui.sectionCard("Headcount by department", '<div id="pDept"></div>')}</div>
        <div>${ui.sectionCard("Performance flags", S.db.reviews.filter((r) => r.score < 3.5).map((r) => `<div class="list-row"><span class="list-main"><b>${esc(S.userName(r.userId))}</b><span class="muted">${esc(r.summary)}</span></span><span class="review-score tone-text-warn">${r.score}</span></div>`).join("") + S.db.hrActions.filter((a) => a.status === "active").map((a) => `<div class="list-row"><span class="list-main"><b>${esc(S.userName(a.userId))} — ${U.cap(a.type)}</b><span class="muted">${esc(a.summary)}</span></span>${ui.badge("active")}</div>`).join("") || ui.empty("No flags."))}</div></div>`;
      ch.hbars(body.querySelector("#pDept"), Object.entries(depts).map(([k, v]) => ({ label: k, value: v })), {});
    }
  };

  /* ================= SALES DASHBOARD (exec view) ================= */
  OM.pages.execSales = function (el) {
    if (!gate(el)) return;
    const open = M.pipeline();
    const board = M.callLeaderboard(30);
    const won = S.db.leads.filter((l) => l.stage === "won");
    const lost = S.db.leads.filter((l) => l.stage === "lost");
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const a = U.startOfDay(Date.now() - i * U.DAY);
      days.push({ label: new Date(a).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2), value: M.callsBetween(a, a + U.DAY).length });
    }
    el.innerHTML = ui.pageHead("Sales dashboard", "Executive view — every rep, every stage, every dial") +
      ui.kpi([
        { label: "Pipeline value", value: U.money(M.pipelineValue(), { compact: true }), sub: open.length + " open" },
        { label: "Won (all-time)", value: U.money(won.reduce((s, l) => s + l.value, 0), { compact: true }), tone: "good", sub: won.length + " deals" },
        { label: "Win rate", value: M.conversionRate() + "%", sub: lost.length + " lost" },
        { label: "Calls today", value: M.callsToday().length, sub: "team-wide" },
        { label: "Meetings MTD", value: M.meetingsBookedThisMonth(), tone: "good" },
      ]) +
      `<div class="grid-2">
        <div>${ui.sectionCard("Team call volume — 14 days", '<div id="xCalls"></div>')}
        ${ui.sectionCard("Pipeline by stage ($)", '<div id="xStage"></div>')}</div>
        <div>${ui.sectionCard("Rep performance — 30 days", board.map((b) => `
          <div class="list-row">${ui.avatar(b.user)}<span class="list-main"><b>${esc(b.user.name)}</b><span class="muted">${b.calls} dials · ${Math.round((b.connected / Math.max(1, b.calls)) * 100)}% connect · ${b.meetings} meetings</span></span>
          <span class="lead-value">${U.money(S.db.leads.filter((l) => l.assignedTo === b.user.id && !["won", "lost", "archived"].includes(l.stage)).reduce((s, l) => s + l.value, 0), { compact: true })}</span></div>`).join(""))}
        ${ui.sectionCard("Monitor a rep's calls", `<div class="rep-monitor">${S.db.users.filter((u) => u.dept === "Sales").map((u) => `<button class="btn btn-ghost btn-sm" data-rep="${u.id}">${esc(u.name)}</button>`).join("")}</div><div id="repCalls" class="rep-calls"></div>`)}</div>
      </div>`;
    ch.bars(el.querySelector("#xCalls"), { labels: days.map((d) => d.label), series: [{ name: "Calls", values: days.map((d) => d.value) }] }, { height: 190 });
    const stages = [["new", "New"], ["contacted", "Contacted"], ["interested", "Interested"], ["meeting", "Meeting"], ["proposal", "Proposal"], ["negotiating", "Negotiating"]];
    ch.hbars(el.querySelector("#xStage"), stages.map(([id, label]) => ({ label, value: S.db.leads.filter((l) => l.stage === id).reduce((s, l) => s + l.value, 0) })), { money: true, fmt: (v) => U.money(v, { compact: true }) });
    el.querySelectorAll("[data-rep]").forEach((b) => b.addEventListener("click", () => {
      const calls = S.db.comms.filter((c) => c.kind === "call" && c.userId === b.dataset.rep).sort((x, y) => y.ts - x.ts).slice(0, 10);
      el.querySelector("#repCalls").innerHTML = calls.map(OM.commRow).join("") || ui.empty("No calls logged.");
      S.audit("view", "comm", b.dataset.rep, "Monitored call log — " + S.userName(b.dataset.rep));
    }));
  };

  /* ================= OPERATIONS CENTER (live) ================= */
  let opsTimer = null;
  OM.pages.execOps = function (el) {
    if (!gate(el)) return;
    if (opsTimer) { clearInterval(opsTimer); opsTimer = null; }
    function draw() {
      if (location.hash !== "#/exec/ops" || !document.body.contains(el)) { clearInterval(opsTimer); opsTimer = null; return; }
      const feed = S.db.audit.slice(-14).reverse();
      const online = M.staffOnline();
      const activeTasks = S.db.tasks.filter((t) => t.status === "in_progress");
      el.innerHTML = ui.pageHead("Operations center", `<span class="live-dot"></span> Live company-wide activity — refreshes automatically`) +
        ui.kpi([
          { label: "Staff online", value: online.length },
          { label: "Tasks in motion", value: activeTasks.length },
          { label: "Calls today", value: M.callsToday().length },
          { label: "Events today", value: S.db.audit.filter((a) => a.ts > U.startOfDay(Date.now())).length },
        ]) +
        `<div class="grid-2">
          <div>${ui.sectionCard("Activity stream", feed.map((a) => `
            <div class="list-row"><span class="list-icon">${a.denied ? "⛔" : { create: "＋", edit: "✎", delete: "✕", approve: "✓", export: "⤓", view: "◉", assign: "→", manage: "⚙" }[a.action] || "•"}</span>
            <span class="list-main"><b>${esc(S.userName(a.userId))} <span class="muted">(${esc(a.dept)})</span></b><span class="muted">${esc(a.summary)}</span></span>
            <span class="muted mono">${U.time(a.ts)}</span></div>`).join(""))}</div>
          <div>
            ${ui.sectionCard("Who's doing what", online.map((u) => {
              const t = activeTasks.find((x) => x.assigneeId === u.id);
              return `<div class="list-row">${ui.avatar(u)}<span class="list-main"><b>${esc(u.name)}</b><span class="muted">${t ? "Working: " + esc(t.title) : esc(u.title)}</span></span><span class="badge tone-good">online</span></div>`;
            }).join(""))}
            ${ui.sectionCard("Field equipment", S.db.equipment.filter((e) => e.status === "checked_out").map((e) => `<div class="list-row"><span class="list-icon">⚙</span><span class="list-main"><b>${esc(e.name)}</b><span class="muted">${esc(S.userName(e.assignedTo))} · ${esc(e.location)}</span></span></div>`).join("") || ui.empty("Everything is in the cage."))}
          </div>
        </div>`;
    }
    draw();
    opsTimer = setInterval(draw, 12000);
  };

  /* ================= HIRING CENTER ================= */
  OM.pages.execHiring = function (el) {
    if (!gate(el)) return;
    const openCands = S.db.candidates.filter((c) => !["hired", "rejected"].includes(c.stage));
    const roles = {};
    openCands.forEach((c) => { (roles[c.roleApplied] = roles[c.roleApplied] || []).push(c); });
    el.innerHTML = ui.pageHead("Hiring center", "Executive view of every open role and offer in flight", `<a class="btn btn-ghost" href="#/hr/hiring">Open HR pipeline →</a>`) +
      ui.kpi([
        { label: "Open roles", value: Object.keys(roles).length },
        { label: "Active candidates", value: openCands.length },
        { label: "Offers pending approval", value: S.db.approvals.filter((a) => a.type === "hire" && a.status === "pending").length, tone: "warn", link: "#/approvals" },
        { label: "Hires YTD", value: S.db.candidates.filter((c) => c.stage === "hired").length },
      ]) +
      Object.entries(roles).map(([role, cands]) => ui.sectionCard(role + " — " + cands[0].dept, cands.map((c) => `
        <div class="list-row"><span class="list-main"><b>${esc(c.name)}</b><span class="muted">${esc(c.source)} · applied ${U.ago(c.appliedAt)} · ${"★".repeat(c.rating || 0) || "unrated"}</span><span class="muted">${esc(c.notes || "")}</span></span>${ui.badge(c.stage)}</div>`).join(""))).join("") +
      ui.sectionCard("Compensation asks in flight", S.db.approvals.filter((a) => ["hire", "promotion"].includes(a.type)).map((a) => `
        <div class="list-row"><span class="list-main"><b>${esc(a.title)}</b><span class="muted">${esc(a.description || "")}</span></span><span class="lead-value">${a.amount ? U.money(a.amount) : "—"}</span>${ui.badge(a.status)}</div>`).join(""));
  };

  /* ================= BOARD ROOM (notes + strategy) ================= */
  OM.pages.execBoard = function (el, tab) {
    if (!gate(el)) return;
    tab = tab || "notes";
    el.innerHTML = ui.pageHead("Board room", "Board notes and strategic planning — visible to executives only") + `<div id="btabs"></div><div id="bbody" class="tab-body"></div>`;
    ui.tabs(el.querySelector("#btabs"), [{ id: "notes", label: "Board notes" }, { id: "strategy", label: "Strategic planning" }], tab, (t) => (location.hash = "#/exec/board/" + t));
    const body = el.querySelector("#bbody");
    if (tab === "notes") {
      body.innerHTML = `<div class="row-gap"><button class="btn btn-gold" id="newNote">+ New board note</button></div>` +
        S.db.boardNotes.slice().sort((a, b) => b.ts - a.ts).map((n) => ui.sectionCard(n.title, `<p class="body-text">${esc(n.body)}</p><p class="muted">${esc(S.userName(n.authorId))} · ${U.date(n.ts)} ${(n.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join(" ")}</p>`)).join("");
      body.querySelector("#newNote").addEventListener("click", () => ui.formModal("New board note", [
        { name: "title", label: "Title", required: true, span2: true },
        { name: "body", label: "Note", type: "textarea", required: true, span2: true, rows: 6 },
        { name: "tags", label: "Tags (comma-separated)" },
      ], (v, close) => {
        S.create("boardNote", { title: v.title, body: v.body, authorId: S.meId, ts: Date.now(), tags: (v.tags || "").split(",").map((s) => s.trim()).filter(Boolean) }, "Added board note — " + v.title);
        close(); OM.router.refresh();
      }, { wide: true }));
    } else {
      body.innerHTML = S.db.initiatives.map((i) => ui.sectionCard(i.quarter + " — " + i.title, `
        <div class="detail-grid"><div><span class="detail-label">Owner</span>${ui.userCell(i.ownerId)}</div>
        <div><span class="detail-label">Status</span>${ui.badge(i.status)}</div>
        <div><span class="detail-label">Progress</span>${ch.meter(i.progress)}<b>${i.progress}%</b></div></div>
        <h4 class="modal-sub">Key results</h4>
        ${i.keyResults.map((k) => `<div class="list-row"><span class="list-icon">${k.done >= k.target ? "✓" : "○"}</span><span class="list-main">${esc(k.text)}</span><span class="muted">${k.done}/${k.target}</span></div>`).join("")}`)).join("");
    }
  };

  /* ================= RISK & LEGAL ================= */
  OM.pages.execRisk = function (el) {
    if (!gate(el)) return;
    const sevTone = { high: "bad", medium: "warn", low: "neutral" };
    const legalDocs = S.db.documents.filter((d) => ["Contracts", "NDAs", "Insurance", "Tax Documents", "Releases"].includes(d.category));
    el.innerHTML = ui.pageHead("Risk & legal", "Risk register, mitigation status, and the legal paper trail") +
      ui.kpi([
        { label: "Open risks", value: S.db.risks.filter((r) => r.status === "open").length, tone: "warn" },
        { label: "High severity", value: S.db.risks.filter((r) => r.severity === "high").length, tone: "bad" },
        { label: "Mitigating", value: S.db.risks.filter((r) => r.status === "mitigating").length },
        { label: "Legal documents", value: legalDocs.length },
      ]) +
      ui.sectionCard("Risk register", S.db.risks.map((r) => `
        <div class="list-row"><span class="list-main"><b>${esc(r.title)}</b><span class="muted">${esc(r.area)} · owner ${esc(S.userName(r.ownerId))}</span><span class="muted">Mitigation: ${esc(r.mitigation)}</span></span>
        <span class="badge tone-${sevTone[r.severity]}">${U.cap(r.severity)} sev</span><span class="badge tone-${sevTone[r.likelihood]}">${U.cap(r.likelihood)} lik</span>${ui.badge(r.status)}</div>`).join("")) +
      ui.sectionCard("Legal & compliance files", legalDocs.slice(0, 12).map((d) => `
        <div class="list-row"><span class="file-icon">${d.type.toUpperCase()}</span><span class="list-main"><b>${esc(d.name)}</b><span class="muted">${esc(d.category)} · ${U.date(d.uploadedAt)}</span></span>${d.confidential ? '<span class="badge tone-bad">Confidential</span>' : ""}</div>`).join(""));
  };

  /* ================= ONBOARDING LIBRARY (exec-managed) ================= */
  // A master library of contracts/documents/templates for staff AND client
  // onboarding, distinct from the per-assignment files uploaded during an
  // actual onboarding (onboarding_files, 0013). Upload/delete is exec-only;
  // the "audience" tag is what surfaces a file on the staff self-service
  // onboarding card (pages_core.js) and the client onboarding widget
  // (pages_client.js) — RLS (0014) scopes reads to match.
  const ONB_CAT_LABEL = { contract: "Contract", document: "Document", template: "Template" };
  const ONB_AUD_LABEL = { staff: "Staff only", client: "Client only", both: "Staff & client" };
  OM.pages.execOnboarding = function (el) {
    if (!gate(el)) return;
    function draw() {
      const resources = S.db.onboardingResources.slice().sort((a, b) => b.uploadedAt - a.uploadedAt);
      el.innerHTML = ui.pageHead("Onboarding library", "Contracts, documents, and templates for staff and client onboarding — upload once, it shows up on their onboarding checklist automatically",
          `<button class="btn btn-gold" id="newOnbResource">+ Upload file</button>`) +
        ui.kpi([
          { label: "Total files", value: resources.length },
          { label: "Contracts", value: resources.filter((r) => r.category === "contract").length },
          { label: "Templates", value: resources.filter((r) => r.category === "template").length },
          { label: "For staff", value: resources.filter((r) => r.audience !== "client").length },
          { label: "For clients", value: resources.filter((r) => r.audience !== "staff").length },
        ]) +
        ui.sectionCard("Files", resources.map((r) => `
          <div class="list-row">
            <span class="list-icon">${OM.icon("file")}</span>
            <span class="list-main"><b>${esc(r.name)}</b><span class="muted">${esc(ONB_CAT_LABEL[r.category] || r.category)} · ${esc(ONB_AUD_LABEL[r.audience] || r.audience)} · ${U.date(r.uploadedAt)} · ${esc(S.userName(r.uploadedBy))}</span></span>
            <button class="btn btn-ghost btn-sm" data-dl-onb-res="${r.id}">Download</button>
            <button class="btn btn-danger-ghost btn-sm" data-del-onb-res="${r.id}">Delete</button>
          </div>`).join("") || ui.empty("Nothing uploaded yet — add a contract, document, or template for staff or client onboarding."));

      const newBtn = el.querySelector("#newOnbResource");
      if (newBtn) newBtn.addEventListener("click", () => ui.formModal("Upload onboarding file", [
        { name: "file", label: "File", type: "file", required: true, span2: true },
        { name: "name", label: "File name", required: true, span2: true },
        { name: "category", label: "Type", type: "select", options: [["contract", "Contract"], ["document", "Document"], ["template", "Template"]] },
        { name: "audience", label: "Who is this for", type: "select", options: [["both", "Staff & client"], ["staff", "Staff only"], ["client", "Client only"]] },
      ], async (v, close) => {
        const file = v.file;
        if (!file || !file.size) throw new Error("Choose a file to upload.");
        const id = S.uid();
        const { path, size } = await OM.db.uploadAttachment("onboarding_resources", id, file);
        S.create("onboardingResource", { id, name: v.name, category: v.category || "document", audience: v.audience || "both", storagePath: path, sizeBytes: size, uploadedBy: S.meId, uploadedAt: Date.now() }, "Uploaded onboarding library file — " + v.name);
        close(); ui.toast("File uploaded.", "good"); draw();
      }));
      el.querySelectorAll("[data-dl-onb-res]").forEach((b) => b.addEventListener("click", () => {
        const r = S.find("onboardingResource", b.dataset.dlOnbRes);
        OM.actions.downloadAttachment(r.storagePath, r.name);
      }));
      el.querySelectorAll("[data-del-onb-res]").forEach((b) => b.addEventListener("click", () => {
        const r = S.find("onboardingResource", b.dataset.delOnbRes);
        ui.confirmModal("Delete file", `Delete "<b>${esc(r.name)}</b>"? This is recorded in the audit log.`, (reason) => {
          S.remove("onboardingResource", r.id, reason);
          ui.toast("File deleted.", "good");
          draw();
        }, { danger: true, reason: true, okLabel: "Delete" });
      }));
    }
    draw();
  };
})();
