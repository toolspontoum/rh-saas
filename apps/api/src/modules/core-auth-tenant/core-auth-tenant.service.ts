import { env } from "../../config/env.js";
import { CoreAuthTenantRepository } from "./core-auth-tenant.repository.js";
import type { AppRole, TenantContext, TenantSummary } from "./core-auth-tenant.types.js";

export class CoreAuthTenantService {
  constructor(private readonly repository: CoreAuthTenantRepository) {}

  async listTenantsForUser(userId: string): Promise<TenantSummary[]> {
    return this.repository.listTenantRolesForUser(userId);
  }

  async getTenantContext(userId: string, tenantId: string): Promise<TenantContext> {
    const memberships = await this.repository.listTenantRolesForUser(userId);
    const membership = memberships.find((item) => item.tenantId === tenantId);

    if (!membership) {
      throw new Error("USER_NOT_IN_TENANT");
    }

    const [features, subscription, tenantAiProvider] = await Promise.all([
      this.repository.listTenantFeatures(tenantId),
      this.repository.getCurrentSubscription(tenantId),
      this.repository.getTenantAiProviderOverride(tenantId)
    ]);

    let aiEffectiveProvider: "openai" | "gemini" | null = tenantAiProvider;
    if (!aiEffectiveProvider && env.AI_PROVIDER_DEFAULT !== "none") {
      aiEffectiveProvider = env.AI_PROVIDER_DEFAULT;
    }

    return {
      tenantId,
      roles: membership.roles,
      features,
      subscription,
      aiProvider: tenantAiProvider,
      aiEffectiveProvider
    };
  }

  async updateTenantAiProvider(input: {
    userId: string;
    tenantId: string;
    provider: "openai" | "gemini" | null;
  }): Promise<{ ok: true }> {
    await this.assertUserHasAnyRole(input.userId, input.tenantId, ["owner", "admin"]);
    await this.repository.updateTenantAiProvider(input.tenantId, input.provider);
    return { ok: true };
  }

  async assertFeatureEnabled(userId: string, tenantId: string, featureCode: string): Promise<void> {
    const context = await this.getTenantContext(userId, tenantId);
    const feature = context.features.find((item) => item.code === featureCode);

    if (!feature || !feature.isEnabled) {
      throw new Error("FEATURE_NOT_ENABLED");
    }
  }

  async assertUserHasAnyRole(userId: string, tenantId: string, allowedRoles: AppRole[]): Promise<void> {
    const context = await this.getTenantContext(userId, tenantId);
    const hasAllowedRole = context.roles.some((role) => allowedRoles.includes(role));

    if (!hasAllowedRole) {
      throw new Error("ROLE_NOT_ALLOWED");
    }
  }
}
