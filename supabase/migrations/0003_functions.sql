-- ==========================================================================
-- Oakframe Media OS — server-side business logic (3/3)
-- Anything that (a) writes to a row the caller doesn't own, (b) must be
-- atomic across tables, or (c) needs an authorization check RLS can't
-- express (array membership against approver_roles) lives here as a
-- SECURITY DEFINER RPC instead of a direct table write from the client.
-- ==========================================================================

-- ---------------------------------------------------------- new-user bootstrap
-- The very first person to sign up becomes Owner/Executive automatically —
-- there is no seeded account. Everyone after that lands as an unassigned
-- intern until HR or an executive assigns their real role/department from
-- the Team admin screen.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_is_first boolean;
begin
  select not exists (select 1 from profiles) into v_is_first;
  insert into profiles (id, name, email, role, dept, title, status, hire_date)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    case when v_is_first then 'owner' else 'intern' end,
    case when v_is_first then 'Executive' else 'Unassigned' end,
    case when v_is_first then 'Owner' else null end,
    'active',
    current_date
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------- privileged-field guard
-- Blocks a user from editing their own (or anyone's) role/dept/status
-- through a direct UPDATE, even though profiles_update_self_or_admin allows
-- the row to be touched (for editing phone/title). Role changes must come
-- through HR or an executive.
create or replace function enforce_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role
      or new.dept is distinct from old.dept
      or new.status is distinct from old.status) then
    if not (is_exec() or my_dept() = 'Human Resources') then
      raise exception 'Only HR or an executive can change role, department, or status';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged_fields on profiles;
create trigger profiles_guard_privileged_fields
  before update on profiles
  for each row execute function enforce_profile_update();

-- ------------------------------------------------------------------- notify
-- The only way a row lands in someone else's notifications feed. Direct
-- INSERT on notifications is revoked for `authenticated` in 0002_rls.sql.
create or replace function notify(p_user uuid, p_kind text, p_title text, p_body text, p_link text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null or p_user = auth.uid() then return; end if;
  insert into notifications (user_id, kind, title, body, link) values (p_user, p_kind, p_title, p_body, p_link);
end;
$$;

create or replace function notify_many(p_users uuid[], p_kind text, p_title text, p_body text, p_link text)
returns void language plpgsql security definer set search_path = public as $$
declare u uuid;
begin
  foreach u in array coalesce(p_users, '{}') loop
    perform notify(u, p_kind, p_title, p_body, p_link);
  end loop;
end;
$$;

-- --------------------------------------------------------- decide_approval
-- Records a decision, enforces that the caller is actually one of the named
-- approvers (dept-head-of-department / HR / any exec), applies the
-- multi-approver rule (a "ceo" entry in approver_roles blocks approval until
-- a ceo/owner has signed off), ripples the outcome to the linked expense /
-- time-off / invoice row, and notifies the requester — all in one
-- transaction so the app never has to compute approval status client-side.
create or replace function decide_approval(p_approval_id uuid, p_decision text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_approval approvals%rowtype;
  v_authorized boolean;
  v_new_status text;
begin
  if p_decision not in ('approved','rejected') then
    raise exception 'decision must be approved or rejected';
  end if;

  select * into v_approval from approvals where id = p_approval_id for update;
  if not found then raise exception 'Approval not found'; end if;

  v_authorized := is_exec() or (
    my_role() = 'dept_head' and (
      ('dept_head:' || my_dept()) = any(v_approval.approver_roles)
      or ('hr' = any(v_approval.approver_roles) and my_dept() = 'Human Resources')
    )
  );

  if not v_authorized then
    -- Do NOT write to audit_log here: raising below rolls back everything
    -- in this transaction, including any insert made before the raise, so
    -- an in-function "log the denial then fail" pattern silently produces
    -- no record at all. Denials are logged by the caller via
    -- log_denied_attempt() in a separate transaction after it catches this.
    raise exception 'You are not authorized to decide this approval';
  end if;

  insert into approval_decisions (approval_id, user_id, decision, note)
    values (p_approval_id, auth.uid(), p_decision, p_note);

  if p_decision = 'rejected' then
    v_new_status := 'rejected';
  elsif ('ceo' = any(v_approval.approver_roles)) and not exists (
    select 1 from approval_decisions ad join profiles p on p.id = ad.user_id
    where ad.approval_id = p_approval_id and p.role in ('ceo','owner')
  ) then
    v_new_status := 'pending'; -- still waiting on a ceo/owner sign-off
  else
    v_new_status := 'approved';
  end if;

  update approvals set status = v_new_status where id = p_approval_id;

  if v_new_status = 'approved' then
    if v_approval.ref_type = 'expense' then update expenses set status = 'approved' where id = v_approval.ref_id; end if;
    if v_approval.ref_type = 'timeoff' then update time_off set status = 'approved' where id = v_approval.ref_id; end if;
    if v_approval.ref_type = 'invoice' then update invoices set status = 'sent' where id = v_approval.ref_id and status = 'draft'; end if;
  elsif v_new_status = 'rejected' and v_approval.ref_type = 'timeoff' then
    update time_off set status = 'denied' where id = v_approval.ref_id;
  end if;

  if v_new_status <> 'pending' then
    perform notify(v_approval.requested_by, 'approval',
      initcap(v_new_status) || ': ' || v_approval.title,
      coalesce(p_note, 'Decision recorded by a reviewer'), '/approvals');
  end if;

  insert into audit_log (user_id, role, dept, action, entity, entity_id, summary, reason, next_value)
    values (auth.uid(), my_role(), my_dept(), 'approve', 'approval', p_approval_id::text,
      initcap(p_decision) || ' — ' || v_approval.title, p_note, v_new_status);
end;
$$;

-- ------------------------------------------------------------ denial logging
-- Called by the client in a fresh request right after it catches a
-- permission error from any table operation or RPC (mirrors the old
-- localStorage-era assertCan() pattern of "attempt, catch, then audit").
-- Because this runs as its own statement/transaction, the record survives
-- even though the operation it's describing was just rolled back.
create or replace function log_denied_attempt(p_action text, p_entity text, p_entity_id text, p_summary text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (user_id, role, dept, action, entity, entity_id, summary, denied)
    values (auth.uid(), my_role(), my_dept(), p_action, p_entity, p_entity_id, p_summary, true);
end;
$$;

grant execute on function notify(uuid, text, text, text, text) to authenticated;
grant execute on function notify_many(uuid[], text, text, text, text) to authenticated;
grant execute on function decide_approval(uuid, text, text) to authenticated;
grant execute on function log_denied_attempt(text, text, text, text) to authenticated;
