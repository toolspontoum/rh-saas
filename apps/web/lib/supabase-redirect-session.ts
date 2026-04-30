"use client";

import type { Session, SupabaseClient } from "@supabase/supabase-js";

function tokensFromUrlHash(hash: string): { access_token: string; refresh_token: string } | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw.trim()) return null;
  const params = new URLSearchParams(raw);
  const err = params.get("error");
  if (err) {
    const desc = params.get("error_description");
    const text = desc ? decodeURIComponent(desc.replace(/\+/g, " ")) : err;
    throw new Error(text || err);
  }
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}

async function pollUntilSession(supabase: SupabaseClient, maxMs: number, intervalMs: number): Promise<Session | null> {
  const deadline = Date.now() + maxMs;
  for (;;) {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
    if (Date.now() >= deadline) return null;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

/**
 * Estabelece sessão a partir do link do Supabase (convite, recovery, primeiro acesso).
 * Cobre: `?code=` (PKCE), `?token_hash=&type=` (OTP), e `#access_token=&refresh_token=` (implicit).
 */
export async function establishSupabaseRedirectSession(
  supabase: SupabaseClient,
  href: string
): Promise<{ session: Session | null; setupError: Error | null }> {
  const url = new URL(href);

  try {
    const code = url.searchParams.get("code");
    const tokenHash = url.searchParams.get("token_hash");
    const typeRaw = url.searchParams.get("type");

    if (code) {
      const exchanged = await supabase.auth.exchangeCodeForSession(code);
      if (exchanged.error) return { session: null, setupError: new Error(exchanged.error.message) };
    } else if (tokenHash && typeRaw) {
      const type =
        typeRaw === "invite" ||
        typeRaw === "recovery" ||
        typeRaw === "signup" ||
        typeRaw === "magiclink" ||
        typeRaw === "email_change"
          ? typeRaw
          : null;
      if (!type) {
        return {
          session: null,
          setupError: new Error("Link invalido. Solicite um novo e-mail para definir sua senha.")
        };
      }
      const verified = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (verified.error) return { session: null, setupError: new Error(verified.error.message) };
    } else {
      const tokens = tokensFromUrlHash(url.hash);
      if (tokens) {
        const set = await supabase.auth.setSession({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token
        });
        if (set.error) return { session: null, setupError: new Error(set.error.message) };
      }
    }

    let session = (await supabase.auth.getSession()).data.session;
    if (!session) {
      session = await pollUntilSession(supabase, 8000, 120);
    }

    if (session && typeof window !== "undefined" && window.history.replaceState) {
      const path = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState({}, "", path);
    }

    return { session, setupError: null };
  } catch (e) {
    return { session: null, setupError: e instanceof Error ? e : new Error(String(e)) };
  }
}

export function describeMissingRecoverySession(href: string): string {
  const url = new URL(href);
  const hadHint =
    Boolean(url.searchParams.get("code")) ||
    Boolean(url.searchParams.get("token_hash")) ||
    (url.hash && url.hash.length > 5);
  if (hadHint) {
    return "Nao foi possivel validar o link (expirado ou ja utilizado). Solicite um novo e-mail e abra o link de uma so vez.";
  }
  return "Abra o link enviado ao seu e-mail nesta pagina para definir a senha. Se o link expirou, solicite outro.";
}
