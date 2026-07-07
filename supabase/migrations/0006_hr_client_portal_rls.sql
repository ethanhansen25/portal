-- ==========================================================================
-- Oakframe Media OS — HR / client portal RLS + functions (6/6)
-- ==========================================================================

-- ---------------------------------------------------- core helpers, redefined
-- Redefined (not new) so a pending or offboarded account satisfies NOTHING:
-- every existing policy built on these three functions across 0002/0003
-- automatically inherits the "must be active" gate without being rewritten.
create or replace function my_role() returns text
language sql security definer stable set search_path = public as $$
  select role from profiles where id = auth.uid() and status = 'active'
$$;

create or replace function my_dept() returns text
language sql security definer stable set search_path = public as $$
  select dept from profiles where id = auth.uid() and status = 'active'
$$;

create or replace function is_exec() returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid() and status = 'active') in
    ('owner','ceo','coo','cco','cso','cfo'), false)
$$;

-- ---------------------------------------------------------------- new helpers
create or replace function is_staff() returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((select portal_type from profiles where id = auth.uid() and status = 'active') in ('staff','contractor'), false)
$$;

create or replace function is_client() returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((select portal_type from profiles where id = auth.uid() and status = 'active') = 'client', false)
$$;

create or replace function my_client_id() returns uuid
language sql security definer stable set search_path = public as $$
  select client_id from profiles where id = auth.uid() and status = 'active'
$$;

-- The staff a client account is allowed to see/message: the account owner on
-- their client row, plus the lead and team of any project scoped to them.
create or replace function client_assigned_staff_ids() returns uuid[]
language sql security definer stable set search_path = public as $$
  select coalesce(array_agg(distinct s), '{}') from (
    select owner_id as s from clients where id = my_client_id() and owner_id is not null
    union
    select lead_id as s from projects where client_id = my_client_id() and lead_id is not null
    union
    select pt.user_id as s from project_team pt join projects p on p.id = pt.project_id where p.client_id = my_client_id()
  ) x
$$;

-- ------------------------------------------------------ privileged-field guard
-- Extends the existing trigger (0003_functions.sql) to also cover the new
-- placement fields — a pending user flipping their own portal_type/status
-- via a crafted PATCH must fail exactly like a role/dept change already did.
create or replace function enforce_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role
      or new.dept is distinct from old.dept
      or new.status is distinct from old.status
      or new.portal_type is distinct from old.portal_type
      or new.client_id is distinct from old.client_id
      or new.manager_id is distinct from old.manager_id
      or new.employment_type is distinct from old.employment_type
      or new.pay_type is distinct from old.pay_type
      or new.permission_group is distinct from old.permission_group) then
    if not (is_exec() or my_dept() = 'Human Resources') then
      raise exception 'Only HR or an executive can change role, department, status, or portal placement';
    end if;
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------- new-user bootstrap
-- First signup is still the sole exception: Owner, fully active, staff portal.
-- Everyone else now lands status='pending', portal_type='unassigned' — the
-- literal "Access: None" the approval workflow requires, enforced by the
-- fact that no policy anywhere matches that combination, not by a UI guard.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_is_first boolean;
begin
  select not exists (select 1 from profiles) into v_is_first;
  insert into profiles (id, name, email, role, dept, title, status, portal_type, hire_date)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    case when v_is_first then 'owner' else 'intern' end,
    case when v_is_first then 'Executive' else 'Unassigned' end,
    case when v_is_first then 'Owner' else null end,
    case when v_is_first then 'active' else 'pending' end,
    case when v_is_first then 'staff' else 'unassigned' end,
    current_date
  );
  return new;
end;
$$;

