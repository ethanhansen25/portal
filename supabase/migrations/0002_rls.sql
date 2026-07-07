-- ==========================================================================
-- Oakframe Media OS — RLS (2/3)
-- Helper functions first (all SECURITY DEFINER + fixed search_path so they
-- can read `profiles` without recursing through its own RLS policy), then
-- row-level security enabled + policies for every table.
-- ==========================================================================

create or replace function my_role() returns text
language sql security definer stable set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function my_dept() returns text
language sql security definer stable set search_path = public as $$
  select dept from profiles where id = auth.uid()
$$;

create or replace function is_exec() returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid()) in
    ('owner','ceo','coo','cco','cso','cfo'), false)
$$;

create or replace function role_level(r text) returns int
language sql immutable as $$
  select case r
    when 'owner' then 100 when 'ceo' then 95
    when 'coo' then 90 when 'cco' then 90 when 'cso' then 90 when 'cfo' then 90
    when 'dept_head' then 70 when 'project_lead' then 60
    when 'senior' then 50 when 'junior' then 40
    when 'contractor' then 30 when 'intern' then 20
    else 0 end
$$;

create or replace function client_is_mine(cid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from clients c where c.id = cid and c.owner_id = auth.uid())
      or exists (
        select 1 from projects p
        where p.client_id = cid
          and (p.lead_id = auth.uid()
               or exists (select 1 from project_team pt where pt.project_id = p.id and pt.user_id = auth.uid()))
      )
$$;

