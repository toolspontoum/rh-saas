-- Candidatura retirada pelo candidato (mantém registo para o tenant)
alter type public.application_status add value if not exists 'withdrawn';

-- Colaborador "excluído": dados anonimizados, oculto na listagem normal
alter table public.tenant_user_profiles
  add column if not exists data_purged_at timestamptz null;

comment on column public.tenant_user_profiles.data_purged_at is
  'Quando preenchido, o colaborador foi removido da visão normal; superadmin da plataforma continua a ver registo anonimizado.';
