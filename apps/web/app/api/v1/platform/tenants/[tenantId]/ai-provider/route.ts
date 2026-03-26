export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const { runPlatformTenantAiProviderPatch } = await import("@vv/api/run-platform-admin-gets");
  const auth = request.headers.get("authorization");
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const { status, body: out } = await runPlatformTenantAiProviderPatch(auth, tenantId, body);
  return Response.json(out, { status });
}
