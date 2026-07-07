-- ==========================================================================
-- Oakframe Media OS — storage visibility for deliverable files (8/8)
-- Object path within the 'attachments' bucket: deliverables/{deliverable_id}/{filename}
-- Mirrors the deliverables_select_staff / deliverables_select_client RLS
-- policies from 0007 exactly, so a client can't fetch a deliverable's file
-- object just by guessing its path before the row itself is released to
-- them (and can never fetch an internal-review-only file at all).
-- ==========================================================================

create or replace function attachment_visible(path text) returns boolean
language plpgsql security definer stable set search_path = public as $$
declare
  parts text[];
  kind text;
  rec_id uuid;
begin
  parts := storage.foldername(path);
  if array_length(parts, 1) < 2 then return false; end if;
  kind := parts[1];
  begin
    rec_id := parts[2]::uuid;
  exception when others then return false;
  end;

  if kind = 'resources' then
    return exists (
      select 1 from resources r where r.id = rec_id
        and (is_exec()
          or ((r.allowed_depts is null or my_dept() = any(r.allowed_depts))
              and (r.min_role is null or role_level(my_role()) >= role_level(r.min_role))))
    );
  elsif kind = 'documents' then
    return exists (
      select 1 from documents d where d.id = rec_id
        and (is_exec() or d.confidential = false)
    );
  elsif kind = 'deliverables' then
    return exists (
      select 1 from deliverables d where d.id = rec_id and (
        is_exec() or my_role() = 'dept_head'
        or (d.project_id is not null and can_view_project(d.project_id))
        or (is_client() and d.client_id = my_client_id()
            and d.status in ('sent_to_client','client_approved','revision_requested','final_delivered'))
      )
    );
  end if;
  return false;
end;
$$;

create or replace function attachment_writable(path text) returns boolean
language plpgsql security definer stable set search_path = public as $$
declare
  parts text[];
  kind text;
  rec_id uuid;
begin
  parts := storage.foldername(path);
  kind := parts[1];
  if kind = 'deliverables' then
    if array_length(parts, 1) < 2 then return false; end if;
    begin
      rec_id := parts[2]::uuid;
    exception when others then return false;
    end;
    return is_exec() or my_role() = 'dept_head' or my_dept() in ('Production', 'Creative')
      or exists (select 1 from deliverables d where d.id = rec_id and d.project_id is not null and can_manage_project(d.project_id));
  end if;
  return my_role() not in ('intern', 'contractor');
end;
$$;
