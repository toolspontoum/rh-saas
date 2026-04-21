import { kickPayslipAiLinkQueue, kickResumeAnalysisQueue } from "./modules/ai/schedule.js";

/** Dispara um ciclo das filas IA (uso por agendador HTTP na Vercel). */
export function runAiQueueTickFromHttpJob(): void {
  kickPayslipAiLinkQueue();
  kickResumeAnalysisQueue();
}
