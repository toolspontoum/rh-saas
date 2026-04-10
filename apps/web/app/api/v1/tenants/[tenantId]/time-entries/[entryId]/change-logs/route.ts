export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantId: string; entryId: string }> }
) {
  const { tenantId, entryId } = await context.params;
  const { runTimeEntryChangeLogsGet } = await import("@vv/api/run-workforce-time-mutations");
  const auth = request.headers.get("authorization");
  const companyHeader = request.headers.get("x-tenant-company-id");
  const out = await runTimeEntryChangeLogsGet(auth, tenantId, entryId, companyHeader ?? undefined);
  return Response.json(out.body, { status: out.status });
}
