export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const url = new URL(request.url);
  const { runTenantJobsListGet } = await import("@vv/api/run-tenant-data-gets");
  const auth = request.headers.get("authorization");
  const xCompany = request.headers.get("x-tenant-company-id");
  const { status, body } = await runTenantJobsListGet(
    auth,
    tenantId,
    {
      status: url.searchParams.get("status") ?? undefined,
      title: url.searchParams.get("title") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined
    },
    xCompany
  );
  return Response.json(body, { status });
}
