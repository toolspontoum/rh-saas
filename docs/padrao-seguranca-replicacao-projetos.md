# Padrão de segurança HTTP e borda — replicação em outros projetos

Este documento descreve o **pacote mínimo replicável** de hardening que o Stratus CRM aplica na borda (navegador + API) e em jobs agendados. Use-o como checklist e como base para alinhar novos repositórios.

Para a visão ampla de produto (RLS, LGPD, MFA, supply chain), veja `docs/security.md`.

---

## 1) Objetivo

- Reduzir superfície de ataque comum (clickjacking, MIME sniffing, XSS auxiliar, vazamento de referrer, features do browser).
- Impor **CSP e HSTS apenas em produção** no front, para não atrapalhar desenvolvimento local.
- Manter **CORS restrito** e cabeçalhos consistentes na API.
- Proteger **rotas de cron / jobs** com segredo dedicado (não depender só da URL “secreta”).
- Ter **testes automatizados** que garantam o comportamento dos headers por ambiente.

---

## 2) Aplicação web (ex.: Next.js)

### 2.1 Módulo central de headers

Criar um módulo único (ex.: `src/lib/security/http-security-headers.ts`) que exporte:

| Cabeçalho | Valor típico | Notas |
|-----------|--------------|--------|
| `X-Content-Type-Options` | `nosniff` | Sempre |
| `X-Frame-Options` | `DENY` | Complementar a `frame-ancestors` na CSP |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Front web |
| `Permissions-Policy` | Desligar câmera, microfone, geolocalização, FLoC/interest-cohort conforme necessário | Ajuste por produto |
| `X-DNS-Prefetch-Control` | `on` | Opcional; alinhar com política de privacidade |

**Somente em `NODE_ENV === production`:**

- `Strict-Transport-Security`: `max-age=31536000; includeSubDomains` (adicione `preload` só se o domínio estiver no programa HSTS preload e você souber o impacto).
- `Content-Security-Policy`: montada a partir das integrações reais do projeto.

### 2.2 CSP em produção

Princípios usados no Stratus:

- `default-src 'self'`
- `script-src` e `connect-src` **explícitos** para cada domínio de API, auth, analytics, realtime, OAuth, CDN de scripts.
- `frame-ancestors 'none'`
- `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`
- `upgrade-insecure-requests` quando todo o site for HTTPS

**Derive hosts dinâmicos** (ex.: URL do Supabase) de variáveis de ambiente e inclua tanto `https://` quanto `wss://` para Realtime.

Sempre que adicionar um widget, SDK de terceiros ou nova API chamada no browser, atualize a CSP **no mesmo PR**.

Referência no repositório: `apps/web/src/lib/security/http-security-headers.ts`.

### 2.3 Integração no framework

No Next.js, registre os headers em `next.config` com `async headers()`, aplicando `/:path*` (ou o subset de rotas que fizer sentido).

Referência: `apps/web/next.config.ts`.

### 2.4 Testes

Cubra pelo menos:

- Em desenvolvimento: **não** enviar CSP nem HSTS.
- Em produção: enviar CSP e HSTS e validar trechos críticos da política (ex.: `default-src`, hosts de backend).

Referência: `apps/web/src/lib/security/http-security-headers.test.ts`.

---

## 3) API / BFF (ex.: Fastify)

- **CORS**: `credentials: true` apenas com **allowlist explícita** de origem (`APP_ORIGIN` ou lista validada), nunca `*` com cookies.
- **Correlation ID**: aceitar `X-Correlation-Id` do cliente ou gerar UUID; devolver o mesmo no response para rastreio.
- **Headers de resposta** (hook `onSend` ou equivalente):
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: no-referrer` (API costuma não precisar de referrer rico)
  - `Permissions-Policy` mínima
  - `X-XSS-Protection: 0` (header legado; desabilitar evita comportamento inconsistente em browsers antigos)
  - CSP **restrita para API JSON**: ex. `default-src 'none'; frame-ancestors 'none'; base-uri 'none'`

Referência: `apps/api/src/app.ts`.

---

## 4) Jobs, crons e webhooks

- Endpoints invocados por agendador (Vercel Cron, Cloud Scheduler, etc.) devem validar um **segredo**:
  - Header dedicado (ex.: `X-<produto>-Cron-Secret`) **e/ou**
  - `Authorization: Bearer <segredo>`
- Se o segredo não estiver configurado, falhar fechado (`401` / não executar).
- Documentar a variável em `.env.example` sem valor real.

Referência: `apps/web/src/app/api/jobs/campaign-dispatch/route.ts` e variáveis `CAMPAIGN_DISPATCH_CRON_SECRET` / `CRON_SECRET`.

---

## 5) Variáveis de ambiente e segredos

- Nunca expor `service_role` ou equivalente como `NEXT_PUBLIC_*`.
- Manter `.env.example` atualizado com nomes e descrição; valores reais só em gestão de segredos (Vercel, Doppler, etc.).
- Validar env no boot da API com schema (ex.: Zod), como em `apps/api/src/config/env.ts`.

---

## 6) Checklist rápido para um projeto novo

1. [ ] Módulo `buildSecurityHeadersFor*` + CSP de produção alinhada às integrações.
2. [ ] Registro global de headers no config do framework (ou equivalente no edge/reverse proxy).
3. [ ] Testes dev vs prod para CSP/HSTS.
4. [ ] API: CORS allowlist + headers de hardening + correlation id.
5. [ ] Crons/jobs: verificação de segredo obrigatória.
6. [ ] Revisão quando entrar OAuth, analytics, iframe ou novo domínio em `connect-src` / `script-src`.

---

## 7) Manutenção

Sempre que uma feature nova chamar um domínio no browser ou incorporar script de terceiros, trate a atualização da CSP como **requisito de merge**, não como débito técnico opcional.
