import { supabaseAnon } from "./lib/supabase.js";
import { withTimeout } from "./lib/with-timeout.js";

const AUTH_MS = 20_000;

type CacheEntry = { expiresAt: number; session: BearerSessionOk };
const sessionCache = new Map<string, CacheEntry>();
const SESSION_CACHE_MAX = 2000;
const SESSION_CACHE_MS = 5 * 60_000;

function decodeJwtExpMs(token: string): number | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payloadRaw = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const pad = payloadRaw.length % 4 === 0 ? "" : "=".repeat(4 - (payloadRaw.length % 4));
    const json = Buffer.from(payloadRaw + pad, "base64").toString("utf8");
    const parsed = JSON.parse(json) as { exp?: number };
    if (typeof parsed.exp !== "number") return null;
    return parsed.exp * 1000;
  } catch {
    return null;
  }
}

function cacheGet(token: string): BearerSessionOk | null {
  const hit = sessionCache.get(token);
  if (!hit) return null;
  if (Date.now() >= hit.expiresAt) {
    sessionCache.delete(token);
    return null;
  }
  return hit.session;
}

function cacheSet(token: string, session: BearerSessionOk) {
  if (sessionCache.size >= SESSION_CACHE_MAX) {
    const first = sessionCache.keys().next().value as string | undefined;
    if (first) sessionCache.delete(first);
  }
  const expMs = decodeJwtExpMs(token);
  const ttl = Math.max(10_000, Math.min(SESSION_CACHE_MS, expMs ? expMs - Date.now() - 5_000 : SESSION_CACHE_MS));
  sessionCache.set(token, { expiresAt: Date.now() + ttl, session });
}

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

  const cached = cacheGet(token);
  if (cached) return cached;

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

  const session: BearerSessionOk = {
    ok: true,
    userId: data.user.id,
    email: data.user.email ?? null,
    token
  };
  cacheSet(token, session);
  return session;
}
