function defaultApiBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  // Produção na Vercel: API Express montada em `pages/api` → mesmo domínio em /api
  if (process.env.NODE_ENV === "production") {
    return "/api";
  }
  // Desenvolvimento: API Node separada (concurrently na porta 3333)
  return "http://127.0.0.1:3333";
}

export const appConfig = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  apiBaseUrl: defaultApiBaseUrl()
};

