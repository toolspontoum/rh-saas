import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Health check leve — não importa a Express (@vv/api), para cold start rápido na Vercel.
 * A rota completa continua em GET /api/v1/health (via [[...path]] + Express).
 */
export default function health(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ ok: true, scope: "edge-light" });
}
