import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

import { DEMO_MARKER, DEMO_TENANT_SLUG, DEMO_USERS } from "./demo-showcase.shared.js";

config();

type SupabaseAdmin = ReturnType<typeof createClient>;

type CleanupOptions = {
  removeUsers?: boolean;
};

type CleanupSummary = {
  tenantId: string;
  removedUsers: string[];
};

const STORAGE_BUCKETS = [
  process.env.STORAGE_BUCKET_DOCUMENTS ?? "documents",
  process.env.STORAGE_BUCKET_PAYSLIPS ?? "payslips",
  process.env.STORAGE_BUCKET_CANDIDATE_RESUMES ?? "candidate-resumes",
  process.env.STORAGE_BUCKET_CANDIDATE_AVATARS ?? "candidate-avatars",
  process.env.STORAGE_BUCKET_EMPLOYEE_AVATARS ?? "employee-avatars"
];

function getClient(): SupabaseAdmin {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

async function resolveTenantId(db: SupabaseAdmin): Promise<string> {
  const fromEnv = process.env.SEED_TENANT_ID ?? process.env.SMOKE_TENANT_ID;
  if (fromEnv) return fromEnv;

  const { data, error } = await db
    .from("tenants")
    .select("id")
    .eq("slug", DEMO_TENANT_SLUG)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error("Tenant not found. Set SEED_TENANT_ID or SMOKE_TENANT_ID.");
  return data.id as string;
}

async function listAllAuthUsers(db: SupabaseAdmin) {
  const users: Array<{ id: string; email: string | null }> = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const pageUsers = data.users ?? [];
    users.push(...pageUsers.map((item) => ({ id: item.id, email: item.email ?? null })));
    if (pageUsers.length < perPage) break;
    page += 1;
  }

  return users;
}

