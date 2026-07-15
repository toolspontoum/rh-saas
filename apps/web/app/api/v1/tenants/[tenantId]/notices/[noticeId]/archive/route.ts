export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ tenantId: string; noticeId: string }> }
) {
  const { tenantId, noticeId } = await context.params;
  const { runTenantNoticeArchivePost } = await import("@vv/api/run-tenant-writes");
  const auth = request.headers.get("authorization");
  const companyHeader = request.headers.get("x-tenant-company-id");
  const out = await runTenantNoticeArchivePost(
    auth,
    tenantId,
    noticeId,
    companyHeader ?? undefined
  );
  return Response.json(out.body, { status: out.status });
}
