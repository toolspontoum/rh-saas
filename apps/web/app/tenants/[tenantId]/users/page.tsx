"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Mail, Pencil } from "lucide-react";

import { Breadcrumbs } from "../../../../components/breadcrumbs";
import { ConfirmModal } from "../../../../components/confirm-modal";
import { EmptyState } from "../../../../components/empty-state";
import { SortableTh } from "../../../../components/sortable-table-head";
import { apiFetch } from "../../../../lib/api";
import { useTableSort } from "../../../../lib/table-sort";
import { formatCpf, formatPhoneBr, isValidCpf, isValidPhoneBr, onlyDigits } from "../../../../lib/br-format";
import { roleLabel as toRoleLabel } from "../../../../lib/role-labels";
import { getStoredTenantCompanyId } from "../../../../lib/tenant-company-scope";

type TenantUser = {
  userId: string;
  companyId?: string | null;
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

type MgmtUserForm = {
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

type EditorMode = { type: "create" } | { type: "edit"; user: TenantUser; assignmentCompanyId?: string };

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

const formDefault = (prepostoCompanyId: string): MgmtUserForm => ({
  fullName: "",
  email: "",
  role: "analyst",
  cpf: "",
  phone: "",
  prepostoCompanyId
});

const isBackofficeMgmt = (user: TenantUser) =>
  user.roles.some((role) => ["owner", "admin", "manager", "analyst", "preposto"].includes(role));

function mgmtStatusLabel(status: TenantUser["status"]): string {
  if (status === "active") return "Ativo";
  if (status === "inactive") return "Inativo";
  return "Desligado";
}

function formatMgmtRoles(user: TenantUser): string {
  return user.roles
    .filter((role) => ["owner", "admin", "manager", "analyst", "preposto"].includes(role))
    .map((role) => {
      if (role === "manager") return mgmtRoleLabel.manager;
      if (role === "admin") return mgmtRoleLabel.admin;
      if (role === "analyst") return mgmtRoleLabel.analyst;
      if (role === "preposto") return mgmtRoleLabel.preposto;
      return toRoleLabel(role);
    })
    .join(", ");
}

function primaryMgmtRole(user: TenantUser): MgmtRole {
  if (user.roles.includes("admin")) return "admin";
  if (user.roles.includes("manager")) return "manager";
  if (user.roles.includes("analyst")) return "analyst";
  if (user.roles.includes("preposto")) return "preposto";
  return "analyst";
}

export default function TenantUsersPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params?.tenantId ?? "";

  const storedCompanyId = useMemo(() => getStoredTenantCompanyId(tenantId), [tenantId]);

  const [form, setForm] = useState<MgmtUserForm>(() => formDefault(storedCompanyId ?? ""));
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [items, setItems] = useState<TenantUser[]>([]);
  const [prepostoRows, setPrepostoRows] = useState<PrepostoRow[]>([]);
  const [companies, setCompanies] = useState<TenantCompany[]>([]);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [passwordResetUserId, setPasswordResetUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!editor) return;
    setForm((f) => ({ ...f, prepostoCompanyId: storedCompanyId ?? f.prepostoCompanyId }));
  }, [storedCompanyId, editor]);

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
        apiFetch<Paginated<TenantUser>>(`/v1/tenants/${tenantId}/users?${q.toString()}&includeAuthMeta=true`)
      ]);
      const users = response.items ?? [];
      const byId = new Map(users.map((u) => [u.userId, u]));
      const sid = getStoredTenantCompanyId(tenantId);
      const companyName = (id: string | null | undefined) =>
        co.find((c) => c.id === id)?.name ?? "—";

      const expanded: PrepostoRow[] = [];
      const seen = new Set<string>();

      for (const c of co) {
        if (!c.prepostoUserId) continue;
        if (sid && c.id !== sid) continue;
        const u =
          byId.get(c.prepostoUserId) ??
          users.find((item) => item.userId === c.prepostoUserId) ??
          null;
        if (!u) continue;
        const rowKey = `${u.userId}-${c.id}`;
        if (seen.has(rowKey)) continue;
        seen.add(rowKey);
        expanded.push({
          ...u,
          assignmentCompanyId: c.id,
          assignmentCompanyName: c.name,
          rowKey
        });
      }

      for (const u of users) {
        if (!u.roles.includes("preposto")) continue;
        const linked = co.filter((c) => c.prepostoUserId === u.userId);
        if (linked.length > 0) {
          for (const c of linked) {
            if (sid && c.id !== sid) continue;
            const rowKey = `${u.userId}-${c.id}`;
            if (seen.has(rowKey)) continue;
            seen.add(rowKey);
            expanded.push({
              ...u,
              assignmentCompanyId: c.id,
              assignmentCompanyName: c.name,
              rowKey
            });
          }
          continue;
        }

        if (sid && u.companyId !== sid) continue;
        const rowKey = `${u.userId}-${u.companyId ?? "role"}`;
        if (seen.has(rowKey)) continue;
        seen.add(rowKey);
        expanded.push({
          ...u,
          assignmentCompanyId: u.companyId ?? "",
          assignmentCompanyName: companyName(u.companyId),
          rowKey
        });
      }

      setPrepostoRows(expanded);
      setItems([]);
      return;
    }

    const response = await apiFetch<Paginated<TenantUser>>(
      `/v1/tenants/${tenantId}/users?${q.toString()}&includeAuthMeta=true`
    );
    setItems((response.items ?? []).filter(isBackofficeMgmt));
    setPrepostoRows([]);
  }, [tenantId, statusTab, search, loadCompanies]);

  useEffect(() => {
    loadData().catch((err: Error) => setError(err.message));
  }, [loadData]);

  useEffect(() => {
    if (!editor) return;
    if (form.role !== "preposto") return;
    if (storedCompanyId) return;
    loadCompanies().catch(() => {});
  }, [editor, form.role, storedCompanyId, loadCompanies]);

  const selectedUser = useMemo(() => {
    if (!pending) return null;
    const fromList = items.find((item) => item.userId === pending.userId);
    if (fromList) return fromList;
    return prepostoRows.find((item) => item.userId === pending.userId) ?? null;
  }, [pending, items, prepostoRows]);

  function openCreateModal() {
    setFormError(null);
    setError(null);
    setForm(formDefault(storedCompanyId ?? ""));
    setEditor({ type: "create" });
    if (!storedCompanyId) {
      void loadCompanies().catch(() => {});
    }
  }

  function openEditModal(user: TenantUser, assignmentCompanyId?: string) {
    if (user.roles.includes("owner")) {
      setError("O perfil owner nao pode ser editado por esta tela.");
      return;
    }
    setFormError(null);
    setError(null);
    const role = primaryMgmtRole(user);
    const companyFromLink =
      assignmentCompanyId ||
      companies.find((c) => c.prepostoUserId === user.userId)?.id ||
      user.companyId ||
      storedCompanyId ||
      "";
    setForm({
      fullName: user.fullName ?? "",
      email: user.email ?? "",
      role,
      cpf: formatCpf(user.cpf ?? ""),
      phone: formatPhoneBr(user.phone ?? ""),
      prepostoCompanyId: companyFromLink
    });
    setEditor({ type: "edit", user, assignmentCompanyId: companyFromLink || undefined });
    if (role === "preposto" && !storedCompanyId) {
      void loadCompanies().catch(() => {});
    }
  }

  function closeEditor() {
    if (submitting) return;
    setEditor(null);
    setFormError(null);
    setForm(formDefault(storedCompanyId ?? ""));
  }

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setOkMsg(null);
    const validation = validateForm();
    if (validation) {
      setFormError(validation);
      return;
    }
    if (!editor) return;

    const prepostoCompanyId =
      form.role === "preposto" ? (storedCompanyId ?? form.prepostoCompanyId.trim()) || undefined : undefined;
    const createdAsPreposto = form.role === "preposto";
    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      cpf: onlyDigits(form.cpf) || undefined,
      phone: onlyDigits(form.phone) || undefined,
      ...(createdAsPreposto && prepostoCompanyId ? { prepostoCompanyId } : {})
    };

    setSubmitting(true);
    try {
      if (editor.type === "create") {
        await apiFetch(`/v1/tenants/${tenantId}/backoffice-users`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        setOkMsg(
          createdAsPreposto
            ? "Preposto convidado e vinculado ao projeto."
            : "Usuario de gestao salvo com sucesso."
        );
      } else {
        await apiFetch(`/v1/tenants/${tenantId}/backoffice-users/${editor.user.userId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        setOkMsg("Usuario de gestao atualizado com sucesso.");
      }
      setEditor(null);
      setForm(formDefault(storedCompanyId ?? ""));
      await loadData();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function sendPasswordResetEmail(userId: string) {
    setPasswordResetUserId(userId);
    setError(null);
    setOkMsg(null);
    try {
      await apiFetch(`/v1/tenants/${tenantId}/users/${userId}/password-reset-email`, { method: "POST" });
      setOkMsg("E-mail de redefinicao de senha enviado.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPasswordResetUserId(null);
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

  const tableRows: Array<TenantUser & { assignmentCompanyName?: string; assignmentCompanyId?: string; rowKey: string }> =
    statusTab === "preposto"
      ? prepostoRows
      : items.map((u) => ({ ...u, rowKey: u.userId }));

  const sortGetters = useMemo(
    () => ({
      fullName: (item: TenantUser) => item.fullName,
      email: (item: TenantUser) => item.email,
      cpf: (item: TenantUser) => item.cpf,
      status: (item: TenantUser) => mgmtStatusLabel(item.status),
      company: (item: TenantUser & { assignmentCompanyName?: string }) => item.assignmentCompanyName,
      roles: (item: TenantUser) => formatMgmtRoles(item)
    }),
    []
  );

  const { sort, toggleSort, sortedRows } = useTableSort(tableRows, sortGetters, "fullName");

  const editorTitle = editor?.type === "edit" ? "Editar usuario de gestao" : "Novo usuario de gestao";

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs items={[{ label: "Visao Geral", href: `/tenants/${tenantId}/dashboard` }, { label: "Usuarios" }]} />
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Usuarios de Gestao</h1>
        <button type="button" onClick={openCreateModal}>
          Novo Usuario
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {okMsg ? <p>{okMsg}</p> : null}

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
                <SortableTh label="Nome" column="fullName" sortColumn={sort.column} sortDirection={sort.direction} onSort={toggleSort} />
                <SortableTh label="E-mail" column="email" sortColumn={sort.column} sortDirection={sort.direction} onSort={toggleSort} />
                <SortableTh label="CPF" column="cpf" sortColumn={sort.column} sortDirection={sort.direction} onSort={toggleSort} />
                <SortableTh label="Status" column="status" sortColumn={sort.column} sortDirection={sort.direction} onSort={toggleSort} />
                {statusTab === "preposto" ? (
                  <SortableTh label="Empresa / projeto" column="company" sortColumn={sort.column} sortDirection={sort.direction} onSort={toggleSort} />
                ) : null}
                <SortableTh label="Perfis" column="roles" sortColumn={sort.column} sortDirection={sort.direction} onSort={toggleSort} />
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((item) => {
                const rolesLabel = formatMgmtRoles(item);
                const canEdit = !item.roles.includes("owner");

                return (
                  <tr key={item.rowKey}>
                    <td>{item.fullName ?? "-"}</td>
                    <td>{item.email ?? "-"}</td>
                    <td>{item.cpf ?? "-"}</td>
                    <td>{mgmtStatusLabel(item.status)}</td>
                    {statusTab === "preposto" ? (
                      <td>{(item as PrepostoRow).assignmentCompanyName ?? "-"}</td>
                    ) : null}
                    <td>{rolesLabel || "-"}</td>
                    <td>
                      <div className="row">
                        <button
                          type="button"
                          className="secondary"
                          title="Editar"
                          aria-label="Editar"
                          disabled={!canEdit || busyUserId === item.userId}
                          onClick={() =>
                            openEditModal(
                              item,
                              "assignmentCompanyId" in item
                                ? (item as PrepostoRow).assignmentCompanyId
                                : undefined
                            )
                          }
                        >
                          <span className="row" style={{ alignItems: "center", gap: 6 }}>
                            <Pencil size={14} aria-hidden />
                            Editar
                          </span>
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          title="Enviar link de redefinicao de senha"
                          aria-label="Enviar link de redefinicao de senha"
                          disabled={
                            !item.email?.trim() ||
                            busyUserId === item.userId ||
                            passwordResetUserId === item.userId
                          }
                          onClick={() => void sendPasswordResetEmail(item.userId)}
                        >
                          <Mail size={16} aria-hidden />
                        </button>
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

      {editor ? (
        <div className="modal-backdrop" role="presentation" onClick={closeEditor}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={editorTitle}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 720, width: "min(720px, 96vw)" }}
          >
            <div className="section-header">
              <h3>{editorTitle}</h3>
              <button type="button" className="secondary" disabled={submitting} onClick={closeEditor}>
                Fechar
              </button>
            </div>
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
            {formError ? <p className="error">{formError}</p> : null}

            <form className="stack" onSubmit={handleSubmit}>
              <div className="form-grid form-grid-2">
                <label>
                  Nome completo
                  <input
                    value={form.fullName}
                    onChange={(e) => setForm((c) => ({ ...c, fullName: e.target.value }))}
                    disabled={submitting}
                  />
                </label>
                <label>
                  E-mail
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
                    disabled={submitting}
                  />
                </label>
                <label>
                  Perfil de acesso
                  <select
                    value={form.role}
                    disabled={submitting}
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
                  <input
                    value={form.cpf}
                    onChange={(e) => setForm((c) => ({ ...c, cpf: formatCpf(e.target.value) }))}
                    disabled={submitting}
                  />
                </label>
                <label>
                  Telefone (opcional)
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((c) => ({ ...c, phone: formatPhoneBr(e.target.value) }))}
                    disabled={submitting}
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
                    disabled={submitting}
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

              <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className="secondary" disabled={submitting} onClick={closeEditor}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting}>
                  {submitting ? "Salvando..." : editor.type === "edit" ? "Salvar alteracoes" : "Salvar usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

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
