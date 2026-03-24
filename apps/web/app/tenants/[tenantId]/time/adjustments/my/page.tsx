"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { Breadcrumbs } from "../../../../../../components/breadcrumbs";
import { EmptyState } from "../../../../../../components/empty-state";
import { apiFetch } from "../../../../../../lib/api";

type Adjustment = { id: string; targetDate: string; requestedTime: string; reason: string; status: string };
type Paginated<T> = { items: T[] };

export default function TimeAdjustmentsMyPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;

  const [items, setItems] = useState<Adjustment[]>([]);
  const [targetDate, setTargetDate] = useState("2026-02-12");
  const [requestedTime, setRequestedTime] = useState("09:00");
  const [reason, setReason] = useState("Correcao de registro.");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await apiFetch<Paginated<Adjustment>>(
      `/v1/tenants/${tenantId}/time-adjustments?mineOnly=true&page=1&pageSize=50`
    );
    setItems(data.items);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, [tenantId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await apiFetch(`/v1/tenants/${tenantId}/time-adjustments`, {
        method: "POST",
        body: JSON.stringify({ targetDate, requestedTime, reason })
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="container stack" style={{ margin: 0 }}>
      <Breadcrumbs items={[{ label: "Visao Geral", href: `/tenants/${tenantId}/dashboard` }, { label: "Ponto" }, { label: "Meus ajustes" }]} />
      <h1>Meus ajustes de ponto</h1>
      {error ? <p className="error">{error}</p> : null}

      <div className="card">
        <form className="stack" onSubmit={submit}>
          <input value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          <input value={requestedTime} onChange={(e) => setRequestedTime(e.target.value)} />
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          <button type="submit">Enviar solicitacao</button>
        </form>
      </div>

      <div className="card">
        {items.length === 0 ? (
          <EmptyState title="Sem solicitacoes" description="Nenhum ajuste foi enviado ate o momento." />
        ) : (
          <table className="table">
            <thead><tr><th>Data</th><th>Horario</th><th>Motivo</th><th>Status</th></tr></thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}><td>{it.targetDate}</td><td>{it.requestedTime}</td><td>{it.reason}</td><td>{it.status}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
