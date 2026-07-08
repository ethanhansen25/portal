-- ==========================================================================
-- Oakframe Media OS — executive-only approvals (15/15)
-- Per request: "no one needs to see [approvals] besides exec." Previously a
-- dept_head could view every pending approval and decide the ones routed to
-- their own department ('dept_head:'||dept, or 'hr' for HR). This removes
-- that branch entirely in both the RLS policies (defense in depth — the app
-- already narrows moduleAccess("approvals")/can("approve","approval") to
-- exec on the client, but that's not the real boundary) and the
-- decide_approval() RPC that actually records decisions. A requester can
-- still see their OWN submitted request (unchanged), just not anyone else's,
-- and can no longer decide anyone's request including their own team's.
-- ==========================================================================

drop policy if exists "approvals_select" on approvals;
create policy "approvals_select" on approvals for select
  using (is_exec() or requested_by = auth.uid());

drop policy if exists "approval_decisions_select" on approval_decisions;
create policy "approval_decisions_select" on approval_decisions for select
  using (is_exec()
    or exists (select 1 from approvals a where a.id = approval_id and a.requested_by = auth.uid()));

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

  v_authorized := is_exec();

  if not v_authorized then
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
