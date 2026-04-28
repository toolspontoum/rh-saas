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
    const withPreposto = await this.attachPrepostoCompanies(userId, direct);

    if (!(await isPlatformAdminUser(userId, email))) {
      return withPreposto;
    }

    const all = await this.platformRepository.listAllTenants();
    const directById = new Map(withPreposto.map((t) => [t.tenantId, t]));
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
    for (const t of withPreposto) {
      if (!seen.has(t.tenantId)) merged.push(t);
    }

    return merged;
  }

  private async attachPrepostoCompanies(userId: string, tenants: TenantSummary[]): Promise<TenantSummary[]> {
    if (tenants.length === 0) return tenants;
    const { data, error } = await supabaseAdmin
      .from("tenant_companies")
      .select("tenant_id, id")
      .eq("preposto_user_id", userId)
      .order("id", { ascending: true });
    if (error) throw error;
    const byTenant = new Map<string, string>();
    for (const r of (data ?? []) as { tenant_id: string; id: string }[]) {
      if (!byTenant.has(r.tenant_id)) byTenant.set(r.tenant_id, r.id);
    }
    return tenants.map((t) => ({
      ...t,
      prepostoCompanyId: byTenant.get(t.tenantId) ?? null
    }));
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

    let prepostoCompanyId: string | null = null;
    if (roles.includes("preposto")) {
      const { data: preRows, error: preErr } = await supabaseAdmin
        .from("tenant_companies")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("preposto_user_id", userId)
        .order("id", { ascending: true });
      if (preErr) throw preErr;
      const ids = ((preRows ?? []) as { id: string }[]).map((r) => r.id);
      prepostoCompanyId = ids[0] ?? null;
    }

    let resolvedEmail = emailFromToken;
    if (!resolvedEmail) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
      resolvedEmail = data?.user?.email ?? null;
    }
    const isPlatformSuperadmin = await isPlatformAdminUser(userId, resolvedEmail);

    return {
      tenantId,
      roles,
      prepostoCompanyId,
      features,
      subscription,
      aiProvider: tenantAiProvider,
      aiEffectiveProvider,
      isPlatformSuperadmin
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
