create table if not exists public.time_report_closures (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text,
  user_cpf text,
  department text,
  position_title text,
  contract_type text,
  reference_month text not null check (reference_month ~ '^\d{4}-\d{2}$'),
  from_date date not null,
  to_date date not null,
  summary_json jsonb not null default '{}'::jsonb,
  entries_json jsonb not null default '[]'::jsonb,
  closed_by uuid not null references auth.users(id) on delete restrict,
  closed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists time_report_closures_tenant_closed_at_idx
  on public.time_report_closures (tenant_id, closed_at desc);

create index if not exists time_report_closures_tenant_user_month_idx
  on public.time_report_closures (tenant_id, user_id, reference_month);

alter table public.time_report_closures enable row level security;

create policy "time_report_closures_select_member"
on public.time_report_closures for select
using (public.is_tenant_member(tenant_id));

create policy "time_report_closures_insert_admin"
on public.time_report_closures for insert
with check (public.is_tenant_admin(tenant_id));
