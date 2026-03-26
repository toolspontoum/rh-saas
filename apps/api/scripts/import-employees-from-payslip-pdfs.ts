/**
 * Lê PDFs de contracheque em docs/Temp Contracheques, extrai nome + CPF e
 * cadastra como funcionários (role employee) no tenant vvconsulting-mvp.
 *
 * Uso:
 *   npx tsx scripts/import-employees-from-payslip-pdfs.ts           # dry-run
 *   npx tsx scripts/import-employees-from-payslip-pdfs.ts --execute # aplica no Supabase
 *
 * Requer apps/api/.env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { config } from "dotenv";
import { createHash, randomBytes } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { fetchDefaultTenantCompanyId } from "../src/lib/tenant-company-default.ts";
import { extractPdfText } from "../src/modules/ai/pdf-text.ts";
import { TenantUsersRepository } from "../src/modules/tenant-users/tenant-users.repository.ts";

config();

const TENANT_SLUG = "vvconsulting-mvp";
const PDF_DIR = join(import.meta.dirname, "../../../docs/Temp Contracheques");
const SYNTH_EMAIL_DOMAIN = "import.vvconsulting.local";
const TARGET_COMPANY_NAME = process.env.PAYSLIP_TARGET_COMPANY_NAME ?? "VV Consulting Marketing";

function parsePayslipText(text: string): { fullName: string; cpf: string } | null {
  const cpfMatch = text.match(/CPF\s+(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})/i);
  if (!cpfMatch) return null;
  const cpf = cpfMatch[1].replace(/\D/g, "");
  if (cpf.length !== 11) return null;

  const nameMatch = text.match(/UN-BUZ\s*\d+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]+?)CBO\s*:/i);
  if (!nameMatch) return null;
  const fullName = nameMatch[1].replace(/\s+/g, " ").trim();
  if (fullName.length < 3) return null;

  return { fullName, cpf };
}

function syntheticEmailForCpf(cpf: string): string {
  return `cpf.${cpf}@${SYNTH_EMAIL_DOMAIN}`;
}

async function resolveTenantId(db: SupabaseClient): Promise<string> {
  const { data, error } = await db.from("tenants").select("id").eq("slug", TENANT_SLUG).maybeSingle();
  if (error) throw error;
  const id = (data as { id: string } | null)?.id;
  if (!id) throw new Error(`Tenant não encontrado: slug=${TENANT_SLUG}`);
  return id;
}

async function resolveTargetCompanyId(db: SupabaseClient, tenantId: string): Promise<string> {
  const { data, error } = await db
    .from("tenant_companies")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", TARGET_COMPANY_NAME)
    .maybeSingle();
  if (error) throw error;
  const id = (data as { id: string } | null)?.id;
  if (id) return id;
  return fetchDefaultTenantCompanyId(db, tenantId);
}

async function main() {
  const execute = process.argv.includes("--execute");
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em apps/api/.env");
  }

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const repo = new TenantUsersRepository(db);

  const files = readdirSync(PDF_DIR)
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const byCpf = new Map<string, { fullName: string; sources: string[] }>();
  for (const f of files) {
    const buf = readFileSync(join(PDF_DIR, f));
    const text = await extractPdfText(buf);
    const parsed = parsePayslipText(text);
    if (!parsed) {
      console.error(`Falha ao extrair nome/CPF: ${f}`);
      continue;
    }
    const prev = byCpf.get(parsed.cpf);
    if (prev && prev.fullName !== parsed.fullName) {
      console.warn(
        `CPF ${parsed.cpf}: nomes divergentes — "${prev.fullName}" vs "${parsed.fullName}" (mantendo o primeiro)`
      );
    }
    if (!prev) {
      byCpf.set(parsed.cpf, { fullName: parsed.fullName, sources: [f] });
    } else {
      prev.sources.push(f);
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: execute ? "execute" : "dry-run",
        tenantSlug: TENANT_SLUG,
        targetCompanyName: TARGET_COMPANY_NAME,
        pdfFiles: files.length,
        uniqueCpfs: byCpf.size
      },
      null,
      2
    )
  );

  if (!execute) {
    for (const [cpf, row] of byCpf) {
      console.log(`${cpf}\t${row.fullName}\t${syntheticEmailForCpf(cpf)}`);
    }
    console.log("\nDry-run. Rode com --execute para gravar no Supabase.");
    return;
  }

  const tenantId = await resolveTenantId(db);
  const companyId = await resolveTargetCompanyId(db, tenantId);
  const passwords: { cpf: string; email: string; password: string }[] = [];

  for (const [cpf, row] of byCpf) {
    const email = syntheticEmailForCpf(cpf);
    const { data: existingInTenant, error: exErr } = await db
      .from("tenant_user_profiles")
      .select("user_id,full_name")
      .eq("tenant_id", tenantId)
      .eq("cpf", cpf)
      .maybeSingle();
    if (exErr) throw exErr;

    let userId: string | null = (existingInTenant as { user_id: string } | null)?.user_id ?? null;

    if (!userId) {
      userId = await repo.findUserIdByCpf(cpf);
    }
    if (!userId) {
      userId = await repo.findUserIdByEmail(email);
    }

    if (!userId) {
      const password = `Imp${createHash("sha256").update(randomBytes(32)).digest("hex").slice(0, 20)}!`;
      const { data: created, error: createErr } = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: row.fullName }
      });
      if (createErr) {
        console.error(`createUser falhou ${cpf} ${email}:`, createErr.message);
        continue;
      }
      userId = created.user?.id ?? null;
      if (!userId) {
        console.error(`createUser sem user.id: ${cpf}`);
        continue;
      }
      passwords.push({ cpf, email, password });
    }

    await repo.upsertEmployeeInTenant({
      tenantId,
      companyId,
      userId,
      fullName: row.fullName,
      email,
      cpf,
      phone: null
    });

    console.log(`OK\t${cpf}\t${row.fullName}`);
  }

  if (passwords.length > 0) {
    console.log(
      "\nNovos usuários (guarde as senhas se precisar de login; use reset de senha se preferir):\n" +
        JSON.stringify(passwords, null, 2)
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
