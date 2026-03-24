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

async function callApi(path: string, token: string, init?: RequestInit) {
  const headers = new Headers(init?.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);
  if (init?.body) headers.set("Content-Type", "application/json");

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers
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

  const docs = await callApi(`/v1/tenants/${tenantId}/documents?page=1&pageSize=5`, access_token);
  const payslips = await callApi(`/v1/tenants/${tenantId}/payslips?page=1&pageSize=5`, access_token);
  const invalidUploadIntent = await callApi(`/v1/tenants/${tenantId}/documents/upload-intent`, access_token, {
    method: "POST",
    body: JSON.stringify({
      fileName: "invalid.txt",
      mimeType: "text/plain",
      sizeBytes: 100
    })
  });

  console.log(
    JSON.stringify(
      {
        docs,
        payslips,
        invalidUploadIntent
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[smoke-docs-payslips] failed", error);
  process.exit(1);
});

