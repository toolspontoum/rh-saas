"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Eye, PlayCircle } from "lucide-react";

import { Breadcrumbs } from "../../../../components/breadcrumbs";
import { EmptyState } from "../../../../components/empty-state";
import { apiFetch } from "../../../../lib/api";

type Context = { roles: string[] };
type Paginated<T> = { items: T[]; page: number; pageSize: number };

type TenantUser = {
  userId: string;
  email: string | null;
  fullName: string | null;
  cpf: string | null;
  roles: string[];
};

type EmployeeProfile = {
  fullName: string | null;
  personalEmail: string | null;
  cpf: string | null;
};

type OncallShiftStatus = "pending_ack" | "acknowledged" | "entry_registered" | "cancelled";

type OncallShift = {
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
  employeeFullName: string | null;
  employeeEmail: string | null;
  employeeCpf: string | null;
  department: string | null;
  positionTitle: string | null;
  contractType: string | null;
  employeeTags: string[];
};

type OncallStatusFilter = OncallShiftStatus | "all";

type CreateShiftForm = {
  targetUserId: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  note: string;
};

const today = new Date().toISOString().slice(0, 10);

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

function isInActiveWindow(shift: OncallShift): boolean {
  const now = Date.now();
  const startsAt = new Date(shift.startsAt).getTime();
  const endsAt = new Date(shift.endsAt).getTime();
  return Number.isFinite(startsAt) && Number.isFinite(endsAt) && now >= startsAt && now <= endsAt;
}

