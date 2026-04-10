export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ tenantId: string; entryId: string }> }
) {
  const { tenantId, entryId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { runTimeEntryPatch } = await import("@vv/api/run-workforce-time-mutations");
  const auth = request.headers.get("authorization");
  const companyHeader = request.headers.get("x-tenant-company-id");
  const out = await runTimeEntryPatch(auth, tenantId, entryId, body, companyHeader ?? undefined);
  return Response.json(out.body, { status: out.status });
}
