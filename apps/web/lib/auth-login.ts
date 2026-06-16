"use client";

import { appConfig } from "./config";

export type SignInResult =
  | { ok: true; accessToken: string }
  | { ok: false; message: string; allowResendConfirm?: boolean };

export function mapAuthErrorMessage(message: string): { message: string; allowResendConfirm?: boolean } {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("load failed") ||
    normalized.includes("networkerror") ||
    normalized.includes("network request failed") ||
    normalized.includes("fetch failed")
  ) {
    return {
      message:
        "Não foi possível conectar ao serviço de autenticação. Verifique sua internet, desative bloqueadores de anúncios ou tente outra rede (Wi‑Fi/dados móveis)."
    };
  }
  if (normalized.includes("email not confirmed")) {
    return {
      message: "E-mail não confirmado. Confirme seu cadastro para entrar.",
      allowResendConfirm: true
    };
  }
  if (normalized.includes("email rate limit exceeded") || normalized.includes("rate limit")) {
    return { message: "Muitas tentativas em pouco tempo. Aguarde alguns minutos para tentar novamente." };
  }
  if (normalized.includes("invalid login credentials")) {
    return { message: "E-mail ou senha inválidos." };
  }

  return { message };
}

export async function signInWithPassword(email: string, password: string): Promise<SignInResult> {
  try {
    const response = await fetch(`${appConfig.apiBaseUrl}/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    let body: { access_token?: string; message?: string };
    try {
      body = (await response.json()) as { access_token?: string; message?: string };
    } catch {
      return { ok: false, message: "Resposta inválida do servidor. Tente novamente." };
    }

    if (!response.ok || !body.access_token) {
      const mapped = mapAuthErrorMessage(body.message ?? "Falha no login.");
      return { ok: false, message: mapped.message, allowResendConfirm: mapped.allowResendConfirm };
    }

    return { ok: true, accessToken: body.access_token };
  } catch {
    return { ok: false, message: mapAuthErrorMessage("Failed to fetch").message };
  }
}
