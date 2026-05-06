# Selfies no registro de ponto (Storage + retenção 60 dias)

Este documento descreve o fluxo de upload de selfies no registro de ponto e a limpeza automática de arquivos antigos.

## Visão geral

- **Frontend** captura selfie (JPEG compactada) e solicita um **upload intent**.
- O servidor retorna uma **URL assinada** (`signedUrl`) e um **caminho** (`path`) no Storage.
- O frontend faz `PUT` no `signedUrl` e, ao concluir, grava o `selfiePath` no `note` da batida.
- Um **job HTTP** remove selfies com mais de **60 dias** no bucket configurado.

## Endpoints

### Upload intent da selfie

- **URL**: `POST /api/v1/tenants/:tenantId/time-selfies/upload-intent`
- **Body**:
  - `fileName` (string)
  - `mimeType` (string, deve começar com `image/`)
  - `sizeBytes` (number)
  - `targetUserId` (opcional, backoffice)
- **Resposta**:
  - `signedUrl` (string)
  - `path` (string)

### Job de limpeza (60 dias)

- **URL**: `POST /api/v1/jobs/time-selfies-cleanup`
- **Auth**:
  - `VV_CRON_HTTP_SECRET` deve estar configurado no ambiente
  - Envie o segredo via `x-vv-cron-secret: <segredo>` **ou** `Authorization: Bearer <segredo>`
- **Resposta**:
  - `202 { ok: true, accepted: true }`

## Storage

- **Bucket**: usa o bucket configurado em `STORAGE_BUCKET_DOCUMENTS`
- **Pasta**: `tenants/{tenantId}/time-selfies/`

## Checklist de configuração no Supabase (para evitar 400 no PUT do signedUrl)

Erros `400` no `PUT` do `signedUrl` costumam estar relacionados a CORS/headers/restrições do Storage.

- **CORS do Storage**:
  - Permitir **origins** do domínio de produção (ex.: `https://nextorh.com.br`) e previews (Vercel)
  - Permitir métodos: `PUT`, `POST`, `GET`, `OPTIONS`
  - Permitir headers: `content-type` (mínimo)
- **Políticas/bucket**:
  - Upload assinado deve estar habilitado/permitido (signed upload URL)
  - Não bloquear `image/jpeg`

## Observabilidade / Suporte

- O frontend exibe erro genérico para usuários comuns (`Falha no upload da selfie (400)`).
- Para superadmin, exibe detalhes do erro do Storage (via `/v1/platform/me`).

