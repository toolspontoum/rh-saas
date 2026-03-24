import type { Request, Response, NextFunction } from "express";

import { env } from "../config/env.js";
import { supabaseAdmin, supabaseAnon } from "../lib/supabase.js";

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

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req.header("authorization"));
    if (!token) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Missing bearer token." });
    }

    const { data, error } = await supabaseAnon.auth.getUser(token);
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

  const { data, error } = await supabaseAnon.auth.getUser(token);
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

  const { data: row, error: rowError } = await supabaseAdmin
    .from("platform_superadmins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

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
  const { data: row, error } = await supabaseAdmin
    .from("platform_superadmins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return false;
  return Boolean(row?.user_id);
}

