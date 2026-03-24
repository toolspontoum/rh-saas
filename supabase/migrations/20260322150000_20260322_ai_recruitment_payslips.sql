-- IA: critérios na vaga, análise de candidatura, fila de vínculo de contracheques por CPF

alter table public.tenants
  add column if not exists ai_provider text;

alter table public.tenants
  add constraint tenants_ai_provider_chk
  check (ai_provider is null or ai_provider in ('openai', 'gemini'));

comment on column public.tenants.ai_provider is
  'Override do provedor de IA do tenant: openai ou gemini. NULL usa variável de ambiente AI_PROVIDER_DEFAULT.';

alter table public.jobs
  add column if not exists ai_screening_criteria jsonb not null default '{}'::jsonb;

comment on column public.jobs.ai_screening_criteria is
  'Critérios para análise IA: keywords, formation, certificates, experienceRole, experienceMonths.';

alter table public.job_applications
  add column if not exists ai_match_score smallint,
  add column if not exists ai_match_report jsonb,
  add column if not exists ai_analysis_status text not null default 'pending',
  add column if not exists ai_analysis_error text,
  add column if not exists ai_analyzed_at timestamptz;

alter table public.job_applications
  add constraint job_applications_ai_match_score_chk
  check (ai_match_score is null or (ai_match_score >= 0 and ai_match_score <= 100));

comment on column public.job_applications.ai_analysis_status is
  'pending | processing | completed | failed | skipped';

alter table public.payslips
  add column if not exists ai_link_status text,
  add column if not exists ai_link_error text,
  add column if not exists extracted_cpf text;

comment on column public.payslips.ai_link_status is
  'queued | processing | linked | failed — fila de vínculo automático por CPF (PDF).';
