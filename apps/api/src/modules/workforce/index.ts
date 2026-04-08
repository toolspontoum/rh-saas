import { supabaseAdmin } from "../../lib/supabase.js";
import { coreAuthTenantService } from "../core-auth-tenant/index.js";
import { WorkforceHandlers } from "./workforce.handlers.js";
import { WorkforceRepository } from "./workforce.repository.js";
import { WorkforceService } from "./workforce.service.js";

const workforceRepository = new WorkforceRepository(supabaseAdmin);
const workforceService = new WorkforceService(workforceRepository, coreAuthTenantService);

export const workforceHandlers = new WorkforceHandlers(workforceService);

export { workforceService };

