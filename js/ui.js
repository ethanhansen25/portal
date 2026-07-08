/* Oakframe Media OS — shared UI kit */
(function () {
  const OM = (window.OM = window.OM || {});
  const U = OM.util, S = () => OM.store;
  const esc = U.esc;

  const STATUS_TONES = {
    active: "good", on_track: "good", paid: "good", approved: "good", done: "good", complete: "good", available: "good", won: "good", hired: "good", connected: "good", meeting_set: "good",
    at_risk: "warn", pending: "warn", sent: "warn", review: "warn", scheduled: "warn", maintenance: "warn", checked_out: "warn", in_progress: "warn", planning: "info", draft: "neutral", assigned: "info",
    behind: "bad", overdue: "bad", rejected: "bad", denied: "bad", damaged: "bad", lost: "bad", blocked: "bad", urgent: "bad", not_interested: "bad",
    completed: "info", paused: "neutral", archived: "neutral", todo: "neutral", new: "info", offboarded: "neutral", closed: "neutral",
    high: "warn", medium: "info", low: "neutral", contacted: "info", interested: "warn", meeting: "warn", proposal: "info", negotiating: "warn",
    applied: "neutral", screen: "info", interview: "warn", offer: "good", coaching: "warn", writeup: "bad", warning: "bad",
    voicemail: "neutral", no_answer: "neutral", gatekeeper: "neutral", callback: "info", partial: "warn", viewed: "info", mitigating: "warn", open: "bad",
  };
  function badge(status, label) {
    const tone = STATUS_TONES[status] || "neutral";
    return `<span class="badge tone-${tone}">${esc(label || U.cap(status))}</span>`;
  }

  function avatar(userId, size = "") {
    const u = typeof userId === "string" ? S().user(userId) : userId;
    if (!u) return `<span class="avatar ${size}" style="--av:#3a3a42">—</span>`;
    const hue = [...u.id].reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
    const inner = u.avatarUrl ? `<img src="${esc(u.avatarUrl)}" alt="" class="avatar-img">` : U.initials(u.name);
    return `<span class="avatar ${size}" title="${esc(u.name)}" style="--av:hsl(${hue},32%,30%)">${inner}${u.online ? '<i class="dot-online"></i>' : ""}</span>`;
  }
  function userCell(userId) {
    const u = S().user(userId);
    if (!u) return '<span class="muted">Unassigned</span>';
    return `<span class="user-cell">${avatar(u)}<span><span class="user-name">${esc(u.name)}</span><span class="user-sub">${esc(u.title)}</span></span></span>`;
  }

  function kpi(items) {
    return '<div class="kpi-grid">' + items.map((k) => `
      <div class="card kpi ${k.link ? "clickable" : ""}" ${k.link ? `onclick="location.hash='${k.link}'"` : ""}>
        <div class="kpi-top"><span class="kpi-label">${esc(k.label)}</span>${k.spark || ""}</div>
        <div class="kpi-value ${k.tone ? "tone-text-" + k.tone : ""}">${k.value}</div>
        ${k.sub ? `<div class="kpi-sub">${k.sub}</div>` : ""}
      </div>`).join("") + "</div>";
  }

  /* ---------- DATA TABLE with search / sort / export ---------- */
  let tableSeq = 0;
  function table(el, cfg) {
    // cfg: { columns:[{key,label,render?,sortVal?,width?}], rows, searchKeys, onRow?, exportName?, empty?, pageSize?, actions? (html right of search), defaultSort? }
    const id = "tbl" + tableSeq++;
    const state = { q: "", sortKey: cfg.defaultSort ? cfg.defaultSort.key : null, sortDir: cfg.defaultSort ? cfg.defaultSort.dir : 1, page: 0 };
    const pageSize = cfg.pageSize || 25;

    function filtered() {
      let rows = cfg.rows();
      if (state.q) {
        const q = state.q.toLowerCase();
        rows = rows.filter((r) => (cfg.searchKeys || []).some((k) => {
          const v = typeof k === "function" ? k(r) : r[k];
          return v != null && String(v).toLowerCase().includes(q);
        }));
      }
      if (state.sortKey) {
        const col = cfg.columns.find((c) => c.key === state.sortKey);
        rows = rows.slice().sort((a, b) => {
          const va = col.sortVal ? col.sortVal(a) : a[state.sortKey];
          const vb = col.sortVal ? col.sortVal(b) : b[state.sortKey];
          if (va == null) return 1; if (vb == null) return -1;
          return (typeof va === "number" ? va - vb : String(va).localeCompare(String(vb))) * state.sortDir;
        });
      }
      return rows;
    }

    function render() {
      const rows = filtered();
      const pages = Math.max(1, Math.ceil(rows.length / pageSize));
      state.page = Math.min(state.page, pages - 1);
      const pageRows = rows.slice(state.page * pageSize, (state.page + 1) * pageSize);
      el.innerHTML = `
        <div class="table-toolbar">
          <div class="search-box"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input type="text" placeholder="${esc(cfg.searchPlaceholder || "Search…")}" value="${esc(state.q)}" data-role="q"></div>
          <span class="table-count">${rows.length} record${rows.length === 1 ? "" : "s"}</span>
          <span class="flex-spacer"></span>
          ${cfg.actions || ""}
          ${cfg.exportName ? `<button class="btn btn-ghost btn-sm" data-role="export" title="Export CSV">⤓ Export</button>` : ""}
        </div>
        <div class="table-scroll"><table class="data-table"><thead><tr>
          ${cfg.columns.map((c) => `<th ${c.width ? `style="width:${c.width}"` : ""} data-key="${c.key}" class="${c.key === state.sortKey ? "sorted" : ""}">${esc(c.label)}${c.key === state.sortKey ? (state.sortDir > 0 ? " ↑" : " ↓") : ""}</th>`).join("")}
        </tr></thead><tbody>
          ${pageRows.length === 0 ? `<tr><td colspan="${cfg.columns.length}" class="table-empty">${esc(cfg.empty || "No records match.")}</td></tr>` :
          pageRows.map((r, i) => `<tr data-idx="${i}" class="${cfg.onRow ? "row-click" : ""}">${cfg.columns.map((c) => `<td>${c.render ? c.render(r) : esc(r[c.key] == null ? "—" : r[c.key])}</td>`).join("")}</tr>`).join("")}
        </tbody></table></div>
        ${pages > 1 ? `<div class="table-pager"><button class="btn btn-ghost btn-sm" data-role="prev" ${state.page === 0 ? "disabled" : ""}>‹ Prev</button><span>Page ${state.page + 1} of ${pages}</span><button class="btn btn-ghost btn-sm" data-role="next" ${state.page >= pages - 1 ? "disabled" : ""}>Next ›</button></div>` : ""}`;

      const qInput = el.querySelector('[data-role="q"]');
      qInput.addEventListener("input", () => { state.q = qInput.value; state.page = 0; const pos = qInput.selectionStart; render(); const nq = el.querySelector('[data-role="q"]'); nq.focus(); nq.setSelectionRange(pos, pos); });
      el.querySelectorAll("th").forEach((th) => th.addEventListener("click", () => {
        const k = th.dataset.key;
        if (state.sortKey === k) state.sortDir *= -1; else { state.sortKey = k; state.sortDir = 1; }
        render();
      }));
      if (cfg.onRow) el.querySelectorAll("tbody tr.row-click").forEach((tr) => tr.addEventListener("click", (ev) => {
        if (ev.target.closest("button, a, input, select")) return;
        cfg.onRow(pageRows[+tr.dataset.idx]);
      }));
      const ex = el.querySelector('[data-role="export"]');
      if (ex) ex.addEventListener("click", () => {
        try { if (cfg.exportEntity) OM.store.assertCan("export", cfg.exportEntity); } catch (e) { toast(e.message, "bad"); return; }
        const all = filtered();
        const csv = U.csv([cfg.columns.map((c) => c.label)].concat(all.map((r) => cfg.columns.map((c) => {
          const v = c.csv ? c.csv(r) : (c.sortVal ? c.sortVal(r) : r[c.key]);
          return v == null ? "" : v;
        }))));
        U.download(cfg.exportName + ".csv", csv);
        OM.store.audit("export", cfg.exportEntity || "data", "*", "Exported " + cfg.exportName + " (" + all.length + " rows, CSV)");
        toast("Exported " + all.length + " rows.", "good");
      });
      const prev = el.querySelector('[data-role="prev"]'), next = el.querySelector('[data-role="next"]');
      if (prev) prev.addEventListener("click", () => { state.page--; render(); });
      if (next) next.addEventListener("click", () => { state.page++; render(); });
      if (cfg.afterRender) cfg.afterRender(el);
    }
    render();
    return { refresh: render };
  }

  /* ---------- MODAL ---------- */
  function modal(title, bodyHtml, opts = {}) {
    close();
    const wrap = document.createElement("div");
    wrap.className = "modal-overlay";
    wrap.innerHTML = `<div class="modal ${opts.wide ? "modal-wide" : ""}">
      <div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" data-role="close">✕</button></div>
      <div class="modal-body">${bodyHtml}</div>
      ${opts.footer ? `<div class="modal-foot">${opts.footer}</div>` : ""}
    </div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add("open"));
    function close() {
      const ex = document.querySelector(".modal-overlay");
      if (ex) { ex.classList.remove("open"); setTimeout(() => ex.remove(), 160); }
    }
    wrap.addEventListener("mousedown", (e) => { if (e.target === wrap) close(); });
    wrap.querySelector('[data-role="close"]').addEventListener("click", close);
    const escH = (e) => { if (e.key === "Escape") { close(); document.removeEventListener("keydown", escH); } };
    document.addEventListener("keydown", escH);
    if (opts.onMount) opts.onMount(wrap, close);
    return { close, el: wrap };
  }

  /* ---------- CUSTOM DROPDOWN ----------
     Renders as a hidden <input type="hidden"> (so FormData/formValues keep
     working untouched) plus a styled trigger + menu. Call initDropdowns(root)
     once the markup is in the DOM to wire up interactivity. */
  let ddSeq = 0;
  function dropdownHtml(name, opts, value, opts2 = {}) {
    const id = "dd" + ddSeq++;
    const selected = opts.find((o) => String(o[0]) === String(value));
    const searchable = opts2.searchable !== false && opts.length > 7;
    return `<div class="dropdown" id="${id}" data-name="${name}" ${opts2.required ? 'data-required="1"' : ""}>
      <input type="hidden" name="${name}" value="${esc(value != null ? value : "")}">
      <button type="button" class="dropdown-trigger"><span class="dd-value ${selected ? "" : "placeholder"}">${esc(selected ? selected[1] : (opts2.placeholder || "Select…"))}</span><span class="dropdown-caret">▾</span></button>
      <div class="dropdown-menu">
        ${searchable ? `<div class="dropdown-search"><input type="text" placeholder="Search…"></div>` : ""}
        <div class="dropdown-options">${opts.map((o) => `<div class="dropdown-opt ${String(o[0]) === String(value) ? "selected" : ""}" data-value="${esc(o[0])}">${o[2] ? `<span class="list-icon">${o[2]}</span>` : ""}<span>${esc(o[1])}</span><span class="dd-check">✓</span></div>`).join("") || '<div class="dropdown-empty">No options</div>'}</div>
      </div>
    </div>`;
  }
  function initDropdowns(root) {
    root.querySelectorAll(".dropdown").forEach((dd) => {
      if (dd._ddInit) return; dd._ddInit = true;
      const trigger = dd.querySelector(".dropdown-trigger");
      const menu = dd.querySelector(".dropdown-menu");
      const hidden = dd.querySelector('input[type="hidden"]');
      const valueEl = dd.querySelector(".dd-value");
      const search = dd.querySelector(".dropdown-search input");
      const optsWrap = dd.querySelector(".dropdown-options");

      const closeAll = () => document.querySelectorAll(".dropdown.open").forEach((o) => { if (o !== dd) o.classList.remove("open"); });
      const open = () => {
        closeAll();
        dd.classList.add("open");
        const r = dd.getBoundingClientRect();
        dd.classList.toggle("up", r.bottom + 280 > window.innerHeight && r.top > 280);
        if (search) { search.value = ""; filterOpts(""); setTimeout(() => search.focus(), 10); }
      };
      const close = () => dd.classList.remove("open");
      trigger.addEventListener("click", (e) => { e.stopPropagation(); dd.classList.contains("open") ? close() : open(); });

      function selectOpt(optEl) {
        optsWrap.querySelectorAll(".dropdown-opt").forEach((o) => o.classList.remove("selected"));
        optEl.classList.add("selected");
        hidden.value = optEl.dataset.value;
        valueEl.textContent = optEl.querySelector("span:not(.list-icon):not(.dd-check)").textContent;
        valueEl.classList.remove("placeholder");
        hidden.dispatchEvent(new Event("change", { bubbles: true }));
        close();
      }
      optsWrap.addEventListener("click", (e) => { const o = e.target.closest(".dropdown-opt"); if (o) selectOpt(o); });

      function filterOpts(q) {
        q = q.toLowerCase();
        let anyVisible = false;
        optsWrap.querySelectorAll(".dropdown-opt").forEach((o) => {
          const match = !q || o.textContent.toLowerCase().includes(q);
          o.style.display = match ? "" : "none";
          if (match) anyVisible = true;
        });
        let empty = optsWrap.querySelector(".dropdown-empty");
        if (!anyVisible) { if (!empty) { empty = document.createElement("div"); empty.className = "dropdown-empty"; empty.textContent = "No matches."; optsWrap.appendChild(empty); } }
        else if (empty) empty.remove();
      }
      if (search) search.addEventListener("input", () => filterOpts(search.value));

      dd.addEventListener("keydown", (e) => {
        // Stop here so an Escape meant for the dropdown doesn't bubble up and
        // also trigger the modal's own Escape-to-close handler on document.
        if (e.key === "Escape" && dd.classList.contains("open")) { e.stopPropagation(); close(); trigger.focus(); }
        if (e.key === "Enter" && !dd.classList.contains("open")) { e.preventDefault(); open(); }
      });
    });
    // one shared document-level outside-click / escape handler
    if (!window._ddDocBound) {
      window._ddDocBound = true;
      document.addEventListener("click", (e) => { if (!e.target.closest(".dropdown")) document.querySelectorAll(".dropdown.open").forEach((d) => d.classList.remove("open")); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelectorAll(".dropdown.open").forEach((d) => d.classList.remove("open")); });
    }
  }

  /* ---------- FORM BUILDER ----------
     fields: [{name,label,type(text|number|textarea|select|date|user|readonly),options,value,required,placeholder,hint,span2}] */
  function form(fields, submitLabel = "Save") {
    return `<form class="om-form">
      <div class="form-grid">
      ${fields.map((f) => {
        const req = f.required ? "required" : "";
        let input = "";
        if (f.type === "textarea") input = `<textarea name="${f.name}" ${req} placeholder="${esc(f.placeholder || "")}" rows="${f.rows || 3}">${esc(f.value || "")}</textarea>`;
        else if (f.type === "select" || f.type === "user") {
          const opts = f.type === "user"
            ? [["", "— Unassigned —"]].concat(OM.store.db.users.filter((u) => u.status === "active" && (!f.filter || f.filter(u))).map((u) => [u.id, u.name + " · " + u.title]))
            : f.options.map((o) => Array.isArray(o) ? o : [o, U.cap(o)]);
          input = dropdownHtml(f.name, opts, f.value, { placeholder: f.placeholder, required: f.required });
        } else if (f.type === "userMulti") {
          const users = OM.store.db.users.filter((u) => u.status === "active" && (!f.filter || f.filter(u)));
          const checked = new Set(f.value || []);
          input = `<div class="checkbox-list">${users.map((u) => `<label class="checkbox-row"><input type="checkbox" name="${f.name}" value="${u.id}" ${checked.has(u.id) ? "checked" : ""}><span>${esc(u.name)} <span class="muted">${esc(u.title || u.dept || "")}</span></span></label>`).join("") || '<p class="muted">No one available.</p>'}</div>`;
        } else if (f.type === "readonly") input = `<div class="form-readonly">${esc(f.value || "—")}</div>`;
        else if (f.type === "file") input = `<input type="file" name="${f.name}" ${req} ${f.accept ? `accept="${esc(f.accept)}"` : ""} class="file-input">`;
        else input = `<input type="${f.type || "text"}" name="${f.name}" ${req} value="${esc(f.value != null ? f.value : "")}" placeholder="${esc(f.placeholder || "")}" ${f.step ? `step="${f.step}"` : ""}>`;
        // A <div>, not <label>: wrapping the custom dropdown in a <label> with
        // no `for` makes the browser forward stray clicks to the label's
        // implicit associated control (the trigger button, since the hidden
        // input is skipped for being type=hidden) — reopening it right after
        // an option click closes it.
        return `<div class="form-field ${f.span2 ? "span2" : ""}"><span class="form-label">${esc(f.label)}${f.required ? " *" : ""}</span>${input}${f.hint ? `<span class="form-hint">${esc(f.hint)}</span>` : ""}</div>`;
      }).join("")}
      </div>
      <div class="form-actions"><button type="submit" class="btn btn-gold">${esc(submitLabel)}</button></div>
    </form>`;
  }
  // A key seen more than once (e.g. a checkbox group sharing one `name`)
  // collects into an array; every other field stays a plain scalar.
  function formValues(formEl) {
    const out = {};
    new FormData(formEl).forEach((v, k) => {
      if (k in out) { if (Array.isArray(out[k])) out[k].push(v); else out[k] = [out[k], v]; }
      else out[k] = v;
    });
    return out;
  }
  // Convenience: modal + form + submit handler
  function formModal(title, fields, onSubmit, opts = {}) {
    return modal(title, form(fields, opts.submitLabel || "Save"), {
      wide: opts.wide,
      footer: opts.footer,
      onMount(wrap, close) {
        initDropdowns(wrap);
        const formEl = wrap.querySelector("form");
        const submitBtn = formEl.querySelector('button[type="submit"]');
        const submitLabelText = submitBtn.textContent;
        formEl.addEventListener("submit", (e) => {
          e.preventDefault();
          const missing = [...formEl.querySelectorAll('.dropdown[data-required="1"]')].find((d) => !d.querySelector('input[type="hidden"]').value);
          if (missing) {
            toast("Please choose a value for every required field.", "bad");
            missing.querySelector(".dropdown-trigger").focus();
            return;
          }
          // onSubmit may be sync or return a Promise (e.g. a file upload) —
          // handle both the same way, disabling the button so a slow upload
          // can't be double-submitted, and surfacing async rejections too
          // (a plain try/catch only catches what throws before the first await).
          let result;
          try {
            result = onSubmit(formValues(formEl), close);
          } catch (err) {
            toast(err.message, "bad");
            return;
          }
          if (result && typeof result.then === "function") {
            submitBtn.disabled = true;
            submitBtn.textContent = opts.pendingLabel || "Saving…";
            result.catch((err) => {
              toast(err.message, "bad");
              submitBtn.disabled = false;
              submitBtn.textContent = submitLabelText;
            });
          }
        });
        const first = wrap.querySelector("input:not([type=hidden]), textarea");
        if (first) first.focus();
      },
    });
  }

  function confirmModal(title, message, onConfirm, opts = {}) {
    modal(title, `<p class="confirm-text">${message}</p>${opts.reason ? `<label class="form-field"><span class="form-label">Reason (required — recorded in the audit log)</span><input type="text" data-role="reason" placeholder="Why?"></label>` : ""}`, {
      footer: `<button class="btn btn-ghost" data-role="cancel">Cancel</button><button class="btn ${opts.danger ? "btn-danger" : "btn-gold"}" data-role="ok">${esc(opts.okLabel || "Confirm")}</button>`,
      onMount(wrap, close) {
        wrap.querySelector('[data-role="cancel"]').addEventListener("click", close);
        wrap.querySelector('[data-role="ok"]').addEventListener("click", () => {
          const reasonEl = wrap.querySelector('[data-role="reason"]');
          if (opts.reason && (!reasonEl.value || !reasonEl.value.trim())) { toast("A reason is required.", "bad"); reasonEl.focus(); return; }
          try { onConfirm(reasonEl ? reasonEl.value.trim() : null); close(); } catch (e) { toast(e.message, "bad"); }
        });
      },
    });
  }

  /* ---------- TOASTS ---------- */
  function toast(msg, tone = "info", ms = 3400) {
    let host = document.querySelector(".toast-host");
    if (!host) { host = document.createElement("div"); host.className = "toast-host"; document.body.appendChild(host); }
    const t = document.createElement("div");
    t.className = "toast tone-" + tone;
    t.innerHTML = `<span>${msg}</span>`;
    host.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 250); }, ms);
  }

  /* ---------- TABS ---------- */
  function tabs(el, defs, activeId, onChange) {
    el.innerHTML = `<div class="tab-row">${defs.map((d) => `<button class="tab ${d.id === activeId ? "active" : ""}" data-id="${d.id}">${esc(d.label)}${d.count != null ? ` <span class="tab-count">${d.count}</span>` : ""}</button>`).join("")}</div>`;
    el.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => onChange(b.dataset.id)));
  }

  /* ---------- KANBAN ---------- */
  function kanban(el, cfg) {
    // cfg: {columns:[{id,label,tone?}], items, colOf(item), card(item), onMove(item,colId), canMove}
    el.innerHTML = `<div class="kanban">${cfg.columns.map((c) => {
      const items = cfg.items.filter((i) => cfg.colOf(i) === c.id);
      return `<div class="kanban-col" data-col="${c.id}">
        <div class="kanban-head"><span>${esc(c.label)}</span><span class="kanban-count">${items.length}</span>${c.sum ? `<span class="kanban-sum">${c.sum(items)}</span>` : ""}</div>
        <div class="kanban-body" data-col="${c.id}">
          ${items.map((i) => `<div class="kanban-card" draggable="${cfg.canMove ? cfg.canMove(i) : true}" data-id="${esc(i.id)}">${cfg.card(i)}</div>`).join("") || '<div class="kanban-empty">Empty</div>'}
        </div></div>`;
    }).join("")}</div>`;
    let dragId = null;
    el.querySelectorAll(".kanban-card").forEach((card) => {
      card.addEventListener("dragstart", (e) => { dragId = card.dataset.id; card.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; });
      card.addEventListener("dragend", () => card.classList.remove("dragging"));
      card.addEventListener("click", (ev) => { if (!ev.target.closest("button,a") && cfg.onCard) cfg.onCard(cfg.items.find((i) => i.id === card.dataset.id)); });
    });
    el.querySelectorAll(".kanban-body").forEach((body) => {
      body.addEventListener("dragover", (e) => { e.preventDefault(); body.classList.add("dragover"); });
      body.addEventListener("dragleave", () => body.classList.remove("dragover"));
      body.addEventListener("drop", (e) => {
        e.preventDefault(); body.classList.remove("dragover");
        const item = cfg.items.find((i) => i.id === dragId);
        if (item && cfg.colOf(item) !== body.dataset.col) {
          try { cfg.onMove(item, body.dataset.col); } catch (err) { toast(err.message, "bad"); }
        }
      });
    });
  }

  /* ---------- MISC ---------- */
  function sectionCard(title, bodyHtml, opts = {}) {
    return `<div class="card ${opts.cls || ""}"><div class="card-head"><h3>${esc(title)}</h3>${opts.action || ""}</div><div class="card-body">${bodyHtml}</div></div>`;
  }
  // empty(message, icon, actionsHtml?) — professional empty state with a
  // framed glyph, an explanation, and optional quick-action buttons.
  function empty(msg, icon = "◇", actions) {
    return `<div class="empty-block"><div class="empty-illus">${icon}</div><p>${esc(msg)}</p>${actions ? `<div class="empty-cta">${actions}</div>` : ""}</div>`;
  }
  // Skeleton placeholder rows/tiles for loading states.
  function skeleton(kind = "rows", n = 5) {
    if (kind === "kpi") return `<div class="kpi-grid">${Array.from({ length: n }, () => '<div class="card skeleton sk-kpi"></div>').join("")}</div>`;
    return `<div class="card">${Array.from({ length: n }, () => '<div class="skeleton sk-row"></div>').join("")}</div>`;
  }
  function pageHead(title, sub, actions) {
    return `<div class="page-head"><div><h1 class="page-title">${title}</h1>${sub ? `<p class="page-sub">${sub}</p>` : ""}</div><div class="page-actions">${actions || ""}</div></div>`;
  }
  function timeline(items) {
    // items: [{ts, icon?, title, body?, user?}] sorted desc
    if (!items.length) return empty("Nothing here yet.");
    return `<div class="timeline">${items.map((i) => `
      <div class="tl-item">
        <div class="tl-marker">${i.icon || "•"}</div>
        <div class="tl-content">
          <div class="tl-title">${i.title}</div>
          ${i.body ? `<div class="tl-body">${i.body}</div>` : ""}
          <div class="tl-meta">${i.user ? esc(S().userName(i.user)) + " · " : ""}${U.dateTime(i.ts)}</div>
        </div>
      </div>`).join("")}</div>`;
  }

  const KIND_ICONS = { call: "☎", email: "✉", meeting: "◫", sms: "▤", voice_note: "♪", note: "✎", task: "☑", approval: "✓", finance: "$", sales: "▲", project: "▣", hr: "☺", equipment: "⚙", mention: "@", deadline: "⏱" };

  OM.ui = { badge, avatar, userCell, kpi, table, modal, form, formValues, formModal, confirmModal, toast, tabs, kanban, sectionCard, empty, skeleton, pageHead, timeline, dropdownHtml, initDropdowns, KIND_ICONS, STATUS_TONES };
})();
