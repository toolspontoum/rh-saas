import type { SupabaseClient } from "@supabase/supabase-js";

type BatchRow = {
  id: string;
  tenant_id: string;
  company_id: string | null;
  created_by_user_id: string;
  created_at: string;
  expected_doc_count: number;
  processed_ok: number;
  prereg_created: number;
  error_count: number;
};

type PreregRow = {
  id: string;
  tenant_id: string;
  company_id: string | null;
  batch_id: string | null;
  created_by_user_id: string;
  source_file_name: string;
  source_mime_type: string | null;
  status: string;
  payload: Record<string, unknown>;
  result_user_id: string | null;
  created_at: string;
  updated_at: string;
};

type BatchFileRow = {
  id: string;
  batch_id: string;
  file_name: string;
  processed_at: string;
  status: string;
  error_message: string | null;
  created_preregistration_ids: string[];
};

export class EmployeePreregRepository {
  constructor(private readonly db: SupabaseClient) {}

  async insertBatch(input: {
    tenantId: string;
    companyId: string | null;
    createdByUserId: string;
    expectedDocCount: number;
  }): Promise<string> {
    const { data, error } = await this.db
      .from("tenant_employee_import_batches")
      .insert({
        tenant_id: input.tenantId,
        company_id: input.companyId,
        created_by_user_id: input.createdByUserId,
        expected_doc_count: input.expectedDocCount
      })
      .select("id")
      .single();
    if (error) throw error;
    return (data as { id: string }).id;
  }

  async getBatch(tenantId: string, batchId: string): Promise<BatchRow | null> {
    const { data, error } = await this.db
      .from("tenant_employee_import_batches")
      .select("*")
      .eq("id", batchId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error) throw error;
    return data as BatchRow | null;
  }

  async incrementBatchCounters(
    batchId: string,
    delta: { processedOk?: number; preregCreated?: number; errors?: number }
  ): Promise<void> {
    const batch = await this.db.from("tenant_employee_import_batches").select("*").eq("id", batchId).single();
    if (batch.error) throw batch.error;
    const row = batch.data as BatchRow;
    const { error } = await this.db
      .from("tenant_employee_import_batches")
      .update({
        processed_ok: row.processed_ok + (delta.processedOk ?? 0),
        prereg_created: row.prereg_created + (delta.preregCreated ?? 0),
        error_count: row.error_count + (delta.errors ?? 0)
      })
      .eq("id", batchId);
    if (error) throw error;
  }

  async insertPrereg(input: {
    tenantId: string;
    companyId: string | null;
    batchId: string | null;
    createdByUserId: string;
    sourceFileName: string;
    sourceMimeType: string | null;
    payload: Record<string, unknown>;
  }): Promise<string> {
    const { data, error } = await this.db
      .from("tenant_employee_preregistrations")
      .insert({
        tenant_id: input.tenantId,
        company_id: input.companyId,
        batch_id: input.batchId,
        created_by_user_id: input.createdByUserId,
        source_file_name: input.sourceFileName,
        source_mime_type: input.sourceMimeType,
        status: "pending",
        payload: input.payload
      })
      .select("id")
      .single();
    if (error) throw error;
    return (data as { id: string }).id;
  }

  async insertBatchFile(input: {
    batchId: string;
    fileName: string;
    status: "ok" | "error";
    errorMessage: string | null;
    createdPreregistrationIds: string[];
  }): Promise<void> {
    const { error } = await this.db.from("tenant_employee_import_batch_files").insert({
      batch_id: input.batchId,
      file_name: input.fileName,
      status: input.status,
      error_message: input.errorMessage,
      created_preregistration_ids: input.createdPreregistrationIds
    });
    if (error) throw error;
  }

  async listPreregs(input: {
    tenantId: string;
    companyId: string | null | undefined;
    status: string;
  }): Promise<PreregRow[]> {
    let q = this.db
      .from("tenant_employee_preregistrations")
      .select("*")
      .eq("tenant_id", input.tenantId)
      .eq("status", input.status)
      .order("created_at", { ascending: false })
      .limit(200);
    if (input.companyId) {
      q = q.eq("company_id", input.companyId);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data as PreregRow[]) ?? [];
  }

  async getPreregById(tenantId: string, preregId: string): Promise<PreregRow | null> {
    const { data, error } = await this.db
      .from("tenant_employee_preregistrations")
      .select("*")
      .eq("id", preregId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error) throw error;
    return data as PreregRow | null;
  }

  async updatePreregPayload(tenantId: string, preregId: string, payload: Record<string, unknown>): Promise<void> {
    const { data, error } = await this.db
      .from("tenant_employee_preregistrations")
      .update({ payload })
      .eq("id", preregId)
      .eq("tenant_id", tenantId)
      .eq("status", "pending")
      .select("id");
    if (error) throw error;
    if (!data?.length) throw new Error("EMPLOYEE_PREREG_NOT_FOUND");
  }

  async markPreregConfirmed(tenantId: string, preregId: string, resultUserId: string): Promise<void> {
    const { data, error } = await this.db
      .from("tenant_employee_preregistrations")
      .update({
        status: "confirmed",
        result_user_id: resultUserId
      })
      .eq("id", preregId)
      .eq("tenant_id", tenantId)
      .eq("status", "pending")
      .select("id");
    if (error) throw error;
    if (!data?.length) throw new Error("EMPLOYEE_PREREG_WRONG_STATUS");
  }

  async deletePrereg(tenantId: string, preregId: string): Promise<void> {
    const { error } = await this.db
      .from("tenant_employee_preregistrations")
      .delete()
      .eq("id", preregId)
      .eq("tenant_id", tenantId)
      .eq("status", "pending");
    if (error) throw error;
  }

  async listBatches(tenantId: string, companyId: string | null | undefined, limit: number): Promise<BatchRow[]> {
    let q = this.db
      .from("tenant_employee_import_batches")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (companyId) {
      q = q.eq("company_id", companyId);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data as BatchRow[]) ?? [];
  }

  async listBatchFiles(batchId: string): Promise<BatchFileRow[]> {
    const { data, error } = await this.db
      .from("tenant_employee_import_batch_files")
      .select("*")
      .eq("batch_id", batchId)
      .order("processed_at", { ascending: true });
    if (error) throw error;
    return (data as BatchFileRow[]) ?? [];
  }

  async hasEmployeeRole(tenantId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from("user_tenant_roles")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .eq("role", "employee")
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }
}
