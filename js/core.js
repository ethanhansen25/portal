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
  });
  const lvl = (role) => (ROLES[role] || { level: 0 }).level;

  const S = (OM.store = {
    db: null,
    sessionKey: "oakframe.session.v1",
    dbKey: "oakframe.db.v3",

    load() {
      let db = null;
      try { db = JSON.parse(localStorage.getItem(S.dbKey) || "null"); } catch (e) { db = null; }
      if (!db || db.version !== 3) db = OM.seed();
      S.db = db;
      S.save();
    },
    save() { try { localStorage.setItem(S.dbKey, JSON.stringify(S.db)); } catch (e) { /* storage full — keep in memory */ } },
    reset() { localStorage.removeItem(S.dbKey); S.load(); },

    me() { return S.db.users.find((u) => u.id === S.meId) || null; },
    meId: null,
    signIn(userId) {
      S.meId = userId;
      localStorage.setItem(S.sessionKey, userId);
      S.audit("view", "session", userId, "Signed in", { skipPermission: true });
    },
    signOut() {
      if (S.meId) S.audit("view", "session", S.meId, "Signed out", { skipPermission: true });
      S.meId = null;
      localStorage.removeItem(S.sessionKey);
    },
    restoreSession() {
      const id = localStorage.getItem(S.sessionKey);
      if (id && S.db.users.find((u) => u.id === id)) S.meId = id;
    },

    user(id) { return S.db.users.find((u) => u.id === id); },
    userName(id) { const u = S.user(id); return u ? u.name : "System"; },
    isExec(u) { return !!(u && ROLES[u.role] && ROLES[u.role].exec); },
    meIsExec() { return S.isExec(S.me()); },

    uid(prefix) { return prefix + "-" + (S.db.counters.generic++) + Math.random().toString(36).slice(2, 6); },

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
            if (entity === "review" && rec && (own(rec, "userId") || own(rec, "reviewerId"))) return action === "view" || (action === "edit" && own(rec, "reviewerId"));
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
        case "notification":
          return rec ? rec.userId === u.id : true;
        case "user":
          if (action === "view") return true;
          return false; // profile edits routed through HR/exec
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

    /* ---------- AUDIT (append-only) ---------- */
    audit(action, entity, entityId, summary, opts = {}) {
      const u = S.me();
      S.db.audit.push({
        id: "au-" + (S.db.counters.au++),
        ts: Date.now(),
        userId: u ? u.id : "system",
        role: u ? u.role : "system",
        dept: u ? u.dept : "—",
        action, entity, entityId: entityId || "*", summary,
        prev: opts.prev != null ? opts.prev : null,
        next: opts.next != null ? opts.next : null,
        ip: (S.db.ipFor && u && S.db.ipFor[u.id]) || "10.4.0.1",
        ua: navigator.userAgent.includes("Firefox") ? "Firefox / " + navigator.platform : navigator.userAgent.includes("Safari") && !navigator.userAgent.includes("Chrome") ? "Safari / " + navigator.platform : "Chrome / " + (navigator.platform || "web"),
        reason: opts.reason || null,
        denied: !!opts.denied,
      });
      S.save();
    },

    /* ---------- NOTIFICATIONS ---------- */
    notify(userIds, kind, title, body, link) {
      (Array.isArray(userIds) ? userIds : [userIds]).forEach((uid) => {
        if (!uid || uid === S.meId) return;
        S.db.notifications.push({ id: "n-" + (S.db.counters.n++), userId: uid, kind, title, body, ts: Date.now(), read: false, link: link || "#/" });
      });
      S.save();
    },
    myNotifications() { return S.db.notifications.filter((n) => n.userId === S.meId).sort((a, b) => b.ts - a.ts); },
    unreadCount() { return S.myNotifications().filter((n) => !n.read).length; },
    markAllRead() { S.myNotifications().forEach((n) => (n.read = true)); S.save(); },

    execIds() { return S.db.users.filter((u) => S.isExec(u)).map((u) => u.id); },
    deptHeadId(dept) { const u = S.db.users.find((x) => x.role === "dept_head" && x.dept === dept); return u ? u.id : null; },

    /* ---------- GENERIC CRUD (permission-gated + audited) ---------- */
    collections: {
      lead: "leads", client: "clients", contact: "contacts", project: "projects", task: "tasks",
      invoice: "invoices", expense: "expenses", equipment: "equipment", approval: "approvals",
      candidate: "candidates", timeoff: "timeOff", review: "reviews", hrAction: "hrActions",
      comm: "comms", meeting: "meetings", resource: "resources", document: "documents",
      initiative: "initiatives", risk: "risks", boardNote: "boardNotes", commission: "commissions",
      payroll: "payroll", budget: "budgets", user: "users",
    },
    coll(entity) { return S.db[S.collections[entity]]; },
    find(entity, id) { return (S.coll(entity) || []).find((r) => r.id === id); },

    create(entity, data, summary) {
      S.assertCan("create", entity, data);
      if (!data.id) data.id = S.uid(entity.slice(0, 2));
      data.createdAt = data.createdAt || Date.now();
      S.coll(entity).push(data);
      S.audit("create", entity, data.id, summary || ("Created " + entity + " — " + (data.name || data.title || data.id)), { next: data.name || data.title || null });
      S.save();
      return data;
    },
    update(entity, id, patch, summary, reason) {
      const rec = S.find(entity, id);
      if (!rec) throw new Error(U.cap(entity) + " not found.");
      S.assertCan("edit", entity, rec);
      const prevSnapshot = {};
      Object.keys(patch).forEach((k) => (prevSnapshot[k] = rec[k]));
      Object.assign(rec, patch);
      S.audit("edit", entity, id, summary || ("Updated " + entity + " — " + (rec.name || rec.title || id)), {
        prev: JSON.stringify(prevSnapshot).slice(0, 400), next: JSON.stringify(patch).slice(0, 400), reason,
      });
      S.save();
      return rec;
    },
    remove(entity, id, reason) {
      const rec = S.find(entity, id);
      if (!rec) return;
      S.assertCan("delete", entity, rec);
      if (!reason) { const err = new Error("A reason is required to delete records."); err.needsReason = true; throw err; }
      const arr = S.coll(entity);
      arr.splice(arr.indexOf(rec), 1);
      S.audit("delete", entity, id, "Deleted " + entity + " — " + (rec.name || rec.title || id), { prev: JSON.stringify(rec).slice(0, 500), reason });
      S.save();
    },

    /* ---------- DOMAIN ACTIONS ---------- */
    logCall(data) {
      S.assertCan("create", "comm", data);
      const rec = Object.assign({ id: "cm-" + (S.db.counters.cm++), kind: "call", direction: "outbound", userId: S.meId, ts: Date.now() }, data);
      S.db.comms.push(rec);
      const lead = rec.leadId && S.find("lead", rec.leadId);
      if (lead) {
        lead.lastActivity = Date.now();
        lead.touches = (lead.touches || 0) + 1;
        if (rec.outcome === "meeting_set" && ["new", "contacted", "interested"].includes(lead.stage)) lead.stage = "meeting";
        else if (["connected", "callback"].includes(rec.outcome) && lead.stage === "new") lead.stage = "contacted";
        else if (rec.outcome === "not_interested") lead.stage = lead.stage === "won" ? lead.stage : "lost";
      }
      S.audit("create", "comm", rec.id, "Logged " + rec.kind + (lead ? " — " + lead.company : "") + " (" + (rec.outcome || "note") + ")");
      if (rec.outcome === "meeting_set") S.notify([S.deptHeadId("Sales"), "u-cso"], "sales", "Meeting booked: " + (lead ? lead.company : ""), S.userName(S.meId) + " set a meeting.", "#/sales/pipeline");
      S.save();
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
      S.save();
    },

    decideApproval(apId, decision, note) {
      const ap = S.find("approval", apId);
      S.assertCan("approve", "approval", ap);
      ap.decisions = ap.decisions || [];
      ap.decisions.push({ userId: S.meId, decision, ts: Date.now(), note: note || null });
      const needsCeo = (ap.approverRoles || []).includes("ceo");
      const stillNeedsCeo = needsCeo && !ap.decisions.some((d) => { const u = S.user(d.userId); return u && (u.role === "ceo" || u.role === "owner"); });
      if (decision === "rejected") ap.status = "rejected";
      else if (!stillNeedsCeo) ap.status = "approved";
      S.audit("approve", "approval", apId, (decision === "approved" ? "Approved" : "Rejected") + " — " + ap.title, { next: decision, reason: note });
      S.notify(ap.requestedBy, "approval", "Approval " + (ap.status === "pending" ? "advanced" : ap.status) + ": " + ap.title, (note ? "Note: " + note : "Decision recorded by " + S.userName(S.meId)), "#/approvals");
      // Ripple effects
      if (ap.status === "approved") {
        if (ap.refType === "expense" && ap.refId) { const e = S.find("expense", ap.refId); if (e) e.status = "approved"; }
        if (ap.refType === "timeoff" && ap.refId) { const t = S.find("timeoff", ap.refId); if (t) t.status = "approved"; }
        if (ap.refType === "invoice" && ap.refId) { const i = S.find("invoice", ap.refId); if (i && i.status === "draft") i.status = "sent"; }
      }
      if (ap.status === "rejected" && ap.refType === "timeoff" && ap.refId) { const t = S.find("timeoff", ap.refId); if (t) t.status = "denied"; }
      S.save();
      return ap;
    },

    checkoutEquipment(eqId, projectId) {
      const eq = S.find("equipment", eqId);
      S.assertCan("checkout", "equipment", eq);
      if (eq.status !== "available") throw new Error("This item is not available.");
      Object.assign(eq, { status: "checked_out", assignedTo: S.meId, projectId: projectId || null, location: "Field — " + S.userName(S.meId) });
      S.audit("edit", "equipment", eqId, "Checked out " + eq.name + " (" + eq.assetTag + ")", { next: "checked_out" });
      S.save();
    },
    checkinEquipment(eqId, condition, note) {
      const eq = S.find("equipment", eqId);
      S.assertCan("checkin", "equipment", eq);
      const prevUser = eq.assignedTo;
      Object.assign(eq, { status: condition === "damaged" ? "damaged" : "available", assignedTo: null, projectId: null, condition: condition || eq.condition, location: "Studio A cage", note: note || eq.note });
      S.audit("edit", "equipment", eqId, "Checked in " + eq.name + (condition === "damaged" ? " — DAMAGED: " + (note || "") : ""), { prev: prevUser, next: eq.status });
      if (condition === "damaged") S.notify([S.deptHeadId("Technology"), "u-coo"], "equipment", "Damage reported: " + eq.name, note || "Inspect and file a damage report.", "#/equipment");
      S.save();
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
