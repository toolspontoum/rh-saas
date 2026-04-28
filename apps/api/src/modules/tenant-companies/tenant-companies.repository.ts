import type { SupabaseClient } from "@supabase/supabase-js";

export type TenantCompanyRow = {
  id: string;
  tenant_id: string;
  name: string;
  tax_id: string | null;
  preposto_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export class TenantCompaniesRepository {
  constructor(private readonly db: SupabaseClient) {}

  async listByTenant(tenantId: string): Promise<TenantCompanyRow[]> {
    const { data, error } = await this.db
      .from("tenant_companies")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as TenantCompanyRow[];
  }

  async findInTenant(tenantId: string, companyId: string): Promise<TenantCompanyRow | null> {
    const { data, error } = await this.db
      .from("tenant_companies")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", companyId)
      .maybeSingle();
    if (error) throw error;
    return (data as TenantCompanyRow | null) ?? null;
  }

  async create(input: { tenantId: string; name: string; taxId: string | null }): Promise<TenantCompanyRow> {
    const { data, error } = await this.db
      .from("tenant_companies")
      .insert({
        tenant_id: input.tenantId,
        name: input.name.trim(),
        tax_id: input.taxId?.trim() ? input.taxId.trim() : null
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as TenantCompanyRow;
  }

  async update(input: {
    tenantId: string;
    companyId: string;
    name?: string;
    taxId?: string | null;
  }): Promise<TenantCompanyRow> {
    const patch: Record<string, unknown> = {};
    if (typeof input.name === "string") patch.name = input.name.trim();
    if (typeof input.taxId !== "undefined") {
      patch.tax_id = input.taxId?.trim() ? input.taxId.trim() : null;
    }
    const { data, error } = await this.db
      .from("tenant_companies")
      .update(patch)
      .eq("tenant_id", input.tenantId)
      .eq("id", input.companyId)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("TENANT_COMPANY_NOT_FOUND");
    return data as TenantCompanyRow;
  }

  async deleteIfEmpty(tenantId: string, companyId: string): Promise<void> {
    const tables: { name: string; col?: string }[] = [
      { name: "jobs" },
      { name: "tenant_user_profiles" },
      { name: "documents" },
      { name: "document_requests" },
      { name: "notices" }
    ];
    for (const t of tables) {
      const { count, error } = await this.db
        .from(t.name)
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId);
      if (error) throw error;
      if ((count ?? 0) > 0) {
        throw new Error("TENANT_COMPANY_IN_USE");
      }
    }

    const { error: delError } = await this.db
      .from("tenant_companies")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", companyId);
    if (delError) throw delError;
  }

  async insertDefaultForTenant(tenantId: string, name: string): Promise<string> {
    const { data, error } = await this.db
      .from("tenant_companies")
      .insert({
        tenant_id: tenantId,
        name: name.trim() || "Empresa principal",
        tax_id: null
      })
      .select("id")
      .single();
    if (error) throw error;
    return (data as { id: string }).id;
  }

  async userHasProfileInCompany(tenantId: string, companyId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from("tenant_user_profiles")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }

  /** Utilizador com qualquer perfil no tenant (para vincular preposto a mais de um projeto). */
  async userBelongsToTenant(tenantId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from("user_tenant_roles")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .limit(1);
    if (error) throw error;
    return (data ?? []).length > 0;
  }

  async setPrepostoUserId(tenantId: string, companyId: string, prepostoUserId: string | null): Promise<TenantCompanyRow> {
    const { data, error } = await this.db
      .from("tenant_companies")
      .update({ preposto_user_id: prepostoUserId })
      .eq("tenant_id", tenantId)
      .eq("id", companyId)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("TENANT_COMPANY_NOT_FOUND");
    return data as TenantCompanyRow;
  }

  async countPrepostoAssignmentsForUser(tenantId: string, userId: string): Promise<number> {
    const { count, error } = await this.db
      .from("tenant_companies")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("preposto_user_id", userId);
    if (error) throw error;
    return count ?? 0;
  }

  async upsertPrepostoRole(tenantId: string, userId: string): Promise<void> {
    const { error } = await this.db.from("user_tenant_roles").upsert(
      {
        tenant_id: tenantId,
        user_id: userId,
        role: "preposto",
        is_active: true
      },
      { onConflict: "tenant_id,user_id,role" }
    );
    if (error) throw error;
  }

  async deletePrepostoRole(tenantId: string, userId: string): Promise<void> {
    const { error } = await this.db
      .from("user_tenant_roles")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .eq("role", "preposto");
    if (error) throw error;
  }
}
