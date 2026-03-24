alter table public.notices
  add column if not exists recipient_user_ids uuid[] null;

create table if not exists public.notice_attachments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  notice_id uuid not null references public.notices(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_notice_attachments_tenant_notice
  on public.notice_attachments (tenant_id, notice_id, created_at desc);

create index if not exists idx_notices_recipient_user_ids
  on public.notices using gin (recipient_user_ids);
