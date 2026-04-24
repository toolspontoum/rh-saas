import type { JobAiScreeningCriteria } from "../../lib/ai-screening-criteria.js";

export type { JobAiScreeningCriteria };

export type JobStatus = "draft" | "published" | "closed";
export type ApplicationStatus =
  | "submitted"
  | "in_review"
  | "approved"
  | "rejected"
  | "archived"
  | "withdrawn";
export type JobQuestionType = "yes_no" | "document_upload" | "text";

/** Documentos exigidos na candidatura (abas/tipos alinhados ao colaborador). */
export type JobDocumentRequirement = {
  id: string;
  docTab: string;
  docType: string;
  label?: string | null;
  /** Quando veio do catálogo de documentos padrão. */
  platformDocumentTypeId?: string | null;
};

export type JobQuestion = {
  id: string;
  label: string;
  type: JobQuestionType;
  isRequired: boolean;
  isEliminatory: boolean;
  expectedAnswer?: "yes" | "no" | null;
  notes: string | null;
};

export type JobQuestionAnswer = {
  questionId: string;
  answerBoolean: boolean | null;
  answerText: string | null;
  answerFile: string | null;
};

export type Job = {
  id: string;
  tenantId: string;
  companyId: string;
  companyName: string | null;
  title: string;
  description: string;
  department: string | null;
  location: string | null;
  employmentType: string | null;
  city: string | null;
  state: string | null;
  salary: number | null;
  expiresAt: string | null;
  skills: string[];
  screeningQuestions: JobQuestion[];
  documentRequirements: JobDocumentRequirement[];
  aiScreeningCriteria: JobAiScreeningCriteria;
  applicationsCount: number;
  status: JobStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Candidate = {
  id: string;
  tenantId: string;
  userId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  source: string | null;
  contract: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CandidateTimelineItem = {
  id: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
};

export type CandidateProfileSummary = {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  city: string | null;
  state: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  professionalSummary: string | null;
  desiredPosition: string | null;
  salaryExpectation: number | null;
  yearsExperience: number | null;
  skills: string[];
  education: CandidateTimelineItem[];
  experience: CandidateTimelineItem[];
  resumeFileName: string | null;
  resumeFilePath: string | null;
  resumeMimeType: string | null;
  resumeSizeBytes: number | null;
};

export type JobApplication = {
  id: string;
  tenantId: string;
  jobId: string;
  candidateId: string;
  status: ApplicationStatus;
  coverLetter: string | null;
  screeningAnswers: JobQuestionAnswer[];
  aiMatchScore: number | null;
  aiMatchReport: unknown | null;
  aiAnalysisStatus: string;
  aiAnalysisError: string | null;
  aiAnalyzedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JobApplicationWithCandidate = JobApplication & {
  candidate: Pick<
    Candidate,
    "id" | "userId" | "fullName" | "email" | "phone" | "cpf" | "source" | "contract" | "isActive"
  >;
};

export type JobApplicationWithRelations = JobApplicationWithCandidate & {
  job: Omit<Job, "tenantId" | "createdBy" | "applicationsCount" | "createdAt" | "updatedAt"> & {
    tenantId: string;
  };
  candidateProfile: CandidateProfileSummary | null;
};

export type CreateJobInput = {
  tenantId: string;
  userId: string;
  companyId?: string | null;
  title: string;
  description: string;
  department?: string | null;
  location?: string | null;
  employmentType?: string | null;
  city?: string | null;
  state?: string | null;
  salary?: number | null;
  expiresAt?: string | null;
  skills?: string[];
  screeningQuestions?: JobQuestion[];
  documentRequirements?: JobDocumentRequirement[];
  aiScreeningCriteria?: JobAiScreeningCriteria;
  status?: JobStatus;
};

export type UpdateJobInput = {
  tenantId: string;
  jobId: string;
  companyId?: string | null;
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
  screeningQuestions?: JobQuestion[];
  documentRequirements?: JobDocumentRequirement[];
  aiScreeningCriteria?: JobAiScreeningCriteria;
  status?: JobStatus;
};

export type CreateApplicationInput = {
  tenantId: string;
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
  screeningAnswers?: JobQuestionAnswer[];
};

export type ListJobApplicationsInput = {
  tenantId: string;
  jobId: string;
  status?: ApplicationStatus;
  candidateName?: string;
};

export type UpdateApplicationStatusInput = {
  tenantId: string;
  jobId: string;
  applicationId: string;
  status: ApplicationStatus;
  actorUserId: string;
  companyId: string;
};

export type ListJobsInput = {
  tenantId: string;
  companyId?: string | null;
  status?: JobStatus;
  title?: string;
  page: number;
  pageSize: number;
};

export type PaginationResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
};

/** Listagem pública por slug: inclui nome de exibição do assinante. */
export type PublicJobsListResult = PaginationResult<Job> & {
  tenantDisplayName: string | null;
  companies: { id: string; name: string }[];
};

export type ListApplicationsInput = ListJobApplicationsInput & {
  page: number;
  pageSize: number;
};

export type ListCandidatesInput = {
  tenantId: string;
  candidateName?: string;
  contract?: string;
  isActive?: boolean;
  page: number;
  pageSize: number;
};

export type ListTenantApplicationsInput = {
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
};

export type SkillTag = {
  normalized: string;
  label: string;
};
