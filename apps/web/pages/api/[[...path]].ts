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
