export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const url = new URL(request.url);
  const { runTenantPayslipsListGet } = await import("@vv/api/run-tenant-data-gets");
  const auth = request.headers.get("authorization");
  const xCompany = request.headers.get("x-tenant-company-id");
  const { status, body } = await runTenantPayslipsListGet(
    auth,
    tenantId,
    {
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
      contract: url.searchParams.get("contract") ?? undefined,
      collaboratorName: url.searchParams.get("collaboratorName") ?? undefined,
      collaboratorEmail: url.searchParams.get("collaboratorEmail") ?? undefined,
      collaboratorCpf: url.searchParams.get("collaboratorCpf") ?? undefined,
      referenceMonth: url.searchParams.get("referenceMonth") ?? undefined,
      mineOnly: url.searchParams.get("mineOnly") ?? undefined,
      employeeUserId: url.searchParams.get("employeeUserId") ?? undefined
    },
    xCompany
  );
  return Response.json(body, { status });
}
