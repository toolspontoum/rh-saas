import { supabaseAdmin } from "../../lib/supabase.js";
import { coreAuthTenantService } from "../core-auth-tenant/index.js";
import { DocumentsPayslipsHandlers } from "./documents-payslips.handlers.js";
import { DocumentsPayslipsRepository } from "./documents-payslips.repository.js";
import { DocumentsPayslipsService } from "./documents-payslips.service.js";

const documentsPayslipsRepository = new DocumentsPayslipsRepository(supabaseAdmin);
const documentsPayslipsService = new DocumentsPayslipsService(
  documentsPayslipsRepository,
  coreAuthTenantService,
  supabaseAdmin
);

export const documentsPayslipsHandlers = new DocumentsPayslipsHandlers(documentsPayslipsService);
