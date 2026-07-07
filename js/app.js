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
    const railed = localStorage.getItem("om.rail") === "1";
    document.body.className = "";
    document.body.innerHTML = `
      <div class="shell ${railed ? "rail" : ""}" id="shell">
        <aside class="sidebar" id="sidebar">
          <div class="brand">
            <div class="brand-mark" onclick="location.hash='#/'">O</div>
            <div class="brand-text" onclick="location.hash='#/'"><b>Oakframe</b><span>Media OS</span></div>
            <button class="sb-collapse" id="sbCollapse" title="Collapse sidebar">${railed ? "›" : "‹"}</button>
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
              <input type="text" id="gSearch" placeholder="Search people, clients, projects, leads, documents…" autocomplete="off"><span class="gs-kbd">⌘K</span>
              <div class="gs-results" id="gsResults"></div>
            </div>
            <button class="icon-btn" id="themeBtn" title="Toggle light/dark theme">${OM.theme.get() === "dark" ? "☀" : "☾"}</button>
            <button class="icon-btn bell" id="bellBtn" title="Notifications">◉<span class="bell-count" id="bellCount"></span></button>
            <div class="user-menu-wrap">
              <button class="icon-btn" id="userBtn">${ui.avatar(me)}</button>
              <div class="user-menu" id="userMenu">
                <div class="um-head"><b>${esc(me.name)}</b><span class="muted">${esc(me.title)}</span></div>
                <a href="#/settings">Profile & settings</a>
                <a href="#/notifications">Notifications</a>
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
    document.getElementById("themeBtn").addEventListener("click", (e) => {
      OM.theme.toggle();
      e.currentTarget.textContent = OM.theme.get() === "dark" ? "☀" : "☾";
    });
    const userBtn = document.getElementById("userBtn");
    const menu = document.getElementById("userMenu");
    userBtn.addEventListener("click", (e) => { e.stopPropagation(); menu.classList.toggle("open"); });
    document.addEventListener("click", () => menu.classList.remove("open"));
    document.getElementById("signOut").addEventListener("click", async () => { await S.signOut(); location.hash = "#/"; renderLogin(); });
    document.getElementById("meChip").addEventListener("click", () => (location.hash = "#/settings"));
    document.getElementById("sbCollapse").addEventListener("click", () => {
      const shell = document.getElementById("shell");
      const railed = shell.classList.toggle("rail");
      localStorage.setItem("om.rail", railed ? "1" : "0");
      document.getElementById("sbCollapse").textContent = railed ? "›" : "‹";
    });

    // Global search
    const gs = document.getElementById("gSearch");
    const gr = document.getElementById("gsResults");
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openCmdK(); return; }
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); openCmdK(); }
      if (e.key === "Escape") { gr.classList.remove("open"); gs.blur(); }
    });
    // The topbar field is the entry point to the command palette.
    gs.addEventListener("focus", () => { gs.blur(); openCmdK(); });
    gs.addEventListener("click", () => openCmdK());
    if (gr) gr.remove();
  }

  /* ---------------- SEARCH ---------------- */
  // Shared by the ⌘K palette. Returns access-filtered, grouped results.
  function searchEntities(q) {
    q = q.toLowerCase();
    const groups = [];
    const add = (label, items) => { if (items.length) groups.push({ label, items }); };
    add("Clients", S.db.clients.filter((c) => S.can("view", "client", c) && c.name.toLowerCase().includes(q)).slice(0, 5).map((c) => ({ icon: "◇", label: c.name, sub: "Client · " + (c.industry || ""), link: "#/client/" + c.id })));
    add("Projects", S.db.projects.filter((p) => ((p.name || "") + (p.code || "")).toLowerCase().includes(q)).slice(0, 5).map((p) => ({ icon: "▣", label: p.name, sub: p.code, link: "#/project/" + p.id })));
    add("Leads", S.db.leads.filter((l) => S.can("view", "lead", l) && (l.company || "").toLowerCase().includes(q)).slice(0, 5).map((l) => ({ icon: "▲", label: l.company, sub: "Lead · " + U.cap(l.stage), link: "#/lead/" + l.id })));
    add("Tasks", S.db.tasks.filter((t) => S.can("view", "task", t) && (t.title || "").toLowerCase().includes(q)).slice(0, 5).map((t) => ({ icon: "☑", label: t.title, sub: "Task", link: "#/task/" + t.id })));
    add("People", S.db.users.filter((u) => (u.name || "").toLowerCase().includes(q)).slice(0, 5).map((u) => ({ icon: "☺", label: u.name, sub: (u.title || "") + " · " + u.dept, link: "#/directory" })));
    add("Documents", S.db.documents.filter((d) => S.can("view", "document", d) && (d.name || "").toLowerCase().includes(q)).slice(0, 4).map((d) => ({ icon: "▦", label: d.name, sub: "Document · " + d.category, link: "#/documents" })));
    add("Library", S.db.resources.filter((r) => S.can("view", "resource", r) && (r.name || "").toLowerCase().includes(q)).slice(0, 4).map((r) => ({ icon: "▤", label: r.name, sub: "Resource · " + r.category, link: "#/resources" })));
    return groups;
  }

  function navCommands() {
    return navSections().flatMap((sec) => sec.items.map((it) => ({ icon: it.icon, label: it.label, sub: sec.label, link: it.hash })));
  }

  /* ---------------- ⌘K COMMAND PALETTE ---------------- */
  function openCmdK() {
    if (document.querySelector(".cmdk-overlay")) return;
    const overlay = document.createElement("div");
    overlay.className = "cmdk-overlay";
    overlay.innerHTML = `<div class="cmdk">
      <div class="cmdk-input-row">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input type="text" id="cmdkInput" placeholder="Search or jump to…" autocomplete="off">
        <span class="cmdk-hint">esc</span>
      </div>
      <div class="cmdk-results" id="cmdkResults"></div>
    </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));
    const input = overlay.querySelector("#cmdkInput");
    const results = overlay.querySelector("#cmdkResults");
    let flat = [], active = 0;

    function draw() {
      const q = input.value.trim();
      let groups;
      if (!q) {
        const rec = recents();
        groups = [];
        if (rec.length) groups.push({ label: "Recently viewed", items: rec });
        groups.push({ label: "Go to", items: navCommands().slice(0, 8) });
      } else {
        groups = searchEntities(q);
        const navHits = navCommands().filter((c) => c.label.toLowerCase().includes(q.toLowerCase()));
        if (navHits.length) groups.push({ label: "Navigate", items: navHits.slice(0, 5) });
      }
      flat = []; active = 0;
      results.innerHTML = groups.length ? groups.map((g) => `
        <div class="cmdk-group-label">${esc(g.label)}</div>
        ${g.items.map((it) => { const idx = flat.push(it) - 1; return `<div class="cmdk-item" data-idx="${idx}"><span class="list-icon">${it.icon}</span><span class="list-main"><b>${esc(it.label)}</b><span class="cmdk-sub">${esc(it.sub || "")}</span></span></div>`; }).join("")}
      `).join("") : `<div class="cmdk-empty">No matches you have access to.</div>`;
      highlight();
    }
    function highlight() {
      results.querySelectorAll(".cmdk-item").forEach((el, i) => el.classList.toggle("active", i === active));
      const el = results.querySelector(".cmdk-item.active");
      if (el) el.scrollIntoView({ block: "nearest" });
    }
    function go(i) { const it = flat[i]; if (it) { close(); location.hash = it.link; } }
    function close() { overlay.classList.remove("open"); setTimeout(() => overlay.remove(), 150); }

    input.addEventListener("input", draw);
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, flat.length - 1); highlight(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); highlight(); }
      else if (e.key === "Enter") { e.preventDefault(); go(active); }
      else if (e.key === "Escape") { close(); }
    });
    results.addEventListener("click", (e) => { const el = e.target.closest(".cmdk-item"); if (el) go(+el.dataset.idx); });
    overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) close(); });
    draw();
    input.focus();
  }

  /* ---------------- RECENTLY VIEWED ---------------- */
  const RECENT_KEY = "om.recent";
  function recents() { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch (e) { return []; } }
  function pushRecent(item) {
    let list = recents().filter((r) => r.link !== item.link);
    list.unshift(item);
    list = list.slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  }
  function recordRecent(hash) {
    const m = (re, fn) => { const g = hash.match(re); if (g) { const it = fn(g); if (it) pushRecent(it); return true; } return false; };
    if (m(/^#\/client\/([\w-]+)/, (g) => { const c = S.find("client", g[1]); return c && { icon: "◇", label: c.name, sub: "Client", link: "#/client/" + c.id }; })) return;
    if (m(/^#\/project\/([\w-]+)/, (g) => { const p = S.find("project", g[1]); return p && { icon: "▣", label: p.name, sub: p.code, link: "#/project/" + p.id }; })) return;
    if (m(/^#\/lead\/([\w-]+)/, (g) => { const l = S.find("lead", g[1]); return l && { icon: "▲", label: l.company, sub: "Lead", link: "#/lead/" + l.id }; })) return;
    if (m(/^#\/task\/([\w-]+)/, (g) => { const t = S.find("task", g[1]); return t && { icon: "☑", label: t.title, sub: "Task", link: "#/task/" + t.id }; })) return;
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
      try { recordRecent(hash); } catch (e) { /* ignore */ }
      renderNav();
      const sb = document.getElementById("sidebar"); if (sb) sb.classList.remove("open");
      content.scrollTop = 0;
    },
    refresh() { router.render(); },
  });
  window.addEventListener("hashchange", () => { if (S.meId) router.render(); });

  /* ---------------- AUTH SCREEN ---------------- */
  let authMode = "signin"; // or "signup"
  function renderLogin() {
    document.body.className = "auth-body";
    document.body.innerHTML = `
      <div class="auth">
        <button class="icon-btn auth-theme-btn" id="authThemeBtn" title="Toggle light/dark theme">${OM.theme.get() === "dark" ? "☀" : "☾"}</button>
        <div class="auth-aside">
          <div class="auth-brand"><div class="brand-mark xl">O</div><span>Oakframe Media</span></div>
          <div class="auth-pitch">
            <h1>The operating system<br>for how we work.</h1>
            <p>Projects, clients, sales, finance, people, and equipment — the entire studio in one calm, precise place.</p>
          </div>
          <div class="auth-foot">Oakframe Media · Internal systems</div>
        </div>
        <div class="auth-main">
          <div class="auth-card">
            <div class="auth-head">
              <h2 id="authTitle">${authMode === "signin" ? "Welcome back" : "Create your account"}</h2>
              <p id="authSub" class="muted">${authMode === "signin" ? "Sign in to continue to your workspace." : "The first account created becomes the owner."}</p>
            </div>
            <form class="auth-form" id="authForm">
              <div class="field" id="nameField" style="${authMode === "signin" ? "display:none" : ""}">
                <input type="text" id="authName" placeholder=" " autocomplete="name">
                <label>Full name</label>
              </div>
              <div class="field">
                <input type="email" id="authEmail" placeholder=" " autocomplete="email" required>
                <label>Work email</label>
              </div>
              <div class="field">
                <input type="password" id="authPassword" placeholder=" " autocomplete="${authMode === "signin" ? "current-password" : "new-password"}" required>
                <label>Password</label>
              </div>
              <div class="auth-error" id="authError"></div>
              <button type="submit" class="btn btn-gold btn-lg btn-block" id="authSubmit">${authMode === "signin" ? "Sign in" : "Create account"}</button>
            </form>
            <div class="auth-switch">
              ${authMode === "signin"
                ? `New to Oakframe? <button class="link-btn" id="toSignup">Create an account</button>`
                : `Already have an account? <button class="link-btn" id="toSignin">Sign in</button>`}
            </div>
          </div>
        </div>
      </div>`;

    document.getElementById("authThemeBtn").addEventListener("click", () => { OM.theme.toggle(); renderLogin(); });
    const err = document.getElementById("authError");
    const swap = (mode) => { authMode = mode; renderLogin(); setTimeout(() => { const f = document.getElementById(authMode === "signup" ? "authName" : "authEmail"); if (f) f.focus(); }, 20); };
    const toSignup = document.getElementById("toSignup"); if (toSignup) toSignup.addEventListener("click", () => swap("signup"));
    const toSignin = document.getElementById("toSignin"); if (toSignin) toSignin.addEventListener("click", () => swap("signin"));

    document.getElementById("authForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      err.textContent = "";
      const email = document.getElementById("authEmail").value.trim();
      const password = document.getElementById("authPassword").value;
      const name = (document.getElementById("authName").value || "").trim();
      const submit = document.getElementById("authSubmit");
      submit.disabled = true;
      submit.textContent = authMode === "signin" ? "Signing in…" : "Creating account…";
      try {
        if (!OM.db.init()) throw new Error("Backend not configured. Add your Supabase URL and key to js/config.js.");
        if (authMode === "signup") {
          if (!name) throw new Error("Please enter your name.");
          const res = await S.signUp(email, password, name);
          if (!res.session) {
            err.classList.add("info");
            err.textContent = "Account created. Check your email to confirm, then sign in.";
            authMode = "signin";
            submit.disabled = false;
            return;
          }
        } else {
          await S.signInWithPassword(email, password);
        }
        await enterApp();
      } catch (ex) {
        err.classList.remove("info");
        err.textContent = friendlyAuthError(ex.message || String(ex));
        submit.disabled = false;
        submit.textContent = authMode === "signin" ? "Sign in" : "Create account";
      }
    });
  }

  function friendlyAuthError(msg) {
    if (/Invalid login credentials/i.test(msg)) return "That email and password don't match.";
    if (/already registered|already exists/i.test(msg)) return "An account with this email already exists — try signing in.";
    if (/at least 6|Password should/i.test(msg)) return "Password must be at least 6 characters.";
    if (/relation .* does not exist|Could not find the table|schema/i.test(msg)) return "The database schema hasn't been applied yet. Run the SQL in supabase/migrations first.";
    return msg;
  }

  /* ---------------- SESSION → APP ---------------- */
  async function enterApp() {
    const session = await S.currentSession();
    if (!session) { renderLogin(); return; }
    S.meId = session.user.id;
    document.body.className = "";
    document.body.innerHTML = `<div class="boot"><div class="brand-mark xl">O</div><div class="boot-bar"><span></span></div><p>Loading your workspace…</p></div>`;
    try {
      await S.hydrate();
      // A brand-new user may sign in a beat before the profile-creation trigger
      // commits; retry hydrate briefly so `me()` resolves.
      let tries = 0;
      while (!S.me() && tries < 5) { await new Promise((r) => setTimeout(r, 400)); await S.hydrate(); tries++; }
      if (!S.me()) throw new Error("Your profile isn't ready yet. Refresh in a moment.");
      S.touchPresence();
      if (!location.hash || location.hash === "#") location.hash = "#/";
      renderShell();
      router.render();
    } catch (ex) {
      document.body.innerHTML = `<div class="boot"><div class="brand-mark xl">O</div><p class="boot-error">${esc(friendlyAuthError(ex.message || String(ex)))}</p><button class="btn btn-ghost" onclick="location.reload()">Retry</button> <button class="btn btn-ghost" id="bootOut">Sign out</button></div>`;
      const bo = document.getElementById("bootOut"); if (bo) bo.addEventListener("click", async () => { await S.signOut(); renderLogin(); });
    }
  }

  /* ---------------- BOOT ---------------- */
  async function boot() {
    if (!OM.db.init()) { renderConfigError(); return; }
    // React to sign-out from other tabs / token expiry.
    OM.db.client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") { S.meId = null; S.db = null; renderLogin(); }
    });
    const session = await S.currentSession();
    if (session) await enterApp();
    else renderLogin();
  }

  function renderConfigError() {
    document.body.innerHTML = `<div class="boot"><div class="brand-mark xl">O</div><p class="boot-error">Backend not configured.</p><p class="muted">Add your Supabase project URL and publishable key to <code>js/config.js</code>, then reload.</p></div>`;
  }

  OM.enterApp = enterApp;
  document.addEventListener("DOMContentLoaded", boot);
})();
