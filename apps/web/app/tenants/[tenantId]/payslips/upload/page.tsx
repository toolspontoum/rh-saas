"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { Breadcrumbs } from "../../../../../components/breadcrumbs";
import { EmptyState } from "../../../../../components/empty-state";
import { apiFetch } from "../../../../../lib/api";

type UploadIntent = { path: string; signedUrl: string };

type PayslipBatchRow = {
  id: string;
  title: string | null;
  referenceMonth: string;
  sourceType: string;
  createdAt: string;
  createdBy: string | null;
  fileCount: number;
};

type PaginatedBatches = { items: PayslipBatchRow[]; page: number; pageSize: number };

function formatRefMonth(ym: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return ym;
  return `${m[2]}/${m[1]}`;
}

export default function PayslipsBulkBatchesPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;

  const [batches, setBatches] = useState<PayslipBatchRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [batchTitle, setBatchTitle] = useState("");
  const [refMonth, setRefMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<PaginatedBatches>(`/v1/tenants/${tenantId}/payslips/batches?page=1&pageSize=100`);
      setBatches(res.items ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  function onPickFiles(list: FileList | null) {
    const arr = Array.from(list ?? []).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    if (arr.length > 100) {
      setModalError("No máximo 100 arquivos PDF por lote.");
      setFiles(arr.slice(0, 100));
      return;
    }
    setModalError(null);
    setFiles(arr);
  }

  async function submitNewBatch() {
    setModalError(null);
    const title = batchTitle.trim();
    if (!title) {
      setModalError("Informe o título do lote.");
      return;
    }
    if (files.length === 0) {
      setModalError("Selecione ao menos um PDF.");
      return;
    }
    setSubmitting(true);
    try {
      const uploaded: Array<{ filePath: string; fileName: string; sizeBytes: number }> = [];
      for (const file of files) {
        const intent = await apiFetch<UploadIntent>(`/v1/tenants/${tenantId}/payslips/upload-intent`, {
          method: "POST",
          body: JSON.stringify({
            referenceMonth: refMonth,
            fileName: file.name,
            mimeType: file.type || "application/pdf",
            sizeBytes: file.size
          })
        });
        const put = await fetch(intent.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/pdf" },
          body: file
        });
        if (!put.ok) throw new Error(`Falha no upload (${put.status})`);
        uploaded.push({ filePath: intent.path, fileName: file.name, sizeBytes: file.size });
      }

      await apiFetch<{ enqueued: number; batchId: string }>(`/v1/tenants/${tenantId}/payslips/confirm-ai-bulk`, {
        method: "POST",
        body: JSON.stringify({
          title,
          referenceMonth: refMonth,
          files: uploaded
        })
      });

      setModalOpen(false);
      setBatchTitle("");
      setFiles([]);
      await loadBatches();
    } catch (e) {
      setModalError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Visão Geral", href: `/tenants/${tenantId}/dashboard` },
          { label: "Contracheques", href: `/tenants/${tenantId}/payslips` },
          { label: "Upload em lote" }
        ]}
      />

      <div className="section-header">
        <h1>Lotes de contracheques (IA)</h1>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setModalOpen(true)}>
            Enviar novo lote
          </button>
          <Link href={`/tenants/${tenantId}/payslips/upload/manual`}>
            <button type="button" className="secondary">
              Upload por colaborador
            </button>
          </Link>
        </div>
      </div>

      <p className="muted" style={{ marginTop: 0 }}>
        Os lotes e arquivos respeitam o projeto/empresa selecionado no cabeçalho. A IA lê o CPF em cada PDF e vincula ao
        colaborador com o mesmo CPF cadastrado nesse projeto.
      </p>

      {error ? <p className="error">{error}</p> : null}

      <div className="card table-wrap">
        {loading ? (
          <p className="muted">Carregando lotes…</p>
        ) : batches.length === 0 ? (
          <EmptyState
            title="Nenhum lote enviado"
            description='Use "Enviar novo lote" para subir até 100 PDFs com título e mês de referência.'
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Mês referência</th>
                <th>Arquivos</th>
                <th>Criado em</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link href={`/tenants/${tenantId}/payslips/upload/${b.id}`}>
                      {b.title?.trim() || <span className="muted">Sem título</span>}
                    </Link>
                  </td>
                  <td>{formatRefMonth(b.referenceMonth)}</td>
                  <td>{b.fileCount}</td>
                  <td>{new Date(b.createdAt).toLocaleString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="modal-card" role="dialog" aria-labelledby="batch-modal-title">
            <h3 id="batch-modal-title" style={{ margin: 0 }}>
              Novo lote
            </h3>
            <label>
              Título do lote
              <input
                value={batchTitle}
                onChange={(e) => setBatchTitle(e.target.value)}
                placeholder="Ex.: Folha jan/2026"
                maxLength={200}
              />
            </label>
            <label>
              Mês de referência
              <input type="month" value={refMonth} onChange={(e) => setRefMonth(e.target.value)} />
            </label>
            <label>
              PDFs (máx. 100)
              <input type="file" accept="application/pdf" multiple onChange={(e) => onPickFiles(e.target.files)} />
            </label>
            {files.length > 0 ? <p className="small muted">{files.length} arquivo(s) selecionado(s).</p> : null}
            {modalError ? <p className="error small">{modalError}</p> : null}
            <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="secondary" onClick={() => setModalOpen(false)} disabled={submitting}>
                Cancelar
              </button>
              <button type="button" onClick={() => void submitNewBatch()} disabled={submitting}>
                {submitting ? "Enviando…" : "Enviar lote"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
