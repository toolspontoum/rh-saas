"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { Breadcrumbs } from "../../../../../components/breadcrumbs";
import { EmptyState } from "../../../../../components/empty-state";
import { apiFetch } from "../../../../../lib/api";
import { useSavedState } from "../../../../../lib/saved-state";

type JobOption = {
  id: string;
  title: string;
};

type TenantApplication = {
  id: string;
  jobId: string;
  status: "submitted" | "in_review" | "approved" | "rejected" | "archived";
  createdAt: string;
  candidate: {
    fullName: string;
    email: string;
    contract: string | null;
  };
  job: {
    id: string;
    title: string;
  };
};

type Paginated<T> = { items: T[] };

export default function RecruitmentCandidatesPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;

  const [items, setItems] = useState<TenantApplication[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [nameFilter, setNameFilter] = useSavedState(`candidates_name_${tenantId}`, "");
  const [emailFilter, setEmailFilter] = useSavedState(`candidates_email_${tenantId}`, "");
  const [cpfFilter, setCpfFilter] = useSavedState(`candidates_cpf_${tenantId}`, "");
  const [jobFilter, setJobFilter] = useSavedState(`candidates_job_${tenantId}`, "all");
  const [jobSearch, setJobSearch] = useSavedState(`candidates_job_search_${tenantId}`, "");
  const [statusFilter, setStatusFilter] = useSavedState<
    "all" | "submitted" | "in_review" | "approved" | "rejected" | "archived"
  >(`candidates_status_${tenantId}`, "all");
  const [dateFrom, setDateFrom] = useSavedState(`candidates_from_${tenantId}`, "");
  const [dateTo, setDateTo] = useSavedState(`candidates_to_${tenantId}`, "");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const q = new URLSearchParams({ page: "1", pageSize: "100" });
    if (nameFilter.trim()) q.set("candidateName", nameFilter.trim());
    if (emailFilter.trim()) q.set("candidateEmail", emailFilter.trim());
    if (cpfFilter.trim()) q.set("candidateCpf", cpfFilter.trim());
    if (jobFilter !== "all") q.set("jobId", jobFilter);
    if (statusFilter !== "all") q.set("status", statusFilter);
    if (dateFrom.trim()) q.set("createdFrom", dateFrom.trim());
    if (dateTo.trim()) q.set("createdTo", dateTo.trim());
    const data = await apiFetch<Paginated<TenantApplication>>(
      `/v1/tenants/${tenantId}/recruitment/applications?${q.toString()}`
    );
    setItems(data.items);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, [tenantId, nameFilter, emailFilter, cpfFilter, jobFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    apiFetch<Paginated<JobOption>>(`/v1/tenants/${tenantId}/jobs?page=1&pageSize=100`)
      .then((data) => setJobs(data.items.map((item) => ({ id: item.id, title: item.title }))))
      .catch((err: Error) => setError(err.message));
  }, [tenantId]);

  const selectedJobByTitle = useMemo(() => {
    const normalized = jobSearch.trim().toLowerCase();
    if (!normalized) return null;
    return jobs.find((job) => job.title.trim().toLowerCase() === normalized) ?? null;
  }, [jobs, jobSearch]);

  useEffect(() => {
    if (!jobSearch.trim()) {
      if (jobFilter !== "all") setJobFilter("all");
      return;
    }
    if (selectedJobByTitle) {
      if (jobFilter !== selectedJobByTitle.id) setJobFilter(selectedJobByTitle.id);
      return;
    }
    if (jobFilter !== "all") setJobFilter("all");
  }, [jobSearch, selectedJobByTitle, jobFilter, setJobFilter]);

  function statusLabel(status: TenantApplication["status"]) {
    if (status === "submitted") return "Submetido";
    if (status === "in_review") return "Em análise";
    if (status === "approved") return "Aprovado";
    if (status === "rejected") return "Rejeitado";
    return "Arquivado";
  }

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Início", href: `/tenants/${tenantId}/dashboard` },
          { label: "Painel de Recrutamento", href: `/tenants/${tenantId}/recruitment/jobs` },
          { label: "Candidatos" }
        ]}
      />
      <h1>Candidatos</h1>
      {error ? <p className="error">{error}</p> : null}

      <div className="card stack">
        <div className="candidates-filters-row-1">
          <label>
            Nome
            <input placeholder="Nome" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} />
          </label>
          <label>
            CPF
            <input placeholder="CPF" value={cpfFilter} onChange={(e) => setCpfFilter(e.target.value)} />
          </label>
          <label>
            E-mail
            <input placeholder="E-mail" value={emailFilter} onChange={(e) => setEmailFilter(e.target.value)} />
          </label>
        </div>

        <div className="candidates-filters-row-2">
          <label>
            Vaga
            <input
              list="candidates-job-options"
              placeholder="Todas as vagas"
              value={jobSearch}
              onChange={(e) => setJobSearch(e.target.value)}
            />
            <datalist id="candidates-job-options">
              {jobs.map((job) => (
                <option key={job.id} value={job.title} />
              ))}
            </datalist>
          </label>
          <label>
            Status
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
              <option value="all">Todos</option>
              <option value="submitted">Submetido</option>
              <option value="in_review">Em análise</option>
              <option value="approved">Aprovado</option>
              <option value="rejected">Rejeitado</option>
              <option value="archived">Arquivado</option>
            </select>
          </label>
        </div>

        <div className="candidates-filters-row-3">
          <label>
            Data inicial
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </label>
          <label>
            Data final
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="card table-wrap">
        {items.length === 0 ? (
          <EmptyState title="Sem candidatos" description="Nenhum candidato encontrado com os filtros atuais." />
        ) : (
          <table className="table">
            <thead><tr><th>Nome</th><th>Email</th><th>Vaga</th><th>Status</th><th>Data</th><th>Ações</th></tr></thead>
            <tbody>
              {items.map((application) => (
                <tr key={application.id}>
                  <td>{application.candidate.fullName}</td>
                  <td>{application.candidate.email}</td>
                  <td>{application.job.title}</td>
                  <td>{statusLabel(application.status)}</td>
                  <td>{new Date(application.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td>
                    <div className="row">
                      <Link href={`/tenants/${tenantId}/recruitment/candidates/${application.id}`}>
                        <button className="secondary">Ver detalhes</button>
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
