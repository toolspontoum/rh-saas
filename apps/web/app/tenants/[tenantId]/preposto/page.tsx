"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { Breadcrumbs } from "../../../../components/breadcrumbs";
import { apiFetch } from "../../../../lib/api";
import { getStoredTenantCompanyId } from "../../../../lib/tenant-company-scope";

type TenantCompany = {
  id: string;
  name: string;
  taxId: string | null;
  prepostoUserId?: string | null;
};

type TenantUser = {
  userId: string;
  email: string | null;
  fullName: string | null;
  status: string;
  roles: string[];
};

type Paginated<T> = { items: T[] };

export default function PrepostoManagePage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params?.tenantId ?? "";
  const [companies, setCompanies] = useState<TenantCompany[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const companyId = useMemo(() => getStoredTenantCompanyId(tenantId), [tenantId]);
  const currentCompany = useMemo(
    () => companies.find((c) => c.id === companyId) ?? null,
    [companies, companyId]
  );

  const collaborators = useMemo(
    () => users.filter((u) => u.roles.includes("employee")).sort((a, b) => {
      const na = (a.fullName ?? a.email ?? a.userId).toLowerCase();
      const nb = (b.fullName ?? b.email ?? b.userId).toLowerCase();
      return na.localeCompare(nb, "pt");
    }),
    [users]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      apiFetch<TenantCompany[]>(`/v1/tenants/${tenantId}/companies`),
      companyId
        ? apiFetch<Paginated<TenantUser>>(
            `/v1/tenants/${tenantId}/users?status=active&page=1&pageSize=500`
          ).catch(() => ({ items: [] as TenantUser[] }))
        : Promise.resolve({ items: [] as TenantUser[] })
    ])
      .then(([co, us]) => {
        if (cancelled) return;
        setCompanies(co);
        setUsers(us.items ?? []);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId, companyId]);

  useEffect(() => {
    if (!currentCompany?.prepostoUserId) {
      setSelectedUserId("");
      return;
    }
    setSelectedUserId(currentCompany.prepostoUserId);
  }, [currentCompany?.prepostoUserId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!companyId) {
      setError("Selecione a empresa/projeto no menu lateral antes de definir o preposto.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body =
        selectedUserId.trim() === ""
          ? { userId: null }
          : { userId: selectedUserId.trim() };
      await apiFetch<TenantCompany>(`/v1/tenants/${tenantId}/companies/${companyId}/preposto`, {
        method: "PUT",
        body: JSON.stringify(body)
      });
      const [co, us] = await Promise.all([
        apiFetch<TenantCompany[]>(`/v1/tenants/${tenantId}/companies`),
        apiFetch<Paginated<TenantUser>>(
          `/v1/tenants/${tenantId}/users?status=active&page=1&pageSize=500`
        ).catch(() => ({ items: [] as TenantUser[] }))
      ]);
      setCompanies(co);
      setUsers(us.items ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="container stack wide">
      <Breadcrumbs
        items={[
          { label: "Assinantes", href: "/tenants" },
          { label: "Preposto", href: `/tenants/${tenantId}/preposto` }
        ]}
      />
      <h1>Preposto</h1>
      <p className="muted">
        O preposto deve ser um colaborador já vinculado à empresa/projeto selecionada no menu lateral. Acede à gestão
        apenas desse contrato e usa &quot;Meu Portal&quot; como colaborador.
      </p>

      {loading ? <p className="muted">A carregar…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!companyId ? (
        <div className="card stack">
          <p className="muted">Escolha a empresa/projeto no seletor da barra lateral para este assinante.</p>
        </div>
      ) : (
        <>
          <form className="card stack" onSubmit={onSubmit} style={{ maxWidth: 520 }}>
            <p>
              <strong>Contrato atual:</strong> {currentCompany?.name ?? companyId}
            </p>
            <label className="stack">
              Colaborador (preposto)
              <select
                value={selectedUserId}
                onChange={(ev) => setSelectedUserId(ev.target.value)}
                style={{ color: "#000" }}
              >
                <option value="">— Remover preposto —</option>
                {collaborators.map((u) => (
                  <option key={u.userId} value={u.userId} style={{ color: "#000" }}>
                    {(u.fullName ?? u.email ?? u.userId).trim()} {u.email ? `(${u.email})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? "A guardar…" : "Guardar"}
            </button>
          </form>

          <div className="card stack" style={{ maxWidth: 720 }}>
            <h2 style={{ margin: 0 }}>Prepostos neste projeto</h2>
            <p className="muted small" style={{ margin: 0 }}>
              Colaboradores do contrato <strong>{currentCompany?.name ?? companyId}</strong>. Indica quem está
              designado como preposto (há no máximo um por projeto).
            </p>
            {collaborators.length === 0 ? (
              <p className="muted">Nenhum colaborador ativo encontrado neste projeto.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>
                      <th style={{ padding: "8px 10px" }}>Colaborador</th>
                      <th style={{ padding: "8px 10px" }}>E-mail</th>
                      <th style={{ padding: "8px 10px" }}>Preposto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collaborators.map((u) => {
                      const isPreposto = currentCompany?.prepostoUserId === u.userId;
                      return (
                        <tr key={u.userId} style={{ borderBottom: "1px solid #eee" }}>
                          <td style={{ padding: "8px 10px" }}>{(u.fullName ?? "—").trim() || "—"}</td>
                          <td style={{ padding: "8px 10px" }}>{u.email ?? "—"}</td>
                          <td style={{ padding: "8px 10px" }}>
                            {isPreposto ? (
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: 6,
                                  background: "#0f172a",
                                  color: "#fff",
                                  fontSize: 12
                                }}
                              >
                                Sim
                              </span>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
