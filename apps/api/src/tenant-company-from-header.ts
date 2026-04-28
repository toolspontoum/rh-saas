import { supabaseAdmin, supabaseAnon } from "./lib/supabase.js";
import { isUuid } from "./modules/platform/platform.slugify.js";

export type CompanyScopeResult =
  | { ok: true; companyId: string | null }
  | { ok: false; status: number; body: Record<string, unknown> };

function extractBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

async function findPrepostoCompanyIdsForUser(tenantId: string, userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("tenant_companies")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("preposto_user_id", userId)
    .order("id", { ascending: true });
  if (error) return [];
  return ((data ?? []) as { id: string }[]).map((r) => r.id).filter(Boolean);
}

export type ResolveCompanyScopeActor = {
  authorizationHeader?: string | null;
  actorUserId?: string | null;
};

/**
 * Resolve o escopo de empresa/projeto.
 * Preposto: fica sempre restrito ao contrato atribuído (ignora "Todas" no painel).
 */
export async function resolveCompanyScopeFromHeader(
  tenantId: string,
  xTenantCompanyId: string | null | undefined,
  actor?: ResolveCompanyScopeActor | null
): Promise<CompanyScopeResult> {
  let userId = actor?.actorUserId ?? null;
  if (!userId && actor?.authorizationHeader) {
    const token = extractBearer(actor.authorizationHeader);
    if (token) {
      const { data } = await supabaseAnon.auth.getUser(token);
      if (data.user?.id) userId = data.user.id;
    }
  }

  if (userId) {
    const prepostoCompanyIds = await findPrepostoCompanyIdsForUser(tenantId, userId);
    if (prepostoCompanyIds.length > 0) {
      const raw = xTenantCompanyId?.trim() ?? "";
      if (prepostoCompanyIds.length === 1) {
        const forced = prepostoCompanyIds[0]!;
        if (raw && raw !== forced) {
          return {
            ok: false,
            status: 403,
            body: {
              error: "PREPOSTO_SCOPE_MISMATCH",
              message: "Preposto so pode aceder ao contrato para o qual foi designado."
            }
          };
        }
        return { ok: true, companyId: forced };
      }
      if (!raw) {
        return {
          ok: false,
          status: 400,
          body: {
            error: "PREPOSTO_COMPANY_HEADER_REQUIRED",
            message:
              "Este utilizador e preposto de varios projetos. Selecione a empresa/projeto no painel ou envie o header X-Tenant-Company-Id."
          }
        };
      }
      if (!prepostoCompanyIds.includes(raw)) {
        return {
          ok: false,
          status: 403,
          body: {
            error: "PREPOSTO_SCOPE_MISMATCH",
            message: "Preposto so pode aceder a um contrato para o qual foi designado."
          }
        };
      }
      return { ok: true, companyId: raw };
    }
  }

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
