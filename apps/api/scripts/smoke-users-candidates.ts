import { config } from "dotenv";

config();

const apiBaseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:3333";
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.SMOKE_USER_EMAIL;
const password = process.env.SMOKE_USER_PASSWORD;
const tenantId = process.env.SMOKE_TENANT_ID;

if (!supabaseUrl || !anonKey) {
  throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}
if (!email || !password || !tenantId) {
  throw new Error("Set SMOKE_USER_EMAIL, SMOKE_USER_PASSWORD and SMOKE_TENANT_ID in apps/api/.env.");
}

async function getJwt() {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`JWT request failed: ${response.status} ${body}`);
  }

  return (await response.json()) as { access_token: string };
}

async function callApi(path: string, token: string) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const body = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

async function main() {
  const { access_token } = await getJwt();

  const users = await callApi(`/v1/tenants/${tenantId}/users?page=1&pageSize=20`, access_token);
  const candidates = await callApi(
    `/v1/tenants/${tenantId}/candidates?page=1&pageSize=20&isActive=true`,
    access_token
  );

  console.log(
    JSON.stringify(
      {
        users,
        candidates
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[smoke-users-candidates] failed", error);
  process.exit(1);
});

