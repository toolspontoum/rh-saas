import type { SupabaseClient } from "@supabase/supabase-js";

/** Primeira empresa do tenant (criada na migracao como padrao). */
export async function fetchDefaultTenantCompanyId(db: SupabaseClient, tenantId: string): Promise<string> {
  const { data, error } = await db
    .from("tenant_companies")
    .select("id")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  const id = (data as { id: string } | null)?.id;
  if (!id) throw new Error("TENANT_DEFAULT_COMPANY_MISSING");
  return id;
}
