import type { SupabaseClient } from "@supabase/supabase-js";

import { parseJobDocumentRequirements, screeningsWithoutLegacyDocumentUploads } from "../../lib/job-document-requirements.js";
import { cleanSkillLabel, normalizeSkillList, normalizeSkillTag } from "../../lib/skill-tags.js";
import type {
  CandidateProfile,
  CandidateTimelineItem,
  JobDocumentRequirement,
  JobQuestion,
  JobQuestionAnswer,
  MyJobApplication,
  Paginated,
  PublicJobCatalogItem,
  SkillTag
} from "./candidate-portal.types.js";

type CandidateProfileRow = {
  id: string;
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
  profile_image_file_name: string | null;
  profile_image_path: string | null;
  profile_image_mime_type: string | null;
  profile_image_size_bytes: number | null;
  created_at: string;
  updated_at: string;
};

type JobCatalogRow = {
  id: string;
  tenant_id: string;
  company_id: string;
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
  created_at: string;
  tenants:
    | {
        id: string;
        slug: string;
        display_name: string;
        is_active: boolean;
      }
    | Array<{
        id: string;
        slug: string;
        display_name: string;
        is_active: boolean;
      }>
    | null;
};

type MyApplicationRow = {
  id: string;
  status: "submitted" | "in_review" | "approved" | "rejected";
  cover_letter: string | null;
  created_at: string;
  updated_at: string;
  jobs:
    | {
        id: string;
        title: string;
        department: string | null;
        city: string | null;
        state: string | null;
        employment_type: string | null;
        status: "draft" | "published" | "closed";
        tenants:
          | {
              id: string;
              slug: string;
              display_name: string;
            }
          | Array<{
              id: string;
              slug: string;
              display_name: string;
            }>
          | null;
      }
    | Array<{
        id: string;
        title: string;
        department: string | null;
        city: string | null;
        state: string | null;
        employment_type: string | null;
        status: "draft" | "published" | "closed";
        tenants:
          | {
              id: string;
              slug: string;
              display_name: string;
            }
          | Array<{
              id: string;
              slug: string;
              display_name: string;
            }>
          | null;
      }>
    | null;
};

type MyApplicationByJobRow = {
  id: string;
  status: "submitted" | "in_review" | "approved" | "rejected" | "archived";
  job_id: string;
  candidates:
    | {
        id: string;
        user_id: string;
      }
    | Array<{
        id: string;
        user_id: string;
      }>
    | null;
};

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
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
        description: typeof row.description === "string" && row.description.trim() ? row.description.trim() : null
      };
    })
    .map((item) => {
      if (!item) return item;
      if (item.isCurrent) {
        return { ...item, endDate: null };
      }
      return item;
    })
    .filter((item): item is CandidateTimelineItem => item !== null);
}

