# VVConsulting.com.br – Documentação Técnica (Base Viva)

## Instruções de leitura e continuidade
- **Fluxo obrigatório**: ler um arquivo por vez e **registrar imediatamente** no `doc.md` antes de abrir o próximo.
- **Ordem**: começar pela raiz e avançar para dentro das pastas (ordem alfabética dentro de cada pasta).
- **Registro por arquivo**: cada entrada deve conter: caminho, tipo, função/responsabilidade, dependências, pontos de atenção, e observações (ex.: credenciais, URLs externas, assets usados).
- **Arquivos binários/grandes**: não abrir o conteúdo; registrar apenas metadados (nome, tipo, possível uso).
- **Se estourar contexto**: retomar pela última entrada registrada no `doc.md` e seguir a ordem definida.
- **Formato**: manter seções claras e concisas; usar listas para itens técnicos e riscos.
- **Pastas a pular (não abrir arquivo por arquivo)**:
  - `area-login/uploads` (uploads do sistema).
  - `backup` na raiz (backup antigo do WordPress).
  - `img` na raiz (imagens do projeto).

## Status de leitura
- Último arquivo documentado: **vvconsulting.com.br/ (pasta)**
- Próximo na fila: **(fim da arvore mapeada)**

## Índice (gerado manualmente)
- Raiz
- Pastas: `.well-known`, `area-login`, `backup`, `css`, `img`, `js`, `PHPMailer`, `sass`, `video`


---

### .htaccess
- Tipo: Configuração do Apache (cPanel).
- Função: Define handler PHP (ea-php80___lsphp) para extensões `.php`, `.php8`, `.phtml`.
- Dependências/ambiente: Hospedagem cPanel com módulo `mime_module` ativo.
- Pontos de atenção: Comentário indica **não editar** (gerado pelo cPanel). Alterações podem ser sobrescritas.


---

### blog.php
- Tipo: Página pública (PHP + HTML/CSS) – seção Blog/Notícias.
- Função: Exibe imagens de blog (PNG/WEBP) e carrossel com links externos para matérias do site `girocostadosol.com.br`.
- Estrutura:
  - Inclui `topo.php` (head/assets) e `header.php`/`footer.php`.
  - CSS inline para layout e responsividade de uma grade de 3 imagens (`.row-3img`).
  - Carrossel `#carousel-home` com `owl-carousel` mostrando cards com imagens linkadas.
  - Links para posts no Instagram com imagens locais `img/blog/8.png`, `9.png`, `10.png`.
- Dependências:
  - JS: `js/common_scripts.min.js`, `js/main.js`, `js/carousel-home.js`.
  - CSS base em `topo.php` + classes do tema (owl-carousel).
- Pontos de atenção:
  - Forte dependência de conteúdo estático em `img/blog/*`.
  - URLs externas fixas (girocostadosol.com.br, instagram.com).
  - `overflow-x: hidden;` no body (pode mascarar problemas de layout).


---

### certificacoes.php
- Tipo: Página pública (PHP + HTML) – seção Certificações.
- Função: Exibe imagens estáticas de certificações.
- Estrutura:
  - Inclui `topo.php`, `header.php`, `footer.php`.
  - Conteúdo: imagens `img/certificacoes/2.png` e `img/certificacoes/3.png`.
- Dependências:
  - JS: `js/common_scripts.min.js`, `js/main.js`, `js/carousel-home.js`.
- Pontos de atenção:
  - Página totalmente baseada em imagens; sem conteúdo textual indexável.


---

### contato.php
- Tipo: Página pública (PHP + HTML/CSS) – Contato.
- Função: Exibe formulário de contato (front-end apenas), mapa Google e imagens de contato.
- Estrutura:
  - Inclui `topo.php`, `header.php`, `footer.php`.
  - CSS inline extenso para layout do formulário e mapa responsivo.
  - Formulário HTML (`action="#"`, `method="POST"`) sem processamento no back-end.
  - Mapa embed do Google Maps (iframe) e link externo para a localização.
- Dependências:
  - JS: `js/common_scripts.min.js`, `js/main.js`, `js/carousel-home.js`.
  - Imagens: `img/contato/6.png`, `img/contato/5.png`.
- Pontos de atenção:
  - **Não há handler** para envio do formulário (apenas front-end).
  - Há **duplicidade de `<style>`** (`<style><style>`), possível erro de marcação.
  - Conteúdo/Texto codificado com caracteres inválidos em alguns pontos (acentos corrompidos no arquivo).


---

### error_log
- Tipo: Log de erros do PHP/Apache.
- Tamanho/metadata: 242.136 bytes; última modificação em 30/01/2026 00:13 (America/Sao_Paulo).
- Conteúdo observado (amostra): repetidas warnings `Undefined array key "id"` em `area-login/verifica.php` (linha 7).
- Implicações:
  - Indica acessos a páginas que incluem `verifica.php` sem `$_SESSION["id"]` definido.
  - Pode poluir logs e mascarar erros reais.


---

### footer.php
- Tipo: Template parcial (HTML) – rodapé do site.
- Função: Exibe navegação secundária, dados de contato, links legais e redes sociais.
- Conteúdo principal:
  - Menu com links internos (Home, Sobre, Serviços, Blog, Certificações, Vagas, Contato).
  - Dados institucionais (CNPJ, endereço, telefone, e-mail).
  - Links “Política de Privacidade” e “Termos de Uso” apontando para `javascript:void(0)` (placeholders).
  - Ícones de redes sociais com links externos (Facebook, LinkedIn, Instagram).
- Pontos de atenção:
  - Texto com caracteres corrompidos (acentos) indica possível problema de encoding no arquivo.
  - Links legais não levam a páginas reais.


---

### header.php
- Tipo: Template parcial (HTML) – cabeçalho/menu do site.
- Função: Exibe logo e menus de navegação principal e secundário.
- Estrutura:
  - Logo com link para `index.php`.
  - Botão de menu mobile (`open_close` + hamburger).
  - Dois blocos de menu: principais (Home/Sobre/Serviços) e secundários (Blog/Certificações/Vagas/Contato).
- Dependências:
  - Classes CSS do tema (`main_header`, `Sticky`, `hamburger`, etc.).
  - Ícone `ti-close` (provavelmente do tema/ícones).
- Pontos de atenção:
  - Texto com acentos corrompidos (encoding).
  - Link no menu mobile aponta para `index.html` (pode ser inconsistente com `index.php`).


---

### index.php
- Tipo: Página pública (PHP + HTML) – Home.
- Função: Apresenta carrossel principal e links para seções do site via imagens.
- Estrutura:
  - Inclui `topo.php`, `header.php`, `footer.php`.
  - Carrossel `#carousel-home` (owl-carousel) com 3 slides usando imagens `img/home/4.png`, `5.png`, `6.png`.
  - Blocos adicionais de imagem com link para Sobre/Serviços/Blog/Vagas (`img/home/7.png`, `77.png`, `8.png`, `9.png`).
- Dependências:
  - JS: `js/common_scripts.min.js`, `js/main.js`, `js/carousel-home.js`.
- Pontos de atenção:
  - Conteúdo totalmente baseado em imagens (SEO/ acessibilidade limitada).


---

### servicos.php
- Tipo: Página pública (PHP + HTML) – Serviços.
- Função: Exibe sequência de imagens estáticas de serviços.
- Estrutura:
  - Inclui `topo.php`, `header.php`, `footer.php`.
  - Conteúdo: imagens `img/servicos/1.png` até `img/servicos/15.png`.
- Dependências:
  - JS: `js/common_scripts.min.js`, `js/main.js`, `js/carousel-home.js`.
- Pontos de atenção:
  - Página baseada apenas em imagens; pouco conteúdo textual.


---

### sobre.php
- Tipo: Página pública (PHP + HTML) – Sobre Nós.
- Função: Exibe imagens estáticas da seção institucional.
- Estrutura:
  - Inclui `topo.php`, `header.php`, `footer.php`.
  - Conteúdo: imagens `img/sobre/4.png`, `3.png`, `5.png`, `2.png` com `alt` simples.
- Dependências:
  - JS: `js/common_scripts.min.js`, `js/main.js`, `js/carousel-home.js`.
- Pontos de atenção:
  - Página baseada em imagens (texto mínimo).


---

### topo.php
- Tipo: Template parcial (HTML head).
- Função: Define metadados, favicons e folhas de estilo globais.
- Conteúdo principal:
  - `<meta charset="utf-8">`, viewport e compatibilidade.
  - Título: **VV Consulting**.
  - Fonts: Google Fonts `Roboto` e `Montserrat`.
  - CSS: `css/bootstrap.min.css`, `css/style.css`, `css/home_1.css`, `css/custom.css`.
- Dependências externas:
  - `fonts.googleapis.com` e `fonts.gstatic.com`.
- Pontos de atenção:
  - `lang="en"` apesar do site ser PT-BR (pode impactar SEO/acessibilidade).


---

### vaga_detalhes.php
- Tipo: Página pública (PHP) – detalhe da vaga + formulário de candidatura.
- Função: Exibe dados da vaga e processa candidatura com upload de currículo e campos dinâmicos.
- Entradas principais:
  - `GET id` para carregar a vaga.
  - `POST` com dados do candidato + `curriculo` (PDF) + campos dinâmicos (`campos[]` e `campos_files[]`).
- Fluxo de leitura de dados:
  - Consulta `vaga` + joins em `area_setor`, `modalidade`, `tipo_contratacao`.
  - Consulta `vaga_campos` para campos dinâmicos ativos.
- Regras de negócio (segundo comentários no topo do arquivo):
  - Lida com cenários de combinação de **email/CPF** (existentes ou não) para criar/atualizar usuário e candidato.
  - Bloqueia candidatura se o e-mail já estiver em uso por outro candidato.
  - Impede **candidatura duplicada** para a mesma vaga (por CPF/e-mail).
  - Avalia campos eliminatórios tipo `sim_nao`; se resposta for `0`, status `REPROVADO_PREFILTRO`.
- Persistência (tabelas observadas):
  - `vv_usuario`, `candidato`, `vaga_candidatura`, `vaga_respostas`, `vaga_campos`, `vaga`.
- Uploads:
  - Salva arquivos em `area-login/uploads`.
  - Currículo: somente PDF (MIME `application/pdf`).
  - Campos dinâmicos tipo `arquivo`: aceita PDF e imagens (jpeg/png/gif/webp).
  - Nomes gerados com prefixo (`cv_v...`, `campo_...`) + timestamp + random.
- E-mail:
  - Usa PHPMailer local (`/PHPMailer/src/*`) com SMTP `mail.vvconsulting.com.br`.
  - Usuário e senha **placeholder** no código (`adm_site@vvconsulting.com.br` / `senha_do_email`).
  - Envia credenciais ao criar novo usuário.
- Front-end:
  - Usa assets de `assets/` (Bootstrap, Simplebar, MetisMenu, DataTables) – esses assets não estão na raiz, podem estar em `area-login`.
  - Máscaras de CPF/telefone via `jquery.mask` CDN.
- Pontos de atenção:
  - Usa `include "area-login/verifica.php"` para obter `$conexao`.
  - Várias mensagens e textos com encoding corrompido (acentos).
  - Dependência de tabelas e colunas específicas no banco; sem migrations no repo.
  - Email de boas-vindas depende de credenciais SMTP válidas.


---

### vagas.php
- Tipo: Página pública (PHP) – listagem de vagas.
- Função: Lista vagas ativas no banco e direciona para `vaga_detalhes.php?id=...`.
- Estrutura:
  - Inclui `topo.php`, `header.php`, `footer.php`.
  - Inclui `area-login/verifica.php` para conexão com o banco (`$conexao`).
  - Renderiza tabela bootstrap com vagas ativas.
- SQL principal:
  - Tabela `vaga` com `LEFT JOIN` em `area_setor`.
  - Filtros: `ativo = 1`, `status = 'ATIVA'`, `data_validade` >= hoje ou nula.
- Dependências:
  - JS: `js/common_scripts.min.js`, `js/main.js`, `js/carousel-home.js`.
  - CSS: inclui Bootstrap via CDN **no final do body** (potencial redundância com `topo.php`).
- Pontos de atenção:
  - Acentos corrompidos no HTML.
  - Dependência direta do banco e do include de `verifica.php`.


---

### .well-known/
- Tipo: Pasta de configurações/validations (padrão web).
- Conteúdo: **nenhum arquivo visível** no momento.
- Observação: geralmente usada para validações (ex.: SSL/ACME, security.txt). Se necessário, adicionar arquivos conforme provedor.


---

### area-login/adiciona_aluno.php
- Tipo: Backend (PHP) – ação de cadastro de aluno.
- Função: Recebe POST de formulário e cria registros de aluno, vínculo de turma, matrícula e responsável.
- Entradas (POST):
  - Dados do aluno (nome, email, CPF, RG, whatsapp, endereço, filho_professor).
  - Dados do responsável (nome, email, CPF, RG, whatsapp, endereço).
  - Dados de matrícula (valor, desconto, pluri, etico, id_matricula, turma_av).
- Operações no banco:
  - `INSERT` em `alunos`.
  - `INSERT` em `rel_turma_aluno`.
  - `INSERT` em `matriculas`.
  - `INSERT` em `hist_turma_aluno`.
  - `INSERT` em `responsaveis_aluno`.
- Regras/observações:
  - Flags `filho_professor`, `pluri`, `etico` convertidas para `0/1`.
  - `ano_letivo` fixo em **2024** (hardcoded).
  - Valida sucesso com `mysqli_affected_rows` (espera 1 por operação).
  - Redireciona com `alert()` JS para `alunos.php`.
- Pontos de atenção:
  - **Sem prepared statements**; risco de SQL injection.
  - Encoding com acentos corrompidos.
  - Dependência de `verifica.php` para sessão e `$conexao`.


---

### area-login/adiciona_cliente.php
- Tipo: Backend (PHP) – ação de cadastro de cliente.
- Função: Insere cliente e vínculo com plano.
- Entradas (POST):
  - `nome_cliente`, `email`, `whatsapp`, `plano`, `obs`, endereço (cep/rua/numero/compl/bairro/cidade/uf).
- Operações no banco:
  - `INSERT` em `cliente`.
  - `INSERT` em `rel_cliente_plano` (relaciona cliente ao plano).
- Fluxo:
  - Obtém `LAST_INSERT_ID()` para `id_cliente`.
  - Redireciona com `alert()` para `clientes.php`.
- Pontos de atenção:
  - **Sem prepared statements**; risco de SQL injection.
  - Encoding com acentos corrompidos.
  - Dependência de `verifica.php`.


---

### area-login/adiciona_detalhes_sessao.php
- Tipo: Backend (PHP) – atualização de sessão + upload de arquivo.
- Função: Atualiza observação de sessão e registra arquivo associado.
- Entradas (POST/FILES):
  - `id_sessao`, `obs_sessao`, `doc_sessao` (arquivo).
- Upload:
  - Extensões permitidas: `jpg`, `jpeg`, `png`, `gif`, `pdf`, `docx`.
  - Diretório: `uploads/` (cria se não existir, permissões 0777).
  - Salva com **nome original** do arquivo.
- Operações no banco:
  - `UPDATE` em `sessoes` (campo `obs_sessao`).
  - `INSERT` em `arquivo_sessao` (id_sessao, nome_arquivo_sessao).
- Fluxo:
  - Exibe `alert()` e redireciona para `perfil_sessao.php?id=...`.
- Pontos de atenção:
  - **Sem prepared statements**; risco de SQL injection.
  - Upload sem sanitização do nome (risco de overwrite/path issues).
  - Variável `$campo` é montada mas **não usada** no `UPDATE`.
  - Encoding com acentos corrompidos.


---

### area-login/adiciona_disciplina.php
- Tipo: Backend (PHP) – cadastro de disciplina.
- Função: Cria disciplina e vincula a turmas selecionadas.
- Entradas (POST):
  - `nome` (disciplina), `turmas[]` (IDs).
- Operações no banco:
  - `INSERT` em `disciplina`.
  - `INSERT` em `rel_disc_turma` para cada turma.
- Fluxo:
  - Usa `LAST_INSERT_ID()` para `id_disciplina`.
  - Mensagens via `alert()` com base em variável `$valida`.
- Pontos de atenção:
  - **Sem prepared statements**; risco de SQL injection.
  - `$valida` somado com valores “mágicos” (1 e +6) para decidir mensagens.
  - Acentos corrompidos.


---

### area-login/adiciona_doc_aluno.php
- Tipo: Backend (PHP) – upload de documento do aluno.
- Função: Salva arquivo em `assets/docs_alunos/` e registra em `docs_alunos`.
- Entradas:
  - `POST id_aluno` (também usa `$_SESSION["id_aluno"]` para redirecionar).
  - `FILES doc_aluno`.
- Upload:
  - Salva com **nome original** em `assets/docs_alunos/`.
  - Validação de MIME comentada (não ativa).
- Operações no banco:
  - `INSERT` em `docs_alunos`.
  - Limpeza: `DELETE FROM docs_alunos WHERE id_aluno='0'`.
- Pontos de atenção:
  - **Sem validação de extensão/MIME ativa**.
  - **Sem sanitização do nome do arquivo** (risco de overwrite/paths).
  - Dependência de `con_bd.php` (credenciais em arquivo separado).
  - Acentos corrompidos.


---

### area-login/adiciona_pet.php
- Tipo: Backend (PHP) – cadastro de pet.
- Função: Cria tutor, cadastra pet (com foto) e relaciona tutor/pet.
- Entradas (POST):
  - Dados do pet: `nome_pet`, `especie`, `raca`, `cor`, `cor_olhos`, `peso`, `porte`, `idade`, `temperamento`, `caracteristicas`, `local`, `data_pet` (DD/MM/YYYY), `pet_status` (pet_e / pet_p), `status_a` (checkbox).
  - Dados do tutor: `nome_tutor`, `email`, `whatsapp`, `tipo_tutor`.
- Upload:
  - `foto_pet` com extensões permitidas `jpg`, `jpeg`, `png`, `gif`.
  - Salva em `./uploads/` com **nome original**.
- Operações no banco:
  - `INSERT` em `tutor`.
  - `INSERT` em `pet` (com `data_e_pet` ou `data_p_pet` conforme status).
  - `INSERT` em `rel_tutor_pet`.
- Pontos de atenção:
  - **Sem prepared statements**; risco de SQL injection.
  - Upload sem sanitização do nome do arquivo (risco de overwrite).
  - Conversão de data assume formato `d/m/Y`.
  - Acentos corrompidos.


---

### area-login/adiciona_planos.php
- Tipo: Backend (PHP) – apesar do nome, cadastra **espécie de pet**.
- Função: Insere espécie em `especie_pet`.
- Entradas (POST):
  - `especie`.
- Operações no banco:
  - `INSERT` em `especie_pet`.
- Pontos de atenção:
  - Nome do arquivo não corresponde à função (confuso).
  - `use PHPMailer...` sem uso no arquivo.
  - **Sem prepared statements**.
  - Acentos corrompidos.


---

### area-login/adiciona_professor.php
- Tipo: Backend (PHP) – cadastro de professor.
- Função: Insere professor e vincula disciplinas e turmas.
- Entradas (POST):
  - Dados do professor (nome, email, CPF/RG, whatsapp, matrícula, endereço, observações).
  - Arrays `disciplinas[]` e `turmas[]`.
- Operações no banco:
  - `INSERT` em `professores`.
  - `INSERT` em `rel_disc_prof` para cada disciplina.
  - `INSERT` em `rel_turma_prof` para cada turma.
- Fluxo:
  - Usa `LAST_INSERT_ID()` para `id_professor`.
  - Mensagens via `alert()` baseadas em soma de `$valida`.
- Pontos de atenção:
  - **Sem prepared statements**.
  - Lógica de validação baseada em números “mágicos” (1, +4, +6).
  - Acentos corrompidos.


---

### area-login/adiciona_raca.php
- Tipo: Backend (PHP) – cadastro de raça de pet.
- Função: Insere raça vinculada a espécie.
- Entradas (POST):
  - `raca`, `especie` (id da espécie).
- Operações no banco:
  - `INSERT` em `raca_pet`.
- Pontos de atenção:
  - `use PHPMailer` sem uso no arquivo.
  - **Sem prepared statements**.
  - Acentos corrompidos.


---

### area-login/adiciona_sessao.php
- Tipo: Backend (PHP) – cadastro de sessão.
- Função: Insere sessão associada a plano e redireciona para perfil do cliente.
- Entradas (POST):
  - `id_cliente`, `id_plano`, `data_cliente_sessao` (DD/MM/YYYY), `obs_sessao`.
- Operações no banco:
  - `INSERT` em `sessoes` (usa `data_sessao` convertido para YYYY-MM-DD).
- Pontos de atenção:
  - **Sem prepared statements**.
  - Não usa `id_cliente` no INSERT (apenas no redirecionamento).
  - Acentos corrompidos.


---

### area-login/adiciona_usuario.php
- Tipo: Backend (PHP) – cadastro de usuário administrativo.
- Função: Cria usuário admin e envia e-mail com senha.
- Entradas (POST):
  - `nome`, `email`, `whatsapp`, `tipo_usuario`.
- Regras:
  - Gera senha aleatória de **5 caracteres** (letras/números).
  - Armazena senha com **MD5**.
  - Impede e-mail duplicado em `usuario_adm`.
- Operações no banco:
  - `SELECT` em `usuario_adm` para validar e-mail.
  - `INSERT` em `usuario_adm`.
- E-mail:
  - Envio via PHPMailer com SMTP configurado no próprio arquivo.
  - **Há credenciais SMTP hardcoded no código** (revisar/rotacionar em produção).
- Pontos de atenção:
  - **Sem prepared statements**.
  - Uso de **MD5** (fraco para senha).
  - Domínios no template de e-mail parecem inconsistentes (`VV Consulting.com.br` com espaço).
  - Acentos corrompidos.


---

### area-login/agenda.php
- Tipo: Página administrativa (HTML/PHP com include de `sidebar.php`).
- Função: Exibe calendário (FullCalendar) dentro do painel administrativo.
- Estrutura:
  - Inclui `sidebar.php`.
  - UI padrão do template admin (topbar, notificações, mensagens, switcher de tema).
- JS/CSS:
  - Usa assets locais em `area-login/assets/*` (bootstrap, app.css, icons, plugins).
  - FullCalendar (`assets/plugins/fullcalendar/js/main.min.js`) + locales via CDN.
- Dados:
  - Eventos **estáticos** hardcoded no JS (datas de 2020).
- Pontos de atenção:
  - Página não consulta banco; conteúdo de calendário parece demo/template.
  - `initialDate` fixo em 2020-12-12.


---

### area-login/alt_planos.php
- Tipo: Backend (PHP) – atualização de espécie de pet.
- Função: Atualiza `especie_pet.nome_especie_pet`.
- Entradas (POST):
  - `id_especie`, `nome`.
- Operações no banco:
  - `UPDATE especie_pet`.
- Pontos de atenção:
  - Nome do arquivo não corresponde à função (confuso).
  - **Sem prepared statements**.


---

### area-login/alt_raca.php
- Tipo: Backend (PHP) – atualização de raça de pet.
- Função: Atualiza `raca_pet` com novo nome e espécie.
- Entradas (POST):
  - `id_raca`, `nome`, `especie`.
- Operações no banco:
  - `UPDATE raca_pet`.
- Pontos de atenção:
  - **Sem prepared statements**.


---

### area-login/alt_usuario.php
- Tipo: Backend (PHP) – atualização de usuário admin.
- Função: Atualiza dados de `usuario_adm`.
- Entradas (POST):
  - `id_usuario`, `nome`, `email`, `tipo_usuario`, `whatsapp`.
- Operações no banco:
  - `UPDATE usuario_adm`.
- Pontos de atenção:
  - **Sem prepared statements**.
  - Variável `$valor` é usada no SQL e **não está definida** (potencial erro).


---

### area-login/altera_avaliacao.php
- Tipo: Backend (PHP) – fragmento HTML para edição de avaliação.
- Função: Busca dados de uma avaliação e renderiza linha/tabela com campos editáveis.
- Entrada:
  - `GET id` (`id_avaliacao`).
- Operações no banco:
  - `SELECT` com joins `avaliacao`, `alunos`, `disciplina` (somente ativos).
- Saída:
  - HTML com dados da disciplina, datas formatadas (`dd/mm/yyyy`) e input de nota.
  - Botão chama `salva_altera_avaliacao(id_aluno, id_avaliacao)` (JS externo).
- Pontos de atenção:
  - **Sem prepared statements**.
  - Parece ser endpoint para AJAX/partial (não página completa).


---

### area-login/altera_avaliacao_exclui.php
- Tipo: Backend (PHP) – exclusão lógica de avaliação + renderização de tabela.
- Função: Marca avaliação como inativa e retorna HTML da lista atualizada do aluno.
- Entradas (GET):
  - `id_aluno`, `id_avaliacao`.
- Operações no banco:
  - `UPDATE avaliacao SET ativo='0'`.
  - `SELECT` com joins `avaliacao`, `alunos`, `disciplina` para aluno.
- Saída:
  - HTML `<thead>`/`<tbody>` com linhas e ações JS (`altera_nota`, `exclui_nota`).
- Pontos de atenção:
  - **Sem prepared statements**.
  - Endpoint parece ser usado por AJAX para atualizar tabela.


---

### area-login/altera_avaliacao_salva.php
- Tipo: Backend (PHP) – atualiza nota de avaliação + renderiza tabela.
- Função: Atualiza `nota_avaliacao` e retorna HTML atualizado da lista do aluno.
- Entradas (GET):
  - `id_aluno`, `id_avaliacao`, `nota`.
- Operações no banco:
  - `UPDATE avaliacao`.
  - `SELECT` com joins `avaliacao`, `alunos`, `disciplina`.
- Saída:
  - HTML `<thead>`/`<tbody>` com ações JS (`altera_nota`, `exclui_nota`).
- Pontos de atenção:
  - **Sem prepared statements**.
  - Endpoint usado provavelmente por AJAX.


---

### area-login/altera_dados.php
- Tipo: Backend (PHP) – atualização de dados do usuário admin (perfil).
- Função: Atualiza nome, e-mail, telefone e opcionalmente senha do `usuario_adm`.
- Entradas (POST):
  - `id`, `nome`, `email`, `whatsapp`, `senha` (opcional).
- Regras:
  - Usa função `cleanInput()` (sanitize + format) com `mysqli_real_escape_string`.
  - Telefone é normalizado apenas com dígitos.
  - Se `senha` preenchida, usa **MD5** e atualiza.
  - Usa transação (`begin_transaction` / `commit` / `rollback`).
- Operações no banco:
  - `UPDATE usuario_adm`.
- Pontos de atenção:
  - Ainda concatena SQL com strings (apesar da limpeza); sem prepared statements.
  - Uso de **MD5** para senha.
  - Alguns comentários indicam que veio de ajuste manual (possível inconsistência com resto do código).


---

### area-login/altera_dados_senha.php
- Tipo: Backend (PHP) – troca de senha do usuário admin.
- Função: Valida inputs e atualiza senha na tabela `usuario_adm`.
- Entradas (POST):
  - `id`, `tipo` (espera `Adm`), `senha`, `nova_senha`.
- Regras:
  - Valida método POST, campos obrigatórios e confirmação de senha.
  - Usa **MD5** para hash (compatibilidade legada).
  - Usa **prepared statement** no UPDATE.
- Saída:
  - Redireciona para `seg_usuario.php` com query `sucesso` ou `erro`.
- Pontos de atenção:
  - Ainda usa MD5 (fraco).
  - Só aceita `tipo` = `Adm`.
  - Acentos corrompidos nos comentários/textos.


---

### area-login/alterar_status_documento.php
- Tipo: Backend (PHP) – alteração de status de documentos de colaborador.
- Função: Atualiza status, grava histórico e envia e-mail quando status vira “Envio Pendente”.
- Entradas (POST):
  - `id` (id_documento), `id_status`.
- Operações no banco:
  - `SELECT` em `status_documento` para obter nome do status.
  - `UPDATE colaborador_documento`.
  - `INSERT` opcional em `historico_atividades` (se usuário logado).
  - `SELECT` com joins (`colaborador_documento`, `colaborador`, `tipo_documento`) para dados do colaborador.
  - Em falha de e-mail, `INSERT` opcional em `notificacoes`.
- E-mail:
  - PHPMailer com SMTP `mail.vvconsulting.com.br` e credenciais **placeholder** (`senha_do_email`).
  - Disparo quando status contém “ENVIO PENDENTE”.
- Pontos de atenção:
  - **Sem prepared statements** em várias queries.
  - Variável `$id_colaborador` usada no redirect final pode ficar **indefinida** se o SELECT não retornar dados.
  - Acentos corrompidos.


---

### area-login/alunos.php
- Tipo: Página administrativa (PHP/HTML) – gestão de alunos.
- Função: Exibe formulário de matrícula/cadastro de aluno e lista alunos em tabela DataTables.
- Estrutura:
  - Inclui `verifica.php`, `sidebar.php`, `header.php`.
  - Formulário `action="adiciona_aluno.php"` para cadastro completo (matrícula, turma, aluno, responsável, endereço).
  - Tabela `#alunos` com dados de alunos + responsável + turma + status.
- Operações no banco (leituras):
  - `SELECT` em `turmas` para combo.
  - `SELECT` em `alunos` + `responsaveis_aluno` + `matriculas`.
  - `SELECT` em `rel_turma_aluno` + `turmas` + `hist_turma_aluno` para turma atual.
- Regras/observações:
  - `ano_letivo` hardcoded como **2024**.
  - CEP preenchido via `viacep.com.br` (requisição JSONP).
  - Campos de endereço do responsável podem copiar dados do aluno (via JS).
- Dependências:
  - DataTables, Select2, tagsinput, jQuery.
  - Scripts locais em `assets/js/js-adm.js` e `assets/js/app.js`.
- Pontos de atenção:
  - Muito JS inline; várias strings com acentos corrompidos.
  - Endpoint do formulário depende de `adiciona_aluno.php` (sem prepared statements).


---

### area-login/anamnese.php
- Tipo: Página administrativa (PHP/HTML) – gestão de anamnese.
- Função: Edita perguntas de anamnese, envia solicitação a cliente e lista respostas recebidas.
- Estrutura:
  - Inclui `verifica.php`, `sidebar.php`, `header.php`.
  - Formulário de atualização de perguntas: `action="atualiza_anamnese.php"` (inputs com `id_pergunta`).
  - Formulário de envio para cliente: `action="envia_anamnese_cliente.php"`.
  - Lista respostas (`respostas_anamnese` + `rel_anamnese_cliente` + `perguntas_anamnese`) agrupadas por email.
- Operações no banco (leituras):
  - `SELECT * FROM perguntas_anamnese WHERE ativo='1'`.
  - `SELECT` com joins para listar respostas recebidas.
- Dependências:
  - Vários plugins do template admin; jQuery UI (datepicker) via CDN.
- Pontos de atenção:
  - Possui strings de debug “aaaaaaaa…” no HTML (provável lixo de teste).
  - Variável `$script_completo` usada em JS e **não definida** no arquivo.
  - Acentos corrompidos.


---

### area-login/anamnese_leitura.php
- Tipo: Página administrativa (PHP/HTML) – leitura de respostas de anamnese.
- Função: Exibe respostas da anamnese de um cliente específico.
- Entradas (GET):
  - `email`, `nome`, `data` (data convertida para dd/mm/yyyy).
- Operações no banco:
  - `SELECT` com joins `respostas_anamnese`, `rel_anamnese_cliente`, `perguntas_anamnese` filtrando por `email_cliente`.
- Estrutura:
  - Inclui `verifica.php`, `sidebar.php`, `header.php`.
  - Exibe perguntas e respostas em blocos.
- Pontos de atenção:
  - **Sem prepared statements**; usa `email` direto no SQL.
  - Inclui blocos de formulário de cliente que parecem não ser usados (código duplicado do anamnese.php).
  - Variável `$script_completo` usada em JS e **não definida**.
  - Acentos corrompidos.


---

### area-login/app-chat-box.html
- Tipo: Página estática (HTML) – template de chat do painel admin.
- Função: Demonstra interface de chat (conteúdo estático, sem integração backend).
- Estrutura:
  - Sidebar e topbar completas do template “Rukada”.
  - Listas e mensagens com conteúdo fictício.
- Dependências:
  - CSS/JS do template em `assets/*` (bootstrap, metismenu, perfect-scrollbar, app.js).
- Pontos de atenção:
  - Conteúdo e menus são **demo** (links para páginas de template).
  - Não há integração com dados reais.


---

### area-login/app-contact-list.html
- Tipo: Página estática (HTML) – template de lista de contatos.
- Função: Exibe cartões de contatos (layout demo do template admin).
- Estrutura:
  - Sidebar e topbar do template “Rukada”.
  - Conteúdo com cards de contatos fictícios.
- Dependências:
  - Assets em `assets/*` (bootstrap, metismenu, app.js etc.).
- Pontos de atenção:
  - Conteúdo é **demo**; sem integração com banco.


---

### area-login/app-emailbox.html
- Tipo: Página estática (HTML) – template de inbox/e-mail.
- Função: Interface de e-mail do template admin (conteúdo demo).
- Estrutura:
  - Sidebar/topbar do template “Rukada”.
  - Lista de e-mails e composição de mensagem (sem backend).
- Dependências:
  - Assets em `assets/*` (bootstrap, metismenu, perfect-scrollbar, app.js).
- Pontos de atenção:
  - Conteúdo e funcionalidades são **demo** (links para páginas estáticas).


---

### area-login/app-emailread.html
- Tipo: Página estática (HTML) – leitura de e-mail (template admin).
- Função: Exibe detalhe de e-mail selecionado (conteúdo demo).
- Estrutura:
  - Sidebar/topbar do template “Rukada”.
  - Bloco `email-read-box` com texto Lorem Ipsum.
- Dependências:
  - Assets em `assets/*` (bootstrap, metismenu, perfect-scrollbar, app.js).
- Pontos de atenção:
  - Conteúdo é **demo**; sem integração com backend.


---

### area-login/app-file-manager.html
- Tipo: Página estática (HTML) – template de gerenciador de arquivos.
- Função: UI de file manager (conteúdo demo).
- Estrutura:
  - Sidebar/topbar do template “Rukada”.
  - Cards e tabelas com dados fictícios (Google Drive/Dropbox/OneDrive etc.).
- Dependências:
  - Assets em `assets/*` (bootstrap, metismenu, app.js).
- Pontos de atenção:
  - Conteúdo é **demo**, sem integração com backend/arquivos reais.


---

### area-login/app-fullcalender.html
- Tipo: Página estática (HTML) – template de calendário.
- Função: Exibe FullCalendar com eventos **estáticos** (demo).
- Estrutura:
  - Sidebar/topbar do template “Rukada”.
  - `#calendar` preenchido via JS com eventos de 2020.
- Dependências:
  - FullCalendar em `assets/plugins/fullcalendar/*`.
  - JS/CSS do template em `assets/*`.
- Pontos de atenção:
  - Conteúdo de calendário é demo, sem integração com backend.


---

### area-login/app-invoice.html
- Tipo: Página estática (HTML) – template de fatura/invoice.
- Função: Exibe layout de invoice (conteúdo demo).
- Estrutura:
  - Sidebar/topbar do template “Rukada”.
  - Bloco de invoice com dados fictícios (empresa/itens/total).
- Dependências:
  - Assets em `assets/*` (bootstrap, metismenu, app.js).
- Pontos de atenção:
  - Conteúdo é **demo**, sem integração com backend.


---

### area-login/app-to-do.html
- Tipo: Página estática (HTML) – template de lista de tarefas.
- Função: UI de “to-do list” com JS local (demo, sem persistência).
- Estrutura:
  - Sidebar/topbar do template “Rukada”.
  - JS no final cria lista em memória (`todos`), sem backend.
- Dependências:
  - Assets em `assets/*` (bootstrap, metismenu, app.js).
- Pontos de atenção:
  - Conteúdo é **demo**.


---

### area-login/assinatura.html
- Tipo: Documento HTML (trecho de assinatura/contrato).
- Função: Conteúdo de assinatura com data, CNPJ/CPF e linhas de assinatura.
- Observações:
  - Referencia imagem `uploads/image001.jpg`.
  - Contém dados fixos (ex.: CNPJ/CPF e data 01/09/2025).
  - Parece exportado de Word (estilos `MsoNormal`).


---

### area-login/assinatura.php
- Tipo: Fragmento PHP/HTML – bloco de assinatura para contratos.
- Função: Renderiza assinatura com dados do cliente.
- Dependências:
  - Variáveis esperadas: `$data_para_contrato`, `$cliente_nome`, `$cliente_doc`.
  - Função `h()` (escape) deve existir no escopo.
  - Imagem `uploads/image001.jpg`.
- Observações:
  - CNPJ da contratada fixo (35.785.619/0001.33).


---

### area-login/atualiza_anamnese.php
- Tipo: Backend (PHP) – atualização de perguntas de anamnese.
- Função: Itera pelo POST e atualiza `perguntas_anamnese.pergunta` por `id_pergunta`.
- Entradas:
  - POST dinâmico: chave = `id_pergunta`, valor = texto da pergunta.
- Operações no banco:
  - `UPDATE perguntas_anamnese` (um por pergunta).
- Pontos de atenção:
  - **Sem prepared statements**.
  - Exibe `echo` de debug com IDs/valores (pode vazar dados).


---

### area-login/atualiza_dados_aluno.php
- Tipo: Backend (PHP) – atualização de dados do aluno (provável AJAX).
- Função: Atualiza cadastro do aluno e retorna mensagem simples.
- Entradas (GET):
  - `id_aluno`, `nome`, `email`, `cpf`, `rg`, `whatsapp`, endereço (cep/rua/numero/compl/bairro/cidade/uf).
- Operações no banco:
  - `UPDATE alunos`.
- Saída:
  - HTML simples com mensagem verde/vermelha.
- Pontos de atenção:
  - **Sem prepared statements**.
  - Usa GET para atualização (exposição de dados sensíveis na URL).


---

### area-login/atualiza_dados_prof.php
- Tipo: Backend (PHP) – atualização de dados do professor (provável AJAX).
- Função: Atualiza cadastro do professor e retorna mensagem simples.
- Entradas (GET):
  - `id_professor`, `nome`, `email`, `cpf`, `rg`, `whatsapp`, endereço (cep/rua/numero/compl/bairro/cidade/uf).
- Operações no banco:
  - `UPDATE professores`.
- Saída:
  - HTML simples com mensagem verde/vermelha.
- Pontos de atenção:
  - **Sem prepared statements**.
  - Usa GET para atualização (exposição de dados sensíveis na URL).


---

### area-login/atualiza_dados_resp.php
- Tipo: Backend (PHP) – atualização de dados do responsável do aluno (provável AJAX).
- Função: Atualiza cadastro em `responsaveis_aluno` e retorna mensagem simples.
- Entradas (GET):
  - `id_aluno`, `nome`, `email`, `cpf`, `rg`, `whatsapp`, endereço (cep/rua/numero/compl/bairro/cidade/uf).
- Operações no banco:
  - `UPDATE responsaveis_aluno`.
- Saída:
  - HTML simples com mensagem verde/vermelha.
- Pontos de atenção:
  - **Sem prepared statements**.
  - Usa GET para atualização (exposição de dados sensíveis na URL).


---

### area-login/atualiza_disc_prof.php
- Tipo: Backend (PHP) – atualização de disciplinas do professor.
- Função: Recria vínculos em `rel_disc_prof` com base em lista recebida.
- Entradas (GET):
  - `id_professor`, `disciplina` (string com IDs separados por `|`).
- Operações no banco:
  - `DELETE` em `rel_disc_prof` para o professor.
  - `INSERT` em `rel_disc_prof` para cada disciplina.
