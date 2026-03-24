create type public.document_request_status as enum ('open', 'in_progress', 'completed', 'canceled');

create table public.document_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  collaborator_name text not null,
  collaborator_email text not null,
  contract text,
  title text not null,
  details text,
  status public.document_request_status not null default 'open',
  requested_by uuid references auth.users(id),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index document_requests_tenant_idx on public.document_requests (tenant_id);
create index document_requests_tenant_status_idx on public.document_requests (tenant_id, status);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  collaborator_name text not null,
  collaborator_email text not null,
  contract text,
  category text not null,
  file_name text not null,
  file_path text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_tenant_idx on public.documents (tenant_id);
create index documents_tenant_contract_idx on public.documents (tenant_id, contract);
create index documents_tenant_email_idx on public.documents (tenant_id, collaborator_email);

create table public.payslip_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  contract text,
  reference_month text not null,
  source_type text not null default 'manual',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index payslip_batches_tenant_idx on public.payslip_batches (tenant_id);

create table public.payslips (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  batch_id uuid references public.payslip_batches(id) on delete set null,
  collaborator_name text not null,
  collaborator_email text not null,
  contract text,
  reference_month text not null,
  file_name text not null,
  file_path text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payslips_tenant_idx on public.payslips (tenant_id);
create index payslips_tenant_contract_idx on public.payslips (tenant_id, contract);
create index payslips_tenant_reference_idx on public.payslips (tenant_id, reference_month);
create index payslips_tenant_email_idx on public.payslips (tenant_id, collaborator_email);

create trigger trg_document_requests_updated_at
before update on public.document_requests
for each row execute function public.set_updated_at();

create trigger trg_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create trigger trg_payslips_updated_at
before update on public.payslips
for each row execute function public.set_updated_at();

alter table public.document_requests enable row level security;
alter table public.documents enable row level security;
alter table public.payslip_batches enable row level security;
alter table public.payslips enable row level security;

create policy "document_requests_select_member"
on public.document_requests for select
using (public.is_tenant_member(tenant_id));

create policy "document_requests_manage_admin"
on public.document_requests for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

create policy "documents_select_member"
on public.documents for select
using (public.is_tenant_member(tenant_id));

create policy "documents_manage_admin"
on public.documents for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

create policy "payslip_batches_select_member"
on public.payslip_batches for select
using (public.is_tenant_member(tenant_id));

create policy "payslip_batches_manage_admin"
on public.payslip_batches for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

create policy "payslips_select_member"
on public.payslips for select
using (public.is_tenant_member(tenant_id));

create policy "payslips_manage_admin"
on public.payslips for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));
