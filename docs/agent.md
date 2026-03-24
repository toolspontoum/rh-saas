# Guia Operacional, Arquitetural e Memoria de Execucao
## Padrao Ponto Um Digital - Node.js + React/RN + Supabase + Vercel

---

## 0) Identificacao do Projeto

**Projeto:** VV Consulting RH SaaS  
**Cliente:** VV Consulting  
**Stack:** Node.js + React/React Native + Supabase + Vercel

**Versao do Projeto:** v0.1.0  
**Status:** Execucao modular ativa  
**Ultima atualizacao:** 2026-02-12

---

## 1) Contextos Ativos do Projeto

- [x] Web (React)
- [ ] Mobile (React Native / Expo)
- [x] API Node
- [x] SSR
- [x] Supabase DB + RLS
- [ ] Supabase Edge Functions
- [x] Storage
- [ ] Realtime
- [x] Multitenancy
- [ ] three.js (3D)
- [ ] API Publica
- [x] Dados sensiveis (LGPD)

---

## 2) Fase Atual

**Fase:** Execucao modular por features + consolidacao UX por perfis

---

## 3) Fonte de Verdade Tecnica

- `docs/arquitetura.md`
- `docs/security.md`
- `docs/adr.md`
- `docs/design-system.md`

---

## 4) Versionamento

Padrao **MAJOR.MINOR.PATCH**.

---

## 5) Modulos - Versoes Atuais

| Modulo | Tipo | Versao | Estabilidade | Dependencias |
|------|------|--------|--------------|--------------|
| core-auth-tenant | backend | v0.1.0 | Em estruturacao | Supabase Auth, RLS |
| web-public | web | v0.1.0 | Em estruturacao | React SSR/SSG |
| web-admin-rh | web | v0.1.0 | Em estruturacao | API Node, RBAC |
| recrutamento | dominio | v0.1.0 | Em estruturacao | jobs, candidates, applications |
| documentos-contracheques | dominio | v0.1.0 | Em estruturacao | Storage, contracts |
| ponto-sobreaviso | dominio | v0.1.0 | Em estruturacao | time entries, approvals |
| auditoria-lgpd | transversal | v0.1.0 | Em estruturacao | audit logs, retention policies |

---

## 6) Gates Obrigatorios

### Security Gate
- [x] RLS ativo (mandatorio por arquitetura)
- [ ] Policies revisadas por modulo antes de release
- [x] Validacao de input no backend (padrao definido)
- [x] Auth derivado do token (sem confiar no client)
- [x] Sem uso de three.js no projeto
- [ ] Auditoria ativa em operacoes criticas
- [ ] Politica de retencao/anonimizacao aplicada por tipo

### Quality Gate
- [ ] Casos de uso criticos mapeados por modulo
- [ ] Testes de aceitacao minimos por modulo
- [ ] Checklist de regressao de paridade funcional

---

## 7) Checklist Historico

### [2026-02-12] - acordo-operacao-autonoma-3h | v0.1.0 -> v0.1.0

**Motivo:** alinhar execucao autonoma em ciclos completos por feature (backend -> testes -> frontend -> testes) sem bloquear o fluxo.

- [x] Ordem de features por seguranca e complexidade sera proposta e validada pelo cliente
- [x] Criterio de pronto por feature definido (backend + frontend + testes)
- [x] Duvida nao bloqueante: seguir decisao mais segura e registrar
- [x] Bloqueio impeditivo: registrar bloqueio e seguir para proxima feature
- [x] Uma feature por vez; manter em aberto apenas quando houver impedimento real
- [x] Devolutiva continua: reportar progresso e continuar execucao sem travar

### [2026-02-12] - item1-docs-payslips-hardening-ux | v0.1.0 -> v0.1.1

**Motivo:** fechar hardening operacional de Documentos/Contracheques com filtros combinados e validacao de fluxo.

- [x] Filtros por contrato/nome (documentos) e contrato/nome/mes (contracheques) no frontend
- [x] Script de smoke backend para modulo (`smoke:docs-payslips`)
- [x] Build/check API e Web validados

### [2026-02-12] - item2-3-tenant-users-lifecycle | v0.1.1 -> v0.2.0

**Motivo:** implementar gerenciar usuarios por assinante, abas por status e ciclo de desligamento/exclusao com auditoria.

- [x] Migration `tenant_user_profiles` com status `active/inactive/offboarded`
- [x] Endpoints: listagem com busca/filtro, alteracao de status, exclusao com motivo e regra de vinculos
- [x] Tela `Usuarios` no frontend com abas e acoes
- [x] Smoke backend (`smoke:users-candidates`) validado

### [2026-02-12] - item4-candidates-recruitment-parity | v0.2.0 -> v0.2.1

**Motivo:** ampliar paridade de recrutamento para candidatos com filtros por contrato/status e governanca de inativos.

- [x] Migration de candidatos com `contract` e `is_active`
- [x] Endpoints de candidatos: listagem, ativar/inativar, exclusao de inativo
- [x] Frontend de recrutamento com painel de candidatos e filtros
- [x] Smoke backend (`smoke:users-candidates`) validado

### [2026-02-12] - item5-6-7-8-9-foundation | v0.2.1 -> v0.3.0

**Motivo:** entregar base operacional para comunicados, vagas publicas, importacao CSV de contracheques, ponto e sobreaviso.

- [x] Comunicados RH (`notices`) com tela de gestao e home colaborador
- [x] Vagas publicas por slug (`/public/jobs/:tenantSlug`) + pagina web `/vagas/[tenantSlug]`
- [x] Importacao CSV de contracheques por lote (`/payslips/import-csv`)
- [x] Fundacao de ponto (`time_entries`, ajustes) com endpoints e tela web
- [x] Fundacao de sobreaviso (`oncall_entries`) com endpoints e tela web
- [x] Migrations aplicadas no Supabase remoto e smokes (`smoke:workforce`, `smoke:public-and-csv`)

### [2026-02-12] - item10-time-advanced-reports | v0.3.0 -> v0.3.1

**Motivo:** concluir modulo avancado de ponto com regra de jornada por assinante, calculos de extras/noturno e saldo de banco de horas por periodo.

- [x] Migration `tenant_work_rules` com RLS e defaults por tenant
- [x] Endpoints novos:
  - [x] `GET /v1/tenants/:tenantId/work-rules`
  - [x] `PUT /v1/tenants/:tenantId/work-rules`
  - [x] `GET /v1/tenants/:tenantId/time-reports/summary`
- [x] Calculo de resumo no backend:
  - [x] minutos esperados por dias uteis no periodo
  - [x] minutos trabalhados por pares `clock_in/clock_out`
  - [x] horas extras, deficit e saldo de banco
  - [x] adicional noturno por janela configuravel
  - [x] minutos de sobreaviso aprovado no periodo
- [x] Frontend atualizado em `time/page.tsx` com:
  - [x] edicao de regra de jornada
  - [x] consulta de relatorio por periodo
  - [x] exibicao de metricas consolidadas
- [x] Migration aplicada no Supabase remoto
- [x] Smoke atualizado (`smoke:workforce`) validado

### [2026-02-12] - arquitetura-base | v0.0.0 -> v0.1.0

**Motivo:** definicao arquitetural inicial com foco em paridade funcional, multiempresa no MVP e compliance LGPD.

- [x] Implementado
- [x] Validado com cliente
- [x] Security Gate inicial validado

### [2026-02-12] - supabase-core-bootstrap | v0.1.0 -> v0.1.0

**Motivo:** inicializacao do Supabase local e criacao da base de schema para tenancy, RBAC, auditoria e retencao.

- [x] Implementado
- [x] Testado em ambiente local (`supabase start`, `supabase db reset`, `supabase db lint`)
- [x] Security Gate inicial validado

### [2026-02-12] - api-core-auth-tenant-scaffold | v0.1.0 -> v0.1.0

**Motivo:** criar modulo inicial da API Node para contexto de autenticacao/tenant e habilitacao de features por plano.

- [x] Implementado
- [x] Integracao HTTP final (Express + middleware JWT Supabase)
- [x] Security Gate inicial validado

### [2026-02-12] - api-auth-routes-v1 | v0.1.0 -> v0.1.0

**Motivo:** expor endpoints protegidos para contexto de tenant e validacao de feature no backend.

- [x] Implementado
- [x] Tipagem validada (`npm run check`)
- [x] Build validado (`npm run build`)

### [2026-02-12] - recruitment-module-v1 | v0.1.0 -> v0.1.0

**Motivo:** iniciar modulo de recrutamento com entidades de vagas, candidatos e candidaturas, com RLS e endpoints protegidos por tenant/feature.

- [x] Migration criada (`jobs`, `candidates`, `job_applications`)
- [x] Endpoints v1 implementados na API
- [x] Tipagem/build/lint validados localmente

### [2026-02-12] - recruitment-applications-workflow | v0.1.0 -> v0.1.0

**Motivo:** adicionar listagem filtrada de candidaturas por vaga e atualizacao de status com trilha de auditoria.

- [x] `GET /applications` com filtros por status e nome do candidato
- [x] `PATCH /applications/:applicationId/status`
- [x] Registro em `audit_logs` em mudanca de status

### [2026-02-12] - audit-and-permissions-hardening | v0.1.0 -> v0.1.0

**Motivo:** ampliar governanca com endpoint de auditoria, paginacao em listagens e controle de role para alteracao de status.

- [x] `GET /audit-logs` com filtros e paginacao
- [x] Paginacao em `jobs` e `applications`
- [x] Alteracao de status limitada a `owner/admin/manager`

### [2026-02-12] - qa-smoke-recruitment-rbac | v0.1.0 -> v0.1.0

**Motivo:** validar trilha de auditoria e enforcement de permissao por role no fluxo de candidaturas.

- [x] `audit_logs` retorna evento `recruitment.application.status_updated`
- [x] Usuario com role `analyst` recebe `403` no endpoint de alteracao de status
- [x] Fluxo recrutamento funcional com paginacao/filtros

### [2026-02-12] - audit-export-and-docs-payslips-module | v0.1.0 -> v0.1.0

**Motivo:** expandir governanca (exportacao CSV) e iniciar modulo de documentos/contracheques com endpoints base.

- [x] Export CSV em `audit-logs`
- [x] Filtros por periodo (`from/to`) em auditoria
- [x] Migration de `document_requests`, `documents`, `payslip_batches`, `payslips` com RLS
- [x] Endpoints base de documentos e contracheques com paginacao/filtros

### [2026-02-12] - signed-upload-intents-docs-payslips | v0.1.0 -> v0.1.0

**Motivo:** reduzir risco de upload direto e padronizar fluxo de arquivos via URL assinada do Supabase Storage.

- [x] `POST /documents/upload-intent`
- [x] `POST /payslips/upload-intent`
- [x] Validacao de PDF only e limite de tamanho no backend
- [x] Provisionamento automatico de buckets (`documents`, `payslips`)