- Saída:
  - HTML simples com mensagem verde/vermelha.
- Pontos de atenção:
  - **Sem prepared statements**.
  - Usa GET para atualização.
  - Não valida se `disciplina` está vazio (pode gerar INSERT inválido).


---

### area-login/atualiza_nota.php
- Tipo: Backend (PHP) – inserir/atualizar nota de avaliação.
- Função: Se `id_avaliacao=0` cria nova avaliação; caso contrário, atualiza nota existente.
- Entradas (GET):
  - `id_avaliacao`, `id_disciplina`, `id_aluno`, `av` (tipo), `nota`, `ano`.
- Operações no banco:
  - `INSERT` em `avaliacao` (novo) ou `UPDATE` (existente).
  - Após INSERT, faz `SELECT` para recuperar `id_avaliacao` com base nos campos.
- Saída:
  - Echo do `id_avaliacao`.
- Pontos de atenção:
  - **Sem prepared statements**.
  - Usa GET para escrita.
  - Recupera ID com `SELECT` em vez de `LAST_INSERT_ID()` (pode gerar ambiguidades).


---

### area-login/atualiza_observacao_aluno.php
- Tipo: Backend (PHP) – atualização de observação do aluno.
- Função: Atualiza `obs_aluno` em `alunos`.
- Entradas (GET):
  - `id_aluno`, `observacao`.
- Operações no banco:
  - `UPDATE alunos`.
- Saída:
  - HTML simples com mensagem verde/vermelha.
- Pontos de atenção:
  - **Sem prepared statements**.
  - Usa GET para escrita.


---

### area-login/atualiza_observacao_prof.php
- Tipo: Backend (PHP) – atualização de observação do professor.
- Função: Atualiza `obs_professor` em `professores`.
- Entradas (GET):
  - `id_professor`, `observacao`.
- Operações no banco:
  - `UPDATE professores`.
- Saída:
  - HTML simples com mensagem verde/vermelha.
- Pontos de atenção:
  - **Sem prepared statements**.
  - Usa GET para escrita.


---

### area-login/atualiza_turma_aluno.php
- Tipo: Backend (PHP) – atualização de relacionamento aluno x turma.
- Função: Remove vínculos antigos e cria novos vínculos em `rel_turma_aluno`.
- Entradas (GET):
  - `id_aluno`, `turma` (string com IDs separados por `|`).
- Operações no banco:
  - `DELETE` em `rel_turma_aluno` para o aluno.
  - `INSERT` em `rel_turma_aluno` para cada `id_turma` após `explode('|', $turmas)`.
- Saída:
  - HTML simples com mensagem verde/vermelha.
- Pontos de atenção:
  - **Sem prepared statements**.
  - Usa GET para escrita.
  - Se `turma` vier vazio, pode inserir registro vazio ou disparar erro silencioso.


---

### area-login/atualiza_turma_disc.php
- Tipo: Backend (PHP) – atualização de disciplina e vínculo com turmas.
- Função: Atualiza nome da disciplina e refaz relacionamento em `rel_disc_turma`.
- Entradas (POST):
  - `id_disciplina`, `nome` (nome da disciplina), `turmas` (array de IDs).
- Operações no banco:
  - `UPDATE disciplina` (campo `nomenclatura_disciplina`).
  - `DELETE` em `rel_disc_turma` para a disciplina.
  - `INSERT` em `rel_disc_turma` para cada `id_turma` selecionado.
- Saída:
  - `alert()` JS e redireciona para `disciplinas.php`.
- Pontos de atenção:
  - **Sem prepared statements**.
  - Sem verificação se `turmas` está vazio (foreach pode não executar).
  - `valida` pode ficar indefinido se `nome` estiver vazio e nenhuma inserção ocorrer.


---

### area-login/atualiza_turma_prof.php
- Tipo: Backend (PHP) – atualização de relacionamento professor x turma.
- Função: Remove vínculos antigos e cria novos vínculos em `rel_turma_prof`.
- Entradas (GET):
  - `id_professor`, `turma` (string com IDs separados por `|`).
- Operações no banco:
  - `DELETE` em `rel_turma_prof` para o professor.
  - `INSERT` em `rel_turma_prof` para cada `id_turma` após `explode('|', $turmas)`.
- Saída:
  - HTML simples com mensagem verde/vermelha.
- Pontos de atenção:
  - **Sem prepared statements**.
  - Usa GET para escrita.
  - Se `turma` vier vazio, pode inserir registro vazio ou disparar erro silencioso.


---

### area-login/authentication-forgot-password.html
- Tipo: Template HTML (admin) – página de recuperação de senha.
- Função: Tela estática de "Forgot Password" com input de email.
- Estrutura:
  - Usa assets do tema (Bootstrap 5, icons, `app.css`, `icons.css`, `pace`).
  - Texto/branding do template "Rukada".
- Dependências:
  - `assets/css/*`, `assets/js/pace.min.js`, Google Fonts (Roboto).
- Pontos de atenção:
  - Sem ação de formulário; botão "Send" não chama backend.
  - Conteúdo de template genérico (provável exemplo do tema).


---

### area-login/authentication-forgot-password.php
- Tipo: Página PHP (admin) – recuperação de senha (front-end).
- Função: Tela de "Esqueceu sua senha?" com form de login/email.
- Estrutura:
  - Carrega `assets/js/js-adm.js` e chama `recupera_valida_login()` via botão e Enter.
  - Formulário `login-adm-rec` com `action="rec_login_usuario.php"` e `onsubmit="return false;"` (envio via JS).
  - Logo local `../images/logo.png`.
- Dependências:
  - `assets/css/*`, `assets/js/pace.min.js`, `assets/js/js-adm.js`, Google Fonts (Roboto).
  - Backend esperado em `rec_login_usuario.php`.
- Pontos de atenção:
  - Ação do formulário depende de JS (se JS falhar, não envia).
  - `recupera_valida_login()` precisa existir em `js-adm.js`.


---

### area-login/authentication-lock-screen.html
- Tipo: Template HTML (admin) – lock screen.
- Função: Tela estática de bloqueio com senha.
- Estrutura:
  - Data/hora fixas no HTML.
  - Campos e botão sem ação real.
- Dependências:
  - `assets/css/*`, `assets/js/pace.min.js`, Google Fonts (Roboto).
- Pontos de atenção:
  - Conteúdo de template (dados fixos, sem integração real).


---

### area-login/authentication-reset-password.html
- Tipo: Template HTML (admin) – reset de senha.
- Função: Tela estática para inserir nova senha e confirmação.
- Estrutura:
  - Formulário sem ação; botão sem backend.
  - Layout com imagem lateral (`login-images/forgot-password-frent-img.jpg`).
- Dependências:
  - `assets/css/*`, `assets/js/pace.min.js`, Google Fonts (Roboto).
- Pontos de atenção:
  - Conteúdo de template (sem integração real com reset).


---

### area-login/authentication-signin.html
- Tipo: Template HTML (admin) – tela de login.
- Função: Página de login do template (sem backend).
- Estrutura:
  - Formulário HTML com campos de email/senha e botões sociais fictícios.
  - Script jQuery para alternar visibilidade da senha.
- Dependências:
  - `assets/css/*`, `assets/js/*`, plugins `simplebar`, `metismenu`, `perfect-scrollbar`, jQuery.
- Pontos de atenção:
  - Conteúdo de template genérico (Rukada), sem integração real.
  - Campo senha preenchido com valor default no HTML (`value="12345678"`).


---

### area-login/authentication-signin-with-header-footer.html
- Tipo: Template HTML (admin) – login com header/footer.
- Função: Variante do login com navbar e rodapé fixo.
- Estrutura:
  - Header com menu estático e logo.
  - Footer fixo com `<?php echo date("Y");?>` (PHP dentro de `.html`).
  - Formulário igual ao template padrão (sem backend).
- Dependências:
  - `assets/css/*`, `assets/js/*`, plugins `simplebar`, `metismenu`, `perfect-scrollbar`, jQuery.
- Pontos de atenção:
  - Conteúdo de template genérico.
  - PHP embutido em arquivo `.html` (só funciona se servidor processar `.html` como PHP).
  - Acentos corrompidos no footer (`Â©`).


---

### area-login/authentication-signup.html
- Tipo: Template HTML (admin) – cadastro.
- Função: Tela estática de criação de conta.
- Estrutura:
  - Formulário HTML sem backend.
  - Script jQuery para alternar visibilidade da senha.
- Dependências:
  - `assets/css/*`, `assets/js/*`, plugins `simplebar`, `metismenu`, `perfect-scrollbar`, jQuery.
- Pontos de atenção:
  - Conteúdo de template genérico.
  - Campo senha com `value="12345678"` no HTML.


---

### area-login/authentication-signup-with-header-footer.html
- Tipo: Template HTML (admin) – cadastro com header/footer.
- Função: Variante do cadastro com navbar e rodapé fixo.
- Estrutura:
  - Header com menu estático e logo.
  - Footer fixo com `<?php echo date("Y");?>` (PHP dentro de `.html`).
  - Formulário igual ao template padrão (sem backend).
- Dependências:
  - `assets/css/*`, `assets/js/*`, plugins `simplebar`, `metismenu`, `perfect-scrollbar`, jQuery.
- Pontos de atenção:
  - Conteúdo de template genérico.
  - PHP embutido em arquivo `.html` (só funciona se servidor processar `.html` como PHP).
  - Acentos corrompidos no footer (`Â©`).


---

### area-login/avaliacoes.php
- Tipo: Página PHP (admin) – gestão de avaliações/notas.
- Função: Permite selecionar turma e disciplina e exibir tabela de avaliações.
- Estrutura:
  - Inclui `verifica.php`, `sidebar.php`, `header.php`.
  - Selects de turma/disciplinas filtrados por `$_SESSION["tipo"]` (Professor ou não).
  - Tabela com colunas AV1..AV8, Recuperações e Prova Final (tbody vazio; dados não carregados no PHP).
- Dependências:
  - JS/CSS: DataTables, Select2, jQuery, plugins do tema.
  - Função JS `buscar_turma()` esperada em `assets/js/js-adm.js`.
  - Endpoint de CEP via viacep (scripts incluídos, possivelmente herdados).
- Pontos de atenção:
  - Tabela tem `id="avaliacoes"`, mas script DataTables inicializa `#alunos` (provável bug).
  - Grande bloco de JS de CEP/copied não relacionado à página.
  - Acentos corrompidos em textos (ex.: "AvaliaÃ§Ãµes").
  - **Sem prepared statements** nas consultas.


---

### area-login/bloco1.html
- Tipo: Template HTML (conteúdo contratual).
- Função: Bloco de contrato de prestação de serviços de buffet (provável usado em geração de contrato).
- Estrutura:
  - HTML exportado do Word (classes `Mso*`, estilos inline extensos).
  - Campos com placeholders (`XXXXXXXXXXXXXXX`, `000.000.000-00`, etc.).
- Dados sensíveis:
  - Contém informações empresariais reais (CNPJ, email, telefone, endereço).
- Pontos de atenção:
  - Conteúdo extenso e estático; difícil manter.
  - Possível uso como template de contrato dentro de PDFs ou páginas.


---

### area-login/boletim_aluno.php
- Tipo: Página PHP (admin) – boletim escolar detalhado.
- Função: Gera boletim anual com notas por disciplina e cálculos de médias/recuperações.
- Estrutura:
  - Inclui `verifica.php`; `sidebar.php` e `header.php` estão comentados.
  - `id_aluno` fixo no código (`$id_aluno = '268'`).
  - Consulta dados do aluno, responsável, turma e várias notas (múltiplas queries por disciplina).
  - Exibe duas tabelas (1º e 2º semestre) com cálculos de médias, recuperações, PF e status (cores).
  - Botão “Imprimir Página” chama `window.print()`.
- Regras de negócio observadas:
  - Média semestral com recuperação substituindo a menor nota.
  - No 2º semestre considera projeto (disciplina 14) e gincana (disciplina 13) para turmas específicas.
  - Aplicação de cores: verde (>=7), amarelo (<7), vermelho (reprovado final).
- Dependências:
  - `assets/css/*` (tema), logo `assets/images/logo-icon.png`.
- Pontos de atenção:
  - `id_aluno` hardcoded torna a página não dinâmica.
  - **Sem prepared statements**; muitas queries dentro de loops (risco de performance).
  - Lógica extensa em PHP/HTML misturado; difícil manutenção.
  - Acentos corrompidos em vários textos.


---

### area-login/boletim_aluno_teste.php
- Tipo: Script PHP (teste).
- Função: Imprime `<p>teste</p>`.
- Pontos de atenção:
  - Arquivo de teste; provável candidato a remover em produção.


---

### area-login/busca_aluno.php
- Tipo: Backend (PHP) – renderiza tabela de notas por turma/disciplina.
- Função: Retorna (provavelmente via AJAX) o `<thead>/<tbody>/<tfoot>` com inputs de notas por aluno.
- Entradas (GET):
  - `turma`, `disciplina`.
- Regras:
  - `ano_letivo` hardcoded como `'2024'`.
  - Se disciplina = 13 (Gincana) ou 14 (Projeto), gera tabela simplificada com uma coluna.
  - Caso contrário, gera AV1..AV8 + R1..R4 + PF.
- Operações no banco:
  - Busca alunos por turma.
  - Para cada aluno, busca notas na tabela `avaliacao` por tipo e ano.
- Saída:
  - HTML com inputs `onchange` chamando `atualiza_nota(...)`.
- Dependências:
  - Função JS `atualiza_nota(...)` (provável em `assets/js/js-adm.js`).
- Pontos de atenção:
  - **Sem prepared statements**; consultas em loop (N+1).
  - Ano letivo fixo em 2024.
  - Uso de GET para ações/seleção.
  - Acentos corrompidos nos rótulos (ex.: "1Âª Rec").


---

### area-login/busca_tutor.php
- Tipo: Backend (PHP) – consulta tutor por email.
- Função: Verifica se existe tutor ativo com o email informado e retorna dados em string delimitada.
- Entradas (GET):
  - `email`.
- Operações no banco:
  - `SELECT * FROM tutor WHERE email_tutor = '$email' AND ativo='1'`.
- Saída:
  - `"0"` quando não encontrado.
  - Quando encontrado: `id|tipo|nome|email|whatsapp` (string com `|`).
- Pontos de atenção:
  - **Sem prepared statements**.
  - `error_reporting(~E_ALL)` suprime warnings/erros (dificulta debug).
  - Há possível troca de campos: `$whatsapp` recebe `id_tutor` e `$id` recebe `whatsapp_tutor`.


---

### area-login/buscar_cliente.php
- Tipo: Backend (PHP) – busca cliente por CPF/CNPJ (JSON).
- Função: Retorna dados do cliente ativo para preencher formulário automaticamente.
- Entradas (POST):
  - `documento`, `tipo` (`cpf` ou `cnpj`).
- Operações no banco:
  - `SELECT` em `clientes` com **prepared statement** (por CPF/CNPJ).
- Saída:
  - JSON com `success`, `message` e `cliente` (quando encontrado).
- Pontos de atenção:
  - Implementa validação básica de tamanho do documento.
  - Único arquivo observado até aqui que usa prepared statements (boa prática).
  - Acentos corrompidos em mensagens.


---

### area-login/buscar_colaboradores.php
- Tipo: Backend (PHP) – busca colaboradores (JSON).
- Função: Autocomplete por tipo e nome.
- Entradas (GET):
  - `tipo`, `q` (termo de busca).
- Operações no banco:
  - `SELECT nome, apelido FROM colaboradores` com `LIKE` e `ativo=1` usando prepared statement.
- Saída:
  - JSON array com `nome` e `apelido` (máximo 10).
- Pontos de atenção:
  - Não valida tamanho mínimo de `q`.
  - Fecha conexão no final (`$conexao->close()`).


---

### area-login/cadastro_institucional_pdf.php
- Tipo: Backend (PHP) – salva cadastro institucional e gera PDF (Dompdf).
- Função: Atualiza dados do cliente, insere registro em `cadastro_institucional`, gera PDF e salva em `uploads/`.
- Entradas (POST):
  - Muitas: dados da instituição, responsáveis, estrutura, equipamentos etc. (ver código).
- Operações no banco:
  - `UPDATE cliente` com nome/whatsapp/instituicao_vinculo/cargo_atual.
  - `INSERT` em `cadastro_institucional` com dezenas de colunas.
  - `UPDATE cadastro_institucional` para registrar nome do PDF gerado.
- PDF:
  - Usa `Dompdf` via `vendor/autoload.php`.
  - Gera HTML completo com header/footer e tabela de dados.
  - Insere imagens base64 (logo, QR codes, ícones).
  - Salva arquivo `uploads/cadastro_institucional_<data>.pdf` e faz download (`stream`).
- Dependências:
  - `vendor/autoload.php` (Composer), `dompdf/dompdf`.
  - `uploads/` para salvar PDFs e logos.
  - Assets em `assets/images/*`.
- Pontos de atenção:
  - Sanitização parcial: usa `mysqli_real_escape_string` mas **sem prepared statements**.
  - Muitos campos booleanos convertidos manualmente (texto Sim/Não).
  - Template HTML contém dados fixos de contato (site/email/telefone) hardcoded.
  - Acentos corrompidos em textos.


---

### area-login/cadastro_usuario_pdf.php
- Tipo: Backend (PHP) – gera PDF de cadastro de usuário (Dompdf).
- Função: Monta um PDF com dados pessoais e profissionais enviados via POST.
- Entradas (POST):
  - Dados pessoais, endereço, formação e acesso (ver código).
- PDF:
  - Usa `Dompdf` via `vendor/autoload.php`.
  - Header/footer com QR codes e dados de contato fixos.
  - Exibe senha mascarada como `********`.
- Dependências:
  - `vendor/autoload.php` (Composer), `dompdf/dompdf`.
  - `assets/images/*` para logo/QR/ícones.
- Pontos de atenção:
  - Dados de contato fixos (site/email/telefone) hardcoded.
  - Não persiste nada no banco (apenas gera PDF).
  - Sem validação/sanitização de POST.
  - Acentos corrompidos em textos.


---

### area-login/candidatos.php
- Tipo: Página PHP (admin) – listagem de candidatos ativos.
- Função: Lista candidatos ativos e permite editar/excluir.
- Operações no banco:
  - `SELECT` em `candidato` com join em `vv_usuario` (exclui `id_usuario = 1`).
- Estrutura:
  - Inclui `sidebar.php` e `header.php`.
  - Tabela DataTables com ações de editar e excluir.
- Dependências:
  - DataTables, jQuery, plugins do tema.
  - Links para `editar_candidato.php` e `salvar_candidato.php?del=...`.
- Pontos de atenção:
  - **Sem prepared statements** no SELECT.
  - `error_reporting(~E_ALL)` suprime warnings/erros.
  - Acentos corrompidos em labels e footer.


---

### area-login/candidatos_inativos.php
- Tipo: Página PHP (admin) – listagem de candidatos inativos.
- Função: Lista candidatos inativos e permite editar/excluir.
- Operações no banco:
  - `SELECT` em `candidato` com join em `vv_usuario` (filtra `ativo=0` e exclui `id_usuario=1`).
- Estrutura:
  - Igual a `candidatos.php`, com link de retorno para ativos.
  - Tabela DataTables.
- Dependências:
  - DataTables, jQuery, plugins do tema.
  - Links para `editar_candidato.php` e `salvar_candidato.php?del=...`.
- Pontos de atenção:
  - **Sem prepared statements** no SELECT.
  - `error_reporting(~E_ALL)` suprime warnings/erros.
  - Acentos corrompidos em labels e footer.


---

### area-login/candidatura.php
- Tipo: Página PHP (admin) – detalhes de candidaturas por vaga.
- Função: Lista candidatos inscritos em uma vaga e exibe respostas aos campos personalizados.
- Entradas (GET):
  - `id_vaga` (obrigatório).
- Operações no banco:
  - Busca dados da vaga (`vaga`).
  - Lista candidatos em `vaga_candidatura` com join em `candidato` e `vv_usuario`.
  - Carrega campos da vaga (`vaga_campos`) e respostas (`vaga_respostas`).
  - Atualização de status via `salvar_status_candidatura.php`.
- Estrutura:
  - Inclui `sidebar.php` e `header.php`.
  - Cards por candidato com botão para visualizar currículo/arquivo.
  - Formulário para alterar status (NOVO, EM_ANALISE, REPROVADO_*, ENTREVISTA, APROVADO, BANCO_TALENTOS).
- Dependências:
  - DataTables (incluído, mas tabela não é DataTable aqui).
  - Pasta `uploads/` para currículos e arquivos de respostas.
- Pontos de atenção:
  - Usa prepared statements nas consultas principais (bom).
  - Mensagens com acentuação corrompida.
  - URLs diretas para `uploads/` (sem validação de autorização).


---

### area-login/charts-apex-chart.html
- Tipo: Template HTML (admin) – página de gráficos ApexCharts.
- Função: Exibe diversos exemplos de gráficos (ApexCharts) do template.
- Estrutura:
  - Página completa do tema com sidebar, header, switcher e exemplos de gráficos.
  - IDs `chart1..chart13` usados pelo JS `apex-custom.js`.
- Dependências:
  - `assets/plugins/apexcharts-bundle/js/apexcharts.min.js`
  - `assets/plugins/apexcharts-bundle/js/apex-custom.js`
  - CSS/JS do tema (Bootstrap, metismenu, simplebar, etc.).
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Sidebar/header hardcoded com branding "Rukada".
  - Acentos corrompidos no footer.


---

### area-login/charts-chartjs.html
- Tipo: Template HTML (admin) – página de gráficos Chart.js.
- Função: Exibe exemplos de gráficos (Chart.js) do template.
- Estrutura:
  - Página completa do tema com sidebar, header, switcher.
  - `canvas` com IDs `chart1..chart6`.
- Dependências:
  - `assets/plugins/chartjs/Chart.min.js`
  - `assets/plugins/chartjs/custom-script.js`
  - CSS/JS do tema (Bootstrap, metismenu, simplebar, etc.).
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Sidebar/header hardcoded com branding "Rukada".
  - Acentos corrompidos no footer.


---

### area-login/charts-highcharts.html
- Tipo: Template HTML (admin) – página de gráficos Highcharts.
- Função: Exibe exemplos de gráficos (Highcharts) do template.
- Estrutura:
  - Página completa do tema com sidebar, header, switcher.
  - `div` com IDs `chart1..chart15`.
- Dependências:
  - `assets/plugins/highcharts/js/*` (highcharts, more, variable-pie, solid-gauge, 3d, etc.).
  - `assets/plugins/highcharts/js/highcharts-custom.script.js`.
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Sidebar/header hardcoded com branding "Rukada".
  - Acentos corrompidos no footer.


---

### area-login/clientes.php
- Tipo: Página PHP (admin) – cadastro e listagem de clientes.
- Função: Lista clientes ativos e permite criar novo cliente via formulário embutido.
- Operações no banco:
  - `SELECT` em `clientes` (ativos) para listar.
  - Busca opções em `checklist_opcoes` (não aparece no formulário exibido).
- Estrutura:
  - Inclui `sidebar.php` e `header.php`.
  - Formulário de novo cliente (POST para `salvar_cliente`).
  - Tabela DataTables com ações editar/excluir.
- JS/UX:
  - Toggle do formulário (`btnNovoEvento` / `btnCancelarEvento`).
  - Integração ViaCEP (preenche endereço do cliente).
  - Autocomplete de cliente por CPF/CNPJ via `buscar_cliente.php`.
  - Máscaras (jQuery Mask) para telefone/CPF/CNPJ/CEP e valor.
  - Scripts de “opcionais” e checklist parecem reaproveitados de outras páginas.
- Dependências:
  - DataTables, jQuery, jQuery Mask, ViaCEP.
- Pontos de atenção:
  - **Sem prepared statements** nas consultas principais.
  - Vários blocos JS não relacionados ao cadastro de clientes (ruído/cópia).
  - Acentos corrompidos em textos.
  - Link do WhatsApp usa número puro (`https://wa.me/55...`) sem sanitização.


---

### area-login/clientes_old.php
- Tipo: Página PHP (admin) – versão antiga de clientes.
- Função: Cadastro e listagem de clientes vinculados a planos “Quantec”.
- Estrutura:
  - Inclui `sidebar.php` e `header.php`.
  - Formulário toggle (`mostra_cadastro()` em `js-adm.js`) para cadastro.
  - Lista clientes via join `cliente` + `rel_cliente_plano` + `planos`.
- Dependências:
  - `adiciona_cliente.php` (form action).
  - JS/CSS do tema + jQuery UI datepicker.
- Pontos de atenção:
  - **Sem prepared statements**.
  - Mistura de domínios (clientes/planos/pets) e scripts grandes de raças (`especie_pet`/`raca_pet`) não relacionados.
  - Link back-to-top aponta para `perfil_pet.php` (provável erro).
  - Acentos corrompidos em vários textos.


---

### area-login/colaborador_documentos.php
- Tipo: Página PHP (admin) – solicitações de documentos de colaboradores.
- Função: Listar colaboradores e gerenciar solicitações/documentos (criar, alterar status, anexos).
- Entradas (GET/POST):
  - `del` (GET) para soft delete da solicitação.
  - POST para `salvar_solicitacao_documento.php` com upload opcional.
  - POST para `alterar_status_documento.php` (alteração de status).
- Operações no banco:
  - `UPDATE colaborador_documento SET ativo = 0` (soft delete).
  - `SELECT` colaboradores, tipos de documento e status.
  - Lista solicitações com joins em `colaborador`, `tipo_documento`, `status_documento`.
- Estrutura:
  - Tabela de colaboradores (link para `documentos.php?id=...`).
  - Formulário toggle de nova solicitação (com upload).
  - Tabela DataTables de solicitações com status e links de arquivos.
- Dependências:
  - Pasta `uploads/` (arquivos RH e colaborador).
  - `salvar_solicitacao_documento.php`, `alterar_status_documento.php`.
  - DataTables, jQuery, plugins do tema.
- Pontos de atenção:
  - **Sem prepared statements** nas consultas.
  - Soft delete via GET sem proteção adicional.
  - Links diretos para arquivos em `uploads/` sem checagem de autorização.
  - Acentos corrompidos em textos.


---

### area-login/colaboradores.php
- Tipo: Página PHP (admin) – cadastro e listagem de colaboradores.
- Função: Permite cadastrar colaborador, listar ativos e editar/excluir.
- Estrutura:
  - Inclui `sidebar.php` e `header.php`.
  - Formulário toggle (`btnNovoColaborador`) com upload de currículo.
  - Tabela DataTables com colaboradores ativos e ações.
- Operações no banco:
  - `SELECT` em `vv_usuario` (para vínculo opcional).
  - `SELECT` em `tipo_contrato` para dropdown.
  - `SELECT` em `colaborador` com join em `tipo_contrato`.
  - Ações via `salvar_colaborador.php` e `editar_colaborador.php`.
- Dependências:
  - DataTables, jQuery, jQuery Mask.
  - `uploads/` para currículos.
- Pontos de atenção:
  - **Sem prepared statements** nas consultas.
  - Campo de vínculo com usuário está `display:none` (inacessível no UI).
  - Links diretos para arquivos em `uploads/` sem checagem de autorização.
  - Acentos corrompidos em textos.


---

### area-login/comissoes.php
- Tipo: Página PHP (admin) – comissões (exemplo).
- Função: Exibe tabela de comissões com dados estáticos (placeholders).
- Estrutura:
  - Inclui `sidebar.php` e `header.php`.
  - Grande parte do conteúdo é demo do template (charts ocultos, produtos fictícios).
- Dependências:
  - JS/CSS do tema (chartjs, datatables, peity etc.).
- Pontos de atenção:
  - Não há consultas reais; dados são hardcoded.
  - Título “Seeart - IA” indica reaproveitamento de template.
  - `verifica.php` está comentado; usa apenas `session_start()`.


---

### area-login/component-accordions.html
- Tipo: Template HTML (admin) – componentes (accordions).
- Função: Demonstração de accordions do Bootstrap (conteúdo fictício).
- Estrutura:
  - Página completa do tema com sidebar, header, switcher.
  - Exemplos de accordions com imagens e texto lorem ipsum.
- Dependências:
  - Bootstrap 5 + assets do tema.
  - Imagens em `assets/images/gallery/*`.
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Sidebar/header hardcoded com branding "Rukada".


---

### area-login/component-alerts.html
- Tipo: Template HTML (admin) – componentes (alerts).
- Função: Demonstração de alerts do Bootstrap (variações de cores/bordas).
- Estrutura:
  - Página completa do tema com sidebar, header, switcher.
  - Seções de exemplos com e sem ícones.
- Dependências:
  - Bootstrap 5 + assets do tema.
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Sidebar/header hardcoded com branding "Rukada".


---

### area-login/component-avtars-chips.html
- Tipo: Template HTML (admin) – componentes (avatars/chips).
- Função: Demonstração de chips com avatares e variações de tamanho/cor.
- Estrutura:
  - Página completa do tema com sidebar, header, switcher.
  - Seções “Chips” e “Sizing and Colors”.
- Dependências:
  - Bootstrap 5 + assets do tema.
  - Imagens em `assets/images/avatars/*`.
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Sidebar/header hardcoded com branding "Rukada".


---

### area-login/component-badges.html
- Tipo: Template HTML (admin) – componentes (badges).
- Função: Demonstração de badges do Bootstrap (básicos e em botões).
- Estrutura:
  - Página completa do tema com sidebar, header, switcher.
  - Seções de badges simples, pills e badges em botões.
- Dependências:
  - Bootstrap 5 + assets do tema.
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Sidebar/header hardcoded com branding "Rukada".


---

### area-login/component-buttons.html
- Tipo: Template HTML (admin) – componentes (buttons).
- Função: Demonstração de botões do Bootstrap (variações, tamanhos, grupos, sociais).
- Estrutura:
  - Página completa do tema com sidebar, header, switcher.
  - Seções de botões básicos, outline e botões sociais.
- Dependências:
  - Bootstrap 5 + assets do tema.
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Sidebar/header hardcoded com branding "Rukada".


---

### area-login/component-cards.html
- Tipo: Template HTML (admin) – componentes (cards).
- Função: Demonstração de cards do Bootstrap (variações, layouts, grupos).
- Estrutura:
  - Página completa do tema com sidebar, header, switcher.
  - Muitos exemplos de cards com imagens e textos lorem ipsum.
- Dependências:
  - Bootstrap 5 + assets do tema.
  - Imagens em `assets/images/gallery/*`.
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Sidebar/header hardcoded com branding "Rukada".


---

### area-login/component-carousels.html
- Tipo: Template HTML (admin) – componentes (carousels).
- Função: Demonstração de carrosséis do Bootstrap (variações e controles).
- Estrutura:
  - Página completa do tema com sidebar, header, switcher.
  - Vários exemplos: slides only, com controles, indicadores, captions, crossfade, intervalos.
- Dependências:
  - Bootstrap 5 + assets do tema.
  - Imagens em `assets/images/gallery/*`.
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Sidebar/header hardcoded com branding "Rukada".


---

### area-login/component-list-groups.html
- Tipo: Template HTML (admin) – componentes (list groups).
- Função: Demonstração de list groups do Bootstrap (variações e cores).
- Estrutura:
  - Página completa do tema com sidebar, header, switcher.
  - Seções com list groups coloridos, flush, badges e itens ativos.
- Dependências:
  - Bootstrap 5 + assets do tema.
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Sidebar/header hardcoded com branding "Rukada".


---

### area-login/component-media-object.html
- Tipo: Template HTML (admin) – componentes (media object).
- Função: Demonstração de media objects do Bootstrap (básico, aninhado, alinhamentos e lista).
- Estrutura:
  - Página completa do tema com sidebar, header e switcher.
  - Breadcrumb aponta para `index_area.php`.
  - Seções com imagens de avatar e textos lorem.
- Dependências:
  - Bootstrap 5 + assets do tema.
  - Imagens em `assets/images/avatars/*`.
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Branding "Rukada" e dados fictícios no header/notificações.
  - Footer com `<?php echo date("Y");?>` dentro de arquivo `.html`.


---

### area-login/component-modals.html
- Tipo: Template HTML (admin) – componentes (modals).
- Função: Demonstração de modais do Bootstrap (variações de tamanho, centralização, scroll e cores).
- Estrutura:
  - Página completa do tema com sidebar, header e switcher.
  - Seções: modal básico, scrollable, centralizado, tamanhos (xl, lg, sm, fullscreen) e modais coloridos (danger/primary/warning/success/dark).
  - Conteúdo lorem ipsum e botões de ação padrão.
- Dependências:
  - Bootstrap 5 + assets do tema.
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Branding "Rukada" e dados fictícios no header/notificações.
  - Footer com `<?php echo date("Y");?>` dentro de arquivo `.html`.


---

### area-login/component-navs-tabs.html
- Tipo: Template HTML (admin) – componentes (navs & tabs).
- Função: Demonstração de navegação por abas e pills do Bootstrap, com variações de estilo.
- Estrutura:
  - Página completa do tema com sidebar, header e switcher.
  - Seções com tabs padrões e pills coloridas (primary/danger/success/warning).
  - Conteúdo lorem ipsum em cada aba.
- Dependências:
  - Bootstrap 5 + assets do tema.
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Branding "Rukada" e dados fictícios no header/notificações.
  - Footer com `<?php echo date("Y");?>` dentro de arquivo `.html`.


---

### area-login/component-navbar.html
- Tipo: Template HTML (admin) – componentes (navbar).
- Função: Demonstração de navbars do Bootstrap com diferentes cores e ações.
- Estrutura:
  - Página completa do tema com sidebar, header e switcher.
  - Várias navbars (dark, primary, danger, success, secondary) com dropdowns e botões.
  - Ícones de redes sociais em exemplo success.
- Dependências:
  - Bootstrap 5 + assets do tema.
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Branding "Rukada" e dados fictícios no header/notificações.
  - Footer com `<?php echo date("Y");?>` dentro de arquivo `.html`.


---

### area-login/component-notifications.html
- Tipo: Template HTML (admin) – componentes (notifications).
- Função: Demonstração de notificações/toasts via Lobibox (default, arredondado, com imagem e posições).
- Estrutura:
  - Página completa do tema com sidebar, header e switcher.
  - Botões chamam funções JS (`default_noti`, `round_*`, `img_*`, `pos*`) para disparar notificações.
- Dependências:
  - Bootstrap 5 + assets do tema.
  - Plugins: `assets/plugins/notifications/css/lobibox.min.css`, `lobibox.min.js`, `notifications.min.js`, `notification-custom-script.js`.
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Branding "Rukada" e dados fictícios no header/notificações.
  - Footer com `<?php echo date("Y");?>` dentro de arquivo `.html`.


---

### area-login/component-paginations.html
- Tipo: Template HTML (admin) – componentes (pagination).
- Função: Demonstração de paginação do Bootstrap (básica, arredondada, com ícones, estados e tamanhos).
- Estrutura:
  - Página completa do tema com sidebar, header e switcher.
  - Seções: paginação básica, round, ícones, estados disabled/active, tamanhos (lg/sm).
- Dependências:
  - Bootstrap 5 + assets do tema.
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Branding "Rukada" e dados fictícios no header/notificações.
  - Footer com `<?php echo date("Y");?>` dentro de arquivo `.html`.


---

### area-login/component-popovers-tooltips.html
- Tipo: Template HTML (admin) – componentes (popovers & tooltips).
- Função: Demonstração de popovers e tooltips do Bootstrap.
- Estrutura:
  - Página completa do tema com sidebar, header e switcher.
  - Seções: popover básico, direções (top/right/bottom/left) e exemplos de tooltip.
  - Script inline inicializa `popover()` e `tooltip()` via jQuery.
- Dependências:
  - Bootstrap 5 + assets do tema.
  - jQuery para init no footer.
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Branding "Rukada" e dados fictícios no header/notificações.
  - Footer com `<?php echo date("Y");?>` dentro de arquivo `.html`.


---

### area-login/component-progress-bars.html
- Tipo: Template HTML (admin) – componentes (progress bars).
- Função: Demonstração de barras de progresso do Bootstrap (básicas, labels, cores, múltiplas, listradas e animadas).
- Estrutura:
  - Página completa do tema com sidebar, header e switcher.
  - Seções: básico, com rótulo, backgrounds coloridos, múltiplas barras, striped e animated.
- Dependências:
  - Bootstrap 5 + assets do tema.
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Branding "Rukada" e dados fictícios no header/notificações.
  - Footer com `<?php echo date("Y");?>` dentro de arquivo `.html`.


---

### area-login/component-spinners.html
- Tipo: Template HTML (admin) – componentes (spinners).
- Função: Demonstração de spinners do Bootstrap (border/grow, cores, tamanhos e botões).
- Estrutura:
  - Página completa do tema com sidebar, header e switcher.
  - Seções: spinners básicos, coloridos, grow, tamanhos (sm e custom), e exemplos em botões.
- Dependências:
  - Bootstrap 5 + assets do tema.
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Branding "Rukada" e dados fictícios no header/notificações.
  - Footer com `<?php echo date("Y");?>` dentro de arquivo `.html`.


---

### area-login/component-avtars-chips.html
- Tipo: Template HTML (admin) – componentes (avatars & chips).
- Função: Demonstração de chips e avatars com variações de tamanho e cor.
- Estrutura:
  - Página completa do tema com sidebar, header e switcher.
  - Seções: chips com avatar, chips com botão de fechar, tamanhos (md/lg) e cores.
  - Botões de fechar com `onclick` removendo o elemento.
- Dependências:
  - Bootstrap 5 + assets do tema.
  - Imagens em `assets/images/avatars/*`.
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Branding "Rukada" e dados fictícios no header/notificações.
  - Footer com `<?php echo date("Y");?>` dentro de arquivo `.html`.


---

### area-login/comissoes.php
- Tipo: Página PHP (admin) – tabela de comissões.
- Função: Exibe tabela de comissões com dados estáticos (exemplo).
- Estrutura:
  - `session_start()`; `verifica.php` comentado.
  - Inclui `sidebar.php` e `header.php`.
  - Grande parte do conteúdo é template (charts e seções ocultas via `display: none`).
  - Tabela de comissões com imagens de produtos (ex.: `assets/images/produtos/*`) e status (Pago/Pendente).
- Dependências:
  - Bootstrap 5 + assets do tema.
  - Plugins: Chart.js, Peity, DataTables.
  - JS: `assets/js/dashboard-eCommerce.js`.
- Pontos de atenção:
  - Dados hardcoded (exemplos); sem consultas ao banco.
  - Encoding quebrado em alguns textos ("ComissÃµes").
  - `error_reporting(~E_ALL)` suprime avisos.

**Nota:** `area-login/conta_pagar.php` não existe na pasta (não foi possível localizar).


---

### area-login/composer.json
- Tipo: Manifesto do Composer (PHP).
- Função: Declara dependências PHP do projeto (neste diretório).
- Conteúdo:
  - Dependência: `dompdf/dompdf` versão `^3.1`.
- Pontos de atenção:
  - Indica uso de Dompdf para geração de PDFs.


---

### area-login/composer.lock
- Tipo: Lockfile do Composer.
- Função: Fixa versões exatas das dependências PHP.
- Dependências principais:
  - `dompdf/dompdf` v3.1.0.
  - `dompdf/php-font-lib` 1.0.1.
  - `dompdf/php-svg-lib` 1.0.0.
  - `masterminds/html5` 2.10.0.
  - `sabberworm/php-css-parser` v8.9.0.
- Requisitos de runtime:
  - PHP `^7.1 || ^8.0` (dompdf).
  - Extensões: `ext-dom`, `ext-mbstring` (e outras sugeridas).
