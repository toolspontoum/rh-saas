"use client";

import { appConfig } from "./config";
import { clearToken, getToken } from "./auth";
import { getStoredTenantCompanyId } from "./tenant-company-scope";

function tenantIdFromApiPath(path: string): string | null {
  const match = path.match(/^\/v1\/tenants\/([0-9a-f-]{36})\//i);
  return match?.[1] ?? null;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers ?? {});
  const bodyIsFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (!bodyIsFormData) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (typeof window !== "undefined") {
    headers.set("X-Web-Base-Url", window.location.origin);
  }

  const tenantId = tenantIdFromApiPath(path);
  if (tenantId && typeof window !== "undefined") {
    const companyId = getStoredTenantCompanyId(tenantId);
    if (companyId) {
      headers.set("X-Tenant-Company-Id", companyId);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
      ...init,
      headers
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new Error("Falha de conexão com a API. Verifique se o servidor está ativo.");
  }

  if (response.status === 401) {
    clearToken();
    throw new Error("Sessao expirada. Faca login novamente.");
  }

  if (!response.ok) {
    let message: string | null = null;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // corpo não JSON
    }
    if (!message) {
      message =
        response.status === 413
          ? "A requisição enviada é muito grande. Para currículo em PDF, use arquivos de até 15 MB."
          : `Erro ${response.status}`;
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}
