"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { Breadcrumbs } from "../../../../../components/breadcrumbs";
import { apiFetch } from "../../../../../lib/api";

type NoticeAttachment = {
  id: string;
  fileName: string;
  signedUrl?: string | null;
};

type NoticeRecipient = {
  userId: string;
  fullName: string | null;
  email: string | null;
  readAt: string | null;
};

type NoticeDetails = {
  id: string;
  title: string;
  message: string;
  target: "all" | "employee" | "manager";
  recipientUserIds?: string[] | null;
  attachments?: NoticeAttachment[];
  createdAt: string;
  recipients: NoticeRecipient[];
};

function recipientStatusLabel(readAt: string | null): "Aberto" | "Entregue" {
  return readAt ? "Aberto" : "Entregue";
}

export default function NoticeDetailsPage() {
  const params = useParams<{ tenantId: string; noticeId: string }>();
  const router = useRouter();
  const tenantId = params.tenantId;
  const noticeId = params.noticeId;

  const [item, setItem] = useState<NoticeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<NoticeDetails>(`/v1/tenants/${tenantId}/notices/${noticeId}`);
      setItem(data);
    } catch (err) {
      setItem(null);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [tenantId, noticeId]);

  const recipientsSorted = useMemo(() => {
    const list = item?.recipients ?? [];
    return [...list].sort((a, b) => {
      const sa = recipientStatusLabel(a.readAt);
      const sb = recipientStatusLabel(b.readAt);
      if (sa !== sb) return sa === "Entregue" ? -1 : 1;
      const na = (a.fullName ?? a.email ?? a.userId).toLowerCase();
      const nb = (b.fullName ?? b.email ?? b.userId).toLowerCase();
      return na.localeCompare(nb);
    });
  }, [item?.recipients]);

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Início", href: `/tenants/${tenantId}/dashboard` },
          { label: "Comunicados", href: `/tenants/${tenantId}/notices` },
          { label: "Detalhes" }
        ]}
      />

      <div className="section-header">
        <h1>Detalhes do comunicado</h1>
        <div className="row">
          <button type="button" className="secondary" onClick={() => router.push(`/tenants/${tenantId}/notices`)}>
            Voltar
          </button>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {loading ? <p className="muted">Carregando...</p> : null}

      {item ? (
        <>
          <section className="card stack">
            <h2 style={{ margin: 0 }}>{item.title}</h2>
            <p className="muted" style={{ margin: 0 }}>
              Público: {item.target} | {new Date(item.createdAt).toLocaleString("pt-BR")}
            </p>
            <div className="notice-rich-content" dangerouslySetInnerHTML={{ __html: item.message }} />

            {(item.attachments ?? []).length > 0 ? (
              <div className="stack" style={{ marginTop: 12 }}>
                <strong>Anexos</strong>
                {(item.attachments ?? []).map((attachment) => (
                  <div key={attachment.id}>
                    {attachment.signedUrl ? (
                      <a href={attachment.signedUrl} target="_blank" rel="noreferrer">
                        {attachment.fileName}
                      </a>
                    ) : (
                      <span>{attachment.fileName}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="card stack">
            <div className="section-header">
              <h3 style={{ margin: 0 }}>Entrega</h3>
              <span className="muted">
                Destinatários: {recipientsSorted.length}
              </span>
            </div>

            {recipientsSorted.length === 0 ? (
              <p className="muted">Nenhum destinatário encontrado para este comunicado.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Status</th>
                      <th>Aberto em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipientsSorted.map((r) => (
                      <tr key={r.userId}>
                        <td>{r.fullName ?? "-"}</td>
                        <td>{r.email ?? "-"}</td>
                        <td>
                          <span className={`status-pill ${r.readAt ? "success" : "warning"}`}>
                            {recipientStatusLabel(r.readAt)}
                          </span>
                        </td>
                        <td>{r.readAt ? new Date(r.readAt).toLocaleString("pt-BR") : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <Link href={`/tenants/${tenantId}/notices`}>
            <button type="button" className="secondary">
              Voltar para comunicados
            </button>
          </Link>
        </>
      ) : null}
    </main>
  );
}

