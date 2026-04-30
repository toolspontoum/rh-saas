"use client";

import { FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { Breadcrumbs } from "../../../../../../components/breadcrumbs";
import { apiFetch } from "../../../../../../lib/api";

type ShiftTemplate = {
  id: string;
  name: string;
};

type TenantUser = {
  userId: string;
  fullName: string | null;
  email: string | null;
  cpf: string | null;
  roles: string[];
};

type Paginated<T> = { items: T[] };

type ShiftAssignmentListItem = {
  id: string;
  userId: string;
  shiftTemplateId: string;
  templateName: string;
  startsAt: string;
  endsAt: string | null;
};

const JORNADA_SEM_VINCULO = "__sem_jornada__";
/** Limite do `listUsers` na API (`pageSize` max 250). */
const USERS_PAGE_SIZE = 250;

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function formatCpfDisplay(cpf: string | null): string {
  if (!cpf) return "—";
  const d = normalizeDigits(cpf);
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export default function AssignShiftTemplatePage() {
  const params = useParams<{ tenantId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tenantId = params.tenantId;

  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignmentListItem[]>([]);
  const [form, setForm] = useState({
    shiftTemplateId: searchParams.get("shiftTemplateId") ?? "",
    startsAt: new Date().toISOString().slice(0, 10),
    endsAt: ""
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterName, setFilterName] = useState("");
  const [filterCpf, setFilterCpf] = useState("");
  const [filterEmail, setFilterEmail] = useState("");
  const [filterJornada, setFilterJornada] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const headerSelectRef = useRef<HTMLInputElement>(null);
  const prefilledTargetRef = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [templateItems, assignItems] = await Promise.all([
        apiFetch<ShiftTemplate[]>(`/v1/tenants/${tenantId}/shift-templates`),
        apiFetch<ShiftAssignmentListItem[]>(`/v1/tenants/${tenantId}/shift-assignments`)
      ]);
      const mergedUsers: TenantUser[] = [];
      for (let page = 1; page <= 40; page += 1) {
        const batch = await apiFetch<Paginated<TenantUser>>(
          `/v1/tenants/${tenantId}/users?page=${page}&pageSize=${USERS_PAGE_SIZE}`
        );
        mergedUsers.push(...batch.items);
        if (batch.items.length < USERS_PAGE_SIZE) break;
      }
      setTemplates(templateItems);
      setUsers(mergedUsers);
      setAssignments(assignItems);
      setForm((current) => ({
        ...current,
        shiftTemplateId: current.shiftTemplateId || templateItems[0]?.id || ""
      }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const assignmentByUserId = useMemo(() => {
    const map = new Map<string, ShiftAssignmentListItem>();
    for (const row of assignments) {
      map.set(row.userId, row);
    }
    return map;
  }, [assignments]);

  const employeeUsers = useMemo(() => {
    return users
      .filter((item) => item.roles.some((role) => ["employee", "viewer"].includes(role)))
      .slice()
      .sort((a, b) => (a.fullName ?? a.email ?? "").localeCompare(b.fullName ?? b.email ?? "", "pt-BR"));
  }, [users]);

  const filteredRows = useMemo(() => {
    const nameNeedle = filterName.trim().toLowerCase();
    const cpfNeedle = normalizeDigits(filterCpf);
    const emailNeedle = filterEmail.trim().toLowerCase();

    return employeeUsers.filter((u) => {
      const link = assignmentByUserId.get(u.userId);
      if (filterJornada === JORNADA_SEM_VINCULO) {
        if (link) return false;
      } else if (filterJornada) {
        if (!link || link.shiftTemplateId !== filterJornada) return false;
      }

      if (nameNeedle && !(u.fullName ?? "").toLowerCase().includes(nameNeedle)) {
        return false;
      }
      if (cpfNeedle && !normalizeDigits(u.cpf ?? "").includes(cpfNeedle)) {
        return false;
      }
      if (emailNeedle && !(u.email ?? "").toLowerCase().includes(emailNeedle)) {
        return false;
      }
      return true;
    });
  }, [employeeUsers, assignmentByUserId, filterName, filterCpf, filterEmail, filterJornada]);

  const selectableVisibleIds = useMemo(
    () => filteredRows.filter((u) => !assignmentByUserId.has(u.userId)).map((u) => u.userId),
    [filteredRows, assignmentByUserId]
  );

  useEffect(() => {
    if (prefilledTargetRef.current || loading) return;
    const pre = searchParams.get("targetUserId");
    if (!pre) return;
    if (!assignmentByUserId.has(pre) && employeeUsers.some((u) => u.userId === pre)) {
      prefilledTargetRef.current = true;
      setSelectedIds((prev) => new Set(prev).add(pre));
    }
  }, [searchParams, assignmentByUserId, employeeUsers, loading]);

  const headerChecked =
    selectableVisibleIds.length > 0 && selectableVisibleIds.every((id) => selectedIds.has(id));

  useLayoutEffect(() => {
    const el = headerSelectRef.current;
    if (!el) return;
    const n = selectableVisibleIds.length;
    const selectedCount = selectableVisibleIds.filter((id) => selectedIds.has(id)).length;
    el.indeterminate = selectedCount > 0 && selectedCount < n;
  }, [selectableVisibleIds, selectedIds]);

  function toggleRow(userId: string, hasAssignment: boolean) {
    if (hasAssignment) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    const eligible = selectableVisibleIds;
    const allSelected = eligible.length > 0 && eligible.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const id of eligible) next.delete(id);
      } else {
        for (const id of eligible) next.add(id);
      }
      return next;
    });
  }

  async function handleUnlink(assignmentId: string) {
    setError(null);
    setOkMsg(null);
    setUnlinkingId(assignmentId);
    try {
      await apiFetch<void>(`/v1/tenants/${tenantId}/shift-assignments/${assignmentId}`, {
        method: "DELETE"
      });
      setOkMsg("Jornada desvinculada.");
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUnlinkingId(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setOkMsg(null);

    const ids = [...selectedIds].filter((id) => !assignmentByUserId.has(id));
    if (ids.length === 0) {
      setError("Selecione ao menos um colaborador sem jornada vinculada.");
      return;
    }
    if (!form.shiftTemplateId || !form.startsAt) {
      setError("Selecione o modelo de jornada e a data de início.");
      return;
    }

    setSaving(true);
    const failures: string[] = [];
    let ok = 0;
    try {
      for (const targetUserId of ids) {
        try {
          await apiFetch(`/v1/tenants/${tenantId}/shift-assignments`, {
            method: "POST",
            body: JSON.stringify({
              targetUserId,
              shiftTemplateId: form.shiftTemplateId,
              startsAt: form.startsAt,
              endsAt: form.endsAt || null
            })
          });
          ok += 1;
        } catch (e) {
          const label =
            users.find((u) => u.userId === targetUserId)?.fullName ??
            users.find((u) => u.userId === targetUserId)?.email ??
            targetUserId;
          failures.push(`${label}: ${(e as Error).message}`);
        }
      }

      if (failures.length === 0) {
        setOkMsg(`Jornada vinculada a ${ok} colaborador(es).`);
        setSelectedIds(new Set());
        await loadData();
        setTimeout(() => {
          router.push(`/tenants/${tenantId}/time/rules`);
        }, 900);
      } else {
        setOkMsg(
          ok > 0
            ? `Vinculado a ${ok}. Falhou em ${failures.length}: ${failures.slice(0, 5).join(" | ")}${failures.length > 5 ? "…" : ""}`
            : failures.slice(0, 3).join(" | ")
        );
        await loadData();
        setSelectedIds(new Set());
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Visão Geral", href: `/tenants/${tenantId}/dashboard` },
          { label: "Backoffice" },
          { label: "Regras de ponto", href: `/tenants/${tenantId}/time/rules` },
          { label: "Vincular jornada" }
        ]}
      />

      <div className="section-header">
        <h1>Vincular jornada ao funcionário</h1>
        <Link href={`/tenants/${tenantId}/time/rules`}>
          <button type="button" className="secondary">
            Voltar
          </button>
        </Link>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {okMsg ? <p>{okMsg}</p> : null}

      <form className="stack" onSubmit={handleSubmit}>
        <div className="card stack">
          <strong style={{ fontSize: "1.05rem" }}>Modelo e período</strong>
          <div className="form-grid form-grid-2">
            <label>
              Modelo de jornada
              <select
                value={form.shiftTemplateId}
                onChange={(e) => setForm((current) => ({ ...current, shiftTemplateId: e.target.value }))}
              >
                <option value="">Selecione</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Início
              <input
                type="date"
                value={form.startsAt}
                onChange={(e) => setForm((current) => ({ ...current, startsAt: e.target.value }))}
              />
            </label>

            <label>
              Fim (opcional)
              <input
                type="date"
                value={form.endsAt}
                onChange={(e) => setForm((current) => ({ ...current, endsAt: e.target.value }))}
              />
            </label>
          </div>
        </div>

        <div className="card stack">
          <strong style={{ fontSize: "1.05rem" }}>Colaboradores</strong>
          <div className="stack" style={{ gap: 12 }}>
            <strong>Filtros</strong>
            <div className="form-grid form-grid-2">
              <label>
                Nome
                <input
                  type="search"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Filtrar por nome"
                />
              </label>
              <label>
                CPF
                <input
                  type="search"
                  value={filterCpf}
                  onChange={(e) => setFilterCpf(e.target.value)}
                  placeholder="Filtrar por CPF"
                />
              </label>
              <label>
                E-mail
                <input
                  type="search"
                  value={filterEmail}
                  onChange={(e) => setFilterEmail(e.target.value)}
                  placeholder="Filtrar por e-mail"
                />
              </label>
              <label>
                Jornada
                <select value={filterJornada} onChange={(e) => setFilterJornada(e.target.value)}>
                  <option value="">Todas</option>
                  <option value={JORNADA_SEM_VINCULO}>Sem jornada vinculada</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="table-wrap" style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>
                    <input
                      ref={headerSelectRef}
                      type="checkbox"
                      checked={headerChecked}
                      title="Selecionar todos os colaboradores elegíveis nesta lista"
                      aria-label="Selecionar todos os colaboradores elegíveis nesta lista"
                      disabled={selectableVisibleIds.length === 0 || loading}
                      onChange={toggleSelectAllVisible}
                    />
                  </th>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>E-mail</th>
                  <th>Jornada vinculada</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5}>
                      <p className="muted" style={{ margin: 0 }}>
                        Carregando colaboradores…
                      </p>
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <p className="muted" style={{ margin: 0 }}>
                        Nenhum colaborador encontrado com estes filtros.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((user) => {
                    const link = assignmentByUserId.get(user.userId);
                    const blocked = Boolean(link);
                    return (
                      <tr key={user.userId}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(user.userId)}
                            disabled={blocked}
                            title={blocked ? "Desvincule a jornada atual para selecionar" : undefined}
                            aria-label={`Selecionar ${user.fullName ?? user.email ?? user.userId}`}
                            onChange={() => toggleRow(user.userId, blocked)}
                          />
                        </td>
                        <td>{user.fullName ?? "—"}</td>
                        <td>{formatCpfDisplay(user.cpf)}</td>
                        <td>{user.email ?? "—"}</td>
                        <td>
                          {link ? (
                            <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <span>{link.templateName}</span>
                              <button
                                type="button"
                                className="secondary"
                                style={{ fontSize: 13, padding: "4px 10px" }}
                                disabled={unlinkingId === link.id}
                                onClick={() => void handleUnlink(link.id)}
                              >
                                {unlinkingId === link.id ? "…" : "Desvincular"}
                              </button>
                            </div>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <button type="submit" disabled={saving || loading}>
          {saving ? "Vinculando…" : "Vincular jornada"}
        </button>
      </form>
    </main>
  );
}
