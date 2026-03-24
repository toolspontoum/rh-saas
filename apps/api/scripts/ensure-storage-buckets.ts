import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config();

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const documentsBucket = process.env.STORAGE_BUCKET_DOCUMENTS ?? "documents";
const payslipsBucket = process.env.STORAGE_BUCKET_PAYSLIPS ?? "payslips";
const candidateResumesBucket =
  process.env.STORAGE_BUCKET_CANDIDATE_RESUMES ?? "candidate-resumes";

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function ensureBucket(id: string) {
  const { data: existing, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  if (existing?.some((b) => b.id === id)) {
    return { bucket: id, created: false };
  }

  const { data, error } = await supabase.storage.createBucket(id, {
    public: false,
    fileSizeLimit: "15MB",
    allowedMimeTypes: ["application/pdf"]
  });
  if (error) throw error;
  return { bucket: data?.name ?? id, created: true };
}

async function main() {
  const results = [];
  results.push(await ensureBucket(documentsBucket));
  results.push(await ensureBucket(payslipsBucket));
  results.push(await ensureBucket(candidateResumesBucket));
  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

main().catch((error) => {
  console.error("[ensure-storage-buckets] failed", error);
  process.exit(1);
});
