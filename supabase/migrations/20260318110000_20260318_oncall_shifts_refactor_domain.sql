do $$
begin
  create type public.oncall_shift_status as enum ('pending_ack', 'acknowledged', 'entry_registered', 'cancelled');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.oncall_shifts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scheduled_date date not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.oncall_shift_status not null default 'pending_ack',
  note text,
  linked_time_entry_id uuid references public.time_entries(id) on delete set null,
  linked_time_entry_at timestamptz,
  acknowledged_at timestamptz,
  acknowledged_by_user_id uuid references auth.users(id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by_user_id uuid references auth.users(id) on delete set null,
  cancel_reason text,
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists oncall_shifts_tenant_idx
  on public.oncall_shifts (tenant_id);

create index if not exists oncall_shifts_tenant_user_idx
  on public.oncall_shifts (tenant_id, user_id, scheduled_date desc);

create index if not exists oncall_shifts_tenant_status_idx
  on public.oncall_shifts (tenant_id, status);

create index if not exists oncall_shifts_tenant_scheduled_date_idx
  on public.oncall_shifts (tenant_id, scheduled_date desc);

create index if not exists oncall_shifts_tenant_department_idx
  on public.oncall_shifts (tenant_id, department);

create index if not exists oncall_shifts_tenant_position_idx
  on public.oncall_shifts (tenant_id, position_title);

create index if not exists oncall_shifts_tenant_contract_idx
  on public.oncall_shifts (tenant_id, contract_type);

create index if not exists oncall_shifts_tenant_cpf_idx
  on public.oncall_shifts (tenant_id, employee_cpf);

create index if not exists oncall_shifts_tenant_email_idx
  on public.oncall_shifts (tenant_id, employee_email);

create index if not exists oncall_shifts_tags_gin_idx
  on public.oncall_shifts using gin (employee_tags);

create trigger trg_oncall_shifts_updated_at
before update on public.oncall_shifts
for each row execute function public.set_updated_at();

create table if not exists public.oncall_shift_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  oncall_shift_id uuid not null references public.oncall_shifts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (
    event_type in (
      'created',
      'updated',
      'deleted',
      'acknowledged',
      'entry_registered',
      'entry_linked',
      'entry_unlinked',
      'status_changed',
      'note'
    )
  ),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists oncall_shift_events_tenant_shift_idx
  on public.oncall_shift_events (tenant_id, oncall_shift_id, created_at desc);

create index if not exists oncall_shift_events_tenant_user_idx
  on public.oncall_shift_events (tenant_id, user_id, created_at desc);

alter table public.time_entries
  add column if not exists oncall_shift_id uuid references public.oncall_shifts(id) on delete set null;

create index if not exists time_entries_tenant_oncall_shift_idx
  on public.time_entries (tenant_id, oncall_shift_id)
  where oncall_shift_id is not null;

alter table public.oncall_shifts enable row level security;
alter table public.oncall_shift_events enable row level security;

create policy "oncall_shifts_select_member"
on public.oncall_shifts for select
using (
  public.is_tenant_member(tenant_id)
  and (user_id = auth.uid() or public.is_tenant_admin(tenant_id))
);

create policy "oncall_shifts_insert_admin"
on public.oncall_shifts for insert
with check (public.is_tenant_admin(tenant_id));

create policy "oncall_shifts_update_member_or_admin"
on public.oncall_shifts for update
using (
  public.is_tenant_member(tenant_id)
  and (user_id = auth.uid() or public.is_tenant_admin(tenant_id))
)
with check (
  public.is_tenant_member(tenant_id)
  and (user_id = auth.uid() or public.is_tenant_admin(tenant_id))
);

create policy "oncall_shifts_delete_admin"
on public.oncall_shifts for delete
using (public.is_tenant_admin(tenant_id));

create policy "oncall_shift_events_select_member"
on public.oncall_shift_events for select
using (
  public.is_tenant_member(tenant_id)
  and (
    public.is_tenant_admin(tenant_id)
    or exists (
      select 1
      from public.oncall_shifts s
      where s.id = oncall_shift_id
        and s.user_id = auth.uid()
    )
  )
);

create policy "oncall_shift_events_manage_admin"
on public.oncall_shift_events for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

insert into public.oncall_shifts (
  id,
  tenant_id,
  user_id,
  scheduled_date,
  starts_at,
  ends_at,
  status,
  note,
  acknowledged_at,
  acknowledged_by_user_id,
  cancelled_at,
  cancelled_by_user_id,
  cancel_reason,
  employee_full_name,
  employee_email,
  employee_cpf,
  employee_phone,
  department,
  position_title,
  contract_type,
  employee_tags,
  created_by,
  created_at,
  updated_at
)
select
  oe.id,
  oe.tenant_id,
  oe.user_id,
  oe.oncall_date,
  ((oe.oncall_date::text || ' ' || oe.start_time)::timestamptz) as starts_at,
  (
    case
      when (oe.end_time::time < oe.start_time::time)
        then (((oe.oncall_date + 1)::text || ' ' || oe.end_time)::timestamptz)
      else ((oe.oncall_date::text || ' ' || oe.end_time)::timestamptz)
    end
  ) as ends_at,
  (
    case
      when oe.status = 'pending' then 'pending_ack'::public.oncall_shift_status
      when oe.status = 'approved' then 'acknowledged'::public.oncall_shift_status
      when oe.status = 'rejected' then 'cancelled'::public.oncall_shift_status
      else 'pending_ack'::public.oncall_shift_status
    end
  ) as status,
  oe.note,
  case when oe.status = 'approved' then oe.reviewed_at else null end as acknowledged_at,
  case when oe.status = 'approved' then oe.reviewed_by else null end as acknowledged_by_user_id,
  case when oe.status = 'rejected' then oe.reviewed_at else null end as cancelled_at,
  case when oe.status = 'rejected' then oe.reviewed_by else null end as cancelled_by_user_id,
  case when oe.status = 'rejected' then oe.review_note else null end as cancel_reason,
  tup.full_name as employee_full_name,
  coalesce(tup.personal_email, au.email) as employee_email,
  tup.cpf as employee_cpf,
  tup.phone as employee_phone,
  tup.department as department,
  tup.position_title as position_title,
  tup.contract_type as contract_type,
  coalesce(tup.employee_tags, '{}'::text[]) as employee_tags,
  oe.user_id as created_by,
  oe.created_at,
  oe.updated_at
from public.oncall_entries oe
left join public.tenant_user_profiles tup
  on tup.tenant_id = oe.tenant_id
 and tup.user_id = oe.user_id
left join auth.users au
  on au.id = oe.user_id
on conflict (id) do nothing;

insert into public.oncall_shift_events (
  tenant_id,
  oncall_shift_id,
  user_id,
  actor_user_id,
  event_type,
  payload,
  created_at
)
select
  s.tenant_id,
  s.id,
  s.user_id,
  s.created_by,
  'created',
  jsonb_build_object(
    'origin', 'backfill_oncall_entries',
    'legacyStatus',
    (
      select oe.status
      from public.oncall_entries oe
      where oe.id = s.id
      limit 1
    )
  ),
  s.created_at
from public.oncall_shifts s
where not exists (
  select 1
  from public.oncall_shift_events e
  where e.oncall_shift_id = s.id
    and e.event_type = 'created'
);
