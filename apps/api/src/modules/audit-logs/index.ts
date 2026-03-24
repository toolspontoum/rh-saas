import { supabaseAdmin } from "../../lib/supabase.js";
import { CoreAuthTenantRepository } from "../core-auth-tenant/core-auth-tenant.repository.js";
import { CoreAuthTenantService } from "../core-auth-tenant/core-auth-tenant.service.js";
import { AuditLogsHandlers } from "./audit-logs.handlers.js";
import { AuditLogsRepository } from "./audit-logs.repository.js";
import { AuditLogsService } from "./audit-logs.service.js";

const coreAuthTenantRepository = new CoreAuthTenantRepository(supabaseAdmin);
const coreAuthTenantService = new CoreAuthTenantService(coreAuthTenantRepository);

const auditLogsRepository = new AuditLogsRepository(supabaseAdmin);
const auditLogsService = new AuditLogsService(auditLogsRepository, coreAuthTenantService);

export const auditLogsHandlers = new AuditLogsHandlers(auditLogsService);

