"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { Breadcrumbs } from "../../../../../components/breadcrumbs";
import { EmptyState } from "../../../../../components/empty-state";
import { apiFetch } from "../../../../../lib/api";

type TimeEntry = { id: string; entryType: string; recordedAt: string; source: string; note: string | null };
type Paginated<T> = { items: T[] };

export default function TimeMyEntriesPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;
  const [items, setItems] = useState<TimeEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Paginated<TimeEntry>>(`/v1/tenants/${tenantId}/time-entries?page=1&pageSize=100`)
      .then((data) => setItems(data.items))
      .catch((err: Error) => setError(err.message));
  }, [tenantId]);

  return (
    <main className="container stack" style={{ margin: 0 }}>
      <Breadcrumbs items={[{ label: "Visao Geral", href: `/tenants/${tenantId}/dashboard` }, { label: "Ponto" }, { label: "Meus registros" }]} />
      <h1>Meus registros de ponto</h1>
      {error ? <p className="error">{error}</p> : null}
      <div className="card">
        {items.length === 0 ? (
          <EmptyState title="Sem registros no periodo" description="Use a tela de registro de ponto para lancar entrada e saida." />
        ) : (
          <table className="table">
            <thead><tr><th>Tipo</th><th>Horario</th><th>Fonte</th><th>Nota</th></tr></thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td>{it.entryType}</td>
                  <td>{new Date(it.recordedAt).toLocaleString("pt-BR")}</td>
                  <td>{it.source}</td>
                  <td>{it.note ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
