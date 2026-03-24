import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config();

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const db = createClient(url, key);

  const tenants = await db.from("tenants").select("id,ai_provider").limit(1);
  if (tenants.error) {
    console.error("tenants:", tenants.error.message);
    process.exit(1);
  }
  console.log("Conexao OK. tenants.ai_provider:", tenants.data?.[0] != null);

  const jobs = await db.from("jobs").select("id,ai_screening_criteria").limit(1);
  if (jobs.error) {
    console.error("jobs:", jobs.error.message);
    process.exit(1);
  }
  console.log("jobs.ai_screening_criteria OK");

  const apps = await db.from("job_applications").select("id,ai_analysis_status").limit(1);
  if (apps.error) {
    console.error("job_applications:", apps.error.message);
    process.exit(1);
  }
  console.log("job_applications IA OK");

  const pays = await db.from("payslips").select("id,ai_link_status").limit(1);
  if (pays.error) {
    console.error("payslips:", pays.error.message);
    process.exit(1);
  }
  console.log("payslips IA OK");
  console.log("Verificacao concluida.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
