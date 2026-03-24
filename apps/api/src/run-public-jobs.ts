import { toHttpError } from "./http/error-handler.js";
import { candidatePortalHandlers } from "./modules/candidate-portal/index.js";
import { isUuid } from "./modules/platform/platform.slugify.js";
import { recruitmentHandlers } from "./modules/recruitment/index.js";

export type JsonHttpResult = { status: number; body: unknown };

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
      const result = await candidatePortalHandlers.getPublicJobById({ jobId: segment });
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
    const result = await candidatePortalHandlers.getPublicJobByTenantAndId({
      tenantSlug,
      jobId
    });
    return { status: 200, body: result };
  } catch (error) {
    const parsed = toHttpError(error);
    return { status: parsed.status, body: { error: parsed.code, message: parsed.message } };
  }
}
