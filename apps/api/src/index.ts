import { createApp } from "./create-app.js";
import { env } from "./config/env.js";
import { kickPayslipAiLinkQueue, kickResumeAnalysisQueue } from "./modules/ai/schedule.js";

function main() {
  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`[api] running on port ${env.PORT} (${env.NODE_ENV})`);
    console.log(`[api] supabase project ${env.SUPABASE_PROJECT_REF}`);
  });

  if (env.AI_PAYSLIP_QUEUE_MS > 0) {
    setInterval(() => {
      kickPayslipAiLinkQueue();
    }, env.AI_PAYSLIP_QUEUE_MS);
  }

  if (env.AI_RESUME_QUEUE_MS > 0) {
    kickResumeAnalysisQueue();
    setInterval(() => {
      kickResumeAnalysisQueue();
    }, env.AI_RESUME_QUEUE_MS);
  }
}

main();
