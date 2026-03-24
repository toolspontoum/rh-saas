-- Core SaaS schema for v0.1.0
-- Scope: tenancy, plans/features, RBAC, audit trail, retention policy.

create extension if not exists "pgcrypto";

create type public.app_role as enum ('owner', 'admin', 'manager', 'analyst', 'employee', 'viewer');
create type public.subscription_status as enum ('trial', 'active', 'past_due', 'canceled');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  legal_name text not null,
  display_name text not null,
  tax_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.tenant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status public.subscription_status not null default 'trial',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, plan_id, starts_at)
);

create index tenant_subscriptions_tenant_idx on public.tenant_subscriptions (tenant_id);

create table public.tenant_features (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  feature_id uuid not null references public.feature_flags(id) on delete cascade,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, feature_id)
);

create index tenant_features_tenant_idx on public.tenant_features (tenant_id);

create table public.user_tenant_roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id, role)
);

create index user_tenant_roles_tenant_user_idx on public.user_tenant_roles (tenant_id, user_id);
create index user_tenant_roles_user_idx on public.user_tenant_roles (user_id);

create table public.retention_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  data_type text not null,
  retention_years int not null default 5 check (retention_years > 0),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index retention_policies_tenant_idx on public.retention_policies (tenant_id);
create unique index retention_policies_unique_tenant_type
  on public.retention_policies (tenant_id, data_type)
  where tenant_id is not null;
create unique index retention_policies_unique_default_type
  on public.retention_policies (data_type)
  where tenant_id is null;

create table public.audit_logs (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  action text not null,
  resource_type text not null,
  resource_id text,
  result text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_tenant_idx on public.audit_logs (tenant_id);
create index audit_logs_actor_idx on public.audit_logs (actor_user_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at);

create table public.anonymization_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  data_type text not null,
  target_before timestamptz not null,
  status text not null default 'pending',
  rows_affected int,
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create index anonymization_jobs_tenant_idx on public.anonymization_jobs (tenant_id);
create index anonymization_jobs_status_idx on public.anonymization_jobs (status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_tenants_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

create trigger trg_plans_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

create trigger trg_tenant_subscriptions_updated_at
before update on public.tenant_subscriptions
for each row execute function public.set_updated_at();

create trigger trg_tenant_features_updated_at
before update on public.tenant_features
for each row execute function public.set_updated_at();

create trigger trg_user_tenant_roles_updated_at
before update on public.user_tenant_roles
for each row execute function public.set_updated_at();

create trigger trg_retention_policies_updated_at
before update on public.retention_policies
for each row execute function public.set_updated_at();

create or replace function public.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_tenant_roles utr
    where utr.tenant_id = p_tenant_id
      and utr.user_id = auth.uid()
      and utr.is_active = true
  );
$$;

create or replace function public.is_tenant_admin(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_tenant_roles utr
    where utr.tenant_id = p_tenant_id
      and utr.user_id = auth.uid()
      and utr.is_active = true
      and utr.role in ('owner', 'admin')
  );
$$;

alter table public.tenants enable row level security;
alter table public.plans enable row level security;
alter table public.feature_flags enable row level security;
alter table public.tenant_subscriptions enable row level security;
alter table public.tenant_features enable row level security;
alter table public.user_tenant_roles enable row level security;
alter table public.retention_policies enable row level security;
alter table public.audit_logs enable row level security;
alter table public.anonymization_jobs enable row level security;

create policy "tenants_select_member"
on public.tenants for select
using (public.is_tenant_member(id));

create policy "tenants_update_admin"
on public.tenants for update
using (public.is_tenant_admin(id))
with check (public.is_tenant_admin(id));

create policy "plans_select_authenticated"
on public.plans for select
to authenticated
using (true);

create policy "feature_flags_select_authenticated"
on public.feature_flags for select
to authenticated
using (true);

create policy "tenant_subscriptions_select_member"
on public.tenant_subscriptions for select
using (public.is_tenant_member(tenant_id));

create policy "tenant_subscriptions_manage_admin"
on public.tenant_subscriptions for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

create policy "tenant_features_select_member"
on public.tenant_features for select
using (public.is_tenant_member(tenant_id));

create policy "tenant_features_manage_admin"
on public.tenant_features for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

create policy "user_tenant_roles_select_self_or_admin"
on public.user_tenant_roles for select
using (
  user_id = auth.uid()
  or public.is_tenant_admin(tenant_id)
);

create policy "user_tenant_roles_manage_admin"
on public.user_tenant_roles for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

create policy "retention_policies_select_member"
on public.retention_policies for select
using (
  tenant_id is null
  or public.is_tenant_member(tenant_id)
);

create policy "retention_policies_manage_admin"
on public.retention_policies for all
using (
  tenant_id is not null
  and public.is_tenant_admin(tenant_id)
)
with check (
  tenant_id is not null
  and public.is_tenant_admin(tenant_id)
);

create policy "audit_logs_select_member"
on public.audit_logs for select
using (public.is_tenant_member(tenant_id));

create policy "audit_logs_insert_member"
on public.audit_logs for insert
with check (public.is_tenant_member(tenant_id));

create policy "anonymization_jobs_select_member"
on public.anonymization_jobs for select
using (public.is_tenant_member(tenant_id));

create policy "anonymization_jobs_manage_admin"
on public.anonymization_jobs for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));
