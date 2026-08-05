"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Eye } from "lucide-react";

import { Breadcrumbs } from "../../../../components/breadcrumbs";
import { ConfirmModal } from "../../../../components/confirm-modal";
import { EmptyState } from "../../../../components/empty-state";
import { apiFetch } from "../../../../lib/api";
import { fetchEmployeeProfilesBulk } from "../../../../lib/employee-profiles-bulk";

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
  department: string | null;
  positionTitle: string | null;
  contractType: string | null;
  employeeTags: string[];
};

type StatusFilter = VacationPeriodStatus | "all";

type CreateForm = {
  targetUserId: string;
  startDate: string;
  endDate: string;
  note: string;
  allowTimePunch: boolean;
};

function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const from = new Date(y, m, 1);
  const to = new Date(y, m + 1, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    from: `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`,
    to: `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}`
  };
}

function toDateLabel(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function statusMeta(status: VacationPeriodStatus): { label: string; kind: "success" | "danger" | "neutral" } {
  if (status === "active") return { label: "Ativo", kind: "success" };
  return { label: "Cancelado", kind: "danger" };
}

export default function VacationsPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;
  const monthDefaults = useMemo(() => currentMonthRange(), []);

  const [roles, setRoles] = useState<string[]>([]);
  const [vacations, setVacations] = useState<VacationPeriod[]>([]);
  const [employees, setEmployees] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [from, setFrom] = useState(monthDefaults.from);
  const [to, setTo] = useState(monthDefaults.to);
  const [status, setStatus] = useState<StatusFilter>("active");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [contractType, setContractType] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [allowPunchConfirmOpen, setAllowPunchConfirmOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [createForm, setCreateForm] = useState<CreateForm>({
    targetUserId: "",
    startDate: monthDefaults.from,
    endDate: monthDefaults.to,
    note: "",
    allowTimePunch: false
  });

  const canManage = useMemo(
    () => roles.some((role) => ["owner", "admin", "manager", "analyst", "preposto"].includes(role)),
    [roles]
  );

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
        byName.includes(needle) ||
        byEmail.includes(needle) ||
        (needleCpf.length > 0 && byCpf.includes(needleCpf))
      );
    });
  }, [employees, employeeSearch]);

  const departmentOptions = useMemo(
    () =>
      Array.from(
        new Set(vacations.map((item) => item.department?.trim()).filter((value): value is string => Boolean(value)))
      ).sort((a, b) => a.localeCompare(b)),
    [vacations]
  );

  const contractOptions = useMemo(
    () =>
      Array.from(
        new Set(vacations.map((item) => item.contractType?.trim()).filter((value): value is string => Boolean(value)))
      ).sort((a, b) => a.localeCompare(b)),
    [vacations]
  );

  const filteredVacations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const digitsSearch = search.replace(/\D/g, "");
    if (!normalizedSearch && !digitsSearch) return vacations;
    return vacations.filter((item) => {
      const name = (item.employeeFullName ?? "").toLowerCase();
      const email = (item.employeeEmail ?? "").toLowerCase();
      const cpf = (item.employeeCpf ?? "").replace(/\D/g, "");
      const byText = normalizedSearch ? name.includes(normalizedSearch) || email.includes(normalizedSearch) : false;
      const byCpf = digitsSearch ? cpf.includes(digitsSearch) : false;
      return byText || byCpf;
    });
  }, [vacations, search]);

  async function loadVacations(managerMode = canManage) {
    const query = new URLSearchParams({ page: "1", pageSize: "100" });
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    if (status !== "all") query.set("status", status);
    if (!managerMode) {
      query.set("mineOnly", "true");
    } else {
      if (department.trim()) query.set("department", department.trim());
      if (contractType.trim()) query.set("contractType", contractType.trim());
    }
    const result = await apiFetch<Paginated<VacationPeriod>>(
      `/v1/tenants/${tenantId}/vacations?${query.toString()}`
    );
    setVacations(result.items ?? []);
  }

  async function loadContextAndData() {
    setLoading(true);
    setError(null);
    try {
      const context = await apiFetch<Context>(`/v1/tenants/${tenantId}/context`);
      setRoles(context.roles);
      const managerMode = context.roles.some((role) =>
        ["owner", "admin", "manager", "analyst", "preposto"].includes(role)
      );
      if (managerMode) {
        const usersRes = await apiFetch<Paginated<TenantUser>>(
          `/v1/tenants/${tenantId}/users?page=1&pageSize=100`
        );
        const tenantUsers = usersRes.items ?? [];
        const bulk = await fetchEmployeeProfilesBulk(
          tenantId,
          tenantUsers.map((item) => item.userId)
        );
        const profileByUserId = new Map<string, EmployeeProfile | null>();
        for (const item of tenantUsers) {
          const b = bulk[item.userId];
          profileByUserId.set(
            item.userId,
            b
              ? {
                  fullName: b.fullName ?? item.fullName,
                  personalEmail: b.personalEmail ?? item.email,
                  cpf: b.cpf ?? item.cpf
                }
              : null
          );
        }
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
      }
      await loadVacations(managerMode);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
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
      await loadVacations();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function persistCreate() {
    if (!createForm.targetUserId) {
      setError("Selecione o colaborador.");
      return;
    }
    if (createForm.endDate < createForm.startDate) {
      setError("A data fim deve ser igual ou posterior a data inicio.");
      return;
    }
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      await apiFetch<VacationPeriod>(`/v1/tenants/${tenantId}/vacations`, {
        method: "POST",
        body: JSON.stringify({
          targetUserId: createForm.targetUserId,
          startDate: createForm.startDate,
          endDate: createForm.endDate,
          note: createForm.note.trim() || null,
          allowTimePunch: createForm.allowTimePunch
        })
      });
      setCreateOpen(false);
      setAllowPunchConfirmOpen(false);
      setCreateForm((current) => ({
        ...current,
        targetUserId: "",
        note: "",
        allowTimePunch: false
      }));
      setOkMsg("Ferias cadastradas com sucesso.");
      await loadVacations(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createForm.allowTimePunch) {
      setAllowPunchConfirmOpen(true);
      return;
    }
    await persistCreate();
  }

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Início", href: `/tenants/${tenantId}/dashboard` },
          { label: "Férias" }
        ]}
      />

      <div className="section-header">
        <h1>Férias</h1>
        {canManage ? (
          <button className="btn" onClick={() => setCreateOpen(true)} disabled={saving}>
            Cadastrar férias
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
            <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
              <option value="all">Todos</option>
              <option value="active">Ativo</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </label>
          <label style={{ gridColumn: "span 34" }}>
            Departamento
            <input
              list="vacation-department-options"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              placeholder="Todos"
              disabled={!canManage}
            />
            <datalist id="vacation-department-options">
              {departmentOptions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>
          <label style={{ gridColumn: "span 33" }}>
            Contrato
            <input
              list="vacation-contract-options"
              value={contractType}
              onChange={(event) => setContractType(event.target.value)}
              placeholder="Todos"
              disabled={!canManage}
            />
            <datalist id="vacation-contract-options">
              {contractOptions.map((item) => (
                <option key={item} value={item} />
              ))}
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
          <p className="muted">Carregando férias...</p>
        ) : filteredVacations.length === 0 ? (
          <EmptyState
            title="Sem férias"
            description={
              canManage
                ? "Nenhum período de férias encontrado para os filtros aplicados."
                : "Nao ha férias vinculadas a voce no periodo informado."
            }
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Inicio</th>
                <th>Fim</th>
                <th>Colaborador</th>
                <th>E-mail</th>
                <th>CPF</th>
                <th>Departamento</th>
                <th>Batida no periodo</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredVacations.map((item) => {
                const statusInfo = statusMeta(item.status);
                return (
                  <tr key={item.id}>
                    <td>{toDateLabel(item.startDate)}</td>
                    <td>{toDateLabel(item.endDate)}</td>
                    <td>{item.employeeFullName ?? "-"}</td>
                    <td>{item.employeeEmail ?? "-"}</td>
                    <td>{item.employeeCpf ?? "-"}</td>
                    <td>{item.department ?? "-"}</td>
                    <td>{item.allowTimePunch ? "Permitida" : "Bloqueada"}</td>
                    <td>
                      <span className={`status-pill ${statusInfo.kind}`}>{statusInfo.label}</span>
                    </td>
                    <td>
                      <Link
                        href={`/tenants/${tenantId}/vacations/${item.id}`}
                        className="icon-btn"
                        title="Detalhes"
                        aria-label="Detalhes"
                      >
                        <Eye size={15} />
                      </Link>
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
          <form
            className="modal-card stack"
            role="dialog"
            aria-modal="true"
            aria-label="Cadastrar férias"
            onSubmit={submitCreate}
          >
            <h3 style={{ margin: 0 }}>Cadastrar férias</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Informe o periodo e o colaborador. Batidas existentes no intervalo serao arquivadas automaticamente.
            </p>
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
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    targetUserId: event.target.value
                  }))
                }
              >
                <option value="">Selecione</option>
                {filteredEmployees.map((item) => (
                  <option key={item.userId} value={item.userId}>
                    {employeeLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-grid form-grid-2">
              <label>
                Data inicio
                <input
                  type="date"
                  value={createForm.startDate}
                  onChange={(event) =>
                    setCreateForm((current) => ({
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
                  value={createForm.endDate}
                  onChange={(event) =>
                    setCreateForm((current) => ({
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
                value={createForm.note}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    note: event.target.value
                  }))
                }
              />
            </label>
            <label className="remember-row">
              <input
                type="checkbox"
                checked={createForm.allowTimePunch}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    allowTimePunch: event.target.checked
                  }))
                }
              />
              <span>Permitir batida de ponto no periodo</span>
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

      <ConfirmModal
        open={allowPunchConfirmOpen}
        title="Permitir batida no periodo?"
        message="Voce marcou que o colaborador podera bater ponto durante as ferias. Confirma essa liberacao?"
        confirmLabel="Confirmar e salvar"
        cancelLabel="Voltar"
        busy={saving}
        onCancel={() => setAllowPunchConfirmOpen(false)}
        onConfirm={() => {
          void persistCreate();
        }}
      />
    </main>
  );
}
