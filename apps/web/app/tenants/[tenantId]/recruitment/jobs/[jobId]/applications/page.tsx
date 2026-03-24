"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { Breadcrumbs } from "../../../../../../../components/breadcrumbs";
import { EmptyState } from "../../../../../../../components/empty-state";
import { apiFetch } from "../../../../../../../lib/api";

type Application = {
  id: string;
  status: "submitted" | "in_review" | "approved" | "rejected";
  coverLetter: string | null;
  candidate: {
    fullName: string;
    email: string;
    contract: string | null;
    isActive: boolean;
  };
  aiMatchScore?: number | null;
  aiAnalysisStatus?: string;
  aiAnalysisError?: string | null;
  aiMatchReport?: { reason?: string } | null;
};

type Paginated<T> = { items: T[] };

const AI_ANALYSIS_LABEL: Record<string, string> = {
  pending: "Pendente",
  processing: "Processando",
  completed: "Concluída",
  failed: "Falhou",
  skipped: "Ignorada"
};

function aiAnalysisHint(it: Application): string | undefined {
  if (it.aiAnalysisStatus === "skipped") {
    const r = it.aiMatchReport?.reason;
    if (r === "NO_PDF_TEXT") {
      return "Sem texto ou imagem legível nos arquivos (PDF vazio/escaneado sem render, ou sem anexo). Inclua PDF com texto ou imagem.";
    }
    if (r === "AI_PROVIDER_DISABLED") {
      return "Provedor de IA desativado (AI_PROVIDER_DEFAULT ou tenant). Configure chaves e provedor.";
    }
  }
  return it.aiAnalysisError ?? undefined;
}

/** Motivo persistido em `ai_match_report.reason` quando status = skipped (ver resume-analysis.runner). */
function skippedReasonVisible(it: Application): { code: string; detail: string } | null {
  if (it.aiAnalysisStatus !== "skipped") return null;
  const r = it.aiMatchReport?.reason;
  if (r === "NO_PDF_TEXT") {
    return {
      code: "NO_PDF_TEXT",
      detail:
        "Não havia texto extraível nem imagens enviadas ao modelo (sem currículo/anexo, PDF sem camada de texto e sem conversão em imagem, ou falha ao baixar o arquivo)."
    };
  }
  if (r === "AI_PROVIDER_DISABLED") {
    return {
      code: "AI_PROVIDER_DISABLED",
      detail:
        "Nenhum provedor ativo: defina AI_PROVIDER_DEFAULT (openai/gemini) e chaves no .env ou no painel superadmin, ou configure o tenant em `ai_provider`."
    };
  }
  return {
    code: r ?? "—",
    detail: "Motivo não reconhecido ou registro antigo. Use Reanalisar IA após corrigir anexos ou configuração."
  };
}

export default function RecruitmentApplicationsPage() {
  const params = useParams<{ tenantId: string; jobId: string }>();
  const tenantId = params.tenantId;
  const jobId = params.jobId;

  const [items, setItems] = useState<Application[]>([]);
  const [draft, setDraft] = useState<Record<string, Application["status"]>>({});
  const [error, setError] = useState<string | null>(null);
  const [canSeeAiMatch, setCanSeeAiMatch] = useState(false);
  const [reanalyzeBusy, setReanalyzeBusy] = useState<string | null>(null);

  async function load() {
    const data = await apiFetch<Paginated<Application>>(
      `/v1/tenants/${tenantId}/jobs/${jobId}/applications?page=1&pageSize=50`
    );
    setItems(data.items);
    setDraft(
      data.items.reduce<Record<string, Application["status"]>>((acc, it) => {
        acc[it.id] = it.status;
        return acc;
      }, {})
    );
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, [tenantId, jobId]);

  useEffect(() => {
    apiFetch<{ roles: string[] }>(`/v1/tenants/${tenantId}/context`)
      .then((ctx) =>
        setCanSeeAiMatch(ctx.roles.some((r) => ["owner", "admin", "manager", "analyst"].includes(r)))
      )
      .catch(() => setCanSeeAiMatch(false));
  }, [tenantId]);

  async function reanalyzeAi(applicationId: string) {
    setError(null);
    setReanalyzeBusy(applicationId);
    try {
      await apiFetch(`/v1/tenants/${tenantId}/jobs/${jobId}/applications/${applicationId}/ai-reanalyze`, {
        method: "POST"
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setReanalyzeBusy(null);
    }
  }

  async function saveStatus(applicationId: string) {
    setError(null);
    try {
      await apiFetch(`/v1/tenants/${tenantId}/jobs/${jobId}/applications/${applicationId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: draft[applicationId] })
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Início", href: `/tenants/${tenantId}/dashboard` },
          { label: "Painel de Recrutamento", href: `/tenants/${tenantId}/recruitment/jobs` },
          { label: "Vagas", href: `/tenants/${tenantId}/recruitment/jobs` },
          { label: "Detalhe", href: `/tenants/${tenantId}/recruitment/jobs/${jobId}` },
          { label: "Inscritos" }
        ]}
      />

      <div className="section-header">
        <h1>Inscritos da vaga</h1>
        <Link href={`/tenants/${tenantId}/recruitment/jobs/${jobId}`}><button className="secondary">Voltar ao detalhe</button></Link>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="card">
        {items.length === 0 ? (
          <EmptyState title="Sem inscricoes" description="Esta vaga ainda nao recebeu candidaturas." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Contrato</th>
                {canSeeAiMatch ? <th>Match IA</th> : null}
                {canSeeAiMatch ? <th>Análise IA</th> : null}
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const skipInfo = skippedReasonVisible(it);
                return (
                <tr key={it.id}>
                  <td>{it.candidate.fullName}</td>
                  <td>{it.candidate.email}</td>
                  <td>{it.candidate.contract ?? "-"}</td>
                  {canSeeAiMatch ? (
                    <td>
                      {typeof it.aiMatchScore === "number" ? `${it.aiMatchScore}%` : "—"}
                    </td>
                  ) : null}
                  {canSeeAiMatch ? (
                    <td style={{ verticalAlign: "top" }}>
                      <div className="stack" style={{ gap: 8, maxWidth: 280 }}>
                        <span title={aiAnalysisHint(it)} style={{ cursor: "help" }}>
                          {it.aiAnalysisStatus
                            ? (AI_ANALYSIS_LABEL[it.aiAnalysisStatus] ?? it.aiAnalysisStatus)
                            : "—"}
                        </span>
                        {skipInfo ? (
                          <div className="muted small" style={{ lineHeight: 1.35 }}>
                            <strong style={{ fontWeight: 600 }}>{skipInfo.code}</strong>
                            <div>{skipInfo.detail}</div>
                          </div>
                        ) : null}
                        <button
                          type="button"
                          className="secondary"
                          style={{ fontSize: 12, padding: "6px 10px", width: "fit-content" }}
                          disabled={reanalyzeBusy !== null}
                          onClick={() => void reanalyzeAi(it.id)}
                        >
                          {reanalyzeBusy === it.id ? "Enfileirando…" : "Reanalisar IA"}
                        </button>
                      </div>
                    </td>
                  ) : null}
                  <td>
                    <select
                      value={draft[it.id] ?? it.status}
                      onChange={(e) =>
                        setDraft((current) => ({ ...current, [it.id]: e.target.value as Application["status"] }))
                      }
                    >
                      <option value="submitted">submitted</option>
                      <option value="in_review">in_review</option>
                      <option value="approved">approved</option>
                      <option value="rejected">rejected</option>
                    </select>
                  </td>
                  <td><button onClick={() => saveStatus(it.id)}>Salvar</button></td>
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
