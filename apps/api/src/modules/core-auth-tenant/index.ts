import { supabaseAdmin } from "../../lib/supabase.js";
import { CoreAuthTenantHandlers } from "./core-auth-tenant.handlers.js";
import { CoreAuthTenantRepository } from "./core-auth-tenant.repository.js";
import { CoreAuthTenantService } from "./core-auth-tenant.service.js";

const coreAuthTenantRepository = new CoreAuthTenantRepository(supabaseAdmin);
const coreAuthTenantService = new CoreAuthTenantService(coreAuthTenantRepository);

export const coreAuthTenantHandlers = new CoreAuthTenantHandlers(coreAuthTenantService);

