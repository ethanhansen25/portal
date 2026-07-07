/* Oakframe Media OS — shell: router, navigation, login, global search, boot */
(function () {
  const OM = window.OM;
  const U = OM.util, ui = OM.ui;
  const S = OM.store, M = OM.metrics;
  const esc = U.esc;

  /* ---------------- NAV ---------------- */
  function navSections() {
    const me = S.me();
    const has = (m) => S.moduleAccess(m, me);
    const sections = [];
    sections.push({
      label: "Workspace",
      items: [
        { hash: "#/", icon: "◆", label: "Home", match: /^#\/$/ },
        { hash: "#/tasks", icon: "☑", label: "Tasks", match: /^#\/task/ },
        { hash: "#/projects", icon: "▣", label: "Projects", match: /^#\/project/ },
        { hash: "#/calendar", icon: "◫", label: "Calendar", match: /^#\/calendar/ },
        { hash: "#/notifications", icon: "◉", label: "Notifications", match: /^#\/notifications/, count: () => S.unreadCount() },
      ],
    });
    if (has("exec")) sections.push({
      label: "Executive",
      lock: true,
      items: [
        { hash: "#/exec", icon: "✦", label: "Command center", match: /^#\/exec$/ },
        { hash: "#/exec/analytics", icon: "∿", label: "Company analytics", match: /^#\/exec\/analytics/ },
        { hash: "#/exec/sales", icon: "▲", label: "Sales dashboard", match: /^#\/exec\/sales/ },
        { hash: "#/exec/ops", icon: "◎", label: "Operations center", match: /^#\/exec\/ops/ },
        { hash: "#/exec/hiring", icon: "☺", label: "Hiring center", match: /^#\/exec\/hiring/ },
        { hash: "#/exec/board", icon: "❖", label: "Board room", match: /^#\/exec\/board/ },
        { hash: "#/exec/risk", icon: "⚠", label: "Risk & legal", match: /^#\/exec\/risk/ },
        { hash: "#/exec/audit", icon: "≡", label: "Audit center", match: /^#\/exec\/audit/ },
      ],
    });
    if (has("sales")) sections.push({
      label: "Sales",
      items: [
        { hash: "#/sales", icon: "◈", label: "Sales desk", match: /^#\/sales$/ },
        { hash: "#/sales/pipeline", icon: "⇶", label: "Pipeline", match: /^#\/sales\/pipeline|^#\/lead/ },
        { hash: "#/sales/leads", icon: "☰", label: "Leads", match: /^#\/sales\/leads/ },
        { hash: "#/sales/calls", icon: "☎", label: "Cold call desk", match: /^#\/sales\/calls/ },
        { hash: "#/sales/commissions", icon: "$", label: "Commissions", match: /^#\/sales\/commissions/ },
      ],
    });
    const company = { label: "Company", items: [] };
    if (has("clients")) company.items.push({ hash: "#/clients", icon: "◇", label: "Clients", match: /^#\/client/ });
    if (has("comms")) company.items.push({ hash: "#/comms", icon: "✉", label: "Communications", match: /^#\/comms/ });
    if (has("finance")) company.items.push({ hash: "#/finance", icon: "¤", label: "Finance", match: /^#\/finance/ });
    if (has("hr")) company.items.push({ hash: "#/hr", icon: "☺", label: "People (HR)", match: /^#\/hr/ });
    if (has("equipment")) company.items.push({ hash: "#/equipment", icon: "⚙", label: "Equipment", match: /^#\/equipment/ });
    if (has("approvals")) company.items.push({ hash: "#/approvals", icon: "✓", label: "Approvals", match: /^#\/approvals/, count: () => M.approvalsPending().filter((a) => S.can("approve", "approval", a)).length });
    sections.push(company);
    sections.push({
      label: "Library",
      items: [
        { hash: "#/resources", icon: "▤", label: "Resources", match: /^#\/resources/ },
        { hash: "#/documents", icon: "▦", label: "Documents", match: /^#\/documents/ },
        { hash: "#/directory", icon: "☷", label: "Directory", match: /^#\/directory/ },
      ],
    });
    return sections;
  }

  /* ---------------- ROUTES ---------------- */
  const routes = [
    [/^#\/$/, (el) => OM.pages.home(el)],
    [/^#\/tasks(?:\/(\w+))?$/, (el, m) => OM.pages.tasks(el, m[1])],
    [/^#\/task\/([\w-]+)$/, (el, m) => OM.pages.task(el, m[1])],
    [/^#\/projects$/, (el) => OM.pages.projects(el)],
    [/^#\/project\/([\w-]+)(?:\/(\w+))?$/, (el, m) => OM.pages.project(el, m[1], m[2])],
    [/^#\/clients$/, (el) => OM.pages.clients(el)],
    [/^#\/client\/([\w-]+)(?:\/(\w+))?$/, (el, m) => OM.pages.client(el, m[1], m[2])],
    [/^#\/calendar$/, (el) => OM.pages.calendar(el)],
    [/^#\/directory$/, (el) => OM.pages.directory(el)],
    [/^#\/notifications$/, (el) => OM.pages.notifications(el)],
    [/^#\/sales$/, (el) => OM.pages.sales(el)],
    [/^#\/sales\/pipeline$/, (el) => OM.pages.pipeline(el)],
    [/^#\/sales\/leads$/, (el) => OM.pages.leads(el)],
    [/^#\/sales\/calls$/, (el) => OM.pages.coldcalls(el)],
    [/^#\/sales\/commissions$/, (el) => OM.pages.commissions(el)],
    [/^#\/lead\/([\w-]+)$/, (el, m) => OM.pages.lead(el, m[1])],
    [/^#\/finance(?:\/(\w+))?$/, (el, m) => OM.pages.finance(el, m[1])],
    [/^#\/hr(?:\/(\w+))?$/, (el, m) => OM.pages.hr(el, m[1])],
    [/^#\/equipment$/, (el) => OM.pages.equipment(el)],
    [/^#\/resources$/, (el) => OM.pages.resources(el)],
    [/^#\/documents$/, (el) => OM.pages.documents(el)],
    [/^#\/comms$/, (el) => OM.pages.comms(el)],
    [/^#\/approvals$/, (el) => OM.pages.approvals(el)],
    [/^#\/settings$/, (el) => OM.pages.settings(el)],
    [/^#\/exec$/, (el) => OM.pages.exec(el)],
    [/^#\/exec\/analytics(?:\/(\w+))?$/, (el, m) => OM.pages.execAnalytics(el, m[1])],
    [/^#\/exec\/sales$/, (el) => OM.pages.execSales(el)],
    [/^#\/exec\/ops$/, (el) => OM.pages.execOps(el)],
    [/^#\/exec\/hiring$/, (el) => OM.pages.execHiring(el)],
    [/^#\/exec\/board(?:\/(\w+))?$/, (el, m) => OM.pages.execBoard(el, m[1])],
    [/^#\/exec\/risk$/, (el) => OM.pages.execRisk(el)],
    [/^#\/exec\/audit$/, (el) => OM.pages.audit(el)],
  ];

  /* ---------------- SHELL ---------------- */
  function renderShell() {
    const me = S.me();
    document.body.innerHTML = `
      <div class="shell">
        <aside class="sidebar" id="sidebar">
          <div class="brand" onclick="location.hash='#/'">
            <div class="brand-mark">O</div>
            <div class="brand-text"><b>Oakframe</b><span>Media OS</span></div>
          </div>
          <nav class="nav" id="nav"></nav>
          <div class="sidebar-foot">
            <div class="me-chip" id="meChip">
              ${ui.avatar(me)}
              <div class="me-info"><b>${esc(me.name)}</b><span>${OM.ROLES[me.role].label}</span></div>
            </div>
          </div>
        </aside>
        <div class="main-col">
          <header class="topbar">
            <button class="icon-btn burger" id="burger">☰</button>
            <div class="global-search">
              <input type="text" id="gSearch" placeholder="Search people, clients, projects, leads, documents…  ( / )" autocomplete="off">
              <div class="gs-results" id="gsResults"></div>
            </div>
            <button class="icon-btn bell" id="bellBtn" title="Notifications">◉<span class="bell-count" id="bellCount"></span></button>
            <div class="user-menu-wrap">
              <button class="icon-btn" id="userBtn">${ui.avatar(me)}</button>
              <div class="user-menu" id="userMenu">
                <div class="um-head"><b>${esc(me.name)}</b><span class="muted">${esc(me.title)}</span></div>
                <a href="#/settings">Profile & settings</a>
                <a href="#/notifications">Notifications</a>
                <button id="switchUser">Switch user (demo)</button>
                <button id="signOut">Sign out</button>
              </div>
            </div>
          </header>
          <main class="content" id="content"></main>
        </div>
      </div>`;
    renderNav();
    bindShell();
  }

  function renderNav() {
    const nav = document.getElementById("nav");
    if (!nav) return;
    const hash = location.hash || "#/";
    nav.innerHTML = navSections().map((sec) => `
      <div class="nav-section">
        <div class="nav-label">${esc(sec.label)}${sec.lock ? ' <span class="nav-lock" title="Executive only">✦</span>' : ""}</div>
        ${sec.items.map((it) => {
          const active = it.match.test(hash);
          const count = it.count ? it.count() : 0;
          return `<a class="nav-item ${active ? "active" : ""}" href="${it.hash}"><span class="nav-icon">${it.icon}</span>${esc(it.label)}${count ? `<span class="nav-count">${count}</span>` : ""}</a>`;
        }).join("")}
      </div>`).join("");
    const bc = document.getElementById("bellCount");
    if (bc) { const n = S.unreadCount(); bc.textContent = n || ""; bc.style.display = n ? "" : "none"; }
  }

  function bindShell() {
    document.getElementById("burger").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
    document.getElementById("bellBtn").addEventListener("click", () => (location.hash = "#/notifications"));
    const userBtn = document.getElementById("userBtn");
    const menu = document.getElementById("userMenu");
    userBtn.addEventListener("click", (e) => { e.stopPropagation(); menu.classList.toggle("open"); });
    document.addEventListener("click", () => menu.classList.remove("open"));
    document.getElementById("signOut").addEventListener("click", () => { S.signOut(); boot(); });
    document.getElementById("switchUser").addEventListener("click", () => { S.signOut(); boot(); });
    document.getElementById("meChip").addEventListener("click", () => (location.hash = "#/settings"));

    // Global search
    const gs = document.getElementById("gSearch");
    const gr = document.getElementById("gsResults");
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); gs.focus(); }
      if (e.key === "Escape") { gr.classList.remove("open"); gs.blur(); }
    });
    gs.addEventListener("input", () => {
      const q = gs.value.trim().toLowerCase();
      if (q.length < 2) { gr.classList.remove("open"); return; }
      const hits = [];
      const push = (icon, label, sub, link) => hits.length < 12 && hits.push({ icon, label, sub, link });
      S.db.users.filter((u) => u.name.toLowerCase().includes(q)).slice(0, 3).forEach((u) => push("☺", u.name, u.title + " · " + u.dept, "#/directory"));
      S.db.clients.filter((c) => S.can("view", "client", c) && c.name.toLowerCase().includes(q)).slice(0, 3).forEach((c) => push("◇", c.name, "Client · " + c.industry, "#/client/" + c.id));
      S.db.projects.filter((p) => (p.name + p.code).toLowerCase().includes(q)).slice(0, 3).forEach((p) => push("▣", p.name, p.code, "#/project/" + p.id));
      S.db.leads.filter((l) => S.can("view", "lead", l) && l.company.toLowerCase().includes(q)).slice(0, 3).forEach((l) => push("▲", l.company, "Lead · " + U.cap(l.stage), "#/lead/" + l.id));
      S.db.tasks.filter((t) => S.can("view", "task", t) && t.title.toLowerCase().includes(q)).slice(0, 3).forEach((t) => push("☑", t.title, "Task", "#/task/" + t.id));
      S.db.documents.filter((d) => S.can("view", "document", d) && d.name.toLowerCase().includes(q)).slice(0, 2).forEach((d) => push("▦", d.name, "Document · " + d.category, "#/documents"));
      S.db.resources.filter((r) => S.can("view", "resource", r) && r.name.toLowerCase().includes(q)).slice(0, 2).forEach((r) => push("▤", r.name, "Resource · " + r.category, "#/resources"));
      gr.innerHTML = hits.map((h) => `<a class="gs-hit" href="${h.link}"><span class="list-icon">${h.icon}</span><span class="list-main"><b>${esc(h.label)}</b><span class="muted">${esc(h.sub)}</span></span></a>`).join("") || '<div class="gs-empty">No matches you have access to.</div>';
      gr.classList.add("open");
    });
    gs.addEventListener("blur", () => setTimeout(() => gr.classList.remove("open"), 180));
  }

  /* ---------------- ROUTER ---------------- */
  const router = (OM.router = {
    render() {
      const hash = location.hash || "#/";
      const content = document.getElementById("content");
      if (!content) return;
      let matched = false;
      for (const [re, fn] of routes) {
        const m = hash.match(re);
        if (m) { try { fn(content, m); } catch (e) { content.innerHTML = ui.empty(e.message, "⚠"); console.error(e); } matched = true; break; }
      }
      if (!matched) content.innerHTML = ui.empty("Page not found.", "◇");
      renderNav();
      document.getElementById("sidebar").classList.remove("open");
      content.scrollTop = 0;
    },
    refresh() { router.render(); },
  });
  window.addEventListener("hashchange", () => { if (S.meId) router.render(); });

  /* ---------------- LOGIN ---------------- */
  function renderLogin() {
    const depts = [...new Set(S.db.users.map((u) => u.dept))];
    document.body.innerHTML = `
      <div class="login">
        <div class="login-panel">
          <div class="login-brand"><div class="brand-mark xl">O</div><h1>Oakframe <span>Media OS</span></h1>
          <p class="login-sub">The company, in one place. Sign in to your workspace.</p></div>
          <div class="login-note">Demo workspace — pick a person to experience their exact permissions. Every role sees a different company.</div>
          ${depts.map((d) => `
            <div class="login-dept">
              <h4>${esc(d)}</h4>
              <div class="login-grid">
                ${S.db.users.filter((u) => u.dept === d && u.status === "active").map((u) => `
                  <button class="login-card" data-u="${u.id}">
                    ${ui.avatar(u)}
                    <span class="li-info"><b>${esc(u.name)}</b><span>${esc(u.title)}</span></span>
                    <span class="badge tone-${OM.ROLES[u.role].exec ? "warn" : "neutral"}">${OM.ROLES[u.role].label}</span>
                  </button>`).join("")}
              </div>
            </div>`).join("")}
        </div>
      </div>`;
    document.querySelectorAll(".login-card").forEach((b) => b.addEventListener("click", () => {
      S.signIn(b.dataset.u);
      location.hash = "#/";
      renderShell();
      router.render();
      const me = S.me();
      ui.toast("Signed in as " + me.name + " — " + OM.ROLES[me.role].label + ".", "good");
    }));
  }

  /* ---------------- BOOT ---------------- */
  function boot() {
    S.load();
    S.restoreSession();
    if (S.meId) { renderShell(); router.render(); }
    else renderLogin();
  }
  document.addEventListener("DOMContentLoaded", boot);
})();
