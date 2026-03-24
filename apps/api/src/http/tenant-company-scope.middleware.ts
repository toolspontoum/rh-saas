import type { NextFunction, Request, Response } from "express";

import { supabaseAdmin } from "../lib/supabase.js";
import { isUuid } from "../modules/platform/platform.slugify.js";

export type TenantCompanyScopedRequest = Request & {
  tenantCompanyId: string | null;
};

export function getTenantCompanyId(req: Request): string | null {
  const scoped = req as TenantCompanyScopedRequest;
  return scoped.tenantCompanyId ?? null;
}

/**
 * Valida o header opcional X-Tenant-Company-Id contra o tenant da rota.
 * Quando ausente, listagens administrativas veem o tenant inteiro; o painel envia o header para filtrar.
 */
export async function resolveTenantCompanyScope(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.params.tenantId;
  if (typeof tenantId !== "string" || !tenantId) {
    (req as TenantCompanyScopedRequest).tenantCompanyId = null;
    return next();
  }

  const raw = req.header("x-tenant-company-id")?.trim();
  if (!raw) {
    (req as TenantCompanyScopedRequest).tenantCompanyId = null;
    return next();
  }

  if (!isUuid(raw)) {
    return res.status(400).json({
      error: "INVALID_COMPANY_ID",
      message: "Identificador de empresa/projeto invalido."
    });
  }

  const { data, error } = await supabaseAdmin
    .from("tenant_companies")
    .select("id")
    .eq("id", raw)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Falha ao validar empresa/projeto."
    });
  }

  if (!data?.id) {
    return res.status(403).json({
      error: "COMPANY_NOT_IN_TENANT",
      message: "Empresa/projeto nao pertence a este assinante."
    });
  }

  (req as TenantCompanyScopedRequest).tenantCompanyId = raw;
  return next();
}
