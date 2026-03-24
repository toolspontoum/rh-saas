import { z } from "zod";

import { DocumentsPayslipsService } from "./documents-payslips.service.js";

const optionalCompanyScope = z.string().uuid().nullable().optional();

function parseMineOnly(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true" || value === "1";
  return undefined;
}

const createDocumentSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  companyId: optionalCompanyScope,
  collaboratorName: z.string().min(3).max(160),
  collaboratorEmail: z.email(),
  contract: z.string().max(80).nullable().optional(),
  title: z.string().min(2).max(160).optional(),
  description: z.string().max(2000).nullable().optional(),
  category: z.string().min(1).max(80),
  fileName: z.string().min(1).max(240),
  filePath: z.string().min(1).max(400),
  mimeType: z.literal("application/pdf"),
  sizeBytes: z.coerce.number().int().min(0)
});

const listDocumentsSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  companyId: optionalCompanyScope,
  contract: z.string().max(80).optional(),
  collaboratorName: z.string().max(160).optional(),
  mineOnly: z.preprocess(parseMineOnly, z.boolean().optional()),
  employeeUserId: z.string().uuid().optional(),
  docTab: z.string().min(1).max(80).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

const createDocumentRequestSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  companyId: optionalCompanyScope,
  collaboratorName: z.string().min(3).max(160),
  collaboratorEmail: z.email(),
  contract: z.string().max(80).nullable().optional(),
  docTab: z.string().min(1).max(80),
  docType: z.string().min(1).max(160),
  description: z.string().max(2000).nullable().optional(),
  filePath: z.string().min(1).max(400).nullable().optional(),
  fileName: z.string().min(1).max(240).nullable().optional(),
  mimeType: z.literal("application/pdf").nullable().optional(),
  sizeBytes: z.coerce.number().int().min(0).nullable().optional(),
  workflow: z.enum(["standard", "signature"]).optional()
});

const listDocumentRequestsSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  companyId: optionalCompanyScope,
  collaboratorName: z.string().max(160).optional(),
  employeeUserId: z.string().uuid().optional(),
  docTab: z.string().min(1).max(80).optional(),
  status: z.enum(["open", "in_progress", "completed", "canceled"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

const requestUploadIntentSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  companyId: optionalCompanyScope,
  requestId: z.string().uuid(),
  fileName: z.string().min(1).max(240),
  mimeType: z.literal("application/pdf"),
  sizeBytes: z.coerce.number().int().min(0)
});

const confirmRequestUploadSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  companyId: optionalCompanyScope,
  requestId: z.string().uuid(),
  filePath: z.string().min(1).max(400),
  fileName: z.string().min(1).max(240),
  mimeType: z.literal("application/pdf"),
  sizeBytes: z.coerce.number().int().min(0),
  description: z.string().max(2000).nullable().optional()
});

const openDocumentSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  companyId: optionalCompanyScope,
  documentId: z.string().uuid()
});

const createPayslipSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  companyId: optionalCompanyScope,
  collaboratorName: z.string().min(3).max(160),
  collaboratorEmail: z.email(),
  contract: z.string().max(80).nullable().optional(),
  referenceMonth: z.string().regex(/^\d{4}-\d{2}$/),
  fileName: z.string().min(1).max(240),
  filePath: z.string().min(1).max(400),
  mimeType: z.literal("application/pdf"),
  sizeBytes: z.coerce.number().int().min(0)
});

const documentUploadIntentSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  fileName: z.string().min(1).max(240),
  mimeType: z.literal("application/pdf"),
  sizeBytes: z.coerce.number().int().min(0)
});

const payslipUploadIntentSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  referenceMonth: z.string().regex(/^\d{4}-\d{2}$/),
  fileName: z.string().min(1).max(240),
  mimeType: z.literal("application/pdf"),
  sizeBytes: z.coerce.number().int().min(0)
});

const listPayslipsSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  companyId: optionalCompanyScope,
  contract: z.string().max(80).optional(),
  collaboratorName: z.string().max(160).optional(),
  collaboratorEmail: z.string().max(200).optional(),
  collaboratorCpf: z.string().max(20).optional(),
  referenceMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  mineOnly: z.preprocess(parseMineOnly, z.boolean().optional()),
  employeeUserId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

const acknowledgePayslipSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  companyId: optionalCompanyScope,
  payslipId: z.string().uuid()
});

const updatePayslipReferenceMonthSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  companyId: optionalCompanyScope,
  payslipId: z.string().uuid(),
  referenceMonth: z.string().regex(/^\d{4}-\d{2}$/)
});

const openPayslipSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  companyId: optionalCompanyScope,
  payslipId: z.string().uuid()
});

const confirmDocumentUploadSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  companyId: optionalCompanyScope,
  collaboratorName: z.string().min(3).max(160),
  collaboratorEmail: z.email(),
  contract: z.string().max(80).nullable().optional(),
  title: z.string().min(2).max(160).optional(),
  description: z.string().max(2000).nullable().optional(),
  category: z.string().min(1).max(80),
  filePath: z.string().min(1).max(400),
  fileName: z.string().min(1).max(240),
  mimeType: z.literal("application/pdf"),
  sizeBytes: z.coerce.number().int().min(0)
});

const confirmPayslipUploadSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  companyId: optionalCompanyScope,
  collaboratorName: z.string().min(3).max(160),
  collaboratorEmail: z.email(),
  contract: z.string().max(80).nullable().optional(),
  referenceMonth: z.string().regex(/^\d{4}-\d{2}$/),
  filePath: z.string().min(1).max(400),
  fileName: z.string().min(1).max(240),
  mimeType: z.literal("application/pdf"),
  sizeBytes: z.coerce.number().int().min(0)
});

const importPayslipsCsvSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  companyId: optionalCompanyScope,
  referenceMonth: z.string().regex(/^\d{4}-\d{2}$/),
  csvText: z.string().min(1)
});

const confirmAiBulkPayslipsSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  companyId: optionalCompanyScope,
  referenceMonth: z.string().regex(/^\d{4}-\d{2}$/),
  files: z
    .array(
      z.object({
        filePath: z.string().min(1).max(400),
        fileName: z.string().min(1).max(240),
        sizeBytes: z.coerce.number().int().min(0)
      })
    )
    .min(1)
    .max(50)
});

export class DocumentsPayslipsHandlers {
  constructor(private readonly service: DocumentsPayslipsService) {}

  async createDocument(input: unknown) {
    const payload = createDocumentSchema.parse(input);
    return this.service.createDocument(payload);
  }

  async listDocuments(input: unknown) {
    const payload = listDocumentsSchema.parse(input);
    return this.service.listDocuments(payload);
  }

  async openDocument(input: unknown) {
    const payload = openDocumentSchema.parse(input);
    return this.service.openDocument(payload);
  }

  async createDocumentRequest(input: unknown) {
    const payload = createDocumentRequestSchema.parse(input);
    return this.service.createDocumentRequest(payload);
  }

  async listDocumentRequests(input: unknown) {
    const payload = listDocumentRequestsSchema.parse(input);
    return this.service.listDocumentRequests(payload);
  }

  async createRequestResponseUploadIntent(input: unknown) {
    const payload = requestUploadIntentSchema.parse(input);
    return this.service.createRequestResponseUploadIntent(payload);
  }

  async confirmRequestResponseUpload(input: unknown) {
    const payload = confirmRequestUploadSchema.parse(input);
    return this.service.confirmRequestResponseUpload(payload);
  }

  async createPayslip(input: unknown) {
    const payload = createPayslipSchema.parse(input);
    return this.service.createPayslip(payload);
  }

  async listPayslips(input: unknown) {
    const payload = listPayslipsSchema.parse(input);
    return this.service.listPayslips(payload);
  }

  async createDocumentUploadIntent(input: unknown) {
    const payload = documentUploadIntentSchema.parse(input);
    return this.service.createDocumentUploadIntent(payload);
  }

  async createPayslipUploadIntent(input: unknown) {
    const payload = payslipUploadIntentSchema.parse(input);
    return this.service.createPayslipUploadIntent(payload);
  }

  async confirmDocumentUpload(input: unknown) {
    const payload = confirmDocumentUploadSchema.parse(input);
    return this.service.confirmDocumentUpload(payload);
  }

  async confirmPayslipUpload(input: unknown) {
    const payload = confirmPayslipUploadSchema.parse(input);
    return this.service.confirmPayslipUpload(payload);
  }

  async confirmAiBulkPayslips(input: unknown) {
    const payload = confirmAiBulkPayslipsSchema.parse(input);
    return this.service.confirmAiBulkPayslipEnqueue(payload);
  }

  async importPayslipsCsv(input: unknown) {
    const payload = importPayslipsCsvSchema.parse(input);
    return this.service.importPayslipsCsv(payload);
  }

  async acknowledgePayslip(input: unknown) {
    const payload = acknowledgePayslipSchema.parse(input);
    return this.service.acknowledgePayslip(payload);
  }

  async updatePayslipReferenceMonth(input: unknown) {
    const payload = updatePayslipReferenceMonthSchema.parse(input);
    return this.service.updatePayslipReferenceMonth(payload);
  }

  async openPayslip(input: unknown) {
    const payload = openPayslipSchema.parse(input);
    return this.service.openPayslip(payload);
  }
}
