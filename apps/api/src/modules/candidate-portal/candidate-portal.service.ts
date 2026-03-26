import { randomUUID } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { env } from "../../config/env.js";
import {
  extractCandidateProfileFromResumeFile,
  type CandidateProfileAiExtract
} from "../ai/candidate-profile-ai-extract.js";
import { scheduleApplicationResumeAnalysis } from "../ai/schedule.js";
import { screeningsWithoutLegacyDocumentUploads } from "../../lib/job-document-requirements.js";
import { normalizeBrazilPhoneDigitsFromExtract } from "../../lib/phone-br.js";
import { normalizeSkillList } from "../../lib/skill-tags.js";
import { CandidatePortalRepository } from "./candidate-portal.repository.js";
import type {
  CandidateProfile,
  CandidateTimelineItem,
  JobDocumentRequirement,
  JobEmployerSummary,
  JobQuestion,
  JobQuestionAnswer,
  MyJobApplication,
  Paginated,
  PublicJobCatalogItem,
  ResumeUploadIntent,
  SkillTag
} from "./candidate-portal.types.js";

function fullNameFromAuthUser(user: User): string | null {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fromFull =
    typeof meta?.full_name === "string" && meta.full_name.trim() ? meta.full_name.trim() : null;
  if (fromFull) return fromFull;
  const fromName = typeof meta?.name === "string" && meta.name.trim() ? meta.name.trim() : null;
  return fromName;
}

function isAuthEmailAlreadyTaken(error: { message?: string }): boolean {
  const m = (error.message ?? "").toLowerCase();
  return (
    m.includes("already been registered") ||
    m.includes("already registered") ||
    m.includes("user already registered") ||
    (m.includes("email") && m.includes("already"))
  );
}

export class CandidatePortalService {
  constructor(
    private readonly repository: CandidatePortalRepository,
    private readonly storage: SupabaseClient
  ) {}

  async getProfile(userId: string): Promise<CandidateProfile | null> {
    const profile = await this.repository.getProfileByUserId(userId);

    const { data: authData, error: authErr } = await this.storage.auth.admin.getUserById(userId);
    if (authErr || !authData.user) {
      return profile;
    }

    const authEmail = authData.user.email?.trim().toLowerCase() ?? null;
    const signupName = fullNameFromAuthUser(authData.user);

    const emailMismatch =
      Boolean(profile) &&
      Boolean(authEmail) &&
      (profile!.email?.trim().toLowerCase() ?? "") !== authEmail;
    const needName = Boolean(signupName) && !profile?.fullName?.trim();
    const needEmailEmpty = Boolean(authEmail) && !profile?.email?.trim();
    const needsBootstrap = !profile || needName || needEmailEmpty || emailMismatch;

    if (!needsBootstrap) {
      return profile;
    }

    const merged = await this.repository.mergeAuthIdentityIntoProfile(userId, {
      email: authEmail,
      fullName: signupName
    });
    return merged ?? profile;
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

    if (!env.CANDIDATE_CAN_CREATE_SKILL_TAGS && normalizedSkills.length > 0) {
      const existing = await this.repository.getExistingSkillTags(normalizedSkills);
      const missing = normalizedSkills.filter((item) => !existing.includes(item));
      if (missing.length > 0) {
        throw new Error("SKILL_TAG_CREATION_DISABLED");
      }
    }

    if (env.CANDIDATE_CAN_CREATE_SKILL_TAGS) {
      await this.repository.upsertSkillTags(normalizedSkills, input.userId);
    }

    const normalizedEmail = input.email.trim().toLowerCase();

    const { data: authData, error: authErr } = await this.storage.auth.admin.getUserById(input.userId);
    if (authErr || !authData.user) {
      throw new Error("AUTH_USER_NOT_FOUND");
    }

    const previousEmail = authData.user.email?.trim().toLowerCase() ?? "";
    let emailChanged = false;

    if (normalizedEmail !== previousEmail) {
      const { error: updateErr } = await this.storage.auth.admin.updateUserById(input.userId, {
        email: normalizedEmail
      });
      if (updateErr) {
        if (isAuthEmailAlreadyTaken(updateErr)) {
          throw new Error("EMAIL_ALREADY_IN_USE");
        }
        throw updateErr;
      }
      emailChanged = true;
    }

    let result: CandidateProfile;
    try {
      result = await this.repository.upsertProfile({
        ...input,
        email: normalizedEmail,
        skills: normalizedSkills
      });
    } catch (err) {
      if (emailChanged && previousEmail) {
        await this.storage.auth.admin.updateUserById(input.userId, { email: previousEmail });
      }
      throw err;
    }

    await this.repository.syncLinkedCandidatesIdentity(input.userId, {
      fullName: input.fullName.trim(),
      email: normalizedEmail
    });
    return result;
  }

