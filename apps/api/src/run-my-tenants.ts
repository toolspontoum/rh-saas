import { toHttpError } from "./http/error-handler.js";
import { coreAuthTenantHandlers } from "./modules/core-auth-tenant/index.js";
import { supabaseAnon } from "./lib/supabase.js";
import { withTimeout } from "./lib/with-timeout.js";

function extractBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

const AUTH_MS = 8_000;

export type MyTenantsHttpResult = { status: number; body: unknown };

/**
 * GET /v1/me/tenants sem Express — lista assinantes (incl. superadmin de plataforma).
 */
export async function runMyTenantsGet(authorizationHeader: string | null | undefined): Promise<MyTenantsHttpResult> {
  const token = extractBearer(authorizationHeader);
  if (!token) {
    return { status: 401, body: { error: "UNAUTHORIZED", message: "Missing bearer token." } };
  }

  let data: Awaited<ReturnType<typeof supabaseAnon.auth.getUser>>["data"];
  let error: Awaited<ReturnType<typeof supabaseAnon.auth.getUser>>["error"];
  try {
    const result = await withTimeout(supabaseAnon.auth.getUser(token), AUTH_MS, () =>
      new Error("SUPABASE_AUTH_TIMEOUT")
    );
    data = result.data;
    error = result.error;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "SUPABASE_AUTH_TIMEOUT") {
      return {
        status: 504,
        body: {
          error: "GATEWAY_TIMEOUT",
          message:
            "Validação de sessão excedeu o tempo limite. Verifique SUPABASE_URL e chaves na Vercel e se o projeto Supabase está ativo."
        }
      };
    }
    throw e;
  }

  if (error || !data.user?.id) {
    return { status: 401, body: { error: "UNAUTHORIZED", message: "Invalid or expired token." } };
  }

  try {
    const tenants = await coreAuthTenantHandlers.listMyTenants({
      userId: data.user.id,
      email: data.user.email ?? null
    });
    return { status: 200, body: tenants };
  } catch (err) {
    const parsed = toHttpError(err);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}
