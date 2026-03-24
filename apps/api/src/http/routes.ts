import { Router } from "express";
import type { Request } from "express";
import multer from "multer";

import { env } from "../config/env.js";
import { auditLogsHandlers } from "../modules/audit-logs/index.js";
import { candidatePortalHandlers } from "../modules/candidate-portal/index.js";
import { coreAuthTenantHandlers } from "../modules/core-auth-tenant/index.js";
import { documentsPayslipsHandlers } from "../modules/documents-payslips/index.js";
import { platformHandlers } from "../modules/platform/index.js";
import { isUuid } from "../modules/platform/platform.slugify.js";
import { recruitmentHandlers } from "../modules/recruitment/index.js";
import { standardDocumentsHandlers } from "../modules/standard-documents/index.js";
import { tenantCompaniesHandlers } from "../modules/tenant-companies/index.js";
import { tenantUsersHandlers } from "../modules/tenant-users/index.js";
import { workforceHandlers } from "../modules/workforce/index.js";
import { requireAuth, requirePlatformAdmin, type AuthenticatedRequest } from "./auth.js";
import { toHttpError } from "./error-handler.js";
import { getTenantCompanyId, resolveTenantCompanyScope } from "./tenant-company-scope.middleware.js";

const resumeProcessAiUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_PDF_UPLOAD_SIZE_BYTES }
});

export const apiRouter = Router();

