import { randomUUID } from "node:crypto";

import cors from "cors";
import express from "express";
import type { ErrorRequestHandler } from "express";

import { env } from "./config/env.js";

const API_PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=(), interest-cohort=()";

const API_JSON_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";

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
  const allowedOrigins = env.WEB_ALLOWED_ORIGINS.split(",")
    .map((item) => item.trim())
    .filter((origin) => origin.length > 0 && origin !== "*");

  if (options?.stripApiPrefix) {
    const prefix = options.stripApiPrefix;
    app.use((req, _res, next) => {
      if (req.url?.startsWith(prefix)) {
        req.url = req.url.slice(prefix.length) || "/";
      }
      next();
    });
  }

  app.use((req, res, next) => {
    const incoming = req.get("x-correlation-id")?.trim();
    const correlationId = incoming && incoming.length > 0 ? incoming : randomUUID();
    res.setHeader("X-Correlation-Id", correlationId);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", API_PERMISSIONS_POLICY);
    res.setHeader("X-XSS-Protection", "0");
    res.setHeader("Content-Security-Policy", API_JSON_CSP);
    next();
  });

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
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
