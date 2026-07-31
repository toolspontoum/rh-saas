"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Eye, Mail, Pencil, Trash2 } from "lucide-react";

import { Breadcrumbs } from "../../../../components/breadcrumbs";
import { ConfirmModal } from "../../../../components/confirm-modal";
import { EmptyState } from "../../../../components/empty-state";
import { SortableTh } from "../../../../components/sortable-table-head";
import { apiFetch } from "../../../../lib/api";
import { useTableSort } from "../../../../lib/table-sort";

type TenantUser = {
  userId: string;
  email: string | null;
  fullName: string | null;
  cpf: string | null;
  phone: string | null;
  status: "active" | "inactive" | "offboarded";
  roles: string[];
  companyId?: string | null;
  lastSignInAt?: string | null;
  /** Quando preenchido, o perfil foi anonimizado (visível sobretudo a superadmin). */
  dataPurgedAt?: string | null;
};

type EmployeeProfile = {
  contractType: string | null;
  department: string | null;
  positionTitle: string | null;
  employeeTags?: string[];
};

type TenantCompany = { id: string; name: string };

type Paginated<T> = { items: T[] };
type BulkEmployeeProfiles = { items: Record<string, EmployeeProfile> };
type BulkAccessMeta = { items: Record<string, { email: string | null; lastSignInAt: string | null }> };

const UNLINK_WARNING =
  "Desvincular remove o colaborador deste projeto/contrato. A conta permanece no portal e o acesso volta ao perfil de candidato. Dados históricos (documentos, ponto, comunicados) permanecem vinculados ao usuário.";

const PURGE_ACCOUNT_WARNING =
  "Excluir a conta apaga e anonimiza os dados cadastrados deste colaborador neste projeto: perfil, documentos, registros de ponto e avisos vinculados. Esta ação não pode ser desfeita.";

const COLLABORATORS_PAGE_SIZE = 15;

type CollaboratorSortColumn =
  | "fullName"
  | "email"
  | "cpf"
  | "company"
  | "status"
  | "lastAccess";

function collaboratorStatusLabel(item: TenantUser): string {
  if (item.dataPurgedAt) return "Excluído (anonimizado)";
  if (item.status === "active") return "Ativo";
  if (item.status === "inactive") return "Inativo";
  return "Desligado";
}

