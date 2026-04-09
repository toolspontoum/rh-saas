"use client";

import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { ConfirmModal } from "../../../../../components/confirm-modal";
import { Breadcrumbs } from "../../../../../components/breadcrumbs";
import { SkillTagsInput } from "../../../../../components/skill-tags-input";
import { apiFetch } from "../../../../../lib/api";
import { appConfig } from "../../../../../lib/config";
import { getToken } from "../../../../../lib/auth";
import {
  currencyToNumber,
  formatCpf,
  formatCurrencyBr,
  formatPhoneBr,
  onlyDigits
} from "../../../../../lib/br-format";
import { getStoredTenantCompanyId } from "../../../../../lib/tenant-company-scope";

type FileJob = {
  localId: string;
  name: string;
  file: File;
  status: "queued" | "processing" | "done" | "error";
  error?: string;
};

type PreregRow = {
  id: string;
  sourceFileName: string;
  fullName: string | null;
  cpf: string | null;
  personalEmail: string | null;
  createdAt: string;
};

type BatchLogRow = {
  id: string;
  createdAt: string;
  docCount: number;
  processedOk: number;
  preregCreated: number;
  errorCount: number;
};

type PreregDetail = {
  id: string;
  sourceFileName: string;
  sourceMimeType: string | null;
  batchId: string | null;
  payload: {
    fullName?: string | null;
    personalEmail?: string | null;
    cpf?: string | null;
    phone?: string | null;
    department?: string | null;
    positionTitle?: string | null;
    contractType?: string | null;
    admissionDate?: string | null;
    baseSalary?: number | null;
    employeeTags?: string[];
  };
  suggestedAction: "register" | "link" | "need_email";
  authUserId: string | null;
  alreadyEmployeeInTenant: boolean;
};

type DetailFormState = {
  fullName: string;
  personalEmail: string;
  cpf: string;
  phone: string;
  department: string;
  positionTitle: string;
  contractType: string;
  admissionDate: string;
  baseSalary: string;
  employeeTags: string[];
};

type BatchDetail = {
  id: string;
  createdAt: string;
  docCount: number;
  processedOk: number;
  preregCreated: number;
  errorCount: number;
  files: Array<{
    id: string;
    fileName: string;
    processedAt: string;
    status: "ok" | "error";
    errorMessage: string | null;
    preregistrationIds: string[];
  }>;
};

const contractOptions = ["CLT", "PJ", "Estágio", "Freelancer"];

