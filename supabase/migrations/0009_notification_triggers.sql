-- ==========================================================================
-- Oakframe Media OS — remaining notification triggers (9/9)
-- Adds the two notification paths that weren't covered by an existing RPC:
--   1. HR/exec are alerted the moment a new account signs up and needs
--      placement (previously only the approved user got notified, not the
--      approvers — so a signup could sit unnoticed in the Pending Staff queue).
--   2. HR/exec are alerted once an employee finishes every onboarding task,
--      since that's the moment final onboarding approval becomes actionable.
-- ("Review due" reminders would need a scheduled job (pg_cron) to fire
-- without a user action triggering them; there's no cron infrastructure in
-- this project yet, so that one is surfaced as a computed list in the app's
-- Reviews tab instead of a push notification.)
-- ==========================================================================

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_is_first boolean;
  v_name text;
begin
  select not exists (select 1 from profiles) into v_is_first;
  v_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  insert into profiles (id, name, email, role, dept, title, status, portal_type, hire_date)
  values (
    new.id, v_name, new.email,
    case when v_is_first then 'owner' else 'intern' end,
    case when v_is_first then 'Executive' else 'Unassigned' end,
    case when v_is_first then 'Owner' else null end,
    case when v_is_first then 'active' else 'pending' end,
    case when v_is_first then 'staff' else 'unassigned' end,
    current_date
  );

  if not v_is_first then
    perform notify_many(
      (select array_agg(id) from profiles where status = 'active' and (dept = 'Human Resources' or role in (select r from unnest(array['owner','ceo','coo','cco','cso','cfo']) r))),
      'hr', 'New sign-up needs placement', v_name || ' (' || new.email || ') is waiting in Pending Staff.', '/hr/pending'
    );
  end if;
  return new;
end;
$$;

create or replace function complete_onboarding_task(p_progress_id uuid, p_done boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_assignment_id uuid;
  v_remaining int;
  v_name text;
begin
  select a.profile_id, tp.assignment_id into v_owner, v_assignment_id
    from onboarding_task_progress tp join onboarding_assignments a on a.id = tp.assignment_id where tp.id = p_progress_id;
  if v_owner is null then raise exception 'Task not found'; end if;
  if v_owner <> auth.uid() and not (is_exec() or my_dept() = 'Human Resources') then
    raise exception 'You can only complete your own onboarding tasks';
  end if;
  update onboarding_task_progress set done = p_done, done_at = case when p_done then now() else null end, done_by = auth.uid() where id = p_progress_id;

  if p_done then
    select count(*) into v_remaining from onboarding_task_progress where assignment_id = v_assignment_id and not done;
    if v_remaining = 0 then
      select name into v_name from profiles where id = v_owner;
      perform notify_many(
        (select array_agg(id) from profiles where status = 'active' and (dept = 'Human Resources' or role in (select r from unnest(array['owner','ceo','coo','cco','cso','cfo']) r))),
        'hr', 'Onboarding ready for final approval', v_name || ' has completed every onboarding task.', '/hr/onboarding'
      );
    end if;
  end if;
end;
$$;
grant execute on function complete_onboarding_task(uuid, boolean) to authenticated;
