"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { Breadcrumbs } from "../../../../../components/breadcrumbs";
import { EmptyState } from "../../../../../components/empty-state";
import { apiFetch } from "../../../../../lib/api";
import { formatCpf } from "../../../../../lib/br-format";

type UploadIntent = { path: string; signedUrl: string };

type TenantUser = {
  userId: string;
  email: string | null;
  fullName: string | null;
  cpf: string | null;
  roles: string[];
};

type EmployeeProfile = {
  contractType: string | null;
  department: string | null;
  positionTitle: string | null;
  baseSalary: number | null;
  fullName: string | null;
  personalEmail: string | null;
  cpf: string | null;
  employeeTags: string[];
};

type Paginated<T> = { items: T[] };

type DraftStatus = "none" | "draft" | "uploading" | "saved" | "error";
type UploadDraft = {
  file: File | null;
  status: DraftStatus;
  message?: string;
};

function formatMoney(value: number | null): string {
  if (value == null) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatReferenceMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  if (!y || !m) return ym;
  return `${m}/${y}`;
}

function statusLabel(status: DraftStatus): string {
  if (status === "draft") return "Rascunho";
  if (status === "uploading") return "Enviando...";
  if (status === "saved") return "Pré-salvo";
  if (status === "error") return "Erro";
  return "-";
}