  async createResumeUploadIntent(input: {
    userId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<ResumeUploadIntent> {
    validateResumeUpload(input.mimeType, input.sizeBytes);
    const normalizedFileName = normalizePdfFileName(input.fileName);
    const path = `candidates/${input.userId}/resume/${randomUUID()}-${normalizedFileName}`;

    const { data, error } = await this.storage.storage
      .from(env.STORAGE_BUCKET_CANDIDATE_RESUMES)
      .createSignedUploadUrl(path);

    if (error || !data) {
      throw new Error("UPLOAD_INTENT_FAILED");
    }

    return {
      bucket: env.STORAGE_BUCKET_CANDIDATE_RESUMES,
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
      expiresIn: 7200
    };
  }

  async createProfileImageUploadIntent(input: {
    userId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<ResumeUploadIntent> {
    validateProfileImageUpload(input.mimeType, input.sizeBytes);
    const normalizedFileName = normalizeImageFileName(input.fileName, input.mimeType);
    const path = `candidates/${input.userId}/avatar/${randomUUID()}-${normalizedFileName}`;

    const { data, error } = await this.storage.storage
      .from(env.STORAGE_BUCKET_CANDIDATE_AVATARS)
      .createSignedUploadUrl(path);

    if (error || !data) {
      throw new Error("UPLOAD_INTENT_FAILED");
    }

    return {
      bucket: env.STORAGE_BUCKET_CANDIDATE_AVATARS,
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
      expiresIn: 7200
    };
  }

  async confirmResumeUpload(input: {
    userId: string;
    fileName: string;
    filePath: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<CandidateProfile> {
    validateResumeUpload(input.mimeType, input.sizeBytes);
    const expectedPrefix = `candidates/${input.userId}/resume/`;
    if (!input.filePath.startsWith(expectedPrefix)) {
      throw new Error("INVALID_FILE_PATH_SCOPE");
    }

    await this.ensureObjectExists(env.STORAGE_BUCKET_CANDIDATE_RESUMES, input.filePath);

    return this.repository.updateResumeInfo({
      userId: input.userId,
      fileName: normalizePdfFileName(input.fileName),
      filePath: input.filePath,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes
    });
  }

  async processResumeWithAiAndUpdateProfile(input: {
    userId: string;
    fileBuffer: Buffer;
    fileName: string;
    mimeType: string;
  }): Promise<CandidateProfile> {
    validateResumeFileForAi(input.mimeType, input.fileBuffer.byteLength);

    const existing = await this.getProfile(input.userId);
    if (!existing) {
      throw new Error("CANDIDATE_PROFILE_NOT_FOUND");
    }

    const extracted = await extractCandidateProfileFromResumeFile({
      buffer: input.fileBuffer,
      fileName: input.fileName,
      mimeType: input.mimeType
    });

    const { data: authData, error: authErr } = await this.storage.auth.admin.getUserById(input.userId);
    if (authErr || !authData.user?.email) {
      throw new Error("AUTH_USER_NOT_FOUND");
    }
    const authEmail = authData.user.email.trim().toLowerCase();

    const merged = mergeExtractedProfile(existing, extracted, authEmail);

    await this.upsertProfile(merged);

    const normalizedFileName = normalizeResumeFileNameForAi(input.fileName, input.mimeType);
    const storagePath = `candidates/${input.userId}/resume/${randomUUID()}-${normalizedFileName}`;

    const { error: upErr } = await this.storage.storage
      .from(env.STORAGE_BUCKET_CANDIDATE_RESUMES)
      .upload(storagePath, input.fileBuffer, {
        contentType: input.mimeType,
        upsert: false
      });

    if (upErr) {
      throw mapStorageUploadError(upErr, "resume");
    }

    return this.repository.updateResumeInfo({
      userId: input.userId,
      fileName: normalizedFileName,
      filePath: storagePath,
      mimeType: input.mimeType,
      sizeBytes: input.fileBuffer.byteLength
    });
  }

  async confirmProfileImageUpload(input: {
    userId: string;
    fileName: string;
    filePath: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<CandidateProfile> {
    validateProfileImageUpload(input.mimeType, input.sizeBytes);
    const expectedPrefix = `candidates/${input.userId}/avatar/`;
    if (!input.filePath.startsWith(expectedPrefix)) {
      throw new Error("INVALID_FILE_PATH_SCOPE");
    }

    await this.ensureObjectExists(env.STORAGE_BUCKET_CANDIDATE_AVATARS, input.filePath);

    return this.repository.updateProfileImageInfo({
      userId: input.userId,
      fileName: normalizeImageFileName(input.fileName, input.mimeType),
      filePath: input.filePath,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes
    });
  }

  async listPublicJobs(input: {
    page: number;
    pageSize: number;
    title?: string;
    tenantSlug?: string;
  }): Promise<Paginated<PublicJobCatalogItem>> {
    return this.repository.listPublicJobs(input);
  }

  async getPublicJobById(jobId: string): Promise<PublicJobCatalogItem> {
    const job = await this.repository.getPublishedJobById(jobId);
    if (!job) {
      throw new Error("JOB_NOT_FOUND");
    }
    return job;
  }

  async getPublicJobByTenantAndId(tenantSlug: string, jobId: string): Promise<PublicJobCatalogItem> {
    const job = await this.repository.getPublishedJobByTenantAndId(tenantSlug, jobId);
    if (!job) {
      throw new Error("JOB_NOT_FOUND");
    }
    return job;
  }

  async quickApplyPublicByTenant(input: {
    tenantSlug: string;
    jobId: string;
    fullName: string;
    email: string;
    cpf: string;
    phone: string;
    resumeFileName: string;
    resumeMimeType: string;
    resumeBase64: string;
    coverLetter: string;
    screeningAnswers?: JobQuestionAnswer[];
    jobDocumentUploads?: Array<{ requirementId: string; fileName: string; mimeType: string; base64: string }>;
  }): Promise<{ applicationId: string; emailSent: boolean; existingAuthAccount: boolean }> {
    const job = await this.repository.getPublishedJobByTenantAndId(input.tenantSlug, input.jobId);
    if (!job) {
      throw new Error("JOB_NOT_FOUND");
    }

    return this.quickApplyPublic({
      jobId: job.id,
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
    });
  }

  async quickApplyPublic(input: {
    jobId: string;
    fullName: string;
    email: string;
    cpf: string;
    phone: string;
    resumeFileName: string;
    resumeMimeType: string;
    resumeBase64: string;
    coverLetter: string;
    screeningAnswers?: JobQuestionAnswer[];
    jobDocumentUploads?: Array<{ requirementId: string; fileName: string; mimeType: string; base64: string }>;
  }): Promise<{ applicationId: string; emailSent: boolean; existingAuthAccount: boolean }> {
    const job = await this.repository.getPublishedJobById(input.jobId);
    if (!job) {
      throw new Error("JOB_NOT_FOUND");
    }

    const coverLetterHtml = assertCoverLetterPresent(input.coverLetter);
    const docUploads = validateJobDocumentBundle(
      job.documentRequirements,
      input.jobDocumentUploads,
      new Set(),
      (b64) => this.decodeBase64File(b64)
    );

    const normalizedAnswers = validateAndNormalizeQuestionAnswers(
      job.screeningQuestions,
      input.screeningAnswers ?? []
    );

    const normalizedEmail = input.email.trim().toLowerCase();
    let authUser = await this.findAuthUserByEmail(normalizedEmail);
    const existingAuthAccount = Boolean(authUser);
    let emailSent = false;

    if (!authUser) {
      const redirectTo = `${inferWebBaseUrl()}/reset-password`;
      const invite = await this.storage.auth.admin.inviteUserByEmail(normalizedEmail, { redirectTo });
      if (invite.error) {
        throw new Error("USER_INVITE_FAILED");
      }
      emailSent = true;
      authUser = invite.data.user ?? (await this.findAuthUserByEmail(normalizedEmail));
    } else if (!authUser.email_confirmed_at) {
      const resend = await this.storage.auth.resend({
        type: "signup",
        email: normalizedEmail
      });
      if (!resend.error) {
        emailSent = true;
      }
    }

    const userId = authUser?.id ?? null;

    if (job.documentRequirements.length > 0 && !userId) {
      throw new Error("USER_REQUIRED_FOR_JOB_DOCUMENTS");
    }

    const resumePath = await this.uploadPublicResume({
      userId: userId ?? `public-${randomUUID()}`,
      resumeFileName: input.resumeFileName,
      resumeMimeType: input.resumeMimeType,
      resumeBase64: input.resumeBase64
    });

    if (userId) {
      await this.repository.upsertProfile({
        userId,
        fullName: input.fullName.trim(),
        email: normalizedEmail,
        phone: input.phone.trim(),
        cpf: input.cpf.trim(),
        skills: []
      });

      await this.repository.updateResumeInfo({
        userId,
        fileName: normalizePdfFileName(input.resumeFileName),
        filePath: resumePath,
        mimeType: input.resumeMimeType,
        sizeBytes: this.decodeBase64File(input.resumeBase64).byteLength
      });
    }

    let candidateId: string;
    const existingCandidate = await this.repository.getTenantCandidateByEmail(job.tenantId, normalizedEmail);
    if (existingCandidate) {
      candidateId = existingCandidate.id;
      await this.repository.updateTenantCandidate({
        candidateId,
        tenantId: job.tenantId,
        fullName: input.fullName.trim(),
        email: normalizedEmail,
        phone: input.phone.trim(),
        cpf: input.cpf.trim()
      });
      if (userId && !existingCandidate.userId) {
        await this.repository.updateTenantCandidateUserId({
          tenantId: job.tenantId,
          candidateId,
          userId
        });
      }
    } else if (userId) {
      const created = await this.repository.createTenantCandidate({
        tenantId: job.tenantId,
        userId,
        fullName: input.fullName.trim(),
        email: normalizedEmail,
        phone: input.phone.trim(),
        cpf: input.cpf.trim(),
        source: "public-quick-apply"
      });
      candidateId = created.id;
    } else {
      const created = await this.repository.createTenantCandidate({
        tenantId: job.tenantId,
        userId: null,
        fullName: input.fullName.trim(),
        email: normalizedEmail,
        phone: input.phone.trim(),
        cpf: input.cpf.trim(),
        source: "public-quick-apply"
      });
      candidateId = created.id;
    }

    const application = await this.repository.createApplication({
      tenantId: job.tenantId,
      jobId: job.id,
      candidateId,
      coverLetter: coverLetterHtml,
      screeningAnswers: normalizedAnswers
    });

    if (job.documentRequirements.length > 0 && userId) {
      await this.persistJobApplicationDocuments({
        tenantId: job.tenantId,
        companyId: job.companyId,
        userId,
        applicationId: application.id,
        jobTitle: job.title,
        employmentType: job.employmentType,
        fullName: input.fullName.trim(),
        email: normalizedEmail,
        requirements: job.documentRequirements,
        uploads: docUploads,
        reuseRequirementIds: new Set()
      });
    }

    scheduleApplicationResumeAnalysis(job.tenantId, application.id);

    return {
      applicationId: application.id,
      emailSent,
      existingAuthAccount
    };
  }

  async getApplicantDocumentPresenceForJob(input: { userId: string; jobId: string }): Promise<{
    items: Array<{ requirementId: string; onFile: boolean }>;
  }> {
    const job = await this.repository.getPublishedJobById(input.jobId);
    if (!job) {
      throw new Error("JOB_NOT_FOUND");
    }
    const items = await Promise.all(
      job.documentRequirements.map(async (req) => {
        const doc = await this.repository.getLatestEmployeeDocumentForDocTabType({
          tenantId: job.tenantId,
          employeeUserId: input.userId,
          docTab: req.docTab,
          docType: req.docType
        });
        return { requirementId: req.id, onFile: Boolean(doc) };
      })
    );
    return { items };
  }

  async listSuggestedJobs(input: {
    userId: string;
    page: number;
    pageSize: number;
  }): Promise<Paginated<PublicJobCatalogItem>> {
    const profile = await this.repository.getProfileByUserId(input.userId);
    const candidateSkills = normalizeSkillList(profile?.skills ?? []);

    const tenantIds = await this.repository.listTenantIdsWhereUserIsCandidate(input.userId);
    if (tenantIds.length === 0) {
      return {
        items: [],
        page: input.page,
        pageSize: input.pageSize
      };
    }

    const jobs = await this.repository.listPublicJobs({
      page: 1,
      pageSize: 200,
      tenantIds
    });

    const ranked = jobs.items
      .map((job) => {
        const overlap = job.skills.filter((skill) => candidateSkills.includes(skill)).length;
        return {
          ...job,
          matchScore: overlap
        };
      })
      .sort((a, b) => {
        if ((b.matchScore ?? 0) !== (a.matchScore ?? 0)) {
          return (b.matchScore ?? 0) - (a.matchScore ?? 0);
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    const offset = (input.page - 1) * input.pageSize;
    return {
      items: ranked.slice(offset, offset + input.pageSize),
      page: input.page,
      pageSize: input.pageSize
    };
  }

  async listJobEmployers(input: { userId: string }): Promise<{ items: JobEmployerSummary[] }> {
    const profile = await this.repository.getProfileByUserId(input.userId);
    const candidateSkills = normalizeSkillList(profile?.skills ?? []);

    const rows = await this.repository.listPublishedJobRowsForEmployerIndex();

    const byTenant = new Map<
      string,
      { slug: string; displayName: string; jobCount: number; maxMatch: number }
    >();

    for (const row of rows) {
      const overlap = row.skills.filter((skill) => candidateSkills.includes(skill)).length;
      const existing = byTenant.get(row.tenantId);
      if (!existing) {
        byTenant.set(row.tenantId, {
          slug: row.tenantSlug,
          displayName: row.tenantDisplayName,
          jobCount: 1,
          maxMatch: overlap
        });
      } else {
        existing.jobCount += 1;
        existing.maxMatch = Math.max(existing.maxMatch, overlap);
      }
    }

    const items: JobEmployerSummary[] = [...byTenant.entries()].map(([tenantId, v]) => ({
      tenantId,
      slug: v.slug,
      displayName: v.displayName,
      publishedJobCount: v.jobCount,
      matchScore: v.maxMatch
    }));

    items.sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      if (b.publishedJobCount !== a.publishedJobCount) return b.publishedJobCount - a.publishedJobCount;
      return a.displayName.localeCompare(b.displayName, "pt-BR");
    });

    return { items };
  }

  async listJobsForTenant(input: {
    userId: string;
    tenantId: string;
    page: number;
    pageSize: number;
  }): Promise<Paginated<PublicJobCatalogItem>> {
    const profile = await this.repository.getProfileByUserId(input.userId);
    const candidateSkills = normalizeSkillList(profile?.skills ?? []);

    const all: PublicJobCatalogItem[] = [];
    let page = 1;
    const fetchSize = 150;
    while (true) {
      const batch = await this.repository.listPublicJobs({
        page,
        pageSize: fetchSize,
        tenantIds: [input.tenantId]
      });
      all.push(...batch.items);
      if (batch.items.length < fetchSize) break;
      page += 1;
      if (page > 40) break;
    }

    const ranked = all
      .map((job) => {
        const overlap = job.skills.filter((skill) => candidateSkills.includes(skill)).length;
        return {
          ...job,
          matchScore: overlap
        };
      })
      .sort((a, b) => {
        if ((b.matchScore ?? 0) !== (a.matchScore ?? 0)) {
          return (b.matchScore ?? 0) - (a.matchScore ?? 0);
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    const offset = (input.page - 1) * input.pageSize;
    return {
      items: ranked.slice(offset, offset + input.pageSize),
      page: input.page,
      pageSize: input.pageSize
    };
  }

  async applyToJob(input: {
    userId: string;
    jobId: string;
    coverLetter: string;
    screeningAnswers?: JobQuestionAnswer[];
    jobDocumentUploads?: Array<{ requirementId: string; fileName: string; mimeType: string; base64: string }>;
    reuseExistingRequirementIds?: string[];
  }): Promise<{ id: string }> {
    const profile = await this.repository.getProfileByUserId(input.userId);
    if (!profile?.fullName || !profile?.email) {
      throw new Error("CANDIDATE_PROFILE_INCOMPLETE");
    }

    const job = await this.repository.getPublishedJobById(input.jobId);
    if (!job) {
      throw new Error("JOB_NOT_FOUND");
    }

    const coverLetterHtml = assertCoverLetterPresent(input.coverLetter);
    const verifiedReuse = await this.verifyJobDocumentReuseFromAccount({
      tenantId: job.tenantId,
      userId: input.userId,
      requirements: job.documentRequirements,
      reuseRequirementIds: input.reuseExistingRequirementIds
    });
    const docUploads = validateJobDocumentBundle(
      job.documentRequirements,
      input.jobDocumentUploads,
      verifiedReuse,
      (b64) => this.decodeBase64File(b64)
    );

    const normalizedAnswers = validateAndNormalizeQuestionAnswers(
      job.screeningQuestions,
      input.screeningAnswers ?? []
    );

    const existingCandidate = await this.repository.getTenantCandidateByUser(job.tenantId, input.userId);
    let candidateId = existingCandidate?.id;

    if (!candidateId) {
      const created = await this.repository.createTenantCandidate({
        tenantId: job.tenantId,
        userId: input.userId,
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        cpf: profile.cpf,
        source: "candidate-portal-auth"
      });
      candidateId = created.id;
    } else {
      await this.repository.updateTenantCandidate({
        candidateId,
        tenantId: job.tenantId,
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        cpf: profile.cpf
      });
    }

    const application = await this.repository.createApplication({
      tenantId: job.tenantId,
      jobId: job.id,
      candidateId,
      coverLetter: coverLetterHtml,
      screeningAnswers: normalizedAnswers
    });

    if (job.documentRequirements.length > 0) {
      await this.persistJobApplicationDocuments({
        tenantId: job.tenantId,
        companyId: job.companyId,
        userId: input.userId,
        applicationId: application.id,
        jobTitle: job.title,
        employmentType: job.employmentType,
        fullName: profile.fullName,
        email: profile.email,
        requirements: job.documentRequirements,
        uploads: docUploads,
        reuseRequirementIds: verifiedReuse
      });
    }

    scheduleApplicationResumeAnalysis(job.tenantId, application.id);
    return application;
  }

  async listMyApplications(input: {
    userId: string;
    page: number;
    pageSize: number;
  }): Promise<Paginated<MyJobApplication>> {
    return this.repository.listMyApplications(input);
  }

  async getMyApplicationByJob(input: {
    userId: string;
    jobId: string;
  }): Promise<{ applied: boolean; applicationId: string | null; status: MyJobApplication["status"] | null }> {
    const application = await this.repository.getMyApplicationByJob(input);
    return {
      applied: Boolean(application),
      applicationId: application?.id ?? null,
      status: application?.status ?? null
    };
  }

  async withdrawMyApplication(input: { userId: string; jobId: string }): Promise<{ ok: true; removed: boolean }> {
    const job = await this.repository.getPublishedJobById(input.jobId);
    if (!job) {
      throw new Error("JOB_NOT_FOUND");
    }

    return this.repository.deleteMyApplicationByJob(input);
  }

  async listSkillTags(input: { query?: string; limit: number }): Promise<SkillTag[]> {
    return this.repository.listSkillTags(input);
  }

  private async ensureObjectExists(bucket: string, filePath: string): Promise<void> {
    const parts = filePath.split("/");
    const fileName = parts.pop();
    const folder = parts.join("/");

    if (!fileName || !folder) {
      throw new Error("INVALID_FILE_PATH");
    }

    const { data, error } = await this.storage.storage.from(bucket).list(folder, {
      search: fileName,
      limit: 1
    });

    if (error) throw new Error("UPLOAD_OBJECT_CHECK_FAILED");
    if (!data || data.length === 0) {
      throw new Error("UPLOAD_OBJECT_NOT_FOUND");
    }
  }

  private decodeBase64File(content: string): Buffer {
    const normalized = content.includes(",") ? content.split(",")[1] ?? "" : content;
    const buffer = Buffer.from(normalized, "base64");
    if (buffer.byteLength === 0) {
      throw new Error("INVALID_FILE_BASE64");
    }
    return buffer;
  }

  private async uploadPublicResume(input: {
    userId: string;
    resumeFileName: string;
    resumeMimeType: string;
    resumeBase64: string;
  }): Promise<string> {
    validateResumeUpload(input.resumeMimeType, this.decodeBase64File(input.resumeBase64).byteLength);
    const normalizedName = normalizePdfFileName(input.resumeFileName);
    const path = `candidates/${input.userId}/resume/${randomUUID()}-${normalizedName}`;
    const { error } = await this.storage.storage
      .from(env.STORAGE_BUCKET_CANDIDATE_RESUMES)
      .upload(path, this.decodeBase64File(input.resumeBase64), {
        cacheControl: "3600",
        contentType: input.resumeMimeType,
        upsert: false
      });

    if (error) {
      throw mapStorageUploadError(error, "resume");
    }

    return path;
  }

  private async verifyJobDocumentReuseFromAccount(input: {
    tenantId: string;
    userId: string;
    requirements: JobDocumentRequirement[];
    reuseRequirementIds: string[] | undefined;
  }): Promise<Set<string>> {
    const verified = new Set<string>();
    const ids = [...new Set(input.reuseRequirementIds ?? [])];
    const reqById = new Map(input.requirements.map((r) => [r.id, r]));
    for (const requirementId of ids) {
      const req = reqById.get(requirementId);
      if (!req) {
        throw new Error("JOB_DOCUMENT_UPLOAD_INVALID");
      }
      const existing = await this.repository.getLatestEmployeeDocumentForDocTabType({
        tenantId: input.tenantId,
        employeeUserId: input.userId,
        docTab: req.docTab,
        docType: req.docType
      });
      if (!existing) {
        throw new Error("JOB_DOCUMENT_REUSE_NOT_FOUND");
      }
      verified.add(requirementId);
    }
    return verified;
  }

  private async persistJobApplicationDocuments(input: {
    tenantId: string;
    companyId: string;
    userId: string;
    applicationId: string;
    jobTitle: string;
    employmentType: string | null;
    fullName: string;
    email: string;
    requirements: JobDocumentRequirement[];
    uploads: Array<{ requirementId: string; fileName: string; mimeType: string; base64: string }>;
    reuseRequirementIds: Set<string>;
  }): Promise<void> {
    if (input.requirements.length === 0) return;

    for (const req of input.requirements) {
      if (input.reuseRequirementIds.has(req.id)) {
        const existing = await this.repository.getLatestEmployeeDocumentForDocTabType({
          tenantId: input.tenantId,
          employeeUserId: input.userId,
          docTab: req.docTab,
          docType: req.docType
        });
        if (!existing) {
          throw new Error("JOB_DOCUMENT_REUSE_NOT_FOUND");
        }
        const normalizedName = normalizePdfFileName(existing.fileName);
        const path = `tenants/${input.tenantId}/job-applications/${input.applicationId}/${randomUUID()}-${normalizedName}`;
        const { error } = await this.storage.storage
          .from(env.STORAGE_BUCKET_DOCUMENTS)
          .copy(existing.filePath, path);
        if (error) {
          throw mapStorageUploadError(error, "resume");
        }
        validateResumeUpload(existing.mimeType, existing.sizeBytes);
        const title = (req.label && req.label.trim()) || req.docType;
        await this.repository.insertEmployeeLinkedDocument({
          tenantId: input.tenantId,
          companyId: input.companyId,
          uploadedByUserId: input.userId,
          collaboratorName: input.fullName,
          collaboratorEmail: input.email,
          contract: input.employmentType,
          title,
          description: `Enviado na candidatura à vaga: ${input.jobTitle}`,
          category: req.docTab,
          fileName: normalizedName,
          filePath: path,
          mimeType: existing.mimeType,
          sizeBytes: existing.sizeBytes,
          employeeUserId: input.userId,
          docTab: req.docTab,
          docType: req.docType,
          source: "job_application"
        });
        continue;
      }

      const upload = input.uploads.find((item) => item.requirementId === req.id);
      if (!upload) {
        throw new Error("JOB_DOCUMENTS_REQUIRED");
      }
      const buffer = this.decodeBase64File(upload.base64);
      validateResumeUpload(upload.mimeType, buffer.byteLength);
      const normalizedName = normalizePdfFileName(upload.fileName);
      const path = `tenants/${input.tenantId}/job-applications/${input.applicationId}/${randomUUID()}-${normalizedName}`;
      const { error } = await this.storage.storage.from(env.STORAGE_BUCKET_DOCUMENTS).upload(path, buffer, {
        cacheControl: "3600",
        contentType: upload.mimeType,
        upsert: false
      });
      if (error) {
        throw mapStorageUploadError(error, "resume");
      }
      const title = (req.label && req.label.trim()) || req.docType;
      await this.repository.insertEmployeeLinkedDocument({
        tenantId: input.tenantId,
        companyId: input.companyId,
        uploadedByUserId: input.userId,
        collaboratorName: input.fullName,
        collaboratorEmail: input.email,
        contract: input.employmentType,
        title,
        description: `Enviado na candidatura à vaga: ${input.jobTitle}`,
        category: req.docTab,
        fileName: normalizedName,
        filePath: path,
        mimeType: upload.mimeType,
        sizeBytes: buffer.byteLength,
        employeeUserId: input.userId,
        docTab: req.docTab,
        docType: req.docType,
        source: "job_application"
      });
    }
  }

  private async findAuthUserByEmail(email: string): Promise<{ id: string; email_confirmed_at?: string | null } | null> {
    let page = 1;
    const perPage = 200;
    while (page <= 20) {
      const listed = await this.storage.auth.admin.listUsers({ page, perPage });
      if (listed.error) {
        break;
      }
      const match = listed.data.users.find((user) => user.email?.toLowerCase() === email);
      if (match) {
        return { id: match.id, email_confirmed_at: match.email_confirmed_at ?? null };
      }
      if (listed.data.users.length < perPage) {
        break;
      }
      page += 1;
    }
    return null;
  }
}

function assertCoverLetterPresent(html: string): string {
  const stripped = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length < 1) {
    throw new Error("COVER_LETTER_REQUIRED");
  }
  return html.trim();
}

function validateJobDocumentBundle(
  requirements: JobDocumentRequirement[],
  uploads: Array<{ requirementId: string; fileName: string; mimeType: string; base64: string }> | undefined,
  reuseRequirementIds: Set<string>,
  decodeBase64: (content: string) => Buffer
): Array<{ requirementId: string; fileName: string; mimeType: string; base64: string }> {
  const list = uploads ?? [];
  if (requirements.length === 0) {
    if (list.length > 0 || reuseRequirementIds.size > 0) {
      throw new Error("JOB_DOCUMENT_UPLOAD_UNEXPECTED");
    }
    return [];
  }

  const reqIds = new Set(requirements.map((item) => item.id));
  for (const id of reuseRequirementIds) {
    if (!reqIds.has(id)) {
      throw new Error("JOB_DOCUMENT_UPLOAD_INVALID");
    }
  }

  if (new Set(list.map((u) => u.requirementId)).size !== list.length) {
    throw new Error("JOB_DOCUMENT_UPLOAD_INVALID");
  }

  for (const upload of list) {
    if (!reqIds.has(upload.requirementId)) {
      throw new Error("JOB_DOCUMENT_UPLOAD_INVALID");
    }
    if (reuseRequirementIds.has(upload.requirementId)) {
      throw new Error("JOB_DOCUMENT_UPLOAD_INVALID");
    }
  }

  for (const req of requirements) {
    const hasReuse = reuseRequirementIds.has(req.id);
    const upload = list.find((item) => item.requirementId === req.id);
    if (hasReuse && upload) {
      throw new Error("JOB_DOCUMENT_UPLOAD_INVALID");
    }
    if (!hasReuse && !upload) {
      throw new Error("JOB_DOCUMENTS_REQUIRED");
    }
  }

  if (list.length + reuseRequirementIds.size !== requirements.length) {
    throw new Error("JOB_DOCUMENTS_REQUIRED");
  }

  const validated: Array<{ requirementId: string; fileName: string; mimeType: string; base64: string }> = [];
  for (const req of requirements) {
    if (reuseRequirementIds.has(req.id)) {
      continue;
    }
    const upload = list.find((item) => item.requirementId === req.id);
    if (!upload) {
      throw new Error("JOB_DOCUMENTS_REQUIRED");
    }
    const buffer = decodeBase64(upload.base64);
    validateResumeUpload(upload.mimeType, buffer.byteLength);
    validated.push(upload);
  }
  return validated;
}

function inferWebBaseUrl(): string {
  const configured = env.WEB_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const firstAllowed = env.WEB_ALLOWED_ORIGINS
    .split(",")
    .map((item) => item.trim())
    .find((item) => item.startsWith("http"));
  if (firstAllowed) return firstAllowed.replace(/\/$/, "");

  return "https://rh-saas-delta.vercel.app";
}

function validateAndNormalizeQuestionAnswers(
  questions: JobQuestion[],
  answers: JobQuestionAnswer[]
): JobQuestionAnswer[] {
  const activeQuestions = screeningsWithoutLegacyDocumentUploads(questions);
  if (!Array.isArray(activeQuestions) || activeQuestions.length === 0) return [];

  const answersMap = new Map<string, JobQuestionAnswer>();
  for (const answer of answers) {
    if (!answer?.questionId) continue;
    answersMap.set(answer.questionId, {
      questionId: answer.questionId,
      answerBoolean: typeof answer.answerBoolean === "boolean" ? answer.answerBoolean : null,
      answerText: typeof answer.answerText === "string" ? answer.answerText.trim() : null,
      answerFile: typeof answer.answerFile === "string" ? answer.answerFile.trim() : null
    });
  }

  const normalized: JobQuestionAnswer[] = [];

  for (const question of activeQuestions) {
    const answer = answersMap.get(question.id) ?? {
      questionId: question.id,
      answerBoolean: null,
      answerText: null,
      answerFile: null
    };

    if (question.type === "yes_no") {
      if (question.isRequired && answer.answerBoolean === null) {
        throw new Error("SCREENING_QUESTION_REQUIRED");
      }
      normalized.push({
        questionId: question.id,
        answerBoolean: answer.answerBoolean,
        answerText: null,
        answerFile: null
      });
      continue;
    }

    if (question.type === "text") {
      const text = answer.answerText ? answer.answerText.trim() : null;
      if (question.isRequired && !text) {
        throw new Error("SCREENING_QUESTION_REQUIRED");
      }
      normalized.push({
        questionId: question.id,
        answerBoolean: null,
        answerText: text,
        answerFile: null
      });
      continue;
    }

    throw new Error("SCREENING_QUESTION_REQUIRED");
  }

  return normalized;
}

function mergeExtractedProfile(
  existing: CandidateProfile,
  extracted: CandidateProfileAiExtract,
  authEmail: string
): Parameters<CandidatePortalService["upsertProfile"]>[0] {
  const fullName = pickBestFullName(extracted.fullName, existing.fullName, authEmail);

  const normalizedPhone = normalizeBrazilPhoneDigitsFromExtract(extracted.phone, existing.phone);
  const phone =
    normalizedPhone ??
    (extracted.phone?.trim()
      ? (existing.phone ?? null)
      : preferNonEmpty(extracted.phone, existing.phone));
  const cpf = preferNonEmpty(extracted.cpf, existing.cpf);
  const city = preferNonEmpty(extracted.city, existing.city);
  const state = preferNonEmpty(extracted.state, existing.state);

  const linkedinUrl = mergeOptionalUrl(extracted.linkedinUrl, existing.linkedinUrl);
  const portfolioUrl = mergeOptionalUrl(extracted.portfolioUrl, existing.portfolioUrl);

  const professionalSummary = mergeSummaryText(existing.professionalSummary, extracted.professionalSummary);

  const desiredPosition = preferNonEmpty(extracted.desiredPosition, existing.desiredPosition);

  const salaryExpectation =
    extracted.salaryExpectation != null && Number.isFinite(extracted.salaryExpectation)
      ? extracted.salaryExpectation
      : existing.salaryExpectation;

  const yearsExperience =
    extracted.yearsExperience != null && Number.isFinite(extracted.yearsExperience)
      ? extracted.yearsExperience
      : existing.yearsExperience;

  const skills = normalizeSkillList([...existing.skills, ...extracted.skills]);

  const education =
    extracted.education.length > 0 ? mapAiEducationTimeline(extracted.education) : existing.education;

  const experience =
    extracted.experience.length > 0 ? mapAiExperienceTimeline(extracted.experience) : existing.experience;

  return {
    userId: existing.userId,
    fullName,
    email: authEmail,
    phone,
    cpf,
    city,
    state,
    linkedinUrl,
    portfolioUrl,
    professionalSummary,
    desiredPosition,
    salaryExpectation,
    yearsExperience,
    skills,
    education,
    experience
  };
}

function pickBestFullName(
  extracted: string | null | undefined,
  existing: string | null | undefined,
  authEmail: string
): string {
  const fromAi = (extracted ?? "").trim();
  if (fromAi.length >= 3) return fromAi.slice(0, 160);
  const fromDb = (existing ?? "").trim();
  if (fromDb.length >= 3) return fromDb.slice(0, 160);
  const local = authEmail.split("@")[0]?.replace(/[._-]+/g, " ").trim() ?? "";
  if (local.length >= 3) return local.slice(0, 160);
  return "Candidato";
}

function preferNonEmpty(
  extracted: string | null | undefined,
  existing: string | null | undefined
): string | null {
  const e = (extracted ?? "").trim();
  if (e.length > 0) return e;
  const x = (existing ?? "").trim();
  return x.length > 0 ? x : null;
}

function mergeSummaryText(
  existing: string | null,
  extracted: string | null | undefined
): string | null {
  const e = (extracted ?? "").trim();
  if (e.length > 0) return e;
  return existing?.trim() ? existing.trim() : null;
}

function mergeOptionalUrl(
  extracted: string | null | undefined,
  existing: string | null | undefined
): string | null {
  const fromAi = normalizeOptionalUrl(extracted);
  if (fromAi) return fromAi;
  return normalizeOptionalUrl(existing);
}

function normalizeOptionalUrl(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t || t === "https://" || t === "http://") return null;
  try {
    const u = new URL(t.startsWith("http://") || t.startsWith("https://") ? t : `https://${t}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    const href = u.href;
    return href.length <= 255 ? href : href.slice(0, 255);
  } catch {
    return null;
  }
}

function normalizeIsoDateOrNull(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const ym = t.match(/^(\d{4})-(\d{2})$/);
  if (ym) return `${ym[1]}-${ym[2]}-01`;
  const my = t.match(/^(\d{1,2})\/(\d{4})$/);
  if (my) {
    const mo = my[1]!.padStart(2, "0");
    return `${my[2]}-${mo}-01`;
  }
  return null;
}

function truncateDesc(s: string | null | undefined, max: number): string | null {
  const t = (s ?? "").trim();
  if (!t) return null;
  return t.length <= max ? t : t.slice(0, max);
}

function mapAiEducationTimeline(
  items: NonNullable<CandidateProfileAiExtract["education"]>
): CandidateTimelineItem[] {
  return items
    .filter((item) => item.title.trim().length > 0)
    .map((item) => ({
      id: randomUUID(),
      title: item.title.trim().slice(0, 200),
      startDate: normalizeIsoDateOrNull(item.startDate),
      endDate: item.isCurrent ? null : normalizeIsoDateOrNull(item.endDate),
      isCurrent: item.isCurrent ?? false,
      description: truncateDesc(item.description, 5000)
    }));
}

function mapAiExperienceTimeline(
  items: NonNullable<CandidateProfileAiExtract["experience"]>
): CandidateTimelineItem[] {
  return items
    .filter((item) => item.title.trim().length > 0)
    .map((item) => ({
      id: randomUUID(),
      title: item.title.trim().slice(0, 200),
      startDate: normalizeIsoDateOrNull(item.startDate),
      endDate: item.isCurrent ? null : normalizeIsoDateOrNull(item.endDate),
      isCurrent: item.isCurrent ?? false,
      description: truncateDesc(item.description, 8000)
    }));
}

function validateResumeFileForAi(mimeType: string, sizeBytes: number) {
  const m = mimeType.toLowerCase();
  const allowed = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
  ]);
  if (!allowed.has(m)) {
    throw new Error("INVALID_FILE_TYPE");
  }
  if (sizeBytes > env.MAX_PDF_UPLOAD_SIZE_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }
}

function normalizeResumeFileNameForAi(fileName: string, mimeType: string): string {
  const m = mimeType.toLowerCase();
  if (m === "application/pdf") {
    return normalizePdfFileName(fileName);
  }
  return normalizeImageFileName(fileName, mimeType);
}

function validateResumeUpload(mimeType: string, sizeBytes: number) {
  if (mimeType.toLowerCase() !== "application/pdf") {
    throw new Error("INVALID_FILE_TYPE");
  }
  if (sizeBytes > env.MAX_PDF_UPLOAD_SIZE_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }
}

function mapStorageUploadError(
  error: { message?: string; statusCode?: string | number },
  _context: "resume"
): Error {
  void _context;
  const statusCode = String(error.statusCode ?? "");
  const msg = (error.message ?? "").toLowerCase();
  if (statusCode === "403" || msg.includes("forbidden") || msg.includes("policy") || msg.includes("row-level security")) {
    return new Error("STORAGE_UPLOAD_REJECTED");
  }
  if (
    statusCode === "413" ||
    msg.includes("too large") ||
    msg.includes("maximum") ||
    msg.includes("exceeded") ||
    msg.includes("size limit") ||
    msg.includes("entity too large")
  ) {
    return new Error("FILE_TOO_LARGE");
  }
  return new Error("UPLOAD_INTENT_FAILED");
}

function normalizePdfFileName(fileName: string): string {
  const trimmed = fileName.trim().toLowerCase();
  const base = trimmed.replace(/[^a-z0-9._-]/g, "_");
  if (base.endsWith(".pdf")) return base;
  return `${base}.pdf`;
}

function validateProfileImageUpload(mimeType: string, sizeBytes: number) {
  const safeType = mimeType.toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp"].includes(safeType)) {
    throw new Error("INVALID_FILE_TYPE");
  }
  if (sizeBytes > 5 * 1024 * 1024) {
    throw new Error("PROFILE_IMAGE_TOO_LARGE");
  }
}

function normalizeImageFileName(fileName: string, mimeType: string): string {
  const trimmed = fileName.trim().toLowerCase();
  const base = trimmed.replace(/[^a-z0-9._-]/g, "_").replace(/\.(jpg|jpeg|png|webp)$/i, "");
  const ext = mimeType.toLowerCase() === "image/png" ? "png" : mimeType.toLowerCase() === "image/webp" ? "webp" : "jpg";
  return `${base || "avatar"}.${ext}`;
}
