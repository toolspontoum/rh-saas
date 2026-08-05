import { apiFetch } from "./api";

/** Resposta de `POST /v1/tenants/:tenantId/employee-profiles/bulk` (perfil em `tenant_user_profiles`). */
export type EmployeeProfileBulkItem = {
  fullName: string | null;
  personalEmail: string | null;
  cpf: string | null;
  department: string | null;
  contractType: string | null;
  positionTitle: string | null;
  employeeTags: string[];
  status: "active" | "inactive" | "offboarded";
  baseSalary: number | null;
};

export async function fetchEmployeeProfilesBulk(
  tenantId: string,
  userIds: readonly string[]
): Promise<Record<string, EmployeeProfileBulkItem>> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return {};

  const chunkSize = 250;
  const merged: Record<string, EmployeeProfileBulkItem> = {};
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const res = await apiFetch<{ items: Record<string, EmployeeProfileBulkItem> }>(
      `/v1/tenants/${tenantId}/employee-profiles/bulk`,
      { method: "POST", body: JSON.stringify({ targetUserIds: chunk }) }
    );
    Object.assign(merged, res.items ?? {});
  }
  return merged;
}
