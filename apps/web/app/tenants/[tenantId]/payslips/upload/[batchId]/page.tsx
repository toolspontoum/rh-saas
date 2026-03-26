"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { Breadcrumbs } from "../../../../../../components/breadcrumbs";
import { apiFetch } from "../../../../../../lib/api";

type BatchMeta = {
  id: string;
  title: string | null;
  referenceMonth: string;
  sourceType: string;
  createdAt: string;
  createdBy: string | null;
};

type PayslipItem = {
  id: string;
  fileName: string;
  createdAt: string;
  aiLinkStatus: string | null;
  aiLinkError: string | null;
  aiProcessedAt: string | null;
  extractedCpf: string | null;
  employeeUserId: string | null;
};

type DetailResponse = { batch: BatchMeta; items: PayslipItem[] };

const AI_ERR_HINTS: Record<string, string> = {
  AI_PROVIDER_DISABLED: "IA desativada para este assinante.",
  PDF_DOWNLOAD_FAILED: "Não foi possível ler o arquivo no armazenamento.",
  CPF_NOT_FOUND: "CPF não encontrado no PDF.",
  EMPLOYEE_NOT_FOUND_FOR_CPF: "Não há colaborador com este CPF neste projeto."
};

function formatRefMonth(ym: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return ym;
  return `${m[2]}/${m[1]}`;
}

function statusLabel(status: string | null): string {
  if (status === "queued") return "Em fila";
  if (status === "processing") return "Processando";
  if (status === "linked") return "Processado";
  if (status === "failed") return "Falha";
  return "—";
}

function failureTooltip(code: string | null | undefined): string {
  if (!code) return "Falha no processamento pela IA.";
  const trimmed = code.trim();
  return AI_ERR_HINTS[trimmed] ?? trimmed;
}

export default function PayslipBatchDetailPage() {
  const params = useParams<{ tenantId: string; batchId: string }>();
  const tenantId = params.tenantId;
  const batchId = params.batchId;

  const [data, setData] = useState<DetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDetail = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch<DetailResponse>(`/v1/tenants/${tenantId}/payslips/batches/${batchId}`);
      setData(res);
    } catch (e) {
      setError((e as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, batchId]);

  useEffect(() => {
    setLoading(true);
    void loadDetail();
  }, [loadDetail]);

  const needsPoll = useMemo(() => {
    const items = data?.items ?? [];
    return items.some((i) => i.aiLinkStatus === "queued" || i.aiLinkStatus === "processing");
  }, [data?.items]);

  useEffect(() => {
    if (!needsPoll) return;
    const id = window.setInterval(() => void loadDetail(), 5000);
    return () => window.clearInterval(id);
  }, [needsPoll, loadDetail]);

  const batchTitle = data?.batch.title?.trim() || "Sem título";

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Visão Geral", href: `/tenants/${tenantId}/dashboard` },
          { label: "Contracheques", href: `/tenants/${tenantId}/payslips` },
          { label: "Upload em lote", href: `/tenants/${tenantId}/payslips/upload` },
          { label: batchTitle }
        ]}
      />

      <div className="section-header">
        <h1>{batchTitle}</h1>
        <Link href={`/tenants/${tenantId}/payslips/upload`}>
          <button type="button" className="secondary">
            Voltar aos lotes
          </button>
        </Link>
      </div>

      {data?.batch ? (
        <p className="muted" style={{ marginTop: 0 }}>
          Mês de referência: <strong>{formatRefMonth(data.batch.referenceMonth)}</strong>
          {" · "}
          Criado em {new Date(data.batch.createdAt).toLocaleString("pt-BR")}
        </p>
      ) : null}

      {error ? <p className="error">{error}</p> : null}

      <div className="card table-wrap">
        {loading ? (
          <p className="muted">Carregando…</p>
        ) : !data?.items.length ? (
          <p className="muted">Nenhum arquivo neste lote.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Arquivo</th>
                <th>Enviado em</th>
                <th>Processado (IA)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => {
                const st = row.aiLinkStatus;
                const isFail = st === "failed";
                const label = statusLabel(st);
                return (
                  <tr key={row.id}>
                    <td>{row.fileName}</td>
                    <td>{new Date(row.createdAt).toLocaleString("pt-BR")}</td>
                    <td>
                      {row.aiProcessedAt ? new Date(row.aiProcessedAt).toLocaleString("pt-BR") : "—"}
                      {row.extractedCpf ? (
                        <div className="small muted">CPF lido: {row.extractedCpf}</div>
                      ) : null}
                    </td>
                    <td>
                      {isFail ? (
                        <span className="status-pill danger" title={failureTooltip(row.aiLinkError)}>
                          {label}
                        </span>
                      ) : st === "linked" ? (
                        <span className="status-pill success">{label}</span>
                      ) : st === "processing" ? (
                        <span className="status-pill warning">{label}</span>
                      ) : st === "queued" ? (
                        <span className="status-pill warning">{label}</span>
                      ) : (
                        <span>{label}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
