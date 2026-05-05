import type { Request, Response, NextFunction } from "express";

import { env } from "../config/env.js";
import { supabaseAdmin, supabaseAnon } from "../lib/supabase.js";
import { withTimeout } from "../lib/with-timeout.js";
import { jwtVerify } from "jose";

export type AuthenticatedRequest = Request & {
  auth: {
    userId: string;
    token: string;
    email: string | null;
  };
};

function extractBearerToken(headerValue: string | undefined): string | null {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

const AUTH_GET_USER_MS = 20_000;
const PLATFORM_ADMIN_DB_MS = 8_000;

type AuthCacheEntry = { expiresAt: number; userId: string; email: string | null };
const authCache = new Map<string, AuthCacheEntry>();
const AUTH_CACHE_MAX = 2000;
const AUTH_CACHE_MS = 5 * 60_000;

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

function cacheGet(token: string): { userId: string; email: string | null } | null {
  const hit = authCache.get(token);
  if (!hit) return null;
  if (Date.now() >= hit.expiresAt) {
    authCache.delete(token);
    return null;
  }
  return { userId: hit.userId, email: hit.email };
}

function cacheSet(token: string, userId: string, email: string | null) {
  if (authCache.size >= AUTH_CACHE_MAX) {
    const first = authCache.keys().next().value as string | undefined;
    if (first) authCache.delete(first);
  }
  const expMs = decodeJwtExpMs(token);
  const ttl = Math.max(10_000, Math.min(AUTH_CACHE_MS, expMs ? expMs - Date.now() - 5_000 : AUTH_CACHE_MS));
  authCache.set(token, { expiresAt: Date.now() + ttl, userId, email });
}

async function verifyBearerJwtLocal(token: string): Promise<{ userId: string; email: string | null } | null> {
  const secret = env.SUPABASE_JWT_SECRET?.trim();
  if (!secret) return null;
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    const userId = typeof payload.sub === "string" ? payload.sub : null;
    if (!userId) return null;
    const email =
      typeof (payload as Record<string, unknown>).email === "string"
        ? ((payload as Record<string, unknown>).email as string)
        : null;
    return { userId, email };
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req.header("authorization"));
    if (!token) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Missing bearer token." });
    }

    const cached = cacheGet(token);
    if (cached) {
      (req as AuthenticatedRequest).auth = { userId: cached.userId, token, email: cached.email };
      return next();
    }

    const local = await verifyBearerJwtLocal(token);
    if (local) {
      (req as AuthenticatedRequest).auth = { userId: local.userId, token, email: local.email };
      cacheSet(token, local.userId, local.email);
      return next();
    }

    let data: Awaited<ReturnType<typeof supabaseAnon.auth.getUser>>["data"];
    let error: Awaited<ReturnType<typeof supabaseAnon.auth.getUser>>["error"];
    try {
      const result = await withTimeout(supabaseAnon.auth.getUser(token), AUTH_GET_USER_MS, () =>
        new Error("SUPABASE_AUTH_TIMEOUT")
      );
      data = result.data;
      error = result.error;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "SUPABASE_AUTH_TIMEOUT") {
        return res.status(504).json({
          error: "GATEWAY_TIMEOUT",
          message:
            "Validação de sessão excedeu o tempo limite. Verifique SUPABASE_URL e chaves na Vercel e se o projeto Supabase está ativo."
        });
      }
      throw e;
    }
    if (error || !data.user?.id) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Invalid or expired token." });
    }

    (req as AuthenticatedRequest).auth = {
      userId: data.user.id,
      token,
      email: data.user.email ?? null
    };
    cacheSet(token, data.user.id, data.user.email ?? null);

    return next();
  } catch (err) {
    console.error("[requireAuth]", err);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Falha ao validar sessão. Verifique variáveis SUPABASE_* na Vercel e os logs da função."
    });
  }
}

export type EnsurePlatformAdminResult =
  | { ok: true; userId: string; email: string | null; token: string }
  | { ok: false; status: number; body: Record<string, unknown> };

/**
 * Mesma lógica que requirePlatformAdmin, sem Express — para rotas serverless sem carregar createApp.
 */
