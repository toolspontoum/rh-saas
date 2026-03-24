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
  if (!response.ok) throw new Error(await response.text());
  return (await response.json()) as { access_token: string };
}

async function callApi(path: string, token: string, init?: RequestInit) {
  const headers = new Headers(init?.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);
  if (init?.body) headers.set("Content-Type", "application/json");

  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  const body = await response.text();
  return { ok: response.ok, status: response.status, body };
}

async function main() {
  const { access_token } = await getJwt();

  const notice = await callApi(`/v1/tenants/${tenantId}/notices`, access_token, {
    method: "POST",
    body: JSON.stringify({
      title: "Aviso smoke",
      message: "Comunicado criado via smoke.",
      target: "all"
    })
  });

  const timeIn = await callApi(`/v1/tenants/${tenantId}/time-entries`, access_token, {
    method: "POST",
    body: JSON.stringify({
      entryType: "clock_in",
      recordedAt: new Date().toISOString(),
      source: "smoke"
    })
  });

  const oncall = await callApi(`/v1/tenants/${tenantId}/oncall-entries`, access_token, {
    method: "POST",
    body: JSON.stringify({
      oncallDate: "2026-02-12",
      startTime: "18:00",
      endTime: "20:00",
      oncallType: "plantao_tech",
      note: "registro smoke"
    })
  });

  const noticesList = await callApi(`/v1/tenants/${tenantId}/notices?onlyActive=true`, access_token);
  const timeList = await callApi(`/v1/tenants/${tenantId}/time-entries?page=1&pageSize=5`, access_token);
  const getWorkRule = await callApi(`/v1/tenants/${tenantId}/work-rules`, access_token);
  const updateWorkRule = await callApi(`/v1/tenants/${tenantId}/work-rules`, access_token, {
    method: "PUT",
    body: JSON.stringify({
      dailyWorkMinutes: 480,
      nightStart: "22:00",
      nightEnd: "05:00"
    })
  });
  const summary = await callApi(
    `/v1/tenants/${tenantId}/time-reports/summary?from=2026-02-01&to=2026-02-28`,
    access_token
  );
  const oncallList = await callApi(
    `/v1/tenants/${tenantId}/oncall-entries?mineOnly=true&page=1&pageSize=5`,
    access_token
  );

  console.log(
    JSON.stringify(
      {
        notice,
        timeIn,
        oncall,
        noticesList,
        timeList,
        getWorkRule,
        updateWorkRule,
        summary,
        oncallList
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[smoke-workforce] failed", error);
  process.exit(1);
});
