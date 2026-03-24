-- Empresas/projetos dentro do tenant (sub-escopo para RH, operações, governança e vagas).

create table public.tenant_companies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  tax_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_companies_tax_unique_per_tenant unique (tenant_id, tax_id)
);

create index tenant_companies_tenant_idx on public.tenant_companies (tenant_id);

create trigger trg_tenant_companies_updated_at
before update on public.tenant_companies
for each row execute function public.set_updated_at();

insert into public.tenant_companies (tenant_id, name)
select
  t.id,
  coalesce(nullif(trim(t.display_name), ''), nullif(trim(t.legal_name), ''), 'Empresa principal')
from public.tenants t;

alter table public.tenant_companies enable row level security;

create policy "tenant_companies_select_member"
on public.tenant_companies for select
using (public.is_tenant_member(tenant_id));

create policy "tenant_companies_manage_admin"
on public.tenant_companies for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

-- ---------- Colunas company_id (backfill com empresa padrão do tenant) ----------

alter table public.jobs add column company_id uuid references public.tenant_companies(id) on delete restrict;
update public.jobs j
set company_id = (
  select c.id from public.tenant_companies c
  where c.tenant_id = j.tenant_id
  order by c.created_at asc
  limit 1
);
alter table public.jobs alter column company_id set not null;
create index jobs_tenant_company_idx on public.jobs (tenant_id, company_id);

alter table public.tenant_user_profiles add column company_id uuid references public.tenant_companies(id) on delete restrict;
update public.tenant_user_profiles p
set company_id = (
  select c.id from public.tenant_companies c
  where c.tenant_id = p.tenant_id
  order by c.created_at asc
  limit 1
);
alter table public.tenant_user_profiles alter column company_id set not null;
create index tenant_user_profiles_tenant_company_idx on public.tenant_user_profiles (tenant_id, company_id);

alter table public.document_requests add column company_id uuid references public.tenant_companies(id) on delete restrict;
update public.document_requests r
set company_id = (
  select c.id from public.tenant_companies c
  where c.tenant_id = r.tenant_id
  order by c.created_at asc
  limit 1
);
alter table public.document_requests alter column company_id set not null;
create index document_requests_tenant_company_idx on public.document_requests (tenant_id, company_id);

alter table public.documents add column company_id uuid references public.tenant_companies(id) on delete restrict;
update public.documents d
set company_id = (
  select c.id from public.tenant_companies c
  where c.tenant_id = d.tenant_id
  order by c.created_at asc
  limit 1
);
alter table public.documents alter column company_id set not null;
create index documents_tenant_company_idx on public.documents (tenant_id, company_id);

alter table public.payslip_batches add column company_id uuid references public.tenant_companies(id) on delete restrict;
update public.payslip_batches b
set company_id = (
  select c.id from public.tenant_companies c
  where c.tenant_id = b.tenant_id
  order by c.created_at asc
  limit 1
);
alter table public.payslip_batches alter column company_id set not null;

alter table public.payslips add column company_id uuid references public.tenant_companies(id) on delete restrict;
update public.payslips p
set company_id = (
  select c.id from public.tenant_companies c
  where c.tenant_id = p.tenant_id
  order by c.created_at asc
  limit 1
);
alter table public.payslips alter column company_id set not null;
create index payslips_tenant_company_idx on public.payslips (tenant_id, company_id);

alter table public.notices add column company_id uuid references public.tenant_companies(id) on delete restrict;
update public.notices n
set company_id = (
  select c.id from public.tenant_companies c
  where c.tenant_id = n.tenant_id
  order by c.created_at asc
  limit 1
);
alter table public.notices alter column company_id set not null;
create index notices_tenant_company_idx on public.notices (tenant_id, company_id);

alter table public.notice_attachments add column company_id uuid references public.tenant_companies(id) on delete restrict;
update public.notice_attachments a
set company_id = (
  select n.company_id from public.notices n where n.id = a.notice_id
);
alter table public.notice_attachments alter column company_id set not null;

alter table public.notice_reads add column company_id uuid references public.tenant_companies(id) on delete restrict;
update public.notice_reads r
set company_id = (
  select n.company_id from public.notices n where n.id = r.notice_id
);
alter table public.notice_reads alter column company_id set not null;

alter table public.time_entries add column company_id uuid references public.tenant_companies(id) on delete restrict;
update public.time_entries e
set company_id = (
  select c.id from public.tenant_companies c
  where c.tenant_id = e.tenant_id
  order by c.created_at asc
  limit 1
);
alter table public.time_entries alter column company_id set not null;
create index time_entries_tenant_company_idx on public.time_entries (tenant_id, company_id);

alter table public.time_adjustment_requests add column company_id uuid references public.tenant_companies(id) on delete restrict;
update public.time_adjustment_requests r
set company_id = (
  select c.id from public.tenant_companies c
  where c.tenant_id = r.tenant_id
  order by c.created_at asc
  limit 1
);
alter table public.time_adjustment_requests alter column company_id set not null;

