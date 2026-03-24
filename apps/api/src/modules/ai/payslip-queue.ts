import { supabaseAdmin } from "../../lib/supabase.js";
import type { DocumentsPayslipsRepository } from "../documents-payslips/documents-payslips.repository.js";
import { runPayslipAiLink } from "./payslip-link.runner.js";

export async function payslipAiQueueTick(repository: DocumentsPayslipsRepository): Promise<void> {
  const next = await repository.findNextQueuedPayslipForAi();
  if (!next) return;
  await runPayslipAiLink({
    payslipId: next.id,
    tenantId: next.tenantId,
    repository
  });
}
