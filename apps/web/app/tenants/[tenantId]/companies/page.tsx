"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { Breadcrumbs } from "../../../../components/breadcrumbs";
import { apiFetch } from "../../../../lib/api";

type TenantCompany = {
  id: string;
  tenantId: string;
  name: string;
  taxId: string | null;
  prepostoUserId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function TenantCompaniesPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;
  const [items, setItems] = useState<TenantCompany[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [createName, setCreateName] = useState("");
  const [createTaxId, setCreateTaxId] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const data = await apiFetch<TenantCompany[]>(`/v1/tenants/${tenantId}/companies`);
      setItems(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarregar só ao mudar o tenant
  }, [tenantId]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await apiFetch<TenantCompany>(`/v1/tenants/${tenantId}/companies`, {
        method: "POST",
        body: JSON.stringify({
          name: createName.trim(),
          taxId: createTaxId.trim() || null
        })
      });
      setCreateName("");
      setCreateTaxId("");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onUpdate(company: TenantCompany, name: string, taxId: string) {
    setError(null);
    try {
      await apiFetch<TenantCompany>(`/v1/tenants/${tenantId}/companies/${company.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          taxId: taxId.trim() || null
        })
      });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onDelete(companyId: string) {
    if (!window.confirm("Excluir esta empresa/projeto? Só é permitido se não houver dados vinculados.")) return;
    setError(null);
    try {
      await apiFetch<{ ok: true }>(`/v1/tenants/${tenantId}/companies/${companyId}`, {
        method: "DELETE"
      });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Início", href: `/tenants/${tenantId}/dashboard` },
          { label: "Empresas / projetos" }
        ]}
      />
      <h1>Empresas e projetos</h1>
      <p className="muted">
        Cada registro representa uma empresa ou projeto dentro do assinante. O escopo do painel (vagas, holerites,
        usuários) usa a seleção no menu lateral.
      </p>
      {error ? <p className="error">{error}</p> : null}

      <div className="card stack">
        <h2 style={{ margin: 0 }}>Nova empresa / projeto</h2>
        <form className="stack" onSubmit={onCreate}>
          <input
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="Nome (obrigatório)"
            required
            minLength={2}
          />
          <input
            value={createTaxId}
            onChange={(e) => setCreateTaxId(e.target.value)}
            placeholder="CNPJ ou identificador fiscal (opcional)"
          />
          <button type="submit" className="btn">
            Cadastrar
          </button>
        </form>
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>Cadastradas</h2>
        {loading ? <p className="muted">Carregando…</p> : null}
        {!loading && items.length === 0 ? <p className="muted">Nenhuma empresa cadastrada.</p> : null}
        <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.map((company) => (
            <CompanyRow key={company.id} company={company} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </ul>
      </div>
    </main>
  );
}

function CompanyRow({
  company,
  onUpdate,
  onDelete
}: {
  company: TenantCompany;
  onUpdate: (company: TenantCompany, name: string, taxId: string) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(company.name);
  const [taxId, setTaxId] = useState(company.taxId ?? "");

  useEffect(() => {
    setName(company.name);
    setTaxId(company.taxId ?? "");
  }, [company.name, company.taxId]);

  return (
    <li className="card stack" style={{ padding: 12 }}>
      <div className="row" style={{ flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
        <label className="stack" style={{ flex: "1 1 200px" }}>
          Nome
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="stack" style={{ flex: "1 1 200px" }}>
          CNPJ / ID fiscal
          <input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="Opcional" />
        </label>
        <button type="button" className="btn" onClick={() => onUpdate(company, name, taxId)}>
          Salvar
        </button>
        <button type="button" className="secondary" onClick={() => onDelete(company.id)}>
          Excluir
        </button>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        ID: {company.id}
      </p>
    </li>
  );
}
