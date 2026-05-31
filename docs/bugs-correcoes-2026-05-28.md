# Triagem de bugs — 2026-05-28

Lote enviado por usuários/adms (NexorHR). Status de cada item abaixo.

---

## Bug 1 — `time_adjustment_requests.company_id` NOT NULL violado

**Sintoma:** ao enviar um ajuste de ponto, banner em vermelho com
`null value in column "company_id" of relation "time_adjustment_requests"
violates not-null constraint`.

### Causa raiz

A migração `supabase/migrations/20260323120000_tenant_companies_subscope.sql`
introduziu a sub-escopo de empresa (`tenant_companies`) e adicionou a coluna
`company_id` como **NOT NULL** em ~20 tabelas (linhas 38–267). Vários INSERTs
no `apps/api` não foram atualizados para preencher esse campo. Para
`time_adjustment_requests`, o `insert` em `createTimeAdjustmentRequest`
(`workforce.repository.ts`) ainda enviava o payload antigo, sem `company_id`,
fazendo o Postgres rejeitar a operação.

### Correção (apps/api)

`apps/api/src/modules/workforce/workforce.repository.ts`

Os métodos abaixo agora recebem `companyId` opcional e fazem fallback
hierárquico antes de fazer o `insert`/`upsert`:

| Método | Tabela | Estratégia de fallback |
|---|---|---|
| `createTimeAdjustmentRequest` | `time_adjustment_requests` | `input.companyId` → `time_entries.company_id` (quando há `timeEntryId`) → empresa actual do perfil → empresa padrão do tenant |
| `createOncallEntry` | `oncall_entries` | `input.companyId` → empresa actual do perfil → empresa padrão do tenant |
| `createOncallShiftEvent` | `oncall_shift_events` | lê `oncall_shifts.company_id` do shift relacionado |
| `createOnboardingRequirement` | `employee_onboarding_requirements` | `input.companyId` → empresa padrão do tenant |
| `upsertOnboardingSubmission` | `employee_onboarding_submissions` | `input.companyId` → empresa actual do perfil → empresa padrão do tenant |

`apps/api/src/modules/workforce/workforce.service.ts`

`createTimeAdjustmentRequest` foi ajustado para resolver `companyId` antes de
chamar o repositório (preferindo: header `X-Tenant-Company-Id` → empresa da
batida-alvo `time_entries.company_id` → empresa do perfil do colaborador).
Para isso, `TimeEntry` ganhou o campo `companyId` (tipos +
mapper em `workforce.types.ts` / `workforce.repository.ts`).

### Verificação

```bash
cd apps/api && npm run build   # OK
cd apps/web && npm run build    # OK
```

Manual:
1. Logar como colaborador, abrir Registro de Ponto, clicar “Solicitar ajuste”.
2. Preencher tipo de ajuste, data/hora, justificativa, enviar.
3. Esperado: sucesso (sem o banner vermelho).

### Outros pontos verificados (sem alteração necessária)

INSERTs auditados em tabelas atingidas pela mesma migração — já preenchem
`company_id` corretamente:

- `notices`, `notice_attachments`, `notice_reads` (`workforce.repository.ts`).
- `payslips` (legado e fila IA — `documents-payslips.repository.ts`).
- `documents` (`candidate-portal.repository.ts`).
- `audit_logs` (`tenant-users.repository.insertAuditLog` faz fallback para
  `fetchDefaultTenantCompanyId`).
- `tenant_user_profiles.upsert` em `updateUserStatus` — só atinge linhas
  pré-existentes (employee já vinculado), o caminho UPDATE preserva
  `company_id` actual. Sem ação imediata, mas anotado como dívida técnica
  caso passe a ser usado como insert no futuro.

### Dívida técnica conhecida

- `tenant_document_type_settings`: a migração mudou a PK para
  `(tenant_id, company_id, platform_document_type_id)`, mas o módulo
  `standard-documents` continua tratando settings como "por tenant" (sem
  `company_id` e com `onConflict` desatualizado). Funciona para listagem
  (joins por `tenant_id`), mas o upsert (`patchTenantSettings`) deve falhar
  ao tentar gravar mudanças. Ainda não foi reportado — abrir item separado
  quando admin tentar editar tipos de documento padrão.

---

## Bug 2 — Ficha do colaborador: "Erro 500" ao atualizar

**Sintoma:** abrindo a Onboarding RH → Ficha do colaborador e clicando em
salvar, banner em vermelho "Erro 500".

### Investigação

- Os logs de API do Supabase **não mostram 5xx** em `/employees` ou
  `/employee-profile` no período. Só 200s e alguns 4xx (storage).
- O texto "Erro 500" é a mensagem genérica do `apiFetch`
  (`apps/web/lib/api.ts`) quando o backend devolve 5xx **sem JSON** no body.
  Isso costuma acontecer em dois cenários:
  1. `dispatchFirstAccessEmail` lança `AUTH_EMAIL_DISPATCH_FAILED` →
     mapeado para 502 em `apps/api/src/http/error-handler.ts`. Como a UI
     mostra "Erro 5xx", o admin lê como 500.
  2. Timeout/cold-start em Vercel serverless durante chamada a
     `auth.admin.listUsers` (paginação até 10k usuários no
     `findUserIdByEmailUsingAuthAdminList`) ou rate-limit do provedor SMTP.

  Em ambos os casos, o **upsert na `tenant_user_profiles` já foi
  efectuado** quando o erro acontece (o envio do e-mail é o último passo).
  A UX fica enganosa: o admin acha que o registo não foi guardado quando, na
  verdade, foi.