### [2026-02-12] - upload-confirmation-flow | v0.1.0 -> v0.1.0

**Motivo:** garantir consistencia entre Storage e metadata no banco, evitando registros sem arquivo real.

- [x] `POST /documents/confirm-upload`
- [x] `POST /payslips/confirm-upload`
- [x] Validacao de escopo de path por tenant e verificacao de existencia do objeto no bucket

### [2026-02-12] - web-scaffold-initial-modules | v0.1.0 -> v0.1.0

**Motivo:** iniciar frontend web em paralelo por modulo fechado (auth, tenants, recrutamento, auditoria, documentos).

- [x] Scaffold Next.js + TypeScript em `apps/web`
- [x] Login Supabase + armazenamento de token
- [x] Páginas iniciais: tenants, recrutamento, auditoria e documentos
- [x] `npm run check` e `npm run build` validados


### [2026-02-12] - ux-fase-1-split-rotas-e-rbac-menu | v0.3.1 -> v0.3.2

**Motivo:** separar telas grandes por fluxo, reduzir sobrecarga cognitiva e aplicar navegacao por role/feature.

- [x] Recrutamento dividido em rotas dedicadas (dashboard, vagas, nova vaga, candidaturas por vaga, candidatos)
- [x] Ponto dividido em rotas dedicadas (registro, meus lancamentos, meus ajustes, aprovacao, relatorios, regras)
- [x] Sobreaviso dividido em rotas dedicadas (registro e aprovacao)
- [x] Contracheques dividido em rotas dedicadas (lista e importacao CSV)
- [x] Sidebar dinamico por role + feature habilitada do tenant
- [x] Redirects de compatibilidade para rotas legadas

### [2026-02-12] - ux-fase-2-jornadas-candidato-e-onboarding | v0.3.2 -> v0.3.3

**Motivo:** separar jornada externa de candidato e jornada de usuario recem-cadastrado sem contexto operacional.

- [x] Endpoint publico de candidatura (`POST /public/jobs/:tenantSlug/:jobId/applications`)
- [x] Pagina publica de vagas com candidatura real em `/vagas/[tenantSlug]`
- [x] Tela de onboarding para usuario recem-cadastrado
- [x] Tela inicial de portal do candidato
- [x] `npm run check` e `npm run build` validados em API e Web

### [2026-02-12] - ux-fase-3-dashboard-por-perfil-e-produtividade | v0.3.3 -> v0.3.4

**Motivo:** acelerar operacao por perfil com atalhos acionaveis e persistencia de preferencia de uso.

- [x] Dashboard do assinante com atalhos por role/feature
- [x] Root do tenant redirecionado para dashboard
- [x] Favoritos de navegacao no sidebar (persistidos por tenant)
- [x] Estado salvo de filtros aplicado em recrutamento e documentos
- [x] Validacao final de build/check em API e Web

### [2026-02-12] - ux-execucao-independente-fases-1-a-6 | v0.3.4 -> v0.4.0

**Motivo:** consolidar melhoria de usabilidade por perfis e separar fluxos operacionais por pagina, reduzindo acoplamento e ambiguidades de permissao.

- [x] Fase 1: navegacao por contexto/perfil no sidebar (secoes por dominio, atalhos favoritos, labels mais claros)
- [x] Fase 2: recrutamento com detalhe de vaga e edicao
  - [x] Backend: `GET /v1/tenants/:tenantId/jobs/:jobId`
  - [x] Backend: `PATCH /v1/tenants/:tenantId/jobs/:jobId`
  - [x] Frontend: `recruitment/jobs/[jobId]` (detalhe + inscritos)
  - [x] Frontend: `recruitment/jobs/[jobId]/edit` (CRUD de edicao)
- [x] Fase 3: documentos/contracheques desacoplados em rotas dedicadas
  - [x] `documents/dashboard`, `documents/files`, `documents/upload`
  - [x] `payslips` (lista), `payslips/upload`, `payslips/import-csv`
  - [x] Redirect de compatibilidade de `documents/page.tsx`
- [x] Fase 4: ponto e sobreaviso com foco em jornada por papel (colaborador x aprovador)
  - [x] Guard visual de registro para perfis nao-colaborador
  - [x] filtros de aprovacao e estados vazios em ajustes/sobreaviso
- [x] Fase 5: usuarios, auditoria e comunicados com UX operacional
  - [x] usuarios: confirmacao por modal para desligamento/exclusao (sem `prompt`)
  - [x] auditoria: filtros por acao/recurso/periodo + exportacao CSV filtrada
  - [x] comunicados: filtro por publico e busca textual
- [x] Fase 6: padronizacao transversal de UX
  - [x] componente de breadcrumbs
  - [x] componente de empty state
  - [x] componente de confirm modal
  - [x] ajustes de estilos globais para consistencia visual
- [x] Validacoes finais
  - [x] `apps/api`: `npm run check` e `npm run build`
  - [x] `apps/web`: `npm run check` e `npm run build`

### [2026-02-12] - recrutamento-vagas-campos-avancados-e-lista-operacional | v0.4.0 -> v0.4.1

**Motivo:** completar paridade funcional da tela de vagas com campos adicionais, perguntas dinâmicas por vaga e lista operacional com status de negocio e acoes por icone.

- [x] Backend recrutamento atualizado:
  - [x] migration `20260212152000_20260212_jobs_ux_fields.sql` com `city`, `state`, `salary`, `expires_at`, `screening_questions`
  - [x] modelos/tipos de vaga com `screeningQuestions` e `applicationsCount`
  - [x] `GET /v1/tenants/:tenantId/jobs` retorna contagem de candidaturas por vaga
  - [x] `DELETE /v1/tenants/:tenantId/jobs/:jobId` com controle de role e auditoria
- [x] Frontend recrutamento atualizado:
  - [x] criar/editar vaga com campos: cidade, estado, salario, validade e repeater de perguntas
  - [x] tipos de pergunta suportados: `Sim/Não`, `Upload de documento`, `Texto livre`
  - [x] listagem de vagas com colunas: area, cidade, estado, modalidade, candidaturas, status e acoes por icone
  - [x] status exibido no front em linguagem de negocio: `Rascunho`, `Ativa`, `Inativa`, `Encerrada`
- [x] Validacao tecnica:
  - [x] `apps/api`: `npm run check` e `npm run build`
  - [x] `apps/web`: `npm run build`
  - [ ] `apps/web`: `npm run check` com falha intermitente de `.next/types` no ambiente local (build OK)

### [2026-02-12] - ux-recrutamento-vagas-polimento-layout-e-conteudo | v0.4.1 -> v0.4.2

**Motivo:** refinar usabilidade de Vagas com melhor aproveitamento de tela, acoes iconograficas, edicao rica de descricao e padronizacao visual de perguntas/metricas.

- [x] Tabela de vagas em largura total com melhor uso de espaco horizontal
- [x] Acoes da listagem com icones de biblioteca (`lucide-react`): visualizar, editar e excluir
- [x] Criacao de vaga sem textos pre-preenchidos (placeholders reais)
- [x] Editor rico basico na descricao (negrito, italico, lista)
- [x] Detalhe da vaga renderiza descricao preservando quebras e formatacao editada
- [x] Perguntas da vaga exibidas em formato de tags
- [x] Tipo `yes_no` exibido como `Sim/N�o` no frontend
- [x] Cards de metricas (total/submetidos/em analise/aprovados/rejeitados) justificados em grid
- [x] Build validado em `apps/web`; check/build validado em `apps/api`

### [2026-02-12] - ux-vagas-filtros-geografia-e-editor-completo | v0.4.2 -> v0.4.3

**Motivo:** melhorar produtividade operacional em Vagas com filtros avan�ados, geografia BR assistida e edi��o rica completa da descri��o.

- [x] Bot�o de excluir na lista com padr�o visual correto (fundo branco + �cone vermelho)
- [x] Filtros adicionais na lista de vagas: �rea, cidade, estado, modalidade e status (mantendo busca por t�tulo)
- [x] CRUD de vaga com estado antes de cidade
- [x] Integra��o de estados/cidades BR via biblioteca `estados-cidades`
- [x] Campo cidade com sugest�o filtrada conforme digita��o (datalist dependente do estado)
- [x] WYSIWYG completo com `react-quill-new` (toolbar completa)
- [x] Build validado em `apps/web`; check/build validados em `apps/api`

### [2026-02-14] - portal-candidato-cadastro-perfil-completo-cv | v0.4.3 -> v0.4.4

**Motivo:** habilitar jornada completa de usuario candidato (sem aprovacao) com cadastro, perfil profissional completo e candidatura autenticada em vagas publicadas.

- [x] Banco/Supabase:
  - [x] migration `20260214100000_20260214_candidate_profile_and_auth_link.sql`
  - [x] nova tabela `candidate_profiles` (dados completos do perfil)
  - [x] `candidates.user_id` para vinculo com usuario autenticado
  - [x] indice unico por `tenant_id + user_id` para evitar duplicidade por assinante
- [x] API:
  - [x] novo modulo `candidate-portal` com endpoints:
    - [x] `GET /v1/me/candidate-profile`
    - [x] `PUT /v1/me/candidate-profile`
    - [x] `POST /v1/me/candidate-profile/resume/upload-intent`
    - [x] `POST /v1/me/candidate-profile/resume/confirm-upload`
    - [x] `POST /v1/me/jobs/:jobId/apply`
    - [x] `GET /v1/me/job-applications`
  - [x] catalogo publico expandido: `GET /public/jobs` (global, com filtro)
  - [x] novo bucket configuravel `STORAGE_BUCKET_CANDIDATE_RESUMES` (`candidate-resumes`)
- [x] Web:
  - [x] pagina de cadastro: `/signup`
  - [x] area do candidato: `/candidate`
  - [x] formulario de perfil profissional completo (estilo curriculo)
  - [x] upload de curriculo PDF com signed upload URL
  - [x] listagem de vagas publicadas e envio de candidatura autenticada
  - [x] listagem de "minhas candidaturas"
  - [x] login atualizado para rotear usuario sem tenant para area de candidato
- [x] Validacao tecnica:
  - [x] `apps/api`: `npm run build`
  - [x] `apps/web`: `npm run build`

### [2026-02-14] - fluxo-employee-vinculo-por-email-cpf | v0.4.4 -> v0.4.5

**Motivo:** formalizar fluxo de funcionario (`employee`) com vinculacao por e-mail/CPF sem duplicar usuario e isolamento por assinante.

- [x] Banco/Supabase:
  - [x] migration `20260214113000_20260214_employee_linkage.sql`
  - [x] `tenant_user_profiles` com `cpf`, `phone`, `personal_email`
  - [x] indices por CPF em escopo de tenant
  - [x] campos `employee_user_id` em `documents` e `payslips` para vinculo direto com usuario
