export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request, context: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await context.params;
  const { runTenantWorkRulesGet } = await import("@vv/api/run-tenant-data-gets");
  const auth = request.headers.get("authorization");
  const companyHeader = request.headers.get("x-tenant-company-id");
  const out = await runTenantWorkRulesGet(auth, tenantId, companyHeader ?? undefined);
  return Response.json(out.body, { status: out.status });
}
