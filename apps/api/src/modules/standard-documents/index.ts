import { supabaseAdmin } from "../../lib/supabase.js";
import { CoreAuthTenantRepository } from "../core-auth-tenant/core-auth-tenant.repository.js";
import { CoreAuthTenantService } from "../core-auth-tenant/core-auth-tenant.service.js";
import { DocumentsPayslipsRepository } from "../documents-payslips/documents-payslips.repository.js";
import { StandardDocumentsHandlers } from "./standard-documents.handlers.js";
import { StandardDocumentsRepository } from "./standard-documents.repository.js";
import { StandardDocumentsService } from "./standard-documents.service.js";

const coreAuthTenantRepository = new CoreAuthTenantRepository(supabaseAdmin);
const coreAuthTenantService = new CoreAuthTenantService(coreAuthTenantRepository);

const standardDocumentsRepository = new StandardDocumentsRepository(supabaseAdmin);
const documentsPayslipsRepository = new DocumentsPayslipsRepository(supabaseAdmin);
const standardDocumentsService = new StandardDocumentsService(
  standardDocumentsRepository,
  documentsPayslipsRepository
);

export const standardDocumentsHandlers = new StandardDocumentsHandlers(standardDocumentsService, coreAuthTenantService);
