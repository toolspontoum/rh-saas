import { z } from "zod";

import { AuditLogsService } from "./audit-logs.service.js";

const listAuditLogsSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  action: z.string().min(1).max(120).optional(),
  resourceType: z.string().min(1).max(120).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

const exportAuditLogsSchema = listAuditLogsSchema.pick({
  userId: true,
  tenantId: true,
  companyId: true,
  action: true,
  resourceType: true,
  from: true,
  to: true
}).extend({
  limit: z.coerce.number().int().min(1).max(5000).default(1000)
});

export class AuditLogsHandlers {
  constructor(private readonly service: AuditLogsService) {}

  async list(input: unknown) {
    const payload = listAuditLogsSchema.parse(input);
    return this.service.list(payload);
  }

  async exportCsv(input: unknown) {
    const payload = exportAuditLogsSchema.parse(input);
    return this.service.exportCsv(payload);
  }
}
