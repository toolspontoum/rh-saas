-- Férias (vacation_periods): períodos por colaborador, escopo por empresa.

do $$
begin
  create type public.vacation_period_status as enum ('active', 'cancelled');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.vacation_periods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  company_id uuid not null references public.tenant_companies(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  allow_time_punch boolean not null default false,
  status public.vacation_period_status not null default 'active',
  note text,
  employee_full_name text,
  employee_email text,
  employee_cpf text,
  employee_phone text,
  department text,
  position_title text,
  contract_type text,
  employee_tags text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by_user_id uuid references auth.users(id) on delete set null,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists vacation_periods_tenant_idx
  on public.vacation_periods (tenant_id);

create index if not exists vacation_periods_tenant_company_idx
  on public.vacation_periods (tenant_id, company_id);

create index if not exists vacation_periods_tenant_user_idx
  on public.vacation_periods (tenant_id, user_id, start_date desc);

create index if not exists vacation_periods_tenant_range_idx
  on public.vacation_periods (tenant_id, start_date, end_date);

create index if not exists vacation_periods_tenant_status_idx
  on public.vacation_periods (tenant_id, status);

create index if not exists vacation_periods_tenant_department_idx
  on public.vacation_periods (tenant_id, department);

create index if not exists vacation_periods_tenant_contract_idx
  on public.vacation_periods (tenant_id, contract_type);

create index if not exists vacation_periods_tags_gin_idx
  on public.vacation_periods using gin (employee_tags);

create trigger trg_vacation_periods_updated_at
before update on public.vacation_periods
for each row execute function public.set_updated_at();

alter table public.vacation_periods enable row level security;

create policy "vacation_periods_select_member"
on public.vacation_periods for select
using (
  public.is_tenant_member(tenant_id)
  and (user_id = auth.uid() or public.is_tenant_admin(tenant_id))
);

create policy "vacation_periods_insert_admin"
on public.vacation_periods for insert
with check (public.is_tenant_admin(tenant_id));

create policy "vacation_periods_update_admin"
on public.vacation_periods for update
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

create policy "vacation_periods_delete_admin"
on public.vacation_periods for delete
using (public.is_tenant_admin(tenant_id));
