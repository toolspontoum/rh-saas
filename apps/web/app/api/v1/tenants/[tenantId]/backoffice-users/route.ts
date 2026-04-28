export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const { runTenantBackofficeUsersPost } = await import("@vv/api/run-tenant-writes");
  const auth = request.headers.get("authorization");
  const xCompany = request.headers.get("x-tenant-company-id");
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const { status, body: out } = await runTenantBackofficeUsersPost(
    auth,
    tenantId,
    {
      fullName: typeof body.fullName === "string" ? body.fullName : undefined,
      email: typeof body.email === "string" ? body.email : undefined,
      role: typeof body.role === "string" ? body.role : undefined,
      cpf: typeof body.cpf === "string" ? body.cpf : undefined,
      phone: typeof body.phone === "string" ? body.phone : undefined,
      prepostoCompanyId:
        typeof body.prepostoCompanyId === "string" ? body.prepostoCompanyId : undefined
    },
    xCompany
  );
  return Response.json(out, { status });
}
