import { supabaseAdmin } from "../../lib/supabase.js";
import { PlatformRepository } from "../platform/platform.repository.js";
import { CoreAuthTenantHandlers } from "./core-auth-tenant.handlers.js";
import { CoreAuthTenantRepository } from "./core-auth-tenant.repository.js";
import { CoreAuthTenantService } from "./core-auth-tenant.service.js";

const coreAuthTenantRepository = new CoreAuthTenantRepository(supabaseAdmin);
const platformRepository = new PlatformRepository(supabaseAdmin);
export const coreAuthTenantService = new CoreAuthTenantService(coreAuthTenantRepository, platformRepository);

export const coreAuthTenantHandlers = new CoreAuthTenantHandlers(coreAuthTenantService);

