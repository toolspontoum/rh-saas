import { CoreAuthTenantService } from "../core-auth-tenant/core-auth-tenant.service.js";
import { TenantCompaniesRepository, type TenantCompanyRow } from "./tenant-companies.repository.js";

export type TenantCompanyDto = {
  id: string;
  tenantId: string;
  name: string;
  taxId: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapRow(row: TenantCompanyRow): TenantCompanyDto {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    taxId: row.tax_id,
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
      "viewer"
    ]);
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
}