- [x] API tenant-users:
  - [x] novo endpoint `POST /v1/tenants/:tenantId/employees`
  - [x] resolve usuario existente por e-mail (auth) e por CPF (perfis existentes)
  - [x] se nao existir usuario por e-mail, dispara convite (sem duplicar conta)
  - [x] upsert de role `employee` em `user_tenant_roles`
  - [x] upsert de perfil em `tenant_user_profiles` com dados RH
  - [x] auditoria de vinculacao
- [x] Web:
  - [x] tela `Usuarios` com card para adicionar/vincular funcionario (nome, e-mail, CPF, telefone)
  - [x] lista de usuarios exibindo CPF
- [x] Validacao tecnica:
  - [x] `apps/api`: `npm run build`
  - [x] `apps/web`: `npm run build`

### [2026-02-14] - candidato-mascaras-repeaters-skills-separacao-telas | v0.4.5 -> v0.4.6

**Motivo:** concluir base de UX e dados do portal do candidato com máscaras, currículo estruturado, skills normalizadas e separação de jornadas.

- [x] API/Backend:
  - [x] `skill_tags` com normalização (`normalized`) e catálogo compartilhado de habilidades
  - [x] `jobs.skills` com indexação para match por habilidades
  - [x] `candidate-portal` com perfil estruturado (`education[]`/`experience[]`) e sugestões de vagas por skills
  - [x] endpoint de tags: `GET /v1/skills/tags`
  - [x] endpoint de sugeridas: `GET /v1/me/jobs/suggested`
- [x] Web/Candidato:
  - [x] máscaras: telefone BR, CPF e moeda BRL (pretensão salarial)
  - [x] estado/cidade com dependência (UF -> cidades filtradas)
  - [x] `Resumo profissional` em WYSIWYG
  - [x] formação e experiência como repeater com início/fim/título/descrição
  - [x] habilidades em tags com sugestão, `Tab` para autocomplete e criação de nova tag
  - [x] área do candidato separada em páginas: `Painel`, `Meu perfil`, `Vagas disponíveis`, `Minhas candidaturas`
  - [x] primeiro acesso direcionado para completar perfil; acessos seguintes para painel
- [x] Qualidade/Operação:
  - [x] correção de arquivos front para UTF-8 (build do Next sem erro de encoding)
  - [x] correção de tipagem no handler de perfil (`education/experience` normalizados)
  - [x] build validado: `apps/api` e `apps/web`

### [2026-02-14] - ux-candidato-largura-e-renderizacao-descricao-vagas | v0.4.6 -> v0.4.7

**Motivo:** corrigir quebra visual nas telas do candidato e alinhar largura com padrao operacional do painel admin.

- [x] `candidate/jobs` ajustado para `container wide`
- [x] `candidate/applications` ajustado para `container wide`
- [x] Descricao de vaga no portal do candidato renderizada como HTML formatado (sem exibir tags/entidades brutas)
- [x] Estilos de conteudo rico aplicados para legibilidade (`.job-rich-content`)
- [x] `docs/design-system.md` atualizado com regra de largura total para areas autenticadas
- [x] Build web validado e servidores locais reiniciados

### [2026-02-14] - candidato-vagas-em-cards-e-candidatura-por-detalhe | v0.4.7 -> v0.4.8

**Motivo:** melhorar experiencia do candidato com descoberta de vagas em cards e fluxo de candidatura focado na pagina de detalhe.

- [x] API:
  - [x] novo endpoint autenticado de detalhe: `GET /v1/me/jobs/details/:jobId`
  - [x] handler/service para retornar vaga publicada por ID
- [x] Web:
  - [x] `candidate/jobs` refatorada para cards com resumo + CTA `Ver detalhes`
  - [x] grid desktop com 4 cards (`jobs-card-grid`), responsivo para 3/1 colunas
  - [x] nova rota `candidate/jobs/[jobId]` com detalhe completo da vaga
  - [x] carta de apresentação movida para detalhe da vaga com editor WYSIWYG
  - [x] candidatura com modal de confirmação
  - [x] após confirmar: modal de sucesso `Candidatura efetuada com sucesso` + botão `OK` redirecionando para painel
- [x] Validacao:
  - [x] build API e Web ok
  - [x] servidores locais reiniciados (API 3333, Web 3000)

### [2026-02-14] - candidato-vagas-filtros-avancados | v0.4.8 -> v0.4.9

**Motivo:** alinhar busca de vagas do candidato com filtros operacionais usados no painel admin.

- [x] Filtros avançados em `candidate/jobs`:
  - [x] Ýrea
  - [x] Cidade
  - [x] Estado
  - [x] Modalidade
  - [x] Status (`Ativa`/`Inativa`)
  - [x] busca por título mantida
- [x] Filtragem combinada no cliente com opções dinâmicas baseadas nas vagas carregadas
- [x] Status visual no card (`status-pill`) para facilitar leitura
- [x] Build web validado e servidores locais reiniciados

### [2026-02-14] - candidato-ajustes-candidatura-e-atualmente-no-perfil | v0.4.9 -> v0.4.10

**Motivo:** corrigir usabilidade do detalhe da vaga e melhorar preenchimento de formação/experiência no perfil do candidato.

- [x] Detalhe da vaga:
  - [x] botão `Candidatar-se` reposicionado fora da área do editor
  - [x] ajustes de CSS para evitar sobreposição visual com o WYSIWYG
  - [x] revisão de textos PT-BR no arquivo da rota de detalhe
- [x] Perfil do candidato:
  - [x] `TimelineItem` com novo campo `isCurrent`
  - [x] checkbox `Atualmente` em Formação (em curso) e Experiência (cargo atual)
  - [x] quando `Atualmente` marcado, campo `Até` é ocultado e persistido como `null`
- [x] Backend candidato:
  - [x] schema/normalização atualizados para aceitar e persistir `isCurrent`
  - [x] parse de timeline retornando `isCurrent`
- [x] Build API/Web validado e servidores locais reiniciados

### [2026-02-14] - candidato-dashboard-cards-e-avatar-com-crop | v0.4.10 -> v0.5.0

**Motivo:** corrigir layout do painel do candidato e adicionar imagem de perfil com recorte controlado para reduzir peso.

- [x] Painel do candidato:
  - [x] seção `Vagas sugeridas por habilidades` convertida para grid de cards (mesmo padrão visual da tela de vagas)
  - [x] descrição resumida (sem HTML bruto) + CTA `Ver detalhes` por card
  - [x] página ajustada para largura `container wide`
- [x] Cadastro do candidato:
  - [x] novo campo `Imagem de perfil`
  - [x] fluxo de crop 1:1 com modal (`react-easy-crop`)
  - [x] imagem final exportada em `200x200px` (jpeg) antes do upload
- [x] Backend candidato:
  - [x] migration `20260214143000_20260214_candidate_profile_avatar.sql`
  - [x] campos de avatar em `candidate_profiles`
  - [x] endpoints:
    - [x] `POST /v1/me/candidate-profile/avatar/upload-intent`
    - [x] `POST /v1/me/candidate-profile/avatar/confirm-upload`
- [x] Validação:
  - [x] build API e Web OK
  - [x] migration aplicada no Supabase remoto
  - [x] servidores locais reiniciados (API 3333 / Web 3000)

### [2026-02-14] - fix-avatar-upload-buckets-candidate-portal | v0.5.0 -> v0.5.1

**Motivo:** corrigir erro no upload da imagem de perfil (`Failed to create signed upload URL`) com segregacao de buckets e provisionamento por migration.

- [x] API: novo env `STORAGE_BUCKET_CANDIDATE_AVATARS` (default `candidate-avatars`)
- [x] API: upload/confirm de avatar migrado para bucket de avatar dedicado
- [x] API: upload/confirm de curriculo mantido em bucket de curriculos (`candidate-resumes`)
- [x] Web: preview de avatar atualizado para bucket publico de avatares
- [x] Migration criada: `20260214173000_20260214_candidate_storage_buckets.sql`
  - [x] `candidate-resumes` (privado, PDF, 15MB)
  - [x] `candidate-avatars` (publico, JPG/PNG/WEBP, 5MB)
- [x] Migration aplicada no Supabase remoto (`supabase db push`)
- [x] Build validado em `apps/api` e `apps/web`

### [2026-02-14] - recrutamento-candidatos-por-candidatura-aprovacao-e-arquivamento | v0.5.1 -> v0.5.2

**Motivo:** corrigir usabilidade do painel admin em candidatos e reforcar governanca da vaga (aprovar + arquivar candidaturas no encerramento).

- [x] Backend recrutamento:
  - [x] novo status de candidatura `archived` (migration `20260214190000_20260214_recruitment_application_archived.sql`)
  - [x] ao encerrar vaga (`status=closed`), candidaturas da vaga sao arquivadas automaticamente
  - [x] novos endpoints para operacao por candidatura no tenant:
    - [x] `GET /v1/tenants/:tenantId/recruitment/applications`
    - [x] `GET /v1/tenants/:tenantId/recruitment/applications/:applicationId`
  - [x] aprovacao de candidatura envia notificacao por e-mail (Resend, quando configurado)
- [x] Frontend admin recrutamento:
  - [x] tela `Candidatos` migrada para listar candidaturas (com vaga associada)
  - [x] filtro por vaga adicionado
  - [x] status ativo/inativo removido da tela de candidatos
  - [x] acoes adicionadas: `Ver detalhes` e `Aprovar candidato` (com modal de confirmacao)
  - [x] nova pagina de detalhes da candidatura com informacoes da vaga + candidato + carta
- [x] Layout/UX transversal:
  - [x] ajustes globais para eliminar rolagem horizontal involuntaria (`overflow-x`/`min-width`)
  - [x] pagina detalhe da vaga com descricao em `job-rich-content` para evitar extrapolar largura
  - [x] `docs/design-system.md` atualizado com regra explicita de nao gerar overflow horizontal
- [x] Validacao:
  - [x] `apps/api`: build ok
  - [x] `apps/web`: build ok
  - [x] migration aplicada no Supabase remoto (`supabase db push`)

### [2026-02-14] - detalhe-candidatura-completo-e-download-curriculo | v0.5.2 -> v0.5.3

**Motivo:** elevar utilidade da tela de detalhes da candidatura para nivel operacional de RH, com dados completos da vaga e do candidato.

- [x] Backend recrutamento:
  - [x] detalhe da candidatura retorna dados completos da vaga (descricao, skills, salario, validade, perguntas)
  - [x] detalhe da candidatura retorna `candidateProfile` completo quando houver vinculo por `user_id`
  - [x] novo endpoint para download de curriculo com URL assinada:
    - [x] `GET /v1/tenants/:tenantId/recruitment/applications/:applicationId/resume-download`
- [x] Frontend admin:
  - [x] tela de detalhes da candidatura refeita no mesmo padrao visual do detalhe da vaga
  - [x] secao de perguntas da vaga exibida com tipo/obrigatoriedade/eliminatoria
  - [x] secao de candidato expandida com resumo, formacao, experiencias e links
  - [x] botao `Baixar curriculo` exibido quando existir arquivo
