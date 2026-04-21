import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

import { buildSecurityHeadersForNext } from "./lib/security/http-security-headers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true
  },
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
  transpilePackages: ["@vv/api"],
  serverExternalPackages: [
    "@napi-rs/canvas",
    "pdf-parse",
    "multer",
    "express",
    "serverless-http"
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeadersForNext()
      }
    ];
  },
  webpack: (config, { isServer }) => {
    const webNM = path.resolve(__dirname, "node_modules");
    config.resolve.modules = [
      webNM,
      ...(Array.isArray(config.resolve.modules) ? config.resolve.modules : ["node_modules"])
    ];
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"]
    };
    if (isServer) {
      config.externals.push(function canvasExternals(
        { request }: { request?: string },
        callback: (err?: Error | null, result?: string) => void
      ) {
        if (
          request &&
          (request.startsWith("@napi-rs/canvas") ||
            request === "canvas" ||
            request === "pdf-parse")
        ) {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      });
    }
    return config;
  }
};

export default nextConfig;
