-- Force PostgREST schema cache reload after oncall refactor rollout.
select pg_notify('pgrst', 'reload schema');
