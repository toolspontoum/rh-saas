import { CoreAuthTenantService } from "../core-auth-tenant/core-auth-tenant.service.js";
import { AuditLogsRepository } from "./audit-logs.repository.js";
import type { AuditLog, PaginatedAuditLogs } from "./audit-logs.types.js";

export class AuditLogsService {
  constructor(
    private readonly repository: AuditLogsRepository,
    private readonly authTenantService: CoreAuthTenantService
  ) {}

  async list(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    action?: string;
    resourceType?: string;
    from?: string;
    to?: string;
    page: number;
    pageSize: number;
  }): Promise<PaginatedAuditLogs> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager"
    ]);

    return this.repository.listByTenant({
      tenantId: input.tenantId,
      action: input.action,
      resourceType: input.resourceType,
      from: input.from,
      to: input.to,
      page: input.page,
      pageSize: input.pageSize
    });
  }

  async exportCsv(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    action?: string;
    resourceType?: string;
    from?: string;
    to?: string;
    limit: number;
  }): Promise<string> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager"
    ]);

    const logs = await this.repository.listForExport({
      tenantId: input.tenantId,
      companyId: input.companyId,
      action: input.action,
      resourceType: input.resourceType,
      from: input.from,
      to: input.to,
      limit: input.limit
    });

    return toCsv(logs);
  }
}

function csvEscape(value: unknown): string {
  const stringValue =
    typeof value === "string" ? value : value === null || value === undefined ? "" : JSON.stringify(value);
  const escaped = stringValue.replace(/"/g, "\"\"");
  return `"${escaped}"`;
}

function toCsv(rows: AuditLog[]): string {
  const header = [
    "id",
    "tenantId",
    "actorUserId",
    "action",
    "resourceType",
    "resourceId",
    "result",
    "metadata",
    "createdAt"
  ];
  const lines = [header.join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.tenantId,
        row.actorUserId ?? "",
        row.action,
        row.resourceType,
        row.resourceId ?? "",
        row.result,
        JSON.stringify(row.metadata),
        row.createdAt
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  return lines.join("\n");
}
