import { z } from "zod";

import { normalizeSkillList } from "../../lib/skill-tags.js";
import { CoreAuthTenantService } from "../core-auth-tenant/core-auth-tenant.service.js";
import { extractEmployeesFromImportFile } from "../ai/employee-document-ai-extract.js";
import { TenantUsersService } from "../tenant-users/tenant-users.service.js";
import { WorkforceService } from "../workforce/workforce.service.js";

import { EmployeePreregRepository } from "./employee-prereg.repository.js";

/** Campos editáveis no pré-cadastro (e-mail pode vir incompleto da IA até o gestor corrigir). */
const storedPayloadSchema = z.object({
  fullName: z.string().max(160).nullable().optional(),
  personalEmail: z.string().max(255).nullable().optional(),
  cpf: z.string().max(20).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  department: z.string().max(120).nullable().optional(),
  positionTitle: z.string().max(120).nullable().optional(),
  contractType: z.string().max(80).nullable().optional(),
  admissionDate: z.string().max(32).nullable().optional(),
  baseSalary: z.number().nonnegative().nullable().optional(),
  employeeTags: z.array(z.string().min(1).max(80)).max(40).optional()
});

export type EmployeePreregPayloadDto = z.infer<typeof storedPayloadSchema>;

function normalizeAdmissionDate(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const s = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export class EmployeePreregService {
  constructor(
    private readonly repository: EmployeePreregRepository,
    private readonly authTenantService: CoreAuthTenantService,
    private readonly tenantUsersService: TenantUsersService,
    private readonly workforceService: WorkforceService
  ) {}

  private requireCompany(companyId: string | null | undefined): string {
    if (!companyId) throw new Error("COMPANY_SCOPE_REQUIRED");
    return companyId;
  }

  private async assertManager(actorUserId: string, tenantId: string): Promise<void> {
    await this.authTenantService.assertUserHasAnyRole(actorUserId, tenantId, ["owner", "admin", "manager"]);
  }

  private parsePayload(raw: Record<string, unknown>): EmployeePreregPayloadDto {
    return storedPayloadSchema.parse(raw);
  }

  private async loadPendingPrereg(
    tenantId: string,
    preregId: string,
    companyId: string | null | undefined
  ) {
    const row = await this.repository.getPreregById(tenantId, preregId);
    if (!row || row.status !== "pending") {
      throw new Error(row ? "EMPLOYEE_PREREG_WRONG_STATUS" : "EMPLOYEE_PREREG_NOT_FOUND");
    }
    if (companyId && row.company_id && row.company_id !== companyId) {
      throw new Error("EMPLOYEE_PREREG_NOT_FOUND");
    }
    if (companyId && !row.company_id) {
      throw new Error("EMPLOYEE_PREREG_NOT_FOUND");
    }
    return row;
  }

  async createBatch(input: {
    tenantId: string;
    actorUserId: string;
    companyId: string | null | undefined;
    expectedDocCount: number;
  }): Promise<{ batchId: string }> {
    await this.assertManager(input.actorUserId, input.tenantId);
    const companyId = this.requireCompany(input.companyId);
    const batchId = await this.repository.insertBatch({
      tenantId: input.tenantId,
      companyId,
      createdByUserId: input.actorUserId,
      expectedDocCount: Math.min(100, Math.max(1, input.expectedDocCount))
    });
    return { batchId };
  }

  async processBatchFile(input: {
    tenantId: string;
    actorUserId: string;
    companyId: string | null | undefined;
    batchId: string;
    fileName: string;
    mimeType: string | null;
    buffer: Buffer;
  }): Promise<{ preregistrationIds: string[] }> {
    await this.assertManager(input.actorUserId, input.tenantId);
    const companyId = this.requireCompany(input.companyId);

    const batch = await this.repository.getBatch(input.tenantId, input.batchId);
    if (!batch) throw new Error("EMPLOYEE_PREREG_BATCH_NOT_FOUND");
    if (batch.company_id !== companyId) throw new Error("EMPLOYEE_PREREG_BATCH_NOT_FOUND");

    try {
      const extracted = await extractEmployeesFromImportFile({
        tenantId: input.tenantId,
        buffer: input.buffer,
        fileName: input.fileName,
        mimeType: input.mimeType
      });

      const ids: string[] = [];
      for (const item of extracted) {
        const payload = this.parsePayload({
          fullName: item.fullName,
          personalEmail: item.personalEmail,
          cpf: item.cpf,
          phone: item.phone,
          department: item.department,
          positionTitle: item.positionTitle,
          contractType: item.contractType,
          admissionDate: item.admissionDate,
          baseSalary: item.baseSalary,
          employeeTags: item.employeeTags
        } as Record<string, unknown>);
        const id = await this.repository.insertPrereg({
          tenantId: input.tenantId,
          companyId,
          batchId: input.batchId,
          createdByUserId: input.actorUserId,
          sourceFileName: input.fileName,
          sourceMimeType: input.mimeType,
          payload: payload as unknown as Record<string, unknown>
        });
        ids.push(id);
      }

      await this.repository.insertBatchFile({
        batchId: input.batchId,
        fileName: input.fileName,
        status: "ok",
        errorMessage: null,
        createdPreregistrationIds: ids
      });

      await this.repository.incrementBatchCounters(input.batchId, {
        processedOk: 1,
        preregCreated: ids.length,
        errors: 0
      });

      return { preregistrationIds: ids };
    } catch (err) {
      const message = err instanceof Error ? err.message : "INTERNAL_ERROR";
      await this.repository.insertBatchFile({
        batchId: input.batchId,
        fileName: input.fileName,
        status: "error",
        errorMessage: message.slice(0, 2000),
        createdPreregistrationIds: []
      });
      await this.repository.incrementBatchCounters(input.batchId, {
        processedOk: 0,
        preregCreated: 0,
        errors: 1
      });
      throw err;
    }
  }

  async listPreregistrations(input: {
    tenantId: string;
    actorUserId: string;
    companyId: string | null | undefined;
  }) {
    await this.assertManager(input.actorUserId, input.tenantId);
    const companyId = this.requireCompany(input.companyId);
    const rows = await this.repository.listPreregs({
      tenantId: input.tenantId,
      companyId,
      status: "pending"
    });
    return rows.map((r) => {
      const p = storedPayloadSchema.safeParse(r.payload);
      const fullName = p.success ? (p.data.fullName ?? null) : null;
      const personalEmail = p.success ? (p.data.personalEmail ?? null) : null;
      const cpf = p.success ? (p.data.cpf ?? null) : null;
      return {
        id: r.id,
        sourceFileName: r.source_file_name,
        fullName,
        cpf,
        personalEmail,
        createdAt: r.created_at
      };
    });
  }

  async getPreregistrationDetail(input: {
    tenantId: string;
    actorUserId: string;
    companyId: string | null | undefined;
    preregId: string;
  }) {
    await this.assertManager(input.actorUserId, input.tenantId);
    const companyId = this.requireCompany(input.companyId);
    const row = await this.loadPendingPrereg(input.tenantId, input.preregId, companyId);
    const payload = this.parsePayload(row.payload as Record<string, unknown>);

    const emailRaw = payload.personalEmail?.trim().toLowerCase() ?? "";
    const emailOk = z.string().email().max(255).safeParse(emailRaw);
    const cpfDigits = (payload.cpf ?? "").replace(/\D/g, "");
    const cpfOk = cpfDigits.length === 11;

    let suggestedAction: "register" | "link" | "need_email" = "need_email";
    let authUserId: string | null = null;
    let alreadyEmployeeInTenant = false;

    if (emailOk.success || cpfOk) {
      if (emailOk.success) {
        authUserId = await this.tenantUsersService.resolveAuthUserIdByEmail(emailOk.data);
      }
      if (!authUserId && cpfOk) {
        authUserId = await this.tenantUsersService.resolveAuthUserIdByCpf(cpfDigits);
      }
      suggestedAction = authUserId ? "link" : "register";
      if (authUserId) {
        alreadyEmployeeInTenant = await this.repository.hasEmployeeRole(input.tenantId, authUserId);
      }
    }

    return {
      id: row.id,
      sourceFileName: row.source_file_name,
      sourceMimeType: row.source_mime_type,
      batchId: row.batch_id,
      payload,
      suggestedAction,
      authUserId,
      alreadyEmployeeInTenant
    };
  }

  async updatePreregistrationPayload(input: {
    tenantId: string;
    actorUserId: string;
    companyId: string | null | undefined;
    preregId: string;
    payload: unknown;
  }) {
    await this.assertManager(input.actorUserId, input.tenantId);
    const companyId = this.requireCompany(input.companyId);
    await this.loadPendingPrereg(input.tenantId, input.preregId, companyId);
    const payload = storedPayloadSchema.parse(input.payload);
    await this.repository.updatePreregPayload(input.tenantId, input.preregId, payload as Record<string, unknown>);
    return { ok: true as const };
  }

  async deletePreregistration(input: {
    tenantId: string;
    actorUserId: string;
    companyId: string | null | undefined;
    preregId: string;
  }) {
    await this.assertManager(input.actorUserId, input.tenantId);
    const companyId = this.requireCompany(input.companyId);
    await this.loadPendingPrereg(input.tenantId, input.preregId, companyId);
    await this.repository.deletePrereg(input.tenantId, input.preregId);
    return { ok: true as const };
  }

  private async applyEmployeeFromPayload(input: {
    tenantId: string;
    actorUserId: string;
    companyId: string;
    preregId: string;
    mode: "register" | "link";
  }) {
    const row = await this.loadPendingPrereg(input.tenantId, input.preregId, input.companyId);
    const payload = this.parsePayload(row.payload as Record<string, unknown>);

    const fullName = (payload.fullName ?? "").trim();
    if (fullName.length < 3) {
      throw new Error("EMPLOYEE_PREREG_FULL_NAME_REQUIRED");
    }

    const emailRaw = payload.personalEmail?.trim().toLowerCase() ?? "";
    const emailCheck = z.string().email().max(255).safeParse(emailRaw);
    const email = emailCheck.success ? emailCheck.data : null;

    const cpfDigits = (payload.cpf ?? "").replace(/\D/g, "");
    const cpfNormalized = cpfDigits.length === 11 ? cpfDigits : null;

    if (input.mode === "register") {
      if (!email) {
        throw new Error("EMPLOYEE_PREREG_EMAIL_REQUIRED");
      }
    } else if (!email && !cpfNormalized) {
      throw new Error("EMPLOYEE_PREREG_LINK_IDENTIFIERS_MISSING");
    }

    let authUserId: string | null = null;
    if (email) {
      authUserId = await this.tenantUsersService.resolveAuthUserIdByEmail(email);
    }
    if (!authUserId && cpfNormalized) {
      authUserId = await this.tenantUsersService.resolveAuthUserIdByCpf(cpfNormalized);
    }

    if (input.mode === "register" && authUserId) {
      throw new Error("EMPLOYEE_PREREG_REGISTER_USER_EXISTS");
    }
    if (input.mode === "link" && !authUserId) {
      throw new Error("EMPLOYEE_PREREG_LINK_USER_MISSING");
    }

    const linked = await this.tenantUsersService.upsertEmployee({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      companyId: input.companyId,
      fullName,
      email: email ?? undefined,
      cpf: cpfNormalized ?? undefined,
      phone: payload.phone?.replace(/\D/g, "") || undefined
    });

    const personalEmailForProfile = email ?? linked.email ?? null;

    await this.workforceService.upsertEmployeeProfile({
      tenantId: input.tenantId,
      companyId: input.companyId,
      userId: input.actorUserId,
      targetUserId: linked.userId,
      fullName,
      personalEmail: personalEmailForProfile,
      cpf: payload.cpf?.replace(/\D/g, "") || null,
      phone: payload.phone?.replace(/\D/g, "") || null,
      department: payload.department ?? null,
      positionTitle: payload.positionTitle ?? null,
      contractType: payload.contractType ?? null,
      admissionDate: normalizeAdmissionDate(payload.admissionDate),
      baseSalary: payload.baseSalary ?? null,
      employeeTags: normalizeSkillList(payload.employeeTags ?? [])
    });

    await this.repository.markPreregConfirmed(input.tenantId, input.preregId, linked.userId);
    return { userId: linked.userId };
  }

  async confirmRegister(input: {
    tenantId: string;
    actorUserId: string;
    companyId: string | null | undefined;
    preregId: string;
  }) {
    await this.assertManager(input.actorUserId, input.tenantId);
    const companyId = this.requireCompany(input.companyId);
    return this.applyEmployeeFromPayload({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      companyId,
      preregId: input.preregId,
      mode: "register"
    });
  }

  async confirmLink(input: {
    tenantId: string;
    actorUserId: string;
    companyId: string | null | undefined;
    preregId: string;
  }) {
    await this.assertManager(input.actorUserId, input.tenantId);
    const companyId = this.requireCompany(input.companyId);
    return this.applyEmployeeFromPayload({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      companyId,
      preregId: input.preregId,
      mode: "link"
    });
  }

  async listBatches(input: {
    tenantId: string;
    actorUserId: string;
    companyId: string | null | undefined;
    limit?: number;
  }) {
    await this.assertManager(input.actorUserId, input.tenantId);
    const companyId = this.requireCompany(input.companyId);
    const rows = await this.repository.listBatches(input.tenantId, companyId, input.limit ?? 50);
    return rows.map((b) => ({
      id: b.id,
      createdAt: b.created_at,
      docCount: b.expected_doc_count,
      processedOk: b.processed_ok,
      preregCreated: b.prereg_created,
      errorCount: b.error_count
    }));
  }

  async getBatchDetail(input: {
    tenantId: string;
    actorUserId: string;
    companyId: string | null | undefined;
    batchId: string;
  }) {
    await this.assertManager(input.actorUserId, input.tenantId);
    const companyId = this.requireCompany(input.companyId);
    const batch = await this.repository.getBatch(input.tenantId, input.batchId);
    if (!batch || batch.company_id !== companyId) {
      throw new Error("EMPLOYEE_PREREG_BATCH_NOT_FOUND");
    }
    const files = await this.repository.listBatchFiles(input.batchId);
    return {
      id: batch.id,
      createdAt: batch.created_at,
      docCount: batch.expected_doc_count,
      processedOk: batch.processed_ok,
      preregCreated: batch.prereg_created,
      errorCount: batch.error_count,
      files: files.map((f) => ({
        id: f.id,
        fileName: f.file_name,
        processedAt: f.processed_at,
        status: f.status as "ok" | "error",
        errorMessage: f.error_message,
        preregistrationIds: f.created_preregistration_ids
      }))
    };
  }
}
