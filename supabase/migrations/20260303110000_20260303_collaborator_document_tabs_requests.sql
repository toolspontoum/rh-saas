alter table public.document_requests
  add column if not exists employee_user_id uuid references auth.users(id) on delete set null,
  add column if not exists doc_tab text not null default 'docs_avulsos',
  add column if not exists doc_type text not null default 'documentos_diversos';

create index if not exists document_requests_tenant_employee_idx
  on public.document_requests (tenant_id, employee_user_id);

create index if not exists document_requests_tenant_tab_idx
  on public.document_requests (tenant_id, doc_tab);

alter table public.documents
  add column if not exists request_id uuid references public.document_requests(id) on delete set null,
  add column if not exists doc_tab text,
  add column if not exists doc_type text,
  add column if not exists source text;

create index if not exists documents_tenant_request_idx
  on public.documents (tenant_id, request_id);

create index if not exists documents_tenant_tab_idx
  on public.documents (tenant_id, doc_tab);

update public.documents
set doc_tab = coalesce(doc_tab, category)
where doc_tab is null;

