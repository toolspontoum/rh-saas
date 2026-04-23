import type { NextApiRequest, NextApiResponse } from "next";
import serverless from "serverless-http";

type ServerlessHandler = ReturnType<typeof serverless>;

function apiPathSegments(req: NextApiRequest): string[] {
  const p = req.query.path;
  if (p == null) return [];
  return Array.isArray(p) ? p : [p];
}

function headerAuthorization(req: NextApiRequest): string | null {
  const raw = req.headers.authorization;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && raw[0]) return raw[0];
  return null;
}

async function readJsonBody(req: NextApiRequest): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req as AsyncIterable<Buffer | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

let cached: ServerlessHandler | null = null;
let initError: Error | null = null;
/** Evita vários cold starts em paralelo a importar create-app (504 no superadmin com 3 GETs). */
let handlerInflight: Promise<ServerlessHandler> | null = null;

async function getHandler(): Promise<ServerlessHandler> {
  if (initError) throw initError;
  if (cached) return cached;
  if (!handlerInflight) {
    handlerInflight = (async () => {
      const { createApp } = await import("@vv/api/create-app");
      const app = createApp({ stripApiPrefix: "/api" });
      const h = serverless(app);
      cached = h;
      return h;
    })().catch((e) => {
      initError = e instanceof Error ? e : new Error(String(e));
      handlerInflight = null;
      throw initError;
    });
  }
  return handlerInflight;
}

