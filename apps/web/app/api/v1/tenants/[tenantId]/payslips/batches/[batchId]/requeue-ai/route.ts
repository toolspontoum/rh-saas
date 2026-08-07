export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ tenantId: string; batchId: string }> }
) {
  const { tenantId, batchId } = await context.params;
  const { runPayslipBatchRequeueAiPost } = await import("@vv/api/run-payslips-ai-vercel");
  const auth = request.headers.get("authorization");
  const companyHeader = request.headers.get("x-tenant-company-id");
  const out = await runPayslipBatchRequeueAiPost(
    auth,
    tenantId,
    batchId,
    companyHeader ?? undefined
  );
  return Response.json(out.body, { status: out.status });
}
