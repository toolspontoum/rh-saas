import { z } from "zod";

import { env } from "../../config/env.js";
import { hasAiScreeningInput, parseJobAiScreeningCriteria, type JobAiScreeningCriteria } from "../../lib/ai-screening-criteria.js";
import { normalizeSkillList } from "../../lib/skill-tags.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { RecruitmentRepository } from "../recruitment/recruitment.repository.js";
import {
  completeJsonWithProvider,
  completeJsonWithProviderVision,
  type VisionImagePart
} from "./llm-json.js";
import { isImageMime, isPdfMime, resolveDocumentMimeType } from "./document-media.js";
import { extractPdfText } from "./pdf-text.js";
import { renderPdfPagesToPngBuffers } from "./pdf-render-pages.js";
import { assertProviderCredentials, resolveEffectiveAiProvider } from "./resolve-provider.js";

const MIN_TEXT_CHARS = 40;
const MAX_VISION_IMAGES = 8;

function isVisionSupportedImageMime(mime: string): boolean {
  const m = mime.toLowerCase();
  return m === "image/jpeg" || m === "image/png" || m === "image/webp" || m === "image/gif";
}

async function collectResumeTextsAndImages(input: {
  resumeBuffer: Buffer | null;
  resumeFileName: string | null;
  resumeMimeType: string | null;
  extraDocs: Array<{ buffer: Buffer; label: string; fileName: string }>;
}): Promise<{ textParts: string[]; images: VisionImagePart[] }> {
  const textParts: string[] = [];
  const images: VisionImagePart[] = [];

  async function consumeBuffer(buffer: Buffer, label: string, fileName: string | null, dbMime: string | null) {
    const mime = await resolveDocumentMimeType({ buffer, fileName, dbMimeType: dbMime });

    if (isImageMime(mime) && isVisionSupportedImageMime(mime)) {
      if (images.length < MAX_VISION_IMAGES) {
        images.push({ mimeType: mime, base64: buffer.toString("base64") });
      }
      return;
    }

    if (isImageMime(mime) && !isVisionSupportedImageMime(mime)) {
      return;
    }

    if (isPdfMime(mime) || buffer.subarray(0, 5).toString() === "%PDF-") {
      const t = await extractPdfText(buffer);
      if (t.length >= MIN_TEXT_CHARS) {
        textParts.push(`--- ${label} ---\n${t.slice(0, 120_000)}`);
        return;
      }
      try {
        const pngs = await renderPdfPagesToPngBuffers(buffer, { maxPages: 4, maxLongEdgePx: 1536 });
        for (const png of pngs) {
          if (images.length >= MAX_VISION_IMAGES) break;
          images.push({ mimeType: "image/png", base64: png.toString("base64") });
        }
      } catch {
        /* PDF render falhou (arquivo corrompido ou ambiente sem worker) */
      }
    }
  }

  if (input.resumeBuffer) {
    await consumeBuffer(
      input.resumeBuffer,
      "CURRICULO",
      input.resumeFileName,
      input.resumeMimeType
    );
  }

  for (const doc of input.extraDocs) {
    await consumeBuffer(doc.buffer, doc.label, doc.fileName, null);
  }

  return { textParts, images };
}

const aiCvResponseSchema = z.object({
  matchScore: z.union([z.number().min(0).max(100), z.null()]).optional(),
  criteria: z
    .object({
      keywords: z.object({ met: z.boolean(), evidence: z.string() }).optional(),
      formation: z.object({ met: z.boolean(), evidence: z.string() }).optional(),
      certificates: z.object({ met: z.boolean(), evidence: z.string() }).optional(),
      experience: z.object({ met: z.boolean(), evidence: z.string() }).optional()
    })
    .optional(),
  suggestedSkillTags: z.array(z.string()).optional().default([])
});

