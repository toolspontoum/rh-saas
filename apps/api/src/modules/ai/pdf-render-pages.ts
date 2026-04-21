import path from "node:path";
import { pathToFileURL } from "node:url";

import { createCanvas, DOMMatrix, Path2D } from "@napi-rs/canvas";

// pdfjs-dist 5.x usa DOMMatrix/Path2D (APIs do browser); no Node não existem por omissão.
type NodeCanvasGeom = { DOMMatrix?: typeof DOMMatrix; Path2D?: typeof Path2D };
const globalWithGeom = globalThis as typeof globalThis & NodeCanvasGeom;
if (typeof globalWithGeom.DOMMatrix === "undefined") {
  globalWithGeom.DOMMatrix = DOMMatrix as NodeCanvasGeom["DOMMatrix"];
}
if (typeof globalWithGeom.Path2D === "undefined") {
  globalWithGeom.Path2D = Path2D as NodeCanvasGeom["Path2D"];
}

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let pdfModPromise: Promise<PdfJs> | null = null;
let workerConfigured = false;

function loadPdfJs(): Promise<PdfJs> {
  if (!pdfModPromise) {
    pdfModPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfModPromise;
}

async function ensurePdfWorker(GlobalWorkerOptions: PdfJs["GlobalWorkerOptions"]): Promise<void> {
  if (workerConfigured) return;
  const workerPath = path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs");
  GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
  workerConfigured = true;
}

/** Renderiza as primeiras páginas do PDF em PNG (para PDFs escaneados / pouco texto). */
export async function renderPdfPagesToPngBuffers(
  buffer: Buffer,
  options: { maxPages?: number; maxLongEdgePx?: number } = {}
): Promise<Buffer[]> {
  const { getDocument, GlobalWorkerOptions } = await loadPdfJs();
  await ensurePdfWorker(GlobalWorkerOptions);

  const maxPages = options.maxPages ?? 4;
  const maxLongEdge = options.maxLongEdgePx ?? 1536;

  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false
  });
  const pdf = await loadingTask.promise;
  const n = Math.min(pdf.numPages, maxPages);
  const out: Buffer[] = [];

  for (let i = 1; i <= n; i++) {
    const page = await pdf.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(maxLongEdge / Math.max(base.width, base.height), 2);
    const viewport = page.getViewport({ scale });
    const w = Math.ceil(viewport.width);
    const h = Math.ceil(viewport.height);
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext("2d");
    const renderTask = page.render({
      canvas: canvas as never,
      // pdf.js espera CanvasRenderingContext2D; @napi-rs/canvas é compatível em runtime
      canvasContext: ctx as never,
      viewport
    });
    await renderTask.promise;
    out.push(Buffer.from(canvas.toBuffer("image/png")));
  }
  return out;
}
