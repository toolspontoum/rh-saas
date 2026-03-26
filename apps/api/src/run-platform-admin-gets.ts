import { ensurePlatformAdminBearer } from "./http/auth.js";
import { toHttpError } from "./http/error-handler.js";
import { platformHandlers } from "./modules/platform/index.js";

export type PlatformJsonHttpResult = { status: number; body: unknown };

async function withPlatformAdmin(
  authorizationHeader: string | null | undefined,
  work: () => Promise<unknown>
): Promise<PlatformJsonHttpResult> {
  const gate = await ensurePlatformAdminBearer(authorizationHeader);
  if (!gate.ok) {
    return { status: gate.status, body: gate.body };
  }
  try {
    const result = await work();
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

export function runPlatformTenantsGet(authorizationHeader: string | null | undefined): Promise<PlatformJsonHttpResult> {
  return withPlatformAdmin(authorizationHeader, () => platformHandlers.listTenants());
}

/** POST /v1/platform/tenants — criação de assinante no superadmin. */
export async function runPlatformTenantsPost(
  authorizationHeader: string | null | undefined,
  body: unknown
): Promise<PlatformJsonHttpResult> {
  const gate = await ensurePlatformAdminBearer(authorizationHeader);
  if (!gate.ok) {
    return { status: gate.status, body: gate.body };
  }
  try {
    const result = await platformHandlers.createTenant(body);
    return { status: 201, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

export function runPlatformSuperadminsGet(authorizationHeader: string | null | undefined): Promise<PlatformJsonHttpResult> {
  return withPlatformAdmin(authorizationHeader, () => platformHandlers.listSuperadmins());
}

export function runPlatformAiSettingsGet(authorizationHeader: string | null | undefined): Promise<PlatformJsonHttpResult> {
  return withPlatformAdmin(authorizationHeader, () => platformHandlers.getAiSettings());
}

/** PATCH /v1/platform/tenants/:tenantId/ai-provider — troca do provedor por assinante. */
export async function runPlatformTenantAiProviderPatch(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  body: unknown
): Promise<PlatformJsonHttpResult> {
  const gate = await ensurePlatformAdminBearer(authorizationHeader);
  if (!gate.ok) {
    return { status: gate.status, body: gate.body };
  }
  try {
    const result = await platformHandlers.patchTenantAiProvider(tenantId, body);
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** POST /v1/platform/tenants/:tenantId/grant-admin — “Entrar como admin” no superadmin. */
export async function runPlatformGrantAdminPost(
  authorizationHeader: string | null | undefined,
  tenantId: string
): Promise<PlatformJsonHttpResult> {
  const gate = await ensurePlatformAdminBearer(authorizationHeader);
  if (!gate.ok) {
    return { status: gate.status, body: gate.body };
  }
  try {
    const result = await platformHandlers.grantAdminAccess(
      { tenantId },
      { userId: gate.userId, token: gate.token, email: gate.email }
    );
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}
