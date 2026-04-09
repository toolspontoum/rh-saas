export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ tenantId: string; batchId: string }> }
) {
  const { tenantId, batchId } = await context.params;
  const auth = request.headers.get("authorization");
  const xCompany = request.headers.get("x-tenant-company-id");
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "INVALID_BODY", message: "Corpo da requisicao invalido." },
      { status: 400 }
    );
  }
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return Response.json(
      { error: "FILES_REQUIRED", message: "Envie ao menos um arquivo para esta operacao." },
      { status: 400 }
    );
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const { runEmployeePreregProcessPost } = await import("@vv/api/run-employee-prereg");
  const { status, body } = await runEmployeePreregProcessPost(auth, tenantId, batchId, {
    buffer: buf,
    fileName: file.name || "documento",
    mimeType: file.type || null
  }, xCompany);
  return Response.json(body, { status });
}
