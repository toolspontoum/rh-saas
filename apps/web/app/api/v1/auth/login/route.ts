export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { runAuthLoginPost } = await import("@vv/api/run-auth-login");
  let body: { email?: unknown; password?: unknown };
  try {
    body = (await request.json()) as { email?: unknown; password?: unknown };
  } catch {
    return Response.json({ error: "VALIDATION", message: "Corpo da requisição inválido." }, { status: 400 });
  }
  const { status, body: result } = await runAuthLoginPost(body);
  return Response.json(result, { status });
}
