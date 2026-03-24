# Status Temporário - Refatoração de Sobreaviso

Data: 2026-03-18
Objetivo: registrar exatamente até onde a task de `sobreaviso` foi conferida para retomar em outra janela de contexto sem perda de continuidade.

## Conclusão principal
O refatoramento novo de `sobreaviso` **não foi aplicado**.
O código atual ainda usa o fluxo antigo de `oncall_entries`, com:
- funcionário registrando o próprio sobreaviso
- admin/supervisor aprovando ou rejeitando

Isso contradiz a regra aprovada pelo projeto, em que:
- o admin cadastra o sobreaviso
- o funcionário apenas dá `ciente`
- no período do turno ele pode `Registrar entrada`
- o sobreaviso precisa espelhar o registro de ponto vinculado

## O que foi validado no código

### 1. Menu lateral ainda aponta para o fluxo antigo
Arquivo: `apps/web/app/tenants/[tenantId]/layout.tsx`
Situação encontrada:
- funcionário: `Sobreaviso` -> `/tenants/${tenantId}/oncall/register`
- admin/supervisor: `Aprovar Sobreaviso` -> `/tenants/${tenantId}/oncall/review`

### 2. Tela antiga do funcionário ainda existe
Arquivo: `apps/web/app/tenants/[tenantId]/oncall/register/page.tsx`
Situação encontrada:
- formulário de auto-registro de sobreaviso
- POST para `/v1/tenants/${tenantId}/oncall-entries`
- GET para `/v1/tenants/${tenantId}/oncall-entries?mineOnly=true...`

### 3. Tela antiga de aprovação ainda existe
Arquivo: `apps/web/app/tenants/[tenantId]/oncall/review/page.tsx`
Situação encontrada:
- admin aprova/rejeita `oncall-entries`
- GET `/v1/tenants/${tenantId}/oncall-entries?...`
- PATCH `/v1/tenants/${tenantId}/oncall-entries/:id/review`

### 4. Rotas da API ainda usam `oncall-entries`
Arquivo: `apps/api/src/http/routes.ts`
Rotas confirmadas:
- `POST /v1/tenants/:tenantId/oncall-entries`
- `GET /v1/tenants/:tenantId/oncall-entries`
- `PATCH /v1/tenants/:tenantId/oncall-entries/:oncallId/review`

### 5. Handler ainda usa service antigo
Arquivo: `apps/api/src/modules/workforce/workforce.handlers.ts`
Métodos confirmados:
- `createOncall` -> `createOncallEntry`
- `listOncall` -> `listOncallEntries`
- `reviewOncall` -> `reviewOncallEntry`

### 6. Service ainda usa fluxo antigo
Arquivo: `apps/api/src/modules/workforce/workforce.service.ts`
Métodos confirmados:
- `createOncallEntry(...)`
- `listOncallEntries(...)`
- `reviewOncallEntry(...)`

### 7. Repository ainda persiste no modelo antigo
Arquivo: `apps/api/src/modules/workforce/workforce.repository.ts`
Métodos confirmados:
- `createOncallEntry(...)`
- `listOncallEntries(...)`
- `reviewOncallEntry(...)`

### 8. Tipo antigo ainda está ativo
Arquivo: `apps/api/src/modules/workforce/workforce.types.ts`
Tipo confirmado:
- `OncallEntry`
- status: `pending | approved | rejected`

### 9. Migration atual do módulo de sobreaviso é a antiga
Arquivo: `supabase/migrations/20260212124500_20260212_workforce_notice_time_oncall.sql`
Situação encontrada:
- tabela `public.oncall_entries`
- RLS/policies do fluxo antigo
- sem estrutura para `ciente`, `entrada_registrada`, vínculo com ponto, snapshot completo de colaborador, nem detalhe do turno

## Peças existentes que podem ser reaproveitadas

### Registro de ponto
Arquivo: `apps/web/app/tenants/[tenantId]/time/register/page.tsx`
Já existe:
- fluxo de ponto do funcionário
- lista/admin de colaboradores
- detalhe do ponto
- solicitação de ajuste
- revisão de ajuste pelo admin
- modal de logs
- captura de selfie + geolocalização

