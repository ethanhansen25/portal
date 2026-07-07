-- ==========================================================================
-- Oakframe Media OS — HR / onboarding / reviews / client portal (5/5)
--
-- This migration draws the hard line the spec calls the CORE RULE: clients
-- must never see staff-side data, and that separation lives in the
-- database, not the UI. Concretely:
--   * New sign-ups land with status='pending', portal_type='unassigned' —
--     zero table grants match that combination anywhere, so "Access: None"
--     is a real property of the row, not a client-side redirect.
--   * is_exec()/my_role()/my_dept() (defined in 0002_rls.sql) are redefined
--     here to return false/NULL for anything but an active account, so a
--     pending row can't accidentally satisfy an existing staff policy.
--   * Compensation-style isolation is reused for hr_notes (HR/exec only,
--     never in the broadly-readable `profiles` row) — the same pattern
--     0002_rls.sql already used to keep salaries out of the directory.
--   * Every new client-facing table (deliverables, contracts, proposals,
--     client_messages) carries client_id, and its SELECT policy for a
--     client account is always `is_client() and client_id = my_client_id()`
--     — never a bare "authenticated" allowance.
-- ==========================================================================

-- ------------------------------------------------------------- profiles
alter table profiles drop constraint if exists profiles_status_check;
alter table profiles add constraint profiles_status_check
  check (status in ('pending', 'active', 'offboarded'));

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('owner','ceo','coo','cco','cso','cfo','dept_head','project_lead','senior','junior','contractor','intern','client'));

alter table profiles drop constraint if exists profiles_dept_check;
alter table profiles add constraint profiles_dept_check
  check (dept in ('Executive','Production','Creative','Sales','Finance','Human Resources','Technology','Administration','Contractors','Client','Unassigned'));

alter table profiles alter column status set default 'pending';

alter table profiles add column if not exists portal_type text not null default 'unassigned'
  check (portal_type in ('staff','contractor','client','unassigned'));
alter table profiles add column if not exists client_id uuid references clients(id) on delete set null;
alter table profiles add column if not exists manager_id uuid references profiles(id) on delete set null;
alter table profiles add column if not exists employment_type text
  check (employment_type in ('full_time','part_time','contract','intern') or employment_type is null);
alter table profiles add column if not exists pay_type text
  check (pay_type in ('salary','hourly','contract') or pay_type is null);
alter table profiles add column if not exists permission_group text;
alter table profiles add column if not exists company text; -- contractor's own business name, if any
alter table profiles add column if not exists approved_by uuid references profiles(id) on delete set null;
alter table profiles add column if not exists approved_at timestamptz;

-- --------------------------------------------------------- HR-only notes
-- Isolated the same way `compensation` is: broad profile reads (needed for
-- the directory, @mentions, assignee pickers) must never carry HR notes.
create table if not exists hr_notes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  category text not null default 'general' check (category in ('general','onboarding','payroll','review','offboarding')),
  author_id uuid references profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);
alter table hr_notes enable row level security;

-- ------------------------------------------------------------ onboarding
create table if not exists onboarding_templates (
  id uuid primary key default gen_random_uuid(),
  dept text not null,
  name text not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists onboarding_template_tasks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references onboarding_templates(id) on delete cascade,
  text text not null,
  category text, -- e.g. 'Account Setup','Handbook','Training','Equipment'
  position int not null default 0
);
create table if not exists onboarding_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  template_id uuid references onboarding_templates(id) on delete set null,
  assigned_by uuid references profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  approved_by uuid references profiles(id) on delete set null,
  approved_at timestamptz
);
create table if not exists onboarding_task_progress (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references onboarding_assignments(id) on delete cascade,
  template_task_id uuid references onboarding_template_tasks(id) on delete set null,
  text text not null, -- copied at assignment time so edits to the template don't rewrite history
  category text,
  position int not null default 0,
  done boolean not null default false,
  done_at timestamptz,
  done_by uuid references profiles(id) on delete set null
);
alter table onboarding_templates enable row level security;
alter table onboarding_template_tasks enable row level security;
alter table onboarding_assignments enable row level security;
alter table onboarding_task_progress enable row level security;

-- --------------------------------------------------------- reviews (extend)
alter table reviews add column if not exists review_type text
  check (review_type in ('30_day','60_day','90_day','quarterly','annual','project','contractor') or review_type is null);
