/* Oakframe Media OS — Client Portal.
   Entirely separate shell, nav, and router from the staff app. Every route
   here is prefixed #/c/ so the split is unmistakable and easy to guard: a
   client account is redirected to #/c/ the instant the hash stops matching
   that prefix (js/app.js), on top of (never instead of) the RLS policies
   that make staff tables genuinely unreadable to a client role. */
(function () {
  const OM = window.OM;
  const U = OM.util, ui = OM.ui, ch = OM.charts;
  const S = OM.store, M = OM.metrics;
  const esc = U.esc;
  const CP = (OM.client = {});

  function me() { return S.me(); }
  function myClient() { return S.find("client", me().clientId); }
  function myProjects() { return S.db.projects.filter((p) => p.clientId === me().clientId); }

  /* ================= SHELL ================= */
  const NAV = [
    { hash: "#/c/", icon: "◆", label: "Dashboard", match: /^#\/c\/?$/ },
    { hash: "#/c/projects", icon: "▣", label: "Projects", match: /^#\/c\/project/ },
    { hash: "#/c/deliverables", icon: "▤", label: "Deliverables", match: /^#\/c\/deliverables/ },
    { hash: "#/c/approvals", icon: "✓", label: "Approvals", match: /^#\/c\/approvals/ },
    { hash: "#/c/contracts", icon: "✎", label: "Contracts", match: /^#\/c\/contract/ },
    { hash: "#/c/proposals", icon: "◈", label: "Proposals", match: /^#\/c\/proposal/ },
    { hash: "#/c/invoices", icon: "$", label: "Invoices", match: /^#\/c\/invoices/ },
    { hash: "#/c/files", icon: "▦", label: "Files", match: /^#\/c\/files/ },
    { hash: "#/c/messages", icon: "✉", label: "Messages", match: /^#\/c\/messages/ },
    { hash: "#/c/meetings", icon: "◫", label: "Meetings", match: /^#\/c\/meetings/ },
    { hash: "#/c/support", icon: "☺", label: "Support", match: /^#\/c\/support/ },
  ];

  CP.renderShell = function () {
    const u = me();
    const client = myClient();
    document.body.className = "";
    document.body.innerHTML = `
      <div class="shell" id="shell">
        <aside class="sidebar" id="sidebar">
          <div class="brand"><div class="brand-mark" onclick="location.hash='#/c/'">O</div>
            <div class="brand-text" onclick="location.hash='#/c/'"><b>Oakframe Media</b><span>Client Portal</span></div></div>
          <nav class="nav" id="nav"></nav>
          <div class="sidebar-foot">
            <div class="me-chip" id="meChip" onclick="location.hash='#/c/settings'">${ui.avatar(u)}<div class="me-info"><b>${esc(u.name)}</b><span>${esc(client ? client.name : "")}</span></div></div>
          </div>
        </aside>
        <div class="main-col">
          <header class="topbar">
            <button class="icon-btn burger" id="burger">☰</button>
            <div class="flex-spacer"></div>
            <button class="icon-btn" id="themeBtn" title="Toggle light/dark theme">${OM.theme.get() === "dark" ? "☀" : "☾"}</button>
            <button class="icon-btn bell" id="bellBtn" title="Notifications">◉<span class="bell-count" id="bellCount"></span></button>
            <div class="user-menu-wrap">
              <button class="icon-btn" id="userBtn">${ui.avatar(u)}</button>
              <div class="user-menu" id="userMenu">
                <div class="um-head"><b>${esc(u.name)}</b><span class="muted">${esc(client ? client.name : "")}</span></div>
                <a href="#/c/settings">Profile settings</a>
                <button id="signOut">Sign out</button>
              </div>
            </div>
          </header>
          <main class="content" id="content"></main>
        </div>
      </div>`;
    renderNav();
    document.getElementById("burger").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
    document.getElementById("bellBtn").addEventListener("click", () => (location.hash = "#/c/notifications"));
    document.getElementById("themeBtn").addEventListener("click", (e) => { OM.theme.toggle(); e.currentTarget.textContent = OM.theme.get() === "dark" ? "☀" : "☾"; });
    const userBtn = document.getElementById("userBtn"), menu = document.getElementById("userMenu");
    userBtn.addEventListener("click", (e) => { e.stopPropagation(); menu.classList.toggle("open"); });
    document.addEventListener("click", () => menu.classList.remove("open"));
    document.getElementById("signOut").addEventListener("click", async () => { await S.signOut(); location.hash = "#/"; OM.renderLogin(); });
  };

  function renderNav() {
    const nav = document.getElementById("nav");
    if (!nav) return;
    const hash = location.hash || "#/c/";
    nav.innerHTML = `<div class="nav-section">${NAV.map((it) => {
      const active = it.match.test(hash);
      return `<a class="nav-item ${active ? "active" : ""}" href="${it.hash}"><span class="nav-icon">${it.icon}</span>${esc(it.label)}</a>`;
    }).join("")}</div>`;
    const bc = document.getElementById("bellCount");
    if (bc) { const n = S.unreadCount(); bc.textContent = n || ""; bc.style.display = n ? "" : "none"; }
  }

  /* ================= ROUTER ================= */
  const routes = [
    [/^#\/c\/?$/, (el) => CP.pages.dashboard(el)],
    [/^#\/c\/projects$/, (el) => CP.pages.projects(el)],
    [/^#\/c\/project\/([\w-]+)$/, (el, m) => CP.pages.project(el, m[1])],
    [/^#\/c\/deliverables$/, (el) => CP.pages.deliverables(el)],
    [/^#\/c\/approvals$/, (el) => CP.pages.approvals(el)],
    [/^#\/c\/contracts$/, (el) => CP.pages.contracts(el)],
    [/^#\/c\/contract\/([\w-]+)$/, (el, m) => CP.pages.contract(el, m[1])],
    [/^#\/c\/proposals$/, (el) => CP.pages.proposals(el)],
    [/^#\/c\/proposal\/([\w-]+)$/, (el, m) => CP.pages.proposal(el, m[1])],
    [/^#\/c\/invoices$/, (el) => CP.pages.invoices(el)],
    [/^#\/c\/files$/, (el) => CP.pages.files(el)],
    [/^#\/c\/messages$/, (el) => CP.pages.messages(el)],
    [/^#\/c\/meetings$/, (el) => CP.pages.meetings(el)],
    [/^#\/c\/support$/, (el) => CP.pages.support(el)],
    [/^#\/c\/settings$/, (el) => CP.pages.settings(el)],
    [/^#\/c\/notifications$/, (el) => CP.pages.notifications(el)],
  ];
  CP.router = {
    render() {
      const hash = location.hash || "#/c/";
      if (!/^#\/c\//.test(hash) && hash !== "#/c") { location.hash = "#/c/"; return; }
      const content = document.getElementById("content");
      if (!content) return;
      let matched = false;
      for (const [re, fn] of routes) {
        const m = hash.match(re);
        if (m) { try { fn(content, m); } catch (e) { content.innerHTML = ui.empty(e.message, "⚠"); console.error(e); } matched = true; break; }
      }
      if (!matched) content.innerHTML = ui.empty("Page not found.", "◇");
      renderNav();
      const sb = document.getElementById("sidebar"); if (sb) sb.classList.remove("open");
      content.scrollTop = 0;
    },
    refresh() { CP.router.render(); },
  };

  CP.pages = {};

  /* ================= DASHBOARD ================= */
  CP.pages.dashboard = function (el) {
    const u = me(), client = myClient();
    const projects = myProjects().filter((p) => p.status === "active");
    const deliverables = S.db.deliverables.filter((d) => d.clientId === u.clientId);
    const awaitingApproval = deliverables.filter((d) => d.status === "sent_to_client");
    const contracts = S.db.contracts.filter((c) => c.clientId === u.clientId && ["sent", "viewed"].includes(c.status));
    const proposals = S.db.proposals.filter((p) => p.clientId === u.clientId && ["sent", "viewed"].includes(p.status));
    const invoicesDue = S.db.invoices.filter((i) => i.clientId === u.clientId && ["sent", "overdue", "viewed", "partial"].includes(i.status));
    const meetings = S.db.meetings.filter((m) => m.clientId === u.clientId && m.ts > Date.now()).sort((a, b) => a.ts - b.ts);
    const messages = S.db.clientMessages.filter((m) => m.clientId === u.clientId).sort((a, b) => b.createdAt - a.createdAt);
    const recentFiles = S.db.documents.filter((d) => d.clientId === u.clientId && ["client_visible", "final_delivery"].includes(d.visibility)).sort((a, b) => b.uploadedAt - a.uploadedAt);

    el.innerHTML = ui.pageHead(`Welcome, ${esc(u.name.split(" ")[0])}`, esc(client ? client.name : "") + " · " + new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })) +
      ui.kpi([
        { label: "Active projects", value: projects.length, link: "#/c/projects" },
        { label: "Awaiting your approval", value: awaitingApproval.length, tone: awaitingApproval.length ? "warn" : null, link: "#/c/approvals" },
        { label: "Contracts to sign", value: contracts.filter((c) => !c.viewedAt || c.status === "viewed" || c.status === "sent").length, tone: contracts.length ? "warn" : null, link: "#/c/contracts" },
        { label: "Proposals to review", value: proposals.length, tone: proposals.length ? "warn" : null, link: "#/c/proposals" },
        { label: "Invoices due", value: U.money(invoicesDue.reduce((s, i) => s + i.total, 0), { compact: true }), tone: invoicesDue.some((i) => i.status === "overdue") ? "bad" : null, link: "#/c/invoices" },
      ]) +
      `<div class="grid-2">
        <div>
          ${ui.sectionCard("Current deliverables", deliverables.slice(0, 6).map((d) => `
            <div class="list-row clickable" onclick="location.hash='#/c/deliverables'"><span class="list-icon">▤</span><span class="list-main"><b>${esc(d.name)}</b><span class="muted">v${d.version} · ${U.cap(d.kind)}</span></span>${ui.badge(d.status)}</div>`).join("") || ui.empty("No deliverables yet."))}
          ${ui.sectionCard("Project timeline", projects.map((p) => `
            <div class="list-row clickable" onclick="location.hash='#/c/project/${p.id}'"><span class="list-main"><b>${esc(p.name)}</b><span class="muted">Due ${U.dateShort(p.dueDate)}</span></span>${ch.meter(p.progress)}<span class="muted">${p.progress}%</span></div>`).join("") || ui.empty("No active projects."))}
        </div>
        <div>
          ${ui.sectionCard("Upcoming meetings", meetings.slice(0, 4).map((m) => `<div class="list-row"><span class="list-icon">◫</span><span class="list-main"><b>${esc(m.title)}</b><span class="muted">${U.dateTime(m.ts)}</span></span></div>`).join("") || ui.empty("Nothing scheduled."))}
          ${ui.sectionCard("Recent messages", messages.slice(0, 4).map((m) => `<div class="list-row clickable" onclick="location.hash='#/c/messages'"><span class="list-icon">✉</span><span class="list-main"><b>${esc(S.userName(m.senderId === u.id ? m.recipientId : m.senderId))}</b><span class="muted">${esc((m.body || "").slice(0, 70))}</span></span></div>`).join("") || ui.empty("No messages yet."), { action: '<a class="link" href="#/c/messages">Open →</a>' })}
          ${ui.sectionCard("Recent files", recentFiles.slice(0, 5).map((d) => `<div class="list-row"><span class="file-icon">${d.type.toUpperCase()}</span><span class="list-main"><b>${esc(d.name)}</b><span class="muted">${U.date(d.uploadedAt)}</span></span></div>`).join("") || ui.empty("No files yet."), { action: '<a class="link" href="#/c/files">All files →</a>' })}
        </div>
      </div>`;
  };

  /* ================= PROJECTS ================= */
  CP.pages.projects = function (el) {
    el.innerHTML = ui.pageHead("Projects", "Everything Oakframe is producing for you");
    const host = document.createElement("div"); host.className = "card card-flush"; el.appendChild(host);
    ui.table(host, {
      rows: myProjects, searchKeys: ["name", "service"],
      columns: [
        { key: "name", label: "Project", render: (p) => `<b>${esc(p.name)}</b><div class="muted">${esc(p.service)}</div>` },
        { key: "progress", label: "Progress", render: (p) => ch.meter(p.progress) + `<span class="muted">${p.progress}%</span>` },
        { key: "dueDate", label: "Due", render: (p) => U.dateShort(p.dueDate), sortVal: (p) => p.dueDate },
        { key: "status", label: "Status", render: (p) => ui.badge(p.status === "active" ? p.health : p.status) },
      ],
      onRow: (p) => (location.hash = "#/c/project/" + p.id),
    });
  };

  CP.pages.project = function (el, id) {
    const p = S.find("project", id);
    if (!p || p.clientId !== me().clientId) { el.innerHTML = ui.empty("Project not found.", "⚠"); return; }
    const deliverables = S.db.deliverables.filter((d) => d.projectId === p.id && ["sent_to_client", "client_approved", "revision_requested", "final_delivered"].includes(d.status));
    const files = S.db.documents.filter((d) => d.projectId === p.id && ["client_visible", "final_delivery"].includes(d.visibility));
    el.innerHTML = ui.pageHead(esc(p.name), esc(p.service) + " · due " + U.date(p.dueDate), ui.badge(p.status === "active" ? p.health : p.status)) +
      ui.kpi([{ label: "Progress", value: p.progress + "%" }, { label: "Deliverables ready", value: deliverables.length }, { label: "Files shared", value: files.length }]) +
      `<div class="grid-2">
        <div>${ui.sectionCard("About this project", `<p class="body-text">${esc(p.description || "No description provided.")}</p>`)}
        ${ui.sectionCard("Deliverables", deliverables.map((d) => `<div class="list-row clickable" onclick="location.hash='#/c/deliverables'"><span class="list-icon">▤</span><span class="list-main"><b>${esc(d.name)}</b><span class="muted">v${d.version}</span></span>${ui.badge(d.status)}</div>`).join("") || ui.empty("Nothing shared yet."))}</div>
        <div>${ui.sectionCard("Files", files.map((d) => `<div class="list-row"><span class="file-icon">${d.type.toUpperCase()}</span><span class="list-main"><b>${esc(d.name)}</b><span class="muted">${U.date(d.uploadedAt)}</span></span><button class="btn btn-ghost btn-sm" data-open="${d.id}">⤓</button></div>`).join("") || ui.empty("No files yet."))}</div>
      </div>`;
    el.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => OM.actions.openAttachment(S.find("document", b.dataset.open).storagePath)));
  };

  /* ================= DELIVERABLES ================= */
  function deliverableCard(d, opts = {}) {
    return `<div class="card lib-card">
      <div class="lib-top">${ui.badge(d.status)}<span class="muted">v${d.version}</span></div>
      <b>${esc(d.name)}</b><span class="muted">${U.cap(d.kind)} · ${esc((S.find("project", d.projectId) || {}).name || "")}</span>
      ${d.clientNotes ? `<p class="body-text">"${esc(d.clientNotes)}"</p>` : ""}
      <div class="eq-actions">
        ${d.storagePath ? `<button class="btn btn-ghost btn-sm" data-open="${d.id}">⤓ View</button>` : ""}
        ${opts.canReview && d.status === "sent_to_client" ? `<button class="btn btn-gold btn-sm" data-approve="${d.id}">Approve</button><button class="btn btn-ghost btn-sm" data-revise="${d.id}">Request revision</button>` : ""}
      </div>
    </div>`;
  }
  function bindDeliverableActions(el, redraw) {
    el.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => OM.actions.openAttachment(S.find("deliverable", b.dataset.open).storagePath)));
    el.querySelectorAll("[data-approve]").forEach((b) => b.addEventListener("click", () => {
      ui.confirmModal("Approve deliverable", "Approve this deliverable as final?", () => {
        S.clientReviewDeliverable(b.dataset.approve, "client_approved", null).then(() => { ui.toast("Approved.", "good"); redraw(); }).catch((e) => ui.toast(e.message, "bad"));
      }, { okLabel: "Approve" });
    }));
    el.querySelectorAll("[data-revise]").forEach((b) => b.addEventListener("click", () => {
      ui.formModal("Request revision", [{ name: "note", label: "What needs to change?", type: "textarea", required: true, span2: true }], async (v, close) => {
        await S.clientReviewDeliverable(b.dataset.revise, "revision_requested", v.note);
        close(); ui.toast("Revision requested — the project lead has been notified.", "good"); redraw();
      });
    }));
  }
  CP.pages.deliverables = function (el) {
    const rows = () => S.db.deliverables.filter((d) => d.clientId === me().clientId && ["sent_to_client", "client_approved", "revision_requested", "final_delivered"].includes(d.status));
    function draw() {
      el.innerHTML = ui.pageHead("Deliverables", "Everything Oakframe has shared with you") +
        `<div class="lib-grid">${rows().map((d) => deliverableCard(d, { canReview: true })).join("") || ui.empty("Nothing shared yet. Your production team will post deliverables here as they're ready.", "▤")}</div>`;
      bindDeliverableActions(el, draw);
    }
    draw();
  };

  CP.pages.approvals = function (el) {
    const rows = () => S.db.deliverables.filter((d) => d.clientId === me().clientId && d.status === "sent_to_client");
    function draw() {
      el.innerHTML = ui.pageHead("Approvals", "Deliverables waiting on your sign-off") +
        `<div class="lib-grid">${rows().map((d) => deliverableCard(d, { canReview: true })).join("") || ui.empty("Nothing needs your approval right now.", "✓")}</div>`;
      bindDeliverableActions(el, draw);
    }
    draw();
  };

  /* ================= CONTRACTS ================= */
  CP.pages.contracts = function (el) {
    const rows = () => S.db.contracts.filter((c) => c.clientId === me().clientId);
    el.innerHTML = ui.pageHead("Contracts", "Agreements between you and Oakframe Media");
    const host = document.createElement("div"); host.className = "card card-flush"; el.appendChild(host);
    ui.table(host, {
      rows, searchKeys: ["title"],
      columns: [
        { key: "title", label: "Contract", render: (c) => `<b>${esc(c.title)}</b>` },
        { key: "sentAt", label: "Sent", render: (c) => U.dateShort(c.sentAt) },
        { key: "expiresAt", label: "Expires", render: (c) => c.expiresAt ? U.dateShort(c.expiresAt) : "—" },
        { key: "status", label: "Status", render: (c) => ui.badge(c.status) },
      ],
      onRow: (c) => (location.hash = "#/c/contract/" + c.id),
    });
  };
  CP.pages.contract = function (el, id) {
    const c = S.find("contract", id);
    if (!c || c.clientId !== me().clientId) { el.innerHTML = ui.empty("Contract not found.", "⚠"); return; }
    if (["sent"].includes(c.status)) S.markContractViewed(id).then(() => OM.router === CP.router && null);
    el.innerHTML = ui.pageHead(esc(c.title), "Contract", ui.badge(c.status)) +
      ui.sectionCard("Agreement", `<div class="body-text" style="white-space:pre-wrap">${esc(c.body || "No content provided.")}</div>`) +
      (c.status === "signed" || c.status === "active" || c.status === "countersigned"
        ? ui.sectionCard("Signature", `<div class="detail-grid"><div><span class="detail-label">Signed by</span><b>${esc(c.signatureName || "—")}</b></div><div><span class="detail-label">Signed</span><b>${U.dateTime(c.signedAt)}</b></div></div>`)
        : ["sent", "viewed"].includes(c.status)
          ? `<div class="card" id="signBox"><div class="card-head"><h3>Sign this contract</h3></div><div class="card-body">
              <label class="form-field"><span class="form-label">Type your full legal name to sign</span><input type="text" id="sigName" placeholder="Full name"></label>
              <div class="form-actions"><button class="btn btn-gold" id="signBtn">Sign contract</button></div>
            </div></div>`
          : "");
    const signBtn = el.querySelector("#signBtn");
    if (signBtn) signBtn.addEventListener("click", () => {
      const name = el.querySelector("#sigName").value.trim();
      if (!name) { ui.toast("Type your name to sign.", "bad"); return; }
      ui.confirmModal("Confirm signature", `Sign as "<b>${esc(name)}</b>"? This is a binding electronic signature.`, () => {
        S.signContract(id, name).then(() => { ui.toast("Contract signed.", "good"); OM.router.refresh(); }).catch((e) => ui.toast(e.message, "bad"));
      }, { okLabel: "Sign" });
    });
  };

  /* ================= PROPOSALS ================= */
  CP.pages.proposals = function (el) {
    const rows = () => S.db.proposals.filter((p) => p.clientId === me().clientId);
    el.innerHTML = ui.pageHead("Proposals", "Service packages Oakframe has sent you");
    const host = document.createElement("div"); host.className = "card card-flush"; el.appendChild(host);
    ui.table(host, {
      rows, searchKeys: ["title"],
      columns: [
        { key: "title", label: "Proposal", render: (p) => `<b>${esc(p.title)}</b>` },
        { key: "price", label: "Price", render: (p) => p.price ? U.money(p.price) : "—" },
        { key: "expiresAt", label: "Expires", render: (p) => p.expiresAt ? U.dateShort(p.expiresAt) : "—" },
        { key: "status", label: "Status", render: (p) => ui.badge(p.status) },
      ],
      onRow: (p) => (location.hash = "#/c/proposal/" + p.id),
    });
  };
  CP.pages.proposal = function (el, id) {
    const p = S.find("proposal", id);
    if (!p || p.clientId !== me().clientId) { el.innerHTML = ui.empty("Proposal not found.", "⚠"); return; }
    if (p.status === "sent") S.markProposalViewed(id);
    el.innerHTML = ui.pageHead(esc(p.title), "Proposal", ui.badge(p.status)) +
      ui.kpi([
        { label: "Price", value: p.price ? U.money(p.price) : "—" },
        { label: "Payment terms", value: p.paymentTerms || "—" },
        { label: "Expires", value: p.expiresAt ? U.dateShort(p.expiresAt) : "No expiration" },
      ]) +
      `<div class="grid-2">
        <div>${ui.sectionCard("Scope", `<p class="body-text">${esc(p.scope || "—")}</p>`)}
        ${ui.sectionCard("Timeline", `<p class="body-text">${esc(p.timeline || "—")}</p>`)}</div>
        <div>${ui.sectionCard("Deliverables", `<p class="body-text">${esc(p.deliverablesSummary || "—")}</p>`)}
        ${p.addons ? ui.sectionCard("Optional add-ons", `<p class="body-text">${esc(p.addons)}</p>`) : ""}</div>
      </div>` +
      (["sent", "viewed"].includes(p.status) ? `<div class="row-gap"><button class="btn btn-gold" id="acceptBtn">Accept proposal</button><button class="btn btn-danger-ghost" id="rejectBtn">Decline</button></div>` :
       p.status === "accepted" ? `<div class="inline-note">Accepted — your project, contract, and initial invoice are ready in their respective sections.</div>` : "");
    const ab = el.querySelector("#acceptBtn");
    if (ab) ab.addEventListener("click", () => ui.confirmModal("Accept proposal", "Accepting creates your project, a draft contract, and an initial invoice.", () => {
      S.acceptProposal(id).then(() => { ui.toast("Proposal accepted! Your project is being set up.", "good"); OM.router.refresh(); }).catch((e) => ui.toast(e.message, "bad"));
    }, { okLabel: "Accept" }));
    const rb = el.querySelector("#rejectBtn");
    if (rb) rb.addEventListener("click", () => ui.formModal("Decline proposal", [{ name: "reason", label: "Reason (optional)", type: "textarea", span2: true }], async (v, close) => {
      await S.rejectProposal(id, v.reason); close(); ui.toast("Proposal declined.", "info"); OM.router.refresh();
    }));
  };

  /* ================= INVOICES ================= */
  CP.pages.invoices = function (el) {
    const rows = () => S.db.invoices.filter((i) => i.clientId === me().clientId);
    el.innerHTML = ui.pageHead("Invoices", "Billing history and open balances");
    const host = document.createElement("div"); host.className = "card card-flush"; el.appendChild(host);
    ui.table(host, {
      rows, searchKeys: ["number", "memo"], defaultSort: { key: "issuedAt", dir: -1 },
      columns: [
        { key: "number", label: "Invoice", render: (i) => `<span class="mono">${esc(i.number)}</span>` },
        { key: "memo", label: "Memo" },
        { key: "total", label: "Total", render: (i) => U.money(i.total), sortVal: (i) => i.total },
        { key: "dueAt", label: "Due", render: (i) => i.status === "paid" ? '<span class="muted">paid ' + U.dateShort(i.paidAt) + "</span>" : U.date(i.dueAt), sortVal: (i) => i.dueAt },
        { key: "status", label: "Status", render: (i) => ui.badge(i.status) },
      ],
    });
  };

  /* ================= FILES ================= */
  CP.pages.files = function (el) {
    const rows = () => S.db.documents.filter((d) => d.clientId === me().clientId && ["client_visible", "final_delivery"].includes(d.visibility));
    el.innerHTML = ui.pageHead("Files", "Shared documents, contracts, and final assets");
    const host = document.createElement("div"); host.className = "card card-flush"; el.appendChild(host);
    ui.table(host, {
      rows, searchKeys: ["name", "category"],
      columns: [
        { key: "name", label: "File", render: (d) => `<span class="file-icon">${d.type.toUpperCase()}</span> <b>${esc(d.name)}</b>` },
        { key: "category", label: "Category" },
        { key: "uploadedAt", label: "Date", render: (d) => U.date(d.uploadedAt), sortVal: (d) => d.uploadedAt },
        { key: "act", label: "", render: (d) => `<button class="btn btn-ghost btn-sm" data-open="${d.id}">⤓ Download</button>` },
      ],
      afterRender: (host2) => host2.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => OM.actions.openAttachment(S.find("document", b.dataset.open).storagePath))),
    });
  };

  /* ================= MESSAGES ================= */
  CP.pages.messages = function (el) {
    const u = me();
    const contacts = S.db.users.filter((x) => (S.db.clients.find((c) => c.id === u.clientId) || {}).ownerId === x.id
      || S.db.projects.some((p) => p.clientId === u.clientId && (p.leadId === x.id || (p.team || []).includes(x.id))));
    let activeContact = contacts[0] ? contacts[0].id : null;
    function draw() {
      const thread = S.db.clientMessages.filter((m) => m.clientId === u.clientId && (m.senderId === activeContact || m.recipientId === activeContact)).sort((a, b) => a.createdAt - b.createdAt);
      el.innerHTML = ui.pageHead("Messages", "Talk directly with your Oakframe team") +
        `<div class="grid-2" style="grid-template-columns:220px 1fr">
          <div class="card card-flush">${contacts.map((c) => `<div class="list-row clickable ${c.id === activeContact ? "active-contact" : ""}" data-c="${c.id}">${ui.avatar(c)}<span class="list-main"><b>${esc(c.name)}</b><span class="muted">${esc(c.title || "")}</span></span></div>`).join("") || ui.empty("No contacts assigned yet.")}</div>
          <div>
            <div class="card" style="max-height:440px;overflow-y:auto">${thread.map((m) => `
              <div class="comment"><div><div class="comment-head"><b>${esc(S.userName(m.senderId))}</b><span class="muted">${U.ago(m.createdAt)}</span></div><div class="comment-body">${esc(m.body)}</div></div></div>`).join("") || ui.empty("No messages yet. Say hello!")}</div>
            ${activeContact ? `<div class="inline-add"><input type="text" id="msgBody" placeholder="Write a message…"><button class="btn btn-gold btn-sm" id="sendMsg">Send</button></div>` : ""}
          </div>
        </div>`;
      el.querySelectorAll("[data-c]").forEach((r) => r.addEventListener("click", () => { activeContact = r.dataset.c; draw(); }));
      const sendBtn = el.querySelector("#sendMsg");
      if (sendBtn) sendBtn.addEventListener("click", () => {
        const body = el.querySelector("#msgBody").value.trim();
        if (!body) return;
        S.create("clientMessage", { clientId: u.clientId, senderId: u.id, recipientId: activeContact, body }, "Sent a client message");
        draw();
      });
    }
    draw();
  };

  CP.pages.support = function (el) {
    const u = me();
    const owner = S.find("client", u.clientId);
    const supportContact = owner ? owner.ownerId : null;
    el.innerHTML = ui.pageHead("Support", "Need help? Reach your account team directly.") +
      ui.sectionCard("Send a request", `
        <label class="form-field"><span class="form-label">What can we help with?</span><textarea id="supportBody" rows="4" placeholder="Describe your request…"></textarea></label>
        <div class="form-actions"><button class="btn btn-gold" id="sendSupport">Send request</button></div>`);
    el.querySelector("#sendSupport").addEventListener("click", () => {
      const body = el.querySelector("#supportBody").value.trim();
      if (!body || !supportContact) { ui.toast("Please describe your request.", "bad"); return; }
      S.create("clientMessage", { clientId: u.clientId, senderId: u.id, recipientId: supportContact, body: "[Support request] " + body }, "Sent a support request");
      ui.toast("Request sent — your account team will follow up shortly.", "good");
      el.querySelector("#supportBody").value = "";
    });
  };

  /* ================= MEETINGS ================= */
  CP.pages.meetings = function (el) {
    const rows = S.db.meetings.filter((m) => m.clientId === me().clientId).sort((a, b) => b.ts - a.ts);
    el.innerHTML = ui.pageHead("Meetings", "Scheduled and past meetings with Oakframe") +
      `<div class="card card-flush">${rows.map((m) => `<div class="list-row"><span class="list-icon">◫</span><span class="list-main"><b>${esc(m.title)}</b><span class="muted">${U.dateTime(m.ts)} · ${esc(m.location || "")}</span></span>${m.ts > Date.now() ? ui.badge("info", "Upcoming") : ui.badge("neutral", "Past")}</div>`).join("") || ui.empty("No meetings scheduled yet.")}</div>`;
  };

  /* ================= NOTIFICATIONS ================= */
  CP.pages.notifications = function (el) {
    const rows = S.myNotifications();
    el.innerHTML = ui.pageHead("Notifications", rows.filter((n) => !n.read).length + " unread",
      rows.some((n) => !n.read) ? `<button class="btn btn-ghost" id="markAll">Mark all read</button>` : "") +
      `<div class="card card-flush">${rows.slice(0, 60).map((n) => `<div class="list-row notif ${n.read ? "" : "unread"} clickable" data-n="${n.id}"><span class="list-icon">${ui.KIND_ICONS[n.kind] || "•"}</span><span class="list-main"><b>${esc(n.title)}</b><span class="muted">${esc(n.body || "")}</span></span><span class="muted">${U.ago(n.ts)}</span></div>`).join("") || ui.empty("You're all caught up.", "✓")}</div>`;
    el.querySelectorAll("[data-n]").forEach((r) => r.addEventListener("click", () => { S.markRead(r.dataset.n); location.hash = "#/c/"; }));
    const ma = el.querySelector("#markAll"); if (ma) ma.addEventListener("click", () => { S.markAllRead(); CP.router.refresh(); });
  };

  /* ================= SETTINGS ================= */
  CP.pages.settings = function (el) {
    const u = me(), client = myClient();
    el.innerHTML = ui.pageHead("Profile settings", "") +
      `<div class="grid-2"><div>
        ${ui.sectionCard("My profile", `
          <div class="profile-row">
            <div class="avatar-upload" id="avatarUpload">${ui.avatar(u, "xl")}<div class="avatar-upload-overlay">⤒</div><input type="file" id="avatarFile" accept="image/png,image/jpeg,image/webp" hidden></div>
            <div><b>${esc(u.name)}</b><div class="muted">${esc(client ? client.name : "")}</div></div>
          </div>
          <form class="om-form" id="profileForm"><div class="form-grid">
            <label class="form-field"><span class="form-label">Full name</span><input type="text" name="name" value="${esc(u.name)}" required></label>
            <label class="form-field"><span class="form-label">Phone</span><input type="text" name="phone" value="${esc(u.phone || "")}"></label>
          </div><div class="form-actions"><button type="submit" class="btn btn-gold btn-sm">Save</button></div></form>`) +
        ui.sectionCard("Company", client ? `<div class="detail-grid">
          <div><span class="detail-label">Company</span><b>${esc(client.name)}</b></div>
          <div><span class="detail-label">Industry</span><b>${esc(client.industry || "—")}</b></div>
          <div><span class="detail-label">Client since</span><b>${U.date(client.since)}</b></div>
        </div>` : ui.empty("No company on file."))}
      </div><div>${ui.sectionCard("Session", `<p class="muted">Signed in as ${esc(u.email)}.</p><button class="btn btn-ghost" id="signOutSettings">Sign out</button>`)}</div></div>`;
    el.querySelector("#profileForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const v = ui.formValues(e.target);
      S.update("user", u.id, { name: v.name, phone: v.phone }, "Updated own profile");
      ui.toast("Saved.", "good"); CP.router.refresh();
    });
    const avatarWrap = el.querySelector("#avatarUpload"), avatarInput = el.querySelector("#avatarFile");
    avatarWrap.addEventListener("click", () => avatarInput.click());
    avatarInput.addEventListener("change", async () => {
      const file = avatarInput.files[0]; if (!file) return;
      try { const url = await OM.db.uploadAvatar(u.id, file); S.update("user", u.id, { avatarUrl: url }, "Updated profile photo"); ui.toast("Photo updated.", "good"); CP.router.refresh(); }
      catch (err) { ui.toast("Upload failed: " + err.message, "bad"); }
    });
    el.querySelector("#signOutSettings").addEventListener("click", async () => { await S.signOut(); location.hash = "#/"; OM.renderLogin(); });
  };
})();