- Pontos de atenção:
  - Indica stack de geração de PDF e parsing de HTML/CSS/SVG.


---

### area-login/composer.phar
- Tipo: Binário (PHAR) – Composer.
- Função: Executável local do Composer para gerenciar dependências PHP.
- Metadados:
  - Tamanho: ~3.1 MB.
  - Última modificação: 30/01/2026 00:15 (local).
- Pontos de atenção:
  - Arquivo binário; não inspecionado.


---

### area-login/composer-setup.php
- Tipo: Script PHP (instalador do Composer).
- Função: Instalador oficial do Composer (código padrão, completo).
- Estrutura:
  - Verifica ambiente/versões/extensões PHP.
  - Baixa e valida o PHAR do Composer.
  - Inclui certificados (CA) e chaves públicas embutidas.
- Dependências:
  - PHP com extensões básicas (openssl, json, phar, etc.).
- Pontos de atenção:
  - Arquivo padrão do Composer (não específico da aplicação).
  - Contém trechos longos e certificados embutidos; não editar manualmente.


---

### area-login/con_bd.php
- Tipo: Configuração PHP (conexão com banco).
- Função: Abre conexão MySQL via `mysqli_connect` e seleciona banco.
- Conteúdo:
  - Host: `localhost`.
  - Base: `vitorvar_rh`.
  - Usuário/senha: **hardcoded** no arquivo.
  - Charset: `utf8`.
- Pontos de atenção:
  - **Credenciais sensíveis** embutidas em arquivo versionado.
  - Recomenda-se mover para variáveis de ambiente e rotacionar senha.


---

### area-login/con_bd_offline.php
- Tipo: Configuração PHP (conexão com banco) – ambiente offline/local.
- Função: Abre conexão MySQL via `mysqli_connect` e seleciona banco `piaget_sys`.
- Conteúdo:
  - Host: `localhost`.
  - Usuário: `root` sem senha.
  - Charset: `utf8`.
- Pontos de atenção:
  - Credenciais de dev/local no código.
  - Uso de `root` sem senha é inseguro fora de ambiente local.


---

### area-login/con_bd_online.php
- Tipo: Configuração PHP (conexão com banco) – ambiente online.
- Função: Abre conexão MySQL via `mysqli_connect` e seleciona banco.
- Conteúdo:
  - Host: `localhost`.
  - Base: `vitorvar_rh`.
  - Usuário/senha: **hardcoded** no arquivo.
  - Charset: `utf8`.
- Pontos de atenção:
  - **Credenciais sensíveis** embutidas em arquivo versionado.
  - Arquivo igual ao `con_bd.php` (duplica credenciais).


---

### area-login/con_bd_root.php
- Tipo: Configuração PHP (conexão com banco).
- Função: Abre conexão MySQL via `mysqli_connect` e seleciona banco `vv_rh`.
- Conteúdo:
  - Host: `localhost`.
  - Usuário: `root` sem senha.
  - Charset: `utf8`.
- Pontos de atenção:
  - Credenciais de dev/local no código.
  - Uso de `root` sem senha é inseguro fora de ambiente local.


---

### area-login/con_bd-1.php
- Tipo: Configuração PHP (conexão com banco).
- Função: Abre conexão MySQL via `mysqli_connect` e seleciona banco `piaget_sys`.
- Conteúdo:
  - Host: `localhost`.
  - Usuário: `root` sem senha.
  - Charset: `utf8`.
- Pontos de atenção:
  - Credenciais de dev/local no código.
  - Arquivo duplicado do `con_bd_offline.php`.


---

### area-login/contratos.php
- Tipo: Página PHP (admin) – listagem de contratos.
- Função: Lista contratos ativos e permite editar/inativar.
- Fluxo:
  - Inclui `verifica.php` (controle de acesso).
  - Query: `SELECT id, nome, ativo FROM contratos WHERE ativo = 1 ORDER BY nome ASC`.
  - Renderiza tabela com DataTables e ações para `editar_contrato.php` e `excluir_contrato.php`.
  - Exibe mensagens por `$_GET['sucesso']` / `$_GET['erro']`.
- Dependências:
  - `sidebar.php`, `header.php`.
  - DataTables (JS/CSS).
- Pontos de atenção:
  - Usa `$conexao->query` sem prepared statements.
  - Codificação quebrada em textos/strings (“Contratos”, “Ações”).
  - Comentário menciona `conexao.php` mas não há include explícito aqui.


---

### area-login/dados_pg.php
- Tipo: Página PHP (admin) – dados financeiros.
- Função: Exibe formulário (aparente) para credenciais de pagamento (MercadoPago).
- Estrutura:
  - Inclui `verifica.php`, `sidebar.php`, `header.php`.
  - Mostra campos “Public Key” e “Access Token” com valores preenchidos.
  - Botão “Salvar Dados” chama `verifica_form()` (não definido no arquivo).
  - Há `DataTable` inicializado para `#dados`, mas não existe tabela com esse ID.
- Dependências:
  - Assets do tema + DataTables.
- Pontos de atenção:
  - Valores de credenciais exibidos em HTML (mesmo que pareçam testes).
  - JS de DataTables parece copiado/inativo.
  - Codificação quebrada em textos.


---

### area-login/dashboard-analytics.html
- Tipo: Template HTML (admin) – dashboard analytics.
- Função: Página de analytics com gráficos, mapas e tabelas (dados exemplo).
- Estrutura:
  - Página completa do tema com sidebar, header e switcher.
  - Diversos cards e tabelas com métricas fictícias (leads, social traffic, countries).
- Dependências:
  - Plugins: jVectorMap, Highcharts, Chart.js, Sparkline.
  - JS: `assets/js/dashboard-analytics.js`.
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Branding "Rukada" e dados fictícios no header/notificações.


---

### area-login/dashboard-digital-marketing.html
- Tipo: Template HTML (admin) – dashboard digital marketing.
- Função: Dashboard com métricas de marketing digital (tráfego, seguidores, taxas).
- Estrutura:
  - Página completa do tema com sidebar, header e switcher.
  - Cards com gráficos renderizados via ApexCharts.
- Dependências:
  - Plugin: ApexCharts (`assets/plugins/apexcharts-bundle/js/apexcharts.min.js`).
  - JS: `assets/js/dashboard-digital-marketing.js`.
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Branding "Rukada" e dados fictícios no header/notificações.


---

### area-login/dashboard-eCommerce.html
- Tipo: Template HTML (admin) – dashboard eCommerce.
- Função: Dashboard eCommerce com métricas, listas de produtos e pedidos (dados exemplo).
- Estrutura:
  - Página completa do tema com sidebar, header e switcher.
  - Tabelas e cards com listas de pedidos, top products, social leads.
- Dependências:
  - Plugins: ApexCharts, Chart.js, Peity, DataTables.
  - JS: `assets/js/dashboard-eCommerce.js`.
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Branding "Rukada" e dados fictícios no header/notificações.


---

### area-login/dashboard-human-resources.html
- Tipo: Template HTML (admin) – dashboard human resources.
- Função: Dashboard de RH com métricas de recrutamento e indicadores (dados exemplo).
- Estrutura:
  - Página completa do tema com sidebar, header e switcher.
  - Cards com gráficos e indicadores (NPS, custos, entrevistas, vagas).
- Dependências:
  - Plugin: ApexCharts.
  - JS: `assets/js/dashboard-human-resources.js`.
- Pontos de atenção:
  - Conteúdo de template (provável exemplo).
  - Branding "Rukada" e dados fictícios no header/notificações.


---

### area-login/delete_avaliacao.php
- Tipo: Endpoint PHP (admin) – exclusão lógica de avaliação.
- Função: Marca avaliação como inativa e retorna HTML de tabela atualizado.
- Fluxo:
  - Lê `$_GET['id']` e `$_GET['id_aluno']`.
  - `UPDATE avaliacao SET ativo='0' WHERE id_avaliacao='$id'`.
  - Reconsulta avaliações ativas do aluno e renderiza `<tbody>` com linhas.
- Dependências:
  - `verifica.php` (sessão/conexão).
  - Banco: tabelas `avaliacao`, `alunos`, `disciplina`.
- Pontos de atenção:
  - **SQL sem prepared statements** (risco de SQLi via GET).
  - Retorna HTML parcial (provável uso via AJAX).
  - Codificação quebrada em textos (“Avaliação”).


---

### area-login/delete_docs.php
- Tipo: Endpoint PHP (admin) – exclusão lógica de documento do aluno.
- Função: Marca documento como inativo e retorna linhas HTML atualizadas.
- Fluxo:
  - Lê `$_GET['id_aluno']` e `$_GET['id_doc']`.
  - `UPDATE docs_alunos SET ativo='0' WHERE id_doc='$id_doc'`.
  - Reconsulta documentos ativos do aluno e imprime `<tr>` com links.
- Dependências:
  - `verifica.php` (sessão/conexão).
  - Tabela `docs_alunos`.
  - Arquivos em `assets/docs_alunos/`.
- Pontos de atenção:
  - **SQL sem prepared statements** (risco de SQLi via GET).
  - Retorna HTML parcial (provável uso via AJAX).


---

### area-login/delete_ocorrencia.php
- Tipo: Endpoint PHP (admin) – exclusão lógica de ocorrência.
- Função: Marca ocorrência como inativa e retorna HTML de tabela atualizado.
- Fluxo:
  - Lê `$_GET['id']` e `$_GET['id_aluno']`.
  - `UPDATE ocorrencias SET ativo='0' WHERE id_ocorrencia='$id'`.
  - Reconsulta ocorrências ativas do aluno no ano letivo atual (`YEAR(data_ocorrencia)`).
  - Renderiza `<tbody>` com linhas; botão de exclusão só para `Administrador`/`Secretaria`.
- Dependências:
  - `verifica.php` (sessão/conexão).
  - Tabelas `ocorrencias`, `alunos`, `disciplina`.
- Pontos de atenção:
  - **SQL sem prepared statements** (risco de SQLi via GET).
  - Retorna HTML parcial (provável uso via AJAX).
  - Usa `date("Y")` para filtrar ano; sem parametrização.


---

### area-login/detalhes_orcamento.php
- Tipo: Página PHP (admin) – detalhes de orçamento.
- Função: Exibe detalhes de um orçamento com abas (Detalhes/Itens/Financeiro).
- Estrutura:
  - Inclui `verifica.php`, `sidebar.php`, `header.php`.
  - Abas com conteúdo estático (exemplo), formulário com campos pre-preenchidos.
  - Botões “Buy Now”/“Add to cart” (template eCommerce).
- Dependências:
  - Assets do tema (Bootstrap + JS padrão).
- Pontos de atenção:
  - Conteúdo hardcoded (exemplo); não há leitura dinâmica por ID.
  - Codificação quebrada em textos (“Orçamento”, “Observações”).
  - Form `altera_dados.php` parece fora de contexto (campos de usuário).


---

### area-login/detalhes_planos.php
- Tipo: Página PHP (admin) – detalhes/edição (especie_pet).
- Função: Edita registros de espécie de pet (apesar do nome do arquivo).
- Fluxo:
  - Lê `$_GET['id']` como `$id_especie`.
  - Query: `SELECT * FROM especie_pet WHERE id_especie_pet='$id_especie'`.
  - Form envia para `alt_especie.php`.
- Dependências:
  - `verifica.php`, `sidebar.php`, `header.php`.
  - Plugins: Select2, Imageuploadify, ApexCharts (embora não usados na tela).
- Pontos de atenção:
  - **SQL sem prepared statements** (risco de SQLi via GET).
  - Nome do arquivo não condiz com a entidade (planos vs espécie).
  - Footer fixo “Copyright © 2025”.
  - Scripts de máscara `whatsapp` referenciam campo inexistente.


---

### area-login/detalhes_raca.php
- Tipo: Página PHP (admin) – detalhes/edição de raça.
- Função: Edita registros de raça de pet e espécie associada.
- Fluxo:
  - Lê `$_GET['id']` como raça.
  - Query: `raca_pet` join `especie_pet` para preencher formulário.
  - Select lista espécie atual + todas as ativas.
  - Form envia para `alt_raca.php`.
- Dependências:
  - `verifica.php`, `sidebar.php`, `header.php`.
  - Plugins: Select2, Imageuploadify, ApexCharts.
- Pontos de atenção:
  - **SQL sem prepared statements** (risco de SQLi via GET).
  - Codificação quebrada em textos (“Raça”, “Espécie”).
  - Scripts de máscara `whatsapp` referenciam campo inexistente.


---

### area-login/detalhes_usuario_adm.php
- Tipo: Página PHP (admin) – detalhes/edição de usuário admin.
- Função: Edita dados de usuário administrativo e oferece reset de senha.
- Fluxo:
  - Lê `$_GET['id_usuario']`.
  - Query: `SELECT * FROM usuario_adm WHERE id_usuario_adm='$id_usuario'`.
  - Form envia para `alt_usuario.php`.
  - Botão chama `reset_senha('<?php echo $id_usuario;?>')`.
- Dependências:
  - `verifica.php`, `sidebar.php`, `header.php`.
  - JS adicional em `assets/js/js-adm.js` (provável função de reset).
- Pontos de atenção:
  - **SQL sem prepared statements** (risco de SQLi via GET).
  - Codificação quebrada em textos (“Usuário”, “Lar Temporário”).
  - Footer fixo “Copyright © 2023”.


---

### area-login/disciplinas.php
- Tipo: Página PHP (admin) – gestão de disciplinas.
- Função: Lista disciplinas ativas e permite cadastrar novas e excluir.
- Estrutura:
  - Inclui `verifica.php`, `sidebar.php`, `header.php`.
  - Form de cadastro (nome + turmas vinculadas) envia para `adiciona_disciplina.php`.
  - Lista disciplinas de `disciplina` (ativo=1) com ação `excluir_disciplina()`.
  - Usa DataTables com botões (copy/excel/pdf/print).
- Dependências:
  - `assets/js/js-adm.js` (funções `mostra_cadastro`, `excluir_disciplina`).
  - DataTables + tagsinput.
- Pontos de atenção:
  - **SQL sem prepared statements** (risco de SQLi).
  - JS de CEP e campos de responsável parecem copiados e não usados nesta tela.
  - Codificação quebrada em textos.


---

### area-login/documentos.php
- Tipo: Página PHP (admin) – documentos do colaborador.
- Função: Exibe dados do colaborador e gerencia solicitações/documentos por categoria.
- Fluxo:
  - Lê `$_GET['id']` (colaborador).
  - Consulta `colaborador` + `vv_usuario` via prepared statement.
  - Carrega contrato atual e lista de contratos (querys diretas).
  - Carrega tipos de documento por categoria (1–7) e status.
  - Permite criar solicitação com upload opcional (RH) e listar solicitações.
  - Alteração de status via `alterar_status_documento.php`.
  - Exclusão via `colaborador_documentos.php?del=...`.
- Dependências:
  - `verifica.php`, `sidebar.php`, `header.php`.
  - Uploads em `uploads/`.
  - Tabelas: `colaborador`, `vv_usuario`, `tipo_contrato`, `tipo_documento`, `status_documento`, `colaborador_documento`.
  - jQuery Mask (CDN).
- Pontos de atenção:
  - Mistura queries preparadas e `query()` direta (possível SQLi).
  - Muitas strings com codificação quebrada (“Documentos”, “Solicitação”, etc.).
  - Página grande e duplicação de blocos por categoria.


---

### area-login/dompdf/AUTHORS.md
- Tipo: Arquivo de créditos (Markdown) – biblioteca Dompdf.
- Função: Lista mantenedores, alumni e contribuidores do Dompdf.
- Conteúdo:
  - Criador: Benj Carson.
  - Maintainers atuais: Brian Sweeney, Till Berger.
  - Referência a contribuidores via link do GitHub.
- Pontos de atenção:
  - Texto com encoding quebrado no nome “Fabien Ménager” (exibido como “MÃ©nager”).


---

### area-login/dompdf/autoload.inc.php
- Tipo: Bootstrap PHP (autoload).
- Função: Carrega o autoload do Composer para Dompdf.
- Conteúdo:
  - `require (__DIR__ . '/vendor/autoload.php');`
- Dependências:
  - Pasta `area-login/dompdf/vendor` (autoload gerado pelo Composer).


---

### area-login/dompdf/LICENSE.LGPL
- Tipo: Licença de software (texto).
- Função: Estabelece termos da **GNU Lesser General Public License v2.1 (Feb 1999)**.
- Aplicação: Define direitos e restrições de uso/distribuição/modificação do Dompdf.


---

### area-login/dompdf/README.md
- Tipo: Documentação oficial (Markdown) – Dompdf.
- Função: Explica o que é Dompdf, features, requisitos e exemplos de uso.
- Destaques:
  - Converte **HTML/CSS 2.1** para PDF; suporta estilos inline/externos.
  - Requisitos: PHP **>= 7.1**, extensões DOM/MBString e libs `php-font-lib`, `php-svg-lib` (com `sabberworm/php-css-parser`).
  - Recomendações: OPcache, GD, Imagick/GMagick.
  - Fontes: suporte a DejaVu; necessidade de fontes externas para Unicode amplo.
  - Exemplos de instalação via Composer/ZIP/Git e snippet de uso (`Dompdf`).
- Dependências externas citadas:
  - GitHub Dompdf, Packagist, wiki de requisitos, StackOverflow/Discussions.


---

### area-login/dompdf/vendor
- Tipo: Pasta de dependências (Composer).
- Função: Contém bibliotecas de terceiros usadas pelo Dompdf.
- Conteúdo (top-level):
  - `autoload.php`
  - `composer/`
  - `dompdf/`
  - `masterminds/`
  - `phenx/`
  - `sabberworm/`
- Observações:
  - Conteúdo auto-gerado pelo Composer; não é código proprietário do projeto.


---

### area-login/dompdf/vendor/autoload.php
- Tipo: Autoloader gerado pelo Composer.
- Função: Inicializa o autoload e retorna o loader.
- Conteúdo principal:
  - `require_once __DIR__ . '/composer/autoload_real.php';`
  - `ComposerAutoloaderInit...::getLoader()`


---

### area-login/dompdf/vendor/composer
- Tipo: Pasta interna do Composer (metadados/autoload).
- Função: Arquivos gerados automaticamente para autoload e informações das dependências.
- Conteúdo (top-level):
  - `autoload_classmap.php`, `autoload_namespaces.php`, `autoload_psr4.php`
  - `autoload_real.php`, `autoload_static.php`, `ClassLoader.php`
  - `installed.json`, `installed.php`, `InstalledVersions.php`
  - `LICENSE`, `platform_check.php`


---

### area-login/dompdf/vendor/composer/autoload_classmap.php
- Tipo: Mapa de classes (PHP) – gerado pelo Composer.
- Função: Resolve classes específicas para arquivos (fallback classmap).
- Conteúdo relevante:
  - `Composer\InstalledVersions` -> `vendor/composer/InstalledVersions.php`
  - `Dompdf\Cpdf` -> `vendor/dompdf/dompdf/lib/Cpdf.php`


---

### area-login/dompdf/vendor/composer/autoload_namespaces.php
- Tipo: Mapa de namespaces (PHP) – gerado pelo Composer.
- Função: Registro legacy de namespaces (PSR-0).
- Conteúdo: array vazio (nenhum namespace registrado aqui).


---

### area-login/dompdf/vendor/composer/autoload_psr4.php
- Tipo: Mapa PSR-4 (PHP) – gerado pelo Composer.
- Função: Define namespaces PSR-4 e caminhos das dependências.
- Namespaces registrados:
  - `Svg\\` -> `phenx/php-svg-lib/src/Svg`
  - `Sabberworm\\CSS\\` -> `sabberworm/php-css-parser/src`
  - `Masterminds\\` -> `masterminds/html5/src`
  - `FontLib\\` -> `phenx/php-font-lib/src/FontLib`
  - `Dompdf\\` -> `dompdf/dompdf/src`


---

### area-login/dompdf/vendor/composer/autoload_real.php
- Tipo: Inicializador do autoloader (PHP) – gerado pelo Composer.
- Função: Cria o loader, aplica mapas (PSR-4/classmap) e registra no PHP.
- Fluxo:
  - Executa `platform_check.php`.
  - Carrega `ClassLoader.php`.
  - Decide entre loader estático (`autoload_static.php`) ou dinâmico (PSR-4/classmap).
  - Registra e retorna o loader.


---

### area-login/dompdf/vendor/composer/autoload_static.php
- Tipo: Mapa estático do autoloader (PHP) – gerado pelo Composer.
- Função: Define mapas PSR-4 e classmap em estruturas estáticas.
- Conteúdo:
  - Prefixos PSR-4: `Svg\\`, `Sabberworm\\CSS\\`, `Masterminds\\`, `FontLib\\`, `Dompdf\\`.
  - Classmap: `Composer\InstalledVersions`, `Dompdf\Cpdf`.


---

### area-login/dompdf/vendor/composer/ClassLoader.php
- Tipo: Biblioteca do Composer (PHP).
- Função: Implementa autoload PSR-0/PSR-4/classmap.
- Observações:
  - Código padrão do Composer, não específico do projeto.
  - Referência a PSR-0/PSR-4 e suporte a include_path.


---

### area-login/dompdf/vendor/composer/installed.json
- Tipo: Metadados de dependências (JSON) – gerado pelo Composer.
- Função: Lista pacotes instalados e versões.
- Pacotes principais observados:
  - `dompdf/dompdf` **v2.0.3** (LGPL-2.1) – HTML para PDF.
  - `masterminds/html5` **2.7.6** (MIT) – parser HTML5.
  - Outros pacotes listados (continua no arquivo): `phenx/php-font-lib`, `phenx/php-svg-lib`, `sabberworm/php-css-parser`.
- Observações:
  - Metadados incluem URLs de origem, versões, requisitos e `install-path`.


---

### area-login/dompdf/vendor/composer/installed.php
- Tipo: Metadados de dependências (PHP) – gerado pelo Composer.
- Função: Lista versão/paths das libs instaladas em formato PHP array.
- Pacotes listados:
  - `dompdf/dompdf` v2.0.3
  - `masterminds/html5` 2.7.6
  - `phenx/php-font-lib` 0.5.4
  - `phenx/php-svg-lib` 0.5.0
  - `sabberworm/php-css-parser` 8.4.0
- Observações:
  - `__root__` marcado como `project`, versão `1.0.0+no-version-set`.


---

### area-login/dompdf/vendor/composer/InstalledVersions.php
- Tipo: API runtime do Composer (PHP).
- Função: Permite consultar versões e pacotes instalados em tempo de execução.
- Observações:
  - Código padrão do Composer.
  - Usado por bibliotecas que precisam verificar versão/constraint instalada.


---

### area-login/dompdf/vendor/composer/LICENSE
- Tipo: Licença MIT (texto).
- Função: Termos de uso do Composer.
- Autores: Nils Adermann e Jordi Boggiano.


---

### area-login/dompdf/vendor/composer/platform_check.php
- Tipo: Verificação de plataforma (PHP) – gerado pelo Composer.
- Função: Valida versão mínima do PHP (>= 7.1) e aborta com erro se não atender.
- Comportamento:
  - Emite header HTTP 500 quando em ambiente web.
  - Dispara `E_USER_ERROR` com descrição do problema.


---

### area-login/dompdf/vendor/dompdf
- Tipo: Pasta de dependência (vendor) – namespace Dompdf.
- Função: Contém o pacote `dompdf/dompdf`.


---

### area-login/dompdf/vendor/dompdf/dompdf
- Tipo: Código-fonte da biblioteca Dompdf.
- Conteúdo (top-level):
  - `AUTHORS.md`, `LICENSE.LGPL`, `README.md`, `VERSION`
  - `composer.json`
  - Pastas: `lib/`, `src/`


---

### area-login/dompdf/vendor/dompdf/dompdf/AUTHORS.md
- Tipo: Arquivo de créditos (Markdown) – Dompdf.
- Função: Lista mantenedores, alumni e contribuidores.
- Observações:
  - Mesmo conteúdo do `area-login/dompdf/AUTHORS.md`.
  - Encoding quebrado em “Fabien Ménager”.


---

### area-login/dompdf/vendor/dompdf/dompdf/composer.json
- Tipo: Manifesto do pacote (Composer).
- Função: Define dependências, autoload e metadados do Dompdf.
- Requisitos:
  - PHP ^7.1 || ^8.0, ext-dom, ext-mbstring.
  - `masterminds/html5`, `phenx/php-font-lib`, `phenx/php-svg-lib`.
- Autoload:
  - PSR-4 `Dompdf\\` -> `src/`
  - Classmap -> `lib/`


---

### area-login/dompdf/vendor/dompdf/dompdf/lib
- Tipo: Pasta de bibliotecas internas do Dompdf.
- Conteúdo (top-level):
  - `Cpdf.php`
  - `fonts/`
  - `res/`


---

### area-login/dompdf/vendor/dompdf/dompdf/lib/Cpdf.php
- Tipo: Biblioteca PHP (Dompdf) – gerador de PDF.
- Função: Implementa criação/manipulação de PDF (classes, objetos, fontes).
- Observações:
  - Código de terceiros (Dompdf).
  - Inclui constantes para AcroForm e PDF 1.7.


---

### area-login/dompdf/vendor/dompdf/dompdf/lib/fonts
- Tipo: Diretório de fontes (TTF/AFM/UFM/JSON/HTML).
- Função: Fontes e métricas usadas pelo Dompdf (Helvetica, Times, DejaVu, etc.).
- Conteúdo (amostra/top-level):
  - Arquivos `.ttf`, `.afm`, `.ufm`, `.json` e `installed-fonts*.json`.
  - Fontes DejaVu, Helvetica, Times, Courier, Symbol, ZapfDingbats.
  - Arquivos de ícones (ex.: `boxicons_*`, `lineicons_*`).
- Observações:
  - Arquivos binários e métricas; não documentar conteúdo interno.


---

### area-login/dompdf/vendor/dompdf/dompdf/lib/res
- Tipo: Recursos estáticos do Dompdf.
- Conteúdo:
  - `broken_image.png`, `broken_image.svg` (placeholders).
  - `html.css` (CSS base do Dompdf).


---

### area-login/dompdf/vendor/dompdf/dompdf/lib/res/broken_image.png
- Tipo: Imagem PNG (placeholder).
- Função: Ícone de fallback para imagens quebradas no Dompdf.
- Metadados: 618 bytes; última modificação 30/01/2026 00:15:52.


---

### area-login/dompdf/vendor/dompdf/dompdf/lib/res/broken_image.svg
- Tipo: Imagem SVG (placeholder).
- Função: Ícone vetorial de fallback para imagens quebradas.
- Conteúdo: desenho simples (retângulo com duas linhas diagonais).


---

### area-login/dompdf/vendor/dompdf/dompdf/lib/res/html.css
- Tipo: CSS base (Dompdf).
- Função: Estilos padrão usados pelo Dompdf para layout/renderização de HTML.
- Observações:
  - Inclui regras para elementos de bloco, tabelas e tipografia.
  - Referências de origem Mozilla e W3C.


---

### area-login/dompdf/vendor/dompdf/dompdf/LICENSE.LGPL
- Tipo: Licença de software (texto).
- Função: Termos da **GNU LGPL v2.1** para o pacote Dompdf.
- Observação: Mesmo conteúdo de licença do `area-login/dompdf/LICENSE.LGPL`.


---

### area-login/dompdf/vendor/dompdf/dompdf/README.md
- Tipo: Documentação oficial (Markdown) – Dompdf.
- Função: Explica features, requisitos e exemplos de uso.
- Observação: Mesmo conteúdo do `area-login/dompdf/README.md`.


---

### area-login/dompdf/vendor/dompdf/dompdf/src
- Tipo: Código-fonte principal do Dompdf (PHP).
- Conteúdo (top-level, sem inspeção interna):
  - Pastas: `Adapter/`, `Css/`, `Exception/`, `Frame/`, `FrameDecorator/`, `FrameReflower/`, `Image/`, `Positioner/`, `Renderer/`.
  - Arquivos: `Dompdf.php`, `Options.php`, `Canvas.php`, `CanvasFactory.php`, `FontMetrics.php`, `Helpers.php`, etc.
- Observações:
  - Biblioteca de terceiros; análise detalhada arquivo-a-arquivo pode ser feita sob demanda.


---

### area-login/dompdf/vendor/dompdf/dompdf/VERSION
- Tipo: Arquivo de versão (texto).
- Conteúdo: `2.0.3`.


---

### area-login/dompdf/vendor/masterminds
- Tipo: Pasta de dependência (vendor).
- Função: Contém o pacote `masterminds/html5` (parser HTML5).


---

### area-login/dompdf/vendor/masterminds/html5
- Tipo: Código-fonte de terceiros (Masterminds HTML5).
- Conteúdo (top-level):
  - `bin/`, `src/`
  - `composer.json`, `README.md`, `LICENSE.txt`, `CREDITS`, `RELEASE.md`, `UPGRADING.md`
- Observações:
  - Biblioteca externa usada pelo Dompdf; não detalhada arquivo-a-arquivo neste passo.


---

### area-login/dompdf/vendor/phenx
- Tipo: Pasta de dependências (vendor).
- Função: Contém bibliotecas `php-font-lib` e `php-svg-lib`.


---

### area-login/dompdf/vendor/phenx/php-font-lib
- Tipo: Biblioteca de terceiros (FontLib).
- Conteúdo (top-level):
  - `composer.json`, `README.md`, `LICENSE`
  - `src/`, `maps/`, `.github/`, `.htaccess`, `index.php`, `bower.json`
- Observações:
  - Usada pelo Dompdf para métricas e manipulação de fontes.


---

### area-login/dompdf/vendor/phenx/php-svg-lib
- Tipo: Biblioteca de terceiros (SVG).
- Conteúdo (top-level):
  - `composer.json`, `README.md`, `LICENSE`, `src/`
- Observações:
  - Usada pelo Dompdf para parsing/renderização SVG.


---

### area-login/dompdf/vendor/sabberworm
- Tipo: Pasta de dependência (vendor).
- Função: Contém o pacote `php-css-parser`.


---

### area-login/dompdf/vendor/sabberworm/php-css-parser
- Tipo: Biblioteca de terceiros (CSS parser).
- Conteúdo (top-level):
  - `composer.json`, `README.md`, `LICENSE`, `CHANGELOG.md`, `src/`
- Observações:
  - Usada pelo Dompdf para parsing CSS.


---

### area-login/dompdf/VERSION
- Tipo: Arquivo de versão (texto).
- Conteúdo: `2.0.3`.


---

### area-login/dompdf_
- Tipo: Pasta de biblioteca (provável cópia do Dompdf).
- Conteúdo (top-level):
  - `.travis.yml`, `autoload.inc.php`, `composer.json`, `CONTRIBUTING.md`
  - `lib/`, `LICENSE.LGPL`, `phpcs.xml`, `phpunit.xml.dist`, `README.md`, `src/`, `VERSION`
- Observações:
  - Estrutura semelhante ao Dompdf; parece cópia/variante.


---

### area-login/dompdf_/.travis.yml
- Tipo: Configuração de CI (Travis CI).
- Função: Define matriz de testes PHP (5.4–7.3, nightly, hhvm).
- Fluxo:
  - `composer install`
  - Executa `vendor/bin/phpunit` (phpcs comentado).
- Observações:
  - Indica suporte legado (PHP 5.x) nesta cópia.


---

### area-login/dompdf_/autoload.inc.php
- Tipo: Bootstrap/autoload (PHP) – Dompdf legado.
- Função: Registra autoloaders e carrega dependências locais (HTML5 parser, CSS parser, font-lib, svg-lib, autoloader Dompdf).
- Dependências:
  - `lib/html5lib/Parser.php`
  - `lib/php-css-parser/lib/*`
  - `lib/php-font-lib/src/FontLib/Autoloader.php`
  - `lib/php-svg-lib/src/autoload.php`
  - `src/Autoloader.php`
- Pontos de atenção:
  - Comentário indica “New PHP 5.3.0 namespaced autoloader” (base antiga).
  - Encoding quebrado no nome “Fabien Ménager”.


---

### area-login/dompdf_/composer.json
- Tipo: Manifesto do pacote (Composer) – Dompdf legado.
- Requisitos:
  - PHP `>=5.4.0`, ext-dom, ext-mbstring.
  - `phenx/php-font-lib` 0.5.*, `phenx/php-svg-lib` 0.3.*.
- Autoload:
  - PSR-4 `Dompdf\\` -> `src/`
  - Classmap -> `lib/`
- Observações:
  - Indica versão mais antiga (branch-alias `0.7-dev`).
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/CONTRIBUTING.md
- Tipo: Guia de contribuição (Markdown).
- Função: Orienta como reportar bugs e contribuir com o Dompdf.
- Conteúdo:
  - Canais de suporte (Google Group, StackOverflow).
  - Uso do GitHub Issues e boas práticas de reporte.
  - Passos para fork/PR no GitHub.


---

### area-login/dompdf_/lib
- Tipo: Biblioteca interna (Dompdf legado).
- Conteúdo (top-level):
  - `Cpdf.php`
  - `fonts/`, `html5lib/`, `php-css-parser/`, `php-font-lib/`, `php-svg-lib/`, `res/`


---

### area-login/dompdf_/lib/Cpdf.php
- Tipo: Biblioteca PHP (Dompdf legado) – gerador de PDF.
- Função: Implementa criação/manipulação de PDF.
- Observações:
  - Código de terceiros; versão legada.
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/fonts
- Tipo: Diretório de fontes (TTF/AFM/UFM/JSON/PHP).
- Função: Fontes e métricas usadas pelo Dompdf legado.
- Conteúdo (amostra/top-level):
  - Arquivos `.ttf`, `.afm`, `.ufm`, `.afm.php`, `.ufm.php`
  - `dompdf_font_family_cache*.php`, `mustRead.html`.
- Observações:
  - Arquivos binários/métricas; não documentar conteúdo interno.


---

### area-login/dompdf_/lib/html5lib
- Tipo: Parser HTML5 legado (biblioteca interna).
- Conteúdo (top-level):
  - `Data.php`, `InputStream.php`, `Parser.php`, `Tokenizer.php`, `TreeBuilder.php`
  - `named-character-references.ser`


---

### area-login/dompdf_/lib/html5lib/Data.php
- Tipo: Biblioteca PHP (HTML5 parser).
- Função: Tabela de codepoints e helpers para entidades HTML.
- Detalhes:
  - Carrega `named-character-references.ser`.
  - Funções para conversão de codepoint e UTF-8.


---

### area-login/dompdf_/lib/html5lib/InputStream.php
- Tipo: Biblioteca PHP (HTML5 parser).
- Função: Normaliza stream de entrada (UTF-8), trata BOM e erros de parsing.
- Dependências:
  - Usa `HTML5_Tokenizer::PARSEERROR`.
  - Requer `iconv` para normalização.


---

### area-login/dompdf_/lib/html5lib/named-character-references.ser
- Tipo: Arquivo serializado (binário).
- Função: Tabela de entidades HTML usadas pelo parser.
- Metadados: 182.163 bytes; última modificação 30/01/2026 00:15:43.


---

### area-login/dompdf_/lib/html5lib/Parser.php
- Tipo: Biblioteca PHP (HTML5 parser).
- Função: API pública para parse de HTML completo ou fragmentos.
- Dependências:
  - `Data.php`, `InputStream.php`, `TreeBuilder.php`, `Tokenizer.php`.


---

### area-login/dompdf_/lib/html5lib/Tokenizer.php
- Tipo: Biblioteca PHP (HTML5 parser).
- Função: Tokeniza HTML para o TreeBuilder.
- Observações:
  - Implementa constantes de tokens e modelos de conteúdo.


---

### area-login/dompdf_/lib/html5lib/TreeBuilder.php
- Tipo: Biblioteca PHP (HTML5 parser).
- Função: Constrói árvore DOM a partir dos tokens.
- Observações:
  - Implementa modos de construção (spec HTML5).


---

### area-login/dompdf_/lib/php-css-parser
- Tipo: Biblioteca de terceiros (Sabberworm PHP-CSS-Parser).
- Conteúdo (top-level):
  - `.travis.yml`, `CHANGELOG.md`, `composer.json`, `composer.lock`, `Doxyfile`
  - `lib/`, `phpunit.xml`, `README.md`, `tests/`
- Observações:
  - Dependência legada usada pelo Dompdf_.


---

### area-login/dompdf_/lib/php-css-parser/.travis.yml
- Tipo: Configuração de CI (Travis CI).
- Função: Testes do php-css-parser em PHP 5.3–7.0, nightly e hhvm.


---

### area-login/dompdf_/lib/php-css-parser/CHANGELOG.md
- Tipo: Changelog (Markdown).
- Função: Histórico de versões (5.x–8.x) do php-css-parser.
- Observações:
  - Texto com encoding quebrado em alguns trechos (caracteres “â€¦”).


---

### area-login/dompdf_/lib/php-css-parser/composer.json
- Tipo: Manifesto do pacote (Composer).
- Função: Dependências e autoload do php-css-parser.
- Requisitos:
  - PHP >= 5.3.2
  - PHPUnit em `require-dev`.
- Autoload:
  - PSR-0 `Sabberworm\\CSS` -> `lib/`.


---

### area-login/dompdf_/lib/php-css-parser/composer.lock
- Tipo: Lockfile (Composer).
- Função: Trava versões das dependências de desenvolvimento.
- Observações:
  - Lista pacotes dev (ex.: `doctrine/instantiator`, `myclabs/deep-copy`, etc.).


---

### area-login/dompdf_/lib/php-css-parser/Doxyfile
- Tipo: Configuração do Doxygen.
- Função: Geração de documentação para php-css-parser.
- Destaques:
  - `PROJECT_NAME` = "Sabberworm/PHP-CSS-Parser"
  - `PROJECT_NUMBER` = "7.0.3"
  - `OUTPUT_DIRECTORY` = `../PHP-CSS-Parser-Documentation`


---

