import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { env } from "../../config/env.js";
import { fetchDefaultTenantCompanyId } from "../../lib/tenant-company-default.js";
import { CoreAuthTenantService } from "../core-auth-tenant/core-auth-tenant.service.js";
import { DocumentsPayslipsRepository } from "./documents-payslips.repository.js";
import type {
  DocumentRecord,
  DocumentRequestRecord,
  OpenFileUrl,
  PaginatedResult,
  PayslipBatchDetailPayload,
  PayslipBatchListItem,
  PayslipRecord,
  UploadIntent
} from "./documents-payslips.types.js";

export class DocumentsPayslipsService {
  constructor(
    private readonly repository: DocumentsPayslipsRepository,
    private readonly authTenantService: CoreAuthTenantService,
    private readonly storage: SupabaseClient
  ) {}

  /** Mesmo colaborador do pedido (por employee_user_id ou e-mail do pedido ↔ perfil/auth). */
  private async isCollaboratorEmailMatch(
    tenantId: string,
    userId: string,
    collaboratorEmail: string
  ): Promise<boolean> {
    const want = collaboratorEmail.trim().toLowerCase();
    const resolved = await this.repository.findEmployeeUserIdByEmail(tenantId, collaboratorEmail);
    if (resolved === userId) return true;
    const { data: authData, error: authErr } = await this.storage.auth.admin.getUserById(userId);
    if (!authErr && authData.user?.email) {
      const authEmail = authData.user.email.trim().toLowerCase();
      if (authEmail === want) return true;
    }
    return false;
  }

  private async isUserDocumentRequestRecipient(
    tenantId: string,
    userId: string,
    request: DocumentRequestRecord
  ): Promise<boolean> {
    if (request.employeeUserId === userId) return true;
    return this.isCollaboratorEmailMatch(tenantId, userId, request.collaboratorEmail);
  }

  private async userCanAccessOwnDocument(
    tenantId: string,
    userId: string,
    document: DocumentRecord
  ): Promise<boolean> {
    if (document.employeeUserId === userId) return true;
    if (document.uploadedBy === userId) return true;
    return this.isCollaboratorEmailMatch(tenantId, userId, document.collaboratorEmail);
  }

