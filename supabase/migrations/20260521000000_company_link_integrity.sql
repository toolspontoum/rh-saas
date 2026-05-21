-- Integridade entre tenant_user_profiles.company_id e tenant_user_company_history (linha "aberta").
--
-- Regras do invariante (apenas para utilizadores com role `employee` activa
-- — admins/managers podem ter company_id no profile como referência opcional
-- e isso é irrelevante para o módulo de colaboradores):
--
--   1. Sempre que `tenant_user_company_history` tem uma linha activa
--      (`unlinked_at IS NULL`) para (tenant, user) ⇒ esse `company_id`
--      coincide com `tenant_user_profiles.company_id`.
--   2. Se `tenant_user_profiles.company_id` for alterado para outra empresa
--      e o utilizador for `employee` activo ⇒ fecha qualquer histórico
--      activo divergente e cria uma nova linha activa para a empresa nova.
--   3. Se `tenant_user_profiles.company_id` for limpo (NULL) e havia um
--      histórico activo ⇒ esse histórico é fechado com `unlinked_at = now()`.
--   4. Se o histórico activo é fechado (passa a `unlinked_at NOT NULL`) e o
--      profile ainda aponta para essa empresa ⇒ limpa `profile.company_id`.
--   5. Recursão entre triggers é evitada com `pg_trigger_depth()`.

-- --------------------------------------------------------------------
-- 1) Sync history -> profile
-- --------------------------------------------------------------------
create or replace function public.fn_company_history_sync_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_user uuid;
  v_company uuid;
begin
  -- Evita ciclos (profile -> history -> profile).
  if pg_trigger_depth() > 1 then
    return null;
  end if;

  if tg_op = 'INSERT' then
    if new.unlinked_at is null then
      update public.tenant_user_profiles
         set company_id = new.company_id,
             updated_at = now()
       where tenant_id = new.tenant_id
         and user_id = new.user_id
         and (company_id is distinct from new.company_id);
    end if;
    return null;
  end if;

  if tg_op = 'UPDATE' then
    -- Caso A: histórico activo passou a ter outra empresa → propagar.
    if new.unlinked_at is null
       and (old.unlinked_at is not null
            or new.company_id is distinct from old.company_id) then
      update public.tenant_user_profiles
         set company_id = new.company_id,
             updated_at = now()
       where tenant_id = new.tenant_id
         and user_id = new.user_id
         and (company_id is distinct from new.company_id);
    end if;
    -- Caso B: histórico activo foi fechado → se o profile ainda aponta para a
    -- empresa, limpa.
    if new.unlinked_at is not null and old.unlinked_at is null then
      update public.tenant_user_profiles
         set company_id = null,
             updated_at = now()
       where tenant_id = new.tenant_id
         and user_id = new.user_id
         and company_id = old.company_id;
    end if;
    return null;
  end if;

  if tg_op = 'DELETE' then
    -- Se removerem o histórico activo, limpa o profile.
    if old.unlinked_at is null then
      update public.tenant_user_profiles
         set company_id = null,
             updated_at = now()
       where tenant_id = old.tenant_id
         and user_id = old.user_id
         and company_id = old.company_id;
    end if;
    return null;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_company_history_sync_profile
  on public.tenant_user_company_history;
create trigger trg_company_history_sync_profile
  after insert or update or delete on public.tenant_user_company_history
  for each row execute function public.fn_company_history_sync_profile();

-- --------------------------------------------------------------------
-- 2) Sync profile -> history
--    Só actua quando o utilizador tem role `employee` activa, para evitar
--    poluir o histórico com perfis administrativos que (legado) carregam
--    company_id apenas como ponteiro padrão.
-- --------------------------------------------------------------------
create or replace function public.fn_profile_sync_company_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_employee boolean;
  v_actor uuid;
