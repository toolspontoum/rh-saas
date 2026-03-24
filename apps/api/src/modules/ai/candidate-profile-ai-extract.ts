import { z } from "zod";

import { isImageMime, isPdfMime, resolveDocumentMimeType } from "./document-media.js";
import { completeJsonWithProvider, completeJsonWithProviderVision, type VisionImagePart } from "./llm-json.js";
import { extractPdfText } from "./pdf-text.js";
import { renderPdfPagesToPngBuffers } from "./pdf-render-pages.js";
import {
  assertProviderCredentials,
  resolvePlatformAiProviderForCandidateProfile,
  type AiProviderId
} from "./resolve-provider.js";

const MIN_TEXT_CHARS = 40;

const aiExtractSchema = z.object({
  fullName: z.string().max(160).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  cpf: z.string().max(20).nullable().optional(),
  state: z.string().max(60).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  desiredPosition: z.string().max(160).nullable().optional(),
  salaryExpectation: z.number().nonnegative().nullable().optional(),
  yearsExperience: z.number().int().min(0).max(80).nullable().optional(),
  linkedinUrl: z.string().max(500).nullable().optional(),
  portfolioUrl: z.string().max(500).nullable().optional(),
  professionalSummary: z.string().max(20000).nullable().optional(),
  skills: z.array(z.string()).optional().default([]),
  education: z
    .array(
      z.object({
        title: z.string().max(200),
        startDate: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
        isCurrent: z.boolean().optional(),
        description: z.string().max(5000).nullable().optional()
      })
    )
    .optional()
    .default([]),
  experience: z
    .array(
      z.object({
        title: z.string().max(200),
        startDate: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
        isCurrent: z.boolean().optional(),
        description: z.string().max(8000).nullable().optional()
      })
    )
    .optional()
    .default([])
});

export type CandidateProfileAiExtract = z.infer<typeof aiExtractSchema>;

async function buildTextAndImages(buffer: Buffer, fileName: string, dbMime: string | null): Promise<{
  text: string;
  images: VisionImagePart[];
}> {
  const mime = await resolveDocumentMimeType({ buffer, fileName, dbMimeType: dbMime });
  const textParts: string[] = [];
  const images: VisionImagePart[] = [];

  const visionOk = (m: string) =>
    m === "image/jpeg" || m === "image/png" || m === "image/webp" || m === "image/gif";

  if (isImageMime(mime) && visionOk(mime)) {
    images.push({ mimeType: mime, base64: buffer.toString("base64") });
    return { text: "", images };
  }

  if (isPdfMime(mime) || buffer.subarray(0, 5).toString() === "%PDF-") {
    const t = await extractPdfText(buffer);
    if (t.length >= MIN_TEXT_CHARS) {
      textParts.push(t.slice(0, 120_000));
      return { text: textParts.join("\n"), images: [] };
    }
    const pngs = await renderPdfPagesToPngBuffers(buffer, { maxPages: 4, maxLongEdgePx: 1536 });
    for (const png of pngs) {
      if (images.length >= 8) break;
      images.push({ mimeType: "image/png", base64: png.toString("base64") });
    }
    return { text: "", images };
  }

  return { text: "", images: [] };
}

export async function extractCandidateProfileFromResumeFile(input: {
  buffer: Buffer;
  fileName: string;
  mimeType: string | null;
}): Promise<CandidateProfileAiExtract> {
  const provider = await resolvePlatformAiProviderForCandidateProfile();
  if (!provider) {
    throw new Error("AI_PROVIDER_DISABLED");
  }
  await assertProviderCredentials(provider);

  const { text, images } = await buildTextAndImages(input.buffer, input.fileName, input.mimeType);
  if (text.length < MIN_TEXT_CHARS && images.length === 0) {
    throw new Error("NO_PDF_TEXT");
  }

  const system = `Você extrai dados de currículo para cadastro. Responda apenas JSON válido. Idioma: português do Brasil.
Datas no formato YYYY-MM-DD quando souber; use null se não houver.
salaryExpectation: número em reais (mensal), sem texto.
professionalSummary: HTML simples permitido (parágrafos, negrito) ou texto plano.
phone: somente dígitos do telefone brasileiro (DDD + número: 10 ou 11 dígitos). Não inclua código do país (+55 ou 55).
Não invente experiências ou formações que não apareçam no documento.`;

  const userText = `${text.length >= MIN_TEXT_CHARS ? `Texto extraído:\n${text}\n\n` : ""}${
    images.length > 0
      ? `Há ${images.length} imagem(ns) do documento — leia todo o texto visível.\n\n`
      : ""
  }Schema JSON de saída:
{
  "fullName": string | null,
  "phone": string | null,
  "cpf": string | null,
  "state": string | null (UF se Brasil),
  "city": string | null,
  "desiredPosition": string | null,
  "salaryExpectation": number | null,
  "yearsExperience": number | null,
  "linkedinUrl": string | null (URL completa com https se houver),
  "portfolioUrl": string | null,
  "professionalSummary": string | null,
  "skills": string[],
  "education": [{ "title": string, "startDate": string | null, "endDate": string | null, "isCurrent": boolean, "description": string | null }],
  "experience": [{ "title": string, "startDate": string | null, "endDate": string | null, "isCurrent": boolean, "description": string | null }]
}`;

  const raw =
    images.length > 0
      ? await completeJsonWithProviderVision({
          provider,
          system,
          userText,
          images
        })
      : await completeJsonWithProvider({ provider, system, user: userText });

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new Error("AI_JSON_PARSE_FAILED");
  }
  return aiExtractSchema.parse(parsedJson);
}

export async function getAiProviderForCandidateProfile(): Promise<AiProviderId | null> {
  return resolvePlatformAiProviderForCandidateProfile();
}
