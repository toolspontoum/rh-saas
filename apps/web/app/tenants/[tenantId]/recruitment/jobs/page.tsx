"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Eye, Pencil, Trash2 } from "lucide-react";

import { Breadcrumbs } from "../../../../../components/breadcrumbs";
import { EmptyState } from "../../../../../components/empty-state";
import { apiFetch } from "../../../../../lib/api";
import { useSavedState } from "../../../../../lib/saved-state";

type Job = {
  id: string;
  title: string;
  status: "draft" | "published" | "closed";
  department: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  expiresAt: string | null;
  applicationsCount: number;
};

type CandidateRow = { id: string; isActive: boolean };

type Paginated<T> = { items: T[] };

function resolveStatusLabel(job: Job): { label: "Ativa" | "Inativa" | "Rascunho" | "Encerrada"; kind: "success" | "warning" | "danger" | "neutral" } {
  if (job.status === "closed") return { label: "Encerrada", kind: "neutral" };
  if (job.status === "draft") return { label: "Rascunho", kind: "warning" };
  if (job.expiresAt && job.expiresAt < new Date().toISOString().slice(0, 10)) {
    return { label: "Inativa", kind: "danger" };
  }
  return { label: "Ativa", kind: "success" };
}

export default function RecruitmentJobsPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;
  const [items, setItems] = useState<Job[]>([]);
  const [titleFilter, setTitleFilter] = useSavedState(`jobs_title_${tenantId}`, "");
  const [statusFilter, setStatusFilter] = useSavedState(`jobs_status_${tenantId}`, "");
  const [areaFilter, setAreaFilter] = useSavedState(`jobs_area_${tenantId}`, "");
  const [cityFilter, setCityFilter] = useSavedState(`jobs_city_${tenantId}`, "");
  const [stateFilter, setStateFilter] = useSavedState(`jobs_state_${tenantId}`, "");
  const [modalityFilter, setModalityFilter] = useSavedState(`jobs_modality_${tenantId}`, "");
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);

  async function loadJobs() {
    const q = new URLSearchParams({ page: "1", pageSize: "100" });
    if (titleFilter.trim()) q.set("title", titleFilter.trim());
    const data = await apiFetch<Paginated<Job>>(`/v1/tenants/${tenantId}/jobs?${q.toString()}`);
    setItems(data.items);
  }

  useEffect(() => {
    loadJobs().catch((err: Error) => setError(err.message));
  }, [tenantId, titleFilter]);

  useEffect(() => {
    apiFetch<Paginated<CandidateRow>>(`/v1/tenants/${tenantId}/candidates?page=1&pageSize=200`)
      .then((d) => setCandidates(d.items ?? []))
      .catch(() => setCandidates([]));
  }, [tenantId]);

  const options = useMemo(() => {
    const areas = Array.from(new Set(items.map((j) => (j.department ?? "").trim()).filter(Boolean))).sort();
    const cities = Array.from(new Set(items.map((j) => (j.city ?? "").trim()).filter(Boolean))).sort();
    const states = Array.from(new Set(items.map((j) => (j.state ?? "").trim()).filter(Boolean))).sort();
    const modalities = Array.from(new Set(items.map((j) => (j.location ?? "").trim()).filter(Boolean))).sort();
    return { areas, cities, states, modalities };
  }, [items]);

  const publishedJobsCount = useMemo(() => items.filter((j) => j.status === "published").length, [items]);
  const activeCandidatesCount = useMemo(
    () => candidates.filter((c) => c.isActive).length,
    [candidates]
  );

  const filteredItems = useMemo(() => {
    const selectedArea = options.areas.includes(areaFilter) ? areaFilter : "";
    const selectedCity = options.cities.includes(cityFilter) ? cityFilter : "";
    const selectedState = options.states.includes(stateFilter) ? stateFilter : "";
    const selectedModality = options.modalities.includes(modalityFilter) ? modalityFilter : "";
    const statusOptions = ["Rascunho", "Ativa", "Inativa", "Encerrada"];
    const selectedStatus = statusOptions.includes(statusFilter) ? statusFilter : "";
    return items.filter((job) => {
      if (selectedArea && (job.department ?? "") !== selectedArea) return false;
      if (selectedCity && (job.city ?? "") !== selectedCity) return false;
      if (selectedState && (job.state ?? "") !== selectedState) return false;
      if (selectedModality && (job.location ?? "") !== selectedModality) return false;
      if (selectedStatus) {
        const resolved = resolveStatusLabel(job).label;
        if (resolved !== selectedStatus) return false;
      }
      return true;
    });
  }, [items, areaFilter, cityFilter, stateFilter, modalityFilter, statusFilter]);

  async function removeJob(jobId: string) {
    if (!window.confirm("Deseja realmente excluir esta vaga?")) return;
    setError(null);
    try {
      await apiFetch(`/v1/tenants/${tenantId}/jobs/${jobId}`, { method: "DELETE" });
      await loadJobs();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Início", href: `/tenants/${tenantId}/dashboard` },
          { label: "Painel de Recrutamento" }
        ]}
      />

      <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
        <div className="card" style={{ minWidth: 200 }}>
          <h3 style={{ margin: 0 }}>Total de vagas</h3>
          <p style={{ fontSize: 28, margin: "8px 0 0" }}>{items.length}</p>
        </div>
        <div className="card" style={{ minWidth: 200 }}>
          <h3 style={{ margin: 0 }}>Vagas publicadas</h3>
          <p style={{ fontSize: 28, margin: "8px 0 0" }}>{publishedJobsCount}</p>
        </div>
        <div className="card" style={{ minWidth: 200 }}>
          <h3 style={{ margin: 0 }}>Candidatos ativos</h3>
          <p style={{ fontSize: 28, margin: "8px 0 0" }}>{activeCandidatesCount}</p>
        </div>
      </div>

      <div className="section-header">
        <h1>Painel de Recrutamento</h1>
        <Link href={`/tenants/${tenantId}/recruitment/jobs/new`}><button>Criar vaga</button></Link>
      </div>
      {error ? <p className="error">{error}</p> : null}

      <div className="card stack">
        <input placeholder="Filtrar por título" value={titleFilter} onChange={(e) => setTitleFilter(e.target.value)} />
        <div className="jobs-filters-row-2">
          <input
            list="jobs-state-options"
            placeholder="Estado"
            value={stateFilter === "all" ? "" : stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          />
          <datalist id="jobs-state-options">
            {options.states.map((state) => <option key={state} value={state} />)}
          </datalist>

          <input
            list="jobs-city-options"
            placeholder="Cidade"
            value={cityFilter === "all" ? "" : cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
          />
          <datalist id="jobs-city-options">
            {options.cities.map((city) => <option key={city} value={city} />)}
          </datalist>
        </div>

        <div className="jobs-filters-row-3">
          <input
            list="jobs-area-options"
            placeholder="Área"
            value={areaFilter === "all" ? "" : areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
          />
          <datalist id="jobs-area-options">
            {options.areas.map((area) => <option key={area} value={area} />)}
          </datalist>

          <input
            list="jobs-modality-options"
            placeholder="Modalidade"
            value={modalityFilter === "all" ? "" : modalityFilter}
            onChange={(e) => setModalityFilter(e.target.value)}
          />
          <datalist id="jobs-modality-options">
            {options.modalities.map((mod) => <option key={mod} value={mod} />)}
          </datalist>

          <input
            list="jobs-status-options"
            placeholder="Status"
            value={statusFilter === "all" ? "" : statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
          <datalist id="jobs-status-options">
            <option value="Rascunho" />
            <option value="Ativa" />
            <option value="Inativa" />
            <option value="Encerrada" />
          </datalist>
        </div>
      </div>

      <div className="card table-wrap">
        {filteredItems.length === 0 ? (
          <EmptyState title="Sem vagas para exibir" description="Ajuste os filtros ou crie uma nova vaga." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Área</th>
                <th>Cidade</th>
                <th>Estado</th>
                <th>Modalidade</th>
                <th>Candidaturas</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((job) => {
                const status = resolveStatusLabel(job);
                return (
                  <tr key={job.id}>
                    <td><Link href={`/tenants/${tenantId}/recruitment/jobs/${job.id}`}>{job.title}</Link></td>
                    <td>{job.department ?? "-"}</td>
                    <td>{job.city ?? "-"}</td>
                    <td>{job.state ?? "-"}</td>
                    <td>{job.location ?? "-"}</td>
                    <td>{job.applicationsCount}</td>
                    <td><span className={`status-pill ${status.kind}`}>{status.label}</span></td>
                    <td>
                      <div className="row">
                        <Link href={`/tenants/${tenantId}/recruitment/jobs/${job.id}`} className="icon-btn" title="Visualizar" aria-label="Visualizar"><Eye size={16} /></Link>
                        <Link href={`/tenants/${tenantId}/recruitment/jobs/${job.id}/edit`} className="icon-btn" title="Editar" aria-label="Editar"><Pencil size={16} /></Link>
                        <button className="icon-btn icon-danger" title="Excluir" aria-label="Excluir" onClick={() => removeJob(job.id)}><Trash2 size={16} /></button>
                      </div>
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
