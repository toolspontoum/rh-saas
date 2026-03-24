import { toHttpError } from "./http/error-handler.js";
import { coreAuthTenantHandlers } from "./modules/core-auth-tenant/index.js";
import { getBearerSession } from "./session-from-bearer.js";

export type MyTenantsHttpResult = { status: number; body: unknown };

/**
 * GET /v1/me/tenants sem Express — lista assinantes (incl. superadmin de plataforma).
 */
export async function runMyTenantsGet(authorizationHeader: string | null | undefined): Promise<MyTenantsHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };

  try {
    const tenants = await coreAuthTenantHandlers.listMyTenants({
      userId: s.userId,
      email: s.email
    });
    return { status: 200, body: tenants };
  } catch (err) {
    const parsed = toHttpError(err);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}
