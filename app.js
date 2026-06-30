// CEO Hub — quick-action buttons + manageable to-do list, persisted in localStorage.

const STORAGE_KEY = "ceoHub.todos.v1";

const CATEGORIES = [
  "Strategy", "Finance", "People", "Sales & Customers",
  "Product & Ops", "Board & Investors", "Personal", "Other",
];

const QUICK_ACTIONS = [
  {
    group: "Strategy",
    items: [
      { icon: "🎯", text: "Review quarterly OKRs", priority: "high" },
      { icon: "🧭", text: "Plan next strategy offsite", priority: "medium" },
      { icon: "🔍", text: "Review competitor landscape", priority: "medium" },
      { icon: "📈", text: "Review company KPI dashboard", priority: "high" },
    ],
  },
  {
    group: "Finance",
    items: [
      { icon: "💰", text: "Review cash flow & runway", priority: "high" },
      { icon: "🧾", text: "Approve pending expenses", priority: "medium" },
      { icon: "📊", text: "Review monthly P&L", priority: "high" },
      { icon: "🏦", text: "Check in with finance/accounting", priority: "medium" },
    ],
  },
  {
    group: "People",
    items: [
      { icon: "🧑‍💼", text: "Schedule 1:1 with direct report", priority: "medium" },
      { icon: "🧩", text: "Review open hiring roles", priority: "medium" },
      { icon: "🏆", text: "Recognize a team win", priority: "low" },
      { icon: "📋", text: "Review performance feedback", priority: "medium" },
    ],
  },
  {
    group: "Sales & Customers",
    items: [
      { icon: "📞", text: "Call a key customer", priority: "high" },
      { icon: "🤝", text: "Review pipeline with sales lead", priority: "medium" },
      { icon: "💬", text: "Follow up on a customer escalation", priority: "high" },
    ],
  },
  {
    group: "Product & Ops",
    items: [
      { icon: "🛠️", text: "Review product roadmap", priority: "medium" },
      { icon: "🚦", text: "Check status of key launch", priority: "high" },
      { icon: "⚙️", text: "Review ops/process bottleneck", priority: "low" },
    ],
  },
  {
    group: "Board & Investors",
    items: [
      { icon: "📨", text: "Draft investor update", priority: "high" },
      { icon: "🗂️", text: "Prep board deck", priority: "high" },
      { icon: "☎️", text: "Schedule investor check-in", priority: "medium" },
    ],
  },
  {
    group: "Personal",
    items: [
      { icon: "🧘", text: "Block focus/deep work time", priority: "medium" },
      { icon: "📚", text: "Read industry news / research", priority: "low" },
      { icon: "🗓️", text: "Plan time off", priority: "low" },
    ],
  },
];

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

let todos = loadTodos();
let activeFilter = "all";

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function addTodo({ text, category, priority }) {
  const trimmed = text.trim();
  if (!trimmed) return;
  todos.unshift({
    id: uid(),
    text: trimmed,
    category,
    priority,
    done: false,
    createdAt: Date.now(),
  });
  saveTodos();
  render();
}

function toggleTodo(id) {
  const t = todos.find((t) => t.id === id);
  if (t) {
    t.done = !t.done;
    saveTodos();
    render();
  }
}

function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  saveTodos();
  render();
}

function clearCompleted() {
  todos = todos.filter((t) => !t.done);
  saveTodos();
  render();
}

function renderDateline() {
  const el = document.getElementById("dateline");
  const now = new Date();
  el.textContent = now.toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function renderActionGroups() {
  const container = document.getElementById("actionGroups");
  container.innerHTML = "";
  QUICK_ACTIONS.forEach((group) => {
    const groupEl = document.createElement("div");
    groupEl.className = "action-group";

    const heading = document.createElement("h4");
    heading.textContent = group.group;
    groupEl.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "action-grid";

    group.items.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "action-btn";
      btn.innerHTML = `<span class="icon">${item.icon}</span><span>${escapeHtml(item.text)}</span>`;
      btn.addEventListener("click", () => {
        addTodo({ text: item.text, category: group.group, priority: item.priority });
        btn.classList.add("added");
        setTimeout(() => btn.classList.remove("added"), 500);
      });
      grid.appendChild(btn);
    });

    groupEl.appendChild(grid);
    container.appendChild(groupEl);
  });
}

function populateCategorySelect() {
  const select = document.getElementById("customCategory");
  select.innerHTML = CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getVisibleTodos() {
  let list = todos.slice();
  if (activeFilter === "active") list = list.filter((t) => !t.done);
  if (activeFilter === "done") list = list.filter((t) => t.done);

  const sortBy = document.getElementById("sortBy").value;
  list.sort((a, b) => {
    if (sortBy === "priority") return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.createdAt - a.createdAt;
    if (sortBy === "newest") return b.createdAt - a.createdAt;
    if (sortBy === "oldest") return a.createdAt - b.createdAt;
    if (sortBy === "category") return a.category.localeCompare(b.category) || b.createdAt - a.createdAt;
    return 0;
  });
  return list;
}

function renderList() {
  const listEl = document.getElementById("todoList");
  const emptyEl = document.getElementById("emptyState");
  const visible = getVisibleTodos();

  listEl.innerHTML = "";
  if (visible.length === 0) {
    emptyEl.classList.add("visible");
  } else {
    emptyEl.classList.remove("visible");
  }

  visible.forEach((t) => {
    const li = document.createElement("li");
    li.className = `todo-item priority-${t.priority}${t.done ? " done" : ""}`;

    li.innerHTML = `
      <input type="checkbox" class="todo-check" ${t.done ? "checked" : ""} />
      <div class="todo-body">
        <div class="todo-text">${escapeHtml(t.text)}</div>
        <div class="todo-meta">
          <span class="badge badge-cat">${escapeHtml(t.category)}</span>
          <span class="badge badge-priority-${t.priority}">${t.priority}</span>
          <span class="todo-time">${timeAgo(t.createdAt)}</span>
        </div>
      </div>
      <button class="todo-delete" title="Delete">✕</button>
    `;

    li.querySelector(".todo-check").addEventListener("change", () => toggleTodo(t.id));
    li.querySelector(".todo-delete").addEventListener("click", () => deleteTodo(t.id));

    listEl.appendChild(li);
  });
}

function renderStats() {
  document.getElementById("statActive").textContent = todos.filter((t) => !t.done).length;
  document.getElementById("statDone").textContent = todos.filter((t) => t.done).length;
  document.getElementById("statUrgent").textContent = todos.filter((t) => !t.done && t.priority === "high").length;
}

function render() {
  renderList();
  renderStats();
}

function setupFilters() {
  const filterButtons = document.querySelectorAll(".filter-btn");
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      render();
    });
  });
}

function setupCustomForm() {
  const form = document.getElementById("customForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = document.getElementById("customText").value;
    const category = document.getElementById("customCategory").value;
    const priority = document.getElementById("customPriority").value;
    addTodo({ text, category, priority });
    form.reset();
    document.getElementById("customText").focus();
  });
}

function setupSortAndClear() {
  document.getElementById("sortBy").addEventListener("change", render);
  document.getElementById("clearDone").addEventListener("click", clearCompleted);
}

function init() {
  renderDateline();
  renderActionGroups();
  populateCategorySelect();
  setupFilters();
  setupCustomForm();
  setupSortAndClear();
  render();
}

document.addEventListener("DOMContentLoaded", init);
