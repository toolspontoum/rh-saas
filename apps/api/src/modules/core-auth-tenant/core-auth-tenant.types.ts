export type AppRole = "owner" | "admin" | "manager" | "analyst" | "employee" | "viewer";

export type TenantSummary = {
  tenantId: string;
  slug: string;
  displayName: string;
  legalName: string;
  isActive: boolean;
  roles: AppRole[];
};

export type TenantContext = {
  tenantId: string;
  roles: AppRole[];
  features: Array<{
    code: string;
    isEnabled: boolean;
  }>;
  subscription: {
    planCode: string;
    status: "trial" | "active" | "past_due" | "canceled";
    startsAt: string;
    endsAt: string | null;
  } | null;
  /** Override do tenant (null = segue AI_PROVIDER_DEFAULT do backend). */
  aiProvider: "openai" | "gemini" | null;
  /** Provedor efetivo após resolver tenant + ambiente. */
  aiEffectiveProvider: "openai" | "gemini" | null;
};

