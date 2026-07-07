-- ==========================================================================
-- Oakframe Media OS — HR / client portal RLS policies (7/7)
-- ==========================================================================

-- ------------------------------------------------------------------ profiles
-- Replaces the blanket "any authenticated user can read every profile"
-- policy from 0002_rls.sql. A client account may now only see: themselves,
-- and the specific staff assigned to their account (client_assigned_staff_ids()).
drop policy if exists "profiles_select_all" on profiles;
create policy "profiles_select" on profiles for select
  using (
    id = auth.uid()
    or (is_staff() or is_exec())
    or (is_client() and id = any(client_assigned_staff_ids()))
  );

-- ----------------------------------------------------------------- hr_notes
create policy "hr_notes_all" on hr_notes for all
  using (is_exec() or my_dept() = 'Human Resources')
  with check (is_exec() or my_dept() = 'Human Resources');

-- ---------------------------------------------------------------- onboarding
create policy "onboarding_templates_select" on onboarding_templates for select using (is_staff() or is_exec());
create policy "onboarding_templates_write" on onboarding_templates for all
  using (is_exec() or my_dept() = 'Human Resources')
  with check (is_exec() or my_dept() = 'Human Resources');

create policy "onboarding_template_tasks_select" on onboarding_template_tasks for select using (is_staff() or is_exec());
create policy "onboarding_template_tasks_write" on onboarding_template_tasks for all
  using (is_exec() or my_dept() = 'Human Resources' or my_role() = 'dept_head')
  with check (is_exec() or my_dept() = 'Human Resources' or my_role() = 'dept_head');

create policy "onboarding_assignments_select" on onboarding_assignments for select
  using (is_exec() or my_dept() = 'Human Resources' or profile_id = auth.uid() or my_role() = 'dept_head');
create policy "onboarding_assignments_write" on onboarding_assignments for all
  using (is_exec() or my_dept() = 'Human Resources')
  with check (is_exec() or my_dept() = 'Human Resources');

create policy "onboarding_progress_select" on onboarding_task_progress for select
  using (is_exec() or my_dept() = 'Human Resources' or my_role() = 'dept_head'
    or exists (select 1 from onboarding_assignments a where a.id = assignment_id and a.profile_id = auth.uid()));
-- Writes (marking a task done) go through complete_onboarding_task() only —
-- that RPC checks the caller owns the assignment (or is HR/exec) before
-- touching it, so a direct table grant would just duplicate a weaker check.
revoke insert, update, delete on onboarding_task_progress from authenticated;

-- -------------------------------------------------------------------- clients
-- Clients can see their own company record (for Profile Settings).
create policy "clients_select_own" on clients for select using (is_client() and id = my_client_id());

-- ------------------------------------------------------------------- projects
-- Clients see their own projects, but only the ones staff has explicitly
-- opened the client portal for (client_access) — matches the flag the
-- project detail page already exposed as "Client portal access".
create policy "projects_select_client" on projects for select
  using (is_client() and client_id = my_client_id() and client_access = true);

-- ------------------------------------------------------------------- invoices
create policy "invoices_select_client" on invoices for select
  using (is_client() and client_id = my_client_id() and status <> 'draft');

-- ------------------------------------------------------------------ documents
create policy "documents_select_client" on documents for select
  using (is_client() and client_id = my_client_id() and visibility in ('client_visible', 'final_delivery'));

-- --------------------------------------------------------------- deliverables
create policy "deliverables_select_staff" on deliverables for select
  using (is_exec() or my_role() = 'dept_head'
    or (project_id is not null and can_view_project(project_id)));
-- A client sees a deliverable only once it has actually been released —
-- "approved_for_client" is the internal gate that unlocks the send action,
-- "sent_to_client" is the point it's actually shared, matching the release
-- step the deliverable_events log records.
create policy "deliverables_select_client" on deliverables for select
  using (is_client() and client_id = my_client_id()
    and status in ('sent_to_client', 'client_approved', 'revision_requested', 'final_delivered'));

create policy "deliverables_insert" on deliverables for insert
  with check (is_exec() or my_dept() in ('Production', 'Creative') or my_role() = 'dept_head');
create policy "deliverables_update_staff" on deliverables for update
  using (is_exec() or my_role() = 'dept_head' or (project_id is not null and can_manage_project(project_id))
    or uploaded_by = auth.uid());
