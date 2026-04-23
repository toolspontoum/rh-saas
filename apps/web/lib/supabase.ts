"use client";

import { createClient } from "@supabase/supabase-js";

import { appConfig } from "./config";

/**
 * `createClient` exige URL e chave não vazias; na Vercel (Preview) ou CI, se
 * `NEXT_PUBLIC_SUPABASE_*` não estiverem definidas, o `next build` quebra na pré-renderização.
 * Placeholder só para satisfazer o cliente; em runtime real as envs devem estar definidas.
 */
const PLACEHOLDER_SUPABASE_URL = "https://placeholder.supabase.co";
/** JWT sintaticamente válido (payload vazio); não aponta a projeto real. */
const PLACEHOLDER_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.2tfr0WEaZQFC_xmwfwkjLoxj9FqLWGEJxmyZEA4Jwp0";

const supabaseUrl = appConfig.supabaseUrl.trim() || PLACEHOLDER_SUPABASE_URL;
const supabaseAnonKey = appConfig.supabaseAnonKey.trim() || PLACEHOLDER_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true }
});

