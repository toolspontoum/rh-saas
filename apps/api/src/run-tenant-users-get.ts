import { toHttpError } from "./http/error-handler.js";
import { tenantUsersHandlers } from "./modules/tenant-users/index.js";
import { getBearerSession } from "./session-from-bearer.js";
import { resolveCompanyScopeFromHeader } from "./tenant-company-from-header.js";

export type JsonHttpResult = { status: number; body: unknown };

export type TenantUsersListQuery = {
  status?: string;
  search?: string;
  page?: string;
  pageSize?: string;
};

/** GET /v1/tenants/:tenantId/users — lista utilizadores (página de gestão). */
export async function runTenantUsersListGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  query: TenantUsersListQuery,
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };

  const scope = await resolveCompanyScopeFromHeader(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };

  const statusFilter =
    query.status === "active" || query.status === "inactive" || query.status === "offboarded"
      ? query.status
      : undefined;

  try {
    const result = await tenantUsersHandlers.listUsers({
      tenantId,
      userId: s.userId,
      companyId: scope.companyId ?? undefined,
      status: statusFilter,
      search: query.search,
      page: query.page,
      pageSize: query.pageSize
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}
