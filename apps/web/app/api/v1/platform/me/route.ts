/**
 * Evita carregar Express + serverless-http no cold start (causa comum de 504 no Hobby).
 * Mesmo contrato que GET /api/v1/platform/me via pages/api/[[...path]].
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { runPlatformMeGet } = await import("@vv/api/run-platform-me");
  const auth = request.headers.get("authorization");
  const { status, body } = await runPlatformMeGet(auth);
  return Response.json(body, { status });
}
