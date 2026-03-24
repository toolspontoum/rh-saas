import { supabaseAdmin } from "../../lib/supabase.js";
import { PlatformHandlers } from "./platform.handlers.js";
import { PlatformRepository } from "./platform.repository.js";
import { PlatformService } from "./platform.service.js";

const platformRepository = new PlatformRepository(supabaseAdmin);
const platformService = new PlatformService(platformRepository);

export const platformHandlers = new PlatformHandlers(platformService);
