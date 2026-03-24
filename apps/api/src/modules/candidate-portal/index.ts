import { supabaseAdmin } from "../../lib/supabase.js";
import { CandidatePortalHandlers } from "./candidate-portal.handlers.js";
import { CandidatePortalRepository } from "./candidate-portal.repository.js";
import { CandidatePortalService } from "./candidate-portal.service.js";

const candidatePortalRepository = new CandidatePortalRepository(supabaseAdmin);
const candidatePortalService = new CandidatePortalService(candidatePortalRepository, supabaseAdmin);

export const candidatePortalHandlers = new CandidatePortalHandlers(candidatePortalService);