alter table public.time_entry_change_logs add column company_id uuid references public.tenant_companies(id) on delete restrict;
update public.time_entry_change_logs l
set company_id = (
  select e.company_id from public.time_entries e where e.id = l.time_entry_id
);
alter table public.time_entry_change_logs alter column company_id set not null;

alter table public.oncall_entries add column company_id uuid references public.tenant_companies(id) on delete restrict;
update public.oncall_entries o
set company_id = (
  select c.id from public.tenant_companies c
  where c.tenant_id = o.tenant_id
  order by c.created_at asc
  limit 1
);
alter table public.oncall_entries alter column company_id set not null;

alter table public.oncall_shifts add column company_id uuid references public.tenant_companies(id) on delete restrict;
update public.oncall_shifts s
set company_id = (
  select c.id from public.tenant_companies c
  where c.tenant_id = s.tenant_id
  order by c.created_at asc
  limit 1
);
alter table public.oncall_shifts alter column company_id set not null;
create index oncall_shifts_tenant_company_idx on public.oncall_shifts (tenant_id, company_id);

alter table public.oncall_shift_events add column company_id uuid references public.tenant_companies(id) on delete restrict;
update public.oncall_shift_events ev
set company_id = (
  select s.company_id from public.oncall_shifts s where s.id = ev.oncall_shift_id
);
alter table public.oncall_shift_events alter column company_id set not null;

alter table public.tenant_work_rules add column company_id uuid references public.tenant_companies(id) on delete restrict;
update public.tenant_work_rules w
set company_id = (
  select c.id from public.tenant_companies c
  where c.tenant_id = w.tenant_id
  order by c.created_at asc
  limit 1
);
alter table public.tenant_work_rules alter column company_id set not null;
alter table public.tenant_work_rules drop constraint tenant_work_rules_tenant_id_key;
create unique index tenant_work_rules_tenant_company_uidx on public.tenant_work_rules (tenant_id, company_id);

alter table public.employee_shift_templates add column company_id uuid references public.tenant_companies(id) on delete restrict;
update public.employee_shift_templates t
set company_id = (
  select c.id from public.tenant_companies c
  where c.tenant_id = t.tenant_id
  order by c.created_at asc
  limit 1
);
alter table public.employee_shift_templates alter column company_id set not null;

alter table public.employee_shift_assignments add column company_id uuid references public.tenant_companies(id) on delete restrict;
update public.employee_shift_assignments a
set company_id = (
  select c.id from public.tenant_companies c
  where c.tenant_id = a.tenant_id
  order by c.created_at asc
  limit 1
);
alter table public.employee_shift_assignments alter column company_id set not null;

alter table public.employee_onboarding_requirements add column company_id uuid references public.tenant_companies(id) on delete restrict;
update public.employee_onboarding_requirements r
set company_id = (
  select c.id from public.tenant_companies c
  where c.tenant_id = r.tenant_id
  order by c.created_at asc
  limit 1
);
alter table public.employee_onboarding_requirements alter column company_id set not null;

alter table public.employee_onboarding_submissions add column company_id uuid references public.tenant_companies(id) on delete restrict;
update public.employee_onboarding_submissions s
set company_id = (
  select c.id from public.tenant_companies c
  where c.tenant_id = s.tenant_id
  order by c.created_at asc
  limit 1
);
alter table public.employee_onboarding_submissions alter column company_id set not null;

alter table public.time_report_closures add column company_id uuid references public.tenant_companies(id) on delete restrict;
update public.time_report_closures cl
set company_id = (
  select c.id from public.tenant_companies c
  where c.tenant_id = cl.tenant_id
  order by c.created_at asc
  limit 1
);
alter table public.time_report_closures alter column company_id set not null;

alter table public.audit_logs add column company_id uuid references public.tenant_companies(id) on delete restrict;
update public.audit_logs al
set company_id = (
  select c.id from public.tenant_companies c
  where c.tenant_id = al.tenant_id
  order by c.created_at asc
  limit 1
);
alter table public.audit_logs alter column company_id set not null;
create index audit_logs_tenant_company_idx on public.audit_logs (tenant_id, company_id);

alter table public.tenant_document_type_settings add column company_id uuid references public.tenant_companies(id) on delete restrict;
update public.tenant_document_type_settings s
set company_id = (
  select c.id from public.tenant_companies c
  where c.tenant_id = s.tenant_id
  order by c.created_at asc
  limit 1
);
alter table public.tenant_document_type_settings alter column company_id set not null;
alter table public.tenant_document_type_settings drop constraint tenant_document_type_settings_pkey;
alter table public.tenant_document_type_settings add primary key (tenant_id, company_id, platform_document_type_id);
