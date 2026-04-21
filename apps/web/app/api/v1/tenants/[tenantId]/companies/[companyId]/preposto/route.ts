export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  context: { params: Promise<{ tenantId: string; companyId: string }> }
) {
  const { tenantId, companyId } = await context.params;
  const { runTenantCompanyPrepostoPut } = await import("@vv/api/run-tenant-writes");
  const auth = request.headers.get("authorization");
  let body: { userId?: unknown } = {};
  try {
    body = (await request.json()) as { userId?: unknown };
  } catch {
    body = {};
  }
  const { status, body: out } = await runTenantCompanyPrepostoPut(auth, tenantId, companyId, body);
  return Response.json(out, { status });
}
