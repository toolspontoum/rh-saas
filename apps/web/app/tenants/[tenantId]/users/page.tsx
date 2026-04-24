"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { Breadcrumbs } from "../../../../components/breadcrumbs";
import { ConfirmModal } from "../../../../components/confirm-modal";
import { EmptyState } from "../../../../components/empty-state";
import { apiFetch } from "../../../../lib/api";
import { formatCpf, formatPhoneBr, isValidCpf, isValidPhoneBr, onlyDigits } from "../../../../lib/br-format";
import { roleLabel as toRoleLabel } from "../../../../lib/role-labels";

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

type BackofficeRole = "admin" | "manager" | "analyst";

type NewBackofficeUserForm = {
  fullName: string;
  email: string;
  role: BackofficeRole;
  cpf: string;
  phone: string;
};

type PendingAction =
  | { type: "status"; userId: string; status: "active" | "inactive" | "offboarded" }
  | { type: "delete"; userId: string };

const statusTabs: Array<{ label: string; value: "all" | "active" | "inactive" | "offboarded" }> = [
  { label: "Todos", value: "all" },
  { label: "Ativos", value: "active" },
  { label: "Inativos", value: "inactive" },
  { label: "Desligados", value: "offboarded" }
];

const backofficeRoleLabel: Record<BackofficeRole, string> = {
  admin: "Admin",
  manager: "RH",
  analyst: "Analista"
};

const formDefault: NewBackofficeUserForm = {
  fullName: "",
  email: "",
  role: "analyst",
  cpf: "",
  phone: ""
};

export default function TenantUsersPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;

  const [form, setForm] = useState<NewBackofficeUserForm>(formDefault);
  const [items, setItems] = useState<TenantUser[]>([]);
  const [statusTab, setStatusTab] = useState<"all" | "active" | "inactive" | "offboarded">("all");
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const isBackofficeUser = (user: TenantUser) =>
    user.roles.some((role) => ["owner", "admin", "manager", "analyst"].includes(role));

  async function loadUsers() {
    const q = new URLSearchParams({ page: "1", pageSize: "100" });
    if (statusTab !== "all") q.set("status", statusTab);
    if (search.trim()) q.set("search", search.trim());
    const response = await apiFetch<Paginated<TenantUser>>(`/v1/tenants/${tenantId}/users?${q.toString()}`);
    setItems((response.items ?? []).filter(isBackofficeUser));
  }

  useEffect(() => {
    loadUsers().catch((err: Error) => setError(err.message));
  }, [tenantId, statusTab, search]);

  const selectedUser = useMemo(() => {
    if (!pending) return null;
    return items.find((item) => item.userId === pending.userId) ?? null;
  }, [pending, items]);

  function validateForm(): string | null {
    if (!form.fullName.trim()) return "Informe o nome completo.";
    if (!form.email.trim()) return "Informe o e-mail.";
    if (form.cpf.trim()) {
      if (!isValidCpf(form.cpf)) return "CPF invalido.";
    }
    if (form.phone.trim() && !isValidPhoneBr(form.phone)) {
      return "Telefone invalido. Use DDD + 8 ou 9 digitos.";
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

    setSubmitting(true);
    try {
      await apiFetch(`/v1/tenants/${tenantId}/backoffice-users`, {
        method: "POST",
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          role: form.role,
          cpf: onlyDigits(form.cpf) || undefined,
          phone: onlyDigits(form.phone) || undefined
        })
      });
      setForm(formDefault);
      setOkMsg("Usuario de gestao salvo com sucesso.");
      await loadUsers();
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
      await loadUsers();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs items={[{ label: "Visao Geral", href: `/tenants/${tenantId}/dashboard` }, { label: "Usuarios" }]} />
      <h1>Usuarios de Gestao</h1>
      {error ? <p className="error">{error}</p> : null}
      {okMsg ? <p>{okMsg}</p> : null}

      <form className="card stack" onSubmit={handleCreate}>
        <h3>Novo usuario de backoffice</h3>
        <p className="muted">Cadastro exclusivo para perfis internos: Admin, RH e Analista.</p>

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
              onChange={(e) => setForm((c) => ({ ...c, role: e.target.value as BackofficeRole }))}
            >
              <option value="admin">Admin</option>
              <option value="manager">RH</option>
              <option value="analyst">Analista</option>
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
        {items.length === 0 ? (
          <EmptyState title="Sem usuarios de gestao" description="Nenhum usuario encontrado para os filtros atuais." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>CPF</th>
                <th>Status</th>
                <th>Perfis</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const roles = item.roles
                  .filter((role) => ["owner", "admin", "manager", "analyst"].includes(role))
                  .map((role) => {
                    if (role === "manager") return backofficeRoleLabel.manager;
                    if (role === "admin") return backofficeRoleLabel.admin;
                    if (role === "analyst") return backofficeRoleLabel.analyst;
                    return toRoleLabel(role);
                  });

                return (
                  <tr key={item.userId}>
                    <td>{item.fullName ?? "-"}</td>
                    <td>{item.email ?? "-"}</td>
                    <td>{item.cpf ?? "-"}</td>
                    <td>{item.status === "active" ? "Ativo" : item.status === "inactive" ? "Inativo" : "Desligado"}</td>
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
