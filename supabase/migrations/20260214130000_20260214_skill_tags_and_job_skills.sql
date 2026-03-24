create table public.skill_tags (
  id uuid primary key default gen_random_uuid(),
  normalized text not null unique,
  label text not null,
  created_by_user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index skill_tags_label_idx on public.skill_tags (label);

alter table public.jobs
  add column if not exists skills text[] not null default '{}';

create index if not exists jobs_skills_gin_idx on public.jobs using gin (skills);

alter table public.skill_tags enable row level security;

create policy "skill_tags_select_authenticated"
on public.skill_tags for select
to authenticated
using (true);

create policy "skill_tags_insert_authenticated"
on public.skill_tags for insert
to authenticated
with check (true);
