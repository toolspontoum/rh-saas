import { z } from "zod";

import type { CoreAuthTenantService } from "../core-auth-tenant/core-auth-tenant.service.js";
import type { StandardDocumentsService } from "./standard-documents.service.js";

const managementRoles = ["owner", "admin", "manager"] as const;

const listTenantSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid()
});

const patchTenantSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  items: z.array(
    z.object({
      platformDocumentTypeId: z.string().uuid(),
      isEnabled: z.boolean(),
      requiredForHire: z.boolean(),
      requiredForRecruitment: z.boolean()
    })
  )
});

const createPlatformSchema = z.object({
  docClass: z.string().min(1).max(80),
  label: z.string().min(1).max(200),
  sortOrder: z.number().int().optional()
});

const updatePlatformSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(200).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional()
});

export class StandardDocumentsHandlers {
  constructor(
    private readonly service: StandardDocumentsService,
    private readonly authTenant: CoreAuthTenantService
  ) {}

  async listTenantMerged(input: unknown) {
    const payload = listTenantSchema.parse(input);
    await this.authTenant.assertUserHasAnyRole(payload.userId, payload.tenantId, [...managementRoles]);
    const items = await this.service.listTenantMerged(payload.tenantId);
    return { items };
  }

  async patchTenantSettings(input: unknown) {
    const payload = patchTenantSchema.parse(input);
    await this.authTenant.assertUserHasAnyRole(payload.userId, payload.tenantId, [...managementRoles]);
    await this.service.upsertTenantSettings(payload.tenantId, payload.items);
    return { ok: true as const };
  }

  /** Rota protegida por `requirePlatformAdmin`. */
  async listPlatformTypes() {
    const items = await this.service.listPlatformTypes();
    return { items };
  }

  async createPlatformType(input: unknown) {
    const payload = createPlatformSchema.parse(input);
    return this.service.createPlatformType(payload);
  }

  async updatePlatformType(input: unknown) {
    const payload = updatePlatformSchema.parse(input);
    return this.service.updatePlatformType(payload);
  }
}
