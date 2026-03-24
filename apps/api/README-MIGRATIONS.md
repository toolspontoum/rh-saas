# Migrations Supabase (Postgres remoto)

A **service role** e as chaves JWT **não** executam DDL no banco. É necessária a **senha do Postgres** (ou a URI completa).

## 1. Configurar `apps/api/.env`

Escolha **uma** opção:

**A)** URI (recomendado) — Dashboard → **Settings** → **Database** → **Connection string** → modo **Session** → copie a URI:

```env
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[YOUR-PASSWORD]@aws-0-....pooler.supabase.com:6543/postgres
```

(use a string exatamente como o painel mostrar; pode ser host `db.*.supabase.co` na porta `5432` em alguns projetos)

**B)** Senha + ref (o script monta a URI):

```env
SUPABASE_DB_PASSWORD=sua_senha_do_banco
SUPABASE_PROJECT_REF=seu_ref
```

A senha é a **Database password** do projeto (não é a anon/service key).

## 2. Aplicar migrations

Na pasta `apps/api`:

```bash
npm run migrate:supabase
```

Isso cria `public._vv_migration_log` e aplica, em ordem, só os arquivos de `supabase/migrations` que ainda não constam no log.

## 3. Banco já existia (schema antigo aplicado manualmente)

Se o Postgres **já tinha** todas as migrations antigas, mas o log está vazio, a primeira execução tentaria rodar tudo de novo e pode falhar (`already exists`).

Nesse caso, **uma vez**, registre o baseline sem executar SQL:

```bash
npm run migrate:supabase:baseline
```

Depois rode de novo:

```bash
npm run migrate:supabase
```

Assim só entram migrations **novas** (por exemplo `document_requirements` e `platform_document_types`).

## 4. `ENOTFOUND` / Node não resolve o host (Windows / rede)

O host `db.<ref>.supabase.co` pode expor só **IPv6**. Também há ambientes (CI, alguns terminais integrados) em que o **Node** não usa o mesmo DNS que o `nslookup`.

- Rode **`npm run migrate:supabase` no PowerShell ou terminal local** (fora de sandboxes que bloqueiem DNS).
- Se continuar falhando, use **`DATABASE_URL`** copiada do painel (**Connection string** → modo **Session** / pooler), que costuma ter IPv4.
- Opcional no `.env` (com senha + ref): `SUPABASE_DB_HOST`, `SUPABASE_DB_PORT`, `SUPABASE_DB_USER` (ex.: user do pooler `postgres.<ref>`).

O script já chama `dns.setDefaultResultOrder("ipv6first")` para priorizar IPv6 quando for o único registro.

## 5. Idempotência

- `jobs.document_requirements` usa `IF NOT EXISTS`.
- Tabelas de documentos padrão usam `CREATE TABLE IF NOT EXISTS` e seed com `ON CONFLICT DO NOTHING`.

