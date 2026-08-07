/**
 * Ciclo das filas IA para uso com agendador HTTP (ex.: Vercel Cron).
 * Aceita GET (Cron Vercel) e POST.
 * Segredo: NEXOR_CRON_HTTP_SECRET (ou legado VV_CRON_HTTP_SECRET) e/ou CRON_SECRET.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function resolveCronSecret(): string | null {
  const dedicated =
    process.env.NEXOR_CRON_HTTP_SECRET?.trim() || process.env.VV_CRON_HTTP_SECRET?.trim();
  if (dedicated) return dedicated;
  const vercel = process.env.CRON_SECRET?.trim();
  return vercel || null;
}

function cronSecretMatches(request: Request, secret: string): boolean {
  const headerVal =
    request.headers.get("x-nexor-cron-secret")?.trim() ||
    request.headers.get("x-vv-cron-secret")?.trim();
  if (headerVal === secret) return true;
  const auth = request.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token === secret) return true;
    const vercelCron = process.env.CRON_SECRET?.trim();
    if (vercelCron && token === vercelCron) return true;
  }
  return false;
}

async function handle(request: Request): Promise<Response> {
  const secret = resolveCronSecret();
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
  const result = await runAiQueueTickFromHttpJob();

  return Response.json({ ok: true, ...result }, { status: 200 });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
