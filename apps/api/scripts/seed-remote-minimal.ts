import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config();

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SEED_USER_ID = process.env.SEED_USER_ID;
const SEED_USER_EMAIL = process.env.SEED_USER_EMAIL;
const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/api/.env");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

type UserSummary = { id: string; email: string | undefined };

async function resolveTargetUser(): Promise<UserSummary> {
  const users: UserSummary[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const pageUsers = data?.users ?? [];
    users.push(...pageUsers.map((u) => ({ id: u.id, email: u.email })));
    if (pageUsers.length < perPage) break;
    page += 1;
  }

  if (SEED_USER_ID) {
    const user = users.find((u) => u.id === SEED_USER_ID);
    if (!user) throw new Error(`SEED_USER_ID not found: ${SEED_USER_ID}`);
    return user;
  }

  if (SEED_USER_EMAIL) {
    const user = users.find((u) => (u.email ?? "").toLowerCase() === SEED_USER_EMAIL.toLowerCase());
    if (user) return user;

    const password = SEED_USER_PASSWORD ?? `Vv!${Math.random().toString(36).slice(-10)}9`;
    const { data, error } = await supabase.auth.admin.createUser({
      email: SEED_USER_EMAIL,
      password,
      email_confirm: true
    });
    if (error) throw error;

    if (!data.user?.id) throw new Error("Failed to create seed auth user.");

    console.log(
      JSON.stringify(
        {
          info: "Seed auth user created.",
          seedUserEmail: SEED_USER_EMAIL,
          generatedPassword: SEED_USER_PASSWORD ? null : password
        },
        null,
        2
      )
    );

    return { id: data.user.id, email: data.user.email };
  }

  if (users.length === 1) return users[0];

  throw new Error(
    `Cannot infer target user automatically. Found ${users.length} users. Set SEED_USER_ID or SEED_USER_EMAIL (and optional SEED_USER_PASSWORD) in apps/api/.env.`
  );
}

async function main() {
  const targetUser = await resolveTargetUser();

  const planCode = "starter";
  const tenantSlug = "vvconsulting-mvp";
  const tenantDisplayName = "VV Consulting MVP";
  const tenantLegalName = "VV Consulting";

  const featureCodes = [
    "mod_recruitment",
    "mod_documents",
    "mod_payslips",
    "mod_time_tracking",
    "mod_oncall"
  ];

  const { data: planRows, error: planError } = await supabase
    .from("plans")
    .upsert(
      {
        code: planCode,
        name: "Starter",
        description: "Plano base para operacao inicial."
      },
      { onConflict: "code" }
    )
    .select("id, code")
    .limit(1);
  if (planError) throw planError;
  const planId = planRows?.[0]?.id as string | undefined;
  if (!planId) throw new Error("Failed to resolve starter plan.");

  const featureUpserts = featureCodes.map((code) => ({
    code,
    name: code.replace("mod_", "").replaceAll("_", " ").toUpperCase(),
    description: `Feature ${code}`
  }));
  const { error: featureError } = await supabase
    .from("feature_flags")
    .upsert(featureUpserts, { onConflict: "code" });
  if (featureError) throw featureError;

  const { data: featureRows, error: featureSelectError } = await supabase
    .from("feature_flags")
    .select("id, code")
    .in("code", featureCodes);
  if (featureSelectError) throw featureSelectError;

  const { data: tenantRows, error: tenantError } = await supabase
    .from("tenants")
    .upsert(
      {
        slug: tenantSlug,
        display_name: tenantDisplayName,
        legal_name: tenantLegalName,
        is_active: true
      },
      { onConflict: "slug" }
    )
    .select("id, slug")
    .limit(1);
  if (tenantError) throw tenantError;
  const tenantId = tenantRows?.[0]?.id as string | undefined;
  if (!tenantId) throw new Error("Failed to resolve tenant.");

  const { data: subRows, error: subSelectError } = await supabase
    .from("tenant_subscriptions")
    .select("id, status")
    .eq("tenant_id", tenantId)
    .eq("plan_id", planId)
    .order("starts_at", { ascending: false })
    .limit(1);
  if (subSelectError) throw subSelectError;

  if (!subRows || subRows.length === 0) {
    const { error: subInsertError } = await supabase.from("tenant_subscriptions").insert({
      tenant_id: tenantId,
      plan_id: planId,
      status: "active",
      starts_at: new Date().toISOString(),
      ends_at: null
    });
    if (subInsertError) throw subInsertError;
  } else if (subRows[0].status !== "active") {
    const { error: subUpdateError } = await supabase
      .from("tenant_subscriptions")
      .update({ status: "active", ends_at: null })
      .eq("id", subRows[0].id);
    if (subUpdateError) throw subUpdateError;
  }

  const tenantFeatures = (featureRows ?? []).map((row) => ({
    tenant_id: tenantId,
    feature_id: row.id,
    is_enabled: true
  }));
  if (tenantFeatures.length > 0) {
    const { error: tenantFeatureError } = await supabase
      .from("tenant_features")
      .upsert(tenantFeatures, { onConflict: "tenant_id,feature_id" });
    if (tenantFeatureError) throw tenantFeatureError;
  }

  const { error: roleError } = await supabase.from("user_tenant_roles").upsert(
    {
      tenant_id: tenantId,
      user_id: targetUser.id,
      role: "admin",
      is_active: true
    },
    { onConflict: "tenant_id,user_id,role" }
  );
  if (roleError) throw roleError;

  for (const dataType of ["documents", "payslips", "time_entries", "audit_logs"]) {
    const { data: retentionRows, error: retentionSelectError } = await supabase
      .from("retention_policies")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("data_type", dataType)
      .limit(1);
    if (retentionSelectError) throw retentionSelectError;

    if (!retentionRows || retentionRows.length === 0) {
      const { error: retentionInsertError } = await supabase.from("retention_policies").insert({
        tenant_id: tenantId,
        data_type: dataType,
        retention_years: 5,
        is_default: false
      });
      if (retentionInsertError) throw retentionInsertError;
    } else {
      const { error: retentionUpdateError } = await supabase
        .from("retention_policies")
        .update({ retention_years: 5, is_default: false })
        .eq("id", retentionRows[0].id);
      if (retentionUpdateError) throw retentionUpdateError;
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        tenantId,
        tenantSlug,
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email ?? null
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[seed-remote-minimal] failed", error);
  process.exit(1);
});
