import { CoreAuthTenantRepository } from "../core-auth-tenant/core-auth-tenant.repository.js";
import { CoreAuthTenantService } from "../core-auth-tenant/core-auth-tenant.service.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { RecruitmentHandlers } from "./recruitment.handlers.js";
import { RecruitmentRepository } from "./recruitment.repository.js";
import { RecruitmentService } from "./recruitment.service.js";

const coreAuthTenantRepository = new CoreAuthTenantRepository(supabaseAdmin);
const coreAuthTenantService = new CoreAuthTenantService(coreAuthTenantRepository);

const recruitmentRepository = new RecruitmentRepository(supabaseAdmin);
const recruitmentService = new RecruitmentService(recruitmentRepository, coreAuthTenantService);

export const recruitmentHandlers = new RecruitmentHandlers(recruitmentService);

