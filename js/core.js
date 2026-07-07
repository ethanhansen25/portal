/* Oakframe Media OS — core: utilities, store, RBAC, audit, notifications, metrics */
(function () {
  const OM = (window.OM = window.OM || {});
  const DAY = 86400000;

  /* ================= UTIL ================= */
  const U = (OM.util = {
    DAY,
    esc(s) {
      return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    },
    money(n, opts = {}) {
      if (n == null || isNaN(n)) return "—";
      const abs = Math.abs(n);
      if (opts.compact && abs >= 1000) {
        if (abs >= 1000000) return (n < 0 ? "-" : "") + "$" + (abs / 1000000).toFixed(2).replace(/\.?0+$/, "") + "M";
        return (n < 0 ? "-" : "") + "$" + (abs / 1000).toFixed(1).replace(/\.0$/, "") + "k";
      }
      return (n < 0 ? "-" : "") + "$" + Math.round(abs).toLocaleString("en-US");
    },
    date(ts) { return ts ? new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"; },
    dateShort(ts) { return ts ? new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"; },
    time(ts) { return ts ? new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—"; },
    dateTime(ts) { return ts ? U.date(ts) + " · " + U.time(ts) : "—"; },
    ago(ts) {
      if (!ts) return "—";
      const d = Date.now() - ts;
      if (d < 0) return U.until(ts);
      const m = Math.floor(d / 60000);
      if (m < 1) return "just now";
      if (m < 60) return m + "m ago";
      const h = Math.floor(m / 60);
      if (h < 24) return h + "h ago";
      const days = Math.floor(h / 24);
      if (days < 30) return days + "d ago";
      return Math.floor(days / 30) + "mo ago";
    },
    until(ts) {
      const d = ts - Date.now();
      if (d < 0) return U.ago(ts);
      const days = Math.ceil(d / DAY);
      if (days === 0) return "today";
      if (days === 1) return "tomorrow";
      return "in " + days + "d";
    },
    dur(sec) {
      if (sec == null) return "—";
      const m = Math.floor(sec / 60), s = sec % 60;
      return m ? m + "m " + (s ? s + "s" : "") : s + "s";
    },
    hrs(h) { return (Math.round(h * 10) / 10) + "h"; },
    initials(name) { return String(name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase(); },
    pct(n) { return Math.round(n) + "%"; },
    fileSize(b) {
      if (b == null) return "—";
      if (b > 1e9) return (b / 1e9).toFixed(1) + " GB";
      if (b > 1e6) return (b / 1e6).toFixed(1) + " MB";
      return Math.max(1, Math.round(b / 1000)) + " KB";
    },
    cap(s) { return String(s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); },
    monthLabel(ts) { return new Date(ts).toLocaleDateString("en-US", { month: "short" }); },
    startOfDay(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); },
    sameDay(a, b) { return U.startOfDay(a) === U.startOfDay(b); },
    csv(rows) {
      return rows.map((r) => r.map((c) => {
        const s = String(c == null ? "" : c);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(",")).join("\n");
    },
    download(filename, content, mime = "text/csv") {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([content], { type: mime }));
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    },
  });

  /* ================= ROLES & RBAC ================= */
  const ROLES = (OM.ROLES = {
    owner: { label: "Owner", level: 100, exec: true },
    ceo: { label: "CEO", level: 95, exec: true },
    coo: { label: "COO", level: 90, exec: true },
    cco: { label: "CCO", level: 90, exec: true },
    cso: { label: "CSO", level: 90, exec: true },
    cfo: { label: "CFO", level: 90, exec: true },
    dept_head: { label: "Department Head", level: 70 },
    project_lead: { label: "Project Lead", level: 60 },
    senior: { label: "Senior Staff", level: 50 },
    junior: { label: "Junior Staff", level: 40 },
    contractor: { label: "Contractor", level: 30 },
    intern: { label: "Intern", level: 20 },
    client: { label: "Client", level: 10 },
  });
  const lvl = (role) => (ROLES[role] || { level: 0 }).level;

  const S = (OM.store = {
    db: null,          // in-memory cache, hydrated from Supabase on sign-in
    meId: null,

    /* Populate S.db from Supabase (RLS decides what comes back). Called after
       auth resolves and again whenever we need a full resync. */
    async hydrate() {
      S.db = await OM.db.hydrate();
      // Lightweight derived counter the invoice screen uses for its next number.
      const maxInv = (S.db.invoices || []).reduce((m, i) => {
        const n = parseInt(String(i.number || "").replace(/\D/g, ""), 10);
        return isNaN(n) ? m : Math.max(m, n);
      }, 1040);
      S.db.counters = { inv: maxInv + 1 };
      return S.db;
    },
    // Re-pull a single collection after a mutation whose server effects we
    // can't fully mirror locally.
    async resync(...colls) {
      for (const c of colls) {
        const entity = Object.keys(OM.ENTITIES).find((k) => OM.ENTITIES[k].coll === c);
        if (entity) S.db[c] = await OM.db.refreshColl(entity);
      }
    },
    save() { /* persistence is now per-mutation against Supabase; no-op kept
                so the handful of legacy call sites remain harmless */ },

    me() { return (S.db && S.db.users.find((u) => u.id === S.meId)) || null; },
    meIsExec() { return S.isExec(S.me()); },
    user(id) { return S.db && S.db.users.find((u) => u.id === id); },
    userName(id) { const u = S.user(id); return u ? u.name : "System"; },
    isExec(u) { return !!(u && ROLES[u.role] && ROLES[u.role].exec); },
    isClient(u) { u = u || S.me(); return !!(u && u.portalType === "client" && u.status === "active"); },
    isStaff(u) { u = u || S.me(); return !!(u && (u.portalType === "staff" || u.portalType === "contractor") && u.status === "active"); },
    isPending(u) { u = u || S.me(); return !!(u && u.status === "pending"); },

    uid() { return (crypto && crypto.randomUUID) ? crypto.randomUUID() : "id-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8); },
    nextInvoiceNumber() { return "INV-" + (S.db.counters.inv++); },

    /* ---------- AUTH (real Supabase sessions) ---------- */
    async signUp(email, password, name) {
      const { data, error } = await OM.db.client.auth.signUp({ email, password, options: { data: { name } } });
      if (error) throw error;
      return data; // data.session is null when email confirmation is required
    },
    async signInWithPassword(email, password) {
      const { data, error } = await OM.db.client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    async signOut() {
      try { await OM.db.client.auth.signOut(); } catch (e) { /* ignore */ }
      S.meId = null; S.db = null;
    },
    async currentSession() {
      const { data } = await OM.db.client.auth.getSession();
      return data ? data.session : null;
    },
    // Stamp presence so "online" indicators are truthful for this user.
    async touchPresence() {
      if (!S.meId) return;
      try { await OM.db.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", S.meId); } catch (e) { /* non-fatal */ }
    },

    /* ---------- assignment scope helpers ---------- */
    myProjects(u) {
      u = u || S.me();
      return S.db.projects.filter((p) => p.leadId === u.id || (p.team || []).includes(u.id));
    },
    myProjectIds(u) { return new Set(S.myProjects(u).map((p) => p.id)); },
    myClientIds(u) {
      u = u || S.me();
      const ids = new Set(S.myProjects(u).map((p) => p.clientId).filter(Boolean));
      S.db.clients.forEach((c) => { if (c.ownerId === u.id) ids.add(c.id); });
      return ids;
    },

    /* ---------- MODULE ACCESS (drives nav + routes) ---------- */
    moduleAccess(mod, u) {
      u = u || S.me();
      if (!u) return false;
      // Defense in depth: RLS already makes a pending or client account's
      // queries against staff tables come back empty, but the staff shell/
      // routes should never even attempt to render for one of these — a
      // client typing a staff URL by hand should bounce immediately, not
      // land on a page that quietly shows nothing.
      if (u.status !== "active" || u.portalType === "client") return false;
      const exec = S.isExec(u);
      const role = u.role, dept = u.dept;
      switch (mod) {
        case "dashboard": case "tasks": case "notifications": case "settings": case "directory": case "calendar":
          return true;
        case "exec": case "audit":
          return exec;
        case "sales":
          return exec || dept === "Sales";
        case "clients":
          if (exec) return true;
          if (role === "intern") return false;
          if (dept === "Sales" || dept === "Production" || dept === "Creative" || role === "contractor") return true;
          return role === "dept_head";
        case "projects":
          return true;
        case "comms":
          return exec || dept === "Sales" || S.moduleAccess("clients", u);
        case "finance":
          if (role === "intern" || role === "contractor") return false;
          return exec || dept === "Finance";
        case "hr":
          if (role === "intern" || role === "contractor") return false;
          return exec || dept === "Human Resources";
        case "equipment":
          return role !== "intern" ? true : true; // interns may view equipment (read-only)
        case "resources": case "documents":
          return true;
        case "approvals":
          return exec || role === "dept_head";
        default:
          return exec;
      }
    },

    /* ---------- PERMISSION CORE ----------
       can(action, entity, record) — the single authorization gate.
       Every mutation in the store calls assertCan(); UI additionally uses can() to hide affordances. */
    can(action, entity, rec, u) {
      u = u || S.me();
      if (!u) return false;
      const exec = S.isExec(u);
      const role = u.role, dept = u.dept, level = lvl(role);

      // Audit log is append-only for everyone, viewable by exec only.
      if (entity === "audit") return action === "view" ? exec : false;

      // Hard intern restrictions
      if (role === "intern" && (action === "delete" || action === "approve" || action === "admin" || action === "manage")) return false;
      if (role === "intern" && ["invoice", "expense", "payroll", "commission", "budget", "candidate", "review", "hrAction"].includes(entity)) return false;

      if (exec) return true;
      if (action === "admin") return false;

      const inMyProjects = (pid) => pid && S.myProjectIds(u).has(pid);
      const own = (rec2, field) => rec2 && rec2[field] === u.id;

      switch (entity) {
        case "lead": case "comm": {
          if (dept !== "Sales" && !(entity === "comm" && rec && rec.clientId && S.myClientIds(u).has(rec.clientId))) {
            // non-sales can log comms on their own clients
            if (entity === "comm" && (action === "create" || action === "view")) return S.moduleAccess("clients", u);
            return false;
          }
          if (role === "dept_head") return true;
          if (action === "view" || action === "create" || action === "edit") {
            if (!rec) return true;
            return own(rec, "assignedTo") || own(rec, "userId") || rec.assignedTo == null;
          }
          if (action === "assign") return role === "dept_head";
          return false; // delete leads = head/exec only
        }
        case "client": {
          if (role === "contractor") return action === "view" && rec && S.myClientIds(u).has(rec.id);
          if (dept === "Sales") return action !== "delete";
          if (action === "view") return true;
          return false;
        }
        case "project": {
          if (action === "view") return !rec || exec || role === "dept_head" ? (role === "dept_head" ? true : !rec || inMyProjects(rec.id)) : !rec || inMyProjects(rec.id);
          if (action === "create") return level >= 60;
          if (rec && (action === "edit" || action === "assign" || action === "manage")) {
            if (role === "dept_head") return true;
            return rec.leadId === u.id;
          }
          if (action === "delete") return role === "dept_head";
          return false;
        }
        case "task": {
          if (role === "contractor" || role === "intern") {
            if (action === "delete") return false;
            if (!rec) return action === "view";
            return own(rec, "assigneeId") || inMyProjects(rec.projectId);
          }
          if (action === "delete") return level >= 60 || (rec && own(rec, "createdBy"));
          if (action === "assign") return level >= 50;
          return true;
        }
        case "invoice": case "payroll": case "budget": case "commission": {
          if (dept !== "Finance") return false;
          if (action === "view" || action === "create" || action === "edit" || action === "export") return true;
          if (action === "delete" || action === "approve") return role === "dept_head";
          return false;
        }
        case "expense": {
          if (action === "create") return role !== "intern"; // anyone submits expenses
          if (action === "view") return dept === "Finance" || (rec && own(rec, "submittedBy")) || role === "dept_head";
          if (action === "approve") return role === "dept_head";
          if (dept === "Finance") return action !== "delete" || role === "dept_head";
          return false;
        }
        case "candidate": case "review": case "hrAction": case "employee": {
          if (dept !== "Human Resources") {
            if (entity === "review") {
              if (rec && (own(rec, "userId") || own(rec, "reviewerId"))) return action === "view" || (action === "edit" && own(rec, "reviewerId"));
              if (role === "dept_head" && (action === "create" || action === "view")) return true;
              // Assigned managers may write a review for their own direct report.
              const target = rec && rec.userId && S.find("user", rec.userId);
              if ((action === "create" || action === "view") && target && target.managerId === u.id) return true;
              return false;
            }
            if (entity === "candidate" && role === "dept_head") return action === "view";
            return false;
          }
          if (action === "delete") return role === "dept_head";
          return true;
        }
        case "timeoff": {
          if (action === "create") return true;
          if (action === "view") return dept === "Human Resources" || role === "dept_head" || (rec && own(rec, "userId"));
          if (action === "approve") return role === "dept_head" || dept === "Human Resources";
          if (action === "edit") return rec && own(rec, "userId") && rec.status === "pending";
          return false;
        }
        case "equipment": {
          if (action === "view") return true;
          if (role === "intern") return false;
          if (action === "checkout" || action === "checkin") {
            if (role === "contractor") return rec && (rec.status !== "checked_out" ? true : rec.assignedTo === u.id);
            return true;
          }
          if (action === "edit" || action === "manage") return dept === "Technology" || role === "dept_head";
          if (action === "delete") return dept === "Technology" && role === "dept_head";
          return false;
        }
        case "resource": case "document": {
          if (action === "view") {
            if (!rec) return true;
            if (rec.confidential) return false; // exec only (exec returned true above)
            if (rec.depts && !rec.depts.includes(dept)) return false;
            if (rec.minRole && lvl(rec.minRole) > level) return false;
            return true;
          }
          if (action === "create") return role !== "intern" && role !== "contractor";
          if (action === "edit") return level >= 50 && S.can("view", entity, rec, u);
          if (action === "delete") return role === "dept_head";
          if (action === "export") return S.can("view", entity, rec, u);
          return false;
        }
        case "approval": {
          if (action === "view") return role === "dept_head" || (rec && own(rec, "requestedBy"));
          if (action === "approve") {
            if (role !== "dept_head") return false;
            if (!rec) return true;
            return (rec.approverRoles || []).some((r) => r === "dept_head:" + dept || (r === "hr" && dept === "Human Resources"));
          }
          if (action === "create") return true;
          return false;
        }
        case "meeting": {
          if (action === "view") return true;
          if (action === "create" || action === "edit") return role !== "intern";
          return level >= 60;
        }
        case "initiative": case "risk": case "boardNote":
          return false; // exec only
        case "hrNote": case "onboardingTemplate": case "onboardingAssignment":
          return dept === "Human Resources";
        case "deliverable": {
          if (action === "view") return !rec || role === "dept_head" || inMyProjects(rec.projectId);
          if (action === "create") return role === "dept_head" || ["Production", "Creative"].includes(dept);
          if (action === "edit") return role === "dept_head" || (rec && own(rec, "uploadedBy")) || inMyProjects(rec && rec.projectId);
          return false; // delete = dept_head/exec only (handled by exec bypass above)
        }
        case "contract": case "proposal":
          return dept === "Sales";
        case "notification":
          return rec ? rec.userId === u.id : true;
        case "user":
          if (action === "view") return true;
          // Self-service: name/phone/title/avatar. Role/dept/status placement
          // is routed through S.updateProfile() (HR/exec only) instead, and
          // is additionally guarded server-side by the enforce_profile_update
          // trigger regardless of what a client sends.
          if (action === "edit") return rec && rec.id === u.id;
          return false;
        default:
          return false;
      }
    },

    assertCan(action, entity, rec) {
      if (!S.can(action, entity, rec)) {
        const u = S.me();
        S.audit(action, entity, rec ? rec.id : "*", "DENIED — insufficient permission (" + action + " " + entity + ")", { denied: true, skipPermission: true });
        const err = new Error("You don't have permission to " + action + " this " + entity + ".");
        err.permission = true;
        throw err;
      }
    },

    /* ---------- background write helper ----------
       Every mutation updates the in-memory cache immediately (so the UI feels
       instant) and pushes the real write to Supabase in the background. If the
       write is rejected (usually RLS), we surface it and re-pull the affected
       collections so the screen snaps back to server truth. */
    _bg(promise, label, resyncColls) {
      Promise.resolve(promise).catch((e) => {
        console.error(label, e);
        if (OM.ui) OM.ui.toast((label || "Save failed") + ": " + (e.message || e), "bad", 6000);
        if (resyncColls && resyncColls.length) S.resync(...resyncColls).then(() => OM.router && OM.router.refresh()).catch(() => {});
      });
    },

    /* ---------- AUDIT (append-only) ---------- */
    audit(action, entity, entityId, summary, opts = {}) {
      const u = S.me();
      const rec = {
        id: S.uid(), ts: Date.now(),
        userId: u ? u.id : null, role: u ? u.role : null, dept: u ? u.dept : null,
        action, entity, entityId: entityId || "*", summary,
        prev: opts.prev != null ? opts.prev : null,
        next: opts.next != null ? opts.next : null,
        ip: null,
        ua: navigator.userAgent.includes("Firefox") ? "Firefox / " + navigator.platform : (navigator.userAgent.includes("Safari") && !navigator.userAgent.includes("Chrome")) ? "Safari / " + navigator.platform : "Chrome / " + (navigator.platform || "web"),
        reason: opts.reason || null, denied: !!opts.denied,
      };
      if (S.db && S.db.audit) S.db.audit.unshift(rec);   // exec audit page updates at once
      // append-only ledger write, fire-and-forget (no toast on failure to avoid noise)
      OM.db.insert("audit", rec).catch((e) => console.warn("audit insert", e.message));
    },

    /* ---------- NOTIFICATIONS ---------- */
    // Cross-user notifications go through the notify_many SECURITY DEFINER RPC
    // (direct inserts into someone else's feed are revoked in RLS).
    notify(userIds, kind, title, body, link) {
      const list = (Array.isArray(userIds) ? userIds : [userIds]).filter((id) => id && id !== S.meId);
      if (!list.length) return;
      OM.db.rpc("notify_many", { p_users: list, p_kind: kind, p_title: title, p_body: body, p_link: link || "#/" })
        .catch((e) => console.warn("notify", e.message));
    },
    myNotifications() { return (S.db.notifications || []).filter((n) => n.userId === S.meId).sort((a, b) => b.ts - a.ts); },
    unreadCount() { return S.myNotifications().filter((n) => !n.read).length; },
    markAllRead() {
      const unread = S.myNotifications().filter((n) => !n.read);
      unread.forEach((n) => (n.read = true));
      if (unread.length) S._bg(OM.db.from("notifications").update({ read: true }).eq("user_id", S.meId).eq("read", false), "Mark read", ["notifications"]);
    },
    markRead(id) {
      const n = (S.db.notifications || []).find((x) => x.id === id);
      if (n && !n.read) { n.read = true; S._bg(OM.db.from("notifications").update({ read: true }).eq("id", id), "Mark read"); }
    },

    execIds() { return S.db.users.filter((u) => S.isExec(u)).map((u) => u.id); },
    deptHeadId(dept) { const u = S.db.users.find((x) => x.role === "dept_head" && x.dept === dept); return u ? u.id : null; },

    /* ---------- GENERIC CRUD (permission-gated + audited) ---------- */
    coll(entity) { const def = OM.ENTITIES[entity]; return def ? S.db[def.coll] : null; },
    find(entity, id) { return (S.coll(entity) || []).find((r) => r.id === id); },

    // child-table writers used when a parent is created with nested rows
    async _writeChildren(entity, data) {
      if (entity === "project" && (data.team || []).length) {
        await OM.db.from("project_team").insert(data.team.map((uid) => ({ project_id: data.id, user_id: uid })));
      } else if (entity === "meeting" && Array.isArray(data.attendees)) {
        await OM.db.from("meeting_attendees").insert(data.attendees.map((uid) => ({ meeting_id: data.id, user_id: uid })));
      } else if (entity === "invoice" && (data.items || []).length) {
        await OM.db.from("invoice_items").insert(data.items.map((it) => ({ invoice_id: data.id, description: it.desc, qty: it.qty, rate: it.rate })));
      } else if (entity === "initiative" && (data.keyResults || []).length) {
        await OM.db.from("key_results").insert(data.keyResults.map((k) => ({ initiative_id: data.id, text: k.text, done: k.done || 0, target: k.target || 1 })));
      } else if (entity === "onboardingTemplate" && (data.tasks || []).length) {
        await OM.db.from("onboarding_template_tasks").insert(data.tasks.map((t, i) => ({ template_id: data.id, text: t.text, category: t.category || "general", position: i })));
      }
    },

    create(entity, data, summary) {
      S.assertCan("create", entity, data);
      if (!data.id) data.id = S.uid();
      if (data.createdAt == null) data.createdAt = Date.now();
      S.coll(entity).push(data);            // optimistic
      S.audit("create", entity, data.id, summary || ("Created " + entity + " — " + (data.name || data.title || data.id)), { next: data.name || data.title || null });
      S._bg((async () => { await OM.db.insert(entity, data); await S._writeChildren(entity, data); })(), "Create " + entity, [OM.ENTITIES[entity].coll]);
      return data;
    },
    update(entity, id, patch, summary, reason) {
      const rec = S.find(entity, id);
      if (!rec) throw new Error(U.cap(entity) + " not found.");
      S.assertCan("edit", entity, rec);
      const prevSnapshot = {};
      Object.keys(patch).forEach((k) => (prevSnapshot[k] = rec[k]));
      Object.assign(rec, patch);            // optimistic
      S.audit("edit", entity, id, summary || ("Updated " + entity + " — " + (rec.name || rec.title || id)), {
        prev: JSON.stringify(prevSnapshot).slice(0, 400), next: JSON.stringify(patch).slice(0, 400), reason,
      });
      S._bg(OM.db.patch(entity, id, patch), "Update " + entity, [OM.ENTITIES[entity].coll]);
      return rec;
    },
    remove(entity, id, reason) {
      const rec = S.find(entity, id);
      if (!rec) return;
      S.assertCan("delete", entity, rec);
      if (!reason) { const err = new Error("A reason is required to delete records."); err.needsReason = true; throw err; }
      const arr = S.coll(entity);
      arr.splice(arr.indexOf(rec), 1);      // optimistic
      S.audit("delete", entity, id, "Deleted " + entity + " — " + (rec.name || rec.title || id), { prev: JSON.stringify(rec).slice(0, 500), reason });
      S._bg(OM.db.del(entity, id), "Delete " + entity, [OM.ENTITIES[entity].coll]);
    },

    /* ---------- nested-write helpers (child tables) ---------- */
    addChecklistItem(taskId, text) {
      const t = S.find("task", taskId); if (!t) return;
      const item = { id: S.uid(), text, done: false, position: (t.checklist || []).length };
      t.checklist = t.checklist || []; t.checklist.push(item);
      S._bg(OM.db.from("task_checklist_items").insert({ id: item.id, task_id: taskId, text, done: false, position: item.position }), "Add checklist item", ["tasks"]);
    },
    toggleChecklistItem(itemId, done) {
      let host = null;
      (S.db.tasks || []).forEach((t) => (t.checklist || []).forEach((c) => { if (c.id === itemId) { c.done = done; host = t; } }));
      S._bg(OM.db.from("task_checklist_items").update({ done }).eq("id", itemId), "Update checklist", ["tasks"]);
    },
    logTime(taskId, hours) {
      const t = S.find("task", taskId); if (!t) return;
      const entry = { id: S.uid(), userId: S.meId, hours, date: Date.now() };
      t.timeEntries = t.timeEntries || []; t.timeEntries.push(entry);
      S.audit("edit", "task", taskId, "Logged " + U.hrs(hours) + ' on "' + t.title + '"');
      S._bg(OM.db.from("task_time_entries").insert({ id: entry.id, task_id: taskId, user_id: S.meId, hours, entry_date: new Date().toISOString().slice(0, 10) }), "Log time", ["tasks"]);
    },
    addComment(taskId, text) {
      const t = S.find("task", taskId); if (!t) return;
      const c = { id: S.uid(), userId: S.meId, text, ts: Date.now() };
      t.comments = t.comments || []; t.comments.push(c);
      S.audit("create", "comm", taskId, 'Commented on task "' + t.title + '"');
      (text.match(/@(\w+)/g) || []).forEach((m) => {
        const u = S.db.users.find((x) => x.name.toLowerCase().startsWith(m.slice(1).toLowerCase()));
        if (u) S.notify(u.id, "mention", S.userName(S.meId) + " mentioned you", text.slice(0, 100), "#/task/" + taskId);
      });
      if (t.assigneeId && t.assigneeId !== S.meId) S.notify(t.assigneeId, "task", "New comment on: " + t.title, text.slice(0, 100), "#/task/" + taskId);
      S._bg(OM.db.from("task_comments").insert({ id: c.id, task_id: taskId, user_id: S.meId, body: text }), "Comment", ["tasks"]);
    },
    addTeamMember(projectId, userId) {
      const p = S.find("project", projectId); if (!p) return;
      S.assertCan("assign", "project", p);
      p.team = p.team || []; if (!p.team.includes(userId)) p.team.push(userId);
      S.audit("assign", "project", projectId, "Added " + S.userName(userId) + " to " + p.code);
      S.notify(userId, "project", "You were added to " + p.name, "Added by " + S.userName(S.meId), "#/project/" + projectId);
      S._bg(OM.db.from("project_team").insert({ project_id: projectId, user_id: userId }), "Add team member", ["projects"]);
    },

    /* ---------- DOMAIN ACTIONS ---------- */
    logCall(data) {
      S.assertCan("create", "comm", data);
      const rec = Object.assign({ id: S.uid(), kind: "call", direction: "outbound", userId: S.meId, ts: Date.now() }, data);
      S.db.comms.push(rec);                 // optimistic
      const lead = rec.leadId && S.find("lead", rec.leadId);
      let leadPatch = null;
      if (lead) {
        lead.lastActivity = Date.now();
        lead.touches = (lead.touches || 0) + 1;
        if (rec.outcome === "meeting_set" && ["new", "contacted", "interested"].includes(lead.stage)) lead.stage = "meeting";
        else if (["connected", "callback"].includes(rec.outcome) && lead.stage === "new") lead.stage = "contacted";
        else if (rec.outcome === "not_interested") lead.stage = lead.stage === "won" ? lead.stage : "lost";
        leadPatch = { lastActivity: lead.lastActivity, touches: lead.touches, stage: lead.stage };
      }
      S.audit("create", "comm", rec.id, "Logged " + rec.kind + (lead ? " — " + lead.company : "") + " (" + (rec.outcome || "note") + ")");
      if (rec.outcome === "meeting_set") S.notify(S.execIds().concat(S.deptHeadId("Sales")), "sales", "Meeting booked: " + (lead ? lead.company : "a lead"), S.userName(S.meId) + " set a meeting.", "#/sales/pipeline");
      S._bg((async () => { await OM.db.insert("comm", rec); if (leadPatch) await OM.db.patch("lead", lead.id, leadPatch); })(), "Log call", ["comms", "leads"]);
      return rec;
    },

    moveLead(leadId, stage, reason) {
      const lead = S.find("lead", leadId);
      S.assertCan("edit", "lead", lead);
      const prev = lead.stage;
      lead.stage = stage;
      lead.lastActivity = Date.now();
      S.audit("edit", "lead", leadId, "Moved " + lead.company + ": " + U.cap(prev) + " → " + U.cap(stage), { prev, next: stage, reason });
      if (stage === "won") {
        S.notify(S.execIds().concat(S.deptHeadId("Sales")), "sales", "Deal won — " + lead.company + " (" + U.money(lead.value) + ")", "Closed by " + S.userName(lead.assignedTo) + ".", "#/sales/pipeline");
      }
      S._bg(OM.db.patch("lead", leadId, { stage, lastActivity: lead.lastActivity }), "Move lead", ["leads"]);
    },

    // The multi-approver chain + ripple effects run server-side in the
    // decide_approval() RPC so they stay atomic and can't be spoofed. We show
    // an optimistic result, then resync from the authoritative outcome.
    decideApproval(apId, decision, note) {
      const ap = S.find("approval", apId);
      S.assertCan("approve", "approval", ap);
      ap.decisions = ap.decisions || [];
      ap.decisions.push({ userId: S.meId, decision, ts: Date.now(), note: note || null });
      const needsCeo = (ap.approverRoles || []).includes("ceo");
      const stillNeedsCeo = needsCeo && !ap.decisions.some((d) => { const u = S.user(d.userId); return u && (u.role === "ceo" || u.role === "owner"); });
      if (decision === "rejected") ap.status = "rejected"; else if (!stillNeedsCeo) ap.status = "approved";
      S._bg((async () => {
        await OM.db.rpc("decide_approval", { p_approval_id: apId, p_decision: decision, p_note: note || null });
        await S.resync("approvals", "expenses", "timeOff", "invoices", "notifications");
        if (OM.router) OM.router.refresh();
      })(), "Decide approval", ["approvals"]);
      return ap;
    },

    // ---------- pending-user approval (HR/exec) ----------
    // Moves a pending signup into Staff/Contractor/Client with everything the
    // approval form captures. All the real work (placement, project/onboarding
    // assignment, notification, audit) happens inside approve_user() so it's
    // atomic and can't be partially applied by a dropped connection mid-flow.
    approveUser(userId, v) {
      const me = S.me();
      if (!(S.isExec(me) || me.dept === "Human Resources")) throw new Error("Only HR or an executive can approve a new user.");
      return (async () => {
        await OM.db.rpc("approve_user", {
          p_user_id: userId, p_portal_type: v.portalType, p_role: v.role || null, p_dept: v.dept || null,
          p_title: v.title || null, p_company: v.company || null, p_client_id: v.clientId || null,
          p_project_id: v.projectId || null, p_permission_group: v.permissionGroup || null,
          p_manager_id: v.managerId || null, p_onboarding_template_id: v.onboardingTemplateId || null, p_notes: v.notes || null,
        });
        await S.resync("users", "projects", "onboardingAssignments", "notifications");
      })();
    },

    // Acknowledging is the reviewed employee's own action, distinct from the
    // reviewer's edit rights — narrower than the generic update() permission
    // check, so it gets its own assertion rather than reusing can("edit").
    acknowledgeReview(id) {
      const me = S.me();
      const r = S.find("review", id);
      if (!r || r.userId !== me.id) throw new Error("You can only acknowledge your own review.");
      if (r.status !== "approved") throw new Error("This review hasn't been finalized yet.");
      r.acknowledgedAt = Date.now();
      S.audit("edit", "review", id, "Acknowledged review" + (r.period ? " — " + r.period : ""));
      S._bg(OM.db.patch("review", id, { acknowledgedAt: r.acknowledgedAt }), "Acknowledge review", ["reviews"]);
    },

    // ---------- onboarding ----------
    completeOnboardingTask(progressId, done) {
      return OM.db.rpc("complete_onboarding_task", { p_progress_id: progressId, p_done: done })
        .then(() => S.resync("onboardingAssignments"));
    },
    approveOnboarding(assignmentId) {
      S.assertCan("edit", "onboardingAssignment", null);
      return OM.db.rpc("approve_onboarding", { p_assignment_id: assignmentId })
        .then(() => S.resync("onboardingAssignments", "notifications"));
    },

    // ---------- contracts ----------
    markContractViewed(id) { return OM.db.rpc("mark_contract_viewed", { p_id: id }).then(() => S.resync("contracts")); },
    signContract(id, signatureName) {
      return OM.db.rpc("sign_contract", { p_id: id, p_signature_name: signatureName })
        .then(() => S.resync("contracts", "notifications"));
    },
    countersignContract(id) {
      return OM.db.rpc("countersign_contract", { p_id: id }).then(() => S.resync("contracts"));
    },

    // ---------- proposals ----------
    markProposalViewed(id) { return OM.db.rpc("mark_proposal_viewed", { p_id: id }).then(() => S.resync("proposals")); },
    acceptProposal(id) {
      return OM.db.rpc("accept_proposal", { p_id: id })
        .then(() => S.resync("proposals", "projects", "contracts", "invoices", "notifications"));
    },
    rejectProposal(id, reason) {
      return OM.db.rpc("reject_proposal", { p_id: id, p_reason: reason || null }).then(() => S.resync("proposals", "notifications"));
    },

    // ---------- deliverables ----------
    logDeliverableEvent(id, action, note, version) {
      return OM.db.rpc("log_deliverable_event", { p_id: id, p_action: action, p_note: note || null, p_version: version || null })
        .then(() => S.resync("deliverableEvents"));
    },
    clientReviewDeliverable(id, action, note) {
      return OM.db.rpc("client_review_deliverable", { p_id: id, p_action: action, p_note: note || null })
        .then(() => S.resync("deliverables", "deliverableEvents", "tasks", "notifications"));
    },

    // HR/exec place a member into their role, department, title, and status.
    // The profiles UPDATE policy + enforce_profile_update trigger enforce this
    // server-side; this is the client affordance + audit trail.
    updateProfile(userId, patch, summary) {
      const me = S.me();
      if (!(S.isExec(me) || me.dept === "Human Resources")) throw new Error("Only HR or an executive can edit team members.");
      const u = S.user(userId); if (!u) throw new Error("Member not found.");
      const prev = { role: u.role, dept: u.dept, title: u.title, status: u.status };
      Object.assign(u, patch);
      S.audit("manage", "employee", userId, summary || ("Updated member — " + u.name), { prev: JSON.stringify(prev).slice(0, 300), next: JSON.stringify(patch).slice(0, 300) });
      if (patch.role || patch.dept) S.notify(userId, "hr", "Your access was updated", "You're now " + OM.ROLES[u.role].label + " in " + u.dept + ".", "#/settings");
      S._bg(OM.db.patch("user", userId, patch), "Update member", ["users"]);
      return u;
    },
    // Compensation is Finance/exec only and lives in its own table.
    setCompensation(userId, salary, rate) {
      const me = S.me();
      if (!(S.isExec(me) || me.dept === "Finance")) throw new Error("Only Finance or an executive can set compensation.");
      const u = S.user(userId); if (u) { u.salary = salary != null ? salary : u.salary; u.rate = rate != null ? rate : u.rate; }
      S.audit("manage", "compensation", userId, "Updated compensation — " + (u ? u.name : userId));
      S._bg(OM.db.from("compensation").upsert({ profile_id: userId, salary: salary != null ? salary : null, hourly_rate: rate != null ? rate : null }), "Set compensation", ["users"]);
    },

    decideTimeOff(id, status) {
      const t = S.find("timeoff", id);
      S.assertCan("approve", "timeoff", t);
      t.status = status;
      S.audit("approve", "timeoff", id, (status === "approved" ? "Approved" : "Denied") + " time off — " + S.userName(t.userId) + " (" + t.days + "d)");
      S.notify(t.userId, "hr", "Time off " + status, status === "approved" ? U.date(t.start) + " → " + U.date(t.end) : "Talk to your manager for details.", "#/settings");
      S._bg(OM.db.patch("timeoff", id, { status }), "Decide time off", ["timeOff"]);
    },

    checkoutEquipment(eqId, projectId) {
      const eq = S.find("equipment", eqId);
      S.assertCan("checkout", "equipment", eq);
      if (eq.status !== "available") throw new Error("This item is not available.");
      const patch = { status: "checked_out", assignedTo: S.meId, projectId: projectId || null, location: "Field — " + S.userName(S.meId) };
      Object.assign(eq, patch);
      S.audit("edit", "equipment", eqId, "Checked out " + eq.name + " (" + eq.assetTag + ")", { next: "checked_out" });
      S._bg(OM.db.patch("equipment", eqId, patch), "Check out", ["equipment"]);
    },
    checkinEquipment(eqId, condition, note) {
      const eq = S.find("equipment", eqId);
      S.assertCan("checkin", "equipment", eq);
      const prevUser = eq.assignedTo;
      const patch = { status: condition === "damaged" ? "damaged" : "available", assignedTo: null, projectId: null, condition: condition || eq.condition, location: "Studio A cage", note: note || eq.note };
      Object.assign(eq, patch);
      S.audit("edit", "equipment", eqId, "Checked in " + eq.name + (condition === "damaged" ? " — DAMAGED: " + (note || "") : ""), { prev: prevUser, next: eq.status });
      if (condition === "damaged") S.notify([S.deptHeadId("Technology")].concat(S.execIds()), "equipment", "Damage reported: " + eq.name, note || "Inspect and file a damage report.", "#/equipment");
      S._bg(OM.db.patch("equipment", eqId, patch), "Check in", ["equipment"]);
    },
  });

  /* ================= METRICS ================= */
  const M = (OM.metrics = {
    _monthStart(offset = 0) { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() - offset); return d.getTime(); },
    revenueBetween(a, b) {
      return OM.store.db.invoices.filter((i) => i.paidAt && i.paidAt >= a && i.paidAt < b).reduce((s, i) => s + i.amount, 0);
    },
    expensesBetween(a, b) {
      return OM.store.db.expenses.filter((e) => e.date >= a && e.date < b && e.status !== "rejected").reduce((s, e) => s + e.amount, 0);
    },
    revenueToday() { const t = U.startOfDay(Date.now()); return M.revenueBetween(t, t + DAY); },
    revenueMTD() { return M.revenueBetween(M._monthStart(), Date.now() + 1); },
    revenueYTD() { const d = new Date(); d.setMonth(0, 1); d.setHours(0, 0, 0, 0); return M.revenueBetween(d.getTime(), Date.now() + 1); },
    expensesMTD() { return M.expensesBetween(M._monthStart(), Date.now() + 1); },
    expensesYTD() { const d = new Date(); d.setMonth(0, 1); d.setHours(0, 0, 0, 0); return M.expensesBetween(d.getTime(), Date.now() + 1); },
    monthlySeries(n = 12) {
      const out = [];
      for (let i = n - 1; i >= 0; i--) {
        const a = M._monthStart(i), b = i === 0 ? Date.now() + 1 : M._monthStart(i - 1);
        out.push({ label: U.monthLabel(a), revenue: M.revenueBetween(a, b), expenses: M.expensesBetween(a, b) });
      }
      return out;
    },
    outstanding() { return OM.store.db.invoices.filter((i) => ["sent", "overdue", "viewed", "partial"].includes(i.status)); },
    arTotal() { return M.outstanding().reduce((s, i) => s + i.total, 0); },
    overdue() { return OM.store.db.invoices.filter((i) => i.status === "overdue" || (["sent", "viewed"].includes(i.status) && i.dueAt < Date.now())); },
    payrollDue() { const p = OM.store.db.payroll.find((x) => x.status === "scheduled"); return p || null; },
    pipeline() { return OM.store.db.leads.filter((l) => !["won", "lost", "archived"].includes(l.stage)); },
    pipelineValue() { return M.pipeline().reduce((s, l) => s + l.value, 0); },
    conversionRate() {
      const closed = OM.store.db.leads.filter((l) => ["won", "lost"].includes(l.stage));
      const won = closed.filter((l) => l.stage === "won");
      return closed.length ? Math.round((won.length / closed.length) * 100) : 0;
    },
    callsToday() { const t = U.startOfDay(Date.now()); return OM.store.db.comms.filter((c) => c.kind === "call" && c.ts >= t); },
    callsBetween(a, b) { return OM.store.db.comms.filter((c) => c.kind === "call" && c.ts >= a && c.ts < b); },
    meetingsUpcoming() { return OM.store.db.meetings.filter((m) => m.ts > Date.now()).sort((a, b) => a.ts - b.ts); },
    meetingsBookedThisMonth() { return OM.store.db.comms.filter((c) => c.outcome === "meeting_set" && c.ts >= M._monthStart()).length; },
    projectsAtRisk() { return OM.store.db.projects.filter((p) => p.status === "active" && p.health === "at_risk"); },
    projectsBehind() { return OM.store.db.projects.filter((p) => p.status === "active" && (p.health === "behind" || p.dueDate < Date.now())); },
    upcomingDeadlines(days = 14) {
      const cut = Date.now() + days * DAY;
      const proj = OM.store.db.projects.filter((p) => p.status === "active" && p.dueDate <= cut).map((p) => ({ ts: p.dueDate, label: p.name, kind: "project", link: "#/project/" + p.id }));
      const tk = OM.store.db.tasks.filter((t) => t.status !== "done" && t.dueDate && t.dueDate <= cut).map((t) => ({ ts: t.dueDate, label: t.title, kind: "task", link: "#/task/" + t.id }));
      return proj.concat(tk).sort((a, b) => a.ts - b.ts);
    },
    approvalsPending() { return OM.store.db.approvals.filter((a) => a.status === "pending"); },
    avgSatisfaction() {
      const act = OM.store.db.clients.filter((c) => c.status === "active");
      return act.length ? (act.reduce((s, c) => s + (c.satisfaction || 0), 0) / act.length).toFixed(1) : "—";
    },
    staffOnline() { return OM.store.db.users.filter((u) => u.online && u.status === "active"); },
    revenueByClientYTD() {
      const d = new Date(); d.setMonth(0, 1); d.setHours(0, 0, 0, 0);
      const map = {};
      OM.store.db.invoices.filter((i) => i.paidAt && i.paidAt >= d.getTime()).forEach((i) => { map[i.clientId] = (map[i.clientId] || 0) + i.amount; });
      return Object.entries(map).map(([cid, amt]) => ({ client: OM.store.find("client", cid), amt })).filter((x) => x.client).sort((a, b) => b.amt - a.amt);
    },
    expenseByCategory(days = 90) {
      const cut = Date.now() - days * DAY;
      const map = {};
      OM.store.db.expenses.filter((e) => e.date >= cut).forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
      return Object.entries(map).map(([k, v]) => ({ label: k, value: v })).sort((a, b) => b.value - a.value);
    },
    callLeaderboard(days = 30) {
      const cut = Date.now() - days * DAY;
      const map = {};
      OM.store.db.comms.filter((c) => c.kind === "call" && c.ts >= cut).forEach((c) => {
        map[c.userId] = map[c.userId] || { calls: 0, connected: 0, meetings: 0 };
        map[c.userId].calls++;
        if (["connected", "meeting_set"].includes(c.outcome)) map[c.userId].connected++;
        if (c.outcome === "meeting_set") map[c.userId].meetings++;
      });
      return Object.entries(map).map(([uid, s]) => ({ user: OM.store.user(uid), ...s })).filter((x) => x.user).sort((a, b) => b.calls - a.calls);
    },
  });
})();
