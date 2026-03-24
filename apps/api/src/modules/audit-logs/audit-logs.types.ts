export type AuditLog = {
  id: number;
  tenantId: string;
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  result: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ListAuditLogsInput = {
  tenantId: string;
  companyId?: string | null;
  action?: string;
  resourceType?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
};

export type PaginatedAuditLogs = {
  items: AuditLog[];
  page: number;
  pageSize: number;
};

export type ExportAuditLogsInput = Omit<ListAuditLogsInput, "page" | "pageSize"> & {
  limit: number;
};
