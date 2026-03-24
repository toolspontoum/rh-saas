import type { Request, Response, NextFunction } from "express";

import { env } from "../config/env.js";
import { supabaseAdmin, supabaseAnon } from "../lib/supabase.js";
import { withTimeout } from "../lib/with-timeout.js";

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

const AUTH_GET_USER_MS = 8_000;
const PLATFORM_ADMIN_DB_MS = 8_000;

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req.header("authorization"));
    if (!token) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Missing bearer token." });
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

    return next();
  } catch (err) {
    console.error("[requireAuth]", err);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Falha ao validar sessão. Verifique variáveis SUPABASE_* na Vercel e os logs da função."
    });
  }
}

export async function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req.header("authorization"));
  if (!token) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Missing bearer token." });
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

  const email = (data.user.email ?? "").trim().toLowerCase();
  if (email && env.PLATFORM_SUPERADMIN_EMAILS.includes(email)) {
    (req as AuthenticatedRequest).auth = {
      userId: data.user.id,
      token,
      email: data.user.email ?? null
    };
    return next();
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
      return res.status(504).json({
        error: "GATEWAY_TIMEOUT",
        message:
          "Consulta à base excedeu o tempo limite. Verifique SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel e a latência até ao Supabase."
      });
    }
    throw e;
  }

  if (rowError) {
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Falha ao validar permissao de plataforma." });
  }

  if (row?.user_id) {
    (req as AuthenticatedRequest).auth = {
      userId: data.user.id,
      token,
      email: data.user.email ?? null
    };
    return next();
  }

  return res.status(403).json({ error: "FORBIDDEN", message: "Acesso restrito ao painel de plataforma." });
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

