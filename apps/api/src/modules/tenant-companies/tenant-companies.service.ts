import { CoreAuthTenantService } from "../core-auth-tenant/core-auth-tenant.service.js";
import { TenantCompaniesRepository, type TenantCompanyRow } from "./tenant-companies.repository.js";

export type TenantCompanyDto = {
  id: string;
  tenantId: string;
  name: string;
  taxId: string | null;
  prepostoUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapRow(row: TenantCompanyRow): TenantCompanyDto {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    taxId: row.tax_id,
    prepostoUserId: row.preposto_user_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class TenantCompaniesService {
  constructor(
    private readonly repository: TenantCompaniesRepository,
    private readonly authTenantService: CoreAuthTenantService
  ) {}

  async list(input: { userId: string; tenantId: string }): Promise<TenantCompanyDto[]> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "viewer",
      "preposto"
    ]);
    const ctx = await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    const companyPrivileged = ctx.roles.some((r) => ["owner", "admin", "manager", "analyst"].includes(r));
    const isViewer = ctx.roles.includes("viewer");
    const prepostoRestricted =
      ctx.roles.includes("preposto") && !companyPrivileged && !isViewer;
    if (prepostoRestricted) {
      if (!ctx.prepostoCompanyId) return [];
      const row = await this.repository.findInTenant(input.tenantId, ctx.prepostoCompanyId);
      return row ? [mapRow(row)] : [];
    }
    if (!companyPrivileged && !isViewer) return [];
    const rows = await this.repository.listByTenant(input.tenantId);
    return rows.map(mapRow);
  }

  async create(input: {
    userId: string;
    tenantId: string;
    name: string;
    taxId?: string | null;
  }): Promise<TenantCompanyDto> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, ["owner", "admin"]);
    const name = input.name.trim();
    if (name.length < 2) throw new Error("INVALID_COMPANY_NAME");
    const row = await this.repository.create({
      tenantId: input.tenantId,
      name,
      taxId: input.taxId ?? null
    });
    return mapRow(row);
  }

  async update(input: {
    userId: string;
    tenantId: string;
    companyId: string;
    name?: string;
    taxId?: string | null;
  }): Promise<TenantCompanyDto> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, ["owner", "admin"]);
    if (typeof input.name === "string" && input.name.trim().length < 2) throw new Error("INVALID_COMPANY_NAME");
    const row = await this.repository.update({
      tenantId: input.tenantId,
      companyId: input.companyId,
      name: input.name,
      taxId: input.taxId
    });
    return mapRow(row);
  }

  async delete(input: { userId: string; tenantId: string; companyId: string }): Promise<{ ok: true }> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, ["owner", "admin"]);
    const existing = await this.repository.findInTenant(input.tenantId, input.companyId);
    if (!existing) throw new Error("TENANT_COMPANY_NOT_FOUND");
    const all = await this.repository.listByTenant(input.tenantId);
    if (all.length <= 1) throw new Error("TENANT_COMPANY_LAST_ONE");
    await this.repository.deleteIfEmpty(input.tenantId, input.companyId);
    return { ok: true };
  }

  /** Define ou remove o preposto do contrato (colaborador já vinculado à empresa/projeto). */
  async setPreposto(input: {
    userId: string;
    tenantId: string;
    companyId: string;
    prepostoUserId: string | null;
  }): Promise<TenantCompanyDto> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, ["owner", "admin", "manager"]);
    const existing = await this.repository.findInTenant(input.tenantId, input.companyId);
    if (!existing) throw new Error("TENANT_COMPANY_NOT_FOUND");

    const previousId = existing.preposto_user_id ?? null;

    if (input.prepostoUserId) {
      const ok = await this.repository.userBelongsToTenant(input.tenantId, input.prepostoUserId);
      if (!ok) throw new Error("USER_NOT_IN_TENANT");
    }

    const row = await this.repository.setPrepostoUserId(input.tenantId, input.companyId, input.prepostoUserId);

    if (input.prepostoUserId) {
      await this.repository.upsertPrepostoRole(input.tenantId, input.prepostoUserId);
    }

    if (previousId && previousId !== input.prepostoUserId) {
      const remainingPrev = await this.repository.countPrepostoAssignmentsForUser(input.tenantId, previousId);
      if (remainingPrev === 0) {
        await this.repository.deletePrepostoRole(input.tenantId, previousId);
      }
    }

    if (!input.prepostoUserId && previousId) {
      const remainingPrev = await this.repository.countPrepostoAssignmentsForUser(input.tenantId, previousId);
      if (remainingPrev === 0) {
        await this.repository.deletePrepostoRole(input.tenantId, previousId);
      }
    }

    return mapRow(row);
  }
}
