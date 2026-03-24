"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Eye, Pencil, Trash2 } from "lucide-react";

import { Breadcrumbs } from "../../../../components/breadcrumbs";
import { EmptyState } from "../../../../components/empty-state";
import { apiFetch } from "../../../../lib/api";

type TenantUser = {
  userId: string;
  email: string | null;
  fullName: string | null;
  cpf: string | null;
  phone: string | null;
  status: "active" | "inactive" | "offboarded";
  roles: string[];
};

type EmployeeProfile = {
  contractType: string | null;
  department: string | null;
  positionTitle: string | null;
};

type Paginated<T> = { items: T[] };

export default function CollaboratorListPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;

  const [items, setItems] = useState<TenantUser[]>([]);
  const [profiles, setProfiles] = useState<Record<string, EmployeeProfile>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "offboarded">("all");
  const [contractFilter, setContractFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    const data = await apiFetch<Paginated<TenantUser>>(`/v1/tenants/${tenantId}/users?page=1&pageSize=100`);
    const allUsers = data.items ?? [];
    const entries = await Promise.all(
      allUsers.map(async (item) => {
        try {
          const profile = await apiFetch<EmployeeProfile | null>(
            `/v1/tenants/${tenantId}/employee-profile?targetUserId=${item.userId}`
          );
          return [item.userId, profile] as const;
        } catch {
          return [item.userId, null] as const;
        }
      })
    );

    const next: Record<string, EmployeeProfile> = {};
    for (const [userId, profile] of entries) {
      if (profile) next[userId] = profile;
    }
    setProfiles(next);
    const collaborators = allUsers.filter((item) => item.roles.includes("employee") || Boolean(next[item.userId]));
    setItems(collaborators);
  }

  useEffect(() => {
    loadData().catch((err: Error) => setError(err.message));
  }, [tenantId]);

  const contracts = useMemo(() => {
    return Array.from(
      new Set(
        items
          .map((item) => profiles[item.userId]?.contractType?.trim())
          .filter((value): value is string => !!value)
      )
    ).sort();
  }, [items, profiles]);

  const departments = useMemo(() => {
    return Array.from(
      new Set(
        items
          .map((item) => profiles[item.userId]?.department?.trim())
          .filter((value): value is string => !!value)
      )
    ).sort();
  }, [items, profiles]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const profile = profiles[item.userId];
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (contractFilter !== "all" && (profile?.contractType ?? "") !== contractFilter) return false;
      if (departmentFilter !== "all" && (profile?.department ?? "") !== departmentFilter) return false;
      if (search.trim()) {
        const haystack = `${item.fullName ?? ""} ${item.email ?? ""} ${item.cpf ?? ""} ${item.phone ?? ""}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [items, profiles, statusFilter, contractFilter, departmentFilter, search]);

  async function removeCollaborator(userId: string) {
    const reason = window.prompt("Informe o motivo da exclusão (mínimo 5 caracteres):", "");
    if (!reason) return;
    if (reason.trim().length < 5) {
      setError("Motivo inválido para exclusão.");
      return;
    }

    setError(null);
    try {
      await apiFetch(`/v1/tenants/${tenantId}/users/${userId}`, {
        method: "DELETE",
        body: JSON.stringify({ reason: reason.trim() })
      });
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs items={[{ label: "Visão Geral", href: `/tenants/${tenantId}/dashboard` }, { label: "Colaboradores" }]} />
      <div className="section-header">
        <h1>Colaboradores / Funcionários</h1>
        <Link className="btn" href={`/tenants/${tenantId}/onboarding`}>
          Novo Colaborador
        </Link>
      </div>
      {error ? <p className="error">{error}</p> : null}

      <div className="card stack">
        <input
          placeholder="Buscar por nome, e-mail, CPF ou telefone"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="collaborator-filters-row">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="all">Status</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="offboarded">Desligado</option>
          </select>
          <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
            <option value="all">Departamento</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select value={contractFilter} onChange={(e) => setContractFilter(e.target.value)}>
            <option value="all">Contrato</option>
            {contracts.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card table-wrap">
        {filtered.length === 0 ? (
          <EmptyState title="Sem colaboradores" description="Nenhum colaborador encontrado para os filtros aplicados." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>CPF</th>
                <th>Telefone</th>
                <th>Departamento</th>
                <th>Contrato</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const profile = profiles[item.userId];
                return (
                  <tr key={item.userId}>
                    <td>{item.fullName ?? "-"}</td>
                    <td>{item.email ?? "-"}</td>
                    <td>{item.cpf ?? "-"}</td>
                    <td>{item.phone ?? "-"}</td>
                    <td>{profile?.department ?? "-"}</td>
                    <td>{profile?.contractType ?? "-"}</td>
                    <td>{item.status === "active" ? "Ativo" : item.status === "inactive" ? "Inativo" : "Desligado"}</td>
                    <td>
                      <div className="row">
                        <Link href={`/tenants/${tenantId}/collaborator/${item.userId}`} className="icon-btn" title="Visualizar" aria-label="Visualizar"><Eye size={16} /></Link>
                        <Link href={`/tenants/${tenantId}/collaborator/${item.userId}?mode=edit`} className="icon-btn" title="Editar" aria-label="Editar"><Pencil size={16} /></Link>
                        <button className="icon-btn icon-danger" title="Excluir" aria-label="Excluir" onClick={() => removeCollaborator(item.userId)}><Trash2 size={16} /></button>
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
