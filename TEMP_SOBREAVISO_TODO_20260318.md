# TODO - Refatoracao do modulo Sobreaviso

Data base: 2026-03-18
Status geral: em execucao

## Checklist

- [x] 1) Congelar legado e mapear pontos de troca
  - [x] Desacoplar navegacao de `/oncall/register` e `/oncall/review`
  - [x] Centralizar acesso por `/oncall`
  - [x] Manter rotas legadas apenas como redirect para evitar quebra

- [x] 2) Criar migration nova do dominio (`oncall_shifts`)
- [x] 3) Atualizar contratos backend (types + DTOs)
- [x] 4) Implementar repository novo do sobreaviso
- [ ] 5) Implementar service com regras de negocio aprovadas
- [ ] 6) Vincular sobreaviso ao modulo de ponto (espelhamento)
- [ ] 7) Expor endpoints novos (`/oncall-shifts`)
- [ ] 8) Refatorar frontend admin (lista + filtros + CRUD + detalhe)
- [ ] 9) Refatorar frontend funcionario (lista + ciente + registrar entrada + detalhe)
- [ ] 10) Ajustar navegacao final e remover concorrencia legado x novo
- [ ] 11) Validacao tecnica (build + smoke)
- [ ] 12) Atualizar documentacao obrigatoria (`docs/agent.md`)

## Evidencias da Subtask 1

Arquivos alterados:
- `apps/web/app/tenants/[tenantId]/layout.tsx`
- `apps/web/app/tenants/[tenantId]/oncall/page.tsx`
- `apps/web/app/tenants/[tenantId]/oncall/register/page.tsx`
- `apps/web/app/tenants/[tenantId]/oncall/review/page.tsx`

Resumo:
- Sidebar nao aponta mais para paginas legadas.
- Pagina `/oncall` agora e o ponto unico temporario (fluxo congelado).
- Paginas legadas ficaram apenas com redirect para `/oncall`.

## Evidencias da Subtask 2

Arquivos alterados:
- `supabase/migrations/20260318110000_20260318_oncall_shifts_refactor_domain.sql`

Resumo:
- Criada nova estrutura de dominio `oncall_shifts` com snapshot de colaborador para filtros.
- Criada trilha de eventos `oncall_shift_events` para auditoria do fluxo.
- Adicionado vinculo opcional `time_entries.oncall_shift_id` para espelhamento com ponto.
- Definidas politicas RLS para leitura por membro (self/admin) e escrita administrativa.
- Incluido backfill do legado `oncall_entries` para preservar historico inicial.

## Evidencias da Subtask 3

Arquivos alterados:
- `apps/api/src/modules/workforce/workforce.types.ts`
- `apps/api/src/modules/workforce/workforce.oncall-shifts.contracts.ts`

Resumo:
- Adicionados tipos de dominio do novo fluxo:
  - `OncallShiftStatus`
  - `OncallShiftEventType`
  - `OncallShift`
  - `OncallShiftEvent`
  - `OncallShiftWithEvents`
- Tipo legado `OncallEntry` mantido temporariamente e marcado como legado para evitar quebra durante a transicao.
- Criados DTOs/schemas Zod para o novo contrato de API (`oncall_shifts`):
  - criar
  - listar com filtros
  - detalhar
  - atualizar
  - excluir
  - dar ciente
  - registrar entrada
  - listar eventos
- Validacao tecnica:
  - `apps/api`: `npm.cmd run build` (ok)

## Evidencias da Subtask 4

Arquivos alterados:
- `apps/api/src/modules/workforce/workforce.repository.ts`

Resumo:
- Implementado novo repositório do domínio `oncall_shifts` sem remover o legado de `oncall_entries`.
- Adicionados tipos internos de persistência:
  - `OncallShiftRow`
  - `OncallShiftEventRow`
- Adicionados mapeadores:
  - `mapOncallShift`
  - `mapOncallShiftEvent`
- Métodos novos criados no repositório:
  - `createOncallShift`
  - `listOncallShifts` (com filtros por data, nome, e-mail, CPF, departamento, cargo, contrato, status e tag)
  - `getOncallShiftById`
  - `updateOncallShift`
  - `deleteOncallShift`
  - `createOncallShiftEvent`
  - `listOncallShiftEvents`
  - `getOncallShiftWithEvents` (inclui evento + vínculo de ponto)
  - `findOverlappingOncallShift`
  - `linkOncallShiftToTimeEntry`
  - `unlinkOncallShiftTimeEntry`
  - `listConfirmedOncallShiftsInRange`
- Legado mantido para transição:
  - `createOncallEntry`
  - `listOncallEntries`
  - `reviewOncallEntry`
  - `listApprovedOncallInRange`
- Validação técnica:
  - `apps/api`: `npm.cmd run build` (ok)