- [x] Validacao:
  - [x] `apps/api`: build ok
  - [x] `apps/web`: build ok

### [2026-02-14] - candidatura-com-perguntas-obrigatorias-e-respostas-no-admin | v0.5.3 -> v0.5.4

**Motivo:** garantir que o candidato responda perguntas obrigatorias da vaga antes da candidatura e exibir pergunta + resposta no detalhe da candidatura do admin.

- [x] Backend:
  - [x] migration 20260214194000_20260214_job_application_screening_answers.sql adiciona job_applications.screening_answers (jsonb)
  - [x] POST /v1/me/jobs/:jobId/apply aceita screeningAnswers
  - [x] validacao de obrigatoriedade por tipo (yes_no, 	ext, document_upload)
  - [x] persistencia das respostas na candidatura
  - [x] detalhe da candidatura retorna respostas enviadas
- [x] Frontend candidato:
  - [x] detalhe da vaga mostra perguntas da vaga
  - [x] bloqueio de candidatura quando obrigatorias nao estao respondidas
  - [x] envio das respostas no payload da candidatura
- [x] Frontend admin:
  - [x] detalhe da candidatura mostra pergunta + resposta
- [x] Validacao:
  - [x] pps/api: build ok
  - [x] pps/web: build ok

### [2026-02-14] - mensagens-ptbr-e-retirar-candidatura | v0.5.4 -> v0.5.5

**Motivo:** padronizar mensagens de erro/alerta em PT-BR e permitir que o candidato retire a propria candidatura da vaga.

- [x] Backend:
  - [x] pps/api/src/http/error-handler.ts revisado com mensagens em PT-BR
  - [x] novo erro de negocio CANNOT_WITHDRAW_APPROVED_APPLICATION
  - [x] novos endpoints candidato:
    - [x] GET /v1/me/jobs/:jobId/application
    - [x] DELETE /v1/me/jobs/:jobId/application
  - [x] regra: candidatura aprovada nao pode ser retirada
- [x] Frontend candidato:
  - [x] detalhe da vaga passa a consultar se ja existe candidatura
  - [x] quando existir, mostra status da candidatura e botao Retirar candidatura
  - [x] retirada com modal de confirmacao
- [x] Validacao:
  - [x] pps/api: build ok
  - [x] pps/web: build ok
### [2026-02-14] - rh-operacao-fase-8-execucao | v0.3.2 -> v0.4.0

**Motivo:** concluir fase 8 de RH/Operação com onboarding funcional, jornada por funcionário, leitura de comunicados, ponto completo e ciência de contracheque.

- [x] Backend workforce:
  - [x] `time_entries` com fluxo completo (`clock_in`, `lunch_out`, `lunch_in`, `clock_out`) e validação de sequência
  - [x] leitura de comunicados (`notice_reads`) + métricas de leitura por comunicado
  - [x] jornadas por funcionário (`employee_shift_templates`, `employee_shift_assignments`)
  - [x] perfil de funcionário em `tenant_user_profiles` (departamento, cargo, contrato, admissão, salário base)
  - [x] onboarding RH (`employee_onboarding_requirements`, `employee_onboarding_submissions`)
  - [x] resumo financeiro no relatório de ponto (`hourValue`, `overtimeValue`, `deficitValue`, `shiftTemplateName`)
- [x] Backend documentos/contracheques:
  - [x] vínculo automático com funcionário por e-mail (`employee_user_id`)
  - [x] filtros `mineOnly` para visão do próprio funcionário
  - [x] ciência de contracheque (`acknowledged_at`, `acknowledged_by_user_id`)
- [x] Frontend:
  - [x] tela `Onboarding RH` funcional (ficha, checklist, envio e revisão)
  - [x] `Regras de ponto` com regra padrão + criação de jornada + vínculo ao funcionário
  - [x] `Relatórios de ponto` com métricas operacionais e financeiras
  - [x] `Registrar ponto` atualizado para 4 marcações diárias
  - [x] `Contracheques` com filtro "apenas meus" e botão de confirmação de ciência
- [x] Build validado:
  - [x] `apps/api` (`npm run build`)
  - [x] `apps/web` (`npm run build`)
### [2026-02-15] - rh-colaboradores-detalhe-e-associacao-onboarding | v0.4.0 -> v0.4.1

**Motivo:** estruturar RH com lista de colaboradores, detalhe operacional por colaborador e associação automática no onboarding por e-mail.

- [x] Nova tela `Colaboradores / Funcionários` com filtros e ações (visualizar, editar, excluir)
- [x] Novo detalhe de colaborador com:
  - [x] edição de ficha do funcionário
  - [x] upload de documento já associado ao colaborador
  - [x] upload de contracheque já associado ao colaborador
  - [x] listagem dos documentos e contracheques do colaborador
- [x] Onboarding RH sem dropdown de usuário
- [x] Associação automática por e-mail no onboarding (via upsert de employee)
- [x] Backend documentos/contracheques atualizado para filtro `employeeUserId`
- [x] Página de contracheques ajustada para largura total útil (sem espaço sobrando à direita)
- [x] Build API/Web validado
### [2026-02-15] - rh-contracheque-upload-lote-por-colaborador | v0.4.1 -> v0.4.2

**Motivo:** substituir importacao por CSV por fluxo de upload em lote de PDFs por lista de colaboradores, com filtros cumulativos e rascunho/pre-salvo.

- [x] Backend workforce/perfil:
  - [x] `tenant_user_profiles` com `employee_tags text[]` (migration nova)
  - [x] API de perfil de colaborador atualizada para ler/salvar `employeeTags`
  - [x] normalizacao de tags no backend
- [x] Frontend RH:
  - [x] onboarding e detalhe do colaborador com campo de tags
  - [x] nova tela `Upload Contracheque` em lote por colaboradores (sem CSV)
  - [x] filtros cumulativos: departamento, cargo, tipo de contrato, tag + busca
  - [x] tabela com colunas: nome, CPF, departamento, cargo, contrato, salario, upload
  - [x] upload por linha com status de rascunho/pre-salvo e botao salvar em massa
- [x] Navegacao:
  - [x] removido atalho de importacao CSV do menu lateral
  - [x] tela `import-csv` mantida apenas como aviso e redirecionamento de fluxo
- [x] Build validado:
  - [x] `apps/api` (`npm run build`)
  - [x] `apps/web` (`npm run build`)
### [2026-02-15] - employee-ux-registro-ponto-selfie-geo-ajustes-admin | v0.4.2 -> v0.4.3

**Motivo:** adequar experiência do colaborador (role `employee`) com visão restrita por perfil e evoluir o fluxo de ponto com comprovação (selfie + geolocalização), solicitação de ajuste e governança de edição/aprovação no admin.

- [x] Navegação e visões por role:
  - [x] menu lateral com ocultação de Recrutamento para `employee` puro
  - [x] `Visão Geral` de colaborador com dados do perfil + documentos anexados + CTA de atualização
  - [x] nova rota de atualização do próprio perfil: `/tenants/[tenantId]/employee/profile`
- [x] Registro de ponto (UX unificada):
  - [x] tela renomeada para `Registro de Ponto`
  - [x] modal por batida com horário/localização e captura de selfie
  - [x] solicitação de permissão de geolocalização/câmera no fluxo
  - [x] tabela consolidada por jornada (Entrada, Início almoço, Retorno almoço, Saída, Banco de horas)
  - [x] solicitação de ajuste por linha com tipo + data/hora + justificativa
- [x] Governança admin no ponto:
  - [x] revisão de solicitações (aprovar/rejeitar com nota)
  - [x] edição manual de batida por modal
  - [x] log de alterações por batida com visualização em modal
- [x] Backend workforce:
  - [x] novas rotas:
    - [x] `PATCH /v1/tenants/:tenantId/time-entries/:entryId`
    - [x] `GET /v1/tenants/:tenantId/time-entries/:entryId/change-logs`
  - [x] criação de ajuste com alvo por batida (`timeEntryId`, `targetEntryType`, `requestedRecordedAt`)
  - [x] aprovação de ajuste com sobreposição do horário e geração de log
  - [x] notificação por comunicado ao concluir revisão de ajuste
- [x] Banco/Supabase:
  - [x] migration `20260215113000_20260215_time_adjustments_advanced.sql`
  - [x] `time_adjustment_requests` estendido com colunas de referência e `change_log`
  - [x] nova tabela `time_entry_change_logs` com RLS/policies
- [x] Build validado:
  - [x] `apps/api` (`npm run build`)
  - [x] `apps/web` (`npm run build`)
### [2026-02-15] - fix-login-role-routing-and-api-connectivity | v0.4.3 -> v0.4.4

**Motivo:** corrigir redirecionamento indevido para portal do candidato em casos de erro de rede/CORS e ajustar prioridade de rota quando usuario possui mais de uma role no assinante.

- [x] Login e roteamento por role:
  - [x] prioridade de redirecionamento: roles de gestao (`owner/admin/manager/analyst/viewer`) antes de `employee`
  - [x] role `employee` redireciona para `/tenants/[tenantId]/dashboard` (nao para `/collaborator`)
  - [x] erro de rede no login nao faz fallback para `/candidate`; agora exibe mensagem de erro
- [x] Conectividade API:
  - [x] `apiFetch` com mensagem PT-BR para falha de conexao com API
  - [x] CORS padrao da API ampliado para `localhost/127.0.0.1` nas portas `3000` e `3200`
- [x] Build validado:
  - [x] `apps/api` (`npm run build`)
  - [x] `apps/web` (`npm run build`)
### [2026-02-15] - fix-time-register-page-size-validation | v0.4.4 -> v0.4.5

**Motivo:** ao registrar ponto, a tela exibia `Payload da requisicao invalido` e nao atualizava a tabela de registros por usar `pageSize` acima do limite aceito pela API.

- [x] Ajuste no frontend de registro de ponto:
  - [x] `time-entries` alterado de `pageSize=200` para `pageSize=100`
  - [x] `time-adjustments` alterado de `pageSize=200` para `pageSize=100`
- [x] Resultado esperado:
  - [x] registro de `Entrada` aparece imediatamente na linha da tabela
  - [x] etapas seguintes preenchem a mesma linha
- [x] Build validado:
  - [x] `apps/web` (`npm run build`)
### [2026-02-15] - time-register-admin-review-ux-and-employee-status-tags | v0.4.5 -> v0.4.6

**Motivo:** finalizar UX de administracao do Registro de Ponto e visibilidade de status de solicitacoes para colaborador.

- [x] Registro de Ponto (admin):
  - [x] lista de colaboradores com filtros (busca, departamento, cargo, contrato, status e tag)
  - [x] selecao de colaborador para abrir os registros de ponto
  - [x] acao de solicitacao com icone de status colorido:
    - [x] pendente (amarelo)
    - [x] aprovado (verde)
    - [x] recusado (vermelho)
  - [x] modal de analise da solicitacao com aprovar/rejeitar e observacao
  - [x] botao de editar registro por linha com modal CRUD (sem alterar data base)
