import { toHttpError } from "./http/error-handler.js";
import { tenantUsersHandlers } from "./modules/tenant-users/index.js";
import { getBearerSession } from "./session-from-bearer.js";

export type JsonHttpResult = { status: number; body: unknown };

/** GET /v1/tenants/:tenantId/employees/lookup-by-email — usado pelo pré-cadastro IA (modal). */
export async function runTenantEmployeeLookupByEmailGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  email: string
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  try {
    const result = await tenantUsersHandlers.lookupEmployeeByEmail({
      tenantId,
      actorUserId: s.userId,
      email
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** GET /v1/tenants/:tenantId/employees/lookup-by-cpf — usado pelo pré-cadastro IA (modal). */
export async function runTenantEmployeeLookupByCpfGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  cpf: string
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  try {
    const result = await tenantUsersHandlers.lookupEmployeeByCpf({
      tenantId,
      actorUserId: s.userId,
      cpf
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}
