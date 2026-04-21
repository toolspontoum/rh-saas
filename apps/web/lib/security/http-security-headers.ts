/**
 * Cabeçalhos de hardening para respostas HTML do Next.js.
 * CSP e HSTS apenas em produção (NODE_ENV === "production").
 */

export type NextSecurityHeader = { key: string; value: string };

const PERMISSIONS_POLICY =
  "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=()";

function parseSupabaseConnectOrigins(
  url: string | undefined
): { httpsOrigin: string; wssOrigin: string } | null {
  const raw = url?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    const host = u.host;
    return { httpsOrigin: `https://${host}`, wssOrigin: `wss://${host}` };
  } catch {
    return null;
  }
}

function parseOptionalHttpOrigin(url: string | undefined): string | null {
  const raw = url?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

function buildProductionContentSecurityPolicy(): string {
  const supabase = parseSupabaseConnectOrigins(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const apiExplicit = parseOptionalHttpOrigin(process.env.NEXT_PUBLIC_API_BASE_URL);

  const connectParts = new Set<string>(["'self'"]);
  if (supabase) {
    connectParts.add(supabase.httpsOrigin);
    connectParts.add(supabase.wssOrigin);
  }
  if (apiExplicit) {
    connectParts.add(apiExplicit);
  }

  const imgParts = new Set<string>(["'self'", "data:", "blob:"]);
  const mediaParts = new Set<string>(["'self'", "blob:"]);
  if (supabase) {
    imgParts.add(supabase.httpsOrigin);
    mediaParts.add(supabase.httpsOrigin);
  }

  const directives: string[] = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${[...imgParts].join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${[...connectParts].join(" ")}`,
    "worker-src 'self' blob:",
    `media-src ${[...mediaParts].join(" ")}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests"
  ];

  return directives.join("; ");
}

/**
 * Lista de cabeçalhos para `headers()` do Next.js em `/:path*`.
 */
export function buildSecurityHeadersForNext(): NextSecurityHeader[] {
  const base: NextSecurityHeader[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
    { key: "X-DNS-Prefetch-Control", value: "on" }
  ];

  if (process.env.NODE_ENV !== "production") {
    return base;
  }

  return [
    ...base,
    {
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains"
    },
    {
      key: "Content-Security-Policy",
      value: buildProductionContentSecurityPolicy()
    }
  ];
}
