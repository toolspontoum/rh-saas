# Escopo completo

Este documento consolida:
- Funcoes existentes (o que ja esta no sistema).
- Melhorias (correcoes/ajustes em funcoes atuais + recomendacoes internas).
- Novas features (funcionalidades novas solicitadas).

## Funcoes existentes

### Site institucional (publico)
- Paginas: `index.php`, `sobre.php`, `servicos.php`, `certificacoes.php`, `blog.php`, `vagas.php`, `vaga_detalhes.php`, `contato.php`.
- Templates: `topo.php`, `header.php`, `footer.php`.
- Conteudo predominantemente por imagens em `img/`.
- Blog com carrossel e links externos.
- Formulario de contato (front-end apenas).

### Portal administrativo (area-login)
- CRUDs e rotinas diversas (alunos, clientes, professores, pets, sessoes, disciplinas, etc.).
- Uploads de documentos e arquivos (sem padronizacao forte).
- Vagas e candidaturas integradas ao portal.
- Documentos e contracheques no mesmo fluxo (sem pagina dedicada).

### Folha de ponto (base atual)
- Registro e historico de ponto (modelo atual com digitacao manual).
- Fluxo de documentos e solicitacoes (basico).

### Infraestrutura front-end
- Tema base (Allaia v1.3) com CSS/JS.
- Sass legado com Compass (config e logs).

### Email
- PHPMailer legado 5.2.8 + pacote 6.9.3 coexistindo.
- SMTP configurado em `PHPMailer/mailer.php`.

---

## Melhorias (ajustes em funcoes existentes)

### Melhorias solicitadas pelo cliente (PDFs)
- Pagina Inicio RH:
  - Painel com recados, anotacoes, observacoes e pendencias.
  - Pop-up de novos documentos enviados por colaboradores.
  - Avisos gerais do RH exibidos na home do colaborador.
- Pagina Vagas:
  - Filtro por nome do candidato na area de candidaturas.
- Pagina Candidatos:
  - Filtro por contrato (lista suspensa).
  - Exibir contrato no perfil do candidato (auto).
  - Exclusao de candidatos inativos (massa ou individual).
- Pagina Colaboradores:
  - Excluir colaborador sem vinculos (com motivo).
  - Marcar colaborador como desligado + bloquear acesso + mover para aba.
- Pagina Documentos:
  - Filtro combinado por contrato + nome.
  - Corrigir bug do status "Concluido" (nao redirecionar).
  - Restringir uploads para PDF (RH e Colaborador).
  - Corrigir bug de retorno para pasta "Pessoal" apos solicitacao.
- Pagina Gerenciar Usuarios:
  - Separar candidatos ativos/inativos/desligados em abas.
  - Campo de busca por nome.
- Portal do Colaborador:
  - Home com avisos do RH.
  - Pop-up para contracheque/solicitacao de documento.
  - Meus Documentos: apenas PDF.
  - Folha de ponto: botao de registro (captura automatica), ajuste com justificativa e aprovacao, historico por status, filtros por periodo, mensagem ao RH.

### Melhorias sugeridas (riscos/qualidade)
- Remover credenciais hardcoded do SMTP e usar variaveis de ambiente.
- Refatorar SQL para prepared statements (mitigar SQL injection).
- Sanitizar uploads (nome, MIME, extensao, tamanho).
- Corrigir encoding dos arquivos para UTF-8.
- Implementar backend no formulario de contato (validacao + anti-spam).
- Ajustar warnings de sessao (`verifica.php`) para reduzir ruido em logs.
- Revisar build Sass/Compass se houver recompilacao.

---

## Novas Features

### SaaS / Multiempresa / Planos
- Transformar o portal em SaaS (taxa de implantacao + assinatura).
- Estrutura multiempresa (tenant).
- Planos e modulos com bloqueio de funcionalidades nao contratadas.
- Modularizacao para clientes com/sem modulo de vagas.
- Pagina de vagas integravel ao site do cliente ou standalone.

### Contracheques (pagina dedicada)
- Criar pagina exclusiva de contracheques.
- Envio individual e em massa.
- Divisao por contrato.
- Upload por CSV (integracao com sistemas contabeis).

### Folha de ponto (RH) - expansoes
- Cadastro de escala de trabalho.
- Registro de ferias.
- Calculo de horas extras e noturnas.
- Permissao de correcoes (30/60/90 dias).
- Relatorios de ponto por periodo (extras, excesso, adicional noturno).
- Historico de banco de horas.
- Cadastro e gestao de feriados/recessos.

### Sobreaviso (novo tipo de registro)
- Criar tipo de registro "Sobreaviso" separado do ponto normal.
- Colaborador:
  - Botao/aba para registrar sobreaviso.
  - Campos obrigatorios (data, inicio, termino, tipo, observacao).
  - Sem edicao apos envio (apenas ajuste aprovado pelo RH).
- RH:
  - Secao especifica com filtros por colaborador/contrato/periodo.
  - Acoes: aprovar/rejeitar/ajustar/validar/em analise.
- Relatorios:
  - Relatorio especifico de sobreaviso (PDF/Excel/CSV).
  - Bloco de resumo no relatorio de ponto.

### Seguranca e governanca de dados
- Politica de seguranca para dados/documentos sensiveis.
- Permissoes por perfil e auditoria basica.
