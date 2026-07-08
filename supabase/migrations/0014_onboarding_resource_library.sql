-- ==========================================================================
-- Oakframe Media OS — executive onboarding resource library (14/14)
-- A dedicated, exec-only-managed place to upload contracts/documents/
-- templates meant for staff and/or client onboarding — distinct from
-- onboarding_files (0013), which are per-assignment attachments tied to one
-- specific person's checklist. This is the shared master library those
-- checklists and staff/client onboarding cards draw reference material from.
-- ==========================================================================

create table if not exists onboarding_resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'document' check (category in ('contract', 'document', 'template')),
  audience text not null default 'both' check (audience in ('staff', 'client', 'both')),
  storage_path text not null,
  size_bytes bigint,
  uploaded_by uuid references profiles(id) on delete set null,
  uploaded_at timestamptz not null default now()
);
create index if not exists onboarding_resources_audience_idx on onboarding_resources(audience);
alter table onboarding_resources enable row level security;

-- Managed exclusively by executives (per request: "just in executive"), but
-- readable by whoever the file is actually for — HR/Sales run onboarding day
-- to day, staff see the ones tagged for them, clients see the ones tagged
-- for them. Read access is what gets these files in front of the people
-- they're "for"; write access is what stays exec-only.
drop policy if exists "onboarding_resources_select" on onboarding_resources;
create policy "onboarding_resources_select" on onboarding_resources for select
  using (
    is_exec() or my_dept() in ('Human Resources', 'Sales')
    or (not is_client() and audience in ('staff', 'both'))
    or (is_client() and audience in ('client', 'both'))
  );
drop policy if exists "onboarding_resources_insert" on onboarding_resources;
create policy "onboarding_resources_insert" on onboarding_resources for insert
  with check (is_exec());
drop policy if exists "onboarding_resources_delete" on onboarding_resources;
create policy "onboarding_resources_delete" on onboarding_resources for delete
  using (is_exec());

-- Extend the shared storage-visibility/writability dispatch with a new
-- 'onboarding_resources' path kind (onboarding_resources/{resourceId}/
-- {filename}), and while touching attachment_visible(), fix a real gap left
-- by 0013: Sales was granted write access to onboarding-assignment files
-- (attachment_writable) but was never added to attachment_visible's
-- 'onboarding' branch, so a Sales rep couldn't actually see/download a file
-- they (or their client) had just uploaded.
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
  elsif kind = 'onboarding' then
    return exists (
      select 1 from onboarding_assignments a where a.id = rec_id and (
        is_exec() or my_dept() in ('Human Resources', 'Sales') or my_role() = 'dept_head' or a.profile_id = auth.uid()
      )
    );
  elsif kind = 'onboarding_resources' then
    return exists (
      select 1 from onboarding_resources r where r.id = rec_id and (
        is_exec() or my_dept() in ('Human Resources', 'Sales')
        or (not is_client() and r.audience in ('staff', 'both'))
        or (is_client() and r.audience in ('client', 'both'))
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
  elsif kind = 'onboarding_resources' then
    return is_exec();
  end if;
  return my_role() not in ('intern', 'contractor');
end;
$$;
