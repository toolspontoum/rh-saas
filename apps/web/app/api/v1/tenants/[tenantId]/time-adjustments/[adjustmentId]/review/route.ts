export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ tenantId: string; adjustmentId: string }> }
) {
  const { tenantId, adjustmentId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { runTimeAdjustmentReviewPatch } = await import("@vv/api/run-workforce-time-mutations");
  const auth = request.headers.get("authorization");
  const companyHeader = request.headers.get("x-tenant-company-id");
  const out = await runTimeAdjustmentReviewPatch(
    auth,
    tenantId,
    adjustmentId,
    body,
    companyHeader ?? undefined
  );
  return Response.json(out.body, { status: out.status });
}
