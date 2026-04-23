import type { IncomingMessage, ServerResponse } from "node:http";

import multer from "multer";

import { env } from "./config/env.js";
import { toHttpError } from "./http/error-handler.js";
import { candidatePortalHandlers } from "./modules/candidate-portal/index.js";
import { recruitmentHandlers } from "./modules/recruitment/index.js";
import { getBearerSession } from "./session-from-bearer.js";

const resumeProcessAiMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_PDF_UPLOAD_SIZE_BYTES }
});
const resumeProcessAiSingle = resumeProcessAiMulter.single("file");

export type JsonHttpResult = { status: number; body: unknown };

/** GET /v1/skills/tags — usado no perfil do candidato (evita cold start Express na Vercel). */
export async function runSkillTagsGet(
  authorizationHeader: string | null | undefined,
  query: { query?: string; limit?: string }
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  try {
    const result = await recruitmentHandlers.listSkillTags({
      query: query.query,
      limit: query.limit
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** PUT /v1/me/candidate-profile */
export async function runCandidatePutProfile(
  authorizationHeader: string | null | undefined,
  body: Record<string, unknown>
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  try {
    const result = await candidatePortalHandlers.upsertProfile({
      userId: s.userId,
      fullName: body.fullName,
      email: body.email,
      phone: body.phone ?? null,
      cpf: body.cpf ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      linkedinUrl: body.linkedinUrl ?? null,
      portfolioUrl: body.portfolioUrl ?? null,
      professionalSummary: body.professionalSummary ?? null,
      desiredPosition: body.desiredPosition ?? null,
      salaryExpectation: body.salaryExpectation ?? null,
      yearsExperience: body.yearsExperience ?? null,
      skills: body.skills ?? [],
      education: body.education ?? [],
      experience: body.experience ?? []
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** POST /v1/me/candidate-profile/resume/upload-intent */
export async function runCandidateResumeUploadIntentPost(
  authorizationHeader: string | null | undefined,
  body: Record<string, unknown>
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  try {
    const result = await candidatePortalHandlers.createResumeUploadIntent({
      userId: s.userId,
      fileName: body.fileName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** POST /v1/me/candidate-profile/resume/confirm-upload */
export async function runCandidateResumeConfirmUploadPost(
  authorizationHeader: string | null | undefined,
  body: Record<string, unknown>
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  try {
    const result = await candidatePortalHandlers.confirmResumeUpload({
      userId: s.userId,
      fileName: body.fileName,
      filePath: body.filePath,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** POST /v1/me/candidate-profile/avatar/upload-intent */
export async function runCandidateAvatarUploadIntentPost(
  authorizationHeader: string | null | undefined,
  body: Record<string, unknown>
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  try {
    const result = await candidatePortalHandlers.createProfileImageUploadIntent({
      userId: s.userId,
      fileName: body.fileName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** POST /v1/me/candidate-profile/avatar/confirm-upload */
export async function runCandidateAvatarConfirmUploadPost(
  authorizationHeader: string | null | undefined,
  body: Record<string, unknown>
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  try {
    const result = await candidatePortalHandlers.confirmProfileImageUpload({
      userId: s.userId,
      fileName: body.fileName,
      filePath: body.filePath,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** POST /v1/me/jobs/:jobId/apply */
export async function runCandidateApplyToJobPost(
  authorizationHeader: string | null | undefined,
  jobId: string,
  body: Record<string, unknown>
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  try {
    const result = await candidatePortalHandlers.applyToJob({
      userId: s.userId,
      jobId,
      coverLetter: body.coverLetter,
      jobDocumentUploads: body.jobDocumentUploads,
      reuseExistingRequirementIds: body.reuseExistingRequirementIds,
      screeningAnswers: body.screeningAnswers ?? []
    });
    return { status: 201, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** DELETE /v1/me/jobs/:jobId/application */
export async function runCandidateWithdrawApplicationDelete(
  authorizationHeader: string | null | undefined,
  jobId: string
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };
  try {
    const result = await candidatePortalHandlers.withdrawMyApplication({
      userId: s.userId,
      jobId
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/**
 * POST /v1/me/candidate-profile/resume/process-with-ai (multipart campo `file`).
 * Rota “lite” para a Vercel: evita cold start do Express + import pesado; o processamento IA continua longo.
 */
export async function runCandidateResumeProcessWithAiPost(
  authorizationHeader: string | null | undefined,
  req: IncomingMessage,
  res: ServerResponse
): Promise<JsonHttpResult> {
  const s = await getBearerSession(authorizationHeader);
  if (!s.ok) return { status: s.status, body: s.body };

  try {
    await new Promise<void>((resolve, reject) => {
      resumeProcessAiSingle(req as never, res as never, (err: unknown) => {
        if (err && typeof err === "object" && err !== null && "code" in err) {
          const code = (err as { code: string }).code;
          if (code === "LIMIT_FILE_SIZE") {
            reject(new Error("FILE_TOO_LARGE"));
            return;
          }
        }
        if (err) reject(err instanceof Error ? err : new Error(String(err)));
        else resolve();
      });
    });

    const file = (req as { file?: { buffer: Buffer; originalname: string; mimetype: string } }).file;
    if (!file?.buffer) {
      return {
        status: 400,
        body: { error: "FILES_REQUIRED", message: "Envie o arquivo em multipart com o campo file." }
      };
    }

    const result = await candidatePortalHandlers.processResumeWithAi({
      userId: s.userId,
      fileBuffer: file.buffer,
      fileName: file.originalname || "curriculo",
      mimeType: file.mimetype
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}
