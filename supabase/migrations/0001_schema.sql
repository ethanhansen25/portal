-- ==========================================================================
-- Oakframe Media OS — schema (1/3)
-- Core tables, no seed data. Every table has an owning "profile" model tied
-- to Supabase Auth via profiles.id = auth.users.id.
-- ==========================================================================
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  role text not null default 'intern'
    check (role in ('owner','ceo','coo','cco','cso','cfo','dept_head','project_lead','senior','junior','contractor','intern')),
  dept text not null default 'Unassigned'
    check (dept in ('Executive','Production','Creative','Sales','Finance','Human Resources','Technology','Administration','Contractors','Unassigned')),
  title text,
  hire_date date,
  status text not null default 'active' check (status in ('active','offboarded')),
  last_active_at timestamptz,
  created_at timestamptz not null default now()
);

-- Compensation lives in its own table (never in `profiles`) because RLS is
-- row-level, not column-level: if salary sat in `profiles`, any policy that
-- lets a user read a colleague's name/title for a directory or an @mention
-- would also expose that colleague's pay. Isolating it lets us grant broad
-- read access to `profiles` while keeping `compensation` locked to
-- Finance/exec/self via its own policy in 0002_rls.sql.
create table compensation (
  profile_id uuid primary key references profiles(id) on delete cascade,
  salary numeric,
  hourly_rate numeric
);

-- --------------------------------------------------------------- clients
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  city text,
  website text,
  tier text default 'C' check (tier in ('A','B','C')),
  status text not null default 'active' check (status in ('active','paused','archived')),
  since date default current_date,
  owner_id uuid references profiles(id) on delete set null,
  satisfaction numeric,
  notes text,
  created_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  title text,
  email text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------- sales
create table leads (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  industry text,
  contact_name text,
  contact_title text,
  email text,
  phone text,
  stage text not null default 'new'
    check (stage in ('new','contacted','interested','meeting','proposal','negotiating','won','lost','archived')),
  value numeric default 0,
  source text,
  assigned_to uuid references profiles(id) on delete set null,
  priority text default 'medium' check (priority in ('high','medium','low')),
  touches int not null default 0,
  notes text,
  last_activity timestamptz default now(),
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------- projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  client_id uuid references clients(id) on delete set null,
  lead_id uuid references profiles(id) on delete set null,
  service text,
  status text not null default 'planning' check (status in ('planning','active','completed','archived')),
  health text not null default 'on_track' check (health in ('on_track','at_risk','behind')),
  start_date date,
  due_date date,
  budget numeric default 0,
  spent numeric default 0,
  hours_budget numeric default 0,
  progress int not null default 0 check (progress between 0 and 100),
  client_access boolean not null default false,
  description text,
  created_at timestamptz not null default now()
);

create table project_team (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (project_id, user_id)
);

-- ------------------------------------------------------------------ tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo','in_progress','review','blocked','done')),
  priority text not null default 'medium' check (priority in ('urgent','high','medium','low')),
  assignee_id uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  due_date timestamptz,
  recurring text check (recurring in ('weekly','monthly') or recurring is null),
  created_at timestamptz not null default now()
);

create table task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  position int not null default 0
);

create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create table task_time_entries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  hours numeric not null,
  entry_date date not null default current_date
);

create table task_dependencies (
  task_id uuid not null references tasks(id) on delete cascade,
  depends_on_id uuid not null references tasks(id) on delete cascade,
  primary key (task_id, depends_on_id)
);

-- --------------------------------------------------------------- finance
create table invoices (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,
  client_id uuid references clients(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  amount numeric not null,
  tax numeric not null default 0,
  total numeric not null,
  status text not null default 'draft' check (status in ('draft','sent','viewed','partial','paid','overdue')),
  issued_at date,
  due_at date,
  paid_at date,
  memo text,
  created_at timestamptz not null default now()
);

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  qty numeric not null default 1,
  rate numeric not null
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  vendor text not null,
  amount numeric not null,
  category text,
  project_id uuid references projects(id) on delete set null,
  memo text,
  expense_date date not null default current_date,
  submitted_by uuid references profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','paid')),
  created_at timestamptz not null default now()
);

create table payroll_runs (
  id uuid primary key default gen_random_uuid(),
  period_label text not null,
  run_date date not null,
  status text not null default 'scheduled' check (status in ('scheduled','paid')),
  total numeric not null default 0,
  note text
);

create table commissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  period_label text not null,
  deals int default 0,
  revenue numeric,
  meetings_booked int,
  rate numeric,
  amount numeric not null,
  status text not null default 'pending' check (status in ('pending','approved')),
  note text
);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  dept text not null unique,
  annual numeric not null default 0,
  spent_ytd numeric not null default 0
);

