import { Router } from "express";

import { coreAuthTenantHandlers } from "../modules/core-auth-tenant/index.js";
import { platformHandlers } from "../modules/platform/index.js";
import { requireAuth, type AuthenticatedRequest } from "./auth.js";
import { toHttpError } from "./error-handler.js";

/**
 * Rotas mínimas carregadas sem o resto de `routes.ts` (recrutamento, IA, PDF, etc.),
 * para cold start rápido na Vercel (login: /v1/platform/me + /v1/me/tenants).
 */
export const liteRouter = Router();

liteRouter.get("/health", (_req, res) => {
  return res.status(200).json({ ok: true });
});

liteRouter.get("/v1/health", (_req, res) => {
  return res.status(200).json({ ok: true, scope: "express-lite" });
});

liteRouter.get("/v1/platform/me", requireAuth, async (req, res) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    const result = await platformHandlers.me(auth);
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

liteRouter.get("/v1/me/tenants", requireAuth, async (req, res) => {
  try {
    const result = await coreAuthTenantHandlers.listMyTenants({
      userId: (req as AuthenticatedRequest).auth.userId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});
