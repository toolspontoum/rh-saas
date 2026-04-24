import { z } from "zod";

import { RecruitmentService } from "./recruitment.service.js";

const jobQuestionSchema = z
  .object({
    id: z.string().min(1).max(120),
    label: z.string().min(3).max(300),
    type: z.enum(["yes_no", "text"]),
    isRequired: z.boolean(),
    isEliminatory: z.boolean(),
    expectedAnswer: z.enum(["yes", "no"]).nullable().optional().transform((value) => value ?? null),
    notes: z.string().max(1000).nullable().optional().transform((value) => value ?? null)
  })
  .transform((value) => {
    const normalized = { ...value };
    if (normalized.type === "text") {
      normalized.isEliminatory = false;
      normalized.expectedAnswer = null;
    } else if (!normalized.expectedAnswer) {
      normalized.expectedAnswer = "yes";
    }
    if (normalized.isEliminatory) {
      normalized.isRequired = true;
    }
    return normalized;
  });

const jobDocumentRequirementSchema = z.object({
  id: z.string().uuid(),
  docTab: z.string().min(1).max(80),
  docType: z.string().min(1).max(200),
  label: z.string().max(240).nullable().optional().transform((value) => value ?? null),
  platformDocumentTypeId: z.string().uuid().nullable().optional().transform((value) => value ?? null)
});

const jobAiScreeningCriteriaSchema = z
  .object({
    keywords: z.array(z.string().min(1).max(120)).max(100).optional().default([]),
    formation: z.string().max(2000).nullable().optional().default(null),
    certificates: z.array(z.string().min(1).max(240)).max(80).optional().default([]),
    experienceRole: z.string().max(400).nullable().optional().default(null),
    experienceMonths: z.coerce.number().int().positive().max(600).nullable().optional().default(null)
  })
  .optional();

const createJobSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  title: z.string().min(3).max(160),
  description: z.string().min(10),
  department: z.string().min(1).max(120).nullable().optional(),
  location: z.string().min(1).max(120).nullable().optional(),
  employmentType: z.string().min(1).max(60).nullable().optional(),
  city: z.string().min(1).max(120).nullable().optional(),
  state: z.string().min(1).max(10).nullable().optional(),
  salary: z.coerce.number().nonnegative().nullable().optional(),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  skills: z.array(z.string().min(1).max(80)).max(200).optional(),
  screeningQuestions: z.array(jobQuestionSchema).max(50).optional(),
  documentRequirements: z.array(jobDocumentRequirementSchema).max(30).optional(),
  aiScreeningCriteria: jobAiScreeningCriteriaSchema,
  status: z.enum(["draft", "published", "closed"]).optional()
});

const listJobsSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  status: z.enum(["draft", "published", "closed"]).optional(),
  title: z.string().min(1).max(160).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

const getJobSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  jobId: z.string().uuid()
});

const updateJobSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  jobId: z.string().uuid(),
  title: z.string().min(3).max(160).optional(),
  description: z.string().min(10).optional(),
  department: z.string().min(1).max(120).nullable().optional(),
  location: z.string().min(1).max(120).nullable().optional(),
  employmentType: z.string().min(1).max(60).nullable().optional(),
  city: z.string().min(1).max(120).nullable().optional(),
  state: z.string().min(1).max(10).nullable().optional(),
  salary: z.coerce.number().nonnegative().nullable().optional(),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  skills: z.array(z.string().min(1).max(80)).max(200).optional(),
  screeningQuestions: z.array(jobQuestionSchema).max(50).optional(),
  documentRequirements: z.array(jobDocumentRequirementSchema).max(30).optional(),
  aiScreeningCriteria: jobAiScreeningCriteriaSchema,
  status: z.enum(["draft", "published", "closed"]).optional()
});

const deleteJobSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  jobId: z.string().uuid()
});

const createApplicationSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  jobId: z.string().uuid(),
  coverLetter: z.string().max(4000).nullable().optional(),
  candidate: z.object({
    fullName: z.string().min(3).max(160),
    email: z.email(),
    phone: z.string().max(30).nullable().optional(),
    cpf: z.string().max(20).nullable().optional(),
    source: z.string().max(80).nullable().optional(),
    contract: z.string().max(80).nullable().optional()
  })
});

const listApplicationsSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  jobId: z.string().uuid(),
  status: z.enum(["submitted", "in_review", "approved", "rejected", "archived", "withdrawn"]).optional(),
  candidateName: z.string().min(1).max(160).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

const updateApplicationStatusSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  jobId: z.string().uuid(),
  applicationId: z.string().uuid(),
  status: z.enum(["submitted", "in_review", "approved", "rejected", "archived", "withdrawn"])
});

const requeueApplicationAiAnalysisSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  jobId: z.string().uuid(),
  applicationId: z.string().uuid()
});

const listTenantApplicationsSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  candidateName: z.string().max(160).optional(),
  candidateEmail: z.string().max(200).optional(),
  candidateCpf: z.string().max(20).optional(),
  jobId: z.string().uuid().optional(),
  status: z.enum(["submitted", "in_review", "approved", "rejected", "archived", "withdrawn"]).optional(),
  createdFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  createdTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

const getTenantApplicationDetailsSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  applicationId: z.string().uuid()
});

const getTenantApplicationResumeSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  applicationId: z.string().uuid()
});

const listCandidatesSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  candidateName: z.string().max(160).optional(),
  contract: z.string().max(80).optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

const updateCandidateStatusSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  candidateId: z.string().uuid(),
  isActive: z.coerce.boolean()
});

const deleteInactiveCandidateSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  candidateId: z.string().uuid()
});

const listPublicJobsSchema = z.object({
  tenantSlug: z.string().min(1).max(120),
  companyId: z.string().uuid().nullable().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

const createPublicApplicationSchema = z.object({
  tenantSlug: z.string().min(1).max(120),
  jobId: z.string().uuid(),
  coverLetter: z.string().max(4000).nullable().optional(),
  candidate: z.object({
    fullName: z.string().min(3).max(160),
    email: z.email(),
    phone: z.string().max(30).nullable().optional(),
    cpf: z.string().max(20).nullable().optional(),
    source: z.string().max(80).nullable().optional(),
    contract: z.string().max(80).nullable().optional()
  })
});

const listSkillTagsSchema = z.object({
  query: z.string().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12)
});

export class RecruitmentHandlers {
  constructor(private readonly service: RecruitmentService) {}

  async createJob(input: unknown) {
    const payload = createJobSchema.parse(input);
    return this.service.createJob(payload);
  }

  async listJobs(input: unknown) {
    const payload = listJobsSchema.parse(input);
    return this.service.listJobs({
      userId: payload.userId,
      tenantId: payload.tenantId,
      companyId: payload.companyId,
      status: payload.status,
      title: payload.title,
      page: payload.page,
      pageSize: payload.pageSize
    });
  }

  async getJob(input: unknown) {
    const payload = getJobSchema.parse(input);
    return this.service.getJob(payload);
  }

  async updateJob(input: unknown) {
    const payload = updateJobSchema.parse(input);
    return this.service.updateJob(payload);
  }

  async deleteJob(input: unknown) {
    const payload = deleteJobSchema.parse(input);
    return this.service.deleteJob(payload);
  }

  async createApplication(input: unknown) {
    const payload = createApplicationSchema.parse(input);
    return this.service.createApplication(payload.userId, {
      tenantId: payload.tenantId,
      jobId: payload.jobId,
      coverLetter: payload.coverLetter ?? null,
      candidate: payload.candidate
    });
  }

  async listJobApplications(input: unknown) {
    const payload = listApplicationsSchema.parse(input);
    return this.service.listJobApplications({
      userId: payload.userId,
      tenantId: payload.tenantId,
      companyId: payload.companyId,
      jobId: payload.jobId,
      status: payload.status,
      candidateName: payload.candidateName,
      page: payload.page,
      pageSize: payload.pageSize
    });
  }

  async updateApplicationStatus(input: unknown) {
    const payload = updateApplicationStatusSchema.parse(input);
    return this.service.updateApplicationStatus({
      userId: payload.userId,
      tenantId: payload.tenantId,
      companyId: payload.companyId,
      jobId: payload.jobId,
      applicationId: payload.applicationId,
      status: payload.status
    });
  }

  async requeueApplicationAiAnalysis(input: unknown) {
    const payload = requeueApplicationAiAnalysisSchema.parse(input);
    return this.service.requeueApplicationAiAnalysis({
      userId: payload.userId,
      tenantId: payload.tenantId,
      companyId: payload.companyId,
      jobId: payload.jobId,
      applicationId: payload.applicationId
    });
  }

  async listCandidates(input: unknown) {
    const payload = listCandidatesSchema.parse(input);
    return this.service.listCandidates(payload);
  }

  async updateCandidateStatus(input: unknown) {
    const payload = updateCandidateStatusSchema.parse(input);
    return this.service.updateCandidateStatus(payload);
  }

  async deleteInactiveCandidate(input: unknown) {
    const payload = deleteInactiveCandidateSchema.parse(input);
    return this.service.deleteInactiveCandidate(payload);
  }

  async listPublicJobs(input: unknown) {
    const payload = listPublicJobsSchema.parse(input);
    return this.service.listPublicJobs(payload);
  }

  async createPublicApplication(input: unknown) {
    const payload = createPublicApplicationSchema.parse(input);
    return this.service.createPublicApplication(payload);
  }

  async listSkillTags(input: unknown) {
    const payload = listSkillTagsSchema.parse(input);
    return this.service.listSkillTags(payload);
  }

  async listTenantApplications(input: unknown) {
    const payload = listTenantApplicationsSchema.parse(input);
    return this.service.listTenantApplications(payload);
  }

  async getTenantApplicationDetails(input: unknown) {
    const payload = getTenantApplicationDetailsSchema.parse(input);
    return this.service.getTenantApplicationDetails(payload);
  }

  async getTenantApplicationResumeDownload(input: unknown) {
    const payload = getTenantApplicationResumeSchema.parse(input);
    return this.service.getTenantApplicationResumeDownload(payload);
  }
}
