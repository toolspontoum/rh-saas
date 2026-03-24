-- Credenciais de IA da plataforma (backoffice / superadmin). Acesso apenas via service role.

create table public.platform_ai_settings (
  id smallint primary key default 1,
  constraint platform_ai_settings_single_row check (id = 1),
  openai_api_key text,
  openai_model text,
  gemini_api_key text,
  gemini_model text,
  updated_at timestamptz not null default now()
);

comment on table public.platform_ai_settings is
  'Chaves e modelos de IA (OpenAI/Gemini) configurados pelo superadmin. Fallback: variáveis de ambiente da API.';

create trigger trg_platform_ai_settings_updated_at
before update on public.platform_ai_settings
for each row execute function public.set_updated_at();

insert into public.platform_ai_settings (id) values (1) on conflict (id) do nothing;

alter table public.platform_ai_settings enable row level security;
