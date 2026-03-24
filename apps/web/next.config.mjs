import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Monorepo: evita aviso de múltiplos lockfiles ao rodar `npm run dev` da raiz
  outputFileTracingRoot: path.join(__dirname, "..", "..")
};

export default nextConfig;

