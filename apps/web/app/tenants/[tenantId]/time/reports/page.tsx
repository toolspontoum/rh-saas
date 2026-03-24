"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { Breadcrumbs } from "../../../../../components/breadcrumbs";
import { apiFetch } from "../../../../../lib/api";

type Paginated<T> = { items: T[] };
type TimeReportClosure = {
  id: string;
  userId: string;
  userName: string | null;
  userCpf: string | null;
  userEmail: string | null;
  referenceMonth: string;
  from: string;
  to: string;
  closedAt: string;
};

export default function TimeReportsPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;
  const [items, setItems] = useState<TimeReportClosure[]>([]);
  const [search, setSearch] = useState("");
  const [referenceMonth, setReferenceMonth] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Paginated<TimeReportClosure>>(`/v1/tenants/${tenantId}/time-reports/closures?page=1&pageSize=100`)
      .then((res) => setItems(res.items ?? []))
      .catch((err: Error) => setError(err.message));
  }, [tenantId]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    const digits = search.replace(/\D/g, "");
    return items.filter((item) => {
      if (referenceMonth && item.referenceMonth !== referenceMonth) return false;
      const name = (item.userName ?? "").toLowerCase();
      const email = (item.userEmail ?? "").toLowerCase();
      const cpfDigits = (item.userCpf ?? "").replace(/\D/g, "");
      if (!term && !digits) return true;
      const byText = term ? name.includes(term) || email.includes(term) : false;
      const byCpf = digits ? cpfDigits.includes(digits) : false;
      return byText || byCpf;
    });
  }, [items, search, referenceMonth]);

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Visão Geral", href: `/tenants/${tenantId}/dashboard` },
          { label: "Ponto" },
          { label: "Arquivos de Ponto" }
        ]}
      />
      <div className="section-header">
        <h1>Arquivos de Ponto</h1>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="card">
        <div
          className="form-grid"
          style={{ display: "grid", gap: 10, gridTemplateColumns: "minmax(0, 75fr) minmax(0, 25fr)", alignItems: "end" }}
        >
          <label>
            Buscar por nome, CPF ou e-mail
            <input
              placeholder="Ex.: Roberto, 32576394817 ou roberto@email.com"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label>
            Mês de referência
            <input
              type="month"
              value={referenceMonth}
              onChange={(e) => setReferenceMonth(e.target.value)}
            />
          </label>
        </div>
      </div>
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>CPF</th>
              <th>Mês</th>
              <th>Período</th>
              <th>Fechado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id}>
                <td>{item.userName ?? item.userId}</td>
                <td>{item.userCpf ?? "-"}</td>
                <td>{item.referenceMonth}</td>
                <td>{item.from} a {item.to}</td>
                <td>{new Date(item.closedAt).toLocaleString("pt-BR")}</td>
                <td>
                  <Link href={`/tenants/${tenantId}/time/reports/${item.id}`}>
                    <button className="secondary">Abrir</button>
                  </Link>
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">Nenhum relatório encontrado para o filtro informado.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
