import { env } from "../../config/env.js";
import { supabaseAdmin } from "../../lib/supabase.js";

type PlatformAiRow = {
  openai_api_key: string | null;
  openai_model: string | null;
  gemini_api_key: string | null;
  gemini_model: string | null;
};

const TTL_MS = 45_000;
let cachedAt = 0;
let cachedRow: PlatformAiRow | null | undefined;

export function invalidatePlatformAiSettingsCache(): void {
  cachedAt = 0;
  cachedRow = undefined;
}

async function loadRow(): Promise<PlatformAiRow | null> {
  const { data, error } = await supabaseAdmin
    .from("platform_ai_settings")
    .select("openai_api_key, openai_model, gemini_api_key, gemini_model")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return (data as PlatformAiRow | null) ?? null;
}

async function getRowCached(): Promise<PlatformAiRow | null> {
  if (cachedRow !== undefined && Date.now() - cachedAt < TTL_MS) {
    return cachedRow;
  }
  cachedRow = await loadRow();
  cachedAt = Date.now();
  return cachedRow;
}

export async function getOpenAiRuntime(): Promise<{ apiKey: string; model: string } | null> {
  const row = await getRowCached();
  const key = (row?.openai_api_key?.trim() || env.OPENAI_API_KEY?.trim() || "").trim();
  if (!key) return null;
  const model = (row?.openai_model?.trim() || env.OPENAI_MODEL || "gpt-4o").trim();
  return { apiKey: key, model };
}

export async function getGeminiRuntime(): Promise<{ apiKey: string; model: string } | null> {
  const row = await getRowCached();
  const key = (row?.gemini_api_key?.trim() || env.GEMINI_API_KEY?.trim() || "").trim();
  if (!key) return null;
  const model = (row?.gemini_model?.trim() || env.GEMINI_MODEL || "gemini-2.0-flash").trim();
  return { apiKey: key, model };
}
