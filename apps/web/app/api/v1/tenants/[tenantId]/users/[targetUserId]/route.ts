export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantId: string; targetUserId: string }> }
) {
  const { tenantId, targetUserId } = await context.params;
  const { runTenantUserGet } = await import("@vv/api/run-tenant-users-get");
  const auth = request.headers.get("authorization");
  const xCompany = request.headers.get("x-tenant-company-id");
  const { status, body } = await runTenantUserGet(auth, tenantId, targetUserId, xCompany);
  return Response.json(body, { status });
}

/** DELETE /users/:id — evita 405 (App Router com apenas GET prevalece sobre o catch-all). */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ tenantId: string; targetUserId: string }> }
) {
  const { tenantId, targetUserId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { runTenantUserDelete } = await import("@vv/api/run-tenant-writes");
  const auth = request.headers.get("authorization");
  const xCompany = request.headers.get("x-tenant-company-id");
  const out = await runTenantUserDelete(auth, tenantId, targetUserId, body, xCompany);
  return Response.json(out.body, { status: out.status });
}
