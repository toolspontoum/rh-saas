import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildSecurityHeadersForNext } from "./http-security-headers";

describe("buildSecurityHeadersForNext", () => {
  const savedNodeEnv = process.env.NODE_ENV;
  const savedSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const savedApiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  afterEach(() => {
    process.env.NODE_ENV = savedNodeEnv;
    process.env.NEXT_PUBLIC_SUPABASE_URL = savedSupabase;
    process.env.NEXT_PUBLIC_API_BASE_URL = savedApiBase;
  });

  it("em desenvolvimento não envia CSP nem HSTS", () => {
    process.env.NODE_ENV = "development";
    const headers = buildSecurityHeadersForNext();
    const keys = new Set(headers.map((h) => h.key.toLowerCase()));
    expect(keys.has("content-security-policy")).toBe(false);
    expect(keys.has("strict-transport-security")).toBe(false);
    expect(headers.find((h) => h.key === "X-Content-Type-Options")?.value).toBe("nosniff");
    expect(headers.find((h) => h.key === "X-Frame-Options")?.value).toBe("DENY");
  });

  it("em produção envia HSTS e CSP com default-src e hosts Supabase", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc123.supabase.co";
    const headers = buildSecurityHeadersForNext();
    const map = Object.fromEntries(headers.map((h) => [h.key.toLowerCase(), h.value]));
    expect(map["strict-transport-security"]).toContain("max-age=31536000");
    expect(map["strict-transport-security"]).toContain("includeSubDomains");
    const csp = map["content-security-policy"];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("https://abc123.supabase.co");
    expect(csp).toContain("wss://abc123.supabase.co");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("em produção inclui API explícita em connect-src quando NEXT_PUBLIC_API_BASE_URL está definida", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc123.supabase.co";
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.exemplo.com";
    const headers = buildSecurityHeadersForNext();
    const csp = headers.find((h) => h.key === "Content-Security-Policy")?.value ?? "";
    expect(csp).toContain("https://api.exemplo.com");
  });
});