export default function OncallPage() {
  const params = useParams<{ tenantId: string }>();
  const router = useRouter();
  const tenantId = params.tenantId;

  const [roles, setRoles] = useState<string[]>([]);
  const [shifts, setShifts] = useState<OncallShift[]>([]);
  const [employees, setEmployees] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [status, setStatus] = useState<OncallStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [contractType, setContractType] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [createForm, setCreateForm] = useState<CreateShiftForm>({
    targetUserId: "",
    scheduledDate: today,
    startTime: "18:00",
    endTime: "23:00",
    note: ""
  });

  const canManage = useMemo(
    () => roles.some((role) => ["owner", "admin", "manager", "analyst"].includes(role)),
    [roles]
  );

  const canAcknowledge = (shift: OncallShift): boolean => !canManage && shift.status === "pending_ack";
  const canRegisterEntry = (shift: OncallShift): boolean =>
    !canManage && shift.status === "acknowledged" && isInActiveWindow(shift);

  function employeeLabel(item: TenantUser): string {
    const name = item.fullName?.trim() || "-";
    const email = item.email?.trim() || "-";
    const cpf = item.cpf?.trim() || "-";
    return `${name} - ${email} - CPF ${cpf}`;
  }

  const filteredEmployees = useMemo(() => {
    const needle = employeeSearch.trim().toLowerCase();
    if (!needle) return employees;
    return employees.filter((item) => {
      const byName = (item.fullName ?? "").toLowerCase();
      const byEmail = (item.email ?? "").toLowerCase();
      const byCpf = (item.cpf ?? "").replace(/\D/g, "");
      const needleCpf = needle.replace(/\D/g, "");
      return (
        byName.startsWith(needle) ||
        byEmail.startsWith(needle) ||
        byName.includes(needle) ||
        byEmail.includes(needle) ||
        (needleCpf.length > 0 && byCpf.includes(needleCpf))
      );
    });
  }, [employees, employeeSearch]);

  const departmentOptions = useMemo(
    () =>
      Array.from(
        new Set(
          shifts
            .map((item) => item.department?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [shifts]
  );

  const contractOptions = useMemo(
    () =>
      Array.from(
        new Set(
          shifts
            .map((item) => item.contractType?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [shifts]
  );

  const filteredShifts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const digitsSearch = search.replace(/\D/g, "");
    if (!normalizedSearch && !digitsSearch) return shifts;
    return shifts.filter((item) => {
      const name = (item.employeeFullName ?? "").toLowerCase();
      const email = (item.employeeEmail ?? "").toLowerCase();
      const cpf = (item.employeeCpf ?? "").replace(/\D/g, "");
      const byText = normalizedSearch ? name.includes(normalizedSearch) || email.includes(normalizedSearch) : false;
      const byCpf = digitsSearch ? cpf.includes(digitsSearch) : false;
      return byText || byCpf;
    });
  }, [shifts, search]);

  async function loadContextAndData() {
    setLoading(true);
    setError(null);
    try {
      const context = await apiFetch<Context>(`/v1/tenants/${tenantId}/context`);
      setRoles(context.roles);
      const managerMode = context.roles.some((role) =>
        ["owner", "admin", "manager", "analyst"].includes(role)
      );
      if (managerMode) {
        const usersRes = await apiFetch<Paginated<TenantUser>>(
          `/v1/tenants/${tenantId}/users?page=1&pageSize=100`
        );
        const tenantUsers = usersRes.items ?? [];
        const profileEntries = await Promise.all(
          tenantUsers.map(async (item) => {
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
        const profileByUserId = new Map(profileEntries);
        const employeeUsers = tenantUsers
          .filter((item) => item.roles.includes("employee") || Boolean(profileByUserId.get(item.userId)))
          .map((item) => {
            const profile = profileByUserId.get(item.userId);
            return {
              ...item,
              fullName: profile?.fullName ?? item.fullName,
              email: profile?.personalEmail ?? item.email,
              cpf: profile?.cpf ?? item.cpf
            };
          });
        setEmployees(employeeUsers);
        setCreateForm((current) => ({
          ...current,
          targetUserId: current.targetUserId || employeeUsers[0]?.userId || ""
        }));
      }
      await loadShifts(managerMode);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loadShifts(managerMode = canManage) {
    const query = new URLSearchParams({ page: "1", pageSize: "100" });
    const normalizedStatus: OncallStatusFilter = ["all", "pending_ack", "acknowledged", "entry_registered", "cancelled"].includes(status)
      ? status
      : "all";
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    if (normalizedStatus !== "all") query.set("status", normalizedStatus);
    if (!managerMode) {
      query.set("mineOnly", "true");
    } else {
      if (department.trim()) query.set("department", department.trim());
      if (contractType.trim()) query.set("contractType", contractType.trim());
    }
    const result = await apiFetch<Paginated<OncallShift>>(
      `/v1/tenants/${tenantId}/oncall-shifts?${query.toString()}`
    );
    setShifts(result.items ?? []);
  }

  useEffect(() => {
    loadContextAndData().catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  async function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setOkMsg(null);
    setLoading(true);
    try {
      await loadShifts();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function submitCreateShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!createForm.targetUserId) {
      setError("Selecione o colaborador.");
      return;
    }
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      await apiFetch<OncallShift>(`/v1/tenants/${tenantId}/oncall-shifts`, {
        method: "POST",
        body: JSON.stringify({
          targetUserId: createForm.targetUserId,
          scheduledDate: createForm.scheduledDate,
          startTime: createForm.startTime,
          endTime: createForm.endTime,
          note: createForm.note.trim() || null
        })
      });
      setCreateOpen(false);
      setCreateForm((current) => ({ ...current, note: "" }));
      setOkMsg("Sobreaviso cadastrado com sucesso.");
      await loadShifts(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAcknowledge(shift: OncallShift) {
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      await apiFetch<OncallShift>(`/v1/tenants/${tenantId}/oncall-shifts/${shift.id}/acknowledge`, {
        method: "POST",
        body: JSON.stringify({})
      });
      setOkMsg("Ciente registrado com sucesso.");
      await loadShifts(canManage);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRegisterEntry(shift: OncallShift) {
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      await apiFetch(`/v1/tenants/${tenantId}/oncall-shifts/${shift.id}/register-entry`, {
        method: "POST",
        body: JSON.stringify({
          source: "oncall_web"
        })
      });
      setOkMsg("Entrada do sobreaviso registrada e vinculada ao ponto.");
      await loadShifts(canManage);
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
          { label: "Início", href: `/tenants/${tenantId}/dashboard` },
          { label: "Sobreaviso" }
        ]}
      />

      <div className="section-header">
        <h1>Sobreaviso</h1>
        {canManage ? (
          <button className="btn" onClick={() => setCreateOpen(true)} disabled={saving}>
            Cadastrar sobreaviso
          </button>
        ) : null}
      </div>

      {error ? <p className="error">{error}</p> : null}
      {okMsg ? <p>{okMsg}</p> : null}

      <form className="card stack" onSubmit={submitFilters}>
        <div
          className="form-grid"
          style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(100, minmax(0, 1fr))", alignItems: "end" }}
        >
          <label style={{ gridColumn: "span 60" }}>
            Busca
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome, CPF ou e-mail"
            />
          </label>
          <label style={{ gridColumn: "span 20" }}>
            Data inicial
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label style={{ gridColumn: "span 20" }}>
            Data final
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <label style={{ gridColumn: "span 33" }}>
            Status
            <input
              list="oncall-status-options"
              value={status === "all" ? "Todos" : status}
              onChange={(event) => {
                const value = event.target.value.trim();
                setStatus((!value || value.toLowerCase() === "todos" ? "all" : value) as OncallStatusFilter);
              }}
              placeholder="Todos"
            />
            <datalist id="oncall-status-options">
              <option value="Todos" />
              <option value="pending_ack" />
              <option value="acknowledged" />
              <option value="entry_registered" />
              <option value="cancelled" />
            </datalist>
          </label>
          <label style={{ gridColumn: "span 34" }}>
            Departamento
            <input
              list="oncall-department-options"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              placeholder="Todos"
            />
            <datalist id="oncall-department-options">
              {departmentOptions.map((item) => <option key={item} value={item} />)}
            </datalist>
          </label>
          <label style={{ gridColumn: "span 33" }}>
            Contrato
            <input
              list="oncall-contract-options"
              value={contractType}
              onChange={(event) => setContractType(event.target.value)}
              placeholder="Todos"
            />
            <datalist id="oncall-contract-options">
              {contractOptions.map((item) => <option key={item} value={item} />)}
            </datalist>
          </label>
        </div>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button type="submit" disabled={loading || saving}>
            {loading ? "Carregando..." : "Filtrar"}
          </button>
        </div>
      </form>

      <div className="card table-wrap">
        {loading ? (
          <p className="muted">Carregando sobreavisos...</p>
        ) : filteredShifts.length === 0 ? (
          <EmptyState
            title="Sem sobreavisos"
            description={
              canManage
                ? "Nenhum sobreaviso encontrado para os filtros aplicados."
                : "Nao ha sobreavisos vinculados a voce no periodo informado."
            }
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Inicio</th>
                <th>Fim</th>
                <th>Colaborador</th>
                <th>E-mail</th>
                <th>CPF</th>
                <th>Departamento</th>
                <th>Cargo</th>
                <th>Contrato</th>
                <th>Tags</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredShifts.map((shift) => {
                const statusInfo = statusMeta(shift.status);
                return (
                  <tr key={shift.id}>
                    <td>{toDateLabel(shift.scheduledDate)}</td>
                    <td>{toDateTimeLabel(shift.startsAt)}</td>
                    <td>{toDateTimeLabel(shift.endsAt)}</td>
                    <td>{shift.employeeFullName ?? "-"}</td>
                    <td>{shift.employeeEmail ?? "-"}</td>
                    <td>{shift.employeeCpf ?? "-"}</td>
                    <td>{shift.department ?? "-"}</td>
                    <td>{shift.positionTitle ?? "-"}</td>
                    <td>{shift.contractType ?? "-"}</td>
                    <td>
                      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                        {(shift.employeeTags ?? []).length === 0 ? <span className="muted">-</span> : null}
                        {(shift.employeeTags ?? []).map((item) => (
                          <span key={`${shift.id}-${item}`} className="badge">
                            {item.replace(/-/g, " ")}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${statusInfo.kind}`}>{statusInfo.label}</span>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                        <Link
                          href={`/tenants/${tenantId}/oncall/${shift.id}`}
                          className="icon-btn"
                          title="Detalhes"
                          aria-label="Detalhes"
                        >
                          <Eye size={15} />
                        </Link>
                        {canAcknowledge(shift) ? (
                          <button
                            className="icon-btn"
                            title="Dar ciente"
                            aria-label="Dar ciente"
                            onClick={() => handleAcknowledge(shift)}
                            disabled={saving}
                          >
                            <CheckCircle2 size={15} />
                          </button>
                        ) : null}
                        {canRegisterEntry(shift) ? (
                          <button
                            type="button"
                            className="icon-btn"
                            title="Registrar entrada"
                            aria-label="Registrar entrada"
                            onClick={() =>
                              router.push(
                                `/tenants/${tenantId}/time/register?oncallShiftId=${encodeURIComponent(shift.id)}`
                              )
                            }
                            disabled={saving}
                          >
                            <PlayCircle size={15} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {createOpen ? (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-card stack" role="dialog" aria-modal="true" aria-label="Cadastrar sobreaviso" onSubmit={submitCreateShift}>
            <h3 style={{ margin: 0 }}>Cadastrar sobreaviso</h3>
            <p className="muted" style={{ marginTop: 0 }}>Defina data, horario e colaborador para criar o novo sobreaviso.</p>
            <label>
              Pesquisar colaborador
              <input
                value={employeeSearch}
                onChange={(event) => setEmployeeSearch(event.target.value)}
                placeholder="Digite nome, e-mail ou CPF"
              />
            </label>
            <label>
              Colaborador
              <select
                value={createForm.targetUserId}
                onChange={(event) => {
                  const nextUserId = event.target.value;
                  setCreateForm((current) => ({
                    ...current,
                    targetUserId: nextUserId
                  }));
                }}
              >
                <option value="">Selecione</option>
                {filteredEmployees.map((item) => (
                  <option key={item.userId} value={item.userId}>
                    {employeeLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-grid form-grid-3">
              <label>
                Data
                <input
                  type="date"
                  value={createForm.scheduledDate}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      scheduledDate: event.target.value
                    }))
                  }
                />
              </label>
              <label>
                Hora inicial
                <input
                  type="time"
                  value={createForm.startTime}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      startTime: event.target.value
                    }))
                  }
                />
              </label>
              <label>
                Hora final
                <input
                  type="time"
                  value={createForm.endTime}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      endTime: event.target.value
                    }))
                  }
                />
              </label>
            </div>
            <label>
              Observacao (opcional)
              <textarea
                value={createForm.note}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    note: event.target.value
                  }))
                }
              />
            </label>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
