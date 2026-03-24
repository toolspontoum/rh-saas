# Arquitetura do Projeto
## Padrão Ponto Um Digital — Fullstack + three.js

---

## 0) Resumo Executivo

**Objetivo:** <descrição>

---

## 1) Contextos Técnicos

- Web / Mobile
- API Node
- Supabase (DB, Auth, RLS)
- three.js (renderização 3D)

---

## 2) Arquitetura Geral

- Separação UI / Domínio / Dados / Infra
- three.js isolado da lógica de negócio

---

## 3) three.js — Estratégia

- Papel do 3D: <decorativo | funcional | crítico>
- Lazy loading obrigatório
- Fallback sem WebGL
- Assets versionados

---

## 4) Modelo de Dados

- Entidades principais
- Multitenancy (se aplicável)

---

## 5) Segurança

- RLS em todas as tabelas
- Validação server-side

---

## 6) Performance

- Suspense/lazy
- Limite de polígonos
- Teste mobile

---

