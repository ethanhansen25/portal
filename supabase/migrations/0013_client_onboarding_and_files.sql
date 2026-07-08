-- ==========================================================================
-- Oakframe Media OS — client onboarding + onboarding file uploads (13/13)
-- The onboarding_templates/onboarding_assignments/onboarding_task_progress
-- tables from 0005 already work for ANY profile — a client portal contact
-- is just a profile with portal_type='client', so assigning them an
-- onboarding checklist needs no new tables, just: (1) a way to tag a
-- template as being for clients vs staff, (2) a way to assign an existing
-- template to someone who ISN'T a brand-new pending signup (approve_user()
-- only runs once, at initial approval), and (3) file attachments on an
-- assignment. Also widens who can manage onboarding to include Sales, since
-- client onboarding is naturally an account team's job, not just HR's.
-- ==========================================================================

alter table onboarding_templates add column if not exists audience text not null default 'staff'
  check (audience in ('staff','client'));
-- The "— All departments —" option in the template form (and any client
-- template, where "department" doesn't really apply) sends dept = null,
-- which this NOT NULL constraint was silently rejecting at the database
-- layer — never caught before because every template created so far
-- happened to pick a real department.
alter table onboarding_templates alter column dept drop not null;

create table if not exists onboarding_files (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references onboarding_assignments(id) on delete cascade,
  name text not null,
  storage_path text not null,
  uploaded_by uuid references profiles(id) on delete set null,
  uploaded_at timestamptz not null default now()
);
create index if not exists onboarding_files_assignment_idx on onboarding_files(assignment_id);
alter table onboarding_files enable row level security;

-- Sales manages client onboarding; HR/exec/dept_head keep managing staff
-- onboarding — both audiences share the same tables, gated the same way.
drop policy if exists "onboarding_templates_write" on onboarding_templates;
create policy "onboarding_templates_write" on onboarding_templates for all
  using (is_exec() or my_dept() in ('Human Resources', 'Sales'))
  with check (is_exec() or my_dept() in ('Human Resources', 'Sales'));

drop policy if exists "onboarding_template_tasks_write" on onboarding_template_tasks;
create policy "onboarding_template_tasks_write" on onboarding_template_tasks for all
  using (is_exec() or my_dept() in ('Human Resources', 'Sales') or my_role() = 'dept_head')
  with check (is_exec() or my_dept() in ('Human Resources', 'Sales') or my_role() = 'dept_head');

drop policy if exists "onboarding_assignments_write" on onboarding_assignments;
create policy "onboarding_assignments_write" on onboarding_assignments for all
  using (is_exec() or my_dept() in ('Human Resources', 'Sales'))
  with check (is_exec() or my_dept() in ('Human Resources', 'Sales'));

create policy "onboarding_files_select" on onboarding_files for select
  using (exists (select 1 from onboarding_assignments a where a.id = assignment_id and (
    is_exec() or my_dept() in ('Human Resources', 'Sales') or my_role() = 'dept_head' or a.profile_id = auth.uid()
  )));
-- Either side of the onboarding can attach a file — HR/Sales/exec/dept_head
-- posting reference material, or the assignee uploading a requested
-- document (e.g. a signed NDA, a W-9, a piece of ID).
create policy "onboarding_files_insert" on onboarding_files for insert
  with check (exists (select 1 from onboarding_assignments a where a.id = assignment_id and (
    is_exec() or my_dept() in ('Human Resources', 'Sales') or my_role() = 'dept_head' or a.profile_id = auth.uid()
  )));
create policy "onboarding_files_delete" on onboarding_files for delete
  using (is_exec() or my_dept() in ('Human Resources', 'Sales') or my_role() = 'dept_head');

-- The onboarding storage kind (0011) only let HR/exec/dept_head write; the
-- assignment owner needs to be able to upload their own file too, and Sales
-- needs the same write access it now has over the assignment row itself.
create or replace function attachment_writable(path text) returns boolean
language plpgsql security definer stable set search_path = public as $$
declare
  parts text[];
  kind text;
  rec_id uuid;
begin
  parts := storage.foldername(path);
  if array_length(parts, 1) < 2 then return my_role() not in ('intern', 'contractor'); end if;
  kind := parts[1];
  begin
    rec_id := parts[2]::uuid;
  exception when others then return my_role() not in ('intern', 'contractor');
  end;

  if kind = 'deliverables' then
    return is_exec() or my_role() = 'dept_head' or my_dept() in ('Production', 'Creative')
      or exists (select 1 from deliverables d where d.id = rec_id and d.project_id is not null and can_manage_project(d.project_id));
  elsif kind = 'onboarding' then
    return is_exec() or my_dept() in ('Human Resources', 'Sales') or my_role() = 'dept_head'
      or exists (select 1 from onboarding_assignments a where a.id = rec_id and a.profile_id = auth.uid());
  end if;
  return my_role() not in ('intern', 'contractor');
end;
$$;

-- --------------------------------------------------------- assign_onboarding
-- The single write path for attaching a checklist to someone who's already
-- active (client or staff) — approve_user() only covers the moment of
-- initial approval, so anything assigned later (a client re-onboarding for
-- a new engagement, a staff member moved into a new role) goes through here.
create or replace function assign_onboarding(p_profile_id uuid, p_template_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_assignment_id uuid;
  v_task record;
  v_name text;
begin
  if not (is_exec() or my_dept() in ('Human Resources', 'Sales')) then
    raise exception 'Only HR, Sales, or an executive can assign onboarding';
  end if;
  insert into onboarding_assignments (profile_id, template_id, assigned_by)
    values (p_profile_id, p_template_id, auth.uid())
    returning id into v_assignment_id;
  for v_task in select * from onboarding_template_tasks where template_id = p_template_id order by position loop
    insert into onboarding_task_progress (assignment_id, template_task_id, text, category, position)
      values (v_assignment_id, v_task.id, v_task.text, v_task.category, v_task.position);
  end loop;
  select name into v_name from profiles where id = p_profile_id;
  perform notify(p_profile_id, 'hr', 'Onboarding assigned', 'A new onboarding checklist is ready for you.', '/');
  insert into audit_log (user_id, role, dept, action, entity, entity_id, summary)
    values (auth.uid(), my_role(), my_dept(), 'assign', 'onboarding', v_assignment_id::text, 'Assigned onboarding to ' || coalesce(v_name, 'unknown'));
  return v_assignment_id;
end;
$$;
grant execute on function assign_onboarding(uuid, uuid) to authenticated;
