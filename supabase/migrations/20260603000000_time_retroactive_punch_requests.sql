-- Suporte a "Registro de Ponto Retroativo".
--
-- Reusamos a tabela `time_adjustment_requests` para o fluxo de aprovação
-- (mesma RLS, mesmas notificações, mesmo audit), apenas extendendo-a com:
--
--   • `is_retroactive`            — distingue pedidos retroativos (criação de
--                                    batidas em data passada sem registro)
--                                    de pedidos de ajuste convencionais
--                                    (alteração de batida existente).
--   • `retro_entries`             — lista das batidas (`entryType` + `recordedAt`)
--                                    que serão criadas após aprovação.
--   • `created_time_entry_ids`    — preenchido na aprovação com os IDs das
--                                    `time_entries` criadas (ligação 1:N para
--                                    o histórico/lista de registros aprovados).

alter table public.time_adjustment_requests
  add column if not exists is_retroactive boolean not null default false,
  add column if not exists retro_entries jsonb not null default '[]'::jsonb,
  add column if not exists created_time_entry_ids uuid[] not null default '{}';

create index if not exists time_adjustment_requests_tenant_user_retro_idx
  on public.time_adjustment_requests (tenant_id, user_id, is_retroactive, target_date);

comment on column public.time_adjustment_requests.is_retroactive is
  'Quando true, o pedido representa criação retroativa de batidas (não ajuste). Após aprovação, são criadas as time_entries em retro_entries.';

comment on column public.time_adjustment_requests.retro_entries is
  'Array JSON de objectos { entryType, recordedAt } com as batidas a criar após aprovação. Vazio para pedidos de ajuste convencionais.';

comment on column public.time_adjustment_requests.created_time_entry_ids is
  'IDs das time_entries criadas após aprovação de pedido retroativo. Vazio enquanto pendente ou em pedidos de ajuste convencionais.';