### area-login/dompdf_/lib/php-css-parser/lib
- Tipo: Código-fonte da biblioteca (PHP).
- Conteúdo:
  - `Sabberworm/` (namespace principal).


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm
- Tipo: Namespace principal do php-css-parser.
- Conteúdo:
  - `CSS/`


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS
- Tipo: Código-fonte principal do parser CSS.
- Conteúdo (top-level):
  - Pastas: `Comment/`, `CSSList/`, `Parsing/`, `Property/`, `Rule/`, `RuleSet/`, `Value/`
  - Arquivos: `OutputFormat.php`, `Parser.php`, `Renderable.php`, `Settings.php`


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Comment
- Tipo: Módulo de comentários (CSS).
- Conteúdo:
  - `Comment.php`, `Commentable.php`


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Comment/Comment.php
- Tipo: Classe PHP (Comment).
- Função: Representa comentários CSS e renderiza `/* ... */`.


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Comment/Commentable.php
- Tipo: Interface PHP.
- Função: Contrato para objetos que armazenam comentários CSS.


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/CSSList
- Tipo: Módulo de listas CSS.
- Conteúdo:
  - `AtRuleBlockList.php`, `CSSBlockList.php`, `CSSList.php`, `Document.php`, `KeyFrame.php`


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/CSSList/AtRuleBlockList.php
- Tipo: Classe PHP (AtRuleBlockList).
- Função: Lista de blocos para regras `@` desconhecidas (ex.: @media).


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/CSSList/CSSBlockList.php
- Tipo: Classe abstrata PHP.
- Função: Lista de blocos CSS com helpers para coletar regras, seletores e valores.


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/CSSList/CSSList.php
- Tipo: Classe abstrata PHP (container CSS).
- Função: Container genérico de regras e listas CSS; renderiza conteúdo.


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/CSSList/Document.php
- Tipo: Classe PHP (Document).
- Função: Lista raiz do CSS parseado; fornece getters utilitários (rules, values, selectors).


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/CSSList/KeyFrame.php
- Tipo: Classe PHP (KeyFrame).
- Função: Representa regra `@keyframes` (com vendor prefix) e renderiza bloco.


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/OutputFormat.php
- Tipo: Classe PHP (OutputFormat).
- Função: Configura formato de saída do CSS (espaçamento, indentação, quoting).
- Observações:
  - Inclui `OutputFormatter` helper.
  - Texto com encoding quebrado (“whatâ€™s”).


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Parser.php
- Tipo: Classe PHP (Parser).
- Função: Faz parsing de CSS em `Document` com regras, @rules e seletores.
- Observações:
  - Suporta `@import`, `@charset`, `@keyframes`, `@namespace` e regras desconhecidas.


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Parsing
- Tipo: Exceções de parsing CSS.
- Conteúdo:
  - `OutputException.php`, `SourceException.php`, `UnexpectedTokenException.php`


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Parsing/OutputException.php
- Tipo: Exceção PHP.
- Função: Erro ao renderizar/gerar saída CSS inválida.


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Parsing/SourceException.php
- Tipo: Exceção PHP.
- Função: Erros de parsing com linha associada.


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Parsing/UnexpectedTokenException.php
- Tipo: Exceção PHP.
- Função: Erro de token inesperado durante parsing.
- Observações:
  - Mensagens com encoding quebrado (“â€œ â€”).


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Property
- Tipo: Módulo de propriedades/regras @.
- Conteúdo:
  - `AtRule.php`, `Charset.php`, `CSSNamespace.php`, `Import.php`, `Selector.php`


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Property/AtRule.php
- Tipo: Interface PHP.
- Função: Contrato para regras `@` e listas de tipos suportados.
- Observações:
  - Constantes `BLOCK_RULES` e `SET_RULES` (texto com encoding quebrado).


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Property/Charset.php
- Tipo: Classe PHP (`@charset`).
- Função: Representa regra `@charset` e suas restrições.
- Observações:
  - Comentários e texto com encoding quebrado.


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Property/CSSNamespace.php
- Tipo: Classe PHP (`@namespace`).
- Função: Representa regra `@namespace` com URL e prefixo.


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Property/Import.php
- Tipo: Classe PHP (`@import`).
- Função: Representa regra `@import` com URL e media query.


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Property/Selector.php
- Tipo: Classe PHP (Selector).
- Função: Representa seletor CSS e calcula especificidade.


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Renderable.php
- Tipo: Interface PHP.
- Função: Contrato de renderização (toString/render/getLineNo).


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Rule
- Tipo: Módulo de regras CSS.
- Conteúdo:
  - `Rule.php`


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Rule/Rule.php
- Tipo: Classe PHP (Rule).
- Função: Regra CSS com chave, valor, `!important` e hacks IE.
- Observações:
  - Comentários com encoding quebrado no docstring.


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/RuleSet
- Tipo: Módulo de conjuntos de regras.
- Conteúdo:
  - `AtRuleSet.php`, `DeclarationBlock.php`, `RuleSet.php`


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/RuleSet/AtRuleSet.php
- Tipo: Classe PHP (AtRuleSet).
- Função: Representa regras `@` que se comportam como RuleSet (ex.: `@font-face`).


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/RuleSet/DeclarationBlock.php
- Tipo: Classe PHP (DeclarationBlock).
- Função: Bloco de declarações por seletor; expande/contrai shorthands.


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/RuleSet/RuleSet.php
- Tipo: Classe abstrata PHP (RuleSet).
- Função: Gerencia conjunto de regras e renderização.
- Observações:
  - Comentários com encoding quebrado (“â€œ-â€”).


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Settings.php
- Tipo: Classe PHP (Settings).
- Função: Configura parsing (charset, lenient parsing, multibyte).


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Value
- Tipo: Módulo de valores CSS.
- Conteúdo:
  - `Color.php`, `CSSFunction.php`, `CSSString.php`, `PrimitiveValue.php`
  - `RuleValueList.php`, `Size.php`, `URL.php`, `Value.php`, `ValueList.php`


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Value/Color.php
- Tipo: Classe PHP (Color).
- Função: Representa cores CSS e renderiza em RGB/hex.


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Value/CSSFunction.php
- Tipo: Classe PHP (CSSFunction).
- Função: Representa funções CSS (ex.: `rgb()`, `url()` com args).


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Value/CSSString.php
- Tipo: Classe PHP (CSSString).
- Função: Representa strings CSS e aplica quoting/escaping.


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Value/PrimitiveValue.php
- Tipo: Classe abstrata PHP.
- Função: Base para valores primitivos.


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Value/RuleValueList.php
- Tipo: Classe PHP (RuleValueList).
- Função: Lista de valores de regra com separador.


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Value/Size.php
- Tipo: Classe PHP (Size).
- Função: Representa tamanhos/medidas CSS e unidades.
- Observações:
  - Constantes de unidades com encoding quebrado.


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Value/URL.php
- Tipo: Classe PHP (URL).
- Função: Representa `url(...)` em CSS.


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Value/Value.php
- Tipo: Classe abstrata PHP (Value).
- Função: Base para valores CSS; armazena line number.


---

### area-login/dompdf_/lib/php-css-parser/lib/Sabberworm/CSS/Value/ValueList.php
- Tipo: Classe abstrata PHP (ValueList).
- Função: Lista de valores com separador e renderização.


---

### area-login/dompdf_/lib/php-css-parser/phpunit.xml
- Tipo: Configuração de testes (PHPUnit).
- Função: Define suite e bootstrap `tests/bootstrap.php`.


---

### area-login/dompdf_/lib/php-css-parser/README.md
- Tipo: Documentação (Markdown).
- Função: Guia de uso do php-css-parser (instalação, parsing, manipulação).
- Observações:
  - Vários trechos com encoding quebrado (ex.: “â€™”, “â€“”).


---

### area-login/dompdf_/lib/php-css-parser/tests
- Tipo: Pasta de testes.
- Conteúdo (top-level):
  - `bootstrap.php`, `phpunit.xml`, `quickdump.php`
  - `files/`, `Sabberworm/`


---

### area-login/dompdf_/lib/php-css-parser/tests/bootstrap.php
- Tipo: Bootstrap de testes (PHP).
- Função: Autoloader simples apontando para `../lib/`.


---

### area-login/dompdf_/lib/php-css-parser/tests/files
- Tipo: Pasta de fixtures CSS de testes.
- Função: Arquivos CSS usados nos testes do parser.


---

### area-login/dompdf_/lib/php-css-parser/tests/files/1readme.css
- Tipo: Fixture CSS.
- Função: Exemplo com `@charset`, `@font-face` e regra básica `html, body`.


---

### area-login/dompdf_/lib/php-css-parser/tests/files/2readme.css
- Tipo: Fixture CSS.
- Função: Exemplo de seletor `#header`, margens, fontes e `!important`.


---

### area-login/dompdf_/lib/php-css-parser/tests/files/atrules.css
- Tipo: Fixture CSS.
- Função: Exercita várias `@rules` (charset, font-face, keyframes, supports, page, media, region-style).


---

### area-login/dompdf_/lib/php-css-parser/tests/files/case-insensitivity.css
- Tipo: Fixture CSS.
- Função: Testa parsing case-insensitive (nomes de regras, funções e unidades).


---

### area-login/dompdf_/lib/php-css-parser/tests/files/-charset-after-rule.css
- Tipo: Fixture CSS.
- Função: Caso de `@charset` após regra (ordem inválida).


---

### area-login/dompdf_/lib/php-css-parser/tests/files/-charset-in-block.css
- Tipo: Fixture CSS.
- Função: `@charset` dentro de bloco `@media` (inválido).


---

### area-login/dompdf_/lib/php-css-parser/tests/files/colortest.css
- Tipo: Fixture CSS.
- Função: Testa parsing de cores (nomeadas, rgb/rgba, hsl/hsla, hex).


---

### area-login/dompdf_/lib/php-css-parser/tests/files/comments.css
- Tipo: Fixture CSS.
- Função: Testa comentários em múltiplos pontos (import, seletores, blocos).


---

### area-login/dompdf_/lib/php-css-parser/tests/files/create-shorthands.css
- Tipo: Fixture CSS.
- Função: Testa criação de shorthands (font, border, background, margin).


---

### area-login/dompdf_/lib/php-css-parser/tests/files/docuwiki.css
- Tipo: Fixture CSS.
- Função: CSS comprimido (minificado) para testes de parsing.


---

### area-login/dompdf_/lib/php-css-parser/tests/files/-empty.css
- Tipo: Fixture CSS.
- Função: Arquivo vazio para teste de parsing.


---

### area-login/dompdf_/lib/php-css-parser/tests/files/-end-token.css
- Tipo: Fixture CSS.
- Função: Comentário não fechado para testar EOF/incompleto.


---

### area-login/dompdf_/lib/php-css-parser/tests/files/-end-token-2.css
- Tipo: Fixture CSS.
- Função: Declaração com ponto-e-vírgula extra para testar token final.


---

### area-login/dompdf_/lib/php-css-parser/tests/files/expand-shorthands.css
- Tipo: Fixture CSS.
- Função: Testa expansão de shorthands (font, border, background, margin, padding).


---

### area-login/dompdf_/lib/php-css-parser/tests/files/-fault-tolerance.css
- Tipo: Fixture CSS.
- Função: Testa tolerância a sintaxe inválida (comentário `//`, propriedades inválidas).


---

### area-login/dompdf_/lib/php-css-parser/tests/files/functions.css
- Tipo: Fixture CSS.
- Função: Testa funções CSS e pseudo-elementos (`::before`), prefixos `-moz-`.
- Observações:
  - Caracter “Â»” indica possível encoding quebrado.


---

### area-login/dompdf_/lib/php-css-parser/tests/files/ie.css
- Tipo: Fixture CSS.
- Função: Testa propriedades de opacidade e filtros específicos do IE.


---

### area-login/dompdf_/lib/php-css-parser/tests/files/ie-hacks.css
- Tipo: Fixture CSS.
- Função: Testa hacks IE (`\9`, `\0`) e parsing com `!important`.


---

### area-login/dompdf_/lib/php-css-parser/tests/files/important.css
- Tipo: Fixture CSS.
- Função: CSS minificado com `!important` e sprites (background-position).


---

### area-login/dompdf_/lib/php-css-parser/tests/files/inner-color.css
- Tipo: Fixture CSS.
- Função: Testa função de gradiente com `from()` e `hsl()`.


---

### area-login/dompdf_/lib/php-css-parser/tests/files/line-numbers.css
- Tipo: Fixture CSS.
- Função: Exercita regras com comentários indicando linhas para testes de line numbers.


---

### area-login/dompdf_/lib/php-css-parser/tests/files/namespaces.css
- Tipo: Fixture CSS.
- Função: Testa `@namespace` e seletores com namespace (`foo|test`).


---

### area-login/dompdf_/lib/php-css-parser/tests/files/nested.css
- Tipo: Fixture CSS.
- Função: Testa regras repetidas e `@media` com seletor interno.


---

### area-login/dompdf_/lib/php-css-parser/tests/files/slashed.css
- Tipo: Fixture CSS.
- Função: Testa valores com barra (`/`) em font e border-radius.


---

### area-login/dompdf_/lib/php-css-parser/tests/files/specificity.css
- Tipo: Fixture CSS.
- Função: Testa cálculo de especificidade com combinadores e pseudo-elementos.


---

### area-login/dompdf_/lib/php-css-parser/tests/files/-tobedone.css
- Tipo: Fixture CSS.
- Função: Testa seletores com `{` em atributo e media query.


---

### area-login/dompdf_/lib/php-css-parser/tests/files/unicode.css
- Tipo: Fixture CSS.
- Função: Testa escapes Unicode em strings CSS.
- Observações:
  - Comentários mostram equivalências; há encoding quebrado (“Ã©”, “Â¥”).


---

### area-login/dompdf_/lib/php-css-parser/tests/files/url.css
- Tipo: Fixture CSS.
- Função: Testa `url(...)` em propriedades (background).


---

### area-login/dompdf_/lib/php-css-parser/tests/files/values.css
- Tipo: Fixture CSS.
- Função: Testa múltiplos valores, fontes, cores, unidades e `!important`.


---

### area-login/dompdf_/lib/php-css-parser/tests/files/webkit.css
- Tipo: Fixture CSS.
- Função: Testa `-webkit-linear-gradient`.


---

### area-login/dompdf_/lib/php-css-parser/tests/files/whitespace.css
- Tipo: Fixture CSS.
- Função: Testa espaços extras em valores e funções.


---

### area-login/dompdf_/lib/php-css-parser/tests/phpunit.xml
- Tipo: Configuração de testes (PHPUnit).
- Função: Indica `bootstrap.php` para testes.


---

### area-login/dompdf_/lib/php-css-parser/tests/quickdump.php
- Tipo: Script CLI PHP.
- Função: Lê CSS do stdin, faz parse, imprime estrutura e render.


---

### area-login/dompdf_/lib/php-css-parser/tests/Sabberworm
- Tipo: Namespace de testes.
- Conteúdo:
  - `CSS/`


---

### area-login/dompdf_/lib/php-css-parser/tests/Sabberworm/CSS
- Tipo: Testes unitários do parser CSS.
- Conteúdo (top-level):
  - `CSSList/`, `RuleSet/`
  - `OutputFormatTest.php`, `ParserTest.php`


---

### area-login/dompdf_/lib/php-css-parser/tests/Sabberworm/CSS/CSSList
- Tipo: Testes de CSSList.
- Conteúdo:
  - `AtRuleBlockListTest.php`, `DocumentTest.php`


---

### area-login/dompdf_/lib/php-css-parser/tests/Sabberworm/CSS/CSSList/AtRuleBlockListTest.php
- Tipo: Teste PHPUnit.
- Função: Verifica parsing de `@media` e args.


---

### area-login/dompdf_/lib/php-css-parser/tests/Sabberworm/CSS/CSSList/DocumentTest.php
- Tipo: Teste PHPUnit.
- Função: Testa `setContents` no Document.


---

### area-login/dompdf_/lib/php-css-parser/tests/Sabberworm/CSS/OutputFormatTest.php
- Tipo: Teste PHPUnit.
- Função: Verifica renderizações com diferentes `OutputFormat` (compact/pretty/etc).


---

### area-login/dompdf_/lib/php-css-parser/tests/Sabberworm/CSS/ParserTest.php
- Tipo: Teste PHPUnit.
- Função: Testa parsing de arquivos, cores, unicode, especificidade e manipulação.


---

### area-login/dompdf_/lib/php-css-parser/tests/Sabberworm/CSS/RuleSet
- Tipo: Testes de RuleSet.
- Conteúdo:
  - `DeclarationBlockTest.php`, `LenientParsingTest.php`


---

### area-login/dompdf_/lib/php-css-parser/tests/Sabberworm/CSS/RuleSet/DeclarationBlockTest.php
- Tipo: Teste PHPUnit.
- Função: Testa expansão/criação de shorthands (border/font/background/margin).


---

### area-login/dompdf_/lib/php-css-parser/tests/Sabberworm/CSS/RuleSet/LenientParsingTest.php
- Tipo: Teste PHPUnit.
- Função: Testa parsing estrito vs leniente e arquivos problemáticos.


---

### area-login/dompdf_/lib/php-font-lib
- Tipo: Biblioteca de terceiros (FontLib) – versão legada.
- Conteúdo (top-level):
  - `.htaccess`, `.travis.yml`, `bower.json`, `composer.json`, `index.php`, `LICENSE`
  - `maps/`, `phpunit.xml.dist`, `README.md`, `sample-fonts/`, `src/`, `tests/`


---

### area-login/dompdf_/lib/php-font-lib/.htaccess
- Tipo: Configuração Apache.
- Função: Comentário indicando bloqueio de acesso (`deny from all`).


---

### area-login/dompdf_/lib/php-font-lib/.travis.yml
- Tipo: Configuração CI (Travis CI).
- Função: Matriz PHP 5.4–7.0 e hhvm; executa `bin/phpunit`.


---

### area-login/dompdf_/lib/php-font-lib/bower.json
- Tipo: Manifesto Bower (legado).
- Função: Metadados do php-font-lib (versão 0.3.1).


---

### area-login/dompdf_/lib/php-font-lib/composer.json
- Tipo: Manifesto Composer.
- Função: Define autoload PSR-4 `FontLib\\` e metadados.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/index.php
- Tipo: PHP simples.
- Função: Redireciona para `www/` (não existe na pasta).


---

### area-login/dompdf_/lib/php-font-lib/LICENSE
- Tipo: Licença (LGPL v2.1).
- Função: Termos de uso do php-font-lib.


---

### area-login/dompdf_/lib/php-font-lib/maps
- Tipo: Arquivos de mapas de encoding (font).
- Função: Mapeamentos de códigos para encodings (ISO/CP/KOI8 etc.).


---

### area-login/dompdf_/lib/php-font-lib/maps/adobe-standard-encoding.map
- Tipo: Mapa de encoding (texto).
- Função: Tabela Adobe Standard Encoding (mapeia bytes para Unicode).


---

### area-login/dompdf_/lib/php-font-lib/maps/cp1250.map
- Tipo: Mapa de encoding (texto).
- Função: Mapeamento Windows-1250 para Unicode.


---

### area-login/dompdf_/lib/php-font-lib/maps/cp1251.map
- Tipo: Mapa de encoding (texto).
- Função: Mapeamento Windows-1251 para Unicode.


---

### area-login/dompdf_/lib/php-font-lib/maps/cp1252.map
- Tipo: Mapa de encoding (texto).
- Função: Mapeamento Windows-1252 para Unicode.


---

### area-login/dompdf_/lib/php-font-lib/maps/cp1253.map
- Tipo: Mapa de encoding (texto).
- Função: Mapeamento Windows-1253 para Unicode.


---

### area-login/dompdf_/lib/php-font-lib/maps/cp1254.map
- Tipo: Mapa de encoding (texto).
- Função: Mapeamento Windows-1254 para Unicode.


---

### area-login/dompdf_/lib/php-font-lib/maps/cp1255.map
- Tipo: Mapa de encoding (texto).
- Função: Mapeamento Windows-1255 para Unicode.


---

### area-login/dompdf_/lib/php-font-lib/maps/cp1257.map
- Tipo: Mapa de encoding (texto).
- Função: Mapeamento Windows-1257 para Unicode.


---

### area-login/dompdf_/lib/php-font-lib/maps/cp1258.map
- Tipo: Mapa de encoding (texto).
- Função: Mapeamento Windows-1258 para Unicode.


---

### area-login/dompdf_/lib/php-font-lib/maps/cp874.map
- Tipo: Mapa de encoding (texto).
- Função: Mapeamento Windows-874 (Thai) para Unicode.


---

### area-login/dompdf_/lib/php-font-lib/maps/iso-8859-1.map
- Tipo: Mapa de encoding (texto).
- Função: Mapeamento ISO-8859-1 (Latin-1) para Unicode.


---

### area-login/dompdf_/lib/php-font-lib/maps/iso-8859-11.map
- Tipo: Mapa de encoding (texto).
- Função: Mapeamento ISO-8859-11 (Thai) para Unicode.


---

### area-login/dompdf_/lib/php-font-lib/maps/iso-8859-15.map
- Tipo: Mapa de encoding (texto).
- Função: Mapeamento ISO-8859-15 (Latin-9) para Unicode.


---

### area-login/dompdf_/lib/php-font-lib/maps/iso-8859-16.map
- Tipo: Mapa de encoding (texto).
- Função: Mapeamento ISO-8859-16 (Latin-10) para Unicode.


---

### area-login/dompdf_/lib/php-font-lib/maps/iso-8859-2.map
- Tipo: Mapa de encoding (texto).
- Função: Mapeamento ISO-8859-2 (Latin-2) para Unicode.


---

### area-login/dompdf_/lib/php-font-lib/maps/iso-8859-4.map
- Tipo: Mapa de encoding (texto).
- Função: Mapeamento ISO-8859-4 (Latin-4) para Unicode.


---

### area-login/dompdf_/lib/php-font-lib/maps/iso-8859-5.map
- Tipo: Mapa de encoding (texto).
- Função: Mapeamento ISO-8859-5 (Cyrillic) para Unicode.


---

### area-login/dompdf_/lib/php-font-lib/maps/iso-8859-7.map
- Tipo: Mapa de encoding (texto).
- Função: Mapeamento ISO-8859-7 (Greek) para Unicode.


---

### area-login/dompdf_/lib/php-font-lib/maps/iso-8859-9.map
- Tipo: Mapa de encoding (texto).
- Função: Mapeamento ISO-8859-9 (Latin-5) para Unicode.


---

### area-login/dompdf_/lib/php-font-lib/maps/koi8-r.map
- Tipo: Mapa de encoding (texto).
- Função: Mapeamento KOI8-R (Cyrillic) para Unicode.


---

### area-login/dompdf_/lib/php-font-lib/maps/koi8-u.map
- Tipo: Mapa de encoding (texto).
- Função: Mapeamento KOI8-U (Cyrillic/Ukrainian) para Unicode.


---

### area-login/dompdf_/lib/php-font-lib/phpunit.xml.dist
- Tipo: Configuração de testes (PHPUnit).
- Função: Define suite `tests/FontLib/` e bootstrap Composer.


---

### area-login/dompdf_/lib/php-font-lib/README.md
- Tipo: Documentação (Markdown).
- Função: Descreve recursos do php-font-lib e exemplo de uso.


---

### area-login/dompdf_/lib/php-font-lib/sample-fonts
- Tipo: Pasta de fontes de exemplo (TTF).
- Conteúdo:
  - `IntelClear-Light.ttf`, `NotoSansShavian-Regular.ttf`


---

### area-login/dompdf_/lib/php-font-lib/sample-fonts/IntelClear-Light.ttf
- Tipo: Fonte TTF (binário).
- Metadados: 96.664 bytes; última modificação 30/01/2026 00:15:44.


---

### area-login/dompdf_/lib/php-font-lib/sample-fonts/NotoSansShavian-Regular.ttf
- Tipo: Fonte TTF (binário).
- Metadados: 6.020 bytes; última modificação 30/01/2026 00:15:44.


---

### area-login/dompdf_/lib/php-font-lib/src
- Tipo: Código-fonte da biblioteca.
- Conteúdo:
  - `FontLib/`


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib
- Tipo: Namespace principal da biblioteca.
- Conteúdo (top-level):
  - `AdobeFontMetrics.php`, `Autoloader.php`, `BinaryStream.php`, `EncodingMap.php`, `Font.php`, `Header.php`
  - Pastas: `EOT/`, `Exception/`, `Glyph/`, `OpenType/`, `Table/`, `TrueType/`, `WOFF/`


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/AdobeFontMetrics.php
- Tipo: Classe PHP.
- Função: Gera arquivos AFM (Adobe Font Metrics) a partir de fontes.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Autoloader.php
- Tipo: Classe PHP.
- Função: Autoloader do namespace `FontLib`.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/BinaryStream.php
- Tipo: Classe PHP.
- Função: Leitura/escrita binária de arquivos de fonte.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/EncodingMap.php
- Tipo: Classe PHP.
- Função: Carrega e interpreta mapas de encoding (arquivos `.map`).


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Font.php
- Tipo: Classe PHP.
- Função: Carrega fontes (TTF/OTF/WOFF/EOT) e retorna parser adequado.
- Observações:
  - Usa `FontNotFoundException` e conversões UTF-16/UTF-8.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Header.php
- Tipo: Classe abstrata PHP.
- Função: Base para headers de fontes; parse/encode via pack/unpack.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/EOT
- Tipo: Módulo EOT.
- Conteúdo:
  - `File.php`, `Header.php`


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/EOT/File.php
- Tipo: Classe PHP (EOT File).
- Função: Parser de fonte EOT; lê header e metadados.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/EOT/Header.php
- Tipo: Classe PHP (EOT Header).
- Função: Parseia cabeçalho de fonte EOT e strings UTF-16.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Exception
- Tipo: Exceções da biblioteca.
- Conteúdo:
  - `FontNotFoundException.php`


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Exception/FontNotFoundException.php
- Tipo: Exceção PHP.
- Função: Erro quando arquivo de fonte não é encontrado.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Glyph
- Tipo: Módulo de glifos.
- Conteúdo:
  - `Outline.php`, `OutlineComponent.php`, `OutlineComposite.php`, `OutlineSimple.php`


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Glyph/Outline.php
- Tipo: Classe PHP.
- Função: Leitura de tabela `glyf` (contornos) e seleção de tipo simples/composto.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Glyph/OutlineComponent.php
- Tipo: Classe PHP.
- Função: Representa componente de glifo composto (matriz/flags).


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Glyph/OutlineComposite.php
- Tipo: Classe PHP.
- Função: Parseia glifos compostos e componentes.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Glyph/OutlineSimple.php
- Tipo: Classe PHP.
- Função: Parseia glifos simples (`glyf`), pontos e contornos.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/OpenType
- Tipo: Módulo OpenType.
- Conteúdo:
  - `File.php`, `TableDirectoryEntry.php`


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/OpenType/File.php
- Tipo: Classe PHP (OpenType File).
- Função: Define OpenType como extensão de TrueType.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/OpenType/TableDirectoryEntry.php
- Tipo: Classe PHP (OpenType TableDirectoryEntry).
- Função: Mapeia entrada de diretório de tabelas (OpenType) como TrueType.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Table
- Tipo: Módulo de tabelas de fonte.
- Conteúdo:
  - `DirectoryEntry.php`, `Table.php`, `Type/`


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Table/DirectoryEntry.php
- Tipo: Classe PHP.
- Função: Entrada genérica de diretório de tabelas; calcula checksum e offsets.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Table/Table.php
- Tipo: Classe PHP.
- Função: Base para tabelas de fonte; parse/encode com `DirectoryEntry`.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Table/Type
- Tipo: Implementações de tabelas TrueType/OpenType.
- Conteúdo (top-level):
  - `cmap.php`, `glyf.php`, `head.php`, `hhea.php`, `hmtx.php`, `kern.php`, `loca.php`, `maxp.php`, `name.php`, `nameRecord.php`, `os2.php`, `post.php`


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Table/Type/cmap.php
- Tipo: Classe PHP (tabela `cmap`).
- Função: Parseia mapas de caracteres e reconstrói subset (format 4/12).
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Table/Type/glyf.php
- Tipo: Classe PHP (tabela `glyf`).
- Função: Parseia glifos e gera subset; exporta HTML de preview.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Table/Type/head.php
- Tipo: Classe PHP (tabela `head`).
- Função: Parseia cabeçalho da fonte e valida magic number.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Table/Type/hhea.php
- Tipo: Classe PHP (tabela `hhea`).
- Função: Parseia métricas horizontais e ajusta `numOfLongHorMetrics`.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Table/Type/hmtx.php
- Tipo: Classe PHP (tabela `hmtx`).
- Função: Parseia métricas horizontais e cria subset por glyph.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Table/Type/kern.php
- Tipo: Classe PHP (tabela `kern`).
- Função: Parseia pares de kerning (formato 0).
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Table/Type/loca.php
- Tipo: Classe PHP (tabela `loca`).
- Função: Parseia offsets de glifos (2 ou 4 bytes).
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Table/Type/maxp.php
- Tipo: Classe PHP (tabela `maxp`).
- Função: Parseia máxima de pontos/contornos e ajusta `numGlyphs`.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Table/Type/name.php
- Tipo: Classe PHP (tabela `name`).
- Função: Parseia metadados de nomes da fonte e converte UTF-16.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Table/Type/nameRecord.php
- Tipo: Classe PHP (registro `name`).
- Função: Representa registros de nome e conversão UTF-8/UTF-16.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Table/Type/os2.php
- Tipo: Classe PHP (tabela `OS/2`).
- Função: Define campos de métricas e metadados tipográficos.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/Table/Type/post.php
- Tipo: Classe PHP (tabela `post`).
- Função: Parseia nomes de glifos (formatos 1/2/3/4).
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/TrueType
- Tipo: Módulo TrueType.
- Conteúdo:
  - `Collection.php`, `File.php`, `Header.php`, `TableDirectoryEntry.php`


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/TrueType/Collection.php
- Tipo: Classe PHP.
- Função: Parser de coleções TrueType (TTC) com Iterator/Countable.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/TrueType/File.php
- Tipo: Classe PHP (TrueType File).
- Função: Parser principal de TrueType; carrega tabelas, subsets e mapas.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/TrueType/Header.php
- Tipo: Classe PHP (TrueType Header).
- Função: Cabeçalho TrueType; parseia e adiciona `formatText`.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/TrueType/TableDirectoryEntry.php
- Tipo: Classe PHP (TrueType TableDirectoryEntry).
- Função: Lê checksum/offset/length da tabela TrueType.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/WOFF
- Tipo: Módulo WOFF.
- Conteúdo:
  - `File.php`, `Header.php`, `TableDirectoryEntry.php`


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/WOFF/File.php
- Tipo: Classe PHP (WOFF File).
- Função: Carrega WOFF, descompacta e reescreve tabelas em formato TTF.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/WOFF/Header.php
- Tipo: Classe PHP (WOFF Header).
- Função: Define layout do header WOFF (campos e offsets).
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/src/FontLib/WOFF/TableDirectoryEntry.php
- Tipo: Classe PHP (WOFF TableDirectoryEntry).
- Função: Lê offsets/tamanhos e checksum de tabelas WOFF.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-font-lib/tests
- Tipo: Pasta de testes.
- Conteúdo:
  - `FontLib/`


---

### area-login/dompdf_/lib/php-font-lib/tests/FontLib
- Tipo: Testes da biblioteca FontLib.
- Conteúdo:
  - `FontTest.php`


---

### area-login/dompdf_/lib/php-font-lib/tests/FontLib/FontTest.php
- Tipo: Teste PHPUnit.
- Função: Testa carregamento de fontes e parsing de cmap (format 4/12).


---

### area-login/dompdf_/lib/php-svg-lib
- Tipo: Biblioteca de terceiros (SVG) – versão legada.
- Conteúdo (top-level):
  - `.travis.yml`, `composer.json`, `COPYING`, `COPYING.GPL`, `phpunit.xml`, `README.md`
  - `src/`, `tests/`


---

### area-login/dompdf_/lib/php-svg-lib/.travis.yml
- Tipo: Configuração CI (Travis CI).
- Função: Matriz PHP 5.6–7.2 e execução de phpunit.


---

### area-login/dompdf_/lib/php-svg-lib/composer.json
- Tipo: Manifesto Composer.
- Função: Metadados e autoload `Svg\\` (PSR-0); depende de `sabberworm/php-css-parser`.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-svg-lib/COPYING
- Tipo: Licença (LGPL v3).
- Função: Termos de uso da biblioteca.


---

### area-login/dompdf_/lib/php-svg-lib/COPYING.GPL
- Tipo: Licença (GPL v3).
- Função: Termos da GNU GPL v3 (referência).


---

### area-login/dompdf_/lib/php-svg-lib/phpunit.xml
- Tipo: Configuração de testes (PHPUnit).
- Função: Define suite `tests/Svg/` e bootstrap `src/autoload.php`.


---

### area-login/dompdf_/lib/php-svg-lib/README.md
- Tipo: Documentação (Markdown).
- Função: Descreve propósito (rasterizar SVG) e relação com Dompdf.


---

### area-login/dompdf_/lib/php-svg-lib/src
- Tipo: Código-fonte da biblioteca.
- Conteúdo:
  - `autoload.php`, `Svg/`


---

### area-login/dompdf_/lib/php-svg-lib/src/autoload.php
- Tipo: Autoloader PHP.
- Função: Registra autoload de classes `Svg\\*` por caminho.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg
- Tipo: Namespace principal da lib SVG.
- Conteúdo (top-level):
  - `DefaultStyle.php`, `Document.php`, `Style.php`
  - Pastas: `Gradient/`, `Surface/`, `Tag/`


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/DefaultStyle.php
- Tipo: Classe PHP.
- Função: Define estilo SVG padrão (fill/stroke/opacidade).


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Document.php
- Tipo: Classe PHP.
- Função: Parser e modelo do documento SVG; carrega elementos/estilos e dimensões.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Style.php
- Tipo: Classe PHP.
- Função: Resolve estilos SVG (atributos, inline `style`, stylesheets).
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Gradient
- Tipo: Módulo de gradientes.
- Conteúdo:
  - `Stop.php`


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Gradient/Stop.php
- Tipo: Classe PHP.
- Função: Representa stop de gradiente (offset/cor/opacidade).


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Surface
- Tipo: Renderizadores de superfície SVG.
- Conteúdo (top-level):
  - `CPdf.php`, `SurfaceCpdf.php`, `SurfaceGmagick.php`, `SurfaceInterface.php`, `SurfacePDFLib.php`


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Surface/CPdf.php
- Tipo: Biblioteca PHP (gerador de PDF).
- Função: Implementa criação de PDF (classes/objetos) usada pelo renderer.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Surface/SurfaceCpdf.php
- Tipo: Classe PHP (Surface).
- Função: Renderiza SVG usando backend CPdf (PDF).
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Surface/SurfaceGmagick.php
- Tipo: Classe PHP (Surface).
- Função: Renderiza SVG via Gmagick.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Surface/SurfaceInterface.php
- Tipo: Interface PHP.
- Função: Contrato de renderização de superfície SVG (canvas).


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Surface/SurfacePDFLib.php
- Tipo: Classe PHP (Surface).
- Função: Renderiza SVG via PDFlib.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Tag
- Tipo: Tags SVG (elementos).
- Conteúdo (top-level):
  - `AbstractTag.php`, `Anchor.php`, `Circle.php`, `ClipPath.php`, `Ellipse.php`, `Group.php`, `Image.php`, `Line.php`, `LinearGradient.php`, `Path.php`, `Polygon.php`, `Polyline.php`, `RadialGradient.php`, `Rect.php`, `Shape.php`, `Stop.php`, `StyleTag.php`, `Text.php`, `UseTag.php`


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Tag/AbstractTag.php
- Tipo: Classe PHP abstrata.
- Função: Base para tags SVG; controla ciclo `handle/start/end`, estilo, atributos e transformações.
- Estrutura:
  - Propriedades: `$document`, `$tagName`, `$style`, `$attributes`, `$hasShape`, `$children`.
  - `getParentGroup()` percorre a pilha do documento e retorna `Group` ou `Document`.
  - `makeStyle()` cria `Style` e aplica herança, stylesheets e atributos.
  - `applyTransform()` interpreta `transform` (matrix/translate/scale/rotate/skewX/skewY) e aplica na `Surface`.
- Dependências:
  - `Svg\Document`, `Svg\Style`, `Svg\Tag\Group`.
- Pontos de atenção:
  - Suporte a `transform` depende da implementação da Surface ativa.


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Tag/Anchor.php
- Tipo: Classe PHP.
- Função: Tag SVG `<a>`; herda comportamento de `Group`.
- Dependências:
  - `Svg\Tag\Group`.


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Tag/Circle.php
- Tipo: Classe PHP.
- Função: Tag SVG `<circle>`; desenha círculo na Surface.
- Estrutura:
  - Atributos lidos: `cx`, `cy`, `r` (com defaults `0,0` para centro).
  - `start()` chama `Surface::circle(cx, cy, r)`.
- Dependências:
  - `Svg\Tag\Shape`, `Document->getSurface()`.


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Tag/ClipPath.php
- Tipo: Classe PHP.
- Função: Tag SVG `<clipPath>`; prepara área de recorte com estilo e transformações.
- Estrutura:
  - `before()`: `Surface::save()`, cria estilo (`makeStyle`), aplica `setStyle`, `Surface::setStyle()`, `applyTransform()`.
  - `after()`: `Surface::restore()`.
- Dependências:
  - `Svg\Style`, `Svg\Tag\AbstractTag`, `Document->getSurface()`.


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Tag/Ellipse.php
- Tipo: Classe PHP.
- Função: Tag SVG `<ellipse>`; desenha elipse na Surface.
- Estrutura:
  - Atributos lidos: `cx`, `cy`, `rx`, `ry` (com defaults `0`).
  - `start()` chama `Surface::ellipse(cx, cy, rx, ry, 0, 0, 360, false)`.
- Dependências:
  - `Svg\Tag\Shape`, `Document->getSurface()`.


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Tag/Group.php
- Tipo: Classe PHP.
- Função: Tag SVG `<g>`; agrupa elementos com estilo/transformação.
- Estrutura:
  - `before()`: `Surface::save()`, cria estilo (`makeStyle`), aplica `setStyle`, `Surface::setStyle()`, `applyTransform()`.
  - `after()`: `Surface::restore()`.
- Dependências:
  - `Svg\Style`, `Svg\Tag\AbstractTag`, `Document->getSurface()`.


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Tag/Image.php
- Tipo: Classe PHP.
- Função: Tag SVG `<image>`; desenha imagem raster na Surface.
- Estrutura:
  - Atributos lidos: `x`, `y`, `width`, `height`, `xlink:href`.
  - Inverte eixo Y: aplica `Surface::transform(1,0,0,-1,0,$height)` para coordenadas.
  - `start()` chama `Surface::drawImage(href, x, y, width, height)`.
  - `before()` salva estado e aplica transformações; `after()` restaura.
- Dependências:
  - `Svg\Tag\AbstractTag`, `Document->getSurface()`.


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Tag/Line.php
- Tipo: Classe PHP.
- Função: Tag SVG `<line>`; desenha linha entre dois pontos.
- Estrutura:
  - Atributos lidos: `x1`, `y1`, `x2`, `y2` (default 0).
  - `start()` usa `Surface::moveTo()` e `lineTo()`.
- Dependências:
  - `Svg\Tag\Shape`, `Document->getSurface()`.


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Tag/LinearGradient.php
- Tipo: Classe PHP.
- Função: Tag SVG `<linearGradient>`; coleta stops e parâmetros do gradiente.
- Estrutura:
  - Atributos lidos: `x1`, `y1`, `x2`, `y2`.
  - `getStops()` varre `children` com tag `stop`, parseia `style` e atributos (`stop-color`, `stop-opacity`, `offset`).
  - Normaliza opacidade entre 0 e 1.
- Dependências:
  - `Svg\Gradient\Stop`, `Svg\Style`, `Svg\Tag\AbstractTag`.


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Tag/Path.php
- Tipo: Classe PHP.
- Função: Tag SVG `<path>`; interpreta `d` e desenha caminhos complexos.
- Estrutura:
  - `start()` parseia comandos do `d` (M/L/H/V/C/S/Q/T/A/Z, maiúsculo/minúsculo) e monta sequência.
  - Implementa conversões para chamadas da Surface: `moveTo`, `lineTo`, `bezierCurveTo`, `quadraticCurveTo`, `closePath`.
  - Suporte a arcos (`A/a`) via `drawArc()`, `arcToSegments()`, `segmentToBezier()`, `calcVectorAngle()`.
  - Lógica baseada em implementação do fabric.js (comentado no código).
- Dependências:
  - `Svg\Tag\Shape`, `Svg\Surface\SurfaceInterface`, `Document->getSurface()`.
- Pontos de atenção:
  - Parsing de `d` é sensível a formatos; não há validação robusta.
  - Há TODO de otimização para arcos.


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Tag/Polygon.php
- Tipo: Classe PHP.
- Função: Tag SVG `<polygon>`; desenha polígono fechado.
- Estrutura:
  - Parseia `points` via regex numérica simples.
  - `moveTo` no primeiro par e `lineTo` nos seguintes.
  - Fecha o path com `closePath()`.
- Dependências:
  - `Svg\Tag\Shape`, `Document->getSurface()`.


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Tag/Polyline.php
- Tipo: Classe PHP.
- Função: Tag SVG `<polyline>`; desenha linha poligonal aberta.
- Estrutura:
  - Parseia `points` via regex numérica simples.
  - `moveTo` no primeiro par e `lineTo` nos seguintes.
