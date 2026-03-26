export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { runPlatformTenantsGet } = await import("@vv/api/run-platform-admin-gets");
  const auth = request.headers.get("authorization");
  const { status, body } = await runPlatformTenantsGet(auth);
  return Response.json(body, { status });
}

export async function POST(request: Request) {
  const { runPlatformTenantsPost } = await import("@vv/api/run-platform-admin-gets");
  const auth = request.headers.get("authorization");
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const { status, body: out } = await runPlatformTenantsPost(auth, body);
  return Response.json(out, { status });
}