  /** Persiste PDF no storage já validado; uso interno após checagens de permissão (RH ou colaborador respondendo pedido). */
  private async persistDocument(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    collaboratorName: string;
    collaboratorEmail: string;
    contract?: string | null;
    title?: string;
    description?: string | null;
    category: string;
    fileName: string;
    filePath: string;
    mimeType: string;
    sizeBytes: number;
    requestId?: string | null;
    docTab?: string | null;
    docType?: string | null;
    source?: string | null;
  }): Promise<DocumentRecord> {
    validatePdfUpload(input.mimeType, input.sizeBytes);
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_documents");
    const employeeUserId = await this.repository.findEmployeeUserIdByEmail(
      input.tenantId,
      input.collaboratorEmail
    );
    return this.repository.createDocument({
      ...input,
      title: input.title?.trim() || input.category,
      description: input.description ?? null,
      employeeUserId,
      requestId: input.requestId ?? null,
      docTab: input.docTab ?? null,
      docType: input.docType ?? null,
      source: input.source ?? null
    });
  }

  async createDocument(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    collaboratorName: string;
    collaboratorEmail: string;
    contract?: string | null;
    title?: string;
    description?: string | null;
    category: string;
    fileName: string;
    filePath: string;
    mimeType: string;
    sizeBytes: number;
    requestId?: string | null;
    docTab?: string | null;
    docType?: string | null;
    source?: string | null;
  }): Promise<DocumentRecord> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager"
    ]);
    return this.persistDocument(input);
  }

  async listDocuments(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    contract?: string;
    collaboratorName?: string;
    mineOnly?: boolean;
    employeeUserId?: string;
    docTab?: string;
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<DocumentRecord>> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_documents");
    if (input.employeeUserId && input.employeeUserId !== input.userId) {
      await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
        "owner",
        "admin",
        "manager",
        "analyst"
      ]);
    }
    return this.repository.listDocuments({
      ...input,
      employeeUserId: input.mineOnly ? input.userId : input.employeeUserId
    });
  }

  async createDocumentRequest(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    collaboratorName: string;
    collaboratorEmail: string;
    contract?: string | null;
    docTab: string;
    docType: string;
    description?: string | null;
    fileName?: string | null;
    filePath?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
    workflow?: "standard" | "signature";
  }): Promise<DocumentRequestRecord> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_documents");
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager"
    ]);
    const employeeUserId = await this.repository.findEmployeeUserIdByEmail(
      input.tenantId,
      input.collaboratorEmail
    );

    const workflow = input.workflow ?? "standard";

    if (workflow === "signature" && (!input.filePath || !input.fileName || !input.mimeType || input.sizeBytes == null)) {
      throw new Error("SIGNATURE_DOCUMENT_REQUIRES_FILE");
    }

    const request = await this.repository.createDocumentRequest({
      tenantId: input.tenantId,
      companyId: input.companyId,
      collaboratorName: input.collaboratorName,
      collaboratorEmail: input.collaboratorEmail,
      contract: input.contract ?? null,
      title: input.docType,
      description: input.description ?? null,
      requestedBy: input.userId,
      employeeUserId,
      docTab: input.docTab,
      docType: input.docType
    });

    if (input.filePath && input.fileName && input.mimeType && input.sizeBytes != null) {
      validatePdfUpload(input.mimeType, input.sizeBytes);
      ensureTenantScopedPath(input.tenantId, input.filePath, "documents");
      await this.ensureObjectExists(env.STORAGE_BUCKET_DOCUMENTS, input.filePath);

      if (workflow === "signature") {
        await this.createDocument({
          userId: input.userId,
          tenantId: input.tenantId,
          companyId: input.companyId,
          collaboratorName: request.collaboratorName,
          collaboratorEmail: request.collaboratorEmail,
          contract: request.contract ?? null,
          title: input.docType,
          description: input.description ?? null,
          category: input.docTab,
          filePath: input.filePath,
          fileName: input.fileName,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          requestId: request.id,
          docTab: input.docTab,
          docType: input.docType,
          source: "signature_template"
        });
        return this.repository.updateDocumentRequestStatus({
          tenantId: input.tenantId,
          companyId: input.companyId,
          requestId: request.id,
          status: "in_progress"
        });
      }

      await this.createDocument({
        userId: input.userId,
        tenantId: input.tenantId,
        companyId: input.companyId,
        collaboratorName: request.collaboratorName,
        collaboratorEmail: request.collaboratorEmail,
        contract: request.contract ?? null,
        title: input.docType,
        description: input.description ?? null,
        category: input.docTab,
        filePath: input.filePath,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        requestId: request.id,
        docTab: input.docTab,
        docType: input.docType,
        source: "admin_upload"
      });
      return this.repository.markDocumentRequestCompleted({
        tenantId: input.tenantId,
        companyId: input.companyId,
        requestId: request.id
      });
    }

    return request;
  }

  async listDocumentRequests(input: {
    userId: string;
    tenantId: string;
    collaboratorName?: string;
    employeeUserId?: string;
    docTab?: string;
    status?: "open" | "in_progress" | "completed" | "canceled";
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<DocumentRequestRecord>> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_documents");
    const tenantContext = await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    const isManager = tenantContext.roles.some((role) => ["owner", "admin", "manager", "analyst"].includes(role));
    if (!isManager) {
      return this.repository.listDocumentRequests({
        ...input,
        collaboratorName: undefined,
        employeeUserId: input.userId
      });
    }
    return this.repository.listDocumentRequests(input);
  }

  async createRequestResponseUploadIntent(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    requestId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<UploadIntent> {
    validatePdfUpload(input.mimeType, input.sizeBytes);
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_documents");
    const request = await this.repository.findDocumentRequestById({
      tenantId: input.tenantId,
      companyId: input.companyId,
      requestId: input.requestId
    });
    if (!request) {
      throw new Error("DOCUMENT_REQUEST_NOT_FOUND");
    }
    const tenantContext = await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    const isManager = tenantContext.roles.some((role) => ["owner", "admin", "manager", "analyst"].includes(role));
    if (!isManager && !(await this.isUserDocumentRequestRecipient(input.tenantId, input.userId, request))) {
      throw new Error("ROLE_NOT_ALLOWED");
    }

    const fileName = normalizePdfFileName(input.fileName);
    const now = new Date();
    const yyyy = now.getUTCFullYear().toString();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const path = `tenants/${input.tenantId}/documents/${yyyy}/${mm}/${randomUUID()}-${fileName}`;

    const { data, error } = await this.storage.storage
      .from(env.STORAGE_BUCKET_DOCUMENTS)
      .createSignedUploadUrl(path);
    if (error || !data) throw new Error("UPLOAD_INTENT_FAILED");

    return {
      bucket: env.STORAGE_BUCKET_DOCUMENTS,
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
      expiresIn: 7200
    };
  }

  async confirmRequestResponseUpload(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    requestId: string;
    filePath: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    description?: string | null;
  }): Promise<DocumentRequestRecord> {
    validatePdfUpload(input.mimeType, input.sizeBytes);
    ensureTenantScopedPath(input.tenantId, input.filePath, "documents");
    await this.ensureObjectExists(env.STORAGE_BUCKET_DOCUMENTS, input.filePath);
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_documents");

    const request = await this.repository.findDocumentRequestById({
      tenantId: input.tenantId,
      companyId: input.companyId,
      requestId: input.requestId
    });
    if (!request) {
      throw new Error("DOCUMENT_REQUEST_NOT_FOUND");
    }

    const tenantContext = await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    const isManager = tenantContext.roles.some((role) => ["owner", "admin", "manager", "analyst"].includes(role));
    if (!isManager && !(await this.isUserDocumentRequestRecipient(input.tenantId, input.userId, request))) {
      throw new Error("ROLE_NOT_ALLOWED");
    }

    await this.persistDocument({
      userId: input.userId,
      tenantId: input.tenantId,
      companyId: input.companyId,
      collaboratorName: request.collaboratorName,
      collaboratorEmail: request.collaboratorEmail,
      contract: request.contract ?? null,
      title: request.docType,
      description: input.description ?? request.description ?? null,
      category: request.docTab,
      filePath: input.filePath,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      requestId: request.id,
      docTab: request.docTab,
      docType: request.docType,
      source: isManager ? "admin_upload" : "employee_upload"
    });

    return this.repository.markDocumentRequestCompleted({
      tenantId: input.tenantId,
      companyId: input.companyId,
      requestId: request.id
    });
  }

  async openDocument(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    documentId: string;
  }): Promise<OpenFileUrl> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_documents");
    const tenantContext = await this.authTenantService.getTenantContext(input.userId, input.tenantId);

    const document = await this.repository.findDocumentById({
      tenantId: input.tenantId,
      companyId: input.companyId,
      documentId: input.documentId
    });
    if (!document) {
      throw new Error("DOCUMENT_NOT_FOUND");
    }

    const privilegedRoles = new Set(["owner", "admin", "manager", "analyst"]);
    const canOpenAnyDocument = tenantContext.roles.some((role) => privilegedRoles.has(role));
    const canOpenOwnDocument = await this.userCanAccessOwnDocument(input.tenantId, input.userId, document);
    if (!canOpenAnyDocument && !canOpenOwnDocument) {
      throw new Error("ROLE_NOT_ALLOWED");
    }

    ensureTenantScopedPath(input.tenantId, document.filePath, "documents");
    const expiresIn = 300;
    const { data, error } = await this.storage.storage
      .from(env.STORAGE_BUCKET_DOCUMENTS)
      .createSignedUrl(document.filePath, expiresIn);
    if (error || !data?.signedUrl) {
      throw new Error("FILE_OPEN_URL_FAILED");
    }

    return {
      signedUrl: data.signedUrl,
      expiresIn
    };
  }

  async createPayslip(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    collaboratorName: string;
    collaboratorEmail: string;
    contract?: string | null;
    referenceMonth: string;
    fileName: string;
    filePath: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<PayslipRecord> {
    validatePdfUpload(input.mimeType, input.sizeBytes);
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_payslips");
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager"
    ]);
    const employeeUserId = await this.repository.findEmployeeUserIdByEmail(
      input.tenantId,
      input.collaboratorEmail
    );
    return this.repository.createPayslip({
      ...input,
      employeeUserId
    });
  }

  async listPayslips(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    contract?: string;
    collaboratorName?: string;
    collaboratorEmail?: string;
    collaboratorCpf?: string;
    referenceMonth?: string;
    mineOnly?: boolean;
    employeeUserId?: string;
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<PayslipRecord>> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_payslips");
    if (input.employeeUserId && input.employeeUserId !== input.userId) {
      await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
        "owner",
        "admin",
        "manager",
        "analyst"
      ]);
    }
    return this.repository.listPayslips({
      ...input,
      employeeUserId: input.mineOnly ? input.userId : input.employeeUserId
    });
  }

  async createDocumentUploadIntent(input: {
    userId: string;
    tenantId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<UploadIntent> {
    validatePdfUpload(input.mimeType, input.sizeBytes);
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_documents");
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager"
    ]);

    const fileName = normalizePdfFileName(input.fileName);
    const now = new Date();
    const yyyy = now.getUTCFullYear().toString();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const path = `tenants/${input.tenantId}/documents/${yyyy}/${mm}/${randomUUID()}-${fileName}`;

    const { data, error } = await this.storage.storage
      .from(env.STORAGE_BUCKET_DOCUMENTS)
      .createSignedUploadUrl(path);
    if (error || !data) throw new Error("UPLOAD_INTENT_FAILED");

    return {
      bucket: env.STORAGE_BUCKET_DOCUMENTS,
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
      expiresIn: 7200
    };
  }

  async createPayslipUploadIntent(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    referenceMonth: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<UploadIntent> {
    validatePdfUpload(input.mimeType, input.sizeBytes);
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_payslips");
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager"
    ]);

    const fileName = normalizePdfFileName(input.fileName);
    const companyId =
      input.companyId && String(input.companyId).trim()
        ? String(input.companyId).trim()
        : await fetchDefaultTenantCompanyId(this.storage, input.tenantId);
    const path = `tenants/${input.tenantId}/payslips/c/${companyId}/${input.referenceMonth}/${randomUUID()}-${fileName}`;

    const { data, error } = await this.storage.storage
      .from(env.STORAGE_BUCKET_PAYSLIPS)
      .createSignedUploadUrl(path);
    if (error || !data) throw new Error("UPLOAD_INTENT_FAILED");

    return {
      bucket: env.STORAGE_BUCKET_PAYSLIPS,
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
      expiresIn: 7200
    };
  }

  async importPayslipsCsv(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    referenceMonth: string;
    csvText: string;
  }): Promise<{ ok: true; batchId: string; importedRows: number }> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_payslips");
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager"
    ]);

    const rows = parsePayslipCsv(input.csvText);
    if (rows.length === 0) {
      throw new Error("CSV_EMPTY");
    }

    for (const row of rows) {
      validatePdfUpload("application/pdf", row.sizeBytes);
      ensureTenantScopedPath(input.tenantId, row.filePath, "payslips");
    }

    const batch = await this.repository.createPayslipBatch({
      tenantId: input.tenantId,
      companyId: input.companyId,
      createdBy: input.userId,
      contract: null,
      referenceMonth: input.referenceMonth,
      sourceType: "csv"
    });

    const importedRows = await this.repository.createPayslipsInBatch({
      tenantId: input.tenantId,
      companyId: input.companyId,
      userId: input.userId,
      batchId: batch.id,
      referenceMonth: input.referenceMonth,
      rows
    });

    return { ok: true, batchId: batch.id, importedRows };
  }

  async confirmDocumentUpload(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    collaboratorName: string;
    collaboratorEmail: string;
    contract?: string | null;
    title?: string;
    description?: string | null;
    category: string;
    filePath: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<DocumentRecord> {
    validatePdfUpload(input.mimeType, input.sizeBytes);
    ensureTenantScopedPath(input.tenantId, input.filePath, "documents");
    await this.ensureObjectExists(env.STORAGE_BUCKET_DOCUMENTS, input.filePath);

    return this.createDocument({
      userId: input.userId,
      tenantId: input.tenantId,
      companyId: input.companyId,
      collaboratorName: input.collaboratorName,
      collaboratorEmail: input.collaboratorEmail,
      contract: input.contract ?? null,
      title: input.title?.trim() || input.category,
      description: input.description ?? null,
      category: input.category,
      fileName: normalizePdfFileName(input.fileName),
      filePath: input.filePath,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes
    });
  }

  async confirmPayslipUpload(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    collaboratorName: string;
    collaboratorEmail: string;
    contract?: string | null;
    referenceMonth: string;
    filePath: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<PayslipRecord> {
    validatePdfUpload(input.mimeType, input.sizeBytes);
    ensureTenantScopedPath(input.tenantId, input.filePath, "payslips");
    await this.ensureObjectExists(env.STORAGE_BUCKET_PAYSLIPS, input.filePath);

    return this.createPayslip({
      userId: input.userId,
      tenantId: input.tenantId,
      companyId: input.companyId,
      collaboratorName: input.collaboratorName,
      collaboratorEmail: input.collaboratorEmail,
      contract: input.contract ?? null,
      referenceMonth: input.referenceMonth,
      fileName: normalizePdfFileName(input.fileName),
      filePath: input.filePath,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes
    });
  }

  async listPayslipAiBatches(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<PayslipBatchListItem>> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_payslips");
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst"
    ]);
    return this.repository.listPayslipAiBatches({
      tenantId: input.tenantId,
      companyId: input.companyId,
      page: input.page,
      pageSize: input.pageSize
    });
  }

  async getPayslipBatchDetail(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    batchId: string;
  }): Promise<PayslipBatchDetailPayload> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_payslips");
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst"
    ]);
    const batch = await this.repository.findPayslipBatchById({
      tenantId: input.tenantId,
      companyId: input.companyId,
      batchId: input.batchId
    });
    if (!batch) {
      throw new Error("PAYSLIP_BATCH_NOT_FOUND");
    }
    const items = await this.repository.listPayslipsInBatch({
      tenantId: input.tenantId,
      companyId: input.companyId,
      batchId: input.batchId
    });
    return { batch, items };
  }

  async confirmAiBulkPayslipEnqueue(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    title: string;
    referenceMonth: string;
    files: Array<{ filePath: string; fileName: string; sizeBytes: number }>;
  }): Promise<{ ok: true; batchId: string; enqueued: number }> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_payslips");
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager"
    ]);

    if (input.files.length === 0) {
      throw new Error("FILES_REQUIRED");
    }

    for (const row of input.files) {
      validatePdfUpload("application/pdf", row.sizeBytes);
      ensureTenantScopedPath(input.tenantId, row.filePath, "payslips");
      await this.ensureObjectExists(env.STORAGE_BUCKET_PAYSLIPS, row.filePath);
    }

    const batch = await this.repository.createPayslipBatch({
      tenantId: input.tenantId,
      companyId: input.companyId,
      createdBy: input.userId,
      contract: null,
      referenceMonth: input.referenceMonth,
      sourceType: "ai_pdf_bulk",
      title: input.title
    });

    const enqueued = await this.repository.insertAiQueuedPayslips({
      tenantId: input.tenantId,
      companyId: input.companyId,
      batchId: batch.id,
      referenceMonth: input.referenceMonth,
      userId: input.userId,
      rows: input.files.map((f) => ({
        fileName: normalizePdfFileName(f.fileName),
        filePath: f.filePath,
        sizeBytes: f.sizeBytes
      }))
    });

    void import("../ai/schedule.js")
      .then((m) => m.kickPayslipAiLinkQueue())
      .catch((err) => console.error("[ai] kick payslip queue import failed", err));
    return { ok: true, batchId: batch.id, enqueued };
  }

  async acknowledgePayslip(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    payslipId: string;
  }): Promise<PayslipRecord> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_payslips");
    await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    return this.repository.acknowledgePayslip(input);
  }

  async openPayslip(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    payslipId: string;
  }): Promise<OpenFileUrl> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_payslips");
    const tenantContext = await this.authTenantService.getTenantContext(input.userId, input.tenantId);

    const payslip = await this.repository.findPayslipById({
      tenantId: input.tenantId,
      companyId: input.companyId,
      payslipId: input.payslipId
    });
    if (!payslip) {
      throw new Error("PAYSLIP_NOT_FOUND");
    }

    const privilegedRoles = new Set(["owner", "admin", "manager", "analyst"]);
    const canOpenAnyPayslip = tenantContext.roles.some((role) => privilegedRoles.has(role));
    const canOpenOwnPayslip = payslip.employeeUserId === input.userId || payslip.uploadedBy === input.userId;
    if (!canOpenAnyPayslip && !canOpenOwnPayslip) {
      throw new Error("ROLE_NOT_ALLOWED");
    }

    ensureTenantScopedPath(input.tenantId, payslip.filePath, "payslips");
    const expiresIn = 300;
    const { data, error } = await this.storage.storage
      .from(env.STORAGE_BUCKET_PAYSLIPS)
      .createSignedUrl(payslip.filePath, expiresIn);
    if (error || !data?.signedUrl) {
      throw new Error("FILE_OPEN_URL_FAILED");
    }

    return {
      signedUrl: data.signedUrl,
      expiresIn
    };
  }

  async updatePayslipReferenceMonth(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    payslipId: string;
    referenceMonth: string;
  }): Promise<PayslipRecord> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_payslips");
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst"
    ]);
    return this.repository.updatePayslipReferenceMonth(input);
  }

  private async ensureObjectExists(bucket: string, filePath: string): Promise<void> {
    const parts = filePath.split("/");
    const fileName = parts.pop();
    const folder = parts.join("/");

    if (!fileName || !folder) {
      throw new Error("INVALID_FILE_PATH");
    }

    const { data, error } = await this.storage.storage.from(bucket).list(folder, {
      search: fileName,
      limit: 1
    });

    if (error) throw new Error("UPLOAD_OBJECT_CHECK_FAILED");
    if (!data || data.length === 0) {
      throw new Error("UPLOAD_OBJECT_NOT_FOUND");
    }
  }
}

