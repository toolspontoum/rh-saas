import { CoreAuthTenantService } from "../core-auth-tenant/core-auth-tenant.service.js";
import { TenantUsersRepository } from "./tenant-users.repository.js";
import type {
  EmployeeLookupResult,
  PaginatedResult,
  TenantUser,
  TenantUserStatus
} from "./tenant-users.types.js";
import type { AppRole } from "../core-auth-tenant/core-auth-tenant.types.js";

export class TenantUsersService {
  constructor(
    private readonly repository: TenantUsersRepository,
    private readonly authTenantService: CoreAuthTenantService
  ) {}

  private requireAdminCompany(companyId: string | null | undefined): string {
    if (!companyId) throw new Error("COMPANY_SCOPE_REQUIRED");
    return companyId;
  }

  /**
   * Mesma regra do recrutamento: com header/payload de empresa, filtra; sem header, gestores veem o tenant inteiro;
   * colaborador sem perfil privilegiado fica restrito à própria empresa do perfil.
   */
  private async resolveTenantUsersListCompanyId(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
  }): Promise<string | null> {
    if (input.companyId) return input.companyId;
    const ctx = await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    const companyPrivileged = ctx.roles.some((r) => ["owner", "admin", "manager", "analyst"].includes(r));
    if (!companyPrivileged && ctx.prepostoCompanyId) return ctx.prepostoCompanyId;
    if (companyPrivileged) return null;
    return this.repository.getTenantUserCompanyId(input.tenantId, input.userId);
  }

  async listUsers(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    status?: TenantUserStatus;
    search?: string;
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<TenantUser>> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);
    const listCompanyId = await this.resolveTenantUsersListCompanyId(input);
    return this.repository.listUsers({
      ...input,
      companyId: listCompanyId
    });
  }

  async updateUserStatus(input: {
    tenantId: string;
    actorUserId: string;
    companyId?: string | null;
    targetUserId: string;
    status: TenantUserStatus;
    reason?: string;
  }): Promise<{ ok: true }> {
    await this.authTenantService.assertUserHasAnyRole(input.actorUserId, input.tenantId, [
      "owner",
      "admin",
      "manager"
    ]);

    if (input.targetUserId === input.actorUserId && input.status !== "active") {
      throw new Error("SELF_STATUS_CHANGE_NOT_ALLOWED");
    }

    const target = await this.repository.getUserInTenant(
      input.tenantId,
      input.targetUserId,
      input.companyId
    );
    if (!target) {
      throw new Error("TARGET_USER_NOT_IN_TENANT");
    }

    const offboardReason = input.status === "offboarded" ? input.reason?.trim() ?? null : null;
    if (input.status === "offboarded" && (!offboardReason || offboardReason.length < 5)) {
      throw new Error("OFFBOARD_REASON_REQUIRED");
    }

    await this.repository.updateUserStatus({
      tenantId: input.tenantId,
      userId: input.targetUserId,
      status: input.status,
      offboardReason
    });

    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId: input.companyId ?? target.companyId,
      actorUserId: input.actorUserId,
      action: "tenant.user.status_updated",
      resourceType: "tenant_user",
      resourceId: input.targetUserId,
      result: "success",
      metadata: {
        previousStatus: target.status,
        nextStatus: input.status,
        reason: offboardReason
      }
    });

    return { ok: true };
  }

  async deleteUser(input: {
    tenantId: string;
    actorUserId: string;
    companyId?: string | null;
    targetUserId: string;
    reason: string;
  }): Promise<{ ok: true }> {
    await this.authTenantService.assertUserHasAnyRole(input.actorUserId, input.tenantId, [
      "owner",
      "admin"
    ]);

    if (input.targetUserId === input.actorUserId) {
      throw new Error("SELF_DELETE_NOT_ALLOWED");
    }
    if (!input.reason.trim() || input.reason.trim().length < 5) {
      throw new Error("DELETE_REASON_REQUIRED");
    }

    const target = await this.repository.getUserInTenant(
      input.tenantId,
      input.targetUserId,
      input.companyId
    );
    if (!target) {
      throw new Error("TARGET_USER_NOT_IN_TENANT");
    }

    const hasLinked = await this.repository.hasLinkedRecords(input.tenantId, input.targetUserId);
    if (hasLinked) {
      throw new Error("USER_HAS_LINKED_RECORDS");
    }

    await this.repository.deleteUserFromTenant(input.tenantId, input.targetUserId);
    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId: input.companyId ?? target.companyId,
      actorUserId: input.actorUserId,
      action: "tenant.user.deleted",
      resourceType: "tenant_user",
      resourceId: input.targetUserId,
      result: "success",
      metadata: {
        reason: input.reason.trim(),
        previousStatus: target.status
      }
    });

    return { ok: true };
  }

  async upsertEmployee(input: {
    tenantId: string;
    actorUserId: string;
    companyId?: string | null;
    fullName: string;
    email?: string;
    cpf?: string;
    phone?: string;
  }): Promise<TenantUser> {
    await this.authTenantService.assertUserHasAnyRole(input.actorUserId, input.tenantId, [
      "owner",
      "admin",
      "manager"
    ]);

    const companyId = this.requireAdminCompany(input.companyId);

    const normalizedEmail = input.email?.trim().toLowerCase();
    const normalizedCpf = input.cpf?.replace(/\D/g, "");
    const normalizedPhone = input.phone?.trim();

    if (!normalizedEmail && !normalizedCpf) {
      throw new Error("EMPLOYEE_EMAIL_OR_CPF_REQUIRED");
    }

    let targetUserId: string | null = null;

    if (normalizedEmail) {
      targetUserId = await this.repository.findUserIdByEmail(normalizedEmail);
    }

    if (!targetUserId && normalizedCpf) {
      targetUserId = await this.repository.findUserIdByCpf(normalizedCpf);
    }

    if (!targetUserId) {
      if (!normalizedEmail) {
        throw new Error("EMPLOYEE_USER_NOT_FOUND_BY_CPF");
      }
      targetUserId = await this.repository.inviteUserByEmail({
        email: normalizedEmail,
        fullName: input.fullName
      });
    }

    await this.repository.upsertEmployeeInTenant({
      tenantId: input.tenantId,
      companyId,
      userId: targetUserId,
      fullName: input.fullName,
      email: normalizedEmail ?? null,
      cpf: normalizedCpf ?? null,
      phone: normalizedPhone ?? null
    });

    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId,
      actorUserId: input.actorUserId,
      action: "tenant.employee.upserted",
      resourceType: "tenant_user",
      resourceId: targetUserId,
      result: "success",
      metadata: {
        fullName: input.fullName,
        email: normalizedEmail ?? null,
        cpf: normalizedCpf ?? null
      }
    });

    const linked = await this.repository.getUserInTenant(input.tenantId, targetUserId, companyId);
    if (!linked) throw new Error("TARGET_USER_NOT_IN_TENANT");
    return linked;
  }

  async lookupEmployeeByEmail(input: {
    tenantId: string;
    actorUserId: string;
    email: string;
  }): Promise<EmployeeLookupResult> {
    await this.authTenantService.assertUserHasAnyRole(input.actorUserId, input.tenantId, [
      "owner",
      "admin",
      "manager"
    ]);

    return this.repository.lookupEmployeeByEmail(input.tenantId, input.email);
  }

  async lookupEmployeeByCpf(input: {
    tenantId: string;
    actorUserId: string;
    cpf: string;
  }): Promise<EmployeeLookupResult> {
    await this.authTenantService.assertUserHasAnyRole(input.actorUserId, input.tenantId, [
      "owner",
      "admin",
      "manager"
    ]);

    return this.repository.lookupEmployeeByCpf(input.tenantId, input.cpf);
  }

  /** Conta de auth existente (por e-mail normalizado), sem checar vínculo ao tenant. */
  async resolveAuthUserIdByEmail(email: string): Promise<string | null> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;
    return this.repository.findUserIdByEmail(normalized);
  }

  /** Usuário já cadastrado (perfil/candidato/auth), por CPF só dígitos (11). */
  async resolveAuthUserIdByCpf(cpfDigits: string): Promise<string | null> {
    const normalized = cpfDigits.replace(/\D/g, "");
    if (normalized.length !== 11) return null;
    return this.repository.findUserIdByCpf(normalized);
  }

  async upsertBackofficeUser(input: {
    tenantId: string;
    actorUserId: string;
    companyId?: string | null;
    fullName: string;
    email: string;
    role: AppRole;
    cpf?: string;
    phone?: string;
  }): Promise<TenantUser> {
    await this.authTenantService.assertUserHasAnyRole(input.actorUserId, input.tenantId, ["owner", "admin"]);

    const companyId = this.requireAdminCompany(input.companyId);

    const allowedRoles = new Set<AppRole>(["admin", "manager", "analyst"]);
    if (!allowedRoles.has(input.role)) {
      throw new Error("INVALID_BACKOFFICE_ROLE");
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedCpf = input.cpf?.replace(/\D/g, "");
    const normalizedPhone = input.phone?.trim();

    let targetUserId = await this.repository.findUserIdByEmail(normalizedEmail);
    if (!targetUserId) {
      targetUserId = await this.repository.inviteUserByEmail({
        email: normalizedEmail,
        fullName: input.fullName
      });
    }

    await this.repository.upsertBackofficeInTenant({
      tenantId: input.tenantId,
      companyId,
      userId: targetUserId,
      role: input.role,
      fullName: input.fullName,
      email: normalizedEmail,
      cpf: normalizedCpf ?? null,
      phone: normalizedPhone ?? null
    });

    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId,
      actorUserId: input.actorUserId,
      action: "tenant.backoffice_user.upserted",
      resourceType: "tenant_user",
      resourceId: targetUserId,
      result: "success",
      metadata: {
        role: input.role,
        email: normalizedEmail
      }
    });

    const linked = await this.repository.getUserInTenant(input.tenantId, targetUserId, companyId);
    if (!linked) throw new Error("TARGET_USER_NOT_IN_TENANT");
    return linked;
  }
}
