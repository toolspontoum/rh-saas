import { isPlatformAdminUser } from "./http/auth.js";
import { supabaseAnon } from "./lib/supabase.js";
import { withTimeout } from "./lib/with-timeout.js";

function extractBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

const AUTH_MS = 8_000;

export type PlatformMeHttpResult = { status: number; body: Record<string, unknown> };

/**
 * Lógica de GET /v1/platform/me sem Express — usada pelo App Router na Vercel para cold start rápido.
 */
export async function runPlatformMeGet(authorizationHeader: string | null | undefined): Promise<PlatformMeHttpResult> {
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
    const isPlatformAdmin = await isPlatformAdminUser(data.user.id, data.user.email ?? null);
    return { status: 200, body: { isPlatformAdmin } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PLATFORM_ADMIN_LOOKUP_TIMEOUT") {
      return {
        status: 504,
        body: {
          error: "GATEWAY_TIMEOUT",
          message:
            "Consulta de permissões excedeu o tempo limite. Verifique SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel e a conectividade com o Supabase."
        }
      };
    }
    throw e;
  }
}