-- ---------------------------------------------------------- approve_user RPC
-- The single write path for turning a pending signup into a placed account.
-- HR/exec only (checked here, not just relied on via the profiles RLS policy,
-- because this one call also seeds the onboarding assignment and notifies
-- the new user — those side effects need the same authorization gate).
create or replace function approve_user(
  p_user_id uuid, p_portal_type text, p_role text, p_dept text, p_title text,
  p_company text, p_client_id uuid, p_project_id uuid, p_permission_group text,
  p_manager_id uuid, p_onboarding_template_id uuid, p_notes text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_assignment_id uuid;
  v_task record;
begin
  if not (is_exec() or my_dept() = 'Human Resources') then
    raise exception 'Only HR or an executive can approve a new user';
  end if;

  update profiles set
    status = 'active', portal_type = p_portal_type, role = coalesce(p_role, role),
    dept = coalesce(p_dept, dept), title = coalesce(p_title, title), company = p_company,
    client_id = p_client_id, permission_group = p_permission_group, manager_id = p_manager_id,
    approved_by = auth.uid(), approved_at = now()
  where id = p_user_id;

  if p_project_id is not null then
    insert into project_team (project_id, user_id) values (p_project_id, p_user_id)
      on conflict do nothing;
  end if;

  if p_onboarding_template_id is not null then
    insert into onboarding_assignments (profile_id, template_id, assigned_by)
      values (p_user_id, p_onboarding_template_id, auth.uid())
      returning id into v_assignment_id;
    for v_task in select * from onboarding_template_tasks where template_id = p_onboarding_template_id order by position loop
      insert into onboarding_task_progress (assignment_id, template_task_id, text, category, position)
        values (v_assignment_id, v_task.id, v_task.text, v_task.category, v_task.position);
    end loop;
  end if;

  if p_notes is not null and length(trim(p_notes)) > 0 then
    insert into hr_notes (profile_id, category, author_id, body) values (p_user_id, 'onboarding', auth.uid(), p_notes);
  end if;

  perform notify(p_user_id, 'hr', 'Your account is approved',
    'You now have ' || p_portal_type || ' access. Welcome to Oakframe Media.', '/');

  insert into audit_log (user_id, role, dept, action, entity, entity_id, summary)
    values (auth.uid(), my_role(), my_dept(), 'approve', 'user', p_user_id::text,
      'Approved pending user into ' || p_portal_type || ' portal (' || coalesce(p_role,'') || ' / ' || coalesce(p_dept,'') || ')');
end;
$$;
grant execute on function approve_user(uuid, text, text, text, text, text, uuid, uuid, text, uuid, uuid, text) to authenticated;

-- --------------------------------------------------------------- onboarding
create or replace function complete_onboarding_task(p_progress_id uuid, p_done boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select a.profile_id into v_owner from onboarding_task_progress tp join onboarding_assignments a on a.id = tp.assignment_id where tp.id = p_progress_id;
  if v_owner is null then raise exception 'Task not found'; end if;
  if v_owner <> auth.uid() and not (is_exec() or my_dept() = 'Human Resources') then
    raise exception 'You can only complete your own onboarding tasks';
  end if;
  update onboarding_task_progress set done = p_done, done_at = case when p_done then now() else null end, done_by = auth.uid() where id = p_progress_id;
end;
$$;
grant execute on function complete_onboarding_task(uuid, boolean) to authenticated;

create or replace function approve_onboarding(p_assignment_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_profile uuid;
begin
  if not (is_exec() or my_dept() = 'Human Resources') then raise exception 'Only HR or an executive can give final onboarding approval'; end if;
  update onboarding_assignments set approved_by = auth.uid(), approved_at = now() where id = p_assignment_id returning profile_id into v_profile;
  perform notify(v_profile, 'hr', 'Onboarding approved', 'HR has signed off on your onboarding.', '/');
  insert into audit_log (user_id, role, dept, action, entity, entity_id, summary)
    values (auth.uid(), my_role(), my_dept(), 'approve', 'onboarding', p_assignment_id::text, 'Final onboarding approval');
end;
$$;
grant execute on function approve_onboarding(uuid) to authenticated;

-- ---------------------------------------------------------------- contracts
-- Clients get a normal SELECT policy but no normal UPDATE grant: signing and
-- view-tracking both carry side effects (notifications, status transitions)
-- that belong in a definer function rather than a bare column-level trigger,
-- mirroring how decide_approval() already centralizes the approval RPC.
create or replace function mark_contract_viewed(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update contracts set viewed_at = coalesce(viewed_at, now()), status = case when status = 'sent' then 'viewed' else status end
    where id = p_id and client_id = my_client_id();
end;
$$;
grant execute on function mark_contract_viewed(uuid) to authenticated;

create or replace function sign_contract(p_id uuid, p_signature_name text) returns void
language plpgsql security definer set search_path = public as $$
declare v_contract contracts%rowtype;
begin
  select * into v_contract from contracts where id = p_id;
  if not found then raise exception 'Contract not found'; end if;
  if v_contract.client_id <> my_client_id() then raise exception 'Not authorized to sign this contract'; end if;
  if v_contract.status not in ('sent', 'viewed') then raise exception 'This contract is not awaiting a signature'; end if;
  update contracts set status = 'signed', signed_at = now(), signature_name = p_signature_name where id = p_id;
  insert into audit_log (user_id, role, dept, action, entity, entity_id, summary)
    values (auth.uid(), 'client', 'Client', 'sign', 'contract', p_id::text, 'Signed by ' || p_signature_name);
  perform notify_many(
    (select array_agg(distinct s) from (select owner_id as s from clients where id = v_contract.client_id union select lead_id from projects where id = v_contract.project_id) x),
    'contract', 'Contract signed — ' || v_contract.title, p_signature_name || ' signed on behalf of the client.', '/contracts'
  );
end;
$$;
grant execute on function sign_contract(uuid, text) to authenticated;

create or replace function countersign_contract(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_contract contracts%rowtype;
begin
  if not is_exec() then raise exception 'Only an executive can countersign'; end if;
  select * into v_contract from contracts where id = p_id;
  if not found then raise exception 'Contract not found'; end if;
  if v_contract.status <> 'signed' then raise exception 'Contract must be client-signed before countersigning'; end if;
  update contracts set status = 'active', countersigned_at = now(), countersigned_by = auth.uid() where id = p_id;
  insert into audit_log (user_id, role, dept, action, entity, entity_id, summary)
    values (auth.uid(), my_role(), my_dept(), 'approve', 'contract', p_id::text, 'Countersigned — ' || v_contract.title);
end;
$$;
grant execute on function countersign_contract(uuid) to authenticated;

-- ---------------------------------------------------------------- proposals
create or replace function mark_proposal_viewed(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update proposals set viewed_at = coalesce(viewed_at, now()), status = case when status = 'sent' then 'viewed' else status end
    where id = p_id and client_id = my_client_id();
end;
$$;
grant execute on function mark_proposal_viewed(uuid) to authenticated;

-- Accepting spawns the contract/invoice/project/tasks the spec calls for.
-- Kept intentionally lightweight (a starter project + kickoff task, a draft
-- contract mirroring the proposal terms, a deposit invoice) — real scope
-- gets refined by staff afterward, this just removes the blank-page step.
create or replace function accept_proposal(p_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_p proposals%rowtype;
  v_project_id uuid;
  v_contract_id uuid;
  v_invoice_id uuid;
  v_code text;
begin
  select * into v_p from proposals where id = p_id;
  if not found then raise exception 'Proposal not found'; end if;
  if v_p.client_id <> my_client_id() then raise exception 'Not authorized to respond to this proposal'; end if;
  if v_p.status not in ('sent', 'viewed') then raise exception 'This proposal is not awaiting a response'; end if;

  select 'OAK-' || (2410 + count(*)) into v_code from projects;
  insert into projects (code, name, client_id, service, status, health, start_date, due_date, budget, progress, client_access, description)
    values (v_code, v_p.title, v_p.client_id, 'Commercial', 'planning', 'on_track', current_date, current_date + 45, coalesce(v_p.price, 0), 0, true, 'Created from accepted proposal: ' || coalesce(v_p.scope, ''))
    returning id into v_project_id;

  insert into contracts (client_id, project_id, title, status, body, created_by)
    values (v_p.client_id, v_project_id, v_p.title || ' — Agreement', 'draft',
      'Scope: ' || coalesce(v_p.scope, '') || E'\nTimeline: ' || coalesce(v_p.timeline, '') || E'\nPrice: ' || coalesce(v_p.price::text, ''), null)
    returning id into v_contract_id;

  if v_p.price is not null and v_p.price > 0 then
    insert into invoices (number, client_id, project_id, amount, tax, total, status, issued_at, due_at, memo)
      values ('INV-' || (1040 + (select count(*) from invoices) + 1), v_p.client_id, v_project_id,
        v_p.price, round(v_p.price * 0.0825, 2), round(v_p.price * 1.0825, 2), 'draft', current_date, current_date + 15,
        'Deposit — ' || v_p.title)
      returning id into v_invoice_id;
  end if;

  update proposals set status = 'accepted', responded_at = now(),
    generated_project_id = v_project_id, generated_contract_id = v_contract_id, generated_invoice_id = v_invoice_id
    where id = p_id;

  insert into audit_log (user_id, role, dept, action, entity, entity_id, summary)
    values (auth.uid(), 'client', 'Client', 'approve', 'proposal', p_id::text, 'Proposal accepted — ' || v_p.title);
  perform notify_many(
    (select array_agg(distinct s) from (select owner_id as s from clients where id = v_p.client_id) x),
    'sales', 'Proposal accepted — ' || v_p.title, 'A new project, draft contract, and deposit invoice were created.', '/proposals'
  );
  return v_project_id;
end;
$$;
grant execute on function accept_proposal(uuid) to authenticated;

create or replace function reject_proposal(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_p proposals%rowtype;
begin
  select * into v_p from proposals where id = p_id;
  if not found then raise exception 'Proposal not found'; end if;
  if v_p.client_id <> my_client_id() then raise exception 'Not authorized to respond to this proposal'; end if;
  update proposals set status = 'rejected', responded_at = now() where id = p_id;
  insert into audit_log (user_id, role, dept, action, entity, entity_id, summary, reason)
    values (auth.uid(), 'client', 'Client', 'edit', 'proposal', p_id::text, 'Proposal rejected — ' || v_p.title, p_reason);
  perform notify_many(
    (select array_agg(distinct s) from (select owner_id as s from clients where id = v_p.client_id) x),
    'sales', 'Proposal rejected — ' || v_p.title, coalesce(p_reason, 'No reason given.'), '/proposals'
  );
end;
$$;
grant execute on function reject_proposal(uuid, text) to authenticated;

-- ------------------------------------------------------------- deliverables
create or replace function log_deliverable_event(p_id uuid, p_action text, p_note text, p_version int) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into deliverable_events (deliverable_id, user_id, action, note, version) values (p_id, auth.uid(), p_action, p_note, p_version);
end;
$$;
grant execute on function log_deliverable_event(uuid, text, text, int) to authenticated;

-- The client-facing approve/revision action: authorization is scoped to
-- "this client's own deliverable that has actually been released to them"
-- so a client can't approve (or even discover, via a guessed id) a
-- deliverable still sitting in internal review.
create or replace function client_review_deliverable(p_id uuid, p_action text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare v_d deliverables%rowtype;
begin
  if p_action not in ('client_approved', 'revision_requested') then raise exception 'Invalid action'; end if;
  select * into v_d from deliverables where id = p_id;
  if not found then raise exception 'Deliverable not found'; end if;
  if v_d.client_id <> my_client_id() then raise exception 'Not authorized'; end if;
  if v_d.status not in ('sent_to_client', 'client_approved', 'revision_requested') then
    raise exception 'This deliverable has not been released for client review yet';
  end if;
  update deliverables set status = p_action, client_notes = coalesce(p_note, client_notes) where id = p_id;
  insert into deliverable_events (deliverable_id, user_id, action, note, version) values (p_id, auth.uid(), p_action, p_note, v_d.version);
  insert into audit_log (user_id, role, dept, action, entity, entity_id, summary)
    values (auth.uid(), 'client', 'Client', 'approve', 'deliverable', p_id::text,
      (case when p_action = 'client_approved' then 'Client approved — ' else 'Client requested revision — ' end) || v_d.name);

  if p_action = 'revision_requested' then
    insert into tasks (project_id, title, description, status, priority, assignee_id, created_by, due_date)
      select v_d.project_id, 'Revision requested: ' || v_d.name, coalesce(p_note, 'Client requested changes.'), 'todo', 'high', p.lead_id, p.lead_id, now() + interval '3 days'
      from projects p where p.id = v_d.project_id;
  end if;

  perform notify_many(
    (select array_agg(distinct s) from (select lead_id as s from projects where id = v_d.project_id union select pt.user_id from project_team pt where pt.project_id = v_d.project_id) x),
    'project', (case when p_action = 'client_approved' then 'Client approved: ' else 'Revision requested: ' end) || v_d.name,
    coalesce(p_note, ''), '/project/' || v_d.project_id
  );
end;
$$;
grant execute on function client_review_deliverable(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------- RLS enable
alter table profiles enable row level security; -- already on; no-op if so
