import { supabaseAdmin } from "../../lib/supabase.js";
import { CoreAuthTenantRepository } from "../core-auth-tenant/core-auth-tenant.repository.js";
import { CoreAuthTenantService } from "../core-auth-tenant/core-auth-tenant.service.js";
import { WorkforceHandlers } from "./workforce.handlers.js";
import { WorkforceRepository } from "./workforce.repository.js";
import { WorkforceService } from "./workforce.service.js";

const coreAuthTenantRepository = new CoreAuthTenantRepository(supabaseAdmin);
const coreAuthTenantService = new CoreAuthTenantService(coreAuthTenantRepository);

const workforceRepository = new WorkforceRepository(supabaseAdmin);
const workforceService = new WorkforceService(workforceRepository, coreAuthTenantService);

export const workforceHandlers = new WorkforceHandlers(workforceService);

