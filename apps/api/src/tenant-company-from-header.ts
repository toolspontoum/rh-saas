import { supabaseAdmin } from "./lib/supabase.js";
import { isUuid } from "./modules/platform/platform.slugify.js";

export type CompanyScopeResult =
  | { ok: true; companyId: string | null }
  | { ok: false; status: number; body: Record<string, unknown> };

/** Replica `resolveTenantCompanyScope` (Express) para handlers run-* sem carregar routes.js. */
export async function resolveCompanyScopeFromHeader(
  tenantId: string,
  xTenantCompanyId: string | null | undefined
): Promise<CompanyScopeResult> {
  const raw = xTenantCompanyId?.trim() ?? "";
  if (!raw) return { ok: true, companyId: null };
  if (!isUuid(raw)) {
    return {
      ok: false,
      status: 400,
      body: { error: "INVALID_COMPANY_ID", message: "Identificador de empresa/projeto invalido." }
    };
  }
  const { data, error } = await supabaseAdmin
    .from("tenant_companies")
    .select("id")
    .eq("id", raw)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) {
    return {
      ok: false,
      status: 500,
      body: { error: "INTERNAL_ERROR", message: "Falha ao validar empresa/projeto." }
    };
  }
  if (!data?.id) {
    return {
      ok: false,
      status: 403,
      body: {
        error: "COMPANY_NOT_IN_TENANT",
        message: "Empresa/projeto nao pertence a este assinante."
      }
    };
  }
  return { ok: true, companyId: raw };
}
