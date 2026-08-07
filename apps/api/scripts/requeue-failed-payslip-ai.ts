/**
 * Reencaminha contracheques com falha de vínculo IA (ou processing preso) para a fila.
 * Uso (API cwd): npx tsx scripts/requeue-failed-payslip-ai.ts [--tenant=<uuid>] [--dry-run]
 */
import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const tenantArg = process.argv.find((a) => a.startsWith("--tenant="))?.slice("--tenant=".length);
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const db = createClient(url, key, { auth: { persistSession: false } });

  let q = db
    .from("payslips")
    .select("id, tenant_id, ai_link_status, ai_link_error, batch_id")
    .in("ai_link_status", ["failed", "processing"]);
  if (tenantArg) q = q.eq("tenant_id", tenantArg);

  const { data, error } = await q.limit(5000);
  if (error) throw error;
  const rows = data ?? [];
  console.log({ count: rows.length, dryRun, tenantArg: tenantArg ?? "all" });

  if (dryRun || rows.length === 0) return;

  const ids = rows.map((r) => r.id as string);
  const chunk = 100;
  let updated = 0;
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk);
    const { error: upErr, data: upData } = await db
      .from("payslips")
      .update({ ai_link_status: "queued", ai_link_error: null })
      .in("id", slice)
      .select("id");
    if (upErr) throw upErr;
    updated += (upData ?? []).length;
  }
  console.log({ updated });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
