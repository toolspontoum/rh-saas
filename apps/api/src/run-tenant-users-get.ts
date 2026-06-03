import { toHttpError } from "./http/error-handler.js";
import { isPlatformAdminUser } from "./http/auth.js";
import { tenantUsersHandlers } from "./modules/tenant-users/index.js";
import { getBearerSession } from "./session-from-bearer.js";
import { resolveCompanyScopeFromHeader } from "./tenant-company-from-header.js";

export type JsonHttpResult = { status: number; body: unknown };

export type TenantUsersListQuery = {
  status?: string;
  search?: string;
  page?: string;
  pageSize?: string;
  includePurgedProfiles?: string;
  includeAuthMeta?: string;
};

/** GET /v1/tenants/:tenantId/users/:targetUserId — um utilizador (detalhe do colaborador). */
export async function runTenantUserGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  targetUserId: string,
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
    const result = await tenantUsersHandlers.getUser({
      tenantId,
      actorUserId: s.userId,
      targetUserId,
      companyId: scope.companyId ?? undefined
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** GET /v1/tenants/:tenantId/users — lista utilizadores (página de gestão). */
export async function runTenantUsersListGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  query: TenantUsersListQuery,
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };

  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId, { authorizationHeader, actorUserId: s.userId });
  if (!scope.ok) return { status: scope.status, body: scope.body };

  const statusFilter =
    query.status === "active" || query.status === "inactive" || query.status === "offboarded"
      ? query.status
      : undefined;

  try {
    // Evita chamar plataforma/superadmins por padrão (pode ser lento e causar 504).
    // Só checa quando alguém explicitamente pedir ver perfis purgados.
    const wantsPurged = query.includePurgedProfiles === "true";
    const includePurged = wantsPurged ? await isPlatformAdminUser(s.userId, s.email) : false;
    const result = await tenantUsersHandlers.listUsers({
      tenantId,
      userId: s.userId,
      companyId: scope.companyId ?? undefined,
      status: statusFilter,
      search: query.search,
      page: query.page,
      pageSize: query.pageSize,
      includePurgedProfiles: includePurged,
      includeAuthMeta: query.includeAuthMeta === "true"
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}