export default async function api(req: NextApiRequest, res: NextApiResponse) {
  try {
    /**
     * Em alguns deploys o pedido cai aqui (nxtPpath nos logs) em vez do App Router.
     * Evitar `import(create-app)` + Express no login — era a causa típica de bloqueio até maxDuration (ex.: 60s).
     */
    const segments = apiPathSegments(req);
    const pathKey = segments.join("/");

    if (req.method === "GET" && segments.length === 2 && segments[0] === "public" && segments[1] === "jobs") {
      return res.status(403).json({
        error: "GLOBAL_CATALOG_DISABLED",
        message: "Listagem global de vagas desativada. Use o link publico do assinante (/vagas/{slug})."
      });
    }

    if (req.method === "GET" && segments.length === 3 && segments[0] === "public" && segments[1] === "jobs") {
      const { runPublicJobsBySegmentGet } = await import("@vv/api/run-public-jobs");
      const q = req.query;
      const out = await runPublicJobsBySegmentGet(segments[2] ?? "", {
        page: typeof q.page === "string" ? q.page : undefined,
        pageSize: typeof q.pageSize === "string" ? q.pageSize : undefined,
        companyId: typeof q.companyId === "string" ? q.companyId : undefined
      });
      return res.status(out.status).json(out.body);
    }

    if (req.method === "GET" && segments.length === 4 && segments[0] === "public" && segments[1] === "jobs") {
      const { runPublicJobByTenantAndIdGet } = await import("@vv/api/run-public-jobs");
      const out = await runPublicJobByTenantAndIdGet(segments[2] ?? "", segments[3] ?? "");
      return res.status(out.status).json(out.body);
    }

    if (
      req.method === "POST" &&
      segments.length === 4 &&
      segments[0] === "public" &&
      segments[1] === "jobs" &&
      segments[3] === "quick-apply"
    ) {
      const bodyQuick = await readJsonBody(req);
      const { runPublicQuickApplyPost } = await import("@vv/api/run-public-jobs");
      const outQuick = await runPublicQuickApplyPost(segments[2] ?? "", bodyQuick);
      return res.status(outQuick.status).json(outQuick.body);
    }

    if (req.method === "GET" && pathKey === "v1/platform/me") {
      const { runPlatformMeGet } = await import("@vv/api/run-platform-me");
      const { status, body } = await runPlatformMeGet(headerAuthorization(req));
      return res.status(status).json(body);
    }

    if (req.method === "GET" && pathKey === "v1/me/tenants") {
      const { runMyTenantsGet } = await import("@vv/api/run-my-tenants");
      const { status, body } = await runMyTenantsGet(headerAuthorization(req));
      return res.status(status).json(body);
    }

    if (req.method === "GET" && segments.length === 3 && segments[0] === "v1" && segments[1] === "skills" && segments[2] === "tags") {
      const qSkills = req.query;
      const { runSkillTagsGet } = await import("@vv/api/run-candidate-me-writes");
      const outSkills = await runSkillTagsGet(headerAuthorization(req), {
        query: typeof qSkills.query === "string" ? qSkills.query : undefined,
        limit: typeof qSkills.limit === "string" ? qSkills.limit : undefined
      });
      return res.status(outSkills.status).json(outSkills.body);
    }

    if (req.method === "GET" && segments.length >= 2 && segments[0] === "v1" && segments[1] === "me") {
      const q = req.query;
      const { runMeCandidateGet } = await import("@vv/api/run-tenant-data-gets");
      const out = await runMeCandidateGet(headerAuthorization(req), segments.slice(2), {
        page: typeof q.page === "string" ? q.page : undefined,
        pageSize: typeof q.pageSize === "string" ? q.pageSize : undefined
      });
      if (out) return res.status(out.status).json(out.body);
    }

    /**
     * Candidato autenticado: PUT/POST/DELETE em /v1/me/* sem cold start do Express (504 na Vercel em candidaturas).
     */
    if (segments[0] === "v1" && segments[1] === "me") {
      const authCandidate = headerAuthorization(req);
      const candidateWrites = await import("@vv/api/run-candidate-me-writes");

      if (req.method === "PUT" && segments.length === 3 && segments[2] === "candidate-profile") {
        const bodyCp = await readJsonBody(req);
        const outCp = await candidateWrites.runCandidatePutProfile(authCandidate, bodyCp);
        return res.status(outCp.status).json(outCp.body);
      }

      if (
        req.method === "POST" &&
        segments.length === 5 &&
        segments[2] === "candidate-profile" &&
        segments[3] === "resume" &&
        segments[4] === "upload-intent"
      ) {
        const bodyRi = await readJsonBody(req);
        const outRi = await candidateWrites.runCandidateResumeUploadIntentPost(authCandidate, bodyRi);
        return res.status(outRi.status).json(outRi.body);
      }

      if (
        req.method === "POST" &&
        segments.length === 5 &&
        segments[2] === "candidate-profile" &&
        segments[3] === "resume" &&
        segments[4] === "confirm-upload"
      ) {
        const bodyRc = await readJsonBody(req);
        const outRc = await candidateWrites.runCandidateResumeConfirmUploadPost(authCandidate, bodyRc);
        return res.status(outRc.status).json(outRc.body);
      }

      if (
        req.method === "POST" &&
        segments.length === 5 &&
        segments[2] === "candidate-profile" &&
        segments[3] === "avatar" &&
        segments[4] === "upload-intent"
      ) {
        const bodyAi = await readJsonBody(req);
        const outAi = await candidateWrites.runCandidateAvatarUploadIntentPost(authCandidate, bodyAi);
        return res.status(outAi.status).json(outAi.body);
      }

      if (
        req.method === "POST" &&
        segments.length === 5 &&
        segments[2] === "candidate-profile" &&
        segments[3] === "avatar" &&
        segments[4] === "confirm-upload"
      ) {
        const bodyAc = await readJsonBody(req);
        const outAc = await candidateWrites.runCandidateAvatarConfirmUploadPost(authCandidate, bodyAc);
        return res.status(outAc.status).json(outAc.body);
      }

      if (req.method === "POST" && segments.length === 5 && segments[2] === "jobs" && segments[4] === "apply") {
        const jobIdApply = segments[3] ?? "";
        const bodyApply = await readJsonBody(req);
        const outApply = await candidateWrites.runCandidateApplyToJobPost(authCandidate, jobIdApply, bodyApply);
        return res.status(outApply.status).json(outApply.body);
      }

      if (req.method === "DELETE" && segments.length === 5 && segments[2] === "jobs" && segments[4] === "application") {
        const jobIdWd = segments[3] ?? "";
        const outWd = await candidateWrites.runCandidateWithdrawApplicationDelete(authCandidate, jobIdWd);
        return res.status(outWd.status).json(outWd.body);
      }
    }

    if (req.method === "GET" && segments.length === 4 && segments[0] === "v1" && segments[1] === "tenants") {
      const tenantSegment = segments[2] ?? "";
      const sub = segments[3] ?? "";
      if (sub === "context" || sub === "companies") {
        const { runTenantContextGet, runTenantCompaniesListGet } = await import("@vv/api/run-tenant-layout-gets");
        const auth = headerAuthorization(req);
        const out =
          sub === "context" ? await runTenantContextGet(auth, tenantSegment) : await runTenantCompaniesListGet(auth, tenantSegment);
        return res.status(out.status).json(out.body);
      }
      if (sub === "users") {
        const { runTenantUsersListGet } = await import("@vv/api/run-tenant-users-get");
        const q = req.query;
        const companyRaw = req.headers["x-tenant-company-id"];
        const xCompany =
          typeof companyRaw === "string" ? companyRaw : Array.isArray(companyRaw) ? companyRaw[0] : undefined;
        const out = await runTenantUsersListGet(headerAuthorization(req), tenantSegment, {
          status: typeof q.status === "string" ? q.status : undefined,
          search: typeof q.search === "string" ? q.search : undefined,
          page: typeof q.page === "string" ? q.page : undefined,
          pageSize: typeof q.pageSize === "string" ? q.pageSize : undefined
        }, xCompany);
        return res.status(out.status).json(out.body);
      }
      const companyRaw4 = req.headers["x-tenant-company-id"];
      const xCompany4 =
        typeof companyRaw4 === "string" ? companyRaw4 : Array.isArray(companyRaw4) ? companyRaw4[0] : undefined;
      const q4 = req.query;
      if (sub === "employee-profile") {
        const {
          runTenantEmployeeProfileGet
        } = await import("@vv/api/run-tenant-data-gets");
        const out = await runTenantEmployeeProfileGet(headerAuthorization(req), tenantSegment, {
          targetUserId: typeof q4.targetUserId === "string" ? q4.targetUserId : undefined
        }, xCompany4);
        return res.status(out.status).json(out.body);
      }
      if (sub === "jobs") {
        const { runTenantJobsListGet } = await import("@vv/api/run-tenant-data-gets");
        const out = await runTenantJobsListGet(
          headerAuthorization(req),
          tenantSegment,
          {
            status: typeof q4.status === "string" ? q4.status : undefined,
            title: typeof q4.title === "string" ? q4.title : undefined,
            page: typeof q4.page === "string" ? q4.page : undefined,
            pageSize: typeof q4.pageSize === "string" ? q4.pageSize : undefined
          },
          xCompany4
        );
        return res.status(out.status).json(out.body);
      }
      if (sub === "candidates") {
        const { runTenantCandidatesListGet } = await import("@vv/api/run-tenant-data-gets");
        const out = await runTenantCandidatesListGet(
          headerAuthorization(req),
          tenantSegment,
          {
            candidateName: typeof q4.candidateName === "string" ? q4.candidateName : undefined,
            contract: typeof q4.contract === "string" ? q4.contract : undefined,
            isActive: typeof q4.isActive === "string" ? q4.isActive : undefined,
            page: typeof q4.page === "string" ? q4.page : undefined,
            pageSize: typeof q4.pageSize === "string" ? q4.pageSize : undefined
          },
          xCompany4
        );
        return res.status(out.status).json(out.body);
      }
      if (sub === "time-entries") {
        const { runTenantTimeEntriesListGet } = await import("@vv/api/run-tenant-data-gets");
        const out = await runTenantTimeEntriesListGet(
          headerAuthorization(req),
          tenantSegment,
          {
            targetUserId: typeof q4.targetUserId === "string" ? q4.targetUserId : undefined,
            page: typeof q4.page === "string" ? q4.page : undefined,
            pageSize: typeof q4.pageSize === "string" ? q4.pageSize : undefined
          },
          xCompany4
        );
        return res.status(out.status).json(out.body);
      }
      if (sub === "time-adjustments") {
        const { runTenantTimeAdjustmentsListGet } = await import("@vv/api/run-tenant-data-gets");
        const out = await runTenantTimeAdjustmentsListGet(
          headerAuthorization(req),
          tenantSegment,
          {
            targetUserId: typeof q4.targetUserId === "string" ? q4.targetUserId : undefined,
            status: typeof q4.status === "string" ? q4.status : undefined,
            mineOnly: typeof q4.mineOnly === "string" ? q4.mineOnly : undefined,
            page: typeof q4.page === "string" ? q4.page : undefined,
            pageSize: typeof q4.pageSize === "string" ? q4.pageSize : undefined
          },
          xCompany4
        );
        return res.status(out.status).json(out.body);
      }
      if (sub === "work-rules") {
        const { runTenantWorkRulesGet } = await import("@vv/api/run-tenant-data-gets");
        const out = await runTenantWorkRulesGet(headerAuthorization(req), tenantSegment, xCompany4);
        return res.status(out.status).json(out.body);
      }
      if (sub === "notices") {
        const { runTenantNoticesListGet } = await import("@vv/api/run-tenant-data-gets");
        const out = await runTenantNoticesListGet(
          headerAuthorization(req),
          tenantSegment,
          {
            onlyActive: typeof q4.onlyActive === "string" ? q4.onlyActive : undefined,
            onlyArchived: typeof q4.onlyArchived === "string" ? q4.onlyArchived : undefined
          },
          xCompany4
        );
        return res.status(out.status).json(out.body);
      }
      if (sub === "payslips") {
        const { runTenantPayslipsListGet } = await import("@vv/api/run-tenant-data-gets");
        const out = await runTenantPayslipsListGet(
          headerAuthorization(req),
          tenantSegment,
          {
            page: typeof q4.page === "string" ? q4.page : undefined,
            pageSize: typeof q4.pageSize === "string" ? q4.pageSize : undefined,
            contract: typeof q4.contract === "string" ? q4.contract : undefined,
            collaboratorName: typeof q4.collaboratorName === "string" ? q4.collaboratorName : undefined,
            collaboratorEmail: typeof q4.collaboratorEmail === "string" ? q4.collaboratorEmail : undefined,
            collaboratorCpf: typeof q4.collaboratorCpf === "string" ? q4.collaboratorCpf : undefined,
            referenceMonth: typeof q4.referenceMonth === "string" ? q4.referenceMonth : undefined,
            mineOnly: typeof q4.mineOnly === "string" ? q4.mineOnly : undefined,
            employeeUserId: typeof q4.employeeUserId === "string" ? q4.employeeUserId : undefined
          },
          xCompany4
        );
        return res.status(out.status).json(out.body);
      }
      if (sub === "oncall-shifts") {
        const { runTenantOncallShiftsListGet } = await import("@vv/api/run-tenant-data-gets");
        const out = await runTenantOncallShiftsListGet(
          headerAuthorization(req),
          tenantSegment,
          {
            targetUserId: typeof q4.targetUserId === "string" ? q4.targetUserId : undefined,
            from: typeof q4.from === "string" ? q4.from : undefined,
            to: typeof q4.to === "string" ? q4.to : undefined,
            name: typeof q4.name === "string" ? q4.name : undefined,
            email: typeof q4.email === "string" ? q4.email : undefined,
            cpf: typeof q4.cpf === "string" ? q4.cpf : undefined,
            department: typeof q4.department === "string" ? q4.department : undefined,
            positionTitle: typeof q4.positionTitle === "string" ? q4.positionTitle : undefined,
            contractType: typeof q4.contractType === "string" ? q4.contractType : undefined,
            status: typeof q4.status === "string" ? q4.status : undefined,
            tag: typeof q4.tag === "string" ? q4.tag : undefined,
            mineOnly: typeof q4.mineOnly === "string" ? q4.mineOnly : undefined,
            page: typeof q4.page === "string" ? q4.page : undefined,
            pageSize: typeof q4.pageSize === "string" ? q4.pageSize : undefined
          },
          xCompany4
        );
        return res.status(out.status).json(out.body);
      }
      if (sub === "shift-templates") {
        const { runTenantShiftTemplatesListGet } = await import("@vv/api/run-tenant-data-gets");
        const out = await runTenantShiftTemplatesListGet(headerAuthorization(req), tenantSegment, xCompany4);
        return res.status(out.status).json(out.body);
      }
      if (sub === "standard-document-types") {
        const { runTenantStandardDocumentsListGet } = await import("@vv/api/run-tenant-data-gets");
        const out = await runTenantStandardDocumentsListGet(headerAuthorization(req), tenantSegment);
        return res.status(out.status).json(out.body);
      }
      if (sub === "audit-logs") {
        const { runTenantAuditLogsListGet } = await import("@vv/api/run-tenant-data-gets");
        const out = await runTenantAuditLogsListGet(
          headerAuthorization(req),
          tenantSegment,
          {
            action: typeof q4.action === "string" ? q4.action : undefined,
            resourceType: typeof q4.resourceType === "string" ? q4.resourceType : undefined,
            from: typeof q4.from === "string" ? q4.from : undefined,
            to: typeof q4.to === "string" ? q4.to : undefined,
            page: typeof q4.page === "string" ? q4.page : undefined,
            pageSize: typeof q4.pageSize === "string" ? q4.pageSize : undefined
          },
          xCompany4
        );
        return res.status(out.status).json(out.body);
      }
      if (sub === "document-requests") {
        const { runTenantDocumentRequestsListGet } = await import("@vv/api/run-tenant-data-gets");
        const out = await runTenantDocumentRequestsListGet(
          headerAuthorization(req),
          tenantSegment,
          {
            collaboratorName: typeof q4.collaboratorName === "string" ? q4.collaboratorName : undefined,
            employeeUserId: typeof q4.employeeUserId === "string" ? q4.employeeUserId : undefined,
            docTab: typeof q4.docTab === "string" ? q4.docTab : undefined,
            status: typeof q4.status === "string" ? q4.status : undefined,
            page: typeof q4.page === "string" ? q4.page : undefined,
            pageSize: typeof q4.pageSize === "string" ? q4.pageSize : undefined
          },
          xCompany4
        );
        return res.status(out.status).json(out.body);
      }
      if (sub === "documents") {
        const { runTenantDocumentsListGet } = await import("@vv/api/run-tenant-data-gets");
        const out = await runTenantDocumentsListGet(
          headerAuthorization(req),
          tenantSegment,
          {
            page: typeof q4.page === "string" ? q4.page : undefined,
            pageSize: typeof q4.pageSize === "string" ? q4.pageSize : undefined,
            contract: typeof q4.contract === "string" ? q4.contract : undefined,
            collaboratorName: typeof q4.collaboratorName === "string" ? q4.collaboratorName : undefined,
            mineOnly: typeof q4.mineOnly === "string" ? q4.mineOnly : undefined,
            employeeUserId: typeof q4.employeeUserId === "string" ? q4.employeeUserId : undefined,
            docTab: typeof q4.docTab === "string" ? q4.docTab : undefined
          },
          xCompany4
        );
        return res.status(out.status).json(out.body);
      }
    }

    if (req.method === "GET" && segments.length === 5 && segments[0] === "v1" && segments[1] === "tenants") {
      const tenantSegment = segments[2] ?? "";
      const a = segments[3] ?? "";
      const b = segments[4] ?? "";
      const companyRaw5 = req.headers["x-tenant-company-id"];
      const xCompany5 =
        typeof companyRaw5 === "string" ? companyRaw5 : Array.isArray(companyRaw5) ? companyRaw5[0] : undefined;
      const q5 = req.query;
      if (a === "recruitment" && b === "applications") {
        const { runTenantRecruitmentApplicationsListGet } = await import("@vv/api/run-tenant-data-gets");
        const out = await runTenantRecruitmentApplicationsListGet(
          headerAuthorization(req),
          tenantSegment,
          {
            candidateName: typeof q5.candidateName === "string" ? q5.candidateName : undefined,
            candidateEmail: typeof q5.candidateEmail === "string" ? q5.candidateEmail : undefined,
            candidateCpf: typeof q5.candidateCpf === "string" ? q5.candidateCpf : undefined,
            jobId: typeof q5.jobId === "string" ? q5.jobId : undefined,
            status: typeof q5.status === "string" ? q5.status : undefined,
            createdFrom: typeof q5.createdFrom === "string" ? q5.createdFrom : undefined,
            createdTo: typeof q5.createdTo === "string" ? q5.createdTo : undefined,
            page: typeof q5.page === "string" ? q5.page : undefined,
            pageSize: typeof q5.pageSize === "string" ? q5.pageSize : undefined
          },
          xCompany5
        );
        return res.status(out.status).json(out.body);
      }
      if (a === "time-reports" && b === "summary") {
        const { runTenantTimeReportsSummaryGet } = await import("@vv/api/run-tenant-data-gets");
        const out = await runTenantTimeReportsSummaryGet(
          headerAuthorization(req),
          tenantSegment,
          {
            targetUserId: typeof q5.targetUserId === "string" ? q5.targetUserId : undefined,
            from: typeof q5.from === "string" ? q5.from : undefined,
            to: typeof q5.to === "string" ? q5.to : undefined
          },
          xCompany5
        );
        return res.status(out.status).json(out.body);
      }
      if (a === "time-reports" && b === "closures") {
        const { runTenantTimeReportsClosuresListGet } = await import("@vv/api/run-tenant-data-gets");
        const out = await runTenantTimeReportsClosuresListGet(
          headerAuthorization(req),
          tenantSegment,
          {
            targetUserId: typeof q5.targetUserId === "string" ? q5.targetUserId : undefined,
            referenceMonth: typeof q5.referenceMonth === "string" ? q5.referenceMonth : undefined,
            page: typeof q5.page === "string" ? q5.page : undefined,
            pageSize: typeof q5.pageSize === "string" ? q5.pageSize : undefined
          },
          xCompany5
        );
        return res.status(out.status).json(out.body);
      }
      if (a === "oncall-shifts") {
        const { runTenantOncallShiftByIdGet } = await import("@vv/api/run-tenant-data-gets");
        const out = await runTenantOncallShiftByIdGet(headerAuthorization(req), tenantSegment, b, xCompany5);
        return res.status(out.status).json(out.body);
      }
    }

    if (req.method === "GET" && segments.length === 6 && segments[0] === "v1" && segments[1] === "tenants") {
      const tenantSegment = segments[2] ?? "";
      const a = segments[3] ?? "";
      const b = segments[4] ?? "";
      const c = segments[5] ?? "";
      const companyRaw6 = req.headers["x-tenant-company-id"];
      const xCompany6 =
        typeof companyRaw6 === "string" ? companyRaw6 : Array.isArray(companyRaw6) ? companyRaw6[0] : undefined;
      if (a === "documents" && c === "open") {
        const { runTenantDocumentOpenGet } = await import("@vv/api/run-tenant-data-gets");
        const out = await runTenantDocumentOpenGet(headerAuthorization(req), tenantSegment, b, xCompany6);
        return res.status(out.status).json(out.body);
      }
    }

    if (
      req.method === "GET" &&
      (pathKey === "v1/platform/tenants" ||
        pathKey === "v1/platform/superadmins" ||
        pathKey === "v1/platform/ai-settings")
    ) {
      const {
        runPlatformTenantsGet,
        runPlatformSuperadminsGet,
        runPlatformAiSettingsGet
      } = await import("@vv/api/run-platform-admin-gets");
      const auth = headerAuthorization(req);
      const out =
        pathKey === "v1/platform/tenants"
          ? await runPlatformTenantsGet(auth)
          : pathKey === "v1/platform/superadmins"
            ? await runPlatformSuperadminsGet(auth)
            : await runPlatformAiSettingsGet(auth);
      return res.status(out.status).json(out.body);
    }

    if (req.method === "POST") {
      const s = segments;
      if (
        s.length === 5 &&
        s[0] === "v1" &&
        s[1] === "platform" &&
        s[2] === "tenants" &&
        s[4] === "grant-admin"
      ) {
        const { runPlatformGrantAdminPost } = await import("@vv/api/run-platform-admin-gets");
        const { status, body } = await runPlatformGrantAdminPost(headerAuthorization(req), s[3] ?? "");
        return res.status(status).json(body);
      }
    }

    if (req.method === "PATCH") {
      const s = segments;
      if (
        s.length === 5 &&
        s[0] === "v1" &&
        s[1] === "platform" &&
        s[2] === "tenants" &&
        s[4] === "ai-provider"
      ) {
        const { runPlatformTenantAiProviderPatch } = await import("@vv/api/run-platform-admin-gets");
        const out = await runPlatformTenantAiProviderPatch(headerAuthorization(req), s[3] ?? "", req.body ?? {});
        return res.status(out.status).json(out.body);
      }
    }

    /** Lookup e-mail/CPF para pré-cadastro IA (GET leve; espelha App Router em app/api/.../employees/...). */
    if (
      req.method === "GET" &&
      segments.length === 5 &&
      segments[0] === "v1" &&
      segments[1] === "tenants" &&
      segments[3] === "employees"
    ) {
      const tenantLu = segments[2] ?? "";
      const leaf = segments[4] ?? "";
      const qLu = req.query;
      if (leaf === "lookup-by-email") {
        const { runTenantEmployeeLookupByEmailGet } = await import("@vv/api/run-tenant-employee-lookup-gets");
        const email = typeof qLu.email === "string" ? qLu.email : "";
        const outLu = await runTenantEmployeeLookupByEmailGet(headerAuthorization(req), tenantLu, email);
        return res.status(outLu.status).json(outLu.body);
      }
      if (leaf === "lookup-by-cpf") {
        const { runTenantEmployeeLookupByCpfGet } = await import("@vv/api/run-tenant-employee-lookup-gets");
        const cpf = typeof qLu.cpf === "string" ? qLu.cpf : "";
        const outCpf = await runTenantEmployeeLookupByCpfGet(headerAuthorization(req), tenantLu, cpf);
        return res.status(outCpf.status).json(outCpf.body);
      }
    }

    /** Cadastro automático (employee-prereg): evita carregar Express no cold start (504 na Vercel). */
    if (
      segments.length >= 4 &&
      segments[0] === "v1" &&
      segments[1] === "tenants" &&
      segments[3] === "employee-prereg"
    ) {
      const tenantSegment = segments[2] ?? "";
      const companyRawEp = req.headers["x-tenant-company-id"];
      const xCompanyEp =
        typeof companyRawEp === "string"
          ? companyRawEp
          : Array.isArray(companyRawEp)
            ? companyRawEp[0]
            : undefined;
      const authEp = headerAuthorization(req);
      const {
        runEmployeePreregListGet,
        runEmployeePreregBatchesLogGet,
        runEmployeePreregBatchDetailGet,
        runEmployeePreregDetailGet,
        runEmployeePreregCreateBatchPost,
        runEmployeePreregUpdatePut,
        runEmployeePreregDelete,
        runEmployeePreregConfirmRegisterPost,
        runEmployeePreregConfirmLinkPost
      } = await import("@vv/api/run-employee-prereg");

      if (req.method === "GET" && segments.length === 4) {
        const out = await runEmployeePreregListGet(authEp, tenantSegment, xCompanyEp);
        return res.status(out.status).json(out.body);
      }

      if (req.method === "GET" && segments.length === 6 && segments[4] === "batches" && segments[5] === "log") {
        const qEp = req.query;
        const out = await runEmployeePreregBatchesLogGet(
          authEp,
          tenantSegment,
          { limit: typeof qEp.limit === "string" ? qEp.limit : undefined },
          xCompanyEp
        );
        return res.status(out.status).json(out.body);
      }

      if (
        req.method === "GET" &&
        segments.length === 7 &&
        segments[4] === "batches" &&
        segments[6] === "detail"
      ) {
        const out = await runEmployeePreregBatchDetailGet(
          authEp,
          tenantSegment,
          segments[5] ?? "",
          xCompanyEp
        );
        return res.status(out.status).json(out.body);
      }

      if (req.method === "GET" && segments.length === 5 && segments[4] !== "batches") {
        const out = await runEmployeePreregDetailGet(authEp, tenantSegment, segments[4] ?? "", xCompanyEp);
        return res.status(out.status).json(out.body);
      }

      if (req.method === "POST" && segments.length === 5 && segments[4] === "batches") {
        const bodyEp = await readJsonBody(req);
        const out = await runEmployeePreregCreateBatchPost(authEp, tenantSegment, bodyEp, xCompanyEp);
        return res.status(out.status).json(out.body);
      }

      if (req.method === "PUT" && segments.length === 5 && segments[4] !== "batches") {
        const bodyPut = await readJsonBody(req);
        const out = await runEmployeePreregUpdatePut(
          authEp,
          tenantSegment,
          segments[4] ?? "",
          bodyPut,
          xCompanyEp
        );
        return res.status(out.status).json(out.body);
      }

      if (req.method === "DELETE" && segments.length === 5 && segments[4] !== "batches") {
        const out = await runEmployeePreregDelete(authEp, tenantSegment, segments[4] ?? "", xCompanyEp);
        return res.status(out.status).json(out.body);
      }

      if (
        req.method === "POST" &&
        segments.length === 6 &&
        segments[5] === "confirm-register" &&
        segments[4] !== "batches"
      ) {
        const out = await runEmployeePreregConfirmRegisterPost(
          authEp,
          tenantSegment,
          segments[4] ?? "",
          xCompanyEp
        );
        return res.status(out.status).json(out.body);
      }

      if (
        req.method === "POST" &&
        segments.length === 6 &&
        segments[5] === "confirm-link" &&
        segments[4] !== "batches"
      ) {
        const out = await runEmployeePreregConfirmLinkPost(
          authEp,
          tenantSegment,
          segments[4] ?? "",
          xCompanyEp
        );
        return res.status(out.status).json(out.body);
      }
    }

    /** Lotes de contracheques (IA): upload-intent e listagem sem cold start do Express (504). */
    if (
      segments.length === 5 &&
      segments[0] === "v1" &&
      segments[1] === "tenants" &&
      segments[3] === "payslips"
    ) {
      const tenantPs = segments[2] ?? "";
      const payslipSub = segments[4] ?? "";
      const companyRawPs = req.headers["x-tenant-company-id"];
      const xCompanyPs =
        typeof companyRawPs === "string"
          ? companyRawPs
          : Array.isArray(companyRawPs)
            ? companyRawPs[0]
            : undefined;
      const authPs = headerAuthorization(req);
      const {
        runPayslipBatchesListGet,
        runPayslipUploadIntentPost,
        runPayslipConfirmAiBulkPost
      } = await import("@vv/api/run-payslips-ai-vercel");

      if (req.method === "GET" && payslipSub === "batches") {
        const qPs = req.query;
        const out = await runPayslipBatchesListGet(authPs, tenantPs, {
          page: typeof qPs.page === "string" ? qPs.page : undefined,
          pageSize: typeof qPs.pageSize === "string" ? qPs.pageSize : undefined
        }, xCompanyPs);
        return res.status(out.status).json(out.body);
      }

      if (req.method === "POST" && payslipSub === "upload-intent") {
        const bodyPs = await readJsonBody(req);
        const out = await runPayslipUploadIntentPost(authPs, tenantPs, bodyPs, xCompanyPs);
        return res.status(out.status).json(out.body);
      }

      if (req.method === "POST" && payslipSub === "confirm-ai-bulk") {
        const bodyBulk = await readJsonBody(req);
        const out = await runPayslipConfirmAiBulkPost(authPs, tenantPs, bodyBulk, xCompanyPs);
        return res.status(out.status).json(out.body);
      }
    }

    /** POST /v1/tenants/:tenantId/features/:featureCode/validate — usado ao abrir módulos no painel. */
    if (
      req.method === "POST" &&
      segments.length === 6 &&
      segments[0] === "v1" &&
      segments[1] === "tenants" &&
      segments[3] === "features" &&
      segments[5] === "validate"
    ) {
      const { runTenantFeatureValidatePost } = await import("@vv/api/run-tenant-writes");
      const outFv = await runTenantFeatureValidatePost(
        headerAuthorization(req),
        segments[2] ?? "",
        segments[4] ?? ""
      );
      return res.status(outFv.status).json(outFv.body);
    }

    /** Vagas (recrutamento): POST/PATCH/DELETE sem cold start do Express (504 ao salvar na Vercel). */
    if (
      segments.length >= 4 &&
      segments[0] === "v1" &&
      segments[1] === "tenants" &&
      segments[3] === "jobs"
    ) {
      const tenantJobs = segments[2] ?? "";
      const jobIdSeg = segments[4];
      const companyRawJobs = req.headers["x-tenant-company-id"];
      const xCompanyJobs =
        typeof companyRawJobs === "string"
          ? companyRawJobs
          : Array.isArray(companyRawJobs)
            ? companyRawJobs[0]
            : undefined;
      const authJobs = headerAuthorization(req);
      const { runTenantJobCreatePost, runTenantJobPatch, runTenantJobDelete } = await import(
        "@vv/api/run-tenant-recruitment-writes"
      );

      if (req.method === "POST" && segments.length === 4) {
        const bodyJobs = await readJsonBody(req);
        const outJobs = await runTenantJobCreatePost(authJobs, tenantJobs, bodyJobs, xCompanyJobs);
        return res.status(outJobs.status).json(outJobs.body);
      }

      if (req.method === "PATCH" && segments.length === 5 && jobIdSeg) {
        const bodyJobs = await readJsonBody(req);
        const outJobs = await runTenantJobPatch(authJobs, tenantJobs, jobIdSeg, bodyJobs, xCompanyJobs);
        return res.status(outJobs.status).json(outJobs.body);
      }

      if (req.method === "DELETE" && segments.length === 5 && jobIdSeg) {
        const outJobs = await runTenantJobDelete(authJobs, tenantJobs, jobIdSeg, xCompanyJobs);
        return res.status(outJobs.status).json(outJobs.body);
      }
    }

    /** POST /v1/tenants/:tenantId/employees — upsert colaborador sem cold start. */
    if (
      req.method === "POST" &&
      segments.length === 4 &&
      segments[0] === "v1" &&
      segments[1] === "tenants" &&
      segments[3] === "employees"
    ) {
      const tenantEmp = segments[2] ?? "";
      const companyRawEmp = req.headers["x-tenant-company-id"];
      const xCompanyEmp =
        typeof companyRawEmp === "string"
          ? companyRawEmp
          : Array.isArray(companyRawEmp)
            ? companyRawEmp[0]
            : undefined;
      const { runTenantEmployeesPost } = await import("@vv/api/run-tenant-writes");
      const authEmp = headerAuthorization(req);
      const bodyEmp = await readJsonBody(req);
      const outEmp = await runTenantEmployeesPost(
        authEmp,
        tenantEmp,
        {
          fullName: typeof bodyEmp.fullName === "string" ? bodyEmp.fullName : undefined,
          email: typeof bodyEmp.email === "string" ? bodyEmp.email : undefined,
          cpf: typeof bodyEmp.cpf === "string" ? bodyEmp.cpf : undefined,
          phone: typeof bodyEmp.phone === "string" ? bodyEmp.phone : undefined
        },
        xCompanyEmp
      );
      return res.status(outEmp.status).json(outEmp.body);
    }

    /** POST /v1/tenants/:tenantId/companies — criar empresa/projeto sem cold start. */
    if (
      req.method === "POST" &&
      segments.length === 4 &&
      segments[0] === "v1" &&
      segments[1] === "tenants" &&
      segments[3] === "companies"
    ) {
      const tenantCoNew = segments[2] ?? "";
      const { runTenantCompaniesPost } = await import("@vv/api/run-tenant-writes");
      const authCoNew = headerAuthorization(req);
      const bodyCoNew = await readJsonBody(req);
      const taxRawNew = bodyCoNew.taxId;
      const taxIdNew =
        taxRawNew === null ? null : typeof taxRawNew === "string" ? taxRawNew : undefined;
      const outCoNew = await runTenantCompaniesPost(authCoNew, tenantCoNew, {
        name: typeof bodyCoNew.name === "string" ? bodyCoNew.name : undefined,
        taxId: taxIdNew
      });
      return res.status(outCoNew.status).json(outCoNew.body);
    }

    /** Empresas: PATCH/DELETE sem cold start do Express (504 ao salvar renome na Vercel). */
    if (
      (req.method === "PATCH" || req.method === "DELETE") &&
      segments.length === 5 &&
      segments[0] === "v1" &&
      segments[1] === "tenants" &&
      segments[3] === "companies"
    ) {
      const tenantCo = segments[2] ?? "";
      const companyCo = segments[4] ?? "";
      const { runTenantCompaniesPatch, runTenantCompaniesDelete } = await import("@vv/api/run-tenant-writes");
      const authCo = headerAuthorization(req);
      if (req.method === "PATCH") {
        const bodyCo = await readJsonBody(req);
        const taxRaw = bodyCo.taxId;
        const taxId =
          taxRaw === null ? null : typeof taxRaw === "string" ? taxRaw : undefined;
        const out = await runTenantCompaniesPatch(authCo, tenantCo, companyCo, {
          name: typeof bodyCo.name === "string" ? bodyCo.name : undefined,
          taxId
        });
        return res.status(out.status).json(out.body);
      }
      const outDel = await runTenantCompaniesDelete(authCo, tenantCo, companyCo);
      return res.status(outDel.status).json(outDel.body);
    }

    if (
      req.method === "PUT" &&
      segments.length === 6 &&
      segments[0] === "v1" &&
      segments[1] === "tenants" &&
      segments[3] === "companies" &&
      segments[5] === "preposto"
    ) {
      const tenantPr = segments[2] ?? "";
      const companyPr = segments[4] ?? "";
      const { runTenantCompanyPrepostoPut } = await import("@vv/api/run-tenant-writes");
      const authPr = headerAuthorization(req);
      const bodyPr = await readJsonBody(req);
      const outPr = await runTenantCompanyPrepostoPut(authPr, tenantPr, companyPr, bodyPr);
      return res.status(outPr.status).json(outPr.body);
    }

    const h = await getHandler();
    return h(req, res);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api] init failed", e);
    if (!res.headersSent) {
      res.status(500).json({
        error: "API_INIT_FAILED",
        message: msg,
        hint:
          "Na Vercel → Settings → Environment Variables (Production): SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PROJECT_REF, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, WEB_ALLOWED_ORIGINS."
      });
    }
  }
}

export const config = {
  api: {
    bodyParser: false
  }
};
