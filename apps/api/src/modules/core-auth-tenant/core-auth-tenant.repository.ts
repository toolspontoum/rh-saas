import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole, TenantContext, TenantSummary } from "./core-auth-tenant.types.js";

type TenantRoleRow = {
  role: AppRole;
  is_active: boolean;
  tenants:
    | {
        id: string;
        slug: string;
        legal_name: string;
        display_name: string;
        is_active: boolean;
      }
    | Array<{
        id: string;
        slug: string;
        legal_name: string;
        display_name: string;
        is_active: boolean;
      }>
    | null;
};

type TenantFeatureRow = {
  is_enabled: boolean;
  feature_flags:
    | {
        code: string;
      }
    | Array<{
        code: string;
      }>
    | null;
};

type TenantSubscriptionRow = {
  status: "trial" | "active" | "past_due" | "canceled";
  starts_at: string;
  ends_at: string | null;
  plans:
    | {
        code: string;
      }
    | Array<{
        code: string;
      }>
    | null;
};

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type TenantShape = {
    id: string;
    slug: string;
    legal_name: string;
    display_name: string;
    is_active: boolean;
};

export class CoreAuthTenantRepository {
  constructor(private readonly db: SupabaseClient) {}

  async listTenantRolesForUser(userId: string): Promise<TenantSummary[]> {
    const { data, error } = await this.db
      .from("user_tenant_roles")
      .select(
        `
        role,
        is_active,
        tenants:tenant_id (
          id,
          slug,
          legal_name,
          display_name,
          is_active
        )
      `
      )
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) throw error;

    const grouped = new Map<string, TenantSummary>();

    for (const row of (data ?? []) as unknown as TenantRoleRow[]) {
      const tenant = pickOne(row.tenants) as TenantShape | null;
      if (!tenant) continue;
      const existing = grouped.get(tenant.id);
      if (existing) {
        existing.roles.push(row.role);
        continue;
      }

      grouped.set(tenant.id, {
        tenantId: tenant.id,
        slug: tenant.slug,
        legalName: tenant.legal_name,
        displayName: tenant.display_name,
        isActive: tenant.is_active,
        roles: [row.role]
      });
    }

    return [...grouped.values()];
  }

  async listTenantFeatures(tenantId: string): Promise<TenantContext["features"]> {
    const { data, error } = await this.db
      .from("tenant_features")
      .select(
        `
        is_enabled,
        feature_flags:feature_id (
          code
        )
      `
      )
      .eq("tenant_id", tenantId);

    if (error) throw error;

    return ((data ?? []) as unknown as TenantFeatureRow[])
      .map((row) => ({ ...row, feature: pickOne(row.feature_flags) }))
      .filter((row) => row.feature?.code)
      .map((row) => ({
        code: row.feature!.code,
        isEnabled: row.is_enabled
      }));
  }

  async getCurrentSubscription(tenantId: string): Promise<TenantContext["subscription"]> {
    const { data, error } = await this.db
      .from("tenant_subscriptions")
      .select(
        `
        status,
        starts_at,
        ends_at,
        plans:plan_id (
          code
        )
      `
      )
      .eq("tenant_id", tenantId)
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    const row = data as unknown as TenantSubscriptionRow | null;
    const plan = pickOne(row?.plans);
    if (!row || !plan?.code) return null;

    return {
      planCode: plan.code,
      status: row.status,
      startsAt: row.starts_at,
      endsAt: row.ends_at
    };
  }

  async getTenantAiProviderOverride(tenantId: string): Promise<"openai" | "gemini" | null> {
    const { data, error } = await this.db.from("tenants").select("ai_provider").eq("id", tenantId).maybeSingle();
    if (error) throw error;
    const v = (data as { ai_provider: string | null } | null)?.ai_provider;
    if (v === "openai" || v === "gemini") return v;
    return null;
  }

  async updateTenantAiProvider(tenantId: string, provider: "openai" | "gemini" | null): Promise<void> {
    const { error } = await this.db.from("tenants").update({ ai_provider: provider }).eq("id", tenantId);
    if (error) throw error;
  }
}
