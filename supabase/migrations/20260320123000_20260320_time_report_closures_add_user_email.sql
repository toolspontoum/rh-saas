alter table if exists public.time_report_closures
  add column if not exists user_email text;

create index if not exists time_report_closures_tenant_user_email_idx
  on public.time_report_closures (tenant_id, user_email);
