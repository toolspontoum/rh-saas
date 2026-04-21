const FALLBACK_PUBLIC_WEB_URL = "https://rh-saas-delta.vercel.app";

function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/**
 * Base pública do app (redirects Supabase: confirmação, recuperação de senha).
 * No browser em ambiente real, usa o `origin` atual para os links de e-mail
 * não herdarem localhost de um build ou de `NEXT_PUBLIC_WEB_APP_URL` errada.
 */
export function getPublicWebUrl(): string {
  const configured = process.env.NEXT_PUBLIC_WEB_APP_URL?.trim();

  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    if (!isLocalHostname(hostname)) {
      return trimTrailingSlash(origin);
    }
    if (configured) return trimTrailingSlash(configured);
    return trimTrailingSlash(origin);
  }

  if (configured) return trimTrailingSlash(configured);
  return FALLBACK_PUBLIC_WEB_URL;
}

