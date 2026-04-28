"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { Breadcrumbs } from "../../../../components/breadcrumbs";
import { ConfirmModal } from "../../../../components/confirm-modal";
import { EmptyState } from "../../../../components/empty-state";
import { apiFetch } from "../../../../lib/api";
import { formatCpf, formatPhoneBr, isValidCpf, isValidPhoneBr, onlyDigits } from "../../../../lib/br-format";
import { roleLabel as toRoleLabel } from "../../../../lib/role-labels";
import { getStoredTenantCompanyId } from "../../../../lib/tenant-company-scope";

type TenantUser = {
  userId: string;
  email: string | null;
  fullName: string | null;
  cpf: string | null;
  phone: string | null;
  status: "active" | "inactive" | "offboarded";
  offboardReason: string | null;
  roles: string[];
};

type Paginated<T> = {
  items: T[];
};

type TenantCompany = {
  id: string;
  name: string;
  prepostoUserId?: string | null;
};

type MgmtRole = "admin" | "manager" | "analyst" | "preposto";

type NewMgmtUserForm = {
  fullName: string;
  email: string;
  role: MgmtRole;
  cpf: string;
  phone: string;
  prepostoCompanyId: string;
};

type PendingAction =
  | { type: "status"; userId: string; status: "active" | "inactive" | "offboarded" }
  | { type: "delete"; userId: string };

type StatusTab = "all" | "active" | "inactive" | "offboarded" | "preposto";

type PrepostoRow = TenantUser & {
  assignmentCompanyId: string;
  assignmentCompanyName: string;
  rowKey: string;
};

const statusTabs: Array<{ label: string; value: StatusTab }> = [
  { label: "Todos", value: "all" },
  { label: "Ativos", value: "active" },
  { label: "Inativos", value: "inactive" },
  { label: "Desligados", value: "offboarded" },
  { label: "Preposto", value: "preposto" }
];

const mgmtRoleLabel: Record<MgmtRole, string> = {
  admin: "Admin",
  manager: "RH",
  analyst: "Analista",
  preposto: "Preposto"
};

const formDefault = (prepostoCompanyId: string): NewMgmtUserForm => ({
  fullName: "",
  email: "",
  role: "analyst",
  cpf: "",
  phone: "",
  prepostoCompanyId
});

const isBackofficeMgmt = (user: TenantUser) =>
  user.roles.some((role) => ["owner", "admin", "manager", "analyst"].includes(role));