### Correção aplicada (resiliência do `upsertEmployee`)

`apps/api/src/modules/tenant-users/tenant-users.service.ts`
→ `ensureFirstAccessEmailAfterEmployeeLink`

- Envia o e-mail dentro de `try/catch` — se SMTP falhar:
  - Registra a falha em `audit_logs` (action
    `tenant.employee.first_access_email_failed`, `result = "error"`).
  - **Não propaga o erro** → a UI vê sucesso e o admin pode reenviar pela
    tela de Colaboradores → "Reenviar convite" / "Enviar reset de senha".
- Reduz a janela de falhas false-positive na Ficha do colaborador.

### O que ainda precisa de validação manual

1. Reabrir a Ficha do colaborador exibida no print (Ricardo Dettogni) e
   tentar salvar de novo. Capturar resposta de rede (Network → status
   real, body JSON do erro, se houver) caso continue falhando.
2. Conferir entradas em `audit_logs` com `action LIKE
   'tenant.employee.first_access_email_%'` para mapear a frequência das
   falhas de SMTP.

---

## Bug 3 — E-mail de redefinição de senha com link quebrado

**Sintoma:** ao clicar no botão do e-mail de "redefinição de senha", o
browser exibe `MismatchCert (Hostname mismatch) Blocked by
SSL_HOST_MISMATCH`. O hostname acessado é `tracking.stratuscrm.com.br`
mas o certificado apresentado pelo servidor é para `api.elasticemail.com`
(Sectigo DV R36).

### Causa raiz

O Supabase Auth está configurado para usar o **SMTP da ElasticEmail**
(`api.elasticemail.com`) e a ElasticEmail tem a feature **Link Tracking**
ligada com **custom tracking domain** = `tracking.stratuscrm.com.br`.

O domínio `tracking.stratuscrm.com.br` (provavelmente CNAME para
`tracking.elasticemail.com`) precisa ter um **certificado SSL emitido para
ele** (Let's Encrypt / Sectigo) no painel da ElasticEmail. Esse passo não
foi feito (ou o cert expirou), então o servidor responde com o cert default
da ElasticEmail (`api.elasticemail.com`) → mismatch → o Chrome bloqueia.

> Isto **não é bug no código do NexorHR**. O fluxo de reset é
> `apps/web/app/recover-password/page.tsx` chamando
> `supabase.auth.resetPasswordForEmail(email, { redirectTo: '<webBaseUrl>/reset-password' })`.
> O link que entra no template do Supabase é
> `https://<project>.supabase.co/auth/v1/verify?token=...&type=recovery&redirect_to=...`.
> Quem reescreve esse link para `tracking.stratuscrm.com.br` é a
> ElasticEmail, não o nosso backend.

### Ações recomendadas (precisa de acesso aos painéis externos)

Ordenadas por menor impacto:

1. **Painel ElasticEmail → Settings → Tracking → Domains**
   - Verificar o status do certificado de `tracking.stratuscrm.com.br`.
   - Se inválido/expirado, clicar em **"Verify"/"Issue SSL"** (a ElasticEmail
     usa Let's Encrypt). Aguardar propagação (~5 min).
2. **Alternativa rápida (zero downtime):** desligar **Link tracking** nos
   templates de Auth (Settings → Tracking → Clicks). Os e-mails passam a
   conter o link direto para `*.supabase.co/auth/v1/verify`, que tem
   cert válido.
3. **Mitigação no Supabase:** em Dashboard → Auth → Templates, escrever o
   HTML do template "Reset Password" usando texto cru para o link
   (`{{ .ConfirmationURL }}` sem `<a href>`), reduzindo a chance da
   ElasticEmail reescrever. (Solução parcial; tracking pode reescrever
   mesmo em URLs em texto.)
4. **Plano B:** trocar o provedor SMTP no Supabase (Auth → SMTP Settings)
   para um sem tracking forçado: Resend (recomendado, free tier de 3k
   e-mails/mês), AWS SES, ou o SMTP nativo do Supabase (limite menor).

### Verificação após correção

```bash
# Disparar reset:
1. /recover-password → digitar e-mail → "Enviar instruções".
2. Abrir e-mail e copiar a URL do botão "Redefinir senha".
3. Esperado: a URL deve abrir /reset-password no domínio do app (com hash
   contendo access_token e type=recovery), sem qualquer aviso de SSL.
```

---

## Próximos passos

1. Validar Bug 1 manualmente em produção/staging após deploy.
2. Reproduzir Bug 2 com Network capturado para confirmar se é
   `AUTH_EMAIL_DISPATCH_FAILED` (502) ou timeout real.
3. Bug 3: acesso ao painel ElasticEmail (ou troca de provedor) — fora do
   escopo do código.
