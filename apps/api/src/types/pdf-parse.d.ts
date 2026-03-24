declare module "pdf-parse" {
  import type { Buffer } from "node:buffer";

  function pdfParse(data: Buffer): Promise<{ text: string }>;
  export default pdfParse;
}

declare module "pdf-parse/lib/pdf-parse.js" {
  import type { Buffer } from "node:buffer";

  function pdfParse(data: Buffer): Promise<{ text: string }>;
  export default pdfParse;
}
