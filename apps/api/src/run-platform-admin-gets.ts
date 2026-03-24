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

export function runPlatformSuperadminsGet(authorizationHeader: string | null | undefined): Promise<PlatformJsonHttpResult> {
  return withPlatformAdmin(authorizationHeader, () => platformHandlers.listSuperadmins());
}

export function runPlatformAiSettingsGet(authorizationHeader: string | null | undefined): Promise<PlatformJsonHttpResult> {
  return withPlatformAdmin(authorizationHeader, () => platformHandlers.getAiSettings());
}
