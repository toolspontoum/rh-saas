import { z } from "zod";

import { env } from "../../config/env.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { DocumentsPayslipsRepository } from "../documents-payslips/documents-payslips.repository.js";
import { completeJsonWithProvider } from "./llm-json.js";
import { extractPdfText } from "./pdf-text.js";
import { assertProviderCredentials, resolveEffectiveAiProvider } from "./resolve-provider.js";

const cpfSchema = z.object({
  cpfDigits: z.union([z.string().regex(/^\d{11}$/), z.null()]).optional()
});

function normalizeCpfDigits(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = raw.replace(/\D/g, "");
  if (d.length === 11) return d;
  return null;
}

function extractCpfHeuristic(text: string): string | null {
  const matches = text.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{11}/g);
  if (!matches) return null;
  for (const m of matches) {
    const d = m.replace(/\D/g, "");
    if (d.length === 11) return d;
  }
  return null;
}

export async function runPayslipAiLink(input: {
  payslipId: string;
  tenantId: string;
  repository: DocumentsPayslipsRepository;
}): Promise<void> {
  const { payslipId, tenantId, repository } = input;

  const { data: claim, error: claimError } = await supabaseAdmin
    .from("payslips")
    .update({ ai_link_status: "processing", ai_link_error: null })
    .eq("tenant_id", tenantId)
    .eq("id", payslipId)
    .eq("ai_link_status", "queued")
    .select("id, file_path, company_id")
    .maybeSingle();

  if (claimError) throw claimError;
  if (!claim) return;

  const filePath = (claim as { file_path: string }).file_path;
  const companyId = (claim as { company_id: string }).company_id;

  try {
    const provider = await resolveEffectiveAiProvider(supabaseAdmin, tenantId);
    if (!provider) {
      await repository.updatePayslipAiLinkResult({
        tenantId,
        payslipId,
        aiLinkStatus: "failed",
        aiLinkError: "AI_PROVIDER_DISABLED",
        extractedCpf: null
      });
      return;
    }
    await assertProviderCredentials(provider);

    const { data: file, error: dlErr } = await supabaseAdmin.storage
      .from(env.STORAGE_BUCKET_PAYSLIPS)
      .download(filePath);
    if (dlErr || !file) {
      await repository.updatePayslipAiLinkResult({
        tenantId,
        payslipId,
        aiLinkStatus: "failed",
        aiLinkError: "PDF_DOWNLOAD_FAILED",
        extractedCpf: null
      });
      return;
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const text = await extractPdfText(buf);
    let digits: string | null = extractCpfHeuristic(text);

    if (!digits) {
      const system =
        "Extraia o CPF do funcionário neste contracheque brasileiro. Responda só JSON: {\"cpfDigits\":\"12345678901\"} ou {\"cpfDigits\":null} se não houver.";
      const user = `Texto do PDF (parcial):\n${text.slice(0, 24_000)}`;
      const raw = await completeJsonWithProvider({ provider, system, user });
      try {
        const parsed = cpfSchema.parse(JSON.parse(raw));
        digits = normalizeCpfDigits(parsed.cpfDigits ?? null);
      } catch {
        digits = null;
      }
    }

    if (!digits) {
      await repository.updatePayslipAiLinkResult({
        tenantId,
        payslipId,
        aiLinkStatus: "failed",
        aiLinkError: "CPF_NOT_FOUND",
        extractedCpf: null
      });
      return;
    }

    const employee = await repository.findEmployeeContextByCpf(tenantId, companyId, digits);
    if (!employee) {
      await repository.updatePayslipAiLinkResult({
        tenantId,
        payslipId,
        aiLinkStatus: "failed",
        aiLinkError: "EMPLOYEE_NOT_FOUND_FOR_CPF",
        extractedCpf: digits
      });
      return;
    }

    const email =
      employee.personalEmail?.trim().toLowerCase() ||
      (employee.authEmail ? employee.authEmail.trim().toLowerCase() : "") ||
      `sem-email-${employee.userId.slice(0, 8)}@colaborador.placeholder`;

    await repository.updatePayslipLinkedEmployee({
      tenantId,
      payslipId,
      employeeUserId: employee.userId,
      collaboratorName: employee.fullName?.trim() || "Colaborador",
      collaboratorEmail: email,
      extractedCpf: digits
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await repository.updatePayslipAiLinkResult({
      tenantId,
      payslipId,
      aiLinkStatus: "failed",
      aiLinkError: message.slice(0, 2000),
      extractedCpf: null
    });
  }
}