- [x] Registro de Ponto (colaborador):
  - [x] status da ultima solicitacao exibido em tag na linha do registro
  - [x] historico de solicitacoes exibido no modal de log do registro
- [x] Log e rastreabilidade:
  - [x] modal de log mostra alteracoes de batida + solicitacoes relacionadas
- [x] Build validado:
  - [x] `apps/web` (`npm run build`)
- [x] Admin: selecao de colaborador sincronizada na URL (?userId=) para abrir direto o ponto do colaborador
### [2026-02-15] - signup-email-confirmation-otp-flow | v0.4.6 -> v0.4.7

**Motivo:** ao criar conta, o usuario recebia `Email not confirmed` e ficava sem fluxo guiado de confirmacao de e-mail.

- [x] `signup` ajustado:
  - [x] remove tentativa de login automatico quando a conta exige confirmacao
  - [x] redireciona para `/signup/confirm` apos cadastro sem sessao
- [x] nova tela de confirmacao:
  - [x] rota `apps/web/app/signup/confirm/page.tsx`
  - [x] confirma e-mail com codigo OTP (`verifyOtp` tipo `signup`)
  - [x] suporte a confirmacao por link (`exchangeCodeForSession`)
  - [x] botao de reenvio de codigo
  - [x] apos confirmar, redireciona automaticamente para o painel correto
- [x] login:
  - [x] mensagem amigavel para `email not confirmed`
  - [x] atalho `Confirmar e-mail` na tela inicial
- [x] Build validado:
  - [x] `apps/web` (`npm run build`)
- [x] UX: tela /signup/confirm alinhada ao mesmo layout visual da tela de login (auth-shell com painel esquerdo e visual direito)
- [x] UX: pagina /signup padronizada com o mesmo layout visual (uth-shell) de login e confirmacao
- [x] Signup: removido botao 'Confirmar e-mail' e refinadas mensagens para e-mail existente (pendente de confirmacao vs conta existente confirmada)
- [x] Login: removido botao 'Confirmar e-mail'; mantidos apenas 'Criar conta' e 'Recuperar senha'
- [x] Signup: mensagens de e-mail existente ajustadas para os textos solicitados pelo cliente
- [x] Confirmacao de cadastro: tela /signup/confirm alterada para fluxo por link (sem codigo OTP na UI), com instrucoes de verificar caixa de entrada
- [x] Login: tratamento de erro por hash (`otp_expired`/`access_denied`) com mensagem amigavel e limpeza da URL apos retorno do link de confirmacao
- [x] Login: quando houver e-mail nao confirmado, exibir acao `Reenviar link de confirmacao`
- [x] Signup: incluido campo `Confirmar senha` com validacao de igualdade antes de enviar cadastro
- [x] Build validado novamente: `apps/web` (`npm run build`)
- [x] UX login: botao `Reenviar link de confirma��o` reposicionado para aparecer logo abaixo do aviso e antes do botao `Entrar`
- [x] Login: mensagem de sucesso ao reenviar confirmacao ajustada para `Link reenviado com sucesso.`
- [x] Login: mapeado erro `email rate limit exceeded` para mensagem amigavel em PT-BR no fluxo de reenvio de confirmacao
- [x] Login: mensagem de sucesso do reenvio agora orienta conferir o endereco de e-mail caso nao receba
- [x] RH perfil (funcionario + admin): adicionado upload de foto com crop quadrado nas telas de atualizacao de perfil
- [x] Crop de avatar ajustado para salvar em ate 200x200px (mantendo dimensoes menores quando aplicavel)
- [x] Backend Workforce: novos endpoints de avatar do colaborador
  - [x] POST `/v1/tenants/:tenantId/employee-profile/avatar/upload-intent`
  - [x] POST `/v1/tenants/:tenantId/employee-profile/avatar/confirm-upload`
- [x] Workforce schema de perfil atualizado para metadados da imagem do colaborador
- [x] Migration criada: `supabase/migrations/20260219093000_20260219_employee_profile_avatar.sql`
  - [x] colunas de imagem em `tenant_user_profiles`
  - [x] bucket `employee-avatars`
- [x] Validacao tecnica
  - [x] `apps/api`: `npm run check`
  - [x] `apps/web`: `npm run build`
- [x] Fix migration avatar colaborador: removido BOM do SQL e aplicado no remoto via `npx supabase db push`
### [2026-02-19] - time-register-admin-unification-and-payload-fix | v0.4.7 -> v0.4.8

**Motivo:** fluxo de ponto do admin ainda caia em telas legadas e a tela de `Registro de Ponto` retornava `Payload da requisicao invalido` ao carregar colaboradores.

- [x] Navegacao do painel do assinante ajustada:
  - [x] `Registro de Ponto` disponivel para perfis de gestao (`owner`, `admin`, `manager`, `analyst`)
  - [x] removidos atalhos legados de ponto separados (`Ajustes de Ponto` e `Relatorios Ponto`) do menu
- [x] Fluxo legado redirecionado para tela unificada:
  - [x] `/time/adjustments/review` -> `/time/register`
  - [x] `/time/reports` -> `/time/register`
- [x] Fix de payload invalido na carga de colaboradores de ponto:
  - [x] `pageSize` da consulta de usuarios ajustado de `200` para `100` (limite aceito pela API)
- [x] Lista de colaboradores do ponto e tela de colaboradores robustecidas:
  - [x] agora incluem usuarios com role `employee` **ou** com `employee-profile` existente
- [x] Permissoes de gestao de ponto no backend ampliadas para incluir `analyst` nos fluxos administrativos de ponto
- [x] Validacao tecnica
  - [x] `apps/api`: `npm run check`
  - [x] `apps/web`: `npm run check`
### [2026-02-19] - time-register-admin-list-vs-details-and-adjustment-visibility-fix | v0.4.8 -> v0.4.9

**Motivo:** no admin, solicitações de ajuste não apareciam de forma consistente e `Registro de Ponto` precisava separar claramente lista de colaboradores e tela de detalhes do ponto.

- [x] Fix de visibilidade de ajustes no admin:
  - [x] corrigida carga inicial para buscar ajustes com `mineOnly=false` no contexto de gestão, evitando filtro incorreto na primeira renderização
- [x] Registro de ponto separado em duas experiências:
  - [x] `Registro de Ponto` (admin): fica somente com lista de colaboradores + filtros
  - [x] botão `Abrir ponto` agora leva para rota dedicada de detalhe
  - [x] nova rota: `/tenants/:tenantId/time/register/:userId` (redireciona para modo detalhe)
  - [x] modo detalhe (`?detail=1&userId=`): exibe dados do colaborador + tabela de registros/ajustes + resumo de relatório
- [x] Ajuste no comportamento de seleção:
  - [x] no admin, seleção em lista redireciona para detalhe em vez de carregar tudo na mesma tela
- [x] Validacao tecnica
  - [x] `apps/web`: `npm run check`
  - [x] `apps/api`: `npm run check`
- [x] Fix de visibilidade de ajustes no admin (detalhes do ponto): matching agora considera `timeEntryId` e fallback legado por `userId + targetDate` para nao perder solicitacoes antigas sem vinculo direto de entry.
- [x] Validacao tecnica: `apps/web` (`npm run check`)
- [x] UX ponto (admin/lista): removido container/mensagem "Selecione um colaborador para abrir os detalhes do ponto." por ser redundante na tela de lista.
### [2026-02-19] - time-adjustment-log-and-admin-visibility-hard-fix | v0.4.9 -> v0.4.10

**Motivo:** solicitacoes de ajuste nao apareciam corretamente para admin e os logs do funcionario nao registravam a solicitacao pendente no historico do ponto.

- [x] Backend (parsing de query booleana) corrigido:
  - [x] `mineOnly=false` agora e interpretado corretamente (antes podia virar `true` por coercao)
  - [x] aplicado em `time-adjustments`, `oncall` e `notices` para consistencia
- [x] Backend (time-adjustments) com filtro de colaborador no modo gestao:
  - [x] adicionado `targetUserId` no endpoint `GET /v1/tenants/:tenantId/time-adjustments`
  - [x] admin/gestao agora pode listar ajustes diretamente do colaborador selecionado
- [x] Backend (logs de solicitacao) ajustado:
  - [x] ao criar solicitacao de ajuste com `timeEntryId`, grava log em `time_entry_change_logs` com `source=adjustment_request`
  - [x] metadata do log inclui `adjustmentId` e `status=pending`
- [x] Frontend (Registro de Ponto) ajustado:
  - [x] carga de ajustes no admin envia `targetUserId` junto de `mineOnly=false` no modo detalhe
  - [x] melhora a associacao por linha e libera status/icones no detalhe do admin
- [x] Validacao tecnica
  - [x] `apps/api`: `npm run check`
  - [x] `apps/web`: `npm run check`
- [x] UX ponto (admin): icone de status de ajuste atualizado para alto contraste com fundo por status e icone branco
  - [x] pendente: fundo amarelo
  - [x] rejeitado: fundo vermelho
  - [x] aprovado: fundo verde
  - [x] arquivo: `apps/web/app/tenants/[tenantId]/time/register/page.tsx`
- [x] Ponto (ajuste de marcacao): bloqueio de solicitacao quando data/hora quebrar a sequencia da mesma linha (etapa anterior/proxima)
  - [x] validacao no frontend antes de enviar solicitacao
  - [x] validacao no backend na criacao da solicitacao
  - [x] validacao no backend na aprovacao da solicitacao (protege contra concorrencia/alteracoes posteriores)
- [x] Garantia de sobreposicao no mesmo registro:
  - [x] aprovacao continua atualizando o `timeEntryId` da propria solicitacao
  - [x] sem criar nova batida, apenas sobrescrita da marcacao alvo
  - [x] mantendo trilha de auditoria (`time_entry_change_logs`)
- [x] Novo erro de dominio: `TIME_ADJUSTMENT_OUT_OF_SEQUENCE` com mensagem amigavel em PT-BR
- [x] Operacao assistida: limpeza completa dos dados de ponto no banco remoto para novo ciclo de testes
  - [x] tabelas limpas: `time_entries`, `time_adjustment_requests`, `time_entry_change_logs`
  - [x] contagem antes: 16 / 3 / 2
  - [x] contagem depois: 0 / 0 / 0
### [2026-02-19] - time-rules-screen-split-model-crud-and-shift-linking | v0.4.10 -> v0.4.11

**Motivo:** separar a experiência de `Regras de ponto` em fluxos claros (lista, criação, edição e vinculação), removendo a abordagem monolítica da tela anterior.

- [x] Backend: edição de modelo de jornada habilitada
  - [x] novo endpoint `PATCH /v1/tenants/:tenantId/shift-templates/:templateId`
  - [x] handler/schema `updateShiftTemplate`
  - [x] service `updateShiftTemplate` com validação de roles de gestão
  - [x] repository `updateShiftTemplate` para persistência no `employee_shift_templates`
