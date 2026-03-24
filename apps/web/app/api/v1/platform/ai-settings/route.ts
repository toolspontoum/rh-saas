export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { runPlatformAiSettingsGet } = await import("@vv/api/run-platform-admin-gets");
  const auth = request.headers.get("authorization");
  const { status, body } = await runPlatformAiSettingsGet(auth);
  return Response.json(body, { status });
}
