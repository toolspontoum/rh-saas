import { supabaseAdmin } from "../../lib/supabase.js";
import { coreAuthTenantService } from "../core-auth-tenant/index.js";
import { AuditLogsHandlers } from "./audit-logs.handlers.js";
import { AuditLogsRepository } from "./audit-logs.repository.js";
import { AuditLogsService } from "./audit-logs.service.js";

const auditLogsRepository = new AuditLogsRepository(supabaseAdmin);
const auditLogsService = new AuditLogsService(auditLogsRepository, coreAuthTenantService);

export const auditLogsHandlers = new AuditLogsHandlers(auditLogsService);

