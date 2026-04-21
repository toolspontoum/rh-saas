import { toHttpError } from "./http/error-handler.js";
import { workforceHandlers } from "./modules/workforce/index.js";
import { getBearerSession } from "./session-from-bearer.js";
import { resolveCompanyScopeFromHeader } from "./tenant-company-from-header.js";

export type JsonHttpResult = { status: number; body: unknown };

/** POST /v1/tenants/:id/time-entries */
export async function runTimeEntryPost(
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
    const result = await workforceHandlers.createTimeEntry({
      tenantId,
      companyId: scope.companyId,
      userId: s.userId,
      contract: body.contract ?? null,
      entryType: body.entryType,
      recordedAt: body.recordedAt,
      source: body.source ?? "web",
      note: body.note ?? null
    });
    return { status: 201, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** PATCH /v1/tenants/:id/time-entries/:entryId */
export async function runTimeEntryPatch(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  entryId: string,
  body: Record<string, unknown>,
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId, { authorizationHeader, actorUserId: s.userId });
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await workforceHandlers.updateTimeEntry({
      tenantId,
      companyId: scope.companyId,
      userId: s.userId,
      entryId,
      recordedAt: body.recordedAt,
      reason: body.reason ?? null
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** GET /v1/tenants/:id/time-entries/:entryId/change-logs */
export async function runTimeEntryChangeLogsGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  entryId: string,
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId, { authorizationHeader, actorUserId: s.userId });
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await workforceHandlers.listTimeEntryChangeLogs({
      tenantId,
      companyId: scope.companyId,
      userId: s.userId,
      entryId
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** POST /v1/tenants/:id/time-adjustments */
export async function runTimeAdjustmentPost(
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
    const result = await workforceHandlers.createAdjustment({
      tenantId,
      companyId: scope.companyId,
      userId: s.userId,
      targetDate: body.targetDate,
      requestedTime: body.requestedTime,
      reason: body.reason,
      timeEntryId: body.timeEntryId ?? null,
      targetEntryType: body.targetEntryType ?? null,
      requestedRecordedAt: body.requestedRecordedAt ?? null
    });
    return { status: 201, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** PATCH /v1/tenants/:id/time-adjustments/:adjustmentId/review */
export async function runTimeAdjustmentReviewPatch(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  adjustmentId: string,
  body: Record<string, unknown>,
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId, { authorizationHeader, actorUserId: s.userId });
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await workforceHandlers.reviewAdjustment({
      tenantId,
      companyId: scope.companyId,
      userId: s.userId,
      adjustmentId,
      status: body.status,
      reviewNote: body.reviewNote
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** POST /v1/tenants/:id/time-reports/closures */
export async function runTimeReportClosurePost(
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
    const result = await workforceHandlers.closeMonthlyReport({
      tenantId,
      companyId: scope.companyId,
      userId: s.userId,
      targetUserId: body.targetUserId,
      referenceMonth: body.referenceMonth
    });
    return { status: 201, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** GET /v1/tenants/:id/time-reports/closures/:closureId */
export async function runTimeReportClosureGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  closureId: string,
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId, { authorizationHeader, actorUserId: s.userId });
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await workforceHandlers.getTimeReportClosure({
      tenantId,
      companyId: scope.companyId,
      userId: s.userId,
      closureId
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}
