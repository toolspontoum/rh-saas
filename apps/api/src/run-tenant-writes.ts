import { toHttpError } from "./http/error-handler.js";
import { coreAuthTenantHandlers } from "./modules/core-auth-tenant/index.js";
import { tenantCompaniesHandlers } from "./modules/tenant-companies/index.js";
import { tenantUsersHandlers } from "./modules/tenant-users/index.js";
import { workforceHandlers } from "./modules/workforce/index.js";
import { getBearerSession } from "./session-from-bearer.js";
import { resolveCompanyScopeFromHeader } from "./tenant-company-from-header.js";

export type JsonHttpResult = { status: number; body: unknown };

/** POST /v1/tenants/:tenantId/employees */
export async function runTenantEmployeesPost(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  body: { fullName?: string; email?: string; cpf?: string; phone?: string },
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId, { authorizationHeader, actorUserId: s.userId });
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await tenantUsersHandlers.upsertEmployee({
      tenantId,
      actorUserId: s.userId,
      companyId: scope.companyId ?? undefined,
      fullName: body.fullName,
      email: body.email,
      cpf: body.cpf,
      phone: body.phone
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** POST /v1/tenants/:tenantId/backoffice-users */
export async function runTenantBackofficeUsersPost(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  body: { fullName?: string; email?: string; role?: string; cpf?: string; phone?: string },
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId, { authorizationHeader, actorUserId: s.userId });
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await tenantUsersHandlers.upsertBackofficeUser({
      tenantId,
      actorUserId: s.userId,
      companyId: scope.companyId ?? undefined,
      fullName: body.fullName,
      email: body.email,
      role: body.role,
      cpf: body.cpf,
      phone: body.phone
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** PUT /v1/tenants/:tenantId/employee-profile */
export async function runTenantEmployeeProfilePut(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  body: {
    targetUserId?: string;
    fullName?: string | null;
    personalEmail?: string | null;
    cpf?: string | null;
    phone?: string | null;
    department?: string | null;
    positionTitle?: string | null;
    contractType?: string | null;
    admissionDate?: string | null;
    baseSalary?: number | null;
    employeeTags?: string[];
  },
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId, { authorizationHeader, actorUserId: s.userId });
  if (!scope.ok) return { status: scope.status, body: scope.body };
  try {
    const result = await workforceHandlers.upsertEmployeeProfile({
      tenantId,
      companyId: scope.companyId ?? undefined,
      userId: s.userId,
      targetUserId: body.targetUserId,
      fullName: body.fullName ?? null,
      personalEmail: body.personalEmail ?? null,
      cpf: body.cpf ?? null,
      phone: body.phone ?? null,
      department: body.department ?? null,
      positionTitle: body.positionTitle ?? null,
      contractType: body.contractType ?? null,
      admissionDate: body.admissionDate ?? null,
      baseSalary: body.baseSalary ?? null,
      employeeTags: body.employeeTags ?? []
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** POST /v1/tenants/:tenantId/companies */
export async function runTenantCompaniesPost(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  body: { name?: string; taxId?: string | null }
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  try {
    const result = await tenantCompaniesHandlers.create({
      tenantId,
      userId: s.userId,
      name: body.name,
      taxId: body.taxId ?? null
    });
    return { status: 201, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** PATCH /v1/tenants/:tenantId/companies/:companyId */
export async function runTenantCompaniesPatch(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  companyId: string,
  body: { name?: string; taxId?: string | null }
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  try {
    const result = await tenantCompaniesHandlers.update({
      tenantId,
      userId: s.userId,
      companyId,
      name: body.name,
      taxId: body.taxId
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** DELETE /v1/tenants/:tenantId/companies/:companyId */
export async function runTenantCompaniesDelete(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  companyId: string
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  try {
    const result = await tenantCompaniesHandlers.delete({
      tenantId,
      userId: s.userId,
      companyId
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** PUT /v1/tenants/:tenantId/companies/:companyId/preposto */
export async function runTenantCompanyPrepostoPut(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  companyId: string,
  body: { userId?: unknown }
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  if (!("userId" in body)) {
    return {
      status: 400,
      body: { error: "INVALID_BODY", message: "Envie userId (uuid do colaborador ou null para remover)." }
    };
  }
  const raw = body.userId;
  const prepostoUserId = raw === null ? null : typeof raw === "string" ? raw : undefined;
  if (prepostoUserId === undefined && raw !== null) {
    return { status: 400, body: { error: "INVALID_BODY", message: "userId deve ser uuid ou null." } };
  }
  try {
    const result = await tenantCompaniesHandlers.setPreposto({
      tenantId,
      userId: s.userId,
      companyId,
      prepostoUserId
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** POST /v1/tenants/:tenantId/features/:featureCode/validate */
export async function runTenantFeatureValidatePost(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  featureCode: string
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  try {
    const result = await coreAuthTenantHandlers.validateFeature({
      userId: s.userId,
      tenantId,
      featureCode
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}
