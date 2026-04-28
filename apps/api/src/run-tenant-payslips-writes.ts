import { toHttpError } from "./http/error-handler.js";
import { documentsPayslipsHandlers } from "./modules/documents-payslips/index.js";
import { getBearerSession } from "./session-from-bearer.js";
import { resolveCompanyScopeFromHeader } from "./tenant-company-from-header.js";

export type JsonHttpResult = { status: number; body: unknown };

/** POST /v1/tenants/:tenantId/payslips/confirm-upload — evita cold start Express na Vercel. */
export async function runTenantPayslipConfirmUploadPost(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  body: Record<string, unknown>,
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId, {
    authorizationHeader,
    actorUserId: s.userId
  });
  if (!scope.ok) return { status: scope.status, body: scope.body };

  try {
    const result = await documentsPayslipsHandlers.confirmPayslipUpload({
      tenantId,
      userId: s.userId,
      companyId: scope.companyId ?? undefined,
      collaboratorName: typeof body.collaboratorName === "string" ? body.collaboratorName : undefined,
      collaboratorEmail: typeof body.collaboratorEmail === "string" ? body.collaboratorEmail : undefined,
      contract: typeof body.contract === "string" ? body.contract : null,
      referenceMonth: typeof body.referenceMonth === "string" ? body.referenceMonth : undefined,
      filePath: typeof body.filePath === "string" ? body.filePath : undefined,
      fileName: typeof body.fileName === "string" ? body.fileName : undefined,
      mimeType: typeof body.mimeType === "string" ? body.mimeType : undefined,
      sizeBytes: body.sizeBytes
    });
    return { status: 201, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** GET /v1/tenants/:tenantId/payslips/:payslipId/open — evita cold start Express na Vercel. */
export async function runTenantPayslipOpenGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  payslipId: string,
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId, {
    authorizationHeader,
    actorUserId: s.userId
  });
  if (!scope.ok) return { status: scope.status, body: scope.body };

  try {
    const result = await documentsPayslipsHandlers.openPayslip({
      tenantId,
      userId: s.userId,
      companyId: scope.companyId ?? undefined,
      payslipId
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

