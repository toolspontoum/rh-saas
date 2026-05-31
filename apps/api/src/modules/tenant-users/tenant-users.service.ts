import { inferWebBaseUrl, webBaseUrlFromHeader } from "../../lib/web-base-url.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { CoreAuthTenantService } from "../core-auth-tenant/core-auth-tenant.service.js";
import type { TenantCompaniesService } from "../tenant-companies/tenant-companies.service.js";
import { TenantUsersRepository } from "./tenant-users.repository.js";
import type {
  EmployeeLookupResult,
  PaginatedResult,
  TenantUser,
  TenantUserCompanyHistoryItem,
  TenantUserStatus
} from "./tenant-users.types.js";
import type { AppRole } from "../core-auth-tenant/core-auth-tenant.types.js";

export class TenantUsersService {
  constructor(
    private readonly repository: TenantUsersRepository,
    private readonly authTenantService: CoreAuthTenantService,
    private readonly tenantCompaniesService: TenantCompaniesService
  ) {}

  private requireAdminCompany(companyId: string | null | undefined): string {
    if (!companyId) throw new Error("COMPANY_SCOPE_REQUIRED");
    return companyId;
  }

  private passwordSetupRedirectUrl(webBaseUrl?: string | null): string {
    const base = webBaseUrlFromHeader(webBaseUrl) ?? inferWebBaseUrl();
    return `${base}/first-access`;
  }

  private passwordRecoveryRedirectUrl(webBaseUrl?: string | null): string {
    const base = webBaseUrlFromHeader(webBaseUrl) ?? inferWebBaseUrl();
    return `${base}/reset-password`;
  }

