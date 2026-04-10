export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const url = new URL(request.url);
  const { runPayslipBatchesListGet } = await import("@vv/api/run-payslips-ai-vercel");
  const auth = request.headers.get("authorization");
  const companyHeader = request.headers.get("x-tenant-company-id");
  const out = await runPayslipBatchesListGet(
    auth,
    tenantId,
    {
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined
    },
    companyHeader ?? undefined
  );
  return Response.json(out.body, { status: out.status });
}
