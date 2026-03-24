"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Pencil } from "lucide-react";

import { Breadcrumbs } from "../../../../../components/breadcrumbs";
import { EmptyState } from "../../../../../components/empty-state";
import { apiFetch } from "../../../../../lib/api";

type ShiftTemplate = {
  id: string;
  name: string;
  dailyWorkMinutes: number;
  weeklyWorkMinutes: number | null;
  lunchBreakMinutes: number;
  overtimePercent: number;
  monthlyWorkMinutes: number;
  isActive: boolean;
};

export default function TimeRulesPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;

  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<ShiftTemplate[]>(`/v1/tenants/${tenantId}/shift-templates`)
      .then(setTemplates)
      .catch((err: Error) => setError(err.message));
  }, [tenantId]);

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Visão Geral", href: `/tenants/${tenantId}/dashboard` },
          { label: "Backoffice" },
          { label: "Regras de ponto" }
        ]}
      />

      <div className="section-header">
        <h1>Regras de ponto</h1>
        <Link href={`/tenants/${tenantId}/time/rules/new`}>
          <button>Criar modelo</button>
        </Link>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="card stack">
        <h3>Modelos cadastrados</h3>
        {templates.length === 0 ? (
          <EmptyState title="Sem modelos" description="Crie o primeiro modelo de jornada para começar." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Min/dia</th>
                <th>Min/semana</th>
                <th>Intervalo (min)</th>
                <th>% hora extra</th>
                <th>Min/mês</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.dailyWorkMinutes}</td>
                  <td>{item.weeklyWorkMinutes ?? "-"}</td>
                  <td>{item.lunchBreakMinutes}</td>
                  <td>{item.overtimePercent}</td>
                  <td>{item.monthlyWorkMinutes}</td>
                  <td>
                    <div className="row">
                      <Link
                        href={`/tenants/${tenantId}/time/rules/${item.id}`}
                        className="icon-btn"
                        title="Editar"
                        aria-label="Editar"
                      >
                        <Pencil size={16} />
                      </Link>
                      <Link href={`/tenants/${tenantId}/time/rules/assign?shiftTemplateId=${item.id}`}>
                        <button className="secondary">Vincular jornada</button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
