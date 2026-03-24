import { z } from "zod";

import { CandidatePortalService } from "./candidate-portal.service.js";

const timelineItemSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  isCurrent: z.boolean().optional(),
  description: z.string().max(5000).nullable().optional()
});

const upsertProfileSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(3).max(160),
  email: z.string().email(),
  phone: z.string().max(30).nullable().optional(),
  cpf: z.string().max(20).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  state: z.string().max(60).nullable().optional(),
  linkedinUrl: z.string().url().max(255).nullable().optional(),
  portfolioUrl: z.string().url().max(255).nullable().optional(),
  professionalSummary: z.string().max(20000).nullable().optional(),
  desiredPosition: z.string().max(160).nullable().optional(),
  salaryExpectation: z.coerce.number().nonnegative().nullable().optional(),
  yearsExperience: z.coerce.number().int().nonnegative().max(80).nullable().optional(),
  skills: z.array(z.string().min(1).max(80)).max(200).optional(),
  education: z.array(timelineItemSchema).max(80).optional(),
  experience: z.array(timelineItemSchema).max(120).optional()
});

const createUploadIntentSchema = z.object({
  userId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.coerce.number().int().positive()
});

const confirmUploadSchema = z.object({
  userId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  filePath: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.coerce.number().int().positive()
});
const createProfileImageUploadIntentSchema = z.object({
  userId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.coerce.number().int().positive()
});
const confirmProfileImageUploadSchema = z.object({
  userId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  filePath: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.coerce.number().int().positive()
});

const listPublicJobsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  title: z.string().min(1).max(160).optional(),
  tenantSlug: z.string().min(1).max(120).optional()
});
const getPublicJobByIdSchema = z.object({
  jobId: z.string().uuid()
});
const getPublicJobByTenantAndIdSchema = z.object({
  tenantSlug: z.string().min(1).max(120),
  jobId: z.string().uuid()
});
const jobDocumentUploadBodySchema = z.object({
  requirementId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  base64: z.string().min(1)
});

const quickApplyPublicSchema = z.object({
  jobId: z.string().uuid(),
  fullName: z.string().min(3).max(160),
  email: z.string().email(),
  cpf: z.string().min(11).max(20),
  phone: z.string().min(10).max(30),
  resumeFileName: z.string().min(1).max(255),
  resumeMimeType: z.string().min(1).max(100),
  resumeBase64: z.string().min(1),
  coverLetter: z.string().min(1).max(20000),
  jobDocumentUploads: z.array(jobDocumentUploadBodySchema).max(30).optional(),
  screeningAnswers: z
    .array(
      z.object({
        questionId: z.string().min(1).max(120),
        answerBoolean: z.boolean().nullable().optional(),
        answerText: z.string().max(4000).nullable().optional(),
        answerFile: z.string().max(1000).nullable().optional()
      }).transform((answer) => ({
        questionId: answer.questionId,
        answerBoolean: answer.answerBoolean ?? null,
        answerText: answer.answerText ?? null,
        answerFile: answer.answerFile ?? null
      }))
    )
    .max(100)
    .optional()
});
const quickApplyPublicByTenantSchema = quickApplyPublicSchema.extend({
  tenantSlug: z.string().min(1).max(120)
});

const applyToJobSchema = z.object({
  userId: z.string().uuid(),
  jobId: z.string().uuid(),
  coverLetter: z.string().min(1).max(20000),
  jobDocumentUploads: z.array(jobDocumentUploadBodySchema).max(30).optional(),
  reuseExistingRequirementIds: z
    .array(z.string().min(1).max(120))
    .max(30)
    .optional()
    .transform((ids) => (ids ? [...new Set(ids)] : undefined)),
  screeningAnswers: z
    .array(
      z.object({
        questionId: z.string().min(1).max(120),
        answerBoolean: z.boolean().nullable().optional(),
        answerText: z.string().max(4000).nullable().optional(),
        answerFile: z.string().max(1000).nullable().optional()
      }).transform((answer) => ({
        questionId: answer.questionId,
        answerBoolean: answer.answerBoolean ?? null,
        answerText: answer.answerText ?? null,
        answerFile: answer.answerFile ?? null
      }))
    )
    .max(100)
    .optional()
});

const applicationByJobSchema = z.object({
  userId: z.string().uuid(),
  jobId: z.string().uuid()
});

const applicantDocumentPresenceSchema = z.object({
  userId: z.string().uuid(),
  jobId: z.string().uuid()
});

