export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const url = new URL(request.url);
  const { runTenantNoticesListGet } = await import("@vv/api/run-tenant-data-gets");
  const auth = request.headers.get("authorization");
  const companyHeader = request.headers.get("x-tenant-company-id");
  const out = await runTenantNoticesListGet(
    auth,
    tenantId,
    {
      onlyActive: url.searchParams.get("onlyActive") ?? undefined,
      onlyArchived: url.searchParams.get("onlyArchived") ?? undefined
    },
    companyHeader ?? undefined
  );
  return Response.json(out.body, { status: out.status });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { runTenantNoticesPost } = await import("@vv/api/run-tenant-writes");
  const auth = request.headers.get("authorization");
  const companyHeader = request.headers.get("x-tenant-company-id");
  const out = await runTenantNoticesPost(auth, tenantId, body, companyHeader ?? undefined);
  return Response.json(out.body, { status: out.status });
}
