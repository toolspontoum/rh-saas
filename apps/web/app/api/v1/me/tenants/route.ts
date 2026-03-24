export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { runMyTenantsGet } = await import("@vv/api/run-my-tenants");
  const auth = request.headers.get("authorization");
  const { status, body } = await runMyTenantsGet(auth);
  return Response.json(body, { status });
}
