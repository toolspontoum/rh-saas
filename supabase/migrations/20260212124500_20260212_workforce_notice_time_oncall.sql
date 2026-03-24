create type public.notice_target as enum ('all', 'employee', 'manager');
create type public.time_entry_type as enum ('clock_in', 'clock_out');
create type public.approval_status as enum ('pending', 'approved', 'rejected');

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  message text not null,
  target public.notice_target not null default 'all',
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notices_tenant_idx on public.notices (tenant_id);
create index notices_tenant_active_idx on public.notices (tenant_id, is_active);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  contract text,
  entry_type public.time_entry_type not null,
  recorded_at timestamptz not null,
  source text not null default 'web',
  note text,
  created_at timestamptz not null default now()
);

create index time_entries_tenant_idx on public.time_entries (tenant_id);
create index time_entries_tenant_user_idx on public.time_entries (tenant_id, user_id);
create index time_entries_tenant_recorded_idx on public.time_entries (tenant_id, recorded_at);

create table public.time_adjustment_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  target_date date not null,
  requested_time text not null,
  reason text not null,
  status public.approval_status not null default 'pending',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index time_adjustment_requests_tenant_idx on public.time_adjustment_requests (tenant_id);
create index time_adjustment_requests_tenant_user_idx on public.time_adjustment_requests (tenant_id, user_id);
create index time_adjustment_requests_tenant_status_idx on public.time_adjustment_requests (tenant_id, status);

create table public.oncall_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  contract text,
  oncall_date date not null,
  start_time text not null,
  end_time text not null,
  oncall_type text not null,
  note text,
  status public.approval_status not null default 'pending',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index oncall_entries_tenant_idx on public.oncall_entries (tenant_id);
create index oncall_entries_tenant_user_idx on public.oncall_entries (tenant_id, user_id);
create index oncall_entries_tenant_status_idx on public.oncall_entries (tenant_id, status);

create trigger trg_notices_updated_at
before update on public.notices
for each row execute function public.set_updated_at();

create trigger trg_time_adjustment_requests_updated_at
before update on public.time_adjustment_requests
for each row execute function public.set_updated_at();

create trigger trg_oncall_entries_updated_at
before update on public.oncall_entries
for each row execute function public.set_updated_at();

alter table public.notices enable row level security;
alter table public.time_entries enable row level security;
alter table public.time_adjustment_requests enable row level security;
alter table public.oncall_entries enable row level security;

create policy "notices_select_member"
on public.notices for select
using (public.is_tenant_member(tenant_id));

create policy "notices_manage_admin"
on public.notices for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

create policy "time_entries_select_member"
on public.time_entries for select
using (
  public.is_tenant_member(tenant_id)
  and (user_id = auth.uid() or public.is_tenant_admin(tenant_id))
);

create policy "time_entries_insert_member"
on public.time_entries for insert
with check (
  public.is_tenant_member(tenant_id)
  and user_id = auth.uid()
);

create policy "time_adjustment_requests_select_member"
on public.time_adjustment_requests for select
using (
  public.is_tenant_member(tenant_id)
  and (user_id = auth.uid() or public.is_tenant_admin(tenant_id))
);

create policy "time_adjustment_requests_insert_member"
on public.time_adjustment_requests for insert
with check (
  public.is_tenant_member(tenant_id)
  and user_id = auth.uid()
);

create policy "time_adjustment_requests_update_admin"
on public.time_adjustment_requests for update
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

create policy "oncall_entries_select_member"
on public.oncall_entries for select
using (
  public.is_tenant_member(tenant_id)
  and (user_id = auth.uid() or public.is_tenant_admin(tenant_id))
);

create policy "oncall_entries_insert_member"
on public.oncall_entries for insert
with check (
  public.is_tenant_member(tenant_id)
  and user_id = auth.uid()
);

create policy "oncall_entries_update_admin"
on public.oncall_entries for update
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