### Backend de ponto e notificações
Arquivos:
- `apps/api/src/modules/workforce/workforce.service.ts`
- `apps/api/src/modules/workforce/workforce.repository.ts`

Já existe suporte para:
- criação de `time_entries`
- solicitação de ajuste
- aprovação/rejeição de ajuste
- `time_entry_change_logs`
- `notices`
- `notice_reads`
- `getEmployeeProfile(...)`
- `assignShiftTemplate(...)`
- dados de colaborador com snapshot suficiente para filtros

## Regra de negócio já confirmada pelo usuário
Regra adicional confirmada:
- se o funcionário tiver um turno normal no mesmo horário do sobreaviso, o admin **não pode** cadastrar o sobreaviso
- se ainda assim existir registro de ponto no mesmo horário do sobreaviso, o sistema deve notificar o funcionário para dar entrada no sobreaviso e vincular esse registro

## Direção técnica aprovada para a refatoração
A implementação deve substituir o fluxo antigo por um novo modelo.

### Modelo sugerido
Criar nova estrutura para `oncall_shifts` (ou equivalente), contendo:
- `id`
- `tenant_id`
- `user_id`
- `scheduled_date`
- `starts_at`
- `ends_at`
- `status` com valores como:
  - `pending_ack`
  - `acknowledged`
  - `entry_registered`
  - `cancelled`
- `linked_time_entry_id`
- snapshot do colaborador para filtros:
  - nome
  - e-mail
  - CPF
  - departamento
  - cargo
  - contrato
  - tags
- auditoria de criação/edição/exclusão
- timestamps

### Endpoints esperados
Sugestão de substituição:
- `GET /v1/tenants/:tenantId/oncall-shifts`
- `POST /v1/tenants/:tenantId/oncall-shifts`
- `GET /v1/tenants/:tenantId/oncall-shifts/:oncallId`
- `PATCH /v1/tenants/:tenantId/oncall-shifts/:oncallId`
- `DELETE /v1/tenants/:tenantId/oncall-shifts/:oncallId`
- `POST /v1/tenants/:tenantId/oncall-shifts/:oncallId/acknowledge`
- `POST /v1/tenants/:tenantId/oncall-shifts/:oncallId/register-entry`

## Regras funcionais a aplicar na implementação

### Admin
- lista de sobreavisos com filtros por:
  - data
  - nome
  - e-mail
  - CPF
  - cargo
  - departamento
  - status
  - tag
- botão `Cadastrar sobreaviso`
- modal CRUD
- tela de detalhe
- botão editar
- botão excluir com confirmação
- notificação ao funcionário em:
  - criação
  - edição
  - exclusão
- ao editar data/hora:
  - status volta para pendente
  - funcionário precisa dar `ciente` novamente

### Funcionário
- lista só dos próprios sobreavisos
- filtro por data
- botão `Ciente` quando status pendente
- botão `Registrar entrada` durante o período do sobreaviso
- tela de detalhe
- deve visualizar reflexo do ponto vinculado

### Vínculo com ponto
- `Registrar entrada` deve reutilizar o módulo de `Registro de Ponto`
- o sobreaviso precisa refletir:
  - ponto vinculado
  - solicitações de ajuste
  - alterações efetivadas
- se houver ponto existente no período, vincular esse registro em vez de duplicar

## Último passo efetivamente executado antes da interrupção
Foram apenas feitas leituras/inspeções.
Nenhuma edição de código foi aplicada nesta retomada do módulo `sobreaviso`.

## Próximo passo exato para continuar
1. Criar migration nova em `supabase/migrations` para substituir/complementar `oncall_entries` com a nova estrutura
2. Atualizar `workforce.types.ts`
3. Substituir os métodos antigos de `oncall` em:
   - `workforce.repository.ts`
   - `workforce.service.ts`
   - `workforce.handlers.ts`
   - `routes.ts`
4. Refatorar frontend:
   - remover `oncall/register`
   - remover `oncall/review`
   - criar lista unificada `/oncall`
   - criar detalhe `/oncall/[oncallId]`
   - atualizar o menu em `layout.tsx`
5. Validar build e registrar em `docs/agent.md`