apiRouter.get("/v1/platform/tenants", requirePlatformAdmin, async (_req, res) => {
  try {
    const result = await platformHandlers.listTenants();
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/platform/tenants", requirePlatformAdmin, async (req, res) => {
  try {
    const result = await platformHandlers.createTenant(req.body);
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/platform/tenants/:tenantId/grant-admin", requirePlatformAdmin, async (req, res) => {
  try {
    const result = await platformHandlers.grantAdminAccess(
      { tenantId: req.params.tenantId },
      (req as AuthenticatedRequest).auth
    );
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/platform/superadmins", requirePlatformAdmin, async (_req, res) => {
  try {
    const result = await platformHandlers.listSuperadmins();
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/platform/superadmins", requirePlatformAdmin, async (req, res) => {
  try {
    const result = await platformHandlers.addSuperadmin(req.body, (req as AuthenticatedRequest).auth);
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/platform/ai-settings", requirePlatformAdmin, async (_req, res) => {
  try {
    const result = await platformHandlers.getAiSettings();
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.patch("/v1/platform/ai-settings", requirePlatformAdmin, async (req, res) => {
  try {
    const result = await platformHandlers.patchAiSettings(req.body);
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.patch("/v1/platform/tenants/:tenantId/ai-provider", requirePlatformAdmin, async (req, res) => {
  try {
    const tenantId = String(req.params.tenantId ?? "");
    const result = await platformHandlers.patchTenantAiProvider(tenantId, req.body);
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/platform/standard-document-types", requirePlatformAdmin, async (_req, res) => {
  try {
    const result = await standardDocumentsHandlers.listPlatformTypes();
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/platform/standard-document-types", requirePlatformAdmin, async (req, res) => {
  try {
    const result = await standardDocumentsHandlers.createPlatformType(req.body);
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.patch("/v1/platform/standard-document-types/:id", requirePlatformAdmin, async (req, res) => {
  try {
    const result = await standardDocumentsHandlers.updatePlatformType({
      id: req.params.id,
      ...req.body
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/public/jobs", async (_req, res) => {
  return res.status(403).json({
    error: "GLOBAL_CATALOG_DISABLED",
    message: "Listagem global de vagas desativada. Use o link publico do assinante (/vagas/{slug})."
  });
});

apiRouter.get("/public/jobs/:tenantSlug/:jobId", async (req, res) => {
  try {
    const result = await candidatePortalHandlers.getPublicJobByTenantAndId({
      tenantSlug: req.params.tenantSlug,
      jobId: req.params.jobId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/public/jobs/:segment", async (req, res) => {
  try {
    const segment = req.params.segment;
    const page = typeof req.query.page === "string" ? req.query.page : undefined;
    const pageSize = typeof req.query.pageSize === "string" ? req.query.pageSize : undefined;
    const companyId = typeof req.query.companyId === "string" ? req.query.companyId : undefined;

    if (isUuid(segment)) {
      const result = await candidatePortalHandlers.getPublicJobById({
        jobId: segment
      });
      return res.status(200).json(result);
    }

    const result = await recruitmentHandlers.listPublicJobs({
      tenantSlug: segment,
      companyId,
      page,
      pageSize
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/public/jobs/:jobId/quick-apply", async (req, res) => {
  try {
    const result = await candidatePortalHandlers.quickApplyPublic({
      jobId: req.params.jobId,
      fullName: req.body?.fullName,
      email: req.body?.email,
      cpf: req.body?.cpf,
      phone: req.body?.phone,
      resumeFileName: req.body?.resumeFileName,
      resumeMimeType: req.body?.resumeMimeType,
      resumeBase64: req.body?.resumeBase64,
      coverLetter: req.body?.coverLetter,
      jobDocumentUploads: req.body?.jobDocumentUploads,
      screeningAnswers: req.body?.screeningAnswers ?? []
    });
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/public/jobs/:tenantSlug/:jobId/applications", async (req, res) => {
  try {
    const result = await recruitmentHandlers.createPublicApplication({
      tenantSlug: req.params.tenantSlug,
      jobId: req.params.jobId,
      coverLetter: req.body?.coverLetter ?? null,
      candidate: {
        fullName: req.body?.candidate?.fullName,
        email: req.body?.candidate?.email,
        phone: req.body?.candidate?.phone ?? null,
        cpf: req.body?.candidate?.cpf ?? null,
        source: req.body?.candidate?.source ?? null,
        contract: req.body?.candidate?.contract ?? null
      }
    });
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/me/candidate-profile", requireAuth, async (req, res) => {
  try {
    const result = await candidatePortalHandlers.getProfile((req as AuthenticatedRequest).auth.userId);
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.put("/v1/me/candidate-profile", requireAuth, async (req, res) => {
  try {
    const result = await candidatePortalHandlers.upsertProfile({
      userId: (req as AuthenticatedRequest).auth.userId,
      fullName: req.body?.fullName,
      email: req.body?.email,
      phone: req.body?.phone ?? null,
      cpf: req.body?.cpf ?? null,
      city: req.body?.city ?? null,
      state: req.body?.state ?? null,
      linkedinUrl: req.body?.linkedinUrl ?? null,
      portfolioUrl: req.body?.portfolioUrl ?? null,
      professionalSummary: req.body?.professionalSummary ?? null,
      desiredPosition: req.body?.desiredPosition ?? null,
      salaryExpectation: req.body?.salaryExpectation ?? null,
      yearsExperience: req.body?.yearsExperience ?? null,
      skills: req.body?.skills ?? [],
      education: req.body?.education ?? [],
      experience: req.body?.experience ?? []
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/me/candidate-profile/resume/upload-intent", requireAuth, async (req, res) => {
  try {
    const result = await candidatePortalHandlers.createResumeUploadIntent({
      userId: (req as AuthenticatedRequest).auth.userId,
      fileName: req.body?.fileName,
      mimeType: req.body?.mimeType,
      sizeBytes: req.body?.sizeBytes
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/me/candidate-profile/resume/confirm-upload", requireAuth, async (req, res) => {
  try {
    const result = await candidatePortalHandlers.confirmResumeUpload({
      userId: (req as AuthenticatedRequest).auth.userId,
      fileName: req.body?.fileName,
      filePath: req.body?.filePath,
      mimeType: req.body?.mimeType,
      sizeBytes: req.body?.sizeBytes
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post(
  "/v1/me/candidate-profile/resume/process-with-ai",
  requireAuth,
  (req, res, next) => {
    resumeProcessAiUpload.single("file")(req, res, (err: unknown) => {
      if (err && typeof err === "object" && err !== null && "code" in err) {
        const code = (err as { code: string }).code;
        if (code === "LIMIT_FILE_SIZE") {
          const parsed = toHttpError(new Error("FILE_TOO_LARGE"));
          return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
        }
      }
      if (err) {
        const parsed = toHttpError(err);
        return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file?.buffer) {
        const parsed = toHttpError(new Error("FILES_REQUIRED"));
        return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
      }
      const result = await candidatePortalHandlers.processResumeWithAi({
        userId: (req as AuthenticatedRequest).auth.userId,
        fileBuffer: file.buffer,
        fileName: file.originalname || "curriculo",
        mimeType: file.mimetype
      });
      return res.status(200).json(result);
    } catch (error) {
      const parsed = toHttpError(error);
      return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
    }
  }
);

apiRouter.post("/v1/me/candidate-profile/avatar/upload-intent", requireAuth, async (req, res) => {
  try {
    const result = await candidatePortalHandlers.createProfileImageUploadIntent({
      userId: (req as AuthenticatedRequest).auth.userId,
      fileName: req.body?.fileName,
      mimeType: req.body?.mimeType,
      sizeBytes: req.body?.sizeBytes
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/me/candidate-profile/avatar/confirm-upload", requireAuth, async (req, res) => {
  try {
    const result = await candidatePortalHandlers.confirmProfileImageUpload({
      userId: (req as AuthenticatedRequest).auth.userId,
      fileName: req.body?.fileName,
      filePath: req.body?.filePath,
      mimeType: req.body?.mimeType,
      sizeBytes: req.body?.sizeBytes
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/me/jobs/employers", requireAuth, async (req, res) => {
  try {
    const result = await candidatePortalHandlers.listJobEmployers({
      userId: (req as AuthenticatedRequest).auth.userId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/me/jobs/tenant/:tenantId", requireAuth, async (req, res) => {
  try {
    const page = typeof req.query.page === "string" ? req.query.page : undefined;
    const pageSize = typeof req.query.pageSize === "string" ? req.query.pageSize : undefined;
    const result = await candidatePortalHandlers.listJobsForTenant({
      userId: (req as AuthenticatedRequest).auth.userId,
      tenantId: req.params.tenantId,
      page,
      pageSize
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/me/jobs/:jobId/application-documents", requireAuth, async (req, res) => {
  try {
    const result = await candidatePortalHandlers.getApplicantDocumentPresenceForJob({
      userId: (req as AuthenticatedRequest).auth.userId,
      jobId: req.params.jobId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/me/jobs/:jobId/apply", requireAuth, async (req, res) => {
  try {
    const result = await candidatePortalHandlers.applyToJob({
      userId: (req as AuthenticatedRequest).auth.userId,
      jobId: req.params.jobId,
      coverLetter: req.body?.coverLetter,
      jobDocumentUploads: req.body?.jobDocumentUploads,
      reuseExistingRequirementIds: req.body?.reuseExistingRequirementIds,
      screeningAnswers: req.body?.screeningAnswers ?? []
    });
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/me/jobs/:jobId/application", requireAuth, async (req, res) => {
  try {
    const result = await candidatePortalHandlers.getMyApplicationByJob({
      userId: (req as AuthenticatedRequest).auth.userId,
      jobId: req.params.jobId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.delete("/v1/me/jobs/:jobId/application", requireAuth, async (req, res) => {
  try {
    const result = await candidatePortalHandlers.withdrawMyApplication({
      userId: (req as AuthenticatedRequest).auth.userId,
      jobId: req.params.jobId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/me/jobs/details/:jobId", requireAuth, async (req, res) => {
  try {
    const result = await candidatePortalHandlers.getPublicJobById({
      jobId: req.params.jobId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/me/job-applications", requireAuth, async (req, res) => {
  try {
    const page = typeof req.query.page === "string" ? req.query.page : undefined;
    const pageSize = typeof req.query.pageSize === "string" ? req.query.pageSize : undefined;
    const result = await candidatePortalHandlers.listMyApplications({
      userId: (req as AuthenticatedRequest).auth.userId,
      page,
      pageSize
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/me/jobs/suggested", requireAuth, async (req, res) => {
  try {
    const page = typeof req.query.page === "string" ? req.query.page : undefined;
    const pageSize = typeof req.query.pageSize === "string" ? req.query.pageSize : undefined;
    const result = await candidatePortalHandlers.listSuggestedJobs({
      userId: (req as AuthenticatedRequest).auth.userId,
      page,
      pageSize
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/skills/tags", requireAuth, async (req, res) => {
  try {
    const query = typeof req.query.query === "string" ? req.query.query : undefined;
    const limit = typeof req.query.limit === "string" ? req.query.limit : undefined;
    const result = await recruitmentHandlers.listSkillTags({ query, limit });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.use("/v1/tenants/:tenantId", resolveTenantCompanyScope);

apiRouter.get("/v1/tenants/:tenantId/context", requireAuth, async (req, res) => {
  try {
    const result = await coreAuthTenantHandlers.getContext({
      userId: (req as AuthenticatedRequest).auth.userId,
      tenantId: req.params.tenantId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.patch("/v1/tenants/:tenantId/ai-provider", requireAuth, async (_req, res) => {
  return res.status(403).json({
    error: "FORBIDDEN",
    message: "O provedor de IA do assinante é definido apenas no painel de plataforma (superadmin)."
  });
});

apiRouter.post("/v1/tenants/:tenantId/features/:featureCode/validate", requireAuth, async (req, res) => {
  try {
    const result = await coreAuthTenantHandlers.validateFeature({
      userId: (req as AuthenticatedRequest).auth.userId,
      tenantId: req.params.tenantId,
      featureCode: req.params.featureCode
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/jobs", requireAuth, async (req, res) => {
  try {
    const result = await recruitmentHandlers.createJob({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req) ?? req.body?.companyId ?? null,
      title: req.body?.title,
      description: req.body?.description,
      department: req.body?.department ?? null,
      location: req.body?.location ?? null,
      employmentType: req.body?.employmentType ?? null,
      city: req.body?.city ?? null,
      state: req.body?.state ?? null,
      salary: req.body?.salary ?? null,
      expiresAt: req.body?.expiresAt ?? null,
      skills: req.body?.skills ?? [],
      screeningQuestions: req.body?.screeningQuestions ?? [],
      documentRequirements: req.body?.documentRequirements,
      aiScreeningCriteria: req.body?.aiScreeningCriteria,
      status: req.body?.status
    });
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/jobs", requireAuth, async (req, res) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const title = typeof req.query.title === "string" ? req.query.title : undefined;
    const page = typeof req.query.page === "string" ? req.query.page : undefined;
    const pageSize = typeof req.query.pageSize === "string" ? req.query.pageSize : undefined;

    const result = await recruitmentHandlers.listJobs({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      status,
      title,
      page,
      pageSize
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/jobs/:jobId", requireAuth, async (req, res) => {
  try {
    const result = await recruitmentHandlers.getJob({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      jobId: req.params.jobId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.patch("/v1/tenants/:tenantId/jobs/:jobId", requireAuth, async (req, res) => {
  try {
    const result = await recruitmentHandlers.updateJob({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      jobId: req.params.jobId,
      title: req.body?.title,
      description: req.body?.description,
      department: req.body?.department ?? null,
      location: req.body?.location ?? null,
      employmentType: req.body?.employmentType ?? null,
      city: req.body?.city ?? null,
      state: req.body?.state ?? null,
      salary: req.body?.salary ?? null,
      expiresAt: req.body?.expiresAt ?? null,
      skills: req.body?.skills,
      screeningQuestions: req.body?.screeningQuestions,
      documentRequirements: req.body?.documentRequirements,
      aiScreeningCriteria: req.body?.aiScreeningCriteria,
      status: req.body?.status
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.delete("/v1/tenants/:tenantId/jobs/:jobId", requireAuth, async (req, res) => {
  try {
    const result = await recruitmentHandlers.deleteJob({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      jobId: req.params.jobId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/jobs/:jobId/applications", requireAuth, async (req, res) => {
  try {
    const result = await recruitmentHandlers.createApplication({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      jobId: req.params.jobId,
      coverLetter: req.body?.coverLetter ?? null,
      candidate: {
        fullName: req.body?.candidate?.fullName,
        email: req.body?.candidate?.email,
        phone: req.body?.candidate?.phone ?? null,
        cpf: req.body?.candidate?.cpf ?? null,
        source: req.body?.candidate?.source ?? null,
        contract: req.body?.candidate?.contract ?? null
      }
    });
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/documents", requireAuth, async (req, res) => {
  try {
    const result = await documentsPayslipsHandlers.createDocument({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      collaboratorName: req.body?.collaboratorName,
      collaboratorEmail: req.body?.collaboratorEmail,
      contract: req.body?.contract ?? null,
      title: req.body?.title,
      description: req.body?.description ?? null,
      category: req.body?.category,
      fileName: req.body?.fileName,
      filePath: req.body?.filePath,
      mimeType: req.body?.mimeType,
      sizeBytes: req.body?.sizeBytes
    });
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/document-requests", requireAuth, async (req, res) => {
  try {
    const result = await documentsPayslipsHandlers.createDocumentRequest({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      collaboratorName: req.body?.collaboratorName,
      collaboratorEmail: req.body?.collaboratorEmail,
      contract: req.body?.contract ?? null,
      docTab: req.body?.docTab,
      docType: req.body?.docType,
      description: req.body?.description ?? null,
      filePath: req.body?.filePath ?? null,
      fileName: req.body?.fileName ?? null,
      mimeType: req.body?.mimeType ?? null,
      sizeBytes: req.body?.sizeBytes ?? null,
      workflow: req.body?.workflow === "signature" ? "signature" : undefined
    });
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/document-requests", requireAuth, async (req, res) => {
  try {
    const collaboratorName =
      typeof req.query.collaboratorName === "string" ? req.query.collaboratorName : undefined;
    const employeeUserId = typeof req.query.employeeUserId === "string" ? req.query.employeeUserId : undefined;
    const docTab = typeof req.query.docTab === "string" ? req.query.docTab : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const page = typeof req.query.page === "string" ? req.query.page : undefined;
    const pageSize = typeof req.query.pageSize === "string" ? req.query.pageSize : undefined;

    const result = await documentsPayslipsHandlers.listDocumentRequests({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      collaboratorName,
      employeeUserId,
      docTab,
      status,
      page,
      pageSize
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/documents/upload-intent", requireAuth, async (req, res) => {
  try {
    const result = await documentsPayslipsHandlers.createDocumentUploadIntent({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      fileName: req.body?.fileName,
      mimeType: req.body?.mimeType,
      sizeBytes: req.body?.sizeBytes
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/document-requests/:requestId/upload-intent", requireAuth, async (req, res) => {
  try {
    const result = await documentsPayslipsHandlers.createRequestResponseUploadIntent({
      tenantId: req.params.tenantId,
      requestId: req.params.requestId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      fileName: req.body?.fileName,
      mimeType: req.body?.mimeType,
      sizeBytes: req.body?.sizeBytes
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/document-requests/:requestId/confirm-upload", requireAuth, async (req, res) => {
  try {
    const result = await documentsPayslipsHandlers.confirmRequestResponseUpload({
      tenantId: req.params.tenantId,
      requestId: req.params.requestId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      filePath: req.body?.filePath,
      fileName: req.body?.fileName,
      mimeType: req.body?.mimeType,
      sizeBytes: req.body?.sizeBytes,
      description: req.body?.description ?? null
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/documents/confirm-upload", requireAuth, async (req, res) => {
  try {
    const result = await documentsPayslipsHandlers.confirmDocumentUpload({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      collaboratorName: req.body?.collaboratorName,
      collaboratorEmail: req.body?.collaboratorEmail,
      contract: req.body?.contract ?? null,
      title: req.body?.title,
      description: req.body?.description ?? null,
      category: req.body?.category,
      filePath: req.body?.filePath,
      fileName: req.body?.fileName,
      mimeType: req.body?.mimeType,
      sizeBytes: req.body?.sizeBytes
    });
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/documents", requireAuth, async (req, res) => {
  try {
    const page = typeof req.query.page === "string" ? req.query.page : undefined;
    const pageSize = typeof req.query.pageSize === "string" ? req.query.pageSize : undefined;
    const contract = typeof req.query.contract === "string" ? req.query.contract : undefined;
    const collaboratorName =
      typeof req.query.collaboratorName === "string" ? req.query.collaboratorName : undefined;
    const mineOnly = typeof req.query.mineOnly === "string" ? req.query.mineOnly : undefined;
    const employeeUserId = typeof req.query.employeeUserId === "string" ? req.query.employeeUserId : undefined;
    const docTab = typeof req.query.docTab === "string" ? req.query.docTab : undefined;

    const result = await documentsPayslipsHandlers.listDocuments({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      page,
      pageSize,
      contract,
      collaboratorName,
      mineOnly,
      employeeUserId,
      docTab
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/documents/:documentId/open", requireAuth, async (req, res) => {
  try {
    const result = await documentsPayslipsHandlers.openDocument({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      documentId: req.params.documentId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/payslips", requireAuth, async (req, res) => {
  try {
    const result = await documentsPayslipsHandlers.createPayslip({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      collaboratorName: req.body?.collaboratorName,
      collaboratorEmail: req.body?.collaboratorEmail,
      contract: req.body?.contract ?? null,
      referenceMonth: req.body?.referenceMonth,
      fileName: req.body?.fileName,
      filePath: req.body?.filePath,
      mimeType: req.body?.mimeType,
      sizeBytes: req.body?.sizeBytes
    });
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/payslips/upload-intent", requireAuth, async (req, res) => {
  try {
    const result = await documentsPayslipsHandlers.createPayslipUploadIntent({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      referenceMonth: req.body?.referenceMonth,
      fileName: req.body?.fileName,
      mimeType: req.body?.mimeType,
      sizeBytes: req.body?.sizeBytes
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/payslips/confirm-upload", requireAuth, async (req, res) => {
  try {
    const result = await documentsPayslipsHandlers.confirmPayslipUpload({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      collaboratorName: req.body?.collaboratorName,
      collaboratorEmail: req.body?.collaboratorEmail,
      contract: req.body?.contract ?? null,
      referenceMonth: req.body?.referenceMonth,
      filePath: req.body?.filePath,
      fileName: req.body?.fileName,
      mimeType: req.body?.mimeType,
      sizeBytes: req.body?.sizeBytes
    });
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/payslips/confirm-ai-bulk", requireAuth, async (req, res) => {
  try {
    const result = await documentsPayslipsHandlers.confirmAiBulkPayslips({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      referenceMonth: req.body?.referenceMonth,
      files: req.body?.files
    });
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/payslips/import-csv", requireAuth, async (req, res) => {
  try {
    const result = await documentsPayslipsHandlers.importPayslipsCsv({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      referenceMonth: req.body?.referenceMonth,
      csvText: req.body?.csvText
    });
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/payslips", requireAuth, async (req, res) => {
  try {
    const page = typeof req.query.page === "string" ? req.query.page : undefined;
    const pageSize = typeof req.query.pageSize === "string" ? req.query.pageSize : undefined;
    const contract = typeof req.query.contract === "string" ? req.query.contract : undefined;
    const collaboratorName =
      typeof req.query.collaboratorName === "string" ? req.query.collaboratorName : undefined;
    const collaboratorEmail =
      typeof req.query.collaboratorEmail === "string" ? req.query.collaboratorEmail : undefined;
    const collaboratorCpf =
      typeof req.query.collaboratorCpf === "string" ? req.query.collaboratorCpf : undefined;
    const referenceMonth =
      typeof req.query.referenceMonth === "string" ? req.query.referenceMonth : undefined;
    const mineOnly = typeof req.query.mineOnly === "string" ? req.query.mineOnly : undefined;
    const employeeUserId = typeof req.query.employeeUserId === "string" ? req.query.employeeUserId : undefined;

    const result = await documentsPayslipsHandlers.listPayslips({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      page,
      pageSize,
      contract,
      collaboratorName,
      collaboratorEmail,
      collaboratorCpf,
      referenceMonth,
      mineOnly,
      employeeUserId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/payslips/:payslipId/open", requireAuth, async (req, res) => {
  try {
    const result = await documentsPayslipsHandlers.openPayslip({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      payslipId: req.params.payslipId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/payslips/:payslipId/acknowledge", requireAuth, async (req, res) => {
  try {
    const result = await documentsPayslipsHandlers.acknowledgePayslip({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      payslipId: req.params.payslipId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.patch("/v1/tenants/:tenantId/payslips/:payslipId", requireAuth, async (req, res) => {
  try {
    const result = await documentsPayslipsHandlers.updatePayslipReferenceMonth({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      payslipId: req.params.payslipId,
      referenceMonth: req.body?.referenceMonth
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post(
  "/v1/tenants/:tenantId/jobs/:jobId/applications/:applicationId/ai-reanalyze",
  requireAuth,
  async (req, res) => {
    try {
      const result = await recruitmentHandlers.requeueApplicationAiAnalysis({
        tenantId: req.params.tenantId,
        userId: (req as AuthenticatedRequest).auth.userId,
        companyId: getTenantCompanyId(req),
        jobId: req.params.jobId,
        applicationId: req.params.applicationId
      });
      return res.status(200).json(result);
    } catch (error) {
      const parsed = toHttpError(error);
      return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
    }
  }
);

apiRouter.get("/v1/tenants/:tenantId/jobs/:jobId/applications", requireAuth, async (req, res) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const candidateName =
      typeof req.query.candidateName === "string" ? req.query.candidateName : undefined;
    const page = typeof req.query.page === "string" ? req.query.page : undefined;
    const pageSize = typeof req.query.pageSize === "string" ? req.query.pageSize : undefined;

    const result = await recruitmentHandlers.listJobApplications({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      jobId: req.params.jobId,
      status,
      candidateName,
      page,
      pageSize
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/audit-logs", requireAuth, async (req, res) => {
  try {
    const action = typeof req.query.action === "string" ? req.query.action : undefined;
    const resourceType =
      typeof req.query.resourceType === "string" ? req.query.resourceType : undefined;
    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    const page = typeof req.query.page === "string" ? req.query.page : undefined;
    const pageSize = typeof req.query.pageSize === "string" ? req.query.pageSize : undefined;

    const result = await auditLogsHandlers.list({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      action,
      resourceType,
      from,
      to,
      page,
      pageSize
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/audit-logs/export.csv", requireAuth, async (req, res) => {
  try {
    const action = typeof req.query.action === "string" ? req.query.action : undefined;
    const resourceType =
      typeof req.query.resourceType === "string" ? req.query.resourceType : undefined;
    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    const limit = typeof req.query.limit === "string" ? req.query.limit : undefined;

    const csv = await auditLogsHandlers.exportCsv({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      action,
      resourceType,
      from,
      to,
      limit
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=\"audit-logs-${req.params.tenantId}.csv\"`);
    return res.status(200).send(csv);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.patch("/v1/tenants/:tenantId/jobs/:jobId/applications/:applicationId/status", requireAuth, async (req, res) => {
  try {
    const result = await recruitmentHandlers.updateApplicationStatus({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      jobId: req.params.jobId,
      applicationId: req.params.applicationId,
      status: req.body?.status
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/candidates", requireAuth, async (req, res) => {
  try {
    const candidateName =
      typeof req.query.candidateName === "string" ? req.query.candidateName : undefined;
    const contract = typeof req.query.contract === "string" ? req.query.contract : undefined;
    const isActive = typeof req.query.isActive === "string" ? req.query.isActive : undefined;
    const page = typeof req.query.page === "string" ? req.query.page : undefined;
    const pageSize = typeof req.query.pageSize === "string" ? req.query.pageSize : undefined;

    const result = await recruitmentHandlers.listCandidates({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      candidateName,
      contract,
      isActive,
      page,
      pageSize
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/recruitment/applications", requireAuth, async (req, res) => {
  try {
    const candidateName =
      typeof req.query.candidateName === "string" ? req.query.candidateName : undefined;
    const candidateEmail =
      typeof req.query.candidateEmail === "string" ? req.query.candidateEmail : undefined;
    const candidateCpf =
      typeof req.query.candidateCpf === "string" ? req.query.candidateCpf : undefined;
    const jobId = typeof req.query.jobId === "string" ? req.query.jobId : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const createdFrom =
      typeof req.query.createdFrom === "string" ? req.query.createdFrom : undefined;
    const createdTo = typeof req.query.createdTo === "string" ? req.query.createdTo : undefined;
    const page = typeof req.query.page === "string" ? req.query.page : undefined;
    const pageSize = typeof req.query.pageSize === "string" ? req.query.pageSize : undefined;

    const result = await recruitmentHandlers.listTenantApplications({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      candidateName,
      candidateEmail,
      candidateCpf,
      jobId,
      status,
      createdFrom,
      createdTo,
      page,
      pageSize
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/recruitment/applications/:applicationId", requireAuth, async (req, res) => {
  try {
    const result = await recruitmentHandlers.getTenantApplicationDetails({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      applicationId: req.params.applicationId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/recruitment/applications/:applicationId/resume-download", requireAuth, async (req, res) => {
  try {
    const result = await recruitmentHandlers.getTenantApplicationResumeDownload({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      applicationId: req.params.applicationId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.patch("/v1/tenants/:tenantId/candidates/:candidateId/status", requireAuth, async (req, res) => {
  try {
    const result = await recruitmentHandlers.updateCandidateStatus({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      candidateId: req.params.candidateId,
      isActive: req.body?.isActive
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.delete("/v1/tenants/:tenantId/candidates/:candidateId", requireAuth, async (req, res) => {
  try {
    const result = await recruitmentHandlers.deleteInactiveCandidate({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      candidateId: req.params.candidateId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/standard-document-types", requireAuth, async (req, res) => {
  try {
    const result = await standardDocumentsHandlers.listTenantMerged({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.patch("/v1/tenants/:tenantId/standard-document-types", requireAuth, async (req, res) => {
  try {
    const result = await standardDocumentsHandlers.patchTenantSettings({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      items: req.body?.items
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/companies", requireAuth, async (req, res) => {
  try {
    const result = await tenantCompaniesHandlers.list({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/companies", requireAuth, async (req, res) => {
  try {
    const result = await tenantCompaniesHandlers.create({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      name: req.body?.name,
      taxId: req.body?.taxId ?? null
    });
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.patch("/v1/tenants/:tenantId/companies/:companyId", requireAuth, async (req, res) => {
  try {
    const result = await tenantCompaniesHandlers.update({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: req.params.companyId,
      name: req.body?.name,
      taxId: req.body?.taxId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.delete("/v1/tenants/:tenantId/companies/:companyId", requireAuth, async (req, res) => {
  try {
    const result = await tenantCompaniesHandlers.delete({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: req.params.companyId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/users", requireAuth, async (req, res) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const page = typeof req.query.page === "string" ? req.query.page : undefined;
    const pageSize = typeof req.query.pageSize === "string" ? req.query.pageSize : undefined;

    const result = await tenantUsersHandlers.listUsers({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      status,
      search,
      page,
      pageSize
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/employees/lookup-by-email", requireAuth, async (req, res) => {
  try {
    const email = typeof req.query.email === "string" ? req.query.email : "";
    const result = await tenantUsersHandlers.lookupEmployeeByEmail({
      tenantId: req.params.tenantId,
      actorUserId: (req as AuthenticatedRequest).auth.userId,
      email
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/employees", requireAuth, async (req, res) => {
  try {
    const result = await tenantUsersHandlers.upsertEmployee({
      tenantId: req.params.tenantId,
      actorUserId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      fullName: req.body?.fullName,
      email: req.body?.email,
      cpf: req.body?.cpf,
      phone: req.body?.phone
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/backoffice-users", requireAuth, async (req, res) => {
  try {
    const result = await tenantUsersHandlers.upsertBackofficeUser({
      tenantId: req.params.tenantId,
      actorUserId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      fullName: req.body?.fullName,
      email: req.body?.email,
      role: req.body?.role,
      cpf: req.body?.cpf,
      phone: req.body?.phone
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.patch("/v1/tenants/:tenantId/users/:targetUserId/status", requireAuth, async (req, res) => {
  try {
    const result = await tenantUsersHandlers.updateUserStatus({
      tenantId: req.params.tenantId,
      actorUserId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      targetUserId: req.params.targetUserId,
      status: req.body?.status,
      reason: req.body?.reason
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.delete("/v1/tenants/:tenantId/users/:targetUserId", requireAuth, async (req, res) => {
  try {
    const result = await tenantUsersHandlers.deleteUser({
      tenantId: req.params.tenantId,
      actorUserId: (req as AuthenticatedRequest).auth.userId,
      companyId: getTenantCompanyId(req),
      targetUserId: req.params.targetUserId,
      reason: req.body?.reason
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/notices", requireAuth, async (req, res) => {
  try {
    const onlyActive = typeof req.query.onlyActive === "string" ? req.query.onlyActive : undefined;
    const onlyArchived =
      typeof req.query.onlyArchived === "string" ? req.query.onlyArchived : undefined;
    const result = await workforceHandlers.listNotices({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      onlyActive,
      onlyArchived
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/notices/:noticeId/read", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.markNoticeRead({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      noticeId: req.params.noticeId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/notices/:noticeId/archive", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.archiveNotice({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      noticeId: req.params.noticeId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/notices/:noticeId/unarchive", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.unarchiveNotice({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      noticeId: req.params.noticeId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.delete("/v1/tenants/:tenantId/notices/:noticeId", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.deleteNotice({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      noticeId: req.params.noticeId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/notices", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.createNotice({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      title: req.body?.title,
      message: req.body?.message,
      target: req.body?.target,
      recipientUserIds: req.body?.recipientUserIds ?? [],
      attachments: req.body?.attachments ?? []
    });
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/notices/upload-intent", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.createNoticeAttachmentUploadIntent({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      fileName: req.body?.fileName,
      mimeType: req.body?.mimeType,
      sizeBytes: req.body?.sizeBytes
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/time-entries", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.createTimeEntry({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      contract: req.body?.contract ?? null,
      entryType: req.body?.entryType,
      recordedAt: req.body?.recordedAt,
      source: req.body?.source ?? "web",
      note: req.body?.note ?? null
    });
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/time-entries", requireAuth, async (req, res) => {
  try {
    const targetUserId = typeof req.query.targetUserId === "string" ? req.query.targetUserId : undefined;
    const page = typeof req.query.page === "string" ? req.query.page : undefined;
    const pageSize = typeof req.query.pageSize === "string" ? req.query.pageSize : undefined;
    const result = await workforceHandlers.listTimeEntries({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      targetUserId,
      page,
      pageSize
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/time-adjustments", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.createAdjustment({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      targetDate: req.body?.targetDate,
      requestedTime: req.body?.requestedTime,
      reason: req.body?.reason,
      timeEntryId: req.body?.timeEntryId ?? null,
      targetEntryType: req.body?.targetEntryType ?? null,
      requestedRecordedAt: req.body?.requestedRecordedAt ?? null
    });
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/time-adjustments", requireAuth, async (req, res) => {
  try {
    const targetUserId = typeof req.query.targetUserId === "string" ? req.query.targetUserId : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const mineOnly = typeof req.query.mineOnly === "string" ? req.query.mineOnly : undefined;
    const page = typeof req.query.page === "string" ? req.query.page : undefined;
    const pageSize = typeof req.query.pageSize === "string" ? req.query.pageSize : undefined;
    const result = await workforceHandlers.listAdjustments({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      targetUserId,
      status,
      mineOnly,
      page,
      pageSize
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.patch("/v1/tenants/:tenantId/time-adjustments/:adjustmentId/review", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.reviewAdjustment({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      adjustmentId: req.params.adjustmentId,
      status: req.body?.status,
      reviewNote: req.body?.reviewNote
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.patch("/v1/tenants/:tenantId/time-entries/:entryId", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.updateTimeEntry({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      entryId: req.params.entryId,
      recordedAt: req.body?.recordedAt,
      reason: req.body?.reason ?? null
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/time-entries/:entryId/change-logs", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.listTimeEntryChangeLogs({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      entryId: req.params.entryId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/oncall-shifts", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.createOncallShift({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      targetUserId: req.body?.targetUserId,
      scheduledDate: req.body?.scheduledDate,
      startTime: req.body?.startTime,
      endTime: req.body?.endTime,
      note: req.body?.note ?? null
    });
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/oncall-shifts", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.listOncallShifts({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      targetUserId: typeof req.query.targetUserId === "string" ? req.query.targetUserId : undefined,
      from: typeof req.query.from === "string" ? req.query.from : undefined,
      to: typeof req.query.to === "string" ? req.query.to : undefined,
      name: typeof req.query.name === "string" ? req.query.name : undefined,
      email: typeof req.query.email === "string" ? req.query.email : undefined,
      cpf: typeof req.query.cpf === "string" ? req.query.cpf : undefined,
      department: typeof req.query.department === "string" ? req.query.department : undefined,
      positionTitle:
        typeof req.query.positionTitle === "string" ? req.query.positionTitle : undefined,
      contractType: typeof req.query.contractType === "string" ? req.query.contractType : undefined,
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      tag: typeof req.query.tag === "string" ? req.query.tag : undefined,
      mineOnly: typeof req.query.mineOnly === "string" ? req.query.mineOnly : undefined,
      page: typeof req.query.page === "string" ? req.query.page : undefined,
      pageSize: typeof req.query.pageSize === "string" ? req.query.pageSize : undefined
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/oncall-shifts/:oncallShiftId", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.getOncallShiftById({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      oncallShiftId: req.params.oncallShiftId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.patch("/v1/tenants/:tenantId/oncall-shifts/:oncallShiftId", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.updateOncallShift({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      oncallShiftId: req.params.oncallShiftId,
      scheduledDate: req.body?.scheduledDate,
      startTime: req.body?.startTime,
      endTime: req.body?.endTime,
      note: req.body?.note
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.delete("/v1/tenants/:tenantId/oncall-shifts/:oncallShiftId", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.deleteOncallShift({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      oncallShiftId: req.params.oncallShiftId,
      reason: req.body?.reason ?? null
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post(
  "/v1/tenants/:tenantId/oncall-shifts/:oncallShiftId/acknowledge",
  requireAuth,
  async (req, res) => {
    try {
      const result = await workforceHandlers.acknowledgeOncallShift({
        tenantId: req.params.tenantId,
        companyId: getTenantCompanyId(req),
        userId: (req as AuthenticatedRequest).auth.userId,
        oncallShiftId: req.params.oncallShiftId
      });
      return res.status(200).json(result);
    } catch (error) {
      const parsed = toHttpError(error);
      return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
    }
  }
);

apiRouter.post(
  "/v1/tenants/:tenantId/oncall-shifts/:oncallShiftId/register-entry",
  requireAuth,
  async (req, res) => {
    try {
      const result = await workforceHandlers.registerOncallShiftEntry({
        tenantId: req.params.tenantId,
        companyId: getTenantCompanyId(req),
        userId: (req as AuthenticatedRequest).auth.userId,
        oncallShiftId: req.params.oncallShiftId,
        timeEntryId: req.body?.timeEntryId,
        recordedAt: req.body?.recordedAt,
        source: req.body?.source
      });
      return res.status(200).json(result);
    } catch (error) {
      const parsed = toHttpError(error);
      return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
    }
  }
);

apiRouter.get("/v1/tenants/:tenantId/oncall-shifts/:oncallShiftId/events", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.listOncallShiftEvents({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      oncallShiftId: req.params.oncallShiftId,
      page: typeof req.query.page === "string" ? req.query.page : undefined,
      pageSize: typeof req.query.pageSize === "string" ? req.query.pageSize : undefined
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/work-rules", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.getWorkRule({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.put("/v1/tenants/:tenantId/work-rules", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.updateWorkRule({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      dailyWorkMinutes: req.body?.dailyWorkMinutes,
      nightStart: req.body?.nightStart,
      nightEnd: req.body?.nightEnd
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/time-reports/summary", requireAuth, async (req, res) => {
  try {
    const targetUserId =
      typeof req.query.targetUserId === "string" ? req.query.targetUserId : undefined;
    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    const result = await workforceHandlers.getReportSummary({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      targetUserId,
      from,
      to
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/time-reports/closures", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.closeMonthlyReport({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      targetUserId: req.body?.targetUserId,
      referenceMonth: req.body?.referenceMonth
    });
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/time-reports/closures", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.listTimeReportClosures({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      targetUserId: typeof req.query.targetUserId === "string" ? req.query.targetUserId : undefined,
      referenceMonth: typeof req.query.referenceMonth === "string" ? req.query.referenceMonth : undefined,
      page: typeof req.query.page === "string" ? req.query.page : undefined,
      pageSize: typeof req.query.pageSize === "string" ? req.query.pageSize : undefined
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/time-reports/closures/:closureId", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.getTimeReportClosure({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      closureId: req.params.closureId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/time-reports/closures/:closureId/pdf", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.getTimeReportClosurePdf({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      closureId: req.params.closureId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/time-reports/partial-pdf", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.getPartialMonthReportPdf({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      targetUserId: typeof req.query.targetUserId === "string" ? req.query.targetUserId : "",
      referenceMonth: typeof req.query.referenceMonth === "string" ? req.query.referenceMonth : undefined
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/shift-templates", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.listShiftTemplates({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/shift-templates", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.createShiftTemplate({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      name: req.body?.name,
      dailyWorkMinutes: req.body?.dailyWorkMinutes,
      weeklyWorkMinutes: req.body?.weeklyWorkMinutes ?? null,
      lunchBreakMinutes: req.body?.lunchBreakMinutes ?? 60,
      overtimePercent: req.body?.overtimePercent ?? 50,
      monthlyWorkMinutes: req.body?.monthlyWorkMinutes ?? 13200
    });
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.patch("/v1/tenants/:tenantId/shift-templates/:templateId", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.updateShiftTemplate({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      templateId: req.params.templateId,
      name: req.body?.name,
      dailyWorkMinutes: req.body?.dailyWorkMinutes,
      weeklyWorkMinutes: req.body?.weeklyWorkMinutes ?? null,
      lunchBreakMinutes: req.body?.lunchBreakMinutes ?? 60,
      overtimePercent: req.body?.overtimePercent ?? 50,
      monthlyWorkMinutes: req.body?.monthlyWorkMinutes ?? 13200
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/shift-assignments", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.assignShiftTemplate({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      targetUserId: req.body?.targetUserId,
      shiftTemplateId: req.body?.shiftTemplateId,
      startsAt: req.body?.startsAt,
      endsAt: req.body?.endsAt ?? null
    });
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/employee-profile", requireAuth, async (req, res) => {
  try {
    const targetUserId = typeof req.query.targetUserId === "string" ? req.query.targetUserId : undefined;
    const result = await workforceHandlers.getEmployeeProfile({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      targetUserId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.put("/v1/tenants/:tenantId/employee-profile", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.upsertEmployeeProfile({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      targetUserId: req.body?.targetUserId,
      fullName: req.body?.fullName ?? null,
      personalEmail: req.body?.personalEmail ?? null,
      cpf: req.body?.cpf ?? null,
      phone: req.body?.phone ?? null,
      department: req.body?.department ?? null,
      positionTitle: req.body?.positionTitle ?? null,
      contractType: req.body?.contractType ?? null,
      admissionDate: req.body?.admissionDate ?? null,
      baseSalary: req.body?.baseSalary ?? null,
      employeeTags: req.body?.employeeTags ?? []
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/employee-profile/avatar/upload-intent", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.createEmployeeProfileImageUploadIntent({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      targetUserId: req.body?.targetUserId,
      fileName: req.body?.fileName,
      mimeType: req.body?.mimeType,
      sizeBytes: req.body?.sizeBytes
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/employee-profile/avatar/confirm-upload", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.confirmEmployeeProfileImageUpload({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      targetUserId: req.body?.targetUserId,
      fileName: req.body?.fileName,
      filePath: req.body?.filePath,
      mimeType: req.body?.mimeType,
      sizeBytes: req.body?.sizeBytes
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/onboarding/requirements", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.listOnboardingRequirements({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/onboarding/requirements", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.createOnboardingRequirement({
      tenantId: req.params.tenantId,
      userId: (req as AuthenticatedRequest).auth.userId,
      title: req.body?.title,
      category: req.body?.category ?? "geral",
      isRequired: req.body?.isRequired ?? true,
      appliesToContract: req.body?.appliesToContract ?? null
    });
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.get("/v1/tenants/:tenantId/onboarding/submissions", requireAuth, async (req, res) => {
  try {
    const targetUserId = typeof req.query.targetUserId === "string" ? req.query.targetUserId : undefined;
    const result = await workforceHandlers.listOnboardingSubmissions({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      targetUserId
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.post("/v1/tenants/:tenantId/onboarding/submissions", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.submitOnboardingRequirement({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      targetUserId: req.body?.targetUserId,
      requirementId: req.body?.requirementId,
      documentId: req.body?.documentId ?? null
    });
    return res.status(201).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});

apiRouter.patch("/v1/tenants/:tenantId/onboarding/submissions/:submissionId/review", requireAuth, async (req, res) => {
  try {
    const result = await workforceHandlers.reviewOnboardingSubmission({
      tenantId: req.params.tenantId,
      companyId: getTenantCompanyId(req),
      userId: (req as AuthenticatedRequest).auth.userId,
      submissionId: req.params.submissionId,
      status: req.body?.status,
      reviewNote: req.body?.reviewNote ?? null
    });
    return res.status(200).json(result);
  } catch (error) {
    const parsed = toHttpError(error);
    return res.status(parsed.status).json({ error: parsed.code, message: parsed.message });
  }
});
