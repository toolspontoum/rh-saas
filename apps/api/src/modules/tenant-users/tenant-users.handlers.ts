import { z } from "zod";

import { TenantUsersService } from "./tenant-users.service.js";

const listUsersSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  status: z.enum(["active", "inactive", "offboarded"]).optional(),
  search: z.string().max(160).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(250).default(20),
  includePurgedProfiles: z.boolean().optional(),
  includeAuthMeta: z.boolean().optional()
});

const bulkAccessMetaSchema = z.object({
  tenantId: z.string().uuid(),
  actorUserId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  targetUserIds: z.array(z.string().uuid()).min(1).max(250)
});

const updateStatusSchema = z.object({
  tenantId: z.string().uuid(),
  actorUserId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  targetUserId: z.string().uuid(),
  status: z.enum(["active", "inactive", "offboarded"]),
  reason: z.string().max(400).optional()
});

const deleteUserSchema = z.object({
  tenantId: z.string().uuid(),
  actorUserId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  targetUserId: z.string().uuid(),
  reason: z.string().max(400)
});

const upsertEmployeeSchema = z.object({
  tenantId: z.string().uuid(),
  actorUserId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  fullName: z.string().min(3).max(160),
  email: z.string().email().optional(),
  cpf: z.string().max(20).optional(),
  phone: z.string().max(30).optional(),
  webBaseUrl: z.string().max(240).optional()
});

const lookupEmployeeByEmailSchema = z.object({
  tenantId: z.string().uuid(),
  actorUserId: z.string().uuid(),
  email: z.string().email()
});

const lookupEmployeeByCpfSchema = z.object({
  tenantId: z.string().uuid(),
  actorUserId: z.string().uuid(),
  cpf: z.string().min(1).max(20)
});

const upsertBackofficeUserSchema = z.object({
  tenantId: z.string().uuid(),
  actorUserId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  fullName: z.string().min(3).max(160),
  email: z.string().email(),
  role: z.enum(["admin", "manager", "analyst", "preposto"]),
  cpf: z.string().max(20).optional(),
  phone: z.string().max(30).optional(),
  prepostoCompanyId: z.string().uuid().nullable().optional()
});

const targetUserActionSchema = z.object({
  tenantId: z.string().uuid(),
  actorUserId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  targetUserId: z.string().uuid(),
  webBaseUrl: z.string().max(240).optional()
});

export class TenantUsersHandlers {
  constructor(private readonly service: TenantUsersService) {}

  async listUsers(input: unknown) {
    const payload = listUsersSchema.parse(input);
    return this.service.listUsers(payload);
  }

  async bulkAccessMeta(input: unknown) {
    const payload = bulkAccessMetaSchema.parse(input);
    return this.service.bulkAccessMeta(payload);
  }

  async updateUserStatus(input: unknown) {
    const payload = updateStatusSchema.parse(input);
    return this.service.updateUserStatus(payload);
  }

  async deleteUser(input: unknown) {
    const payload = deleteUserSchema.parse(input);
    return this.service.deleteUser(payload);
  }

  async upsertEmployee(input: unknown) {
    const payload = upsertEmployeeSchema.parse(input);
    return this.service.upsertEmployee(payload);
  }

  async lookupEmployeeByEmail(input: unknown) {
    const payload = lookupEmployeeByEmailSchema.parse(input);
    return this.service.lookupEmployeeByEmail(payload);
  }

  async lookupEmployeeByCpf(input: unknown) {
    const payload = lookupEmployeeByCpfSchema.parse(input);
    return this.service.lookupEmployeeByCpf(payload);
  }

  async upsertBackofficeUser(input: unknown) {
    const payload = upsertBackofficeUserSchema.parse(input);
    return this.service.upsertBackofficeUser(payload);
  }

  async resendEmployeeInvite(input: unknown) {
    const payload = targetUserActionSchema.parse(input);
    return this.service.resendEmployeeInvite(payload);
  }

  async sendEmployeePasswordResetEmail(input: unknown) {
    const payload = targetUserActionSchema.parse(input);
    return this.service.sendEmployeePasswordResetEmail(payload);
  }
}
