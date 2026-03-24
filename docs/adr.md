# ADR - Architecture Decision Records

---

## ADR-0001

- **Data:** 2026-02-12
- **Decisao:** Estrategia de entrega por modulos com releases incrementais.
- **Motivo:** Reduzir risco operacional e de seguranca em um escopo amplo.
- **Impacto:** Planejamento por dominios e gates de qualidade/seguranca por release.

---

## ADR-0002

- **Data:** 2026-02-12
- **Decisao:** MVP com arquitetura multiempresa (tenant) desde o inicio.
- **Motivo:** Requisito de negocio para modelo SaaS e ativacao por planos/modulos.
- **Impacto:** Todas as entidades de dominio passam a ter isolamento por `tenant_id` e politicas RLS.

---

## ADR-0003

- **Data:** 2026-02-12
- **Decisao:** API do MVP sera privada, sem exposicao publica para terceiros.
- **Motivo:** Priorizar paridade funcional e controle de seguranca no primeiro ciclo.
- **Impacto:** Sem contrato publico externo nesta fase; integracoes futuras via versionamento de API.

---

## ADR-0004

- **Data:** 2026-02-12
- **Decisao:** Politica de retencao LGPD customizada por tipo, com padrao inicial de 5 anos.
- **Motivo:** Atender compliance e permitir adequacao por categoria de dado.
- **Impacto:** Implementacao de `retention_policies` e jobs de anonimizacao por expiracao.
