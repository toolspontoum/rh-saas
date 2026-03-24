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
