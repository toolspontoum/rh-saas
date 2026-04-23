import { CoreAuthTenantService } from "../core-auth-tenant/core-auth-tenant.service.js";
import { RecruitmentRepository } from "./recruitment.repository.js";
import type {
  ApplicationStatus,
  CreateApplicationInput,
  CreateJobInput,
  Job,
  JobApplication,
  JobApplicationWithCandidate,
  JobApplicationWithRelations,
  JobDocumentRequirement,
  JobStatus,
  Candidate,
  SkillTag,
  PaginationResult,
  PublicJobsListResult
} from "./recruitment.types.js";
import { env } from "../../config/env.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { scheduleApplicationResumeAnalysis } from "../ai/schedule.js";

export class RecruitmentService {
  constructor(
    private readonly repository: RecruitmentRepository,
    private readonly authTenantService: CoreAuthTenantService
  ) {}

  private requireAdminCompany(companyId: string | null | undefined): string {
    if (!companyId) throw new Error("COMPANY_SCOPE_REQUIRED");
    return companyId;
  }

  private async resolveJobsListCompanyId(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
  }): Promise<string | null> {
    if (input.companyId) return input.companyId;
    const ctx = await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    const companyPrivileged = ctx.roles.some((r) => ["owner", "admin", "manager", "analyst"].includes(r));
    if (!companyPrivileged && ctx.prepostoCompanyId) return ctx.prepostoCompanyId;
    if (companyPrivileged) return null;
    return this.repository.getTenantUserCompanyId(input.tenantId, input.userId);
  }

  /**
   * Resolve a vaga para leitura no recrutamento. Se o header `X-Tenant-Company-Id` aponta para outra empresa
   * mas o utilizador é owner/admin/manager/analyst, faz fallback sem filtro de empresa (vagas publicadas noutra empresa).
   */
  private async getJobRespectingCompanyScope(input: {
    tenantId: string;
    userId: string;
    jobId: string;
    listCompanyId: string | null;
  }): Promise<Job | null> {
    let job = await this.repository.getJobById(input.tenantId, input.jobId, input.listCompanyId);
    if (job) return job;
    if (!input.listCompanyId) return null;
    const ctx = await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    const canSeeAllCompanies = ctx.roles.some((r) => ["owner", "admin", "manager", "analyst"].includes(r));
    if (!canSeeAllCompanies) return null;
    return this.repository.getJobById(input.tenantId, input.jobId, null);
  }

  async createJob(input: CreateJobInput): Promise<Job> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_recruitment");
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);
    const companyId = this.requireAdminCompany(input.companyId);
    return this.repository.createJob({ ...input, companyId });
  }

  async listJobs(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    status?: JobStatus;
    title?: string;
    page: number;
    pageSize: number;
  }): Promise<PaginationResult<Job>> {
    const { userId, tenantId, status, title, page, pageSize } = input;
    await this.authTenantService.assertFeatureEnabled(userId, tenantId, "mod_recruitment");
    await this.authTenantService.assertUserHasAnyRole(userId, tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);
    const listCompanyId = await this.resolveJobsListCompanyId(input);
    return this.repository.listJobs({ tenantId, companyId: listCompanyId, status, title, page, pageSize });
  }

  async getJob(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    jobId: string;
  }): Promise<Job> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_recruitment");
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);
    const listCompanyId = await this.resolveJobsListCompanyId(input);
    const job = await this.repository.getJobById(input.tenantId, input.jobId, listCompanyId);
    if (!job) throw new Error("JOB_NOT_FOUND");
    return job;
  }

  async updateJob(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    jobId: string;
    title?: string;
    description?: string;
    department?: string | null;
    location?: string | null;
    employmentType?: string | null;
    city?: string | null;
    state?: string | null;
    salary?: number | null;
    expiresAt?: string | null;
    skills?: string[];
    screeningQuestions?: Array<{
      id: string;
      label: string;
      type: "yes_no" | "text";
      isRequired: boolean;
      isEliminatory: boolean;
      expectedAnswer?: "yes" | "no" | null;
      notes: string | null;
    }>;
    documentRequirements?: JobDocumentRequirement[];
    aiScreeningCriteria?: CreateJobInput["aiScreeningCriteria"];
    status?: JobStatus;
  }): Promise<Job> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_recruitment");
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);
    const scopeCompanyId = this.requireAdminCompany(input.companyId);
    const previous = await this.repository.getJobById(input.tenantId, input.jobId, scopeCompanyId);
    if (!previous) throw new Error("JOB_NOT_FOUND");

    const updated = await this.repository.updateJob({ ...input, companyId: scopeCompanyId });

    if (previous.status !== "closed" && updated.status === "closed") {
      const archivedCount = await this.repository.archiveApplicationsByJobId({
        tenantId: input.tenantId,
        jobId: input.jobId
      });

      await this.repository.insertAuditLog({
        tenantId: input.tenantId,
        companyId: previous.companyId,
        actorUserId: input.userId,
        action: "recruitment.job.applications_archived",
        resourceType: "job",
        resourceId: input.jobId,
        metadata: {
          archivedCount
        }
      });
    }

    return updated;
  }

  async deleteJob(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    jobId: string;
  }): Promise<{ ok: true }> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_recruitment");
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);

    const scopeCompanyId = this.requireAdminCompany(input.companyId);
    const job = await this.repository.getJobById(input.tenantId, input.jobId, scopeCompanyId);
    if (!job) throw new Error("JOB_NOT_FOUND");

    await this.repository.deleteJob({
      tenantId: input.tenantId,
      jobId: input.jobId,
      companyId: scopeCompanyId
    });
    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId: job.companyId,
      actorUserId: input.userId,
      action: "recruitment.job.deleted",
      resourceType: "job",
      resourceId: input.jobId,
      metadata: { title: job.title }
    });

    return { ok: true };
  }

  async createApplication(userId: string, input: CreateApplicationInput): Promise<JobApplication> {
    await this.authTenantService.assertFeatureEnabled(userId, input.tenantId, "mod_recruitment");

    const job = await this.repository.getJobById(input.tenantId, input.jobId);
    if (!job) {
      throw new Error("JOB_NOT_FOUND");
    }

    const candidateByEmail = await this.repository.getCandidateByEmail(input.tenantId, input.candidate.email);
    const candidate =
      candidateByEmail ??
      (await this.repository.createCandidate(input.tenantId, {
        ...input.candidate,
        email: input.candidate.email.toLowerCase()
      }));

    const created = await this.repository.createApplication({
      tenantId: input.tenantId,
      jobId: input.jobId,
      candidateId: candidate.id,
      coverLetter: input.coverLetter ?? null
    });
    scheduleApplicationResumeAnalysis(input.tenantId, created.id);
    return created;
  }

  async listJobApplications(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    jobId: string;
    status?: ApplicationStatus;
    candidateName?: string;
    page: number;
    pageSize: number;
  }): Promise<PaginationResult<JobApplicationWithCandidate>> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_recruitment");

    const listCompanyId = await this.resolveJobsListCompanyId(input);
    const job = await this.getJobRespectingCompanyScope({
      tenantId: input.tenantId,
      userId: input.userId,
      jobId: input.jobId,
      listCompanyId
    });
    if (!job) {
      throw new Error("JOB_NOT_FOUND");
    }

    const result = await this.repository.listJobApplications({
      tenantId: input.tenantId,
      jobId: input.jobId,
      status: input.status,
      candidateName: input.candidateName,
      page: input.page,
      pageSize: input.pageSize
    });

    const ctx = await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    const canSeeAi = ctx.roles.some((role) => ["owner", "admin", "manager", "analyst"].includes(role));
    if (canSeeAi) return result;

    return {
      ...result,
      items: result.items.map((item) => {
        const { aiMatchScore, aiMatchReport, aiAnalysisStatus, aiAnalysisError, aiAnalyzedAt, ...rest } = item;
        return rest as JobApplicationWithCandidate;
      })
    };
  }

  async requeueApplicationAiAnalysis(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    jobId: string;
    applicationId: string;
  }): Promise<{ ok: true; aiAnalysisStatus: "pending" }> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_recruitment");
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);

    const listCompanyId = await this.resolveJobsListCompanyId(input);
    const job = await this.getJobRespectingCompanyScope({
      tenantId: input.tenantId,
      userId: input.userId,
      jobId: input.jobId,
      listCompanyId
    });
    if (!job) {
      throw new Error("JOB_NOT_FOUND");
    }

    const found = await this.repository.findApplicationForJob({
      tenantId: input.tenantId,
      jobId: input.jobId,
      applicationId: input.applicationId
    });
    if (!found) {
      throw new Error("APPLICATION_NOT_FOUND");
    }

    await this.repository.resetApplicationAiAnalysisToPending({
      tenantId: input.tenantId,
      applicationId: input.applicationId
    });
    scheduleApplicationResumeAnalysis(input.tenantId, input.applicationId);
    return { ok: true, aiAnalysisStatus: "pending" };
  }

  async updateApplicationStatus(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    jobId: string;
    applicationId: string;
    status: ApplicationStatus;
  }): Promise<JobApplicationWithCandidate & { emailNotified?: boolean }> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_recruitment");
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager"
    ]);

    const scopeCompanyId = this.requireAdminCompany(input.companyId);
    const job = await this.repository.getJobById(input.tenantId, input.jobId, scopeCompanyId);
    if (!job) {
      throw new Error("JOB_NOT_FOUND");
    }

    const updated = await this.repository.updateApplicationStatus({
      tenantId: input.tenantId,
      jobId: input.jobId,
      applicationId: input.applicationId,
      status: input.status,
      actorUserId: input.userId,
      companyId: job.companyId
    });

    if (input.status === "approved") {
      const emailNotified = await this.sendCandidateApprovedEmail({
        tenantId: input.tenantId,
        toEmail: updated.candidate.email,
        candidateName: updated.candidate.fullName,
        jobTitle: job.title
      });
      return { ...updated, emailNotified };
    }

    return updated;
  }

  async listCandidates(input: {
    userId: string;
    tenantId: string;
    candidateName?: string;
    contract?: string;
    isActive?: boolean;
    page: number;
    pageSize: number;
  }): Promise<PaginationResult<Candidate>> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_recruitment");
    return this.repository.listCandidates({
      tenantId: input.tenantId,
      candidateName: input.candidateName,
      contract: input.contract,
      isActive: input.isActive,
      page: input.page,
      pageSize: input.pageSize
    });
  }

  async updateCandidateStatus(input: {
    userId: string;
    tenantId: string;
    candidateId: string;
    isActive: boolean;
  }): Promise<Candidate> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_recruitment");
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager"
    ]);

    const candidate = await this.repository.getCandidateById(input.tenantId, input.candidateId);
    if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");

    const updated = await this.repository.updateCandidateStatus({
      tenantId: input.tenantId,
      candidateId: input.candidateId,
      isActive: input.isActive
    });

    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      actorUserId: input.userId,
      action: "recruitment.candidate.status_updated",
      resourceType: "candidate",
      resourceId: input.candidateId,
      metadata: {
        previousIsActive: candidate.isActive,
        nextIsActive: input.isActive
      }
    });

    return updated;
  }

  async deleteInactiveCandidate(input: {
    userId: string;
    tenantId: string;
    candidateId: string;
  }): Promise<{ ok: true }> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_recruitment");
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager"
    ]);

    const candidate = await this.repository.getCandidateById(input.tenantId, input.candidateId);
    if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");
    if (candidate.isActive) throw new Error("CANDIDATE_MUST_BE_INACTIVE");

    await this.repository.deleteInactiveCandidate({
      tenantId: input.tenantId,
      candidateId: input.candidateId
    });

    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      actorUserId: input.userId,
      action: "recruitment.candidate.deleted",
      resourceType: "candidate",
      resourceId: input.candidateId,
      metadata: {
        email: candidate.email,
        fullName: candidate.fullName
      }
    });

    return { ok: true };
  }

  async listPublicJobs(input: {
    tenantSlug: string;
    companyId?: string | null;
    page: number;
    pageSize: number;
  }): Promise<PublicJobsListResult> {
    return this.repository.listPublishedJobsByTenantSlug(input);
  }

  async createPublicApplication(input: {
    tenantSlug: string;
    jobId: string;
    candidate: {
      fullName: string;
      email: string;
      phone?: string | null;
      cpf?: string | null;
      source?: string | null;
      contract?: string | null;
    };
    coverLetter?: string | null;
  }): Promise<JobApplication> {
    const job = await this.repository.getPublishedJobByTenantSlug(input.tenantSlug, input.jobId);
    if (!job) throw new Error("JOB_NOT_FOUND");

    const candidateByEmail = await this.repository.getCandidateByEmail(job.tenantId, input.candidate.email);
    const candidate =
      candidateByEmail ??
      (await this.repository.createCandidate(job.tenantId, {
        ...input.candidate,
        email: input.candidate.email.toLowerCase()
      }));

    const created = await this.repository.createApplication({
      tenantId: job.tenantId,
      jobId: job.id,
      candidateId: candidate.id,
      coverLetter: input.coverLetter ?? null
    });
    scheduleApplicationResumeAnalysis(job.tenantId, created.id);
    return created;
  }

  async listSkillTags(input: { query?: string; limit: number }): Promise<SkillTag[]> {
    return this.repository.listSkillTags({
      query: input.query,
      limit: input.limit
    });
  }

  async listTenantApplications(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    candidateName?: string;
    candidateEmail?: string;
    candidateCpf?: string;
    jobId?: string;
    status?: ApplicationStatus;
    createdFrom?: string;
    createdTo?: string;
    page: number;
    pageSize: number;
  }): Promise<PaginationResult<JobApplicationWithRelations>> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_recruitment");
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);

    let listCompanyId = await this.resolveJobsListCompanyId(input);

    if (input.jobId && listCompanyId) {
      const inCompany = await this.repository.getJobById(input.tenantId, input.jobId, listCompanyId);
      if (!inCompany) {
        const widened = await this.getJobRespectingCompanyScope({
          tenantId: input.tenantId,
          userId: input.userId,
          jobId: input.jobId,
          listCompanyId
        });
        if (widened) listCompanyId = null;
      }
    }

    return this.repository.listTenantApplications({
      tenantId: input.tenantId,
      companyId: listCompanyId,
      candidateName: input.candidateName,
      candidateEmail: input.candidateEmail,
      candidateCpf: input.candidateCpf,
      jobId: input.jobId,
      status: input.status,
      createdFrom: input.createdFrom,
      createdTo: input.createdTo,
      page: input.page,
      pageSize: input.pageSize
    });
  }

  async getTenantApplicationDetails(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    applicationId: string;
  }): Promise<JobApplicationWithRelations> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_recruitment");
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);

    const listCompanyId = await this.resolveJobsListCompanyId(input);

    const application = await this.repository.getTenantApplicationById({
      tenantId: input.tenantId,
      applicationId: input.applicationId,
      companyId: listCompanyId
    });
    if (!application) throw new Error("APPLICATION_NOT_FOUND");
    return application;
  }

  async getTenantApplicationResumeDownload(input: {
    userId: string;
    tenantId: string;
    companyId?: string | null;
    applicationId: string;
  }): Promise<{ fileName: string; downloadUrl: string; expiresIn: number }> {
    await this.authTenantService.assertFeatureEnabled(input.userId, input.tenantId, "mod_recruitment");
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);

    const listCompanyId = await this.resolveJobsListCompanyId(input);

    const application = await this.repository.getTenantApplicationById({
      tenantId: input.tenantId,
      applicationId: input.applicationId,
      companyId: listCompanyId
    });
    if (!application) throw new Error("APPLICATION_NOT_FOUND");
    if (!application.candidateProfile?.resumeFilePath || !application.candidateProfile.resumeFileName) {
      throw new Error("RESUME_NOT_FOUND");
    }

    const expiresIn = 60 * 10;
    const { data, error } = await supabaseAdmin.storage
      .from(env.STORAGE_BUCKET_CANDIDATE_RESUMES)
      .createSignedUrl(application.candidateProfile.resumeFilePath, expiresIn, {
        download: application.candidateProfile.resumeFileName
      });

    if (error || !data?.signedUrl) {
      throw new Error("UPLOAD_INTENT_FAILED");
    }

    return {
      fileName: application.candidateProfile.resumeFileName,
      downloadUrl: data.signedUrl,
      expiresIn
    };
  }

  private async sendCandidateApprovedEmail(input: {
    tenantId: string;
    toEmail: string;
    candidateName: string;
    jobTitle: string;
  }): Promise<boolean> {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
      return false;
    }

    const subject = `Aprovado para próxima fase - ${input.jobTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height:1.5; color:#0f172a;">
        <h2>Parabéns, ${input.candidateName}!</h2>
        <p>Você foi aprovado para a próxima fase da vaga <strong>${input.jobTitle}</strong>.</p>
        <p>Em breve nosso time entrará em contato com as próximas instruções.</p>
      </div>
    `;

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [input.toEmail],
          subject,
          html
        })
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}
