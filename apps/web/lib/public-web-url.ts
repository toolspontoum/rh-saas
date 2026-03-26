const FALLBACK_PUBLIC_WEB_URL = "https://rh-saas-delta.vercel.app";

export function getPublicWebUrl(): string {
  const configured = process.env.NEXT_PUBLIC_WEB_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return FALLBACK_PUBLIC_WEB_URL;
}

