import { toHttpError } from "./http/error-handler.js";
import { coreAuthTenantHandlers } from "./modules/core-auth-tenant/index.js";
import { tenantCompaniesHandlers } from "./modules/tenant-companies/index.js";
import { getBearerSession } from "./session-from-bearer.js";

export type JsonHttpResult = { status: number; body: unknown };

/** GET /v1/tenants/:tenantId/context — usado pelo layout de quase todas as páginas do tenant. */
export async function runTenantContextGet(
  authorizationHeader: string | null | undefined,
  tenantId: string
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  try {
    const result = await coreAuthTenantHandlers.getContext({
      userId: s.userId,
      tenantId,
      email: s.email
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** GET /v1/tenants/:tenantId/companies — carregado junto com o context no layout. */
export async function runTenantCompaniesListGet(
  authorizationHeader: string | null | undefined,
  tenantId: string
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  try {
    const result = await tenantCompaniesHandlers.list({
      tenantId,
      userId: s.userId
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}
