export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantId: string; documentId: string }> }
) {
  const { tenantId, documentId } = await context.params;
  const { runTenantDocumentOpenGet } = await import("@vv/api/run-tenant-data-gets");
  const auth = request.headers.get("authorization");
  const xCompany = request.headers.get("x-tenant-company-id");
  const { status, body } = await runTenantDocumentOpenGet(auth, tenantId, documentId, xCompany);
  return Response.json(body, { status });
}
