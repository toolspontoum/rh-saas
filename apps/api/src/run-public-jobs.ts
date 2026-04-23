import { toHttpError } from "./http/error-handler.js";
import { supabaseAdmin } from "./lib/supabase.js";
import { candidatePortalHandlers } from "./modules/candidate-portal/index.js";
import { CandidatePortalRepository } from "./modules/candidate-portal/candidate-portal.repository.js";
import { isUuid } from "./modules/platform/platform.slugify.js";
import { recruitmentHandlers } from "./modules/recruitment/index.js";

export type JsonHttpResult = { status: number; body: unknown };
const candidatePortalRepository = new CandidatePortalRepository(supabaseAdmin);

/**
 * GET /public/jobs/:segment
 * - segment UUID => detalhe por jobId
 * - segment slug => listagem pública por tenant
 */
export async function runPublicJobsBySegmentGet(
  segment: string,
  query: { page?: string; pageSize?: string; companyId?: string }
): Promise<JsonHttpResult> {
  try {
    if (isUuid(segment)) {
      const result = await candidatePortalRepository.getPublishedJobById(segment);
      if (!result) return { status: 404, body: { error: "JOB_NOT_FOUND", message: "Vaga nao encontrada." } };
      return { status: 200, body: result };
    }
    const result = await recruitmentHandlers.listPublicJobs({
      tenantSlug: segment,
      companyId: query.companyId,
      page: query.page,
      pageSize: query.pageSize
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** GET /public/jobs/:tenantSlug/:jobId */
export async function runPublicJobByTenantAndIdGet(tenantSlug: string, jobId: string): Promise<JsonHttpResult> {
  try {
    const result = await candidatePortalRepository.getPublishedJobByTenantAndId(tenantSlug, jobId);
    if (!result) return { status: 404, body: { error: "JOB_NOT_FOUND", message: "Vaga nao encontrada." } };
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}

/** POST /public/jobs/:jobId/quick-apply — candidatura rápida sem login (evita 504 na Vercel). */
export async function runPublicQuickApplyPost(
  jobId: string,
  body: Record<string, unknown>
): Promise<JsonHttpResult> {
  try {
    const result = await candidatePortalHandlers.quickApplyPublic({
      jobId,
      fullName: body.fullName,
      email: body.email,
      cpf: body.cpf,
      phone: body.phone,
      resumeFileName: body.resumeFileName,
      resumeMimeType: body.resumeMimeType,
      resumeBase64: body.resumeBase64,
      coverLetter: body.coverLetter,
      screeningAnswers: body.screeningAnswers ?? [],
      jobDocumentUploads: body.jobDocumentUploads
    });
    return { status: 201, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}
