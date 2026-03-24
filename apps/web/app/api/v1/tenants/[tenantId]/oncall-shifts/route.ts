export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const url = new URL(request.url);
  const { runTenantOncallShiftsListGet } = await import("@vv/api/run-tenant-data-gets");
  const auth = request.headers.get("authorization");
  const xCompany = request.headers.get("x-tenant-company-id");
  const { status, body } = await runTenantOncallShiftsListGet(
    auth,
    tenantId,
    {
      targetUserId: url.searchParams.get("targetUserId") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      name: url.searchParams.get("name") ?? undefined,
      email: url.searchParams.get("email") ?? undefined,
      cpf: url.searchParams.get("cpf") ?? undefined,
      department: url.searchParams.get("department") ?? undefined,
      positionTitle: url.searchParams.get("positionTitle") ?? undefined,
      contractType: url.searchParams.get("contractType") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      tag: url.searchParams.get("tag") ?? undefined,
      mineOnly: url.searchParams.get("mineOnly") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined
    },
    xCompany
  );
  return Response.json(body, { status });
}
