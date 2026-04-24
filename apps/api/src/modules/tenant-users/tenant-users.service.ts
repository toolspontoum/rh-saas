import { inferWebBaseUrl } from "../../lib/web-base-url.js";
import { supabaseAdmin } from "../../lib/supabase.js";
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

  private passwordSetupRedirectUrl(): string {
    return `${inferWebBaseUrl()}/reset-password`;
  }

  private async dispatchFirstAccessEmail(
    email: string,
    emailConfirmedAt: string | null | undefined
  ): Promise<void> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) throw new Error("EMPLOYEE_EMAIL_REQUIRED_FOR_INVITE");
    if (!emailConfirmedAt) {
      const { error } = await supabaseAdmin.auth.resend({ type: "signup", email: normalized });
      if (error) {
        console.error("[tenant-users] auth.resend signup failed", error);
        throw new Error("AUTH_EMAIL_DISPATCH_FAILED");
      }
      return;
    }
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(normalized, {
      redirectTo: this.passwordSetupRedirectUrl()
    });
    if (error) {
      console.error("[tenant-users] resetPasswordForEmail (first access) failed", error);
      throw new Error("AUTH_EMAIL_DISPATCH_FAILED");
    }
  }

  private async dispatchPasswordResetEmail(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) throw new Error("EMPLOYEE_EMAIL_REQUIRED_FOR_INVITE");
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(normalized, {
      redirectTo: this.passwordSetupRedirectUrl()
    });
    if (error) {
      console.error("[tenant-users] resetPasswordForEmail failed", error);
      throw new Error("AUTH_EMAIL_DISPATCH_FAILED");
    }
  }

  private async ensureFirstAccessEmailAfterEmployeeLink(input: {
    invitedFresh: boolean;
    email: string | undefined;
    userId: string;
    companyId: string;
    tenantId: string;
    actorUserId: string;
  }): Promise<void> {
    if (input.invitedFresh || !input.email?.trim()) return;
    const meta = await this.repository.getAuthUserAccessMeta(input.userId);
    if (meta.lastSignInAt) return;
    await this.dispatchFirstAccessEmail(input.email, meta.emailConfirmedAt);
    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      action: "tenant.employee.first_access_email_dispatched",
      resourceType: "tenant_user",
      resourceId: input.userId,
      result: "success",
      metadata: { channel: meta.emailConfirmedAt ? "recovery" : "signup_resend" }
    });
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
    includePurgedProfiles?: boolean;
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
      companyId: listCompanyId,
      includePurgedProfiles: input.includePurgedProfiles === true
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

    const isEmployee = target.roles.includes("employee");
    if (isEmployee) {
      await this.repository.purgeCollaboratorData({
        tenantId: input.tenantId,
        userId: input.targetUserId,
        companyId: input.companyId ?? target.companyId,
        reason: input.reason.trim()
      });
      await this.repository.insertAuditLog({
        tenantId: input.tenantId,
        companyId: input.companyId ?? target.companyId,
        actorUserId: input.actorUserId,
        action: "tenant.user.collaborator_purged",
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
    let invitedFresh = false;

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
      invitedFresh = true;
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

    let emailForInvite = normalizedEmail;
    if (!emailForInvite) {
      const metaEarly = await this.repository.getAuthUserAccessMeta(targetUserId);
      emailForInvite = metaEarly.email?.trim().toLowerCase() ?? undefined;
    }

    await this.ensureFirstAccessEmailAfterEmployeeLink({
      invitedFresh,
      email: emailForInvite,
      userId: targetUserId,
      companyId,
      tenantId: input.tenantId,
      actorUserId: input.actorUserId
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

  async resendEmployeeInvite(input: {
    tenantId: string;
    actorUserId: string;
    companyId?: string | null;
    targetUserId: string;
  }): Promise<{ ok: true }> {
    await this.authTenantService.assertUserHasAnyRole(input.actorUserId, input.tenantId, [
      "owner",
      "admin",
      "manager"
    ]);

    const target = await this.repository.getUserInTenant(
      input.tenantId,
      input.targetUserId,
      input.companyId
    );
    if (!target) {
      throw new Error("TARGET_USER_NOT_IN_TENANT");
    }
    if (!target.roles.includes("employee")) {
      throw new Error("EMPLOYEE_ACTION_ONLY");
    }

    const email = target.email?.trim().toLowerCase();
    if (!email) {
      throw new Error("EMPLOYEE_EMAIL_REQUIRED_FOR_INVITE");
    }

    const meta = await this.repository.getAuthUserAccessMeta(input.targetUserId);
    if (meta.lastSignInAt) {
      throw new Error("EMPLOYEE_RESEND_INVITE_NOT_APPLICABLE");
    }

    await this.dispatchFirstAccessEmail(email, meta.emailConfirmedAt);

    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId: input.companyId ?? target.companyId,
      actorUserId: input.actorUserId,
      action: "tenant.employee.invite_resent",
      resourceType: "tenant_user",
      resourceId: input.targetUserId,
      result: "success",
      metadata: { channel: meta.emailConfirmedAt ? "recovery" : "signup_resend" }
    });

    return { ok: true };
  }

  async sendEmployeePasswordResetEmail(input: {
    tenantId: string;
    actorUserId: string;
    companyId?: string | null;
    targetUserId: string;
  }): Promise<{ ok: true }> {
    await this.authTenantService.assertUserHasAnyRole(input.actorUserId, input.tenantId, [
      "owner",
      "admin",
      "manager"
    ]);

    const target = await this.repository.getUserInTenant(
      input.tenantId,
      input.targetUserId,
      input.companyId
    );
    if (!target) {
      throw new Error("TARGET_USER_NOT_IN_TENANT");
    }
    if (!target.roles.includes("employee")) {
      throw new Error("EMPLOYEE_ACTION_ONLY");
    }

    const email = target.email?.trim().toLowerCase();
    if (!email) {
      throw new Error("EMPLOYEE_EMAIL_REQUIRED_FOR_INVITE");
    }

    await this.dispatchPasswordResetEmail(email);

    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId: input.companyId ?? target.companyId,
      actorUserId: input.actorUserId,
      action: "tenant.employee.password_reset_email_sent",
      resourceType: "tenant_user",
      resourceId: input.targetUserId,
      result: "success",
      metadata: {}
    });

    return { ok: true };
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

  /**
   * Conta existente no contexto deste tenant (mesma regra que lookup pré-cadastro / vincular).
   */
  async resolveAuthUserIdByEmail(tenantId: string, email: string): Promise<string | null> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;
    return this.repository.findUserIdByEmailForTenant(tenantId, normalized);
  }

  /** CPF (11 dígitos) no contexto deste tenant. */
  async resolveAuthUserIdByCpf(tenantId: string, cpfDigits: string): Promise<string | null> {
    const normalized = cpfDigits.replace(/\D/g, "");
    if (normalized.length !== 11) return null;
    return this.repository.findUserIdByCpfForTenant(tenantId, normalized);
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
