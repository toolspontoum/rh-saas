import cors from "cors";
import express, { type ErrorRequestHandler } from "express";

import { env } from "./config/env.js";
import { apiRouter } from "./http/routes.js";
import { kickPayslipAiLinkQueue, kickResumeAnalysisQueue } from "./modules/ai/schedule.js";

/** Base64 aumenta o payload ~4/3; margem para JSON com metadados da candidatura rápida. */
const JSON_BODY_LIMIT_BYTES = Math.ceil(env.MAX_PDF_UPLOAD_SIZE_BYTES * 1.42);

const handlePayloadTooLarge: ErrorRequestHandler = (err, _req, res, next) => {
  const anyErr = err as { status?: number; statusCode?: number; type?: string };
  const status = anyErr.status ?? anyErr.statusCode;
  if (status === 413 || anyErr.type === "entity.too.large") {
    const mbPdf = Math.round(env.MAX_PDF_UPLOAD_SIZE_BYTES / (1024 * 1024));
    res.status(413).json({
      error: "REQUEST_BODY_TOO_LARGE",
      message: `O envio excedeu o limite da requisição. Para anexar currículo em PDF, o arquivo pode ter até ${mbPdf} MB (o envio em texto aumenta o tamanho; se o erro persistir, tente um arquivo menor).`
    });
    return;
  }
  next(err);
};

function main() {
  const app = express();
  const allowedOrigins = env.WEB_ALLOWED_ORIGINS.split(",").map((item) => item.trim());

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true
    })
  );
  app.use(express.json({ limit: JSON_BODY_LIMIT_BYTES }));
  app.use(apiRouter);
  app.use(handlePayloadTooLarge);

  app.listen(env.PORT, () => {
    console.log(`[api] running on port ${env.PORT} (${env.NODE_ENV})`);
    console.log(`[api] supabase project ${env.SUPABASE_PROJECT_REF}`);
  });

  if (env.AI_PAYSLIP_QUEUE_MS > 0) {
    setInterval(() => {
      kickPayslipAiLinkQueue();
    }, env.AI_PAYSLIP_QUEUE_MS);
  }

  if (env.AI_RESUME_QUEUE_MS > 0) {
    kickResumeAnalysisQueue();
    setInterval(() => {
      kickResumeAnalysisQueue();
    }, env.AI_RESUME_QUEUE_MS);
  }
}

main();
