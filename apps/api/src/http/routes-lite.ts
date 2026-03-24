import { Router } from "express";

import { coreAuthTenantHandlers } from "../modules/core-auth-tenant/index.js";
import { platformHandlers } from "../modules/platform/index.js";
import { standardDocumentsHandlers } from "../modules/standard-documents/index.js";
import { requireAuth, requirePlatformAdmin, type AuthenticatedRequest } from "./auth.js";
import { toHttpError } from "./error-handler.js";

/**
 * Rotas mínimas carregadas sem o resto de `routes.ts` (recrutamento, IA, PDF, etc.),
 * para cold start rápido na Vercel (login, superadmin, /v1/me/tenants).
 * Rotas de plataforma aqui evitam importar multer/recrutamento no primeiro pedido ao painel.
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
    const auth = (req as AuthenticatedRequest).auth;
    const result = await coreAuthTenantHandlers.listMyTenants({
      userId: auth.userId,
      email: auth.email
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

liteRouter.get("/v1/platform/tenants", requirePlatformAdmin, async (_req, res) => {
  try {
    const result = await platformHandlers.listTenants();
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

liteRouter.post("/v1/platform/tenants", requirePlatformAdmin, async (req, res) => {
  try {
    const result = await platformHandlers.createTenant(req.body);
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

liteRouter.post("/v1/platform/tenants/:tenantId/grant-admin", requirePlatformAdmin, async (req, res) => {
  try {
    const result = await platformHandlers.grantAdminAccess(
      { tenantId: req.params.tenantId },
      (req as AuthenticatedRequest).auth
    );
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

liteRouter.get("/v1/platform/superadmins", requirePlatformAdmin, async (_req, res) => {
  try {
    const result = await platformHandlers.listSuperadmins();
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

liteRouter.post("/v1/platform/superadmins", requirePlatformAdmin, async (req, res) => {
  try {
    const result = await platformHandlers.addSuperadmin(req.body, (req as AuthenticatedRequest).auth);
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

liteRouter.get("/v1/platform/ai-settings", requirePlatformAdmin, async (_req, res) => {
  try {
    const result = await platformHandlers.getAiSettings();
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

liteRouter.patch("/v1/platform/ai-settings", requirePlatformAdmin, async (req, res) => {
  try {
    const result = await platformHandlers.patchAiSettings(req.body);
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

liteRouter.patch("/v1/platform/tenants/:tenantId/ai-provider", requirePlatformAdmin, async (req, res) => {
  try {
    const tenantId = String(req.params.tenantId ?? "");
    const result = await platformHandlers.patchTenantAiProvider(tenantId, req.body);
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

liteRouter.get("/v1/platform/standard-document-types", requirePlatformAdmin, async (_req, res) => {
  try {
    const result = await standardDocumentsHandlers.listPlatformTypes();
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

liteRouter.post("/v1/platform/standard-document-types", requirePlatformAdmin, async (req, res) => {
  try {
    const result = await standardDocumentsHandlers.createPlatformType(req.body);
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

liteRouter.patch("/v1/platform/standard-document-types/:id", requirePlatformAdmin, async (req, res) => {
  try {
    const result = await standardDocumentsHandlers.updatePlatformType({
      id: req.params.id,
      ...req.body
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});
