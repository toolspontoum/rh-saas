import type { AppRole } from "../core-auth-tenant/core-auth-tenant.types.js";

export type TenantUserStatus = "active" | "inactive" | "offboarded";

export type TenantUser = {
  userId: string;
  tenantId: string;
  /** Empresa/projeto do perfil (colaborador / backoffice vinculado). */
  companyId: string | null;
  email: string | null;
  fullName: string | null;
  cpf: string | null;
  phone: string | null;
  status: TenantUserStatus;
  offboardReason: string | null;
  offboardedAt: string | null;
  roles: AppRole[];
  isAccessEnabled: boolean;
  /** Último login na conta Supabase Auth (`null` se nunca entrou). */
  lastSignInAt: string | null;
  /** Preenchido quando o colaborador foi anonimizado (visível sobretudo a superadmin). */
  dataPurgedAt?: string | null;
};

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
};

export type EmployeeLookupResult = {
  exists: boolean;
  userId: string | null;
  email: string | null;
  fullName: string | null;
  cpf: string | null;
  phone: string | null;
  department: string | null;
  positionTitle: string | null;
  contractType: string | null;
  admissionDate: string | null;
  baseSalary: number | null;
  employeeTags: string[];
};
