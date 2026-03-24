import { randomUUID } from "node:crypto";

import type { JobDocumentRequirement } from "../recruitment/recruitment.types.js";
import { DocumentsPayslipsRepository } from "../documents-payslips/documents-payslips.repository.js";
import { StandardDocumentsRepository } from "./standard-documents.repository.js";
import type { PlatformDocumentType, TenantDocumentTypeRow } from "./standard-documents.types.js";

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export class StandardDocumentsService {
  constructor(
    private readonly repository: StandardDocumentsRepository,
    private readonly documentsRepository: DocumentsPayslipsRepository
  ) {}

  async listPlatformTypes(): Promise<PlatformDocumentType[]> {
    return this.repository.listAllPlatformTypesForAdmin();
  }

  async createPlatformType(input: { docClass: string; label: string; sortOrder?: number }): Promise<PlatformDocumentType> {
    return this.repository.insertPlatformType(input);
  }

  async updatePlatformType(input: {
    id: string;
    label?: string;
    sortOrder?: number;
    isActive?: boolean;
  }): Promise<PlatformDocumentType> {
    return this.repository.updatePlatformType(input);
  }

  async listTenantMerged(tenantId: string): Promise<TenantDocumentTypeRow[]> {
    return this.repository.listTenantMerged(tenantId);
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
    return this.repository.upsertTenantSettings(tenantId, items);
  }

  async listOptionsForClass(tenantId: string, docClass: string): Promise<Array<{ id: string; label: string }>> {
    const merged = await this.repository.listTenantMerged(tenantId);
    return merged
      .filter((row) => row.docClass === docClass && row.isEnabled)
      .map((row) => ({ id: row.id, label: row.label }));
  }

  mergeRecruitmentRequirements(
    manual: JobDocumentRequirement[],
    auto: Array<{ id: string; docClass: string; label: string }>
  ): JobDocumentRequirement[] {
    const out: JobDocumentRequirement[] = [...manual];

    for (const item of auto) {
      const dupByPlatform = out.some((r) => r.platformDocumentTypeId === item.id);
      const dupByLabel = out.some((r) => r.docTab === item.docClass && norm(r.docType) === norm(item.label));
      if (dupByPlatform || dupByLabel) continue;
      out.push({
        id: randomUUID(),
        docTab: item.docClass,
        docType: item.label,
        label: null,
        platformDocumentTypeId: item.id
      });
    }
    return out;
  }

  async buildMergedJobDocumentRequirements(
    tenantId: string,
    manual: JobDocumentRequirement[] | undefined
  ): Promise<JobDocumentRequirement[]> {
    const auto = await this.repository.getRecruitmentAutoRequirements(tenantId);
    return this.mergeRecruitmentRequirements(manual ?? [], auto);
  }

  async ensureHireDocumentRequests(input: {
    tenantId: string;
    employeeUserId: string;
    actorUserId: string;
    fullName: string;
    email: string | null;
    contract?: string | null;
  }): Promise<void> {
    const required = await this.repository.getHireAutoRequirements(input.tenantId);
    if (required.length === 0) return;

    const [docsResult, requestsResult] = await Promise.all([
      this.documentsRepository.listDocuments({
        tenantId: input.tenantId,
        employeeUserId: input.employeeUserId,
        page: 1,
        pageSize: 500
      }),
      this.documentsRepository.listDocumentRequests({
        tenantId: input.tenantId,
        employeeUserId: input.employeeUserId,
        page: 1,
        pageSize: 500
      })
    ]);

    const hasSatisfiedDoc = (docClass: string, label: string) =>
      docsResult.items.some(
        (d) =>
          d.employeeUserId === input.employeeUserId &&
          (d.docTab === docClass || d.category === docClass) &&
          (norm(d.docType ?? "") === norm(label) || norm(d.title ?? "") === norm(label))
      );

    const hasOpenRequest = (docClass: string, label: string) =>
      requestsResult.items.some(
        (r) =>
          r.employeeUserId === input.employeeUserId &&
          r.docTab === docClass &&
          norm(r.docType ?? "") === norm(label) &&
          (r.status === "open" || r.status === "in_progress")
      );

    for (const item of required) {
      if (hasSatisfiedDoc(item.docClass, item.label)) continue;
      if (hasOpenRequest(item.docClass, item.label)) continue;

      await this.documentsRepository.createDocumentRequest({
        tenantId: input.tenantId,
        collaboratorName: input.fullName,
        collaboratorEmail: input.email ?? "",
        contract: input.contract ?? null,
        title: item.label,
        description: `Solicitação automática (obrigatório na contratação).`,
        requestedBy: input.actorUserId,
        employeeUserId: input.employeeUserId,
        docTab: item.docClass,
        docType: item.label
      });
    }
  }
}
