export type JobDocumentRequirementPayload = {
  id: string;
  docTab: string;
  docType: string;
  label: string | null;
  platformDocumentTypeId: string | null;
};

export function parseJobDocumentRequirements(raw: unknown): JobDocumentRequirementPayload[] {
  if (!Array.isArray(raw)) return [];
  const out: JobDocumentRequirementPayload[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const docTab = typeof o.docTab === "string" ? o.docTab : "";
    const docType = typeof o.docType === "string" ? o.docType : "";
    const label = o.label == null ? null : typeof o.label === "string" ? o.label : null;
    const platformDocumentTypeId =
      o.platformDocumentTypeId == null
        ? null
        : typeof o.platformDocumentTypeId === "string"
          ? o.platformDocumentTypeId
          : null;
    if (!id || !docTab || !docType) continue;
    out.push({ id, docTab, docType, label, platformDocumentTypeId });
  }
  return out;
}

export function screeningsWithoutLegacyDocumentUploads<T extends { type: string }>(questions: T[]): T[] {
  return questions.filter((q) => q.type !== "document_upload");
}
