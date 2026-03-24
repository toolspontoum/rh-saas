# Revisao de riscos (tecnicos e operacionais)
- Credenciais expostas: `PHPMailer/mailer.php` contem usuario/senha SMTP hardcoded. Risco alto (comprometimento de email, spam, blacklist).
- PHPMailer legado: projeto mistura 5.2.8 com 6.9.3; 5.2.8 e anterior tem CVEs graves. Risco alto (RCE, LFI, injection).
- SQL injection: varios scripts `area-login/*` sem prepared statements. Risco alto (exfiltracao, alteracao de dados).
- Uploads sem sanitizacao: uploads em `area-login` salvam com nome original e validacao fraca. Risco medio/alto (overwrite, path traversal, upload malicioso).
- Encoding corrompido: arquivos com acentos quebrados. Risco medio (UX, SEO, erros em email/html).
- Dependencia forte de assets em `img/`: paginas publicas quase 100% baseadas em imagens. Risco medio (SEO, acessibilidade, performance).
- Formularios sem backend: `contato.php` nao processa envio. Risco medio (perda de leads).
- Logs de erro: `error_log` com warnings repetidos (session id). Risco baixo/medio (ruido e possivel vazamento de info).
- Config legado de build: Sass/Compass antigo com erros historicos. Risco baixo (dificil recompilar CSS).

# Resumo executivo
- Site institucional PHP + painel administrativo legado, sem documentacao previa.
- Front-end baseado em tema comercial (Allaia v1.3) com CSS/JS e Sass historicos.
- Muitas paginas publicas sao apenas imagens estaticas.
- Backend `area-login` tem CRUDs e rotinas de upload sem hardening.
- PHPMailer esta duplicado (versoes 5.2.8 e 6.9.3) e ha credenciais expostas.
- Prioridade imediata: seguranca (credenciais, PHPMailer, SQL injection, uploads).

# Grau de risco e dificuldade de ajuste

## 1) Credenciais expostas (PHPMailer/mailer.php)
- Risco: Alto
- Dificuldade: Baixa
- Observacao: mover para variaveis de ambiente/arquivo fora do repo + rotacionar senha.

## 2) PHPMailer legado/mistura de versoes
- Risco: Alto
- Dificuldade: Media/Alta
- Observacao: exige padronizar em 6.x e revisar chamadas; possiveis ajustes em envio e charset.

## 3) SQL injection (area-login/* sem prepared statements)
- Risco: Alto
- Dificuldade: Alta
- Observacao: refatorar multiplas queries e validar entrada; pode ser trabalho amplo.

## 4) Uploads sem sanitizacao
- Risco: Medio/Alto
- Dificuldade: Media
- Observacao: validar extensao/MIME, renomear arquivo, limitar tamanho e path.

## 5) Encoding corrompido
- Risco: Medio
- Dificuldade: Baixa/Media
- Observacao: corrigir charset dos arquivos + garantir UTF-8 no editor/servidor.

## 6) Dependencia forte de imagens (SEO/acessibilidade)
- Risco: Medio
- Dificuldade: Media/Alta
- Observacao: requer reescrever conteudo em HTML; trabalho de conteudo + design.

## 7) Formulario sem backend (contato.php)
- Risco: Medio
- Dificuldade: Baixa/Media
- Observacao: criar handler simples e validacao + anti-spam.

## 8) Logs de erro repetidos
- Risco: Baixo/Medio
- Dificuldade: Baixa
- Observacao: checar `verifica.php` e condicionar acesso a `$_SESSION`.

## 9) Build Sass/Compass legado
- Risco: Baixo
- Dificuldade: Media
- Observacao: migrar para Sass moderno se realmente for recompilar.

# Matriz impacto x esforco (priorizacao)

## Alto impacto / Baixo esforco (Quick wins)
- Credenciais expostas (PHPMailer/mailer.php): rotacionar senha + mover para env/fora do repo.
- Logs de erro repetidos: ajustar `verifica.php` e condicoes de sessao.

## Alto impacto / Medio ou alto esforco (Projetos criticos)
- SQL injection (area-login/*): refatorar para prepared statements e validar entradas.
- PHPMailer legado/mistura de versoes: padronizar em 6.x e revisar chamadas.
- Uploads sem sanitizacao: validar MIME/extensao, renomear, limitar tamanho/path.

## Medio impacto / Baixo ou medio esforco (Melhorias taticas)
- Formulario sem backend (contato.php): implementar handler + validacao + anti-spam.
- Encoding corrompido: corrigir arquivos e garantir UTF-8.

## Medio/baixo impacto / Alto esforco (Longo prazo)
- Dependencia forte de imagens (SEO/acessibilidade): reescrever conteudo em HTML.
- Build Sass/Compass legado: migrar para Sass moderno se necessario.

# Cronograma proposto (macro)

## Semana 1 (Seguranca imediata)
- Rotacionar credenciais SMTP e mover para variaveis de ambiente.
- Ajustar warnings de sessao (`verifica.php`) e reduzir ruido em logs.
- Implementar validacao de upload (extensao/MIME/tamanho) e renomear arquivos.

## Semana 2 (Hardening backend)
- Migrar queries criticas para prepared statements (priorizar rotas de escrita).
- Revisar entradas de formularios e sanear dados.

## Semana 3 (PHPMailer e comunicacao)
- Padronizar versao PHPMailer (6.x) e remover legado.
- Revisar fluxo de envio de email e testes de entrega.
- Implementar backend do formulario de contato com anti-spam.

## Semana 4 (Qualidade e conteudo)
- Corrigir encoding para UTF-8 em arquivos principais.
- Planejar/estimar reescrita de conteudo (SEO/acessibilidade).
- Decidir sobre migracao do build Sass/Compass.
