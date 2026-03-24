create type public.tenant_user_status as enum ('active', 'inactive', 'offboarded');

create table public.tenant_user_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text,
  status public.tenant_user_status not null default 'active',
  offboard_reason text,
  offboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index tenant_user_profiles_tenant_idx on public.tenant_user_profiles (tenant_id);
create index tenant_user_profiles_tenant_status_idx on public.tenant_user_profiles (tenant_id, status);

create trigger trg_tenant_user_profiles_updated_at
before update on public.tenant_user_profiles
for each row execute function public.set_updated_at();

alter table public.tenant_user_profiles enable row level security;

create policy "tenant_user_profiles_select_member"
on public.tenant_user_profiles for select
using (public.is_tenant_member(tenant_id));

create policy "tenant_user_profiles_manage_admin"
on public.tenant_user_profiles for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

insert into public.tenant_user_profiles (tenant_id, user_id, status)
select distinct utr.tenant_id, utr.user_id, 'active'::public.tenant_user_status
from public.user_tenant_roles utr
on conflict (tenant_id, user_id) do nothing;

