import { z } from "zod";

import { EmployeePreregService } from "./employee-prereg.service.js";

const tenantActorSchema = z.object({
  tenantId: z.string().uuid(),
  actorUserId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional()
});

const createBatchSchema = tenantActorSchema.extend({
  expectedDocCount: z.coerce.number().int().min(1).max(100)
});

const preregIdSchema = tenantActorSchema.extend({
  preregId: z.string().uuid()
});

const batchIdSchema = tenantActorSchema.extend({
  batchId: z.string().uuid()
});

export class EmployeePreregHandlers {
  constructor(private readonly service: EmployeePreregService) {}

  async createBatch(input: unknown) {
    const payload = createBatchSchema.parse(input);
    return this.service.createBatch({
      tenantId: payload.tenantId,
      actorUserId: payload.actorUserId,
      companyId: payload.companyId,
      expectedDocCount: payload.expectedDocCount
    });
  }

  async processBatchFile(input: unknown) {
    const payload = batchIdSchema
      .extend({
        fileName: z.string().min(1).max(500),
        mimeType: z.string().max(120).nullable().optional(),
        buffer: z.instanceof(Buffer)
      })
      .parse(input);
    return this.service.processBatchFile({
      tenantId: payload.tenantId,
      actorUserId: payload.actorUserId,
      companyId: payload.companyId,
      batchId: payload.batchId,
      fileName: payload.fileName,
      mimeType: payload.mimeType ?? null,
      buffer: payload.buffer
    });
  }

  async listPreregistrations(input: unknown) {
    const payload = tenantActorSchema.parse(input);
    return this.service.listPreregistrations({
      tenantId: payload.tenantId,
      actorUserId: payload.actorUserId,
      companyId: payload.companyId
    });
  }

  async getPreregistrationDetail(input: unknown) {
    const payload = preregIdSchema.parse(input);
    return this.service.getPreregistrationDetail({
      tenantId: payload.tenantId,
      actorUserId: payload.actorUserId,
      companyId: payload.companyId,
      preregId: payload.preregId
    });
  }

  async updatePreregistrationPayload(input: unknown) {
    const payload = preregIdSchema.extend({ body: z.record(z.string(), z.any()) }).parse(input);
    return this.service.updatePreregistrationPayload({
      tenantId: payload.tenantId,
      actorUserId: payload.actorUserId,
      companyId: payload.companyId,
      preregId: payload.preregId,
      payload: payload.body
    });
  }

  async deletePreregistration(input: unknown) {
    const payload = preregIdSchema.parse(input);
    return this.service.deletePreregistration({
      tenantId: payload.tenantId,
      actorUserId: payload.actorUserId,
      companyId: payload.companyId,
      preregId: payload.preregId
    });
  }

  async confirmRegister(input: unknown) {
    const payload = preregIdSchema.parse(input);
    return this.service.confirmRegister({
      tenantId: payload.tenantId,
      actorUserId: payload.actorUserId,
      companyId: payload.companyId,
      preregId: payload.preregId
    });
  }

  async confirmLink(input: unknown) {
    const payload = preregIdSchema.parse(input);
    return this.service.confirmLink({
      tenantId: payload.tenantId,
      actorUserId: payload.actorUserId,
      companyId: payload.companyId,
      preregId: payload.preregId
    });
  }

  async listBatches(input: unknown) {
    const payload = tenantActorSchema.extend({ limit: z.coerce.number().int().min(1).max(100).optional() }).parse(input);
    return this.service.listBatches({
      tenantId: payload.tenantId,
      actorUserId: payload.actorUserId,
      companyId: payload.companyId,
      limit: payload.limit
    });
  }

  async getBatchDetail(input: unknown) {
    const payload = batchIdSchema.parse(input);
    return this.service.getBatchDetail({
      tenantId: payload.tenantId,
      actorUserId: payload.actorUserId,
      companyId: payload.companyId,
      batchId: payload.batchId
    });
  }
}
