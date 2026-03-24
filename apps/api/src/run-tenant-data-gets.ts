import { toHttpError } from "./http/error-handler.js";
import { documentsPayslipsHandlers } from "./modules/documents-payslips/index.js";
import { recruitmentHandlers } from "./modules/recruitment/index.js";
import { workforceHandlers } from "./modules/workforce/index.js";
import { getBearerSession } from "./session-from-bearer.js";
import { resolveCompanyScopeFromHeader } from "./tenant-company-from-header.js";

export type JsonHttpResult = { status: number; body: unknown };

/** GET /v1/tenants/:tenantId/employee-profile */
export async function runTenantEmployeeProfileGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  query: { targetUserId?: string },
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await workforceHandlers.getEmployeeProfile({
      tenantId,
      companyId: scope.companyId ?? undefined,
      userId: s.userId,
      targetUserId: query.targetUserId
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** GET /v1/tenants/:tenantId/jobs */
export async function runTenantJobsListGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  query: {
    status?: string;
    title?: string;
    page?: string;
    pageSize?: string;
  },
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await recruitmentHandlers.listJobs({
      tenantId,
      userId: s.userId,
      companyId: scope.companyId ?? undefined,
      status: query.status,
      title: query.title,
      page: query.page,
      pageSize: query.pageSize
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** GET /v1/tenants/:tenantId/candidates */
export async function runTenantCandidatesListGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  query: {
    candidateName?: string;
    contract?: string;
    isActive?: string;
    page?: string;
    pageSize?: string;
  },
  _xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  try {
    const result = await recruitmentHandlers.listCandidates({
      tenantId,
      userId: s.userId,
      candidateName: query.candidateName,
      contract: query.contract,
      isActive: query.isActive,
      page: query.page,
      pageSize: query.pageSize
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** GET /v1/tenants/:tenantId/recruitment/applications */
export async function runTenantRecruitmentApplicationsListGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  query: {
    candidateName?: string;
    candidateEmail?: string;
    candidateCpf?: string;
    jobId?: string;
    status?: string;
    createdFrom?: string;
    createdTo?: string;
    page?: string;
    pageSize?: string;
  },
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await recruitmentHandlers.listTenantApplications({
      tenantId,
      userId: s.userId,
      companyId: scope.companyId ?? undefined,
      candidateName: query.candidateName,
      candidateEmail: query.candidateEmail,
      candidateCpf: query.candidateCpf,
      jobId: query.jobId,
      status: query.status,
      createdFrom: query.createdFrom,
      createdTo: query.createdTo,
      page: query.page,
      pageSize: query.pageSize
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** GET /v1/tenants/:tenantId/time-entries */
export async function runTenantTimeEntriesListGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  query: { targetUserId?: string; page?: string; pageSize?: string },
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await workforceHandlers.listTimeEntries({
      tenantId,
      companyId: scope.companyId ?? undefined,
      userId: s.userId,
      targetUserId: query.targetUserId,
      page: query.page,
      pageSize: query.pageSize
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** GET /v1/tenants/:tenantId/time-adjustments */
export async function runTenantTimeAdjustmentsListGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  query: {
    targetUserId?: string;
    status?: string;
    mineOnly?: string;
    page?: string;
    pageSize?: string;
  },
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await workforceHandlers.listAdjustments({
      tenantId,
      companyId: scope.companyId ?? undefined,
      userId: s.userId,
      targetUserId: query.targetUserId,
      status: query.status,
      mineOnly: query.mineOnly,
      page: query.page,
      pageSize: query.pageSize
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** GET /v1/tenants/:tenantId/work-rules */
export async function runTenantWorkRulesGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await workforceHandlers.getWorkRule({
      tenantId,
      companyId: scope.companyId ?? undefined,
      userId: s.userId
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** GET /v1/tenants/:tenantId/time-reports/summary */
export async function runTenantTimeReportsSummaryGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  query: { targetUserId?: string; from?: string; to?: string },
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await workforceHandlers.getReportSummary({
      tenantId,
      companyId: scope.companyId ?? undefined,
      userId: s.userId,
      targetUserId: query.targetUserId,
      from: query.from,
      to: query.to
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** GET /v1/tenants/:tenantId/notices */
export async function runTenantNoticesListGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  query: { onlyActive?: string; onlyArchived?: string },
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await workforceHandlers.listNotices({
      tenantId,
      companyId: scope.companyId ?? undefined,
      userId: s.userId,
      onlyActive: query.onlyActive,
      onlyArchived: query.onlyArchived
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** GET /v1/tenants/:tenantId/payslips */
export async function runTenantPayslipsListGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  query: {
    page?: string;
    pageSize?: string;
    contract?: string;
    collaboratorName?: string;
    collaboratorEmail?: string;
    collaboratorCpf?: string;
    referenceMonth?: string;
    mineOnly?: string;
    employeeUserId?: string;
  },
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await documentsPayslipsHandlers.listPayslips({
      tenantId,
      userId: s.userId,
      companyId: scope.companyId ?? undefined,
      page: query.page,
      pageSize: query.pageSize,
      contract: query.contract,
      collaboratorName: query.collaboratorName,
      collaboratorEmail: query.collaboratorEmail,
      collaboratorCpf: query.collaboratorCpf,
      referenceMonth: query.referenceMonth,
      mineOnly: query.mineOnly,
      employeeUserId: query.employeeUserId
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** GET /v1/tenants/:tenantId/oncall-shifts */
export async function runTenantOncallShiftsListGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  query: {
    targetUserId?: string;
    from?: string;
    to?: string;
    name?: string;
    email?: string;
    cpf?: string;
    department?: string;
    positionTitle?: string;
    contractType?: string;
    status?: string;
    tag?: string;
    mineOnly?: string;
    page?: string;
    pageSize?: string;
  },
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await workforceHandlers.listOncallShifts({
      tenantId,
      companyId: scope.companyId ?? undefined,
      userId: s.userId,
      targetUserId: query.targetUserId,
      from: query.from,
      to: query.to,
      name: query.name,
      email: query.email,
      cpf: query.cpf,
      department: query.department,
      positionTitle: query.positionTitle,
      contractType: query.contractType,
      status: query.status,
      tag: query.tag,
      mineOnly: query.mineOnly,
      page: query.page,
      pageSize: query.pageSize
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** GET /v1/tenants/:tenantId/oncall-shifts/:oncallShiftId */
export async function runTenantOncallShiftByIdGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  oncallShiftId: string,
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await workforceHandlers.getOncallShiftById({
      tenantId,
      companyId: scope.companyId ?? undefined,
      userId: s.userId,
      oncallShiftId
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** GET /v1/tenants/:tenantId/shift-templates */
export async function runTenantShiftTemplatesListGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await workforceHandlers.listShiftTemplates({
      tenantId,
      companyId: scope.companyId ?? undefined,
      userId: s.userId
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** GET /v1/tenants/:tenantId/time-reports/closures */
export async function runTenantTimeReportsClosuresListGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  query: { targetUserId?: string; referenceMonth?: string; page?: string; pageSize?: string },
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await workforceHandlers.listTimeReportClosures({
      tenantId,
      companyId: scope.companyId ?? undefined,
      userId: s.userId,
      targetUserId: query.targetUserId,
      referenceMonth: query.referenceMonth,
      page: query.page,
      pageSize: query.pageSize
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}
