-- Pré-cadastro de colaboradores (importação assistida por IA) e histórico de lotes

create table public.tenant_employee_import_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  company_id uuid references public.tenant_companies (id) on delete set null,
  created_by_user_id uuid not null,
  created_at timestamptz not null default now(),
  expected_doc_count int not null default 0,
  processed_ok int not null default 0,
  prereg_created int not null default 0,
  error_count int not null default 0
);

create index tenant_employee_import_batches_tenant_idx
  on public.tenant_employee_import_batches (tenant_id, created_at desc);

create table public.tenant_employee_preregistrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  company_id uuid references public.tenant_companies (id) on delete set null,
  batch_id uuid references public.tenant_employee_import_batches (id) on delete set null,
  created_by_user_id uuid not null,
  source_file_name text not null,
  source_mime_type text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'discarded')),
  payload jsonb not null default '{}'::jsonb,
  result_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tenant_employee_preregistrations_tenant_idx
  on public.tenant_employee_preregistrations (tenant_id, status, created_at desc);

create index tenant_employee_preregistrations_batch_idx
  on public.tenant_employee_preregistrations (batch_id);

create trigger trg_tenant_employee_preregistrations_updated_at
before update on public.tenant_employee_preregistrations
for each row execute function public.set_updated_at();

create table public.tenant_employee_import_batch_files (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.tenant_employee_import_batches (id) on delete cascade,
  file_name text not null,
  processed_at timestamptz not null default now(),
  status text not null check (status in ('ok', 'error')),
  error_message text,
  created_preregistration_ids uuid[] not null default '{}'::uuid[]
);

create index tenant_employee_import_batch_files_batch_idx
  on public.tenant_employee_import_batch_files (batch_id, processed_at desc);

alter table public.tenant_employee_import_batches enable row level security;
alter table public.tenant_employee_preregistrations enable row level security;
alter table public.tenant_employee_import_batch_files enable row level security;

create policy "tenant_employee_import_batches_admin"
on public.tenant_employee_import_batches for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

create policy "tenant_employee_preregistrations_admin"
on public.tenant_employee_preregistrations for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

create policy "tenant_employee_import_batch_files_admin"
on public.tenant_employee_import_batch_files for all
using (
  exists (
    select 1
    from public.tenant_employee_import_batches b
    where b.id = batch_id
      and public.is_tenant_admin(b.tenant_id)
  )
)
with check (
  exists (
    select 1
    from public.tenant_employee_import_batches b
    where b.id = batch_id
      and public.is_tenant_admin(b.tenant_id)
  )
);
