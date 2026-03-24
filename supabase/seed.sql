-- Baseline seed for local development (v0.1.0).
-- Safe to rerun with upsert behavior on unique keys.

insert into public.plans (code, name, description)
values
  ('starter', 'Starter', 'Plano base para operacao inicial.'),
  ('pro', 'Pro', 'Plano intermediario com modulos avancados.'),
  ('enterprise', 'Enterprise', 'Plano completo com governanca expandida.')
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    updated_at = now();

insert into public.feature_flags (code, name, description)
values
  ('mod_recruitment', 'Recrutamento', 'Modulo de vagas e candidaturas.'),
  ('mod_documents', 'Documentos', 'Gestao de documentos por colaborador e RH.'),
  ('mod_payslips', 'Contracheques', 'Pagina dedicada de contracheques e envios em lote.'),
  ('mod_time_tracking', 'Folha de ponto', 'Registro, ajuste e aprovacao de ponto.'),
  ('mod_oncall', 'Sobreaviso', 'Registro e aprovacao de sobreaviso.')
on conflict (code) do update
set name = excluded.name,
    description = excluded.description;

insert into public.retention_policies (tenant_id, data_type, retention_years, is_default)
values
  (null, 'documents', 5, true),
  (null, 'payslips', 5, true),
  (null, 'time_entries', 5, true),
  (null, 'audit_logs', 5, true)
on conflict (data_type) where tenant_id is null do update
set retention_years = excluded.retention_years,
    is_default = excluded.is_default,
    updated_at = now();