-- Client-side status changes (approve / request revision) go through
-- client_review_deliverable() only, not a direct UPDATE grant, so the
-- authorization + notification + revision-task side effects can't be
-- bypassed by a client PATCHing the row themselves.
create policy "deliverables_delete" on deliverables for delete using (is_exec() or my_role() = 'dept_head');

create policy "deliverable_events_select" on deliverable_events for select
  using (is_exec() or my_role() = 'dept_head'
    or exists (select 1 from deliverables d where d.id = deliverable_id and (
      (d.project_id is not null and can_view_project(d.project_id))
      or (is_client() and d.client_id = my_client_id() and d.status in ('sent_to_client','client_approved','revision_requested','final_delivered'))
    )));
create policy "deliverable_events_insert" on deliverable_events for insert
  with check (is_staff() or is_exec()); -- client-authored events are written by the SECURITY DEFINER RPC, not directly

create policy "deliverable_notes_select" on deliverable_internal_notes for select
  using (is_exec() or my_role() = 'dept_head'
    or exists (select 1 from deliverables d where d.id = deliverable_id and d.project_id is not null and can_view_project(d.project_id)));
create policy "deliverable_notes_insert" on deliverable_internal_notes for insert
  with check (is_staff() or is_exec());

-- ----------------------------------------------------------------- contracts
create policy "contracts_select_staff" on contracts for select
  using (is_exec() or my_dept() = 'Sales' or my_role() = 'dept_head'
    or (project_id is not null and can_view_project(project_id)));
create policy "contracts_select_client" on contracts for select
  using (is_client() and client_id = my_client_id() and status not in ('draft', 'internal_review'));
create policy "contracts_insert" on contracts for insert
  with check (is_exec() or my_dept() = 'Sales' or my_role() in ('project_lead', 'dept_head'));
create policy "contracts_update_staff" on contracts for update
  using (is_exec() or my_dept() = 'Sales' or my_role() = 'dept_head');
-- Client actions (view-tracking, signing) go through mark_contract_viewed()
-- and sign_contract() — no direct client UPDATE grant exists.
create policy "contracts_delete" on contracts for delete using (is_exec());

-- ----------------------------------------------------------------- proposals
create policy "proposals_select_staff" on proposals for select
  using (is_exec() or my_dept() = 'Sales' or my_role() = 'dept_head');
create policy "proposals_select_client" on proposals for select
  using (is_client() and client_id = my_client_id() and status not in ('draft', 'internal_review'));
create policy "proposals_insert" on proposals for insert
  with check (is_exec() or my_dept() = 'Sales' or my_role() in ('project_lead', 'dept_head'));
create policy "proposals_update_staff" on proposals for update
  using (is_exec() or my_dept() = 'Sales' or my_role() = 'dept_head');
-- Client actions (view-tracking, accept/reject) go through
-- mark_proposal_viewed()/accept_proposal()/reject_proposal() only.
create policy "proposals_delete" on proposals for delete using (is_exec());

-- ------------------------------------------------------------ client_messages
-- A message is visible to its client's own portal users and to whichever
-- staff member is sender or recipient — never to staff at large, matching
-- "Clients cannot message random staff unless assigned."
create policy "client_messages_select" on client_messages for select
  using (
    (is_client() and client_id = my_client_id())
    or sender_id = auth.uid() or recipient_id = auth.uid()
    or is_exec()
  );
-- Staff may only message a client they're actually assigned to (project lead/
-- team member/account owner) — the mirror-image check of client_assigned_staff_ids().
create or replace function staff_assigned_to_client(p_client_id uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select is_exec() or exists (
    select 1 from clients c where c.id = p_client_id and c.owner_id = auth.uid()
  ) or exists (
    select 1 from projects p where p.client_id = p_client_id and (
      p.lead_id = auth.uid() or exists (select 1 from project_team pt where pt.project_id = p.id and pt.user_id = auth.uid())
    )
  )
$$;

create policy "client_messages_insert" on client_messages for insert
  with check (
    (is_client() and client_id = my_client_id() and sender_id = auth.uid()
      and recipient_id = any(client_assigned_staff_ids()))
    or (is_staff() and sender_id = auth.uid() and staff_assigned_to_client(client_id))
  );
create policy "client_messages_update_read" on client_messages for update
  using (recipient_id = auth.uid() or (is_client() and client_id = my_client_id()));
