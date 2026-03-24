"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { Breadcrumbs } from "../../../../components/breadcrumbs";
import { EmptyState } from "../../../../components/empty-state";
import { apiFetch } from "../../../../lib/api";
import { getToken } from "../../../../lib/auth";
import { appConfig } from "../../../../lib/config";

type AuditLog = {
  id: number;
  action: string;
  resourceType: string;
  result: string;
  createdAt: string;
};

type Paginated<T> = {
  items: T[];
};

export default function AuditPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;
  const [items, setItems] = useState<AuditLog[]>([]);
  const [actionFilter, setActionFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams({ page: "1", pageSize: "100" });
    if (actionFilter.trim()) q.set("action", actionFilter.trim());
    if (resourceFilter.trim()) q.set("resourceType", resourceFilter.trim());
    if (fromFilter.trim()) q.set("from", fromFilter.trim());
    if (toFilter.trim()) q.set("to", toFilter.trim());

    apiFetch<Paginated<AuditLog>>(`/v1/tenants/${tenantId}/audit-logs?${q.toString()}`)
      .then((data) => setItems(data.items))
      .catch((err: Error) => setError(err.message));
  }, [tenantId, actionFilter, resourceFilter, fromFilter, toFilter]);

  async function downloadCsv() {
    const token = getToken();
    if (!token) {
      setError("Sessao expirada. Faca login novamente.");
      return;
    }

    setDownloading(true);
    setError(null);

    try {
      const q = new URLSearchParams({ limit: "1000" });
      if (actionFilter.trim()) q.set("action", actionFilter.trim());
      if (resourceFilter.trim()) q.set("resourceType", resourceFilter.trim());
      if (fromFilter.trim()) q.set("from", fromFilter.trim());
      if (toFilter.trim()) q.set("to", toFilter.trim());

      const response = await fetch(`${appConfig.apiBaseUrl}/v1/tenants/${tenantId}/audit-logs/export.csv?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error(`Falha ao exportar CSV (${response.status}).`);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${tenantId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="container stack" style={{ margin: 0 }}>
      <Breadcrumbs items={[{ label: "Visao Geral", href: `/tenants/${tenantId}/dashboard` }, { label: "Auditoria" }]} />
      <h1>Auditoria</h1>
      {error ? <p className="error">{error}</p> : null}

      <div className="card row">
        <input placeholder="Acao" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} />
        <input placeholder="Recurso" value={resourceFilter} onChange={(e) => setResourceFilter(e.target.value)} />
        <input placeholder="Data inicio (ISO)" value={fromFilter} onChange={(e) => setFromFilter(e.target.value)} />
        <input placeholder="Data fim (ISO)" value={toFilter} onChange={(e) => setToFilter(e.target.value)} />
      </div>

      <div className="card">
        {items.length === 0 ? (
          <EmptyState title="Sem eventos" description="Nenhum registro para os filtros informados." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Acao</th>
                <th>Recurso</th>
                <th>Resultado</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.action}</td>
                  <td>{item.resourceType}</td>
                  <td>{item.result}</td>
                  <td>{new Date(item.createdAt).toLocaleString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <button onClick={downloadCsv} disabled={downloading}>{downloading ? "Exportando..." : "Exportar CSV"}</button>
    </main>
  );
}
