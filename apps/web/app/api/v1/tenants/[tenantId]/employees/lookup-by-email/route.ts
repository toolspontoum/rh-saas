export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const email = new URL(request.url).searchParams.get("email") ?? "";
  const { runTenantEmployeeLookupByEmailGet } = await import("@vv/api/run-tenant-employee-lookup-gets");
  const auth = request.headers.get("authorization");
  const { status, body } = await runTenantEmployeeLookupByEmailGet(auth, tenantId, email);
  return Response.json(body, { status });
}
