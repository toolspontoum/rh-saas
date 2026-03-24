import type { SupabaseClient } from "@supabase/supabase-js";

import { env } from "../../config/env.js";
import { getGeminiRuntime, getOpenAiRuntime } from "./platform-ai-runtime.js";

export type AiProviderId = "openai" | "gemini";

export async function getTenantAiProviderOverride(db: SupabaseClient, tenantId: string): Promise<AiProviderId | null> {
  const { data, error } = await db.from("tenants").select("ai_provider").eq("id", tenantId).maybeSingle();
  if (error) throw error;
  const v = (data as { ai_provider: string | null } | null)?.ai_provider;
  if (v === "openai" || v === "gemini") return v;
  return null;
}

/** Provedor efetivo: override do tenant ou padrão do ambiente (none = desligado). */
export async function resolveEffectiveAiProvider(
  db: SupabaseClient,
  tenantId: string
): Promise<AiProviderId | null> {
  const override = await getTenantAiProviderOverride(db, tenantId);
  if (override) return override;
  if (env.AI_PROVIDER_DEFAULT === "none") return null;
  return env.AI_PROVIDER_DEFAULT;
}

/** Perfil público do candidato (sem tenant): usa só AI_PROVIDER_DEFAULT e chaves da plataforma. */
export function resolvePlatformDefaultAiProvider(): AiProviderId | null {
  if (env.AI_PROVIDER_DEFAULT === "none") return null;
  return env.AI_PROVIDER_DEFAULT;
}

/**
 * Candidato (sem tenant): se `AI_PROVIDER_DEFAULT` for openai|gemini, usa esse provedor;
 * se for `none`, escolhe automaticamente quem tiver chave (painel `platform_ai_settings` ou .env), priorizando OpenAI.
 */
export async function resolvePlatformAiProviderForCandidateProfile(): Promise<AiProviderId | null> {
  const preferred = resolvePlatformDefaultAiProvider();
  if (preferred === "openai" || preferred === "gemini") {
    return preferred;
  }
  if (await getOpenAiRuntime()) return "openai";
  if (await getGeminiRuntime()) return "gemini";
  return null;
}

export async function assertProviderCredentials(provider: AiProviderId): Promise<void> {
  if (provider === "openai") {
    const cfg = await getOpenAiRuntime();
    if (!cfg) throw new Error("OPENAI_API_KEY_MISSING");
    return;
  }
  const cfg = await getGeminiRuntime();
  if (!cfg) throw new Error("GEMINI_API_KEY_MISSING");
}
