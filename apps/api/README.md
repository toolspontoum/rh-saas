# API - Scaffold inicial (v0.1.0)

## Estrutura criada

- `src/config/env.ts`: validacao de variaveis com `zod`.
- `src/lib/supabase.ts`: clientes Supabase (`anon` e `service role`).
- `src/modules/core-auth-tenant/*`: modulo base de auth + tenant.
- `src/index.ts`: bootstrap inicial.

## Scripts

```bash
npm install
npm run check
npm run dev
npm run seed:remote:minimal
npm run smoke:auth
npm run ensure:storage-buckets
```

## Responsabilidades do modulo `core-auth-tenant`

- Listar tenants de um usuario (`user_tenant_roles`).
- Montar contexto de tenant:
  - roles do usuario no tenant;
  - features habilitadas (`tenant_features`);
  - assinatura/plano vigente (`tenant_subscriptions` + `plans`).
- Validar se feature esta habilitada para o tenant.

## Proximo passo recomendado

Endpoints HTTP implementados:

- `GET /v1/me/tenants`
- `GET /v1/tenants/:tenantId/context`
- `POST /v1/tenants/:tenantId/features/:featureCode/validate`
- `POST /v1/tenants/:tenantId/jobs`
- `GET /v1/tenants/:tenantId/jobs?status=&title=&page=&pageSize=`
- `POST /v1/tenants/:tenantId/jobs/:jobId/applications`
- `GET /v1/tenants/:tenantId/jobs/:jobId/applications?status=&candidateName=&page=&pageSize=`
- `PATCH /v1/tenants/:tenantId/jobs/:jobId/applications/:applicationId/status`
- `GET /v1/tenants/:tenantId/audit-logs?action=&resourceType=&from=&to=&page=&pageSize=`
- `GET /v1/tenants/:tenantId/audit-logs/export.csv?action=&resourceType=&from=&to=&limit=`
- `POST /v1/tenants/:tenantId/documents`
- `POST /v1/tenants/:tenantId/documents/upload-intent`
- `POST /v1/tenants/:tenantId/documents/confirm-upload`
- `GET /v1/tenants/:tenantId/documents?contract=&collaboratorName=&page=&pageSize=`
- `POST /v1/tenants/:tenantId/payslips`
- `POST /v1/tenants/:tenantId/payslips/upload-intent`
- `POST /v1/tenants/:tenantId/payslips/confirm-upload`
- `GET /v1/tenants/:tenantId/payslips?contract=&collaboratorName=&referenceMonth=&page=&pageSize=`

Observacao:
- Rotas `v1` exigem `Authorization: Bearer <supabase_jwt>`.
- `userId` vem do token validado pelo Supabase Auth (`auth.getUser(token)`).
- `tenantId` vem apenas de path param e e validado por membership no backend.

## Seed remoto minimo

- Opcionalmente defina no `apps/api/.env`:
  - `SEED_USER_EMAIL`
  - `SEED_USER_PASSWORD` (opcional)
  - `SEED_USER_ID` (alternativa)
- Comando:
  - `npm run seed:remote:minimal`

## Smoke test autenticado

- Defina no `apps/api/.env`:
  - `SMOKE_USER_EMAIL`
  - `SMOKE_USER_PASSWORD`
  - `SMOKE_TENANT_ID`
  - opcional: `API_BASE_URL` (default `http://127.0.0.1:3333`)
- Com a API rodando, execute:
  - `npm run smoke:auth`
