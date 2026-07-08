-- ==========================================================================
-- Oakframe Media OS — multi-assignee tasks (12/12)
-- Tasks previously supported exactly one assignee_id. This adds a join
-- table for the full assignee list while keeping assignee_id in place as
-- the "primary" assignee (the first person added) so every existing filter,
-- kanban avatar, and notification that already keys off assignee_id keeps
-- working unchanged — task_assignees is purely additive.
-- ==========================================================================

create table if not exists task_assignees (
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (task_id, user_id)
);
create index if not exists task_assignees_user_idx on task_assignees(user_id);

-- backfill: every task's existing single assignee becomes a row here too
insert into task_assignees (task_id, user_id)
select id, assignee_id from tasks where assignee_id is not null
on conflict do nothing;

alter table task_assignees enable row level security;

-- A secondary assignee (in task_assignees but not assignee_id/created_by/
-- project team) still needs to be able to view/manage their own task, so
-- can_view_task() and the tasks_select/tasks_update policies all need to
-- know about this table too.
create or replace function can_view_task(tid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select is_exec() or my_role() = 'dept_head'
      or exists (
        select 1 from tasks t where t.id = tid
          and (t.assignee_id = auth.uid() or t.created_by = auth.uid()
               or (t.project_id is not null and can_view_project(t.project_id)))
      )
      or exists (select 1 from task_assignees ta where ta.task_id = tid and ta.user_id = auth.uid())
$$;

drop policy if exists "tasks_select" on tasks;
create policy "tasks_select" on tasks for select
  using (is_exec() or my_role() = 'dept_head'
    or assignee_id = auth.uid() or created_by = auth.uid()
    or (project_id is not null and can_view_project(project_id))
    or exists (select 1 from task_assignees ta where ta.task_id = id and ta.user_id = auth.uid()));
drop policy if exists "tasks_update" on tasks;
create policy "tasks_update" on tasks for update
  using (is_exec() or my_role() = 'dept_head'
    or assignee_id = auth.uid() or created_by = auth.uid()
    or (project_id is not null and can_view_project(project_id))
    or exists (select 1 from task_assignees ta where ta.task_id = id and ta.user_id = auth.uid()));

create policy "task_assignees_select" on task_assignees for select using (can_view_task(task_id));
create policy "task_assignees_write" on task_assignees for all
  using (is_exec() or my_role() = 'dept_head'
    or exists (select 1 from tasks t where t.id = task_id and (t.created_by = auth.uid() or (t.project_id is not null and can_manage_project(t.project_id)))))
  with check (is_exec() or my_role() = 'dept_head'
    or exists (select 1 from tasks t where t.id = task_id and (t.created_by = auth.uid() or (t.project_id is not null and can_manage_project(t.project_id)))));
