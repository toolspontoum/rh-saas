import { env } from "./config/env.js";
import { withTimeout } from "./lib/with-timeout.js";

const LOGIN_MS = 15_000;

export type AuthLoginHttpResult = { status: number; body: Record<string, unknown> };

function mapSupabaseAuthError(status: number, payload: Record<string, unknown>): AuthLoginHttpResult {
  const msg =
    typeof payload.msg === "string"
      ? payload.msg
      : typeof payload.message === "string"
        ? payload.message
        : typeof payload.error_description === "string"
          ? payload.error_description
          : "Falha no login.";
  const normalized = msg.toLowerCase();

  if (normalized.includes("email not confirmed")) {
    return {
      status: 401,
      body: { error: "EMAIL_NOT_CONFIRMED", message: "E-mail não confirmado. Confirme seu cadastro para entrar." }
    };
  }
  if (normalized.includes("invalid login credentials")) {
    return { status: 401, body: { error: "INVALID_CREDENTIALS", message: "E-mail ou senha inválidos." } };
  }
  if (normalized.includes("rate limit")) {
    return {
      status: 429,
      body: {
        error: "RATE_LIMIT",
        message: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente."
      }
    };
  }

  return {
    status: status >= 400 && status < 600 ? status : 401,
    body: { error: "AUTH_FAILED", message: msg }
  };
}

/**
 * POST /v1/auth/login — autenticação no servidor (evita bloqueio browser → Supabase).
 */
export async function runAuthLoginPost(body: { email?: unknown; password?: unknown }): Promise<AuthLoginHttpResult> {
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return { status: 400, body: { error: "VALIDATION", message: "Informe e-mail e senha." } };
  }

  try {
    const response = await withTimeout(
      fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          apikey: env.SUPABASE_ANON_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      }),
      LOGIN_MS,
      () => new Error("SUPABASE_AUTH_TIMEOUT")
    );

    let payload: Record<string, unknown>;
    try {
      payload = (await response.json()) as Record<string, unknown>;
    } catch {
      return {
        status: 502,
        body: { error: "AUTH_RESPONSE_INVALID", message: "Resposta inválida do serviço de autenticação." }
      };
    }

    if (!response.ok) {
      return mapSupabaseAuthError(response.status, payload);
    }

    const accessToken = typeof payload.access_token === "string" ? payload.access_token : null;
    if (!accessToken) {
      return {
        status: 502,
        body: { error: "AUTH_RESPONSE_INVALID", message: "Resposta inválida do serviço de autenticação." }
      };
    }

    return {
      status: 200,
      body: {
        access_token: accessToken,
        refresh_token: typeof payload.refresh_token === "string" ? payload.refresh_token : undefined,
        expires_in: typeof payload.expires_in === "number" ? payload.expires_in : undefined
      }
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "SUPABASE_AUTH_TIMEOUT") {
      return {
        status: 504,
        body: {
          error: "GATEWAY_TIMEOUT",
          message: "Autenticação excedeu o tempo limite. Tente novamente em instantes."
        }
      };
    }
    return {
      status: 503,
      body: {
        error: "AUTH_UNAVAILABLE",
        message: "Não foi possível contactar o serviço de autenticação. Tente novamente em instantes."
      }
    };
  }
}