- Dependências:
  - `Svg\Tag\Shape`, `Document->getSurface()`.


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Tag/RadialGradient.php
- Tipo: Classe PHP.
- Função: Tag SVG `<radialGradient>` (placeholder).
- Observações:
  - `start()` está vazio; implementação ausente.


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Tag/Rect.php
- Tipo: Classe PHP.
- Função: Tag SVG `<rect>`; desenha retângulo (com cantos arredondados).
- Estrutura:
  - Atributos lidos: `x`, `y`, `width`, `height`, `rx`, `ry` (defaults 0).
  - `start()` chama `Surface::rect(x, y, width, height, rx, ry)`.
- Dependências:
  - `Svg\Tag\Shape`, `Document->getSurface()`.


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Tag/Shape.php
- Tipo: Classe PHP.
- Função: Classe base para shapes; aplica estilo, transformações e finaliza renderização.
- Estrutura:
  - `before()`: `Surface::save()`, cria estilo (`makeStyle`), aplica `setStyle`, `Surface::setStyle()`, `applyTransform()`.
  - `after()`: decide `fill/stroke/endPath` conforme `Style` atual e então `restore()`.
  - Comentários indicam suporte futuro a gradientes (Linear/Radial) via defs.
- Dependências:
  - `Svg\Style`, `Svg\Tag\AbstractTag`, `Document->getSurface()`.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Tag/Stop.php
- Tipo: Classe PHP.
- Função: Tag SVG `<stop>` (placeholder).
- Observações:
  - `start()` está vazio; stop é processado pelo `LinearGradient::getStops()`.


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Tag/StyleTag.php
- Tipo: Classe PHP.
- Função: Tag SVG `<style>`; parseia CSS e registra stylesheet no documento.
- Estrutura:
  - `appendText()` acumula conteúdo textual do `<style>`.
  - `end()` usa `Sabberworm\CSS\Parser` e chama `Document::appendStyleSheet()`.
- Dependências:
  - `sabberworm/php-css-parser` (`Sabberworm\CSS`).


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Tag/Text.php
- Tipo: Classe PHP.
- Função: Tag SVG `<text>`; renderiza texto com ancoragem e fonte.
- Estrutura:
  - Atributos lidos: `x`, `y`; inverte eixo Y com `Surface::transform(1,0,0,-1,0,$height)`.
  - `appendText()` acumula conteúdo; `getText()` retorna texto trimado.
  - `end()` aplica fonte (`fontFamily`, `fontStyle`, `fontWeight`), calcula alinhamento (`textAnchor`) e chama `fillText`.
  - `after()` restaura a Surface.
- Dependências:
  - `Svg\Tag\Shape`, `Document->getSurface()`.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager”.


---

### area-login/dompdf_/lib/php-svg-lib/src/Svg/Tag/UseTag.php
- Tipo: Classe PHP.
- Função: Tag SVG `<use>`; instancia um elemento referenciado por `xlink:href`.
- Estrutura:
  - `before()` lê `x/y/width/height`, resolve `reference` via `Document::getDef()`, salva/transforma Surface com `translate`.
  - `handle()` mescla atributos do referenciado e processa `reference` e filhos.
  - `handleEnd()` finaliza `reference` e filhos.
  - `after()` restaura a Surface.
- Dependências:
  - `Svg\Tag\AbstractTag`, `Document::getDef()`, `Document->getSurface()`.
- Observações:
  - Encoding quebrado no autor “Fabien Ménager” (aparece como “Mï¿½nager”).


---

### area-login/dompdf_/lib/php-svg-lib/tests/Svg/StyleTest.php
- Tipo: Teste PHPUnit.
- Função: Valida `Svg\Style` (parse de cores, atributos e tamanhos).
- Estrutura:
  - `test_parseColor()`: cobre nomes (RED/blue/black/white), `#hex`, `rgb()`, `none` e inválidos.
  - `test_fromAttributes()`: mapeia `color/fill/stroke` para arrays e `none`.
  - `test_convertSize()`: cobre `px`, `pt` e `%` (com comentário FIXME em `px`).
- Dependências:
  - `Svg\Style`, `PHPUnit\Framework\TestCase`.


---

### area-login/PHPMailer
- Tipo: Biblioteca PHPMailer (vendor).
- Conteúdo (top-level):
  - Pastas: `language/`, `src/`
  - Arquivos: `COMMITMENT`, `composer.json`, `get_oauth_token.php`, `LICENSE`, `README.md`, `SECURITY.md`, `SMTPUTF8.md`, `VERSION`


---

### area-login/PHPMailer/COMMITMENT
- Tipo: Documento legal.
- Função: “GPL Cooperation Commitment” (compromisso de cooperação GPL) com cláusulas de cura e reintegração de licença.
- Observações:
  - Declara licenças cobertas (GPLv2, LGPLv2.1, LGPLv2) e ações defensivas.
  - Licenciado sob Creative Commons BY-SA 4.0.


---

### area-login/PHPMailer/LICENSE
- Tipo: Licença (LGPL).
- Função: Termos da GNU Lesser General Public License v2.1.
- Observações:
  - Texto completo da LGPL 2.1 (1999).


---

### area-login/PHPMailer/README.md
- Tipo: Documentação.
- Função: Apresentação e guia de uso do PHPMailer (recursos, instalação, exemplos, testes, segurança, histórico).
- Conteúdo:
  - Lista de features e recomendações de uso via Composer.
  - Exemplo completo de envio SMTP com PHPMailer.
  - Instruções sobre idiomas, docs, testes e contribuição.
- Observações:
  - Encoding quebrado em vários trechos (ex.: “PHPMailer â€“”, emojis com caracteres corrompidos).


---

### area-login/PHPMailer/SECURITY.md
- Tipo: Documento de segurança.
- Função: Lista de vulnerabilidades conhecidas e mitigadas (CVE) do PHPMailer.
- Conteúdo:
  - CVEs relevantes: 2021-3603, 2021-34551, 2020-36326, 2020-13625, 2018-19296, 2017-11503, 2017-5223, 2016-10045, 2016-10033, 2015-8476, 2008-5619, 2012-0796, 2011-3747, 2010-4914, 2007-2021, 2006-5734, 2005-1807, 2007-3215.
  - Observações de mitigação e versões afetadas.


---

### area-login/PHPMailer/SMTPUTF8.md
- Tipo: Documento técnico.
- Função: Explica histórico do UTF-8 em e-mails e suporte a `SMTPUTF8`.
- Conteúdo:
  - Contexto histórico (RFC 1652/6152/2047/3492/6531).
  - Detalhes de compatibilidade e comportamento do PHPMailer.
- Observações:
  - Encoding quebrado em alguns trechos (ex.: “â€””, “ðŸ˜…”).


---

### area-login/PHPMailer/VERSION
- Tipo: Arquivo de versão.
- Função: Indica versão do PHPMailer usada neste pacote.
- Valor: `7.0.1`.


---

### area-login/PHPMailer/composer.json
- Tipo: Manifesto Composer.
- Função: Define pacote PHPMailer, dependências e autoload.
- Conteúdo:
  - Requer PHP `>=5.5.0` e extensões `ctype`, `filter`, `hash`.
  - Autoload PSR-4: `PHPMailer\\PHPMailer\\` → `src/`.
  - Scripts de lint/teste via `phpcs`, `phpcbf`, `phpunit`.
- Observações:
  - `minimum-stability: dev` com `prefer-stable: true`.


---

### area-login/PHPMailer/get_oauth_token.php
- Tipo: Script PHP (exemplo utilitário).
- Função: Fluxo OAuth2 para obter refresh token (Google/Yahoo/Microsoft/Azure).
- Estrutura:
  - Formulário HTML para provider/credenciais.
  - Usa `league/oauth2-client` e providers específicos (Google, Yahoo, Microsoft, Azure).
  - Usa sessão para armazenar estado e faz redirect para autorização.
  - Exibe refresh token ao final.
- Dependências:
  - `vendor/autoload.php`, `league/oauth2-client`, providers OAuth2.
- Pontos de atenção:
  - Exemplo expõe fluxo sensível; não deve ficar acessível publicamente sem proteção.


---

### area-login/PHPMailer/language
- Tipo: Pacote de traduções.
- Função: Arquivos de idioma para mensagens de erro do PHPMailer.
- Conteúdo (top-level):
  - `phpmailer.lang-*.php` (múltiplos idiomas, inclusive `pt_br`).


---

### area-login/PHPMailer/language/phpmailer.lang-af.php
- Tipo: Tradução PHPMailer (Afrikaans).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em alguns acentos (ex.: “LÃªer”).


---

### area-login/PHPMailer/language/phpmailer.lang-ar.php
- Tipo: Tradução PHPMailer (Árabe).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Texto aparece como mojibake (provável problema de encoding).


---

### area-login/PHPMailer/language/phpmailer.lang-as.php
- Tipo: Tradução PHPMailer (Assamese).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Texto aparece como mojibake (provável problema de encoding).


---

### area-login/PHPMailer/language/phpmailer.lang-az.php
- Tipo: Tradução PHPMailer (Azeri).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em vários caracteres (ex.: “xÉ™tasÄ±”, “gÃ¶ndÉ™”).


---

### area-login/PHPMailer/language/phpmailer.lang-ba.php
- Tipo: Tradução PHPMailer (Bósnio).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “GreÅ¡ka”, “moguÄ‡e”).


---

### area-login/PHPMailer/language/phpmailer.lang-be.php
- Tipo: Tradução PHPMailer (Bielorrusso).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Texto aparece como mojibake (provável problema de encoding).


---

### area-login/PHPMailer/language/phpmailer.lang-bg.php
- Tipo: Tradução PHPMailer (Búlgaro).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Texto aparece como mojibake (provável problema de encoding).


---

### area-login/PHPMailer/language/phpmailer.lang-bn.php
- Tipo: Tradução PHPMailer (Bengali).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Texto aparece como mojibake (provável problema de encoding).


---

### area-login/PHPMailer/language/phpmailer.lang-ca.php
- Tipo: Tradução PHPMailer (Catalão).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “sâ€™ha”, “estÃ ”).


---

### area-login/PHPMailer/language/phpmailer.lang-cs.php
- Tipo: Tradução PHPMailer (Tcheco).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “navÃ¡zat”, “pÅ™ijata”).


---

### area-login/PHPMailer/language/phpmailer.lang-da.php
- Tipo: Tradução PHPMailer (Dinamarquês).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “berÃ¸rt”, “Ã¥bne”).


---

### area-login/PHPMailer/language/phpmailer.lang-de.php
- Tipo: Tradução PHPMailer (Alemão).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “ausfÃ¼hren”, “Ã¶ffnen”).


---

### area-login/PHPMailer/language/phpmailer.lang-el.php
- Tipo: Tradução PHPMailer (Grego).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Texto aparece como mojibake (provável problema de encoding).


---

### area-login/PHPMailer/language/phpmailer.lang-eo.php
- Tipo: Tradução PHPMailer (Esperanto).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “aÅ­tentigi”, “konektiÄo”).


---

### area-login/PHPMailer/language/phpmailer.lang-es.php
- Tipo: Tradução PHPMailer (Espanhol).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “versiÃ³n”, “vacÃ­o”).


---

### area-login/PHPMailer/language/phpmailer.lang-et.php
- Tipo: Tradução PHPMailer (Estoniano).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “Ãµnnestunud”, “mÃ¤Ã¤rama”).


---

### area-login/PHPMailer/language/phpmailer.lang-fa.php
- Tipo: Tradução PHPMailer (Persa/Farsi).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Texto aparece como mojibake (provável problema de encoding).


---

### area-login/PHPMailer/language/phpmailer.lang-fi.php
- Tipo: Tradução PHPMailer (Finlandês).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “kÃ¤yttÃ¤jÃ¤”, “epÃ¤onnistui”).
  - Algumas mensagens estão comentadas.


---

### area-login/PHPMailer/language/phpmailer.lang-fo.php
- Tipo: Tradução PHPMailer (Faroês).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “DÃ¡vur SÃ¸rensen”, “gÃ³Ã°kent”).
  - Algumas mensagens estão comentadas.


---

### area-login/PHPMailer/language/phpmailer.lang-fr.php
- Tipo: Tradução PHPMailer (Francês).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “Erreur SMTPâ€¯”, “dâ€™accÃ©der”).


---

### area-login/PHPMailer/language/phpmailer.lang-gl.php
- Tipo: Tradução PHPMailer (Galego).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “vacÃ­a”, “direcciÃ³n”).


---

### area-login/PHPMailer/language/phpmailer.lang-he.php
- Tipo: Tradução PHPMailer (Hebraico).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Texto aparece como mojibake (provável problema de encoding).


---

### area-login/PHPMailer/language/phpmailer.lang-hi.php
- Tipo: Tradução PHPMailer (Hindi).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Texto aparece como mojibake (provável problema de encoding).


---

### area-login/PHPMailer/language/phpmailer.lang-hr.php
- Tipo: Tradução PHPMailer (Croata).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “GreÅ¡ka”, “posluÅ¾itelj”).


---

### area-login/PHPMailer/language/phpmailer.lang-hu.php
- Tipo: Tradução PHPMailer (Húngaro).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “azonosÃ­tÃ¡s”, “Ã¼zenettÃ¶rzs”).


---

### area-login/PHPMailer/language/phpmailer.lang-hy.php
- Tipo: Tradução PHPMailer (Armênio).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Texto aparece como mojibake (provável problema de encoding).


---

### area-login/PHPMailer/language/phpmailer.lang-id.php
- Tipo: Tradução PHPMailer (Indonésio).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Sem sinais óbvios de encoding quebrado.


---

### area-login/PHPMailer/language/phpmailer.lang-it.php
- Tipo: Tradução PHPMailer (Italiano).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “Ã¨”, “Ã ”).


---

### area-login/PHPMailer/language/phpmailer.lang-ja.php
- Tipo: Tradução PHPMailer (Japonês).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Texto aparece como mojibake (provável problema de encoding).


---

### area-login/PHPMailer/language/phpmailer.lang-ka.php
- Tipo: Tradução PHPMailer (Georgiano).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Texto aparece como mojibake (provável problema de encoding).


---

### area-login/PHPMailer/language/phpmailer.lang-ko.php
- Tipo: Tradução PHPMailer (Coreano).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Texto aparece como mojibake (provável problema de encoding).


---

### area-login/PHPMailer/language/phpmailer.lang-ku.php
- Tipo: Tradução PHPMailer (Curdo Sorani).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Texto aparece como mojibake (provável problema de encoding).


---

### area-login/PHPMailer/language/phpmailer.lang-lt.php
- Tipo: Tradução PHPMailer (Lituano).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “LaiÅ¡ko”, “koduotÄ—”).


---

### area-login/PHPMailer/language/phpmailer.lang-lv.php
- Tipo: Tradução PHPMailer (Letão).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “kÄ¼Å«da”, “NeatpazÄ«ts”).


---

### area-login/PHPMailer/language/phpmailer.lang-mg.php
- Tipo: Tradução PHPMailer (Malgaxe).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Sem sinais óbvios de encoding quebrado.


---

### area-login/PHPMailer/language/phpmailer.lang-mn.php
- Tipo: Tradução PHPMailer (Mongol).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Texto aparece como mojibake (provável problema de encoding).


---

### area-login/PHPMailer/language/phpmailer.lang-ms.php
- Tipo: Tradução PHPMailer (Malaio).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Sem sinais óbvios de encoding quebrado.


---

### area-login/PHPMailer/language/phpmailer.lang-nb.php
- Tipo: Tradução PHPMailer (Norueguês Bokmål).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “BokmÃ¥l”, “Ã¸delagte”).


---

### area-login/PHPMailer/language/phpmailer.lang-nl.php
- Tipo: Tradução PHPMailer (Holandês).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “Ã©Ã©n”).


---

### area-login/PHPMailer/language/phpmailer.lang-pl.php
- Tipo: Tradução PHPMailer (Polonês).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “BÅ‚Ä…d”, “Å›ci”).


---

### area-login/PHPMailer/language/phpmailer.lang-pt.php
- Tipo: Tradução PHPMailer (Português PT).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “JoÃ£o”, “autenticaÃ§Ã£o”).


---

### area-login/PHPMailer/language/phpmailer.lang-pt_br.php
- Tipo: Tradução PHPMailer (Português BR).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “NÃ£o”, “funÃ§Ã£o”).


---

### area-login/PHPMailer/language/phpmailer.lang-ro.php
- Tipo: Tradução PHPMailer (Romeno).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “eÈ™uat”, “î”).


---

### area-login/PHPMailer/language/phpmailer.lang-ru.php
- Tipo: Tradução PHPMailer (Russo).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Texto aparece como mojibake (provável problema de encoding).


---

### area-login/PHPMailer/language/phpmailer.lang-si.php
- Tipo: Tradução PHPMailer (Cingalês).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Texto aparece como mojibake (provável problema de encoding).


---

### area-login/PHPMailer/language/phpmailer.lang-sk.php
- Tipo: Tradução PHPMailer (Eslovaco).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “autentifikÃ¡cie”, “NedÃ¡”).


---

### area-login/PHPMailer/language/phpmailer.lang-sl.php
- Tipo: Tradução PHPMailer (Esloveno).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “TuÅ¡ar”, “ÄŒe”).


---

### area-login/PHPMailer/language/phpmailer.lang-sr.php
- Tipo: Tradução PHPMailer (Sérvio).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Texto aparece como mojibake (provável problema de encoding).


---

### area-login/PHPMailer/language/phpmailer.lang-sr_latn.php
- Tipo: Tradução PHPMailer (Sérvio Latin).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “greÅ¡ka”, “Nije moguÄ‡e”).


---

### area-login/PHPMailer/language/phpmailer.lang-sv.php
- Tipo: Tradução PHPMailer (Sueco).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “LinnÃ©r”, “Ã¶ppna”).


---

### area-login/PHPMailer/language/phpmailer.lang-tl.php
- Tipo: Tradução PHPMailer (Tagalog).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Sem sinais óbvios de encoding quebrado.


---

### area-login/PHPMailer/language/phpmailer.lang-tr.php
- Tipo: Tradução PHPMailer (Turco).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “ElÃ§in”, “baÅŸarÄ±sÄ±z”).


---

### area-login/PHPMailer/language/phpmailer.lang-uk.php
- Tipo: Tradução PHPMailer (Ucraniano).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Texto aparece como mojibake (provável problema de encoding).


---

### area-login/PHPMailer/language/phpmailer.lang-ur.php
- Tipo: Tradução PHPMailer (Urdu).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Texto aparece como mojibake (provável problema de encoding).


---

### area-login/PHPMailer/language/phpmailer.lang-vi.php
- Tipo: Tradução PHPMailer (Vietnamita).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Encoding quebrado em caracteres especiais (ex.: “Lá»—i”, “má»Ÿ”).


---

### area-login/PHPMailer/language/phpmailer.lang-zh.php
- Tipo: Tradução PHPMailer (Chinês Tradicional).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Texto aparece como mojibake (provável problema de encoding).


---

### area-login/PHPMailer/language/phpmailer.lang-zh_cn.php
- Tipo: Tradução PHPMailer (Chinês Simplificado).
- Função: Mensagens de erro/localização (`$PHPMAILER_LANG`).
- Observações:
  - Texto aparece como mojibake (provável problema de encoding).


---

### area-login/PHPMailer/src
- Tipo: Código-fonte principal do PHPMailer.
- Conteúdo (top-level):
  - `DSNConfigurator.php`, `Exception.php`, `OAuth.php`, `OAuthTokenProvider.php`, `PHPMailer.php`, `POP3.php`, `SMTP.php`


---

### area-login/PHPMailer/src/DSNConfigurator.php
- Tipo: Classe PHP.
- Função: Configura instância do PHPMailer via string DSN (mail/sendmail/qmail/smtp/smtps).
- Estrutura:
  - `mailer($dsn)` cria PHPMailer e aplica `configure()`.
  - `parseDSN()` valida DSN e parseia query string.
  - `applyConfig()` seleciona transport e aplica opções.
  - `configureSMTP()` ajusta host, port, auth, user/pass.
  - `configureOptions()` aplica propriedades permitidas com casting (bool/int).
- Dependências:
  - `PHPMailer\PHPMailer\PHPMailer`, `PHPMailer\PHPMailer\SMTP`, `PHPMailer\PHPMailer\Exception`.


---

### area-login/PHPMailer/src/Exception.php
- Tipo: Classe PHP.
- Função: Exceção customizada do PHPMailer com saída HTML “prettified”.
- Estrutura:
  - `errorMessage()` retorna mensagem com `htmlspecialchars` e `<strong>`.


---

### area-login/PHPMailer/src/OAuth.php
- Tipo: Classe PHP.
- Função: Wrapper OAuth2 para autenticação SMTP usando `league/oauth2-client`.
- Estrutura:
  - Armazena provider, user, clientId/secret e refresh token.
  - `getToken()` obtém `AccessToken` via `RefreshToken`.
  - `getOauth64()` gera token base64 (SASL XOAUTH2).
- Dependências:
  - `League\OAuth2\Client` (RefreshToken, AbstractProvider, AccessToken).
  - Interface `OAuthTokenProvider`.


---

### area-login/PHPMailer/src/OAuthTokenProvider.php
- Tipo: Interface PHP.
- Função: Contrato para gerar token OAuth2 base64 para SMTP (`getOauth64()`).
- Observações:
  - Formato esperado: `user=<email>\001auth=Bearer <token>\001\001`.


---

### area-login/PHPMailer/src/PHPMailer.php
- Tipo: Classe PHP principal.
- Função: Implementa composição, validação, formatação e envio de e-mails (mail/sendmail/SMTP), anexos, DKIM, S/MIME, iCal, encoding, templates MIME, etc.
- Estrutura (alto nível):
  - Constantes de charset, content-type, encoding e criptografia.
  - Propriedades públicas para configuração (host, portas, auth, headers, corpo, anexos).
  - Métodos para construir MIME, validar endereços, anexar arquivos, enviar via SMTP e gerar assinaturas DKIM.
- Dependências:
  - `SMTP`, `OAuthTokenProvider`, `Exception`.
- Observações:
  - Arquivo muito grande (~5k linhas); referência central do PHPMailer.


---

### area-login/PHPMailer/src/POP3.php
- Tipo: Classe PHP.
- Função: Autenticação POP-before-SMTP (RFC1939), suporte mínimo ao POP3.
- Estrutura:
  - `popBeforeSmtp()` wrapper estático → `authorise()`.
  - Conexão via `fsockopen`, login `USER/PASS`, `disconnect()`.
  - Log de erros e debug (`DEBUG_OFF/SERVER/CLIENT`).
- Observações:
  - Tecnologia legada (comentado no próprio arquivo).


---

### area-login/PHPMailer/src/SMTP.php
- Tipo: Classe PHP.
- Função: Transporte SMTP completo (RFC 821/5321), autenticação, TLS, comandos SMTP, debug.
- Estrutura:
  - Conexão via `stream_socket_client`/`fsockopen`, `EHLO/HELO`, `AUTH`, `DATA`, `QUIT`, etc.
  - Suporte a STARTTLS, SMTPUTF8, VERP e padrões de transaction-id.
  - Níveis de debug e captura de erros.
- Observações:
  - Arquivo grande (~1.6k linhas).


---

### area-login/PHPMailer_
- Tipo: Biblioteca PHPMailer (versão legada/duplicada).
- Conteúdo (top-level):
  - Pastas: `language/`, `src/`
  - Arquivos: `.editorconfig`, `class.phpmailer.php`, `class.smtp.php`, `COMMITMENT`, `composer.json`, `get_oauth_token.php`, `LICENSE`, `mailer.php`, `PHPMailerAutoload.php`, `README.md`, `recupera_valida_usuario.php`, `rec_login_usuario.php`, `SECURITY.md`, `VERSION`


---

### area-login/PHPMailer_/.editorconfig
- Tipo: Configuração de editor.
- Função: Define charset UTF-8, indentação e finais de linha.


---

### area-login/PHPMailer_/class.phpmailer.php
- Tipo: Classe PHP (legada).
- Função: Implementação antiga do PHPMailer (v5.2.8) em arquivo único.
- Estrutura:
  - Propriedades e métodos para composição/envio de e-mails (mail/sendmail/SMTP).
  - Funções de anexos, DKIM, MIME, validação e helpers.
  - Define `phpmailerException` no final.
- Observações:
  - Versão antiga (PHP 5.x), mantida por compatibilidade.


---

### area-login/PHPMailer_/class.smtp.php
- Tipo: Classe PHP (legada).
- Função: Transporte SMTP legado (v5.2.8).
- Observações:
  - Similar ao SMTP moderno, mas sem recursos recentes (OAuth2/SMTPUTF8).


---

### area-login/PHPMailer_/COMMITMENT
- Tipo: Documento legal.
- Função: “GPL Cooperation Commitment” com cláusulas de cura e reintegração de licença.
- Observações:
  - Licenças cobertas: GPLv2, LGPLv2.1, LGPLv2.
  - Licença CC BY-SA 4.0 para o texto.


---

### area-login/PHPMailer_/composer.json
- Tipo: Manifesto Composer.
- Função: Define pacote PHPMailer (legado), dependências e autoload.
- Observações:
  - Requisitos: PHP >= 5.5 e extensões `ctype`, `filter`, `hash`.
  - Dependências dev incluem `phpcompatibility` e `roave/security-advisories`.


---

### area-login/PHPMailer_/get_oauth_token.php
- Tipo: Script PHP (exemplo utilitário).
- Função: Fluxo OAuth2 para obter refresh token (Google/Yahoo/Microsoft/Azure).
- Dependências:
  - `vendor/autoload.php`, `league/oauth2-client` e providers.
- Pontos de atenção:
  - Exemplo sensível; não expor publicamente sem proteção.


---

### area-login/PHPMailer_/LICENSE
- Tipo: Licença (LGPL).
- Função: Termos da GNU Lesser General Public License v2.1.

---

### area-login/PHPMailer_/mailer.php
- Tipo: Script PHP de configuracao de email (PHPMailer).
- Funcao: Inicializa PHPMailer com SMTP e credenciais do dominio vvconsulting.com.br.
- Estrutura:
  - Inclui `class.phpmailer.php` e `class.smtp.php`.
  - Configura SMTP (`Host`, `Port`, `SMTPAuth`, `Username`, `Password`).
  - Define remetente e reply-to.
- Dependencias:
  - PHPMailer legacy no mesmo diretorio.
  - Servidor SMTP `mail.vvconsulting.com.br`.
- Pontos de atencao:
  - **Credenciais em texto plano** no codigo (usuario e senha SMTP).
  - Encoding quebrado em comentarios (acentos).
  - Sem TLS/SSL explicito (linha de `SMTPSecure` comentada).

---

### area-login/PHPMailer_/PHPMailerAutoload.php
- Tipo: Autoloader (PHP) legado do PHPMailer.
- Funcao: Registra autoload SPL para carregar `class.<nome>.php` no mesmo diretorio.
- Estrutura:
  - Funcao `PHPMailerAutoload()` monta caminho `class.<classname>.php` em lowercase.
  - Registro via `spl_autoload_register` com compatibilidade PHP 5.1+.
  - Fallback para `__autoload` em PHP antigo (<5.1.2).
- Dependencias:
  - Arquivos `class.phpmailer.php` e `class.smtp.php` no mesmo diretorio.
- Pontos de atencao:
  - Suporte a PHP muito antigo sugere **legado**.
  - Uso de `dirname(__FILE__)` (sem `__DIR__`) por compatibilidade 5.2.

---

### area-login/PHPMailer_/README.md
- Tipo: Documentacao oficial do PHPMailer.
- Funcao: Explica recursos, instalacao, exemplos e referencias de uso.
- Conteudo relevante:
  - Lista features (SMTP, anexos, DKIM, suporte UTF-8, etc.).
  - Recomenda Composer e descreve uso manual.
  - Indica compatibilidade com PHP 5.5+ (v6.x) e legacy 5.2 (PHP 5.0-7.0).
  - Referencias para wiki, troubleshooting e exemplos.
- Pontos de atencao:
  - Texto com encoding quebrado (acentos).
  - Documento externo, nao especifico do projeto (vendor).

---

### area-login/PHPMailer_/rec_login_usuario.php
- Tipo: Pagina/handler PHP (recuperacao de senha - painel).
- Funcao: Gera nova senha para usuario ativo e envia por email via PHPMailer.
- Fluxo:
  - Lê `POST['login']`.
  - Busca usuario em `vv_usuario` por `email` ou `login` com `ativo='1'`.
  - Gera senha aleatoria (5 chars), grava hash em banco.
  - Envia email com a senha em texto claro.
  - Renderiza HTML de sucesso/erro no mesmo arquivo.
- Dependencias:
  - `con_bd.php` (conexao MySQL).
  - PHPMailer (include `phpmailer/mailer.php`).
  - Assets do admin: `assets/css/*`, `assets/js/*`.
- Pontos de atencao:
  - **SQL injection**: interpolacao direta de `$_POST['login']` na query.
  - **Senha enviada em texto claro** por email.
  - Possivel caminho errado do include (`phpmailer/mailer.php` vs `PHPMailer_/mailer.php`).
  - Encoding quebrado nos textos (acentos).
  - Mistura de logica + HTML dificulta manutencao.

---

### area-login/PHPMailer_/recupera_valida_usuario.php
- Tipo: Endpoint PHP (validacao de usuario para recuperacao).
- Funcao: Verifica se email/login existe e esta ativo na tabela `vv_usuario`.
- Entrada: `GET['login']`.
- Saida:
  - Retorna `1` quando encontrado.
  - Caso contrario, retorna mensagem HTML de erro.
- Dependencias:
  - `con_bd.php` (conexao MySQL).
- Pontos de atencao:
  - **SQL injection**: interpolacao direta de `$_GET['login']`.
  - Retorno de HTML em endpoint usado como validação (provavel uso via AJAX).
  - Mensagem em PT-BR mas arquivo em encoding inconsistente.

---

### area-login/PHPMailer_/SECURITY.md
- Tipo: Avisos de seguranca do PHPMailer.
- Funcao: Lista vulnerabilidades historicas (CVEs) e versoes afetadas.
- Conteudo relevante:
  - CVEs para RCE, injection, UNC path, header injection, XSS, etc.
  - Orienta divulgacao responsavel via Tidelift.
- Pontos de atencao:
  - Documento externo (vendor), mas importante para avaliar versao instalada.

---

### area-login/PHPMailer.zip
- Tipo: Arquivo compactado (ZIP).
- Tamanho/metadata: 155.849 bytes; ultima modificacao em 30/01/2026 00:15:35.
- Funcao: Pacote compactado do PHPMailer (provavel backup/instalador).
- Pontos de atencao:
  - Binario; nao analisado internamente.
  - Duplicidade com pastas `PHPMailer/` e `PHPMailer_/`.

---

### area-login/pip_pdf.php
- Tipo: Geracao de PDF (Dompdf) - PIP.
- Funcao: Gera PDF "Plano de Intervencao Pedagogica" com dados do formulario e do banco.
- Fluxo:
  - Inclui `verifica.php` (controle de sessao) e `vendor/autoload.php`.
  - Carrega imagens (logo, QR, icones) e embute em Base64.
  - Busca dados do cliente (`cliente`) e nomes de valores (`valores`) via IDs.
  - Monta HTML e renderiza com Dompdf (A4, landscape), gera PDF para download.
- Dependencias:
  - Composer `dompdf/dompdf`.
  - Banco MySQL: tabelas `cliente` e `valores`.
  - Assets: `assets/images/*`.
- Pontos de atencao:
  - **SQL injection**: interpolacao direta de IDs em queries.
  - Exibe dados com encoding quebrado (acentos).
  - `isRemoteEnabled` e `isHtml5ParserEnabled` habilitados.
  - Conteudo e contatos fixos (ex.: email e telefone em footer).

---

### area-login/plano_aula_pdf.html
- Tipo: Script PHP com extensao .html (geracao de PDF).
- Funcao: Recebe dados de formulario e gera PDF "Plano de Aula" via Dompdf.
- Fluxo:
  - Carrega `vendor/autoload.php` (Dompdf).
  - Lê diversos campos `POST`.
  - Faz upload opcional de arquivo em `uploads/`.
  - Monta HTML simples e renderiza PDF (A4 portrait).
- Dependencias:
  - Composer `dompdf/dompdf`.
  - Pasta `uploads/` para salvar arquivo enviado.
  - Asset `assets/images/logo-icon.jpg`.
- Pontos de atencao:
  - Extensao `.html` com PHP pode confundir deploy/servidor.
  - Upload sem validacao de tipo/tamanho.
  - Usa `echo` de status de upload (pode poluir resposta PDF).
  - Encoding quebrado nos textos.

---

### area-login/plano_aula_pdf.php
- Tipo: Handler PHP (salva plano de aula + gera PDF).
- Funcao: Atualiza cliente, insere registro em `plano_aula` e gera PDF com Dompdf.
- Fluxo:
  - Inclui `verifica.php`.
  - Sanitiza campos com `mysqli_real_escape_string` (funcao `s`).
  - `UPDATE cliente` com dados basicos.
  - `INSERT INTO plano_aula` com varios campos do formulario.
  - Busca logo do cliente em `uploads/` e dados auxiliares em `valores`.
  - Renderiza PDF, salva em `uploads/` e grava `nome_pdf` no registro.
  - Envia PDF como download.
- Dependencias:
  - Composer `dompdf/dompdf`.
  - Tabelas `cliente`, `plano_aula`, `valores`.
  - Assets: `assets/images/frame.png`, `assets/images/icons/*`.
  - Pasta `uploads/` (para logo e PDFs gerados).
- Pontos de atencao:
  - Usa SQL montado manualmente (sem prepared statements).
  - Grava PDF em `uploads/` (controle de permissao e limpeza).
  - Encoding quebrado nos textos.
  - Contatos fixos no footer do PDF (jabutieduc.com, email/telefone).

---

### area-login/plano_aula_pdf1.php
- Tipo: Geracao de PDF (Dompdf) - versao simples.
- Funcao: Gera PDF "Plano de Aula" apenas com dados de POST (sem banco).
- Fluxo:
  - Converte logo `assets/images/logo.png` para Base64.
  - Monta HTML com campos do formulario.
  - Renderiza PDF A4 portrait e envia download.
- Dependencias:
  - Composer `dompdf/dompdf`.
  - Asset `assets/images/logo.png`.
- Pontos de atencao:
  - Sem validacao/sanitizacao dos campos.
  - Encoding quebrado nos textos.

---

### area-login/plano_aula_pdf2.php
- Tipo: Geracao de PDF (Dompdf) - layout aprimorado.
- Funcao: Gera PDF "Plano de Aula" com header/rodape e qrcodes.
- Fluxo:
  - Converte logo e QR codes para Base64.
  - Monta HTML com estilos e seções.
  - Renderiza PDF A4 landscape e envia download.
- Dependencias:
  - Composer `dompdf/dompdf`.
  - Assets: `assets/images/logo.png`, `assets/images/qrcode1.png`, `assets/images/qrcode2.png`.
- Pontos de atencao:
  - Sem validacao/sanitizacao dos campos.
  - Encoding quebrado nos textos.

---

### area-login/planos_quantec.php
- Tipo: Pagina admin (PHP + HTML) - "Planos Quantec".
- Funcao: Exibe tabela de registros e formulario para adicionar plano.
- Estrutura:
  - Inclui `verifica.php`, `sidebar.php`, `header.php`.
  - Formulario POST apontando para `adiciona_especie.php` (campo "Novo Plano" e "Valor").
  - Lista registros de `especie_pet` com links para `detalhes_especie.php`.
  - Scripts de DataTables, Select2, ViaCEP e validacao de numero.
- Dependencias:
  - Banco MySQL (tabela `especie_pet`).
  - Assets admin em `assets/`.
  - APIs externas: `viacep.com.br`.
- Pontos de atencao:
  - Inconsistencia de nomes: "Planos Quantec" x tabela `especie_pet`.
  - Formulario aponta para `adiciona_especie.php` (provavel reaproveitamento).
  - Encoding quebrado nos textos.

---

### area-login/pricing-table.html
- Tipo: Template HTML (admin UI).
- Funcao: Pagina de exemplo "Pricing Tables" do tema Rukada.
- Estrutura:
  - Sidebar e header com navegacao completa do template.
  - Secoes de tabelas de precos (Free/Plus/Pro) com estilos.
  - Switcher de tema e cores.
- Dependencias:
  - Assets do admin em `assets/` (CSS/JS/avatars).
  - Fontes Google (Roboto).
- Pontos de atencao:
  - Conteudo de demonstração (nao especifico do projeto).
  - Contem links externos do tema (codervent/themeforest).

---

### area-login/processa_reset_senha.php
- Tipo: Handler PHP (reset de senha).
- Funcao: Valida dados do formulario e atualiza senha em `vv_usuario`.
- Fluxo:
  - Valida campos `id_usuario`, `senha1`, `senha2`.
  - Gera hash com `password_hash`.
  - Atualiza `vv_usuario` via prepared statement.
  - Redireciona para `reset_senha.php` com mensagem.
- Dependencias:
  - `verifica.php` (sessao/conexao).
  - Tabela `vv_usuario`.
- Pontos de atencao:
  - Mensagens retornam via querystring.
  - Encoding quebrado em strings PT-BR.

---

### area-login/produtos.php
- Tipo: Pagina admin (PHP + HTML) - Produtos.
- Funcao: Cadastro e listagem de produtos com imagens, formatos e categorias.
- Estrutura:
  - Inclui `verifica.php`, `sidebar.php`, `header.php`.
  - Formulario `adiciona_produto.php` com upload de imagem e campos de produto.
  - Lista produtos com join `artistas` + `produto`.
  - Busca dados auxiliares: `status_site`, `tipo_prod_venda`, `categoria`.
  - DataTables, Select2, DatePicker, ViaCEP.
- Dependencias:
  - Banco MySQL: `produto`, `artistas`, `status_site`, `tipo_prod_venda`, `categoria`.
  - Imagens exibidas em `../img/`.
  - Assets admin em `assets/`.
- Pontos de atencao:
  - Upload de imagem sem validacao extra (além de `accept`).
  - Titulo da pagina "Seeart - IA" (inconsistente com VV).
  - Encoding quebrado nos textos.

---

### area-login/professores.php
- Tipo: Pagina admin (PHP + HTML) - Professores.
- Funcao: Cadastro e listagem de professores, disciplinas e turmas vinculadas.
- Estrutura:
  - Inclui `verifica.php`, `sidebar.php`, `header.php`.
  - Formulario `adiciona_professor.php` com dados pessoais e endereco.
  - Listagem em DataTable de `professores`.
  - Checkbox de disciplinas (`disciplina`) e turmas (`turmas`) se perfil admin/secretaria.
  - ViaCEP para preenchimento de endereco.
- Dependencias:
  - Banco MySQL: `professores`, `disciplina`, `turmas`.
  - Assets admin em `assets/`.
  - API externa: `viacep.com.br`.
- Pontos de atencao:
  - Sem validacoes server-side visiveis no formulario (apenas front).
  - Encoding quebrado nos textos.

---

### area-login/prog_horarios_docentes_pdf.php
- Tipo: Geracao de PDF (Dompdf) - Programacao de Horarios Docentes.
- Funcao: Gera PDF com dados pessoais e preferencias de ensino.
- Fluxo:
  - Inclui `verifica.php` e `vendor/autoload.php`.
  - Carrega imagens (logo, QR, icones) em Base64.
  - Busca nomes em `valores` via IDs recebidos em POST.
  - Monta HTML e renderiza PDF A4 landscape.
