alter table public.job_applications
  add column if not exists screening_answers jsonb not null default '[]'::jsonb;

