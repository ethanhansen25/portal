/* Oakframe Media OS — Supabase data-access layer.

   The pages were written against an in-memory model with camelCase fields and
   nested arrays (a task carries its own `checklist`/`comments`/`timeEntries`,
   a project carries `team`, an approval carries `decisions`). The database is
   normalised snake_case with those nested pieces in their own tables. This
   module is the seam: it hydrates each collection (with embedded child rows)
   into exactly the legacy shape the pages read, and translates writes back
   the other way. Timestamps are stored as ISO in Postgres but the UI does
   arithmetic on epoch-millis, so every time value is parsed to a number on
   read and formatted back on write. */
(function () {
  const OM = (window.OM = window.OM || {});

  const toCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  const parseTs = (v) => (v == null ? null : (typeof v === "number" ? v : Date.parse(v)));

  // readKeys whose value is a moment in time (converted to millis on read)
  const TIME_KEYS = new Set(["createdAt", "ts", "dueDate", "startDate", "hireDate", "issuedAt", "dueAt", "paidAt", "followUpAt", "lastActivity", "uploadedAt", "requestedAt", "appliedAt", "runDate", "since", "start", "end", "date", "decidedAt", "lastActiveAt",
    "sentAt", "viewedAt", "signedAt", "countersignedAt", "respondedAt", "approvedAt", "assignedAt", "doneAt", "readAt", "expiresAt"]);

  /* Entity definitions. `cols` maps db_column -> readKey (camelCase shape the
     pages use). `dates` lists readKeys backed by a DATE column (formatted
     YYYY-MM-DD on write); other TIME_KEYS are written as full ISO. `embeds`
     describes child tables and how to fold them into arrays. */
  const E = {
    user: {
      table: "profiles", coll: "users",
      cols: { id: "id", name: "name", email: "email", phone: "phone", role: "role", dept: "dept", title: "title", hire_date: "hireDate", status: "status", last_active_at: "lastActiveAt", avatar_url: "avatarUrl", portal_type: "portalType", client_id: "clientId", manager_id: "managerId", employment_type: "employmentType", pay_type: "payType", permission_group: "permissionGroup", company: "company", approved_by: "approvedBy", approved_at: "approvedAt", created_at: "createdAt" },
      dates: ["hireDate"], readonlyCreate: true,
    },
    hrNote: {
      table: "hr_notes", coll: "hrNotes",
      cols: { id: "id", profile_id: "profileId", category: "category", author_id: "authorId", body: "body", created_at: "createdAt" },
    },
    onboardingTemplate: {
      table: "onboarding_templates", coll: "onboardingTemplates",
      cols: { id: "id", dept: "dept", name: "name", created_by: "createdBy", created_at: "createdAt" },
      embeds: { onboarding_template_tasks: { as: "tasks", select: "*", map: (r) => ({ id: r.id, text: r.text, category: r.category, position: r.position }) } },
    },
    onboardingTemplateTask: {
      table: "onboarding_template_tasks", coll: "onboardingTemplateTasks",
      cols: { id: "id", template_id: "templateId", text: "text", category: "category", position: "position" },
    },
    onboardingAssignment: {
      table: "onboarding_assignments", coll: "onboardingAssignments",
      cols: { id: "id", profile_id: "profileId", template_id: "templateId", assigned_by: "assignedBy", assigned_at: "assignedAt", approved_by: "approvedBy", approved_at: "approvedAt" },
      embeds: { onboarding_task_progress: { as: "tasks", select: "*", map: (r) => ({ id: r.id, templateTaskId: r.template_task_id, text: r.text, category: r.category, position: r.position, done: r.done, doneAt: parseTs(r.done_at), doneBy: r.done_by }) } },
    },
    deliverable: {
      table: "deliverables", coll: "deliverables",
      cols: { id: "id", project_id: "projectId", client_id: "clientId", name: "name", kind: "kind", status: "status", version: "version", storage_path: "storagePath", thumbnail_path: "thumbnailPath", notes: "notes", client_notes: "clientNotes", download_permission: "downloadPermission", uploaded_by: "uploadedBy", uploaded_at: "uploadedAt", due_date: "dueDate" },
      dates: ["dueDate"],
    },
    deliverableInternalNote: {
      table: "deliverable_internal_notes", coll: "deliverableInternalNotes",
      cols: { id: "id", deliverable_id: "deliverableId", author_id: "authorId", body: "body", created_at: "createdAt" },
    },
    deliverableEvent: {
      table: "deliverable_events", coll: "deliverableEvents",
      cols: { id: "id", deliverable_id: "deliverableId", user_id: "userId", action: "action", note: "note", version: "version", ts: "ts" },
    },
    contract: {
      table: "contracts", coll: "contracts",
      cols: { id: "id", client_id: "clientId", project_id: "projectId", title: "title", status: "status", body: "body", storage_path: "storagePath", created_by: "createdBy", created_at: "createdAt", sent_at: "sentAt", viewed_at: "viewedAt", signed_at: "signedAt", signature_name: "signatureName", countersigned_at: "countersignedAt", countersigned_by: "countersignedBy", expires_at: "expiresAt" },
      dates: ["expiresAt"],
    },
    proposal: {
      table: "proposals", coll: "proposals",
      cols: { id: "id", client_id: "clientId", title: "title", status: "status", scope: "scope", timeline: "timeline", deliverables_summary: "deliverablesSummary", price: "price", payment_terms: "paymentTerms", addons: "addons", created_by: "createdBy", created_at: "createdAt", sent_at: "sentAt", viewed_at: "viewedAt", responded_at: "respondedAt", expires_at: "expiresAt", generated_contract_id: "generatedContractId", generated_project_id: "generatedProjectId", generated_invoice_id: "generatedInvoiceId" },
      dates: ["expiresAt"],
    },
    clientMessage: {
      table: "client_messages", coll: "clientMessages",
      cols: { id: "id", client_id: "clientId", project_id: "projectId", contract_id: "contractId", proposal_id: "proposalId", invoice_id: "invoiceId", sender_id: "senderId", recipient_id: "recipientId", body: "body", created_at: "createdAt", read_at: "readAt" },
    },
    client: {
      table: "clients", coll: "clients",
      cols: { id: "id", name: "name", industry: "industry", city: "city", website: "website", tier: "tier", status: "status", since: "since", owner_id: "ownerId", satisfaction: "satisfaction", notes: "notes", created_at: "createdAt" },
      dates: ["since"],
    },
    contact: {
      table: "contacts", coll: "contacts",
      cols: { id: "id", client_id: "clientId", name: "name", title: "title", email: "email", phone: "phone", is_primary: "primary", created_at: "createdAt" },
    },
    lead: {
      table: "leads", coll: "leads",
      cols: { id: "id", company: "company", industry: "industry", contact_name: "contactName", contact_title: "contactTitle", email: "email", phone: "phone", stage: "stage", value: "value", source: "source", assigned_to: "assignedTo", priority: "priority", touches: "touches", notes: "notes", last_activity: "lastActivity", created_at: "createdAt" },
    },
    project: {
      table: "projects", coll: "projects",
      cols: { id: "id", code: "code", name: "name", client_id: "clientId", lead_id: "leadId", service: "service", status: "status", health: "health", start_date: "startDate", due_date: "dueDate", budget: "budget", spent: "spent", hours_budget: "hoursBudget", progress: "progress", client_access: "clientAccess", description: "description", created_at: "createdAt" },
      dates: ["startDate", "dueDate"],
      embeds: { project_team: { as: "team", select: "user_id", map: (r) => r.user_id, scalarList: true } },
    },
    task: {
      table: "tasks", coll: "tasks",
      cols: { id: "id", project_id: "projectId", title: "title", description: "desc", status: "status", priority: "priority", assignee_id: "assigneeId", created_by: "createdBy", due_date: "dueDate", recurring: "recurring", created_at: "createdAt" },
      embeds: {
        task_checklist_items: { as: "checklist", select: "*", map: (r) => ({ id: r.id, text: r.text, done: r.done, position: r.position }) },
        task_comments: { as: "comments", select: "*", map: (r) => ({ id: r.id, userId: r.user_id, text: r.body, ts: parseTs(r.created_at) }) },
        task_time_entries: { as: "timeEntries", select: "*", map: (r) => ({ id: r.id, userId: r.user_id, hours: Number(r.hours), date: parseTs(r.entry_date) }) },
        task_dependencies: { as: "dependsOn", select: "depends_on_id", map: (r) => r.depends_on_id, scalarList: true },
      },
    },
    invoice: {
      table: "invoices", coll: "invoices",
      cols: { id: "id", number: "number", client_id: "clientId", project_id: "projectId", amount: "amount", tax: "tax", total: "total", status: "status", issued_at: "issuedAt", due_at: "dueAt", paid_at: "paidAt", memo: "memo", created_at: "createdAt" },
      dates: ["issuedAt", "dueAt", "paidAt"],
      embeds: { invoice_items: { as: "items", select: "*", map: (r) => ({ desc: r.description, qty: Number(r.qty), rate: Number(r.rate) }) } },
    },
    expense: {
      table: "expenses", coll: "expenses",
      cols: { id: "id", vendor: "vendor", amount: "amount", category: "category", project_id: "projectId", memo: "memo", expense_date: "date", submitted_by: "submittedBy", status: "status", created_at: "createdAt" },
      dates: ["date"],
    },
    payroll: {
      table: "payroll_runs", coll: "payroll",
      cols: { id: "id", period_label: "period", run_date: "runDate", status: "status", total: "total", note: "note" },
      dates: ["runDate"],
    },
    commission: {
      table: "commissions", coll: "commissions",
      cols: { id: "id", user_id: "userId", period_label: "month", deals: "deals", revenue: "revenue", meetings_booked: "meetingsBooked", rate: "rate", amount: "amount", status: "status", note: "note" },
    },
    budget: {
      table: "budgets", coll: "budgets",
      cols: { id: "id", dept: "dept", annual: "annual", spent_ytd: "spentYTD" },
    },
    equipment: {
      table: "equipment", coll: "equipment",
      cols: { id: "id", asset_tag: "assetTag", name: "name", category: "category", serial: "serial", status: "status", assigned_to: "assignedTo", project_id: "projectId", condition: "condition", value: "value", purchase_date: "purchaseDate", location: "location", note: "note", created_at: "createdAt" },
      dates: ["purchaseDate"],
    },
    approval: {
      table: "approvals", coll: "approvals",
      cols: { id: "id", type: "type", title: "title", description: "description", ref_type: "refType", ref_id: "refId", requested_by: "requestedBy", requested_at: "requestedAt", amount: "amount", status: "status", priority: "priority", approver_roles: "approverRoles" },
      embeds: { approval_decisions: { as: "decisions", select: "*", map: (r) => ({ userId: r.user_id, decision: r.decision, note: r.note, ts: parseTs(r.decided_at) }) } },
    },
    candidate: {
      table: "candidates", coll: "candidates",
      cols: { id: "id", name: "name", role_applied: "roleApplied", dept: "dept", stage: "stage", applied_at: "appliedAt", rating: "rating", source: "source", email: "email", notes: "notes" },
      dates: ["appliedAt"],
    },
    timeoff: {
      table: "time_off", coll: "timeOff",
      cols: { id: "id", user_id: "userId", type: "type", start_date: "start", end_date: "end", days: "days", status: "status", reason: "reason", created_at: "createdAt" },
      dates: ["start", "end"],
    },
    review: {
      table: "reviews", coll: "reviews",
      cols: { id: "id", user_id: "userId", period: "period", reviewer_id: "reviewerId", score: "score", status: "status", summary: "summary", review_type: "reviewType", communication_score: "communicationScore", reliability_score: "reliabilityScore", quality_score: "qualityScore", leadership_score: "leadershipScore", strengths: "strengths", weaknesses: "weaknesses", goals: "goals", promotion_recommendation: "promotionRecommendation", pay_recommendation: "payRecommendation", final_rating: "finalRating", acknowledged_at: "acknowledgedAt" },
    },
    hrAction: {
      table: "hr_actions", coll: "hrActions",
      cols: { id: "id", user_id: "userId", type: "type", action_date: "date", issued_by: "issuedBy", summary: "summary", status: "status" },
      dates: ["date"],
    },
    comm: {
      table: "comms", coll: "comms",
      cols: { id: "id", kind: "kind", direction: "direction", lead_id: "leadId", client_id: "clientId", user_id: "userId", occurred_at: "ts", duration_sec: "durationSec", outcome: "outcome", notes: "notes", recording_url: "recording", follow_up_at: "followUpAt", next_action: "nextAction" },
    },
    meeting: {
      table: "meetings", coll: "meetings",
      cols: { id: "id", title: "title", starts_at: "ts", duration_min: "durationMin", owner_id: "ownerId", location: "location", client_id: "clientId", project_id: "projectId", lead_id: "leadId", candidate_id: "candidateId", recurring: "recurring", all_staff: "allStaff", is_private: "private" },
      embeds: { meeting_attendees: { as: "attendees", select: "user_id", map: (r) => r.user_id, scalarList: true } },
      after: (o) => { if (o.allStaff) o.attendees = "all"; },
    },
    resource: {
      table: "resources", coll: "resources",
      cols: { id: "id", name: "name", category: "category", file_type: "type", storage_path: "storagePath", size_bytes: "size", uploaded_by: "uploadedBy", uploaded_at: "uploadedAt", tags: "tags", allowed_depts: "depts", min_role: "minRole", version: "version" },
    },
    document: {
      table: "documents", coll: "documents",
      cols: { id: "id", name: "name", category: "category", file_type: "type", storage_path: "storagePath", size_bytes: "size", client_id: "clientId", project_id: "projectId", uploaded_by: "uploadedBy", uploaded_at: "uploadedAt", tags: "tags", confidential: "confidential", visibility: "visibility", version: "version" },
    },
    initiative: {
      table: "initiatives", coll: "initiatives",
      cols: { id: "id", title: "title", owner_id: "ownerId", quarter: "quarter", progress: "progress", status: "status" },
      embeds: { key_results: { as: "keyResults", select: "*", map: (r) => ({ id: r.id, text: r.text, done: r.done, target: r.target }) } },
    },
    risk: {
      table: "risks", coll: "risks",
      cols: { id: "id", title: "title", severity: "severity", likelihood: "likelihood", owner_id: "ownerId", area: "area", mitigation: "mitigation", status: "status" },
    },
    boardNote: {
      table: "board_notes", coll: "boardNotes",
      cols: { id: "id", title: "title", body: "body", author_id: "authorId", created_at: "ts", tags: "tags" },
    },
    notification: {
      table: "notifications", coll: "notifications",
      cols: { id: "id", user_id: "userId", kind: "kind", title: "title", body: "body", link: "link", created_at: "ts", read: "read" },
    },
    audit: {
      table: "audit_log", coll: "audit",
      cols: { id: "id", occurred_at: "ts", user_id: "userId", role: "role", dept: "dept", action: "action", entity: "entity", entity_id: "entityId", summary: "summary", prev_value: "prev", next_value: "next", ip_address: "ip", user_agent: "ua", reason: "reason", denied: "denied" },
    },
  };
  OM.ENTITIES = E;

  const invert = (cols) => { const m = {}; for (const k in cols) m[cols[k]] = k; return m; };

  function rowToObj(def, row) {
    const o = {};
    for (const dbCol in def.cols) {
      const key = def.cols[dbCol];
      let v = row[dbCol];
      if (TIME_KEYS.has(key)) v = parseTs(v);
      o[key] = v;
    }
    if (def.embeds) {
      for (const child in def.embeds) {
        const em = def.embeds[child];
        const arr = (row[child] || []).map(em.map);
        if (em.scalarList) o[em.as] = arr;
        else { if (em.as === "checklist") arr.sort((a, b) => (a.position || 0) - (b.position || 0)); o[em.as] = arr; }
      }
    }
    if (def.after) def.after(o);
    return o;
  }

  function objToRow(def, obj) {
    const inv = invert(def.cols);
    const dates = new Set(def.dates || []);
    const row = {};
    for (const key in obj) {
      const dbCol = inv[key];
      if (!dbCol) continue;               // skip nested arrays / unknown keys
      let v = obj[key];
      if (v != null && TIME_KEYS.has(key)) {
        const iso = new Date(v).toISOString();
        v = dates.has(key) ? iso.slice(0, 10) : iso;
      }
      row[dbCol] = v;
    }
    return row;
  }
  OM.objToRow = objToRow;

  const DB = (OM.db = {
    client: null,
    ready: false,

    init() {
      if (DB.client) return DB.client;
      const cfg = window.OM_CONFIG || {};
      if (!window.supabase || !cfg.supabaseUrl) return null;
      DB.client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      });
      return DB.client;
    },

    /* Pull every collection the signed-in user is allowed to see (RLS does the
       filtering server-side) into the legacy in-memory shape. */
    async hydrate() {
      const out = {};
      const jobs = Object.keys(E).map(async (name) => {
        const def = E[name];
        let select = "*";
        if (def.embeds) {
          select += "," + Object.keys(def.embeds).map((c) => `${c}(${def.embeds[c].select})`).join(",");
        }
        const { data, error } = await DB.client.from(def.table).select(select);
        if (error) { console.warn("hydrate", def.table, error.message); out[def.coll] = []; return; }
        out[def.coll] = (data || []).map((r) => rowToObj(def, r));
      });
      await Promise.all(jobs);

      // Merge compensation onto the employee records. It's a separate table
      // (RLS returns only the rows the viewer may see: Finance/exec/self), so
      // salaries a user isn't cleared for simply stay undefined and render as
      // "—" rather than leaking through the company-wide directory read.
      try {
        const { data: comp } = await DB.client.from("compensation").select("*");
        const byId = {};
        (comp || []).forEach((c) => (byId[c.profile_id] = c));
        (out.users || []).forEach((u) => { const c = byId[u.id]; if (c) { u.salary = c.salary; u.rate = c.hourly_rate; } });
      } catch (e) { /* compensation not visible to this role — expected */ }

      // derive presence: active in the last 4 minutes
      const cutoff = Date.now() - 4 * 60000;
      (out.users || []).forEach((u) => { u.online = !!(u.lastActiveAt && u.lastActiveAt > cutoff); });
      return out;
    },

    /* Reload just one collection (used after a mutation whose server-side
       effects the client can't fully predict, e.g. an approval decision). */
    async refreshColl(name) {
      const def = E[name];
      let select = "*";
      if (def.embeds) select += "," + Object.keys(def.embeds).map((c) => `${c}(${def.embeds[c].select})`).join(",");
      const { data, error } = await DB.client.from(def.table).select(select);
      if (error) throw error;
      const rows = (data || []).map((r) => rowToObj(def, r));
      if (name === "users") { const cutoff = Date.now() - 4 * 60000; rows.forEach((u) => (u.online = !!(u.lastActiveAt && u.lastActiveAt > cutoff))); }
      return rows;
    },

    // low-level writers used by the store ------------------------------------
    async insert(entity, obj) {
      const def = E[entity];
      const { data, error } = await DB.client.from(def.table).insert(objToRow(def, obj)).select(def.embeds ? "*," + Object.keys(def.embeds).map((c) => `${c}(${def.embeds[c].select})`).join(",") : "*").single();
      if (error) throw error;
      return rowToObj(def, data);
    },
    async patch(entity, id, patch) {
      const def = E[entity];
      const { error } = await DB.client.from(def.table).update(objToRow(def, patch)).eq("id", id);
      if (error) throw error;
    },
    async del(entity, id) {
      const def = E[entity];
      const { error } = await DB.client.from(def.table).delete().eq("id", id);
      if (error) throw error;
    },
    async rpc(fn, args) {
      const { data, error } = await DB.client.rpc(fn, args);
      if (error) throw error;
      return data;
    },
    // raw table helpers for join/child tables
    from(table) { return DB.client.from(table); },

    /* ---------- STORAGE ----------
       avatars: public bucket, path {userId}/{filename} — RLS restricts write
       to the user's own folder (supabase/migrations/0004_storage.sql).
       attachments: private bucket, path {resources|documents|deliverables|
       onboarding}/{recordId}/{filename} — RLS re-checks the same visibility
       as the owning table row. If either bucket is missing (a fresh project
       that skipped 0004, or a partial migration run), Supabase returns a
       bare "Bucket not found" — surfaced here with a pointer to the fix
       instead of leaving that cryptic on its own. */
    friendlyStorageError(error) {
      if (error && /bucket not found/i.test(error.message || "")) {
        return new Error("Storage bucket not found — run supabase/migrations/0011_ensure_storage_buckets.sql in the Supabase SQL editor, then try again.");
      }
      return error;
    },
    async uploadAvatar(userId, file) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error } = await DB.client.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw DB.friendlyStorageError(error);
      const { data } = DB.client.storage.from("avatars").getPublicUrl(path);
      return data.publicUrl;
    },
    async uploadAttachment(kind, recordId, file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${kind}/${recordId}/${Date.now()}-${safeName}`;
      const { error } = await DB.client.storage.from("attachments").upload(path, file, { contentType: file.type });
      if (error) throw DB.friendlyStorageError(error);
      return { path, size: file.size, type: file.type, name: file.name };
    },
    async attachmentSignedUrl(path, seconds = 300) {
      const { data, error } = await DB.client.storage.from("attachments").createSignedUrl(path, seconds);
      if (error) throw DB.friendlyStorageError(error);
      return data.signedUrl;
    },
    async deleteAttachment(path) {
      const { error } = await DB.client.storage.from("attachments").remove([path]);
      if (error) throw DB.friendlyStorageError(error);
    },
  });
})();
