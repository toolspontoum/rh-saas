import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchDefaultTenantCompanyId } from "../../lib/tenant-company-default.js";

import type {
  DocumentRecord,
  DocumentRequestRecord,
  PaginatedResult,
  PayslipBatchListItem,
  PayslipBatchMeta,
  PayslipRecord
} from "./documents-payslips.types.js";

type DocumentRow = {
  id: string;
  tenant_id: string;
  collaborator_name: string;
  collaborator_email: string;
  contract: string | null;
  title: string;
  description: string | null;
  category: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string | null;
  employee_user_id: string | null;
  request_id: string | null;
  doc_tab: string | null;
  doc_type: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
};

type DocumentRequestRow = {
  id: string;
  tenant_id: string;
  collaborator_name: string;
  collaborator_email: string;
  contract: string | null;
  title: string;
  details: string | null;
  status: "open" | "in_progress" | "completed" | "canceled";
  workflow?: string | null;
  requested_by: string | null;
  requested_at: string;
  resolved_at: string | null;
  employee_user_id: string | null;
  doc_tab: string;
  doc_type: string;
  created_at: string;
  updated_at: string;
  documents?: DocumentRow[] | null;
};

type PayslipRow = {
  id: string;
  tenant_id: string;
  batch_id: string | null;
  collaborator_name: string;
  collaborator_email: string;
  contract: string | null;
  reference_month: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string | null;
  employee_user_id: string | null;
  acknowledged_at: string | null;
  acknowledged_by_user_id: string | null;
  ai_link_status: string | null;
  ai_link_error: string | null;
  extracted_cpf: string | null;
  ai_processed_at: string | null;
  created_at: string;
  updated_at: string;
};

type PayslipBatchRow = {
  id: string;
  tenant_id: string;
  title: string | null;
  reference_month: string;
  source_type: string;
  created_by: string | null;
  created_at: string;
};

function withCompany<T extends { eq: (col: string, val: string) => T }>(
  query: T,
  companyId: string | null | undefined
): T {
  return companyId ? query.eq("company_id", companyId) : query;
}

async function resolveDocCompany(
  db: SupabaseClient,
  tenantId: string,
  companyId?: string | null
): Promise<string> {
  return companyId ?? (await fetchDefaultTenantCompanyId(db, tenantId));
}

function mapDocument(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    collaboratorName: row.collaborator_name,
    collaboratorEmail: row.collaborator_email,
    contract: row.contract,
    title: row.title,
    description: row.description,
    category: row.category,
    fileName: row.file_name,
    filePath: row.file_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    uploadedBy: row.uploaded_by,
    employeeUserId: row.employee_user_id,
    requestId: row.request_id,
    docTab: row.doc_tab,
    docType: row.doc_type,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function pickLatestDocumentForRequest(docs: DocumentRecord[]): DocumentRecord | null {
  if (docs.length === 0) return null;
  const fromEmployee = docs.filter((d) => d.source === "employee_upload");
  const pool = fromEmployee.length > 0 ? fromEmployee : docs;
  return [...pool].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
}

function inferRequestWorkflow(row: DocumentRequestRow, docs: DocumentRecord[]): "standard" | "signature" {
  if (row.workflow === "signature") return "signature";
  return docs.some((d) => d.source === "signature_template") ? "signature" : "standard";
}

function mapDocumentRequest(row: DocumentRequestRow): DocumentRequestRecord {
  const docs = (row.documents ?? []).map(mapDocument);
  const latestDocument = pickLatestDocumentForRequest(docs);
  const workflow = inferRequestWorkflow(row, docs);
  return {
    id: row.id,
    tenantId: row.tenant_id,
    collaboratorName: row.collaborator_name,
    collaboratorEmail: row.collaborator_email,
    contract: row.contract,
    title: row.title,
    description: row.details,
    status: row.status,
    workflow,
    requestedBy: row.requested_by,
    requestedAt: row.requested_at,
    resolvedAt: row.resolved_at,
    employeeUserId: row.employee_user_id,
    docTab: row.doc_tab,
    docType: row.doc_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    latestDocument
  };
}

function mapPayslip(row: PayslipRow): PayslipRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    batchId: row.batch_id,
    collaboratorName: row.collaborator_name,
    collaboratorEmail: row.collaborator_email,
    contract: row.contract,
    referenceMonth: row.reference_month,
    fileName: row.file_name,
    filePath: row.file_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    uploadedBy: row.uploaded_by,
    employeeUserId: row.employee_user_id,
    acknowledgedAt: row.acknowledged_at,
    acknowledgedByUserId: row.acknowledged_by_user_id,
    aiLinkStatus: row.ai_link_status ?? null,
    aiLinkError: row.ai_link_error ?? null,
    extractedCpf: row.extracted_cpf ?? null,
    aiProcessedAt: row.ai_processed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPayslipBatchMeta(row: PayslipBatchRow): PayslipBatchMeta {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title ?? null,
    referenceMonth: row.reference_month,
    sourceType: row.source_type,
    createdAt: row.created_at,
    createdBy: row.created_by
  };
}

