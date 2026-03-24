import { supabaseAnon } from "./lib/supabase.js";
import { withTimeout } from "./lib/with-timeout.js";

const AUTH_MS = 8_000;

function extractBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export type BearerSessionOk = { ok: true; userId: string; email: string | null; token: string };
export type BearerSessionErr = { ok: false; status: number; body: Record<string, unknown> };
export type BearerSession = BearerSessionOk | BearerSessionErr;

/** Validação JWT partilhada pelos handlers `run-*` sem Express. */
export async function getBearerSession(authorizationHeader: string | null | undefined): Promise<BearerSession> {
  const token = extractBearer(authorizationHeader);
  if (!token) {
    return { ok: false, status: 401, body: { error: "UNAUTHORIZED", message: "Missing bearer token." } };
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
        ok: false,
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
    return { ok: false, status: 401, body: { error: "UNAUTHORIZED", message: "Invalid or expired token." } };
  }

  return {
    ok: true,
    userId: data.user.id,
    email: data.user.email ?? null,
    token
  };
}
