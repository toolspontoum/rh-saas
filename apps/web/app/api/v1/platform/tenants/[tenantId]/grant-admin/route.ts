export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params;
  const { runPlatformGrantAdminPost } = await import("@vv/api/run-platform-admin-gets");
  const auth = request.headers.get("authorization");
  const { status, body } = await runPlatformGrantAdminPost(auth, tenantId);
  return Response.json(body, { status });
}
