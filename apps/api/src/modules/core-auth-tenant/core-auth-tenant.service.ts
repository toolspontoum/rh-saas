import { env } from "../../config/env.js";
import { isPlatformAdminUser } from "../../http/auth.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { PlatformRepository } from "../platform/platform.repository.js";
import { CoreAuthTenantRepository } from "./core-auth-tenant.repository.js";
import type { AppRole, TenantContext, TenantSummary } from "./core-auth-tenant.types.js";

export class CoreAuthTenantService {
  constructor(
    private readonly repository: CoreAuthTenantRepository,
    private readonly platformRepository: PlatformRepository
  ) {}

  async listTenantsForUser(userId: string, email: string | null): Promise<TenantSummary[]> {
    const direct = await this.repository.listTenantRolesForUser(userId);

    if (!(await isPlatformAdminUser(userId, email))) {
      return direct;
    }

    const all = await this.platformRepository.listAllTenants();
    const directById = new Map(direct.map((t) => [t.tenantId, t]));
    const merged: TenantSummary[] = [];

    for (const row of all) {
      const existing = directById.get(row.id);
      if (existing) {
        merged.push(existing);
      } else {
        merged.push({
          tenantId: row.id,
          slug: row.slug,
          displayName: row.display_name,
          legalName: row.legal_name,
          isActive: row.is_active,
          roles: ["admin"]
        });
      }
    }

    const seen = new Set(merged.map((t) => t.tenantId));
    for (const t of direct) {
      if (!seen.has(t.tenantId)) merged.push(t);
    }

    return merged;
  }

  async getTenantContext(
    userId: string,
    tenantId: string,
    emailFromToken: string | null = null
  ): Promise<TenantContext> {
    const memberships = await this.repository.listTenantRolesForUser(userId);
    const membership = memberships.find((item) => item.tenantId === tenantId);

    let roles: AppRole[];
    if (membership) {
      roles = membership.roles;
    } else {
      let platform = await isPlatformAdminUser(userId, emailFromToken);
      if (!platform) {
        const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
        const resolved = data?.user?.email ?? null;
        platform = await isPlatformAdminUser(userId, resolved);
      }
      if (platform) {
        const tenant = await this.platformRepository.findTenantById(tenantId);
        if (!tenant) throw new Error("USER_NOT_IN_TENANT");
        roles = ["admin"];
      } else {
        throw new Error("USER_NOT_IN_TENANT");
      }
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
      roles,
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
