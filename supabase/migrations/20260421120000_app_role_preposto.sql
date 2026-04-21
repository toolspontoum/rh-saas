-- Papel Preposto: responsável pelo contrato (empresa/projeto), acesso interno só ao projeto atribuído.

alter type public.app_role add value if not exists 'preposto';

alter table public.tenant_companies
  add column if not exists preposto_user_id uuid null;

comment on column public.tenant_companies.preposto_user_id is
  'Utilizador (auth.users) designado preposto deste contrato; um utilizador só deve ser preposto de um contrato por tenant.';

-- Um utilizador só pode ser preposto de um contrato por tenant.
create unique index if not exists tenant_companies_preposto_user_per_tenant_uidx
  on public.tenant_companies (tenant_id, preposto_user_id)
  where preposto_user_id is not null;