function moneyFromNumber(value: number | null | undefined): string {
  if (value == null) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

async function postProcessFile(tenantId: string, batchId: string, file: File): Promise<{ preregistrationIds: string[] }> {
  const token = getToken();
  const fd = new FormData();
  fd.append("file", file);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const companyId = getStoredTenantCompanyId(tenantId);
  if (companyId) headers["X-Tenant-Company-Id"] = companyId;

  const response = await fetch(
    `${appConfig.apiBaseUrl}/v1/tenants/${tenantId}/employee-prereg/batches/${batchId}/process`,
    { method: "POST", headers, body: fd }
  );

  if (response.status === 401) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  if (!response.ok) {
    let message = `Erro ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await response.json()) as { preregistrationIds: string[] };
}

export default function EmployeeAutoImportPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params?.tenantId ?? "";

  /** Só após mount: evita hidratação divergente (SSR sem localStorage vs cliente com empresa). */
  const [hasCompany, setHasCompany] = useState(false);

  const [fileJobs, setFileJobs] = useState<FileJob[]>([]);
  const [sessionRunning, setSessionRunning] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<{
    okNames: string[];
    errors: { name: string; message: string }[];
  } | null>(null);

  const [sectionTab, setSectionTab] = useState<"prereg" | "log">("prereg");
  const [preregs, setPreregs] = useState<PreregRow[]>([]);
  const [batches, setBatches] = useState<BatchLogRow[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PreregDetail | null>(null);
  const [detailForm, setDetailForm] = useState<Partial<DetailFormState>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);

  const [batchDetailId, setBatchDetailId] = useState<string | null>(null);
  const [batchDetail, setBatchDetail] = useState<BatchDetail | null>(null);

  const [confirmAction, setConfirmAction] = useState<null | "register" | "link" | "delete">(null);
  const [emailLookupExists, setEmailLookupExists] = useState<boolean | null>(null);

  const loadLists = useCallback(async () => {
    if (!hasCompany) {
      setPreregs([]);
      setBatches([]);
      return;
    }
    setListError(null);
    try {
      const [p, b] = await Promise.all([
        apiFetch<PreregRow[]>(`/v1/tenants/${tenantId}/employee-prereg`),
        apiFetch<BatchLogRow[]>(`/v1/tenants/${tenantId}/employee-prereg/batches/log`)
      ]);
      setPreregs(p);
      setBatches(b);
    } catch (e) {
      setListError((e as Error).message);
    }
  }, [tenantId, hasCompany]);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  useEffect(() => {
    function syncCompanyFromStorage() {
      setHasCompany(Boolean(getStoredTenantCompanyId(tenantId)));
    }
    syncCompanyFromStorage();
    window.addEventListener("vv-tenant-company-changed", syncCompanyFromStorage);
    window.addEventListener("storage", syncCompanyFromStorage);
    return () => {
      window.removeEventListener("vv-tenant-company-changed", syncCompanyFromStorage);
      window.removeEventListener("storage", syncCompanyFromStorage);
    };
  }, [tenantId]);

  useEffect(() => {
    if (!detailId || !hasCompany) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    apiFetch<PreregDetail>(`/v1/tenants/${tenantId}/employee-prereg/${detailId}`)
      .then((d) => {
        setDetail(d);
        setDetailForm({
          fullName: d.payload.fullName ?? "",
          personalEmail: d.payload.personalEmail ?? "",
          cpf: formatCpf(d.payload.cpf ?? ""),
          phone: formatPhoneBr(d.payload.phone ?? ""),
          department: d.payload.department ?? "",
          positionTitle: d.payload.positionTitle ?? "",
          contractType: d.payload.contractType ?? "",
          admissionDate: d.payload.admissionDate ?? "",
          baseSalary: moneyFromNumber(d.payload.baseSalary),
          employeeTags: d.payload.employeeTags ?? []
        });
      })
      .catch((e: Error) => setListError(e.message))
      .finally(() => setDetailLoading(false));
  }, [detailId, tenantId, hasCompany]);

  useEffect(() => {
    if (!batchDetailId || !hasCompany) {
      setBatchDetail(null);
      return;
    }
    setBatchDetail(null);
    apiFetch<BatchDetail>(`/v1/tenants/${tenantId}/employee-prereg/batches/${batchDetailId}/detail`)
      .then(setBatchDetail)
      .catch((e: Error) => setListError(e.message));
  }, [batchDetailId, tenantId, hasCompany]);

  useEffect(() => {
    const raw = detailForm.personalEmail?.trim() ?? "";
    if (!raw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
      setEmailLookupExists(null);
      return;
    }
    const handle = window.setTimeout(() => {
      apiFetch<{ exists: boolean }>(`/v1/tenants/${tenantId}/employees/lookup-by-email?email=${encodeURIComponent(raw)}`)
        .then((r) => setEmailLookupExists(r.exists))
        .catch(() => setEmailLookupExists(null));
    }, 450);
    return () => window.clearTimeout(handle);
  }, [detailForm.personalEmail, tenantId]);

  function onPickFiles(event: ChangeEvent<HTMLInputElement>) {
    const list = event.target.files;
    if (!list?.length) return;
    const next: FileJob[] = [];
    for (let i = 0; i < list.length; i += 1) {
      const file = list.item(i);
      if (!file) continue;
      next.push({
        localId: `${Date.now()}-${i}-${file.name}`,
        name: file.name,
        file,
        status: "queued"
      });
    }
    setFileJobs((c) => [...c, ...next]);
    setSessionSummary(null);
    event.target.value = "";
  }

  async function runUploadSession() {
    if (!hasCompany) return;
    const pending = fileJobs.filter((j) => j.status === "queued");
    if (pending.length === 0) return;

    setSessionRunning(true);
    setSessionSummary(null);

    try {
      const { batchId } = await apiFetch<{ batchId: string }>(`/v1/tenants/${tenantId}/employee-prereg/batches`, {
        method: "POST",
        body: JSON.stringify({ expectedDocCount: pending.length })
      });

      const okNames: string[] = [];
      const errors: { name: string; message: string }[] = [];

      for (const job of pending) {
        setFileJobs((all) =>
          all.map((j) => (j.localId === job.localId ? { ...j, status: "processing" } : j))
        );
        try {
          await postProcessFile(tenantId, batchId, job.file);
          setFileJobs((all) => all.map((j) => (j.localId === job.localId ? { ...j, status: "done" } : j)));
          okNames.push(job.name);
        } catch (err) {
          const message = (err as Error).message;
          setFileJobs((all) =>
            all.map((j) => (j.localId === job.localId ? { ...j, status: "error", error: message } : j))
          );
          errors.push({ name: job.name, message });
        }
      }

      setSessionSummary({ okNames, errors });
      await loadLists();
    } catch (e) {
      setListError((e as Error).message);
    } finally {
      setSessionRunning(false);
    }
  }

  async function saveDraftFromModal() {
    if (!detailId) return;
    setDetailSaving(true);
    try {
      await apiFetch(`/v1/tenants/${tenantId}/employee-prereg/${detailId}`, {
        method: "PUT",
        body: JSON.stringify({
          fullName: detailForm.fullName || null,
          personalEmail: detailForm.personalEmail || null,
          cpf: onlyDigits(detailForm.cpf ?? "") || null,
          phone: onlyDigits(detailForm.phone ?? "") || null,
          department: detailForm.department || null,
          positionTitle: detailForm.positionTitle || null,
          contractType: detailForm.contractType || null,
          admissionDate: detailForm.admissionDate || null,
          baseSalary: currencyToNumber(String(detailForm.baseSalary ?? "")) || null,
          employeeTags: detailForm.employeeTags ?? []
        })
      });
      await loadLists();
      const refreshed = await apiFetch<PreregDetail>(`/v1/tenants/${tenantId}/employee-prereg/${detailId}`);
      setDetail(refreshed);
    } catch (e) {
      setListError((e as Error).message);
    } finally {
      setDetailSaving(false);
    }
  }

  async function execConfirmRegister() {
    if (!detailId) return;
    try {
      await apiFetch(`/v1/tenants/${tenantId}/employee-prereg/${detailId}/confirm-register`, { method: "POST" });
      setConfirmAction(null);
      setDetailId(null);
      await loadLists();
    } catch (e) {
      setListError((e as Error).message);
    }
  }

  async function execConfirmLink() {
    if (!detailId) return;
    try {
      await apiFetch(`/v1/tenants/${tenantId}/employee-prereg/${detailId}/confirm-link`, { method: "POST" });
      setConfirmAction(null);
      setDetailId(null);
      await loadLists();
    } catch (e) {
      setListError((e as Error).message);
    }
  }

  async function execDelete() {
    if (!detailId) return;
    try {
      await apiFetch(`/v1/tenants/${tenantId}/employee-prereg/${detailId}`, { method: "DELETE" });
      setConfirmAction(null);
      setDetailId(null);
      await loadLists();
    } catch (e) {
      setListError((e as Error).message);
    }
  }

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Visão geral", href: `/tenants/${tenantId}/dashboard` },
          { label: "Cadastro automático (IA)" }
        ]}
      />
      <h1>Cadastro automático de funcionário</h1>
      <p className="muted">
        Envie fichas em PDF, planilhas (CSV, XLS, XLSX) ou imagens. A IA sugere os campos do cadastro; o gestor revisa e
        confirma antes de criar ou vincular o usuário.
      </p>

      {!hasCompany ? (
        <p className="error">
          Selecione uma empresa ou projeto no menu lateral para usar esta ferramenta (o cadastro de colaborador exige
          escopo de empresa).
        </p>
      ) : null}

      {listError ? <p className="error">{listError}</p> : null}

      <section className="card stack">
        <h2>Upload de documentos</h2>
        <p className="muted small">
          Formatos: PDF, CSV, XLS, XLSX, JPG, PNG, WEBP, GIF. Limite por arquivo conforme política da API (típico 15 MB).
        </p>
        <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
          <label className="button secondary" style={{ cursor: "pointer" }}>
            Escolher arquivos
            <input
              type="file"
              multiple
              accept=".pdf,.csv,.xls,.xlsx,image/jpeg,image/png,image/webp,image/gif"
              style={{ display: "none" }}
              onChange={onPickFiles}
              disabled={!hasCompany || sessionRunning}
            />
          </label>
          <button type="button" disabled={!hasCompany || sessionRunning || !fileJobs.some((j) => j.status === "queued")} onClick={() => void runUploadSession()}>
            {sessionRunning ? "Processando…" : "Processar fila"}
          </button>
        </div>

        {fileJobs.length > 0 ? (
          <div className="stack" style={{ marginTop: 16 }}>
            <h3 className="muted small">Andamento (tempo real)</h3>
            <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: 280, overflow: "auto" }}>
              {fileJobs.map((j) => (
                <li
                  key={j.localId}
                  className="card"
                  style={{ padding: "8px 12px", fontSize: "0.9rem" }}
                >
                  <strong>{j.name}</strong>
                  <span className="muted"> — </span>
                  {j.status === "queued" ? <span>em fila</span> : null}
                  {j.status === "processing" ? <span>processando</span> : null}
                  {j.status === "done" ? <span>concluído</span> : null}
                  {j.status === "error" ? (
                    <span className="error">erro{j.error ? `: ${j.error}` : ""}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {sessionSummary ? (
          <div className="stack" style={{ marginTop: 16 }}>
            <h3>Resumo desta sessão</h3>
            {sessionSummary.okNames.length > 0 ? (
              <p>
                <strong>Processados com sucesso ({sessionSummary.okNames.length}):</strong>{" "}
                {sessionSummary.okNames.join(", ")}
              </p>
            ) : (
              <p>Nenhum arquivo processado com sucesso nesta sessão.</p>
            )}
            {sessionSummary.errors.length > 0 ? (
              <div>
                <p className="error">
                  <strong>Erros ({sessionSummary.errors.length})</strong>
                </p>
                <ul>
                  {sessionSummary.errors.map((e) => (
                    <li key={e.name}>
                      <strong>{e.name}</strong>: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="card stack" style={{ marginTop: 24 }}>
        <div className="row" style={{ gap: 8, borderBottom: "1px solid #ddd", paddingBottom: 8 }}>
          <button
            type="button"
            className={sectionTab === "prereg" ? "" : "secondary"}
            onClick={() => setSectionTab("prereg")}
          >
            Pré-cadastro
          </button>
          <button
            type="button"
            className={sectionTab === "log" ? "" : "secondary"}
            onClick={() => setSectionTab("log")}
          >
            Log de envios
          </button>
        </div>

        {sectionTab === "prereg" ? (
          <div className="stack">
            <p className="muted small">
              Registros extraídos aguardando revisão. Campos podem ser corrigidos antes de cadastrar ou vincular.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>CPF</th>
                    <th>E-mail</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {preregs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="muted">
                        Nenhum pré-cadastro pendente.
                      </td>
                    </tr>
                  ) : (
                    preregs.map((row) => (
                      <tr key={row.id}>
                        <td>{row.fullName ?? "—"}</td>
                        <td>{row.cpf ? formatCpf(row.cpf) : "—"}</td>
                        <td>{row.personalEmail ?? "—"}</td>
                        <td>
                          <button type="button" className="secondary" onClick={() => setDetailId(row.id)}>
                            Visualizar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="stack">
            <p className="muted small">Histórico de lotes de upload (por empresa selecionada).</p>
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Data / hora</th>
                    <th>Docs enviados</th>
                    <th>Processados OK</th>
                    <th>Pré-cadastros</th>
                    <th>Erros</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {batches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="muted">
                        Nenhum envio registrado.
                      </td>
                    </tr>
                  ) : (
                    batches.map((b) => (
                      <tr key={b.id}>
                        <td>{new Date(b.createdAt).toLocaleString("pt-BR")}</td>
                        <td>{b.docCount}</td>
                        <td>{b.processedOk}</td>
                        <td>{b.preregCreated}</td>
                        <td>{b.errorCount}</td>
                        <td>
                          <button type="button" className="secondary" onClick={() => setBatchDetailId(b.id)}>
                            Visualizar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {detailId ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-label="Pré-cadastro" style={{ maxWidth: 640 }}>
            <h3>Pré-cadastro</h3>
            {detailLoading ? (
              <p>Carregando…</p>
            ) : (
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveDraftFromModal();
                }}
              >
                <p className="muted small">Arquivo de origem: {detail?.sourceFileName}</p>
                {detail?.alreadyEmployeeInTenant ? (
                  <p className="error">
                    Este e-mail já está associado a um colaborador neste assinante. Ao confirmar, os dados do perfil podem
                    ser atualizados.
                  </p>
                ) : null}
                <div className="form-grid form-grid-2">
                  <label>
                    Nome completo
                    <input
                      value={detailForm.fullName ?? ""}
                      onChange={(e) => setDetailForm((c) => ({ ...c, fullName: e.target.value }))}
                    />
                  </label>
                  <label>
                    E-mail
                    <input
                      type="email"
                      value={detailForm.personalEmail ?? ""}
                      onChange={(e) => setDetailForm((c) => ({ ...c, personalEmail: e.target.value }))}
                    />
                  </label>
                  <label>
                    CPF
                    <input
                      value={detailForm.cpf ?? ""}
                      onChange={(e) => setDetailForm((c) => ({ ...c, cpf: formatCpf(e.target.value) }))}
                    />
                  </label>
                  <label>
                    Telefone
                    <input
                      value={detailForm.phone ?? ""}
                      onChange={(e) => setDetailForm((c) => ({ ...c, phone: formatPhoneBr(e.target.value) }))}
                    />
                  </label>
                  <label>
                    Departamento
                    <input
                      value={detailForm.department ?? ""}
                      onChange={(e) => setDetailForm((c) => ({ ...c, department: e.target.value }))}
                    />
                  </label>
                  <label>
                    Cargo
                    <input
                      value={detailForm.positionTitle ?? ""}
                      onChange={(e) => setDetailForm((c) => ({ ...c, positionTitle: e.target.value }))}
                    />
                  </label>
                  <label>
                    Contrato
                    <select
                      value={detailForm.contractType ?? ""}
                      onChange={(e) => setDetailForm((c) => ({ ...c, contractType: e.target.value }))}
                    >
                      <option value="">—</option>
                      {contractOptions.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Admissão (AAAA-MM-DD)
                    <input
                      value={detailForm.admissionDate ?? ""}
                      onChange={(e) => setDetailForm((c) => ({ ...c, admissionDate: e.target.value }))}
                      placeholder="2024-01-15"
                    />
                  </label>
                  <label style={{ gridColumn: "1 / -1" }}>
                    Salário base (R$)
                    <input
                      value={detailForm.baseSalary ?? ""}
                      onChange={(e) => setDetailForm((c) => ({ ...c, baseSalary: formatCurrencyBr(e.target.value) }))}
                    />
                  </label>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <span className="muted small">Tags</span>
                    <SkillTagsInput
                      value={detailForm.employeeTags ?? []}
                      onChange={(tags) => setDetailForm((c) => ({ ...c, employeeTags: tags }))}
                    />
                  </div>
                </div>
                <p className="muted small">
                  {emailLookupExists === null && (detailForm.personalEmail?.trim() ?? "").length > 0
                    ? "Verificando e-mail…"
                    : null}
                  {emailLookupExists === false ? "Nenhuma conta com este e-mail — use Cadastrar." : null}
                  {emailLookupExists === true ? "Conta encontrada — use Vincular usuário." : null}
                </p>
                <div className="row" style={{ flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setDetailId(null);
                      setDetailForm({});
                      setEmailLookupExists(null);
                    }}
                  >
                    Fechar
                  </button>
                  <button type="submit" disabled={detailSaving}>
                    Salvar alterações
                  </button>
                  <button
                    type="button"
                    disabled={emailLookupExists !== false}
                    onClick={() => setConfirmAction("register")}
                  >
                    Cadastrar
                  </button>
                  <button
                    type="button"
                    disabled={emailLookupExists !== true}
                    onClick={() => setConfirmAction("link")}
                  >
                    Vincular usuário
                  </button>
                  <button type="button" className="danger" onClick={() => setConfirmAction("delete")}>
                    Deletar pré-cadastro
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {batchDetailId ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-label="Log detalhado" style={{ maxWidth: 720 }}>
            <h3>Log do envio</h3>
            {!batchDetail ? (
              <p>Carregando…</p>
            ) : (
              <>
                <p className="muted small">
                  {new Date(batchDetail.createdAt).toLocaleString("pt-BR")} · Docs esperados: {batchDetail.docCount} ·
                  OK: {batchDetail.processedOk} · Pré-cadastros: {batchDetail.preregCreated} · Erros:{" "}
                  {batchDetail.errorCount}
                </p>
                <div style={{ overflowX: "auto", maxHeight: 400 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Arquivo</th>
                        <th>Processado em</th>
                        <th>Status</th>
                        <th>Observação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchDetail.files.map((f) => (
                        <tr key={f.id}>
                          <td>{f.fileName}</td>
                          <td>{new Date(f.processedAt).toLocaleString("pt-BR")}</td>
                          <td>{f.status === "ok" ? "processado" : "erro"}</td>
                          <td>{f.status === "error" ? f.errorMessage ?? "—" : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="secondary" onClick={() => setBatchDetailId(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={confirmAction === "register"}
        title="Cadastrar colaborador?"
        message="Será criada a conta (convite por e-mail, se aplicável) e o vínculo com a empresa selecionada, com os dados deste pré-cadastro."
        confirmLabel="Cadastrar"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => void execConfirmRegister()}
      />

      <ConfirmModal
        open={confirmAction === "link"}
        title="Vincular usuário existente?"
        message="O usuário com o e-mail informado será vinculado como colaborador desta empresa e o perfil será atualizado com estes dados."
        confirmLabel="Vincular"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => void execConfirmLink()}
      />

      <ConfirmModal
        open={confirmAction === "delete"}
        title="Remover pré-cadastro?"
        message="O pré-cadastro será excluído. Nenhum usuário existente será alterado."
        confirmLabel="Deletar"
        danger
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => void execDelete()}
      />
    </main>
  );
}
