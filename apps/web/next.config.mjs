import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true
  },
  reactStrictMode: true,
  // Monorepo: evita aviso de múltiplos lockfiles ao rodar `npm run dev` da raiz
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
  transpilePackages: ["@vv/api"],
  serverExternalPackages: [
    "@napi-rs/canvas",
    "pdf-parse",
    "pdfjs-dist",
    "multer",
    "express",
    "serverless-http"
  ],
  // Pacote @vv/api usa imports ESM com sufixo .js apontando para ficheiros .ts (NodeNext).
  // Módulos nativos (.node) não podem ser empacotados pelo webpack.
  webpack: (config, { isServer }) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"]
    };
    if (isServer) {
      config.externals.push(function canvasExternals({ request }, callback) {
        if (
          request &&
          (request.startsWith("@napi-rs/canvas") ||
            request === "canvas" ||
            request.includes("pdfjs-dist") ||
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

