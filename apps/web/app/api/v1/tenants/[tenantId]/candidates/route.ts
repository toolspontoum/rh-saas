export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const url = new URL(request.url);
  const { runTenantCandidatesListGet } = await import("@vv/api/run-tenant-data-gets");
  const auth = request.headers.get("authorization");
  const xCompany = request.headers.get("x-tenant-company-id");
  const { status, body } = await runTenantCandidatesListGet(
    auth,
    tenantId,
    {
      candidateName: url.searchParams.get("candidateName") ?? undefined,
      contract: url.searchParams.get("contract") ?? undefined,
      isActive: url.searchParams.get("isActive") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined
    },
    xCompany
  );
  return Response.json(body, { status });
}
