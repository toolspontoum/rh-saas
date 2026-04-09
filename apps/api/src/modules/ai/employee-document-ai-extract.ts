import { z } from "zod";

import { supabaseAdmin } from "../../lib/supabase.js";
import { isImageMime, isPdfMime, resolveDocumentMimeType } from "./document-media.js";
import { completeJsonWithProvider, completeJsonWithProviderVision, type VisionImagePart } from "./llm-json.js";
import { extractPdfText } from "./pdf-text.js";
import { renderPdfPagesToPngBuffers } from "./pdf-render-pages.js";
import { assertProviderCredentials, resolveEffectiveAiProvider } from "./resolve-provider.js";

const MIN_TEXT_CHARS = 40;

const employeeRowSchema = z.object({
  fullName: z.string().max(160).nullable().optional(),
  personalEmail: z.string().max(255).nullable().optional(),
  cpf: z.string().max(20).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  department: z.string().max(120).nullable().optional(),
  positionTitle: z.string().max(120).nullable().optional(),
  contractType: z.string().max(80).nullable().optional(),
  admissionDate: z.string().nullable().optional(),
  baseSalary: z.number().nonnegative().nullable().optional(),
  employeeTags: z.array(z.string().max(80)).optional().default([])
});

const aiResponseSchema = z.object({
  employees: z.array(employeeRowSchema).min(1).max(40)
});

export type EmployeePreregExtractPayload = {
  fullName: string | null;
  personalEmail: string | null;
  cpf: string | null;
  phone: string | null;
  department: string | null;
  positionTitle: string | null;
  contractType: string | null;
  admissionDate: string | null;
  baseSalary: number | null;
  employeeTags: string[];
};

async function parseSpreadsheet(buffer: Buffer): Promise<string> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("EMPTY_SPREADSHEET");
  const sheet = wb.Sheets[sheetName];
  if (!sheet) throw new Error("EMPTY_SPREADSHEET");
  const csv = XLSX.utils.sheet_to_csv(sheet);
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) throw new Error("EMPTY_SPREADSHEET");
  return lines.slice(0, 120).join("\n");
}

async function buildEmployeeImportContext(
  buffer: Buffer,
  fileName: string,
  mimeType: string | null
): Promise<{ text: string; images: VisionImagePart[] }> {
  const mime = await resolveDocumentMimeType({ buffer, fileName, dbMimeType: mimeType });
  const lower = fileName.toLowerCase();
  const isCsv = lower.endsWith(".csv") || mime === "text/csv" || mime === "application/csv";
  const isXlsx =
    lower.endsWith(".xlsx") ||
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const isXls = lower.endsWith(".xls") || mime === "application/vnd.ms-excel";

  if (isCsv || isXlsx || isXls) {
    const text = await parseSpreadsheet(buffer);
    return { text, images: [] };
  }

  const visionOk = (m: string) =>
    m === "image/jpeg" || m === "image/png" || m === "image/webp" || m === "image/gif";

  if (isImageMime(mime) && visionOk(mime)) {
    return { text: "", images: [{ mimeType: mime, base64: buffer.toString("base64") }] };
  }

  if (isPdfMime(mime) || buffer.subarray(0, 5).toString() === "%PDF-") {
    const t = await extractPdfText(buffer);
    if (t.length >= MIN_TEXT_CHARS) {
      return { text: t.slice(0, 120_000), images: [] };
    }
    const pngs = await renderPdfPagesToPngBuffers(buffer, { maxPages: 4, maxLongEdgePx: 1536 });
    const images: VisionImagePart[] = [];
    for (const png of pngs) {
      if (images.length >= 8) break;
      images.push({ mimeType: "image/png", base64: png.toString("base64") });
    }
    return { text: "", images };
  }

  return { text: "", images: [] };
}

function normalizeDate(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const m = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const br = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
}

function normalizePayload(row: z.infer<typeof employeeRowSchema>): EmployeePreregExtractPayload {
  const cpfDigits = row.cpf ? row.cpf.replace(/\D/g, "") : "";
  const phoneDigits = row.phone ? row.phone.replace(/\D/g, "") : "";
  let email = row.personalEmail?.trim().toLowerCase() ?? null;
  if (email && !email.includes("@")) email = null;

  return {
    fullName: row.fullName?.trim() || null,
    personalEmail: email,
    cpf: cpfDigits.length === 11 ? cpfDigits : null,
    phone: phoneDigits.length >= 10 && phoneDigits.length <= 13 ? phoneDigits : null,
    department: row.department?.trim() || null,
    positionTitle: row.positionTitle?.trim() || null,
    contractType: row.contractType?.trim() || null,
    admissionDate: normalizeDate(row.admissionDate ?? null),
    baseSalary: row.baseSalary ?? null,
    employeeTags: row.employeeTags?.length ? row.employeeTags.map((t) => t.trim()).filter(Boolean) : []
  };
}

export async function extractEmployeesFromImportFile(input: {
  tenantId: string;
  buffer: Buffer;
  fileName: string;
  mimeType: string | null;
}): Promise<EmployeePreregExtractPayload[]> {
  const provider = await resolveEffectiveAiProvider(supabaseAdmin, input.tenantId);
  if (!provider) throw new Error("AI_PROVIDER_DISABLED");
  await assertProviderCredentials(provider);

  const { text, images } = await buildEmployeeImportContext(input.buffer, input.fileName, input.mimeType);
  if (text.length < MIN_TEXT_CHARS && images.length === 0) {
    throw new Error("EMPLOYEE_IMPORT_UNREADABLE_FILE");
  }

  const system = `Você extrai dados de ficha cadastral de colaborador (Brasil) para JSON. Responda apenas JSON válido.
Datas de admissão preferencialmente YYYY-MM-DD; use null se não houver ou for ilegível.
baseSalary: número em reais (mensal), sem texto.
CPF e telefone: apenas dígitos quando possível.
personalEmail: e-mail se constar no documento; null se ausente.
Para planilhas com várias linhas (uma por funcionário), inclua um objeto em "employees" por linha (máximo 40).
Para documento único (PDF/ficha/imagem), retorne um único objeto na lista.
Não invente dados que não apareçam no conteúdo.`;

  const userText = `${text.length >= MIN_TEXT_CHARS ? `Conteúdo:\n${text}\n\n` : ""}${
    images.length > 0 ? `Há ${images.length} imagem(ns) — leia todo o texto visível da ficha.\n\n` : ""
  }Schema JSON de saída:
{"employees":[{"fullName":string|null,"personalEmail":string|null,"cpf":string|null,"phone":string|null,"department":string|null,"positionTitle":string|null,"contractType":string|null,"admissionDate":string|null,"baseSalary":number|null,"employeeTags":string[]}]}`;

  const raw =
    images.length > 0
      ? await completeJsonWithProviderVision({ provider, system, userText, images })
      : await completeJsonWithProvider({ provider, system, user: userText });

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new Error("AI_JSON_PARSE_FAILED");
  }

  const parsed = aiResponseSchema.parse(parsedJson);
  return parsed.employees.map((row) => normalizePayload(row));
}
