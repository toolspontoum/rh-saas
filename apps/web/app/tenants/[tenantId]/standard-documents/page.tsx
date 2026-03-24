"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { Breadcrumbs } from "../../../../components/breadcrumbs";
import { EmptyState } from "../../../../components/empty-state";
import { apiFetch } from "../../../../lib/api";

type StandardDocRow = {
  id: string;
  docClass: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  isEnabled: boolean;
  requiredForHire: boolean;
  requiredForRecruitment: boolean;
};

type ListResponse = { items: StandardDocRow[] };

export default function StandardDocumentsPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;

  const [rows, setRows] = useState<StandardDocRow[]>([]);
  const [draft, setDraft] = useState<Record<string, Pick<StandardDocRow, "isEnabled" | "requiredForHire" | "requiredForRecruitment">>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetch<ListResponse>(`/v1/tenants/${tenantId}/standard-document-types`)
      .then((data) => {
        setRows(data.items);
        const next: Record<string, Pick<StandardDocRow, "isEnabled" | "requiredForHire" | "requiredForRecruitment">> = {};
        for (const r of data.items) {
          next[r.id] = {
            isEnabled: r.isEnabled,
            requiredForHire: r.requiredForHire,
            requiredForRecruitment: r.requiredForRecruitment
          };
        }
        setDraft(next);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = useMemo(() => {
    for (const r of rows) {
      const d = draft[r.id];
      if (!d) return true;
      if (d.isEnabled !== r.isEnabled || d.requiredForHire !== r.requiredForHire || d.requiredForRecruitment !== r.requiredForRecruitment) {
        return true;
      }
    }
    return false;
  }, [rows, draft]);

  async function save() {
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const items = rows.map((r) => {
        const d = draft[r.id] ?? {
          isEnabled: r.isEnabled,
          requiredForHire: r.requiredForHire,
          requiredForRecruitment: r.requiredForRecruitment
        };
        return {
          platformDocumentTypeId: r.id,
          isEnabled: d.isEnabled,
          requiredForHire: d.requiredForHire,
          requiredForRecruitment: d.requiredForRecruitment
        };
      });
      await apiFetch(`/v1/tenants/${tenantId}/standard-document-types`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
      });
      setOkMsg("Preferencias salvas.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  function patchRow(
    id: string,
    patch: Partial<Pick<StandardDocRow, "isEnabled" | "requiredForHire" | "requiredForRecruitment">>
  ) {
    setDraft((prev) => {
      const base = prev[id] ?? { isEnabled: true, requiredForHire: false, requiredForRecruitment: false };
      return { ...prev, [id]: { ...base, ...patch } };
    });
  }

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Visão Geral", href: `/tenants/${tenantId}/dashboard` },
          { label: "Backoffice" },
          { label: "Documentos padrão" }
        ]}
      />

      <div className="section-header">
        <h1>Documentos padrão</h1>
        <button type="button" onClick={() => void save()} disabled={saving || !dirty || loading}>
          {saving ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>

      <p className="muted" style={{ marginTop: 0 }}>
        Ative ou desative tipos de documento cadastrados na plataforma para este assinante. Marque obrigatoriedade na contratação e/ou no recrutamento para
        gerar solicitações automaticamente em novas vagas e novos colaboradores (conforme regras do sistema).
      </p>

      {error ? <p className="error">{error}</p> : null}
      {okMsg ? <p className="muted">{okMsg}</p> : null}

      {loading ? <p className="muted">Carregando…</p> : null}

      {!loading && rows.length === 0 ? (
        <EmptyState
          title="Nenhum tipo disponível"
          description="Ainda não há tipos de documento ativos no catálogo da plataforma. Um superadmin pode cadastrá-los via API / painel de plataforma."
        />
      ) : null}

      {!loading && rows.length > 0 ? (
        <div className="card stack" style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Classe</th>
                <th>Documento</th>
                <th>Ativo no assinante</th>
                <th>Obrig. contratação</th>
                <th>Obrig. recrutamento</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const d = draft[r.id] ?? {
                  isEnabled: r.isEnabled,
                  requiredForHire: r.requiredForHire,
                  requiredForRecruitment: r.requiredForRecruitment
                };
                return (
                  <tr key={r.id}>
                    <td>{r.docClass}</td>
                    <td>{r.label}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={d.isEnabled}
                        onChange={(e) => patchRow(r.id, { isEnabled: e.target.checked })}
                        aria-label={`Ativo: ${r.label}`}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={d.requiredForHire}
                        disabled={!d.isEnabled}
                        onChange={(e) => patchRow(r.id, { requiredForHire: e.target.checked })}
                        aria-label={`Obrigatório na contratação: ${r.label}`}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={d.requiredForRecruitment}
                        disabled={!d.isEnabled}
                        onChange={(e) => patchRow(r.id, { requiredForRecruitment: e.target.checked })}
                        aria-label={`Obrigatório no recrutamento: ${r.label}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}
