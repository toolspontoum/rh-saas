/**
 * Rotas de lotes IA de contracheques sem carregar Express (evita 504 por cold start na Vercel).
 */
import { toHttpError } from "./http/error-handler.js";
import { documentsPayslipsHandlers } from "./modules/documents-payslips/index.js";
import { getBearerSession } from "./session-from-bearer.js";
import { resolveCompanyScopeFromHeader } from "./tenant-company-from-header.js";

export type JsonHttpResult = { status: number; body: unknown };

export async function runPayslipBatchesListGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  query: { page?: string; pageSize?: string },
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId, { authorizationHeader, actorUserId: s.userId });
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await documentsPayslipsHandlers.listPayslipAiBatches({
      userId: s.userId,
      tenantId,
      companyId: scope.companyId,
      page: query.page,
      pageSize: query.pageSize
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

export async function runPayslipUploadIntentPost(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  body: Record<string, unknown>,
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId, { authorizationHeader, actorUserId: s.userId });
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await documentsPayslipsHandlers.createPayslipUploadIntent({
      userId: s.userId,
      tenantId,
      companyId: scope.companyId,
      referenceMonth: body.referenceMonth,
      fileName: body.fileName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

export async function runPayslipConfirmAiBulkPost(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  body: Record<string, unknown>,
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId, { authorizationHeader, actorUserId: s.userId });
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await documentsPayslipsHandlers.confirmAiBulkPayslips({
      userId: s.userId,
      tenantId,
      companyId: scope.companyId,
      title: body.title,
      referenceMonth: body.referenceMonth,
      files: body.files
    });
    return { status: 201, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}
