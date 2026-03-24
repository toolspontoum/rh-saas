alter table public.tenant_user_profiles
  add column if not exists cpf text,
  add column if not exists phone text,
  add column if not exists personal_email text;

create index if not exists tenant_user_profiles_tenant_cpf_idx
  on public.tenant_user_profiles (tenant_id, cpf);

create unique index if not exists tenant_user_profiles_tenant_cpf_uidx
  on public.tenant_user_profiles (tenant_id, cpf)
  where cpf is not null and length(trim(cpf)) > 0;

alter table public.documents
  add column if not exists employee_user_id uuid references auth.users(id) on delete set null;

alter table public.payslips
  add column if not exists employee_user_id uuid references auth.users(id) on delete set null;

create index if not exists documents_tenant_employee_user_idx
  on public.documents (tenant_id, employee_user_id);

create index if not exists payslips_tenant_employee_user_idx
  on public.payslips (tenant_id, employee_user_id);
