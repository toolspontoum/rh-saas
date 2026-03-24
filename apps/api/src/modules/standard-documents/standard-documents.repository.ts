import type { SupabaseClient } from "@supabase/supabase-js";

import type { PlatformDocumentType, TenantDocumentTypeRow } from "./standard-documents.types.js";

type PlatformRow = {
  id: string;
  doc_class: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type SettingRow = {
  tenant_id: string;
  platform_document_type_id: string;
  is_enabled: boolean;
  required_for_hire: boolean;
  required_for_recruitment: boolean;
  updated_at: string;
};

function mapPlatform(row: PlatformRow): PlatformDocumentType {
  return {
    id: row.id,
    docClass: row.doc_class,
    label: row.label,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class StandardDocumentsRepository {
  constructor(private readonly db: SupabaseClient) {}

  async listActivePlatformTypes(): Promise<PlatformDocumentType[]> {
    const { data, error } = await this.db
      .from("platform_document_types")
      .select("*")
      .eq("is_active", true)
      .order("doc_class", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as PlatformRow[]).map(mapPlatform);
  }

  async listAllPlatformTypesForAdmin(): Promise<PlatformDocumentType[]> {
    const { data, error } = await this.db
      .from("platform_document_types")
      .select("*")
      .order("doc_class", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as PlatformRow[]).map(mapPlatform);
  }

  async insertPlatformType(input: {
    docClass: string;
    label: string;
    sortOrder?: number;
  }): Promise<PlatformDocumentType> {
    const { data, error } = await this.db
      .from("platform_document_types")
      .insert({
        doc_class: input.docClass,
        label: input.label.trim(),
        sort_order: input.sortOrder ?? 100,
        is_active: true
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapPlatform(data as PlatformRow);
  }

  async updatePlatformType(input: {
    id: string;
    label?: string;
    sortOrder?: number;
    isActive?: boolean;
  }): Promise<PlatformDocumentType> {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof input.label !== "undefined") patch.label = input.label.trim();
    if (typeof input.sortOrder !== "undefined") patch.sort_order = input.sortOrder;
    if (typeof input.isActive !== "undefined") patch.is_active = input.isActive;

    const { data, error } = await this.db
      .from("platform_document_types")
      .update(patch)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw error;
    return mapPlatform(data as PlatformRow);
  }

  async listTenantMerged(tenantId: string): Promise<TenantDocumentTypeRow[]> {
    const { data: platformData, error: pError } = await this.db
      .from("platform_document_types")
      .select("*")
      .eq("is_active", true)
      .order("doc_class", { ascending: true })
      .order("sort_order", { ascending: true });
    if (pError) throw pError;

    const { data: settingsData, error: sError } = await this.db
      .from("tenant_document_type_settings")
      .select("*")
      .eq("tenant_id", tenantId);
    if (sError) throw sError;

    const settingsById = new Map<string, SettingRow>();
    for (const row of (settingsData ?? []) as SettingRow[]) {
      settingsById.set(row.platform_document_type_id, row);
    }

    return ((platformData ?? []) as PlatformRow[]).map((row) => {
      const s = settingsById.get(row.id);
      return {
        ...mapPlatform(row),
        isEnabled: s?.is_enabled ?? true,
        requiredForHire: s?.required_for_hire ?? false,
        requiredForRecruitment: s?.required_for_recruitment ?? false
      };
    });
  }

  async upsertTenantSettings(
    tenantId: string,
    items: Array<{
      platformDocumentTypeId: string;
      isEnabled: boolean;
      requiredForHire: boolean;
      requiredForRecruitment: boolean;
    }>
  ): Promise<void> {
    if (items.length === 0) return;
    const now = new Date().toISOString();
    const payload = items.map((item) => ({
      tenant_id: tenantId,
      platform_document_type_id: item.platformDocumentTypeId,
      is_enabled: item.isEnabled,
      required_for_hire: item.requiredForHire,
      required_for_recruitment: item.requiredForRecruitment,
      updated_at: now
    }));
    const { error } = await this.db.from("tenant_document_type_settings").upsert(payload, {
      onConflict: "tenant_id,platform_document_type_id"
    });
    if (error) throw error;
  }

  async getRecruitmentAutoRequirements(tenantId: string): Promise<Array<{ id: string; docClass: string; label: string }>> {
    const merged = await this.listTenantMerged(tenantId);
    return merged
      .filter((row) => row.isEnabled && row.requiredForRecruitment)
      .map((row) => ({ id: row.id, docClass: row.docClass, label: row.label }));
  }

  async getHireAutoRequirements(tenantId: string): Promise<Array<{ id: string; docClass: string; label: string }>> {
    const merged = await this.listTenantMerged(tenantId);
    return merged
      .filter((row) => row.isEnabled && row.requiredForHire)
      .map((row) => ({ id: row.id, docClass: row.docClass, label: row.label }));
  }
}
