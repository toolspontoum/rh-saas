import { supabaseAdmin } from "../../lib/supabase.js";
import { coreAuthTenantService } from "../core-auth-tenant/index.js";
import { TenantCompaniesHandlers } from "./tenant-companies.handlers.js";
import { TenantCompaniesRepository } from "./tenant-companies.repository.js";
import { TenantCompaniesService } from "./tenant-companies.service.js";

const tenantCompaniesRepository = new TenantCompaniesRepository(supabaseAdmin);
const tenantCompaniesService = new TenantCompaniesService(tenantCompaniesRepository, coreAuthTenantService);

export const tenantCompaniesHandlers = new TenantCompaniesHandlers(tenantCompaniesService);
export { TenantCompaniesRepository, tenantCompaniesService };
