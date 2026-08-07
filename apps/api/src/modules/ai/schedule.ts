import { DocumentsPayslipsRepository } from "../documents-payslips/documents-payslips.repository.js";
import { RecruitmentRepository } from "../recruitment/recruitment.repository.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { payslipAiQueueTick } from "./payslip-queue.js";
import { runApplicationResumeAnalysis } from "./resume-analysis.runner.js";

const recruitmentRepository = new RecruitmentRepository(supabaseAdmin);
const documentsRepository = new DocumentsPayslipsRepository(supabaseAdmin);

export function scheduleApplicationResumeAnalysis(tenantId: string, applicationId: string): void {
  setImmediate(() => {
    void runApplicationResumeAnalysis({
      tenantId,
      applicationId,
      repository: recruitmentRepository
    }).catch((err) => console.error("[ai] resume analysis failed", err));
  });
}

/** Reprocessa candidaturas ainda em pending (fila única; o claim no runner evita duplicidade). */
export async function runResumeAnalysisQueueNow(limit = 5): Promise<number> {
  let pending: Array<{ tenantId: string; applicationId: string }>;
  try {
    pending = await recruitmentRepository.listPendingResumeApplicationsForAi(limit);
  } catch (err) {
    console.error("[ai] resume queue list failed", err);
    return 0;
  }
  let processed = 0;
  for (const row of pending) {
    try {
      await runApplicationResumeAnalysis({
        tenantId: row.tenantId,
        applicationId: row.applicationId,
        repository: recruitmentRepository
      });
      processed += 1;
    } catch (err) {
      console.error("[ai] resume queue item failed", row.applicationId, err);
    }
  }
  return processed;
}

export function kickResumeAnalysisQueue(): void {
  setImmediate(() => {
    void runResumeAnalysisQueueNow(5).catch((err) => console.error("[ai] resume queue", err));
  });
}

export async function runPayslipAiLinkQueueNow(
  limit = 5
): Promise<{ processed: number; requeuedStale: number }> {
  return payslipAiQueueTick(documentsRepository, { limit });
}

export function kickPayslipAiLinkQueue(): void {
  setImmediate(() => {
    void payslipAiQueueTick(documentsRepository, { limit: 3 }).catch((err) =>
      console.error("[ai] payslip queue", err)
    );
  });
}
