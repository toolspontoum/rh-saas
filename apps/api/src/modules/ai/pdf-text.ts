export async function extractPdfText(buffer: Buffer): Promise<string> {
  // Importar o núcleo em `lib/` — o `index.js` do pacote roda um bloco de debug que lê
  // `./test/data/05-versions-space.pdf` quando carregado via `import()` (ESM), gerando ENOENT.
  const mod = await import("pdf-parse/lib/pdf-parse.js");
  const pdfParse = mod.default as (b: Buffer) => Promise<{ text: string }>;
  const result = await pdfParse(buffer);
  return (result.text ?? "").replace(/\s+/g, " ").trim();
}
