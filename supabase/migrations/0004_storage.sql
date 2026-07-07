-- ==========================================================================
-- Oakframe Media OS — file storage (4/4)
-- Two buckets:
--   avatars      — public-read (so <img> tags just work with no signed URL),
--                  write restricted to the user's own folder.
--   attachments  — private; backs both `resources` and `documents`. Storage
--                  RLS re-checks the same visibility rules as the owning
--                  table row (confidential flag, dept/role gates) by parsing
--                  the record id out of the object path, so a private file
--                  can't be fetched just by guessing/enumerating its URL.
-- ==========================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('avatars', 'avatars', true, 5242880)       -- 5MB
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 524288000)  -- 500MB
on conflict (id) do nothing;

-- ------------------------------------------------------------------ avatars
-- Object path within the bucket: {profile_id}/{filename}
create policy "avatars_public_read" on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_write_own_folder" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_update_own_folder" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_delete_own_folder" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- --------------------------------------------------------------- attachments
-- Object path within the bucket: resources/{resource_id}/{filename}
--                             or  documents/{document_id}/{filename}
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
  end if;
  return false;
end;
$$;

create or replace function attachment_writable(path text) returns boolean
language sql security definer stable set search_path = public as $$
  select my_role() not in ('intern', 'contractor')
$$;

create policy "attachments_select" on storage.objects for select
  using (bucket_id = 'attachments' and attachment_visible(name));
create policy "attachments_insert" on storage.objects for insert
  with check (bucket_id = 'attachments' and attachment_writable(name));
create policy "attachments_update" on storage.objects for update
  using (bucket_id = 'attachments' and attachment_writable(name));
create policy "attachments_delete" on storage.objects for delete
  using (bucket_id = 'attachments' and (attachment_writable(name) or is_exec()));

-- ------------------------------------------------------------ profile photo
alter table profiles add column if not exists avatar_url text;
