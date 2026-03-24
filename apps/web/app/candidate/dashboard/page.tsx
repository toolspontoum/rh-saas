"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  getCandidateProfile,
  isCandidateProfileComplete,
  listMyApplications,
  listSuggestedJobs,
  statusLabel,
  type CandidateProfile,
  type MyApplication,
  type PublicJob
} from "../../../lib/candidate";

export default function CandidateDashboardPage() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [suggested, setSuggested] = useState<PublicJob[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCandidateProfile(), listMyApplications(), listSuggestedJobs()])
      .then(([profileData, appData, suggestedData]) => {
        setProfile(profileData);
        setApplications(appData.items);
        setSuggested(suggestedData.items);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <h1>Painel do candidato</h1>
      {error ? <p className="error">{error}</p> : null}

      {!isCandidateProfileComplete(profile) ? (
        <div className="card stack">
          <h3>Complete seu perfil para aumentar o match</h3>
          <p className="muted">Preencha habilidades, resumo e experiências.</p>
          <Link href="/candidate/profile"><button>Completar perfil</button></Link>
        </div>
      ) : null}

      <div className="metrics-grid">
        <div className="card"><strong>{applications.length}</strong><p>Candidaturas enviadas</p></div>
        <div className="card"><strong>{applications.filter((a) => a.status === "in_review").length}</strong><p>Em análise</p></div>
        <div className="card"><strong>{applications.filter((a) => a.status === "approved").length}</strong><p>Aprovadas</p></div>
        <div className="card"><strong>{applications.filter((a) => a.status === "rejected").length}</strong><p>Rejeitadas</p></div>
        <div className="card"><strong>{suggested.length}</strong><p>Vagas sugeridas</p></div>
      </div>

      <section className="card stack">
        <div className="section-header">
          <h2>Vagas sugeridas por habilidades</h2>
          <Link href="/candidate/jobs">Ver todas</Link>
        </div>
        <div className="jobs-card-grid">
          {suggested.slice(0, 8).map((job) => (
            <article key={job.id} className="card stack job-summary-card">
              <div className="section-header">
                <strong>{job.title}</strong>
                <span className="badge">Match: {job.matchScore ?? 0}</span>
              </div>
              <p className="muted">{job.tenantDisplayName}</p>
              <p className="job-card-summary">{summarizeHtml(job.description, 180)}</p>
              <div className="row" style={{ justifyContent: "space-between", marginTop: "auto" }}>
                <span className="muted small">
                  {job.city && job.state ? `${job.city}/${job.state}` : "Local a combinar"}
                </span>
                <Link href={`/candidate/jobs/${job.id}`}>
                  <button type="button">Ver detalhes</button>
                </Link>
              </div>
            </article>
          ))}
          {suggested.length === 0 ? (
            <div className="card">
              <p className="muted">Sem vagas sugeridas até o momento.</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Últimas candidaturas</h2>
          <Link href="/candidate/applications">Ver histórico</Link>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Vaga</th><th>Empresa</th><th>Status</th></tr>
            </thead>
            <tbody>
              {applications.slice(0, 8).map((item) => (
                <tr key={item.id}>
                  <td>{item.job.title}</td>
                  <td>{item.tenant.displayName}</td>
                  <td>{statusLabel(item.status)}</td>
                </tr>
              ))}
              {applications.length === 0 ? (
                <tr><td colSpan={3} className="muted">Sem candidaturas até o momento.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function summarizeHtml(html: string, maxLength: number) {
  const plain = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).trim()}...`;
}

