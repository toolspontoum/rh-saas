export type AppRole = "owner" | "admin" | "manager" | "analyst" | "employee" | "viewer" | "preposto";

export type TenantSummary = {
  tenantId: string;
  slug: string;
  displayName: string;
  legalName: string;
  isActive: boolean;
  roles: AppRole[];
  /** Quando o utilizador é preposto neste tenant, o id do contrato (empresa/projeto). */
  prepostoCompanyId?: string | null;
};

export type TenantContext = {
  tenantId: string;
  roles: AppRole[];
  /** Contrato (empresa/projeto) em que o utilizador é preposto; null se não aplicável. */
  prepostoCompanyId: string | null;
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
  /** Superadmin da plataforma (mensagens técnicas de diagnóstico, etc.). */
  isPlatformSuperadmin: boolean;
};

