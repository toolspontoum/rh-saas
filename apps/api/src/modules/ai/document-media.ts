import { fileTypeFromBuffer } from "file-type";

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

function mimeFromExtension(fileName: string | null | undefined): string | null {
  if (!fileName) return null;
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return null;
}

/** Resolve MIME para currículo/documento: prioriza DB, depois assinatura do buffer, depois extensão. */
export async function resolveDocumentMimeType(input: {
  buffer: Buffer;
  fileName?: string | null;
  dbMimeType?: string | null;
}): Promise<string> {
  const fromDb = input.dbMimeType?.split(";")[0]?.trim().toLowerCase();
  if (fromDb && (fromDb === "application/pdf" || IMAGE_MIME.has(fromDb) || fromDb.startsWith("image/"))) {
    return fromDb;
  }
  const ft = await fileTypeFromBuffer(input.buffer);
  if (ft?.mime) {
    if (ft.mime === "application/pdf" || IMAGE_MIME.has(ft.mime) || ft.mime.startsWith("image/")) {
      return ft.mime;
    }
  }
  const fromExt = mimeFromExtension(input.fileName ?? null);
  if (fromExt) return fromExt;
  return "application/octet-stream";
}

export function isImageMime(mime: string): boolean {
  const m = mime.toLowerCase();
  return m.startsWith("image/") && m !== "image/svg+xml";
}

export function isPdfMime(mime: string): boolean {
  return mime.toLowerCase() === "application/pdf";
}
