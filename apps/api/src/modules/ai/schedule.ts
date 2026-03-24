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
export function kickResumeAnalysisQueue(): void {
  setImmediate(() => {
    void (async () => {
      let pending: Array<{ tenantId: string; applicationId: string }>;
      try {
        pending = await recruitmentRepository.listPendingResumeApplicationsForAi(5);
      } catch (err) {
        console.error("[ai] resume queue list failed", err);
        return;
      }
      for (const row of pending) {
        try {
          await runApplicationResumeAnalysis({
            tenantId: row.tenantId,
            applicationId: row.applicationId,
            repository: recruitmentRepository
          });
        } catch (err) {
          console.error("[ai] resume queue item failed", row.applicationId, err);
        }
      }
    })();
  });
}

export function kickPayslipAiLinkQueue(): void {
  setImmediate(() => {
    void payslipAiQueueTick(documentsRepository).catch((err) => console.error("[ai] payslip queue", err));
  });
}
