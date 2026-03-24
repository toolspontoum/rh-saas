-- Plataforma SaaS: superadmins (dono do produto), fora do escopo de tenant.

create table if not exists public.platform_superadmins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  invited_by_user_id uuid references auth.users (id) on delete set null
);

create index if not exists platform_superadmins_created_at_idx
  on public.platform_superadmins (created_at desc);

alter table public.platform_superadmins enable row level security;

-- Sem policies para clientes: acesso apenas via service role (API Node).

comment on table public.platform_superadmins is
  'Usuarios com acesso ao painel de plataforma (criar tenants e superadmins).';
