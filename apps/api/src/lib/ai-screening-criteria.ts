export type JobAiScreeningCriteria = {
  keywords: string[];
  formation: string | null;
  certificates: string[];
  experienceRole: string | null;
  experienceMonths: number | null;
};

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function asPositiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.round(value);
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number.parseInt(value.trim(), 10);
  return null;
}

export function parseJobAiScreeningCriteria(raw: unknown): JobAiScreeningCriteria {
  if (!raw || typeof raw !== "object") {
    return {
      keywords: [],
      formation: null,
      certificates: [],
      experienceRole: null,
      experienceMonths: null
    };
  }
  const o = raw as Record<string, unknown>;
  return {
    keywords: asStringArray(o.keywords),
    formation: asTrimmedString(o.formation),
    certificates: asStringArray(o.certificates),
    experienceRole: asTrimmedString(o.experienceRole),
    experienceMonths: asPositiveInt(o.experienceMonths)
  };
}

export function hasAiScreeningInput(criteria: JobAiScreeningCriteria): boolean {
  return (
    criteria.keywords.length > 0 ||
    Boolean(criteria.formation) ||
    criteria.certificates.length > 0 ||
    Boolean(criteria.experienceRole) ||
    criteria.experienceMonths != null
  );
}
