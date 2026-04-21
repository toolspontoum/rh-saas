export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ tenantId: string; companyId: string }> }
) {
  const { tenantId, companyId } = await context.params;
  const { runTenantCompaniesPatch } = await import("@vv/api/run-tenant-writes");
  const auth = request.headers.get("authorization");
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const taxIdRaw = body.taxId;
  const taxId =
    taxIdRaw === null ? null : typeof taxIdRaw === "string" ? taxIdRaw : undefined;
  const { status, body: out } = await runTenantCompaniesPatch(auth, tenantId, companyId, {
    name: typeof body.name === "string" ? body.name : undefined,
    taxId
  });
  return Response.json(out, { status });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ tenantId: string; companyId: string }> }
) {
  const { tenantId, companyId } = await context.params;
  const { runTenantCompaniesDelete } = await import("@vv/api/run-tenant-writes");
  const auth = request.headers.get("authorization");
  const { status, body: out } = await runTenantCompaniesDelete(auth, tenantId, companyId);
  return Response.json(out, { status });
}
