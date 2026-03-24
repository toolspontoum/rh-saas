export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { runPlatformSuperadminsGet } = await import("@vv/api/run-platform-admin-gets");
  const auth = request.headers.get("authorization");
  const { status, body } = await runPlatformSuperadminsGet(auth);
  return Response.json(body, { status });
}
