import { toHttpError } from "./http/error-handler.js";
import { recruitmentHandlers } from "./modules/recruitment/index.js";
import { getBearerSession } from "./session-from-bearer.js";
import { resolveCompanyScopeFromHeader } from "./tenant-company-from-header.js";

export type JsonHttpResult = { status: number; body: unknown };

function resolvedCompanyId(
  scope: { ok: true; companyId: string | null },
  body: Record<string, unknown>
): string | null {
  if (scope.companyId) return scope.companyId;
  const raw = body.companyId;
  return typeof raw === "string" ? raw : null;
}

/** POST /v1/tenants/:tenantId/jobs — sem importar create-app (evita 504 na Vercel). */
export async function runTenantJobCreatePost(
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
  const companyId = resolvedCompanyId(scope, body);
  try {
    const result = await recruitmentHandlers.createJob({
      tenantId,
      userId: s.userId,
      companyId,
      title: body.title,
      description: body.description,
      department: body.department ?? null,
      location: body.location ?? null,
      employmentType: body.employmentType ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      salary: body.salary ?? null,
      expiresAt: body.expiresAt ?? null,
      skills: Array.isArray(body.skills) ? body.skills : [],
      screeningQuestions: Array.isArray(body.screeningQuestions) ? body.screeningQuestions : [],
      documentRequirements: body.documentRequirements,
      aiScreeningCriteria: body.aiScreeningCriteria,
      status: body.status
    });
    return { status: 201, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** PATCH /v1/tenants/:tenantId/jobs/:jobId */
export async function runTenantJobPatch(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  jobId: string,
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
  const companyId = resolvedCompanyId(scope, body);
  try {
    const result = await recruitmentHandlers.updateJob({
      tenantId,
      userId: s.userId,
      companyId,
      jobId,
      title: body.title,
      description: body.description,
      department: body.department ?? null,
      location: body.location ?? null,
      employmentType: body.employmentType ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      salary: body.salary ?? null,
      expiresAt: body.expiresAt ?? null,
      skills: body.skills,
      screeningQuestions: body.screeningQuestions,
      documentRequirements: body.documentRequirements,
      aiScreeningCriteria: body.aiScreeningCriteria,
      status: body.status
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** DELETE /v1/tenants/:tenantId/jobs/:jobId */
export async function runTenantJobDelete(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  jobId: string,
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId, {
    authorizationHeader,
    actorUserId: s.userId
  });
  if (!scope.ok) return { status: scope.status, body: scope.body };
  const companyId = resolvedCompanyId(scope, {});
  try {
    const result = await recruitmentHandlers.deleteJob({
      tenantId,
      userId: s.userId,
      companyId,
      jobId
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}