export default function TenantUsersPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params?.tenantId ?? "";

  const storedCompanyId = useMemo(() => getStoredTenantCompanyId(tenantId), [tenantId]);

  const [form, setForm] = useState<NewMgmtUserForm>(() => formDefault(storedCompanyId ?? ""));
  const [items, setItems] = useState<TenantUser[]>([]);
  const [prepostoRows, setPrepostoRows] = useState<PrepostoRow[]>([]);
  const [companies, setCompanies] = useState<TenantCompany[]>([]);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    setForm((f) => ({ ...f, prepostoCompanyId: storedCompanyId ?? f.prepostoCompanyId }));
  }, [storedCompanyId]);

  useEffect(() => {
    const onCompany = () => {
      const id = getStoredTenantCompanyId(tenantId) ?? "";
      setForm((f) => ({ ...f, prepostoCompanyId: id }));
    };
    window.addEventListener("vv-tenant-company-changed", onCompany);
    return () => window.removeEventListener("vv-tenant-company-changed", onCompany);
  }, [tenantId]);

  const loadCompanies = useCallback(async () => {
    const list = await apiFetch<TenantCompany[]>(`/v1/tenants/${tenantId}/companies`);
    setCompanies(list ?? []);
    return list ?? [];
  }, [tenantId]);

  const loadData = useCallback(async () => {
    const q = new URLSearchParams({ page: "1", pageSize: "250" });
    if (statusTab !== "all" && statusTab !== "preposto") q.set("status", statusTab);
    if (search.trim()) q.set("search", search.trim());

    if (statusTab === "preposto") {
      const [co, response] = await Promise.all([
        loadCompanies(),
        apiFetch<Paginated<TenantUser>>(`/v1/tenants/${tenantId}/users?${q.toString()}`)
      ]);
      const users = response.items ?? [];
      const byId = new Map(users.map((u) => [u.userId, u]));
      const sid = getStoredTenantCompanyId(tenantId);
      const expanded: PrepostoRow[] = [];
      for (const c of co) {
        if (!c.prepostoUserId) continue;
        if (sid && c.id !== sid) continue;
        const u = byId.get(c.prepostoUserId);
        if (!u) continue;
        expanded.push({
          ...u,
          assignmentCompanyId: c.id,
          assignmentCompanyName: c.name,
          rowKey: `${u.userId}-${c.id}`
        });
      }
      setPrepostoRows(expanded);
      setItems([]);
      return;
    }

    const response = await apiFetch<Paginated<TenantUser>>(`/v1/tenants/${tenantId}/users?${q.toString()}`);
    setItems((response.items ?? []).filter(isBackofficeMgmt));
    setPrepostoRows([]);
  }, [tenantId, statusTab, search, loadCompanies]);

  useEffect(() => {
    loadData().catch((err: Error) => setError(err.message));
  }, [loadData]);

  useEffect(() => {
    if (form.role !== "preposto") return;
    if (storedCompanyId) return;
    loadCompanies().catch(() => {});
  }, [form.role, storedCompanyId, loadCompanies]);

  const selectedUser = useMemo(() => {
    if (!pending) return null;
    const fromList = items.find((item) => item.userId === pending.userId);
    if (fromList) return fromList;
    return prepostoRows.find((item) => item.userId === pending.userId) ?? null;
  }, [pending, items, prepostoRows]);

  function validateForm(): string | null {
    if (!form.fullName.trim()) return "Informe o nome completo.";
    if (!form.email.trim()) return "Informe o e-mail.";
    if (form.cpf.trim()) {
      if (!isValidCpf(form.cpf)) return "CPF invalido.";
    }
    if (form.phone.trim() && !isValidPhoneBr(form.phone)) {
      return "Telefone invalido. Use DDD + 8 ou 9 digitos.";
    }
    if (form.role === "preposto") {
      const pc = storedCompanyId ?? form.prepostoCompanyId.trim();
      if (!pc) return "Selecione a empresa/projeto do preposto (painel lateral ou lista abaixo).";
    }
    return null;
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setOkMsg(null);
    const validation = validateForm();
    if (validation) {
      setError(validation);
      return;
    }

    const prepostoCompanyId =
      form.role === "preposto" ? (storedCompanyId ?? form.prepostoCompanyId.trim()) || undefined : undefined;
    const createdAsPreposto = form.role === "preposto";

    setSubmitting(true);
    try {
      await apiFetch(`/v1/tenants/${tenantId}/backoffice-users`, {
        method: "POST",
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          role: form.role,
          cpf: onlyDigits(form.cpf) || undefined,
          phone: onlyDigits(form.phone) || undefined,
          ...(createdAsPreposto && prepostoCompanyId ? { prepostoCompanyId } : {})
        })
      });
      setForm(formDefault(storedCompanyId ?? ""));
      setOkMsg(
        createdAsPreposto
          ? "Preposto convidado e vinculado ao projeto."
          : "Usuario de gestao salvo com sucesso."
      );
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function runPendingAction() {
    if (!pending) return;
    if ((pending.type === "status" && pending.status === "offboarded") || pending.type === "delete") {
      if (reason.trim().length < 5) {
        setError("Informe um motivo com pelo menos 5 caracteres.");
        return;
      }
    }

    setError(null);
    setBusyUserId(pending.userId);
    try {
      if (pending.type === "status") {
        await apiFetch(`/v1/tenants/${tenantId}/users/${pending.userId}/status`, {
          method: "PATCH",
          body: JSON.stringify({
            status: pending.status,
            reason: pending.status === "offboarded" ? reason : undefined
          })
        });
      } else {
        await apiFetch(`/v1/tenants/${tenantId}/users/${pending.userId}`, {
          method: "DELETE",
          body: JSON.stringify({ reason })
        });
      }

      setPending(null);
      setReason("");
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyUserId(null);
    }
  }

  const tableRows: Array<TenantUser & { assignmentCompanyName?: string; rowKey: string }> =
    statusTab === "preposto"
      ? prepostoRows
      : items.map((u) => ({ ...u, rowKey: u.userId }));

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs items={[{ label: "Visao Geral", href: `/tenants/${tenantId}/dashboard` }, { label: "Usuarios" }]} />
      <h1>Usuarios de Gestao</h1>
      {error ? <p className="error">{error}</p> : null}
      {okMsg ? <p>{okMsg}</p> : null}

      <form className="card stack" onSubmit={handleCreate}>
        <h3>Novo usuario de gestao</h3>
        <p className="muted">
          Perfis internos: Admin, RH, Analista ou Preposto. O preposto fica vinculado ao contrato (empresa/projeto)
          indicado.
        </p>
        {!storedCompanyId && form.role !== "preposto" ? (
          <p className="muted small">
            Com <strong>Empresa / projeto</strong> em <strong>Todas</strong>, o convite vale para todo o assinante; o
            cadastro base no sistema usa o primeiro projeto da lista (ordenacao interna).
          </p>
        ) : null}

        <div className="form-grid form-grid-2">
          <label>
            Nome completo
            <input value={form.fullName} onChange={(e) => setForm((c) => ({ ...c, fullName: e.target.value }))} />
          </label>
          <label>
            E-mail
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
            />
          </label>
          <label>
            Perfil de acesso
            <select
              value={form.role}
              onChange={(e) => {
                const role = e.target.value as MgmtRole;
                setForm((c) => ({
                  ...c,
                  role,
                  prepostoCompanyId: storedCompanyId ?? c.prepostoCompanyId
                }));
              }}
            >
              <option value="admin">Admin</option>
              <option value="manager">RH</option>
              <option value="analyst">Analista</option>
              <option value="preposto">Preposto</option>
            </select>
          </label>
          <label>
            CPF (opcional)
            <input value={form.cpf} onChange={(e) => setForm((c) => ({ ...c, cpf: formatCpf(e.target.value) }))} />
          </label>
          <label>
            Telefone (opcional)
            <input
              value={form.phone}
              onChange={(e) => setForm((c) => ({ ...c, phone: formatPhoneBr(e.target.value) }))}
            />
          </label>
        </div>

        {form.role === "preposto" && !storedCompanyId ? (
          <label className="stack">
            Empresa / projeto do preposto
            <select
              value={form.prepostoCompanyId}
              onChange={(e) => setForm((c) => ({ ...c, prepostoCompanyId: e.target.value }))}
              style={{ color: "#000" }}
            >
              <option value="">— Selecione —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id} style={{ color: "#000" }}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className="muted small">
              Se ja houver uma empresa selecionada no menu lateral, o preposto sera vinculado a ela automaticamente.
            </span>
          </label>
        ) : form.role === "preposto" && storedCompanyId ? (
          <p className="muted small">
            Preposto sera vinculado a empresa/projeto selecionada no menu lateral:{" "}
            <strong>{companies.find((c) => c.id === storedCompanyId)?.name ?? storedCompanyId}</strong>
          </p>
        ) : null}

        <button type="submit" disabled={submitting}>
          {submitting ? "Salvando..." : "Salvar usuario"}
        </button>
      </form>

      <div className="card stack">
        <div className="row">
          {statusTabs.map((tab) => (
            <button
              type="button"
              key={tab.value}
              className={tab.value === statusTab ? "" : "secondary"}
              onClick={() => setStatusTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input placeholder="Buscar por nome ou e-mail" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>

      <div className="card table-wrap">
        {tableRows.length === 0 ? (
          <EmptyState
            title={statusTab === "preposto" ? "Sem prepostos" : "Sem usuarios de gestao"}
            description="Nenhum usuario encontrado para os filtros atuais."
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>CPF</th>
                <th>Status</th>
                {statusTab === "preposto" ? <th>Empresa / projeto</th> : null}
                <th>Perfis</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((item) => {
                const roles = item.roles
                  .filter((role) => ["owner", "admin", "manager", "analyst", "preposto"].includes(role))
                  .map((role) => {
                    if (role === "manager") return mgmtRoleLabel.manager;
                    if (role === "admin") return mgmtRoleLabel.admin;
                    if (role === "analyst") return mgmtRoleLabel.analyst;
                    if (role === "preposto") return mgmtRoleLabel.preposto;
                    return toRoleLabel(role);
                  });

                return (
                  <tr key={item.rowKey}>
                    <td>{item.fullName ?? "-"}</td>
                    <td>{item.email ?? "-"}</td>
                    <td>{item.cpf ?? "-"}</td>
                    <td>{item.status === "active" ? "Ativo" : item.status === "inactive" ? "Inativo" : "Desligado"}</td>
                    {statusTab === "preposto" ? (
                      <td>{(item as PrepostoRow).assignmentCompanyName ?? "-"}</td>
                    ) : null}
                    <td>{roles.join(", ") || "-"}</td>
                    <td>
                      <div className="row">
                        <button
                          type="button"
                          className="secondary"
                          disabled={busyUserId === item.userId}
                          onClick={() => setPending({ type: "status", userId: item.userId, status: "active" })}
                        >
                          Ativar
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          disabled={busyUserId === item.userId}
                          onClick={() => setPending({ type: "status", userId: item.userId, status: "inactive" })}
                        >
                          Inativar
                        </button>
                        <button
                          type="button"
                          disabled={busyUserId === item.userId}
                          onClick={() => setPending({ type: "status", userId: item.userId, status: "offboarded" })}
                        >
                          Desligar
                        </button>
                        <button
                          type="button"
                          className="danger"
                          disabled={busyUserId === item.userId}
                          onClick={() => setPending({ type: "delete", userId: item.userId })}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        open={!!pending}
        title={pending?.type === "delete" ? "Excluir usuario" : "Confirmar alteracao de status"}
        message={
          pending?.type === "delete"
            ? `Tem certeza que deseja excluir ${selectedUser?.fullName ?? "este usuario"}?`
            : `Confirmar alteracao para ${pending?.type === "status" ? pending.status : "status"} de ${
                selectedUser?.fullName ?? "este usuario"
              }?`
        }
        confirmLabel={pending?.type === "delete" ? "Excluir" : "Confirmar"}
        danger={pending?.type === "delete"}
        busy={busyUserId !== null}
        busyLabel="A processar..."
        onCancel={() => {
          if (busyUserId) return;
          setPending(null);
          setReason("");
        }}
        onConfirm={() => void runPendingAction()}
      >
        {pending?.type === "delete" || pending?.status === "offboarded" ? (
          <textarea
            placeholder="Motivo (minimo 5 caracteres)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        ) : null}
      </ConfirmModal>
    </main>
  );
}
