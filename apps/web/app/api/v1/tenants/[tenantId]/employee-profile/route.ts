export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const url = new URL(request.url);
  const { runTenantEmployeeProfileGet } = await import("@vv/api/run-tenant-data-gets");
  const auth = request.headers.get("authorization");
  const xCompany = request.headers.get("x-tenant-company-id");
  const { status, body } = await runTenantEmployeeProfileGet(
    auth,
    tenantId,
    { targetUserId: url.searchParams.get("targetUserId") ?? undefined },
    xCompany
  );
  return Response.json(body, { status });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const { runTenantEmployeeProfilePut } = await import("@vv/api/run-tenant-writes");
  const auth = request.headers.get("authorization");
  const xCompany = request.headers.get("x-tenant-company-id");
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const { status, body: out } = await runTenantEmployeeProfilePut(
    auth,
    tenantId,
    {
      targetUserId: typeof body.targetUserId === "string" ? body.targetUserId : undefined,
      fullName: typeof body.fullName === "string" ? body.fullName : null,
      personalEmail: typeof body.personalEmail === "string" ? body.personalEmail : null,
      cpf: typeof body.cpf === "string" ? body.cpf : null,
      phone: typeof body.phone === "string" ? body.phone : null,
      department: typeof body.department === "string" ? body.department : null,
      positionTitle: typeof body.positionTitle === "string" ? body.positionTitle : null,
      contractType: typeof body.contractType === "string" ? body.contractType : null,
      admissionDate: typeof body.admissionDate === "string" ? body.admissionDate : null,
      baseSalary: typeof body.baseSalary === "number" ? body.baseSalary : null,
      employeeTags: Array.isArray(body.employeeTags) ? (body.employeeTags as string[]) : []
    },
    xCompany
  );
  return Response.json(out, { status });
}