const listMyApplicationsSchema = z.object({
  userId: z.string().uuid(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

const listSuggestedJobsSchema = z.object({
  userId: z.string().uuid(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

const listJobEmployersSchema = z.object({
  userId: z.string().uuid()
});

const listJobsForTenantSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50)
});

const listSkillTagsSchema = z.object({
  query: z.string().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12)
});

export class CandidatePortalHandlers {
  constructor(private readonly service: CandidatePortalService) {}

  async getProfile(userId: string) {
    return this.service.getProfile(userId);
  }

  async upsertProfile(input: unknown) {
    const payload = upsertProfileSchema.parse(input);
    return this.service.upsertProfile({
      ...payload,
      education: normalizeTimeline(payload.education),
      experience: normalizeTimeline(payload.experience)
    });
  }

  async createResumeUploadIntent(input: unknown) {
    const payload = createUploadIntentSchema.parse(input);
    return this.service.createResumeUploadIntent(payload);
  }

  async confirmResumeUpload(input: unknown) {
    const payload = confirmUploadSchema.parse(input);
    return this.service.confirmResumeUpload(payload);
  }

  async processResumeWithAi(input: {
    userId: string;
    fileBuffer: Buffer;
    fileName: string;
    mimeType: string;
  }) {
    return this.service.processResumeWithAiAndUpdateProfile(input);
  }

  async createProfileImageUploadIntent(input: unknown) {
    const payload = createProfileImageUploadIntentSchema.parse(input);
    return this.service.createProfileImageUploadIntent(payload);
  }

  async confirmProfileImageUpload(input: unknown) {
    const payload = confirmProfileImageUploadSchema.parse(input);
    return this.service.confirmProfileImageUpload(payload);
  }

  async listPublicJobs(input: unknown) {
    const payload = listPublicJobsSchema.parse(input);
    return this.service.listPublicJobs(payload);
  }

  async getPublicJobById(input: unknown) {
    const payload = getPublicJobByIdSchema.parse(input);
    return this.service.getPublicJobById(payload.jobId);
  }

  async getPublicJobByTenantAndId(input: unknown) {
    const payload = getPublicJobByTenantAndIdSchema.parse(input);
    return this.service.getPublicJobByTenantAndId(payload.tenantSlug, payload.jobId);
  }

  async quickApplyPublic(input: unknown) {
    const payload = quickApplyPublicSchema.parse(input);
    return this.service.quickApplyPublic(payload);
  }

  async quickApplyPublicByTenant(input: unknown) {
    const payload = quickApplyPublicByTenantSchema.parse(input);
    return this.service.quickApplyPublicByTenant(payload);
  }

  async listSuggestedJobs(input: unknown) {
    const payload = listSuggestedJobsSchema.parse(input);
    return this.service.listSuggestedJobs(payload);
  }

  async listJobEmployers(input: unknown) {
    const payload = listJobEmployersSchema.parse(input);
    return this.service.listJobEmployers(payload);
  }

  async listJobsForTenant(input: unknown) {
    const payload = listJobsForTenantSchema.parse(input);
    return this.service.listJobsForTenant(payload);
  }

  async applyToJob(input: unknown) {
    const payload = applyToJobSchema.parse(input);
    return this.service.applyToJob(payload);
  }

  async getApplicantDocumentPresenceForJob(input: unknown) {
    const payload = applicantDocumentPresenceSchema.parse(input);
    return this.service.getApplicantDocumentPresenceForJob(payload);
  }

  async getMyApplicationByJob(input: unknown) {
    const payload = applicationByJobSchema.parse(input);
    return this.service.getMyApplicationByJob(payload);
  }

  async withdrawMyApplication(input: unknown) {
    const payload = applicationByJobSchema.parse(input);
    return this.service.withdrawMyApplication(payload);
  }

  async listMyApplications(input: unknown) {
    const payload = listMyApplicationsSchema.parse(input);
    return this.service.listMyApplications(payload);
  }

  async listSkillTags(input: unknown) {
    const payload = listSkillTagsSchema.parse(input);
    return this.service.listSkillTags(payload);
  }
}

function normalizeTimeline(
  items: Array<{
    id: string;
    title: string;
    startDate?: string | null;
    endDate?: string | null;
    isCurrent?: boolean;
    description?: string | null;
  }> = []
) {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    startDate: item.startDate ?? null,
    endDate: item.isCurrent ? null : (item.endDate ?? null),
    isCurrent: item.isCurrent ?? false,
    description: item.description ?? null
  }));
}
