"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import { Breadcrumbs } from "../../../../components/breadcrumbs";
import { ConfirmModal } from "../../../../components/confirm-modal";
import { EmptyState } from "../../../../components/empty-state";
import { apiFetch } from "../../../../lib/api";
import { onlyDigits } from "../../../../lib/br-format";

type NoticeAttachment = {
  id: string;
  fileName: string;
  signedUrl?: string | null;
};

type Notice = {
  id: string;
  title: string;
  message: string;
  target: "all" | "employee" | "manager";
  recipientUserIds?: string[] | null;
  isActive?: boolean;
  attachments?: NoticeAttachment[];
  createdAt: string;
  readAt?: string | null;
  readCount?: number;
};

type TenantUser = {
  userId: string;
  email: string | null;
  fullName: string | null;
  cpf?: string | null;
  roles: string[];
};

type EmployeeProfile = {
  userId: string;
  personalEmail: string | null;
  cpf: string | null;
  department: string | null;
  positionTitle: string | null;
  contractType: string | null;
};

type Paginated<T> = { items: T[] };

export default function NoticesPage() {
  const params = useParams<{ tenantId: string }>();
  const searchParams = useSearchParams();
  const tenantId = params.tenantId;

  const [items, setItems] = useState<Notice[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [profiles, setProfiles] = useState<Record<string, EmployeeProfile>>({});
  const [searchRecipient, setSearchRecipient] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [contractFilter, setContractFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [canPublishNotices, setCanPublishNotices] = useState(false);
  const [openTypeModal, setOpenTypeModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [noticeToDelete, setNoticeToDelete] = useState<Notice | null>(null);

  async function loadData() {
    const ctx = await apiFetch<{ roles: string[] }>(`/v1/tenants/${tenantId}/context`);
    const can = ctx.roles.some((r) => ["owner", "admin", "manager"].includes(r));
    setCanPublishNotices(can);

    const noticesRaw = await apiFetch<Notice[]>(
      `/v1/tenants/${tenantId}/notices?onlyActive=${showArchived ? "false" : "true"}&onlyArchived=${showArchived ? "true" : "false"}`
    );
    setItems(Array.isArray(noticesRaw) ? noticesRaw : []);

    if (!can) return;

    const usersRes = await apiFetch<Paginated<TenantUser>>(`/v1/tenants/${tenantId}/users?page=1&pageSize=100`);
    const employeeUsers = usersRes.items.filter((item) => item.roles.includes("employee"));
    setUsers(employeeUsers);

    const profilePairs = await Promise.all(
      employeeUsers.map(async (item) => {
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

    const profileMap: Record<string, EmployeeProfile> = {};
    for (const [userId, profile] of profilePairs) {
      if (profile) profileMap[userId] = profile;
    }
    setProfiles(profileMap);
  }

  useEffect(() => {
    loadData().catch((err: Error) => setError(err.message));
  }, [tenantId, showArchived]);

  useEffect(() => {
    const created = searchParams.get("created");
    if (created === "mass") setOkMsg("Comunicado em massa publicado com sucesso.");
    if (created === "specific") setOkMsg("Comunicado específico publicado com sucesso.");
  }, [searchParams]);

  const departments = useMemo(() => {
    return Array.from(
      new Set(
        users
          .map((item) => profiles[item.userId]?.department?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [users, profiles]);

  const positions = useMemo(() => {
    return Array.from(
      new Set(
        users
          .map((item) => profiles[item.userId]?.positionTitle?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [users, profiles]);

  const contracts = useMemo(() => {
    return Array.from(
      new Set(
        users
          .map((item) => profiles[item.userId]?.contractType?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [users, profiles]);

  const matchedRecipientIds = useMemo(() => {
    const normalizedSearch = searchRecipient.trim().toLowerCase();
    const searchDigits = onlyDigits(searchRecipient);
    const set = new Set<string>();
    for (const user of users) {
      const profile = profiles[user.userId];
      const name = (user.fullName ?? "").toLowerCase();
      const email = (profile?.personalEmail ?? user.email ?? "").toLowerCase();
      const cpf = onlyDigits(profile?.cpf ?? user.cpf ?? "");
      const department = (profile?.department ?? "").toLowerCase();
      const position = (profile?.positionTitle ?? "").toLowerCase();
      const contract = (profile?.contractType ?? "").toLowerCase();

      if (normalizedSearch) {
        const byText = name.includes(normalizedSearch) || email.includes(normalizedSearch);
        const byCpf = searchDigits.length >= 4 && cpf.includes(searchDigits);
        if (!byText && !byCpf) continue;
      }
      if (departmentFilter.trim() && department !== departmentFilter.trim().toLowerCase()) continue;
      if (positionFilter.trim() && position !== positionFilter.trim().toLowerCase()) continue;
      if (contractFilter.trim() && contract !== contractFilter.trim().toLowerCase()) continue;
      set.add(user.userId);
    }
    return set;
  }, [users, profiles, searchRecipient, departmentFilter, positionFilter, contractFilter]);

  const filtersActive = Boolean(
    searchRecipient.trim() || departmentFilter.trim() || positionFilter.trim() || contractFilter.trim()
  );

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (!filtersActive) return true;
      const recipients = item.recipientUserIds ?? [];
      if (recipients.length === 0) return false;
      return recipients.some((id) => matchedRecipientIds.has(id));
    });
  }, [items, filtersActive, matchedRecipientIds]);

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs items={[{ label: "Início", href: `/tenants/${tenantId}/dashboard` }, { label: "Comunicados" }]} />

      <div className="section-header">
        <h1>Comunicados</h1>
        {canPublishNotices ? (
          <button onClick={() => setOpenTypeModal(true)}>Novo comunicado</button>
        ) : null}
      </div>

      {error ? <p className="error">{error}</p> : null}
      {okMsg ? <p>{okMsg}</p> : null}

      <div className="card stack">
        <div className="section-header">
          <h3 style={{ margin: 0 }}>Lista de comunicados</h3>
          <button className="secondary" onClick={() => setShowArchived((current) => !current)}>
            {showArchived ? "Ver comunicados ativos" : "Ver comunicados arquivados"}
          </button>
        </div>
        <label>
          Busca
          <input
            placeholder="Funcionário, CPF ou e-mail"
            value={searchRecipient}
            onChange={(e) => setSearchRecipient(e.target.value)}
          />
        </label>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "minmax(0, 33fr) minmax(0, 34fr) minmax(0, 33fr)" }}>
          <label>
            Departamento
            <input
              list="notice-department-options"
              placeholder="Departamento"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            />
            <datalist id="notice-department-options">
              {departments.map((item) => <option key={item} value={item} />)}
            </datalist>
          </label>
          <label>
            Cargo
            <input
              list="notice-position-options"
              placeholder="Cargo"
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
            />
            <datalist id="notice-position-options">
              {positions.map((item) => <option key={item} value={item} />)}
            </datalist>
          </label>
          <label>
            Tipo de contrato
            <input
              list="notice-contract-options"
              placeholder="Tipo de contrato"
              value={contractFilter}
              onChange={(e) => setContractFilter(e.target.value)}
            />
            <datalist id="notice-contract-options">
              {contracts.map((item) => <option key={item} value={item} />)}
            </datalist>
          </label>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="Sem comunicados" description="Nenhum comunicado atende os filtros atuais." />
        ) : (
          filtered.map((item) => (
            <div className="card" key={item.id}>
              <h4>{item.title}</h4>
              <div className="notice-rich-content" dangerouslySetInnerHTML={{ __html: item.message }} />
              {(item.attachments ?? []).length > 0 ? (
                <div className="stack" style={{ marginTop: 12 }}>
                  <strong>Anexos</strong>
                  {(item.attachments ?? []).map((attachment) => (
                    <div key={attachment.id}>
                      {attachment.signedUrl ? (
                        <a href={attachment.signedUrl} target="_blank" rel="noreferrer">
                          {attachment.fileName}
                        </a>
                      ) : (
                        <span>{attachment.fileName}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <p className="muted">
                  Público: {item.target} | {new Date(item.createdAt).toLocaleString("pt-BR")}
                  {item.recipientUserIds && item.recipientUserIds.length > 0
                    ? ` | Destinatários específicos: ${item.recipientUserIds.length}`
                    : ""}
                </p>
                {canPublishNotices ? (
                  <div className="row">
                    {showArchived ? (
                      <>
                        <button
                          className="secondary"
                          onClick={async () => {
                            setError(null);
                            setOkMsg(null);
                            try {
                              await apiFetch(`/v1/tenants/${tenantId}/notices/${item.id}/unarchive`, {
                                method: "POST"
                              });
                              setOkMsg("Comunicado desarquivado.");
                              await loadData();
                            } catch (err) {
                              setError((err as Error).message);
                            }
                          }}
                        >
                          Desarquivar
                        </button>
                        <button
                          className="secondary"
                          onClick={() => {
                            setNoticeToDelete(item);
                          }}
                        >
                          Deletar
                        </button>
                      </>
                    ) : (
                      <button
                        className="secondary"
                        onClick={async () => {
                          setError(null);
                          setOkMsg(null);
                          try {
                            await apiFetch(`/v1/tenants/${tenantId}/notices/${item.id}/archive`, {
                              method: "POST"
                            });
                            setOkMsg("Comunicado arquivado.");
                            await loadData();
                          } catch (err) {
                            setError((err as Error).message);
                          }
                        }}
                      >
                        Arquivar
                      </button>
                    )}
                  </div>
                ) : !item.readAt ? (
                  <button
                    className="secondary"
                    onClick={async () => {
                      setError(null);
                      setOkMsg(null);
                      try {
                        await apiFetch(`/v1/tenants/${tenantId}/notices/${item.id}/read`, { method: "POST" });
                        setOkMsg("Comunicado marcado como lido.");
                        await loadData();
                      } catch (err) {
                        setError((err as Error).message);
                      }
                    }}
                  >
                    Marcar como lido
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {openTypeModal ? (
        <div className="modal-backdrop" onClick={() => setOpenTypeModal(false)}>
          <div className="modal-card modal-card--md" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0 }}>Novo comunicado</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Selecione o tipo de envio do comunicado.
            </p>
            <div className="row" style={{ justifyContent: "flex-end", flexWrap: "nowrap", gap: 10 }}>
              <button className="secondary" onClick={() => setOpenTypeModal(false)}>
                Cancelar
              </button>
              <Link href={`/tenants/${tenantId}/notices/new/mass`}>
                <button style={{ whiteSpace: "nowrap" }}>Comunicado em massa</button>
              </Link>
              <Link href={`/tenants/${tenantId}/notices/new/specific`}>
                <button style={{ whiteSpace: "nowrap" }}>Comunicado específico</button>
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={Boolean(noticeToDelete)}
        title="Deletar comunicado"
        message="Tem certeza que deseja deletar este comunicado? Esta ação não pode ser desfeita."
        confirmLabel="Deletar"
        cancelLabel="Cancelar"
        onCancel={() => setNoticeToDelete(null)}
        onConfirm={async () => {
          if (!noticeToDelete) return;
          setError(null);
          setOkMsg(null);
          try {
            await apiFetch(`/v1/tenants/${tenantId}/notices/${noticeToDelete.id}`, {
              method: "DELETE"
            });
            setNoticeToDelete(null);
            setOkMsg("Comunicado deletado com sucesso.");
            await loadData();
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      />
    </main>
  );
}
