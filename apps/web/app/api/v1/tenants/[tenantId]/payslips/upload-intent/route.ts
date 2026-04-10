export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { runPayslipUploadIntentPost } = await import("@vv/api/run-payslips-ai-vercel");
  const auth = request.headers.get("authorization");
  const companyHeader = request.headers.get("x-tenant-company-id");
  const out = await runPayslipUploadIntentPost(auth, tenantId, body, companyHeader ?? undefined);
  return Response.json(out.body, { status: out.status });
}
