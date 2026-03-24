export function normalizeSkillTag(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function cleanSkillLabel(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 80);
}

export function normalizeSkillList(input: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const item of input) {
    const normalized = normalizeSkillTag(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }

  return output;
}
