"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { Breadcrumbs } from "../../../../../../components/breadcrumbs";
import { apiFetch } from "../../../../../../lib/api";

export default function NewShiftTemplatePage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    dailyWorkMinutes: "480",
    weeklyWorkMinutes: "2400",
    lunchBreakMinutes: "60",
    overtimePercent: "50",
    monthlyWorkMinutes: "13200"
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Informe o nome do modelo.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch(`/v1/tenants/${tenantId}/shift-templates`, {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          dailyWorkMinutes: Number(form.dailyWorkMinutes || 0),
          weeklyWorkMinutes: form.weeklyWorkMinutes ? Number(form.weeklyWorkMinutes) : null,
          lunchBreakMinutes: Number(form.lunchBreakMinutes || 0),
          overtimePercent: Number(form.overtimePercent || 0),
          monthlyWorkMinutes: Number(form.monthlyWorkMinutes || 0)
        })
      });
      router.push(`/tenants/${tenantId}/time/rules`);
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
          { label: "Criar modelo" }
        ]}
      />

      <div className="section-header">
        <h1>Novo modelo de jornada</h1>
        <Link href={`/tenants/${tenantId}/time/rules`}>
          <button className="secondary">Voltar</button>
        </Link>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="card stack">
        <form className="stack" onSubmit={handleSubmit}>
          <div className="form-grid form-grid-3">
            <label>
              Nome
              <input
                placeholder="Ex.: Escala 12x36"
                value={form.name}
                onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
              />
            </label>
            <label>
              Minutos diários
              <input
                type="number"
                min={1}
                value={form.dailyWorkMinutes}
                onChange={(e) => setForm((current) => ({ ...current, dailyWorkMinutes: e.target.value }))}
              />
            </label>
            <label>
              Minutos semanais
              <input
                type="number"
                min={1}
                value={form.weeklyWorkMinutes}
                onChange={(e) => setForm((current) => ({ ...current, weeklyWorkMinutes: e.target.value }))}
              />
            </label>
            <label>
              Intervalo almoço (min)
              <input
                type="number"
                min={0}
                value={form.lunchBreakMinutes}
                onChange={(e) => setForm((current) => ({ ...current, lunchBreakMinutes: e.target.value }))}
              />
            </label>
            <label>
              Percentual hora extra
              <input
                type="number"
                min={0}
                value={form.overtimePercent}
                onChange={(e) => setForm((current) => ({ ...current, overtimePercent: e.target.value }))}
              />
            </label>
            <label>
              Minutos mensais
              <input
                type="number"
                min={1}
                value={form.monthlyWorkMinutes}
                onChange={(e) => setForm((current) => ({ ...current, monthlyWorkMinutes: e.target.value }))}
              />
            </label>
          </div>
          <button type="submit" disabled={saving}>{saving ? "Salvando..." : "Criar modelo"}</button>
        </form>
      </div>
    </main>
  );
}
