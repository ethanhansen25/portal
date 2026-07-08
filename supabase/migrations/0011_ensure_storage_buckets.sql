-- ==========================================================================
-- Oakframe Media OS — re-ensure storage buckets + onboarding file kind (11/11)
-- "Bucket not found" on upload means the storage.buckets rows from 0004
-- never landed (skipped during setup, or an earlier statement in that file
-- errored before reaching the inserts). This re-asserts both buckets and is
-- safe to run any number of times, on any project state: bucket inserts are
-- idempotent, and every policy is dropped-then-recreated instead of assuming
-- it's missing.
--
-- Also extends attachment_visible()/attachment_writable() with an
-- 'onboarding' path kind (object path: onboarding/{assignment_id}/{filename})
-- so onboarding task attachments reuse the same shared 'attachments' bucket
-- as documents/resources/deliverables instead of introducing a new bucket.
-- ==========================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('avatars', 'avatars', true, 5242880)
on conflict (id) do update set public = true, file_size_limit = 5242880;

insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 524288000)
on conflict (id) do update set public = false, file_size_limit = 524288000;

-- ------------------------------------------------------------------ avatars
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_write_own_folder" on storage.objects;
create policy "avatars_write_own_folder" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_update_own_folder" on storage.objects;
create policy "avatars_update_own_folder" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_delete_own_folder" on storage.objects;
create policy "avatars_delete_own_folder" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- --------------------------------------------------------------- attachments
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
        is_exec() or my_dept() = 'Human Resources' or my_role() = 'dept_head' or a.profile_id = auth.uid()
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
    return is_exec() or my_dept() = 'Human Resources' or my_role() = 'dept_head';
  end if;
  return my_role() not in ('intern', 'contractor');
end;
$$;

drop policy if exists "attachments_select" on storage.objects;
create policy "attachments_select" on storage.objects for select
  using (bucket_id = 'attachments' and attachment_visible(name));
drop policy if exists "attachments_insert" on storage.objects;
create policy "attachments_insert" on storage.objects for insert
  with check (bucket_id = 'attachments' and attachment_writable(name));
drop policy if exists "attachments_update" on storage.objects;
create policy "attachments_update" on storage.objects for update
  using (bucket_id = 'attachments' and attachment_writable(name));
drop policy if exists "attachments_delete" on storage.objects;
create policy "attachments_delete" on storage.objects for delete
  using (bucket_id = 'attachments' and (attachment_writable(name) or is_exec()));
