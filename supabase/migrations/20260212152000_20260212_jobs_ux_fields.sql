alter table public.jobs
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists salary numeric(12,2),
  add column if not exists expires_at date,
  add column if not exists screening_questions jsonb not null default '[]'::jsonb;
