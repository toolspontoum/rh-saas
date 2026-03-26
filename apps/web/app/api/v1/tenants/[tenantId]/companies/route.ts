export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const { runTenantCompaniesListGet } = await import("@vv/api/run-tenant-layout-gets");
  const auth = request.headers.get("authorization");
  const { status, body } = await runTenantCompaniesListGet(auth, tenantId);
  return Response.json(body, { status });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const { runTenantCompaniesPost } = await import("@vv/api/run-tenant-writes");
  const auth = request.headers.get("authorization");
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const { status, body: out } = await runTenantCompaniesPost(auth, tenantId, {
    name: typeof body.name === "string" ? body.name : undefined,
    taxId: typeof body.taxId === "string" ? body.taxId : null
  });
  return Response.json(out, { status });
}
