alter table public.tenant_user_profiles
  add column if not exists employee_tags text[] not null default '{}';

create index if not exists tenant_user_profiles_tenant_employee_tags_gin_idx
  on public.tenant_user_profiles using gin (employee_tags);
