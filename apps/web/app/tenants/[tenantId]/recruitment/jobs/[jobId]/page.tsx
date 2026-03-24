"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import DOMPurify from "dompurify";

import { Breadcrumbs } from "../../../../../../components/breadcrumbs";
import { EmptyState } from "../../../../../../components/empty-state";
import { apiFetch } from "../../../../../../lib/api";

type JobQuestion = {
  id: string;
  label: string;
  type: "yes_no" | "document_upload" | "text";
  isRequired: boolean;
  isEliminatory: boolean;
  notes: string | null;
};

type Job = {
  id: string;
  title: string;
  description: string;
  department: string | null;
  location: string | null;
  employmentType: string | null;
  city: string | null;
  state: string | null;
  salary: number | null;
  expiresAt: string | null;
  skills: string[];
  screeningQuestions: JobQuestion[];
  status: "draft" | "published" | "closed";
  createdAt: string;
};

type Application = {
  id: string;
  status: "submitted" | "in_review" | "approved" | "rejected";
  coverLetter: string | null;
  createdAt: string;
  candidate: {
    fullName: string;
    email: string;
    contract: string | null;
  };
};

type Paginated<T> = { items: T[] };

function resolveStatusLabel(job: Job): string {
  if (job.status === "closed") return "Encerrada";
  if (job.status === "draft") return "Rascunho";
  if (job.expiresAt && job.expiresAt < new Date().toISOString().slice(0, 10)) return "Inativa";
  return "Ativa";
}

export default function RecruitmentJobDetailPage() {
  const params = useParams<{ tenantId: string; jobId: string }>();
  const tenantId = params.tenantId;
  const jobId = params.jobId;

  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<Job>(`/v1/tenants/${tenantId}/jobs/${jobId}`),
      apiFetch<Paginated<Application>>(`/v1/tenants/${tenantId}/jobs/${jobId}/applications?page=1&pageSize=100`)
    ])
      .then(([jobData, appData]) => {
        setJob(jobData);
        setApplications(appData.items);
      })
      .catch((err: Error) => setError(err.message));
  }, [tenantId, jobId]);

  const statusCount = useMemo(() => {
    return applications.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [applications]);

  const safeDescription = job ? DOMPurify.sanitize(job.description ?? "") : "";

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Início", href: `/tenants/${tenantId}/dashboard` },
          { label: "Painel de Recrutamento", href: `/tenants/${tenantId}/recruitment/jobs` },
          { label: "Vagas", href: `/tenants/${tenantId}/recruitment/jobs` },
          { label: "Detalhe" }
        ]}
      />

      <div className="section-header">
        <h1>Detalhe da vaga</h1>
        <div className="row">
          <Link href={`/tenants/${tenantId}/recruitment/jobs/${jobId}/edit`}><button>Editar vaga</button></Link>
          <Link href={`/tenants/${tenantId}/recruitment/jobs/${jobId}/applications`}><button className="secondary">Gerenciar inscritos</button></Link>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {job ? (
        <div className="card stack">
          <h3>{job.title}</h3>
          <div className="job-rich-content" dangerouslySetInnerHTML={{ __html: safeDescription }} />
          <div className="row">
            <span className="badge">Status: {resolveStatusLabel(job)}</span>
            <span className="badge">Área: {job.department ?? "Não informada"}</span>
            <span className="badge">Modalidade: {job.location ?? "Não informada"}</span>
            <span className="badge">Tipo: {job.employmentType ?? "Não informado"}</span>
            <span className="badge">Cidade: {job.city ?? "Não informada"}</span>
            <span className="badge">Estado: {job.state ?? "Não informado"}</span>
            <span className="badge">Salário: {job.salary == null ? "Não informado" : `R$ ${job.salary.toFixed(2)}`}</span>
            <span className="badge">Validade: {job.expiresAt ?? "Sem validade"}</span>
            {job.skills?.map((skill) => (
              <span className="badge" key={skill}>Habilidade: {skill.replace(/-/g, " ")}</span>
            ))}
          </div>
        </div>
      ) : null}

      {job ? (
        <div className="card stack">
          <h3>Perguntas da vaga</h3>
          {job.screeningQuestions.length === 0 ? (
            <EmptyState title="Sem perguntas cadastradas" description="Esta vaga nao possui perguntas especificas." />
          ) : (
            job.screeningQuestions.map((q) => (
              <div className="card" key={q.id}>
                <strong>{q.label}</strong>
                <div className="tag-list" style={{ marginTop: 8 }}>
                  <span className="badge">Tipo: {q.type === "yes_no" ? "Sim/Não" : q.type === "document_upload" ? "Upload de documento" : "Texto livre"}</span>
                  <span className="badge">Obrigatória: {q.isRequired ? "Sim" : "Não"}</span>
                  <span className="badge">Eliminatória: {q.isEliminatory ? "Sim" : "Não"}</span>
                </div>
                {q.notes ? <p>{q.notes}</p> : null}
              </div>
            ))
          )}
        </div>
      ) : null}

      <div className="metrics-grid">
        <div className="card"><h3>{applications.length}</h3><p>Total inscritos</p></div>
        <div className="card"><h3>{statusCount.submitted ?? 0}</h3><p>Submetidos</p></div>
        <div className="card"><h3>{statusCount.in_review ?? 0}</h3><p>Em análise</p></div>
        <div className="card"><h3>{statusCount.approved ?? 0}</h3><p>Aprovados</p></div>
        <div className="card"><h3>{statusCount.rejected ?? 0}</h3><p>Rejeitados</p></div>
      </div>

      <div className="card table-wrap">
        <h3>Inscritos (visão rápida)</h3>
        {applications.length === 0 ? (
          <EmptyState title="Nenhum inscrito" description="Ainda nao ha candidaturas para esta vaga." />
        ) : (
          <table className="table">
            <thead>
              <tr><th>Nome</th><th>Email</th><th>Status</th><th>Data</th></tr>
            </thead>
            <tbody>
              {applications.map((item) => (
                <tr key={item.id}>
                  <td>{item.candidate.fullName}</td>
                  <td>{item.candidate.email}</td>
                  <td>{item.status}</td>
                  <td>{new Date(item.createdAt).toLocaleString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

