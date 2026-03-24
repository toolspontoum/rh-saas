import { supabaseAdmin } from "../../lib/supabase.js";
import { CoreAuthTenantRepository } from "../core-auth-tenant/core-auth-tenant.repository.js";
import { CoreAuthTenantService } from "../core-auth-tenant/core-auth-tenant.service.js";
import { TenantUsersHandlers } from "./tenant-users.handlers.js";
import { TenantUsersRepository } from "./tenant-users.repository.js";
import { TenantUsersService } from "./tenant-users.service.js";

const coreAuthTenantRepository = new CoreAuthTenantRepository(supabaseAdmin);
const coreAuthTenantService = new CoreAuthTenantService(coreAuthTenantRepository);

const tenantUsersRepository = new TenantUsersRepository(supabaseAdmin);
const tenantUsersService = new TenantUsersService(tenantUsersRepository, coreAuthTenantService);

export const tenantUsersHandlers = new TenantUsersHandlers(tenantUsersService);