export default function PayslipsBulkUploadPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [profiles, setProfiles] = useState<Record<string, EmployeeProfile>>({});
  const [drafts, setDrafts] = useState<Record<string, UploadDraft>>({});
  const [referenceMonthByUser, setReferenceMonthByUser] = useState<Record<string, string>>({});

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [contractFilter, setContractFilter] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [isSavingMass, setIsSavingMass] = useState(false);
  const [bulkAiMonth, setBulkAiMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [bulkAiFiles, setBulkAiFiles] = useState<File[]>([]);
  const [bulkAiLoading, setBulkAiLoading] = useState(false);
  const [bulkAiMsg, setBulkAiMsg] = useState<string | null>(null);

  async function loadData() {
    const usersData = await apiFetch<Paginated<TenantUser>>(`/v1/tenants/${tenantId}/users?page=1&pageSize=100`);
    const collaborators = usersData.items.filter((item) => item.roles.includes("employee"));
    setUsers(collaborators);

    const entries = await Promise.all(
      collaborators.map(async (item) => {
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

    const nextProfiles: Record<string, EmployeeProfile> = {};
    for (const [userId, profile] of entries) {
      if (profile) nextProfiles[userId] = profile;
    }
    setProfiles(nextProfiles);
  }

  useEffect(() => {
    loadData().catch((err: Error) => setError(err.message));
  }, [tenantId]);

  const departments = useMemo(() => {
    return Array.from(
      new Set(
        users
          .map((item) => profiles[item.userId]?.department?.trim())
          .filter((value): value is string => !!value)
      )
    ).sort();
  }, [users, profiles]);

  const positions = useMemo(() => {
    return Array.from(
      new Set(
        users
          .map((item) => profiles[item.userId]?.positionTitle?.trim())
          .filter((value): value is string => !!value)
      )
    ).sort();
  }, [users, profiles]);

  const contracts = useMemo(() => {
    return Array.from(
      new Set(
        users
          .map((item) => profiles[item.userId]?.contractType?.trim())
          .filter((value): value is string => !!value)
      )
    ).sort();
  }, [users, profiles]);

  const filtered = useMemo(() => {
    return users.filter((item) => {
      const profile = profiles[item.userId];

      if (departmentFilter.trim()) {
        const value = (profile?.department ?? "").toLowerCase();
        if (!value.includes(departmentFilter.trim().toLowerCase())) return false;
      }
      if (positionFilter.trim()) {
        const value = (profile?.positionTitle ?? "").toLowerCase();
        if (!value.includes(positionFilter.trim().toLowerCase())) return false;
      }
      if (contractFilter.trim()) {
        const value = (profile?.contractType ?? "").toLowerCase();
        if (!value.includes(contractFilter.trim().toLowerCase())) return false;
      }
      if (search.trim()) {
        const haystack = `${profile?.fullName ?? item.fullName ?? ""} ${profile?.personalEmail ?? item.email ?? ""} ${
          profile?.cpf ?? item.cpf ?? ""
        }`.toLowerCase();
        if (!haystack.includes(search.trim().toLowerCase())) return false;
      }

      return true;
    });
  }, [users, profiles, departmentFilter, positionFilter, contractFilter, search]);

  function setDraft(userId: string, next: UploadDraft) {
    setDrafts((current) => ({ ...current, [userId]: next }));
  }

  async function saveMass() {
    setError(null);
    setOkMsg(null);

    const targets = users.filter((user) => drafts[user.userId]?.file);
    if (targets.length === 0) {
      setError("Selecione ao menos um arquivo para pré-salvar.");
      return;
    }

    setIsSavingMass(true);
    let successCount = 0;

    try {
      for (const user of targets) {
        const draft = drafts[user.userId];
        const file = draft?.file;
        if (!file) continue;
        const referenceMonth = referenceMonthByUser[user.userId] || month;

        const profile = profiles[user.userId];
        const collaboratorName = (profile?.fullName ?? user.fullName ?? "").trim();
        const collaboratorEmail = (profile?.personalEmail ?? user.email ?? "").trim().toLowerCase();

        if (!collaboratorName || !collaboratorEmail) {
          setDraft(user.userId, {
            file,
            status: "error",
            message: "Colaborador sem nome/e-mail para vincular."
          });
          continue;
        }

        setDraft(user.userId, { file, status: "uploading" });
        try {
          const intent = await apiFetch<UploadIntent>(`/v1/tenants/${tenantId}/payslips/upload-intent`, {
            method: "POST",
            body: JSON.stringify({
              referenceMonth,
              fileName: file.name,
              mimeType: file.type || "application/pdf",
              sizeBytes: file.size
            })
          });

          const put = await fetch(intent.signedUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type || "application/pdf" },
            body: file
          });
          if (!put.ok) throw new Error(`Falha no upload (${put.status})`);

          await apiFetch(`/v1/tenants/${tenantId}/payslips/confirm-upload`, {
            method: "POST",
            body: JSON.stringify({
              collaboratorName,
              collaboratorEmail,
              contract: profile?.contractType ?? null,
              referenceMonth,
              filePath: intent.path,
              fileName: file.name,
              mimeType: file.type || "application/pdf",
              sizeBytes: file.size
            })
          });

          setDraft(user.userId, { file, status: "saved", message: "Pré-salvo com sucesso." });
          successCount += 1;
        } catch (err) {
          setDraft(user.userId, { file, status: "error", message: (err as Error).message });
        }
      }

      setOkMsg(`${successCount} contracheque(s) pré-salvo(s) com sucesso.`);
    } finally {
      setIsSavingMass(false);
    }
  }

  async function enqueueAiBulkPayslips() {
    setError(null);
    setBulkAiMsg(null);
    if (bulkAiFiles.length === 0) {
      setError("Selecione um ou mais PDFs para a fila de IA.");
      return;
    }
    setBulkAiLoading(true);
    try {
      const uploaded: Array<{ filePath: string; fileName: string; sizeBytes: number }> = [];
      for (const file of bulkAiFiles) {
        const intent = await apiFetch<UploadIntent>(`/v1/tenants/${tenantId}/payslips/upload-intent`, {
          method: "POST",
          body: JSON.stringify({
            referenceMonth: bulkAiMonth,
            fileName: file.name,
            mimeType: file.type || "application/pdf",
            sizeBytes: file.size
          })
        });
        const put = await fetch(intent.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/pdf" },
          body: file
        });
        if (!put.ok) throw new Error(`Falha no upload (${put.status})`);
        uploaded.push({ filePath: intent.path, fileName: file.name, sizeBytes: file.size });
      }

      const res = await apiFetch<{ enqueued: number }>(`/v1/tenants/${tenantId}/payslips/confirm-ai-bulk`, {
        method: "POST",
        body: JSON.stringify({
          referenceMonth: bulkAiMonth,
          files: uploaded
        })
      });
      setBulkAiMsg(`${res.enqueued} arquivo(s) na fila. A IA processa um por vez e vincula pelo CPF do PDF.`);
      setBulkAiFiles([]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBulkAiLoading(false);
    }
  }

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Visão Geral", href: `/tenants/${tenantId}/dashboard` },
          { label: "Contracheques", href: `/tenants/${tenantId}/payslips` },
          { label: "Upload em lote" }
        ]}
      />

      <h1>Upload em lote de contracheques</h1>
      {error ? <p className="error">{error}</p> : null}
      {okMsg ? <p>{okMsg}</p> : null}

      <div className="card stack">
        <h3 style={{ margin: 0 }}>Fila IA — vários PDFs (vínculo por CPF)</h3>
        <p className="muted" style={{ margin: 0 }}>
          Envie vários contracheques de uma vez. Cada PDF entra em fila: a IA lê o CPF, encontra o colaborador com o
          mesmo CPF cadastrado no perfil e associa o arquivo automaticamente.
        </p>
        <label>
          Mês de referência
          <input type="month" value={bulkAiMonth} onChange={(e) => setBulkAiMonth(e.target.value)} />
        </label>
        <label>
          PDFs
          <input
            type="file"
            accept="application/pdf"
            multiple
            onChange={(e) => setBulkAiFiles(Array.from(e.target.files ?? []))}
          />
        </label>
        {bulkAiFiles.length > 0 ? (
          <p className="small muted">{bulkAiFiles.length} arquivo(s) selecionado(s).</p>
        ) : null}
        {bulkAiMsg ? <p>{bulkAiMsg}</p> : null}
        <button type="button" onClick={() => void enqueueAiBulkPayslips()} disabled={bulkAiLoading}>
          {bulkAiLoading ? "Enviando..." : "Enfileirar análise IA"}
        </button>
      </div>

      <div className="card stack">
        <div className="payslips-bulk-filters-layout">
          <label>
            Buscar colaborador
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome, e-mail ou CPF"
            />
          </label>
        </div>
        <div className="payslips-bulk-filters-row payslips-bulk-filters-row-3">
          <input
            list="payslips-bulk-departments"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            placeholder="Departamento"
          />
          <datalist id="payslips-bulk-departments">
            {departments.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <input
            list="payslips-bulk-positions"
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            placeholder="Cargo"
          />
          <datalist id="payslips-bulk-positions">
            {positions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <input
            list="payslips-bulk-contracts"
            value={contractFilter}
            onChange={(e) => setContractFilter(e.target.value)}
            placeholder="Tipo de contrato"
          />
          <datalist id="payslips-bulk-contracts">
            {contracts.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="card table-wrap">
        <div className="section-header">
          <h3>Funcionários</h3>
          <button type="button" onClick={saveMass} disabled={isSavingMass}>
            {isSavingMass ? "Salvando em massa..." : "Salvar em massa"}
          </button>
        </div>
        {filtered.length === 0 ? (
          <EmptyState title="Sem funcionários" description="Nenhum funcionário encontrado para os filtros aplicados." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>Departamento</th>
                <th>Cargo</th>
                <th>Tipo de contrato</th>
                <th>Salário</th>
                <th>Mês referência</th>
                <th>Upload</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const profile = profiles[user.userId];
                const draft = drafts[user.userId] ?? { file: null, status: "none" as DraftStatus };
                return (
                  <tr key={user.userId}>
                    <td>{profile?.fullName ?? user.fullName ?? "-"}</td>
                    <td>{formatCpf(profile?.cpf ?? user.cpf ?? "") || "-"}</td>
                    <td>{profile?.department ?? "-"}</td>
                    <td>{profile?.positionTitle ?? "-"}</td>
                    <td>{profile?.contractType ?? "-"}</td>
                    <td>{formatMoney(profile?.baseSalary ?? null)}</td>
                    <td>
                      <input
                        type="month"
                        value={referenceMonthByUser[user.userId] || month}
                        onChange={(e) =>
                          setReferenceMonthByUser((current) => ({
                            ...current,
                            [user.userId]: e.target.value
                          }))
                        }
                      />
                    </td>
                    <td>
                      <div className="stack">
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) =>
                            setDraft(user.userId, {
                              file: e.target.files?.[0] ?? null,
                              status: e.target.files?.[0] ? "draft" : "none"
                            })
                          }
                        />
                        <div className="row" style={{ alignItems: "center", gap: 6 }}>
                          <span className="badge">{statusLabel(draft.status)}</span>
                          {draft.message ? <span className="small muted">{draft.message}</span> : null}
                          {draft.file ? (
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => setDraft(user.userId, { file: null, status: "none" })}
                            >
                              Limpar
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
