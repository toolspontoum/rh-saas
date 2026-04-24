import { env } from "../config/env.js";

/** URL pública do app (convites Auth, links de recuperação). */
export function inferWebBaseUrl(): string {
  const configured = env.WEB_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const firstAllowed = env.WEB_ALLOWED_ORIGINS.split(",").map((item) => item.trim()).find((item) => item.startsWith("http"));
  if (firstAllowed) return firstAllowed.replace(/\/$/, "");

  return "https://rh-saas-delta.vercel.app";
}
