import { toHttpError } from "./http/error-handler.js";
import { candidatePortalHandlers } from "./modules/candidate-portal/index.js";
import { recruitmentHandlers } from "./modules/recruitment/index.js";
import { getBearerSession } from "./session-from-bearer.js";

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
