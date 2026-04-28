export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantId: string; payslipId: string }> }
) {
  const { tenantId, payslipId } = await context.params;
  const { runTenantPayslipOpenGet } = await import("@vv/api/run-tenant-payslips-writes");
  const auth = request.headers.get("authorization");
  const companyHeader = request.headers.get("x-tenant-company-id");
  const out = await runTenantPayslipOpenGet(auth, tenantId, payslipId, companyHeader ?? undefined);
  return Response.json(out.body, { status: out.status });
}

