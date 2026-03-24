import type { NextApiRequest, NextApiResponse } from "next";
import serverless from "serverless-http";

type ServerlessHandler = ReturnType<typeof serverless>;

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
