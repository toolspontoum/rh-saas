alter table public.time_adjustment_requests
  add column if not exists time_entry_id uuid references public.time_entries(id) on delete set null,
  add column if not exists target_entry_type public.time_entry_type,
  add column if not exists requested_recorded_at timestamptz,
  add column if not exists original_recorded_at timestamptz,
  add column if not exists change_log jsonb not null default '[]'::jsonb;

create index if not exists time_adjustment_requests_tenant_entry_idx
  on public.time_adjustment_requests (tenant_id, time_entry_id);

create table if not exists public.time_entry_change_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  time_entry_id uuid not null references public.time_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  changed_by uuid references auth.users(id) on delete set null,
  source text not null default 'manual_edit',
  previous_recorded_at timestamptz not null,
  new_recorded_at timestamptz not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists time_entry_change_logs_tenant_entry_idx
  on public.time_entry_change_logs (tenant_id, time_entry_id, created_at desc);

create index if not exists time_entry_change_logs_tenant_user_idx
  on public.time_entry_change_logs (tenant_id, user_id, created_at desc);

alter table public.time_entry_change_logs enable row level security;

create policy "time_entry_change_logs_select_member"
on public.time_entry_change_logs for select
using (
  public.is_tenant_member(tenant_id)
  and (user_id = auth.uid() or public.is_tenant_admin(tenant_id))
);

create policy "time_entry_change_logs_manage_admin"
on public.time_entry_change_logs for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

