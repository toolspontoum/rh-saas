create type public.job_status as enum ('draft', 'published', 'closed');
create type public.application_status as enum ('submitted', 'in_review', 'approved', 'rejected');

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  description text not null,
  department text,
  location text,
  employment_type text,
  status public.job_status not null default 'draft',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jobs_tenant_idx on public.jobs (tenant_id);
create index jobs_tenant_status_idx on public.jobs (tenant_id, status);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  cpf text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, email)
);

create index candidates_tenant_idx on public.candidates (tenant_id);
create index candidates_tenant_name_idx on public.candidates (tenant_id, full_name);

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  status public.application_status not null default 'submitted',
  cover_letter text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, job_id, candidate_id)
);

create index job_applications_tenant_idx on public.job_applications (tenant_id);
create index job_applications_job_idx on public.job_applications (job_id);
create index job_applications_candidate_idx on public.job_applications (candidate_id);

create trigger trg_jobs_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

create trigger trg_candidates_updated_at
before update on public.candidates
for each row execute function public.set_updated_at();

create trigger trg_job_applications_updated_at
before update on public.job_applications
for each row execute function public.set_updated_at();

alter table public.jobs enable row level security;
alter table public.candidates enable row level security;
alter table public.job_applications enable row level security;

create policy "jobs_select_member"
on public.jobs for select
using (public.is_tenant_member(tenant_id));

create policy "jobs_manage_admin"
on public.jobs for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

create policy "candidates_select_member"
on public.candidates for select
using (public.is_tenant_member(tenant_id));

create policy "candidates_manage_admin"
on public.candidates for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

create policy "job_applications_select_member"
on public.job_applications for select
using (public.is_tenant_member(tenant_id));

create policy "job_applications_manage_admin"
on public.job_applications for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));
