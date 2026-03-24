export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const { runTenantContextGet } = await import("@vv/api/run-tenant-layout-gets");
  const auth = request.headers.get("authorization");
  const { status, body } = await runTenantContextGet(auth, tenantId);
  return Response.json(body, { status });
}