function buildCriteriaPrompt(criteria: JobAiScreeningCriteria, hasCriteria: boolean): string {
  if (!hasCriteria) {
    return "Não há critérios obrigatórios configurados na vaga. Retorne matchScore null e criteria vazio {}; extraia apenas suggestedSkillTags úteis alinhadas às habilidades da vaga quando fizer sentido.";
  }
  return `Critérios configurados pelo recrutador (JSON):\n${JSON.stringify(criteria, null, 2)}\n\nAvalie cada eixo (keywords, formation, certificates, experience) com met true/false e evidence curta em português. O matchScore (0-100) deve refletir o peso dos critérios atendidos (use julgamento equilibrado).`;
}

function fallbackScoreFromCriteria(parsed: z.infer<typeof aiCvResponseSchema>, criteria: JobAiScreeningCriteria): number | null {
  if (!hasAiScreeningInput(criteria)) return null;
  const c = parsed.criteria ?? {};
  const checks: boolean[] = [];
  if (criteria.keywords.length > 0) checks.push(Boolean(c.keywords?.met));
  if (criteria.formation) checks.push(Boolean(c.formation?.met));
  if (criteria.certificates.length > 0) checks.push(Boolean(c.certificates?.met));
  if (criteria.experienceRole || criteria.experienceMonths != null) checks.push(Boolean(c.experience?.met));
  if (checks.length === 0) return null;
  const met = checks.filter(Boolean).length;
  return Math.round((met / checks.length) * 100);
}