export class DocumentsPayslipsRepository {
  constructor(private readonly db: SupabaseClient) {}

  async getTenantUserCompanyId(tenantId: string, userId: string): Promise<string | null> {
    const { data, error } = await this.db
      .from("tenant_user_profiles")
      .select("company_id")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data as { company_id: string } | null)?.company_id ?? null;
  }

  private async mapRequestsWithLatestDocuments(
    tenantId: string,
    rows: DocumentRequestRow[],
    companyId?: string | null
  ): Promise<DocumentRequestRecord[]> {
    if (rows.length === 0) return [];
    const requestIds = rows.map((row) => row.id);

    let docsQuery = this.db
      .from("documents")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("request_id", requestIds)
      .order("created_at", { ascending: false });
    docsQuery = withCompany(docsQuery, companyId);
    const { data: docsData, error: docsError } = await docsQuery;
    if (docsError) throw docsError;

    const docsByRequestId = new Map<string, DocumentRow[]>();
    for (const doc of (docsData ?? []) as DocumentRow[]) {
      if (!doc.request_id) continue;
      const list = docsByRequestId.get(doc.request_id) ?? [];
      list.push(doc);
      docsByRequestId.set(doc.request_id, list);
    }

    return rows.map((row) => {
      const docs = docsByRequestId.get(row.id) ?? [];
      return mapDocumentRequest({
        ...row,
        documents: docs
      });
    });
  }

  async findDocumentById(input: {
    tenantId: string;
    documentId: string;
    companyId?: string | null;
  }): Promise<DocumentRecord | null> {
    const { data, error } = await withCompany(
      this.db
        .from("documents")
        .select("*")
        .eq("tenant_id", input.tenantId)
        .eq("id", input.documentId),
      input.companyId
    ).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapDocument(data as DocumentRow);
  }

  async createDocument(input: {
    tenantId: string;
    companyId?: string | null;
    userId: string;
    collaboratorName: string;
    collaboratorEmail: string;
    contract?: string | null;
    title: string;
    description?: string | null;
    category: string;
    fileName: string;
    filePath: string;
    mimeType: string;
    sizeBytes: number;
    employeeUserId?: string | null;
    requestId?: string | null;
    docTab?: string | null;
    docType?: string | null;
    source?: string | null;
  }): Promise<DocumentRecord> {
    const companyId = await resolveDocCompany(this.db, input.tenantId, input.companyId);
    const { data, error } = await this.db
      .from("documents")
      .insert({
        tenant_id: input.tenantId,
        company_id: companyId,
        collaborator_name: input.collaboratorName,
        collaborator_email: input.collaboratorEmail.toLowerCase(),
        contract: input.contract ?? null,
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        file_name: input.fileName,
        file_path: input.filePath,
        mime_type: input.mimeType,
        size_bytes: input.sizeBytes,
        uploaded_by: input.userId,
        employee_user_id: input.employeeUserId ?? null,
        request_id: input.requestId ?? null,
        doc_tab: input.docTab ?? null,
        doc_type: input.docType ?? null,
        source: input.source ?? null
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapDocument(data as DocumentRow);
  }

  async listDocuments(input: {
    tenantId: string;
    companyId?: string | null;
    contract?: string;
    collaboratorName?: string;
    employeeUserId?: string;
    docTab?: string;
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<DocumentRecord>> {
    let query = withCompany(
      this.db.from("documents").select("*").eq("tenant_id", input.tenantId),
      input.companyId
    ).order("created_at", { ascending: false });

    if (input.contract) query = query.eq("contract", input.contract);
    if (input.collaboratorName) query = query.ilike("collaborator_name", `%${input.collaboratorName}%`);
    if (input.employeeUserId) query = query.eq("employee_user_id", input.employeeUserId);
    if (input.docTab) query = query.eq("doc_tab", input.docTab);

    const offset = (input.page - 1) * input.pageSize;
    const { data, error } = await query.range(offset, offset + input.pageSize - 1);
    if (error) throw error;
    return {
      items: ((data ?? []) as DocumentRow[]).map(mapDocument),
      page: input.page,
      pageSize: input.pageSize
    };
  }

  async createPayslip(input: {
    tenantId: string;
    companyId?: string | null;
    userId: string;
    collaboratorName: string;
    collaboratorEmail: string;
    contract?: string | null;
    referenceMonth: string;
    fileName: string;
    filePath: string;
    mimeType: string;
    sizeBytes: number;
    employeeUserId?: string | null;
  }): Promise<PayslipRecord> {
    const companyId = await resolveDocCompany(this.db, input.tenantId, input.companyId);
    const { data, error } = await this.db
      .from("payslips")
      .insert({
        tenant_id: input.tenantId,
        company_id: companyId,
        collaborator_name: input.collaboratorName,
        collaborator_email: input.collaboratorEmail.toLowerCase(),
        contract: input.contract ?? null,
        reference_month: input.referenceMonth,
        file_name: input.fileName,
        file_path: input.filePath,
        mime_type: input.mimeType,
        size_bytes: input.sizeBytes,
        uploaded_by: input.userId,
        employee_user_id: input.employeeUserId ?? null
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapPayslip(data as PayslipRow);
  }

  async listPayslips(input: {
    tenantId: string;
    companyId?: string | null;
    contract?: string;
    collaboratorName?: string;
    collaboratorEmail?: string;
    collaboratorCpf?: string;
    referenceMonth?: string;
    employeeUserId?: string;
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<PayslipRecord>> {
    let query = withCompany(
      this.db.from("payslips").select("*").eq("tenant_id", input.tenantId),
      input.companyId
    ).order("created_at", { ascending: false });

    if (input.contract) query = query.eq("contract", input.contract);
    if (input.collaboratorName) query = query.ilike("collaborator_name", `%${input.collaboratorName}%`);
    if (input.collaboratorEmail?.trim()) {
      query = query.ilike("collaborator_email", `%${input.collaboratorEmail.trim().toLowerCase()}%`);
    }
    if (input.collaboratorCpf?.trim()) {
      const digits = input.collaboratorCpf.replace(/\D/g, "");
      if (digits.length >= 4) {
        query = query.or(
          `collaborator_name.ilike.%${digits}%,collaborator_email.ilike.%${digits}%`
        );
      }
    }
    if (input.referenceMonth) query = query.eq("reference_month", input.referenceMonth);
    if (input.employeeUserId) query = query.eq("employee_user_id", input.employeeUserId);

    const offset = (input.page - 1) * input.pageSize;
    const { data, error } = await query.range(offset, offset + input.pageSize - 1);
    if (error) throw error;
    return {
      items: ((data ?? []) as PayslipRow[]).map(mapPayslip),
      page: input.page,
      pageSize: input.pageSize
    };
  }

  async findPayslipById(input: {
    tenantId: string;
    payslipId: string;
    companyId?: string | null;
  }): Promise<PayslipRecord | null> {
    const { data, error } = await withCompany(
      this.db
        .from("payslips")
        .select("*")
        .eq("tenant_id", input.tenantId)
        .eq("id", input.payslipId),
      input.companyId
    ).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapPayslip(data as PayslipRow);
  }

  async createPayslipBatch(input: {
    tenantId: string;
    companyId?: string | null;
    createdBy: string;
    contract?: string | null;
    referenceMonth: string;
    sourceType: string;
    title?: string | null;
  }): Promise<{ id: string }> {
    const companyId = await resolveDocCompany(this.db, input.tenantId, input.companyId);
    const title = input.title?.trim() ? input.title.trim().slice(0, 200) : null;
    const { data, error } = await this.db
      .from("payslip_batches")
      .insert({
        tenant_id: input.tenantId,
        company_id: companyId,
        contract: input.contract ?? null,
        reference_month: input.referenceMonth,
        source_type: input.sourceType,
        created_by: input.createdBy,
        title
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: (data as { id: string }).id };
  }

  async createPayslipsInBatch(input: {
    tenantId: string;
    companyId?: string | null;
    userId: string;
    batchId: string;
    referenceMonth: string;
    rows: Array<{
      collaboratorName: string;
      collaboratorEmail: string;
      contract?: string | null;
      fileName: string;
      filePath: string;
      sizeBytes: number;
    }>;
  }): Promise<number> {
    const companyId = await resolveDocCompany(this.db, input.tenantId, input.companyId);
    const payload = input.rows.map((row) => ({
      tenant_id: input.tenantId,
      company_id: companyId,
      batch_id: input.batchId,
      collaborator_name: row.collaboratorName,
      collaborator_email: row.collaboratorEmail.toLowerCase(),
      contract: row.contract ?? null,
      reference_month: input.referenceMonth,
      file_name: row.fileName,
      file_path: row.filePath,
      mime_type: "application/pdf",
      size_bytes: row.sizeBytes,
      uploaded_by: input.userId
    }));

    const { error } = await this.db.from("payslips").insert(payload);
    if (error) throw error;
    return payload.length;
  }

  async findEmployeeUserIdByEmail(tenantId: string, email: string): Promise<string | null> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;

    const { data: tenantProfileData, error: tenantProfileError } = await this.db
      .from("tenant_user_profiles")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("personal_email", normalized)
      .maybeSingle();
    if (tenantProfileError) throw tenantProfileError;
    if (tenantProfileData?.user_id) return (tenantProfileData as { user_id: string }).user_id;

    const { data: candidateProfileData, error: candidateProfileError } = await this.db
      .from("candidate_profiles")
      .select("user_id")
      .eq("email", normalized)
      .limit(1)
      .maybeSingle();
    if (candidateProfileError) throw candidateProfileError;
    if (candidateProfileData?.user_id) return (candidateProfileData as { user_id: string }).user_id;

    const { data: candidateData, error: candidateError } = await this.db
      .from("candidates")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("email", normalized)
      .not("user_id", "is", null)
      .limit(1)
      .maybeSingle();
    if (candidateError) throw candidateError;
    if (candidateData?.user_id) return (candidateData as { user_id: string }).user_id;

    let page = 1;
    const perPage = 200;
    while (page <= 50) {
      const { data, error } = await this.db.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const users = data.users ?? [];
      const found = users.find((user) => (user.email ?? "").toLowerCase() === normalized);
      if (found?.id) return found.id;
      if (users.length < perPage) break;
      page += 1;
    }

    return null;
  }

  async createDocumentRequest(input: {
    tenantId: string;
    companyId?: string | null;
    collaboratorName: string;
    collaboratorEmail: string;
    contract?: string | null;
    title: string;
    description?: string | null;
    requestedBy: string;
    employeeUserId?: string | null;
    docTab: string;
    docType: string;
  }): Promise<DocumentRequestRecord> {
    const companyId = await resolveDocCompany(this.db, input.tenantId, input.companyId);
    // workflow não é persistido em coluna dedicada: inferido via documents.source === "signature_template"
    const { data, error } = await this.db
      .from("document_requests")
      .insert({
        tenant_id: input.tenantId,
        company_id: companyId,
        collaborator_name: input.collaboratorName,
        collaborator_email: input.collaboratorEmail.toLowerCase(),
        contract: input.contract ?? null,
        title: input.title,
        details: input.description ?? null,
        requested_by: input.requestedBy,
        employee_user_id: input.employeeUserId ?? null,
        doc_tab: input.docTab,
        doc_type: input.docType
      })
      .select("*")
      .single();
    if (error) throw error;
    const [mapped] = await this.mapRequestsWithLatestDocuments(input.tenantId, [data as DocumentRequestRow], companyId);
    if (!mapped) throw new Error("DOCUMENT_REQUEST_MAPPING_FAILED");
    return mapped;
  }

  async findDocumentRequestById(input: {
    tenantId: string;
    requestId: string;
    companyId?: string | null;
  }): Promise<DocumentRequestRecord | null> {
    const { data, error } = await withCompany(
      this.db
        .from("document_requests")
        .select("*")
        .eq("tenant_id", input.tenantId)
        .eq("id", input.requestId),
      input.companyId
    ).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const [mapped] = await this.mapRequestsWithLatestDocuments(
      input.tenantId,
      [data as DocumentRequestRow],
      input.companyId
    );
    return mapped ?? null;
  }

  async listDocumentRequests(input: {
    tenantId: string;
    companyId?: string | null;
    collaboratorName?: string;
    employeeUserId?: string;
    docTab?: string;
    status?: "open" | "in_progress" | "completed" | "canceled";
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<DocumentRequestRecord>> {
    let query = withCompany(
      this.db.from("document_requests").select("*").eq("tenant_id", input.tenantId),
      input.companyId
    ).order("created_at", { ascending: false });

    if (input.collaboratorName) query = query.ilike("collaborator_name", `%${input.collaboratorName}%`);
    if (input.employeeUserId) query = query.eq("employee_user_id", input.employeeUserId);
    if (input.docTab) query = query.eq("doc_tab", input.docTab);
    if (input.status) query = query.eq("status", input.status);

    const offset = (input.page - 1) * input.pageSize;
    const { data, error } = await query.range(offset, offset + input.pageSize - 1);
    if (error) throw error;
    const mappedItems = await this.mapRequestsWithLatestDocuments(
      input.tenantId,
      (data ?? []) as DocumentRequestRow[],
      input.companyId
    );
    return {
      items: mappedItems,
      page: input.page,
      pageSize: input.pageSize
    };
  }

  async updateDocumentRequestStatus(input: {
    tenantId: string;
    requestId: string;
    companyId?: string | null;
    status: "open" | "in_progress" | "completed" | "canceled";
    resolvedAt?: string | null;
  }): Promise<DocumentRequestRecord> {
    const resolvedAt =
      input.status === "completed"
        ? (input.resolvedAt ?? new Date().toISOString())
        : input.status === "open" || input.status === "in_progress"
          ? null
          : input.resolvedAt ?? null;
    let updateQuery = this.db
      .from("document_requests")
      .update({
        status: input.status,
        resolved_at: resolvedAt
      })
      .eq("tenant_id", input.tenantId)
      .eq("id", input.requestId);
    if (input.companyId) updateQuery = updateQuery.eq("company_id", input.companyId);
    const { data, error } = await updateQuery.select("*").single();
    if (error) throw error;
    const [mapped] = await this.mapRequestsWithLatestDocuments(
      input.tenantId,
      [data as DocumentRequestRow],
      input.companyId
    );
    if (!mapped) throw new Error("DOCUMENT_REQUEST_MAPPING_FAILED");
    return mapped;
  }

  async markDocumentRequestCompleted(input: {
    tenantId: string;
    requestId: string;
    companyId?: string | null;
  }): Promise<DocumentRequestRecord> {
    return this.updateDocumentRequestStatus({
      tenantId: input.tenantId,
      requestId: input.requestId,
      companyId: input.companyId,
      status: "completed"
    });
  }

  async acknowledgePayslip(input: {
    tenantId: string;
    userId: string;
    payslipId: string;
    companyId?: string | null;
  }): Promise<PayslipRecord> {
    let q = this.db
      .from("payslips")
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by_user_id: input.userId
      })
      .eq("tenant_id", input.tenantId)
      .eq("id", input.payslipId)
      .or(`employee_user_id.eq.${input.userId},uploaded_by.eq.${input.userId}`);
    if (input.companyId) q = q.eq("company_id", input.companyId);
    const { data, error } = await q.select("*").single();
    if (error) throw error;
    return mapPayslip(data as PayslipRow);
  }

  async updatePayslipReferenceMonth(input: {
    tenantId: string;
    payslipId: string;
    referenceMonth: string;
    companyId?: string | null;
  }): Promise<PayslipRecord> {
    let q = this.db
      .from("payslips")
      .update({
        reference_month: input.referenceMonth
      })
      .eq("tenant_id", input.tenantId)
      .eq("id", input.payslipId);
    if (input.companyId) q = q.eq("company_id", input.companyId);
    const { data, error } = await q.select("*").single();
    if (error) throw error;
    return mapPayslip(data as PayslipRow);
  }

  async findNextQueuedPayslipForAi(): Promise<{ id: string; tenantId: string } | null> {
    const { data, error } = await this.db
      .from("payslips")
      .select("id, tenant_id")
      .eq("ai_link_status", "queued")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as { id: string; tenant_id: string };
    return { id: row.id, tenantId: row.tenant_id };
  }

  async findEmployeeContextByCpf(
    tenantId: string,
    companyId: string,
    digits: string
  ): Promise<{
    userId: string;
    fullName: string | null;
    personalEmail: string | null;
    authEmail: string | null;
  } | null> {
    const { data, error } = await this.db
      .from("tenant_user_profiles")
      .select("user_id, full_name, cpf, personal_email")
      .eq("tenant_id", tenantId)
      .eq("company_id", companyId)
      .not("cpf", "is", null);
    if (error) throw error;
    const row = (data ?? []).find(
      (r) => String((r as { cpf: string | null }).cpf ?? "").replace(/\D/g, "") === digits
    ) as { user_id: string; full_name: string | null; personal_email: string | null } | undefined;
    if (!row?.user_id) return null;
    const { data: authData, error: authError } = await this.db.auth.admin.getUserById(row.user_id);
    if (authError) throw authError;
    return {
      userId: row.user_id,
      fullName: row.full_name,
      personalEmail: row.personal_email,
      authEmail: authData.user?.email ?? null
    };
  }

  async updatePayslipAiLinkResult(input: {
    tenantId: string;
    payslipId: string;
    aiLinkStatus: string;
    aiLinkError: string | null;
    extractedCpf: string | null;
  }): Promise<void> {
    const { error } = await this.db
      .from("payslips")
      .update({
        ai_link_status: input.aiLinkStatus,
        ai_link_error: input.aiLinkError,
        extracted_cpf: input.extractedCpf,
        ai_processed_at: new Date().toISOString()
      })
      .eq("tenant_id", input.tenantId)
      .eq("id", input.payslipId);
    if (error) throw error;
  }

  async updatePayslipLinkedEmployee(input: {
    tenantId: string;
    payslipId: string;
    employeeUserId: string;
    collaboratorName: string;
    collaboratorEmail: string;
    extractedCpf: string;
  }): Promise<void> {
    const { error } = await this.db
      .from("payslips")
      .update({
        employee_user_id: input.employeeUserId,
        collaborator_name: input.collaboratorName,
        collaborator_email: input.collaboratorEmail.toLowerCase(),
        extracted_cpf: input.extractedCpf,
        ai_link_status: "linked",
        ai_link_error: null,
        ai_processed_at: new Date().toISOString()
      })
      .eq("tenant_id", input.tenantId)
      .eq("id", input.payslipId);
    if (error) throw error;
  }

  async insertAiQueuedPayslips(input: {
    tenantId: string;
    companyId?: string | null;
    batchId: string;
    referenceMonth: string;
    userId: string;
    rows: Array<{ fileName: string; filePath: string; sizeBytes: number }>;
  }): Promise<number> {
    const companyId = await resolveDocCompany(this.db, input.tenantId, input.companyId);
    const payload = input.rows.map((row) => ({
      tenant_id: input.tenantId,
      company_id: companyId,
      batch_id: input.batchId,
      collaborator_name: "Fila IA",
      collaborator_email: `ia-queue-${randomUUID()}@invalid.local`,
      contract: null,
      reference_month: input.referenceMonth,
      file_name: row.fileName,
      file_path: row.filePath,
      mime_type: "application/pdf",
      size_bytes: row.sizeBytes,
      uploaded_by: input.userId,
      employee_user_id: null,
      ai_link_status: "queued",
      ai_link_error: null,
      extracted_cpf: null
    }));
    const { error } = await this.db.from("payslips").insert(payload);
    if (error) throw error;
    return payload.length;
  }

  async listPayslipAiBatches(input: {
    tenantId: string;
    companyId?: string | null;
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<PayslipBatchListItem>> {
    let query = this.db
      .from("payslip_batches")
      .select("id, tenant_id, title, reference_month, source_type, created_at, created_by")
      .eq("tenant_id", input.tenantId)
      .eq("source_type", "ai_pdf_bulk");
    if (input.companyId) query = query.eq("company_id", input.companyId);
    query = query.order("created_at", { ascending: false });

    const offset = (input.page - 1) * input.pageSize;
    const { data, error } = await query.range(offset, offset + input.pageSize - 1);
    if (error) throw error;
    const rows = (data ?? []) as PayslipBatchRow[];
    if (rows.length === 0) {
      return { items: [], page: input.page, pageSize: input.pageSize };
    }
    const batchIds = rows.map((r) => r.id);
    let countQuery = this.db
      .from("payslips")
      .select("batch_id")
      .eq("tenant_id", input.tenantId)
      .in("batch_id", batchIds);
    countQuery = withCompany(countQuery, input.companyId);
    const { data: countRows, error: countErr } = await countQuery;
    if (countErr) throw countErr;
    const byBatch = new Map<string, number>();
    for (const pr of (countRows ?? []) as { batch_id: string | null }[]) {
      if (!pr.batch_id) continue;
      byBatch.set(pr.batch_id, (byBatch.get(pr.batch_id) ?? 0) + 1);
    }
    const items: PayslipBatchListItem[] = rows.map((row) => ({
      ...mapPayslipBatchMeta(row),
      fileCount: byBatch.get(row.id) ?? 0
    }));
    return { items, page: input.page, pageSize: input.pageSize };
  }

  async findPayslipBatchById(input: {
    tenantId: string;
    batchId: string;
    companyId?: string | null;
  }): Promise<PayslipBatchMeta | null> {
    let q = this.db
      .from("payslip_batches")
      .select("id, tenant_id, title, reference_month, source_type, created_at, created_by")
      .eq("tenant_id", input.tenantId)
      .eq("id", input.batchId);
    q = withCompany(q, input.companyId);
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapPayslipBatchMeta(data as PayslipBatchRow);
  }

  async listPayslipsInBatch(input: {
    tenantId: string;
    batchId: string;
    companyId?: string | null;
  }): Promise<PayslipRecord[]> {
    let q = this.db
      .from("payslips")
      .select("*")
      .eq("tenant_id", input.tenantId)
      .eq("batch_id", input.batchId)
      .order("created_at", { ascending: true });
    q = withCompany(q, input.companyId);
    const { data, error } = await q;
    if (error) throw error;
    return ((data ?? []) as PayslipRow[]).map(mapPayslip);
  }
}
