export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ segments: string[] }> }
) {
  const { segments } = await context.params;

  if (segments.length === 1) {
    const url = new URL(request.url);
    const { runPublicJobsBySegmentGet } = await import("@vv/api/run-public-jobs");
    const { status, body } = await runPublicJobsBySegmentGet(segments[0] ?? "", {
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
      companyId: url.searchParams.get("companyId") ?? undefined
    });
    return Response.json(body, { status });
  }

  if (segments.length === 2) {
    const { runPublicJobByTenantAndIdGet } = await import("@vv/api/run-public-jobs");
    const { status, body } = await runPublicJobByTenantAndIdGet(segments[0] ?? "", segments[1] ?? "");
    return Response.json(body, { status });
  }

  return Response.json(
    {
      error: "NOT_FOUND",
      message: "Rota publica de vagas invalida."
    },
    { status: 404 }
  );
}
