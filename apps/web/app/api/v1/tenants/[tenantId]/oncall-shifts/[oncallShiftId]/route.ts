export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantId: string; oncallShiftId: string }> }
) {
  const { tenantId, oncallShiftId } = await context.params;
  const { runTenantOncallShiftByIdGet } = await import("@vv/api/run-tenant-data-gets");
  const auth = request.headers.get("authorization");
  const xCompany = request.headers.get("x-tenant-company-id");
  const { status, body } = await runTenantOncallShiftByIdGet(auth, tenantId, oncallShiftId, xCompany);
  return Response.json(body, { status });
}
