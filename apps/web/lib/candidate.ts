import { apiFetch } from "./api";

export type TimelineItem = {
  id: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
};

export type CandidateProfile = {
  id: string;
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
  education: TimelineItem[];
  experience: TimelineItem[];
  resumeFileName: string | null;
  resumeFilePath: string | null;
  resumeMimeType: string | null;
  profileImageFileName: string | null;
  profileImagePath: string | null;
  profileImageMimeType: string | null;
  profileImageSizeBytes: number | null;
};

export type JobDocumentRequirement = {
  id: string;
  docTab: string;
  docType: string;
  label: string | null;
};

export type PublicJob = {
  id: string;
  tenantId: string;
  companyId: string;
  tenantSlug: string;
  tenantDisplayName: string;
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
  matchScore?: number;
};

export type JobQuestion = {
  id: string;
  label: string;
  type: "yes_no" | "text";
  isRequired: boolean;
  isEliminatory: boolean;
  notes: string | null;
};

export type JobQuestionAnswer = {
  questionId: string;
  answerBoolean: boolean | null;
  answerText: string | null;
  answerFile: string | null;
};

export type MyApplication = {
  id: string;
  status: "submitted" | "in_review" | "approved" | "rejected" | "archived" | "withdrawn";
  coverLetter: string | null;
  createdAt: string;
  job: { id: string; title: string };
  tenant: { slug: string; displayName: string };
};

/** Empresa com vagas publicadas (vitrine do candidato) */
export type JobEmployer = {
  tenantId: string;
  slug: string;
  displayName: string;
  publishedJobCount: number;
  matchScore: number;
};

type Paginated<T> = { items: T[] };
type PaginatedPage<T> = { items: T[]; page: number; pageSize: number };

export async function getCandidateProfile() {
  return apiFetch<CandidateProfile | null>("/v1/me/candidate-profile");
}

