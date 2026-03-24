import { createClient } from "@supabase/supabase-js";

import { env } from "../config/env.js";

/** Margem abaixo do limite típico de 10s (Hobby) para falhar com erro explícito em vez de 504 genérico. */
const SUPABASE_HTTP_TIMEOUT_MS = 9_000;

function fetchWithTimeout(
  input: Parameters<typeof globalThis.fetch>[0],
  init?: RequestInit
): Promise<Response> {
  const timeout = AbortSignal.timeout(SUPABASE_HTTP_TIMEOUT_MS);
  const user = init?.signal;
  const signal =
    user && typeof AbortSignal.any === "function"
      ? AbortSignal.any([user, timeout])
      : timeout;
  return fetch(input, { ...init, signal });
}

const globalFetch = { fetch: fetchWithTimeout };

export const supabaseAnon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  global: globalFetch
});

export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  global: globalFetch
});

