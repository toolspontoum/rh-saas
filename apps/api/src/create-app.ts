import cors from "cors";
import express from "express";
import type { ErrorRequestHandler } from "express";

import { env } from "./config/env.js";

/** Carregar em paralelo ao primeiro pedido (não no bundle inicial do createApp) — reduz cold start na Vercel. */
let liteRouterPromise: Promise<import("express").Router> | null = null;

function getLiteRouter(): Promise<import("express").Router> {
  if (!liteRouterPromise) {
    liteRouterPromise = import("./http/routes-lite.js").then((m) => m.liteRouter);
  }
  return liteRouterPromise;
}

let heavyRouterPromise: Promise<import("express").Router> | null = null;

function getHeavyRouter(): Promise<import("express").Router> {
  if (!heavyRouterPromise) {
    heavyRouterPromise = import("./http/routes.js").then((m) => m.apiRouter);
  }
  return heavyRouterPromise;
}

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

export type CreateAppOptions = {
  /**
   * Na Vercel a API Express rota em `pages/api/*`; o pedido chega como `/api/v1/...`.
   * Remove o prefixo para o router continuar a servir `/v1/...` e `/health`.
   */
  stripApiPrefix?: string;
};

export function createApp(options?: CreateAppOptions): express.Application {
  const app = express();
  const allowedOrigins = env.WEB_ALLOWED_ORIGINS.split(",").map((item) => item.trim());

  if (options?.stripApiPrefix) {
    const prefix = options.stripApiPrefix;
    app.use((req, _res, next) => {
      if (req.url?.startsWith(prefix)) {
        req.url = req.url.slice(prefix.length) || "/";
      }
      next();
    });
  }

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true
    })
  );
  app.use(express.json({ limit: JSON_BODY_LIMIT_BYTES }));
  app.use((req, res, next) => {
    void getLiteRouter()
      .then((router) => {
        router(req, res, next);
      })
      .catch(next);
  });
  app.use((req, res, next) => {
    void getHeavyRouter()
      .then((router) => {
        router(req, res, next);
      })
      .catch(next);
  });
  app.use(handlePayloadTooLarge);

  return app;
}
