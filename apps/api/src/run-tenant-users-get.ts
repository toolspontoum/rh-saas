import { toHttpError } from "./http/error-handler.js";
import { supabaseAdmin } from "./lib/supabase.js";
import { isUuid } from "./modules/platform/platform.slugify.js";
import { tenantUsersHandlers } from "./modules/tenant-users/index.js";
import { getBearerSession } from "./session-from-bearer.js";

export type JsonHttpResult = { status: number; body: unknown };

async function resolveCompanyScope(
  tenantId: string,
  xTenantCompanyId: string | null | undefined
): Promise<
  | { ok: true; companyId: string | null }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
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

export type TenantUsersListQuery = {
  status?: string;
  search?: string;
  page?: string;
  pageSize?: string;
};

/** GET /v1/tenants/:tenantId/users — lista utilizadores (página de gestão). */
export async function runTenantUsersListGet(
  authorizationHeader: string | null | undefined,
  tenantId: string,
  query: TenantUsersListQuery,
  xTenantCompanyId: string | null | undefined
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };

  const scope = await resolveCompanyScope(tenantId, xTenantCompanyId);
  if (!scope.ok) return { status: scope.status, body: scope.body };

  const statusFilter =
    query.status === "active" || query.status === "inactive" || query.status === "offboarded"
      ? query.status
      : undefined;

  try {
    const result = await tenantUsersHandlers.listUsers({
      tenantId,
      userId: s.userId,
      companyId: scope.companyId ?? undefined,
      status: statusFilter,
      search: query.search,
      page: query.page,
      pageSize: query.pageSize
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}
