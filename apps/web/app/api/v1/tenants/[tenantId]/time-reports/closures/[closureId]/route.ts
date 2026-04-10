export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantId: string; closureId: string }> }
) {
  const { tenantId, closureId } = await context.params;
  const { runTimeReportClosureGet } = await import("@vv/api/run-workforce-time-mutations");
  const auth = request.headers.get("authorization");
  const companyHeader = request.headers.get("x-tenant-company-id");
  const out = await runTimeReportClosureGet(auth, tenantId, closureId, companyHeader ?? undefined);
  return Response.json(out.body, { status: out.status });
}
