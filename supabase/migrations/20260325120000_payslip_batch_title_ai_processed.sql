-- Título do lote (upload em massa IA) e horário de conclusão do vínculo por IA.

alter table public.payslip_batches
  add column if not exists title text;

comment on column public.payslip_batches.title is
  'Título exibido ao usuário para o lote de contracheques (upload IA em massa).';

alter table public.payslips
  add column if not exists ai_processed_at timestamptz;

comment on column public.payslips.ai_processed_at is
  'Momento em que a IA concluiu o processamento (vínculo ou falha).';
