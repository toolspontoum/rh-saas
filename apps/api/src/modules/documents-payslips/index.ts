import { supabaseAdmin } from "../../lib/supabase.js";
import { CoreAuthTenantRepository } from "../core-auth-tenant/core-auth-tenant.repository.js";
import { CoreAuthTenantService } from "../core-auth-tenant/core-auth-tenant.service.js";
import { DocumentsPayslipsHandlers } from "./documents-payslips.handlers.js";
import { DocumentsPayslipsRepository } from "./documents-payslips.repository.js";
import { DocumentsPayslipsService } from "./documents-payslips.service.js";

const coreAuthTenantRepository = new CoreAuthTenantRepository(supabaseAdmin);
const coreAuthTenantService = new CoreAuthTenantService(coreAuthTenantRepository);

const documentsPayslipsRepository = new DocumentsPayslipsRepository(supabaseAdmin);
const documentsPayslipsService = new DocumentsPayslipsService(
  documentsPayslipsRepository,
  coreAuthTenantService,
  supabaseAdmin
);

export const documentsPayslipsHandlers = new DocumentsPayslipsHandlers(documentsPayslipsService);
