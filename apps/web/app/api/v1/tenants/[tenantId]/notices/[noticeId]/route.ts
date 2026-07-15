export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantId: string; noticeId: string }> }
) {
  const { tenantId, noticeId } = await context.params;
  const { runTenantNoticeDetailsGet } = await import("@vv/api/run-tenant-data-gets");
  const auth = request.headers.get("authorization");
  const companyHeader = request.headers.get("x-tenant-company-id");
  const out = await runTenantNoticeDetailsGet(auth, tenantId, noticeId, companyHeader ?? undefined);
  return Response.json(out.body, { status: out.status });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ tenantId: string; noticeId: string }> }
) {
  const { tenantId, noticeId } = await context.params;
  const { runTenantNoticeDelete } = await import("@vv/api/run-tenant-writes");
  const auth = request.headers.get("authorization");
  const companyHeader = request.headers.get("x-tenant-company-id");
  const out = await runTenantNoticeDelete(auth, tenantId, noticeId, companyHeader ?? undefined);
  return Response.json(out.body, { status: out.status });
}