- Dependencias:
  - Composer `dompdf/dompdf`.
  - Tabelas `cliente` e `valores`.
  - Assets `assets/images/*`.
- Pontos de atencao:
  - **SQL injection**: IDs interpolados em queries sem prepared.
  - Contatos fixos no rodape (jabutieduc.com, email/telefone).
  - Encoding quebrado nos textos.

---

### area-login/projetos_pdf.php
- Tipo: Geracao de PDF (Dompdf) - Formulario de Projetos.
- Funcao: Gera PDF com dados do formulario de projetos e campos do banco.
- Fluxo:
  - Inclui `verifica.php` e `vendor/autoload.php`.
  - Carrega imagens (logo, QR, icones) em Base64.
  - Busca nomes em `valores` via IDs (nivel, turma, disciplina etc.).
  - Monta HTML e renderiza PDF A4 landscape.
- Dependencias:
  - Composer `dompdf/dompdf`.
  - Tabela `valores`.
  - Assets `assets/images/*`.
- Pontos de atencao:
  - **SQL injection**: IDs interpolados em queries sem prepared.
  - Contatos fixos no rodape (jabutieduc.com, email/telefone).
  - Encoding quebrado nos textos.

---

### area-login/racas.php
- Tipo: Pagina admin (PHP + HTML) - Racas.
- Funcao: Cadastro e listagem de racas de pets vinculadas a especies.
- Estrutura:
  - Inclui `verifica.php`, `sidebar.php`, `header.php`.
  - Formulario `adiciona_raca.php` com select de `especie_pet`.
  - Listagem de `raca_pet` com join `especie_pet`.
  - DataTables, Select2, ViaCEP e validacao de numero.
- Dependencias:
  - Banco MySQL: `especie_pet`, `raca_pet`.
  - Assets admin em `assets/`.
  - API externa: `viacep.com.br`.
- Pontos de atencao:
  - Inconsistencia com dominio do projeto (conteudo de pets).
  - Encoding quebrado nos textos.

---

### area-login/rec_login_usuario.php
- Tipo: Handler PHP (recuperacao de senha - admin).
- Funcao: Gera nova senha para usuario ativo e envia email via PHPMailer (versao nova).
- Fluxo:
  - Lê `POST['login']`.
  - Busca usuario em `vv_usuario` por email/login.
  - Gera senha aleatoria, grava hash no banco.
  - Configura PHPMailer via `mail_config.php` e envia email.
  - Renderiza HTML de sucesso/erro.
- Dependencias:
  - `con_bd.php` (MySQL).
  - `mail_config.php` (config SMTP).
  - PHPMailer em `area-login/PHPMailer/src`.
- Pontos de atencao:
  - **SQL injection**: interpolacao direta de `$_POST['login']`.
  - **Senha enviada em texto claro** por email.
  - Encoding quebrado nos textos.

---

### area-login/recupera_senha.php
- Tipo: Pagina HTML/PHP (recuperacao de senha - antiga).
- Funcao: Formulario simples que envia email/login para `rec_login_usuario.php`.
- Estrutura:
  - Usa `css/estilo-adm.css` e `js/js-adm.js`.
  - Botao chama `recupera_valida_login()` via JS.
- Dependencias:
  - `rec_login_usuario.php` (envio).
  - `recupera_valida_usuario.php` (provavel chamada AJAX no JS).
- Pontos de atencao:
  - Layout/tema diferente do painel atual.
  - Encoding quebrado nos textos.

---

### area-login/recupera_valida_usuario.php
- Tipo: Endpoint PHP (validacao de usuario).
- Funcao: Verifica se email/login existe e esta ativo em `vv_usuario`.
- Entrada: `GET['login']`.
- Saida:
  - Retorna `1` se encontrado.
  - Caso contrario, retorna mensagem HTML de erro.
- Dependencias:
  - `con_bd.php` (MySQL).
- Pontos de atencao:
  - **SQL injection**: interpolacao direta de `$_GET['login']`.
  - Retorno HTML em endpoint de validacao (provavel AJAX).
  - Encoding quebrado nos textos.

---

### area-login/registrar_ponto.php
- Tipo: Endpoint PHP (folha de ponto).
- Funcao: Registra horarios de ponto do colaborador (entrada/almoco/saida).
- Fluxo:
  - Valida `id_colaborador`, `data_registro`, `campo` e formato de hora.
  - Verifica registro existente em `folha_ponto_colaborador`.
  - Aplica validacoes de cronologia (entrada < saida almoco < volta < saida).
  - Faz INSERT/UPDATE do campo informado.
- Dependencias:
  - Tabela `folha_ponto_colaborador`.
- Pontos de atencao:
  - SQL interpolado (sem prepared statements).
  - Usa `die()` com mensagens diretas (expostas ao usuario).
  - Encoding quebrado nos textos.

---

### area-login/relatorio_estudante_pdf.php
- Tipo: Geracao de PDF (Dompdf) - Relatorio do Estudante.
- Funcao: Gera PDF com dados do estudante, desempenho e recomendacoes.
- Fluxo:
  - Inclui `verifica.php` e `vendor/autoload.php`.
  - Carrega imagens (logo, QR, icones) em Base64.
  - Busca nomes em `valores` via IDs (funcao, setor, periodo etc.).
  - Monta HTML e renderiza PDF A4 landscape.
- Dependencias:
  - Composer `dompdf/dompdf`.
  - Tabela `valores`.
  - Assets `assets/images/*`.
- Pontos de atencao:
  - **SQL injection**: IDs interpolados em queries sem prepared.
  - Contatos fixos no rodape (jabutieduc.com, email/telefone).
  - Encoding quebrado nos textos.

---

### area-login/relatorio_turmas_pdf.php
- Tipo: Geracao de PDF (Dompdf) - Relatorio de Turmas.
- Funcao: Gera PDF com analise pedagogica e recomendacoes por turma.
- Fluxo:
  - Inclui `verifica.php` e `vendor/autoload.php`.
  - Carrega imagens (logo, QR, icones) em Base64.
  - Busca nomes em `valores` via IDs (periodo, nivel, serie etc.).
  - Monta HTML e renderiza PDF A4 landscape.
- Dependencias:
  - Composer `dompdf/dompdf`.
  - Tabela `valores`.
  - Assets `assets/images/*`.
- Pontos de atencao:
  - **SQL injection**: IDs interpolados em queries sem prepared.
  - Contatos fixos no rodape (jabutieduc.com, email/telefone).
  - Encoding quebrado nos textos.

---

### area-login/reset_senha.php
- Tipo: Pagina admin (PHP + HTML) - Alteracao de senha.
- Funcao: Exibe formulario para usuario logado trocar senha.
- Fluxo:
  - Verifica sessao (`$_SESSION['id']`).
  - Carrega dados do usuario em `vv_usuario`.
  - Envia para `processa_reset_senha.php`.
- Dependencias:
  - `verifica.php`, `sidebar.php`, `header.php`.
  - Tabela `vv_usuario`.
- Pontos de atencao:
  - Busca usuario por id com query interpolada.
  - Mensagens de erro/sucesso via querystring.
  - Encoding quebrado nos textos.

---

### area-login/reset_senha_usuario.php
- Tipo: Handler PHP (reset de senha admin).
- Funcao: Gera nova senha para `usuario_adm`, grava hash e envia email.
- Fluxo:
  - Lê `GET['id']`.
  - Gera senha aleatoria (5 chars) e grava `md5`.
  - Busca dados do admin e envia email via PHPMailer SMTP.
  - Retorna `1` ou `0`.
- Dependencias:
  - Tabela `usuario_adm`.
  - PHPMailer em `area-login/PHPMailer/src`.
  - SMTP `mail.vvconsulting.com.br`.
- Pontos de atencao:
  - **SQL injection**: `id` interpolado em queries.
  - **Senha em texto claro** no email.
  - Usa `md5` (inseguro).
  - Credenciais SMTP hardcoded no arquivo.
  - URLs com "VV Consulting.com.br" (espaco) indicam erro de string.
  - Encoding quebrado nos textos.

---

### area-login/salva_cadastro_institucional.php
- Tipo: Handler PHP (cadastro institucional).
- Funcao: Atualiza dados do cliente e insere registro em `cadastro_institucional`.
- Fluxo:
  - Valida `usuario_registrado`.
  - Sanitiza campos via helper `s()` e `i_or_null()`.
  - Converte campos Sim/Não para booleanos (`bool_from_post`).
  - `UPDATE cliente` com dados basicos.
  - `INSERT INTO cadastro_institucional` com estrutura/equipamentos.
  - Retorna alert JS (sucesso/erro).
- Dependencias:
  - Tabelas `cliente`, `cadastro_institucional`.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared).
  - Uso de `echo <script>` para mensagens.
  - Encoding quebrado nos textos.

---

### area-login/salva_formulario_aula.php
- Tipo: Handler PHP (salva plano de aula).
- Funcao: Atualiza cliente e insere registro em `plano_aula`.
- Fluxo:
  - Valida `usuario_registrado`.
  - Sanitiza campos via `s()`.
  - `UPDATE cliente` (dados basicos).
  - `INSERT INTO plano_aula` com campos do formulario.
  - Retorna alert JS (sucesso/erro).
- Dependencias:
  - Tabelas `cliente`, `plano_aula`.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared).
  - Mensagens via `alert` JS.

---

### area-login/salva_sequencia_didatica.php
- Tipo: Handler PHP (sequencia didatica).
- Funcao: Atualiza cliente e insere registro em `sequencia_didatica`.
- Fluxo:
  - Valida `usuario_registrado`.
  - `UPDATE cliente` com dados basicos.
  - `INSERT INTO sequencia_didatica` com campos do formulario.
  - Retorna alert JS (sucesso/erro).
- Dependencias:
  - Tabelas `cliente`, `sequencia_didatica`.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared).
  - Mensagens via `alert` JS.
  - Encoding quebrado nos textos.

---

### area-login/salvar_candidato.php
- Tipo: Handler PHP (candidato).
- Funcao: Atualiza dados do candidato/usuario e opcionalmente substitui curriculo.
- Fluxos:
  - Soft-delete via `GET['del']` (desativa `vv_usuario` e `candidato`).
  - Validacoes de email unico e CPF.
  - Atualiza `vv_usuario` (com/sem senha) e `candidato`.
  - Upload opcional de curriculo em `uploads/`.
- Dependencias:
  - Tabelas `vv_usuario`, `candidato`.
  - Pasta `uploads/`.
- Pontos de atencao:
  - Mixed mode: usa prepared statements, mas ainda faz `die()` com erro.
  - Upload sem validacao de tipo/tamanho.
  - Encoding quebrado nos textos.


---

### area-login/salvar_colaborador.php
- Tipo: Handler PHP (colaborador).
- Funcao: Cria/atualiza colaborador, gerencia curriculo e envia senha por email.
- Fluxos:
  - Soft-delete via `GET['del']` (inativa colaborador).
  - Atualiza colaborador existente ou cria novo (com usuario `vv_usuario`).
  - Upload opcional de curriculo em `uploads/`.
  - Envia email com senha via PHPMailer.
- Dependencias:
  - Tabelas `colaborador`, `vv_usuario`.
  - PHPMailer em `area-login/PHPMailer/src`.
  - Pasta `uploads/`.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared).
  - **Senha enviada em texto claro** por email.
  - Credenciais SMTP hardcoded (placeholder `senha_do_email`).
  - Encoding quebrado nos textos.

---

### area-login/salvar_contrato.php
- Tipo: Handler PHP (contratos).
- Funcao: Insere ou atualiza contratos com conteudo HTML (TinyMCE).
- Fluxo:
  - Sanitiza campos com `cleanInput`.
  - Inicia transacao, faz INSERT/UPDATE em `contratos`.
  - Trata campos longtext como NULL quando vazios.
  - Redireciona com status de sucesso/erro.
- Dependencias:
  - Tabela `contratos`.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared).
  - Em erro, adiciona query completa na URL (risco de expor dados).
  - Encoding quebrado nos textos.

---

### area-login/salvar_documento_colaborador.php
- Tipo: Handler PHP (documentos do colaborador).
- Funcao: Recebe upload de documento e atualiza status para "REVISAO PENDENTE RH".
- Fluxo:
  - Valida metodo POST e sessao.
  - Verifica colaborador e propriedade do documento.
  - Valida extensao (pdf/jpg/jpeg/png) e move para `uploads/`.
  - Atualiza `colaborador_documento` com nome_arquivo_colaborador, status e data_assinatura.
- Dependencias:
  - Tabelas `colaborador`, `colaborador_documento`, `status_documento`.
  - Pasta `uploads/`.
- Pontos de atencao:
  - Permite sobrescrita se nome de arquivo repetir (usa time()).
  - Mensagens via querystring.
  - Encoding quebrado nos textos.

---

### area-login/salvar_edicao_cliente.php
- Tipo: Handler PHP (cliente).
- Funcao: Atualiza dados cadastrais de cliente.
- Fluxo:
  - Sanitiza campos com `cleanInput`.
  - Trata campos opcionais (cpf/cnpj/email/nascimento) como NULL.
  - Atualiza tabela `clientes` em transacao.
  - Redireciona com mensagem de sucesso/erro.
- Dependencias:
  - Tabela `clientes`.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared).
  - Encoding quebrado nos textos.

---

### area-login/salvar_edicao_colaborador.php
- Tipo: Handler PHP (colaborador).
- Funcao: Atualiza dados de colaborador (nome, email, tipo).
- Fluxo:
  - Sanitiza campos com `cleanInput`.
  - Usa prepared statement para `UPDATE colaboradores`.
  - Redireciona com mensagem de sucesso/erro.
- Dependencias:
  - Tabela `colaboradores`.
- Pontos de atencao:
  - Inconsistencia de tabela (arquivo usa `colaboradores`, outros usam `colaborador`).
  - Encoding quebrado nos textos.

---

### area-login/salvar_edicao_evento.php
- Tipo: Handler PHP (eventos).
- Funcao: Atualiza evento e cliente, checklist estrutural e opcionais.
- Fluxo:
  - Sanitiza campos via `cleanInput`.
  - Atualiza `clientes` e `eventos`.
  - Remove e recria `checklist_evento`.
  - Remove e recria `opcionais_evento`.
  - Redireciona com status.
- Dependencias:
  - Tabelas `clientes`, `eventos`, `checklist_evento`, `opcionais_evento`.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared).
  - Conteudo de checklist/opcionais depende de campos dinamicos do POST.
  - Encoding quebrado nos textos.

---

### area-login/salvar_evento.php
- Tipo: Handler PHP (eventos).
- Funcao: Cadastra cliente (se necessario) e cria evento com opcionais e checklist.
- Fluxo:
  - Sanitiza campos via `cleanInput`.
  - Busca cliente por CPF/CNPJ/telefone; faz INSERT/UPDATE em `clientes`.
  - Insere evento em `eventos`.
  - Insere opcionais em `opcionais_evento` e checklist em `checklist_evento`.
  - Redireciona com status.
- Dependencias:
  - Tabelas `clientes`, `eventos`, `opcionais_evento`, `checklist_evento`.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared).
  - Encoding quebrado nos textos.

---

### area-login/salvar_solicitacao_documento.php
- Tipo: Handler PHP (documentos RH).
- Funcao: Cria solicitacao de documento para colaborador e envia email.
- Fluxo:
  - Valida campos obrigatorios (colaborador, tipo, descricao).
  - Upload opcional em `uploads/` (pdf/jpg/jpeg/png).
  - Insere registro em `colaborador_documento`.
  - Envia email via PHPMailer.
  - Redireciona para `documentos.php`.
- Dependencias:
  - Tabelas `colaborador`, `colaborador_documento`.
  - PHPMailer em `area-login/PHPMailer/src`.
  - Pasta `uploads/`.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared).
  - **Senha SMTP hardcoded** (placeholder `senha_do_email`).
  - Upload sem validacao de tamanho.
  - Encoding quebrado nos textos.

---

### area-login/salvar_status_candidatura.php
- Tipo: Handler PHP (candidatura).
- Funcao: Atualiza status de candidatura e, se aprovado, cria colaborador.
- Fluxo:
  - Valida status com lista permitida.
  - Atualiza `vaga_candidatura` via prepared statement.
  - Se status = APROVADO:
    - Busca dados em `candidato`, `vv_usuario`, `vaga`.
    - Cria registro em `colaborador` (se nao existir).
    - Inativa candidato e altera `vv_usuario.tipo_usuario` para COLABORADOR.
  - Redireciona com status.
- Dependencias:
  - Tabelas `vaga_candidatura`, `candidato`, `vv_usuario`, `vaga`, `colaborador`.
- Pontos de atencao:
  - Uso misto: prepared statements e SQL dinamico.
  - Transacao ampla (muitas operacoes em cadeia).
  - Encoding quebrado nos textos.

---

### area-login/salvar_usuario.php
- Tipo: Handler PHP (usuarios admin).
- Funcao: Cria/atualiza usuario admin e permite soft-delete.
- Fluxo:
  - Soft-delete via `GET['del']`.
  - Valida campos e tipos (`RH`, `COLABORADOR`).
  - Atualiza ou insere em `vv_usuario` (hash de senha).
- Dependencias:
  - Tabela `vv_usuario`.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared).
  - `die()` com mensagem direta.
  - Encoding quebrado nos textos.

---

### area-login/salvar_vaga.php
- Tipo: Handler PHP (vagas).
- Funcao: Cria/atualiza vagas e seus campos dinamicos.
- Fluxo:
  - Soft-delete via `GET['del']` (inativa vaga e campos).
  - INSERT/UPDATE em `vaga` e sincroniza `vaga_campos`.
  - Normaliza salario e valida status.
  - Usa transacao e prepared statements em partes.
- Dependencias:
  - Tabelas `vaga`, `vaga_campos`.
- Pontos de atencao:
  - Uso misto de SQL manual e prepared.
  - Exibe erros diretamente na tela em excecao.
  - Encoding quebrado nos textos.

---

### area-login/salvar_vaga_.php
- Tipo: Handler PHP (vagas) - versao alternativa/legacy.
- Funcao: Cria/atualiza vagas e campos dinamicos (sem id_contrato).
- Fluxo:
  - Soft-delete via `GET['del']`.
  - INSERT/UPDATE em `vaga` e sincroniza `vaga_campos`.
  - Usa transacao e prepared statements em partes.
- Dependencias:
  - Tabelas `vaga`, `vaga_campos`.
- Pontos de atencao:
  - Codigo confuso na parte de insert de campos (comentarios e binds duplicados).
  - Uso misto de SQL manual e prepared.
  - Exibe erros diretamente na tela.
  - Encoding quebrado nos textos.

---

### area-login/salvar_visita.php
- Tipo: Handler PHP (visitas/cliente).
- Funcao: Registra visita e cria cliente com dados e vinculacao de colaboradores.
- Fluxo:
  - Valida campos obrigatorios (tipo visita, nome, telefone).
  - Cria/consulta colaboradores (gestor, recepcionista, corretor).
  - Insere registro em `clientes` com dados da visita.
  - Usa transacao quando disponivel.
- Dependencias:
  - Tabelas `clientes`, `colaboradores`.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared).
  - Inconsistencia: usa tabela `colaboradores` (plural).
  - Mensagens via `alert` JS.
  - Encoding quebrado nos textos.

---

### area-login/seg_usuario.php
- Tipo: Pagina admin (PHP + HTML) - alterar senha.
- Funcao: Exibe formulario para troca de senha do usuario logado.
- Fluxo:
  - Usa `verifica.php`, `sidebar.php`, `header.php`.
  - Preenche dados do usuario logado (tabela `usuario_adm` se tipo Adm).
  - Envia para `altera_dados_senha.php` via JS (`verifica_form_senha()`).
- Dependencias:
  - Tabela `usuario_adm`.
  - Assets admin em `assets/`.
- Pontos de atencao:
  - Campos de senha pre-populados com variaveis de usuario (risco).
  - Encoding quebrado nos textos.

---

### area-login/sessao.php
- Tipo: Pagina admin (PHP + HTML) - perfil/sessao.
- Funcao: Exibe dados do aluno/cliente, responsavel e documentos.
- Estrutura:
  - Inclui `verifica.php`, `sidebar.php`, `header.php`.
  - Exibe dados fixos/mock em parte do layout.
  - Lista documentos do aluno (`docs_alunos`) e permite upload.
- Dependencias:
  - Tabela `docs_alunos`.
  - Upload em `assets/docs_alunos/` e `uploads/`.
- Pontos de atencao:
  - Varios dados hardcoded (ex.: Ana Silva).
  - Mistura de contexto (aluno/cliente).
  - Encoding quebrado nos textos.

---

### area-login/sessao_cliente.php
- Tipo: Pagina admin (PHP + HTML) - perfil/sessao cliente.
- Funcao: Similar a `sessao.php`, exibe dados do aluno/cliente e documentos.
- Estrutura:
  - Inclui `verifica.php`, `sidebar.php`, `header.php`.
  - Layout duplicado de `sessao.php`.
  - Lista documentos e permite upload.
- Dependencias:
  - Tabela `docs_alunos`.
  - Upload em `assets/docs_alunos/` e `uploads/`.
- Pontos de atencao:
  - Conteudo hardcoded e duplicado.
  - Mistura de contexto (aluno/cliente).
  - Encoding quebrado nos textos.

---

### area-login/sessoes.php
- Tipo: Pagina admin (PHP + HTML) - Sessoes.
- Funcao: Cadastro e listagem de sessoes vinculadas a clientes/planos.
- Estrutura:
  - Inclui `verifica.php`, `sidebar.php`, `header.php`.
  - Formulario envia para `adiciona_cliente.php` (provavel inconsistencia).
  - Lista clientes com `rel_cliente_plano` e `planos`.
  - Usa jQuery UI datepicker.
- Dependencias:
  - Tabelas `cliente`, `rel_cliente_plano`, `planos`.
  - Assets admin em `assets/`.
  - jQuery UI externo.
- Pontos de atencao:
  - Varios dados hardcoded nos exemplos.
  - Formulario aponta para arquivo possivelmente errado.
  - Encoding quebrado nos textos.

---

### area-login/sidebar - Copia.php
- Tipo: Template parcial (sidebar) - copia.
- Funcao: Menu lateral alternativo do admin (com regras por tipo de usuario).
- Estrutura:
  - Usa `$_SESSION['tipo']` para exibir menus por perfil (Aluno/Responsavel/Professor/Admin).
  - Inclui link externo de Font Awesome via CDN.
  - Itens para Clientes, Eventos, Contratos, Colaboradores, Seguranca.
- Dependencias:
  - Sessao ativa (`$_SESSION`).
  - Assets do admin em `assets/`.
- Pontos de atencao:
  - Arquivo duplicado (copia do sidebar).
  - Encoding quebrado nos textos.

---

### area-login/sidebar.php
- Tipo: Template parcial (sidebar).
- Funcao: Menu lateral principal do admin, baseado no tipo de usuario.
- Estrutura:
  - Menus para RH, CANDIDATO e COLABORADOR.
  - Links para vagas, candidatos, documentos, holerites, folha de ponto.
  - Links comuns: perfil e alterar senha.
  - Inclui Font Awesome via CDN.
- Dependencias:
  - Sessao ativa (`$_SESSION['tipo']`).
  - Assets do admin em `assets/`.
- Pontos de atencao:
  - Encoding quebrado nos textos.


---

### area-login/PHPMailer_/mailer.php
- Tipo: Script PHP (configuração SMTP).
- Função: Inicializa PHPMailer legado e define parâmetros SMTP padrão.
- Detalhes:
  - Usa `class.phpmailer.php` e `class.smtp.php`.
  - Host: `mail.vvconsulting.com.br`, porta 587, SMTPAuth ativo.
  - Remetente/Reply-To: `adm_site@vvconsulting.com.br`.
- Pontos de atenção:
  - Credenciais SMTP estão hardcoded (senha explícita). Recomenda-se rotacionar e mover para variáveis de ambiente/arquivo seguro.
  - Comentários com encoding quebrado (mojibake).


---

### area-login/PHPMailer_/PHPMailerAutoload.php
- Tipo: Autoloader PHP.
- Função: Registra `PHPMailerAutoload()` via SPL para carregar classes `class.{classname}.php`.
- Compatibilidade:
  - Suporta PHP < 5.1.2 via `__autoload`.
  - Evita `__DIR__` para manter compatibilidade com PHP 5.2.


---

### area-login/PHPMailer_/README.md
- Tipo: Documentação (README oficial PHPMailer).
- Função: Descreve recursos, instalação, exemplos e histórico da biblioteca.
- Observações:
  - Conteúdo refere-se à linha 6.x do PHPMailer (moderno), apesar de esta pasta conter versão legada.
  - Links externos e badges do GitHub.
  - Há caracteres com encoding quebrado (mojibake) no título e no texto.


---

### area-login/PHPMailer_/SECURITY.md
- Tipo: Documentação de segurança.
- Função: Lista CVEs e orientações de disclosure do PHPMailer.
- Observações:
  - Referências de vulnerabilidades abrangem várias versões (principalmente 6.x e anteriores).
  - Como esta pasta usa PHPMailer 5.2.x, há riscos históricos; ideal migrar para versão atual suportada.


---

### area-login/PHPMailer_/VERSION
- Tipo: Arquivo de versão.
- Conteúdo: `6.9.3`.
- Observações:
  - Divergente dos arquivos legados (`class.phpmailer.php` e `class.smtp.php` v5.2.8).


---

### area-login/PHPMailer_/recupera_valida_usuario.php
- Tipo: Endpoint PHP (validação de usuário).
- Função: Verifica se login/email existe em `vv_usuario` com `ativo='1'`.
- Entrada:
  - `$_GET["login"]`.
- Saída:
  - Retorna `"1"` se encontrado; caso contrário, HTML com mensagem de erro.
- Pontos de atenção:
  - Query concatenada sem sanitização (risco de SQL Injection).
  - Retorno mistura texto puro e HTML.


---

### area-login/PHPMailer_/rec_login_usuario.php
- Tipo: Página/fluxo PHP (recuperação de senha).
- Função: Gera nova senha aleatória, atualiza em `vv_usuario`, envia email de recuperação e exibe UI de login.
- Fluxo:
  - `$_POST['login']` -> consulta usuário (`email` ou `login`) ativo.
  - Se encontrado, gera senha de 5 caracteres, faz `password_hash`, atualiza no banco.
  - Envia e-mail via `phpmailer/mailer.php` e mostra mensagem de sucesso.
- Pontos de atenção:
  - SQL concatenado sem sanitização (risco de SQL Injection).
  - Senha temporária curta (5 chars) e enviada em texto claro por email.
  - Rate-limit/antifraude não implementado.
  - Encoding quebrado em textos (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-af.php
- Tipo: Arquivo de idioma (Afrikaans).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Há sinais de encoding quebrado em algumas strings (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-ar.php
- Tipo: Arquivo de idioma (Árabe).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo aparece com encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-as.php
- Tipo: Arquivo de idioma (Assamês).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).
  - Chave `extension_missing` aparece duplicada no arquivo.


---

### area-login/PHPMailer_/language/phpmailer.lang-az.php
- Tipo: Arquivo de idioma (Azerbaijano).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).
  - `extension_missing` está comentada (não ativa).


---

### area-login/PHPMailer_/language/phpmailer.lang-ba.php
- Tipo: Arquivo de idioma (Bósnio).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-be.php
- Tipo: Arquivo de idioma (Bielorrusso).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).
  - `extension_missing` está comentada (não ativa).


---

### area-login/PHPMailer_/language/phpmailer.lang-bg.php
- Tipo: Arquivo de idioma (Búlgaro).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-bn.php
- Tipo: Arquivo de idioma (Bengali).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).
  - Chave `extension_missing` aparece duplicada no arquivo.


---

### area-login/PHPMailer_/language/phpmailer.lang-ca.php
- Tipo: Arquivo de idioma (Catalão).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).
  - `extension_missing` está comentada (não ativa).


---

### area-login/PHPMailer_/language/phpmailer.lang-cs.php
- Tipo: Arquivo de idioma (Tcheco).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-da.php
- Tipo: Arquivo de idioma (Dinamarquês).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-de.php
- Tipo: Arquivo de idioma (Alemão).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-el.php
- Tipo: Arquivo de idioma (Grego).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-eo.php
- Tipo: Arquivo de idioma (Esperanto).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-es.php
- Tipo: Arquivo de idioma (Espanhol).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-et.php
- Tipo: Arquivo de idioma (Estoniano).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-fa.php
- Tipo: Arquivo de idioma (Persa/Farsi).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-fi.php
- Tipo: Arquivo de idioma (Finlandês).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).
  - Várias chaves comentadas (ex.: `empty_message`, `invalid_address`, `signing`, `smtp_*`, `extension_missing`).


---

### area-login/PHPMailer_/language/phpmailer.lang-fo.php
- Tipo: Arquivo de idioma (Feroês).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).
  - Várias chaves comentadas (ex.: `empty_message`, `invalid_address`, `signing`, `smtp_*`, `extension_missing`).


---

### area-login/PHPMailer_/language/phpmailer.lang-fr.php
- Tipo: Arquivo de idioma (Francês).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake), inclusive espaços finos não-quebrantes.


---

### area-login/PHPMailer_/language/phpmailer.lang-gl.php
- Tipo: Arquivo de idioma (Galego).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).
  - `extension_missing` está comentada (não ativa).


---

### area-login/PHPMailer_/language/phpmailer.lang-he.php
- Tipo: Arquivo de idioma (Hebraico).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).
  - `extension_missing` está comentada (não ativa).


---

### area-login/PHPMailer_/language/phpmailer.lang-hi.php
- Tipo: Arquivo de idioma (Hindi).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-hr.php
- Tipo: Arquivo de idioma (Croata).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-hu.php
- Tipo: Arquivo de idioma (Húngaro).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-hy.php
- Tipo: Arquivo de idioma (Armênio).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-id.php
- Tipo: Arquivo de idioma (Indonésio).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Sem sinais evidentes de mojibake (parece UTF-8 ok).


---

### area-login/PHPMailer_/language/phpmailer.lang-it.php
- Tipo: Arquivo de idioma (Italiano).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Há sinais de encoding quebrado (mojibake) em alguns caracteres (ex.: "è").


---

### area-login/PHPMailer_/language/phpmailer.lang-ja.php
- Tipo: Arquivo de idioma (Japonês).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-ka.php
- Tipo: Arquivo de idioma (Georgiano).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-ko.php
- Tipo: Arquivo de idioma (Coreano).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-ku.php
- Tipo: Arquivo de idioma (Curdo - Sorani).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-lt.php
- Tipo: Arquivo de idioma (Lituano).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Há sinais de encoding quebrado (mojibake).
  - `extension_missing` está comentada (não ativa).


---

### area-login/PHPMailer_/language/phpmailer.lang-lv.php
- Tipo: Arquivo de idioma (Letão).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Há sinais de encoding quebrado (mojibake).
  - `extension_missing` está comentada (não ativa).


---

### area-login/PHPMailer_/language/phpmailer.lang-mg.php
- Tipo: Arquivo de idioma (Malgaxe).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Sem sinais evidentes de mojibake (parece UTF-8 ok).


---

### area-login/PHPMailer_/language/phpmailer.lang-mn.php
- Tipo: Arquivo de idioma (Mongol).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-ms.php
- Tipo: Arquivo de idioma (Malaio).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Sem sinais evidentes de mojibake (parece UTF-8 ok).


---

### area-login/PHPMailer_/language/phpmailer.lang-nb.php
- Tipo: Arquivo de idioma (Norueguês Bokmål).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Há sinais de encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-nl.php
- Tipo: Arquivo de idioma (Holandês).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Há sinais de encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-pl.php
- Tipo: Arquivo de idioma (Polonês).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Há sinais de encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-pt.php
- Tipo: Arquivo de idioma (Português - PT).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Há sinais de encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-pt_br.php
- Tipo: Arquivo de idioma (Português - BR).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Há sinais de encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-ro.php
- Tipo: Arquivo de idioma (Romeno).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Há sinais de encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-ru.php
- Tipo: Arquivo de idioma (Russo).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Há sinais de encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-si.php
- Tipo: Arquivo de idioma (Cingalês/Sinhalese).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-sk.php
- Tipo: Arquivo de idioma (Eslovaco).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Há sinais de encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-sl.php
- Tipo: Arquivo de idioma (Esloveno).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Há sinais de encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-sr.php
- Tipo: Arquivo de idioma (Sérvio).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Há sinais de encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-sr_latn.php
- Tipo: Arquivo de idioma (Sérvio - Latim).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Há sinais de encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-sv.php
- Tipo: Arquivo de idioma (Sueco).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Há sinais de encoding quebrado (mojibake).
  - `empty_message` está comentada (não ativa).


---

### area-login/PHPMailer_/language/phpmailer.lang-tl.php
- Tipo: Arquivo de idioma (Tagalog).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Sem sinais evidentes de mojibake (parece UTF-8 ok).


---

### area-login/PHPMailer_/language/phpmailer.lang-tr.php
- Tipo: Arquivo de idioma (Turco).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Há sinais de encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-uk.php
- Tipo: Arquivo de idioma (Ucraniano).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Há sinais de encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-ur.php
- Tipo: Arquivo de idioma (Urdu).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Há sinais de encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-vi.php
- Tipo: Arquivo de idioma (Vietnamita).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Há sinais de encoding quebrado (mojibake).
  - `extension_missing` está comentada (não ativa).


---

### area-login/PHPMailer_/language/phpmailer.lang-zh.php
- Tipo: Arquivo de idioma (Chinês Tradicional).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).


---

### area-login/PHPMailer_/language/phpmailer.lang-zh_cn.php
- Tipo: Arquivo de idioma (Chinês Simplificado).
- Função: Traduções das mensagens de erro do PHPMailer.
- Observações:
  - Conteúdo com encoding quebrado (mojibake).


---

### area-login/PHPMailer_/src/DSNConfigurator.php
- Tipo: Classe PHP (PHPMailer).
- Função: Configura instância do PHPMailer via string DSN (mail/sendmail/qmail/smtp/smtps).
- Detalhes:
  - Faz parse de DSN, aplica host/porta/credenciais.
  - Valida opções e tipos (bool/int/string) e lança exceções para parâmetros inválidos.
  - Inclui workaround para bug do `parse_url` em PHP 5.5.


---

### area-login/PHPMailer_/src/Exception.php
- Tipo: Classe PHP (PHPMailer).
- Função: Exceção customizada com método `errorMessage()` para saída HTML segura.


---

### area-login/PHPMailer_/src/OAuth.php
- Tipo: Classe PHP (PHPMailer).
- Função: Wrapper OAuth2 para autenticação SMTP via `league/oauth2-client`.
- Detalhes:
  - Armazena provider, client id/secret, refresh token e usuário.
  - Gera token base64 com `user=... auth=Bearer ...` para XOAUTH2.


---

### area-login/PHPMailer_/src/OAuthTokenProvider.php
- Tipo: Interface PHP (PHPMailer).
- Função: Contrato para gerar string base64 de autenticação XOAUTH2.


---

### area-login/PHPMailer_/src/PHPMailer.php
- Tipo: Classe PHP (PHPMailer principal).
- Função: Composição e envio de e-mails (SMTP, mail(), sendmail), anexos, headers, MIME, etc.
- Principais capacidades:
  - Configuração de remetente/destinatários/CC/BCC/Reply-To.
  - Conteúdo HTML e texto, attachments, inline images, encoding/charset.
  - SMTP com TLS/SSL, autenticação, debug, timeouts.
  - Validação de endereços e prevenção de header injection.
- Observações:
  - Arquivo grande (~180 KB, milhares de linhas). Resumo de alto nível.


---

### area-login/PHPMailer_/src/POP3.php
- Tipo: Classe PHP (PHPMailer).
- Função: Implementa autenticação POP-before-SMTP (RFC1939).
- Observações:
  - Tecnologia antiga, usada apenas para sistemas legados.
  - Versão interna `6.9.3`, métodos para conectar, login, logout e debug.


---

### area-login/PHPMailer_/src/SMTP.php
- Tipo: Classe PHP (PHPMailer).
- Função: Transporte SMTP completo (RFC821/RFC5321) com debug e autenticação.
- Principais recursos:
  - Conexão, HELO/EHLO, STARTTLS, AUTH, comandos SMTP básicos.
  - Níveis de debug e saída configurável (echo/html/error_log).
  - Constantes de limites RFC, portas padrão e flags VERP.
- Observações:
  - Arquivo grande (~49 KB). Resumo de alto nível.


---

### area-login/uploads
- Tipo: Pasta de uploads (documentos/arquivos de usuários).
- Conteúdo: Centenas de arquivos, majoritariamente PDFs e imagens (ex.: currículos, documentos, folhas de presença).
- Observações:
  - Nomes indicam dados sensíveis/PII. Tratar como confidencial.
  - Não foi feito inventário individual dos arquivos por volume.


---

### area-login/vendor
- Tipo: Pasta de dependências Composer (vendors).
- Conteúdo (top-level):
  - Pastas: `composer/`, `dompdf/`, `masterminds/`, `sabberworm/`
  - Arquivo: `autoload.php`


---

### area-login/vendor/autoload.php
- Tipo: Autoloader Composer (gerado).
- Função: Inicializa autoload e impede execução em PHP < 5.6 (Composer 2.3+).
- Observações:
  - Arquivo gerado automaticamente; não editar manualmente.


---

### area-login/vendor/composer/autoload_classmap.php
- Tipo: Mapa de classes Composer (gerado).
- Função: Mapeia classes específicas para arquivos (ex.: `Composer\\InstalledVersions`, `Dompdf\\Cpdf`).


---

### area-login/vendor/composer/autoload_namespaces.php
- Tipo: Autoload namespaces Composer (gerado).
- Função: Mapeamento de namespaces legados (vazio neste projeto).


---

### area-login/vendor/composer/autoload_psr4.php
- Tipo: Autoload PSR-4 Composer (gerado).
- Função: Mapeia namespaces para vendors (dompdf, php-svg-lib, php-font-lib, html5, php-css-parser).


---

### area-login/vendor/composer/autoload_real.php
- Tipo: Autoloader Composer (gerado).
- Função: Inicializa o `ClassLoader`, checa plataforma, registra autoload e carrega mapa estático.


---

### area-login/vendor/composer/autoload_static.php
- Tipo: Autoload estático Composer (gerado).
- Função: Tabelas estáticas de PSR-4 e classmap usadas pelo `ClassLoader`.


---

### area-login/vendor/composer/ClassLoader.php
- Tipo: Classe PHP (Composer).
- Função: Implementa autoloader PSR-0/PSR-4/classmap.
- Observações:
  - Arquivo padrão do Composer; não editar manualmente.


---

### area-login/vendor/composer/installed.json
- Tipo: Manifesto Composer (gerado).
- Função: Lista pacotes instalados e metadados.
- Observações:
  - Pacotes principais: `dompdf/dompdf`, `dompdf/php-font-lib`, `dompdf/php-svg-lib`, `masterminds/html5`, `sabberworm/php-css-parser`.


---

### area-login/vendor/composer/installed.php
- Tipo: Manifesto Composer (gerado em PHP).
- Função: Lista versões e caminhos dos pacotes instalados.


---

### area-login/vendor/composer/InstalledVersions.php
- Tipo: Classe PHP (Composer).
- Função: API runtime para consultar versões de pacotes instalados.
- Observações:
  - Arquivo padrão do Composer; não editar manualmente.


---

### area-login/vendor/composer/LICENSE
- Tipo: Licença (MIT).
- Função: Termos de uso do Composer autoloader.


---

### area-login/vendor/composer/platform_check.php
- Tipo: Verificação de plataforma (gerado pelo Composer).
- Função: Valida requisitos de PHP (>= 7.1) e lança erro se incompatível.


