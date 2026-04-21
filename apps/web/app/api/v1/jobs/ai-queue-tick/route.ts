/**
 * Ciclo único das filas IA para uso com agendador HTTP (ex.: Vercel Cron).
 * Exige VV_CRON_HTTP_SECRET e header dedicado ou Bearer com o mesmo valor.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function cronSecretMatches(request: Request, secret: string): boolean {
  const headerVal = request.headers.get("x-vv-cron-secret")?.trim();
  if (headerVal === secret) return true;
  const auth = request.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token === secret) return true;
  }
  return false;
}

export async function POST(request: Request) {
  const secret = process.env.VV_CRON_HTTP_SECRET?.trim();
  if (!secret) {
    return Response.json(
      {
        error: "CRON_SECRET_NOT_CONFIGURED",
        message: "Segredo de job HTTP nao configurado no servidor."
      },
      { status: 401 }
    );
  }
  if (!cronSecretMatches(request, secret)) {
    return Response.json({ error: "UNAUTHORIZED", message: "Credenciais invalidas." }, { status: 401 });
  }

  const { runAiQueueTickFromHttpJob } = await import("@vv/api/run-http-job-ai-tick");
  runAiQueueTickFromHttpJob();

  return Response.json({ ok: true, accepted: true }, { status: 202 });
}
