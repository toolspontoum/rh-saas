"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { Breadcrumbs } from "../../../../../../components/breadcrumbs";
import { apiFetch } from "../../../../../../lib/api";

type TimeReportClosure = {
  id: string;
  userId: string;
  userName: string | null;
  userCpf: string | null;
  referenceMonth: string;
  from: string;
  to: string;
  summary: {
    expectedMinutes: number;
    workedMinutes: number;
    overtimeMinutes: number;
    deficitMinutes: number;
    bankBalanceMinutes: number;
    shiftTemplateName: string | null;
  };
  entries: Array<{
    entryType: "clock_in" | "lunch_out" | "lunch_in" | "clock_out";
    recordedAt: string;
  }>;
  closedAt: string;
};

type PdfPayload = {
  fileName: string;
  base64: string;
};

const entryLabel: Record<TimeReportClosure["entries"][number]["entryType"], string> = {
  clock_in: "Entrada",
  lunch_out: "Saída almoço",
  lunch_in: "Retorno almoço",
  clock_out: "Saída"
};

export default function TimeReportClosureDetailsPage() {
  const params = useParams<{ tenantId: string; closureId: string }>();
  const tenantId = params.tenantId;
  const closureId = params.closureId;
  const [item, setItem] = useState<TimeReportClosure | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<TimeReportClosure>(`/v1/tenants/${tenantId}/time-reports/closures/${closureId}`)
      .then(setItem)
      .catch((err: Error) => setError(err.message));
  }, [tenantId, closureId]);

  const sortedEntries = useMemo(() => {
    return [...(item?.entries ?? [])].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );
  }, [item]);

  async function handleDownloadPdf() {
    try {
      const payload = await apiFetch<PdfPayload>(
        `/v1/tenants/${tenantId}/time-reports/closures/${closureId}/pdf`
      );
      const binary = atob(payload.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = payload.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Visão Geral", href: `/tenants/${tenantId}/dashboard` },
          { label: "Ponto" },
          { label: "Arquivos de Ponto", href: `/tenants/${tenantId}/time/reports` },
          { label: "Detalhes" }
        ]}
      />
      <div className="section-header">
        <h1>Relatório de ponto fechado</h1>
        <button onClick={handleDownloadPdf}>Gerar PDF</button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {item ? (
        <>
          <div className="card table-wrap">
            <table className="table">
              <tbody>
                <tr><td>Colaborador</td><td>{item.userName ?? item.userId}</td></tr>
                <tr><td>CPF</td><td>{item.userCpf ?? "-"}</td></tr>
                <tr><td>Mês</td><td>{item.referenceMonth}</td></tr>
                <tr><td>Período</td><td>{item.from} a {item.to}</td></tr>
                <tr><td>Jornada</td><td>{item.summary.shiftTemplateName ?? "Regra padrão"}</td></tr>
                <tr><td>Fechado em</td><td>{new Date(item.closedAt).toLocaleString("pt-BR")}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="card table-wrap">
            <h3>Resumo</h3>
            <table className="table">
              <tbody>
                <tr><td>Minutos esperados</td><td>{item.summary.expectedMinutes}</td></tr>
                <tr><td>Minutos trabalhados</td><td>{item.summary.workedMinutes}</td></tr>
                <tr><td>Horas extras (min)</td><td>{item.summary.overtimeMinutes}</td></tr>
                <tr><td>Déficit (min)</td><td>{item.summary.deficitMinutes}</td></tr>
                <tr><td>Saldo banco (min)</td><td>{item.summary.bankBalanceMinutes}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="card table-wrap">
            <h3>Batidas (somente leitura)</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Data e hora</th>
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map((entry, index) => (
                  <tr key={`${entry.recordedAt}-${index}`}>
                    <td>{entryLabel[entry.entryType]}</td>
                    <td>{new Date(entry.recordedAt).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
                {sortedEntries.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="muted">Sem batidas no período.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </main>
  );
}
