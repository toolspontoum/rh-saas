export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function DELETE(
  request: Request,
  context: { params: Promise<{ tenantId: string; assignmentId: string }> }
) {
  const { tenantId, assignmentId } = await context.params;
  const { runTenantShiftAssignmentDelete } = await import("@vv/api/run-tenant-writes");
  const auth = request.headers.get("authorization");
  const companyHeader = request.headers.get("x-tenant-company-id");
  const out = await runTenantShiftAssignmentDelete(auth, tenantId, assignmentId, companyHeader ?? undefined);
  if (out.status === 204) {
    return new Response(null, { status: 204 });
  }
  return Response.json(out.body, { status: out.status });
}
