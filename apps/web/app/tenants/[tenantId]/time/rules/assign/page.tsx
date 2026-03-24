"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  roles: string[];
};

type Paginated<T> = { items: T[] };

export default function AssignShiftTemplatePage() {
  const params = useParams<{ tenantId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tenantId = params.tenantId;

  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [form, setForm] = useState({
    targetUserId: searchParams.get("targetUserId") ?? "",
    shiftTemplateId: searchParams.get("shiftTemplateId") ?? "",
    startsAt: new Date().toISOString().slice(0, 10),
    endsAt: ""
  });
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<ShiftTemplate[]>(`/v1/tenants/${tenantId}/shift-templates`),
      apiFetch<Paginated<TenantUser>>(`/v1/tenants/${tenantId}/users?page=1&pageSize=100`)
    ])
      .then(([templateItems, userItems]) => {
        setTemplates(templateItems);
        setUsers(userItems.items);

        setForm((current) => ({
          ...current,
          shiftTemplateId: current.shiftTemplateId || templateItems[0]?.id || ""
        }));
      })
      .catch((err: Error) => setError(err.message));
  }, [tenantId]);

  const employeeUsers = useMemo(() => {
    return users.filter((item) => item.roles.some((role) => ["employee", "viewer"].includes(role)));
  }, [users]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setOkMsg(null);

    if (!form.targetUserId || !form.shiftTemplateId || !form.startsAt) {
      setError("Selecione funcionário, jornada e data de início.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch(`/v1/tenants/${tenantId}/shift-assignments`, {
        method: "POST",
        body: JSON.stringify({
          targetUserId: form.targetUserId,
          shiftTemplateId: form.shiftTemplateId,
          startsAt: form.startsAt,
          endsAt: form.endsAt || null
        })
      });
      setOkMsg("Jornada vinculada ao funcionário com sucesso.");
      setTimeout(() => {
        router.push(`/tenants/${tenantId}/time/rules`);
      }, 600);
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
          { label: "Visão Geral", href: `/tenants/${tenantId}/dashboard` },
          { label: "Backoffice" },
          { label: "Regras de ponto", href: `/tenants/${tenantId}/time/rules` },
          { label: "Vincular jornada" }
        ]}
      />

      <div className="section-header">
        <h1>Vincular jornada ao funcionário</h1>
        <Link href={`/tenants/${tenantId}/time/rules`}>
          <button className="secondary">Voltar</button>
        </Link>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {okMsg ? <p>{okMsg}</p> : null}

      <div className="card stack">
        <form className="stack" onSubmit={handleSubmit}>
          <div className="form-grid form-grid-2">
            <label>
              Funcionário
              <select
                value={form.targetUserId}
                onChange={(e) => setForm((current) => ({ ...current, targetUserId: e.target.value }))}
              >
                <option value="">Selecione</option>
                {employeeUsers.map((user) => (
                  <option key={user.userId} value={user.userId}>
                    {user.fullName ?? user.email ?? user.userId}
                  </option>
                ))}
              </select>
            </label>

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

          <button type="submit" disabled={saving}>{saving ? "Vinculando..." : "Vincular jornada"}</button>
        </form>
      </div>
    </main>
  );
}
