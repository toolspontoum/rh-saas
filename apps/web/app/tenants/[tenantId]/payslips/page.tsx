"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { Breadcrumbs } from "../../../../components/breadcrumbs";
import { EmptyState } from "../../../../components/empty-state";
import { apiFetch } from "../../../../lib/api";
import { onlyDigits } from "../../../../lib/br-format";
import { useSavedState } from "../../../../lib/saved-state";

type Payslip = {
  id: string;
  collaboratorName: string;
  collaboratorEmail: string;
  contract: string | null;
  referenceMonth: string;
  fileName: string;
  createdAt: string;
  acknowledgedAt: string | null;
  acknowledgedByUserId: string | null;
  employeeUserId: string | null;
  aiLinkStatus?: string | null;
  aiLinkError?: string | null;
  extractedCpf?: string | null;
};

type Paginated<T> = { items: T[] };

type TenantContext = { roles: string[] };

function formatReferenceMonthBr(value: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value;
  return `${match[2]}/${match[1]}`;
}

export default function PayslipsPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;

  const [items, setItems] = useState<Payslip[]>([]);
  const [allItems, setAllItems] = useState<Payslip[]>([]);
  const [context, setContext] = useState<TenantContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [searchFilter, setSearchFilter] = useSavedState(`pays_search_${tenantId}`, "");
  const [contractFilter, setContractFilter] = useSavedState(`pays_contract_${tenantId}`, "");
  const [monthFilter, setMonthFilter] = useSavedState(`pays_month_${tenantId}`, "");
  const [dateFrom, setDateFrom] = useSavedState(`pays_from_${tenantId}`, "");
  const [dateTo, setDateTo] = useSavedState(`pays_to_${tenantId}`, "");

  const isManagement = useMemo(() => {
    const roles = context?.roles ?? [];
    return roles.some((role) => ["owner", "admin", "manager", "analyst"].includes(role));
  }, [context]);

  const isEmployeeOnly = useMemo(() => {
    const roles = context?.roles ?? [];
    return roles.length > 0 && roles.every((r) => r === "employee");
  }, [context]);

  const loadData = useCallback(async () => {
    const ctx = await apiFetch<TenantContext>(`/v1/tenants/${tenantId}/context`);
    setContext(ctx);

    const employeeOnly = ctx.roles.length > 0 && ctx.roles.every((r) => r === "employee");

    const q = new URLSearchParams({ page: "1", pageSize: "50" });
    if (employeeOnly) {
      q.set("mineOnly", "true");
    }
    if (contractFilter.trim()) q.set("contract", contractFilter.trim());
    if (monthFilter.trim()) q.set("referenceMonth", monthFilter.trim());

    const listData = await apiFetch<Paginated<Payslip>>(`/v1/tenants/${tenantId}/payslips?${q.toString()}`);

    let rows = listData.items ?? [];
    if (employeeOnly && (dateFrom || dateTo)) {
      rows = rows.filter((p) => {
        const t = new Date(p.createdAt).getTime();
        if (dateFrom) {
          const from = new Date(`${dateFrom}T00:00:00`).getTime();
          if (t < from) return false;
        }
        if (dateTo) {
          const to = new Date(`${dateTo}T23:59:59`).getTime();
          if (t > to) return false;
        }
        return true;
      });
    }

    setAllItems(rows);
    const normalized = searchFilter.trim().toLowerCase();
    if (!normalized) {
      setItems(rows);
      return;
    }
    const digits = onlyDigits(normalized);
    setItems(
      rows.filter((row) => {
        const name = row.collaboratorName.toLowerCase();
        const email = row.collaboratorEmail.toLowerCase();
        if (name.includes(normalized) || email.includes(normalized)) return true;
        if (digits.length >= 4) {
          const rowDigits = onlyDigits(`${row.collaboratorName} ${row.collaboratorEmail}`);
          return rowDigits.includes(digits);
        }
        return false;
      })
    );
  }, [
    tenantId,
    searchFilter,
    contractFilter,
    monthFilter,
    dateFrom,
    dateTo
  ]);

  const contractOptions = useMemo(() => {
    return Array.from(new Set(allItems.map((item) => (item.contract ?? "").trim()).filter(Boolean))).sort();
  }, [allItems]);

  useEffect(() => {
    loadData().catch((err: Error) => setError(err.message));
  }, [loadData]);

  async function acknowledge(id: string) {
    setError(null);
    setOkMsg(null);
    try {
      await apiFetch(`/v1/tenants/${tenantId}/payslips/${id}/acknowledge`, { method: "POST" });
      setOkMsg("Ciência do contracheque registrada.");
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Início", href: `/tenants/${tenantId}/dashboard` },
          { label: "Contracheques" }
        ]}
      />

      <div className="section-header">
        <h1>Contracheques</h1>
        {isManagement ? (
          <div className="row">
            <Link href={`/tenants/${tenantId}/payslips/upload`}>
              <button>Upload em lote</button>
            </Link>
          </div>
        ) : null}
      </div>

      {error ? <p className="error">{error}</p> : null}
      {okMsg ? <p>{okMsg}</p> : null}

      <div className="card stack">
        {isEmployeeOnly ? (
          <div className="payslips-filters-layout">
            <label>
              Busca
              <input
                placeholder="Nome, e-mail ou CPF"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </label>
            <div className="payslips-inline-row">
              <label style={{ flex: 1 }}>
                Contrato
                <select value={contractFilter} onChange={(e) => setContractFilter(e.target.value)}>
                  <option value="">Todos</option>
                  {contractOptions.map((contract) => (
                    <option key={contract} value={contract}>{contract}</option>
                  ))}
                </select>
              </label>
              <label style={{ flex: 1 }}>
                Mês de referência (AAAA-MM)
                <input
                  placeholder="2025-03"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                />
              </label>
            </div>
            <label>
              Data inicial (criação)
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </label>
            <label>
              Data final (criação)
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </label>
          </div>
        ) : (
          <div className="payslips-filters-layout">
            <label>
              Busca
              <input
                placeholder="Nome, e-mail ou CPF"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </label>
            <div className="payslips-inline-row">
              <label style={{ flex: 1 }}>
                Contrato
                <select value={contractFilter} onChange={(e) => setContractFilter(e.target.value)}>
                  <option value="">Todos</option>
                  {contractOptions.map((contract) => (
                    <option key={contract} value={contract}>{contract}</option>
                  ))}
                </select>
              </label>
              <label style={{ flex: 1 }}>
                Mês de referência (AAAA-MM)
                <input
                  placeholder="2025-03"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="card table-wrap">
        {items.length === 0 ? (
          <EmptyState title="Sem contracheques" description="Nenhum contracheque encontrado para os filtros aplicados." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Contrato</th>
                <th>Mês</th>
                <th>Arquivo</th>
                {isManagement ? <th>IA / CPF</th> : null}
                <th>Criado em</th>
                <th>Ciência</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.collaboratorName}</td>
                  <td>{item.collaboratorEmail}</td>
                  <td>{item.contract ?? "-"}</td>
                  <td>{formatReferenceMonthBr(item.referenceMonth)}</td>
                  <td>{item.fileName}</td>
                  {isManagement ? (
                    <td>
                      <span className="small">{item.aiLinkStatus ?? "—"}</span>
                      {item.extractedCpf ? (
                        <div className="small muted">CPF lido: {item.extractedCpf}</div>
                      ) : null}
                      {item.aiLinkError ? <div className="small error">{item.aiLinkError}</div> : null}
                    </td>
                  ) : null}
                  <td>{new Date(item.createdAt).toLocaleString("pt-BR")}</td>
                  <td>
                    {item.acknowledgedAt ? (
                      <span className="badge">Ciente em {new Date(item.acknowledgedAt).toLocaleDateString("pt-BR")}</span>
                    ) : (
                      <button className="secondary" onClick={() => acknowledge(item.id)}>
                        Confirmar ciência
                      </button>
                    )}
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
