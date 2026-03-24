alter table public.candidates
  add column contract text,
  add column is_active boolean not null default true;

create index candidates_tenant_contract_idx on public.candidates (tenant_id, contract);
create index candidates_tenant_active_idx on public.candidates (tenant_id, is_active);

