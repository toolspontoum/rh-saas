create table public.candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  cpf text,
  city text,
  state text,
  linkedin_url text,
  portfolio_url text,
  professional_summary text,
  desired_position text,
  salary_expectation numeric(12,2),
  years_experience integer,
  skills text[] not null default '{}',
  education jsonb not null default '[]'::jsonb,
  experience jsonb not null default '[]'::jsonb,
  resume_file_name text,
  resume_file_path text,
  resume_mime_type text,
  resume_size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_candidate_profiles_updated_at
before update on public.candidate_profiles
for each row execute function public.set_updated_at();

alter table public.candidate_profiles enable row level security;

create policy "candidate_profiles_select_own"
on public.candidate_profiles for select
using (user_id = auth.uid());

create policy "candidate_profiles_insert_own"
on public.candidate_profiles for insert
with check (user_id = auth.uid());

create policy "candidate_profiles_update_own"
on public.candidate_profiles for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

alter table public.candidates
  add column user_id uuid references auth.users(id) on delete set null;

create unique index candidates_tenant_user_uidx
  on public.candidates (tenant_id, user_id)
  where user_id is not null;

create index candidates_user_idx on public.candidates (user_id);
