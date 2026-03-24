"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  loadAllTenantJobs,
  listJobEmployers,
  type JobEmployer,
  type PublicJob
} from "../../../lib/candidate";

export default function CandidateJobsPage() {
  const [employers, setEmployers] = useState<JobEmployer[]>([]);
  const [selectedEmployer, setSelectedEmployer] = useState<JobEmployer | null>(null);
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [title, setTitle] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [modalityFilter, setModalityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [loadingEmployers, setLoadingEmployers] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const loadEmployers = useCallback(() => {
    setLoadingEmployers(true);
    setError(null);
    listJobEmployers()
      .then((data) => setEmployers(data.items))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoadingEmployers(false));
  }, []);

  useEffect(() => {
    loadEmployers();
  }, [loadEmployers]);

  function selectEmployer(employer: JobEmployer) {
    setSelectedEmployer(employer);
    setTitle("");
    setAreaFilter("all");
    setCityFilter("all");
    setStateFilter("all");
    setModalityFilter("all");
    setStatusFilter("all");
    setLoadingJobs(true);
    setError(null);
    loadAllTenantJobs(employer.tenantId)
      .then(setJobs)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoadingJobs(false));
  }

  function clearEmployer() {
    setSelectedEmployer(null);
    setJobs([]);
    setTitle("");
    setAreaFilter("all");
    setCityFilter("all");
    setStateFilter("all");
    setModalityFilter("all");
    setStatusFilter("all");
  }

  const options = useMemo(() => {
    const areas = Array.from(new Set(jobs.map((j) => (j.department ?? "").trim()).filter(Boolean))).sort();
    const cities = Array.from(new Set(jobs.map((j) => (j.city ?? "").trim()).filter(Boolean))).sort();
    const states = Array.from(new Set(jobs.map((j) => (j.state ?? "").trim()).filter(Boolean))).sort();
    const modalities = Array.from(new Set(jobs.map((j) => (j.location ?? "").trim()).filter(Boolean))).sort();
    return { areas, cities, states, modalities };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const titleQ = title.trim().toLowerCase();
    return jobs.filter((job) => {
      if (titleQ && !(job.title ?? "").toLowerCase().includes(titleQ)) return false;
      if (areaFilter !== "all" && (job.department ?? "") !== areaFilter) return false;
      if (cityFilter !== "all" && (job.city ?? "") !== cityFilter) return false;
      if (stateFilter !== "all" && (job.state ?? "") !== stateFilter) return false;
      if (modalityFilter !== "all" && (job.location ?? "") !== modalityFilter) return false;
      if (statusFilter !== "all") {
        const status = resolveStatusLabel(job);
        if (status !== statusFilter) return false;
      }
      return true;
    });
  }, [jobs, title, areaFilter, cityFilter, stateFilter, modalityFilter, statusFilter]);

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <h1>Vagas disponíveis</h1>
      <p className="muted small">
        Escolha uma empresa para ver todas as vagas publicadas. A ordem prioriza o maior match com as habilidades do
        seu perfil; use os filtros para refinar a lista.
      </p>
      {error ? <p className="error">{error}</p> : null}

      {!selectedEmployer ? (
        <>
          {loadingEmployers ? (
            <p className="muted">Carregando empresas…</p>
          ) : employers.length === 0 ? (
            <article className="card stack">
              <p className="muted">Nenhuma empresa com vagas publicadas no momento.</p>
            </article>
          ) : (
            <section className="jobs-card-grid">
              {employers.map((emp) => (
                <button
                  key={emp.tenantId}
                  type="button"
                  className="card stack job-summary-card employer-card"
                  onClick={() => selectEmployer(emp)}
                >
                  <div className="section-header">
                    <div>
                      <h3>{emp.displayName}</h3>
                      <p className="muted small">
                        {emp.publishedJobCount} vaga{emp.publishedJobCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    {emp.matchScore > 0 ? (
                      <span className="badge" title="Habilidades comuns entre seu perfil e as vagas desta empresa">
                        Match {emp.matchScore}
                      </span>
                    ) : null}
                  </div>
                  <p className="muted small" style={{ marginTop: "auto" }}>
                    Ver vagas →
                  </p>
                </button>
              ))}
            </section>
          )}
        </>
      ) : (
        <>
          <div className="row" style={{ alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <button type="button" className="secondary" onClick={clearEmployer}>
              ← Todas as empresas
            </button>
            <h2 style={{ margin: 0, fontSize: "1.15rem" }}>{selectedEmployer.displayName}</h2>
          </div>

          {loadingJobs ? (
            <p className="muted">Carregando vagas…</p>
          ) : (
            <>
              <div className="card row" style={{ alignItems: "center", flexWrap: "wrap" }}>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Buscar por título"
                />
                <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
                  <option value="all">Área (todas)</option>
                  {options.areas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
                <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
                  <option value="all">Cidade (todas)</option>
                  {options.cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
                  <option value="all">Estado (todos)</option>
                  {options.states.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                <select value={modalityFilter} onChange={(e) => setModalityFilter(e.target.value)}>
                  <option value="all">Modalidade (todas)</option>
                  {options.modalities.map((modality) => (
                    <option key={modality} value={modality}>
                      {modality}
                    </option>
                  ))}
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">Status (todos)</option>
                  <option value="Ativa">Ativa</option>
                  <option value="Inativa">Inativa</option>
                </select>
              </div>

              <section className="jobs-card-grid">
                {filteredJobs.map((job) => (
                  <article key={job.id} className="card stack job-summary-card">
                    <div className="section-header">
                      <div>
                        <h3>{job.title}</h3>
                        <p className="muted">{job.tenantDisplayName}</p>
                      </div>
                      {(job.matchScore ?? 0) > 0 ? (
                        <span className="badge" title="Habilidades do perfil que coincidem com a vaga">
                          Match {job.matchScore}
                        </span>
                      ) : null}
                    </div>

                    <p className="job-card-summary">{summarizeHtml(job.description, 220)}</p>

                    <div className="tag-list">
                      {(job.skills ?? []).slice(0, 4).map((skill) => (
                        <span key={skill} className="badge">
                          {skill.replace(/-/g, " ")}
                        </span>
                      ))}
                    </div>

                    <div className="row" style={{ justifyContent: "space-between", marginTop: "auto" }}>
                      <div className="row" style={{ gap: 6 }}>
                        <span className="muted small">
                          {job.city && job.state ? `${job.city}/${job.state}` : "Local a combinar"}
                        </span>
                        <span
                          className={`status-pill ${resolveStatusLabel(job) === "Ativa" ? "success" : "danger"}`}
                        >
                          {resolveStatusLabel(job)}
                        </span>
                      </div>
                      <Link href={`/candidate/jobs/${job.id}`}>
                        <button type="button">Ver detalhes</button>
                      </Link>
                    </div>
                  </article>
                ))}
                {filteredJobs.length === 0 ? (
                  <article className="card stack">
                    <p className="muted">Nenhuma vaga encontrada com os filtros selecionados.</p>
                    <p className="muted small">
                      Limpe os filtros para ver todas as {jobs.length} vaga{jobs.length === 1 ? "" : "s"} desta empresa.
                    </p>
                  </article>
                ) : null}
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}

function resolveStatusLabel(job: PublicJob): "Ativa" | "Inativa" {
  if (job.expiresAt && job.expiresAt < new Date().toISOString().slice(0, 10)) {
    return "Inativa";
  }
  return "Ativa";
}

function summarizeHtml(html: string, maxLength: number) {
  const plain = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxLength) {
    return plain;
  }

  return `${plain.slice(0, maxLength).trim()}...`;
}
