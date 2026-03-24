import { supabaseAdmin } from "../../lib/supabase.js";
import { CoreAuthTenantRepository } from "../core-auth-tenant/core-auth-tenant.repository.js";
import { CoreAuthTenantService } from "../core-auth-tenant/core-auth-tenant.service.js";
import { TenantCompaniesHandlers } from "./tenant-companies.handlers.js";
import { TenantCompaniesRepository } from "./tenant-companies.repository.js";
import { TenantCompaniesService } from "./tenant-companies.service.js";

const coreAuthTenantRepository = new CoreAuthTenantRepository(supabaseAdmin);
const coreAuthTenantService = new CoreAuthTenantService(coreAuthTenantRepository);
const tenantCompaniesRepository = new TenantCompaniesRepository(supabaseAdmin);
const tenantCompaniesService = new TenantCompaniesService(tenantCompaniesRepository, coreAuthTenantService);

export const tenantCompaniesHandlers = new TenantCompaniesHandlers(tenantCompaniesService);
export { TenantCompaniesRepository };
