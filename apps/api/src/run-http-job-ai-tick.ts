import { runPayslipAiLinkQueueNow, runResumeAnalysisQueueNow } from "./modules/ai/schedule.js";

/** Ciclo das filas IA para agendador HTTP (Vercel Cron) — aguarda o drain parcial. */
export async function runAiQueueTickFromHttpJob(): Promise<{
  payslipsProcessed: number;
  payslipsRequeuedStale: number;
  resumesProcessed: number;
}> {
  const payslips = await runPayslipAiLinkQueueNow(8);
  const resumesProcessed = await runResumeAnalysisQueueNow(5);
  return {
    payslipsProcessed: payslips.processed,
    payslipsRequeuedStale: payslips.requeuedStale,
    resumesProcessed
  };
}
