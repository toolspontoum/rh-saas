# Arquitetura do Projeto
## Padrão Ponto Um Digital - Fullstack (Sem three.js)

---

## 0) Resumo Executivo

**Objetivo:** refatorar a plataforma atual (PHP/HTML/CSS/JS) para uma nova base moderna com **paridade funcional**, incluindo melhorias e novas features, já com arquitetura **SaaS multiempresa**, segura e escalável.

**Stack alvo:** Node.js + React (Web) + Supabase + Vercel, com estrutura preparada para React Native na fase seguinte.

**Versão inicial:** `v0.1.0`

---

## 1) Premissas Validadas

- Entrega inicial com foco em **paridade funcional da refatoração**.
- Projeto nasce na **nova arquitetura** (sem migração de legado neste primeiro momento).
- **Multiempresa (multitenancy)** já entra no MVP.
- Mobile não entra nesta fase, mas a arquitetura deve evitar retrabalho para fase 2.
- Não será utilizado `three.js` neste projeto.
- API do MVP será **privada** (sem exposição pública para terceiros).
- Requisitos formais de **LGPD/compliance**: retenção, anonimização, trilha de auditoria e perfis de acesso.
- Política de retenção **customizada por tipo de dado**, com padrão inicial de **5 anos**.

---

## 2) Contextos Técnicos Ativos

- Web (React)
- API Node
- Supabase (Postgres, Auth, Storage, RLS, Realtime opcional por módulo)
- Vercel (deploy web e APIs)
- Multitenancy SaaS
- Segurança e compliance LGPD

Contextos planejados (fase 2):
- Mobile (React Native/Expo), consumindo o mesmo backend e contratos de API.

---

## 3) Arquitetura Geral

- Camadas:
  - `apps/web`: front-end React (público + autenticado).
  - `apps/api`: API Node (BFF + regras de negócio + autorização).
  - `supabase`: banco, auth, storage, policies RLS, funções SQL.
  - `packages/shared`: tipos, validações, clientes HTTP, utilitários e contratos reaproveitáveis no mobile.

- Princípios:
  - Separação clara entre UI, domínio e persistência.
  - Nenhuma regra crítica no client.
  - Toda operação sensível passa por API Node.
  - Banco protegido com RLS por tenant/perfil.
  - Design orientado a módulos para ativação por plano.

---

## 4) Estratégia de Renderização Web (SSR vs CSR)

- Proposta arquitetural:
  - **SSR/SSG** para páginas públicas/institucionais e vagas públicas (SEO/performance).
  - **CSR** para área autenticada (RH, colaborador, candidatos, documentos, ponto).

- Benefícios:
  - Melhor indexação para páginas públicas.
  - Menor acoplamento e maior fluidez no painel autenticado.

---

## 5) Fluxo de Dados (Client -> API -> DB)

1. Client envia requisição autenticada.
2. API Node valida payload (`schema validation`) e contexto do usuário.
3. API resolve `tenant_id` e `user_id` a partir do token/sessão (nunca do corpo da requisição).
4. API executa operação no Supabase com contexto de segurança apropriado.
5. RLS aplica isolamento por tenant e restrições por perfil.
6. API retorna resposta sanitizada e auditável.

Regras invioláveis:
- Nunca confiar em `tenant_id`/`user_id` enviados pelo frontend.
- Sempre validar autorização por ação + recurso.
- Auditoria para operações críticas.

---

## 6) Multitenancy e Planos (MVP)

- Modelo: **single database + shared schema + isolamento lógico por `tenant_id`**.
- `tenant_id` obrigatório em tabelas de domínio multiempresa.
- Controle de módulos por tenant:
  - tabela de assinatura/plano.
  - tabela de features habilitadas.
  - guardas de acesso na API e na UI.

- Cenários cobertos:
  - Cliente com módulo de vagas habilitado.
  - Cliente sem módulo de vagas (funcionalidades bloqueadas por contrato).

---

## 7) Modelo de Dados (Entidades Macro)

- Identidade e acesso:
  - `tenants`
  - `users`
  - `user_tenant_roles`
  - `plans`
  - `tenant_subscriptions`
  - `feature_flags`

- RH e pessoas:
  - `collaborators`
  - `contracts`
  - `departments`
  - `positions`

- Recrutamento:
  - `jobs`
  - `job_applications`
  - `candidates`
  - `candidate_documents`

- Documentos e contracheques:
  - `document_requests`
  - `documents`
  - `payslips`
  - `payslip_batches`
  - `import_jobs_csv`

- Ponto e sobreaviso:
  - `time_entries`
  - `time_adjustment_requests`
  - `oncall_entries`
  - `work_schedules`
  - `holidays`
  - `time_reports`

- Governança:
  - `audit_logs`
  - `retention_policies`
  - `anonymization_jobs`

---

## 8) Segurança e Compliance (LGPD)

- RLS ativo em todas as tabelas de negócio.
- Políticas por tenant + perfil + vínculo com recurso.
- Dados sensíveis com minimização de coleta e mascaramento em telas.
- Storage com políticas de acesso e path namespacing por tenant.
- Trilha de auditoria para:
  - criação/edição/exclusão de registros sensíveis;
  - aprovações/reprovações (ponto/sobreaviso/documentos);
  - ações administrativas.
- Retenção e anonimização:
  - política por tipo de dado (default de 5 anos, com exceções configuráveis);
  - job de anonimização para dados expirados.

---

## 9) Paridade Funcional e Evolução

- Estratégia recomendada de entrega segura: **paridade por módulos com releases incrementais**.
- Ordem sugerida:
  1. Identidade, tenant, planos e permissões.
  2. Usuários/colaboradores/candidatos.
  3. Vagas e candidaturas.
  4. Documentos e contracheques.
  5. Folha de ponto e sobreaviso.
  6. Relatórios e auditoria avançada.

Observação:
- A migração "tudo de uma vez" aumenta risco operacional e de segurança. A arquitetura suporta rollout progressivo sem retrabalho.

---

## 10) Preparação para Mobile (Fase 2 sem refatorar domínio)

- Contratos de API versionados desde o início (`/v1`).
- Validações e tipos compartilhados em `packages/shared`.
- Regras de negócio centralizadas na API (não na UI web).
- Componentização e design tokens prontos para consumo web/mobile.
- Estratégia de autenticação e perfis já compatível com app.

---

## 11) Versionamento Inicial

- Projeto: `v0.1.0`
- Convenção: `MAJOR.MINOR.PATCH`
- Critério inicial:
  - `PATCH`: correções sem mudança de contrato.
  - `MINOR`: novas funcionalidades compatíveis.
  - `MAJOR`: quebra de contrato ou modelo.

---

## 12) Riscos e Mitigações

- Risco: escopo muito amplo para entrega única.
  - Mitigação: rollout por módulos com gates de segurança por release.

- Risco: regressão de regras de negócio do legado.
  - Mitigação: catálogo de casos de uso críticos + testes de aceitação por módulo.

- Risco: exposição de dados sensíveis.
  - Mitigação: RLS by default, auditoria obrigatória e revisão de policies antes de go-live.
