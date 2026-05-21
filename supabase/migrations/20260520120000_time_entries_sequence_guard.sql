-- Garante que as batidas de ponto seguem a sequência válida do ciclo
-- de trabalho, independentemente de fuso horário ou data civil:
--   clock_in  → lunch_out | clock_out
--   lunch_out → lunch_in
--   lunch_in  → clock_out
--   clock_out → clock_in (inicia novo ciclo, mesmo no mesmo dia: jornada nocturna)
--
-- Defesa em profundidade: o serviço aplicacional já valida, mas uma
-- trigger BEFORE INSERT garante atomicidade contra race conditions
-- (cliques duplicados, retries de rede, requisições paralelas).
--
-- A trigger toma o último entry do colaborador no mesmo tenant cujo
-- recorded_at é menor ou igual ao novo recorded_at e bloqueia a tupla
-- com FOR UPDATE, prevenindo inserções concorrentes na mesma janela.
--
-- Os duplicados/inconsistências históricas são preservados — a regra
-- só passa a aplicar-se a inserções futuras.

create or replace function public.fn_time_entries_validate_sequence()
returns trigger
language plpgsql
as $$
declare
  last_type public.time_entry_type;
begin
  -- Lock pessimista por colaborador+tenant para que requisições
  -- concorrentes sejam serializadas e ambas vejam o mesmo "último entry".
  select entry_type
    into last_type
    from public.time_entries
   where tenant_id = NEW.tenant_id
     and user_id = NEW.user_id
     and recorded_at <= NEW.recorded_at
   order by recorded_at desc, created_at desc
   limit 1
   for update;

  -- Regras de transição. Quando last_type é NULL, só clock_in é permitido.
  if last_type is null then
    if NEW.entry_type <> 'clock_in' then
      raise exception 'INVALID_TIME_ENTRY_SEQUENCE'
        using errcode = 'check_violation',
              hint = format('Esperado clock_in, recebido %s', NEW.entry_type);
    end if;
  elsif last_type = 'clock_in' then
    if NEW.entry_type not in ('lunch_out', 'clock_out') then
      raise exception 'INVALID_TIME_ENTRY_SEQUENCE'
        using errcode = 'check_violation',
              hint = format('Apos clock_in, esperado lunch_out ou clock_out, recebido %s', NEW.entry_type);
    end if;
  elsif last_type = 'lunch_out' then
    if NEW.entry_type <> 'lunch_in' then
      raise exception 'INVALID_TIME_ENTRY_SEQUENCE'
        using errcode = 'check_violation',
              hint = format('Apos lunch_out, esperado lunch_in, recebido %s', NEW.entry_type);
    end if;
  elsif last_type = 'lunch_in' then
    if NEW.entry_type <> 'clock_out' then
      raise exception 'INVALID_TIME_ENTRY_SEQUENCE'
        using errcode = 'check_violation',
              hint = format('Apos lunch_in, esperado clock_out, recebido %s', NEW.entry_type);
    end if;
  elsif last_type = 'clock_out' then
    if NEW.entry_type <> 'clock_in' then
      raise exception 'INVALID_TIME_ENTRY_SEQUENCE'
        using errcode = 'check_violation',
              hint = format('Apos clock_out, esperado clock_in, recebido %s', NEW.entry_type);
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_time_entries_validate_sequence on public.time_entries;

create trigger trg_time_entries_validate_sequence
before insert on public.time_entries
for each row
execute function public.fn_time_entries_validate_sequence();

comment on function public.fn_time_entries_validate_sequence() is
  'Valida sequencia clock_in/lunch_out/lunch_in/clock_out por usuario+tenant. Atomico (FOR UPDATE) contra race conditions.';
