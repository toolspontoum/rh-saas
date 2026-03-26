# Fluxo de deploy: local → teste → produção

Este documento alinha o time e as ferramentas (incluindo assistentes de código) com o seguinte princípio:

- **Desenvolvimento e correções** acontecem **no ambiente local** (e em staging/preview quando existir).
- **Produção** só recebe alterações quando alguém do time **decide explicitamente** fazer o deploy (comando ou ação no painel), não “automaticamente” após cada alteração.

---

## 1. Ambiente local (padrão)

- Na raiz do monorepo: `npm run dev` — sobe API (`apps/api`) e Web (`apps/web`).
- Variáveis: copiar de `.env.example` para `.env` na raiz e em `apps/api/.env` conforme o projeto; **nunca** commitar segredos.
- Migrações e testes contra banco: seguir `apps/api/README-MIGRATIONS.md` e `docs/supabase-setup.md`.

Toda feature ou bugfix deve ser validada aqui antes de qualquer deploy.

---

## 2. Ambiente de teste (staging) antes da produção

Objetivo: uma URL e um backend/dados **separados da produção**, para QA e demos sem risco ao ambiente real.

### 2.1 Vercel (frontend + API serverless no mesmo projeto)

- **Preview deployments**: cada branch (ex.: `develop`, `staging`) ou cada PR gera uma URL `*.vercel.app`. Isso já é um “ambiente de teste” barato.
- No painel **Settings → Environment Variables**:
  - Preencher variáveis para **Preview** com credenciais do **Supabase de staging** (ou projeto de dev).
  - Manter **Production** apenas com credenciais do **Supabase de produção**.
- Opcional: criar um **segundo projeto na Vercel** só para staging (mesmo repositório, branch fixa `staging`), se quiser URL estável e política de deploy separada.

### 2.2 Supabase (dados e auth)

- **Recomendado:** criar um **segundo projeto Supabase** (ex.: `vv-consulting-staging`), aplicar as mesmas migrações, e usar suas URLs/chaves nas variáveis **Preview** da Vercel.
- Alternativa: [Supabase Branching](https://supabase.com/docs/guides/platform/branching) para bancos temporários ligados ao Git — útil para PRs, com custo/plano compatível.

Assim, staging não escreve na base de produção.

### 2.3 CORS e origens

- Ajustar `WEB_ALLOWED_ORIGINS` (ou equivalente na API) para incluir a URL do preview/staging, por exemplo `https://seu-app-git-staging-xxx.vercel.app`.

---

## 3. Produção (somente sob comando explícito)

Deploy para o ambiente **Production** da Vercel quando o time decidir, por exemplo:

- Merge na branch de produção (ex.: `main`) **com** deploy automático só se essa for a política acordada, **ou**
- Deploy manual: CLI `vercel --prod` a partir de `apps/web` com o contexto certo, **ou**
- Botão **Promote to Production** no painel da Vercel (quando aplicável).

**Regra de ouro:** não tratar “subir para produção” como consequência automática de cada commit ou de cada sessão de desenvolvimento; deve ser um passo **explícito** após validação (local e, de preferência, staging).

---

## 4. Onde isso está reforçado para o Cursor

A regra do projeto em `.cursor/rules/deploy-workflow.mdc` instrui o assistente a manter alterações no fluxo local/staging e só tratar produção quando você pedir deploy explicitamente.
