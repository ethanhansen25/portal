/* Oakframe Media OS — Finance, HR, Equipment, Library, Approvals, Audit, Notifications, Settings */
(function () {
  const OM = window.OM;
  const U = OM.util, ui = OM.ui, ch = OM.charts;
  const S = OM.store, M = OM.metrics;
  const esc = U.esc;

  /* ================= FINANCE ================= */
  OM.pages.finance = function (el, tab) {
    if (!S.moduleAccess("finance")) { el.innerHTML = ui.empty("Finance is restricted to the Finance department and executives.", "🔒"); return; }
    tab = tab || "overview";
    el.innerHTML = ui.pageHead("Finance", "Revenue, invoicing, spend, payroll, and budgets") + `<div id="ftabs"></div><div id="fbody" class="tab-body"></div>`;
    ui.tabs(el.querySelector("#ftabs"), [
      { id: "overview", label: "Overview" },
      { id: "invoices", label: "Invoices", count: M.outstanding().length },
      { id: "expenses", label: "Expenses", count: S.db.expenses.filter((e) => e.status === "pending").length },
      { id: "payroll", label: "Payroll" },
      { id: "budgets", label: "Budgets" },
      { id: "reports", label: "Reports" },
    ], tab, (t) => (location.hash = "#/finance/" + t));
    const body = el.querySelector("#fbody");

    if (tab === "overview") {
      const series = M.monthlySeries(12);
      const mtd = M.revenueMTD(), emtd = M.expensesMTD();
      body.innerHTML = ui.kpi([
        { label: "Revenue MTD", value: U.money(mtd, { compact: true }), spark: ch.spark(series.map((s2) => s2.revenue)) },
        { label: "Revenue YTD", value: U.money(M.revenueYTD(), { compact: true }) },
        { label: "Expenses MTD", value: U.money(emtd, { compact: true }) },
        { label: "Net MTD", value: U.money(mtd - emtd, { compact: true }), tone: mtd - emtd >= 0 ? "good" : "bad" },
        { label: "Accounts receivable", value: U.money(M.arTotal(), { compact: true }), sub: M.overdue().length + " overdue", tone: M.overdue().length ? "warn" : null, link: "#/finance/invoices" },
      ]) + `<div class="grid-2">
        <div>${ui.sectionCard("Revenue vs expenses — 12 months", '<div id="revChart"></div>')}</div>
        <div>${ui.sectionCard("Expenses by category — 90 days", '<div id="expChart"></div>')}</div>
      </div>`;
      ch.line(body.querySelector("#revChart"), { labels: series.map((s2) => s2.label), series: [{ name: "Revenue", values: series.map((s2) => s2.revenue) }, { name: "Expenses", values: series.map((s2) => s2.expenses) }], money: true }, { height: 240 });
      ch.donut(body.querySelector("#expChart"), M.expenseByCategory(90).slice(0, 6), { money: true, fmt: (v) => U.money(v, { compact: true }), center: U.money(M.expenseByCategory(90).reduce((s2, x) => s2 + x.value, 0), { compact: true }), centerSub: "90-day spend" });
    } else if (tab === "invoices") {
      body.innerHTML = `<div class="card card-flush" id="invTbl"></div>`;
      ui.table(body.querySelector("#invTbl"), {
        rows: () => S.db.invoices,
        searchKeys: ["number", "memo", (i) => { const c = S.find("client", i.clientId); return c ? c.name : ""; }],
        exportName: "invoices", exportEntity: "invoice",
        defaultSort: { key: "issuedAt", dir: -1 },
        actions: S.can("create", "invoice") ? `<button class="btn btn-gold btn-sm" id="newInv">+ New invoice</button>` : "",
        columns: [
          { key: "number", label: "Invoice", render: (i) => `<span class="mono">${esc(i.number)}</span>` },
          { key: "client", label: "Client", render: (i) => { const c = S.find("client", i.clientId); return c ? esc(c.name) : "—"; }, sortVal: (i) => { const c = S.find("client", i.clientId); return c ? c.name : ""; } },
          { key: "memo", label: "Memo", render: (i) => `<span class="muted">${esc(i.memo || "")}</span>` },
          { key: "total", label: "Total", render: (i) => `<b>${U.money(i.total)}</b>`, sortVal: (i) => i.total },
          { key: "issuedAt", label: "Issued", render: (i) => U.date(i.issuedAt), sortVal: (i) => i.issuedAt },
          { key: "dueAt", label: "Due", render: (i) => i.status === "paid" ? '<span class="muted">paid ' + U.dateShort(i.paidAt) + "</span>" : (i.dueAt < Date.now() ? `<span class="tone-text-bad">${U.date(i.dueAt)}</span>` : U.date(i.dueAt)), sortVal: (i) => i.dueAt },
          { key: "status", label: "Status", render: (i) => ui.badge(i.status) },
          { key: "act", label: "", render: (i) => actionButtons(i) },
        ],
        afterRender: bindInvoiceActions,
      });
      function actionButtons(i) {
        if (!S.can("edit", "invoice", i)) return "";
        let btns = "";
        if (i.status === "draft") btns += `<button class="btn btn-ghost btn-sm" data-send="${i.id}">Send</button>`;
        if (["sent", "overdue", "viewed", "partial"].includes(i.status)) btns += `<button class="btn btn-ghost btn-sm" data-paid="${i.id}">Mark paid</button>`;
        return btns;
      }
      function bindInvoiceActions(host) {
        host.querySelectorAll("[data-send]").forEach((b) => b.addEventListener("click", () => {
          S.update("invoice", b.dataset.send, { status: "sent" }, "Sent invoice " + S.find("invoice", b.dataset.send).number);
          ui.toast("Invoice sent.", "good"); OM.router.refresh();
        }));
        host.querySelectorAll("[data-paid]").forEach((b) => b.addEventListener("click", () => {
          const inv = S.find("invoice", b.dataset.paid);
          S.update("invoice", inv.id, { status: "paid", paidAt: Date.now() }, "Recorded payment — " + inv.number + " " + U.money(inv.total));
          S.notify(S.execIds(), "finance", "Payment received — " + U.money(inv.total), inv.number + " · " + ((S.find("client", inv.clientId) || {}).name || ""), "#/finance/invoices");
          ui.toast("Payment recorded.", "good"); OM.router.refresh();
        }));
      }
      const nb = body.querySelector("#newInv");
      if (nb) nb.addEventListener("click", () => ui.formModal("New invoice", [
        { name: "clientId", label: "Client", type: "select", options: S.db.clients.map((c) => [c.id, c.name]), required: true },
        { name: "projectId", label: "Project", type: "select", options: [["", "—"]].concat(S.db.projects.map((p) => [p.id, p.code + " · " + p.name])) },
        { name: "amount", label: "Amount ($, pre-tax)", type: "number", required: true },
        { name: "netDays", label: "Terms (net days)", type: "number", value: 30 },
        { name: "memo", label: "Memo", required: true, span2: true },
      ], (v, close) => {
        const amt = +v.amount;
        const number = S.nextInvoiceNumber();
        S.create("invoice", { number, clientId: v.clientId, projectId: v.projectId || null, amount: amt, tax: Math.round(amt * 0.0825), total: Math.round(amt * 1.0825), status: "draft", issuedAt: Date.now(), dueAt: Date.now() + (+v.netDays) * U.DAY, paidAt: null, memo: v.memo, items: [{ desc: v.memo, qty: 1, rate: amt }] }, "Drafted invoice " + number + " — " + U.money(amt));
        close(); ui.toast("Invoice drafted.", "good"); OM.router.refresh();
      }));
    } else if (tab === "expenses") {
      body.innerHTML = `<div class="card card-flush" id="expTbl"></div>`;
      ui.table(body.querySelector("#expTbl"), {
        rows: () => S.db.expenses.slice().sort((a, b) => b.date - a.date),
        searchKeys: ["vendor", "category", "memo", (e) => S.userName(e.submittedBy)],
        exportName: "expenses", exportEntity: "expense",
        actions: S.can("create", "expense") ? `<button class="btn btn-gold btn-sm" id="newExp">+ Submit expense</button>` : "",
        columns: [
          { key: "date", label: "Date", render: (e) => U.date(e.date), sortVal: (e) => e.date },
          { key: "vendor", label: "Vendor", render: (e) => `<b>${esc(e.vendor)}</b><div class="muted">${esc(e.memo || "")}</div>` },
          { key: "category", label: "Category" },
          { key: "submittedBy", label: "Submitted by", render: (e) => esc(S.userName(e.submittedBy)) },
          { key: "amount", label: "Amount", render: (e) => U.money(e.amount), sortVal: (e) => e.amount },
          { key: "status", label: "Status", render: (e) => ui.badge(e.status) },
        ],
      });
      const nb = body.querySelector("#newExp");
      if (nb) nb.addEventListener("click", () => OM.actions.submitExpense());
    } else if (tab === "payroll") {
      const next = M.payrollDue();
      const activeStaff = S.db.users.filter((u) => u.status === "active" && u.salary > 0);
      const annual = activeStaff.reduce((s2, u) => s2 + u.salary, 0);
      body.innerHTML = ui.kpi([
        { label: "Next run", value: next ? U.dateShort(next.runDate) : "—", sub: next ? U.until(next.runDate) : "" },
        { label: "Amount due", value: next ? U.money(next.total) : "—", tone: "warn" },
        { label: "Employees on payroll", value: activeStaff.length, sub: S.db.users.filter((u) => u.role === "contractor").length + " contractors invoice separately" },
        { label: "Annualized payroll", value: U.money(annual, { compact: true }) },
      ]) +
      ui.sectionCard("Run history", S.db.payroll.map((p) => `
        <div class="list-row"><span class="list-icon">$</span><span class="list-main"><b>${esc(p.period)}</b><span class="muted">${U.date(p.runDate)} · ${esc(p.note || "")}</span></span><span><b>${U.money(p.total)}</b></span>${ui.badge(p.status)}</div>`).join("")) +
      (S.meIsExec() || S.me().dept === "Finance" ? ui.sectionCard("Salary register (confidential)", `<div class="card-flush" id="salTbl"></div>`) : "");
      const st = body.querySelector("#salTbl");
      if (st) ui.table(st, {
        rows: () => activeStaff,
        searchKeys: ["name", "dept", "title"],
        exportName: "salary-register", exportEntity: "payroll",
        columns: [
          { key: "name", label: "Employee", render: (u) => ui.userCell(u.id), sortVal: (u) => u.name },
          { key: "dept", label: "Department" },
          { key: "role", label: "Role", render: (u) => OM.ROLES[u.role].label },
          { key: "salary", label: "Annual salary", render: (u) => U.money(u.salary), sortVal: (u) => u.salary },
          { key: "per", label: "Per period", render: (u) => U.money(u.salary / 24), sortVal: (u) => u.salary },
        ],
      });
    } else if (tab === "budgets") {
      body.innerHTML = ui.sectionCard("Department budgets — YTD burn", '<div id="budChart"></div>') +
        `<div class="card card-flush">` + S.db.budgets.map((b) => {
          const pct2 = (b.spentYTD / b.annual) * 100;
          const yearPct = ((new Date().getMonth() + 1) / 12) * 100;
          return `<div class="list-row"><span class="list-main"><b>${esc(b.dept)}</b><span class="muted">${U.money(b.spentYTD)} of ${U.money(b.annual)} annual</span></span>${ch.meter(pct2, { color: pct2 > yearPct + 8 ? ch.STATUS.critical : pct2 > yearPct ? ch.STATUS.warning : ch.SERIES[2] })}<span class="muted">${Math.round(pct2)}%</span></div>`;
        }).join("") + "</div>" + `<p class="muted footnote">Amber = burning faster than the calendar (${Math.round(((new Date().getMonth() + 1) / 12) * 100)}% of year elapsed).</p>`;
      ch.hbars(body.querySelector("#budChart"), S.db.budgets.map((b) => ({ label: b.dept, value: b.spentYTD })), { money: true, fmt: (v) => U.money(v, { compact: true }) });
    } else if (tab === "reports") {
      const series = M.monthlySeries(12);
      const ytdRev = M.revenueYTD(), ytdExp = M.expensesYTD();
      body.innerHTML = ui.kpi([
        { label: "YTD revenue", value: U.money(ytdRev, { compact: true }) },
        { label: "YTD expenses", value: U.money(ytdExp, { compact: true }) },
        { label: "YTD net", value: U.money(ytdRev - ytdExp, { compact: true }), tone: ytdRev - ytdExp >= 0 ? "good" : "bad" },
        { label: "Avg invoice", value: U.money(S.db.invoices.reduce((s2, i) => s2 + i.total, 0) / Math.max(1, S.db.invoices.length), { compact: true }) },
      ]) + ui.sectionCard("Revenue by client — YTD", '<div id="cliChart"></div>') +
      ui.sectionCard("Export center", `<div class="export-grid">
        <button class="btn btn-ghost" data-x="pl">⤓ P&L by month (CSV)</button>
        <button class="btn btn-ghost" data-x="ar">⤓ AR aging (CSV)</button>
        <button class="btn btn-ghost" data-x="cli">⤓ Revenue by client (CSV)</button>
      </div>`);
      ch.hbars(body.querySelector("#cliChart"), M.revenueByClientYTD().slice(0, 8).map((r) => ({ label: r.client.name, value: r.amt })), { money: true, fmt: (v) => U.money(v, { compact: true }) });
      body.querySelectorAll("[data-x]").forEach((b) => b.addEventListener("click", () => {
        try { S.assertCan("export", "invoice"); } catch (e) { ui.toast(e.message, "bad"); return; }
        let csv, name;
        if (b.dataset.x === "pl") { name = "pnl-monthly"; csv = U.csv([["Month", "Revenue", "Expenses", "Net"]].concat(series.map((s2) => [s2.label, s2.revenue, s2.expenses, s2.revenue - s2.expenses]))); }
        else if (b.dataset.x === "ar") { name = "ar-aging"; csv = U.csv([["Invoice", "Client", "Total", "Due", "Days overdue"]].concat(M.outstanding().map((i) => [i.number, (S.find("client", i.clientId) || {}).name, i.total, U.date(i.dueAt), Math.max(0, Math.floor((Date.now() - i.dueAt) / U.DAY))]))); }
        else { name = "revenue-by-client"; csv = U.csv([["Client", "Revenue YTD"]].concat(M.revenueByClientYTD().map((r) => [r.client.name, r.amt]))); }
        U.download(name + ".csv", csv);
        S.audit("export", "invoice", "*", "Exported report — " + name);
        ui.toast("Report exported.", "good");
      }));
    }
  };

  OM.actions.submitExpense = function () {
    ui.formModal("Submit expense", [
      { name: "vendor", label: "Vendor", required: true },
      { name: "amount", label: "Amount ($)", type: "number", required: true, step: "0.01" },
      { name: "category", label: "Category", type: "select", options: ["Equipment", "Software", "Travel", "Contractors", "Marketing", "Utilities", "Meals", "Insurance"] },
      { name: "projectId", label: "Bill to project", type: "select", options: [["", "— Overhead —"]].concat(S.db.projects.filter((p) => p.status === "active").map((p) => [p.id, p.code + " · " + p.name])) },
      { name: "memo", label: "Description", type: "textarea", required: true, span2: true },
    ], (v, close) => {
      const e = S.create("expense", { vendor: v.vendor, amount: +v.amount, category: v.category, projectId: v.projectId || null, memo: v.memo, date: Date.now(), submittedBy: S.meId, status: "pending" }, "Submitted expense — " + v.vendor + " " + U.money(+v.amount));
      const me = S.me();
      // All approvals are decided by executives only (see decide_approval(),
      // 0015) — dept heads are no longer approvers, so every expense routes
      // to exec regardless of size.
      S.create("approval", { type: "expense", title: "Expense — " + v.vendor + " " + U.money(+v.amount), refType: "expense", refId: e.id, requestedBy: S.meId, requestedAt: Date.now(), amount: +v.amount, status: "pending", priority: +v.amount > 2000 ? "high" : "medium", approverRoles: ["exec"], description: v.memo });
      S.notify(S.execIds(), "approval", "Approval needed: " + v.vendor + " " + U.money(+v.amount), "Submitted by " + me.name, "#/approvals");
      close(); ui.toast("Expense submitted for approval.", "good"); OM.router.refresh();
    });
  };

  /* ================= HR ================= */
  const HIRE_STAGES = [["applied", "Applied"], ["screen", "Phone Screen"], ["interview", "Interview"], ["offer", "Offer"], ["hired", "Hired"], ["rejected", "Rejected"]];
  OM.pages.hr = function (el, tab) {
    if (!S.moduleAccess("hr")) { el.innerHTML = ui.empty("Human Resources is restricted to the HR team and executives.", "🔒"); return; }
    tab = tab || "employees";
    el.innerHTML = ui.pageHead("People", "Employees, hiring, time off, reviews, and records") + `<div id="htabs"></div><div id="hbody" class="tab-body"></div>`;
    ui.tabs(el.querySelector("#htabs"), [
      { id: "pending", label: "Pending Staff", count: S.db.users.filter((u) => u.status === "pending").length },
      { id: "employees", label: "Employees", count: S.db.users.filter((u) => u.status === "active").length },
      { id: "hiring", label: "Hiring", count: S.db.candidates.filter((c) => !["hired", "rejected"].includes(c.stage)).length },
      { id: "onboarding", label: "Onboarding", count: S.db.onboardingAssignments.filter((a) => !a.approvedAt).length },
      { id: "timeoff", label: "Time Off", count: S.db.timeOff.filter((t) => t.status === "pending").length },
      { id: "reviews", label: "Reviews" },
      { id: "actions", label: "Actions & Records" },
    ], tab, (t) => (location.hash = "#/hr/" + t));
    const body = el.querySelector("#hbody");

    if (tab === "pending") {
      const pending = S.db.users.filter((u) => u.status === "pending");
      body.innerHTML = ui.sectionCard("New sign-ups awaiting placement",
        pending.length ? pending.map((u) => `
        <div class="list-row"><span class="list-icon">☺</span>
          <span class="list-main"><b>${esc(u.name)}</b><span class="muted">${esc(u.email)}${u.phone ? " · " + esc(u.phone) : ""} · signed up ${U.date(u.createdAt)}</span></span>
          <button class="btn btn-gold btn-sm" data-approve="${u.id}">Review & approve</button>
        </div>`).join("") : ui.empty("No pending signups right now. New accounts land here with zero access until placed."));
      body.querySelectorAll("[data-approve]").forEach((b) => b.addEventListener("click", () => approvalModal(S.find("user", b.dataset.approve))));
    } else if (tab === "employees") {
      body.innerHTML = `<div class="card card-flush" id="empTbl"></div>`;
      ui.table(body.querySelector("#empTbl"), {
        rows: () => S.db.users.filter((u) => u.status !== "pending" && u.portalType !== "client"),
        searchKeys: ["name", "dept", "title", "email"],
        exportName: "employees", exportEntity: "employee",
        columns: [
          { key: "name", label: "Employee", render: (u) => ui.userCell(u.id), sortVal: (u) => u.name },
          { key: "dept", label: "Department" },
          { key: "role", label: "Role", render: (u) => u.role ? OM.ROLES[u.role].label : "—", sortVal: (u) => u.role ? OM.ROLES[u.role].level : 0 },
          { key: "hireDate", label: "Tenure", render: (u) => { const y = (Date.now() - u.hireDate) / (365 * U.DAY); return y >= 1 ? y.toFixed(1) + " yrs" : Math.round(y * 12) + " mos"; }, sortVal: (u) => u.hireDate },
          { key: "salary", label: "Salary", render: (u) => u.salary ? U.money(u.salary) : (u.rate ? "$" + u.rate + "/hr" : "—"), sortVal: (u) => u.salary },
          { key: "status", label: "Status", render: (u) => ui.badge(u.status) },
        ],
        onRow: (u) => hrEmployeeModal(u),
      });
    } else if (tab === "hiring") {
      body.innerHTML = `<div class="row-gap">${S.can("create", "candidate") ? '<button class="btn btn-gold btn-sm" id="newCand">+ Add candidate</button>' : ""}</div><div id="hireKb"></div>`;
      ui.kanban(body.querySelector("#hireKb"), {
        columns: HIRE_STAGES.map(([id, label]) => ({ id, label })),
        items: S.db.candidates,
        colOf: (c) => c.stage,
        canMove: (c) => S.can("edit", "candidate", c),
        card: (c) => `<div class="kc-title">${esc(c.name)}</div><div class="kc-sub">${esc(c.roleApplied)} · ${esc(c.dept)}</div>
          <div class="kc-meta"><span class="muted">${esc(c.source)}</span><span>${"★".repeat(c.rating || 0)}<span class="muted">${"★".repeat(5 - (c.rating || 0))}</span></span></div>`,
        onMove: (c, col) => {
          if (col === "hired") {
            // Hires require an approval chain: HR + CEO
            const existing = S.db.approvals.find((a) => a.refType === "candidate" && a.refId === c.id && a.status === "pending");
            if (!existing) {
              S.create("approval", { type: "hire", title: "New hire — " + c.name + " (" + c.roleApplied + ")", refType: "candidate", refId: c.id, requestedBy: S.meId, requestedAt: Date.now(), status: "pending", priority: "high", approverRoles: ["hr", "ceo"], description: "Move to hired requires HR + CEO sign-off." }, "Routed hire of " + c.name + " for approval (HR + CEO)");
              S.notify(S.execIds().concat(S.deptHeadId("Human Resources")), "approval", "Hire approval needed: " + c.name, c.roleApplied + " · " + c.dept, "#/approvals");
            }
            ui.toast("Hires require HR + CEO approval — routed to the Approval Center.", "warn");
            OM.router.refresh();
            return;
          }
          S.update("candidate", c.id, { stage: col }, "Moved candidate " + c.name + " → " + U.cap(col));
          OM.router.refresh();
        },
        onCard: (c) => {
          const canDel = S.can("delete", "candidate", c);
          const m = ui.modal(c.name, `<div class="detail-grid">
            <div><span class="detail-label">Role</span><b>${esc(c.roleApplied)}</b></div>
            <div><span class="detail-label">Department</span><b>${esc(c.dept)}</b></div>
            <div><span class="detail-label">Applied</span><b>${U.date(c.appliedAt)}</b></div>
            <div><span class="detail-label">Source</span><b>${esc(c.source)}</b></div>
            <div><span class="detail-label">Rating</span><b>${"★".repeat(c.rating || 0) || "unrated"}</b></div>
            <div><span class="detail-label">Email</span><b>${esc(c.email)}</b></div>
          </div><p class="body-text">${esc(c.notes || "No notes.")}</p>`,
            { footer: canDel ? `<button class="btn btn-danger-ghost" id="delCand">Remove from board</button>` : "" });
          if (canDel) m.el.querySelector("#delCand").addEventListener("click", () => ui.confirmModal("Remove candidate", `Remove "<b>${esc(c.name)}</b>" from the hiring board? This is recorded in the audit log.`, (reason) => {
            S.remove("candidate", c.id, reason);
            m.close(); ui.toast("Removed.", "good"); OM.router.refresh();
          }, { danger: true, reason: true, okLabel: "Remove" }));
        },
      });
      const nc = body.querySelector("#newCand");
      if (nc) nc.addEventListener("click", () => ui.formModal("Add candidate", [
        { name: "name", label: "Name", required: true },
        { name: "roleApplied", label: "Role", required: true },
        { name: "dept", label: "Department", type: "select", options: ["Production", "Creative", "Sales", "Finance", "Human Resources", "Technology", "Administration"] },
        { name: "source", label: "Source", type: "select", options: ["Careers page", "LinkedIn", "Indeed", "Referral", "Career fair"] },
        { name: "email", label: "Email", type: "email" },
        { name: "notes", label: "Notes", type: "textarea", span2: true },
      ], (v, close) => {
        S.create("candidate", { name: v.name, roleApplied: v.roleApplied, dept: v.dept, source: v.source, email: v.email, notes: v.notes, stage: "applied", appliedAt: Date.now(), rating: 0 }, "Added candidate — " + v.name);
        close(); OM.router.refresh();
      }));
    } else if (tab === "onboarding") {
      const me = S.me();
      const canManage = S.isExec(me) || me.dept === "Human Resources" || me.dept === "Sales";
      const staffTemplates = S.db.onboardingTemplates.filter((t) => t.audience !== "client");
      const clientTemplates = S.db.onboardingTemplates.filter((t) => t.audience === "client");
      const inProgress = S.db.onboardingAssignments.filter((a) => !a.approvedAt);
      function templateRow(t, assignBtn) {
        return `<div class="list-row clickable" data-template="${t.id}"><span class="list-icon">▤</span>
          <span class="list-main"><b>${esc(t.name)}</b><span class="muted">${esc(t.dept || "All departments")} · ${(t.tasks || []).length} tasks</span></span>
          ${assignBtn ? `<button class="btn btn-ghost btn-sm" data-assign-tmpl="${t.id}">Assign to client</button>` : ""}
        </div>`;
      }
      body.innerHTML =
        ui.sectionCard("Staff templates", staffTemplates.map((t) => templateRow(t)).join("") || ui.empty("No staff onboarding templates yet."),
          { action: canManage ? '<button class="btn btn-gold btn-sm" id="newTemplateStaff">+ New staff template</button>' : "" }) +
        ui.sectionCard("Client templates", clientTemplates.map((t) => templateRow(t, canManage)).join("") || ui.empty("No client onboarding templates yet."),
          { action: canManage ? '<button class="btn btn-gold btn-sm" id="newTemplateClient">+ New client template</button>' : "" }) +
        ui.sectionCard("In progress", inProgress.map((a) => {
          const person = S.find("user", a.profileId);
          const tmpl = S.find("onboardingTemplate", a.templateId);
          const done = (a.tasks || []).filter((t) => t.done).length, total = (a.tasks || []).length;
          const allDone = total > 0 && done === total;
          return `<div class="list-row"><span class="list-icon">☺</span>
            <span class="list-main"><b>${esc(person ? person.name : "—")}</b><span class="muted">${esc(tmpl ? tmpl.name : "—")}${person && person.portalType === "client" ? " · Client" : ""} · ${done}/${total} tasks complete</span></span>
            ${allDone && canManage ? `<button class="btn btn-gold btn-sm" data-approve-onb="${a.id}">Give final approval</button>` : ui.badge(allDone ? "ready" : "in_progress")}
          </div>`;
        }).join("") || ui.empty("Nobody is mid-onboarding right now."));

      function newTemplateModal(audience) {
        ui.formModal("New " + (audience === "client" ? "client" : "staff") + " onboarding template", [
          { name: "name", label: "Template name", required: true, placeholder: audience === "client" ? "e.g. New Client Kickoff" : "e.g. Production — New Hire" },
          audience === "client"
            ? { name: "dept", label: "Owning department", type: "select", options: [["", "— Any —"], "Sales", "Production", "Creative", "Executive"] }
            : { name: "dept", label: "Department", type: "select", options: [["", "— All departments —"], "Executive", "Production", "Creative", "Sales", "Finance", "Human Resources", "Technology", "Administration", "Contractors"] },
          { name: "tasks", label: "Checklist (one item per line)", type: "textarea", span2: true, rows: 14, required: true,
            value: (audience === "client"
              ? ["Sign MSA / contract", "Upload brand assets", "Schedule kickoff call", "Confirm point of contact", "Share drive / asset access", "Set up invoicing", "Send welcome packet"]
              : ["Welcome message", "Account setup", "Company handbook", "NDA / contract", "Tax / payment info", "Role expectations", "Department training", "Brand guidelines", "Software access", "First assignments", "Manager intro", "Equipment assignment", "Final onboarding approval"]).join("\n") },
        ], (v, close) => {
          const tasks = v.tasks.split("\n").map((s) => s.trim()).filter(Boolean).map((text) => ({ text, category: "general" }));
          S.create("onboardingTemplate", { name: v.name, dept: v.dept || null, audience, tasks }, "Created " + audience + " onboarding template — " + v.name);
          close(); ui.toast("Template created.", "good"); OM.router.refresh();
        }, { wide: true });
      }
      const ns = body.querySelector("#newTemplateStaff"); if (ns) ns.addEventListener("click", () => newTemplateModal("staff"));
      const ncl = body.querySelector("#newTemplateClient"); if (ncl) ncl.addEventListener("click", () => newTemplateModal("client"));
      body.querySelectorAll("[data-assign-tmpl]").forEach((b) => b.addEventListener("click", (e) => {
        e.stopPropagation();
        const clientUsers = S.db.users.filter((u) => u.status === "active" && u.portalType === "client").map((u) => [u.id, u.name + " · " + (S.find("client", u.clientId) || {}).name]);
        ui.formModal("Assign onboarding to a client contact", [
          { name: "profileId", label: "Client contact", type: "select", required: true, options: clientUsers },
        ], (v, close) => {
          S.assignOnboarding(v.profileId, b.dataset.assignTmpl).then(() => { close(); ui.toast("Onboarding assigned.", "good"); OM.router.refresh(); }).catch((err) => ui.toast(err.message, "bad"));
        });
      }));
      body.querySelectorAll("[data-approve-onb]").forEach((b) => b.addEventListener("click", () => {
        S.approveOnboarding(b.dataset.approveOnb).then(() => { ui.toast("Onboarding approved.", "good"); OM.router.refresh(); }).catch((e) => ui.toast(e.message, "bad"));
      }));
    } else if (tab === "timeoff") {
      body.innerHTML = `<div class="card card-flush">` + S.db.timeOff.slice().sort((a, b) => b.start - a.start).map((t) => `
        <div class="list-row"><span class="list-icon">✈</span>
          <span class="list-main"><b>${esc(S.userName(t.userId))} — ${esc(t.type)}</b><span class="muted">${U.date(t.start)} → ${U.date(t.end)} · ${t.days} day${t.days > 1 ? "s" : ""}${t.reason ? " · " + esc(t.reason) : ""}</span></span>
          ${t.status === "pending" && S.can("approve", "timeoff", t) ? `<button class="btn btn-gold btn-sm" data-to-app="${t.id}">Approve</button><button class="btn btn-danger-ghost btn-sm" data-to-den="${t.id}">Deny</button>` : ui.badge(t.status)}
        </div>`).join("") + "</div>";
      body.querySelectorAll("[data-to-app]").forEach((b) => b.addEventListener("click", () => {
        S.decideTimeOff(b.dataset.toApp, "approved"); OM.router.refresh();
      }));
      body.querySelectorAll("[data-to-den]").forEach((b) => b.addEventListener("click", () => {
        S.decideTimeOff(b.dataset.toDen, "denied"); OM.router.refresh();
      }));
    } else if (tab === "reviews") {
      const canCreate = S.can("create", "review", { userId: "" }) || S.isExec(S.me()) || S.me().dept === "Human Resources" || S.me().role === "dept_head";
      const due = reviewsDue();
      body.innerHTML =
        (due.length ? ui.sectionCard("Reviews due", due.map((d) => `
          <div class="list-row clickable" data-due-user="${d.u.id}"><span class="list-icon">⏱</span>
          <span class="list-main"><b>${esc(d.u.name)}</b><span class="muted">${esc(d.label)} · hired ${U.date(d.u.hireDate)}</span></span></div>`).join("")) : "") +
        ui.sectionCard("Performance reviews", S.db.reviews.slice().reverse().map((r) => `
        <div class="list-row clickable" data-review="${r.id}"><span class="list-main"><b>${esc(S.userName(r.userId))} — ${U.cap(r.reviewType || "review")} ${esc(r.period || "")}</b>
        <span class="muted">Reviewer: ${esc(S.userName(r.reviewerId))} · Final rating ${esc(r.finalRating || r.score || "—")}</span></span>${ui.badge(r.status)}</div>`).join("")
        || ui.empty("No reviews recorded yet."),
        { action: canCreate ? '<button class="btn btn-gold btn-sm" id="newReview">+ New review</button>' : "" });
      const nr = body.querySelector("#newReview");
      if (nr) nr.addEventListener("click", () => reviewModal());
      body.querySelectorAll("[data-review]").forEach((row) => row.addEventListener("click", () => reviewDetailModal(S.find("review", row.dataset.review))));
      body.querySelectorAll("[data-due-user]").forEach((row) => row.addEventListener("click", () => reviewModal(row.dataset.dueUser)));
    } else if (tab === "actions") {
      const canAdd = S.isExec(S.me()) || S.me().dept === "Human Resources";
      body.innerHTML = ui.sectionCard("Coaching, write-ups & warnings", S.db.hrActions.map((a) => `
        <div class="list-row"><span class="list-icon">${a.type === "writeup" ? "⚠" : "✎"}</span>
        <span class="list-main"><b>${esc(S.userName(a.userId))} — ${U.cap(a.type)}</b><span class="muted">${esc(a.summary)}</span><span class="muted">Issued by ${esc(S.userName(a.issuedBy))} · ${U.date(a.date)}</span></span>${ui.badge(a.status)}</div>`).join("") || ui.empty("No records."),
        { action: canAdd ? '<button class="btn btn-gold btn-sm" id="newHrAction">+ Add record</button>' : "" });
      const na = body.querySelector("#newHrAction");
      if (na) na.addEventListener("click", () => {
        const staff = S.db.users.filter((u) => u.status === "active" && u.portalType !== "client").map((u) => [u.id, u.name + " · " + (u.title || u.dept)]);
        ui.formModal("Add coaching / write-up / warning", [
          { name: "userId", label: "Employee", type: "select", required: true, options: staff },
          { name: "type", label: "Type", type: "select", required: true, options: [["coaching", "Coaching"], ["writeup", "Write-up"], ["warning", "Warning"]] },
          { name: "summary", label: "Summary", type: "textarea", required: true, span2: true },
        ], (v, close) => {
          S.create("hrAction", { userId: v.userId, type: v.type, date: Date.now(), issuedBy: S.meId, summary: v.summary, status: "active" }, U.cap(v.type) + " issued — " + S.userName(v.userId));
          close(); ui.toast("Record added.", "good"); OM.router.refresh();
        }, { wide: true });
      });
    }
  };

  const REVIEW_TYPES = [["30_day", "30-day"], ["60_day", "60-day"], ["90_day", "90-day"], ["quarterly", "Quarterly"], ["annual", "Annual"], ["project", "Project-based"], ["contractor", "Contractor"]];
  // No cron/scheduled-job infrastructure exists in this project, so "review
  // due" reminders can't fire as a push notification on their own — this
  // computes the same thing on demand from tenure + existing review history
  // and surfaces it as a worklist instead.
  function reviewsDue() {
    const now = Date.now();
    const staff = S.db.users.filter((u) => u.status === "active" && u.portalType !== "client" && u.hireDate);
    const has = (uid, type) => S.db.reviews.some((r) => r.userId === uid && r.reviewType === type);
    const out = [];
    staff.forEach((u) => {
      const tenureDays = (now - u.hireDate) / U.DAY;
      if (tenureDays >= 25 && tenureDays <= 45 && !has(u.id, "30_day")) out.push({ u, label: "30-day review due" });
      else if (tenureDays >= 55 && tenureDays <= 75 && !has(u.id, "60_day")) out.push({ u, label: "60-day review due" });
      else if (tenureDays >= 85 && tenureDays <= 105 && !has(u.id, "90_day")) out.push({ u, label: "90-day review due" });
      else if (tenureDays >= 350) {
        const annualCount = S.db.reviews.filter((r) => r.userId === u.id && r.reviewType === "annual").length;
        if (annualCount < Math.floor(tenureDays / 365)) out.push({ u, label: "Annual review due" });
      }
    });
    return out;
  }
  function reviewModal(presetUserId) {
    const staff = S.db.users.filter((u) => u.status === "active" && u.portalType !== "client").map((u) => [u.id, u.name + " · " + (u.title || u.dept)]);
    ui.formModal("New performance review", [
      { name: "userId", label: "Employee", type: "select", required: true, options: staff, value: presetUserId || "" },
      { name: "reviewType", label: "Review type", type: "select", required: true, options: REVIEW_TYPES },
      { name: "period", label: "Period label", placeholder: "e.g. Q3 2026", required: true },
      { name: "performanceScore", label: "Performance (1–5)", type: "number", step: "0.1" },
      { name: "communicationScore", label: "Communication (1–5)", type: "number", step: "0.1" },
      { name: "reliabilityScore", label: "Reliability (1–5)", type: "number", step: "0.1" },
      { name: "qualityScore", label: "Quality (1–5)", type: "number", step: "0.1" },
      { name: "leadershipScore", label: "Leadership (1–5)", type: "number", step: "0.1" },
      { name: "finalRating", label: "Final rating (1–5)", type: "number", step: "0.1", required: true },
      { name: "strengths", label: "Strengths", type: "textarea", span2: true },
      { name: "weaknesses", label: "Areas to improve", type: "textarea", span2: true },
      { name: "goals", label: "Goals", type: "textarea", span2: true },
      { name: "promotionRecommendation", label: "Promotion recommendation", type: "select", options: [["0", "No"], ["1", "Yes — recommend for promotion"]], value: "0" },
      { name: "payRecommendation", label: "Pay recommendation", placeholder: "e.g. +5% at next cycle" },
      { name: "summary", label: "Summary notes", type: "textarea", span2: true },
    ], (v, close) => {
      S.create("review", {
        userId: v.userId, reviewerId: S.meId, reviewType: v.reviewType, period: v.period,
        score: v.performanceScore ? +v.performanceScore : null, finalRating: +v.finalRating,
        communicationScore: v.communicationScore ? +v.communicationScore : null,
        reliabilityScore: v.reliabilityScore ? +v.reliabilityScore : null,
        qualityScore: v.qualityScore ? +v.qualityScore : null,
        leadershipScore: v.leadershipScore ? +v.leadershipScore : null,
        strengths: v.strengths, weaknesses: v.weaknesses, goals: v.goals,
        promotionRecommendation: v.promotionRecommendation === "1", payRecommendation: v.payRecommendation || null,
        summary: v.summary, status: "approved",
      }, "Created " + v.reviewType + " review — " + S.userName(v.userId));
      S.notify(v.userId, "hr", "A performance review is ready", v.reviewType + " · " + v.period, "#/settings");
      close(); ui.toast("Review recorded.", "good"); OM.router.refresh();
    }, { wide: true, submitLabel: "Save review" });
  }
  function reviewDetailModal(r) {
    if (!r) return;
    const rows = [
      ["Employee", S.userName(r.userId)], ["Reviewer", S.userName(r.reviewerId)], ["Type", U.cap(r.reviewType || "—")], ["Period", r.period || "—"],
      ["Performance", r.score ?? "—"], ["Communication", r.communicationScore ?? "—"], ["Reliability", r.reliabilityScore ?? "—"],
      ["Quality", r.qualityScore ?? "—"], ["Leadership", r.leadershipScore ?? "—"], ["Final rating", r.finalRating ?? "—"],
      ["Promotion rec.", r.promotionRecommendation ? "Yes" : "No"], ["Pay rec.", r.payRecommendation || "—"],
    ];
    ui.modal("Review — " + S.userName(r.userId), `
      <div class="detail-grid">${rows.map(([l, v]) => `<div><span class="detail-label">${esc(l)}</span><b>${esc(String(v))}</b></div>`).join("")}</div>
      ${r.strengths ? `<h4 class="modal-sub">Strengths</h4><p class="body-text">${esc(r.strengths)}</p>` : ""}
      ${r.weaknesses ? `<h4 class="modal-sub">Areas to improve</h4><p class="body-text">${esc(r.weaknesses)}</p>` : ""}
      ${r.goals ? `<h4 class="modal-sub">Goals</h4><p class="body-text">${esc(r.goals)}</p>` : ""}
      ${r.summary ? `<h4 class="modal-sub">Summary</h4><p class="body-text">${esc(r.summary)}</p>` : ""}
      ${r.acknowledgedAt ? `<p class="footnote">Acknowledged by employee ${U.date(r.acknowledgedAt)}</p>` : ""}`,
      { wide: true });
  }

  // Turns a pending signup (Status=Pending, Access=None, Portal Type=Unassigned)
  // into a placed Staff / Contractor / Client account. All the actual work —
  // placement, project-team seeding, onboarding assignment, notification,
  // audit — happens inside the approve_user() RPC so it can't be partially
  // applied; this just collects the form and hands it off.
  function approvalModal(u) {
    const clients = S.db.clients.slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => [c.id, c.name]);
    const projects = S.db.projects.filter((p) => p.status === "active").map((p) => [p.id, p.code + " · " + p.name]);
    const managers = S.db.users.filter((m) => m.status === "active" && m.id !== u.id).map((m) => [m.id, m.name + " · " + (m.title || m.dept)]);
    const templates = S.db.onboardingTemplates.map((t) => [t.id, t.name]);
    ui.formModal("Approve — " + u.name, [
      { name: "email", label: "Email", type: "readonly", value: u.email },
      { name: "phone", label: "Phone", type: "readonly", value: u.phone || "—" },
      { name: "portalType", label: "Portal type", type: "select", required: true, options: [["staff", "Staff"], ["contractor", "Contractor"], ["client", "Client"]] },
      { name: "dept", label: "Department", type: "select", options: ["Executive", "Production", "Creative", "Sales", "Finance", "Human Resources", "Technology", "Administration", "Contractors"], hint: "Staff / contractor only" },
      { name: "role", label: "Role", type: "select", options: Object.entries(OM.ROLES).filter(([k]) => k !== "client").map(([k, v]) => [k, v.label]), hint: "Staff / contractor only" },
      { name: "title", label: "Title", placeholder: "e.g. Editor II" },
      { name: "company", label: "Company", placeholder: "Company name", hint: "Client only" },
      { name: "clientId", label: "Assigned client", type: "select", options: [["", "— None —"]].concat(clients), hint: "Client only — which company this contact belongs to" },
      { name: "projectId", label: "Assigned project", type: "select", options: [["", "— None —"]].concat(projects), hint: "Staff only — adds them to the project team" },
      { name: "managerId", label: "Manager", type: "select", options: [["", "— None —"]].concat(managers) },
      { name: "permissionGroup", label: "Permission group", placeholder: "e.g. Standard Staff, Department Head" },
      { name: "onboardingTemplateId", label: "Onboarding template", type: "select", options: [["", "— None —"]].concat(templates), hint: "Assigns the checklist immediately (staff only)" },
      { name: "notes", label: "Notes", type: "textarea", span2: true, hint: "Saved as an HR note — visible only to HR and executives" },
    ], (v, close) => {
      if (!v.portalType) throw new Error("Choose a portal type.");
      return S.approveUser(u.id, v).then(() => {
        close(); ui.toast(u.name + " approved and placed.", "good"); OM.router.refresh();
      });
    }, { wide: true, submitLabel: "Approve & place" });
  }

  function hrEmployeeModal(u) {
    const rev = S.db.reviews.filter((r) => r.userId === u.id);
    const to = S.db.timeOff.filter((t) => t.userId === u.id);
    const acts = S.db.hrActions.filter((a) => a.userId === u.id);
    const me = S.me();
    const isHr = S.isExec(me) || me.dept === "Human Resources";
    // hr_notes are only queryable at all for HR/exec (RLS), so a non-HR
    // viewer's S.db.hrNotes is simply empty — nothing to further hide here.
    const notes = isHr ? S.db.hrNotes.filter((n) => n.profileId === u.id) : [];
    const onboarding = S.db.onboardingAssignments.find((a) => a.profileId === u.id);
    const manager = u.managerId && S.find("user", u.managerId);
    const m = ui.modal(u.name, `
      <div class="detail-grid">
        <div><span class="detail-label">Title</span><b>${esc(u.title || "—")}</b></div>
        <div><span class="detail-label">Department</span><b>${esc(u.dept || "—")}</b></div>
        <div><span class="detail-label">Role</span><b>${u.role ? OM.ROLES[u.role].label : "—"}</b></div>
        <div><span class="detail-label">Portal / employment</span><b>${U.cap(u.portalType || "—")}${u.employmentType ? " · " + U.cap(u.employmentType) : ""}</b></div>
        <div><span class="detail-label">Manager</span><b>${manager ? esc(manager.name) : "—"}</b></div>
        <div><span class="detail-label">Hired</span><b>${U.date(u.hireDate)}</b></div>
        <div><span class="detail-label">Compensation</span><b>${isHr || S.isExec(me) || me.dept === "Finance" ? (u.salary ? U.money(u.salary) + "/yr" : u.rate ? "$" + u.rate + "/hr" : "—") : "—"}</b></div>
        <div><span class="detail-label">Contact</span><b>${esc(u.email)}</b></div>
      </div>
      ${onboarding ? `<h4 class="modal-sub">Onboarding</h4><div class="list-row"><span class="list-main">${(onboarding.tasks || []).filter((t) => t.done).length}/${(onboarding.tasks || []).length} tasks complete</span>${ui.badge(onboarding.approvedAt ? "approved" : "in_progress")}</div>` : ""}
      <h4 class="modal-sub">Reviews</h4>${rev.map((r) => `<div class="list-row"><span class="list-main">${esc(r.period || "")} — final rating <b>${r.finalRating ?? r.score ?? "—"}</b></span><span class="muted">${esc(r.summary || "")}</span></div>`).join("") || '<p class="muted">None.</p>'}
      <h4 class="modal-sub">Time off</h4>${to.map((t) => `<div class="list-row"><span class="list-main">${esc(t.type)} · ${U.dateShort(t.start)} → ${U.dateShort(t.end)}</span>${ui.badge(t.status)}</div>`).join("") || '<p class="muted">None.</p>'}
      ${acts.length ? `<h4 class="modal-sub">Records</h4>` + acts.map((a) => `<div class="list-row"><span class="list-main">${U.cap(a.type)} — ${esc(a.summary)}</span>${ui.badge(a.status)}</div>`).join("") : ""}
      ${isHr ? `<h4 class="modal-sub">HR notes <span class="muted">— visible only to HR &amp; executives</span></h4>
        ${notes.map((n) => `<div class="list-row"><span class="list-main"><span class="muted">${U.cap(n.category)} · ${U.date(n.createdAt)} · ${esc(S.userName(n.authorId))}</span><br>${esc(n.body)}</span></div>`).join("") || '<p class="muted">None.</p>'}
        <div class="row-gap"><input type="text" id="hrNoteInput" placeholder="Add a note…" style="flex:1"><button class="btn btn-ghost btn-sm" id="addHrNote">Add note</button></div>` : ""}`,
      { wide: true, footer: isHr ? `<button class="btn btn-ghost" data-role="cancel2">Close</button><button class="btn btn-gold" id="editMember">Edit member</button>` : "" });
    if (isHr) {
      const c2 = m.el.querySelector('[data-role="cancel2"]'); if (c2) c2.addEventListener("click", m.close);
      m.el.querySelector("#editMember").addEventListener("click", () => { m.close(); editMemberModal(u); });
      const addBtn = m.el.querySelector("#addHrNote");
      if (addBtn) addBtn.addEventListener("click", () => {
        const input = m.el.querySelector("#hrNoteInput");
        if (!input.value.trim()) return;
        S.create("hrNote", { profileId: u.id, category: "general", authorId: S.meId, body: input.value.trim() }, "Added HR note — " + u.name);
        m.close(); ui.toast("Note added.", "good"); hrEmployeeModal(u);
      });
    }
  }

  function editMemberModal(u) {
    const me = S.me();
    const canPay = S.isExec(me) || me.dept === "Finance";
    const managers = S.db.users.filter((m) => m.status === "active" && m.id !== u.id).map((m) => [m.id, m.name + " · " + (m.title || m.dept)]);
    const fields = [
      { name: "name", label: "Name", value: u.name, required: true },
      { name: "title", label: "Title", value: u.title || "" },
      { name: "dept", label: "Department", type: "select", value: u.dept, options: ["Executive", "Production", "Creative", "Sales", "Finance", "Human Resources", "Technology", "Administration", "Contractors", "Unassigned"] },
      { name: "role", label: "Role", type: "select", value: u.role, options: Object.entries(OM.ROLES).filter(([k]) => k !== "client").map(([k, v]) => [k, v.label]) },
      { name: "managerId", label: "Manager", type: "select", value: u.managerId || "", options: [["", "— None —"]].concat(managers) },
      { name: "employmentType", label: "Employment type", type: "select", value: u.employmentType || "", options: [["", "— Not set —"], ["full_time", "Full-time"], ["part_time", "Part-time"], ["contract", "Contract"], ["intern", "Internship"]] },
      { name: "payType", label: "Pay type", type: "select", value: u.payType || "", options: [["", "— Not set —"], ["salary", "Salary"], ["hourly", "Hourly"], ["project", "Per-project"]] },
      { name: "status", label: "Status", type: "select", value: u.status, options: [["active", "Active"], ["offboarded", "Offboarded"]] },
    ];
    if (canPay) {
      fields.push({ name: "salary", label: "Annual salary ($)", type: "number", value: u.salary || "", hint: "Leave blank if hourly / contractor" });
      fields.push({ name: "rate", label: "Hourly rate ($)", type: "number", value: u.rate || "", hint: "For contractors" });
    }
    ui.formModal("Edit " + u.name, fields, (v, close) => {
      S.updateProfile(u.id, {
        name: v.name, title: v.title, dept: v.dept, role: v.role, status: v.status,
        managerId: v.managerId || null, employmentType: v.employmentType || null, payType: v.payType || null,
      }, "Placed " + v.name + " as " + OM.ROLES[v.role].label + " · " + v.dept);
      if (canPay && (v.salary !== "" || v.rate !== "")) S.setCompensation(u.id, v.salary !== "" ? +v.salary : null, v.rate !== "" ? +v.rate : null);
      close(); ui.toast(v.name + " updated.", "good"); OM.router.refresh();
    }, { wide: true });
  }

  /* ================= EQUIPMENT ================= */
  OM.pages.equipment = function (el) {
    if (!S.moduleAccess("equipment")) { el.innerHTML = ui.empty("Equipment is restricted to Production, Creative, Technology, department heads, and executives.", "🔒"); return; }
    const cats = ["All", ...new Set(S.db.equipment.map((e) => e.category))];
    let activeCat = "All";
    const me = S.me();
    function draw() {
      const rows = S.db.equipment.filter((e) => activeCat === "All" || e.category === activeCat);
      const counts = { available: 0, checked_out: 0, maintenance: 0, damaged: 0, assigned: 0 };
      S.db.equipment.forEach((e) => counts[e.status] !== undefined && counts[e.status]++);
      el.innerHTML = ui.pageHead("Equipment room", "Every asset, its condition, and who has it",
          S.can("create", "equipment") ? `<button class="btn btn-gold" id="newEquip">+ Add equipment</button>` : "") +
        ui.kpi([
          { label: "Fleet value", value: U.money(S.db.equipment.reduce((s2, e) => s2 + e.value, 0), { compact: true }), sub: S.db.equipment.length + " assets" },
          { label: "Available", value: counts.available, tone: "good" },
          { label: "Checked out / assigned", value: counts.checked_out + counts.assigned },
          { label: "Maintenance", value: counts.maintenance, tone: counts.maintenance ? "warn" : null },
          { label: "Damaged", value: counts.damaged, tone: counts.damaged ? "bad" : null },
        ]) +
        `<div class="tab-row sub-tabs">${cats.map((c) => `<button class="tab ${c === activeCat ? "active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}</div>
        <div class="eq-grid">${rows.map((e) => `
          <div class="card eq-card">
            <div class="eq-top"><span class="mono muted">${esc(e.assetTag)}</span>${ui.badge(e.status)}</div>
            <b class="eq-name">${esc(e.name)}</b>
            <span class="muted">${esc(e.category)} · SN ${esc(e.serial)} · ${U.money(e.value, { compact: true })}</span>
            <span class="muted">${esc(e.location)}${e.assignedTo ? " · with " + esc(S.userName(e.assignedTo)) : ""}</span>
            ${e.note ? `<span class="eq-note">${esc(e.note)}</span>` : ""}
            <div class="eq-actions">
              ${e.status === "available" && S.can("checkout", "equipment", e) ? `<button class="btn btn-gold btn-sm" data-out="${e.id}">Check out</button>` : ""}
              ${(e.status === "checked_out") && S.can("checkin", "equipment", e) && (e.assignedTo === me.id || S.isExec(me) || me.dept === "Technology" || me.role === "dept_head") ? `<button class="btn btn-ghost btn-sm" data-in="${e.id}">Check in</button>` : ""}
              ${S.can("manage", "equipment", e) && e.status !== "maintenance" ? `<button class="btn btn-ghost btn-sm" data-mnt="${e.id}">→ Maintenance</button>` : ""}
              ${S.can("manage", "equipment", e) && (e.status === "maintenance" || e.status === "damaged") ? `<button class="btn btn-ghost btn-sm" data-fix="${e.id}">Mark repaired</button>` : ""}
              ${S.can("edit", "equipment", e) ? `<button class="btn btn-ghost btn-sm" data-edit-eq="${e.id}">Edit</button>` : ""}
              ${S.can("delete", "equipment", e) ? `<button class="btn btn-danger-ghost btn-sm" data-del-eq="${e.id}">Delete</button>` : ""}
            </div>
          </div>`).join("")}</div>`;
      el.querySelectorAll("[data-cat]").forEach((b) => b.addEventListener("click", () => { activeCat = b.dataset.cat; draw(); }));
      const newEq = el.querySelector("#newEquip");
      if (newEq) newEq.addEventListener("click", () => ui.formModal("Add equipment", [
        { name: "assetTag", label: "Asset tag", required: true, placeholder: "e.g. CAM-014" },
        { name: "name", label: "Name", required: true, span2: true, placeholder: "e.g. Sony FX6 Camera Body" },
        { name: "category", label: "Category", placeholder: "e.g. Cameras, Lenses, Audio, Lighting, Computers" },
        { name: "serial", label: "Serial number" },
        { name: "value", label: "Value ($)", type: "number" },
        { name: "location", label: "Location", value: "Studio A cage" },
        { name: "note", label: "Notes", type: "textarea", span2: true },
      ], (v, close) => {
        S.create("equipment", { assetTag: v.assetTag, name: v.name, category: v.category || "Uncategorized", serial: v.serial, status: "available", condition: "good", value: v.value ? +v.value : 0, purchaseDate: Date.now(), location: v.location, note: v.note }, "Added equipment — " + v.name);
        close(); ui.toast("Equipment added.", "good"); draw();
      }));
      el.querySelectorAll("[data-edit-eq]").forEach((b) => b.addEventListener("click", () => {
        const e = S.find("equipment", b.dataset.editEq);
        ui.formModal("Edit " + e.name, [
          { name: "name", label: "Name", value: e.name, required: true, span2: true },
          { name: "category", label: "Category", value: e.category },
          { name: "serial", label: "Serial number", value: e.serial },
          { name: "value", label: "Value ($)", type: "number", value: e.value },
          { name: "location", label: "Location", value: e.location },
          { name: "note", label: "Notes", type: "textarea", value: e.note, span2: true },
        ], (v, close) => {
          S.update("equipment", e.id, { name: v.name, category: v.category, serial: v.serial, value: v.value ? +v.value : 0, location: v.location, note: v.note }, "Updated equipment — " + v.name);
          close(); ui.toast("Equipment updated.", "good"); draw();
        }, { wide: true });
      }));
      el.querySelectorAll("[data-del-eq]").forEach((b) => b.addEventListener("click", () => {
        const e = S.find("equipment", b.dataset.delEq);
        ui.confirmModal("Delete equipment", `Delete "<b>${esc(e.name)}</b>" (${esc(e.assetTag)})? This is recorded in the audit log.`, (reason) => {
          S.remove("equipment", e.id, reason);
          ui.toast("Equipment deleted.", "good");
          draw();
        }, { danger: true, reason: true, okLabel: "Delete" });
      }));
      el.querySelectorAll("[data-out]").forEach((b) => b.addEventListener("click", () => ui.formModal("Check out equipment", [
        { name: "projectId", label: "For project", type: "select", options: [["", "— General use —"]].concat(S.db.projects.filter((p) => p.status === "active").map((p) => [p.id, p.code + " · " + p.name])) },
      ], (v, close) => { S.checkoutEquipment(b.dataset.out, v.projectId || null); close(); ui.toast("Checked out. It's on you now.", "good"); draw(); })));
      el.querySelectorAll("[data-in]").forEach((b) => b.addEventListener("click", () => ui.formModal("Check in equipment", [
        { name: "condition", label: "Condition on return", type: "select", options: [["good", "Good"], ["fair", "Fair — flag for inspection"], ["damaged", "Damaged — file report"]] },
        { name: "note", label: "Notes / damage description", type: "textarea", span2: true },
      ], (v, close) => { S.checkinEquipment(b.dataset.in, v.condition, v.note); close(); ui.toast(v.condition === "damaged" ? "Checked in — damage report routed to Technology." : "Checked in.", v.condition === "damaged" ? "warn" : "good"); draw(); })));
      el.querySelectorAll("[data-mnt]").forEach((b) => b.addEventListener("click", () => {
        S.update("equipment", b.dataset.mnt, { status: "maintenance" }, "Sent " + S.find("equipment", b.dataset.mnt).name + " to maintenance");
        draw();
      }));
      el.querySelectorAll("[data-fix]").forEach((b) => b.addEventListener("click", () => {
        S.update("equipment", b.dataset.fix, { status: "available", condition: "good", note: null, location: "Studio A cage" }, "Marked " + S.find("equipment", b.dataset.fix).name + " repaired and available");
        draw();
      }));
    }
    draw();
  };

  /* ================= LIBRARY (resources + documents) ================= */
  OM.pages.resources = function (el) {
    const me = S.me();
    const visible = () => S.db.resources.filter((r) => S.can("view", "resource", r));
    const cats = ["All", ...new Set(visible().map((r) => r.category))];
    let activeCat = "All", q = "";
    function draw() {
      const rows = visible().filter((r) => (activeCat === "All" || r.category === activeCat) && (!q || (r.name + " " + (r.tags || []).join(" ")).toLowerCase().includes(q.toLowerCase())));
      el.innerHTML = ui.pageHead("Resource library", "Templates, SOPs, playbooks, and brand assets — filtered to what your role can see",
        S.can("create", "resource") ? `<button class="btn btn-gold" id="upRes">⇪ Upload</button>` : "") +
        `<div class="lib-toolbar">
          <div class="search-box"><input type="text" id="libQ" placeholder="Search library…" value="${esc(q)}"></div>
          <div class="tab-row sub-tabs">${cats.map((c) => `<button class="tab ${c === activeCat ? "active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}</div>
        </div>
        <div class="lib-grid">${rows.map((r) => `
          <div class="card lib-card">
            <div class="lib-top"><span class="file-icon">${r.type.toUpperCase()}</span><span class="muted">v${r.version}</span></div>
            <b>${esc(r.name)}</b>
            <span class="muted">${esc(r.category)} · ${U.fileSize(r.size)} · ${esc(S.userName(r.uploadedBy))}</span>
            <div class="lib-tags">${(r.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}${r.depts ? `<span class="tag tag-lock">🔒 ${r.depts.join(", ")}</span>` : ""}</div>
            <div class="eq-actions">
              <button class="btn btn-ghost btn-sm" data-dl="${r.id}">⤓ Download</button>
              <button class="btn btn-ghost btn-sm" data-view="${r.id}">Preview</button>
            </div>
          </div>`).join("") || ui.empty("Nothing matches this filter.")}</div>`;
      el.querySelectorAll("[data-cat]").forEach((b) => b.addEventListener("click", () => { activeCat = b.dataset.cat; draw(); }));
      const qi = el.querySelector("#libQ");
      qi.addEventListener("input", () => { q = qi.value; const pos = qi.selectionStart; draw(); const n = el.querySelector("#libQ"); n.focus(); n.setSelectionRange(pos, pos); });
      el.querySelectorAll("[data-dl]").forEach((b) => b.addEventListener("click", () => {
        const r = S.find("resource", b.dataset.dl);
        S.audit("export", "resource", r.id, "Downloaded — " + r.name);
        OM.actions.openAttachment(r.storagePath);
      }));
      el.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => {
        const r = S.find("resource", b.dataset.view);
        ui.modal(r.name, `<div class="preview-box"><span class="file-icon xl">${r.type.toUpperCase()}</span>
          <p class="muted">Version ${r.version} · ${U.fileSize(r.size)} · uploaded ${U.date(r.uploadedAt)} by ${esc(S.userName(r.uploadedBy))}</p>
          <div class="detail-grid"><div><span class="detail-label">Category</span><b>${esc(r.category)}</b></div>
          <div><span class="detail-label">Access</span><b>${r.depts ? esc(r.depts.join(", ")) : "Company-wide"} · ${OM.ROLES[r.minRole] ? OM.ROLES[r.minRole].label + "+" : "All roles"}</b></div></div>
          <h4 class="modal-sub">Version history</h4>
          ${Array.from({ length: Math.min(3, r.version) }, (_, i) => `<div class="list-row"><span class="list-main">v${r.version - i}${i === 0 ? " (current)" : ""}</span><span class="muted">${U.date(r.uploadedAt - i * 30 * U.DAY)}</span></div>`).join("")}`);
      }));
      const up = el.querySelector("#upRes");
      if (up) up.addEventListener("click", () => ui.formModal("Upload to library", [
        { name: "file", label: "File", type: "file", required: true, span2: true },
        { name: "name", label: "Resource name", required: true, span2: true },
        { name: "category", label: "Category", type: "select", options: ["Contracts", "Handbooks", "Templates", "SOPs", "Production", "Creative", "Sales", "Finance", "Technology", "HR", "Legal", "Brand Assets", "Training", "Equipment Guides", "Marketing", "Archive"] },
        { name: "minRole", label: "Minimum role", type: "select", options: Object.entries(OM.ROLES).filter(([k]) => !OM.ROLES[k].exec).map(([k, v]) => [k, v.label]).reverse() },
        { name: "tags", label: "Tags (comma-separated)", span2: true },
      ], async (v, close) => {
        const file = v.file;
        if (!file || !file.size) throw new Error("Choose a file to upload.");
        const resId = S.uid();
        const { path } = await OM.db.uploadAttachment("resources", resId, file);
        const ext = (file.name.split(".").pop() || "").toLowerCase();
        S.create("resource", { id: resId, name: v.name, category: v.category, type: ext, storagePath: path, size: file.size, uploadedBy: S.meId, uploadedAt: Date.now(), tags: (v.tags || "").split(",").map((s2) => s2.trim()).filter(Boolean), minRole: v.minRole, version: 1 }, "Uploaded resource — " + v.name);
        close(); ui.toast("Uploaded to library.", "good"); draw();
      }));
    }
    draw();
  };

  OM.pages.documents = function (el) {
    const visible = () => S.db.documents.filter((d) => S.can("view", "document", d));
    el.innerHTML = ui.pageHead("Documents", "Contracts, filings, releases, and records — everything searchable",
      S.can("create", "document") ? `<button class="btn btn-gold" onclick="OM.actions.uploadDoc(null,null)">⇪ Upload</button>` : "");
    const host = document.createElement("div");
    host.className = "card card-flush";
    el.appendChild(host);
    ui.table(host, {
      rows: visible,
      searchKeys: ["name", "category", (d) => (d.tags || []).join(" "), (d) => { const c = S.find("client", d.clientId); return c ? c.name : ""; }],
      exportName: "document-register", exportEntity: "document",
      defaultSort: { key: "uploadedAt", dir: -1 },
      columns: [
        { key: "name", label: "Document", render: (d) => `<span class="file-icon">${d.type.toUpperCase()}</span> <b>${esc(d.name)}</b>${d.confidential ? ' <span class="badge tone-bad">Confidential</span>' : ""}` },
        { key: "category", label: "Category" },
        { key: "rel", label: "Related to", render: (d) => { const c = S.find("client", d.clientId); const p = S.find("project", d.projectId); return c ? esc(c.name) : p ? esc(p.code) : '<span class="muted">Company</span>'; } },
        { key: "version", label: "Ver", render: (d) => "v" + d.version },
        { key: "uploadedBy", label: "By", render: (d) => esc(S.userName(d.uploadedBy)) },
        { key: "uploadedAt", label: "Date", render: (d) => U.date(d.uploadedAt), sortVal: (d) => d.uploadedAt },
        { key: "act", label: "", render: (d) => d.storagePath ? `<button class="btn btn-ghost btn-sm" data-open="${d.id}">⤓ Download</button>` : '<span class="muted">—</span>' },
      ],
      afterRender: (host) => host.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", (e) => {
        e.stopPropagation();
        const d = S.find("document", b.dataset.open);
        S.audit("export", "document", d.id, "Downloaded — " + d.name);
        OM.actions.openAttachment(d.storagePath);
      })),
    });
  };

  /* ================= COMMUNICATIONS MODULE ================= */
  OM.pages.comms = function (el) {
    el.innerHTML = ui.pageHead("Communications", "Calls, emails, meetings, texts, voice notes, and internal notes — one ledger") + `<div id="commPanel"></div>`;
    const me = S.me();
    OM.renderCommsPanel(el.querySelector("#commPanel"), () => S.db.comms.filter((c) => {
      if (S.isExec(me) || (me.role === "dept_head" && me.dept === "Sales")) return true;
      if (me.dept === "Sales") return c.userId === me.id || (c.leadId && (S.find("lead", c.leadId) || {}).assignedTo === me.id);
      return c.userId === me.id || (c.clientId && S.myClientIds(me).has(c.clientId));
    }));
  };

  /* ================= APPROVAL CENTER ================= */
  OM.pages.approvals = function (el) {
    const me = S.me();
    if (!S.moduleAccess("approvals") && !S.db.approvals.some((a) => a.requestedBy === me.id)) {
      el.innerHTML = ui.empty("The Approval Center is for approvers. Your submitted requests will appear in notifications.", "🔒");
      return;
    }
    const mine = S.db.approvals.filter((a) => S.can("view", "approval", a) || a.requestedBy === me.id);
    const pending = mine.filter((a) => a.status === "pending");
    const history = mine.filter((a) => a.status !== "pending").sort((a, b) => b.requestedAt - a.requestedAt);
    const typeIcons = { expense: "$", contract: "✎", hire: "☺", equipment: "⚙", timeoff: "✈", invoice: "▤", promotion: "▲", permission: "🔑" };

    el.innerHTML = ui.pageHead("Approval Center", "Everything waiting on a decision — expenses, hires, contracts, purchases") +
      ui.kpi([
        { label: "Waiting on you", value: pending.filter((a) => S.can("approve", "approval", a)).length, tone: "warn" },
        { label: "Total pending", value: pending.length },
        { label: "Pending value", value: U.money(pending.reduce((s2, a) => s2 + (a.amount || 0), 0), { compact: true }) },
        { label: "Decided (30d)", value: history.filter((a) => (a.decisions || []).some((d) => d.ts > Date.now() - 30 * U.DAY)).length },
      ]) +
      ui.sectionCard("Pending", pending.length ? pending.map((a) => `
        <div class="approval-row">
          <span class="list-icon">${typeIcons[a.type] || "✓"}</span>
          <span class="list-main">
            <b>${esc(a.title)}</b>
            <span class="muted">${esc(a.description || "")}</span>
            <span class="muted">Requested by ${esc(S.userName(a.requestedBy))} · ${U.ago(a.requestedAt)} · needs: ${(a.approverRoles || []).map((r) => r === "exec" ? "Executive" : r === "ceo" ? "CEO" : r === "hr" ? "HR" : "Head of " + r.split(":")[1]).join(" + ")}</span>
            ${(a.decisions || []).map((d) => `<span class="muted">✓ ${esc(S.userName(d.userId))} ${d.decision} ${U.ago(d.ts)}${d.note ? " — “" + esc(d.note) + "”" : ""}</span>`).join("")}
          </span>
          ${a.amount ? `<span class="lead-value">${U.money(a.amount)}</span>` : ""}
          <span class="badge tone-${{ urgent: "bad", high: "warn", medium: "info", low: "neutral" }[a.priority]}">${U.cap(a.priority)}</span>
          ${S.can("approve", "approval", a) && !(a.decisions || []).some((d) => d.userId === me.id) ? `
            <span class="cq-actions"><button class="btn btn-gold btn-sm" data-app="${a.id}">Approve</button>
            <button class="btn btn-danger-ghost btn-sm" data-rej="${a.id}">Reject</button></span>` : (a.decisions || []).some((d) => d.userId === me.id) ? '<span class="muted">You decided</span>' : ""}
        </div>`).join("") : ui.empty("Nothing pending. The queue is clear.", "✓")) +
      ui.sectionCard("Decision history", history.slice(0, 12).map((a) => `
        <div class="list-row"><span class="list-icon">${typeIcons[a.type] || "✓"}</span>
        <span class="list-main"><b>${esc(a.title)}</b><span class="muted">${(a.decisions || []).map((d) => esc(S.userName(d.userId)) + " " + d.decision + (d.note ? " — “" + esc(d.note) + "”" : "")).join(" · ")}</span></span>
        ${ui.badge(a.status)}</div>`).join("") || ui.empty("No decisions yet."));

    el.querySelectorAll("[data-app]").forEach((b) => b.addEventListener("click", () => ui.formModal("Approve", [
      { name: "note", label: "Note (optional)", type: "textarea", span2: true },
    ], (v, close) => {
      S.decideApproval(b.dataset.app, "approved", v.note);
      close(); ui.toast("Approved.", "good"); OM.router.refresh();
    }, { submitLabel: "Approve" })));
    el.querySelectorAll("[data-rej]").forEach((b) => b.addEventListener("click", () => ui.formModal("Reject", [
      { name: "note", label: "Reason (required — sent to requester and audit log)", type: "textarea", required: true, span2: true },
    ], (v, close) => {
      S.decideApproval(b.dataset.rej, "rejected", v.note);
      close(); ui.toast("Rejected with reason.", "warn"); OM.router.refresh();
    }, { submitLabel: "Reject" })));
  };

  /* ================= NOTIFICATIONS ================= */
  OM.pages.notifications = function (el) {
    const rows = S.myNotifications();
    el.innerHTML = ui.pageHead("Notifications", rows.filter((n) => !n.read).length + " unread",
      rows.some((n) => !n.read) ? `<button class="btn btn-ghost" id="markAll">Mark all read</button>` : "") +
      `<div class="card card-flush">` + (rows.slice(0, 60).map((n) => `
        <div class="list-row notif ${n.read ? "" : "unread"} clickable" data-n="${n.id}">
          <span class="list-icon">${ui.KIND_ICONS[n.kind] || "•"}</span>
          <span class="list-main"><b>${esc(n.title)}</b><span class="muted">${esc(n.body || "")}</span></span>
          <span class="muted">${U.ago(n.ts)}</span>${n.read ? "" : '<span class="unread-dot"></span>'}
        </div>`).join("") || ui.empty("You're all caught up.", "✓")) + "</div>";
    el.querySelectorAll("[data-n]").forEach((r) => r.addEventListener("click", () => {
      const n = S.db.notifications.find((x) => x.id === r.dataset.n);
      S.markRead(n.id);
      location.hash = (n.link || "#/").replace(/^#?/, "#").replace("##", "#");
    }));
    const ma = el.querySelector("#markAll");
    if (ma) ma.addEventListener("click", () => { S.markAllRead(); OM.router.refresh(); });
  };

  /* ================= AUDIT CENTER (exec only) ================= */
  OM.pages.audit = function (el) {
    if (!S.can("view", "audit")) { el.innerHTML = ui.empty("The audit log is restricted to executives.", "🔒"); return; }
    el.innerHTML = ui.pageHead("Audit Center", "Append-only ledger of every action in the system — nothing here can be edited or deleted");
    const host = document.createElement("div");
    host.className = "card card-flush";
    el.appendChild(host);
    ui.table(host, {
      rows: () => S.db.audit.slice().reverse(),
      searchKeys: ["summary", "action", "entity", (a) => S.userName(a.userId), "dept"],
      exportName: "audit-log", exportEntity: "audit-export",
      pageSize: 30,
      columns: [
        { key: "ts", label: "Time", width: "150px", render: (a) => `<span class="mono muted">${U.dateTime(a.ts)}</span>`, sortVal: (a) => a.ts },
        { key: "userId", label: "Actor", render: (a) => `<b>${esc(S.userName(a.userId))}</b><div class="muted">${OM.ROLES[a.role] ? OM.ROLES[a.role].label : esc(a.role)} · ${esc(a.dept)}</div>`, sortVal: (a) => S.userName(a.userId) },
        { key: "action", label: "Action", render: (a) => `<span class="badge tone-${a.denied ? "bad" : { create: "good", delete: "bad", approve: "warn", export: "info", manage: "warn" }[a.action] || "neutral"}">${a.denied ? "DENIED" : U.cap(a.action)}</span>` },
        { key: "summary", label: "Detail", render: (a) => `${esc(a.summary)}${a.reason ? `<div class="muted">Reason: ${esc(a.reason)}</div>` : ""}${a.prev || a.next ? `<div class="muted mono diff">${a.prev ? "− " + esc(String(a.prev).slice(0, 80)) : ""}${a.next ? "<br>+ " + esc(String(a.next).slice(0, 80)) : ""}</div>` : ""}` },
        { key: "ip", label: "IP / Client", render: (a) => `<span class="mono muted">${esc(a.ip)}</span><div class="muted">${esc(a.ua || "")}</div>` },
      ],
    });
  };

  /* ================= SETTINGS / PROFILE ================= */
  OM.pages.settings = function (el) {
    const me = S.me();
    const myTimeOff = S.db.timeOff.filter((t) => t.userId === me.id);
    const myAudit = S.db.audit.filter((a) => a.userId === me.id).slice(-10).reverse();
    const myReviews = S.db.reviews.filter((r) => r.userId === me.id && r.status === "approved");
    el.innerHTML = ui.pageHead("Profile & settings", "") +
      `<div class="grid-2"><div>` +
      ui.sectionCard("My profile", `
        <div class="profile-row">
          <div class="avatar-upload" id="avatarUpload">
            ${ui.avatar(me, "xl")}
            <div class="avatar-upload-overlay">⤒</div>
            <input type="file" id="avatarFile" accept="image/png,image/jpeg,image/webp" hidden>
          </div>
          <div><b>${esc(me.name)}</b><div class="muted">${esc(me.title || "No title set")} · ${esc(me.dept)}</div>
          <span class="badge tone-${S.isExec(me) ? "warn" : "neutral"}">${OM.ROLES[me.role].label}</span></div>
        </div>
        <form class="om-form" id="profileForm">
          <div class="form-grid">
            <label class="form-field"><span class="form-label">Full name</span><input type="text" name="name" value="${esc(me.name)}" required></label>
            <label class="form-field"><span class="form-label">Phone</span><input type="text" name="phone" value="${esc(me.phone || "")}" placeholder="(555) 555-0100"></label>
            <label class="form-field span2"><span class="form-label">Title</span><input type="text" name="title" value="${esc(me.title || "")}" placeholder="e.g. Senior Editor"></label>
          </div>
          <div class="form-actions"><button type="submit" class="btn btn-gold btn-sm">Save profile</button></div>
        </form>
        <div class="detail-grid" style="margin-top:14px">
          <div><span class="detail-label">Email</span><b>${esc(me.email)}</b></div>
          <div><span class="detail-label">Department / role</span><b>${esc(me.dept)} · ${OM.ROLES[me.role].label}</b></div>
          <div><span class="detail-label">Joined</span><b>${U.date(me.hireDate)}</b></div>
          <div><span class="detail-label">Access level</span><b>${OM.ROLES[me.role].level}</b></div>
        </div>
        <p class="footnote">Department and role are placed by HR or an executive — reach out to change those.</p>`) +
      ui.sectionCard("My time off", myTimeOff.map((t) => `<div class="list-row"><span class="list-main">${esc(t.type)} · ${U.dateShort(t.start)} → ${U.dateShort(t.end)}</span>${ui.badge(t.status)}</div>`).join("") + `
        <div class="row-gap"><button class="btn btn-gold btn-sm" id="reqTO">+ Request time off</button></div>`) +
      `</div><div>` +
      (myReviews.length ? ui.sectionCard("My reviews", myReviews.map((r) => `
        <div class="list-row"><span class="list-main"><b>${U.cap(r.reviewType || "review")} — ${esc(r.period || "")}</b><span class="muted">Reviewer: ${esc(S.userName(r.reviewerId))} · Final rating ${esc(r.finalRating || r.score || "—")}</span></span>
        ${r.acknowledgedAt ? ui.badge("acknowledged") : `<button class="btn btn-gold btn-sm" data-ack="${r.id}">Acknowledge</button>`}</div>`).join("")) : "") +
      ui.sectionCard("What my role can do", permSummary(me)) +
      ui.sectionCard("My recent activity", ui.timeline(myAudit.map((a) => ({ ts: a.ts, title: esc(a.summary) })))) +
      ui.sectionCard("Session", `<p class="muted">You're signed in as ${esc(me.email)}. Your workspace data is stored securely in the cloud and shared with your team in real time.</p>
        <button class="btn btn-ghost" id="signOutSettings">Sign out</button>`) +
      `</div></div>`;
    el.querySelector("#reqTO").addEventListener("click", () => ui.formModal("Request time off", [
      { name: "type", label: "Type", type: "select", options: ["Vacation", "Sick", "Personal"] },
      { name: "startDays", label: "Starts in (days)", type: "number", required: true, value: 14 },
      { name: "days", label: "Number of days", type: "number", required: true, value: 1 },
      { name: "reason", label: "Reason (optional)", span2: true },
    ], (v, close) => {
      const start = Date.now() + (+v.startDays) * U.DAY;
      const t = S.create("timeoff", { userId: S.meId, type: v.type, start, end: start + (+v.days - 1) * U.DAY, days: +v.days, status: "pending", reason: v.reason || "" }, "Requested time off — " + v.days + "d " + v.type);
      // Executives only decide approvals now (see decide_approval(), 0015).
      S.create("approval", { type: "timeoff", title: "Time off — " + me.name + ", " + v.days + " day" + (v.days > 1 ? "s" : ""), refType: "timeoff", refId: t.id, requestedBy: S.meId, requestedAt: Date.now(), status: "pending", priority: "low", approverRoles: ["exec"], description: v.type + " starting " + U.date(start) });
      S.notify(S.execIds(), "hr", "Time off request: " + me.name, v.days + "d " + v.type, "#/approvals");
      close(); ui.toast("Request submitted for approval.", "good"); OM.router.refresh();
    }));
    el.querySelector("#signOutSettings").addEventListener("click", async () => { await S.signOut(); location.hash = "#/"; OM.renderLogin(); });

    el.querySelector("#profileForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const v = ui.formValues(e.target);
      S.update("user", me.id, { name: v.name, phone: v.phone, title: v.title }, "Updated own profile");
      ui.toast("Profile saved.", "good");
      OM.router.refresh();
    });

    const avatarWrap = el.querySelector("#avatarUpload");
    const avatarInput = el.querySelector("#avatarFile");
    avatarWrap.addEventListener("click", () => avatarInput.click());
    avatarInput.addEventListener("change", async () => {
      const file = avatarInput.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { ui.toast("Image must be under 5MB.", "bad"); return; }
      avatarWrap.classList.add("uploading");
      try {
        const url = await OM.db.uploadAvatar(me.id, file);
        S.update("user", me.id, { avatarUrl: url }, "Updated profile photo");
        ui.toast("Profile photo updated.", "good");
        OM.router.refresh();
      } catch (err) {
        ui.toast("Upload failed: " + err.message, "bad");
      } finally {
        avatarWrap.classList.remove("uploading");
      }
    });

    el.querySelectorAll("[data-ack]").forEach((b) => b.addEventListener("click", () => {
      try { S.acknowledgeReview(b.dataset.ack); ui.toast("Review acknowledged.", "good"); OM.router.refresh(); }
      catch (e) { ui.toast(e.message, "bad"); }
    }));
  };

  function permSummary(me) {
    const checks = [
      ["View executive workspace", S.moduleAccess("exec", me)],
      ["View finance", S.moduleAccess("finance", me)],
      ["View HR", S.moduleAccess("hr", me)],
      ["Access sales CRM", S.moduleAccess("sales", me)],
      ["Approve requests", S.can("approve", "approval", null, me)],
      ["Delete records", me.role !== "intern" && me.role !== "contractor"],
      ["Export data", S.can("export", "document", null, me)],
      ["View audit log", S.can("view", "audit", null, me)],
    ];
    return checks.map(([label, ok]) => `<div class="perm-row ${ok ? "ok" : ""}"><span>${ok ? "✓" : "✕"}</span>${esc(label)}</div>`).join("") +
      `<p class="muted footnote">Permissions are enforced in the data layer — every allowed and denied action is written to the audit ledger.</p>`;
  }
})();