async function removeStoragePrefix(db: SupabaseAdmin, bucket: string, prefix: string) {
  const stack = [prefix];
  const files: string[] = [];

  while (stack.length > 0) {
    const current = stack.pop() as string;
    let offset = 0;

    while (true) {
      const { data, error } = await db.storage
        .from(bucket)
        .list(current, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw error;
      if (!data || data.length === 0) break;

      for (const item of data) {
        const name = item.name;
        const nextPath = current ? `${current}/${name}` : name;
        const isFolder = (item as { id?: string | null }).id == null;
        if (isFolder) {
          stack.push(nextPath);
        } else {
          files.push(nextPath);
        }
      }

      if (data.length < 1000) break;
      offset += data.length;
    }
  }

  for (let i = 0; i < files.length; i += 100) {
    const chunk = files.slice(i, i + 100);
    const { error } = await db.storage.from(bucket).remove(chunk);
    if (error) throw error;
  }
}

async function deleteInBatches(
  db: SupabaseAdmin,
  table: string,
  column: string,
  values: string[] | number[]
) {
  if (values.length === 0) return;
  for (let i = 0; i < values.length; i += 100) {
    const chunk = values.slice(i, i + 100);
    const { error } = await db.from(table).delete().in(column, chunk);
    if (error) throw error;
  }
}

export async function cleanupDemoShowcase(options: CleanupOptions = {}): Promise<CleanupSummary> {
  const db = getClient();
  const tenantId = await resolveTenantId(db);
  const allUsers = await listAllAuthUsers(db);
  const demoEmails = DEMO_USERS.map((user) => user.email.toLowerCase());
  const demoUsers = allUsers.filter((user) => demoEmails.includes((user.email ?? "").toLowerCase()));
  const demoUserIds = demoUsers.map((user) => user.id);
  const candidateEmails = DEMO_USERS.filter((user) => user.key.startsWith("candidate")).map(
    (user) => user.email
  );

  const prefix = `tenants/${tenantId}/demo-showcase`;
  for (const bucket of STORAGE_BUCKETS) {
    try {
      await removeStoragePrefix(db, bucket, prefix);
    } catch (error) {
      console.warn(`[seed-demo-cleanup] storage cleanup skipped for bucket "${bucket}"`, error);
    }
  }

  const { data: demoJobs, error: demoJobsError } = await db
    .from("jobs")
    .select("id")
    .eq("tenant_id", tenantId)
    .like("title", `${DEMO_MARKER}%`);
  if (demoJobsError) throw demoJobsError;
  const demoJobIds = (demoJobs ?? []).map((row) => row.id as string);

  const { data: demoCandidates, error: demoCandidatesError } = await db
    .from("candidates")
    .select("id")
    .eq("tenant_id", tenantId)
    .in("email", candidateEmails);
  if (demoCandidatesError) throw demoCandidatesError;
  const demoCandidateIds = (demoCandidates ?? []).map((row) => row.id as string);

  const { data: demoShiftTemplates, error: shiftTemplateError } = await db
    .from("employee_shift_templates")
    .select("id")
    .eq("tenant_id", tenantId)
    .like("name", `${DEMO_MARKER}%`);
  if (shiftTemplateError) throw shiftTemplateError;
  const demoShiftTemplateIds = (demoShiftTemplates ?? []).map((row) => row.id as string);

  const { error: deleteNoticeAttachmentsError } = await db
    .from("notice_attachments")
    .delete()
    .eq("tenant_id", tenantId)
    .like("file_path", `${prefix}%`);
  if (deleteNoticeAttachmentsError) throw deleteNoticeAttachmentsError;

  const { error: deleteNoticesError } = await db
    .from("notices")
    .delete()
    .eq("tenant_id", tenantId)
    .like("title", `${DEMO_MARKER}%`);
  if (deleteNoticesError) throw deleteNoticesError;

  const { error: deletePayslipsError } = await db
    .from("payslips")
    .delete()
    .eq("tenant_id", tenantId)
    .like("file_path", `${prefix}%`);
  if (deletePayslipsError) throw deletePayslipsError;

  const { error: deleteBatchesError } = await db
    .from("payslip_batches")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("source_type", "demo_seed");
  if (deleteBatchesError) throw deleteBatchesError;

  const { error: deleteDocumentsError } = await db
    .from("documents")
    .delete()
    .eq("tenant_id", tenantId)
    .like("file_path", `${prefix}%`);
  if (deleteDocumentsError) throw deleteDocumentsError;

  const { error: deleteDocumentRequestsError } = await db
    .from("document_requests")
    .delete()
    .eq("tenant_id", tenantId)
    .like("title", `${DEMO_MARKER}%`);
  if (deleteDocumentRequestsError) throw deleteDocumentRequestsError;

  const { error: deleteOncallShiftsError } = await db
    .from("oncall_shifts")
    .delete()
    .eq("tenant_id", tenantId)
    .like("note", `${DEMO_MARKER}%`);
  if (deleteOncallShiftsError) throw deleteOncallShiftsError;

  const { error: deleteTimeAdjustmentError } = await db
    .from("time_adjustment_requests")
    .delete()
    .eq("tenant_id", tenantId)
    .like("reason", `${DEMO_MARKER}%`);
  if (deleteTimeAdjustmentError) throw deleteTimeAdjustmentError;

  const { error: deleteChangeLogsError } = await db
    .from("time_entry_change_logs")
    .delete()
    .eq("tenant_id", tenantId)
    .like("reason", `${DEMO_MARKER}%`);
  if (deleteChangeLogsError) throw deleteChangeLogsError;

  const { error: deleteTimeEntriesError } = await db
    .from("time_entries")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("source", "demo_seed");
  if (deleteTimeEntriesError) throw deleteTimeEntriesError;

  if (demoJobIds.length > 0 || demoCandidateIds.length > 0) {
    let query = db.from("job_applications").delete().eq("tenant_id", tenantId);
    if (demoJobIds.length > 0) query = query.in("job_id", demoJobIds);
    if (demoCandidateIds.length > 0) query = query.in("candidate_id", demoCandidateIds);
    const { error } = await query;
    if (error) throw error;
  }

  await deleteInBatches(db, "jobs", "id", demoJobIds);
  await deleteInBatches(db, "candidates", "id", demoCandidateIds);

  if (demoShiftTemplateIds.length > 0) {
    const { error: deleteAssignmentsError } = await db
      .from("employee_shift_assignments")
      .delete()
      .eq("tenant_id", tenantId)
      .in("shift_template_id", demoShiftTemplateIds);
    if (deleteAssignmentsError) throw deleteAssignmentsError;
  }

  await deleteInBatches(db, "employee_shift_templates", "id", demoShiftTemplateIds);

  const { error: deleteSkillTagsError } = await db
    .from("skill_tags")
    .delete()
    .like("normalized", "demo-showcase-%");
  if (deleteSkillTagsError) throw deleteSkillTagsError;

  if (demoUserIds.length > 0) {
    const { error: deleteProfilesError } = await db
      .from("tenant_user_profiles")
      .delete()
      .eq("tenant_id", tenantId)
      .in("user_id", demoUserIds);
    if (deleteProfilesError) throw deleteProfilesError;

    const { error: deleteRolesError } = await db
      .from("user_tenant_roles")
      .delete()
      .eq("tenant_id", tenantId)
      .in("user_id", demoUserIds);
    if (deleteRolesError) throw deleteRolesError;

    const { error: deleteCandidateProfilesError } = await db
      .from("candidate_profiles")
      .delete()
      .in("user_id", demoUserIds);
    if (deleteCandidateProfilesError) throw deleteCandidateProfilesError;
  }

  const removedUsers: string[] = [];
  if (options.removeUsers) {
    for (const user of demoUsers) {
      const { error } = await db.auth.admin.deleteUser(user.id);
      if (error) throw error;
      if (user.email) removedUsers.push(user.email);
    }
  }

  return { tenantId, removedUsers };
}

async function main() {
  const summary = await cleanupDemoShowcase({ removeUsers: true });
  console.log(JSON.stringify({ ok: true, ...summary }, null, 2));
}

if ((process.argv[1] ?? "").includes("seed-demo-cleanup.ts")) {
  main().catch((error) => {
    console.error("[seed-demo-cleanup] failed", error);
    process.exit(1);
  });
}
