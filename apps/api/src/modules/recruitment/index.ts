import { supabaseAdmin } from "../../lib/supabase.js";
import { coreAuthTenantService } from "../core-auth-tenant/index.js";
import { RecruitmentHandlers } from "./recruitment.handlers.js";
import { RecruitmentRepository } from "./recruitment.repository.js";
import { RecruitmentService } from "./recruitment.service.js";

const recruitmentRepository = new RecruitmentRepository(supabaseAdmin);
const recruitmentService = new RecruitmentService(recruitmentRepository, coreAuthTenantService);

export const recruitmentHandlers = new RecruitmentHandlers(recruitmentService);