  private async dispatchFirstAccessEmail(
    email: string,
    _emailConfirmedAt: string | null | undefined,
    webBaseUrl?: string | null
  ): Promise<{ redirectTo: string }> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) throw new Error("EMPLOYEE_EMAIL_REQUIRED_FOR_INVITE");
    const redirectTo = this.passwordSetupRedirectUrl(webBaseUrl);
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(normalized, {
      redirectTo
    });
    if (error) {
      console.error("[tenant-users] resetPasswordForEmail (first access) failed", error);
      throw new Error("AUTH_EMAIL_DISPATCH_FAILED");
    }
    return { redirectTo };
  }

  private async dispatchPasswordResetEmail(
    email: string,
    webBaseUrl?: string | null
  ): Promise<{ redirectTo: string }> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) throw new Error("EMPLOYEE_EMAIL_REQUIRED_FOR_INVITE");
    const redirectTo = this.passwordRecoveryRedirectUrl(webBaseUrl);
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(normalized, {
      redirectTo
    });
    if (error) {
      console.error("[tenant-users] resetPasswordForEmail failed", error);
      throw new Error("AUTH_EMAIL_DISPATCH_FAILED");
    }
    return { redirectTo };
  }

  private async ensureFirstAccessEmailAfterEmployeeLink(input: {
    invitedFresh: boolean;
    email: string | undefined;
    userId: string;
    companyId: string;
    tenantId: string;
    actorUserId: string;
    webBaseUrl?: string | null;
  }): Promise<void> {
    if (input.invitedFresh || !input.email?.trim()) return;
    const meta = await this.repository.getAuthUserAccessMeta(input.userId);
    if (meta.lastSignInAt) return;
    // O envio do e-mail de primeiro acesso é melhor-esforço: o vinculo do
    // colaborador ja foi gravado e nao deve ser revertido por falha de SMTP /
    // rate limit do provedor (ex.: ElasticEmail / Supabase Auth). Registamos
    // o erro em audit_log para o admin reenviar pela tela de colaboradores.
    try {
      const out = await this.dispatchFirstAccessEmail(input.email, meta.emailConfirmedAt, input.webBaseUrl);
      await this.repository.insertAuditLog({
        tenantId: input.tenantId,
        companyId: input.companyId,
        actorUserId: input.actorUserId,
        action: "tenant.employee.first_access_email_dispatched",
        resourceType: "tenant_user",
        resourceId: input.userId,
        result: "success",
        metadata: {
          channel: "recovery",
          redirectTo: out.redirectTo,
          webBaseUrl: input.webBaseUrl ?? null
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[tenant-users] first access email dispatch failed (non-fatal)", message);
      try {
        await this.repository.insertAuditLog({
          tenantId: input.tenantId,
          companyId: input.companyId,
          actorUserId: input.actorUserId,
          action: "tenant.employee.first_access_email_failed",
          resourceType: "tenant_user",
          resourceId: input.userId,
          result: "error",
          metadata: {
            channel: "recovery",
            error: message,
            webBaseUrl: input.webBaseUrl ?? null
          }
        });
      } catch (logErr) {
        console.error("[tenant-users] failed to write audit log for email failure", logErr);
      }
    }
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
    includeAuthMeta?: boolean;
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
      includePurgedProfiles: input.includePurgedProfiles === true,
      includeAuthMeta: input.includeAuthMeta === true
    });
  }

  async bulkAccessMeta(input: {
    tenantId: string;
    actorUserId: string;
    companyId?: string | null;
    targetUserIds: string[];
  }): Promise<{ items: Record<string, { email: string | null; lastSignInAt: string | null }> }> {
    await this.authTenantService.assertUserHasAnyRole(input.actorUserId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);

    const ids = Array.from(new Set((input.targetUserIds ?? []).filter(Boolean))).slice(0, 250);
    const items = await this.repository.bulkAuthAccessMeta(ids);
    return { items };
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
      "manager",
      "analyst",
      "preposto"
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
    mode?: "unlink" | "purge_account";
    confirmPhrase?: string;
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
    const mode = input.mode ?? "purge_account";

    if (isEmployee && mode === "unlink") {
      await this.repository.unlinkEmployeeFromTenant({
        tenantId: input.tenantId,
        userId: input.targetUserId,
        companyId: input.companyId ?? target.companyId,
        reason: input.reason.trim()
      });
      await this.repository.insertAuditLog({
        tenantId: input.tenantId,
        companyId: input.companyId ?? target.companyId,
        actorUserId: input.actorUserId,
        action: "tenant.user.employee_unlinked",
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

    if (isEmployee) {
      const confirm = (input.confirmPhrase ?? "").trim().toUpperCase();
      if (confirm !== "DELETAR") {
        throw new Error("DELETE_CONFIRM_PHRASE_REQUIRED");
      }
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
          previousStatus: target.status,
          mode: "purge_account"
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
    webBaseUrl?: string;
  }): Promise<TenantUser> {
    await this.authTenantService.assertUserHasAnyRole(input.actorUserId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
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
      targetUserId = await this.repository.findUserIdByCpfForTenant(input.tenantId, normalizedCpf);
      if (!targetUserId) {
        targetUserId = await this.repository.findUserIdByCpf(normalizedCpf);
      }
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
      actorUserId: input.actorUserId,
      webBaseUrl: input.webBaseUrl ?? null
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

  /**
   * Vincula um colaborador existente a uma empresa/projeto (`companyId`).
   * Se ele já estava vinculado a outra empresa, fecha o vínculo anterior no
   * histórico, repõe role `employee` + status `active` e abre novo vínculo.
   * Mantém todos os dados pessoais e históricos (documentos, batidas etc.).
   */
  async linkCollaboratorToCompany(input: {
    tenantId: string;
    actorUserId: string;
    targetUserId: string;
    companyId: string;
    reason?: string | null;
  }): Promise<TenantUser> {
    await this.authTenantService.assertUserHasAnyRole(input.actorUserId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst"
    ]);

    if (!input.companyId?.trim()) throw new Error("COMPANY_SCOPE_REQUIRED");

    // Garante que a empresa/projeto pertence ao tenant.
    await this.tenantCompaniesService.assertCompanyBelongsToTenant(
      input.tenantId,
      input.companyId
    );

    // Encontra o perfil actual em qualquer empresa do tenant.
    const current = await this.repository.getUserInTenant(input.tenantId, input.targetUserId);
    if (!current) throw new Error("TARGET_USER_NOT_IN_TENANT");

    // Realocação: actualiza company_id no perfil e reabre status active.
    await this.repository.updateProfileCompany({
      tenantId: input.tenantId,
      userId: input.targetUserId,
      companyId: input.companyId
    });

    // Reatribui role employee (idempotente).
    await this.repository.upsertEmployeeInTenant({
      tenantId: input.tenantId,
      companyId: input.companyId,
      userId: input.targetUserId,
      fullName: current.fullName ?? "Colaborador",
      email: current.email,
      cpf: current.cpf,
      phone: current.phone
    });

    // Garante vínculo aberto correcto no histórico (fecha anterior se outra empresa).
    await this.repository.ensureOpenCompanyLink({
      tenantId: input.tenantId,
      userId: input.targetUserId,
      companyId: input.companyId,
      reason: input.reason ?? null,
      actorUserId: input.actorUserId
    });

    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      action: "tenant.user.collaborator_linked_to_company",
      resourceType: "tenant_user",
      resourceId: input.targetUserId,
      result: "success",
      metadata: {
        previousCompanyId: current.companyId,
        newCompanyId: input.companyId,
        reason: input.reason ?? null
      }
    });

    const updated = await this.repository.getUserInTenant(
      input.tenantId,
      input.targetUserId,
      input.companyId
    );
    if (!updated) throw new Error("TARGET_USER_NOT_IN_TENANT");
    return updated;
  }

  /**
   * Desvincula o colaborador da empresa/projeto actual sem apagar dados.
   * Encerra o vínculo aberto no histórico e troca role `employee` por `viewer`.
   */
  async unlinkCollaboratorFromCompany(input: {
    tenantId: string;
    actorUserId: string;
    targetUserId: string;
    reason: string;
  }): Promise<{ ok: true }> {
    await this.authTenantService.assertUserHasAnyRole(input.actorUserId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst"
    ]);

    if (input.targetUserId === input.actorUserId) {
      throw new Error("SELF_DELETE_NOT_ALLOWED");
    }
    if (!input.reason?.trim() || input.reason.trim().length < 5) {
      throw new Error("UNLINK_REASON_REQUIRED");
    }

    const target = await this.repository.getUserInTenant(input.tenantId, input.targetUserId);
    if (!target) throw new Error("TARGET_USER_NOT_IN_TENANT");
    if (!target.companyId) throw new Error("USER_NOT_LINKED_TO_COMPANY");

    await this.repository.unlinkEmployeeFromTenant({
      tenantId: input.tenantId,
      userId: input.targetUserId,
      companyId: target.companyId,
      reason: input.reason.trim(),
      actorUserId: input.actorUserId
    });

    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId: target.companyId,
      actorUserId: input.actorUserId,
      action: "tenant.user.collaborator_unlinked_from_company",
      resourceType: "tenant_user",
      resourceId: input.targetUserId,
      result: "success",
      metadata: {
        previousCompanyId: target.companyId,
        reason: input.reason.trim()
      }
    });

    return { ok: true };
  }

  /**
   * Lista histórico de vínculos do colaborador. Apenas gestores/preposto e o
   * próprio utilizador podem ler.
   */
  async listCollaboratorCompanyHistory(input: {
    tenantId: string;
    actorUserId: string;
    targetUserId: string;
  }): Promise<TenantUserCompanyHistoryItem[]> {
    const isSelf = input.targetUserId === input.actorUserId;
    if (!isSelf) {
      await this.authTenantService.assertUserHasAnyRole(input.actorUserId, input.tenantId, [
        "owner",
        "admin",
        "manager",
        "analyst",
        "preposto"
      ]);
    }

    const items = await this.repository.listCompanyHistory({
      tenantId: input.tenantId,
      userId: input.targetUserId
    });

    return items.map((row) => ({
      ...row,
      isActive: row.unlinkedAt === null
    }));
  }

  async resendEmployeeInvite(input: {
    tenantId: string;
    actorUserId: string;
    companyId?: string | null;
    targetUserId: string;
    webBaseUrl?: string;
  }): Promise<{ ok: true }> {
    await this.authTenantService.assertUserHasAnyRole(input.actorUserId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
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

    const out = await this.dispatchFirstAccessEmail(email, meta.emailConfirmedAt, input.webBaseUrl ?? null);

    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId: input.companyId ?? target.companyId,
      actorUserId: input.actorUserId,
      action: "tenant.employee.invite_resent",
      resourceType: "tenant_user",
      resourceId: input.targetUserId,
      result: "success",
      metadata: {
        channel: "recovery",
        redirectTo: out.redirectTo,
        webBaseUrl: input.webBaseUrl ?? null
      }
    });

    return { ok: true };
  }

  async sendEmployeePasswordResetEmail(input: {
    tenantId: string;
    actorUserId: string;
    companyId?: string | null;
    targetUserId: string;
    webBaseUrl?: string;
  }): Promise<{ ok: true }> {
    await this.authTenantService.assertUserHasAnyRole(input.actorUserId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);

    const target = await this.repository.getUserInTenant(
      input.tenantId,
      input.targetUserId,
      input.companyId
    );
    if (!target) {
      throw new Error("TARGET_USER_NOT_IN_TENANT");
    }
    const canReceivePasswordReset = target.roles.some((r) =>
      ["employee", "owner", "admin", "manager", "analyst", "preposto"].includes(r)
    );
    if (!canReceivePasswordReset) {
      throw new Error("PASSWORD_RESET_TARGET_NOT_ALLOWED");
    }

    const email = target.email?.trim().toLowerCase();
    if (!email) {
      throw new Error("EMPLOYEE_EMAIL_REQUIRED_FOR_INVITE");
    }

    const out = await this.dispatchPasswordResetEmail(email, input.webBaseUrl ?? null);

    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId: input.companyId ?? target.companyId,
      actorUserId: input.actorUserId,
      action: "tenant.user.password_reset_email_sent",
      resourceType: "tenant_user",
      resourceId: input.targetUserId,
      result: "success",
      metadata: {
        redirectTo: out.redirectTo,
        webBaseUrl: input.webBaseUrl ?? null
      }
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
      "manager",
      "analyst",
      "preposto"
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
      "manager",
      "analyst",
      "preposto"
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

  private async resolveBackofficeProfileCompanyId(input: {
    tenantId: string;
    scopeCompanyId: string | null | undefined;
  }): Promise<string> {
    if (input.scopeCompanyId) return input.scopeCompanyId;
    const ids = await this.repository.listCompanyIdsForTenant(input.tenantId);
    if (ids.length === 0) throw new Error("TENANT_HAS_NO_COMPANIES");
    return ids[0]!;
  }

  private async upsertPrepostoManagementUser(input: {
    tenantId: string;
    actorUserId: string;
    companyId: string;
    fullName: string;
    email: string;
    cpf?: string | null;
    phone?: string | null;
  }): Promise<TenantUser> {
    await this.authTenantService.assertUserHasAnyRole(input.actorUserId, input.tenantId, [
      "owner",
      "admin",
      "manager"
    ]);
    const okCo = await this.repository.companyBelongsToTenant(input.tenantId, input.companyId);
    if (!okCo) throw new Error("TENANT_COMPANY_NOT_FOUND");

    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedCpf = input.cpf?.replace(/\D/g, "") || undefined;
    const normalizedPhone = input.phone?.trim() || undefined;

    let targetUserId = await this.repository.findUserIdByEmail(normalizedEmail);
    if (!targetUserId) {
      targetUserId = await this.repository.inviteUserByEmail({
        email: normalizedEmail,
        fullName: input.fullName
      });
    }

    await this.repository.upsertEmployeeInTenant({
      tenantId: input.tenantId,
      companyId: input.companyId,
      userId: targetUserId,
      fullName: input.fullName,
      email: normalizedEmail,
      cpf: normalizedCpf ?? null,
      phone: normalizedPhone ?? null
    });

    await this.tenantCompaniesService.setPreposto({
      userId: input.actorUserId,
      tenantId: input.tenantId,
      companyId: input.companyId,
      prepostoUserId: targetUserId
    });

    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      action: "tenant.preposto_user.upserted",
      resourceType: "tenant_user",
      resourceId: targetUserId,
      result: "success",
      metadata: {
        email: normalizedEmail
      }
    });

    const linked = await this.repository.getUserInTenant(input.tenantId, targetUserId, input.companyId);
    if (!linked) throw new Error("TARGET_USER_NOT_IN_TENANT");
    return linked;
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
    prepostoCompanyId?: string | null;
  }): Promise<TenantUser> {
    if (input.role === "preposto") {
      const target =
        (input.prepostoCompanyId && String(input.prepostoCompanyId).trim()) ||
        (input.companyId && String(input.companyId).trim()) ||
        null;
      if (!target) throw new Error("PREPOSTO_PROJECT_REQUIRED");
      return this.upsertPrepostoManagementUser({
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        companyId: target,
        fullName: input.fullName,
        email: input.email,
        cpf: input.cpf ?? null,
        phone: input.phone ?? null
      });
    }

    await this.authTenantService.assertUserHasAnyRole(input.actorUserId, input.tenantId, ["owner", "admin"]);

    const companyId = await this.resolveBackofficeProfileCompanyId({
      tenantId: input.tenantId,
      scopeCompanyId: input.companyId
    });

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
