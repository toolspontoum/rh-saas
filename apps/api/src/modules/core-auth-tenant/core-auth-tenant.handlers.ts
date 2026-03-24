import { z } from "zod";

import { CoreAuthTenantService } from "./core-auth-tenant.service.js";

const listTenantsInputSchema = z.object({
  userId: z.string().uuid(),
  /** Usado para reconhecer superadmin de plataforma (lista todos os assinantes como admin). */
  email: z.union([z.string().email(), z.null()]).optional()
});

const getTenantContextInputSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.union([z.string().email(), z.null()]).optional()
});

const assertFeatureEnabledInputSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  featureCode: z.string().min(1)
});

const updateTenantAiProviderSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  provider: z.enum(["openai", "gemini"]).nullable()
});

export class CoreAuthTenantHandlers {
  constructor(private readonly service: CoreAuthTenantService) {}

  async listMyTenants(input: unknown) {
    const payload = listTenantsInputSchema.parse(input);
    return this.service.listTenantsForUser(payload.userId, payload.email ?? null);
  }

  async getContext(input: unknown) {
    const payload = getTenantContextInputSchema.parse(input);
    return this.service.getTenantContext(payload.userId, payload.tenantId, payload.email ?? null);
  }

  async validateFeature(input: unknown) {
    const payload = assertFeatureEnabledInputSchema.parse(input);
    await this.service.assertFeatureEnabled(payload.userId, payload.tenantId, payload.featureCode);
    return { ok: true };
  }

  async updateTenantAiProvider(input: unknown) {
    const payload = updateTenantAiProviderSchema.parse(input);
    return this.service.updateTenantAiProvider({
      userId: payload.userId,
      tenantId: payload.tenantId,
      provider: payload.provider
    });
  }
}

