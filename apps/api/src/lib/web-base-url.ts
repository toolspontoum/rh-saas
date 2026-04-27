import { env } from "../config/env.js";

/** URL pública do app (convites Auth, links de recuperação). */
export function inferWebBaseUrl(): string {
  const configured = env.WEB_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const firstAllowed = env.WEB_ALLOWED_ORIGINS.split(",").map((item) => item.trim()).find((item) => item.startsWith("http"));
  if (firstAllowed) return firstAllowed.replace(/\/$/, "");

  return "https://rh-saas-delta.vercel.app";
}

function normalizeOrigin(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin.replace(/\/$/, "");
  } catch {
    return null;
  }
}

/**
 * Em produção, alguns fluxos de Auth precisam redirecionar exatamente para o domínio atual do Web.
 * Para evitar depender de `WEB_APP_URL` na API (que pode estar desconfigurado), aceitamos um header
 * opcional vindo do frontend e só usamos se estiver na allowlist de `WEB_ALLOWED_ORIGINS`.
 */
export function webBaseUrlFromHeader(value: string | null | undefined): string | null {
  if (!value) return null;
  const candidate = normalizeOrigin(value);
  if (!candidate) return null;

  const allowed = env.WEB_ALLOWED_ORIGINS.split(",").map((s) => normalizeOrigin(s)).filter(Boolean) as string[];
  const configured = normalizeOrigin(env.WEB_APP_URL ?? "");
  if (configured) allowed.push(configured);

  if (allowed.includes(candidate)) return candidate;

  // Aceita variação com/sem "www." quando a allowlist já contempla o outro.
  // Isso evita cair no Site URL (login) quando o frontend está sem www e o Supabase só permite com www (ou vice-versa).
  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase();
    const altHost = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
    const alt = `${url.protocol}//${altHost}`;
    if (allowed.includes(alt)) return alt;
  } catch {
    // ignora
  }

  return null;
}
