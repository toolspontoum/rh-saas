-- Fluxo "Enviar para assinatura" não usa coluna dedicada: o backend infere
-- workflow = signature quando existe documento com source = 'signature_template'.
-- Mantido apenas reload do cache do PostgREST (útil após alterações de schema).
select pg_notify('pgrst', 'reload schema');
