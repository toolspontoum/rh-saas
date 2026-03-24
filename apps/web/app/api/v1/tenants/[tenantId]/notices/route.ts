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
  const xCompany = request.headers.get("x-tenant-company-id");
  const { status, body } = await runTenantNoticesListGet(
    auth,
    tenantId,
    {
      onlyActive: url.searchParams.get("onlyActive") ?? undefined,
      onlyArchived: url.searchParams.get("onlyArchived") ?? undefined
    },
    xCompany
  );
  return Response.json(body, { status });
}