- [x] Frontend: `Regras de ponto` separado em telas dedicadas
  - [x] `time/rules` agora exibe apenas lista de modelos cadastrados
  - [x] botão `Criar modelo` no canto superior direito da lista
  - [x] ações por linha: `Editar` + `Vincular jornada` lado a lado
  - [x] nova rota de criação: `time/rules/new`
  - [x] nova rota de edição: `time/rules/[templateId]`
  - [x] nova rota de vinculação: `time/rules/assign`
- [x] UX: removida seção de `Regra padrão` da tela de regras de ponto
- [x] Perfil do colaborador (admin, modo edição)
  - [x] incluído botão `Vincular jornada` no header, levando para `time/rules/assign` com `targetUserId` pré-preenchido
- [x] Validação técnica
  - [x] `apps/api`: `npm run check`
  - [x] `apps/web`: `npm run check`
### [2026-03-03] - public-jobs-and-quick-apply-with-auth-modal | v0.4.11 -> v0.4.12

**Motivo:** tornar vagas/detalhes públicos e permitir candidatura sem login prévio, com opção de login no modal ou candidatura rápida com criação automática de conta.

- [x] Backend (API pública de vagas)
  - [x] novo endpoint `GET /public/jobs/:jobId` para detalhe público da vaga (sem autenticação)
- [x] Backend (candidatura rápida pública)
  - [x] novo endpoint `POST /public/jobs/:jobId/quick-apply`
  - [x] payload: `fullName`, `email`, `cpf`, `phone`, `resumeFileName`, `resumeMimeType`, `resumeBase64`, `screeningAnswers`
  - [x] validação de perguntas obrigatórias da vaga também no fluxo rápido
  - [x] criação/convite automático de conta via Supabase Auth (envio de e-mail para confirmação/definição de senha)
  - [x] upload de currículo no bucket de currículos
  - [x] criação/atualização de candidato no tenant e efetivação da candidatura mesmo sem confirmação imediata do e-mail
- [x] Backend (repositório candidato)
  - [x] busca de candidato por e-mail no tenant
  - [x] atualização de `user_id` do candidato quando conta é associada
  - [x] `createTenantCandidate` ajustado para aceitar `userId` opcional
- [x] Frontend (páginas públicas)
  - [x] nova listagem pública de vagas: `/vagas`
  - [x] novo detalhe público de vaga: `/vagas/detalhe/[jobId]`
- [x] Frontend (fluxo "Me candidatar")
  - [x] se logado: candidatura direta
  - [x] se deslogado: modal com opções `Fazer login` e `Candidatura rápida`
  - [x] `Fazer login`: mostra campos de autenticação dentro do modal e conclui candidatura
  - [x] `Candidatura rápida`: campos `Nome completo`, `E-mail`, `CPF`, `Telefone`, `Anexar currículo (PDF)`
- [x] Frontend (máscaras e validações)
  - [x] máscara de CPF e telefone no fluxo rápido
  - [x] validação de CPF/telefone e exigência de currículo no envio rápido
- [x] Erros de domínio
  - [x] novo erro mapeado: `INVALID_FILE_BASE64`
  - [x] mensagem de `USER_INVITE_FAILED` generalizada para não ficar restrita ao fluxo de funcionário
- [x] Validação técnica
  - [x] `apps/api`: `npm run check`
  - [x] `apps/web`: `npm run check`
### [2026-03-03] - users-module-email-first-onboarding-and-profile-email-lock | v0.4.12 -> v0.4.13

**Motivo:** ajustar `Gerenciar usu�rios` para fluxo de onboarding de funcion�rio iniciado por e-mail, reutilizando os mesmos campos do perfil do colaborador e garantindo consist�ncia do e-mail de login no CRUD de �Minha conta�.

- [x] Backend (`tenant-users`)
  - [x] novo tipo `EmployeeLookupResult`
  - [x] novo handler/service/repository para busca por e-mail
  - [x] nova rota `GET /v1/tenants/:tenantId/employees/lookup-by-email?email=...`
  - [x] retorno inclui pr�-dados do colaborador quando existentes:
    - `fullName`, `cpf`, `phone`, `department`, `positionTitle`, `contractType`, `admissionDate`, `baseSalary`, `employeeTags`
- [x] Frontend (`Gerenciar usu�rios`)
  - [x] formul�rio de inclus�o alterado para fluxo em 2 etapas:
    - etapa 1: somente campo de e-mail + bot�o `Buscar e-mail`
    - etapa 2: formul�rio completo de onboarding (mesmos campos do m�dulo de colaborador/perfil)
  - [x] se e-mail existir, dados s�o pr�-preenchidos; se n�o existir, onboarding segue para cria��o/vincula��o
  - [x] persist�ncia final unificada:
    - v�nculo via `POST /employees`
    - dados completos via `PUT /employee-profile`
- [x] Backend/Frontend (`employee-profile`)
  - [x] `EmployeeProfile` passou a retornar `authEmail` (e-mail real da conta de login)
  - [x] p�gina �Meu perfil� (employee) usa `authEmail` no campo e-mail como somente leitura
  - [x] salvamento do perfil mant�m `personalEmail` alinhado ao e-mail de login
- [x] Valida��o t�cnica
  - [x] `apps/api`: `npm run check`
  - [x] `apps/web`: `npm run check`
### [2026-03-03] - collaborator-documents-tabbed-requests | v0.4.13 -> v0.4.14

**Motivo:** reorganizar a secao de documentos do colaborador em abas por contexto, com fluxo de solicitacao do RH, resposta do colaborador e consolidacao para download.

- [x] Frontend (`colaborador/detalhes`)
  - [x] secao de documentos refeita com abas:
    - `Pessoal`
    - `Contratacao`
    - `Cursos`
    - `Propostas`
    - `Docs Avulsos`
    - `Docs Recisorios`
    - `Baixar os documentos`
  - [x] botao `+ Adicionar documento` mantido e fluxo em modal
- [x] Logica por aba implementada
  - [x] Pessoal/Contratacao/Cursos/Docs Avulsos/Docs Recisorios:
    - criar solicitacao (RH)
    - upload de resposta pelo colaborador (ou RH em nome dele)
  - [x] Propostas:
    - upload direto de documento pelo RH para visualizacao
- [x] Tipos de documento por aba
  - [x] `Pessoal`: carteira de trabalho, comprovante de residencia, CPF, RG, titulo de eleitor, CNH
  - [x] `Contratacao`: contrato assinado, declaracoes diversas, ASO/exames
  - [x] `Cursos`: cursos e treinamentos
  - [x] `Docs Avulsos`: documentos diversos
  - [x] `Docs Recisorios`: solicitacao de aviso previo assinado e termo de rescisao assinado + uploads diretos do RH
- [x] Campo descricao aplicado nos fluxos de solicitacao/documento
- [x] Tabela por aba
  - [x] status visual `Solicitado` / `Recebido`
  - [x] acao de envio de arquivo para solicitacoes pendentes
  - [x] abertura de arquivo em nova aba
- [x] Aba `Baixar os documentos`
  - [x] lista consolidada das solicitacoes
  - [x] selecao individual e selecao em lote
  - [x] download dos itens selecionados (nova aba)
- [x] Estilos globais
  - [x] adicionadas classes `doc-tabs` e `doc-tab` para padronizar navegacao por abas
- [x] Validacao tecnica
  - [x] corrigido encoding invalido do arquivo de pagina para UTF-8
  - [x] `apps/web`: `npm run build` (ok)
### [2026-03-03] - onboarding-email-lookup-merge-candidate-profile | v0.4.14 -> v0.4.15

**Motivo:** no onboarding de funcionario via `Buscar e-mail`, os dados do perfil do usuario/candidato nao estavam sendo reaproveitados, obrigando redigitacao manual.

- [x] Backend (`tenant-users.lookup-by-email`)
  - [x] lookup passou a mesclar fontes de dados:
    - `tenant_user_profiles` (quando ja existir cadastro RH)
    - `candidate_profiles` (perfil completo do usuario/candidato)
    - `candidates` do tenant (fallback por `user_id` ou `email`)
  - [x] campos de retorno agora sao preenchidos com fallback consistente:
    - `fullName`, `cpf`, `phone`
    - `positionTitle` (fallback de `desired_position`)
    - `contractType` (fallback de `candidates.contract`)
- [x] Efeito esperado no frontend (`Gerenciar usuarios`)
  - [x] ao clicar `Buscar e-mail`, o onboarding do admin passa a vir pre-preenchido com os dados ja existentes do perfil do usuario
- [x] Validacao tecnica
  - [x] `apps/api`: `npm run check`
### [2026-03-03] - collaborator-doc-modal-fixes-request-vs-direct | v0.4.15 -> v0.4.16

**Motivo:** no modal de documentos do colaborador, a UX de `Criar solicita��o` estava exibindo campo de anexo indevido e o envio n�o dava feedback claro quando havia falha/valida��o.

- [x] Frontend (`colaborador/detalhes`)
  - [x] campo `Arquivo (PDF)` agora aparece apenas quando:
    - acao = `Adicionar documento agora`, ou
    - aba = `Propostas`
  - [x] em `Criar solicita��o`, o campo de anexo fica oculto
- [x] Fluxo de submit do modal
  - [x] adicionada valida��o e mensagem de erro **inline no pr�prio modal** (`docModalError`)
  - [x] mensagens de valida��o do modal:
    - tipo n�o selecionado
    - nome/e-mail do colaborador ausente
    - arquivo obrigat�rio ausente em modo direto
  - [x] upload de arquivo condicionado corretamente (`shouldUploadFile`)
  - [x] tratamento de erro agora exibe feedback no modal e tamb�m no erro global
  - [x] ao trocar a��o no select, limpa arquivo e erro do modal
- [x] Valida��o t�cnica
  - [x] `apps/web`: `npm run build` (ok)
### [2026-03-03] - workforce-profile-consistency-and-collaborator-payload-fix | v0.4.16 -> v0.4.17

**Motivo:** tela de detalhes do colaborador com `Payload da requisicao invalido` e inconsist�ncia de dados entre CRUDs de usu�rio/candidato/colaborador.

- [x] Frontend (`colaborador/detalhes`)
  - [x] corrigido `pageSize` dos endpoints para respeitar limite da API:
    - `documents`: `200 -> 100`
    - `document-requests`: `300 -> 100`
  - [x] modal de documentos ajustado:
    - em `Criar solicita��o`, campo de anexo fica oculto
    - anexo mostrado apenas em `Adicionar documento agora` e `Propostas`