create or replace function can_view_client(cid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select is_exec()
      or my_role() = 'dept_head'
      or my_dept() in ('Sales','Production','Creative')
      or (my_role() = 'contractor' and client_is_mine(cid))
$$;

create or replace function can_view_project(pid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select is_exec()
      or my_role() = 'dept_head'
      or exists (select 1 from projects p where p.id = pid and p.lead_id = auth.uid())
      or exists (select 1 from project_team pt where pt.project_id = pid and pt.user_id = auth.uid())
$$;

create or replace function can_manage_project(pid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select is_exec()
      or my_role() = 'dept_head'
      or exists (select 1 from projects p where p.id = pid and p.lead_id = auth.uid())
$$;

create or replace function can_view_task(tid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select is_exec() or my_role() = 'dept_head'
      or exists (
        select 1 from tasks t where t.id = tid
          and (t.assignee_id = auth.uid() or t.created_by = auth.uid()
               or (t.project_id is not null and can_view_project(t.project_id)))
      )
$$;

-- ---------------------------------------------------------------- enable RLS
alter table profiles enable row level security;
alter table compensation enable row level security;
alter table clients enable row level security;
alter table contacts enable row level security;
alter table leads enable row level security;
alter table projects enable row level security;
alter table project_team enable row level security;
alter table tasks enable row level security;
alter table task_checklist_items enable row level security;
alter table task_comments enable row level security;
alter table task_time_entries enable row level security;
alter table task_dependencies enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table expenses enable row level security;
alter table payroll_runs enable row level security;
alter table commissions enable row level security;
alter table budgets enable row level security;
alter table equipment enable row level security;
alter table approvals enable row level security;
alter table approval_decisions enable row level security;
alter table candidates enable row level security;
alter table time_off enable row level security;
alter table reviews enable row level security;
alter table hr_actions enable row level security;
alter table comms enable row level security;
alter table meetings enable row level security;
alter table meeting_attendees enable row level security;
alter table resources enable row level security;
alter table documents enable row level security;
alter table initiatives enable row level security;
alter table key_results enable row level security;
alter table risks enable row level security;
alter table board_notes enable row level security;
alter table notifications enable row level security;
alter table audit_log enable row level security;

-- ------------------------------------------------------------------ profiles
-- Directory is company-wide: every signed-in employee can see every other
-- employee's name/title/dept (needed for assignee pickers, @mentions, the
-- directory page). Compensation is deliberately a separate table (above).
create policy "profiles_select_all" on profiles for select
  using (auth.role() = 'authenticated');
create policy "profiles_insert_self" on profiles for insert
  with check (id = auth.uid());
create policy "profiles_update_self_or_admin" on profiles for update
  using (id = auth.uid() or is_exec() or my_dept() = 'Human Resources');
  -- column-level guard against self-promoting role/dept/status lives in the
  -- enforce_profile_update trigger, 0003_functions.sql

create policy "compensation_select" on compensation for select
  using (is_exec() or my_dept() = 'Finance' or profile_id = auth.uid());
create policy "compensation_write" on compensation for all
  using (is_exec() or my_dept() = 'Finance')
  with check (is_exec() or my_dept() = 'Finance');

-- -------------------------------------------------------------------- clients
create policy "clients_select" on clients for select using (can_view_client(id));
create policy "clients_insert" on clients for insert
  with check (is_exec() or my_role() = 'dept_head' or my_dept() = 'Sales');
create policy "clients_update" on clients for update
  using (is_exec() or my_role() = 'dept_head' or my_dept() = 'Sales');
create policy "clients_delete" on clients for delete
  using (is_exec() or my_role() = 'dept_head');

create policy "contacts_select" on contacts for select
  using (can_view_client(client_id));
create policy "contacts_write" on contacts for all
  using (is_exec() or my_role() = 'dept_head' or my_dept() = 'Sales')
  with check (is_exec() or my_role() = 'dept_head' or my_dept() = 'Sales');

-- ---------------------------------------------------------------------- sales
create policy "leads_select" on leads for select
  using (is_exec() or (my_dept() = 'Sales'
    and (my_role() = 'dept_head' or assigned_to = auth.uid() or assigned_to is null)));
create policy "leads_insert" on leads for insert
  with check (is_exec() or my_dept() = 'Sales');
create policy "leads_update" on leads for update
  using (is_exec() or (my_dept() = 'Sales'
    and (my_role() = 'dept_head' or assigned_to = auth.uid() or assigned_to is null)));
create policy "leads_delete" on leads for delete
  using (is_exec() or (my_dept() = 'Sales' and my_role() = 'dept_head'));

-- ------------------------------------------------------------------- projects
create policy "projects_select" on projects for select using (can_view_project(id));
create policy "projects_insert" on projects for insert
  with check (is_exec() or my_role() in ('dept_head','project_lead'));
create policy "projects_update" on projects for update
  using (is_exec() or my_role() = 'dept_head' or lead_id = auth.uid());
create policy "projects_delete" on projects for delete
  using (is_exec() or my_role() = 'dept_head');

create policy "project_team_select" on project_team for select
  using (can_view_project(project_id));
create policy "project_team_write" on project_team for all
  using (can_manage_project(project_id)) with check (can_manage_project(project_id));

-- --------------------------------------------------------------------- tasks
create policy "tasks_select" on tasks for select
  using (is_exec() or my_role() = 'dept_head'
    or assignee_id = auth.uid() or created_by = auth.uid()
    or (project_id is not null and can_view_project(project_id)));
create policy "tasks_insert" on tasks for insert with check (auth.role() = 'authenticated');
create policy "tasks_update" on tasks for update
  using (is_exec() or my_role() = 'dept_head'
    or assignee_id = auth.uid() or created_by = auth.uid()
    or (project_id is not null and can_view_project(project_id)));
create policy "tasks_delete" on tasks for delete
  using (is_exec() or my_role() in ('dept_head','project_lead') or created_by = auth.uid());

create policy "task_checklist_select" on task_checklist_items for select using (can_view_task(task_id));
create policy "task_checklist_write" on task_checklist_items for all
  using (can_view_task(task_id)) with check (can_view_task(task_id));
create policy "task_comments_select" on task_comments for select using (can_view_task(task_id));
create policy "task_comments_insert" on task_comments for insert
  with check (can_view_task(task_id) and user_id = auth.uid());
create policy "task_time_select" on task_time_entries for select using (can_view_task(task_id));
create policy "task_time_insert" on task_time_entries for insert
  with check (can_view_task(task_id) and user_id = auth.uid());
create policy "task_deps_select" on task_dependencies for select using (can_view_task(task_id));
create policy "task_deps_write" on task_dependencies for all
  using (can_view_task(task_id)) with check (can_view_task(task_id));

-- ------------------------------------------------------------------- finance
create policy "invoices_all" on invoices for all
  using (is_exec() or my_dept() = 'Finance') with check (is_exec() or my_dept() = 'Finance');
create policy "invoice_items_all" on invoice_items for all
  using (is_exec() or my_dept() = 'Finance') with check (is_exec() or my_dept() = 'Finance');

create policy "expenses_select" on expenses for select
  using (is_exec() or my_dept() = 'Finance' or my_role() = 'dept_head' or submitted_by = auth.uid());
create policy "expenses_insert" on expenses for insert
  with check (submitted_by = auth.uid());
create policy "expenses_update" on expenses for update
  using (is_exec() or my_dept() = 'Finance' or my_role() = 'dept_head');
create policy "expenses_delete" on expenses for delete
  using (is_exec() or (my_dept() = 'Finance' and my_role() = 'dept_head'));

create policy "payroll_all" on payroll_runs for all
  using (is_exec() or my_dept() = 'Finance') with check (is_exec() or my_dept() = 'Finance');
create policy "budgets_all" on budgets for all
  using (is_exec() or my_dept() = 'Finance') with check (is_exec() or my_dept() = 'Finance');
create policy "commissions_select" on commissions for select
  using (is_exec() or my_dept() = 'Finance'
    or (my_role() = 'dept_head' and my_dept() = 'Sales') or user_id = auth.uid());
create policy "commissions_write" on commissions for all
  using (is_exec() or my_dept() = 'Finance') with check (is_exec() or my_dept() = 'Finance');

-- ----------------------------------------------------------------- equipment
create policy "equipment_select" on equipment for select using (auth.role() = 'authenticated');
create policy "equipment_update" on equipment for update using (my_role() <> 'intern');
create policy "equipment_insert" on equipment for insert
  with check (is_exec() or (my_dept() = 'Technology' and my_role() = 'dept_head'));
create policy "equipment_delete" on equipment for delete
  using (is_exec() or (my_dept() = 'Technology' and my_role() = 'dept_head'));

-- ----------------------------------------------------------------- approvals
-- Row status changes (approve/reject) go through the decide_approval() RPC
-- in 0003_functions.sql, not a direct UPDATE, so the multi-approver chain and
-- side effects (flip the linked expense/time-off/invoice) stay atomic and
-- can't be spoofed by a client sending a bare PATCH.
create policy "approvals_select" on approvals for select
  using (is_exec() or my_role() = 'dept_head' or requested_by = auth.uid());
create policy "approvals_insert" on approvals for insert
  with check (requested_by = auth.uid());
revoke update, delete on approvals from authenticated;

create policy "approval_decisions_select" on approval_decisions for select
  using (is_exec() or my_role() = 'dept_head'
    or exists (select 1 from approvals a where a.id = approval_id and a.requested_by = auth.uid()));
revoke insert, update, delete on approval_decisions from authenticated;
-- writes only via the decide_approval() SECURITY DEFINER function.

-- ------------------------------------------------------------------------ hr
create policy "candidates_all" on candidates for all
  using (is_exec() or my_dept() = 'Human Resources' or my_role() = 'dept_head')
  with check (is_exec() or my_dept() = 'Human Resources');
create policy "reviews_select" on reviews for select
  using (is_exec() or my_dept() = 'Human Resources' or user_id = auth.uid() or reviewer_id = auth.uid());
create policy "reviews_write" on reviews for all
  using (is_exec() or my_dept() = 'Human Resources' or reviewer_id = auth.uid())
  with check (is_exec() or my_dept() = 'Human Resources' or reviewer_id = auth.uid());
create policy "hr_actions_all" on hr_actions for all
  using (is_exec() or my_dept() = 'Human Resources')
  with check (is_exec() or my_dept() = 'Human Resources');
create policy "time_off_select" on time_off for select
  using (is_exec() or my_dept() = 'Human Resources' or my_role() = 'dept_head' or user_id = auth.uid());
create policy "time_off_insert" on time_off for insert with check (user_id = auth.uid());
create policy "time_off_update" on time_off for update
  using (is_exec() or my_dept() = 'Human Resources' or my_role() = 'dept_head'
    or (user_id = auth.uid() and status = 'pending'));

-- ------------------------------------------------------------- comms/calendar
create policy "comms_select" on comms for select
  using (is_exec() or my_dept() = 'Sales' or user_id = auth.uid()
    or (client_id is not null and can_view_client(client_id)));
create policy "comms_insert" on comms for insert with check (user_id = auth.uid());

create policy "meetings_select" on meetings for select
  using (is_exec() or all_staff or owner_id = auth.uid()
    or exists (select 1 from meeting_attendees ma where ma.meeting_id = meetings.id and ma.user_id = auth.uid()));
create policy "meetings_write" on meetings for all
  using (is_exec() or owner_id = auth.uid() or my_role() <> 'intern')
  with check (is_exec() or owner_id = auth.uid() or my_role() <> 'intern');
create policy "meeting_attendees_select" on meeting_attendees for select
  using (exists (select 1 from meetings m where m.id = meeting_id
    and (m.is_private = false or m.owner_id = auth.uid() or is_exec())));
create policy "meeting_attendees_write" on meeting_attendees for all
  using (exists (select 1 from meetings m where m.id = meeting_id and (m.owner_id = auth.uid() or is_exec())))
  with check (exists (select 1 from meetings m where m.id = meeting_id and (m.owner_id = auth.uid() or is_exec())));

-- ---------------------------------------------------------------------library
create policy "resources_select" on resources for select
  using (is_exec()
    or ((allowed_depts is null or my_dept() = any(allowed_depts))
        and (min_role is null or role_level(my_role()) >= role_level(min_role))));
create policy "resources_insert" on resources for insert
  with check (my_role() not in ('intern','contractor'));
create policy "resources_update" on resources for update
  using (role_level(my_role()) >= 50);
create policy "resources_delete" on resources for delete
  using (is_exec() or my_role() = 'dept_head');

create policy "documents_select" on documents for select
  using (is_exec() or confidential = false);
create policy "documents_insert" on documents for insert
  with check (my_role() not in ('intern','contractor'));
create policy "documents_update" on documents for update
  using (role_level(my_role()) >= 50);
create policy "documents_delete" on documents for delete
  using (is_exec() or my_role() = 'dept_head');

-- ------------------------------------------------------------------executive
create policy "initiatives_all" on initiatives for all using (is_exec()) with check (is_exec());
create policy "key_results_all" on key_results for all using (is_exec()) with check (is_exec());
create policy "risks_all" on risks for all using (is_exec()) with check (is_exec());
create policy "board_notes_all" on board_notes for all using (is_exec()) with check (is_exec());

-- ---------------------------------------------------------------------system
create policy "notifications_select" on notifications for select using (user_id = auth.uid());
create policy "notifications_update" on notifications for update using (user_id = auth.uid());
revoke insert, delete on notifications from authenticated;
-- creating a notification FOR someone else is a side effect of some other
-- action (assigning a task, approving a request, ...) so it goes through the
-- notify() SECURITY DEFINER function in 0003_functions.sql instead of a
-- direct insert — otherwise RLS would have to choose between "nobody can
-- notify anybody" and "anybody can spam anybody's notification feed".

create policy "audit_select_exec_only" on audit_log for select using (is_exec());
create policy "audit_insert_self" on audit_log for insert
  with check (user_id = auth.uid() or user_id is null);
revoke update, delete on audit_log from authenticated;
-- append-only: no update/delete policy exists for any role, so even an
-- executive cannot edit or remove a historical entry through the API.
