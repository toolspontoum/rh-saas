import type { SupabaseClient } from "@supabase/supabase-js";

import { inferWebBaseUrl } from "../../lib/web-base-url.js";

const FEATURE_CODES = [
  "mod_recruitment",
  "mod_documents",
  "mod_payslips",
  "mod_time_tracking",
  "mod_oncall"
] as const;

export type PlatformTenantRow = {
  id: string;
  slug: string;
  legal_name: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
  ai_provider: "openai" | "gemini" | null;
};

export type PlatformSuperadminRow = {
  user_id: string;
  created_at: string;
  invited_by_user_id: string | null;
};

export type PlatformAiSettingsRow = {
  openai_api_key: string | null;
  openai_model: string | null;
  gemini_api_key: string | null;
  gemini_model: string | null;
};

export class PlatformRepository {
  constructor(private readonly db: SupabaseClient) {}

  async listAllTenants(): Promise<PlatformTenantRow[]> {
    const { data, error } = await this.db
      .from("tenants")
      .select("id, slug, legal_name, display_name, is_active, created_at, ai_provider")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => this.normalizeTenantRow(row as Record<string, unknown>));
  }

  async findTenantBySlug(slug: string): Promise<PlatformTenantRow | null> {
    const { data, error } = await this.db
      .from("tenants")
      .select("id, slug, legal_name, display_name, is_active, created_at, ai_provider")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return this.normalizeTenantRow(data as Record<string, unknown>);
  }

  async findTenantById(id: string): Promise<PlatformTenantRow | null> {
    const { data, error } = await this.db
      .from("tenants")
      .select("id, slug, legal_name, display_name, is_active, created_at, ai_provider")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return this.normalizeTenantRow(data as Record<string, unknown>);
  }

  private normalizeTenantRow(row: Record<string, unknown>): PlatformTenantRow {
    const ap = row.ai_provider;
    const ai_provider =
      ap === "openai" || ap === "gemini" ? ap : null;
    return {
      id: row.id as string,
      slug: row.slug as string,
      legal_name: row.legal_name as string,
      display_name: row.display_name as string,
      is_active: row.is_active as boolean,
      created_at: row.created_at as string,
      ai_provider
    };
  }

  async updateTenantAiProvider(tenantId: string, provider: "openai" | "gemini" | null): Promise<void> {
    const { error } = await this.db.from("tenants").update({ ai_provider: provider }).eq("id", tenantId);
    if (error) throw error;
  }

  async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let candidate = baseSlug;
    let n = 0;
    while (n < 200) {
      const existing = await this.findTenantBySlug(candidate);
      if (!existing) return candidate;
      n += 1;
      candidate = `${baseSlug}-${n}`;
    }
    throw new Error("SLUG_GENERATION_FAILED");
  }

  async createTenantRecord(input: {
    slug: string;
    legalName: string;
    displayName: string;
  }): Promise<string> {
    const { data, error } = await this.db
      .from("tenants")
      .insert({
        slug: input.slug,
        legal_name: input.legalName,
        display_name: input.displayName,
        is_active: true
      })
      .select("id")
      .single();
    if (error) throw error;
    const id = (data as { id: string }).id;
    if (!id) throw new Error("TENANT_CREATE_FAILED");
    return id;
  }

  async createDefaultTenantCompany(input: { tenantId: string; name: string }): Promise<void> {
    const name = input.name.trim() || "Empresa principal";
    const { error } = await this.db.from("tenant_companies").insert({
      tenant_id: input.tenantId,
      name
    });
    if (error) throw error;
  }

  async ensureStarterPlanAndFeatures(tenantId: string): Promise<void> {
    const { data: planRows, error: planError } = await this.db
      .from("plans")
      .upsert(
        { code: "starter", name: "Starter", description: "Plano base.", is_active: true },
        { onConflict: "code" }
      )
      .select("id")
      .limit(1);
    if (planError) throw planError;
    const planId = (planRows?.[0] as { id: string } | undefined)?.id;
    if (!planId) throw new Error("PLAN_NOT_FOUND");

    const { error: featureError } = await this.db
      .from("feature_flags")
      .upsert(
        FEATURE_CODES.map((code) => ({
          code,
          name: code.replace("mod_", "").replaceAll("_", " ").toUpperCase(),
          description: `Feature ${code}`
        })),
        { onConflict: "code" }
      );
    if (featureError) throw featureError;

    const { data: features, error: featureSelectError } = await this.db
      .from("feature_flags")
      .select("id, code")
      .in("code", [...FEATURE_CODES]);
    if (featureSelectError) throw featureSelectError;

    if ((features ?? []).length > 0) {
      const { error } = await this.db.from("tenant_features").upsert(
        (features ?? []).map((row) => ({
          tenant_id: tenantId,
          feature_id: row.id,
          is_enabled: true
        })),
        { onConflict: "tenant_id,feature_id" }
      );
      if (error) throw error;
    }

    const { data: subscriptionRows, error: subscriptionSelectError } = await this.db
      .from("tenant_subscriptions")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("plan_id", planId)
      .order("starts_at", { ascending: false })
      .limit(1);
    if (subscriptionSelectError) throw subscriptionSelectError;
    if ((subscriptionRows ?? []).length === 0) {
      const { error } = await this.db.from("tenant_subscriptions").insert({
        tenant_id: tenantId,
        plan_id: planId,
        status: "active",
        starts_at: new Date().toISOString(),
        ends_at: null
      });
      if (error) throw error;
    }
  }

  async upsertUserTenantRole(input: {
    tenantId: string;
    userId: string;
    role: "owner" | "admin";
  }): Promise<void> {
    const { error } = await this.db.from("user_tenant_roles").upsert(
      {
        tenant_id: input.tenantId,
        user_id: input.userId,
        role: input.role,
        is_active: true
      },
      { onConflict: "tenant_id,user_id,role" }
    );
    if (error) throw error;
  }

  async insertPlatformSuperadmin(input: {
    userId: string;
    invitedByUserId: string | null;
  }): Promise<void> {
    const { error } = await this.db.from("platform_superadmins").upsert(
      {
        user_id: input.userId,
        invited_by_user_id: input.invitedByUserId
      },
      { onConflict: "user_id" }
    );
    if (error) throw error;
  }

  async listPlatformSuperadmins(): Promise<PlatformSuperadminRow[]> {
    const { data, error } = await this.db
      .from("platform_superadmins")
      .select("user_id, created_at, invited_by_user_id")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as PlatformSuperadminRow[];
  }

  async inviteUserByEmail(email: string, fullName: string): Promise<string> {
    const redirectTo = `${inferWebBaseUrl()}/reset-password`;
    const { data, error } = await this.db.auth.admin.inviteUserByEmail(email.toLowerCase(), {
      data: { full_name: fullName },
      redirectTo
    });
    if (error) throw error;
    if (!data.user?.id) throw new Error("USER_INVITE_FAILED");
    return data.user.id;
  }

  async findAuthUserIdByEmail(email: string): Promise<string | null> {
    const normalized = email.trim().toLowerCase();
    const { data, error } = await this.db.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw error;
    const found = data.users?.find((u) => (u.email ?? "").toLowerCase() === normalized);
    return found?.id ?? null;
  }

  async getAuthUserEmailById(userId: string): Promise<string | null> {
    const { data, error } = await this.db.auth.admin.getUserById(userId);
    if (error) throw error;
    return data.user?.email ?? null;
  }

  async getPlatformAiSettingsRow(): Promise<PlatformAiSettingsRow | null> {
    const { data, error } = await this.db
      .from("platform_ai_settings")
      .select("openai_api_key, openai_model, gemini_api_key, gemini_model")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    return (data as PlatformAiSettingsRow | null) ?? null;
  }

  async upsertPlatformAiSettingsRow(row: PlatformAiSettingsRow): Promise<void> {
    const { error } = await this.db.from("platform_ai_settings").upsert(
      {
        id: 1,
        openai_api_key: row.openai_api_key,
        openai_model: row.openai_model,
        gemini_api_key: row.gemini_api_key,
        gemini_model: row.gemini_model
      },
      { onConflict: "id" }
    );
    if (error) throw error;
  }
}
