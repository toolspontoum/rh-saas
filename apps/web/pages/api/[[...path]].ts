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

async function getHandler(): Promise<ServerlessHandler> {
  if (initError) throw initError;
  if (cached) return cached;
  try {
    const { createApp } = await import("@vv/api/create-app");
    const app = createApp({ stripApiPrefix: "/api" });
    cached = serverless(app);
    return cached;
  } catch (e) {
    initError = e instanceof Error ? e : new Error(String(e));
    throw initError;
  }
}

export default async function api(req: NextApiRequest, res: NextApiResponse) {
  try {
    /**
     * Em alguns deploys o pedido cai aqui (nxtPpath nos logs) em vez do App Router.
     * Evitar `import(create-app)` + Express no login — era a causa típica de bloqueio até maxDuration (ex.: 60s).
     */
    const segments = apiPathSegments(req);
    if (req.method === "GET" && segments.join("/") === "v1/platform/me") {
      const { runPlatformMeGet } = await import("@vv/api/run-platform-me");
      const { status, body } = await runPlatformMeGet(headerAuthorization(req));
      return res.status(status).json(body);
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