function validatePdfUpload(mimeType: string, sizeBytes: number) {
  if (mimeType.toLowerCase() !== "application/pdf") {
    throw new Error("INVALID_FILE_TYPE");
  }
  if (sizeBytes > env.MAX_PDF_UPLOAD_SIZE_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }
}

function normalizePdfFileName(fileName: string): string {
  const trimmed = fileName.trim().toLowerCase();
  const base = trimmed.replace(/[^a-z0-9._-]/g, "_");
  if (base.endsWith(".pdf")) return base;
  return `${base}.pdf`;
}

function ensureTenantScopedPath(tenantId: string, path: string, scope: "documents" | "payslips") {
  const expectedPrefix = `tenants/${tenantId}/${scope}/`;
  if (path.startsWith(expectedPrefix)) return;
  if (scope === "payslips") {
    const companyScoped = new RegExp(
      `^tenants/${tenantId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/payslips/c/[0-9a-f-]{36}/`
    );
    if (companyScoped.test(path)) return;
  }
  throw new Error("INVALID_FILE_PATH_SCOPE");
}

function parsePayslipCsv(csvText: string): Array<{
  collaboratorName: string;
  collaboratorEmail: string;
  contract?: string | null;
  fileName: string;
  filePath: string;
  sizeBytes: number;
}> {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) return [];

  const headerLine = lines[0];
  if (!headerLine) return [];
  const header = headerLine.split(",").map((x) => x.trim().toLowerCase());
  const required = [
    "collaborator_name",
    "collaborator_email",
    "contract",
    "file_name",
    "file_path",
    "size_bytes"
  ];
  const missing = required.filter((key) => !header.includes(key));
  if (missing.length > 0) {
    throw new Error("CSV_INVALID_HEADER");
  }

  const index = Object.fromEntries(header.map((key, idx) => [key, idx])) as Record<string, number>;
  const collaboratorNameIdx = index.collaborator_name;
  const collaboratorEmailIdx = index.collaborator_email;
  const contractIdx = index.contract;
  const fileNameIdx = index.file_name;
  const filePathIdx = index.file_path;
  const sizeBytesIdx = index.size_bytes;
  if (
    collaboratorNameIdx === undefined ||
    collaboratorEmailIdx === undefined ||
    contractIdx === undefined ||
    fileNameIdx === undefined ||
    filePathIdx === undefined ||
    sizeBytesIdx === undefined
  ) {
    throw new Error("CSV_INVALID_HEADER");
  }
  const rows: Array<{
    collaboratorName: string;
    collaboratorEmail: string;
    contract?: string | null;
    fileName: string;
    filePath: string;
    sizeBytes: number;
  }> = [];

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;
    const cols = line.split(",").map((x) => x.trim());
    const collaboratorName = cols[collaboratorNameIdx] ?? "";
    const collaboratorEmail = cols[collaboratorEmailIdx] ?? "";
    const contract = cols[contractIdx] ?? null;
    const fileName = cols[fileNameIdx] ?? "";
    const filePath = cols[filePathIdx] ?? "";
    const sizeBytes = Number(cols[sizeBytesIdx] ?? 0);

    if (!collaboratorName || !collaboratorEmail || !fileName || !filePath || Number.isNaN(sizeBytes)) {
      throw new Error("CSV_INVALID_ROW");
    }

    rows.push({
      collaboratorName,
      collaboratorEmail,
      contract: contract || null,
      fileName,
      filePath,
      sizeBytes
    });
  }

  return rows;
}