export async function runApplicationResumeAnalysis(input: {
  tenantId: string;
  applicationId: string;
  repository: RecruitmentRepository;
}): Promise<void> {
  const { tenantId, applicationId, repository } = input;

  const { data: claim, error: claimError } = await supabaseAdmin
    .from("job_applications")
    .update({ ai_analysis_status: "processing", ai_analysis_error: null })
    .eq("tenant_id", tenantId)
    .eq("id", applicationId)
    .eq("ai_analysis_status", "pending")
    .select("id, job_id, candidate_id")
    .maybeSingle();

  if (claimError) throw claimError;
  if (!claim) return;

  try {
    const provider = await resolveEffectiveAiProvider(supabaseAdmin, tenantId);
    if (!provider) {
      await repository.updateApplicationAiAnalysis({
        tenantId,
        applicationId,
        aiAnalysisStatus: "skipped",
        aiAnalysisError: null,
        aiMatchScore: null,
        aiMatchReport: { reason: "AI_PROVIDER_DISABLED" },
        aiAnalyzedAt: new Date().toISOString()
      });
      return;
    }
    await assertProviderCredentials(provider);

    const jobId = (claim as { job_id: string }).job_id;
    const job = await repository.getJobById(tenantId, jobId);
    if (!job) throw new Error("JOB_NOT_FOUND");

    const application = await repository.getTenantApplicationById({ tenantId, applicationId });
    if (!application) throw new Error("APPLICATION_NOT_FOUND");

    const criteria = job.aiScreeningCriteria ?? parseJobAiScreeningCriteria(null);
    const hasCriteria = hasAiScreeningInput(criteria);

    let resumeBuffer: Buffer | null = null;
    const resumePath = application.candidateProfile?.resumeFilePath ?? null;
    const resumeFileName = application.candidateProfile?.resumeFileName ?? null;
    const resumeMimeType = application.candidateProfile?.resumeMimeType ?? null;
    if (resumePath) {
      const { data: file, error: dlErr } = await supabaseAdmin.storage
        .from(env.STORAGE_BUCKET_CANDIDATE_RESUMES)
        .download(resumePath);
      if (!dlErr && file) {
        resumeBuffer = Buffer.from(await file.arrayBuffer());
      }
    }

    const extraDocs: Array<{ buffer: Buffer; label: string; fileName: string }> = [];
    const docs = await repository.listDocumentsForJobApplication(tenantId, applicationId);
    for (const doc of docs) {
      const { data: file, error: dErr } = await supabaseAdmin.storage
        .from(env.STORAGE_BUCKET_DOCUMENTS)
        .download(doc.filePath);
      if (dErr || !file) continue;
      const buf = Buffer.from(await file.arrayBuffer());
      const baseName = doc.filePath.split("/").pop() ?? "documento";
      extraDocs.push({ buffer: buf, label: doc.label, fileName: baseName });
    }

    const { textParts, images } = await collectResumeTextsAndImages({
      resumeBuffer,
      resumeFileName,
      resumeMimeType,
      extraDocs
    });

    const bundle = textParts.join("\n\n");
    if (bundle.length < MIN_TEXT_CHARS && images.length === 0) {
      await repository.updateApplicationAiAnalysis({
        tenantId,
        applicationId,
        aiAnalysisStatus: "skipped",
        aiAnalysisError: null,
        aiMatchScore: null,
        aiMatchReport: { reason: "NO_PDF_TEXT" },
        aiAnalyzedAt: new Date().toISOString()
      });
      return;
    }

    const system = `Você é um assistente de RH. Responda apenas com JSON válido conforme o schema solicitado. Idioma: português do Brasil.`;
    const textBlock =
      bundle.length >= MIN_TEXT_CHARS
        ? `Texto extraído dos documentos (quando o arquivo tinha camada de texto):
${bundle}`
        : "";
    const visionBlock =
      images.length > 0
        ? `Há ${images.length} imagem(ns) anexa(s) — podem ser fotos/scan de currículo, certificados ou páginas de PDF digitalizado. Leia todo o texto visível nas imagens e combine com o texto acima (se houver).`
        : "";

    const user = `${buildCriteriaPrompt(criteria, hasCriteria)}

Habilidades/tags já definidas na vaga (use como referência para sugerir tags do candidato, sem duplicar gratuitamente):
${JSON.stringify(job.skills ?? [])}

${textBlock}

${visionBlock}

Schema JSON de saída:
{
  "matchScore": number entre 0 e 100 ou null se não houver critérios,
  "criteria": {
    "keywords": { "met": boolean, "evidence": string },
    "formation": { "met": boolean, "evidence": string },
    "certificates": { "met": boolean, "evidence": string },
    "experience": { "met": boolean, "evidence": string }
  } (omitir chaves não aplicáveis),
  "suggestedSkillTags": string[] (labels curtas, em português quando possível)
}`;

    const rawJson =
      images.length > 0
        ? await completeJsonWithProviderVision({ provider, system, userText: user, images })
        : await completeJsonWithProvider({ provider, system, user });
    let parsedRaw: unknown;
    try {
      parsedRaw = JSON.parse(rawJson);
    } catch {
      throw new Error("AI_JSON_PARSE_FAILED");
    }
    const parsed = aiCvResponseSchema.parse(parsedRaw);

    let matchScore = parsed.matchScore ?? null;
    if (matchScore == null && hasCriteria) {
      matchScore = fallbackScoreFromCriteria(parsed, criteria);
    }
    if (matchScore != null) {
      matchScore = Math.max(0, Math.min(100, Math.round(matchScore)));
    }

    const report = {
      criteria: parsed.criteria ?? {},
      suggestedSkillTags: normalizeSkillList(parsed.suggestedSkillTags ?? []),
      jobSkills: job.skills ?? [],
      hasConfiguredCriteria: hasCriteria
    };

    await repository.updateApplicationAiAnalysis({
      tenantId,
      applicationId,
      aiAnalysisStatus: "completed",
      aiAnalysisError: null,
      aiMatchScore: matchScore,
      aiMatchReport: report,
      aiAnalyzedAt: new Date().toISOString()
    });

    const candidateUserId = application.candidate.userId;
    if (candidateUserId && report.suggestedSkillTags.length > 0) {
      await repository.mergeCandidateProfileSkills({
        userId: candidateUserId,
        extraSkills: report.suggestedSkillTags
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await repository.updateApplicationAiAnalysis({
      tenantId,
      applicationId,
      aiAnalysisStatus: "failed",
      aiAnalysisError: message.slice(0, 2000),
      aiMatchScore: null,
      aiMatchReport: null,
      aiAnalyzedAt: new Date().toISOString()
    });
  }
}