begin
  if pg_trigger_depth() > 1 then
    return null;
  end if;

  -- Só sincroniza quando company_id efectivamente mudou.
  if tg_op = 'UPDATE'
     and new.company_id is not distinct from old.company_id then
    return null;
  end if;

  -- Verifica se o utilizador é `employee` activo neste tenant.
  select exists (
    select 1
      from public.user_tenant_roles
     where tenant_id = new.tenant_id
       and user_id = new.user_id
       and role = 'employee'
       and is_active is true
  ) into v_is_employee;

  if not v_is_employee then
    return null;
  end if;

  -- Tenta capturar o actor (pode não estar definido fora de uma sessão auth).
  begin
    v_actor := nullif(current_setting('request.jwt.claims.sub', true), '')::uuid;
  exception when others then
    v_actor := null;
  end;

  -- Fecha qualquer histórico activo divergente.
  if new.company_id is null then
    update public.tenant_user_company_history
       set unlinked_at = now(),
           unlinked_by_user_id = coalesce(unlinked_by_user_id, v_actor),
           unlink_reason = coalesce(unlink_reason, 'Sincronizado: profile.company_id passou a NULL')
     where tenant_id = new.tenant_id
       and user_id = new.user_id
       and unlinked_at is null;
    return null;
  end if;

  update public.tenant_user_company_history
     set unlinked_at = now(),
         unlinked_by_user_id = coalesce(unlinked_by_user_id, v_actor),
         unlink_reason = coalesce(
           unlink_reason,
           'Sincronizado: profile.company_id passou para outra empresa'
         )
   where tenant_id = new.tenant_id
     and user_id = new.user_id
     and unlinked_at is null
     and company_id is distinct from new.company_id;

  -- Garante que exista um histórico activo para a nova empresa.
  if not exists (
    select 1 from public.tenant_user_company_history
     where tenant_id = new.tenant_id
       and user_id = new.user_id
       and company_id = new.company_id
       and unlinked_at is null
  ) then
    insert into public.tenant_user_company_history
      (tenant_id, user_id, company_id, linked_at, linked_by_user_id, link_reason)
    values
      (new.tenant_id, new.user_id, new.company_id, now(), v_actor,
       'Sincronizado a partir de tenant_user_profiles.company_id');
  end if;

  return null;
end;
$$;

drop trigger if exists trg_profile_sync_company_history
  on public.tenant_user_profiles;
create trigger trg_profile_sync_company_history
  after insert or update of company_id on public.tenant_user_profiles
  for each row execute function public.fn_profile_sync_company_history();

-- --------------------------------------------------------------------
-- 3) Backfill correctivo idempotente:
--    Para qualquer colaborador (`employee` activo) com `profile.company_id`
--    preenchido mas SEM histórico activo, cria uma entrada activa.
-- --------------------------------------------------------------------
insert into public.tenant_user_company_history (tenant_id, user_id, company_id, linked_at, link_reason)
select
  p.tenant_id,
  p.user_id,
  p.company_id,
  coalesce(p.admission_date::timestamptz, p.created_at, now()),
  'Backfill: vínculo recuperado a partir de tenant_user_profiles.company_id'
from public.tenant_user_profiles p
join public.user_tenant_roles r
  on r.tenant_id = p.tenant_id
 and r.user_id = p.user_id
 and r.role = 'employee'
 and r.is_active is true
where p.company_id is not null
  and not exists (
    select 1
      from public.tenant_user_company_history h
     where h.tenant_id = p.tenant_id
       and h.user_id = p.user_id
       and h.unlinked_at is null
  )
on conflict do nothing;

-- --------------------------------------------------------------------
-- 4) Sanidade dos dados existentes:
--    Se o histórico activo divergir do profile (cenário improvável agora,
--    mas pode aparecer após backfill), alinhe profile.company_id pelo
--    histórico, que tem semântica de auditoria.
-- --------------------------------------------------------------------
update public.tenant_user_profiles p
   set company_id = h.company_id,
       updated_at = now()
  from public.tenant_user_company_history h
 where h.tenant_id = p.tenant_id
   and h.user_id = p.user_id
   and h.unlinked_at is null
   and p.company_id is distinct from h.company_id;

comment on function public.fn_company_history_sync_profile() is
  'Mantém tenant_user_profiles.company_id alinhado com a linha activa em tenant_user_company_history.';
comment on function public.fn_profile_sync_company_history() is
  'Mantém tenant_user_company_history alinhado quando tenant_user_profiles.company_id muda (apenas para utilizadores com role employee activa).';