export async function ensurePlatformAdminBearer(
  authorizationHeader: string | undefined | null
): Promise<EnsurePlatformAdminResult> {
  const token = extractBearerToken(authorizationHeader ?? undefined);
  if (!token) {
    return { ok: false, status: 401, body: { error: "UNAUTHORIZED", message: "Missing bearer token." } };
  }

  const cached = cacheGet(token);
  if (cached) {
    const email = (cached.email ?? "").trim().toLowerCase();
    if (email && env.PLATFORM_SUPERADMIN_EMAILS.includes(email)) {
      return { ok: true, userId: cached.userId, token, email: cached.email };
    }
    return { ok: false, status: 403, body: { error: "FORBIDDEN", message: "Not a platform admin." } };
  }

  const local = await verifyBearerJwtLocal(token);
  if (local) {
    cacheSet(token, local.userId, local.email);
    const email = (local.email ?? "").trim().toLowerCase();
    if (email && env.PLATFORM_SUPERADMIN_EMAILS.includes(email)) {
      return { ok: true, userId: local.userId, token, email: local.email };
    }
    return { ok: false, status: 403, body: { error: "FORBIDDEN", message: "Not a platform admin." } };
  }

  let data: Awaited<ReturnType<typeof supabaseAnon.auth.getUser>>["data"];
  let error: Awaited<ReturnType<typeof supabaseAnon.auth.getUser>>["error"];
  try {
    const result = await withTimeout(supabaseAnon.auth.getUser(token), AUTH_GET_USER_MS, () =>
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

  const email = (data.user.email ?? "").trim().toLowerCase();
  cacheSet(token, data.user.id, data.user.email ?? null);
  if (email && env.PLATFORM_SUPERADMIN_EMAILS.includes(email)) {
    return {
      ok: true,
      userId: data.user.id,
      token,
      email: data.user.email ?? null
    };
  }

  let row: { user_id: string } | null = null;
  let rowError: unknown = null;
  try {
    const result = await withTimeout(
      Promise.resolve(
        supabaseAdmin.from("platform_superadmins").select("user_id").eq("user_id", data.user.id).maybeSingle()
      ),
      PLATFORM_ADMIN_DB_MS,
      () => new Error("PLATFORM_ADMIN_LOOKUP_TIMEOUT")
    );
    row = result.data as { user_id: string } | null;
    rowError = result.error;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PLATFORM_ADMIN_LOOKUP_TIMEOUT") {
      return {
        ok: false,
        status: 504,
        body: {
          error: "GATEWAY_TIMEOUT",
          message:
            "Consulta à base excedeu o tempo limite. Verifique SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel e a latência até ao Supabase."
        }
      };
    }
    throw e;
  }

  if (rowError) {
    return {
      ok: false,
      status: 500,
      body: { error: "INTERNAL_ERROR", message: "Falha ao validar permissao de plataforma." }
    };
  }

  if (row?.user_id) {
    return {
      ok: true,
      userId: data.user.id,
      token,
      email: data.user.email ?? null
    };
  }

  return {
    ok: false,
    status: 403,
    body: { error: "FORBIDDEN", message: "Acesso restrito ao painel de plataforma." }
  };
}

export async function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  const result = await ensurePlatformAdminBearer(req.header("authorization"));
  if (!result.ok) {
    return res.status(result.status).json(result.body);
  }
  (req as AuthenticatedRequest).auth = {
    userId: result.userId,
    token: result.token,
    email: result.email
  };
  return next();
}

export async function isPlatformAdminUser(userId: string, email: string | null): Promise<boolean> {
  const normalized = (email ?? "").trim().toLowerCase();
  if (normalized && env.PLATFORM_SUPERADMIN_EMAILS.includes(normalized)) {
    return true;
  }
  const { data: row, error } = await withTimeout(
    Promise.resolve(
      supabaseAdmin.from("platform_superadmins").select("user_id").eq("user_id", userId).maybeSingle()
    ),
    PLATFORM_ADMIN_DB_MS,
    () => new Error("PLATFORM_ADMIN_LOOKUP_TIMEOUT")
  );
  if (error) return false;
  return Boolean(row?.user_id);
}