---

### area-login/vendor/dompdf
- Tipo: Pasta de dependências (dompdf e libs relacionadas).
- Conteúdo (top-level):
  - `dompdf/` (motor principal)
  - `php-font-lib/` (fontes)
  - `php-svg-lib/` (SVG)


---

### area-login/vendor/dompdf/dompdf
- Tipo: Biblioteca dompdf (motor principal).
- Conteúdo (top-level):
  - Pastas: `lib/`, `src/`
  - Arquivos: `AUTHORS.md`, `composer.json`, `LICENSE.LGPL`, `phpunit.xml`, `README.md`, `VERSION`


---

### area-login/vendor/dompdf/dompdf/AUTHORS.md
- Tipo: Documentação (autores/contribuidores).
- Função: Lista mantenedores, alumni e contribuidores do dompdf.
- Observações:
  - Há sinais de encoding quebrado em nomes (mojibake).


---

### area-login/vendor/dompdf/dompdf/composer.json
- Tipo: Manifesto Composer.
- Função: Define pacote dompdf, autoload e dependências.
- Dependências principais:
  - PHP ^7.1, `ext-dom`, `ext-mbstring`
  - `masterminds/html5`, `dompdf/php-font-lib`, `dompdf/php-svg-lib`
- Dev:
  - `phpunit`, `php_codesniffer`, `mockery`, `symfony/process`


---

### area-login/vendor/dompdf/dompdf/LICENSE.LGPL
- Tipo: Licença (LGPL v2.1).
- Função: Termos de uso do dompdf.


---

### area-login/vendor/dompdf/dompdf/phpunit.xml
- Tipo: Configuração de testes (PHPUnit).
- Função: Define suíte de testes `tests/` e opções padrão do PHPUnit.


---

### area-login/vendor/dompdf/dompdf/README.md
- Tipo: Documentação (README).
- Função: Explica recursos, requisitos, instalação e uso do dompdf.
- Observações:
  - Documento extenso com exemplos de código e limitações conhecidas (CSS, SVG, tabelas).


---

### area-login/vendor/dompdf/dompdf/VERSION
- Tipo: Arquivo de versão.
- Conteúdo: `3.1.0`.


---

### area-login/vendor/dompdf/dompdf/lib
- Tipo: Pasta de biblioteca auxiliar do dompdf.
- Conteúdo (top-level):
  - Pastas: `fonts/`, `res/`
  - Arquivo: `Cpdf.php`


---

### area-login/vendor/dompdf/dompdf/lib/fonts
- Tipo: Pasta de fontes (dompdf).
- Conteúdo: arquivos de fontes e métricas (TTF, UFM, AFM, JSON), além de `installed-fonts.dist.json` e `mustRead.html`.
- Observações:
  - Pasta grande com binários; não foi feito inventário arquivo a arquivo.


---

### area-login/vendor/dompdf/dompdf/lib/res
- Tipo: Recursos do dompdf.
- Conteúdo: imagens de fallback (`broken_image.*`), CSS base (`html.css`) e perfil ICC (`sRGB2014.icc` + licença).


---

### area-login/vendor/dompdf/dompdf/lib/Cpdf.php
- Tipo: Classe PHP (Cpdf).
- Função: Geração de PDF puro (sem dependências externas), base usada pelo dompdf.
- Observações:
  - Arquivo grande; contém estruturas de objetos PDF, fontes e estados gráficos.


---

### area-login/vendor/dompdf/dompdf/src
- Tipo: Código-fonte principal do dompdf.
- Conteúdo (top-level):
  - Pastas: `Adapter/`, `Css/`, `Exception/`, `Frame/`, `FrameDecorator/`, `FrameReflower/`, `Image/`, `Positioner/`, `Renderer/`
  - Arquivos: `Canvas.php`, `CanvasFactory.php`, `Cellmap.php`, `Dompdf.php`, `Exception.php`, `FontMetrics.php`, `Frame.php`, `Helpers.php`, `JavascriptEmbedder.php`, `LineBox.php`, `Options.php`, `PhpEvaluator.php`, `Renderer.php`


---

### area-login/vendor/dompdf/dompdf/src/Canvas.php
- Tipo: Interface PHP.
- Função: Define contrato de renderização (desenho, texto, clipping, scripts de página).
- Observações:
  - Implementada por adapters (CPDF/GD/PDFLib).


---

### area-login/vendor/dompdf/dompdf/src/CanvasFactory.php
- Tipo: Classe PHP (factory).
- Função: Seleciona e instancia o backend de renderização (CPDF/GD/PDFLib) conforme opções/ambiente.


---

### area-login/vendor/dompdf/dompdf/src/Cellmap.php
- Tipo: Classe PHP.
- Função: Mapeia células de tabela na grade (row/col), resolve bordas colapsadas e spans.
- Observações:
  - Usada no layout/render de tabelas do dompdf.


---

### area-login/vendor/dompdf/dompdf/src/Dompdf.php
- Tipo: Classe PHP (núcleo).
- Função: Motor principal do dompdf (parse HTML, aplica CSS, layout, render PDF).
- Observações:
  - Arquivo grande; concentra configuração de base path, opções e pipeline de render.


---

### area-login/vendor/dompdf/dompdf/src/Exception.php
- Tipo: Classe PHP.
- Função: Exceção padrão do dompdf.


---

### area-login/vendor/dompdf/dompdf/src/FontMetrics.php
- Tipo: Classe PHP.
- Função: Gerencia fontes e métricas de texto (font families, cache, registro de fontes).
- Observações:
  - Usa cache em JSON (`installed-fonts.dist.json` e `installed-fonts.json`).


---

### area-login/vendor/dompdf/dompdf/src/Frame.php
- Tipo: Classe PHP (estrutura base).
- Função: Representa um nó HTML no layout (estilo, posição, árvore de frames).
- Observações:
  - Base para decorators/reflowers no pipeline de layout.


---

### area-login/vendor/dompdf/dompdf/src/Helpers.php
- Tipo: Classe utilitária.
- Função: Helpers para URL, debug, headers, encoding e utilidades gerais.


---

### area-login/vendor/dompdf/dompdf/src/JavascriptEmbedder.php
- Tipo: Classe PHP.
- Função: Embute JavaScript no PDF quando habilitado nas opções.


---

### area-login/vendor/dompdf/dompdf/src/LineBox.php
- Tipo: Classe PHP.
- Função: Representa line boxes no layout (inline flow, floats e dimensões).


---

### area-login/vendor/dompdf/dompdf/src/Options.php
- Tipo: Classe PHP (configurações).
- Função: Define opções do dompdf (paths, chroot, protocolos, fonte padrão, DPI, PHP/remote).
- Observações:
  - Contém alertas de segurança para `isPhpEnabled` e `isRemoteEnabled`.


---

### area-login/vendor/dompdf/dompdf/src/PhpEvaluator.php
- Tipo: Classe PHP.
- Função: Executa PHP embutido em documentos quando `isPhpEnabled` está ativo.
- Observações:
  - Usa `eval()`; risco de segurança quando habilitado com conteúdo não confiável.


---

### area-login/vendor/dompdf/dompdf/src/Renderer.php
- Tipo: Classe PHP (renderer).
- Função: Renderiza frames usando renderers específicos (block, inline, text, image, table, list, php, js).
- Observações:
  - Aplica transforms, clipping e callbacks por frame.


---

### area-login/vendor/dompdf/dompdf/src/Adapter
- Tipo: Pasta de adapters de renderização.
- Conteúdo:
  - `CPDF.php`, `GD.php`, `PDFLib.php`


---

### area-login/vendor/dompdf/dompdf/src/Adapter/CPDF.php
- Tipo: Classe PHP (adapter).
- Função: Backend de renderização baseado em `Cpdf` (padrão).
- Observações:
  - Define tamanhos de papel e manipula metadados do PDF.


---

### area-login/vendor/dompdf/dompdf/src/Adapter/GD.php
- Tipo: Classe PHP (adapter).
- Função: Renderiza páginas como imagens usando extensão GD (JPEG/PNG/GIF).
- Observações:
  - Usa fator de anti-aliasing e escala de fontes.


---

### area-login/vendor/dompdf/dompdf/src/Adapter/PDFLib.php
- Tipo: Classe PHP (adapter).
- Função: Backend de renderização via PDFLib (se disponível).
- Observações:
  - Mantém cache de imagens/fontes e suporta geração em memória/disco.


---

### area-login/vendor/dompdf/dompdf/src/Css
- Tipo: Pasta de CSS (parser/estilos).
- Conteúdo:
  - Pasta: `Content/`
  - Arquivos: `AttributeTranslator.php`, `Color.php`, `Style.php`, `Stylesheet.php`


---

### area-login/vendor/dompdf/dompdf/src/Css/AttributeTranslator.php
- Tipo: Classe PHP.
- Função: Traduz atributos HTML legados para regras CSS.


---

### area-login/vendor/dompdf/dompdf/src/Css/Color.php
- Tipo: Classe PHP.
- Função: Parsing de cores CSS (nomes, hex, rgba, etc.).


---

### area-login/vendor/dompdf/dompdf/src/Css/Style.php
- Tipo: Classe PHP.
- Função: Representa propriedades CSS, resolve valores (cores, tamanhos) e fornece getters/setters.
- Observações:
  - Arquivo grande com lista extensa de propriedades CSS suportadas.


---

### area-login/vendor/dompdf/dompdf/src/Css/Stylesheet.php
- Tipo: Classe PHP.
- Função: Parser/gerenciador de CSS (folhas, @page, media queries, URLs).
- Observações:
  - Arquivo grande; contém regexes e regras de origem/especificidade.


---

### area-login/vendor/dompdf/dompdf/src/Css/Content
- Tipo: Pasta de componentes de conteúdo CSS.
- Conteúdo:
  - `Attr.php`, `CloseQuote.php`, `ContentPart.php`, `Counter.php`, `Counters.php`,
    `NoCloseQuote.php`, `NoOpenQuote.php`, `OpenQuote.php`, `StringPart.php`, `Url.php`


---

### area-login/vendor/dompdf/dompdf/src/Css/Content/Attr.php
- Tipo: Classe PHP.
- Função: Representa `attr()` em `content:` no CSS.


---

### area-login/vendor/dompdf/dompdf/src/Css/Content/CloseQuote.php
- Tipo: Classe PHP.
- Função: Representa `close-quote` no `content:` do CSS.


---

### area-login/vendor/dompdf/dompdf/src/Css/Content/ContentPart.php
- Tipo: Classe PHP (abstrata).
- Função: Base para partes de `content:` no CSS.


---

### area-login/vendor/dompdf/dompdf/src/Css/Content/Counter.php
- Tipo: Classe PHP.
- Função: Representa `counter()` no `content:` do CSS.


---

### area-login/vendor/dompdf/dompdf/src/Css/Content/Counters.php
- Tipo: Classe PHP.
- Função: Representa `counters()` no `content:` do CSS.


---

### area-login/vendor/dompdf/dompdf/src/Css/Content/NoCloseQuote.php
- Tipo: Classe PHP.
- Função: Representa `no-close-quote` no `content:` do CSS.


---

### area-login/vendor/dompdf/dompdf/src/Css/Content/NoOpenQuote.php
- Tipo: Classe PHP.
- Função: Representa `no-open-quote` no `content:` do CSS.


---

### area-login/vendor/dompdf/dompdf/src/Css/Content/OpenQuote.php
- Tipo: Classe PHP.
- Função: Representa `open-quote` no `content:` do CSS.


---

### area-login/vendor/dompdf/dompdf/src/Css/Content/StringPart.php
- Tipo: Classe PHP.
- Função: Representa string literal em `content:` do CSS.


---

### area-login/vendor/dompdf/dompdf/src/Css/Content/Url.php
- Tipo: Classe PHP.
- Função: Representa `url()` em `content:` do CSS.


---

### area-login/vendor/dompdf/dompdf/src/Exception
- Tipo: Pasta de exceções específicas.
- Conteúdo: `ImageException.php`


---

### area-login/vendor/dompdf/dompdf/src/Exception/ImageException.php
- Tipo: Classe PHP.
- Função: Exceção específica para erros de imagem no dompdf.


---

### area-login/vendor/dompdf/dompdf/src/Frame
- Tipo: Pasta de estruturas de frames.
- Conteúdo:
  - `Factory.php`, `FrameListIterator.php`, `FrameTree.php`, `FrameTreeIterator.php`


---

### area-login/vendor/dompdf/dompdf/src/Frame/Factory.php
- Tipo: Classe PHP.
- Função: Cria e decora frames (decorator, positioner, reflower) conforme display/posição.


---

### area-login/vendor/dompdf/dompdf/src/Frame/FrameListIterator.php
- Tipo: Classe PHP (Iterator).
- Função: Itera filhos de um frame como lista ligada, tolerando mudanças durante a iteração.


---

### area-login/vendor/dompdf/dompdf/src/Frame/FrameTree.php
- Tipo: Classe PHP.
- Função: Constrói e mantém a árvore de frames a partir do DOM, filtrando nós ocultos e corrigindo tabelas.
- Detalhes: Indexa frames por id e fornece iterador da árvore.


---

### area-login/vendor/dompdf/dompdf/src/Frame/FrameTreeIterator.php
- Tipo: Classe PHP (Iterator).
- Função: Percorre a árvore de frames em pré-ordem usando pilha.


---

### area-login/vendor/dompdf/dompdf/src/FrameDecorator
- Tipo: Pasta de decorators de frame.
- Conteúdo:
  - `AbstractFrameDecorator.php`, `Block.php`, `Image.php`, `Inline.php`, `ListBullet.php`,
    `ListBulletImage.php`, `NullFrameDecorator.php`, `Page.php`, `Table.php`, `TableCell.php`,
    `TableRow.php`, `TableRowGroup.php`, `Text.php`


---

### area-login/vendor/dompdf/dompdf/src/FrameDecorator/AbstractFrameDecorator.php
- Tipo: Classe PHP (base).
- Função: Implementa decorator de frame com posicionador/reflower, caches de pais e controle de contadores.
- Detalhes: Suporta split de frames, geração de conteúdo e criação de nós anônimos.


---

### area-login/vendor/dompdf/dompdf/src/FrameDecorator/Block.php
- Tipo: Classe PHP.
- Função: Decorator para layout em bloco, gerencia line boxes, marcadores de lista e quebras de linha.


---

### area-login/vendor/dompdf/dompdf/src/FrameDecorator/Image.php
- Tipo: Classe PHP.
- Função: Decorator de imagens; resolve URL, trata imagem quebrada (fallback com texto alt) e expõe dimensões intrínsecas.


---

### area-login/vendor/dompdf/dompdf/src/FrameDecorator/Inline.php
- Tipo: Classe PHP.
- Função: Decorator para inline; ajusta cálculo de altura de linha e lógica de split em quebra.


---

### area-login/vendor/dompdf/dompdf/src/FrameDecorator/ListBullet.php
- Tipo: Classe PHP.
- Função: Decorator para marcador de lista; calcula largura/altura/offset do bullet.


---

### area-login/vendor/dompdf/dompdf/src/FrameDecorator/ListBulletImage.php
- Tipo: Classe PHP.
- Função: Marcador de lista com imagem; resolve URL e dimensiona com base em imagem ou fallback.


---

### area-login/vendor/dompdf/dompdf/src/FrameDecorator/NullFrameDecorator.php
- Tipo: Classe PHP.
- Função: Decorator nulo; zera dimensões e espaçamentos do frame.


---

### area-login/vendor/dompdf/dompdf/src/FrameDecorator/Page.php
- Tipo: Classe PHP.
- Função: Decorator de página; controla paginação, quebras, margens e frames flutuantes.


---

### area-login/vendor/dompdf/dompdf/src/FrameDecorator/Table.php
- Tipo: Classe PHP.
- Função: Decorator de tabela; mantém cellmap, normaliza estrutura (tbody/tr/td) e lida com split de páginas.


---

### area-login/vendor/dompdf/dompdf/src/FrameDecorator/TableCell.php
- Tipo: Classe PHP.
- Função: Decorator de célula; calcula altura de conteúdo e aplica alinhamento vertical.


---

### area-login/vendor/dompdf/dompdf/src/FrameDecorator/TableRow.php
- Tipo: Classe PHP.
- Função: Decorator de linha de tabela (estrutura simples).


---

### area-login/vendor/dompdf/dompdf/src/FrameDecorator/TableRowGroup.php
- Tipo: Classe PHP.
- Função: Decorator de grupo de linhas (tbody/thead/tfoot); controla split e cellmap.


---

### area-login/vendor/dompdf/dompdf/src/FrameDecorator/Text.php
- Tipo: Classe PHP.
- Função: Decorator de texto; calcula dimensões, ajusta espaçamento e faz split por fonte/offset.


---

### area-login/vendor/dompdf/dompdf/src/FrameReflower
- Tipo: Pasta de reflow de frames (cálculo de layout).
- Conteúdo:
  - `AbstractFrameReflower.php`, `Block.php`, `Image.php`, `Inline.php`, `ListBullet.php`,
    `NullFrameReflower.php`, `Page.php`, `Table.php`, `TableCell.php`, `TableRow.php`,
    `TableRowGroup.php`, `Text.php`


---

### area-login/vendor/dompdf/dompdf/src/FrameReflower/AbstractFrameReflower.php
- Tipo: Classe PHP (base).
- Função: Base de reflow; resolve content, margens, posicionamento e min/max widths.


---

### area-login/vendor/dompdf/dompdf/src/FrameReflower/Block.php
- Tipo: Classe PHP.
- Função: Reflow de blocos; calcula larguras/alturas, alinha texto e processa floats/clear.


---

### area-login/vendor/dompdf/dompdf/src/FrameReflower/Image.php
- Tipo: Classe PHP.
- Função: Reflow de imagem; resolve dimensões com constraints e margens para elementos substituídos.


---

### area-login/vendor/dompdf/dompdf/src/FrameReflower/Inline.php
- Tipo: Classe PHP.
- Função: Reflow de inline; trata quebras de linha, elementos vazios e margens automáticas.


---

### area-login/vendor/dompdf/dompdf/src/FrameReflower/ListBullet.php
- Tipo: Classe PHP.
- Função: Reflow de marcadores de lista; posiciona inside/outside conforme estilo.


---

### area-login/vendor/dompdf/dompdf/src/FrameReflower/NullFrameReflower.php
- Tipo: Classe PHP.
- Função: Reflower nulo (sem layout).


---

### area-login/vendor/dompdf/dompdf/src/FrameReflower/Page.php
- Tipo: Classe PHP.
- Função: Reflow de página; aplica estilos por página, renderiza e dispara callbacks.


---

### area-login/vendor/dompdf/dompdf/src/FrameReflower/Table.php
- Tipo: Classe PHP.
- Função: Reflow de tabelas; calcula larguras por coluna, normaliza e controla splits.


---

### area-login/vendor/dompdf/dompdf/src/FrameReflower/TableCell.php
- Tipo: Classe PHP.
- Função: Reflow de célula; calcula alturas, alinha conteúdo e atualiza cellmap.


---

### area-login/vendor/dompdf/dompdf/src/FrameReflower/TableRow.php
- Tipo: Classe PHP.
- Função: Reflow de linha de tabela; posiciona células e aplica dimensões do cellmap.


---

### area-login/vendor/dompdf/dompdf/src/FrameReflower/TableRowGroup.php
- Tipo: Classe PHP.
- Função: Reflow de grupos de linhas (tbody/thead/tfoot); aplica dimensões do cellmap.


---

### area-login/vendor/dompdf/dompdf/src/FrameReflower/Text.php
- Tipo: Classe PHP.
- Função: Reflow de texto; quebra linhas, aplica white-space/transform e calcula min/max widths.


---

### area-login/vendor/dompdf/dompdf/src/Image
- Tipo: Pasta de cache/resolução de imagens.
- Conteúdo: `Cache.php`


---

### area-login/vendor/dompdf/dompdf/src/Image/Cache.php
- Tipo: Classe PHP (estática).
- Função: Resolve URLs de imagens, baixa/cacha temporários e trata imagens quebradas/SVG.


---

### area-login/vendor/dompdf/dompdf/src/Positioner
- Tipo: Pasta de posicionadores (estratégias de posicionamento).
- Conteúdo:
  - `Absolute.php`, `AbstractPositioner.php`, `Block.php`, `Fixed.php`, `Inline.php`,
    `ListBullet.php`, `NullPositioner.php`, `TableCell.php`, `TableRow.php`


---

### area-login/vendor/dompdf/dompdf/src/Positioner/Absolute.php
- Tipo: Classe PHP.
- Função: Posiciona elementos `absolute` (blocos e lógica legada para imagem/tabela).


---

### area-login/vendor/dompdf/dompdf/src/Positioner/AbstractPositioner.php
- Tipo: Classe PHP (base).
- Função: Interface de posicionamento e utilitário de move recursivo.


---

### area-login/vendor/dompdf/dompdf/src/Positioner/Block.php
- Tipo: Classe PHP.
- Função: Posiciona blocos no fluxo, avançando linha conforme float.


---

### area-login/vendor/dompdf/dompdf/src/Positioner/Fixed.php
- Tipo: Classe PHP.
- Função: Posiciona elementos `fixed` (herda de absolute, com lógica legada para imagem/tabela).


---

### area-login/vendor/dompdf/dompdf/src/Positioner/Inline.php
- Tipo: Classe PHP.
- Função: Posiciona inline/inline-block verificando largura disponível na linha.


---

### area-login/vendor/dompdf/dompdf/src/Positioner/ListBullet.php
- Tipo: Classe PHP.
- Função: Posiciona marcadores de lista à esquerda do bloco pai.


---

### area-login/vendor/dompdf/dompdf/src/Positioner/NullPositioner.php
- Tipo: Classe PHP.
- Função: Posicionador nulo (sem ação).


---

### area-login/vendor/dompdf/dompdf/src/Positioner/TableCell.php
- Tipo: Classe PHP.
- Função: Posiciona células usando posições do cellmap.


---

### area-login/vendor/dompdf/dompdf/src/Positioner/TableRow.php
- Tipo: Classe PHP.
- Função: Posiciona linhas de tabela considerando a linha anterior.


---

### area-login/vendor/dompdf/dompdf/src/Renderer
- Tipo: Pasta de renderização (desenho em canvas/PDF).
- Conteúdo:
  - `AbstractRenderer.php`, `Block.php`, `Image.php`, `Inline.php`, `ListBullet.php`,
    `TableCell.php`, `TableRow.php`, `TableRowGroup.php`, `Text.php`


---

### area-login/vendor/dompdf/dompdf/src/Renderer/AbstractRenderer.php
- Tipo: Classe PHP (base).
- Função: Base de render; desenha fundos, bordas, outlines e links no canvas.


---

### area-login/vendor/dompdf/dompdf/src/Renderer/Block.php
- Tipo: Classe PHP.
- Função: Renderiza blocos; desenha fundo/borda/outline e links, com debug opcional.


---

### area-login/vendor/dompdf/dompdf/src/Renderer/Image.php
- Tipo: Classe PHP.
- Função: Renderiza imagens; desenha fundo/borda e o bitmap (ou texto alt).


---

### area-login/vendor/dompdf/dompdf/src/Renderer/Inline.php
- Tipo: Classe PHP.
- Função: Renderiza inline; calcula caixa agregada e desenha background/bordas.


---

### area-login/vendor/dompdf/dompdf/src/Renderer/ListBullet.php
- Tipo: Classe PHP.
- Função: Renderiza marcadores de lista (imagem, símbolo ou contador).


---

### area-login/vendor/dompdf/dompdf/src/Renderer/TableCell.php
- Tipo: Classe PHP.
- Função: Renderiza células de tabela, incluindo bordas colapsadas.


---

### area-login/vendor/dompdf/dompdf/src/Renderer/TableRow.php
- Tipo: Classe PHP.
- Função: Renderiza linha de tabela (outline e links).


---

### area-login/vendor/dompdf/dompdf/src/Renderer/TableRowGroup.php
- Tipo: Classe PHP.
- Função: Renderiza grupo de linhas de tabela (outline e links).


---

### area-login/vendor/dompdf/dompdf/src/Renderer/Text.php
- Tipo: Classe PHP.
- Função: Renderiza texto, incluindo decoração (underline/overline/line-through).


---

### area-login/vendor/autoload.php
- Tipo: Arquivo PHP (Composer autoload).
- Função: Inicializa autoloader do Composer e valida versão mínima do PHP.


---

### area-login/vendor/masterminds
- Tipo: Dependência Composer (vendor).
- Conteúdo: `html5/`


---

### area-login/vendor/masterminds/html5
- Tipo: Biblioteca HTML5 (parser/serializer).
- Conteúdo:
  - `bin/`, `src/`, `composer.json`, `CREDITS`, `LICENSE.txt`, `README.md`,
    `RELEASE.md`, `UPGRADING.md`


---

### area-login/vendor/masterminds/html5/composer.json
- Tipo: Manifesto Composer.
- Função: Define pacote `masterminds/html5`, requisitos e autoload PSR-4.


---

### area-login/vendor/masterminds/html5/CREDITS
- Tipo: Lista de créditos.
- Função: Autores e colaboradores da biblioteca.


---

### area-login/vendor/masterminds/html5/LICENSE.txt
- Tipo: Licença (MIT + atribuições).
- Função: Termos de uso da biblioteca HTML5-PHP e referência ao html5lib.


---

### area-login/vendor/masterminds/html5/README.md
- Tipo: Documentação.
- Função: Descreve recursos, instalação, APIs (alto/baixo nível) e limitações do parser HTML5-PHP.


---

### area-login/vendor/masterminds/html5/RELEASE.md
- Tipo: Changelog.
- Função: Histórico de versões e mudanças do HTML5-PHP.


---

### area-login/vendor/masterminds/html5/UPGRADING.md
- Tipo: Instruções de upgrade.
- Função: Passos para migrar da versão 1.x para 2.x.


---

### area-login/vendor/masterminds/html5/bin
- Tipo: Pasta de utilitários.
- Conteúdo: `entities.php`


---

### area-login/vendor/masterminds/html5/bin/entities.php
- Tipo: Script PHP.
- Função: Gera a tabela de entidades a partir do `entities.json` oficial do HTML5.


---

### area-login/vendor/masterminds/html5/src
- Tipo: Código-fonte da biblioteca.
- Conteúdo: `HTML5/`, `HTML5.php`


---

### area-login/vendor/masterminds/html5/src/HTML5.php
- Tipo: Classe PHP (API principal).
- Função: Carrega, parseia e serializa HTML5 usando DOMTreeBuilder/Tokenizer.


---

### area-login/vendor/masterminds/html5/src/HTML5
- Tipo: Módulos internos do parser/serializer.
- Conteúdo:
  - `Parser/`, `Serializer/`, `Elements.php`, `Entities.php`, `Exception.php`, `InstructionProcessor.php`


---

### area-login/vendor/masterminds/html5/src/HTML5/Elements.php
- Tipo: Classe PHP.
- Função: Define catálogo de elementos HTML5/MathML/SVG e regras de normalização.


---

### area-login/vendor/masterminds/html5/src/HTML5/Entities.php
- Tipo: Classe PHP (gerada).
- Função: Tabela de entidades HTML5 (`$byName`).


---

### area-login/vendor/masterminds/html5/src/HTML5/Exception.php
- Tipo: Classe PHP.
- Função: Exceção base da biblioteca HTML5.


---

### area-login/vendor/masterminds/html5/src/HTML5/InstructionProcessor.php
- Tipo: Interface PHP.
- Função: Define processador de instruções de processamento (PI) no parser.


---

### area-login/vendor/masterminds/html5/src/HTML5/Parser
- Tipo: Parser HTML5 (núcleo).
- Conteúdo:
  - `CharacterReference.php`, `DOMTreeBuilder.php`, `EventHandler.php`, `FileInputStream.php`,
    `InputStream.php`, `ParseError.php`, `README.md`, `Scanner.php`, `StringInputStream.php`,
    `Tokenizer.php`, `TreeBuildingRules.php`, `UTF8Utils.php`


---

### area-login/vendor/masterminds/html5/src/HTML5/Parser/CharacterReference.php
- Tipo: Classe PHP.
- Função: Resolve entidades e referências numéricas para UTF-8.


---

### area-login/vendor/masterminds/html5/src/HTML5/Parser/DOMTreeBuilder.php
- Tipo: Classe PHP.
- Função: Constrói a DOM aplicando regras HTML5, namespaces e autoclose.


---

### area-login/vendor/masterminds/html5/src/HTML5/Parser/EventHandler.php
- Tipo: Interface PHP.
- Função: Define eventos SAX-like do parser (doctype, tags, text, etc.).


---

### area-login/vendor/masterminds/html5/src/HTML5/Parser/FileInputStream.php
- Tipo: Classe PHP.
- Função: Input stream de arquivo (deprecated; usa StringInputStream).


---

### area-login/vendor/masterminds/html5/src/HTML5/Parser/InputStream.php
- Tipo: Interface PHP.
- Função: Contrato de streams do parser (deprecated; substituído por Scanner).


---

### area-login/vendor/masterminds/html5/src/HTML5/Parser/ParseError.php
- Tipo: Classe PHP.
- Função: Exceção para erros de parsing.


---

### area-login/vendor/masterminds/html5/src/HTML5/Parser/README.md
- Tipo: Documentação.
- Função: Explica o fluxo do parser (InputStream → Scanner → Tokenizer → TreeBuilder → DOM).


---

### area-login/vendor/masterminds/html5/src/HTML5/Parser/Scanner.php
- Tipo: Classe PHP.
- Função: Scanner de caracteres; fornece utilitários de leitura/posição e normaliza linefeeds.


---

### area-login/vendor/masterminds/html5/src/HTML5/Parser/StringInputStream.php
- Tipo: Classe PHP.
- Função: Input stream por string (deprecated; contém utilitários de leitura).


---

### area-login/vendor/masterminds/html5/src/HTML5/Parser/Tokenizer.php
- Tipo: Classe PHP.
- Função: Tokenizer HTML5; consome scanner e emite eventos com estados de texto.


---

### area-login/vendor/masterminds/html5/src/HTML5/Parser/TreeBuildingRules.php
- Tipo: Classe PHP.
- Função: Regras especiais de construção da árvore (li, dt/dd, table, etc.).


---

### area-login/vendor/masterminds/html5/src/HTML5/Parser/UTF8Utils.php
- Tipo: Classe PHP.
- Função: Utilitários UTF-8 (conversão, contagem e validação de codepoints).


---

### area-login/vendor/masterminds/html5/src/HTML5/Serializer
- Tipo: Serialização HTML5.
- Conteúdo: `HTML5Entities.php`, `OutputRules.php`, `README.md`, `RulesInterface.php`, `Traverser.php`


---

### area-login/vendor/masterminds/html5/src/HTML5/Serializer/HTML5Entities.php
- Tipo: Classe PHP.
- Função: Mapa de entidades HTML5 para serialização (fallback para PHP antigos).


---

### area-login/vendor/masterminds/html5/src/HTML5/Serializer/OutputRules.php
- Tipo: Classe PHP.
- Função: Regras de serialização (tags, namespaces, atributos e escaping).


---

### area-login/vendor/masterminds/html5/src/HTML5/Serializer/README.md
- Tipo: Documentação.
- Função: Descreve o fluxo de serialização (Traverser → Rules → HTML5).


---

### area-login/vendor/masterminds/html5/src/HTML5/Serializer/RulesInterface.php
- Tipo: Interface PHP.
- Função: Contrato para regras de serialização (document/element/text/etc).


---

### area-login/vendor/masterminds/html5/src/HTML5/Serializer/Traverser.php
- Tipo: Classe PHP.
- Função: Percorre DOM e delega serialização às regras.


---

### area-login/vendor/sabberworm
- Tipo: Dependência Composer (vendor).
- Conteúdo: `php-css-parser/`


---

### area-login/vendor/sabberworm/php-css-parser
- Tipo: Biblioteca de parse CSS.
- Conteúdo: `src/`, `CHANGELOG.md`, `composer.json`, `LICENSE`, `README.md`


---

### area-login/vendor/sabberworm/php-css-parser/CHANGELOG.md
- Tipo: Changelog.
- Função: Histórico de versões e mudanças do parser CSS.


---

### area-login/vendor/sabberworm/php-css-parser/composer.json
- Tipo: Manifesto Composer.
- Função: Define pacote, requisitos PHP e autoload PSR-4 do parser CSS.


---

### area-login/vendor/sabberworm/php-css-parser/LICENSE
- Tipo: Licença MIT.
- Função: Termos de uso do parser CSS.


---

### area-login/vendor/sabberworm/php-css-parser/README.md
- Tipo: Documentação.
- Função: Guia de uso do parser CSS, opções, manipulação e exemplos.

---

### area-login/area-login.zip
- Tipo: Arquivo compactado.
- Funcao: Arquivo do modulo admin..


---

### area-login/assets.zip
- Tipo: Arquivo compactado.
- Funcao: Gera PDF (Dompdf); Envia email (PHPMailer); Tabela com DataTables.
- Tabelas/queries: allPK.
- Pontos de atencao:
  - Uso de pasta uploads


---

### area-login/content-grid-system.html
- Tipo: Template HTML.
- Funcao: Tabela com DataTables.


---

### area-login/content-text-utilities.html
- Tipo: Template HTML.
- Funcao: Tabela com DataTables.


---

### area-login/content-typography.html
- Tipo: Template HTML.
- Funcao: Tabela com DataTables.


---

### area-login/download_documentos_colaborador.php
- Tipo: Script/Handler PHP.
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: colaborador_documento.
- Pontos de atencao:
  - Entrada de usuario via POST/GET
  - Uso de pasta uploads


---

### area-login/ecommerce-add-new-products.html
- Tipo: Template HTML.
- Funcao: Tabela com DataTables.


---

### area-login/ecommerce-orders.html
- Tipo: Template HTML.
- Funcao: Tabela com DataTables.


---

### area-login/ecommerce-products.html
- Tipo: Template HTML.
- Funcao: Tabela com DataTables.


---

### area-login/ecommerce-products-details.html
- Tipo: Template HTML.
- Funcao: Tabela com DataTables.
- Tabelas/queries: the.


---

### area-login/editar_candidato.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables.
- Tabelas/queries: candidato.
- Pontos de atencao:
  - Entrada de usuario via POST/GET
  - Uso de pasta uploads
  - Encoding possivelmente quebrado


---

### area-login/editar_cliente.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables.
- Tabelas/queries: clientes.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET
  - Encoding possivelmente quebrado


---

### area-login/editar_colaborador.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Upload de arquivo; Tabela com DataTables; Gera hash de senha.
- Tabelas/queries: colaborador, tipo_contrato, vv_usuario.
- Pontos de atencao:
  - Entrada de usuario via POST/GET
  - Uso de pasta uploads
  - Encoding possivelmente quebrado


---

### area-login/editar_contrato.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables; Consulta CEP (ViaCEP).
- Tabelas/queries: contratos.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET
  - Uso de pasta uploads
  - Encoding possivelmente quebrado


---

### area-login/editar_vaga.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables.
- Tabelas/queries: area_setor, HTML, modalidade, tipo_contratacao, tipo_contrato, vaga, vaga_campos.
- Pontos de atencao:
  - Entrada de usuario via POST/GET
  - Encoding possivelmente quebrado


---

### area-login/email_confirmacao.php
- Tipo: Script/Handler PHP.
- Funcao: Envia email (PHPMailer).
- Tabelas/queries: lojas, pedidos.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET
  - Encoding possivelmente quebrado


---

### area-login/envia_anamnese.php
- Tipo: Script/Handler PHP.
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: rel_anamnese_cliente, respostas_anamnese.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET


---

### area-login/envia_anamnese_cliente.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Envia email (PHPMailer).
- Pontos de atencao:
  - Entrada de usuario via POST/GET
  - Verificar credenciais SMTP no codigo
  - Encoding possivelmente quebrado


---

### area-login/envia_feedback_cliente.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Envia email (PHPMailer).
- Tabelas/queries: cliente, feedbacks_plano.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET
  - Verificar credenciais SMTP no codigo
  - Encoding possivelmente quebrado


---

### area-login/error_log
- Tipo: Arquivo.
- Funcao: Arquivo do modulo admin..


---

### area-login/error_log_old
- Tipo: Arquivo.
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: responsa.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)


---

### area-login/error-blank-page.html
- Tipo: Template HTML.
- Funcao: Tabela com DataTables.


---

### area-login/errors-404-error.html
- Tipo: Template HTML.
- Funcao: Arquivo do modulo admin..
- Pontos de atencao:
  - Uso de pasta uploads


---

### area-login/errors-500-error.html
- Tipo: Template HTML.
- Funcao: Arquivo do modulo admin..


---

### area-login/errors-coming-soon.html
- Tipo: Template HTML.
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: when.


---

### area-login/estrutura.html
- Tipo: Template HTML.
- Funcao: Arquivo do modulo admin..


---

### area-login/eventos.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables; Consulta CEP (ViaCEP).
- Tabelas/queries: checklist_opcoes, colaboradores, contratos, eventos, forma_pagamento.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Encoding possivelmente quebrado


---

### area-login/eventos_.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables; Consulta CEP (ViaCEP).
- Tabelas/queries: colaboradores, contratos, eventos.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Encoding possivelmente quebrado


---

### area-login/excluir_arquivo.php
- Tipo: Script/Handler PHP.
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: arquivo_sessao.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET


---

### area-login/excluir_cliente.php
- Tipo: Script/Handler PHP.
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: clientes.
- Pontos de atencao:
  - Entrada de usuario via POST/GET


---

### area-login/excluir_colaborador.php
- Tipo: Script/Handler PHP.
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: colaboradores.
- Pontos de atencao:
  - Entrada de usuario via POST/GET


---

### area-login/excluir_contrato.php
- Tipo: Script/Handler PHP.
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: contratos.
- Pontos de atencao:
  - Entrada de usuario via POST/GET


---

### area-login/excluir_contrato_evento.php
- Tipo: Script/Handler PHP.
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: contratos_evento.
- Pontos de atencao:
  - Entrada de usuario via POST/GET


---

### area-login/excluir_disciplina.php
- Tipo: Script/Handler PHP.
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: disciplina.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET


---

### area-login/feedback_leitura.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: respostas_anamnese.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET
  - Encoding possivelmente quebrado


---

### area-login/folha_ponto.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables.
- Tabelas/queries: colaborador, folha_ponto_colaborador.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET
  - Encoding possivelmente quebrado


---

### area-login/folha_ponto_rh.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables.
- Tabelas/queries: folha_ponto_colaborador.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET
  - Encoding possivelmente quebrado


---

### area-login/form_didatica_pdf.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Gera PDF (Dompdf).
- Tabelas/queries: cliente, sequencia_didatica, the, valores.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET
  - Uso de pasta uploads
  - Encoding possivelmente quebrado


---

### area-login/form-elements.html
- Tipo: Template HTML.
- Funcao: Tabela com DataTables.


---

### area-login/form-file-upload.html
- Tipo: Template HTML.
- Funcao: Tabela com DataTables.


---

### area-login/form-input-group.html
- Tipo: Template HTML.
- Funcao: Tabela com DataTables.


---

### area-login/form-layouts - Copia.html
- Tipo: Template HTML.
- Funcao: Tabela com DataTables.


---

### area-login/form-layouts.html
- Tipo: Template HTML.
- Funcao: Tabela com DataTables.


---

### area-login/form-select2.html
- Tipo: Template HTML.
- Funcao: Tabela com DataTables.


---

### area-login/form-text-editor.html
- Tipo: Template HTML.
- Funcao: Tabela com DataTables.


---

