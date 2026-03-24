const STORAGE_PREFIX = "vv_tenant_company_id:";

export function tenantCompanyStorageKey(tenantId: string): string {
  return `${STORAGE_PREFIX}${tenantId}`;
}

export function getStoredTenantCompanyId(tenantId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(tenantCompanyStorageKey(tenantId));
}

export function setStoredTenantCompanyId(tenantId: string, companyId: string | null): void {
  if (typeof window === "undefined") return;
  const key = tenantCompanyStorageKey(tenantId);
  if (companyId) {
    window.localStorage.setItem(key, companyId);
  } else {
    window.localStorage.removeItem(key);
  }
  window.dispatchEvent(new CustomEvent("vv-tenant-company-changed", { detail: { tenantId, companyId } }));
}
