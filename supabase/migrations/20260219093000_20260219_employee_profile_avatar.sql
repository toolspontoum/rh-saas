alter table public.tenant_user_profiles
  add column if not exists profile_image_file_name text,
  add column if not exists profile_image_path text,
  add column if not exists profile_image_mime_type text,
  add column if not exists profile_image_size_bytes bigint;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'employee-avatars',
  'employee-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;