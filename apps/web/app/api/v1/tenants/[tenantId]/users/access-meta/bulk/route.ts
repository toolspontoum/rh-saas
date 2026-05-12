export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const { runTenantUsersAccessMetaBulkPost } = await import("@vv/api/run-tenant-writes");
  const auth = request.headers.get("authorization");
  const xCompany = request.headers.get("x-tenant-company-id");
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const { status, body: out } = await runTenantUsersAccessMetaBulkPost(auth, tenantId, body, xCompany);
  return Response.json(out, { status });
}
