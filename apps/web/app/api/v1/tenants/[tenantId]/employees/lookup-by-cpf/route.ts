export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const cpf = new URL(request.url).searchParams.get("cpf") ?? "";
  const { runTenantEmployeeLookupByCpfGet } = await import("@vv/api/run-tenant-employee-lookup-gets");
  const auth = request.headers.get("authorization");
  const { status, body } = await runTenantEmployeeLookupByCpfGet(auth, tenantId, cpf);
  return Response.json(body, { status });
}
