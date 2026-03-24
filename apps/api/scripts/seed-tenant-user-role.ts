import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config();

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const tenantId = process.env.ROLE_SEED_TENANT_ID;
const userEmail = process.env.ROLE_SEED_USER_EMAIL;
const userPassword = process.env.ROLE_SEED_USER_PASSWORD ?? "TempPass#2026";
const role = process.env.ROLE_SEED_ROLE ?? "analyst";

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

if (!tenantId || !userEmail) {
  throw new Error("Set ROLE_SEED_TENANT_ID and ROLE_SEED_USER_EMAIL in env");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function resolveUserIdByEmail(email: string): Promise<string> {
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    const found = users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
    if (found?.id) return found.id;
    if (users.length < perPage) break;
    page += 1;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: userPassword,
    email_confirm: true
  });
  if (error) throw error;
  if (!data.user?.id) throw new Error("Failed to create user");
  return data.user.id;
}

async function main() {
  const userId = await resolveUserIdByEmail(userEmail);

  const { error } = await supabase.from("user_tenant_roles").upsert(
    {
      tenant_id: tenantId,
      user_id: userId,
      role,
      is_active: true
    },
    { onConflict: "tenant_id,user_id,role" }
  );
  if (error) throw error;

  console.log(
    JSON.stringify(
      {
        ok: true,
        tenantId,
        userEmail,
        userId,
        role
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[seed-tenant-user-role] failed", error);
  process.exit(1);
});

