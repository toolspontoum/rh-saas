"use client";

import { useEffect, useState } from "react";

import { listMyApplications, statusLabel, type MyApplication } from "../../../lib/candidate";

export default function CandidateApplicationsPage() {
  const [items, setItems] = useState<MyApplication[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMyApplications()
      .then((data) => setItems(data.items))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <h1>Minhas candidaturas</h1>
      {error ? <p className="error">{error}</p> : null}

      <section className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Vaga</th>
                <th>Empresa</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.job.title}</td>
                  <td>{item.tenant.displayName}</td>
                  <td>{statusLabel(item.status)}</td>
                  <td>{new Date(item.createdAt).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">Nenhuma candidatura registrada.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

