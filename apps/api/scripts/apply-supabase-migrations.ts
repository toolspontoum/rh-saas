/**
 * Aplica arquivos em supabase/migrations contra o Postgres do projeto (remoto).
 *
 * Requer no apps/api/.env:
 *   - DATABASE_URL (URI completa), ou
 *   - SUPABASE_DB_PASSWORD + SUPABASE_PROJECT_REF
 *
 * Dashboard → Settings → Database → Connection string → URI (senha do banco Postgres).
 *
 * Uso:
 *   npx tsx scripts/apply-supabase-migrations.ts
 *
 * Se o banco JÁ tinha o schema aplicado por outro meio e você só quer registrar o histórico
 * local (para aplicar só migrations novas daqui pra frente):
 *   npx tsx scripts/apply-supabase-migrations.ts --baseline
 */

import dns from "node:dns";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import pg from "pg";

// Hosts db.<ref>.supabase.co costumam ter só AAAA (IPv6). Com "ipv4first", getaddrinfo pode falhar (ENOTFOUND).
dns.setDefaultResultOrder("ipv6first");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

config({ path: path.join(__dirname, "../.env") });

const baseline = process.argv.includes("--baseline");

function resolveDatabaseUrl(): string {
  const direct = process.env.DATABASE_URL?.trim();
  if (direct) return direct;

  const ref = process.env.SUPABASE_PROJECT_REF?.trim();
  const pass = process.env.SUPABASE_DB_PASSWORD?.trim();
  if (ref && pass) {
    const host =
      process.env.SUPABASE_DB_HOST?.trim() || `db.${ref}.supabase.co`;
    const port = process.env.SUPABASE_DB_PORT?.trim() || "5432";
    const user = process.env.SUPABASE_DB_USER?.trim() || "postgres";
    // Só a senha vai em encodeURIComponent (evita quebrar user tipo postgres.<ref> no pooler).
    return `postgresql://${user}:${encodeURIComponent(pass)}@${host}:${port}/postgres`;
  }

  console.error(`
Defina no apps/api/.env:

  DATABASE_URL=... (copie do painel: Settings → Database → Connection string)

ou

  SUPABASE_DB_PASSWORD=SENHA_DO_BANCO
  SUPABASE_PROJECT_REF=... (já existe no seu .env)

Opcional (se ENOTFOUND ou só IPv6 na rede): use DATABASE_URL do pooler (Session)
ou defina host/porta manualmente:

  SUPABASE_DB_HOST=db.SEU_REF.supabase.co
  SUPABASE_DB_PORT=5432
  SUPABASE_DB_USER=postgres

Senha do banco: Supabase → Project Settings → Database → Database password
`);
  process.exit(1);
}

function migrationVersion(filename: string): string {
  const m = /^(\d{14})_/.exec(filename);
  if (!m) throw new Error(`Nome de migration inválido: ${filename}`);
  return m[1];
}

async function ensureLogTable(client: pg.Client): Promise<void> {
  await client.query(`
    create table if not exists public._vv_migration_log (
      version text primary key,
      name text not null,
      applied_at timestamptz not null default now()
    );
  `);
}

async function isApplied(client: pg.Client, version: string): Promise<boolean> {
  const { rows } = await client.query(`select 1 from public._vv_migration_log where version = $1 limit 1`, [version]);
  return rows.length > 0;
}

async function markApplied(client: pg.Client, version: string, name: string): Promise<void> {
  await client.query(
    `insert into public._vv_migration_log (version, name) values ($1, $2) on conflict (version) do nothing`,
    [version, name]
  );
}

async function main() {
  const url = resolveDatabaseUrl();
  const migrationsDir = path.resolve(__dirname, "../../../supabase/migrations");
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  await ensureLogTable(client);

  if (baseline) {
    console.log("Modo --baseline: registrando todas as migrations como já aplicadas (sem executar SQL).");
    for (const file of files) {
      const version = migrationVersion(file);
      await markApplied(client, version, file);
    }
    await client.end();
    console.log(`Baseline: ${files.length} registro(s) em public._vv_migration_log.`);
    return;
  }

  console.log("Verificando migrations pendentes…");
  let applied = 0;
  for (const file of files) {
    const version = migrationVersion(file);
    if (await isApplied(client, version)) continue;

    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    console.log(`→ Aplicando ${file}`);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await markApplied(client, version, file);
      await client.query("COMMIT");
      applied += 1;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`Falha em ${file}:`, err);
      process.exitCode = 1;
      break;
    }
  }

  await client.end();
  if (applied === 0 && !process.exitCode) {
    console.log("Nenhuma migration pendente.");
  } else if (applied > 0) {
    console.log(`Concluído: ${applied} migration(ns) aplicada(s).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
