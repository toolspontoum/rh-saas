# Design System
## Ponto Um Digital - Web primeiro, mobile-ready

---

## 0) Escopo

Este documento cobre a base visual do produto web no MVP e define contratos de UI para reutilizacao no app mobile na fase 2.

---

## 1) Principios

- Clareza operacional: interfaces de RH e colaborador com foco em tarefa.
- Consistencia entre modulos: mesmos padroes de layout, estados e feedback.
- Acessibilidade pragmatica: contraste, foco visivel, navegacao por teclado e textos legiveis.
- Escalabilidade: componentes orientados a token para reaproveitamento no mobile.

---

## 2) Fundacoes Visuais

### Cores (tokens base)
- `color-bg`: `#F7F9FC`
- `color-surface`: `#FFFFFF`
- `color-primary`: `#0B3A6E`
- `color-primary-strong`: `#07294D`
- `color-accent`: `#1F8A70`
- `color-warning`: `#E0A100`
- `color-danger`: `#C0392B`
- `color-text`: `#1A1F2B`
- `color-text-muted`: `#5E6A7D`
- `color-border`: `#D8DFEA`

### Tipografia
- Familia principal: `Montserrat, sans-serif` (titulos e labels fortes)
- Familia secundaria: `Roboto, sans-serif` (conteudo e formularios)
- Escala:
  - `font-size-xs`: 12px
  - `font-size-sm`: 14px
  - `font-size-md`: 16px
  - `font-size-lg`: 20px
  - `font-size-xl`: 28px

### Espacamento e raio
- `space-1`: 4px
- `space-2`: 8px
- `space-3`: 12px
- `space-4`: 16px
- `space-5`: 24px
- `space-6`: 32px
- `radius-sm`: 6px
- `radius-md`: 10px
- `radius-lg`: 14px

---

## 3) Layout e Navegacao

- Estrutura web autenticada:
  - Sidebar fixa com modulos.
  - Topbar com tenant, busca e perfil.
  - Conteudo central com grid responsivo.
  - Padrao de largura para area autenticada (admin, colaborador e candidato): usar largura total util (`container wide`), evitando colunas estreitas e espaco ocioso a direita.
  - Tabelas, listas e cards operacionais devem ocupar toda a largura do content-area, mantendo apenas paddings laterais do layout.
  - Regra de overflow: telas autenticadas nao devem gerar rolagem horizontal da pagina; quando necessario, usar `table-wrap` apenas no corpo da tabela/componente e manter `body/content-area` sem overflow horizontal.
- Breakpoints:
  - `sm`: 480
  - `md`: 768
  - `lg`: 1024
  - `xl`: 1280
- Comportamento mobile-web:
  - Sidebar vira drawer.
  - Tabelas com colunas prioritarias + detalhe expandivel.

---

## 4) Componentes Base

- Inputs:
  - Mascaras e validacao visual por estado (`default`, `error`, `success`, `disabled`).
- Buttons:
  - Variantes `primary`, `secondary`, `ghost`, `danger`.
- Tables:
  - Filtros persistentes, ordenacao e estados vazios claros.
- Status badges:
  - `ativo`, `inativo`, `desligado`, `pendente`, `aprovado`, `reprovado`, `em_analise`.
- Modals:
  - Confirmacoes destrutivas com motivo obrigatorio quando aplicavel.
- Upload:
  - Componente unico para PDF com mensagem de limite/tamanho.

---

## 5) Padroes por Dominio

- RH Dashboard:
  - Cards de pendencias, avisos e documentos novos.
- Vagas e Candidatos:
  - Busca por nome e filtros por contrato/status.
- Documentos e Contracheques:
  - Fluxo focado em lista, lote e rastreabilidade.
- Ponto e Sobreaviso:
  - Linha do tempo por status e acao de ajuste com justificativa.

---

## 6) Estados e Feedback

- Loading:
  - Skeleton para listas e cards.
- Empty state:
  - Mensagem objetiva + CTA primario.
- Erro:
  - Mensagem amigavel + codigo de rastreio.
- Sucesso:
  - Toast curto + persistencia em trilha de atividades quando relevante.

---

## 7) Preparacao para Mobile (fase 2)

- Tokens exportados em formato compartilhado (`json` + `ts`).
- Contratos de componentes sem dependencia de framework especifico.
- Sem regras de negocio em componente visual.
- Nomenclatura unificada de status e labels para web/app.
