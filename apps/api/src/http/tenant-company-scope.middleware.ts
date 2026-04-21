import type { NextFunction, Request, Response } from "express";

import { resolveCompanyScopeFromHeader } from "../tenant-company-from-header.js";

export type TenantCompanyScopedRequest = Request & {
  tenantCompanyId: string | null;
};

export function getTenantCompanyId(req: Request): string | null {
  const scoped = req as TenantCompanyScopedRequest;
  return scoped.tenantCompanyId ?? null;
}

/**
 * Valida o header opcional X-Tenant-Company-Id e aplica escopo de preposto (sempre o contrato atribuído).
 */
export async function resolveTenantCompanyScope(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.params.tenantId;
  if (typeof tenantId !== "string" || !tenantId) {
    (req as TenantCompanyScopedRequest).tenantCompanyId = null;
    return next();
  }

  const raw = req.header("x-tenant-company-id")?.trim();
  const auth = req.header("authorization");

  const result = await resolveCompanyScopeFromHeader(tenantId, raw || undefined, {
    authorizationHeader: auth
  });

  if (!result.ok) {
    return res.status(result.status).json(result.body);
  }

  (req as TenantCompanyScopedRequest).tenantCompanyId = result.companyId;
  return next();
}
