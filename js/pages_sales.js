/* Oakframe Media OS — Sales CRM: dashboard, pipeline, leads, cold-call desk, commissions */
(function () {
  const OM = window.OM;
  const U = OM.util, ui = OM.ui, ch = OM.charts;
  const S = OM.store, M = OM.metrics;
  const esc = U.esc;

  const STAGES = [
    ["new", "New"], ["contacted", "Contacted"], ["interested", "Interested"], ["meeting", "Meeting Scheduled"],
    ["proposal", "Proposal Sent"], ["negotiating", "Negotiating"], ["won", "Won"], ["lost", "Lost"], ["archived", "Archived"],
  ];
  const OPEN_STAGES = ["new", "contacted", "interested", "meeting", "proposal", "negotiating"];
  const OUTCOMES = [
    ["connected", "Connected — good conversation"], ["meeting_set", "Meeting booked"], ["callback", "Callback requested"],
    ["voicemail", "Left voicemail"], ["gatekeeper", "Gatekeeper"], ["no_answer", "No answer"], ["not_interested", "Not interested"],
  ];

  function myLeads(all) {
    const me = S.me();
    const rows = S.db.leads.filter((l) => S.can("view", "lead", l));
    return all ? rows : rows.filter((l) => !["won", "lost", "archived"].includes(l.stage));
  }

  /* ================= SALES DASHBOARD (personal / team) ================= */
  OM.pages.sales = function (el) {
    const me = S.me();
    const isMgr = S.isExec(me) || me.role === "dept_head";
    const open = myLeads(false);
    const won30 = S.db.leads.filter((l) => l.stage === "won" && (isMgr || l.assignedTo === me.id));
    const callsToday = M.callsToday().filter((c) => isMgr || c.userId === me.id);
    const callsWeek = M.callsBetween(Date.now() - 7 * U.DAY, Date.now() + 1).filter((c) => isMgr || c.userId === me.id);
    const meetingsSet = callsWeek.filter((c) => c.outcome === "meeting_set").length;
    const followUps = S.db.comms.filter((c) => c.followUpAt && c.followUpAt <= Date.now() + U.DAY && (isMgr || c.userId === me.id));
    const board = M.callLeaderboard(30);

    // weekly call series for the trend
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const a = U.startOfDay(Date.now() - i * U.DAY);
      days.push({ label: new Date(a).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2), value: M.callsBetween(a, a + U.DAY).filter((c) => isMgr || c.userId === me.id).length });
    }

    el.innerHTML = ui.pageHead(isMgr ? "Sales command" : "My sales desk", isMgr ? "Team-wide view of pipeline, calls, and conversion" : "Your book, your calls, your numbers",
      `<a class="btn btn-gold" href="#/sales/calls">Open call queue</a>`) +
      ui.kpi([
        { label: "Pipeline value", value: U.money(open.reduce((s, l) => s + l.value, 0), { compact: true }), sub: open.length + " open leads", link: "#/sales/pipeline" },
        { label: "Calls today", value: callsToday.length, sub: callsWeek.length + " this week" },
        { label: "Meetings booked (7d)", value: meetingsSet, sub: M.meetingsBookedThisMonth() + " this month", tone: "good" },
        { label: "Conversion rate", value: M.conversionRate() + "%", sub: won30.length + " deals won all-time" },
        { label: "Follow-ups due", value: followUps.length, tone: followUps.length ? "warn" : null, link: "#/sales/calls" },
      ]) +
      `<div class="grid-2">
        <div>
          ${ui.sectionCard("Call volume — last 14 days", '<div id="callChart"></div>')}
          ${ui.sectionCard("Pipeline by stage", '<div id="stageChart"></div>')}
        </div>
        <div>
          ${isMgr ? ui.sectionCard("Caller leaderboard — 30 days", board.map((b, i) => `
            <div class="list-row">${ui.avatar(b.user)}<span class="list-main"><b>${esc(b.user.name)}</b><span class="muted">${b.calls} calls · ${b.connected} connects · ${Math.round((b.connected / Math.max(1, b.calls)) * 100)}% connect rate</span></span><span class="lead-value">${b.meetings} <span class="muted">mtgs</span></span></div>`).join("") || ui.empty("No calls logged in 30 days.")) : ""}
          ${ui.sectionCard("Due follow-ups", followUps.slice(0, 8).map((c) => {
            const lead = c.leadId && S.find("lead", c.leadId);
            const client = c.clientId && S.find("client", c.clientId);
            return `<div class="list-row clickable" onclick="location.hash='${lead ? "#/lead/" + lead.id : client ? "#/client/" + client.id : "#/sales/calls"}'"><span class="list-icon">⏱</span><span class="list-main"><b>${esc(lead ? lead.company : client ? client.name : "—")}</b><span class="muted">${esc(c.nextAction || c.notes || "").slice(0, 80)}</span></span><span class="badge tone-warn">${U.until(c.followUpAt)}</span></div>`;
          }).join("") || ui.empty("No follow-ups due. Get ahead of tomorrow."))}
          ${ui.sectionCard("Recent wins", S.db.leads.filter((l) => l.stage === "won").map((l) => `<div class="list-row"><span class="list-icon">▲</span><span class="list-main"><b>${esc(l.company)}</b><span class="muted">${esc(S.userName(l.assignedTo))}</span></span><span class="lead-value tone-text-good">${U.money(l.value, { compact: true })}</span></div>`).join("") || ui.empty("No wins yet — pipeline is warming up."))}
        </div>
      </div>`;

    ch.bars(el.querySelector("#callChart"), { labels: days.map((d) => d.label), series: [{ name: "Calls", values: days.map((d) => d.value) }] }, { height: 180 });
    const stageCounts = OPEN_STAGES.map((s2) => ({ label: STAGES.find((x) => x[0] === s2)[1], value: myLeads(true).filter((l) => l.stage === s2).reduce((sum, l) => sum + l.value, 0) }));
    ch.hbars(el.querySelector("#stageChart"), stageCounts, { money: true, fmt: (v) => U.money(v, { compact: true }) });
  };

  /* ================= PIPELINE (kanban) ================= */
  OM.pages.pipeline = function (el) {
    el.innerHTML = ui.pageHead("Pipeline", "Drag leads between stages — every move is audited",
      S.can("create", "lead") ? `<button class="btn btn-gold" id="newLead">+ New lead</button>` : "") + `<div id="pipe"></div>`;
    ui.kanban(el.querySelector("#pipe"), {
      columns: STAGES.filter((s2) => s2[0] !== "archived").map(([id, label]) => ({
        id, label,
        sum: (items) => U.money(items.reduce((s3, l) => s3 + l.value, 0), { compact: true }),
      })),
      items: myLeads(true).filter((l) => l.stage !== "archived"),
      colOf: (l) => l.stage,
      canMove: (l) => S.can("edit", "lead", l),
      card: (l) => `<div class="kc-title">${esc(l.company)}</div>
        <div class="kc-sub">${esc(l.contactName)} · ${esc(l.industry)}</div>
        <div class="kc-meta"><span class="lead-value">${U.money(l.value, { compact: true })}</span><span class="muted">${U.ago(l.lastActivity)}</span>${ui.avatar(l.assignedTo)}</div>`,
      onMove: (l, col) => {
        S.moveLead(l.id, col);
        if (col === "won") ui.toast("Deal won — " + l.company + " 🏆 Executives notified.", "good");
        OM.router.refresh();
      },
      onCard: (l) => (location.hash = "#/lead/" + l.id),
    });
    const nb = el.querySelector("#newLead");
    if (nb) nb.addEventListener("click", newLeadModal);
  };

  function newLeadModal() {
    ui.formModal("New lead", [
      { name: "company", label: "Company", required: true, span2: true },
      { name: "industry", label: "Industry" },
      { name: "source", label: "Source", type: "select", options: ["Cold List", "Cold Call", "Referral", "Website", "Event"] },
      { name: "contactName", label: "Contact name", required: true },
      { name: "contactTitle", label: "Contact title" },
      { name: "phone", label: "Phone", required: true },
      { name: "email", label: "Email", type: "email" },
      { name: "value", label: "Est. value ($)", type: "number", required: true },
      { name: "assignedTo", label: "Assign to", type: "user", filter: (u) => u.dept === "Sales" || S.isExec(u), value: S.meId },
    ], (v, close) => {
      const lead = S.create("lead", { company: v.company, industry: v.industry, source: v.source, contactName: v.contactName, contactTitle: v.contactTitle, phone: v.phone, email: v.email, value: +v.value, assignedTo: v.assignedTo || S.meId, stage: "new", touches: 0, lastActivity: Date.now(), priority: +v.value > 35000 ? "high" : +v.value > 15000 ? "medium" : "low", notes: "" }, "Created lead — " + v.company);
      if (v.assignedTo && v.assignedTo !== S.meId) S.notify(v.assignedTo, "sales", "Lead assigned: " + v.company, "By " + S.userName(S.meId), "#/lead/" + lead.id);
      close(); ui.toast("Lead created.", "good"); OM.router.refresh();
    }, { wide: true });
  }

  /* ================= LEADS TABLE ================= */
  OM.pages.leads = function (el) {
    el.innerHTML = ui.pageHead("Leads", "Full lead register with stage, owner, and activity",
      S.can("create", "lead") ? `<button class="btn btn-gold" id="newLead">+ New lead</button>` : "");
    const host = document.createElement("div");
    host.className = "card card-flush";
    el.appendChild(host);
    ui.table(host, {
      rows: () => myLeads(true),
      searchKeys: ["company", "contactName", "industry", "source"],
      exportName: "leads", exportEntity: "lead",
      defaultSort: { key: "lastActivity", dir: -1 },
      columns: [
        { key: "company", label: "Company", render: (l) => `<b>${esc(l.company)}</b><div class="muted">${esc(l.industry)} · ${esc(l.source)}</div>` },
        { key: "contactName", label: "Contact", render: (l) => `${esc(l.contactName)}<div class="muted">${esc(l.contactTitle || "")}</div>` },
        { key: "value", label: "Value", render: (l) => `<span class="lead-value">${U.money(l.value, { compact: true })}</span>`, sortVal: (l) => l.value },
        { key: "assignedTo", label: "Owner", render: (l) => ui.userCell(l.assignedTo), sortVal: (l) => S.userName(l.assignedTo) },
        { key: "touches", label: "Touches", sortVal: (l) => l.touches },
        { key: "lastActivity", label: "Last activity", render: (l) => U.ago(l.lastActivity), sortVal: (l) => l.lastActivity },
        { key: "stage", label: "Stage", render: (l) => ui.badge(l.stage, STAGES.find((s2) => s2[0] === l.stage)[1]), sortVal: (l) => OPEN_STAGES.indexOf(l.stage) },
      ],
      onRow: (l) => (location.hash = "#/lead/" + l.id),
    });
    const nb = el.querySelector("#newLead");
    if (nb) nb.addEventListener("click", newLeadModal);
  };

  /* ================= LEAD DETAIL ================= */
  OM.pages.lead = function (el, id) {
    const l = S.find("lead", id);
    if (!l || !S.can("view", "lead", l)) { el.innerHTML = ui.empty("Lead not found or not accessible.", "⚠"); return; }
    const lComms = S.db.comms.filter((c) => c.leadId === l.id).sort((a, b) => b.ts - a.ts);
    const canEdit = S.can("edit", "lead", l);
    const stageIdx = OPEN_STAGES.indexOf(l.stage);

    el.innerHTML = ui.pageHead(esc(l.company),
      `${esc(l.contactName)} — ${esc(l.contactTitle || "")} · ${esc(l.phone)} · ${esc(l.email)} · source: ${esc(l.source)}`,
      `${ui.badge(l.stage, STAGES.find((s2) => s2[0] === l.stage)[1])}
       ${canEdit ? `<button class="btn btn-gold" id="callNow">☎ Log a call</button>` : ""}`) +
      `<div class="stage-track">${OPEN_STAGES.map((s2, i) => `<div class="stage-step ${i <= stageIdx ? "hit" : ""} ${l.stage === "won" ? "won-all" : ""} ${l.stage === "lost" ? "lost-all" : ""}">${STAGES.find((x) => x[0] === s2)[1]}</div>`).join("")}</div>
      <div class="grid-2">
        <div>
          ${ui.sectionCard("Deal", `<div class="detail-grid">
            <div><span class="detail-label">Est. value</span><b class="lead-value">${U.money(l.value)}</b></div>
            <div><span class="detail-label">Owner</span>${ui.userCell(l.assignedTo)}</div>
            <div><span class="detail-label">Touches</span><b>${l.touches}</b></div>
            <div><span class="detail-label">Created</span><b>${U.date(l.createdAt)}</b></div>
          </div>
          ${canEdit ? `<div class="row-gap status-row">${STAGES.map(([s2, lab]) => `<button class="btn btn-sm ${l.stage === s2 ? "btn-gold" : "btn-ghost"}" data-stage="${s2}">${lab}</button>`).join("")}</div>` : ""}
          ${l.stage === "won" && S.can("create", "project") ? `<div class="row-gap"><button class="btn btn-gold" id="convertBtn">Convert to client + project →</button></div>` : ""}`)}
          ${ui.sectionCard("Notes", `<textarea id="leadNotes" rows="4" ${canEdit ? "" : "disabled"} placeholder="Discovery notes, context, next steps…">${esc(l.notes || "")}</textarea>
            ${canEdit ? `<div class="row-gap"><button class="btn btn-ghost" id="saveLeadNotes">Save notes</button></div>` : ""}`)}
        </div>
        <div>${ui.sectionCard("Communication timeline (" + lComms.length + ")", lComms.map(OM.commRow).join("") || ui.empty("No touches yet. Make the first call."))}</div>
      </div>`;

    el.querySelectorAll("[data-stage]").forEach((b) => b.addEventListener("click", () => {
      try { S.moveLead(l.id, b.dataset.stage); OM.router.refresh(); } catch (e) { ui.toast(e.message, "bad"); }
    }));
    const sv = el.querySelector("#saveLeadNotes");
    if (sv) sv.addEventListener("click", () => { S.update("lead", l.id, { notes: el.querySelector("#leadNotes").value }, "Updated notes — " + l.company); ui.toast("Saved.", "good"); });
    const callBtn = el.querySelector("#callNow");
    if (callBtn) callBtn.addEventListener("click", () => logCallModal(l));
    const conv = el.querySelector("#convertBtn");
    if (conv) conv.addEventListener("click", () => ui.formModal("Convert " + l.company + " to client", [
      { name: "projectName", label: "First project name", required: true, value: l.company + " — Kickoff Engagement", span2: true },
      { name: "service", label: "Service", type: "select", options: ["Brand Film", "Commercial", "Social Content", "Photography", "Motion Graphics", "Corporate", "Event"] },
      { name: "budget", label: "Budget ($)", type: "number", value: l.value, required: true },
    ], (v, close) => {
      const client = S.create("client", { name: l.company, industry: l.industry, city: "", tier: l.value > 35000 ? "B" : "C", website: "", status: "active", since: Date.now(), ownerId: l.assignedTo, satisfaction: 8.0, notes: "Converted from pipeline lead." }, "Converted lead to client — " + l.company);
      const code = "OAK-" + (2410 + S.db.projects.length);
      S.create("project", { code, name: v.projectName, clientId: client.id, service: v.service, status: "planning", health: "on_track", leadId: S.meId, team: [S.meId], startDate: Date.now(), dueDate: Date.now() + 45 * U.DAY, budget: +v.budget, spent: 0, hoursBudget: 0, progress: 0, clientAccess: false, description: "Created from won deal." }, "Created project " + code + " from won deal");
      S.notify(S.execIds(), "sales", l.company + " converted to client", "New project " + code + " · " + U.money(+v.budget), "#/client/" + client.id);
      close(); ui.toast("Client + project created.", "good"); location.hash = "#/client/" + client.id;
    }));
  };

  /* ================= COLD CALL DESK ================= */
  function logCallModal(lead, onDone) {
    let seconds = 0, timer = null;
    const m = ui.modal("Log call — " + lead.company, `
      <div class="call-header">
        <div><div class="call-number">${esc(lead.phone)}</div><div class="muted">${esc(lead.contactName)} · ${esc(lead.contactTitle || "")}</div></div>
        <div class="call-timer"><span id="callClock">0:00</span><button class="btn btn-ghost btn-sm" id="timerBtn">▶ Start timer</button></div>
      </div>
      <form class="om-form">
        <div class="form-grid">
          <label class="form-field span2"><span class="form-label">Outcome *</span>
            <div class="outcome-grid">${OUTCOMES.map(([v2, lab], i) => `<label class="outcome-opt"><input type="radio" name="outcome" value="${v2}" ${i === 0 ? "" : ""} required><span>${lab}</span></label>`).join("")}</div></label>
          <label class="form-field span2"><span class="form-label">Notes *</span><textarea name="notes" rows="3" required placeholder="What happened on the call?"></textarea></label>
          <label class="form-field"><span class="form-label">Follow up in (days)</span><input type="number" name="followUpDays" placeholder="e.g. 3"></label>
          <label class="form-field"><span class="form-label">Next action</span><input type="text" name="nextAction" placeholder="e.g. Send case study"></label>
          <label class="form-field span2"><span class="form-label">Recording</span>
            <label class="check-row"><input type="checkbox" name="recorded"> <span>Recording captured (attach to lead file)</span></label></label>
        </div>
        <div class="form-actions"><button type="submit" class="btn btn-gold">Save call log</button></div>
      </form>`, {
      wide: true,
      onMount(wrap, close) {
        const clock = wrap.querySelector("#callClock");
        const tb = wrap.querySelector("#timerBtn");
        tb.addEventListener("click", (e) => {
          e.preventDefault();
          if (timer) { clearInterval(timer); timer = null; tb.textContent = "▶ Resume"; }
          else { timer = setInterval(() => { seconds++; clock.textContent = Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0"); }, 1000); tb.textContent = "⏸ Pause"; }
        });
        wrap.querySelector("form").addEventListener("submit", (e) => {
          e.preventDefault();
          if (timer) clearInterval(timer);
          const v = ui.formValues(e.target);
          try {
            S.logCall({
              leadId: lead.id, phone: lead.phone, durationSec: seconds || null, outcome: v.outcome, notes: v.notes,
              recording: v.recorded ? "rec_" + lead.id + "_" + Date.now() + ".mp3" : null,
              followUpAt: v.followUpDays ? Date.now() + (+v.followUpDays) * U.DAY : null,
              nextAction: v.nextAction || null,
            });
            close();
            ui.toast(v.outcome === "meeting_set" ? "Meeting booked! Sales leadership notified." : "Call logged.", v.outcome === "meeting_set" ? "good" : "info");
            if (onDone) onDone(); else OM.router.refresh();
          } catch (err) { ui.toast(err.message, "bad"); }
        });
      },
    });
    return m;
  }

  OM.pages.coldcalls = function (el) {
    const me = S.me();
    const isMgr = S.isExec(me) || me.role === "dept_head";
    const queue = S.db.leads
      .filter((l) => S.can("view", "lead", l) && OPEN_STAGES.slice(0, 3).includes(l.stage) && (isMgr || l.assignedTo === me.id))
      .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority]) - ({ high: 0, medium: 1, low: 2 }[b.priority]) || a.lastActivity - b.lastActivity);
    const followUps = S.db.comms.filter((c) => c.followUpAt && c.followUpAt <= Date.now() + U.DAY && (isMgr || c.userId === me.id) && c.leadId);
    const callsToday = M.callsToday().filter((c) => isMgr || c.userId === me.id);
    const target = 40;

    el.innerHTML = ui.pageHead("Cold call desk", isMgr ? "Team queue — priority-ordered, stalest first" : "Your queue — priority-ordered, stalest first") +
      ui.kpi([
        { label: "Calls logged today", value: callsToday.length, sub: ch.meter((callsToday.length / target) * 100) + `<span class="muted">daily target ${target}</span>` },
        { label: "In queue", value: queue.length, sub: "leads awaiting a touch" },
        { label: "Follow-ups due", value: followUps.length, tone: followUps.length ? "warn" : null },
        { label: "Meetings this month", value: M.meetingsBookedThisMonth(), tone: "good" },
      ]) +
      (followUps.length ? ui.sectionCard("⏱ Due follow-ups — clear these first", followUps.map((c) => {
        const lead = S.find("lead", c.leadId);
        if (!lead) return "";
        return `<div class="list-row"><span class="list-main"><b>${esc(lead.company)}</b><span class="muted">${esc(c.nextAction || c.notes || "")}</span></span><button class="btn btn-gold btn-sm" data-call="${lead.id}">☎ Call</button></div>`;
      }).join("")) : "") +
      ui.sectionCard("Call queue", queue.length ? queue.map((l) => `
        <div class="call-queue-row">
          <span class="prio prio-${l.priority}"></span>
          <span class="list-main">
            <b>${esc(l.company)}</b>
            <span class="muted">${esc(l.contactName)} · ${esc(l.contactTitle || "")} · ${esc(l.industry)} · ${esc(l.phone)}</span>
            <span class="muted">Stage: ${STAGES.find((s2) => s2[0] === l.stage)[1]} · ${l.touches} touches · last activity ${U.ago(l.lastActivity)}${isMgr ? " · " + esc(S.userName(l.assignedTo)) : ""}</span>
          </span>
          <span class="lead-value">${U.money(l.value, { compact: true })}</span>
          <span class="cq-actions">
            <a class="btn btn-ghost btn-sm" href="#/lead/${l.id}">Review</a>
            ${S.can("edit", "lead", l) ? `<button class="btn btn-gold btn-sm" data-call="${l.id}">☎ Call</button>` : ""}
          </span>
        </div>`).join("") : ui.empty("Queue is clear. New leads land here automatically.", "☎"));

    el.querySelectorAll("[data-call]").forEach((b) => b.addEventListener("click", () => {
      const lead = S.find("lead", b.dataset.call);
      logCallModal(lead);
    }));
  };

  /* ================= COMMISSIONS ================= */
  OM.pages.commissions = function (el) {
    const me = S.me();
    const isMgr = S.isExec(me) || (me.role === "dept_head" && me.dept === "Sales") || me.dept === "Finance";
    const rows = S.db.commissions.filter((c) => isMgr || c.userId === me.id);
    el.innerHTML = ui.pageHead("Commissions", isMgr ? "All sales compensation — approved amounts flow into payroll" : "Your commission statements") +
      ui.kpi([
        { label: "Pending this month", value: U.money(rows.filter((c) => c.status === "pending").reduce((s, c) => s + c.amount, 0)) },
        { label: "Approved (last run)", value: U.money(rows.filter((c) => c.status === "approved").reduce((s, c) => s + c.amount, 0)), tone: "good" },
        { label: "Meetings paid", value: rows.reduce((s, c) => s + (c.meetingsBooked || 0), 0), sub: "$50 per qualified meeting" },
      ]) +
      `<div class="card card-flush" id="comTbl"></div>`;
    ui.table(el.querySelector("#comTbl"), {
      rows: () => rows,
      searchKeys: [(c) => S.userName(c.userId), "month"],
      exportName: "commissions", exportEntity: "commission",
      columns: [
        { key: "userId", label: "Person", render: (c) => ui.userCell(c.userId), sortVal: (c) => S.userName(c.userId) },
        { key: "month", label: "Period" },
        { key: "deals", label: "Deals", render: (c) => c.deals ? String(c.deals) : (c.meetingsBooked ? c.meetingsBooked + " mtgs" : "—") },
        { key: "revenue", label: "Attributed revenue", render: (c) => c.revenue ? U.money(c.revenue) : "—", sortVal: (c) => c.revenue || 0 },
        { key: "rate", label: "Rate", render: (c) => c.revenue ? Math.round(c.rate * 100) + "%" : "$" + c.rate + "/mtg" },
        { key: "amount", label: "Commission", render: (c) => `<b>${U.money(c.amount)}</b>`, sortVal: (c) => c.amount },
        { key: "status", label: "Status", render: (c) => ui.badge(c.status) },
      ],
    });
  };
})();
