/**
 * Health check sem Express — evita cold start do pages/api/[[...path]].
 * Prioridade sobre o catch-all em pages quando ambos existem (Next 15).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ ok: true, scope: "app-router" });
}
