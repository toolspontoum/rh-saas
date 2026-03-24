export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const url = new URL(request.url);
  const { runTenantTimeReportsSummaryGet } = await import("@vv/api/run-tenant-data-gets");
  const auth = request.headers.get("authorization");
  const xCompany = request.headers.get("x-tenant-company-id");
  const { status, body } = await runTenantTimeReportsSummaryGet(
    auth,
    tenantId,
    {
      targetUserId: url.searchParams.get("targetUserId") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined
    },
    xCompany
  );
  return Response.json(body, { status });
}