-- -------------------------------------------------------------- equipment
create table equipment (
  id uuid primary key default gen_random_uuid(),
  asset_tag text unique not null,
  name text not null,
  category text,
  serial text,
  status text not null default 'available' check (status in ('available','checked_out','assigned','maintenance','damaged')),
  assigned_to uuid references profiles(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  condition text default 'good',
  value numeric,
  purchase_date date,
  location text,
  note text,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------- approvals
create table approvals (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  description text,
  ref_type text,
  ref_id uuid,
  requested_by uuid references profiles(id) on delete set null,
  requested_at timestamptz not null default now(),
  amount numeric,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  priority text default 'medium' check (priority in ('urgent','high','medium','low')),
  approver_roles text[] not null default '{}'
);

create table approval_decisions (
  id uuid primary key default gen_random_uuid(),
  approval_id uuid not null references approvals(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  decision text not null check (decision in ('approved','rejected')),
  note text,
  decided_at timestamptz not null default now()
);

-- ------------------------------------------------------------------- hr
create table candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role_applied text,
  dept text,
  stage text not null default 'applied' check (stage in ('applied','screen','interview','offer','hired','rejected')),
  applied_at date default current_date,
  rating int check (rating between 0 and 5),
  source text,
  email text,
  notes text
);

create table time_off (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text not null,
  start_date date not null,
  end_date date not null,
  days numeric not null,
  status text not null default 'pending' check (status in ('pending','approved','denied')),
  reason text,
  created_at timestamptz not null default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  period text not null,
  reviewer_id uuid references profiles(id) on delete set null,
  score numeric,
  status text not null default 'draft' check (status in ('draft','complete')),
  summary text
);

create table hr_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text not null check (type in ('coaching','writeup','warning')),
  action_date date not null default current_date,
  issued_by uuid references profiles(id) on delete set null,
  summary text,
  status text not null default 'active' check (status in ('active','closed'))
);

-- ------------------------------------------------------------ comms/calendar
create table comms (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('call','email','meeting','sms','voice_note','note')),
  direction text default 'outbound',
  lead_id uuid references leads(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  occurred_at timestamptz not null default now(),
  duration_sec int,
  outcome text,
  notes text,
  recording_url text,
  follow_up_at timestamptz,
  next_action text
);

create table meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  duration_min int default 30,
  owner_id uuid references profiles(id) on delete set null,
  location text,
  client_id uuid references clients(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  candidate_id uuid references candidates(id) on delete set null,
  recurring text,
  all_staff boolean not null default false,
  is_private boolean not null default false
);

create table meeting_attendees (
  meeting_id uuid not null references meetings(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (meeting_id, user_id)
);

-- ------------------------------------------------------------------ library
create table resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  file_type text,
  storage_path text,
  size_bytes bigint,
  uploaded_by uuid references profiles(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  tags text[] default '{}',
  allowed_depts text[],
  min_role text,
  version int not null default 1
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  file_type text,
  storage_path text,
  size_bytes bigint,
  client_id uuid references clients(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  uploaded_by uuid references profiles(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  tags text[] default '{}',
  confidential boolean not null default false,
  version int not null default 1
);

-- ------------------------------------------------------------- executive
create table initiatives (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  owner_id uuid references profiles(id) on delete set null,
  quarter text,
  progress int default 0,
  status text default 'planning'
);

create table key_results (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references initiatives(id) on delete cascade,
  text text not null,
  done int not null default 0,
  target int not null default 1
);

create table risks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  severity text check (severity in ('high','medium','low')),
  likelihood text check (likelihood in ('high','medium','low')),
  owner_id uuid references profiles(id) on delete set null,
  area text,
  mitigation text,
  status text default 'open' check (status in ('open','mitigating','closed'))
);

create table board_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  author_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  tags text[] default '{}'
);

-- ------------------------------------------------------------- system
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text,
  title text not null,
  body text,
  link text,
  created_at timestamptz not null default now(),
  read boolean not null default false
);

-- Append-only audit ledger. No update/delete grants are given on this table
-- (see 0002_rls.sql) — it is insert+select only, even for owners.
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  user_id uuid references profiles(id) on delete set null,
  role text,
  dept text,
  action text not null,
  entity text not null,
  entity_id text,
  summary text not null,
  prev_value text,
  next_value text,
  ip_address text,
  user_agent text,
  reason text,
  denied boolean not null default false
);

-- ------------------------------------------------------------------ indexes
create index on projects (client_id);
create index on tasks (project_id);
create index on tasks (assignee_id);
create index on leads (assigned_to);
create index on invoices (client_id);
create index on expenses (submitted_by);
create index on comms (client_id);
create index on comms (lead_id);
create index on documents (client_id);
create index on documents (project_id);
create index on notifications (user_id, read);
create index on audit_log (occurred_at desc);
create index on audit_log (user_id);