function mapProfile(row: CandidateProfileRow): CandidateProfile {
  return {
    id: row.id,
    userId: row.user_id,
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
    resumeSizeBytes: row.resume_size_bytes,
    profileImageFileName: row.profile_image_file_name,
    profileImagePath: row.profile_image_path,
    profileImageMimeType: row.profile_image_mime_type,
    profileImageSizeBytes: row.profile_image_size_bytes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapCatalogItem(row: JobCatalogRow): PublicJobCatalogItem {
  const tenant = pickOne(row.tenants);
  if (!tenant) {
    throw new Error("TENANT_NOT_FOUND");
  }

  return {
    id: row.id,
    tenantId: row.tenant_id,
    companyId: row.company_id,
    tenantSlug: tenant.slug,
    tenantDisplayName: tenant.display_name,
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
    screeningQuestions: screeningsWithoutLegacyDocumentUploads(
      Array.isArray(row.screening_questions) ? (row.screening_questions as JobQuestion[]) : []
    ),
    documentRequirements: parseJobDocumentRequirements(row.document_requirements ?? []).map(
      (item): JobDocumentRequirement => ({
        id: item.id,
        docTab: item.docTab,
        docType: item.docType,
        label: item.label
      })
    ),
    createdAt: row.created_at
  };
}

function mapMyApplication(row: MyApplicationRow): MyJobApplication {
  const job = pickOne(row.jobs);
  if (!job) {
    throw new Error("JOB_NOT_FOUND");
  }
  const tenant = pickOne(job.tenants);
  if (!tenant) {
    throw new Error("TENANT_NOT_FOUND");
  }

  return {
    id: row.id,
    status: row.status,
    coverLetter: row.cover_letter,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    job: {
      id: job.id,
      title: job.title,
      department: job.department,
      city: job.city,
      state: job.state,
      employmentType: job.employment_type,
      status: job.status
    },
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      displayName: tenant.display_name
    }
  };
}

export class CandidatePortalRepository {
  constructor(private readonly db: SupabaseClient) {}

  async getProfileByUserId(userId: string): Promise<CandidateProfile | null> {
    const { data, error } = await this.db
      .from("candidate_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return mapProfile(data as CandidateProfileRow);
  }

  /**
   * Preenche nome/e-mail do perfil a partir do cadastro (auth.users) na primeira visita
   * ou quando o e-mail do perfil não bate com o e-mail de login.
   */
  async mergeAuthIdentityIntoProfile(
    userId: string,
    identity: { fullName: string | null; email: string | null }
  ): Promise<CandidateProfile | null> {
    const normalizedEmail = identity.email?.trim().toLowerCase() ?? null;
    const normalizedName = identity.fullName?.trim() ?? null;

    const { data: existing, error: fetchErr } = await this.db
      .from("candidate_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;

    if (!existing) {
      if (!normalizedEmail && !normalizedName) return null;
      return this.upsertProfile({
        userId,
        fullName: normalizedName ?? "",
        email: normalizedEmail ?? "",
        skills: [],
        education: [],
        experience: []
      });
    }

    const row = existing as CandidateProfileRow;
    const emailMismatch =
      Boolean(normalizedEmail) &&
      (row.email?.trim().toLowerCase() ?? "") !== normalizedEmail;
    const needName = Boolean(normalizedName) && !row.full_name?.trim();
    const needEmailEmpty = Boolean(normalizedEmail) && !row.email?.trim();

    if (!emailMismatch && !needName && !needEmailEmpty) {
      return mapProfile(row);
    }

    const patch: Record<string, unknown> = {};
    if (needName) patch.full_name = normalizedName;
    if (needEmailEmpty || emailMismatch) patch.email = normalizedEmail;

    const { data, error } = await this.db
      .from("candidate_profiles")
      .update(patch)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) throw error;
    return mapProfile(data as CandidateProfileRow);
  }

  async syncLinkedCandidatesIdentity(
    userId: string,
    patch: { fullName: string; email: string }
  ): Promise<void> {
    const { error } = await this.db
      .from("candidates")
      .update({
        full_name: patch.fullName,
        email: patch.email.toLowerCase()
      })
      .eq("user_id", userId);

    if (error) throw error;
  }

  async upsertProfile(input: {
    userId: string;
    fullName: string;
    email: string;
    phone?: string | null;
    cpf?: string | null;
    city?: string | null;
    state?: string | null;
    linkedinUrl?: string | null;
    portfolioUrl?: string | null;
    professionalSummary?: string | null;
    desiredPosition?: string | null;
    salaryExpectation?: number | null;
    yearsExperience?: number | null;
    skills?: string[];
    education?: CandidateTimelineItem[];
    experience?: CandidateTimelineItem[];
  }): Promise<CandidateProfile> {
    const normalizedSkills = normalizeSkillList(input.skills ?? []);

    const { data, error } = await this.db
      .from("candidate_profiles")
      .upsert(
        {
          user_id: input.userId,
          full_name: input.fullName,
          email: input.email.toLowerCase(),
          phone: input.phone ?? null,
          cpf: input.cpf ?? null,
          city: input.city ?? null,
          state: input.state ?? null,
          linkedin_url: input.linkedinUrl ?? null,
          portfolio_url: input.portfolioUrl ?? null,
          professional_summary: input.professionalSummary ?? null,
          desired_position: input.desiredPosition ?? null,
          salary_expectation: input.salaryExpectation ?? null,
          years_experience: input.yearsExperience ?? null,
          skills: normalizedSkills,
          education: input.education ?? [],
          experience: input.experience ?? []
        },
        { onConflict: "user_id" }
      )
      .select("*")
      .single();

    if (error) throw error;
    return mapProfile(data as CandidateProfileRow);
  }

  async updateResumeInfo(input: {
    userId: string;
    fileName: string;
    filePath: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<CandidateProfile> {
    const { data, error } = await this.db
      .from("candidate_profiles")
      .upsert(
        {
          user_id: input.userId,
          resume_file_name: input.fileName,
          resume_file_path: input.filePath,
          resume_mime_type: input.mimeType,
          resume_size_bytes: input.sizeBytes
        },
        { onConflict: "user_id" }
      )
      .select("*")
      .single();

    if (error) throw error;
    return mapProfile(data as CandidateProfileRow);
  }

  async updateProfileImageInfo(input: {
    userId: string;
    fileName: string;
    filePath: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<CandidateProfile> {
    const { data, error } = await this.db
      .from("candidate_profiles")
      .upsert(
        {
          user_id: input.userId,
          profile_image_file_name: input.fileName,
          profile_image_path: input.filePath,
          profile_image_mime_type: input.mimeType,
          profile_image_size_bytes: input.sizeBytes
        },
        { onConflict: "user_id" }
      )
      .select("*")
      .single();

    if (error) throw error;
    return mapProfile(data as CandidateProfileRow);
  }

  async listTenantIdsWhereUserIsCandidate(userId: string): Promise<string[]> {
    const { data, error } = await this.db.from("candidates").select("tenant_id").eq("user_id", userId);
    if (error) throw error;
    const set = new Set<string>();
    for (const row of (data ?? []) as { tenant_id: string }[]) {
      set.add(row.tenant_id);
    }
    return [...set];
  }

  /**
   * Todas as vagas publicadas com tenant ativo — usado para montar índice de empresas e match.
   */
  async listPublishedJobRowsForEmployerIndex(): Promise<
    Array<{
      tenantId: string;
      tenantSlug: string;
      tenantDisplayName: string;
      skills: string[];
    }>
  > {
    const { data, error } = await this.db
      .from("jobs")
      .select(
        `
        tenant_id,
        skills,
        tenants!inner (
          id,
          slug,
          display_name,
          is_active
        )
      `
      )
      .eq("status", "published")
      .eq("tenants.is_active", true);

    if (error) throw error;

    const rows = (data ?? []) as Array<{
      tenant_id: string;
      skills: string[] | null;
      tenants:
        | { id: string; slug: string; display_name: string; is_active: boolean }
        | Array<{ id: string; slug: string; display_name: string; is_active: boolean }>;
    }>;

    return rows.map((row) => {
      const tenant = pickOne(row.tenants);
      if (!tenant) {
        throw new Error("TENANT_NOT_FOUND");
      }
      return {
        tenantId: row.tenant_id,
        tenantSlug: tenant.slug,
        tenantDisplayName: tenant.display_name,
        skills: Array.isArray(row.skills) ? row.skills : []
      };
    });
  }

  async listPublicJobs(input: {
    page: number;
    pageSize: number;
    title?: string;
    tenantSlug?: string;
    requiredSkills?: string[];
    tenantIds?: string[];
  }): Promise<Paginated<PublicJobCatalogItem>> {
    let query = this.db
      .from("jobs")
      .select(
        `
        id,
        tenant_id,
        company_id,
        title,
        description,
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
        created_at,
        tenants!inner (
          id,
          slug,
          display_name,
          is_active
        )
      `
      )
      .eq("status", "published")
      .eq("tenants.is_active", true)
      .order("created_at", { ascending: false });

    if (input.title) {
      query = query.ilike("title", `%${input.title}%`);
    }

    if (input.tenantSlug) {
      query = query.eq("tenants.slug", input.tenantSlug);
    }

    if (input.tenantIds && input.tenantIds.length > 0) {
      query = query.in("tenant_id", input.tenantIds);
    }

    if (input.requiredSkills && input.requiredSkills.length > 0) {
      query = query.contains("skills", input.requiredSkills);
    }

    const offset = (input.page - 1) * input.pageSize;
    const { data, error } = await query.range(offset, offset + input.pageSize - 1);
    if (error) throw error;

    return {
      items: ((data ?? []) as JobCatalogRow[]).map(mapCatalogItem),
      page: input.page,
      pageSize: input.pageSize
    };
  }

  async getPublishedJobById(jobId: string): Promise<PublicJobCatalogItem | null> {
    const { data, error } = await this.db
      .from("jobs")
      .select(
        `
        id,
        tenant_id,
        company_id,
        title,
        description,
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
        created_at,
        status,
        tenants!inner (
          id,
          slug,
          display_name,
          is_active
        )
      `
      )
      .eq("id", jobId)
      .eq("status", "published")
      .eq("tenants.is_active", true)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return mapCatalogItem(data as JobCatalogRow);
  }

  async getPublishedJobByTenantAndId(tenantSlug: string, jobId: string): Promise<PublicJobCatalogItem | null> {
    const { data, error } = await this.db
      .from("jobs")
      .select(
        `
        id,
        tenant_id,
        company_id,
        title,
        description,
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
        created_at,
        status,
        tenants!inner (
          id,
          slug,
          display_name,
          is_active
        )
      `
      )
      .eq("id", jobId)
      .eq("status", "published")
      .eq("tenants.is_active", true)
      .eq("tenants.slug", tenantSlug)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return mapCatalogItem(data as JobCatalogRow);
  }

  async getTenantCandidateByUser(tenantId: string, userId: string): Promise<{ id: string } | null> {
    const { data, error } = await this.db
      .from("candidates")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return { id: (data as { id: string }).id };
  }

  async getTenantCandidateByEmail(tenantId: string, email: string): Promise<{ id: string; userId: string | null } | null> {
    const { data, error } = await this.db
      .from("candidates")
      .select("id,user_id")
      .eq("tenant_id", tenantId)
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return {
      id: (data as { id: string }).id,
      userId: (data as { user_id: string | null }).user_id ?? null
    };
  }

  async createTenantCandidate(input: {
    tenantId: string;
    userId?: string | null;
    fullName: string;
    email: string;
    phone?: string | null;
    cpf?: string | null;
    source?: string | null;
  }): Promise<{ id: string }> {
    const { data, error } = await this.db
      .from("candidates")
      .insert({
        tenant_id: input.tenantId,
        user_id: input.userId ?? null,
        full_name: input.fullName,
        email: input.email.toLowerCase(),
        phone: input.phone ?? null,
        cpf: input.cpf ?? null,
        source: input.source ?? null,
        contract: null,
        is_active: true
      })
      .select("id")
      .single();

    if (error) throw error;
    return { id: (data as { id: string }).id };
  }

  async updateTenantCandidate(input: {
    candidateId: string;
    tenantId: string;
    fullName: string;
    email: string;
    phone?: string | null;
    cpf?: string | null;
  }): Promise<void> {
    const { error } = await this.db
      .from("candidates")
      .update({
        full_name: input.fullName,
        email: input.email.toLowerCase(),
        phone: input.phone ?? null,
        cpf: input.cpf ?? null
      })
      .eq("id", input.candidateId)
      .eq("tenant_id", input.tenantId);

    if (error) throw error;
  }

  async updateTenantCandidateUserId(input: {
    tenantId: string;
    candidateId: string;
    userId: string;
  }): Promise<void> {
    const { error } = await this.db
      .from("candidates")
      .update({
        user_id: input.userId
      })
      .eq("tenant_id", input.tenantId)
      .eq("id", input.candidateId);

    if (error) throw error;
  }

  async createApplication(input: {
    tenantId: string;
    jobId: string;
    candidateId: string;
    coverLetter?: string | null;
    screeningAnswers?: JobQuestionAnswer[];
  }): Promise<{ id: string }> {
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
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("APPLICATION_ALREADY_EXISTS");
      }
      throw error;
    }
    return { id: (data as { id: string }).id };
  }

  async listMyApplications(input: {
    userId: string;
    page: number;
    pageSize: number;
  }): Promise<Paginated<MyJobApplication>> {
    const offset = (input.page - 1) * input.pageSize;
    const { data, error } = await this.db
      .from("job_applications")
      .select(
        `
        id,
        status,
        cover_letter,
        created_at,
        updated_at,
        candidates!inner (id,user_id),
        jobs!inner (
          id,
          title,
          department,
          city,
          state,
          employment_type,
          status,
          tenants!inner (
            id,
            slug,
            display_name
          )
        )
      `
      )
      .eq("candidates.user_id", input.userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + input.pageSize - 1);

    if (error) throw error;
    return {
      items: ((data ?? []) as MyApplicationRow[]).map(mapMyApplication),
      page: input.page,
      pageSize: input.pageSize
    };
  }

  async getMyApplicationByJob(input: {
    userId: string;
    jobId: string;
  }): Promise<{ id: string; status: MyJobApplication["status"] } | null> {
    const { data, error } = await this.db
      .from("job_applications")
      .select(
        `
        id,
        status,
        job_id,
        candidates!inner (
          id,
          user_id
        )
      `
      )
      .eq("job_id", input.jobId)
      .eq("candidates.user_id", input.userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    const row = data as MyApplicationByJobRow;
    return {
      id: row.id,
      status: row.status
    };
  }

  async deleteMyApplicationByJob(input: {
    userId: string;
    jobId: string;
  }): Promise<{ ok: true; removed: boolean }> {
    const current = await this.getMyApplicationByJob(input);
    if (!current) return { ok: true, removed: false };
    if (current.status === "approved") {
      throw new Error("CANNOT_WITHDRAW_APPROVED_APPLICATION");
    }

    const { error } = await this.db
      .from("job_applications")
      .delete()
      .eq("id", current.id);

    if (error) throw error;
    return { ok: true, removed: true };
  }

  async listSkillTags(input: { query?: string; limit: number }): Promise<SkillTag[]> {
    let query = this.db
      .from("skill_tags")
      .select("normalized,label")
      .order("label", { ascending: true })
      .limit(input.limit);

    if (input.query?.trim()) {
      const normalized = normalizeSkillTag(input.query);
      query = query.or(`label.ilike.%${input.query.trim()}%,normalized.ilike.%${normalized}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as SkillTag[];
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

  async getExistingSkillTags(normalizedSkills: string[]): Promise<string[]> {
    if (normalizedSkills.length === 0) return [];

    const { data, error } = await this.db
      .from("skill_tags")
      .select("normalized")
      .in("normalized", normalizedSkills);
    if (error) throw error;
    return ((data ?? []) as Array<{ normalized: string }>).map((item) => item.normalized);
  }

  /** Documento vinculado ao usuário (auth); aparece no módulo de documentos do colaborador após contratação. */
  async insertEmployeeLinkedDocument(input: {
    tenantId: string;
    companyId: string;
    uploadedByUserId: string;
    collaboratorName: string;
    collaboratorEmail: string;
    contract?: string | null;
    title: string;
    description: string | null;
    category: string;
    fileName: string;
    filePath: string;
    mimeType: string;
    sizeBytes: number;
    employeeUserId: string;
    docTab: string;
    docType: string;
    source: string;
  }): Promise<void> {
    const { error } = await this.db.from("documents").insert({
      tenant_id: input.tenantId,
      company_id: input.companyId,
      collaborator_name: input.collaboratorName,
      collaborator_email: input.collaboratorEmail.toLowerCase(),
      contract: input.contract ?? null,
      title: input.title,
      description: input.description,
      category: input.category,
      file_name: input.fileName,
      file_path: input.filePath,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      uploaded_by: input.uploadedByUserId,
      employee_user_id: input.employeeUserId,
      request_id: null,
      doc_tab: input.docTab,
      doc_type: input.docType,
      source: input.source
    });
    if (error) throw error;
  }

  /** Último documento do colaborador que corresponde ao par aba/gestão da vaga (para reutilização na candidatura). */
  async getLatestEmployeeDocumentForDocTabType(input: {
    tenantId: string;
    employeeUserId: string;
    docTab: string;
    docType: string;
  }): Promise<{ fileName: string; filePath: string; mimeType: string; sizeBytes: number } | null> {
    const { data, error } = await this.db
      .from("documents")
      .select("file_name, file_path, mime_type, size_bytes")
      .eq("tenant_id", input.tenantId)
      .eq("employee_user_id", input.employeeUserId)
      .eq("doc_tab", input.docTab)
      .eq("doc_type", input.docType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return {
      fileName: data.file_name as string,
      filePath: data.file_path as string,
      mimeType: data.mime_type as string,
      sizeBytes: Number(data.size_bytes)
    };
  }
}
