"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Pin, PinOff } from "lucide-react";

import { clearToken, getToken } from "../../../lib/auth";
import { apiFetch } from "../../../lib/api";
import { formatRoleList } from "../../../lib/role-labels";
import {
  getStoredTenantCompanyId,
  setStoredTenantCompanyId
} from "../../../lib/tenant-company-scope";

type TenantContext = {
  roles: string[];
  features: Array<{ code: string; isEnabled: boolean }>;
  aiProvider: "openai" | "gemini" | null;
  aiEffectiveProvider: "openai" | "gemini" | null;
};

type TenantCompany = {
  id: string;
  name: string;
  taxId: string | null;
};

type NavLink = {
  label: string;
  href: string;
  section: "geral" | "recrutamento" | "rh" | "operacao" | "backoffice";
};

const sectionOrder: Array<NavLink["section"]> = ["geral", "recrutamento", "rh", "operacao", "backoffice"];

const sectionLabel: Record<NavLink["section"], string> = {
  geral: "Geral",
  recrutamento: "Recrutamento",
  rh: "RH",
  operacao: "Operacao",
  backoffice: "Backoffice"
};

export default function TenantLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;
  const [context, setContext] = useState<TenantContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [companies, setCompanies] = useState<TenantCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  useEffect(() => {
    if (!getToken()) {
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    apiFetch<TenantContext>(`/v1/tenants/${tenantId}/context`)
      .then((data) =>
        setContext({
          ...data,
          aiProvider: data.aiProvider ?? null,
          aiEffectiveProvider: data.aiEffectiveProvider ?? null
        })
      )
      .catch((err: Error) => setError(err.message));
  }, [tenantId]);

  useEffect(() => {
    const key = `vv_nav_favorites_${tenantId}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    try {
      setFavorites(JSON.parse(raw) as string[]);
    } catch {
      setFavorites([]);
    }
  }, [tenantId]);

  useEffect(() => {
    function syncFromStorage() {
      setSelectedCompanyId(getStoredTenantCompanyId(tenantId) ?? "");
    }
    syncFromStorage();
    function onCompanyEvent() {
      syncFromStorage();
    }
    window.addEventListener("vv-tenant-company-changed", onCompanyEvent);
    window.addEventListener("storage", onCompanyEvent);
    return () => {
      window.removeEventListener("vv-tenant-company-changed", onCompanyEvent);
      window.removeEventListener("storage", onCompanyEvent);
    };
  }, [tenantId]);

  useEffect(() => {
    if (!context) return;
    const r = context.roles;
    const isSupervisor = r.some((role) => ["owner", "admin", "manager", "analyst"].includes(role));
    if (!isSupervisor) {
      setCompanies([]);
      return;
    }
    let cancelled = false;
    apiFetch<TenantCompany[]>(`/v1/tenants/${tenantId}/companies`)
      .then((rows) => {
        if (cancelled) return;
        setCompanies(rows);
        const stored = getStoredTenantCompanyId(tenantId);
        const storedOk = Boolean(stored && rows.some((item) => item.id === stored));
        if (storedOk && stored) {
          setSelectedCompanyId(stored);
          return;
        }
        if (rows.length === 1) {
          const only = rows[0]!;
          setSelectedCompanyId(only.id);
          setStoredTenantCompanyId(tenantId, only.id);
          return;
        }
        setSelectedCompanyId("");
        setStoredTenantCompanyId(tenantId, null);
      })
      .catch(() => {
        if (!cancelled) setCompanies([]);
      });
    return () => {
      cancelled = true;
    };
  }, [context, tenantId]);

  function toggleFavorite(href: string) {
    setFavorites((current) => {
      const next = current.includes(href) ? current.filter((item) => item !== href) : [...current, href];
      window.localStorage.setItem(`vv_nav_favorites_${tenantId}`, JSON.stringify(next));
      return next;
    });
  }

  const roles = context?.roles ?? [];

  const nav = useMemo(() => {
    const features = new Set((context?.features ?? []).filter((f) => f.isEnabled).map((f) => f.code));
    const isManagement = roles.some((role) => ["owner", "admin", "manager"].includes(role));
    const isSupervisor = roles.some((role) => ["owner", "admin", "manager", "analyst"].includes(role));
    const isCollaborator = roles.some((role) => ["employee", "viewer"].includes(role));
    const isTimeManager = roles.some((role) => ["owner", "admin", "manager", "analyst"].includes(role));
    const isEmployeeOnly = roles.length > 0 && roles.every((role) => role === "employee");
    const isViewerOnly = roles.length > 0 && roles.every((role) => role === "viewer");

    const links: NavLink[] = [{ label: "Início", href: `/tenants/${tenantId}/dashboard`, section: "geral" }];
    if (isEmployeeOnly) {
      links.push({ label: "Meu perfil", href: `/tenants/${tenantId}/employee/profile`, section: "geral" });
    }

    if (features.has("mod_recruitment") && !isEmployeeOnly) {
      links.push({ label: "Painel de Recrutamento", href: `/tenants/${tenantId}/recruitment/jobs`, section: "recrutamento" });
      links.push({ label: "Candidatos", href: `/tenants/${tenantId}/recruitment/candidates`, section: "recrutamento" });
      if (isManagement) {
        links.push({ label: "Nova vaga", href: `/tenants/${tenantId}/recruitment/jobs/new`, section: "recrutamento" });
      }
      if (!isManagement) {
        links.push({ label: "Portal Candidato", href: `/tenants/${tenantId}/candidate`, section: "recrutamento" });
      }
    }

    if (features.has("mod_documents")) {
      if (isManagement) {
        links.push({ label: "Colaboradores", href: `/tenants/${tenantId}/collaborator`, section: "rh" });
      }
    }

    if (features.has("mod_payslips")) {
      links.push({ label: "Contracheques", href: `/tenants/${tenantId}/payslips`, section: "rh" });
    }

    links.push({ label: "Comunicados", href: `/tenants/${tenantId}/notices`, section: "rh" });

    if (isCollaborator || isTimeManager) {
      links.push({ label: "Registro de Ponto", href: `/tenants/${tenantId}/time/register`, section: "operacao" });
    }
    if (isTimeManager) {
      links.push({ label: "Arquivos de Ponto", href: `/tenants/${tenantId}/time/reports`, section: "operacao" });
    }
    if (isCollaborator) {
      links.push({ label: "Sobreaviso", href: `/tenants/${tenantId}/oncall`, section: "operacao" });
    }

    if (isSupervisor) {
      links.push({ label: "Sobreaviso", href: `/tenants/${tenantId}/oncall`, section: "operacao" });
    }

    if (isViewerOnly) {
      links.push({ label: "Onboarding", href: `/tenants/${tenantId}/onboarding`, section: "geral" });
    }

    if (isManagement) {
      links.push({ label: "Regras Ponto", href: `/tenants/${tenantId}/time/rules`, section: "backoffice" });
      links.push({ label: "Documentos padrão", href: `/tenants/${tenantId}/standard-documents`, section: "backoffice" });
      links.push({ label: "Empresas / projetos", href: `/tenants/${tenantId}/companies`, section: "backoffice" });
      links.push({ label: "Usuarios", href: `/tenants/${tenantId}/users`, section: "backoffice" });
      links.push({
        label: "Cadastro automatico (IA)",
        href: `/tenants/${tenantId}/employees/auto-import`,
        section: "backoffice"
      });
      links.push({ label: "Auditoria", href: `/tenants/${tenantId}/audit`, section: "backoffice" });
    }

    return links;
  }, [context, roles, tenantId]);

  const navBySection = useMemo(() => {
    const grouped: Record<NavLink["section"], NavLink[]> = {
      geral: [],
      recrutamento: [],
      rh: [],
      operacao: [],
      backoffice: []
    };
    for (const item of nav) grouped[item.section].push(item);
    return grouped;
  }, [nav]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-title">VV Consulting</div>
        <div className="tenant-id">Chave de assinatura: {tenantId}</div>
        {roles.length > 0 ? <div className="muted small">Perfis: {formatRoleList(roles)}</div> : null}

        {companies.length > 0 ? (
          <label className="stack muted small" style={{ marginTop: 8 }}>
            Empresa / projeto
            <select
              className="nav-link"
              style={{ width: "100%", boxSizing: "border-box", color: "#000" }}
              value={selectedCompanyId}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedCompanyId(value);
                setStoredTenantCompanyId(tenantId, value || null);
                window.location.reload();
              }}
            >
              <option value="" style={{ color: "#000" }}>
                Todas
              </option>
              {companies.map((company) => (
                <option key={company.id} value={company.id} style={{ color: "#000" }}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {error ? <p className="error">{error}</p> : null}

        {favorites.length > 0 ? (
          <div className="stack">
            <div className="muted small">Atalhos</div>
            {nav
              .filter((item) => favorites.includes(item.href))
              .map((item) => (
                <Link
                  key={`favorite-${item.href}`}
                  className={pathname === item.href ? "nav-link active" : "nav-link"}
                  href={item.href}
                >
                  {item.label}
                </Link>
              ))}
          </div>
        ) : null}

        <nav className="nav stack">
          {sectionOrder.map((section) => {
            if (navBySection[section].length === 0) return null;
            return (
              <div className="stack" key={section}>
                <div className="muted small">{sectionLabel[section]}</div>
                {navBySection[section].map((item) => (
                  <div className="row" key={item.href} style={{ alignItems: "center" }}>
                    <Link
                      className={pathname === item.href ? "nav-link active" : "nav-link"}
                      href={item.href}
                      style={{ flex: 1 }}
                    >
                      {item.label}
                    </Link>
                    <button
                      className="secondary"
                      style={{ padding: "8px 10px" }}
                      onClick={() => toggleFavorite(item.href)}
                      title="Fixar atalho"
                      aria-label={favorites.includes(item.href) ? "Desafixar atalho" : "Fixar atalho"}
                    >
                      {favorites.includes(item.href) ? <PinOff size={14} /> : <Pin size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="stack">
          <Link className="nav-link" href="/tenants">
            Trocar assinante
          </Link>
          <button
            className="secondary"
            onClick={() => {
              clearToken();
              router.push("/");
            }}
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="content-area">{children}</main>
    </div>
  );
}
