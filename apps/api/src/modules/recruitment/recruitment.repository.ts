import type { SupabaseClient } from "@supabase/supabase-js";
import { parseJobAiScreeningCriteria } from "../../lib/ai-screening-criteria.js";
import { fetchDefaultTenantCompanyId } from "../../lib/tenant-company-default.js";
import { parseJobDocumentRequirements } from "../../lib/job-document-requirements.js";
import { cleanSkillLabel, normalizeSkillList } from "../../lib/skill-tags.js";

import type {
  Candidate,
  CandidateProfileSummary,
  CandidateTimelineItem,
  CreateApplicationInput,
  CreateJobInput,
  Job,
  JobQuestion,
  JobQuestionAnswer,
  JobApplication,
  JobApplicationWithCandidate,
  ListCandidatesInput,
  ListTenantApplicationsInput,
  ListApplicationsInput,
  ListJobsInput,
  PaginationResult,
  PublicJobsListResult,
  UpdateApplicationStatusInput,
  UpdateJobInput,
  JobApplicationWithRelations
} from "./recruitment.types.js";

function withCompany<T extends { eq: (col: string, val: string) => T }>(
  query: T,
  companyId: string | null | undefined
): T {
  return companyId ? query.eq("company_id", companyId) : query;
}

type JobRow = {
  id: string;
  tenant_id: string;
  company_id: string;
  company?: { id: string; name: string } | { id: string; name: string }[] | null;
  title: string;
  description: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  city: string | null;
  state: string | null;
  salary: number | null;
  expires_at: string | null;
  skills: string[] | null;
  screening_questions: unknown;
  document_requirements?: unknown;
  ai_screening_criteria?: unknown;
  status: Job["status"];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  job_applications?: Array<{ count: number }> | null;
};

type CandidateRow = {
  id: string;
  tenant_id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  source: string | null;
  contract: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ApplicationRow = {
  id: string;
  tenant_id: string;
  job_id: string;
  candidate_id: string;
  status: JobApplication["status"];
  cover_letter: string | null;
  screening_answers: unknown;
  ai_match_score?: number | null;
  ai_match_report?: unknown | null;
  ai_analysis_status?: string;
  ai_analysis_error?: string | null;
  ai_analyzed_at?: string | null;
  created_at: string;
  updated_at: string;
};

type ApplicationWithCandidateRow = ApplicationRow & {
  candidates: CandidateRow | CandidateRow[] | null;
};

type ApplicationWithRelationsRow = ApplicationRow & {
  candidates: CandidateRow | CandidateRow[] | null;
  jobs: JobRow | JobRow[] | null;
};

type CandidateProfileRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  city: string | null;
  state: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  professional_summary: string | null;
  desired_position: string | null;
  salary_expectation: number | null;
  years_experience: number | null;
  skills: string[] | null;
  education: unknown;
  experience: unknown;
  resume_file_name: string | null;
  resume_file_path: string | null;
  resume_mime_type: string | null;
  resume_size_bytes: number | null;
};

