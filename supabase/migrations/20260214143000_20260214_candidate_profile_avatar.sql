alter table public.candidate_profiles
  add column if not exists profile_image_file_name text,
  add column if not exists profile_image_path text,
  add column if not exists profile_image_mime_type text,
  add column if not exists profile_image_size_bytes bigint;

