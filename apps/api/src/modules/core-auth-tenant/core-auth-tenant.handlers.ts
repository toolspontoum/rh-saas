import { z } from "zod";

import { CoreAuthTenantService } from "./core-auth-tenant.service.js";

const listTenantsInputSchema = z.object({
  userId: z.string().uuid()
});

const getTenantContextInputSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid()
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
    return this.service.listTenantsForUser(payload.userId);
  }

  async getContext(input: unknown) {
    const payload = getTenantContextInputSchema.parse(input);
    return this.service.getTenantContext(payload.userId, payload.tenantId);
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

