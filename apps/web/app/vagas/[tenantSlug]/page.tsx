"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { appConfig } from "../../../lib/config";

type PublicJob = {
  id: string;
  title: string;
  description: string;
  department: string | null;
  location: string | null;
  employmentType: string | null;
  createdAt: string;
  companyId?: string;
  companyName?: string | null;
};

type PublicJobsResponse<T> = {
  items: T[];
  tenantDisplayName?: string | null;
  companies?: { id: string; name: string }[];
};

export default function PublicJobsPage() {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params.tenantSlug;
  const [items, setItems] = useState<PublicJob[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [tenantDisplayName, setTenantDisplayName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState("");

  useEffect(() => {
    const qs = new URLSearchParams({ page: "1", pageSize: "100" });
    if (companyFilter.trim()) {
      qs.set("companyId", companyFilter.trim());
    }
    fetch(`${appConfig.apiBaseUrl}/public/jobs/${encodeURIComponent(tenantSlug)}?${qs.toString()}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Erro ${response.status}`);
        return (await response.json()) as PublicJobsResponse<PublicJob>;
      })
      .then((data) => {
        setItems(data.items);
        setTenantDisplayName(data.tenantDisplayName ?? null);
        setCompanies(data.companies ?? []);
      })
      .catch((err: Error) => setError(err.message));
  }, [tenantSlug, companyFilter]);

  const departments = useMemo(() => {
    return Array.from(
      new Set(items.map((item) => item.department?.trim()).filter((value): value is string => Boolean(value)))
    ).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const locations = useMemo(() => {
    return Array.from(
      new Set(items.map((item) => item.location?.trim()).filter((value): value is string => Boolean(value)))
    ).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const employmentTypes = useMemo(() => {
    return Array.from(
      new Set(
        items
          .map((item) => item.employmentType?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    return items.filter((job) => {
      if (departmentFilter && (job.department ?? "").trim() !== departmentFilter) return false;
      if (locationFilter && (job.location ?? "").trim() !== locationFilter) return false;
      if (employmentTypeFilter && (job.employmentType ?? "").trim() !== employmentTypeFilter) return false;
      if (!searchTerm) return true;

      const title = job.title.toLowerCase();
      const description = summarizeHtml(job.description, 10000).toLowerCase();
      const department = (job.department ?? "").toLowerCase();
      const location = (job.location ?? "").toLowerCase();
      const employmentType = (job.employmentType ?? "").toLowerCase();
      return (
        title.includes(searchTerm) ||
        description.includes(searchTerm) ||
        department.includes(searchTerm) ||
        location.includes(searchTerm) ||
        employmentType.includes(searchTerm)
      );
    });
  }, [items, search, departmentFilter, locationFilter, employmentTypeFilter]);

  return (
    <main className="container wide stack">
      <h1>
        Vagas abertas
        {tenantDisplayName ? ` - ${tenantDisplayName}` : ""}
      </h1>
      {error ? <p className="error">{error}</p> : null}
      <div className="card">
        <div
          className="form-grid"
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(100, minmax(0, 1fr))",
            alignItems: "end"
          }}
        >
          <label style={{ gridColumn: companies.length > 0 ? "span 30" : "span 40" }}>
            Buscar vaga
            <input
              placeholder="Título, descrição, área, local..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          {companies.length > 0 ? (
            <label style={{ gridColumn: "span 20" }}>
              Empresa / projeto
              <select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}>
                <option value="">Todas</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label style={{ gridColumn: companies.length > 0 ? "span 17" : "span 20" }}>
            Departamento
            <input
              list="public-jobs-department-options"
              placeholder="Todos"
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
            />
            <datalist id="public-jobs-department-options">
              {departments.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>
          <label style={{ gridColumn: companies.length > 0 ? "span 17" : "span 20" }}>
            Local
            <input
              list="public-jobs-location-options"
              placeholder="Todos"
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
            />
            <datalist id="public-jobs-location-options">
              {locations.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>
          <label style={{ gridColumn: companies.length > 0 ? "span 16" : "span 20" }}>
            Tipo
            <input
              list="public-jobs-employment-options"
              placeholder="Todos"
              value={employmentTypeFilter}
              onChange={(event) => setEmploymentTypeFilter(event.target.value)}
            />
            <datalist id="public-jobs-employment-options">
              {employmentTypes.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>
        </div>
      </div>

      <section className="public-tenant-jobs-grid">
        {filteredItems.map((job) => (
          <article className="card stack job-summary-card" key={job.id}>
            <div className="section-header">
              <h3 style={{ margin: 0 }}>{job.title}</h3>
            </div>
            <p className="job-card-summary">{summarizeHtml(job.description, 220)}</p>
            <p className="muted small">
              {job.companyName ? `${job.companyName} · ` : ""}
              {job.department ?? "Sem departamento"} | {job.location ?? "Sem local"} |{" "}
              {job.employmentType ?? "Não informado"}
            </p>
            <div className="row" style={{ marginTop: "auto", justifyContent: "flex-end" }}>
              <Link className="btn" href={`/vagas/${encodeURIComponent(tenantSlug)}/${encodeURIComponent(job.id)}`}>
                Ver detalhes
              </Link>
            </div>
          </article>
        ))}
      </section>

      {filteredItems.length === 0 && !error ? (
        <p className="muted">Nenhuma vaga encontrada com os filtros informados.</p>
      ) : null}
    </main>
  );
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

  return `${plain.slice(0, maxLength).trim()}…`;
}
