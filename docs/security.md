# Seguranca
## Ponto Um Digital - Fullstack SaaS RH

---

## 0) Baseline obrigatorio

- Supabase com RLS habilitado em todas as tabelas de negocio.
- API Node como camada obrigatoria de regras e autorizacao.
- Validacao de entrada server-side em 100% dos endpoints.
- `tenant_id` e `user_id` sempre derivados do contexto autenticado.
- Segredos apenas via variaveis de ambiente (nunca hardcoded).

---

## 1) Auth e autorizacao

- Auth central no Supabase.
- RBAC por tenant via `user_tenant_roles`.
- Verificacao de permissao por acao (listar, criar, editar, excluir, aprovar).
- Bloqueio explicito para usuarios desligados/inativos.

---

## 2) Protecao de dados e LGPD

- Minimizacao de coleta de dados pessoais.
- Mascaramento de dados sensiveis na UI quando nao necessario acesso total.
- Retencao por tipo de dado com padrao de 5 anos.
- Anonimizacao automatizada para dados expirados.
- Exclusao logica quando houver obrigacao de historico/auditoria.

---

## 3) Documentos e uploads

- Apenas PDF para fluxos de documentos e contracheques.
- Validacoes obrigatorias: extensao, MIME real, tamanho maximo e antivirus (quando disponivel).
- Nome de arquivo normalizado e identificador unico por upload.
- Armazenamento namespaced por tenant e modulo.
- Download autorizado por role e ownership.

---

## 4) Auditoria e rastreabilidade

- Tabela `audit_logs` para operacoes criticas.
- Registrar: ator, tenant, acao, recurso, timestamp, resultado, metadata minima.
- Eventos obrigatorios:
  - aprovacao/reprovacao/ajuste de ponto e sobreaviso;
  - upload/download de documentos sensiveis;
  - alteracao de permissoes e status de colaborador.

---

## 5) Hardening de aplicacao

- Rate limiting em endpoints sensiveis.
- CORS restritivo para ambientes homologados/producao.
- Headers de seguranca no frontend e API.
- Sanitizacao de saida para prevenir XSS.
- Logs sem dados sensiveis em texto aberto.

---

## 6) Gates de release

- Revisao de policies RLS por modulo.
- Testes de autorizacao por perfil (positivo e negativo).
- Checklist de upload seguro.
- Verificacao de segredos e variaveis obrigatorias.
- Revisao de incidentes e monitoramento pos-release.

