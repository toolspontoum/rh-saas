export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const url = new URL(request.url);
  const { runTenantRecruitmentApplicationsListGet } = await import("@vv/api/run-tenant-data-gets");
  const auth = request.headers.get("authorization");
  const xCompany = request.headers.get("x-tenant-company-id");
  const { status, body } = await runTenantRecruitmentApplicationsListGet(
    auth,
    tenantId,
    {
      candidateName: url.searchParams.get("candidateName") ?? undefined,
      candidateEmail: url.searchParams.get("candidateEmail") ?? undefined,
      candidateCpf: url.searchParams.get("candidateCpf") ?? undefined,
      jobId: url.searchParams.get("jobId") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      createdFrom: url.searchParams.get("createdFrom") ?? undefined,
      createdTo: url.searchParams.get("createdTo") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined
    },
    xCompany
  );
  return Response.json(body, { status });
}
