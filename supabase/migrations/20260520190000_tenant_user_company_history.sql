-- Histórico de vínculos de colaboradores a empresas/projetos (tenant_companies).
--
-- Objectivo: ao desvincular um colaborador, ele pode passar a candidato (sem
-- empresa activa) sem perder o histórico (documentos, batidas, holerites…) e
-- continuar a consultar os dados da empresa antiga. Quando for vinculado de
-- novo, ganha um histórico de vínculos múltiplos. A tabela
-- tenant_user_profiles continua única por (tenant_id, user_id) — só uma
-- empresa "activa" no momento.

create table if not exists public.tenant_user_company_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.tenant_companies(id) on delete cascade,
  linked_at timestamptz not null default now(),
  unlinked_at timestamptz,
  linked_by_user_id uuid references auth.users(id) on delete set null,
  unlinked_by_user_id uuid references auth.users(id) on delete set null,
  link_reason text,
  unlink_reason text,
  created_at timestamptz not null default now()
);

create index if not exists tenant_user_company_history_tenant_user_idx
  on public.tenant_user_company_history (tenant_id, user_id);
create index if not exists tenant_user_company_history_tenant_company_idx
  on public.tenant_user_company_history (tenant_id, company_id);

-- Apenas um vínculo "aberto" (unlinked_at IS NULL) por (tenant_id, user_id)
-- para evitar duplicação de período activo. Índice parcial UNIQUE.
create unique index if not exists tenant_user_company_history_open_link_unique
  on public.tenant_user_company_history (tenant_id, user_id)
  where unlinked_at is null;

-- ---------- Backfill ----------
-- Para cada colaborador com role 'employee' activo (perfil em status 'active'),
-- cria um vínculo "aberto" referente à empresa actual.
insert into public.tenant_user_company_history (tenant_id, user_id, company_id, linked_at)
select
  p.tenant_id,
  p.user_id,
  p.company_id,
  coalesce(p.admission_date::timestamptz, p.created_at, now())
from public.tenant_user_profiles p
join public.user_tenant_roles r
  on r.tenant_id = p.tenant_id
 and r.user_id = p.user_id
 and r.role = 'employee'
 and r.is_active is true
where p.status = 'active'
  and p.company_id is not null
on conflict do nothing;

-- Para offboarded com company_id ainda preenchido, cria vínculo fechado
-- (linked_at antigo, unlinked_at = offboarded_at). Sem conflict porque
-- só temos UNIQUE para open links.
insert into public.tenant_user_company_history (
  tenant_id, user_id, company_id, linked_at, unlinked_at, unlink_reason
)
select
  p.tenant_id,
  p.user_id,
  p.company_id,
  coalesce(p.admission_date::timestamptz, p.created_at, now()),
  coalesce(p.offboarded_at, now()),
  p.offboard_reason
from public.tenant_user_profiles p
where p.status = 'offboarded'
  and p.company_id is not null
  and not exists (
    select 1
      from public.tenant_user_company_history h
     where h.tenant_id = p.tenant_id
       and h.user_id = p.user_id
       and h.company_id = p.company_id
  );

-- ---------- RLS ----------
alter table public.tenant_user_company_history enable row level security;

-- Membros do tenant podem ler entradas do tenant (filtros adicionais no
-- service: o próprio user vê apenas as suas; gestores veem todas).
create policy "tenant_user_company_history_select_member"
on public.tenant_user_company_history for select
using (public.is_tenant_member(tenant_id));

-- Só admins gravam directamente (o caminho normal é via service-role do API).
create policy "tenant_user_company_history_manage_admin"
on public.tenant_user_company_history for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

comment on table public.tenant_user_company_history is
  'Histórico de vínculos de colaboradores a empresas/projetos (tenant_companies). Permite consultar dados de projetos passados após desvínculo.';
