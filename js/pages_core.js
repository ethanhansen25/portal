/* Oakframe Media OS — pages: home, projects, tasks, clients, calendar, directory */
(function () {
  const OM = window.OM;
  const U = OM.util, ui = OM.ui, ch = OM.charts;
  const S = OM.store, M = OM.metrics;
  const esc = U.esc;
  OM.pages = OM.pages || {};

  /* ================= HOME (role-aware) ================= */
  OM.pages.home = function (el) {
    const me = S.me();
    const myTasks = S.db.tasks.filter((t) => isMyTask(t, me) && t.status !== "done").sort((a, b) => (a.dueDate || 9e15) - (b.dueDate || 9e15));
    const myProjects = S.myProjects().filter((p) => p.status === "active");
    const myMeetings = M.meetingsUpcoming().filter((m) => m.attendees === "all" || (m.attendees || []).includes(me.id)).slice(0, 5);
    const unread = S.unreadCount();
    const overdueTasks = myTasks.filter((t) => t.dueDate && t.dueDate < Date.now());
    const myApprovalsWaiting = M.approvalsPending().filter((a) => S.can("approve", "approval", a)).length;

    const hour = new Date().getHours();
    const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    const myOnboarding = S.db.onboardingAssignments.find((a) => a.profileId === me.id && !a.approvedAt);

    let salesBlock = "";
    if (me.dept === "Sales" || S.isExec(me)) {
      const myLeads = S.db.leads.filter((l) => (S.isExec(me) || l.assignedTo === me.id) && !["won", "lost", "archived"].includes(l.stage));
      const myCallsToday = M.callsToday().filter((c) => S.isExec(me) || c.userId === me.id);
      const followUps = S.db.comms.filter((c) => c.followUpAt && c.followUpAt <= Date.now() + U.DAY && (S.isExec(me) || c.userId === me.id));
      salesBlock = ui.sectionCard("Sales desk", `
        <div class="mini-stats">
          <div class="mini-stat"><b>${myCallsToday.length}</b><span>calls today</span></div>
          <div class="mini-stat"><b>${myLeads.length}</b><span>open leads</span></div>
          <div class="mini-stat"><b>${followUps.length}</b><span>follow-ups due</span></div>
          <div class="mini-stat"><b>${U.money(myLeads.reduce((s, l) => s + l.value, 0), { compact: true })}</b><span>pipeline</span></div>
        </div>
        <div class="row-gap"><a class="btn btn-gold btn-sm" href="#/sales/calls">Open call queue →</a></div>`);
    }

    el.innerHTML = ui.pageHead(`${greet}, ${esc(me.name.split(" ")[0])}`,
      [me.title, me.dept, new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })].filter(Boolean).map(esc).join(" · ")) +
      (myOnboarding ? onboardingCard(myOnboarding) : "") +
      ui.kpi([
        { label: "My open tasks", value: myTasks.length, sub: overdueTasks.length ? `<span class="tone-text-bad">${overdueTasks.length} overdue</span>` : "All on schedule", link: "#/tasks" },
        { label: "Active projects", value: myProjects.length, sub: myProjects.filter((p) => p.health !== "on_track").length + " need attention", link: "#/projects" },
        { label: "Meetings this week", value: myMeetings.length, sub: myMeetings[0] ? "Next: " + U.until(myMeetings[0].ts) : "None scheduled", link: "#/calendar" },
        { label: "Notifications", value: unread, sub: myApprovalsWaiting ? myApprovalsWaiting + " approvals waiting on you" : "Inbox is clear", link: "#/notifications", tone: unread ? "warn" : null },
      ]) +
      `<div class="grid-2">
        <div>${ui.sectionCard("My tasks", myTasks.length ? myTasks.slice(0, 8).map((t) => taskRow(t)).join("") : ui.empty("No open tasks. Enjoy the calm."), { action: `<a class="link" href="#/tasks">View all →</a>` })}</div>
        <div>
          ${salesBlock}
          ${ui.sectionCard("Today & upcoming", myMeetings.length ? myMeetings.map((m) => `
            <div class="list-row clickable" onclick="location.hash='#/calendar'">
              <span class="list-icon">◫</span>
              <span class="list-main"><b>${esc(m.title)}</b><span class="muted">${U.dateShort(m.ts)} · ${U.time(m.ts)} · ${esc(m.location || "")}</span></span>
              <span class="badge tone-info">${U.until(m.ts)}</span>
            </div>`).join("") : ui.empty("No upcoming meetings."))}
          ${ui.sectionCard("My projects", myProjects.length ? myProjects.map((p) => `
            <div class="list-row clickable" onclick="location.hash='#/project/${p.id}'">
              <span class="list-main"><b>${esc(p.name)}</b><span class="muted">${esc(p.code)} · due ${U.dateShort(p.dueDate)}</span></span>
              ${ui.badge(p.health)}
            </div>`).join("") : ui.empty("You're not on any active projects."))}
        </div>
      </div>`;
    if (myOnboarding) bindOnboardingCard(el);
  };

  // Self-service onboarding checklist shown on Home until HR gives final
  // approval — each item is owned by the employee (or HR/exec) per
  // complete_onboarding_task()'s authorization check.
  function onboardingCard(a) {
    const tasks = (a.tasks || []).slice().sort((x, y) => x.position - y.position);
    const done = tasks.filter((t) => t.done).length;
    return ui.sectionCard("Your onboarding checklist", `
      <div class="onboard-progress"><span class="muted">${done} of ${tasks.length} complete</span>${ch.meter(tasks.length ? Math.round((done / tasks.length) * 100) : 0)}</div>
      ${tasks.map((t) => `
        <label class="list-row onboard-item"><input type="checkbox" data-onb-task="${t.id}" ${t.done ? "checked" : ""}>
          <span class="list-main"><b>${esc(t.text)}</b><span class="muted">${U.cap(t.category || "general")}</span></span>
        </label>`).join("")}
      ${done === tasks.length && tasks.length ? `<div class="inline-note">All done — waiting on HR's final onboarding approval.</div>` : ""}
    `, { cls: "onboard-card" });
  }
  function bindOnboardingCard(el) {
    el.querySelectorAll("[data-onb-task]").forEach((cb) => cb.addEventListener("change", () => {
      S.completeOnboardingTask(cb.dataset.onbTask, cb.checked).then(() => OM.router.refresh()).catch((e) => ui.toast(e.message, "bad"));
    }));
  }

  function taskRow(t) {
    const p = t.projectId && S.find("project", t.projectId);
    const late = t.dueDate && t.dueDate < Date.now() && t.status !== "done";
    return `<div class="list-row clickable" onclick="location.hash='#/task/${t.id}'">
      <span class="prio prio-${t.priority}"></span>
      <span class="list-main"><b>${esc(t.title)}</b><span class="muted">${p ? esc(p.code) + " · " : ""}${t.dueDate ? (late ? '<span class="tone-text-bad">due ' + U.dateShort(t.dueDate) + "</span>" : "due " + U.dateShort(t.dueDate)) : "no due date"}</span></span>
      ${ui.badge(t.status)}
    </div>`;
  }

  /* ================= PROJECTS ================= */
  OM.pages.projects = function (el) {
    const me = S.me();
    const canSeeAll = S.isExec(me) || me.role === "dept_head";
    const visible = () => S.db.projects.filter((p) => canSeeAll || S.myProjectIds().has(p.id));
    el.innerHTML = ui.pageHead("Projects", canSeeAll ? "All company projects" : "Projects you lead or are assigned to",
      S.can("create", "project") ? `<button class="btn btn-gold" id="newProj">+ New project</button>` : "");
    const host = document.createElement("div");
    host.className = "card card-flush";
    el.appendChild(host);
    ui.table(host, {
      rows: visible,
      searchKeys: ["name", "code", "service", (r) => { const c = S.find("client", r.clientId); return c ? c.name : ""; }],
      exportName: "projects", exportEntity: "project",
      defaultSort: { key: "dueDate", dir: 1 },
      columns: [
        { key: "code", label: "Code", width: "90px", render: (r) => `<span class="mono">${esc(r.code)}</span>` },
        { key: "name", label: "Project", render: (r) => `<b>${esc(r.name)}</b><div class="muted">${esc(r.service)}</div>` },
        { key: "client", label: "Client", render: (r) => { const c = S.find("client", r.clientId); return c ? esc(c.name) : '<span class="muted">Pipeline</span>'; }, sortVal: (r) => { const c = S.find("client", r.clientId); return c ? c.name : ""; } },
        { key: "leadId", label: "Lead", render: (r) => ui.userCell(r.leadId), sortVal: (r) => S.userName(r.leadId) },
        { key: "progress", label: "Progress", width: "130px", render: (r) => ch.meter(r.progress) + `<span class="muted">${r.progress}%</span>`, sortVal: (r) => r.progress },
        { key: "budget", label: "Budget", render: (r) => S.moduleAccess("finance") || S.isExec(me) || r.leadId === me.id ? `${U.money(r.spent, { compact: true })} <span class="muted">/ ${U.money(r.budget, { compact: true })}</span>` : '<span class="muted">—</span>', sortVal: (r) => r.budget },
        { key: "dueDate", label: "Due", render: (r) => U.dateShort(r.dueDate), sortVal: (r) => r.dueDate },
        { key: "health", label: "Health", render: (r) => ui.badge(r.status === "active" ? r.health : r.status), sortVal: (r) => r.health },
      ],
      onRow: (r) => (location.hash = "#/project/" + r.id),
    });
    const btn = el.querySelector("#newProj");
    if (btn) btn.addEventListener("click", () => ui.formModal("New project", [
      { name: "name", label: "Project name", required: true, span2: true },
      { name: "clientId", label: "Client", type: "select", options: [["", "— None (pipeline) —"]].concat(S.db.clients.map((c) => [c.id, c.name])) },
      { name: "service", label: "Service", type: "select", options: ["Brand Film", "Commercial", "Social Content", "Photography", "Motion Graphics", "Corporate", "Event", "Real Estate"] },
      { name: "budget", label: "Budget ($)", type: "number", required: true },
      { name: "dueDays", label: "Due in (days)", type: "number", value: 30, required: true },
      { name: "description", label: "Description", type: "textarea", span2: true },
    ], (v, close) => {
      const code = "OAK-" + (2410 + S.db.projects.length);
      S.create("project", { code, name: v.name, clientId: v.clientId || null, service: v.service, status: "planning", health: "on_track", leadId: S.meId, team: [S.meId], startDate: Date.now(), dueDate: Date.now() + (+v.dueDays) * U.DAY, budget: +v.budget, spent: 0, hoursBudget: 0, progress: 0, clientAccess: false, description: v.description }, "Created project " + code + " — " + v.name);
      S.notify(S.execIds(), "project", "New project: " + v.name, "Created by " + S.userName(S.meId), "#/projects");
      close(); ui.toast("Project created.", "good"); OM.router.refresh();
    }, { wide: true }));
  };

  /* ---- Project detail ---- */
  OM.pages.project = function (el, id, tab) {
    const p = S.find("project", id);
    const me = S.me();
    if (!p || !(S.isExec(me) || me.role === "dept_head" || S.myProjectIds().has(p.id))) {
      el.innerHTML = ui.pageHead("Project", "") + ui.empty("This project doesn't exist or you don't have access to it.", "⚠");
      return;
    }
    tab = tab || "overview";
    const client = S.find("client", p.clientId);
    const pTasks = S.db.tasks.filter((t) => t.projectId === p.id);
    const pInvoices = S.db.invoices.filter((i) => i.projectId === p.id);
    const pDocs = S.db.documents.filter((d) => d.projectId === p.id && S.can("view", "document", d));
    const pEquip = S.db.equipment.filter((e) => e.projectId === p.id);
    const pDeliverables = S.db.deliverables.filter((d) => d.projectId === p.id);
    const hours = pTasks.reduce((s, t) => s + (t.timeEntries || []).reduce((a, e2) => a + e2.hours, 0), 0);
    const canManage = S.can("manage", "project", p);
    const showMoney = S.isExec(me) || S.moduleAccess("finance") || p.leadId === me.id || me.role === "dept_head";

    const tabDefs = [
      { id: "overview", label: "Overview" }, { id: "tasks", label: "Tasks", count: pTasks.filter((t) => t.status !== "done").length },
      { id: "kanban", label: "Board" }, { id: "deliverables", label: "Deliverables", count: pDeliverables.filter((d) => !["final_delivered", "archived"].includes(d.status)).length },
      { id: "files", label: "Files & Contracts", count: pDocs.length },
      { id: "budget", label: "Budget & Hours" }, { id: "equipment", label: "Equipment", count: pEquip.length },
      { id: "timeline", label: "Timeline" }, { id: "team", label: "Team", count: (p.team || []).length },
    ];

    el.innerHTML = ui.pageHead(`<span class="mono muted">${esc(p.code)}</span> ${esc(p.name)}`,
      `${client ? `<a class="link" href="#/client/${client.id}">${esc(client.name)}</a> · ` : ""}${esc(p.service)} · Led by ${esc(S.userName(p.leadId))} ${p.clientAccess ? '· <span class="badge tone-info">Client portal on</span>' : ""}`,
      `${ui.badge(p.status === "active" ? p.health : p.status)} ${canManage ? `<button class="btn btn-ghost" id="editProj">Edit</button>` : ""}`) +
      `<div id="ptabs"></div><div id="pbody" class="tab-body"></div>`;

    ui.tabs(el.querySelector("#ptabs"), tabDefs, tab, (t) => (location.hash = "#/project/" + id + "/" + t));
    const body = el.querySelector("#pbody");

    if (tab === "overview") {
      const openT = pTasks.filter((t) => t.status !== "done");
      const daysLeft = Math.ceil((p.dueDate - Date.now()) / U.DAY);
      body.innerHTML = ui.kpi([
        { label: "Progress", value: p.progress + "%", sub: ch.meter(p.progress) },
        { label: "Days to deadline", value: daysLeft, sub: "Due " + U.date(p.dueDate), tone: daysLeft < 7 ? "warn" : null },
        { label: "Open tasks", value: openT.length, sub: openT.filter((t) => t.priority === "urgent").length + " urgent" },
        showMoney ? { label: "Budget used", value: U.pct((p.spent / p.budget) * 100), sub: U.money(p.spent) + " of " + U.money(p.budget) } : { label: "Hours logged", value: U.hrs(hours), sub: p.hoursBudget ? "of " + p.hoursBudget + "h budget" : "" },
      ]) + `<div class="grid-2">
        <div>${ui.sectionCard("Description", `<p class="body-text">${esc(p.description || "No description.")}</p>`)}
        ${ui.sectionCard("Deliverables & next deadlines", M.upcomingDeadlines(60).filter((d) => d.link === "#/project/" + p.id || pTasks.some((t) => "#/task/" + t.id === d.link)).slice(0, 6).map((d) =>
          `<div class="list-row clickable" onclick="location.hash='${d.link}'"><span class="list-icon">⏱</span><span class="list-main"><b>${esc(d.label)}</b><span class="muted">${U.cap(d.kind)}</span></span><span class="badge tone-${d.ts < Date.now() ? "bad" : "info"}">${U.until(d.ts)}</span></div>`).join("") || ui.empty("No deadlines in the next 60 days."))}</div>
        <div>${ui.sectionCard("Activity", ui.timeline(S.db.audit.filter((a) => a.entityId === p.id || pTasks.some((t) => t.id === a.entityId)).slice(-8).reverse().map((a) => ({ ts: a.ts, title: esc(a.summary), user: a.userId }))))}</div>
      </div>`;
    } else if (tab === "tasks") {
      renderTaskTable(body, () => S.db.tasks.filter((t) => t.projectId === p.id), p);
    } else if (tab === "kanban") {
      renderTaskBoard(body, pTasks, p);
    } else if (tab === "deliverables") {
      renderDeliverables(body, p, pDeliverables);
    } else if (tab === "files") {
      body.innerHTML = `<div class="card card-flush" id="fileTbl"></div>`;
      ui.table(body.querySelector("#fileTbl"), {
        rows: () => S.db.documents.filter((d) => d.projectId === p.id && S.can("view", "document", d)),
        searchKeys: ["name", "category"],
        actions: S.can("create", "document") ? `<button class="btn btn-gold btn-sm" onclick="OM.actions.uploadDoc('${p.id}','${p.clientId || ""}')">+ Upload</button>` : "",
        columns: [
          { key: "name", label: "Document", render: (d) => `<span class="file-icon">${d.type.toUpperCase()}</span> <b>${esc(d.name)}</b>` },
          { key: "category", label: "Category" },
          { key: "size", label: "Size", render: (d) => U.fileSize(d.size), sortVal: (d) => d.size },
          { key: "version", label: "Ver", render: (d) => "v" + d.version },
          { key: "uploadedBy", label: "Uploaded by", render: (d) => esc(S.userName(d.uploadedBy)) },
          { key: "uploadedAt", label: "Date", render: (d) => U.date(d.uploadedAt), sortVal: (d) => d.uploadedAt },
          { key: "act", label: "", render: (d) => d.storagePath ? `<button class="btn btn-ghost btn-sm" data-open="${d.id}">⤓</button>` : "" },
        ],
        empty: "No files on this project yet.",
        afterRender: (host) => host.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); OM.actions.openAttachment(S.find("document", b.dataset.open).storagePath); })),
      });
    } else if (tab === "budget") {
      if (!showMoney) { body.innerHTML = ui.empty("Budget details are restricted to the project lead, department heads, finance, and executives.", "🔒"); return; }
      const byUser = {};
      pTasks.forEach((t) => (t.timeEntries || []).forEach((te) => (byUser[te.userId] = (byUser[te.userId] || 0) + te.hours)));
      body.innerHTML = ui.kpi([
        { label: "Budget", value: U.money(p.budget) },
        { label: "Spent", value: U.money(p.spent), sub: U.pct((p.spent / p.budget) * 100) + " used" },
        { label: "Remaining", value: U.money(p.budget - p.spent), tone: p.budget - p.spent < p.budget * 0.15 ? "warn" : "good" },
        { label: "Hours logged", value: U.hrs(hours), sub: p.hoursBudget ? "of " + p.hoursBudget + "h" : "" },
      ]) + `<div class="grid-2">
        <div>${ui.sectionCard("Invoices on this project", pInvoices.length ? pInvoices.map((i) => `<div class="list-row"><span class="list-main"><b>${esc(i.number)}</b><span class="muted">${esc(i.memo)}</span></span><span>${U.money(i.total)}</span>${ui.badge(i.status)}</div>`).join("") : ui.empty("No invoices linked."))}</div>
        <div>${ui.sectionCard("Hours by person", Object.keys(byUser).length ? `<div id="hoursChart"></div>` : ui.empty("No time logged yet."))}</div>
      </div>`;
      const hc = body.querySelector("#hoursChart");
      if (hc) ch.hbars(hc, Object.entries(byUser).map(([uid, h]) => ({ label: S.userName(uid), value: h })), { fmt: (v) => U.hrs(v) });
    } else if (tab === "equipment") {
      body.innerHTML = pEquip.length ? `<div class="card card-flush">` + pEquip.map((e) => `
        <div class="list-row"><span class="list-icon">⚙</span><span class="list-main"><b>${esc(e.name)}</b><span class="muted">${esc(e.assetTag)} · with ${esc(S.userName(e.assignedTo))}</span></span>${ui.badge(e.status)}</div>`).join("") + "</div>"
        : ui.empty("No equipment checked out to this project.") + `<div class="row-gap center"><a class="btn btn-ghost" href="#/equipment">Open equipment room →</a></div>`;
    } else if (tab === "timeline") {
      const events = S.db.audit.filter((a) => a.entityId === p.id || pTasks.some((t) => t.id === a.entityId))
        .concat(S.db.comms.filter((c) => c.clientId === p.clientId).map((c) => ({ ts: c.ts, summary: U.cap(c.kind) + " — " + c.notes, userId: c.userId })))
        .sort((a, b) => b.ts - a.ts).slice(0, 30);
      body.innerHTML = `<div class="card"><div class="card-body">${ui.timeline(events.map((e) => ({ ts: e.ts, title: esc(e.summary), user: e.userId })))}</div></div>`;
    } else if (tab === "team") {
      body.innerHTML = `<div class="card card-flush">` + (p.team || []).map((uid) => {
        const u = S.user(uid);
        if (!u) return "";
        const uh = pTasks.reduce((s, t) => s + (t.timeEntries || []).filter((te) => te.userId === uid).reduce((a, te) => a + te.hours, 0), 0);
        const open = pTasks.filter((t) => (t.assigneeId === uid || (t.assigneeIds || []).includes(uid)) && t.status !== "done").length;
        return `<div class="list-row">${ui.avatar(u)}<span class="list-main"><b>${esc(u.name)}${uid === p.leadId ? ' <span class="badge tone-info">Lead</span>' : ""}</b><span class="muted">${esc(u.title)} · ${esc(u.dept)}</span></span><span class="muted">${open} open tasks · ${U.hrs(uh)}</span></div>`;
      }).join("") + "</div>" +
      (canManage ? `<div class="row-gap"><button class="btn btn-ghost" id="addMember">+ Add team member</button></div>` : "");
      const am = body.querySelector("#addMember");
      if (am) am.addEventListener("click", () => ui.formModal("Add team member", [
        { name: "userId", label: "Person", type: "user", required: true, filter: (u) => !(p.team || []).includes(u.id) },
      ], (v, close) => {
        S.addTeamMember(p.id, v.userId);
        close(); ui.toast("Team member added.", "good"); OM.router.refresh();
      }));
    }

    const editBtn = el.querySelector("#editProj");
    if (editBtn) editBtn.addEventListener("click", () => ui.formModal("Edit project", [
      { name: "name", label: "Name", value: p.name, required: true, span2: true },
      { name: "status", label: "Status", type: "select", options: ["planning", "active", "completed", "archived"], value: p.status },
      { name: "health", label: "Health", type: "select", options: [["on_track", "On Track"], ["at_risk", "At Risk"], ["behind", "Behind"]], value: p.health },
      { name: "progress", label: "Progress %", type: "number", value: p.progress },
      { name: "budget", label: "Budget ($)", type: "number", value: p.budget },
      { name: "clientAccess", label: "Client portal access", type: "select", options: [["true", "Enabled"], ["false", "Disabled"]], value: String(p.clientAccess) },
      { name: "description", label: "Description", type: "textarea", value: p.description, span2: true },
    ], (v, close) => {
      const healthChanged = v.health !== p.health;
      S.update("project", p.id, { name: v.name, status: v.status, health: v.health, progress: +v.progress, budget: +v.budget, clientAccess: v.clientAccess === "true", description: v.description }, "Updated project " + p.code);
      if (healthChanged && v.health !== "on_track") S.notify(S.execIds(), "project", p.code + " flagged " + U.cap(v.health), p.name, "#/project/" + p.id);
      close(); ui.toast("Project updated.", "good"); OM.router.refresh();
    }, { wide: true }));
  };

  /* ================= DELIVERABLES (staff-side approval chain) =================
     draft -> internal_review -> dept_head_review -> approved_for_client ->
     sent_to_client -> (client: client_approved | revision_requested) ->
     final_delivered -> archived. Client visibility flips on at sent_to_client
     (supabase/migrations/0007's deliverables_select_client policy) — staff
     stages before that are never reachable by a client account regardless of
     what this UI shows, since RLS enforces it independent of this code. */
  const DELIVERABLE_KINDS = ["video", "photo", "graphic", "document", "draft", "final", "thumbnail", "caption", "revision"];
  // Each entry: [nextStatus, buttonLabel, tone] — who may fire it is checked
  // by S.can("edit","deliverable",d) plus a stage-specific role rule below.
  const DELIVERABLE_NEXT = {
    draft: [["internal_review", "Submit for internal review"]],
    internal_review: [["dept_head_review", "Send to department head"], ["draft", "Send back to draft"]],
    dept_head_review: [["approved_for_client", "Approve for client"], ["internal_review", "Send back"]],
    approved_for_client: [["sent_to_client", "Send to client"]],
    sent_to_client: [],
    client_approved: [["final_delivered", "Mark final delivered"]],
    revision_requested: [["internal_review", "Resubmit revision"]],
    final_delivered: [["archived", "Archive"]],
    archived: [],
  };
  // dept_head_review -> approved_for_client and anything -> sent_to_client
  // require a department head / exec sign-off, mirroring "Department Head
  // approves before client sees it" — narrower than the general edit right.
  function canFireTransition(d, next) {
    const me = S.me();
    if (!S.can("edit", "deliverable", d)) return false;
    if ((d.status === "dept_head_review" && next === "approved_for_client") || next === "sent_to_client") {
      return S.isExec(me) || me.role === "dept_head";
    }
    return true;
  }

  function renderDeliverables(body, p, items) {
    const canCreate = S.can("create", "deliverable", null);
    body.innerHTML = `<div class="row-gap">${canCreate ? '<button class="btn btn-gold btn-sm" id="newDeliverable">+ New deliverable</button>' : ""}</div>
      <div class="lib-grid" id="delGrid">${items.length ? items.map((d) => staffDeliverableCard(d)).join("") : ""}</div>`;
    if (!items.length) body.querySelector("#delGrid").outerHTML = ui.empty("No deliverables on this project yet.");
    const nd = body.querySelector("#newDeliverable");
    if (nd) nd.addEventListener("click", () => newDeliverableModal(p));
    body.querySelectorAll("[data-deliverable]").forEach((card) => card.addEventListener("click", (e) => {
      if (e.target.closest("[data-open-file]")) return;
      deliverableDetailModal(S.find("deliverable", card.dataset.deliverable));
    }));
    body.querySelectorAll("[data-open-file]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); OM.actions.openAttachment(S.find("deliverable", b.dataset.openFile).storagePath); }));
  }

  function staffDeliverableCard(d) {
    return `<div class="card lib-card clickable" data-deliverable="${d.id}">
      <div class="lib-top">${ui.badge(d.status)}<span class="muted">v${d.version}</span></div>
      <b>${esc(d.name)}</b><span class="muted">${U.cap(d.kind)} · uploaded by ${esc(S.userName(d.uploadedBy))}</span>
      ${d.dueDate ? `<span class="muted">Due ${U.dateShort(d.dueDate)}</span>` : ""}
      ${d.storagePath ? `<div class="row-gap"><button class="btn btn-ghost btn-sm" data-open-file="${d.id}">⤓ File</button></div>` : ""}
    </div>`;
  }

  function newDeliverableModal(p) {
    ui.formModal("New deliverable", [
      { name: "name", label: "Name", required: true, span2: true },
      { name: "kind", label: "Kind", type: "select", options: DELIVERABLE_KINDS, value: "video" },
      { name: "dueDays", label: "Due in (days)", type: "number" },
      { name: "file", label: "File (optional — can add later)", type: "file" },
      { name: "clientNotes", label: "Client-facing notes", type: "textarea", span2: true, hint: "Visible to the client once released" },
    ], async (v, close) => {
      const id = S.uid();
      let storagePath = null, size = null;
      if (v.file && v.file.size) { const up = await OM.db.uploadAttachment("deliverables", id, v.file); storagePath = up.path; size = up.size; }
      S.create("deliverable", {
        id, projectId: p.id, clientId: p.clientId || null, name: v.name, kind: v.kind, status: "draft", version: 1,
        storagePath, notes: null, clientNotes: v.clientNotes || null, downloadPermission: false,
        uploadedBy: S.meId, uploadedAt: Date.now(), dueDate: v.dueDays !== "" ? Date.now() + (+v.dueDays) * U.DAY : null,
      }, "Added deliverable — " + v.name);
      close(); ui.toast("Deliverable created.", "good"); OM.router.refresh();
    }, { wide: true });
  }

  function deliverableDetailModal(d) {
    if (!d) return;
    const me = S.me();
    const isHrOrExec = S.isExec(me) || me.role === "dept_head";
    const internalNotes = S.db.deliverableInternalNotes.filter((n) => n.deliverableId === d.id);
    const events = S.db.deliverableEvents.filter((e) => e.deliverableId === d.id).sort((a, b) => b.ts - a.ts);
    const nextOptions = (DELIVERABLE_NEXT[d.status] || []).filter(([next]) => canFireTransition(d, next));
    const m = ui.modal(d.name, `
      <div class="detail-grid">
        <div><span class="detail-label">Status</span><b>${ui.badge(d.status)}</b></div>
        <div><span class="detail-label">Kind</span><b>${U.cap(d.kind)}</b></div>
        <div><span class="detail-label">Version</span><b>v${d.version}</b></div>
        <div><span class="detail-label">Uploaded by</span><b>${esc(S.userName(d.uploadedBy))}</b></div>
      </div>
      ${d.storagePath ? `<div class="row-gap"><button class="btn btn-ghost btn-sm" id="dlOpenFile">⤓ Open file</button>
        <label class="check-row"><input type="checkbox" id="dlDownloadPerm" ${d.downloadPermission ? "checked" : ""}><span>Allow client to download this file</span></label></div>`
        : '<p class="muted">No file attached yet.</p>'}
      <h4 class="modal-sub">Client-facing notes</h4>
      <textarea id="dlClientNotes" class="body-text" rows="3" style="width:100%">${esc(d.clientNotes || "")}</textarea>
      <div class="row-gap"><button class="btn btn-ghost btn-sm" id="dlSaveNotes">Save client notes</button></div>
      <h4 class="modal-sub">Internal notes <span class="muted">— never visible to the client</span></h4>
      ${internalNotes.map((n) => `<div class="list-row"><span class="list-main"><span class="muted">${esc(S.userName(n.authorId))} · ${U.date(n.createdAt)}</span><br>${esc(n.body)}</span></div>`).join("") || '<p class="muted">None.</p>'}
      <div class="row-gap"><input type="text" id="dlNoteInput" placeholder="Add an internal note…" style="flex:1"><button class="btn btn-ghost btn-sm" id="dlAddNote">Add</button></div>
      ${events.length ? `<h4 class="modal-sub">History</h4>` + ui.timeline(events.slice(0, 8).map((e) => ({ ts: e.ts, title: esc(S.userName(e.userId)) + " — " + U.cap(e.action) + (e.note ? ": " + esc(e.note) : "") }))) : ""}
    `, {
      wide: true,
      footer: nextOptions.map(([next, label]) => `<button class="btn ${next === "archived" || next === "draft" ? "btn-ghost" : "btn-gold"}" data-next="${next}">${esc(label)}</button>`).join("")
        + `<button class="btn btn-ghost" data-role="cancel2">Close</button>`,
    });
    const c2 = m.el.querySelector('[data-role="cancel2"]'); if (c2) c2.addEventListener("click", m.close);
    const openBtn = m.el.querySelector("#dlOpenFile"); if (openBtn) openBtn.addEventListener("click", () => OM.actions.openAttachment(d.storagePath));
    const dlPerm = m.el.querySelector("#dlDownloadPerm");
    if (dlPerm) dlPerm.addEventListener("change", () => {
      S.update("deliverable", d.id, { downloadPermission: dlPerm.checked }, (dlPerm.checked ? "Enabled" : "Disabled") + " client download — " + d.name);
      ui.toast(dlPerm.checked ? "Client can now download this file." : "Client download turned off.", "good");
    });
    m.el.querySelector("#dlSaveNotes").addEventListener("click", () => {
      const val = m.el.querySelector("#dlClientNotes").value;
      S.update("deliverable", d.id, { clientNotes: val }, "Updated client-facing notes — " + d.name);
      ui.toast("Client notes saved.", "good");
    });
    m.el.querySelector("#dlAddNote").addEventListener("click", () => {
      const input = m.el.querySelector("#dlNoteInput");
      if (!input.value.trim()) return;
      S.create("deliverableInternalNote", { deliverableId: d.id, authorId: S.meId, body: input.value.trim() }, "Added internal note — " + d.name);
      m.close(); deliverableDetailModal(S.find("deliverable", d.id));
    });
    m.el.querySelectorAll("[data-next]").forEach((b) => b.addEventListener("click", () => {
      const next = b.dataset.next;
      const bumpsVersion = next === "internal_review" && (d.status === "revision_requested");
      S.update("deliverable", d.id, { status: next, version: bumpsVersion ? d.version + 1 : d.version }, "Moved deliverable \"" + d.name + "\" → " + U.cap(next));
      S.logDeliverableEvent(d.id, next, null, bumpsVersion ? d.version + 1 : d.version);
      if (next === "sent_to_client" && d.clientId) {
        const client = S.find("client", d.clientId);
        const staffIds = S.db.users.filter((u) => u.portalType === "client" && u.clientId === d.clientId).map((u) => u.id);
        if (staffIds.length) S.notify(staffIds, "deliverable", "New deliverable ready: " + d.name, client ? client.name : "", "#/c/deliverables");
      }
      m.close(); ui.toast("Deliverable moved to " + U.cap(next) + ".", "good"); OM.router.refresh();
    }));
  }

  /* ================= TASKS ================= */
  function taskFormFields(t = {}, projectId) {
    return [
      { name: "title", label: "Title", value: t.title, required: true, span2: true },
      { name: "projectId", label: "Project", type: "select", options: [["", "— Internal / no project —"]].concat(S.db.projects.filter((p) => p.status !== "archived").map((p) => [p.id, p.code + " · " + p.name])), value: t.projectId || projectId || "" },
      { name: "assigneeIds", label: "Assign to", type: "userMulti", value: t.assigneeIds || (t.assigneeId ? [t.assigneeId] : []), span2: true, hint: "Check everyone this task belongs to" },
      { name: "priority", label: "Priority", type: "select", options: ["urgent", "high", "medium", "low"], value: t.priority || "medium" },
      { name: "dueDays", label: "Due in (days)", type: "number", value: t.dueDate ? Math.max(0, Math.ceil((t.dueDate - Date.now()) / U.DAY)) : 7 },
      { name: "recurring", label: "Recurring", type: "select", options: [["", "No"], ["weekly", "Weekly"], ["monthly", "Monthly"]], value: t.recurring || "" },
      { name: "desc", label: "Description", type: "textarea", value: t.desc, span2: true },
    ];
  }
  // FormData yields a single string for a lone checked box, an array for
  // several, and undefined for none — normalize all three to an array.
  function assigneeIdsFrom(v) { return v.assigneeIds == null ? [] : Array.isArray(v.assigneeIds) ? v.assigneeIds : [v.assigneeIds]; }
  OM.actions = OM.actions || {};
  OM.actions.newTask = function (projectId) {
    ui.formModal("New task", taskFormFields({}, projectId), (v, close) => {
      const assigneeIds = assigneeIdsFrom(v);
      const t = S.create("task", { title: v.title, projectId: v.projectId || null, assigneeId: assigneeIds[0] || null, assigneeIds, priority: v.priority, status: "todo", dueDate: v.dueDays !== "" ? Date.now() + (+v.dueDays) * U.DAY : null, desc: v.desc, createdBy: S.meId, subtasks: [], checklist: [], comments: [], timeEntries: [], dependsOn: [], recurring: v.recurring || null, hours: 0 }, "Created task — " + v.title);
      if (assigneeIds.length) S.notify(assigneeIds, "task", "Assigned: " + v.title, "By " + S.userName(S.meId), "#/task/" + t.id);
      close(); ui.toast("Task created.", "good"); OM.router.refresh();
    }, { wide: true });
  };
  OM.actions.uploadDoc = function (projectId, clientId) {
    ui.formModal("Upload document", [
      { name: "file", label: "File", type: "file", required: true, span2: true },
      { name: "name", label: "Document name", required: true, span2: true },
      { name: "category", label: "Category", type: "select", options: ["Contracts", "NDAs", "Releases", "Project Documents", "Invoices", "Legal Documents", "Client Files"] },
      { name: "confidential", label: "Access", type: "select", options: [["false", "Company-wide (subject to normal rules)"], ["true", "Confidential — executives only"]] },
      { name: "tags", label: "Tags (comma-separated)" },
    ], async (v, close) => {
      const file = v.file;
      if (!file || !file.size) throw new Error("Choose a file to upload.");
      const docId = S.uid();
      const { path } = await OM.db.uploadAttachment("documents", docId, file);
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      S.create("document", { id: docId, name: v.name, category: v.category, type: ext, storagePath: path, size: file.size, projectId: projectId || null, clientId: clientId || null, uploadedBy: S.meId, uploadedAt: Date.now(), tags: (v.tags || "").split(",").map((s) => s.trim()).filter(Boolean), confidential: v.confidential === "true", version: 1 }, "Uploaded document — " + v.name);
      close(); ui.toast("Document uploaded.", "good"); OM.router.refresh();
    });
  };

  // Fetches a short-lived signed URL for a private attachment and opens it —
  // used for both document and resource downloads.
  OM.actions.openAttachment = async function (storagePath) {
    if (!storagePath) { ui.toast("This record has no file attached.", "bad"); return; }
    try {
      const url = await OM.db.attachmentSignedUrl(storagePath);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      ui.toast("Couldn't open file: " + err.message, "bad");
    }
  };
  // Forces an actual file download (vs. openAttachment's preview-in-new-tab)
  // by fetching the signed URL as a blob and clicking a temporary <a download>.
  OM.actions.downloadAttachment = async function (storagePath, filename) {
    if (!storagePath) { ui.toast("This record has no file attached.", "bad"); return; }
    try {
      const url = await OM.db.attachmentSignedUrl(storagePath);
      const resp = await fetch(url);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl; a.download = filename || storagePath.split("/").pop();
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
    } catch (err) {
      ui.toast("Couldn't download file: " + err.message, "bad");
    }
  };

  function isMyTask(t, me) { return t.assigneeId === me.id || (t.assigneeIds || []).includes(me.id); }
  function visibleTasks() {
    const me = S.me();
    if (S.isExec(me)) return S.db.tasks;
    if (me.role === "dept_head") return S.db.tasks.filter((t) => { const a = S.user(t.assigneeId); return (a && a.dept === me.dept) || isMyTask(t, me) || t.createdBy === me.id || S.myProjectIds().has(t.projectId); });
    if (me.role === "contractor" || me.role === "intern") return S.db.tasks.filter((t) => isMyTask(t, me) || S.myProjectIds().has(t.projectId));
    return S.db.tasks.filter((t) => isMyTask(t, me) || t.createdBy === me.id || S.myProjectIds().has(t.projectId));
  }

  function renderTaskTable(host, rowsFn, project) {
    host.innerHTML = `<div class="card card-flush" id="tt"></div>`;
    ui.table(host.querySelector("#tt"), {
      rows: rowsFn,
      searchKeys: ["title", (t) => (t.assigneeIds && t.assigneeIds.length ? t.assigneeIds : [t.assigneeId]).map((id) => S.userName(id)).join(" "), (t) => { const p = S.find("project", t.projectId); return p ? p.code + " " + p.name : ""; }],
      exportName: "tasks", exportEntity: "task",
      defaultSort: { key: "dueDate", dir: 1 },
      actions: S.can("create", "task") ? `<button class="btn btn-gold btn-sm" onclick="OM.actions.newTask(${project ? `'${project.id}'` : "null"})">+ New task</button>` : "",
      columns: [
        { key: "priority", label: "", width: "20px", render: (t) => `<span class="prio prio-${t.priority}" title="${U.cap(t.priority)}"></span>`, sortVal: (t) => ({ urgent: 0, high: 1, medium: 2, low: 3 }[t.priority]) },
        { key: "title", label: "Task", render: (t) => `<b>${esc(t.title)}</b>${t.recurring ? ' <span class="badge tone-neutral">↻ ' + t.recurring + "</span>" : ""}${(t.dependsOn || []).length ? ' <span class="muted" title="Has dependencies">⛓</span>' : ""}` },
        { key: "project", label: "Project", render: (t) => { const p = S.find("project", t.projectId); return p ? `<span class="mono">${esc(p.code)}</span>` : '<span class="muted">Internal</span>'; }, sortVal: (t) => { const p = S.find("project", t.projectId); return p ? p.code : "zz"; } },
        { key: "assigneeId", label: "Assigned to", render: (t) => { const ids = t.assigneeIds && t.assigneeIds.length ? t.assigneeIds : [t.assigneeId].filter(Boolean); return ids.length ? ids.map((id) => ui.userCell(id)).join("") : '<span class="muted">Unassigned</span>'; }, sortVal: (t) => S.userName(t.assigneeId) },
        { key: "dueDate", label: "Due", render: (t) => t.dueDate ? (t.dueDate < Date.now() && t.status !== "done" ? `<span class="tone-text-bad">${U.dateShort(t.dueDate)}</span>` : U.dateShort(t.dueDate)) : "—", sortVal: (t) => t.dueDate || 9e15 },
        { key: "status", label: "Status", render: (t) => ui.badge(t.status), sortVal: (t) => t.status },
      ],
      onRow: (t) => (location.hash = "#/task/" + t.id),
    });
  }

  function renderTaskBoard(host, items, project) {
    host.innerHTML = `<div id="kb"></div>` + (S.can("create", "task") ? `<div class="row-gap"><button class="btn btn-gold btn-sm" onclick="OM.actions.newTask(${project ? `'${project.id}'` : "null"})">+ New task</button></div>` : "");
    ui.kanban(host.querySelector("#kb"), {
      columns: [{ id: "todo", label: "To Do" }, { id: "in_progress", label: "In Progress" }, { id: "review", label: "In Review" }, { id: "blocked", label: "Blocked" }, { id: "done", label: "Done" }],
      items,
      colOf: (t) => t.status,
      canMove: (t) => S.can("edit", "task", t),
      card: (t) => {
        const assignees = t.assigneeIds && t.assigneeIds.length ? t.assigneeIds : [t.assigneeId].filter(Boolean);
        return `<div class="kc-title">${esc(t.title)}</div><div class="kc-meta"><span class="prio prio-${t.priority}"></span>${t.dueDate ? `<span class="${t.dueDate < Date.now() && t.status !== "done" ? "tone-text-bad" : "muted"}">${U.dateShort(t.dueDate)}</span>` : ""}<span class="kc-avatars">${assignees.slice(0, 3).map((id) => ui.avatar(id)).join("")}${assignees.length > 3 ? `<span class="avatar-more">+${assignees.length - 3}</span>` : ""}</span></div>`;
      },
      onMove: (t, col) => {
        const blockers = (t.dependsOn || []).filter((d) => { const dt = S.find("task", d); return dt && dt.status !== "done"; });
        if (col === "done" && blockers.length) { ui.toast("Blocked by " + blockers.length + " unfinished dependenc" + (blockers.length === 1 ? "y" : "ies") + ".", "warn"); return; }
        S.update("task", t.id, { status: col }, "Moved task \"" + t.title + "\" to " + U.cap(col));
        if (col === "done" && t.recurring) spawnRecurring(t);
        OM.router.refresh();
      },
      onCard: (t) => (location.hash = "#/task/" + t.id),
    });
  }
  function spawnRecurring(t) {
    const next = Object.assign({}, t, { id: undefined, status: "todo", createdAt: Date.now(), dueDate: (t.dueDate || Date.now()) + (t.recurring === "weekly" ? 7 : 30) * U.DAY, comments: [], timeEntries: [] });
    S.create("task", next, "Recurring task respawned — " + t.title);
  }

  OM.pages.tasks = function (el, view) {
    view = view || "list";
    el.innerHTML = ui.pageHead("Tasks", "Everything assigned to you and your projects") + `<div id="ttabs"></div><div id="tbody" class="tab-body"></div>`;
    ui.tabs(el.querySelector("#ttabs"), [{ id: "list", label: "List" }, { id: "board", label: "Board" }], view, (t) => (location.hash = "#/tasks/" + t));
    const body = el.querySelector("#tbody");
    if (view === "board") renderTaskBoard(body, visibleTasks(), null);
    else renderTaskTable(body, visibleTasks, null);
  };

  /* ---- Task detail ---- */
  OM.pages.task = function (el, id) {
    const t = S.find("task", id);
    const me = S.me();
    if (!t || !S.can("view", "task", t)) { el.innerHTML = ui.empty("Task not found or not accessible.", "⚠"); return; }
    const p = t.projectId && S.find("project", t.projectId);
    const canEdit = S.can("edit", "task", t);
    const hours = (t.timeEntries || []).reduce((s, e) => s + e.hours, 0);
    const deps = (t.dependsOn || []).map((d) => S.find("task", d)).filter(Boolean);

    el.innerHTML = ui.pageHead(esc(t.title),
      `${p ? `<a class="link" href="#/project/${p.id}">${esc(p.code)} · ${esc(p.name)}</a> · ` : "Internal · "}created by ${esc(S.userName(t.createdBy))} ${U.ago(t.createdAt)}`,
      `${ui.badge(t.status)} <span class="badge tone-${{ urgent: "bad", high: "warn", medium: "info", low: "neutral" }[t.priority]}">${U.cap(t.priority)}</span>
       ${canEdit ? `<button class="btn btn-ghost" id="editTask">Edit</button>` : ""}
       ${S.can("delete", "task", t) ? `<button class="btn btn-danger-ghost" id="delTask">Delete</button>` : ""}`) +
      `<div class="grid-2">
        <div>
          ${ui.sectionCard("Details", `
            <div class="detail-grid">
              <div><span class="detail-label">Assigned to</span>${(t.assigneeIds && t.assigneeIds.length ? t.assigneeIds : [t.assigneeId].filter(Boolean)).map((id) => ui.userCell(id)).join("") || '<span class="muted">Unassigned</span>'}</div>
              <div><span class="detail-label">Due date</span><b>${t.dueDate ? U.date(t.dueDate) : "—"}</b>${t.dueDate && t.dueDate < Date.now() && t.status !== "done" ? ' <span class="badge tone-bad">Overdue</span>' : ""}</div>
              <div><span class="detail-label">Time logged</span><b>${U.hrs(hours)}</b></div>
              <div><span class="detail-label">Recurring</span><b>${t.recurring ? U.cap(t.recurring) : "No"}</b></div>
            </div>
            ${t.desc ? `<p class="body-text">${esc(t.desc)}</p>` : ""}
            ${deps.length ? `<div class="dep-list"><span class="detail-label">Depends on</span>${deps.map((d) => `<a class="dep-chip ${d.status === "done" ? "done" : ""}" href="#/task/${d.id}">${d.status === "done" ? "✓ " : "⛓ "}${esc(d.title)}</a>`).join("")}</div>` : ""}
            ${canEdit ? `<div class="row-gap status-row">${["todo", "in_progress", "review", "blocked", "done"].map((s2) => `<button class="btn btn-sm ${t.status === s2 ? "btn-gold" : "btn-ghost"}" data-status="${s2}">${U.cap(s2)}</button>`).join("")}</div>` : ""}`)}
          ${ui.sectionCard("Checklist" + ((t.checklist || []).length ? ` (${t.checklist.filter((c) => c.done).length}/${t.checklist.length})` : ""), `
            ${(t.checklist || []).map((c) => `<label class="check-row"><input type="checkbox" data-chk="${c.id}" ${c.done ? "checked" : ""} ${canEdit ? "" : "disabled"}><span class="${c.done ? "struck" : ""}">${esc(c.text)}</span></label>`).join("") || '<p class="muted">No checklist items.</p>'}
            ${canEdit ? `<div class="inline-add"><input type="text" id="newChk" placeholder="Add checklist item…"><button class="btn btn-ghost btn-sm" id="addChk">Add</button></div>` : ""}`)}
          ${canEdit ? ui.sectionCard("Log time", `<div class="inline-add"><input type="number" id="logHrs" step="0.5" min="0.5" placeholder="Hours"><button class="btn btn-gold btn-sm" id="logBtn">Log time</button></div>
            ${(t.timeEntries || []).slice(-5).reverse().map((te) => `<div class="list-row"><span class="list-main">${esc(S.userName(te.userId))}</span><span class="muted">${U.hrs(te.hours)} · ${U.date(te.date)}</span></div>`).join("")}`) : ""}
        </div>
        <div>
          ${ui.sectionCard("Comments", `
            <div class="comment-list">${(t.comments || []).map((c) => `<div class="comment">${ui.avatar(c.userId)}<div><div class="comment-head"><b>${esc(S.userName(c.userId))}</b><span class="muted">${U.ago(c.ts)}</span></div><div class="comment-body">${esc(c.text).replace(/@(\w+)/g, '<span class="mention">@$1</span>')}</div></div></div>`).join("") || '<p class="muted">No comments yet.</p>'}</div>
            <div class="inline-add"><input type="text" id="newComment" placeholder="Comment… use @first-name to mention"><button class="btn btn-gold btn-sm" id="addComment">Post</button></div>`)}
          ${ui.sectionCard("Activity", ui.timeline(S.db.audit.filter((a) => a.entityId === t.id).slice(-8).reverse().map((a) => ({ ts: a.ts, title: esc(a.summary), user: a.userId }))))}
        </div>
      </div>`;

    el.querySelectorAll("[data-status]").forEach((b) => b.addEventListener("click", () => {
      try {
        if (b.dataset.status === "done" && deps.some((d) => d.status !== "done")) { ui.toast("Finish dependencies first.", "warn"); return; }
        S.update("task", t.id, { status: b.dataset.status }, `Task "${t.title}" → ${U.cap(b.dataset.status)}`);
        if (b.dataset.status === "done") {
          if (t.recurring) spawnRecurring(t);
          if (t.createdBy !== S.meId) S.notify(t.createdBy, "task", "Completed: " + t.title, "By " + S.userName(S.meId), "#/task/" + t.id);
        }
        OM.router.refresh();
      } catch (e) { ui.toast(e.message, "bad"); }
    }));
    el.querySelectorAll("[data-chk]").forEach((c) => c.addEventListener("change", () => {
      S.toggleChecklistItem(c.dataset.chk, c.checked); OM.router.refresh();
    }));
    const addChk = el.querySelector("#addChk");
    if (addChk) addChk.addEventListener("click", () => {
      const v = el.querySelector("#newChk").value.trim();
      if (!v) return;
      S.addChecklistItem(t.id, v); OM.router.refresh();
    });
    const logBtn = el.querySelector("#logBtn");
    if (logBtn) logBtn.addEventListener("click", () => {
      const h = parseFloat(el.querySelector("#logHrs").value);
      if (!h || h <= 0) return;
      S.logTime(t.id, h); ui.toast("Time logged.", "good"); OM.router.refresh();
    });
    const addComment = el.querySelector("#addComment");
    if (addComment) addComment.addEventListener("click", () => {
      const v = el.querySelector("#newComment").value.trim();
      if (!v) return;
      S.addComment(t.id, v); OM.router.refresh();
    });
    const editBtn = el.querySelector("#editTask");
    if (editBtn) editBtn.addEventListener("click", () => ui.formModal("Edit task", taskFormFields(t), (v, close) => {
      const assigneeIds = assigneeIdsFrom(v);
      S.update("task", t.id, { title: v.title, projectId: v.projectId || null, assigneeId: assigneeIds[0] || null, priority: v.priority, dueDate: v.dueDays !== "" ? Date.now() + (+v.dueDays) * U.DAY : null, desc: v.desc, recurring: v.recurring || null }, 'Edited task "' + v.title + '"');
      S.setTaskAssignees(t.id, assigneeIds);
      close(); ui.toast("Saved.", "good"); OM.router.refresh();
    }, { wide: true }));
    const delBtn = el.querySelector("#delTask");
    if (delBtn) delBtn.addEventListener("click", () => ui.confirmModal("Delete task", `Delete "<b>${esc(t.title)}</b>"? This is recorded in the audit log.`, (reason) => {
      S.remove("task", t.id, reason);
      ui.toast("Task deleted.", "good");
      location.hash = "#/tasks";
    }, { danger: true, reason: true, okLabel: "Delete" }));
  };

  /* ================= CLIENTS ================= */
  OM.pages.clients = function (el) {
    const me = S.me();
    const visible = () => S.db.clients.filter((c) => S.can("view", "client", c));
    el.innerHTML = ui.pageHead("Clients", "Relationship home base for every account",
      S.can("create", "client") ? `<button class="btn btn-gold" id="newClient">+ New client</button>` : "");
    const host = document.createElement("div");
    host.className = "card card-flush";
    el.appendChild(host);
    ui.table(host, {
      rows: visible,
      searchKeys: ["name", "industry", "city"],
      exportName: "clients", exportEntity: "client",
      columns: [
        { key: "name", label: "Client", render: (c) => `<b>${esc(c.name)}</b><div class="muted">${esc(c.industry)} · ${esc(c.city)}</div>` },
        { key: "tier", label: "Tier", width: "60px", render: (c) => c.tier ? `<span class="tier tier-${c.tier}">${c.tier}</span>` : "" },
        { key: "ownerId", label: "Account owner", render: (c) => ui.userCell(c.ownerId), sortVal: (c) => S.userName(c.ownerId) },
        { key: "projects", label: "Active projects", render: (c) => String(S.db.projects.filter((p) => p.clientId === c.id && p.status === "active").length), sortVal: (c) => S.db.projects.filter((p) => p.clientId === c.id && p.status === "active").length },
        { key: "ar", label: "Open AR", render: (c) => U.money(S.db.invoices.filter((i) => i.clientId === c.id && ["sent", "overdue", "viewed", "partial"].includes(i.status)).reduce((s, i) => s + i.total, 0), { compact: true }), sortVal: (c) => S.db.invoices.filter((i) => i.clientId === c.id && ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + i.total, 0) },
        { key: "satisfaction", label: "CSAT", render: (c) => c.satisfaction != null ? `<b>${c.satisfaction}</b><span class="muted">/10</span>` : '<span class="muted">—</span>', sortVal: (c) => c.satisfaction || 0 },
        { key: "status", label: "Status", render: (c) => ui.badge(c.status) },
      ],
      onRow: (c) => (location.hash = "#/client/" + c.id),
    });
    const nb = el.querySelector("#newClient");
    if (nb) nb.addEventListener("click", () => ui.formModal("New client", [
      { name: "name", label: "Company name", required: true, span2: true },
      { name: "industry", label: "Industry", required: true },
      { name: "city", label: "City" },
      { name: "tier", label: "Tier", type: "select", options: ["A", "B", "C"] },
      { name: "website", label: "Website" },
    ], (v, close) => {
      S.create("client", { name: v.name, industry: v.industry, city: v.city, tier: v.tier, website: v.website, status: "active", since: Date.now(), ownerId: S.meId, satisfaction: 8.0, notes: "" }, "Created client — " + v.name);
      close(); ui.toast("Client created.", "good"); OM.router.refresh();
    }));
  };

  OM.pages.client = function (el, id, tab) {
    const c = S.find("client", id);
    if (!c || !S.can("view", "client", c)) { el.innerHTML = ui.empty("Client not found or not accessible.", "⚠"); return; }
    tab = tab || "overview";
    const me = S.me();
    const cProjects = S.db.projects.filter((p) => p.clientId === c.id);
    const cInvoices = S.db.invoices.filter((i) => i.clientId === c.id);
    const cComms = S.db.comms.filter((x) => x.clientId === c.id).sort((a, b) => b.ts - a.ts);
    const cContacts = S.db.contacts.filter((x) => x.clientId === c.id);
    const cDocs = S.db.documents.filter((d) => d.clientId === c.id && S.can("view", "document", d));
    const cTasks = S.db.tasks.filter((t) => cProjects.some((p) => p.id === t.projectId));
    const cMeetings = S.db.meetings.filter((m) => m.clientId === c.id);
    const cContracts = S.db.contracts.filter((k) => k.clientId === c.id);
    const cProposals = S.db.proposals.filter((k) => k.clientId === c.id);
    const cClientMessages = S.db.clientMessages.filter((m) => m.clientId === c.id);
    const showFinance = S.isExec(me) || S.moduleAccess("finance") || me.dept === "Sales";
    const canSeeContracts = S.can("view", "contract", { projectId: null }) || cProjects.some((p) => S.can("view", "contract", { projectId: p.id }));
    const canMessageClient = S.isExec(me) || c.ownerId === me.id || cProjects.some((p) => p.leadId === me.id || (p.team || []).includes(me.id));
    const revenueYTD = M.revenueByClientYTD().find((r) => r.client.id === c.id);

    el.innerHTML = ui.pageHead(esc(c.name),
      `${esc(c.industry)} · ${esc(c.city)} · client since ${U.date(c.since)} · owner ${esc(S.userName(c.ownerId))}`,
      `${ui.badge(c.status)} ${c.tier ? `<span class="tier tier-${c.tier}">${c.tier}</span>` : ""}
       ${S.can("edit", "client", c) ? `<button class="btn btn-ghost" id="editClient">Edit</button>` : ""}
       ${S.can("delete", "client", c) ? `<button class="btn btn-danger-ghost" id="delClient">Delete</button>` : ""}`) +
      `<div id="ctabs"></div><div id="cbody" class="tab-body"></div>`;

    const tabDefs = [
      { id: "overview", label: "Overview" }, { id: "contacts", label: "Contacts", count: cContacts.length },
      { id: "projects", label: "Projects", count: cProjects.length },
      showFinance ? { id: "invoices", label: "Invoices", count: cInvoices.length } : null,
      canSeeContracts ? { id: "contracts", label: "Contracts & Proposals", count: cContracts.length + cProposals.length } : null,
      { id: "comms", label: "Communications", count: cComms.length },
      (canMessageClient || cClientMessages.length) ? { id: "clientmsgs", label: "Client Portal Messages", count: cClientMessages.filter((m) => !m.readAt && m.recipientId === me.id).length } : null,
      { id: "files", label: "Files", count: cDocs.length }, { id: "notes", label: "Notes" },
    ].filter(Boolean);
    ui.tabs(el.querySelector("#ctabs"), tabDefs, tab, (t) => (location.hash = "#/client/" + id + "/" + t));
    const body = el.querySelector("#cbody");

    if (tab === "overview") {
      const openAR = cInvoices.filter((i) => ["sent", "overdue", "viewed", "partial"].includes(i.status)).reduce((s, i) => s + i.total, 0);
      body.innerHTML = ui.kpi([
        { label: "Revenue YTD", value: showFinance ? U.money(revenueYTD ? revenueYTD.amt : 0, { compact: true }) : "—" },
        { label: "Open AR", value: showFinance ? U.money(openAR, { compact: true }) : "—", tone: cInvoices.some((i) => i.status === "overdue") ? "bad" : null, sub: cInvoices.some((i) => i.status === "overdue") ? "Overdue invoice on account" : "" },
        { label: "Active projects", value: cProjects.filter((p) => p.status === "active").length },
        { label: "Satisfaction", value: c.satisfaction != null ? c.satisfaction + "/10" : "—", tone: c.satisfaction >= 9 ? "good" : c.satisfaction != null && c.satisfaction < 7.5 ? "warn" : null },
      ]) + `<div class="grid-2">
        <div>${ui.sectionCard("Latest communications", cComms.slice(0, 6).map(commRow).join("") || ui.empty("No communications logged."), { action: `<a class="link" href="#/client/${c.id}/comms">All →</a>` })}</div>
        <div>${ui.sectionCard("Open work", cTasks.filter((t) => t.status !== "done").slice(0, 6).map(taskRow).join("") || ui.empty("No open tasks."))}
        ${ui.sectionCard("Upcoming meetings", cMeetings.filter((m) => m.ts > Date.now()).map((m) => `<div class="list-row"><span class="list-icon">◫</span><span class="list-main"><b>${esc(m.title)}</b><span class="muted">${U.dateTime(m.ts)}</span></span></div>`).join("") || ui.empty("Nothing scheduled."))}</div>
      </div>`;
    } else if (tab === "contacts") {
      body.innerHTML = `<div class="card card-flush">` + cContacts.map((ct) => `
        <div class="list-row"><span class="avatar" style="--av:#3a3a42">${U.initials(ct.name)}</span>
        <span class="list-main"><b>${esc(ct.name)}${ct.primary ? ' <span class="badge tone-info">Primary</span>' : ""}</b><span class="muted">${esc(ct.title)}</span></span>
        <span class="muted">${esc(ct.email)}<br>${esc(ct.phone)}</span></div>`).join("") + "</div>" +
        (S.can("edit", "client", c) ? `<div class="row-gap"><button class="btn btn-ghost" id="addContact">+ Add contact</button></div>` : "");
      const ac = body.querySelector("#addContact");
      if (ac) ac.addEventListener("click", () => ui.formModal("Add contact", [
        { name: "name", label: "Name", required: true }, { name: "title", label: "Title" },
        { name: "email", label: "Email", type: "email" }, { name: "phone", label: "Phone" },
      ], (v, close) => {
        S.create("contact", { clientId: c.id, name: v.name, title: v.title, email: v.email, phone: v.phone }, "Added contact " + v.name + " to " + c.name);
        close(); OM.router.refresh();
      }));
    } else if (tab === "projects") {
      body.innerHTML = cProjects.length ? `<div class="card card-flush">` + cProjects.map((p) => `
        <div class="list-row clickable" onclick="location.hash='#/project/${p.id}'"><span class="list-main"><b>${esc(p.name)}</b><span class="muted">${esc(p.code)} · ${esc(p.service)} · due ${U.dateShort(p.dueDate)}</span></span>${ch.meter(p.progress)}${ui.badge(p.status === "active" ? p.health : p.status)}</div>`).join("") + "</div>" : ui.empty("No projects for this client yet.");
    } else if (tab === "invoices") {
      body.innerHTML = `<div class="card card-flush" id="cinv"></div>`;
      ui.table(body.querySelector("#cinv"), {
        rows: () => cInvoices, searchKeys: ["number", "memo"], exportName: c.name.replace(/\W+/g, "-") + "-invoices", exportEntity: "invoice",
        defaultSort: { key: "issuedAt", dir: -1 },
        columns: [
          { key: "number", label: "Invoice", render: (i) => `<span class="mono">${esc(i.number)}</span>` },
          { key: "memo", label: "Memo" },
          { key: "total", label: "Total", render: (i) => U.money(i.total), sortVal: (i) => i.total },
          { key: "issuedAt", label: "Issued", render: (i) => U.date(i.issuedAt), sortVal: (i) => i.issuedAt },
          { key: "dueAt", label: "Due", render: (i) => U.date(i.dueAt), sortVal: (i) => i.dueAt },
          { key: "status", label: "Status", render: (i) => ui.badge(i.status) },
        ],
      });
    } else if (tab === "contracts") {
      renderContractsProposals(body, c, cContracts, cProposals, cProjects);
    } else if (tab === "clientmsgs") {
      renderClientMessagesPanel(body, c, canMessageClient);
    } else if (tab === "comms") {
      renderCommsPanel(body, () => S.db.comms.filter((x) => x.clientId === c.id), { clientId: c.id });
    } else if (tab === "files") {
      body.innerHTML = `<div class="card card-flush">` + (cDocs.map((d) => `
        <div class="list-row"><span class="file-icon">${d.type.toUpperCase()}</span><span class="list-main"><b>${esc(d.name)}</b><span class="muted">${esc(d.category)} · v${d.version} · ${U.fileSize(d.size)} · ${esc(S.userName(d.uploadedBy))}</span></span><span class="muted">${U.date(d.uploadedAt)}</span>${d.storagePath ? `<button class="btn btn-ghost btn-sm" data-open="${d.id}">⤓</button>` : ""}</div>`).join("") || ui.empty("No files.")) + "</div>" +
        (S.can("create", "document") ? `<div class="row-gap"><button class="btn btn-ghost" onclick="OM.actions.uploadDoc(null,'${c.id}')">+ Upload</button></div>` : "");
      body.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => OM.actions.openAttachment(S.find("document", b.dataset.open).storagePath)));
    } else if (tab === "notes") {
      body.innerHTML = ui.sectionCard("Account notes", `
        <textarea id="cNotes" rows="6" ${S.can("edit", "client", c) ? "" : "disabled"}>${esc(c.notes || "")}</textarea>
        ${S.can("edit", "client", c) ? `<div class="row-gap"><button class="btn btn-gold" id="saveNotes">Save notes</button></div>` : ""}`);
      const sv = body.querySelector("#saveNotes");
      if (sv) sv.addEventListener("click", () => {
        S.update("client", c.id, { notes: body.querySelector("#cNotes").value }, "Updated account notes — " + c.name);
        ui.toast("Notes saved.", "good");
      });
    }
    const delBtn = el.querySelector("#delClient");
    if (delBtn) delBtn.addEventListener("click", () => ui.confirmModal("Delete client", `Delete "<b>${esc(c.name)}</b>"? This removes their projects, invoices, and files too. This is recorded in the audit log.`, (reason) => {
      S.remove("client", c.id, reason);
      ui.toast("Client deleted.", "good");
      location.hash = "#/clients";
    }, { danger: true, reason: true, okLabel: "Delete" }));
    const editBtn = el.querySelector("#editClient");
    if (editBtn) editBtn.addEventListener("click", () => ui.formModal("Edit " + c.name, [
      { name: "name", label: "Company name", value: c.name, required: true, span2: true },
      { name: "industry", label: "Industry", value: c.industry },
      { name: "city", label: "City", value: c.city },
      { name: "tier", label: "Tier", type: "select", options: ["A", "B", "C"], value: c.tier },
      { name: "website", label: "Website", value: c.website },
      { name: "ownerId", label: "Account owner", type: "user", value: c.ownerId },
      { name: "status", label: "Status", type: "select", options: [["active", "Active"], ["paused", "Paused"], ["archived", "Archived"]], value: c.status },
      { name: "satisfaction", label: "Satisfaction (0-10)", type: "number", value: c.satisfaction, step: "0.1" },
    ], (v, close) => {
      S.update("client", c.id, { name: v.name, industry: v.industry, city: v.city, tier: v.tier, website: v.website, ownerId: v.ownerId, status: v.status, satisfaction: +v.satisfaction }, "Updated client — " + v.name);
      close(); ui.toast("Client updated.", "good"); OM.router.refresh();
    }, { wide: true }));
  };

  /* ================= CONTRACTS & PROPOSALS (staff-side) =================
     Contract: Draft -> Internal Review -> Approved to Send -> Sent -> (client
     views/signs) -> staff Countersigns -> Active -> Expired/Archived.
     Proposal: Draft -> Internal Review -> Approved -> Sent -> (client
     accepts/rejects — accepting spawns a project/contract/invoice via the
     accept_proposal RPC). CEO/CFO/exec sign-off is required for the two
     approval transitions, matching "CEO/CFO/Executive approve" in the spec. */
  const CONTRACT_NEXT = {
    draft: [["internal_review", "Submit for review"]],
    internal_review: [["approved_to_send", "Approve to send"], ["draft", "Send back"]],
    approved_to_send: [["sent", "Send to client"]],
    sent: [], viewed: [], signed: [], countersigned: [], active: [], expired: [], archived: [],
  };
  const PROPOSAL_NEXT = {
    draft: [["internal_review", "Submit for review"]],
    internal_review: [["approved", "Approve"], ["draft", "Send back"]],
    approved: [["sent", "Send to client"]],
    sent: [], viewed: [], accepted: [], rejected: [], expired: [],
  };
  function canFireExecTransition(status, next) {
    const me = S.me();
    if ((status === "internal_review" && (next === "approved_to_send" || next === "approved"))) return S.isExec(me);
    return true;
  }

  // Staff-side view of the client_messages thread the client portal writes
  // to (js/pages_client.js CP.pages.messages) — otherwise a client's message
  // is only reachable via a raw query, invisible to anyone in the staff app.
  function renderClientMessagesPanel(body, c, canReply) {
    const me = S.me();
    const clientUsers = S.db.users.filter((u) => u.portalType === "client" && u.clientId === c.id);
    let activeContact = clientUsers[0] ? clientUsers[0].id : null;
    function draw() {
      const thread = activeContact ? S.db.clientMessages.filter((m) => m.clientId === c.id && (m.senderId === activeContact || m.recipientId === activeContact)).sort((a, b) => a.createdAt - b.createdAt) : [];
      body.innerHTML = `<div class="grid-2" style="grid-template-columns:220px 1fr">
        <div class="card card-flush">${clientUsers.map((u) => `<div class="list-row clickable ${u.id === activeContact ? "active-contact" : ""}" data-c="${u.id}">${ui.avatar(u)}<span class="list-main"><b>${esc(u.name)}</b></span></div>`).join("") || ui.empty("No client portal users yet.")}</div>
        <div>
          <div class="card" style="max-height:440px;overflow-y:auto">${thread.map((m) => `<div class="comment"><div><div class="comment-head"><b>${esc(S.userName(m.senderId))}</b><span class="muted">${U.ago(m.createdAt)}</span></div><div class="comment-body">${esc(m.body)}</div></div></div>`).join("") || ui.empty(activeContact ? "No messages yet." : "Select a contact.")}</div>
          ${activeContact && canReply ? `<div class="inline-add"><input type="text" id="cmBody" placeholder="Reply…"><button class="btn btn-gold btn-sm" id="cmSend">Send</button></div>` : ""}
        </div>
      </div>`;
      body.querySelectorAll("[data-c]").forEach((r) => r.addEventListener("click", () => {
        activeContact = r.dataset.c;
        S.db.clientMessages.filter((m) => m.recipientId === me.id && m.senderId === activeContact && !m.readAt).forEach((m) => S.update("clientMessage", m.id, { readAt: Date.now() }, "Read client message"));
        draw();
      }));
      const sendBtn = body.querySelector("#cmSend");
      if (sendBtn) sendBtn.addEventListener("click", () => {
        const input = body.querySelector("#cmBody");
        const val = input.value.trim();
        if (!val) return;
        try {
          S.create("clientMessage", { clientId: c.id, senderId: me.id, recipientId: activeContact, body: val }, "Replied to " + S.userName(activeContact));
          draw();
        } catch (e) { ui.toast(e.message, "bad"); }
      });
    }
    draw();
  }

  function renderContractsProposals(body, c, contracts, proposals, projects) {
    const canCreate = S.can("create", "proposal", null);
    body.innerHTML =
      ui.sectionCard("Proposals", proposals.map((p) => `
        <div class="list-row clickable" data-proposal="${p.id}"><span class="list-icon">◈</span>
          <span class="list-main"><b>${esc(p.title)}</b><span class="muted">${p.price ? U.money(p.price) : ""}</span></span>${ui.badge(p.status)}</div>`).join("")
        || ui.empty("No proposals yet."), { action: canCreate ? '<button class="btn btn-gold btn-sm" id="newProposal">+ New proposal</button>' : "" }) +
      ui.sectionCard("Contracts", contracts.map((k) => `
        <div class="list-row clickable" data-contract="${k.id}"><span class="list-icon">✎</span>
          <span class="list-main"><b>${esc(k.title)}</b><span class="muted">${k.signatureName ? "Signed by " + esc(k.signatureName) : ""}</span></span>${ui.badge(k.status)}</div>`).join("")
        || ui.empty("No contracts yet."), { action: canCreate ? '<button class="btn btn-gold btn-sm" id="newContract">+ New contract</button>' : "" });

    const np = body.querySelector("#newProposal");
    if (np) np.addEventListener("click", () => ui.formModal("New proposal", [
      { name: "title", label: "Title", required: true, span2: true },
      { name: "scope", label: "Scope of work", type: "textarea", span2: true },
      { name: "timeline", label: "Timeline", placeholder: "e.g. 6 weeks from kickoff" },
      { name: "deliverablesSummary", label: "Deliverables", placeholder: "e.g. 3 videos, 10 photos" },
      { name: "price", label: "Price ($)", type: "number", required: true },
      { name: "paymentTerms", label: "Payment terms", placeholder: "e.g. 50% deposit, 50% on delivery" },
      { name: "addons", label: "Optional add-ons", type: "textarea", span2: true },
      { name: "expiresDays", label: "Expires in (days)", type: "number", value: 30 },
    ], (v, close) => {
      S.create("proposal", {
        clientId: c.id, title: v.title, status: "draft", scope: v.scope, timeline: v.timeline,
        deliverablesSummary: v.deliverablesSummary, price: +v.price, paymentTerms: v.paymentTerms, addons: v.addons,
        createdBy: S.meId, expiresAt: v.expiresDays !== "" ? Date.now() + (+v.expiresDays) * U.DAY : null,
      }, "Drafted proposal — " + v.title + " for " + c.name);
      close(); ui.toast("Proposal drafted.", "good"); OM.router.refresh();
    }, { wide: true }));

    const nc = body.querySelector("#newContract");
    if (nc) nc.addEventListener("click", () => ui.formModal("New contract", [
      { name: "title", label: "Title", required: true, span2: true },
      { name: "projectId", label: "Project", type: "select", options: [["", "— None —"]].concat(projects.map((p) => [p.id, p.code + " · " + p.name])) },
      { name: "body", label: "Contract terms", type: "textarea", span2: true, rows: 8 },
      { name: "expiresDays", label: "Expires in (days)", type: "number", value: 30 },
    ], (v, close) => {
      S.create("contract", {
        clientId: c.id, projectId: v.projectId || null, title: v.title, status: "draft", body: v.body,
        createdBy: S.meId, expiresAt: v.expiresDays !== "" ? Date.now() + (+v.expiresDays) * U.DAY : null,
      }, "Drafted contract — " + v.title + " for " + c.name);
      close(); ui.toast("Contract drafted.", "good"); OM.router.refresh();
    }, { wide: true }));

    body.querySelectorAll("[data-proposal]").forEach((row) => row.addEventListener("click", () => proposalDetailModal(S.find("proposal", row.dataset.proposal), c)));
    body.querySelectorAll("[data-contract]").forEach((row) => row.addEventListener("click", () => contractDetailModal(S.find("contract", row.dataset.contract), c)));
  }

  function proposalDetailModal(pr, c) {
    if (!pr) return;
    const nextOptions = S.can("edit", "proposal", pr) ? (PROPOSAL_NEXT[pr.status] || []).filter(([next]) => canFireExecTransition(pr.status, next)) : [];
    const m = ui.modal(pr.title, `
      <div class="detail-grid">
        <div><span class="detail-label">Status</span><b>${ui.badge(pr.status)}</b></div>
        <div><span class="detail-label">Price</span><b>${pr.price ? U.money(pr.price) : "—"}</b></div>
        <div><span class="detail-label">Timeline</span><b>${esc(pr.timeline || "—")}</b></div>
        <div><span class="detail-label">Payment terms</span><b>${esc(pr.paymentTerms || "—")}</b></div>
        <div><span class="detail-label">Sent</span><b>${pr.sentAt ? U.date(pr.sentAt) : "—"}</b></div>
        <div><span class="detail-label">Responded</span><b>${pr.respondedAt ? U.date(pr.respondedAt) : "—"}</b></div>
      </div>
      ${pr.scope ? `<h4 class="modal-sub">Scope</h4><p class="body-text">${esc(pr.scope)}</p>` : ""}
      ${pr.deliverablesSummary ? `<h4 class="modal-sub">Deliverables</h4><p class="body-text">${esc(pr.deliverablesSummary)}</p>` : ""}
      ${pr.addons ? `<h4 class="modal-sub">Add-ons</h4><p class="body-text">${esc(pr.addons)}</p>` : ""}
      ${pr.status === "accepted" ? `<div class="inline-note">Accepted — a project, contract, and invoice were generated automatically.</div>` : ""}
    `, { wide: true, footer: nextOptions.map(([next, label]) => `<button class="btn ${next === "draft" ? "btn-ghost" : "btn-gold"}" data-next="${next}">${esc(label)}</button>`).join("") + `<button class="btn btn-ghost" data-role="cancel2">Close</button>` });
    m.el.querySelector('[data-role="cancel2"]').addEventListener("click", m.close);
    m.el.querySelectorAll("[data-next]").forEach((b) => b.addEventListener("click", () => {
      const next = b.dataset.next;
      const patch = { status: next };
      if (next === "sent") patch.sentAt = Date.now();
      S.update("proposal", pr.id, patch, "Moved proposal \"" + pr.title + "\" → " + U.cap(next));
      if (next === "sent") {
        const staffIds = S.db.users.filter((u) => u.portalType === "client" && u.clientId === c.id).map((u) => u.id);
        if (staffIds.length) S.notify(staffIds, "proposal", "New proposal: " + pr.title, c.name, "#/c/proposals");
      }
      m.close(); ui.toast("Proposal moved to " + U.cap(next) + ".", "good"); OM.router.refresh();
    }));
  }

  function contractDetailModal(k, c) {
    if (!k) return;
    const nextOptions = S.can("edit", "contract", k) ? (CONTRACT_NEXT[k.status] || []).filter(([next]) => canFireExecTransition(k.status, next)) : [];
    const canCountersign = k.status === "signed" && S.isExec(S.me());
    const m = ui.modal(k.title, `
      <div class="detail-grid">
        <div><span class="detail-label">Status</span><b>${ui.badge(k.status)}</b></div>
        <div><span class="detail-label">Expires</span><b>${k.expiresAt ? U.date(k.expiresAt) : "—"}</b></div>
        <div><span class="detail-label">Sent</span><b>${k.sentAt ? U.date(k.sentAt) : "—"}</b></div>
        <div><span class="detail-label">Signed</span><b>${k.signedAt ? U.date(k.signedAt) + " by " + esc(k.signatureName || "") : "—"}</b></div>
        <div><span class="detail-label">Countersigned</span><b>${k.countersignedAt ? U.date(k.countersignedAt) : "—"}</b></div>
      </div>
      ${k.body ? `<h4 class="modal-sub">Terms</h4><p class="body-text">${esc(k.body)}</p>` : ""}
    `, {
      wide: true,
      footer: nextOptions.map(([next, label]) => `<button class="btn ${next === "draft" ? "btn-ghost" : "btn-gold"}" data-next="${next}">${esc(label)}</button>`).join("")
        + (canCountersign ? `<button class="btn btn-gold" id="ctrCountersign">Countersign</button>` : "")
        + `<button class="btn btn-ghost" data-role="cancel2">Close</button>`,
    });
    m.el.querySelector('[data-role="cancel2"]').addEventListener("click", m.close);
    m.el.querySelectorAll("[data-next]").forEach((b) => b.addEventListener("click", () => {
      const next = b.dataset.next;
      const patch = { status: next };
      if (next === "sent") patch.sentAt = Date.now();
      S.update("contract", k.id, patch, "Moved contract \"" + k.title + "\" → " + U.cap(next));
      if (next === "sent") {
        const staffIds = S.db.users.filter((u) => u.portalType === "client" && u.clientId === c.id).map((u) => u.id);
        if (staffIds.length) S.notify(staffIds, "contract", "New contract to review: " + k.title, c.name, "#/c/contracts");
      }
      m.close(); ui.toast("Contract moved to " + U.cap(next) + ".", "good"); OM.router.refresh();
    }));
    const cs = m.el.querySelector("#ctrCountersign");
    if (cs) cs.addEventListener("click", () => {
      S.countersignContract(k.id).then(() => { ui.toast("Contract countersigned — now active.", "good"); OM.router.refresh(); }).catch((e) => ui.toast(e.message, "bad"));
      m.close();
    });
  }

  /* Shared communications panel (used on client profile + comms module) */
  const KINDS = [["call", "☎ Call"], ["email", "✉ Email"], ["meeting", "◫ Meeting"], ["sms", "▤ Text"], ["voice_note", "♪ Voice note"], ["note", "✎ Internal note"]];
  function commRow(cm) {
    const who = cm.leadId ? (S.find("lead", cm.leadId) || {}).company : cm.clientId ? (S.find("client", cm.clientId) || {}).name : "";
    return `<div class="list-row">
      <span class="list-icon">${ui.KIND_ICONS[cm.kind] || "•"}</span>
      <span class="list-main"><b>${U.cap(cm.kind)}${who ? " — " + esc(who) : ""}</b><span class="muted">${esc((cm.notes || "").slice(0, 110))}</span>
      <span class="muted">${esc(S.userName(cm.userId))} · ${U.dateTime(cm.ts)}${cm.durationSec ? " · " + U.dur(cm.durationSec) : ""}${cm.recording ? ' · <span class="link">▶ recording</span>' : ""}</span></span>
      ${cm.outcome ? ui.badge(cm.outcome) : ""}</div>`;
  }
  function renderCommsPanel(host, rowsFn, ctx = {}) {
    const kinds = ["all"].concat(KINDS.map((k) => k[0]));
    let active = "all";
    function draw() {
      const rows = rowsFn().filter((r) => active === "all" || r.kind === active).sort((a, b) => b.ts - a.ts);
      host.innerHTML = `<div class="tab-row sub-tabs">${kinds.map((k) => `<button class="tab ${k === active ? "active" : ""}" data-k="${k}">${k === "all" ? "All" : U.cap(k)}</button>`).join("")}
        <span class="flex-spacer"></span>
        ${S.can("create", "comm", ctx) ? `<button class="btn btn-gold btn-sm" id="logComm">+ Log communication</button>` : ""}</div>
        <div class="card card-flush">${rows.slice(0, 60).map(commRow).join("") || ui.empty("No communications of this type.")}</div>`;
      host.querySelectorAll("[data-k]").forEach((b) => b.addEventListener("click", () => { active = b.dataset.k; draw(); }));
      const lg = host.querySelector("#logComm");
      if (lg) lg.addEventListener("click", () => ui.formModal("Log communication", [
        { name: "kind", label: "Type", type: "select", options: KINDS },
        ctx.clientId ? null : { name: "clientId", label: "Client", type: "select", options: [["", "—"]].concat(S.db.clients.map((x) => [x.id, x.name])) },
        { name: "durationMin", label: "Duration (min)", type: "number" },
        { name: "notes", label: "Notes", type: "textarea", required: true, span2: true },
        { name: "followUpDays", label: "Follow up in (days)", type: "number", hint: "Leave blank for none" },
      ].filter(Boolean), (v, close) => {
        const rec = { kind: v.kind, direction: "outbound", clientId: ctx.clientId || v.clientId || null, leadId: ctx.leadId || null, userId: S.meId, ts: Date.now(), durationSec: v.durationMin ? +v.durationMin * 60 : null, notes: v.notes, outcome: null, followUpAt: v.followUpDays ? Date.now() + (+v.followUpDays) * U.DAY : null };
        S.create("comm", rec, "Logged " + v.kind + (rec.clientId ? " — " + (S.find("client", rec.clientId) || {}).name : ""));
        close(); ui.toast("Logged.", "good"); draw();
      }));
    }
    draw();
  }
  OM.renderCommsPanel = renderCommsPanel;
  OM.commRow = commRow;

  /* ================= CALENDAR ================= */
  OM.pages.calendar = function (el) {
    const me = S.me();
    const items = [];
    S.db.meetings.forEach((m) => {
      const invited = m.attendees === "all" || (m.attendees || []).includes(me.id) || S.isExec(me);
      if (m.private && !invited) return;
      if (invited) items.push({ ts: m.ts, kind: "meeting", label: m.title, sub: (m.location || "") + " · " + (m.durationMin || 30) + "m", meetingId: m.id });
    });
    S.db.projects.filter((p) => p.status === "active" && (S.isExec(me) || S.myProjectIds().has(p.id))).forEach((p) => items.push({ ts: p.dueDate, kind: "deadline", label: p.name + " — delivery", sub: p.code, link: "#/project/" + p.id }));
    S.db.tasks.filter((t) => t.dueDate && t.status !== "done" && (isMyTask(t, me) || S.isExec(me))).forEach((t) => items.push({ ts: t.dueDate, kind: "task", label: t.title, sub: "Task due", link: "#/task/" + t.id }));
    S.db.timeOff.filter((t) => t.status === "approved" && t.start > Date.now() - 7 * U.DAY).forEach((t) => items.push({ ts: t.start, kind: "timeoff", label: S.userName(t.userId) + " — " + t.type, sub: t.days + " day" + (t.days > 1 ? "s" : "") }));
    const payp = M.payrollDue();
    if (payp && (S.isExec(me) || me.dept === "Finance")) items.push({ ts: payp.runDate, kind: "finance", label: "Payroll run", sub: U.money(payp.total) });

    const byDay = {};
    items.filter((i) => i.ts >= U.startOfDay(Date.now())).sort((a, b) => a.ts - b.ts).forEach((i) => {
      const k = U.startOfDay(i.ts);
      (byDay[k] = byDay[k] || []).push(i);
    });
    const icons = { meeting: "◫", deadline: "▣", task: "☑", timeoff: "✈", finance: "$" };
    el.innerHTML = ui.pageHead("Company calendar", "Meetings, deliveries, deadlines, and time off — next 30 days",
        S.can("create", "meeting") ? `<button class="btn btn-gold" id="newMeeting">+ New meeting</button>` : "") +
      (Object.keys(byDay).length ? Object.entries(byDay).slice(0, 30).map(([day, evts]) => {
        const d = new Date(+day);
        const isToday = U.sameDay(+day, Date.now());
        return `<div class="cal-day ${isToday ? "today" : ""}">
          <div class="cal-date"><b>${d.toLocaleDateString("en-US", { weekday: "short" })}</b><span>${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>${isToday ? '<span class="badge tone-info">Today</span>' : ""}</div>
          <div class="cal-events">${evts.map((e) => `<div class="cal-event ${(e.link || e.meetingId) ? "clickable" : ""}" ${e.link ? `onclick="location.hash='${e.link}'"` : ""} ${e.meetingId ? `data-meeting="${e.meetingId}"` : ""}><span class="list-icon">${icons[e.kind] || "•"}</span><span class="list-main"><b>${esc(e.label)}</b><span class="muted">${U.time(e.ts)} · ${esc(e.sub || "")}</span></span></div>`).join("")}</div>
        </div>`;
      }).join("") : ui.empty("Nothing on the calendar."));
    const nm = el.querySelector("#newMeeting");
    if (nm) nm.addEventListener("click", () => meetingModal());
    el.querySelectorAll("[data-meeting]").forEach((row) => row.addEventListener("click", () => meetingModal(S.find("meeting", row.dataset.meeting))));
  };

  /* ================= MEETINGS (create/edit) =================
     Attendee options are scoped by role: executives can invite anyone
     (staff or client); a department head can invite their own department
     plus any client; everyone else invites staff only — matching "execs
     schedule with everything, dept heads with their dept + clients." */
  function meetingModal(m) {
    const me = S.me();
    const isExec = S.isExec(me);
    const isOwnerOrExec = !m || isExec || m.ownerId === me.id;
    const attendeeFilter = (u) => {
      if (u.portalType === "client") return isExec || me.role === "dept_head";
      if (me.role === "dept_head" && !isExec) return u.dept === me.dept || u.id === me.id;
      return true;
    };
    const fields = [
      { name: "title", label: "Title", value: m && m.title, required: true, span2: true },
      { name: "startsAt", label: "Date & time", type: "datetime-local", required: true, value: m ? new Date(m.ts - new Date(m.ts).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "" },
      { name: "durationMin", label: "Duration (min)", type: "number", value: m ? m.durationMin : 30 },
      { name: "location", label: "Location / link", value: m && m.location, placeholder: "Conference room, Zoom link…" },
      { name: "clientId", label: "Client (optional)", type: "select", options: [["", "— None —"]].concat(S.db.clients.map((c) => [c.id, c.name])), value: m && m.clientId },
      { name: "projectId", label: "Project (optional)", type: "select", options: [["", "— None —"]].concat(S.db.projects.filter((p) => p.status !== "archived").map((p) => [p.id, p.code + " · " + p.name])), value: m && m.projectId },
      { name: "attendeeIds", label: "Attendees", type: "userMulti", span2: true, filter: attendeeFilter, value: m && Array.isArray(m.attendees) ? m.attendees : [] },
      { name: "private", label: "Private (attendees only)", type: "select", options: [["false", "No — visible company-wide"], ["true", "Yes — attendees only"]], value: m ? String(!!m.private) : "false" },
    ];
    const modalRef = ui.formModal(m ? "Edit meeting" : "New meeting", fields, (v, close) => {
      const assigneeIds = assigneeIdsFrom({ assigneeIds: v.attendeeIds });
      const patch = {
        title: v.title, ts: new Date(v.startsAt).getTime(), durationMin: +v.durationMin || 30,
        location: v.location || null, clientId: v.clientId || null, projectId: v.projectId || null,
        private: v.private === "true",
      };
      if (m) {
        S.update("meeting", m.id, patch, "Updated meeting — " + v.title);
        S.setMeetingAttendees(m.id, assigneeIds);
      } else {
        const created = S.create("meeting", Object.assign({ ownerId: me.id, attendees: assigneeIds, recurring: null, allStaff: false }, patch), "Scheduled meeting — " + v.title);
        if (assigneeIds.length) S.notify(assigneeIds, "meeting", "Invited: " + v.title, U.dateTime(patch.ts), "#/calendar");
      }
      close(); ui.toast(m ? "Meeting updated." : "Meeting scheduled.", "good"); OM.router.refresh();
    }, {
      wide: true,
      footer: (m && (isOwnerOrExec || S.can("delete", "meeting", m))) ? `<button class="btn btn-danger-ghost" id="delMeeting">Delete meeting</button>` : undefined,
    });
    if (m) {
      const del = modalRef.el.querySelector("#delMeeting");
      if (del) del.addEventListener("click", () => ui.confirmModal("Delete meeting", `Cancel "<b>${esc(m.title)}</b>"? This is recorded in the audit log.`, (reason) => {
        S.remove("meeting", m.id, reason);
        modalRef.close();
        ui.toast("Meeting cancelled.", "good"); OM.router.refresh();
      }, { danger: true, reason: true, okLabel: "Delete" }));
    }
  }

  /* ================= DIRECTORY ================= */
  OM.pages.directory = function (el) {
    const depts = [...new Set(S.db.users.map((u) => u.dept))];
    el.innerHTML = ui.pageHead("Team directory", S.db.users.filter((u) => u.status === "active").length + " people across " + depts.length + " departments") +
      depts.map((d) => `
        <h3 class="dir-dept">${esc(d)}</h3>
        <div class="dir-grid">${S.db.users.filter((u) => u.dept === d && u.status === "active").sort((a, b) => OM.ROLES[b.role].level - OM.ROLES[a.role].level).map((u) => `
          <div class="card dir-card">
            ${ui.avatar(u, "lg")}
            <div class="dir-info"><b>${esc(u.name)}</b><span class="muted">${esc(u.title)}</span>
            <span class="badge tone-${OM.ROLES[u.role].exec ? "warn" : "neutral"}">${OM.ROLES[u.role].label}</span></div>
            <div class="dir-contact muted">${esc(u.email)}<br>${esc(u.phone)}</div>
          </div>`).join("")}</div>`).join("");
  };
})();