- [x] Backend (`workforce.repository`)
  - [x] `getEmployeeProfile` agora usa fallback de dados em m�ltiplas fontes:
    - `tenant_user_profiles`
    - `candidate_profiles`
    - `candidates` do tenant
    - `auth.users` (email/metadados)
  - [x] `upsertEmployeeProfile` passou a sincronizar campos base para consist�ncia:
    - `full_name`, `email`, `cpf`, `phone` propagados para `candidate_profiles`
    - atualiza��o em `candidates` por `user_id` e fallback por `email` (vinculando `user_id` quando aplic�vel)
- [x] Backend (`tenant-users.repository`)
  - [x] `findUserIdByEmail` expandido para buscar tamb�m em:
    - `tenant_user_profiles.personal_email`
    - `candidate_profiles.email`
    - `candidates.email`
    - (mantido fallback em `auth.admin.listUsers`)
- [x] Valida��o t�cnica
  - [x] `apps/api`: `npm run build`
  - [x] `apps/web`: `npm run build`
### [2026-03-04] - document-requests-without-postgrest-relationship | v0.4.17 -> v0.4.18

**Motivo:** erro na tela de detalhes do colaborador: `Could not find a relationship between 'document_requests' and 'documents' in the schema cache`.

- [x] Backend (`documents-payslips.repository`)
  - [x] removida depend�ncia de `select("*, documents(*)")` em `document_requests`
  - [x] criada montagem manual de `latestDocument` via consulta separada em `documents` por `request_id`
  - [x] ajustados m�todos:
    - `createDocumentRequest`
    - `findDocumentRequestById`
    - `listDocumentRequests`
    - `markDocumentRequestCompleted`
- [x] Resultado
  - [x] endpoint passa a funcionar mesmo sem relacionamento expl�cito no schema cache do PostgREST
- [x] Valida��o t�cnica
  - [x] `apps/api`: `npm run build`
### [2026-03-04] - document-requests-without-postgrest-relationship | v0.4.17 -> v0.4.18

**Motivo:** erro na tela de detalhes do colaborador: `Could not find a relationship between 'document_requests' and 'documents' in the schema cache`.

- [x] Backend (`documents-payslips.repository`)
  - [x] removida depend�ncia de `select("*, documents(*)")` em `document_requests`
  - [x] criada montagem manual de `latestDocument` via consulta separada em `documents` por `request_id`
  - [x] ajustados m�todos:
    - `createDocumentRequest`
    - `findDocumentRequestById`
    - `listDocumentRequests`
    - `markDocumentRequestCompleted`
- [x] Resultado
  - [x] endpoint passa a funcionar mesmo sem relacionamento expl�cito no schema cache do PostgREST
- [x] Valida��o t�cnica
  - [x] `apps/api`: `npm run build`
### [2026-03-04] - apply-remote-migrations-sync-schema | v0.4.18 -> v0.4.19

**Motivo:** erro em tela (`Schema do banco desatualizado. Aplique as ultimas migrations e tente novamente.`).

- [x] Infra/Supabase
  - [x] executado `npx.cmd supabase db push` no projeto remoto
  - [x] aplicada migration pendente: `20260303110000_20260303_collaborator_document_tabs_requests.sql`
  - [x] validado sincronismo local/remoto com `npx.cmd supabase migration list` (sem divergencias)
- [x] Resultado
  - [x] schema remoto atualizado para a versao esperada pelo backend/frontend atuais
### [2026-03-04] - nav-novo-colaborador-and-avatar-fallback | v0.4.19 -> v0.4.20

**Motivo:** ajustar UX de navega��o de RH e corrigir imagem de perfil quebrada no detalhe do colaborador.

- [x] Navega��o
  - [x] removido `Novo colaborador` do menu lateral (`layout.tsx`)
  - [x] removido `Usuarios` do menu lateral (acesso agora via fluxo de colaboradores)
  - [x] adicionada a��o `Novo Colaborador` no topo da tela `Colaboradores`
  - [x] tela `/users` renomeada visualmente para `Novo Colaborador` (breadcrumb + t�tulo)
- [x] Avatar colaborador/funcion�rio
  - [x] resolu��o robusta de URL da imagem (`path` relativo ou URL completa)
  - [x] fallback visual quando imagem falhar (n�o quebra o layout)
- [x] Valida��o t�cnica
  - [x] `apps/web`: `npm run build`
### [2026-03-04] - colaboradores-button-and-novo-colaborador-width | v0.4.20 -> v0.4.21

**Motivo:** ajuste visual solicitado em RH (botao `Novo Colaborador` fora do padrao e tela `/users` com sobra a direita).

- [x] Frontend (`collaborator/page.tsx`)
  - [x] acao `Novo Colaborador` alterada para estilo de botao padrao (`btn`)
- [x] Frontend (`users/page.tsx`)
  - [x] container da pagina `Novo Colaborador` alterado para `container wide` (largura total)
- [x] Design base (`globals.css`)
  - [x] criado estilo reutilizavel para links com aparencia de botao (`a.btn` e variacao `secondary`)

## 2026-03-04 - Comunicados: anexos, WYSIWYG e segmentacao
- Backend: adicionado suporte a destinatarios especificos (
ecipient_user_ids) em 
otices e tabela 
otice_attachments (migration 20260304110000_20260304_notices_attachments_and_recipients.sql).
- Backend: endpoint de upload para anexos de comunicado em /v1/tenants/:tenantId/notices/upload-intent.
- Backend: POST /v1/tenants/:tenantId/notices agora aceita 
ecipientUserIds e ttachments.
- Backend: listagem de comunicados retorna anexos com URL assinada para abertura segura.
- Frontend (/tenants/[tenantId]/notices): editor WYSIWYG para corpo do comunicado, insercao de imagem no corpo, anexos de arquivos, filtros de destinatarios por cargo/contrato/busca e selecao em massa via checkbox.
- Frontend: listagem exibe anexos clicaveis e metadados de destinatarios especificos.
- Validacao: 
pm run build OK em pps/api e pps/web.

### [2026-03-04] - separate-novo-colaborador-from-usuarios-gestao | v0.4.21 -> v0.4.22

**Motivo:** separar claramente o fluxo de colaborador (RH) da gestao de usuarios internos (backoffice).

- [x] Frontend (`collaborator/page.tsx`)
  - [x] botao `Novo Colaborador` agora direciona para `/onboarding` (fluxo de colaborador)
- [x] Frontend (`users/page.tsx`)
  - [x] pagina recriada como `Usuarios de Gestao`
  - [x] cadastro exclusivo para perfis internos: Admin, RH (manager) e Analista
  - [x] lista mostra apenas usuarios de backoffice (owner/admin/manager/analyst)
  - [x] mantidas acoes de ativar/inativar/desligar/excluir com confirmacao
- [x] Frontend (`layout.tsx`)
  - [x] adicionado item de menu `Usuarios` na secao Governanca
  - [x] `Novo Colaborador` permanece fora do menu lateral (acesso pela tela Colaboradores)
- [x] Backend (`tenant-users`)
  - [x] novo fluxo `upsertBackofficeUser` com validacao de role interna
  - [x] novo endpoint `POST /v1/tenants/:tenantId/backoffice-users`
  - [x] persistencia de role e perfil no tenant sem vinculo ao fluxo de colaborador
  - [x] auditoria para criacao/atualizacao de usuario de gestao
- [x] Validacao tecnica
  - [x] `apps/api`: `npm.cmd run build`
  - [x] `apps/web`: `npm.cmd run build`

### [2026-03-04] - role-labels-rh-frontend | v0.4.22 -> v0.4.23

**Motivo:** padronizar exibicao de perfis no frontend, mostrando RH em vez de manager.

- [x] Frontend (pps/web/lib/role-labels.ts)
  - [x] criado helper central para labels de role (owner, dmin, manager, nalyst, employee, iewer)
  - [x] regra: manager -> RH
- [x] Frontend (pps/web/app/tenants/[tenantId]/layout.tsx)
  - [x] Perfis: no sidebar usando labels amigaveis (sem role tecnica crua)
- [x] Frontend (pps/web/app/tenants/page.tsx)
  - [x] texto 
oles: alterado para perfis: com labels amigaveis
- [x] Frontend (pps/web/app/tenants/[tenantId]/dashboard/page.tsx)
  - [x] card Perfis ativos usando labels amigaveis
- [x] Frontend (pps/web/app/tenants/[tenantId]/users/page.tsx)
  - [x] normalizada exibicao de perfis na tabela com helper central

- `collaborator-profile-merge-doc-resolution | v0.4.23 -> v0.4.24`
  - Corrigido merge do detalhe do colaborador para combinar `employee_profile` com dados base de usuario/auth, evitando formularios vazios quando o perfil do tenant e parcial.
  - Ajustada a resolucao da imagem de perfil do colaborador para aceitar caminhos completos, relativos e paths do bucket sem quebrar o `src`.
  - Reforcada a busca de `employeeUserId` por e-mail no modulo de documentos/solicitacoes usando `tenant_user_profiles`, `candidate_profiles`, `candidates` e fallback em `auth.users`.
  - Build validado em `apps/api` e `apps/web`; `supabase migration list` confirmou remoto sincronizado.

### [2026-03-18] - oncall-legacy-freeze-step1 | v0.4.24 -> v0.4.25

**Motivo:** iniciar refatoracao do modulo de sobreaviso sem conflito entre paginas legadas.

- [x] Frontend (`apps/web/app/tenants/[tenantId]/layout.tsx`)
  - [x] links de sobreaviso migrados de `/oncall/register` e `/oncall/review` para `/oncall`
- [x] Frontend (`apps/web/app/tenants/[tenantId]/oncall/page.tsx`)
  - [x] pagina unica temporaria para congelamento do legado
- [x] Frontend (`apps/web/app/tenants/[tenantId]/oncall/register/page.tsx`)
  - [x] mantida apenas como redirect para `/oncall`
- [x] Frontend (`apps/web/app/tenants/[tenantId]/oncall/review/page.tsx`)
  - [x] mantida apenas como redirect para `/oncall`
- [x] Controle de execucao
  - [x] checklist criado em `TEMP_SOBREAVISO_TODO_20260318.md`

### [2026-03-18] - oncall-shifts-domain-migration-step2 | v0.4.25 -> v0.4.26

**Motivo:** criar a base de dados do novo fluxo de sobreaviso para substituir o modelo legado `oncall_entries`.

- [x] Migration (`supabase/migrations/20260318110000_20260318_oncall_shifts_refactor_domain.sql`)
  - [x] criado enum `public.oncall_shift_status` (`pending_ack`, `acknowledged`, `entry_registered`, `cancelled`)
  - [x] criada tabela `public.oncall_shifts` com:
    - [x] periodo (`scheduled_date`, `starts_at`, `ends_at`)
    - [x] status e metadados de ciclo (`acknowledged_*`, `cancelled_*`)
    - [x] espelhamento com ponto (`linked_time_entry_id`, `linked_time_entry_at`)
    - [x] snapshot de colaborador para filtros (`nome`, `email`, `cpf`, `telefone`, `departamento`, `cargo`, `contrato`, `tags`)
  - [x] criada tabela de auditoria `public.oncall_shift_events`
  - [x] adicionado `oncall_shift_id` em `public.time_entries` para vinculo direto
  - [x] criados indices para busca por tenant, usuario, status, data e filtros de colaborador
  - [x] habilitado RLS com politicas:
    - [x] leitura por membro do tenant (self/admin)
    - [x] escrita administrativa para criacao/remocao e eventos
  - [x] aplicado backfill inicial de `oncall_entries` para `oncall_shifts`
  - [x] criado evento `created` para trilha inicial de historico no backfill
