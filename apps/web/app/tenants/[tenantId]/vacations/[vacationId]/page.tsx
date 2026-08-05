"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { Breadcrumbs } from "../../../../../components/breadcrumbs";
import { ConfirmModal } from "../../../../../components/confirm-modal";
import { EmptyState } from "../../../../../components/empty-state";
import { apiFetch } from "../../../../../lib/api";

type Context = { roles: string[] };

type VacationPeriodStatus = "active" | "cancelled";

type VacationPeriod = {
  id: string;
  tenantId: string;
  userId: string;
  startDate: string;
  endDate: string;
  allowTimePunch: boolean;
  status: VacationPeriodStatus;
  note: string | null;
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
  cancelledAt: string | null;
  cancelledByUserId: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
};

type EditForm = {
  startDate: string;
  endDate: string;
  note: string;
  allowTimePunch: boolean;
};

function toDateLabel(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function toDateTimeLabel(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function statusMeta(status: VacationPeriodStatus): { label: string; kind: "success" | "danger" } {
  if (status === "active") return { label: "Ativo", kind: "success" };
  return { label: "Cancelado", kind: "danger" };
}

export default function VacationDetailPage() {
  const params = useParams<{ tenantId: string; vacationId: string }>();
  const tenantId = params.tenantId;
  const vacationId = params.vacationId;

  const [roles, setRoles] = useState<string[]>([]);
  const [vacation, setVacation] = useState<VacationPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [allowPunchConfirmOpen, setAllowPunchConfirmOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [editForm, setEditForm] = useState<EditForm>({
    startDate: "",
    endDate: "",
    note: "",
    allowTimePunch: false
  });

  const canManage = useMemo(
    () => roles.some((role) => ["owner", "admin", "manager", "analyst", "preposto"].includes(role)),
    [roles]
  );

  async function loadData(withLoading = true) {
    if (withLoading) setLoading(true);
    setError(null);
    try {
      const context = await apiFetch<Context>(`/v1/tenants/${tenantId}/context`);
      setRoles(context.roles);
      const detail = await apiFetch<VacationPeriod>(`/v1/tenants/${tenantId}/vacations/${vacationId}`);
      setVacation(detail);
      setEditForm({
        startDate: detail.startDate,
        endDate: detail.endDate,
        note: detail.note ?? "",
        allowTimePunch: detail.allowTimePunch
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
  }, [tenantId, vacationId]);

  async function persistEdit() {
    if (!vacation) return;
    if (editForm.endDate < editForm.startDate) {
      setError("A data fim deve ser igual ou posterior a data inicio.");
      return;
    }
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      await apiFetch(`/v1/tenants/${tenantId}/vacations/${vacation.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          startDate: editForm.startDate,
          endDate: editForm.endDate,
          note: editForm.note.trim() || null,
          allowTimePunch: editForm.allowTimePunch
        })
      });
      setEditOpen(false);
      setAllowPunchConfirmOpen(false);
      setOkMsg("Ferias atualizadas com sucesso.");
      await loadData(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vacation) return;
    const enablingPunch = editForm.allowTimePunch && !vacation.allowTimePunch;
    if (enablingPunch) {
      setAllowPunchConfirmOpen(true);
      return;
    }
    await persistEdit();
  }

  async function confirmDelete() {
    if (!vacation || saving) return;
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      await apiFetch(`/v1/tenants/${tenantId}/vacations/${vacation.id}`, {
        method: "DELETE",
        body: JSON.stringify({
          reason: deleteReason.trim() || null
        })
      });
      setDeleteOpen(false);
      setOkMsg("Periodo de ferias cancelado com sucesso.");
      await loadData(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="container wide stack" style={{ margin: 0 }}>
        <p className="muted">Carregando...</p>
      </main>
    );
  }

  if (!vacation) {
    return (
      <main className="container wide stack" style={{ margin: 0 }}>
        <Breadcrumbs
          items={[
            { label: "Visao Geral", href: `/tenants/${tenantId}/dashboard` },
            { label: "Férias", href: `/tenants/${tenantId}/vacations` },
            { label: "Detalhes" }
          ]}
        />
        <EmptyState title="Ferias nao encontradas" description={error ?? "Periodo inexistente ou sem permissao."} />
        <Link className="btn secondary" href={`/tenants/${tenantId}/vacations`}>
          Voltar para lista
        </Link>
      </main>
    );
  }

  const statusInfo = statusMeta(vacation.status);

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Visao Geral", href: `/tenants/${tenantId}/dashboard` },
          { label: "Férias", href: `/tenants/${tenantId}/vacations` },
          { label: "Detalhes" }
        ]}
      />

      <div className="section-header">
        <h1>Detalhes das férias</h1>
        <div className="row">
          <Link className="btn secondary" href={`/tenants/${tenantId}/vacations`}>
            Voltar para lista
          </Link>
          {canManage && vacation.status === "active" ? (
            <>
              <button className="btn secondary" onClick={() => setEditOpen(true)} disabled={saving}>
                Editar
              </button>
              <button className="btn danger" onClick={() => setDeleteOpen(true)} disabled={saving}>
                Cancelar periodo
              </button>
            </>
          ) : null}
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {okMsg ? <p>{okMsg}</p> : null}

      <div className="card stack">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>{vacation.employeeFullName ?? "Colaborador"}</h3>
          <span className={`status-pill ${statusInfo.kind}`}>{statusInfo.label}</span>
        </div>
        <div className="form-grid form-grid-3">
          <div>
            <div className="muted">Inicio</div>
            <div>{toDateLabel(vacation.startDate)}</div>
          </div>
          <div>
            <div className="muted">Fim</div>
            <div>{toDateLabel(vacation.endDate)}</div>
          </div>
          <div>
            <div className="muted">Batida no periodo</div>
            <div>{vacation.allowTimePunch ? "Permitida" : "Bloqueada"}</div>
          </div>
          <div>
            <div className="muted">E-mail</div>
            <div>{vacation.employeeEmail ?? "-"}</div>
          </div>
          <div>
            <div className="muted">CPF</div>
            <div>{vacation.employeeCpf ?? "-"}</div>
          </div>
          <div>
            <div className="muted">Departamento</div>
            <div>{vacation.department ?? "-"}</div>
          </div>
          <div>
            <div className="muted">Cargo</div>
            <div>{vacation.positionTitle ?? "-"}</div>
          </div>
          <div>
            <div className="muted">Contrato</div>
            <div>{vacation.contractType ?? "-"}</div>
          </div>
          <div>
            <div className="muted">Criado em</div>
            <div>{toDateTimeLabel(vacation.createdAt)}</div>
          </div>
        </div>
        {vacation.note ? (
          <div>
            <div className="muted">Observacao</div>
            <p style={{ marginTop: 4 }}>{vacation.note}</p>
          </div>
        ) : null}
        {vacation.status === "cancelled" ? (
          <div>
            <div className="muted">Cancelado em</div>
            <div>{toDateTimeLabel(vacation.cancelledAt)}</div>
            {vacation.cancelReason ? <p className="muted">{vacation.cancelReason}</p> : null}
          </div>
        ) : null}
      </div>

      {editOpen ? (
        <div className="modal-backdrop" role="presentation">
          <form
            className="modal-card stack"
            role="dialog"
            aria-modal="true"
            aria-label="Editar férias"
            onSubmit={submitEdit}
          >
            <h3 style={{ margin: 0 }}>Editar férias</h3>
            <div className="form-grid form-grid-2">
              <label>
                Data inicio
                <input
                  type="date"
                  value={editForm.startDate}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      startDate: event.target.value
                    }))
                  }
                  required
                />
              </label>
              <label>
                Data fim
                <input
                  type="date"
                  value={editForm.endDate}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      endDate: event.target.value
                    }))
                  }
                  required
                />
              </label>
            </div>
            <label>
              Observacao (opcional)
              <textarea
                value={editForm.note}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    note: event.target.value
                  }))
                }
              />
            </label>
            <label className="remember-row">
              <input
                type="checkbox"
                checked={editForm.allowTimePunch}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    allowTimePunch: event.target.checked
                  }))
                }
              />
              <span>Permitir batida de ponto no periodo</span>
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
        open={allowPunchConfirmOpen}
        title="Permitir batida no periodo?"
        message="Voce esta liberando batidas de ponto durante as ferias. Confirma essa liberacao?"
        confirmLabel="Confirmar e salvar"
        cancelLabel="Voltar"
        busy={saving}
        onCancel={() => setAllowPunchConfirmOpen(false)}
        onConfirm={() => {
          void persistEdit();
        }}
      />

      <ConfirmModal
        open={deleteOpen}
        title="Cancelar periodo de ferias?"
        message="O periodo deixara de aparecer como ferias no registro de ponto. Batidas ja arquivadas nao serao restauradas."
        confirmLabel="Cancelar periodo"
        cancelLabel="Voltar"
        danger
        busy={saving}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          void confirmDelete();
        }}
      >
        <label>
          Motivo (opcional)
          <textarea value={deleteReason} onChange={(event) => setDeleteReason(event.target.value)} />
        </label>
      </ConfirmModal>
    </main>
  );
}
