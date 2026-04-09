import { supabaseAdmin } from "../../lib/supabase.js";
import { coreAuthTenantService } from "../core-auth-tenant/index.js";
import { tenantUsersService } from "../tenant-users/index.js";
import { workforceService } from "../workforce/index.js";

import { EmployeePreregHandlers } from "./employee-prereg.handlers.js";
import { EmployeePreregRepository } from "./employee-prereg.repository.js";
import { EmployeePreregService } from "./employee-prereg.service.js";

const employeePreregRepository = new EmployeePreregRepository(supabaseAdmin);
const employeePreregService = new EmployeePreregService(
  employeePreregRepository,
  coreAuthTenantService,
  tenantUsersService,
  workforceService
);

export const employeePreregHandlers = new EmployeePreregHandlers(employeePreregService);