export default function CollaboratorListPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;

  const [items, setItems] = useState<TenantUser[]>([]);
  const [profiles, setProfiles] = useState<Record<string, EmployeeProfile>>({});
  const [companiesById, setCompaniesById] = useState<Record<string, string>>({});
  const [accessMeta, setAccessMeta] = useState<Record<string, { email: string | null; lastSignInAt: string | null }>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "offboarded">("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [contractFilter, setContractFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<TenantUser | null>(null);
  const [deleteMode, setDeleteMode] = useState<"unlink" | "purge_account" | null>(null);
  const [deleteConfirmPhrase, setDeleteConfirmPhrase] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [resendInviteUserId, setResendInviteUserId] = useState<string | null>(null);
  const [passwordResetUserId, setPasswordResetUserId] = useState<string | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{ title: string; message: string } | null>(null);
  const [pendingEmailAction, setPendingEmailAction] = useState<{
    type: "password_reset" | "resend_invite";
    userId: string;
    fullName: string;
    email: string;
  } | null>(null);
  const [emailActionBusy, setEmailActionBusy] = useState(false);

  function resolveAccountEmail(item: TenantUser): string | null {
    const fromItem = item.email?.trim().toLowerCase() || null;
    if (fromItem) return fromItem;
    const fromMeta = accessMeta[item.userId]?.email?.trim().toLowerCase() || null;
    return fromMeta;
  }

  async function loadData() {
    setLoading(true);
    try {
      // Carrega lista de empresas/projetos em paralelo (mapa id→nome para a coluna).
      // O endpoint retorna array directo (não envelopado em { items }).
      void apiFetch<TenantCompany[]>(`/v1/tenants/${tenantId}/companies`)
        .then((rows) => {
          const map: Record<string, string> = {};
          for (const c of rows ?? []) {
            if (c.id && c.name) map[c.id] = c.name;
          }
          setCompaniesById(map);
        })
        .catch(() => {
          /* opcional: se falhar, coluna mostra "—" */
        });

      // Carrega lista rapidamente (sem meta do Auth, que é cara).
      const data = await apiFetch<Paginated<TenantUser>>(`/v1/tenants/${tenantId}/users?page=1&pageSize=100&includeAuthMeta=false`);
      const allUsers = data.items ?? [];
      const userIds = allUsers.map((u) => u.userId).filter(Boolean);
      let next: Record<string, EmployeeProfile> = {};
      if (userIds.length > 0) {
        try {
          const bulk = await apiFetch<BulkEmployeeProfiles>(`/v1/tenants/${tenantId}/employee-profiles/bulk`, {
            method: "POST",
            body: JSON.stringify({ targetUserIds: userIds })
          });
          next = bulk.items ?? {};
        } catch {
          next = {};
        }
      }
      setProfiles(next);
      const collaborators = allUsers.filter((item) => item.roles.includes("employee") || Boolean(next[item.userId]));
      setItems(collaborators);

      // Busca em paralelo os metadados de acesso (último login) só para os colaboradores da página.
      const collaboratorIds = collaborators.map((c) => c.userId).filter(Boolean);
      if (collaboratorIds.length > 0) {
        try {
          const meta = await apiFetch<BulkAccessMeta>(`/v1/tenants/${tenantId}/users/access-meta/bulk`, {
            method: "POST",
            body: JSON.stringify({ targetUserIds: collaboratorIds })
          });
          setAccessMeta(meta.items ?? {});
        } catch {
          setAccessMeta({});
        }
      } else {
        setAccessMeta({});
      }
      setError(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData().catch((err: Error) => setError(err.message));
  }, [tenantId]);

  const contracts = useMemo(() => {
    return Array.from(
      new Set(
        Object.values(profiles)
          .map((p) => p.contractType?.trim())
          .filter((value): value is string => !!value)
      )
    ).sort();
  }, [profiles]);

  const departments = useMemo(() => {
    return Array.from(
      new Set(
        Object.values(profiles)
          .map((p) => p.department?.trim())
          .filter((value): value is string => !!value)
      )
    ).sort();
  }, [profiles]);

  const positions = useMemo(() => {
    return Array.from(
      new Set(
        Object.values(profiles)
          .map((p) => p.positionTitle?.trim())
          .filter((value): value is string => !!value)
      )
    ).sort();
  }, [profiles]);

  const tags = useMemo(() => {
    const out = new Set<string>();
    Object.values(profiles).forEach((p) => (p.employeeTags ?? []).forEach((t) => out.add(t)));
    return Array.from(out).sort();
  }, [profiles]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const profile = profiles[item.userId];
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (departmentFilter !== "all" && (profile?.department ?? "") !== departmentFilter) return false;
      if (positionFilter !== "all" && (profile?.positionTitle ?? "") !== positionFilter) return false;
      if (contractFilter !== "all" && (profile?.contractType ?? "") !== contractFilter) return false;
      if (tagFilter !== "all" && !(profile?.employeeTags ?? []).includes(tagFilter)) return false;
      if (search.trim()) {
        const accountEmail = item.email ?? accessMeta[item.userId]?.email ?? "";
        const haystack = `${item.fullName ?? ""} ${accountEmail} ${item.cpf ?? ""} ${item.phone ?? ""}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [items, profiles, accessMeta, statusFilter, departmentFilter, positionFilter, contractFilter, tagFilter, search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, departmentFilter, positionFilter, contractFilter, tagFilter, search]);

  const sortGetters = useMemo(
    () => ({
      fullName: (item: TenantUser) => item.fullName,
      email: (item: TenantUser) => item.email ?? accessMeta[item.userId]?.email,
      cpf: (item: TenantUser) => item.cpf,
      company: (item: TenantUser) => (item.companyId ? companiesById[item.companyId] ?? null : null),
      status: (item: TenantUser) => collaboratorStatusLabel(item),
      lastAccess: (item: TenantUser) => {
        const iso = accessMeta[item.userId]?.lastSignInAt ?? item.lastSignInAt;
        return iso ? new Date(iso).getTime() : null;
      }
    }),
    [accessMeta, companiesById]
  );

  const { sort, toggleSort, sortedRows } = useTableSort<TenantUser, CollaboratorSortColumn>(
    filtered,
    sortGetters,
    "fullName"
  );

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / COLLABORATORS_PAGE_SIZE));

  const paginatedRows = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * COLLABORATORS_PAGE_SIZE;
    return sortedRows.slice(start, start + COLLABORATORS_PAGE_SIZE);
  }, [sortedRows, page, totalPages]);

  function formatLastAccess(iso: string | null | undefined): string {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
      });
    } catch {
      return "—";
    }
  }

  function requestResendInvite(item: TenantUser) {
    const email = resolveAccountEmail(item);
    if (!email) {
      setError("Este colaborador não possui e-mail de conta para reenviar o convite.");
      return;
    }
    setError(null);
    setPendingEmailAction({
      type: "resend_invite",
      userId: item.userId,
      fullName: item.fullName?.trim() || email,
      email
    });
  }

  function requestPasswordReset(item: TenantUser) {
    const email = resolveAccountEmail(item);
    if (!email) {
      setError("Este colaborador não possui e-mail de conta para redefinição de senha.");
      return;
    }
    setError(null);
    setPendingEmailAction({
      type: "password_reset",
      userId: item.userId,
      fullName: item.fullName?.trim() || email,
      email
    });
  }

  async function confirmPendingEmailAction() {
    if (!pendingEmailAction || emailActionBusy) return;
    const action = pendingEmailAction;
    setEmailActionBusy(true);
    setError(null);
    try {
      if (action.type === "resend_invite") {
        setResendInviteUserId(action.userId);
        await apiFetch(`/v1/tenants/${tenantId}/users/${action.userId}/resend-invite`, { method: "POST" });
        setPendingEmailAction(null);
        setFeedbackModal({
          title: "Convite enviado",
          message: `Convite reenviado com sucesso para ${action.email}.`
        });
      } else {
        setPasswordResetUserId(action.userId);
        await apiFetch(`/v1/tenants/${tenantId}/users/${action.userId}/password-reset-email`, {
          method: "POST"
        });
        setPendingEmailAction(null);
        setFeedbackModal({
          title: "E-mail enviado",
          message: `E-mail de redefinição de senha enviado com sucesso para ${action.email}.`
        });
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setResendInviteUserId(null);
      setPasswordResetUserId(null);
      setEmailActionBusy(false);
    }
  }

  function openDeleteModal(target: TenantUser, mode: "unlink" | "purge_account") {
    setDeleteTarget(target);
    setDeleteMode(mode);
    setDeleteConfirmPhrase("");
  }

  function closeDeleteModal() {
    if (deleteBusy) return;
    setDeleteTarget(null);
    setDeleteMode(null);
    setDeleteConfirmPhrase("");
    setError(null);
  }

  async function confirmDeleteCollaborator() {
    if (!deleteTarget || !deleteMode) return;
    if (deleteMode === "purge_account" && deleteConfirmPhrase.trim().toUpperCase() !== "DELETAR") {
      setError('Digite "DELETAR" para confirmar a exclusão da conta.');
      return;
    }
    setDeleteBusy(true);
    setError(null);
    try {
      const reason =
        deleteMode === "unlink"
          ? "Desvinculação do colaborador confirmada no painel; usuário retorna ao portal de candidato."
          : "Exclusão definitiva da conta confirmada no painel; dados anonimizados conforme política da plataforma.";
      await apiFetch(`/v1/tenants/${tenantId}/users/${deleteTarget.userId}`, {
        method: "DELETE",
        body: JSON.stringify({
          mode: deleteMode,
          reason,
          confirmPhrase: deleteMode === "purge_account" ? deleteConfirmPhrase.trim() : undefined
        })
      });
      closeDeleteModal();
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleteBusy(false);
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
        <div
          className="form-grid"
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(100, minmax(0, 1fr))",
            alignItems: "end"
          }}
        >
          <label style={{ gridColumn: "span 100" }}>
            Buscar
            <input
              placeholder="Nome, e-mail ou CPF"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label style={{ gridColumn: "span 33" }}>
            Departamento
            <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
              <option value="all">Todos</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label style={{ gridColumn: "span 34" }}>
            Cargo
            <select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)}>
              <option value="all">Todos</option>
              {positions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label style={{ gridColumn: "span 33" }}>
            Contrato
            <select value={contractFilter} onChange={(e) => setContractFilter(e.target.value)}>
              <option value="all">Todos</option>
              {contracts.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label style={{ gridColumn: "span 25" }}>
            Status
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
              <option value="all">Todos</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="offboarded">Desligado</option>
            </select>
          </label>
          <label style={{ gridColumn: "span 75" }}>
            Tag
            <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
              <option value="all">Todas</option>
              {tags.map((t) => (
                <option key={t} value={t}>{t.replace(/-/g, " ")}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="table-wrap">
        {loading ? (
          <p className="muted" style={{ margin: 0 }}>
            Carregando colaboradores...
          </p>
        ) : filtered.length === 0 ? (
          <EmptyState title="Sem colaboradores" description="Nenhum colaborador encontrado para os filtros aplicados." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <SortableTh label="Nome" column="fullName" sortColumn={sort.column} sortDirection={sort.direction} onSort={toggleSort} />
                <SortableTh label="E-mail da conta" column="email" sortColumn={sort.column} sortDirection={sort.direction} onSort={toggleSort} />
                <SortableTh label="CPF" column="cpf" sortColumn={sort.column} sortDirection={sort.direction} onSort={toggleSort} />
                <SortableTh label="Empresa / Projeto" column="company" sortColumn={sort.column} sortDirection={sort.direction} onSort={toggleSort} />
                <SortableTh label="Status" column="status" sortColumn={sort.column} sortDirection={sort.direction} onSort={toggleSort} />
                <SortableTh label="Último acesso" column="lastAccess" sortColumn={sort.column} sortDirection={sort.direction} onSort={toggleSort} />
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((item) => {
                const meta = accessMeta[item.userId];
                const accountEmail = resolveAccountEmail(item);
                return (
                  <tr key={item.userId}>
                    <td>{item.fullName ?? "-"}</td>
                    <td>{accountEmail ?? "-"}</td>
                    <td>{item.cpf ?? "-"}</td>
                    <td>
                      {item.companyId ? (
                        companiesById[item.companyId] ?? (
                          <span className="muted" title="Empresa/projeto vinculada não está acessível neste contexto.">
                            Vínculo restrito
                          </span>
                        )
                      ) : (
                        <span className="muted">Sem vínculo</span>
                      )}
                    </td>
                    <td>
                      {item.dataPurgedAt ? (
                        <span className="badge">Excluído (anonimizado)</span>
                      ) : item.status === "active" ? (
                        "Ativo"
                      ) : item.status === "inactive" ? (
                        "Inativo"
                      ) : (
                        "Desligado"
                      )}
                    </td>
                    <td>
                      {!(meta?.lastSignInAt ?? item.lastSignInAt) ? (
                        <div className="stack" style={{ gap: 6 }}>
                          <span className="muted" style={{ fontSize: "0.9em" }}>
                            Nunca acessou
                          </span>
                          <button
                            type="button"
                            className="btn secondary"
                            style={{ padding: "4px 10px", fontSize: "0.85rem" }}
                            disabled={
                              Boolean(item.dataPurgedAt) ||
                              !accountEmail ||
                              resendInviteUserId === item.userId ||
                              emailActionBusy
                            }
                            onClick={() => requestResendInvite(item)}
                          >
                            {resendInviteUserId === item.userId ? "A enviar…" : "Reenviar convite"}
                          </button>
                        </div>
                      ) : (
                        formatLastAccess(meta?.lastSignInAt ?? item.lastSignInAt)
                      )}
                    </td>
                    <td>
                      <div className="row">
                        <Link href={`/tenants/${tenantId}/collaborator/${item.userId}`} className="icon-btn" title="Visualizar" aria-label="Visualizar"><Eye size={16} /></Link>
                        <Link href={`/tenants/${tenantId}/collaborator/${item.userId}?mode=edit`} className="icon-btn" title="Editar" aria-label="Editar"><Pencil size={16} /></Link>
                        <button
                          type="button"
                          className="icon-btn"
                          title="Enviar e-mail de redefinição de senha"
                          aria-label="Enviar e-mail de redefinição de senha"
                          disabled={
                            Boolean(item.dataPurgedAt) ||
                            !accountEmail ||
                            passwordResetUserId === item.userId ||
                            emailActionBusy
                          }
                          onClick={() => requestPasswordReset(item)}
                        >
                          <Mail size={16} />
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                          title="Desvincular do projeto"
                          disabled={Boolean(item.dataPurgedAt)}
                          onClick={() => openDeleteModal(item, "unlink")}
                        >
                          Desvincular
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-danger"
                          title="Excluir conta e dados"
                          aria-label="Excluir conta e dados"
                          disabled={Boolean(item.dataPurgedAt)}
                          onClick={() => openDeleteModal(item, "purge_account")}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && sortedRows.length > 0 ? (
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <span className="muted">
              Página {Math.min(page, totalPages)} de {totalPages} ({sortedRows.length} colaborador
              {sortedRows.length === 1 ? "" : "es"})
            </span>
            <div className="row" style={{ gap: 8 }}>
              <button
                type="button"
                className="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <button
                type="button"
                className="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Próxima
              </button>
            </div>
          </div>
        ) : null}
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget && !!deleteMode}
        title={deleteMode === "unlink" ? "Desvincular colaborador" : "Excluir conta do colaborador"}
        message={
          deleteTarget
            ? deleteMode === "unlink"
              ? `Desvincular ${deleteTarget.fullName ?? deleteTarget.email ?? "este colaborador"} deste projeto?`
              : `Excluir a conta e os dados de ${deleteTarget.fullName ?? deleteTarget.email ?? "este colaborador"}?`
            : ""
        }
        confirmLabel={
          deleteBusy
            ? deleteMode === "unlink"
              ? "A desvincular..."
              : "A excluir..."
            : deleteMode === "unlink"
              ? "Desvincular"
              : "Excluir conta"
        }
        cancelLabel="Cancelar"
        danger={deleteMode === "purge_account"}
        busy={deleteBusy}
        busyLabel={deleteMode === "unlink" ? "A desvincular..." : "A excluir..."}
        error={error}
        onCancel={closeDeleteModal}
        onConfirm={() => void confirmDeleteCollaborator()}
      >
        <p className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>
          {deleteMode === "unlink" ? UNLINK_WARNING : PURGE_ACCOUNT_WARNING}
        </p>
        {deleteMode === "purge_account" ? (
          <label className="stack" style={{ marginTop: 12, gap: 6 }}>
            <span className="small muted">Digite DELETAR para confirmar</span>
            <input
              type="text"
              value={deleteConfirmPhrase}
              placeholder="DELETAR"
              autoComplete="off"
              disabled={deleteBusy}
              onChange={(event) => setDeleteConfirmPhrase(event.target.value)}
            />
          </label>
        ) : null}
      </ConfirmModal>

      <ConfirmModal
        open={!!pendingEmailAction}
        title={
          pendingEmailAction?.type === "resend_invite"
            ? "Reenviar convite"
            : "Enviar redefinição de senha"
        }
        message={
          pendingEmailAction
            ? pendingEmailAction.type === "resend_invite"
              ? `Reenviar o convite de primeiro acesso para ${pendingEmailAction.fullName} (${pendingEmailAction.email})?`
              : `Enviar e-mail de redefinição de senha para ${pendingEmailAction.fullName} (${pendingEmailAction.email})?`
            : ""
        }
        confirmLabel={emailActionBusy ? "A enviar…" : "Confirmar envio"}
        cancelLabel="Cancelar"
        busy={emailActionBusy}
        busyLabel="A enviar…"
        error={error}
        onCancel={() => {
          if (emailActionBusy) return;
          setPendingEmailAction(null);
        }}
        onConfirm={() => void confirmPendingEmailAction()}
      />

      <ConfirmModal
        open={!!feedbackModal}
        title={feedbackModal?.title ?? ""}
        message={feedbackModal?.message ?? ""}
        confirmLabel="OK"
        cancelLabel="Fechar"
        onConfirm={() => setFeedbackModal(null)}
        onCancel={() => setFeedbackModal(null)}
      />
    </main>
  );
}
