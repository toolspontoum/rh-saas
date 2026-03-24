import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AuditLog,
  ExportAuditLogsInput,
  ListAuditLogsInput,
  PaginatedAuditLogs
} from "./audit-logs.types.js";

type AuditLogRow = {
  id: number;
  tenant_id: string;
  actor_user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  result: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

function mapAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    actorUserId: row.actor_user_id,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    result: row.result,
    metadata: row.metadata ?? {},
    createdAt: row.created_at
  };
}

export class AuditLogsRepository {
  constructor(private readonly db: SupabaseClient) {}

  private applyFilters(
    query: any,
    input: {
      tenantId: string;
      companyId?: string | null;
      action?: string;
      resourceType?: string;
      from?: string;
      to?: string;
    }
  ) {
    let q = query.eq("tenant_id", input.tenantId).order("created_at", { ascending: false });

    if (input.companyId) {
      q = q.eq("company_id", input.companyId);
    }

    if (input.action) {
      q = q.ilike("action", `%${input.action}%`);
    }

    if (input.resourceType) {
      q = q.eq("resource_type", input.resourceType);
    }

    if (input.from) {
      q = q.gte("created_at", input.from);
    }

    if (input.to) {
      q = q.lte("created_at", input.to);
    }

    return q;
  }

  async listByTenant(input: ListAuditLogsInput): Promise<PaginatedAuditLogs> {
    let query = this.db.from("audit_logs").select("*");
    query = this.applyFilters(query, input);

    const offset = (input.page - 1) * input.pageSize;
    const { data, error } = await query.range(offset, offset + input.pageSize - 1);
    if (error) throw error;

    return {
      items: ((data ?? []) as AuditLogRow[]).map(mapAuditLog),
      page: input.page,
      pageSize: input.pageSize
    };
  }

  async listForExport(input: ExportAuditLogsInput): Promise<AuditLog[]> {
    let query = this.db
      .from("audit_logs")
      .select("*");
    query = this.applyFilters(query, input);
    const { data, error } = await query.range(0, input.limit - 1);
    if (error) throw error;
    return ((data ?? []) as AuditLogRow[]).map(mapAuditLog);
  }
}