- [x] Controle de execucao
  - [x] Task 2 marcada como concluida em `TEMP_SOBREAVISO_TODO_20260318.md`
### [2026-03-18] - oncall-shifts-backend-contracts-step3 | v0.4.26 -> v0.4.27

**Motivo:** preparar o contrato tecnico (tipos + DTOs) do novo modulo de sobreaviso antes da troca de repository/service.

- [x] Tipos de dominio (`apps/api/src/modules/workforce/workforce.types.ts`)
  - [x] adicionados `OncallShiftStatus` e `OncallShiftEventType`
  - [x] adicionados `OncallShift`, `OncallShiftEvent` e `OncallShiftWithEvents`
  - [x] `OncallEntry` legado mantido temporariamente e marcado como transitorio
- [x] DTOs/schemas Zod (`apps/api/src/modules/workforce/workforce.oncall-shifts.contracts.ts`)
  - [x] `createOncallShiftSchema`
  - [x] `listOncallShiftsSchema` (com filtros por data/nome/e-mail/cpf/cargo/departamento/contrato/status/tag)
  - [x] `getOncallShiftByIdSchema`
  - [x] `updateOncallShiftSchema`
  - [x] `deleteOncallShiftSchema`
  - [x] `acknowledgeOncallShiftSchema`
  - [x] `registerOncallShiftEntrySchema`
  - [x] `listOncallShiftEventsSchema`
  - [x] tipos inferidos `z.infer` exportados para uso no service/repository
- [x] Validacao tecnica
  - [x] `apps/api`: `npm.cmd run build`
### [2026-03-18] - oncall-shifts-backend-repository-step4 | v0.4.27 -> v0.4.28

**Motivo:** implementar a camada de persist�ncia do novo dom�nio de sobreaviso (`oncall_shifts`) preservando o legado durante a transi��o.

- [x] Reposit�rio (`apps/api/src/modules/workforce/workforce.repository.ts`)
  - [x] adicionados tipos internos de banco `OncallShiftRow` e `OncallShiftEventRow`
  - [x] adicionados mapeadores `mapOncallShift` e `mapOncallShiftEvent`
  - [x] criado CRUD de turnos de sobreaviso:
    - [x] `createOncallShift`
    - [x] `listOncallShifts` (filtros por data, nome, e-mail, CPF, departamento, cargo, contrato, status e tag)
    - [x] `getOncallShiftById`
    - [x] `updateOncallShift`
    - [x] `deleteOncallShift`
  - [x] criada trilha de eventos:
    - [x] `createOncallShiftEvent`
    - [x] `listOncallShiftEvents`
  - [x] criado agregador de detalhe:
    - [x] `getOncallShiftWithEvents` (inclui `linkedTimeEntry` quando houver)
  - [x] criados m�todos de regras de suporte:
    - [x] `findOverlappingOncallShift`
    - [x] `linkOncallShiftToTimeEntry`
    - [x] `unlinkOncallShiftTimeEntry`
    - [x] `listConfirmedOncallShiftsInRange`
- [x] Compatibilidade tempor�ria mantida
  - [x] legado `oncall_entries` preservado no reposit�rio para evitar quebra na virada de service/rotas
- [x] Valida��o t�cnica
  - [x] `apps/api`: `npm.cmd run build`
### [2026-03-19] - oncall-modal-collaborator-search-fix | v0.4.28 -> v0.4.29

**Motivo:** corrigir carregamento de colaboradores no modal de cadastro de sobreaviso e adicionar selecao com pesquisa por nome/e-mail/CPF.

- [x] Frontend (`apps/web/app/tenants/[tenantId]/oncall/page.tsx`)
  - [x] carga de colaboradores ajustada para considerar:
    - [x] usuarios com role `employee`
    - [x] usuarios com `employee-profile` existente (mesmo sem role explicita)
  - [x] enriquecimento de dados do colaborador no modal com nome/e-mail/CPF vindos do `employee-profile`
  - [x] campo de colaborador alterado para fluxo com pesquisa + lista filtrada
  - [x] filtro de pesquisa por prefixo/contem em nome e e-mail, e por digitos no CPF
  - [x] remocao dos botoes duplicados no modal de cadastro (substituicao do `ConfirmModal` por modal dedicado)
- [x] Validacao tecnica
  - [x] `apps/web`: `npm.cmd run build`

## oncall-modal-collaborator-search-hotfix | v0.4.29 -> v0.4.30 | 2026-03-19
- Corrigido dropdown vazio no modal de cadastro de sobreaviso.
- Removido preenchimento autom�tico de `employeeSearch` com label completa do primeiro colaborador (isso quebrava o filtro e podia zerar a lista).
- Mantido filtro pesquis�vel por nome/e-mail/CPF com comportamento de prefixo e cont�m.
- Mantido carregamento de colaboradores por `/users` + enriquecimento por `/employee-profile`.
- Valida��o: `npm.cmd run build` em `apps/web` conclu�do com sucesso.

## oncall-payload-invalid-fix-users-pagesize | v0.4.30 -> v0.4.31 | 2026-03-19
- Corrigido erro "Payload da requisicao invalido" na tela de Sobreaviso.
- Causa: frontend chamava `/v1/tenants/:tenantId/users?pageSize=200`, por�m backend valida `pageSize <= 100`.
- Ajuste aplicado em `apps/web/app/tenants/[tenantId]/oncall/page.tsx`: `pageSize=100`.
- Validacao: `npm.cmd run build` em `apps/web` concluido com sucesso.
## oncall-schema-cache-fix-db-push | v0.4.31 -> v0.4.32 | 2026-03-19
- Corrigido erro de schema cache no Sobreaviso: Could not find the table 'public.oncall_shifts'.
- Acao executada: npx.cmd supabase db push --yes no root do projeto.
- Migration aplicada no remoto: 20260318110000_20260318_oncall_shifts_refactor_domain.sql.
- Verificacao pos-push:
  - consulta REST service-role em /rest/v1/oncall_shifts?select=id&limit=1 retornou sucesso.
  - tabela public.oncall_shifts disponivel para o modulo.
## execution-control-consolidation | v0.4.32 -> v0.4.33 | 2026-03-19
- Criado arquivo unico de controle de fechamento para eliminar retrabalho e loop de contexto:
  - `CHECKLIST_FECHAMENTO_EFETIVO_20260319.md`
- Consolidado estado real:
  - backend `oncall-shifts` presente
  - frontend de sobreaviso presente
  - migration de `oncall_shifts` ja aplicada no remoto
  - seed demo principal ainda pendente (`seed-demo-showcase.ts`)
- Definidas fases fechadas de execucao com criterio objetivo de pronto:
  - F1 estabilizar sobreaviso
  - F2 fechar fluxo admin/funcionario
  - F3 seed demo repetivel + cleanup
  - F4 entrega de demonstracao

## oncall-filters-payload-hardening | v0.4.33 -> v0.4.34 | 2026-03-19
- Corrigida validacao excessivamente restritiva dos filtros de sobreaviso que gerava "Payload da requisicao invalido" em cenarios legitimos.
- Arquivo: `apps/api/src/modules/workforce/workforce.oncall-shifts.contracts.ts`
- Ajustes:
  - filtros opcionais agora aceitam string vazia (normalizada para `undefined`)
  - `email` de filtro alterado para busca textual parcial (nao exige formato estrito de e-mail)
  - `targetUserId`, `from`, `to`, `status`, `page` e `pageSize` robustecidos para query string vazia
- Validacao tecnica: `npm.cmd run build` em `apps/api` concluido com sucesso.

## demo-seed-showcase-fast-populate | v0.4.34 -> v0.4.35 | 2026-03-19
- Implementado seed remoto completo de demonstracao:
  - arquivo `apps/api/scripts/seed-demo-showcase.ts`
  - cobertura: vagas, candidatos, candidaturas, perfis (employee/candidate), regras/atribuicoes de jornada, ponto, ajustes (pendente/aprovado/recusado), logs de alteracao, sobreavisos, eventos de sobreaviso, comunicados, anexos, contracheques, solicitacoes de documentos e documentos por abas.
- Scripts npm adicionados em `apps/api/package.json`:
  - `seed:demo:showcase`
  - `seed:demo:cleanup`
- Hardening de cleanup:
  - `apps/api/scripts/seed-demo-cleanup.ts` agora tolera falha de Storage por bucket e segue limpeza do banco.
- Executado com sucesso no tenant `vvconsulting-mvp` (id `a7636d0a-34ba-40f4-8375-f66133fe7512`) usando senha padrao de demo `0123teste`.

### [2026-03-20] - platform-superadmin-tenant-slug-public-jobs | v0.4.35 -> v0.5.0

**Motivo:** superadmin da plataforma (dono do SaaS), slug amig�vel na cria��o do tenant, vagas p�blicas sem cat�logo global, detalhe por tenant+job e corre��o de rota GET `/public/jobs` (UUID vs slug).

- [x] **Banco:** migration `20260320120000_20260320_platform_superadmins.sql` � tabela `platform_superadmins`.
- [x] **API:** env `PLATFORM_SUPERADMIN_EMAILS` (default `tools@pontoumdigital.com.br`); middleware `requirePlatformAdmin`; rotas `/v1/platform/me|tenants|superadmins` e `POST .../grant-admin`; cria��o de tenant com slug via `slugifyCompanyName` + sufixo num�rico se colidir; m�dulo `apps/api/src/modules/platform`.
- [x] **API p�blica:** `GET /public/jobs` retorna 403 (cat�logo global desativado); `GET /public/jobs/:tenantSlug/:jobId` detalhe com valida��o de tenant; `GET /public/jobs/:segment` � se UUID, detalhe por id; sen�o lista por slug do tenant.
- [x] **Candidato:** `listSuggestedJobs` restringe vagas aos `tenant_id` onde existe linha em `candidates` para o usu�rio (sem misturar tenants desconhecidos).
- [x] **Web:** `/superadmin` (CRUD visual: tenants, superadmins, entrar como admin); login redireciona superadmin para `/superadmin`; `/tenants` com atalho Plataforma; `/vagas` informativa (sem listagem global); detalhe p�blico em `/vagas/[tenantSlug]/[jobId]`; `/vagas/detalhe/[jobId]` redireciona para URL com slug; candidato �Vagas sugeridas� via `listSuggestedJobs` apenas.
- [ ] **Opera��o:** aplicar migration no Supabase remoto (`supabase db push`).
