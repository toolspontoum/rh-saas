export type CandidateTimelineItem = {
  id: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
};

export type CandidateProfile = {
  id: string;
  userId: string;
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
  profileImageFileName: string | null;
  profileImagePath: string | null;
  profileImageMimeType: string | null;
  profileImageSizeBytes: number | null;
  createdAt: string;
  updatedAt: string;
};

export type JobDocumentRequirement = {
  id: string;
  docTab: string;
  docType: string;
  label: string | null;
};

export type PublicJobCatalogItem = {
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
  createdAt: string;
};

export type JobQuestion = {
  id: string;
  label: string;
  type: "yes_no" | "document_upload" | "text";
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

export type SkillTag = {
  normalized: string;
  label: string;
};

export type MyJobApplication = {
  id: string;
  status: "submitted" | "in_review" | "approved" | "rejected" | "archived" | "withdrawn";
  coverLetter: string | null;
  createdAt: string;
  updatedAt: string;
  job: {
    id: string;
    title: string;
    department: string | null;
    city: string | null;
    state: string | null;
    employmentType: string | null;
    status: "draft" | "published" | "closed";
  };
  tenant: {
    id: string;
    slug: string;
    displayName: string;
  };
};

/** Empresa (assinante) com vagas publicadas na vitrine do candidato */
export type JobEmployerSummary = {
  tenantId: string;
  slug: string;
  displayName: string;
  publishedJobCount: number;
  /** Maior sobreposição de habilidades (perfil × vaga) entre as vagas desta empresa */
  matchScore: number;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
};

export type ResumeUploadIntent = {
  bucket: string;
  path: string;
  token: string;
  signedUrl: string;
  expiresIn: number;
};
