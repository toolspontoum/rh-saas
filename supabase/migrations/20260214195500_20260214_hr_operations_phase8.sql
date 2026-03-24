alter table public.tenant_user_profiles
  add column if not exists department text,
  add column if not exists position_title text,
  add column if not exists contract_type text,
  add column if not exists admission_date date,
  add column if not exists base_salary numeric(12,2);

create table if not exists public.employee_shift_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  daily_work_minutes int not null check (daily_work_minutes > 0 and daily_work_minutes <= 1440),
  weekly_work_minutes int check (weekly_work_minutes is null or (weekly_work_minutes > 0 and weekly_work_minutes <= 10080)),
  lunch_break_minutes int not null default 60 check (lunch_break_minutes >= 0 and lunch_break_minutes <= 600),
  overtime_percent numeric(5,2) not null default 50 check (overtime_percent >= 0 and overtime_percent <= 300),
  monthly_work_minutes int not null default 13200 check (monthly_work_minutes > 0 and monthly_work_minutes <= 60000),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employee_shift_templates_tenant_idx
  on public.employee_shift_templates (tenant_id, is_active);

create trigger trg_employee_shift_templates_updated_at
before update on public.employee_shift_templates
for each row execute function public.set_updated_at();

create table if not exists public.employee_shift_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  shift_template_id uuid not null references public.employee_shift_templates(id) on delete restrict,
  starts_at date not null,
  ends_at date,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create unique index if not exists employee_shift_assignments_tenant_user_active_uidx
  on public.employee_shift_assignments (tenant_id, user_id)
  where is_active = true;

create index if not exists employee_shift_assignments_tenant_user_idx
  on public.employee_shift_assignments (tenant_id, user_id, starts_at desc);

create trigger trg_employee_shift_assignments_updated_at
before update on public.employee_shift_assignments
for each row execute function public.set_updated_at();

create table if not exists public.employee_onboarding_requirements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  category text not null default 'geral',
  is_required boolean not null default true,
  applies_to_contract text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employee_onboarding_requirements_tenant_idx
  on public.employee_onboarding_requirements (tenant_id, is_required);

create trigger trg_employee_onboarding_requirements_updated_at
before update on public.employee_onboarding_requirements
for each row execute function public.set_updated_at();

create table if not exists public.employee_onboarding_submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  requirement_id uuid not null references public.employee_onboarding_requirements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','submitted','approved','rejected')),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, requirement_id, user_id)
);

create index if not exists employee_onboarding_submissions_tenant_user_idx
  on public.employee_onboarding_submissions (tenant_id, user_id, status);

create trigger trg_employee_onboarding_submissions_updated_at
before update on public.employee_onboarding_submissions
for each row execute function public.set_updated_at();

create table if not exists public.notice_reads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  notice_id uuid not null references public.notices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (tenant_id, notice_id, user_id)
);

create index if not exists notice_reads_tenant_notice_idx
  on public.notice_reads (tenant_id, notice_id);

create index if not exists notice_reads_tenant_user_idx
  on public.notice_reads (tenant_id, user_id);

alter table public.payslips
  add column if not exists acknowledged_at timestamptz,
  add column if not exists acknowledged_by_user_id uuid references auth.users(id) on delete set null;

do $$
begin
  alter type public.time_entry_type add value 'lunch_out';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type public.time_entry_type add value 'lunch_in';
exception
  when duplicate_object then null;
end $$;