### area-login/formulario_aula.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables.
- Tabelas/queries: cliente, plano_aula, valores.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Encoding possivelmente quebrado


---

### area-login/formulario_estudante.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables.
- Tabelas/queries: valores.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Encoding possivelmente quebrado


---

### area-login/formulario_institucional.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables.
- Tabelas/queries: cadastro_institucional, valores.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Encoding possivelmente quebrado


---

### area-login/formulario_p.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables.
- Pontos de atencao:
  - Encoding possivelmente quebrado


---

### area-login/formulario_pei.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables.
- Tabelas/queries: valores.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Encoding possivelmente quebrado


---

### area-login/formulario_pip.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables.
- Tabelas/queries: valores.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Encoding possivelmente quebrado


---

### area-login/formulario_projetos.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables.
- Tabelas/queries: valores.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Encoding possivelmente quebrado


---

### area-login/formulario_turmas.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables.
- Tabelas/queries: valores.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Encoding possivelmente quebrado


---

### area-login/formulario_usuario.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables.
- Tabelas/queries: valores.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Encoding possivelmente quebrado


---

### area-login/formularios.pdf
- Tipo: Documento PDF.
- Funcao: Gera PDF (Dompdf).
- Pontos de atencao:
  - Entrada de usuario via POST/GET
  - Encoding possivelmente quebrado


---

### area-login/form-validations.html
- Tipo: Template HTML.
- Funcao: Tabela com DataTables.


---

### area-login/form-wizard.html
- Tipo: Template HTML.
- Funcao: Tabela com DataTables.
- Tabelas/queries: electronic.


---

### area-login/gerar_contrato.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Gera PDF (Dompdf).
- Tabelas/queries: checklist_opcoes, contratos_evento, eventos, forma_pagamento, opcionais_evento.
- Pontos de atencao:
  - Entrada de usuario via POST/GET
  - Uso de pasta uploads
  - Encoding possivelmente quebrado


---

### area-login/get_opcionais_by_contrato.php
- Tipo: Script/Handler PHP.
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: contrato_opcionais.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET


---

### area-login/header.php
- Tipo: Script/Handler PHP.
- Funcao: Arquivo do modulo admin..


---

### area-login/holerites.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables.
- Tabelas/queries: colaborador, colaborador_documento.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET
  - Uso de pasta uploads
  - Encoding possivelmente quebrado


---

### area-login/imprimir_boletim_2023_old.php
- Tipo: Script/Handler PHP.
- Funcao: Gera PDF (Dompdf).
- Tabelas/queries: alunos, avaliacao, disciplina, rel_turma_aluno, turmas.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET
  - Encoding possivelmente quebrado


---

### area-login/index.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Arquivo do modulo admin..


---

### area-login/index_area.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables.
- Pontos de atencao:
  - Encoding possivelmente quebrado


---

### area-login/lib_vendor.php
- Tipo: Script/Handler PHP.
- Funcao: Arquivo do modulo admin..


---

### area-login/login_usuario.php
- Tipo: Script/Handler PHP.
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: vv_usuario.
- Pontos de atencao:
  - Entrada de usuario via POST/GET


---

### area-login/logo-icon.jpg
- Tipo: Arquivo.
- Funcao: Arquivo do modulo admin..


---

### area-login/logo-icon.png
- Tipo: Arquivo.
- Funcao: Arquivo do modulo admin..


---

### area-login/mail_config.php
- Tipo: Script/Handler PHP.
- Funcao: Arquivo do modulo admin..
- Pontos de atencao:
  - Verificar credenciais SMTP no codigo


---

### area-login/map-google-maps.html
- Tipo: Template HTML.
- Funcao: Tabela com DataTables.


---

### area-login/map-vector-maps.html
- Tipo: Template HTML.
- Funcao: Tabela com DataTables.


---

### area-login/meus_documentos.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables.
- Tabelas/queries: colaborador, colaborador_documento.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET
  - Uso de pasta uploads
  - Encoding possivelmente quebrado


---

### area-login/orcamento.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables.
- Pontos de atencao:
  - Encoding possivelmente quebrado


---

### area-login/pacotes.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables.
- Pontos de atencao:
  - Encoding possivelmente quebrado


---

### area-login/pag.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables.
- Pontos de atencao:
  - Encoding possivelmente quebrado


---

### area-login/pedidos.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables.
- Pontos de atencao:
  - Encoding possivelmente quebrado


---

### area-login/pei_pdf.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Gera PDF (Dompdf).
- Tabelas/queries: cliente, valores.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET
  - Encoding possivelmente quebrado


---

### area-login/perfil_cliente.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables.
- Tabelas/queries: cliente, valores.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Uso de pasta uploads
  - Encoding possivelmente quebrado


---

### area-login/perfil_cliente_old.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: cliente, sessoes.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET
  - Uso de pasta uploads
  - Encoding possivelmente quebrado


---

### area-login/perfil_sessao.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: arquivo_sessao, docs_alunos, sessoes.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET
  - Uso de pasta uploads
  - Encoding possivelmente quebrado


---

### area-login/perfil_usuario.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: candidato, colaborador, vv_usuario.
- Pontos de atencao:
  - Entrada de usuario via POST/GET
  - Encoding possivelmente quebrado


---

### area-login/pets_lista.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: especie_pet, pet.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Uso de pasta uploads
  - Encoding possivelmente quebrado


---

### area-login/salvar_colaborador.php
- Tipo: Script/Handler PHP.
- Funcao: Envia email (PHPMailer); Upload de arquivo; Gera hash de senha.
- Tabelas/queries: colaborador, vv_usuario.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET
  - Verificar credenciais SMTP no codigo
  - Uso de pasta uploads
  - Encoding possivelmente quebrado


---

### area-login/salvar_contrato.php
- Tipo: Script/Handler PHP.
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: contratos.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET


---

### area-login/salvar_documento_colaborador.php
- Tipo: Script/Handler PHP.
- Funcao: Upload de arquivo.
- Tabelas/queries: colaborador, colaborador_documento, status_documento.
- Pontos de atencao:
  - Entrada de usuario via POST/GET
  - Uso de pasta uploads


---

### area-login/salvar_edicao_colaborador.php
- Tipo: Script/Handler PHP.
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: colaboradores.
- Pontos de atencao:
  - Entrada de usuario via POST/GET


---

### area-login/salvar_edicao_evento.php
- Tipo: Script/Handler PHP.
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: checklist_evento, clientes, eventos, opcionais_evento.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET


---

### area-login/salvar_evento.php
- Tipo: Script/Handler PHP.
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: checklist_evento, clientes, eventos, opcionais_evento.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET


---

### area-login/salvar_solicitacao_documento.php
- Tipo: Script/Handler PHP.
- Funcao: Envia email (PHPMailer); Upload de arquivo.
- Tabelas/queries: colaborador, colaborador_documento.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET
  - Verificar credenciais SMTP no codigo
  - Uso de pasta uploads
  - Encoding possivelmente quebrado


---

### area-login/seg_usuario.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: usuario_adm.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET
  - Encoding possivelmente quebrado


---

### area-login/sessao.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: docs_alunos.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET
  - Uso de pasta uploads
  - Encoding possivelmente quebrado


---

### area-login/sessao_cliente.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: docs_alunos.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET
  - Uso de pasta uploads
  - Encoding possivelmente quebrado


---

### area-login/sessoes.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: cliente.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Encoding possivelmente quebrado


---

### area-login/sidebar - Copia.php
- Tipo: Script/Handler PHP.
- Funcao: Arquivo do modulo admin..


---

### area-login/sidebar.php
- Tipo: Script/Handler PHP.
- Funcao: Arquivo do modulo admin..


---

### area-login/solicitacoes.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Arquivo do modulo admin..
- Pontos de atencao:
  - Encoding possivelmente quebrado


---

### area-login/table-basic-table.html
- Tipo: Template HTML.
- Funcao: Tabela com DataTables.


---

### area-login/table-datatable.html
- Tipo: Template HTML.
- Funcao: Tabela com DataTables.


---

### area-login/teste.html
- Tipo: Template HTML.
- Funcao: Arquivo do modulo admin..


---

### area-login/teste_contrato.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Pagina de teste para edicao/criacao de evento/contrato com editor rich-text (TinyMCE).
- Estrutura:
  - Inclui `verifica.php`, `sidebar.php`, `header.php`.
  - Editor TinyMCE com upload de imagens via `upload.php`.
  - Scripts para busca de cliente (AJAX em `buscar_cliente.php`) e auto-preenchimento de endereco via ViaCEP.
- Dependencias:
  - CDN TinyMCE e `jquery.mask`.
  - DataTables e assets do admin (`assets/*`).
- Pontos de atencao:
  - Muitos campos referenciados nos JS nao existem no HTML exibido (pagina parece parcial/incompleta).
  - Chaves e textos com encoding quebrado.
  - Usa APIs externas (ViaCEP) e upload de imagem sem validacoes aparentes.


---

### area-login/teste2.html
- Tipo: Snippet HTML.
- Funcao: Exemplo de tabela de pedidos (mock), com badges de status e acoes (editar/excluir).
- Observacoes:
  - Nao possui estrutura HTML completa (apenas o bloco de tabela).
  - Conteudo e datas sao exemplos fixos.


---

### area-login/teste3.html
- Tipo: Snippet HTML.
- Funcao: Exemplo de tabela de clientes (mock), com links de WhatsApp e email, e botao "Ver Detalhes".
- Observacoes:
  - Nao possui estrutura HTML completa (apenas o bloco de tabela).
  - Conteudo e contatos sao exemplos fixos.


---

### area-login/timeline.html
- Tipo: Template HTML completo (admin).
- Funcao: Pagina de timeline (exemplos 1 e 2) do tema administrativo "Rukada".
- Estrutura:
  - Sidebar e header estaticos (nao usa `sidebar.php`/`header.php`).
  - Conteudo com exemplos de timeline e dados mock.
  - Switcher de tema (light/dark/semi-dark) do template.
- Dependencias:
  - Assets do admin (`assets/*`), Bootstrap, jQuery, Simplebar, MetisMenu.
- Pontos de atencao:
  - Conteudo e links sao do template original (nao do negocio).
  - Acentos com encoding quebrado no footer.


---

### area-login/upload.php
- Tipo: Script/Handler PHP.
- Funcao: Upload de imagens para TinyMCE (retorna JSON com `location`).
- Upload:
  - Pasta destino: `area-login/uploads/` (cria se nao existir).
  - Usa nome original do arquivo.
- Pontos de atencao:
  - Sem validacao de tipo/tamanho.
  - Possivel sobrescrita de arquivo com mesmo nome.
  - Pasta `uploads` deve permanecer ignorada (conforme instrucoes).


---

### area-login/user-profile.html
- Tipo: Template HTML.
- Funcao: Tabela com DataTables.


---

### area-login/usuarios_adm.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables.
- Tabelas/queries: vv_usuario.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Encoding possivelmente quebrado


---

### area-login/vagas.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Tabela com DataTables.
- Tabelas/queries: area_setor, modalidade, tipo_contratacao, tipo_contrato, vaga, vaga_candidatura.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Encoding possivelmente quebrado


---

### area-login/valida_usuario.php
- Tipo: Script/Handler PHP.
- Funcao: Usa MD5.
- Tabelas/queries: usuarios.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET


---

### area-login/verifica.php
- Tipo: Script/Handler PHP.
- Funcao: Arquivo do modulo admin..


---

### area-login/visualizar_contrato.php
- Tipo: Pagina (PHP + HTML).
- Funcao: Arquivo do modulo admin..
- Tabelas/queries: checklist_evento, eventos, opcionais_evento.
- Pontos de atencao:
  - SQL montado manualmente (sem prepared statements)
  - Entrada de usuario via POST/GET
  - Encoding possivelmente quebrado


---

### area-login/widgets.html
- Tipo: Template HTML completo (admin).
- Funcao: Pagina de widgets (cards, graficos, estatisticas) do tema administrativo "Rukada".
- Estrutura:
  - Sidebar e header estaticos (nao usa `sidebar.php`/`header.php`).
  - Diversos cards e widgets com dados mock.
  - Switcher de tema (light/dark/semi-dark) do template.
- Dependencias:
  - Assets do admin (`assets/*`), Bootstrap, jQuery, Simplebar, MetisMenu.
  - Graficos/metrics: ApexCharts, Sparkline, Peity, `assets/js/widgets.js`.
- Pontos de atencao:
  - Conteudo e links sao do template original (nao do negocio).
  - Acentos com encoding quebrado no footer.


---

### css/about.css
- Tipo: Folha de estilo (CSS).
- Funcao: Estilos da pagina "About" (boxes, features, carrossel).
- Principais classes:
  - `.box_about`, `.box_feat`, `.content_general_row`, `.carousel_centered`.
- Dependencias:
  - Usa `owl-carousel` (classes `.owl-item`) para carrossel.


---

### css/account.css
- Tipo: Folha de estilo (CSS).
- Funcao: Estilos da pagina de conta/login/cadastro.
- Principais classes:
  - `.box_account`, `.form_container`, `#forgot_pw`.
- Dependencias:
  - Referencia imagens em `img/` (`user.svg`, `new_user.svg`).


---

### css/ajax-loader.gif
- Tipo: Imagem (GIF).
- Funcao: Indicador de carregamento (spinner).
- Observacao: Arquivo binario, nao inspecionado.


---

### css/blog.css
- Tipo: Folha de estilo (CSS).
- Funcao: Estilos do blog (cards, sidebar, comentarios, tags).
- Principais classes:
  - `article.blog`, `.post_info`, `.comments-list`, `.widget`, `.tags`, `.singlepost`.


---

### css/bootstrap.css
- Tipo: Biblioteca CSS (Bootstrap).
- Versao: Bootstrap v5.2.2 (MIT).
- Observacao: Arquivo vendor padrao.


---

### css/bootstrap.min.css
- Tipo: Biblioteca CSS (Bootstrap, minificado).
- Versao: Bootstrap v5.2.2 (MIT).
- Observacao: Versao minificada do `bootstrap.css`.


---

### css/cart.css
- Tipo: Folha de estilo (CSS).
- Funcao: Estilos da pagina de carrinho (tabela de itens, resumo).
- Principais classes:
  - `.table.cart-list`, `.thumb_cart`, `.item_cart`, `.box_cart`.


---

### css/checkout.css
- Tipo: Folha de estilo (CSS).
- Funcao: Estilos da pagina de checkout (tabs, passos, pagamentos).
- Principais classes:
  - `.nav-tabs`, `.step`, `.payments`, `.box_general.summary`, `#confirm`.


---

### css/contact.css
- Tipo: Folha de estilo (CSS).
- Funcao: Estilos da pagina de contato (cards e mapa).
- Principais classes:
  - `.box_contacts`, `iframe.map_contact`.


---

### css/custom.css
- Tipo: Folha de estilo (CSS).
- Funcao: Arquivo reservado para estilos customizados.
- Observacao: Atualmente vazio (apenas cabecalho).


---

### css/error_track.css
- Tipo: Folha de estilo (CSS).
- Funcao: Estilos das paginas de erro e rastreio de pedido.
- Principais classes:
  - `#error_page`, `#track_order`, `.search_bar`.


---

### css/faq.css
- Tipo: Folha de estilo (CSS).
- Funcao: Estilos da pagina de FAQ (cards e listas de artigos).
- Principais classes:
  - `.box_topic`, `.box_topic_2`, `.list_articles`.


---

### css/fonts/fontello.eot
- Tipo: Fonte (EOT, binario).
- Funcao: Fonte de icones Fontello.


---

### css/fonts/fontello.svg
- Tipo: Fonte (SVG).
- Funcao: Fonte de icones Fontello (metadata indica fontello.com, 2018).


---

### css/fonts/fontello.ttf
- Tipo: Fonte (TTF, binario).
- Funcao: Fonte de icones Fontello.


---

### css/fonts/fontello.woff
- Tipo: Fonte (WOFF, binario).
- Funcao: Fonte de icones Fontello.


---

### css/fonts/fontello.woff2
- Tipo: Fonte (WOFF2, binario).
- Funcao: Fonte de icones Fontello.


---

### css/fonts/fontello_and_header_icons.html
- Tipo: HTML de referencia.
- Funcao: Pagina de demonstracao/listagem de icones (Fontello/headers).
- Observacao: Usa estilos embutidos e trechos antigos do Bootstrap (v2.2.1) apenas para demo.


---

### css/fonts/header_icons.eot
- Tipo: Fonte (EOT, binario).
- Funcao: Fonte de icones para headers.


---

### css/fonts/header_icons.svg
- Tipo: Fonte (SVG).
- Funcao: Fonte de icones para headers (metadata: "Generated by Glyphter").


---

### css/fonts/header_icons.ttf
- Tipo: Fonte (TTF, binario).
- Funcao: Fonte de icones para headers.


---

### css/fonts/header_icons.woff
- Tipo: Fonte (WOFF, binario).
- Funcao: Fonte de icones para headers.


---

### css/fonts/themify.eot
- Tipo: Fonte (EOT, binario).
- Funcao: Fonte de icones Themify.


---

### css/fonts/themify.svg
- Tipo: Fonte (SVG).
- Funcao: Fonte de icones Themify (metadata: Generated by IcoMoon).


---

### css/fonts/themify.ttf
- Tipo: Fonte (TTF, binario).
- Funcao: Fonte de icones Themify.


---

### css/fonts/themify.woff
- Tipo: Fonte (WOFF, binario).
- Funcao: Fonte de icones Themify.


---

### css/fonts/themify-class-reference.html
- Tipo: HTML de referencia.
- Funcao: Pagina simples com link para documentacao dos icones Themify.


---

### css/home_1.css
- Tipo: Folha de estilo (CSS).
- Funcao: Estilos da home (banners, categorias, video hero, destaques, news).
- Principais classes:
  - `#banners_grid`, `.categories_grid`, `.header-video`, `.featured`, `.box_news`.
- Dependencias:
  - Usa imagens em `img/` (ex.: `slides/slide_home_1.jpg`, `drag_icon.svg`).


---

### css/jquery.mmenu.all.css
- Tipo: Biblioteca CSS.
- Funcao: Estilos do plugin jQuery mmenu (menu mobile/off-canvas).


---

### css/leave_review.css
- Tipo: Folha de estilo (CSS).
- Funcao: Estilos da pagina de reviews/avaliacoes.
- Principais classes:
  - `.box_general.write_review`, `.rating`, `.fileupload`, `.latest_review`.
- Dependencias:
  - Usa imagens em `img/` (`stars.svg`, `camera.svg`).


---

### css/listing.css
- Tipo: Folha de estilo (CSS).
- Funcao: Estilos para paginas de listagem (toolbox, filtros, ordenacao).
- Principais classes:
  - `.toolbox`, `.sort_select` (usa icones Themify).


---

### css/product_page.css
- Tipo: Folha de estilo (CSS).
- Funcao: Estilos da pagina de produto (contador, carrossel com thumbs).
- Principais classes:
  - `.countdown_inner`, `.all .slider` / `.slider-two`.


---

### css/style.css
- Tipo: Folha de estilo (CSS) principal do tema.
- Tema: "Allaia v1.3" (Ansonika).
- Conteudo:
  - Estrutura geral do site, tipografia, botoes, navegacao, componentes.
  - Define `@font-face` para `header_icons` e inclui mixins/estilos de menu/hamburger.
- Dependencias:
  - Usa fontes em `css/fonts/*` (header_icons).


---

### js/bootstrap.bundle.js
- Tipo: Biblioteca JS (Bootstrap bundle).
- Versao: Bootstrap v5.2.2 (MIT).
- Observacao: Inclui Popper e modulos Bootstrap (arquivo nao minificado).


---

### js/bootstrap.bundle.min.js
- Tipo: Biblioteca JS (Bootstrap bundle, minificado).
- Versao: Bootstrap v5.2.2 (MIT).
- Observacao: Versao minificada do `bootstrap.bundle.js`.


---

### js/carousel_with_thumbs.js
- Tipo: Script JS.
- Funcao: Sincroniza carrossel principal com thumbs usando Owl Carousel.
- Dependencias:
  - jQuery e Owl Carousel (`.owlCarousel`).


---

### js/carousel-home.js
- Tipo: Script JS.
- Funcao: Inicializa carrossel da home (`#carousel-home`) com autoplay e animacoes.
- Dependencias:
  - jQuery e Owl Carousel.


---

### js/carousel-home.min.js
- Tipo: Script JS (minificado).
- Funcao: Versao minificada do `carousel-home.js`.


---

### js/carousel-home-2.js
- Tipo: Script JS.
- Funcao: Inicializa carrossel alternativo (`#carousel-home-2`) com itens centrados.
- Dependencias:
  - jQuery e Owl Carousel.


---

### js/common_scripts.js
- Tipo: Bundle JS (vendor).
- Conteudo:
  - jQuery v3.7.1.
  - Owl Carousel v2.3.4.
- Observacao: Arquivo nao minificado com bibliotecas agregadas.


---

### js/common_scripts.min.js
- Tipo: Bundle JS (vendor, minificado).
- Conteudo principal (minificado):
  - jQuery v3.7.1, Owl Carousel v2.3.4, WOW.js, Magnific Popup, LazyLoad, Bootstrap v5.2.2.


---

### js/footer-reveal.js
- Tipo: Plugin jQuery.
- Funcao: Fixa o rodape no fundo e ajusta margem do conteudo (efeito "footer reveal").
- Licenca: MIT (Iain Andrew, 2014).


---

### js/footer-reveal.min.js
- Tipo: Plugin jQuery (minificado).
- Funcao: Versao minificada do `footer-reveal.js`.


---

### js/isotope.min.js
- Tipo: Biblioteca JS (minificado).
- Versao: Isotope PACKAGED v2.2.2.
- Licenca: GPLv3 ou comercial.


---

### js/jquery.cookiebar.js
- Tipo: Plugin jQuery.
- Funcao: Barra de consentimento de cookies (configuravel).
- Licenca: Creative Commons Attribution 3.0 (PrimeBox, 2012).


---

### js/jquery.magnific-popup.js
- Tipo: Plugin jQuery.
- Versao: Magnific Popup v1.1.0 (2016-02-20).
- Funcao: Lightbox/modal para imagens, galerias e iframes.


---

### js/jquery.magnific-popup.min.js
- Tipo: Plugin jQuery (minificado).
- Funcao: Versao minificada do `jquery.magnific-popup.js`.


---

### js/jquery.mmenu.all.js
- Tipo: Biblioteca JS.
- Versao: jQuery mmenu v6.1.8.
- Funcao: Menu off-canvas/mobile.
- Licenca: CC-BY-NC-4.0 (uso nao comercial).


---

### js/jquery.nice-select.js
- Tipo: Plugin jQuery.
- Versao: Nice Select v1.1.0.
- Funcao: Estiliza elementos `<select>`.


---

### js/jquery.nice-select.min.js
- Tipo: Plugin jQuery (minificado).
- Versao: Nice Select v1.0 (minificado indica v1.0).
- Observacao: Versao minificada (a versao difere do arquivo nao minificado).


---

### js/jquery-3.7.1.min.js
- Tipo: Biblioteca JS (minificada).
- Versao: jQuery v3.7.1.


---

### js/lazyload.js
- Tipo: Biblioteca JS.
- Funcao: LazyLoad de imagens/iframes (usa IntersectionObserver).


---

### js/lazyload.min.js
- Tipo: Biblioteca JS (minificada).
- Funcao: Versao minificada do `lazyload.js`.


---

### js/main.js
- Tipo: Script JS (site).
- Funcao: Inicializa componentes do tema (menu, carrosseis, lazyload, tooltips, popups).
- Dependencias:
  - jQuery, Owl Carousel, mmenu, LazyLoad, NiceSelect, WOW, Magnific Popup, Bootstrap.


---

### js/modernizr.js
- Tipo: Biblioteca JS.
- Versao: Modernizr 2.7.1 (custom build).
- Funcao: Feature detection (video, touch, prefixes, etc.).


---

### js/owl.carousel.js
- Tipo: Biblioteca JS.
- Versao: Owl Carousel v2.3.4 (MIT).
- Funcao: Carrossel responsivo.


---

### js/owl.carousel.min.js
- Tipo: Biblioteca JS (minificada).
- Versao: Owl Carousel v2.3.4.
- Funcao: Versao minificada do `owl.carousel.js`.


---

### js/ResizeSensor.js
- Tipo: Biblioteca JS.
- Funcao: Detecta mudancas de dimensao em elementos (ResizeSensor).
- Origem: css-element-queries (marcj).


---

### js/ResizeSensor.min.js
- Tipo: Biblioteca JS (minificada).
- Funcao: Versao minificada do `ResizeSensor.js`.


---

### js/specific_listing.js
- Tipo: Script JS.
- Funcao: Comportamentos de listagem (sticky nav, sticky sidebar, filtros).
- Dependencias:
  - jQuery, Theia Sticky Sidebar.


---

### js/sticky_sidebar.min.js
- Tipo: Biblioteca JS (minificada).
- Funcao: Theia Sticky Sidebar + ResizeSensor (bundle minificado).


---

### js/theia-sticky-sidebar.js
- Tipo: Plugin jQuery.
- Versao: Theia Sticky Sidebar v1.7.0 (MIT).
- Funcao: Sidebar fixa durante scroll.


---

### js/theia-sticky-sidebar.min.js
- Tipo: Plugin jQuery (minificado).
- Funcao: Versao minificada do `theia-sticky-sidebar.js`.


---

### js/video_header.js
- Tipo: Script JS.
- Funcao: Video no header (teaser + player; Youtube/Vimeo/local).
- Dependencias:
  - jQuery, Modernizr.


---

### js/video_header.min.js
- Tipo: Script JS (minificado).
- Funcao: Versao minificada do `video_header.js`.


---

### js/wow.js
- Tipo: Biblioteca JS.
- Funcao: WOW.js (animacoes on-scroll).


---

### js/wow.min.js
- Tipo: Biblioteca JS (minificada).
- Versao: WOW v1.1.3 (2016-05-06).
- Funcao: Versao minificada do `wow.js`.


---

### PHPMailer/.editorconfig
- Tipo: Configuracao de editor.
- Funcao: Padroes de formatacao (UTF-8, 4 espacos, LF, etc.).


---

### PHPMailer/class.phpmailer.php
- Tipo: Biblioteca PHP.
- Funcao: PHPMailer (classe principal para envio de emails).
- Versao: 5.2.8 (legado).


---

### PHPMailer/class.smtp.php
- Tipo: Biblioteca PHP.
- Funcao: Cliente SMTP do PHPMailer.
- Versao: 5.2.8 (legado).


---

### PHPMailer/COMMITMENT
- Tipo: Documento de licenca.
- Funcao: GPL Cooperation Commitment (CC BY-SA 4.0).


---

### PHPMailer/composer.json
- Tipo: Manifesto Composer.
- Pacote: `phpmailer/phpmailer`.
- Requisitos: PHP >= 5.5, extensoes ctype/filter/hash.
- Observacao: Define autoload PSR-4 para `PHPMailer\\PHPMailer\\` em `src/`.


---

### PHPMailer/get_oauth_token.php
- Tipo: Script PHP (utilitario).
- Funcao: Fluxo para obter token OAuth2 (Google/Yahoo/Microsoft/Azure) para PHPMailer.
- Dependencias: Composer + providers OAuth2 (League).


---

### PHPMailer/language/
- Tipo: Conjunto de arquivos de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer (mensagens e erros).
- Arquivos:
  - `phpmailer.lang-af.php`, `phpmailer.lang-ar.php`, `phpmailer.lang-as.php`, `phpmailer.lang-az.php`, `phpmailer.lang-ba.php`,
    `phpmailer.lang-be.php`, `phpmailer.lang-bg.php`, `phpmailer.lang-bn.php`, `phpmailer.lang-ca.php`, `phpmailer.lang-cs.php`,
    `phpmailer.lang-da.php`, `phpmailer.lang-de.php`, `phpmailer.lang-el.php`, `phpmailer.lang-eo.php`, `phpmailer.lang-es.php`,
    `phpmailer.lang-et.php`, `phpmailer.lang-fa.php`, `phpmailer.lang-fi.php`, `phpmailer.lang-fo.php`, `phpmailer.lang-fr.php`,
    `phpmailer.lang-gl.php`, `phpmailer.lang-he.php`, `phpmailer.lang-hi.php`, `phpmailer.lang-hr.php`, `phpmailer.lang-hu.php`,
    `phpmailer.lang-hy.php`, `phpmailer.lang-id.php`, `phpmailer.lang-it.php`, `phpmailer.lang-ja.php`, `phpmailer.lang-ka.php`,
    `phpmailer.lang-ko.php`, `phpmailer.lang-ku.php`, `phpmailer.lang-lt.php`, `phpmailer.lang-lv.php`, `phpmailer.lang-mg.php`,
    `phpmailer.lang-mn.php`, `phpmailer.lang-ms.php`, `phpmailer.lang-nb.php`, `phpmailer.lang-nl.php`, `phpmailer.lang-pl.php`,
    `phpmailer.lang-pt.php`, `phpmailer.lang-pt_br.php`, `phpmailer.lang-ro.php`, `phpmailer.lang-ru.php`, `phpmailer.lang-si.php`,
    `phpmailer.lang-sk.php`, `phpmailer.lang-sl.php`, `phpmailer.lang-sr.php`, `phpmailer.lang-sr_latn.php`,
    `phpmailer.lang-sv.php`, `phpmailer.lang-tl.php`, `phpmailer.lang-tr.php`, `phpmailer.lang-uk.php`, `phpmailer.lang-ur.php`,
    `phpmailer.lang-vi.php`, `phpmailer.lang-zh.php`, `phpmailer.lang-zh_cn.php`.


---

### PHPMailer/language/phpmailer.lang-af.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-ar.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-as.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-az.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-ba.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-be.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-bg.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-bn.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-ca.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-cs.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-da.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-de.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-eo.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-es.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-et.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-fa.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-fi.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-fo.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-fr.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-gl.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-he.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-hi.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-hr.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-hu.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-id.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-it.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-ja.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-ko.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-ku.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-lt.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-lv.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-mg.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-ms.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-nb.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-nl.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-pl.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-pt.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-pt_br.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-ro.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-ru.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-si.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-sk.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-sl.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-sr_latn.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-uk.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-ur.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-vi.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-zh.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-zh_cn.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-el.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-hy.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-ka.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-mn.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-sr.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-sv.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-tl.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/language/phpmailer.lang-tr.php
- Tipo: Arquivo de idioma (PHP).
- Funcao: Strings de traducao do PHPMailer.

---

### PHPMailer/LICENSE
- Tipo: Licenca.
- Funcao: Texto completo da LGPL v2.1 (GNU Lesser General Public License).

---

### PHPMailer/mailer.php
- Tipo: Configuracao de envio de email (PHP).
- Funcao: Inicializa PHPMailer e define SMTP padrao.
- Configuracoes observadas:
  - Host SMTP: `smtp.titan.email`.
  - Porta: `587` (SMTP).
  - Autenticacao SMTP habilitada.
  - Credenciais hardcoded:
    - Usuario: `adm_sistema@teste.the.br`.
    - Senha: `4dmP14g3!5y5`.
  - Remetente/Reply-To: `adm_sistema@teste.the.br` (nome "Teste"/"Sistema Administrativo").
- Pontos de atencao:
  - **Credenciais expostas no codigo** (seguranca).
  - Comentarios e strings com encoding corrompido (acentos).

---

### PHPMailer/PHPMailerAutoload.php
- Tipo: Autoloader PHP (legacy).
- Funcao: Define `PHPMailerAutoload()` e registra no SPL para carregar `class.<classname>.php`.
- Compatibilidade:
  - Suporta PHP >= 5.1.2 (SPL).
  - Fallback para `__autoload()` em versoes antigas.

---

### PHPMailer/README.md
- Tipo: Documentacao oficial (markdown).
- Funcao: Descreve recursos, instalacao, exemplos e licencas do PHPMailer.
- Destaques relevantes:
  - PHPMailer 5.2 e legado (compatibilidade PHP 5.x) **nao suportado**.
  - Recomenda uso via Composer e `src/` (PHPMailer 6.x).
  - Cita que a pasta `language/` e opcional.
- Pontos de atencao:
  - Texto com encoding corrompido (acentos) no arquivo local.
  - Projeto aqui usa **5.2.8** (legado), divergindo do README atual.

---

### PHPMailer/SECURITY.md
- Tipo: Avisos de seguranca (markdown).
- Funcao: Lista vulnerabilidades (CVEs) historicas por versao do PHPMailer e canal de disclosure.
- Pontos de atencao:
  - O repositorio usa **PHPMailer 5.2.8** (legado), que e mais antigo que varias correcoes citadas (ex.: 5.2.10/5.2.14/5.2.18/5.2.20/5.2.22/5.2.24/5.2.27). Avaliar riscos e atualizar.

---

### PHPMailer/src/DSNConfigurator.php
- Tipo: Classe PHP (namespace `PHPMailer\\PHPMailer`).
- Funcao: Configura uma instancia de `PHPMailer` a partir de uma DSN (mail/sendmail/qmail/smtp/smtps).
- Comportamento:
  - Faz parse de DSN, aplica host/porta/usuario/senha e opcoes adicionais.
  - Lanca `Exception` para esquema invalido ou opcoes desconhecidas.

---

### PHPMailer/src/Exception.php
- Tipo: Classe PHP (Exception customizada).
- Funcao: Extende `\\Exception` e formata mensagens HTML via `errorMessage()`.

---

### PHPMailer/src/OAuth.php
- Tipo: Classe PHP (OAuth2 wrapper).
- Funcao: Implementa `OAuthTokenProvider` e gera token XOAUTH2 base64 para SMTP.
- Dependencias:
  - `league/oauth2-client` (`RefreshToken`, `AbstractProvider`, `AccessToken`).
- Observacoes:
  - Recebe `provider`, `userName`, `clientSecret`, `clientId`, `refreshToken` via constructor.

---

### PHPMailer/src/OAuthTokenProvider.php
- Tipo: Interface PHP.
- Funcao: Define contrato `getOauth64()` para gerar string OAuth2 base64 usada em autenticacao SMTP.

---

### PHPMailer/src/PHPMailer.php
- Tipo: Classe PHP principal (namespaced).
- Funcao: Implementa criacao e envio de emails (SMTP/Sendmail/Qmail/Mail), templates MIME, anexos, validacao de enderecos, etc.
- Observacoes:
  - Define constantes de charset/encoding/content-type e varios atributos publicos configuraveis.
  - Indica versao mais nova (namespace + PHP >= 5.5), coexistindo com `class.phpmailer.php` legado (5.2.8).

---

### PHPMailer/src/POP3.php
- Tipo: Classe PHP (POP-before-SMTP).
- Funcao: Implementa autenticacao POP3 para liberar SMTP em servidores antigos.
- Observacoes:
  - Marcado como tecnologia antiga; so para compatibilidade legada.
  - Constante de versao interna: `6.9.3`.

---

### PHPMailer/src/SMTP.php
- Tipo: Classe PHP (SMTP client).
- Funcao: Implementa protocolo SMTP (RFC 821/5321), debug, timeouts e autenticacao.
- Observacoes:
  - Constante de versao interna: `6.9.3`.
  - Define portas padrao (25/465) e niveis de debug.

---

### PHPMailer/VERSION
- Tipo: Arquivo de versao.
- Funcao: Indica versao do pacote PHPMailer presente.
- Valor: `6.9.3`.
- Observacao: Conflita com `class.phpmailer.php` (5.2.8), sugerindo mistura de versoes no repositorio.

---

### sass/_mixin.scss
- Tipo: Sass partial (mixins/funcs).
- Funcao: Mixins utilitarios (rem, border-radius, transitions, transforms, gradients, animation, responsive breakpoints, etc.).

---

### sass/_variables.scss
- Tipo: Sass partial (variaveis).
- Funcao: Define paleta base, tipografia, tamanhos e breakpoints.

---

### sass/about.scss
- Tipo: Folha Sass (pagina About).
- Funcao: Estilos para blocos `box_about`, `box_feat`, `content_general_row` e carrossel centralizado.
- Dependencias: `variables`, `mixin`.

---

### sass/account.scss
- Tipo: Folha Sass (pagina Account).
- Funcao: Estilos para bloco `box_account` e container de formularios (login/cadastro).
- Dependencias: `variables`, `mixin`.

---

### sass/blog.scss
- Tipo: Folha Sass (blog).
- Funcao: Estilos para artigos do blog, previews, thumbs e area de metadados.
- Dependencias: `variables`, `mixin`.

---

### sass/cart.scss
- Tipo: Folha Sass (carrinho).
- Funcao: Estilos de tabelas do carrinho e comportamento responsivo em mobile.
- Dependencias: `variables`, `mixin`.

---

### sass/checkout.scss
- Tipo: Folha Sass (checkout).
- Funcao: Estilos para tabs de checkout, passos (`.step`) e blocos de pagamento/entrega.
- Dependencias: `variables`, `mixin`.

---

### sass/compass_app_log.txt
- Tipo: Log de build (Compass).
- Funcao: Registro historico de compilacoes Sass -> CSS e erros encontrados (2017-2019).
- Observacoes:
  - Mostra erros de sintaxe em `style.scss` e `ma5-menu.scss` em alguns pontos.

---

### sass/config.rb
- Tipo: Configuracao Compass/Sass (Ruby).
- Funcao: Define caminhos para `css`, `sass`, `img`, `js` e opcoes de build (expanded, sem sourcemap).

---

### sass/contact.scss
- Tipo: Folha Sass (contato).
- Funcao: Estilos para blocos de contato e iframe do mapa.
- Dependencias: `variables`, `mixin`.

---

### sass/error_track.scss
- Tipo: Folha Sass (erro/rastreio).
- Funcao: Estilos para paginas `#error_page` e `#track_order` e barra de busca.
- Dependencias: `variables`, `mixin`.

---

### sass/faq.scss
- Tipo: Folha Sass (FAQ).
- Funcao: Estilos para cards de topicos e listas de artigos.
- Dependencias: `variables`, `mixin`.

---

### sass/home_1.scss
- Tipo: Folha Sass (home).
- Funcao: Estilos para banners, grids de categorias e elementos da home.
- Dependencias: `variables`, `mixin`.

---

### sass/leave_review.scss
- Tipo: Folha Sass (reviews).
- Funcao: Estilos para formulario de avaliacao, estrelas e upload de arquivos.
- Dependencias: `variables`, `mixin`.

---

### sass/listing.scss
- Tipo: Folha Sass (listagens).
- Funcao: Estilos para toolbox, filtros e ordenacao.
- Dependencias: `variables`, `mixin`.

---

### sass/product_page.scss
- Tipo: Folha Sass (produto).
- Funcao: Estilos para pagina de produto, contador e carrossel com thumbs.
- Dependencias: `variables`, `mixin`.

---

### sass/style.scss
- Tipo: Folha Sass principal do tema.
- Funcao: Define toda a estrutura/typografia/componentes do tema "Allaia v1.3".
- Observacoes:
  - Importa `variables` e `mixin`.
  - Define fontes de icones `header_icons` e estilos de menu/hamburger.

---

### video/intro.mp4
- Tipo: Video (MP4, binario).
- Funcao: Midia de introducao (provavel uso em header/hero de video).
- Metadata: ~4.29 MB; modificado em 30/01/2026 00:15:53.

---

### video/intro.ogv
- Tipo: Video (OGV, binario).
- Funcao: Alternativa de compatibilidade ao `intro.mp4`.
- Metadata: ~1.66 MB; modificado em 30/01/2026 00:15:53.

---

### vvconsulting.com.br/
- Tipo: Pasta.
- Observacao: Pasta vazia (nenhum arquivo visivel).
