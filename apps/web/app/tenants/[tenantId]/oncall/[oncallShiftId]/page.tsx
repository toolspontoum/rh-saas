"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Pencil, PlayCircle, Trash2 } from "lucide-react";

import { Breadcrumbs } from "../../../../../components/breadcrumbs";
import { ConfirmModal } from "../../../../../components/confirm-modal";
import { EmptyState } from "../../../../../components/empty-state";
import { apiFetch } from "../../../../../lib/api";

type Context = { roles: string[] };

type TimeEntry = {
  id: string;
  tenantId: string;
  userId: string;
  contract: string | null;
  entryType: "clock_in" | "lunch_out" | "lunch_in" | "clock_out";
  recordedAt: string;
  source: string;
  note: string | null;
  oncallShiftId?: string | null;
  createdAt: string;
};

type OncallShiftStatus = "pending_ack" | "acknowledged" | "entry_registered" | "cancelled";

type OncallShiftEventType =
  | "created"
  | "updated"
  | "deleted"
  | "acknowledged"
  | "entry_registered"
  | "entry_linked"
  | "entry_unlinked"
  | "status_changed"
  | "note";

type OncallShiftEvent = {
  id: string;
  tenantId: string;
  oncallShiftId: string;
  userId: string;
  actorUserId: string | null;
  eventType: OncallShiftEventType;
  payload: Record<string, unknown>;
  createdAt: string;
};

type OncallShiftWithEvents = {
  id: string;
  tenantId: string;
  userId: string;
  scheduledDate: string;
  startsAt: string;
  endsAt: string;
  status: OncallShiftStatus;
  note: string | null;
  linkedTimeEntryId: string | null;
  linkedTimeEntryAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedByUserId: string | null;
  cancelledAt: string | null;
  cancelledByUserId: string | null;
  cancelReason: string | null;
  employeeFullName: string | null;
  employeeEmail: string | null;
  employeeCpf: string | null;
  employeePhone: string | null;
  department: string | null;
  positionTitle: string | null;
  contractType: string | null;
  employeeTags: string[];
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  events: OncallShiftEvent[];
  linkedTimeEntry: TimeEntry | null;
};

type EditForm = {
  scheduledDate: string;
  startTime: string;
  endTime: string;
  note: string;
};

const entryTypeLabel: Record<TimeEntry["entryType"], string> = {
  clock_in: "Entrada",
  lunch_out: "Inicio almoco",
  lunch_in: "Retorno almoco",
  clock_out: "Saida"
};

