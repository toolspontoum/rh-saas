-- Documentos exigidos na candidatura (espelha abas/tipos do colaborador)
alter table public.jobs
  add column if not exists document_requirements jsonb not null default '[]'::jsonb;

comment on column public.jobs.document_requirements is
  'Lista JSON: { id, docTab, docType, label? } — documentos que o candidato deve enviar na candidatura.';