function mapJob(row: JobRow): Job {
  const questions = Array.isArray(row.screening_questions)
    ? (row.screening_questions as JobQuestion[])
    : [];
  const applicationsCount = Array.isArray(row.job_applications)
    ? Number(row.job_applications[0]?.count ?? 0)
    : 0;
  const comp = row.company;
  const company = Array.isArray(comp) ? comp[0] : comp;

  return {
    id: row.id,
    tenantId: row.tenant_id,
    companyId: row.company_id,
    companyName: company?.name ?? null,
    title: row.title,
    description: row.description,
    department: row.department,
    location: row.location,
    employmentType: row.employment_type,
    city: row.city,
    state: row.state,
    salary: row.salary,
    expiresAt: row.expires_at,
    skills: row.skills ?? [],
    screeningQuestions: questions,
    documentRequirements: parseJobDocumentRequirements(row.document_requirements ?? []).map((item) => ({
      id: item.id,
      docTab: item.docTab,
      docType: item.docType,
      label: item.label,
      platformDocumentTypeId: item.platformDocumentTypeId
    })),
    aiScreeningCriteria: parseJobAiScreeningCriteria(row.ai_screening_criteria),
    applicationsCount,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapCandidate(row: CandidateRow): Candidate {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    cpf: row.cpf,
    source: row.source,
    contract: row.contract,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapApplication(row: ApplicationRow): JobApplication {
  const screeningAnswers = Array.isArray(row.screening_answers)
    ? (row.screening_answers as JobQuestionAnswer[])
    : [];
  return {
    id: row.id,
    tenantId: row.tenant_id,
    jobId: row.job_id,
    candidateId: row.candidate_id,
    status: row.status,
    coverLetter: row.cover_letter,
    screeningAnswers,
    aiMatchScore: row.ai_match_score ?? null,
    aiMatchReport: row.ai_match_report ?? null,
    aiAnalysisStatus: row.ai_analysis_status ?? "pending",
    aiAnalysisError: row.ai_analysis_error ?? null,
    aiAnalyzedAt: row.ai_analyzed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapApplicationWithCandidate(row: ApplicationWithCandidateRow): JobApplicationWithCandidate {
  const candidate = pickOne(row.candidates);
  if (!candidate) {
    throw new Error("APPLICATION_CANDIDATE_NOT_FOUND");
  }

  return {
    ...mapApplication(row),
    candidate: {
      id: candidate.id,
      userId: candidate.user_id,
      fullName: candidate.full_name,
      email: candidate.email,
      phone: candidate.phone,
      cpf: candidate.cpf,
      source: candidate.source,
      contract: candidate.contract,
      isActive: candidate.is_active
    }
  };
}

function mapApplicationWithRelations(row: ApplicationWithRelationsRow): JobApplicationWithRelations {
  const candidate = pickOne(row.candidates);
  const job = pickOne(row.jobs);
  if (!candidate) throw new Error("APPLICATION_CANDIDATE_NOT_FOUND");
  if (!job) throw new Error("JOB_NOT_FOUND");

  return {
    ...mapApplication(row),
    candidate: {
      id: candidate.id,
      userId: candidate.user_id,
      fullName: candidate.full_name,
      email: candidate.email,
      phone: candidate.phone,
      cpf: candidate.cpf,
      source: candidate.source,
      contract: candidate.contract,
      isActive: candidate.is_active
    },
    job: {
      id: job.id,
      tenantId: job.tenant_id,
      companyId: job.company_id,
      companyName: (() => {
        const c = job.company;
        const one = Array.isArray(c) ? c[0] : c;
        return one?.name ?? null;
      })(),
      title: job.title,
      description: job.description,
      status: job.status,
      department: job.department,
      location: job.location,
      employmentType: job.employment_type,
      city: job.city,
      state: job.state,
      salary: job.salary,
      expiresAt: job.expires_at,
      skills: job.skills ?? [],
      screeningQuestions: Array.isArray(job.screening_questions)
        ? (job.screening_questions as JobQuestion[])
        : [],
      documentRequirements: parseJobDocumentRequirements(job.document_requirements ?? []).map((item) => ({
        id: item.id,
        docTab: item.docTab,
        docType: item.docType,
        label: item.label,
        platformDocumentTypeId: item.platformDocumentTypeId
      })),
      aiScreeningCriteria: parseJobAiScreeningCriteria(job.ai_screening_criteria)
    },
    candidateProfile: null
  };
}

function parseTimeline(value: unknown): CandidateTimelineItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;
      const row = item as Record<string, unknown>;
      const title = typeof row.title === "string" ? row.title.trim() : "";
      if (!title) return null;
      return {
        id:
          typeof row.id === "string" && row.id.trim().length > 0
            ? row.id
            : `item-${Math.random().toString(36).slice(2, 10)}`,
        title,
        startDate: typeof row.startDate === "string" && row.startDate ? row.startDate : null,
        endDate: typeof row.endDate === "string" && row.endDate ? row.endDate : null,
        isCurrent: typeof row.isCurrent === "boolean" ? row.isCurrent : false,
        description:
          typeof row.description === "string" && row.description.trim().length > 0
            ? row.description.trim()
            : null
      };
    })
    .filter((item): item is CandidateTimelineItem => item !== null);
}

function mapCandidateProfileSummary(row: CandidateProfileRow): CandidateProfileSummary {
  return {
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    cpf: row.cpf,
    city: row.city,
    state: row.state,
    linkedinUrl: row.linkedin_url,
    portfolioUrl: row.portfolio_url,
    professionalSummary: row.professional_summary,
    desiredPosition: row.desired_position,
    salaryExpectation: row.salary_expectation,
    yearsExperience: row.years_experience,
    skills: row.skills ?? [],
    education: parseTimeline(row.education),
    experience: parseTimeline(row.experience),
    resumeFileName: row.resume_file_name,
    resumeFilePath: row.resume_file_path,
    resumeMimeType: row.resume_mime_type,
    resumeSizeBytes: row.resume_size_bytes
  };
}

export class RecruitmentRepository {
  constructor(private readonly db: SupabaseClient) {}

  async getTenantUserCompanyId(tenantId: string, userId: string): Promise<string | null> {
    const { data, error } = await this.db
      .from("tenant_user_profiles")
      .select("company_id")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data as { company_id: string } | null)?.company_id ?? null;
  }

  async createJob(input: CreateJobInput): Promise<Job> {
    const { data, error } = await this.db
      .from("jobs")
      .insert({
        tenant_id: input.tenantId,
        company_id: input.companyId,
        title: input.title,
        description: input.description,
        department: input.department ?? null,
        location: input.location ?? null,
        employment_type: input.employmentType ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        salary: input.salary ?? null,
        expires_at: input.expiresAt ?? null,
        skills: normalizeSkillList(input.skills ?? []),
        screening_questions: input.screeningQuestions ?? [],
        document_requirements: input.documentRequirements ?? [],
        ai_screening_criteria: input.aiScreeningCriteria ?? {},
        status: input.status ?? "draft",
        created_by: input.userId
      })
      .select("*")
      .single();

    if (error) throw error;
    await this.upsertSkillTags(input.skills ?? [], input.userId);
    return mapJob(data as JobRow);
  }

  async listJobs(input: ListJobsInput): Promise<PaginationResult<Job>> {
    let query = withCompany(
      this.db
        .from("jobs")
        .select(
          `
        *,
        company:tenant_companies!jobs_company_id_fkey(id,name),
        job_applications(count)
      `
        )
        .eq("tenant_id", input.tenantId),
      input.companyId
    ).order("created_at", { ascending: false });

    if (input.status) {
      query = query.eq("status", input.status);
    }

    if (input.title) {
      query = query.ilike("title", `%${input.title}%`);
    }

    const offset = (input.page - 1) * input.pageSize;
    const { data, error } = await query.range(offset, offset + input.pageSize - 1);

    if (error) throw error;
    return {
      items: ((data ?? []) as JobRow[]).map(mapJob),
      page: input.page,
      pageSize: input.pageSize
    };
  }

  async getJobById(
    tenantId: string,
    jobId: string,
    companyId?: string | null
  ): Promise<Job | null> {
    const { data, error } = await withCompany(
      this.db
        .from("jobs")
        .select(
          `
        *,
        company:tenant_companies!jobs_company_id_fkey(id,name),
        job_applications(count)
      `
        )
        .eq("tenant_id", tenantId)
        .eq("id", jobId),
      companyId
    ).maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return mapJob(data as JobRow);
  }

  async updateJob(input: UpdateJobInput): Promise<Job> {
    const patch: Record<string, unknown> = {};
    if (typeof input.title !== "undefined") patch.title = input.title;
    if (typeof input.description !== "undefined") patch.description = input.description;
    if (typeof input.department !== "undefined") patch.department = input.department;
    if (typeof input.location !== "undefined") patch.location = input.location;
    if (typeof input.employmentType !== "undefined") patch.employment_type = input.employmentType;
    if (typeof input.city !== "undefined") patch.city = input.city;
    if (typeof input.state !== "undefined") patch.state = input.state;
    if (typeof input.salary !== "undefined") patch.salary = input.salary;
    if (typeof input.expiresAt !== "undefined") patch.expires_at = input.expiresAt;
    if (typeof input.skills !== "undefined") patch.skills = normalizeSkillList(input.skills);
    if (typeof input.screeningQuestions !== "undefined") patch.screening_questions = input.screeningQuestions;
    if (typeof input.documentRequirements !== "undefined") patch.document_requirements = input.documentRequirements;
    if (typeof input.aiScreeningCriteria !== "undefined") patch.ai_screening_criteria = input.aiScreeningCriteria;
    if (typeof input.status !== "undefined") patch.status = input.status;

    let updateQuery = this.db
      .from("jobs")
      .update(patch)
      .eq("tenant_id", input.tenantId)
      .eq("id", input.jobId);
    if (input.companyId) updateQuery = updateQuery.eq("company_id", input.companyId);
    const { data, error } = await updateQuery
      .select(
        `
        *,
        company:tenant_companies!jobs_company_id_fkey(id,name)
      `
      )
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("JOB_NOT_FOUND");
    if (typeof input.skills !== "undefined") {
      await this.upsertSkillTags(input.skills);
    }
    return mapJob(data as JobRow);
  }

  async deleteJob(input: {
    tenantId: string;
    jobId: string;
    companyId?: string | null;
  }): Promise<void> {
    const { error } = await withCompany(
      this.db.from("jobs").delete().eq("tenant_id", input.tenantId).eq("id", input.jobId),
      input.companyId
    );
    if (error) throw error;
  }

  async getCandidateByEmail(tenantId: string, email: string): Promise<Candidate | null> {
    const { data, error } = await this.db
      .from("candidates")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return mapCandidate(data as CandidateRow);
  }

  async createCandidate(tenantId: string, input: CreateApplicationInput["candidate"]): Promise<Candidate> {
    const { data, error } = await this.db
      .from("candidates")
      .insert({
        tenant_id: tenantId,
        full_name: input.fullName,
        email: input.email.toLowerCase(),
        phone: input.phone ?? null,
        cpf: input.cpf ?? null,
        source: input.source ?? null,
        contract: input.contract ?? null,
        is_active: true
      })
      .select("*")
      .single();

    if (error) throw error;
    return mapCandidate(data as CandidateRow);
  }

  async createApplication(input: {
    tenantId: string;
    jobId: string;
    candidateId: string;
    coverLetter?: string | null;
    screeningAnswers?: JobQuestionAnswer[];
  }): Promise<JobApplication> {
    const { data, error } = await this.db
      .from("job_applications")
      .insert({
        tenant_id: input.tenantId,
        job_id: input.jobId,
        candidate_id: input.candidateId,
        status: "submitted",
        cover_letter: input.coverLetter ?? null,
        screening_answers: input.screeningAnswers ?? []
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("APPLICATION_ALREADY_EXISTS");
      }
      throw error;
    }
    return mapApplication(data as ApplicationRow);
  }

  async listJobApplications(input: ListApplicationsInput): Promise<PaginationResult<JobApplicationWithCandidate>> {
    let query = this.db
      .from("job_applications")
      .select(
        `
        *,
        candidates:candidate_id (
          id,
          tenant_id,
          user_id,
          full_name,
          email,
          phone,
          cpf,
          source,
          contract,
          is_active,
          created_at,
          updated_at
        )
      `
      )
      .eq("tenant_id", input.tenantId)
      .eq("job_id", input.jobId)
      .order("created_at", { ascending: false });

    if (input.status) {
      query = query.eq("status", input.status);
    }

    if (input.candidateName) {
      query = query.ilike("candidates.full_name", `%${input.candidateName}%`);
    }

    const offset = (input.page - 1) * input.pageSize;
    const { data, error } = await query.range(offset, offset + input.pageSize - 1);
    if (error) throw error;
    return {
      items: ((data ?? []) as ApplicationWithCandidateRow[]).map(mapApplicationWithCandidate),
      page: input.page,
      pageSize: input.pageSize
    };
  }

  async updateApplicationStatus(input: UpdateApplicationStatusInput): Promise<JobApplicationWithCandidate> {
    const { data, error } = await this.db
      .from("job_applications")
      .update({
        status: input.status
      })
      .eq("tenant_id", input.tenantId)
      .eq("job_id", input.jobId)
      .eq("id", input.applicationId)
      .select(
        `
        *,
        candidates:candidate_id (
          id,
          tenant_id,
          user_id,
          full_name,
          email,
          phone,
          cpf,
          source,
          contract,
          is_active,
          created_at,
          updated_at
        )
      `
      )
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("APPLICATION_NOT_FOUND");

    const mapped = mapApplicationWithCandidate(data as ApplicationWithCandidateRow);

    await this.insertAuditLog({
      tenantId: input.tenantId,
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      action: "recruitment.application.status_updated",
      resourceType: "job_application",
      resourceId: input.applicationId,
      metadata: {
        jobId: input.jobId,
        candidateId: mapped.candidateId,
        newStatus: input.status
      }
    });

    return mapped;
  }

  async listTenantApplications(input: ListTenantApplicationsInput): Promise<PaginationResult<JobApplicationWithRelations>> {
    let jobIdsInCompany: string[] | null = null;
    if (input.companyId) {
      const { data: jobRows, error: jobErr } = await this.db
        .from("jobs")
        .select("id")
        .eq("tenant_id", input.tenantId)
        .eq("company_id", input.companyId);
      if (jobErr) throw jobErr;
      jobIdsInCompany = (jobRows ?? []).map((r) => (r as { id: string }).id);
      if (jobIdsInCompany.length === 0) {
        return { items: [], page: input.page, pageSize: input.pageSize };
      }
    }

    let query = this.db
      .from("job_applications")
      .select(
        `
        *,
        candidates:candidate_id (
          id,
          tenant_id,
          user_id,
          full_name,
          email,
          phone,
          cpf,
          source,
          contract,
          is_active,
          created_at,
          updated_at
        ),
        jobs:job_id (
          id,
          tenant_id,
          company_id,
          title,
          description,
          status,
          department,
          location,
          employment_type,
          city,
          state,
          salary,
          expires_at,
          skills,
          screening_questions,
          document_requirements,
          ai_screening_criteria,
          company:tenant_companies!jobs_company_id_fkey(id,name)
        )
      `
      )
      .eq("tenant_id", input.tenantId)
      .order("created_at", { ascending: false });

    if (jobIdsInCompany) {
      query = query.in("job_id", jobIdsInCompany);
    }

    if (input.jobId) {
      query = query.eq("job_id", input.jobId);
    }
    if (input.status) {
      query = query.eq("status", input.status);
    }
    if (input.candidateName) {
      query = query.ilike("candidates.full_name", `%${input.candidateName}%`);
    }
    if (input.candidateEmail?.trim()) {
      query = query.ilike("candidates.email", `%${input.candidateEmail.trim().toLowerCase()}%`);
    }
    if (input.candidateCpf?.trim()) {
      const digits = input.candidateCpf.replace(/\D/g, "");
      if (digits.length >= 4) {
        query = query.ilike("candidates.cpf", `%${digits}%`);
      }
    }
    if (input.createdFrom) {
      query = query.gte("created_at", `${input.createdFrom}T00:00:00.000Z`);
    }
    if (input.createdTo) {
      query = query.lte("created_at", `${input.createdTo}T23:59:59.999Z`);
    }

    const offset = (input.page - 1) * input.pageSize;
    const { data, error } = await query.range(offset, offset + input.pageSize - 1);
    if (error) throw error;

    return {
      items: ((data ?? []) as ApplicationWithRelationsRow[]).map(mapApplicationWithRelations),
      page: input.page,
      pageSize: input.pageSize
    };
  }

  async getTenantApplicationById(input: {
    tenantId: string;
    applicationId: string;
    companyId?: string | null;
  }): Promise<JobApplicationWithRelations | null> {
    const { data, error } = await this.db
      .from("job_applications")
      .select(
        `
        *,
        candidates:candidate_id (
          id,
          tenant_id,
          user_id,
          full_name,
          email,
          phone,
          cpf,
          source,
          contract,
          is_active,
          created_at,
          updated_at
        ),
        jobs:job_id (
          id,
          tenant_id,
          company_id,
          title,
          description,
          status,
          department,
          location,
          employment_type,
          city,
          state,
          salary,
          expires_at,
          skills,
          screening_questions,
          document_requirements,
          ai_screening_criteria,
          company:tenant_companies!jobs_company_id_fkey(id,name)
        )
      `
      )
      .eq("tenant_id", input.tenantId)
      .eq("id", input.applicationId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    if (input.companyId) {
      const job = pickOne((data as ApplicationWithRelationsRow).jobs);
      if (!job || (job as JobRow).company_id !== input.companyId) return null;
    }
    const mapped = mapApplicationWithRelations(data as ApplicationWithRelationsRow);
    const candidate = pickOne((data as ApplicationWithRelationsRow).candidates);
    if (!candidate?.user_id) return mapped;

    const { data: profileData, error: profileError } = await this.db
      .from("candidate_profiles")
      .select(
        `
        user_id,
        full_name,
        email,
        phone,
        cpf,
        city,
        state,
        linkedin_url,
        portfolio_url,
        professional_summary,
        desired_position,
        salary_expectation,
        years_experience,
        skills,
        education,
        experience,
        resume_file_name,
        resume_file_path,
        resume_mime_type,
        resume_size_bytes
      `
      )
      .eq("user_id", candidate.user_id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profileData) return mapped;

    return {
      ...mapped,
      candidateProfile: mapCandidateProfileSummary(profileData as CandidateProfileRow)
    };
  }

  async archiveApplicationsByJobId(input: { tenantId: string; jobId: string }): Promise<number> {
    const { data, error } = await this.db
      .from("job_applications")
      .update({ status: "archived" })
      .eq("tenant_id", input.tenantId)
      .eq("job_id", input.jobId)
      .neq("status", "archived")
      .select("id");
    if (error) throw error;
    return data?.length ?? 0;
  }

  async listCandidates(input: ListCandidatesInput): Promise<PaginationResult<Candidate>> {
    let query = this.db
      .from("candidates")
      .select("*")
      .eq("tenant_id", input.tenantId)
      .order("created_at", { ascending: false });

    if (input.candidateName) {
      query = query.ilike("full_name", `%${input.candidateName}%`);
    }
    if (input.contract) {
      query = query.eq("contract", input.contract);
    }
    if (typeof input.isActive === "boolean") {
      query = query.eq("is_active", input.isActive);
    }

    const offset = (input.page - 1) * input.pageSize;
    const { data, error } = await query.range(offset, offset + input.pageSize - 1);
    if (error) throw error;
    return {
      items: ((data ?? []) as CandidateRow[]).map(mapCandidate),
      page: input.page,
      pageSize: input.pageSize
    };
  }

  async getCandidateById(tenantId: string, candidateId: string): Promise<Candidate | null> {
    const { data, error } = await this.db
      .from("candidates")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", candidateId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapCandidate(data as CandidateRow);
  }

  async updateCandidateStatus(input: {
    tenantId: string;
    candidateId: string;
    isActive: boolean;
  }): Promise<Candidate> {
    const { data, error } = await this.db
      .from("candidates")
      .update({ is_active: input.isActive })
      .eq("tenant_id", input.tenantId)
      .eq("id", input.candidateId)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("CANDIDATE_NOT_FOUND");
    return mapCandidate(data as CandidateRow);
  }

  async deleteInactiveCandidate(input: { tenantId: string; candidateId: string }): Promise<void> {
    const { error } = await this.db
      .from("candidates")
      .delete()
      .eq("tenant_id", input.tenantId)
      .eq("id", input.candidateId)
      .eq("is_active", false);
    if (error) throw error;
  }

  async listPublishedJobsByTenantSlug(input: {
    tenantSlug: string;
    companyId?: string | null;
    page: number;
    pageSize: number;
  }): Promise<PublicJobsListResult> {
    const { data: tenantData, error: tenantError } = await this.db
      .from("tenants")
      .select("id,is_active,display_name")
      .eq("slug", input.tenantSlug)
      .maybeSingle();
    if (tenantError) throw tenantError;
    if (!tenantData || !tenantData.is_active) {
      return {
        items: [],
        page: input.page,
        pageSize: input.pageSize,
        tenantDisplayName: null,
        companies: []
      };
    }

    const row = tenantData as { id: string; display_name: string };
    const tenantDisplayName = row.display_name?.trim() ? row.display_name.trim() : null;

    const { data: companyRows, error: companiesError } = await this.db
      .from("tenant_companies")
      .select("id,name")
      .eq("tenant_id", row.id)
      .order("name", { ascending: true });
    if (companiesError) throw companiesError;
    const companies = ((companyRows ?? []) as { id: string; name: string }[]).map((c) => ({
      id: c.id,
      name: c.name
    }));

    const offset = (input.page - 1) * input.pageSize;
    let jobsQuery = withCompany(
      this.db
        .from("jobs")
        .select(
          `
        *,
        company:tenant_companies!jobs_company_id_fkey(id,name)
      `
        )
        .eq("tenant_id", row.id)
        .eq("status", "published")
        .order("created_at", { ascending: false }),
      input.companyId ?? undefined
    );
    const { data, error } = await jobsQuery.range(offset, offset + input.pageSize - 1);
    if (error) throw error;

    return {
      items: ((data ?? []) as JobRow[]).map(mapJob),
      page: input.page,
      pageSize: input.pageSize,
      tenantDisplayName,
      companies
    };
  }

  async getPublishedJobByTenantSlug(
    tenantSlug: string,
    jobId: string,
    companyId?: string | null
  ): Promise<Job | null> {
    const { data: tenantData, error: tenantError } = await this.db
      .from("tenants")
      .select("id,is_active")
      .eq("slug", tenantSlug)
      .maybeSingle();
    if (tenantError) throw tenantError;
    if (!tenantData || !tenantData.is_active) return null;

    const { data, error } = await withCompany(
      this.db
        .from("jobs")
        .select(
          `
        *,
        company:tenant_companies!jobs_company_id_fkey(id,name)
      `
        )
        .eq("tenant_id", tenantData.id)
        .eq("id", jobId)
        .eq("status", "published"),
      companyId
    ).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapJob(data as JobRow);
  }

  async insertAuditLog(input: {
    tenantId: string;
    companyId?: string | null;
    actorUserId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    const companyId =
      input.companyId ?? (await fetchDefaultTenantCompanyId(this.db, input.tenantId));
    const { error } = await this.db.from("audit_logs").insert({
      tenant_id: input.tenantId,
      company_id: companyId,
      actor_user_id: input.actorUserId,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      result: "success",
      metadata: input.metadata
    });
    if (error) throw error;
  }

  async upsertSkillTags(skills: string[], userId?: string): Promise<void> {
    const normalizedSkills = normalizeSkillList(skills);
    if (normalizedSkills.length === 0) return;

    const payload = normalizedSkills.map((normalized) => ({
      normalized,
      label: cleanSkillLabel(normalized.replace(/-/g, " ")),
      created_by_user_id: userId ?? null
    }));

    const { error } = await this.db.from("skill_tags").upsert(payload, { onConflict: "normalized" });
    if (error) throw error;
  }

  async listSkillTags(input: { query?: string; limit: number }): Promise<Array<{ normalized: string; label: string }>> {
    let query = this.db
      .from("skill_tags")
      .select("normalized,label")
      .order("label", { ascending: true })
      .limit(input.limit);

    if (input.query?.trim()) {
      query = query.ilike("label", `%${input.query.trim()}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Array<{ normalized: string; label: string }>;
  }

  async getExistingSkillTags(normalizedSkills: string[]): Promise<string[]> {
    if (normalizedSkills.length === 0) return [];

    const { data, error } = await this.db
      .from("skill_tags")
      .select("normalized")
      .in("normalized", normalizedSkills);
    if (error) throw error;
    return ((data ?? []) as Array<{ normalized: string }>).map((item) => item.normalized);
  }

  async findApplicationForJob(input: {
    tenantId: string;
    jobId: string;
    applicationId: string;
  }): Promise<{ id: string } | null> {
    const { data, error } = await this.db
      .from("job_applications")
      .select("id")
      .eq("tenant_id", input.tenantId)
      .eq("job_id", input.jobId)
      .eq("id", input.applicationId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { id: (data as { id: string }).id };
  }

  async resetApplicationAiAnalysisToPending(input: { tenantId: string; applicationId: string }): Promise<void> {
    const { error } = await this.db
      .from("job_applications")
      .update({
        ai_analysis_status: "pending",
        ai_analysis_error: null,
        ai_match_score: null,
        ai_match_report: null,
        ai_analyzed_at: null
      })
      .eq("tenant_id", input.tenantId)
      .eq("id", input.applicationId);
    if (error) throw error;
  }

  async listPendingResumeApplicationsForAi(
    limit: number
  ): Promise<Array<{ tenantId: string; applicationId: string }>> {
    const { data, error } = await this.db
      .from("job_applications")
      .select("id, tenant_id")
      .eq("ai_analysis_status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((row) => {
      const r = row as { id: string; tenant_id: string };
      return { applicationId: r.id, tenantId: r.tenant_id };
    });
  }

  async listDocumentsForJobApplication(
    tenantId: string,
    applicationId: string
  ): Promise<Array<{ filePath: string; label: string }>> {
    const pattern = `%/job-applications/${applicationId}/%`;
    const { data, error } = await this.db
      .from("documents")
      .select("file_path, title, category, doc_type")
      .eq("tenant_id", tenantId)
      .ilike("file_path", pattern);
    if (error) throw error;
    return (data ?? []).map((doc) => {
      const d = doc as { file_path: string; title: string; category: string; doc_type: string };
      const label = (d.title && d.title.trim()) || d.doc_type || d.category || "Documento";
      return { filePath: d.file_path, label };
    });
  }

  async updateApplicationAiAnalysis(input: {
    tenantId: string;
    applicationId: string;
    aiMatchScore: number | null;
    aiMatchReport: unknown | null;
    aiAnalysisStatus: string;
    aiAnalysisError: string | null;
    aiAnalyzedAt: string | null;
  }): Promise<void> {
    const { error } = await this.db
      .from("job_applications")
      .update({
        ai_match_score: input.aiMatchScore,
        ai_match_report: input.aiMatchReport,
        ai_analysis_status: input.aiAnalysisStatus,
        ai_analysis_error: input.aiAnalysisError,
        ai_analyzed_at: input.aiAnalyzedAt
      })
      .eq("tenant_id", input.tenantId)
      .eq("id", input.applicationId);
    if (error) throw error;
  }

  async mergeCandidateProfileSkills(input: { userId: string; extraSkills: string[] }): Promise<void> {
    const normalized = normalizeSkillList(input.extraSkills);
    if (normalized.length === 0) return;

    const { data: row, error } = await this.db
      .from("candidate_profiles")
      .select("skills")
      .eq("user_id", input.userId)
      .maybeSingle();
    if (error) throw error;
    const current = normalizeSkillList((row as { skills: string[] | null } | null)?.skills ?? []);
    const merged = normalizeSkillList([...current, ...normalized]);
    await this.upsertSkillTags(merged, input.userId);
    const { error: upErr } = await this.db.from("candidate_profiles").update({ skills: merged }).eq("user_id", input.userId);
    if (upErr) throw upErr;
  }
}
