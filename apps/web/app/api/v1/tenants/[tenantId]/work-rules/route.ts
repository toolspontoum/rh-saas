export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const { runTenantWorkRulesGet } = await import("@vv/api/run-tenant-data-gets");
  const auth = request.headers.get("authorization");
  const xCompany = request.headers.get("x-tenant-company-id");
  const { status, body } = await runTenantWorkRulesGet(auth, tenantId, xCompany);
  return Response.json(body, { status });
}
