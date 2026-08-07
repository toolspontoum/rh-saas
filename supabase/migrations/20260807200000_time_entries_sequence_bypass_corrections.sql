-- Correções manuais e aprovações retroativas não usam a regra de sequência do ponto ao vivo.
-- Batidas com source em ('admin_manual', 'retroactive_approval') passam pela trigger sem validação
-- de ciclo; o ponto ao vivo (web, web_selfie, etc.) continua protegido.

create or replace function public.fn_time_entries_validate_sequence()
returns trigger
language plpgsql
as $$
declare
  last_type public.time_entry_type;
begin
  -- Correção / registro retroativo: isolado da sequência do ponto ao vivo.
  if NEW.source in ('admin_manual', 'retroactive_approval') then
    return NEW;
  end if;

  select entry_type
    into last_type
    from public.time_entries
   where tenant_id = NEW.tenant_id
     and user_id = NEW.user_id
     and recorded_at <= NEW.recorded_at
     and archived_at is null
   order by recorded_at desc, created_at desc
   limit 1
   for update;

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

comment on function public.fn_time_entries_validate_sequence() is
  'Valida sequência do ponto ao vivo no INSERT. Ignora archived e sources de correção (admin_manual, retroactive_approval).';