export async function saveCandidateProfile(payload: Record<string, unknown>) {
  return apiFetch<CandidateProfile>("/v1/me/candidate-profile", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function processCandidateResumeWithAi(file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<CandidateProfile>("/v1/me/candidate-profile/resume/process-with-ai", {
    method: "POST",
    body: form
  });
}

type UploadIntent = {
  path: string;
  signedUrl: string;
};

export async function createCandidateAvatarUploadIntent(input: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}) {
  return apiFetch<UploadIntent>("/v1/me/candidate-profile/avatar/upload-intent", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function confirmCandidateAvatarUpload(input: {
  fileName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
}) {
  return apiFetch<CandidateProfile>("/v1/me/candidate-profile/avatar/confirm-upload", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

/** Listagem global desativada na API; use vagas por slug do assinante ou sugestões autenticadas. */
export async function listPublicJobs(_params: { title?: string }): Promise<Paginated<PublicJob>> {
  void _params;
  throw new Error(
    "Listagem global de vagas não está disponível. Use o link público da empresa (/vagas/{slug}) ou as sugestões na área do candidato."
  );
}

export async function listSuggestedJobs() {
  return apiFetch<Paginated<PublicJob>>("/v1/me/jobs/suggested?page=1&pageSize=20");
}

export async function listJobEmployers() {
  return apiFetch<{ items: JobEmployer[] }>("/v1/me/jobs/employers");
}

export async function listTenantJobs(tenantId: string, page = 1, pageSize = 120) {
  const q = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return apiFetch<PaginatedPage<PublicJob>>(`/v1/me/jobs/tenant/${encodeURIComponent(tenantId)}?${q}`);
}

/** Carrega todas as páginas de vagas da empresa (ordenadas por match na API). */
export async function loadAllTenantJobs(tenantId: string): Promise<PublicJob[]> {
  const all: PublicJob[] = [];
  let page = 1;
  const pageSize = 150;
  while (true) {
    const batch = await listTenantJobs(tenantId, page, pageSize);
    all.push(...batch.items);
    if (batch.items.length < pageSize) break;
    page += 1;
    if (page > 40) break;
  }
  return all;
}

export async function getPublicJobById(jobId: string) {
  return apiFetch<PublicJob>(`/v1/me/jobs/details/${jobId}`);
}

export async function getPublicJobByIdForGuest(jobId: string) {
  return apiFetch<PublicJob>(`/public/jobs/${jobId}`);
}

export async function getPublicJobByTenantSlugAndId(tenantSlug: string, jobId: string) {
  return apiFetch<PublicJob>(`/public/jobs/${encodeURIComponent(tenantSlug)}/${encodeURIComponent(jobId)}`);
}

export type JobDocumentUploadPayload = {
  requirementId: string;
  fileName: string;
  mimeType: string;
  base64: string;
};

export type JobApplicantDocumentPresenceItem = {
  requirementId: string;
  onFile: boolean;
};

export async function getJobApplicantDocumentPresence(jobId: string) {
  return apiFetch<{ items: JobApplicantDocumentPresenceItem[] }>(
    `/v1/me/jobs/${encodeURIComponent(jobId)}/application-documents`
  );
}

export async function applyToJob(
  jobId: string,
  coverLetter: string,
  screeningAnswers: JobQuestionAnswer[],
  jobDocumentUploads?: JobDocumentUploadPayload[],
  reuseExistingRequirementIds?: string[]
) {
  return apiFetch(`/v1/me/jobs/${encodeURIComponent(jobId)}/apply`, {
    method: "POST",
    body: JSON.stringify({ coverLetter, screeningAnswers, jobDocumentUploads, reuseExistingRequirementIds })
  });
}

export async function quickApplyToJob(input: {
  jobId: string;
  fullName: string;
  email: string;
  cpf: string;
  phone: string;
  resumeFileName: string;
  resumeMimeType: string;
  resumeBase64: string;
  coverLetter: string;
  screeningAnswers: JobQuestionAnswer[];
  jobDocumentUploads?: JobDocumentUploadPayload[];
}) {
  return apiFetch<{ applicationId: string; emailSent: boolean; existingAuthAccount: boolean }>(
    `/public/jobs/${input.jobId}/quick-apply`,
    {
      method: "POST",
      body: JSON.stringify({
        fullName: input.fullName,
        email: input.email,
        cpf: input.cpf,
        phone: input.phone,
        resumeFileName: input.resumeFileName,
        resumeMimeType: input.resumeMimeType,
        resumeBase64: input.resumeBase64,
        coverLetter: input.coverLetter,
        screeningAnswers: input.screeningAnswers,
        jobDocumentUploads: input.jobDocumentUploads
      })
    }
  );
}

export async function getMyApplicationByJob(jobId: string) {
  return apiFetch<{
    applied: boolean;
    applicationId: string | null;
    status: MyApplication["status"] | null;
    coverLetter: string | null;
    screeningAnswers: JobQuestionAnswer[];
  }>(`/v1/me/jobs/${jobId}/application`);
}

export async function withdrawMyApplication(jobId: string) {
  return apiFetch<{ ok: true; removed: boolean }>(`/v1/me/jobs/${jobId}/application`, {
    method: "DELETE"
  });
}

export async function listMyApplications() {
  return apiFetch<Paginated<MyApplication>>("/v1/me/job-applications?page=1&pageSize=50");
}

export function isCandidateProfileComplete(profile: CandidateProfile | null): boolean {
  if (!profile) return false;
  return Boolean(profile.fullName && profile.email && profile.skills.length > 0);
}

export function isCoverLetterNonEmpty(html: string): boolean {
  const stripped = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length >= 1;
}

export function statusLabel(status: MyApplication["status"]) {
  switch (status) {
    case "submitted":
      return "Submetida";
    case "in_review":
      return "Em análise";
    case "approved":
      return "Aprovada";
    case "rejected":
      return "Rejeitada";
    case "archived":
      return "Arquivada";
    case "withdrawn":
      return "Candidatura cancelada";
    default:
      return status;
  }
}