alter table reviews add column if not exists communication_score numeric;
alter table reviews add column if not exists reliability_score numeric;
alter table reviews add column if not exists quality_score numeric;
alter table reviews add column if not exists leadership_score numeric;
alter table reviews add column if not exists strengths text;
alter table reviews add column if not exists weaknesses text;
alter table reviews add column if not exists goals text;
alter table reviews add column if not exists promotion_recommendation boolean not null default false;
alter table reviews add column if not exists pay_recommendation text;
alter table reviews add column if not exists final_rating numeric;
alter table reviews add column if not exists acknowledged_at timestamptz;
-- status already had draft/complete; add 'approved' as the "employee can now view it" gate
alter table reviews drop constraint if exists reviews_status_check;
alter table reviews add constraint reviews_status_check check (status in ('draft','complete','approved'));

-- ------------------------------------------------------- documents (extend)
alter table documents add column if not exists visibility text not null default 'internal'
  check (visibility in ('internal','client_visible','executive_only','department_only','final_delivery'));

-- ------------------------------------------------------------ deliverables
create table if not exists deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  name text not null,
  kind text not null default 'video'
    check (kind in ('video','photo','graphic','document','draft','final','thumbnail','caption','revision')),
  status text not null default 'draft' check (status in (
    'draft','internal_review','dept_head_review','approved_for_client',
    'sent_to_client','client_approved','revision_requested','final_delivered','archived'
  )),
  version int not null default 1,
  storage_path text,
  thumbnail_path text,
  notes text,
  client_notes text,          -- client-authored feedback; readable both sides
  download_permission boolean not null default false,
  uploaded_by uuid references profiles(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  due_date date
);
-- Internal notes are a SEPARATE table, not a column on deliverables, for the
-- same reason `compensation` isn't a column on `profiles`: RLS is row-level,
-- so "never visible to clients" has to be a row a client's policy can't
-- match at all, not a column the app promises not to render.
create table if not exists deliverable_internal_notes (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references deliverables(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);
create table if not exists deliverable_events (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references deliverables(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  action text not null check (action in (
    'uploaded','submitted_for_review','dept_approved','sent_to_client',
    'client_approved','revision_requested','comment','final_delivered','archived'
  )),
  note text,
  version int,
  ts timestamptz not null default now()
);
alter table deliverables enable row level security;
alter table deliverable_internal_notes enable row level security;
alter table deliverable_events enable row level security;

-- --------------------------------------------------------------- contracts
create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  title text not null,
  status text not null default 'draft' check (status in (
    'draft','internal_review','approved_to_send','sent','viewed',
    'signed','countersigned','active','expired','archived'
  )),
  body text,
  storage_path text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  signature_name text,
  countersigned_at timestamptz,
  countersigned_by uuid references profiles(id) on delete set null,
  expires_at date
);
alter table contracts enable row level security;

-- --------------------------------------------------------------- proposals
create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  title text not null,
  status text not null default 'draft' check (status in (
    'draft','internal_review','approved','sent','viewed','accepted','rejected','expired'
  )),
  scope text,
  timeline text,
  deliverables_summary text,
  price numeric,
  payment_terms text,
  addons text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  viewed_at timestamptz,
  responded_at timestamptz,
  expires_at date,
  -- populated once accept_proposal() runs, so the trail from proposal to the
  -- records it spawned is explicit rather than inferred
  generated_contract_id uuid references contracts(id) on delete set null,
  generated_project_id uuid references projects(id) on delete set null,
  generated_invoice_id uuid references invoices(id) on delete set null
);
alter table proposals enable row level security;

-- ---------------------------------------------------------- client messages
create table if not exists client_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  contract_id uuid references contracts(id) on delete set null,
  proposal_id uuid references proposals(id) on delete set null,
  invoice_id uuid references invoices(id) on delete set null,
  sender_id uuid references profiles(id) on delete set null,
  recipient_id uuid references profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
alter table client_messages enable row level security;

create index if not exists idx_deliverables_project on deliverables(project_id);
create index if not exists idx_deliverables_client on deliverables(client_id);
create index if not exists idx_contracts_client on contracts(client_id);
create index if not exists idx_proposals_client on proposals(client_id);
create index if not exists idx_client_messages_client on client_messages(client_id);
create index if not exists idx_profiles_client on profiles(client_id);
create index if not exists idx_profiles_status_portal on profiles(status, portal_type);
