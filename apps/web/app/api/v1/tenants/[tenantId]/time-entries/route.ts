export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const url = new URL(request.url);
  const { runTenantTimeEntriesListGet } = await import("@vv/api/run-tenant-data-gets");
  const auth = request.headers.get("authorization");
  const companyHeader = request.headers.get("x-tenant-company-id");
  const out = await runTenantTimeEntriesListGet(
    auth,
    tenantId,
    {
      targetUserId: url.searchParams.get("targetUserId") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined
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
  const { runTimeEntryPost } = await import("@vv/api/run-workforce-time-mutations");
  const auth = request.headers.get("authorization");
  const companyHeader = request.headers.get("x-tenant-company-id");
  const out = await runTimeEntryPost(auth, tenantId, body, companyHeader ?? undefined);
  return Response.json(out.body, { status: out.status });
}
