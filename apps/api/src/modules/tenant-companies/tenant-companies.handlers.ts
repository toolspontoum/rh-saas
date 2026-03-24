import { z } from "zod";

import { TenantCompaniesService } from "./tenant-companies.service.js";

const listSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid()
});

const createSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(2).max(200),
  taxId: z.string().max(20).nullable().optional()
});

const updateSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  companyId: z.string().uuid(),
  name: z.string().min(2).max(200).optional(),
  taxId: z.string().max(20).nullable().optional()
});

const deleteSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  companyId: z.string().uuid()
});

export class TenantCompaniesHandlers {
  constructor(private readonly service: TenantCompaniesService) {}

  async list(input: unknown) {
    const payload = listSchema.parse(input);
    return this.service.list(payload);
  }

  async create(input: unknown) {
    const payload = createSchema.parse(input);
    return this.service.create({
      userId: payload.userId,
      tenantId: payload.tenantId,
      name: payload.name,
      taxId: payload.taxId ?? null
    });
  }

  async update(input: unknown) {
    const payload = updateSchema.parse(input);
    return this.service.update({
      userId: payload.userId,
      tenantId: payload.tenantId,
      companyId: payload.companyId,
      name: payload.name,
      taxId: payload.taxId
    });
  }

  async delete(input: unknown) {
    const payload = deleteSchema.parse(input);
    return this.service.delete(payload);
  }
}
