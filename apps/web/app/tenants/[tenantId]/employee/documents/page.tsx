"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { Breadcrumbs } from "../../../../../components/breadcrumbs";
import { EmptyState } from "../../../../../components/empty-state";
import { apiFetch } from "../../../../../lib/api";

type Paginated<T> = { items: T[] };

type DocumentRecord = {
  id: string;
  fileName: string;
};

type DocumentRequestRecord = {
  id: string;
  description: string | null;
  status: "open" | "in_progress" | "completed" | "canceled";
  workflow?: "standard" | "signature";
  requestedAt: string;
  resolvedAt: string | null;
  docTab: string;
  docType: string;
  latestDocument: DocumentRecord | null;
};

type OpenFileUrl = {
  signedUrl: string;
};

type UploadIntent = {
  path: string;
  signedUrl: string;
};

function statusLabel(request: DocumentRequestRecord): string {
  if (request.status === "completed") return "Recebido";
  if (request.status === "canceled") return "Cancelado";
  if (request.status === "in_progress" && request.workflow === "signature") return "Aguardando assinatura";
  return "Solicitado";
}

export default function EmployeeDocumentsPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;

  const [requests, setRequests] = useState<DocumentRequestRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [uploadRequest, setUploadRequest] = useState<DocumentRequestRecord | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    const result = await apiFetch<Paginated<DocumentRequestRecord>>(
      `/v1/tenants/${tenantId}/document-requests?page=1&pageSize=100`
    );
    setRequests(result.items ?? []);
  }

  async function openDocument(documentId: string) {
    setError(null);
    try {
      const result = await apiFetch<OpenFileUrl>(`/v1/tenants/${tenantId}/documents/${documentId}/open`);
      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function submitUpload() {
    if (!uploadRequest || !uploadFile) return;
    if (uploadFile.type !== "application/pdf") {
      setError("Apenas PDF é permitido.");
      return;
    }

    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const intent = await apiFetch<UploadIntent>(
        `/v1/tenants/${tenantId}/document-requests/${uploadRequest.id}/upload-intent`,
        {
          method: "POST",
          body: JSON.stringify({
            fileName: uploadFile.name,
            mimeType: "application/pdf",
            sizeBytes: uploadFile.size
          })
        }
      );

      const put = await fetch(intent.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: uploadFile
      });
      if (!put.ok) throw new Error(`Falha no upload (${put.status}).`);

      await apiFetch(`/v1/tenants/${tenantId}/document-requests/${uploadRequest.id}/confirm-upload`, {
        method: "POST",
        body: JSON.stringify({
          filePath: intent.path,
          fileName: uploadFile.name,
          mimeType: "application/pdf",
          sizeBytes: uploadFile.size
        })
      });

      setUploadRequest(null);
      setUploadFile(null);
      setOkMsg("Documento enviado com sucesso.");
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadData().catch((err: Error) => setError(err.message));
  }, [tenantId]);

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Visão Geral", href: `/tenants/${tenantId}/dashboard` },
          { label: "Solicitações de documentos" }
        ]}
      />

      <div className="section-header">
        <h1>Solicitações de documentos</h1>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {okMsg ? <p>{okMsg}</p> : null}

      <div className="card table-wrap">
        {requests.length === 0 ? (
          <EmptyState
            title="Sem solicitações"
            description="Você ainda não possui solicitações de documentos enviadas pelo RH."
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Status</th>
                <th>Solicitado em</th>
                <th>Respondido em</th>
                <th>Arquivo</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.docType}</td>
                  <td>{request.description ?? "-"}</td>
                  <td>{statusLabel(request)}</td>
                  <td>{new Date(request.requestedAt).toLocaleString("pt-BR")}</td>
                  <td>{request.resolvedAt ? new Date(request.resolvedAt).toLocaleString("pt-BR") : "-"}</td>
                  <td>
                    {request.status === "completed" && request.latestDocument ? (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => openDocument(request.latestDocument!.id)}
                      >
                        Ver documento
                      </button>
                    ) : request.workflow === "signature" &&
                      request.latestDocument &&
                      (request.status === "open" || request.status === "in_progress") ? (
                      <div className="stack" style={{ gap: 8 }}>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => openDocument(request.latestDocument!.id)}
                        >
                          Baixar PDF para assinar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setUploadFile(null);
                            setUploadRequest(request);
                          }}
                        >
                          Enviar documento assinado
                        </button>
                      </div>
                    ) : !request.latestDocument ? (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => {
                          setError(null);
                          setUploadFile(null);
                          setUploadRequest(request);
                        }}
                      >
                        Enviar documento
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => openDocument(request.latestDocument!.id)}
                      >
                        Ver documento
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {uploadRequest ? (
        <div className="modal-backdrop" onClick={() => setUploadRequest(null)}>
          <div className="modal-card stack" style={{ width: "560px" }} onClick={(e) => e.stopPropagation()}>
            <div className="section-header">
              <h3 style={{ margin: 0 }}>
                {uploadRequest.workflow === "signature" ? "Enviar documento assinado" : "Enviar documento"}
              </h3>
              <button type="button" className="secondary" onClick={() => setUploadRequest(null)}>
                Fechar
              </button>
            </div>
            <p className="muted" style={{ marginTop: 0 }}>
              Tipo solicitado: {uploadRequest.docType}
            </p>
            {uploadRequest.workflow === "signature" && uploadRequest.latestDocument ? (
              <p className="muted small">
                Baixe o PDF acima (&quot;Baixar PDF para assinar&quot;), assine e envie o arquivo finalizado aqui.
              </p>
            ) : null}
            <label>
              Arquivo (PDF)
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="secondary" onClick={() => setUploadRequest(null)}>
                Cancelar
              </button>
              <button type="button" onClick={submitUpload} disabled={!uploadFile || saving}>
                {saving ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
