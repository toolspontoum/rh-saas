import { env } from "./config/env.js";
import { toHttpError } from "./http/error-handler.js";
import { employeePreregHandlers } from "./modules/employee-prereg/index.js";
import { getBearerSession } from "./session-from-bearer.js";
import { resolveCompanyScopeFromHeader } from "./tenant-company-from-header.js";

export type JsonHttpResult = { status: number; body: unknown };

export async function runEmployeePreregListGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await employeePreregHandlers.listPreregistrations({
      tenantId,
      actorUserId: s.userId,
      companyId: scope.companyId
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

export async function runEmployeePreregBatchesLogGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  query: { limit?: string },
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await employeePreregHandlers.listBatches({
      tenantId,
      actorUserId: s.userId,
      companyId: scope.companyId,
      limit: query.limit
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

export async function runEmployeePreregBatchDetailGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  batchId: string,
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await employeePreregHandlers.getBatchDetail({
      tenantId,
      actorUserId: s.userId,
      companyId: scope.companyId,
      batchId
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

export async function runEmployeePreregDetailGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  preregId: string,
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await employeePreregHandlers.getPreregistrationDetail({
      tenantId,
      actorUserId: s.userId,
      companyId: scope.companyId,
      preregId
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

export async function runEmployeePreregCreateBatchPost(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  body: { expectedDocCount?: unknown },
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await employeePreregHandlers.createBatch({
      tenantId,
      actorUserId: s.userId,
      companyId: scope.companyId,
      expectedDocCount: body.expectedDocCount
    });
    return { status: 201, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

export async function runEmployeePreregUpdatePut(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  preregId: string,
  body: Record<string, unknown>,
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await employeePreregHandlers.updatePreregistrationPayload({
      tenantId,
      actorUserId: s.userId,
      companyId: scope.companyId,
      preregId,
      body
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

export async function runEmployeePreregDelete(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  preregId: string,
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await employeePreregHandlers.deletePreregistration({
      tenantId,
      actorUserId: s.userId,
      companyId: scope.companyId,
      preregId
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

export async function runEmployeePreregConfirmRegisterPost(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  preregId: string,
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await employeePreregHandlers.confirmRegister({
      tenantId,
      actorUserId: s.userId,
      companyId: scope.companyId,
      preregId
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

export async function runEmployeePreregConfirmLinkPost(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  preregId: string,
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await employeePreregHandlers.confirmLink({
      tenantId,
      actorUserId: s.userId,
      companyId: scope.companyId,
      preregId
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

export async function runEmployeePreregProcessPost(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  batchId: string,
  file: { buffer: Buffer; fileName: string; mimeType: string | null },
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };
  if (file.buffer.length > env.MAX_PDF_UPLOAD_SIZE_BYTES) {
    const parsed = toHttpError(new Error("FILE_TOO_LARGE"));
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
  try {
    const result = await employeePreregHandlers.processBatchFile({
      tenantId,
      actorUserId: s.userId,
      companyId: scope.companyId,
      batchId,
      fileName: file.fileName,
      mimeType: file.mimeType,
      buffer: file.buffer
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}
