create table public.tenant_work_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  daily_work_minutes int not null default 480 check (daily_work_minutes > 0 and daily_work_minutes <= 1440),
  night_start time not null default '22:00',
  night_end time not null default '05:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_tenant_work_rules_updated_at
before update on public.tenant_work_rules
for each row execute function public.set_updated_at();

alter table public.tenant_work_rules enable row level security;

create policy "tenant_work_rules_select_member"
on public.tenant_work_rules for select
using (public.is_tenant_member(tenant_id));

create policy "tenant_work_rules_manage_admin"
on public.tenant_work_rules for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

insert into public.tenant_work_rules (tenant_id)
select t.id
from public.tenants t
on conflict (tenant_id) do nothing;