function toDateLabel(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function toDateTimeLabel(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function statusMeta(status: OncallShiftStatus): { label: string; kind: "success" | "warning" | "danger" | "neutral" } {
  if (status === "pending_ack") return { label: "Pendente ciente", kind: "warning" };
  if (status === "acknowledged") return { label: "Ciente", kind: "neutral" };
  if (status === "entry_registered") return { label: "Entrada registrada", kind: "success" };
  return { label: "Cancelado", kind: "danger" };
}

function eventTypeMeta(type: OncallShiftEventType): { label: string; kind: "success" | "warning" | "danger" | "neutral" } {
  if (type === "created") return { label: "Criado", kind: "neutral" };
  if (type === "updated") return { label: "Atualizado", kind: "warning" };
  if (type === "deleted") return { label: "Excluido", kind: "danger" };
  if (type === "acknowledged") return { label: "Ciente", kind: "success" };
  if (type === "entry_registered") return { label: "Entrada registrada", kind: "success" };
  if (type === "entry_linked") return { label: "Ponto vinculado", kind: "neutral" };
  if (type === "entry_unlinked") return { label: "Ponto desvinculado", kind: "warning" };
  if (type === "status_changed") return { label: "Status alterado", kind: "warning" };
  return { label: "Nota", kind: "neutral" };
}

function isInActiveWindow(shift: OncallShiftWithEvents): boolean {
  const now = Date.now();
  const startsAt = new Date(shift.startsAt).getTime();
  const endsAt = new Date(shift.endsAt).getTime();
  return Number.isFinite(startsAt) && Number.isFinite(endsAt) && now >= startsAt && now <= endsAt;
}

function isoTimeToInputValue(value: string): string {
  if (!value || value.length < 16) return "00:00";
  return value.slice(11, 16);
}

function actorLabel(event: OncallShiftEvent, shift: OncallShiftWithEvents): string {
  if (!event.actorUserId) return "Sistema";
  if (event.actorUserId === shift.userId) return "Colaborador";
  return "Gestao";
}

export default function OncallShiftDetailPage() {
  const params = useParams<{ tenantId: string; oncallShiftId: string }>();
  const tenantId = params.tenantId;
  const oncallShiftId = params.oncallShiftId;

  const [roles, setRoles] = useState<string[]>([]);
  const [shift, setShift] = useState<OncallShiftWithEvents | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [editForm, setEditForm] = useState<EditForm>({
    scheduledDate: "",
    startTime: "18:00",
    endTime: "23:00",
    note: ""
  });

  const canManage = useMemo(
    () => roles.some((role) => ["owner", "admin", "manager", "analyst"].includes(role)),
    [roles]
  );

  const canAcknowledge = useMemo(
    () => Boolean(shift) && !canManage && shift!.status === "pending_ack",
    [shift, canManage]
  );

  const canRegisterEntry = useMemo(
    () => Boolean(shift) && !canManage && shift!.status === "acknowledged" && isInActiveWindow(shift!),
    [shift, canManage]
  );

  async function loadData(withLoading = true) {
    if (withLoading) setLoading(true);
    setError(null);
    try {
      const context = await apiFetch<Context>(`/v1/tenants/${tenantId}/context`);
      setRoles(context.roles);
      const detail = await apiFetch<OncallShiftWithEvents>(`/v1/tenants/${tenantId}/oncall-shifts/${oncallShiftId}`);
      setShift(detail);
      setEditForm({
        scheduledDate: detail.scheduledDate,
        startTime: isoTimeToInputValue(detail.startsAt),
        endTime: isoTimeToInputValue(detail.endsAt),
        note: detail.note ?? ""
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      if (withLoading) setLoading(false);
    }
  }

  useEffect(() => {
    loadData().catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, oncallShiftId]);

  async function handleAcknowledge() {
    if (!shift) return;
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      await apiFetch(`/v1/tenants/${tenantId}/oncall-shifts/${shift.id}/acknowledge`, {
        method: "POST",
        body: JSON.stringify({})
      });
      setOkMsg("Ciente registrado com sucesso.");
      await loadData(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRegisterEntry() {
    if (!shift) return;
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      await apiFetch(`/v1/tenants/${tenantId}/oncall-shifts/${shift.id}/register-entry`, {
        method: "POST",
        body: JSON.stringify({
          source: "oncall_web_detail"
        })
      });
      setOkMsg("Entrada de sobreaviso registrada e vinculada ao ponto.");
      await loadData(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shift) return;
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      await apiFetch(`/v1/tenants/${tenantId}/oncall-shifts/${shift.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          scheduledDate: editForm.scheduledDate,
          startTime: editForm.startTime,
          endTime: editForm.endTime,
          note: editForm.note.trim() || null
        })
      });
      setEditOpen(false);
      setOkMsg("Sobreaviso atualizado com sucesso.");
      await loadData(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!shift || saving) return;
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      await apiFetch(`/v1/tenants/${tenantId}/oncall-shifts/${shift.id}`, {
        method: "DELETE",
        body: JSON.stringify({
          reason: deleteReason.trim() || null
        })
      });
      setDeleteOpen(false);
      setShift(null);
      setOkMsg("Sobreaviso excluido com sucesso.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Visao Geral", href: `/tenants/${tenantId}/dashboard` },
          { label: "Sobreaviso", href: `/tenants/${tenantId}/oncall` },
          { label: "Detalhes" }
        ]}
      />

      <div className="section-header">
        <h1>Detalhes do sobreaviso</h1>
        <div className="row">
          <Link className="btn secondary" href={`/tenants/${tenantId}/oncall`}>
            Voltar para lista
          </Link>
          {canManage && shift ? (
            <>
              <button className="btn secondary" onClick={() => setEditOpen(true)} disabled={saving}>
                Editar
              </button>
              <button className="btn danger" onClick={() => setDeleteOpen(true)} disabled={saving}>
                Excluir
              </button>
            </>
          ) : null}
          {!canManage && canAcknowledge ? (
            <button className="btn" onClick={handleAcknowledge} disabled={saving}>
              Dar ciente
            </button>
          ) : null}
          {!canManage && canRegisterEntry ? (
            <button className="btn" onClick={handleRegisterEntry} disabled={saving}>
              Registrar entrada
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {okMsg ? <p>{okMsg}</p> : null}

      {loading ? <p className="muted">Carregando detalhes...</p> : null}
      {!loading && !shift ? (
        <EmptyState
          title="Sobreaviso indisponivel"
          description="O sobreaviso nao foi encontrado ou voce nao tem permissao para visualiza-lo."
        />
      ) : null}

      {!loading && shift ? (
        <>
          <section className="card stack">
            <h3 style={{ margin: 0 }}>Resumo do sobreaviso</h3>
            <div className="form-grid form-grid-3">
              <label>
                Data programada
                <input value={toDateLabel(shift.scheduledDate)} readOnly />
              </label>
              <label>
                Inicio
                <input value={toDateTimeLabel(shift.startsAt)} readOnly />
              </label>
              <label>
                Fim
                <input value={toDateTimeLabel(shift.endsAt)} readOnly />
              </label>
              <label>
                Colaborador
                <input value={shift.employeeFullName ?? "-"} readOnly />
              </label>
              <label>
                E-mail
                <input value={shift.employeeEmail ?? "-"} readOnly />
              </label>
              <label>
                CPF
                <input value={shift.employeeCpf ?? "-"} readOnly />
              </label>
              <label>
                Departamento
                <input value={shift.department ?? "-"} readOnly />
              </label>
              <label>
                Cargo
                <input value={shift.positionTitle ?? "-"} readOnly />
              </label>
              <label>
                Contrato
                <input value={shift.contractType ?? "-"} readOnly />
              </label>
            </div>
            <div className="row" style={{ alignItems: "center" }}>
              <span className={`status-pill ${statusMeta(shift.status).kind}`}>{statusMeta(shift.status).label}</span>
              {(shift.employeeTags ?? []).map((item) => (
                <span key={`tag-${item}`} className="badge">
                  {item.replace(/-/g, " ")}
                </span>
              ))}
            </div>
            {shift.note ? (
              <label>
                Observacao
                <textarea value={shift.note} readOnly />
              </label>
            ) : null}
            {!canManage && shift.status === "pending_ack" ? (
              <p className="muted">Aguardando seu ciente para liberar a entrada no sobreaviso.</p>
            ) : null}
          </section>

          <section className="card stack">
            <h3 style={{ margin: 0 }}>Vinculo com registro de ponto</h3>
            {shift.linkedTimeEntry ? (
              <div className="form-grid form-grid-3">
                <label>
                  Tipo de registro
                  <input value={entryTypeLabel[shift.linkedTimeEntry.entryType]} readOnly />
                </label>
                <label>
                  Registrado em
                  <input value={toDateTimeLabel(shift.linkedTimeEntry.recordedAt)} readOnly />
                </label>
                <label>
                  Fonte
                  <input value={shift.linkedTimeEntry.source || "-"} readOnly />
                </label>
                <label>
                  Contrato
                  <input value={shift.linkedTimeEntry.contract ?? "-"} readOnly />
                </label>
                <label>
                  Vinculado em
                  <input value={toDateTimeLabel(shift.linkedTimeEntryAt)} readOnly />
                </label>
                <label>
                  ID do ponto
                  <input value={shift.linkedTimeEntry.id} readOnly />
                </label>
              </div>
            ) : (
              <p className="muted">Nenhum registro de ponto vinculado a este sobreaviso.</p>
            )}
          </section>

          <section className="card table-wrap">
            <h3 style={{ marginTop: 0 }}>Historico do sobreaviso</h3>
            {(shift.events ?? []).length === 0 ? (
              <EmptyState
                title="Sem eventos"
                description="Ainda nao ha eventos de historico para este sobreaviso."
              />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Evento</th>
                    <th>Ator</th>
                    <th>Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {shift.events.map((event) => {
                    const meta = eventTypeMeta(event.eventType);
                    return (
                      <tr key={event.id}>
                        <td>{toDateTimeLabel(event.createdAt)}</td>
                        <td>
                          <span className={`status-pill ${meta.kind}`}>{meta.label}</span>
                        </td>
                        <td>{actorLabel(event, shift)}</td>
                        <td>
                          {event.payload && Object.keys(event.payload).length > 0 ? (
                            <details>
                              <summary className="muted">Ver payload</summary>
                              <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                {JSON.stringify(event.payload, null, 2)}
                              </pre>
                            </details>
                          ) : (
                            <span className="muted">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </>
      ) : null}

      {editOpen && shift ? (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-card stack" role="dialog" aria-modal="true" aria-label="Editar sobreaviso" onSubmit={submitEdit}>
            <h3>Editar sobreaviso</h3>
            <div className="form-grid form-grid-3">
              <label>
                Data
                <input
                  type="date"
                  value={editForm.scheduledDate}
                  onChange={(event) => setEditForm((current) => ({ ...current, scheduledDate: event.target.value }))}
                />
              </label>
              <label>
                Hora inicial
                <input
                  type="time"
                  value={editForm.startTime}
                  onChange={(event) => setEditForm((current) => ({ ...current, startTime: event.target.value }))}
                />
              </label>
              <label>
                Hora final
                <input
                  type="time"
                  value={editForm.endTime}
                  onChange={(event) => setEditForm((current) => ({ ...current, endTime: event.target.value }))}
                />
              </label>
            </div>
            <label>
              Observacao (opcional)
              <textarea
                value={editForm.note}
                onChange={(event) => setEditForm((current) => ({ ...current, note: event.target.value }))}
              />
            </label>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="secondary" onClick={() => setEditOpen(false)} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <ConfirmModal
        open={deleteOpen}
        title="Excluir sobreaviso"
        message="Esta acao remove o sobreaviso e notifica o colaborador."
        confirmLabel={saving ? "Excluindo..." : "Excluir"}
        cancelLabel="Cancelar"
        danger
        onCancel={() => {
          if (saving) return;
          setDeleteOpen(false);
        }}
        onConfirm={confirmDelete}
      >
        <label>
          Motivo (opcional)
          <textarea
            value={deleteReason}
            onChange={(event) => setDeleteReason(event.target.value)}
            placeholder="Motivo da exclusao para auditoria"
          />
        </label>
      </ConfirmModal>
    </main>
  );
}

