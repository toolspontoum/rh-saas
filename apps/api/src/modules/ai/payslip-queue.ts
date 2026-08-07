import type { DocumentsPayslipsRepository } from "../documents-payslips/documents-payslips.repository.js";
import { runPayslipAiLink } from "./payslip-link.runner.js";

export async function payslipAiQueueTick(
  repository: DocumentsPayslipsRepository,
  options?: { limit?: number; requeueStaleMinutes?: number }
): Promise<{ processed: number; requeuedStale: number }> {
  const limit = Math.max(1, Math.min(options?.limit ?? 5, 20));
  const requeuedStale = await repository.requeueStaleProcessingPayslips(
    options?.requeueStaleMinutes ?? 15
  );

  let processed = 0;
  for (let i = 0; i < limit; i += 1) {
    const next = await repository.findNextQueuedPayslipForAi();
    if (!next) break;
    await runPayslipAiLink({
      payslipId: next.id,
      tenantId: next.tenantId,
      repository
    });
    processed += 1;
  }
  return { processed, requeuedStale };
}
