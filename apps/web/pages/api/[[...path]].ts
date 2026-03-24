import type { NextApiRequest, NextApiResponse } from "next";
import serverless from "serverless-http";

import { createApp } from "@vv/api/create-app";

const app = createApp({ stripApiPrefix: "/api" });

const handler = serverless(app);

export default function api(req: NextApiRequest, res: NextApiResponse) {
  return handler(req, res);
}

export const config = {
  api: {
    bodyParser: false
  }
};
