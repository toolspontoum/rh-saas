import { supabaseAdmin } from "../../lib/supabase.js";
import { coreAuthTenantService } from "../core-auth-tenant/index.js";
import { TenantUsersHandlers } from "./tenant-users.handlers.js";
import { TenantUsersRepository } from "./tenant-users.repository.js";
import { TenantUsersService } from "./tenant-users.service.js";

const tenantUsersRepository = new TenantUsersRepository(supabaseAdmin);
const tenantUsersService = new TenantUsersService(tenantUsersRepository, coreAuthTenantService);

export const tenantUsersHandlers = new TenantUsersHandlers(tenantUsersService);

