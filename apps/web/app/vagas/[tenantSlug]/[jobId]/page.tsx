"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { RichTextEditor } from "../../../../components/rich-text-editor";
import { setToken } from "../../../../lib/auth";
import { supabase } from "../../../../lib/supabase";
import {
  applyToJob,
  getCandidateProfile,
  getJobApplicantDocumentPresence,
  getMyApplicationByJob,
  getPublicJobByTenantSlugAndId,
  isCoverLetterNonEmpty,
  quickApplyToJob,
  statusLabel,
  type JobDocumentUploadPayload,
  type JobQuestionAnswer,
  type MyApplication,
  type PublicJob
} from "../../../../lib/candidate";
import { formatCpf, formatPhoneBr, onlyDigits } from "../../../../lib/masks";
import { MAX_PDF_UPLOAD_BYTES } from "../../../../lib/upload-limits";

type ApplyMode = "choice" | "login" | "quick" | "authenticated";
type ApplySuccessVariant = "existing" | "new";

export default function PublicJobDetailPage() {
  const params = useParams<{ tenantSlug: string; jobId: string }>();
  const router = useRouter();
  const tenantSlug = params.tenantSlug;
  const jobId = params.jobId;

  const [job, setJob] = useState<PublicJob | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<MyApplication["status"] | null>(null);
  const [questionAnswers, setQuestionAnswers] = useState<
    Record<
      string,
      {
        answerBoolean: boolean | null;
        answerText: string;
        answerFile: string;
      }
    >
  >({});
  const [error, setError] = useState<string | null>(null);
  /** Erros do fluxo em modal (login / candidatura rápida); não aparecem por trás do backdrop */
  const [applyModalError, setApplyModalError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [applySuccessVariant, setApplySuccessVariant] = useState<ApplySuccessVariant>("new");
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyMode, setApplyMode] = useState<ApplyMode>("choice");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [quickName, setQuickName] = useState("");
  const [quickEmail, setQuickEmail] = useState("");
  const [quickCpf, setQuickCpf] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickResume, setQuickResume] = useState<File | null>(null);
  const [quickCoverLetter, setQuickCoverLetter] = useState("");
  const [quickDocFiles, setQuickDocFiles] = useState<Record<string, File | null>>({});
  const [authDocFiles, setAuthDocFiles] = useState<Record<string, File | null>>({});
  const [docPresenceOnAccount, setDocPresenceOnAccount] = useState<Record<string, boolean>>({});
  const [docPresenceLoading, setDocPresenceLoading] = useState(false);
  /** null = ainda não checou; true/false só quando há token */
  const [authProfileReadyForApply, setAuthProfileReadyForApply] = useState<boolean | null>(null);
  const screeningQuestions = job?.screeningQuestions ?? [];
  const documentRequirements = job?.documentRequirements ?? [];
  const applyModalMaxWidthPx = applyMode === "choice" || applyMode === "login" ? 500 : 1000;

  const isAuthenticated = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.localStorage.getItem("vv_access_token"));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setAuthProfileReadyForApply(null);
      return;
    }
    let cancelled = false;
    setAuthProfileReadyForApply(null);
    getCandidateProfile()
      .then((profile) => {
        if (cancelled) return;
        const ok = Boolean(profile?.fullName?.trim() && profile?.email?.trim());
        setAuthProfileReadyForApply(ok);
      })
      .catch(() => {
        if (!cancelled) setAuthProfileReadyForApply(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (applyMode !== "authenticated" || !job || documentRequirements.length === 0) {
      return;
    }
    if (!isAuthenticated) return;
    let cancelled = false;
    setDocPresenceLoading(true);
    getJobApplicantDocumentPresence(job.id)
      .then((data) => {
        if (cancelled) return;
        const map: Record<string, boolean> = {};
        for (const item of data.items) {
          map[item.requirementId] = item.onFile;
        }
        setDocPresenceOnAccount(map);
      })
      .catch(() => {
        if (!cancelled) setDocPresenceOnAccount({});
      })
      .finally(() => {
        if (!cancelled) setDocPresenceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyMode, job?.id, isAuthenticated, documentRequirements.length]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    getPublicJobByTenantSlugAndId(tenantSlug, jobId)
      .then((data) => setJob(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));

    if (isAuthenticated) {
      getMyApplicationByJob(jobId)
        .then((data) => {
          setApplied(data.applied);
          setApplicationStatus(data.status ?? null);
        })
        .catch(() => {
          setApplied(false);
          setApplicationStatus(null);
        });
    }
  }, [tenantSlug, jobId, isAuthenticated]);

  async function submitAuthenticatedApplication() {
    if (!job) return;
    const normalizedAnswers = normalizeAnswers(job, questionAnswers);
    const missingRequired = hasMissingRequiredAnswers(job, normalizedAnswers);
    if (missingRequired) {
      setApplyModalError("Preencha todas as perguntas obrigatórias da vaga antes de se candidatar.");
      return;
    }

    if (!isCoverLetterNonEmpty(coverLetter)) {
      setApplyModalError("A carta de apresentação é obrigatória.");
      return;
    }

    if (documentRequirements.length > 0 && docPresenceLoading) {
      setApplyModalError("Aguarde a verificação dos documentos na conta.");
      return;
    }

    const skipDocsOnAccount = new Set(
      documentRequirements.filter((r) => docPresenceOnAccount[r.id]).map((r) => r.id)
    );
    const docErr = validateRequiredJobDocs(authDocFiles, documentRequirements, skipDocsOnAccount);
    if (docErr) {
      setApplyModalError(docErr);
      return;
    }

    setSubmitting(true);
    setApplyModalError(null);

    try {
      const jobDocumentUploads =
        documentRequirements.length > 0
          ? await buildJobDocumentUploadPayloads(authDocFiles, documentRequirements, skipDocsOnAccount)
          : undefined;
      const reuseExistingRequirementIds =
        skipDocsOnAccount.size > 0 ? Array.from(skipDocsOnAccount) : undefined;
      await applyToJob(
        job.id,
        coverLetter.trim(),
        normalizedAnswers,
        jobDocumentUploads,
        reuseExistingRequirementIds
      );
      setApplyModalOpen(false);
      setApplyMode("choice");
      setApplied(true);
      setApplicationStatus("submitted");
      setApplySuccessVariant("existing");
      setSuccessOpen(true);
    } catch (err) {
      setApplyModalError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitLoginAndApply() {
    if (!job) return;
    setSubmitting(true);
    setApplyModalError(null);

    const auth = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword
    });
    if (auth.error || !auth.data.session?.access_token) {
      setSubmitting(false);
      setApplyModalError(auth.error?.message ?? "Falha ao efetuar login.");
      return;
    }

    setToken(auth.data.session.access_token);

    const profile = await getCandidateProfile();
    const ready = Boolean(profile?.fullName?.trim() && profile?.email?.trim());
    setAuthProfileReadyForApply(ready);

    if (!ready) {
      setSubmitting(false);
      setApplyModalOpen(true);
      setApplyMode("quick");
      setApplyModalError(
        "Para candidatar-se com login, complete nome e e-mail na área do candidato, ou use candidatura rápida abaixo."
      );
      return;
    }

    setApplyModalError(null);
    setApplyMode("authenticated");
    setSubmitting(false);
  }

  async function submitQuickApply() {
    if (!job) return;
    const normalizedAnswers = normalizeAnswers(job, questionAnswers);
    const missingRequired = hasMissingRequiredAnswers(job, normalizedAnswers);
    if (missingRequired) {
      setApplyModalError("Preencha todas as perguntas obrigatórias da vaga antes de se candidatar.");
      return;
    }

    if (!isCoverLetterNonEmpty(quickCoverLetter)) {
      setApplyModalError("Escreva a carta de apresentação para concluir a candidatura.");
      return;
    }

    const quickDocErr = validateRequiredJobDocs(quickDocFiles, documentRequirements);
    if (quickDocErr) {
      setApplyModalError(quickDocErr);
      return;
    }

    if (!quickResume) {
      setApplyModalError("Anexe o currículo para concluir a candidatura rápida.");
      return;
    }

    if (quickResume.size > MAX_PDF_UPLOAD_BYTES) {
      setApplyModalError(
        `O currículo em PDF pode ter no máximo ${MAX_PDF_UPLOAD_BYTES / (1024 * 1024)} MB. Escolha um arquivo menor.`
      );
      return;
    }

    if (onlyDigits(quickCpf).length !== 11) {
      setApplyModalError("Informe um CPF válido.");
      return;
    }

    const phoneDigits = onlyDigits(quickPhone);
    if (phoneDigits.length !== 10 && phoneDigits.length !== 11) {
      setApplyModalError("Informe um telefone válido com DDD.");
      return;
    }

    setSubmitting(true);
    setApplyModalError(null);

    try {
      const resumeBase64 = await fileToBase64(quickResume);
      const jobDocumentUploads =
        documentRequirements.length > 0
          ? await buildJobDocumentUploadPayloads(quickDocFiles, documentRequirements)
          : undefined;
      const quickResult = await quickApplyToJob({
        jobId: job.id,
        fullName: quickName.trim(),
        email: quickEmail.trim().toLowerCase(),
        cpf: onlyDigits(quickCpf),
        phone: phoneDigits,
        resumeFileName: quickResume.name,
        resumeMimeType: quickResume.type || "application/pdf",
        resumeBase64,
        coverLetter: quickCoverLetter.trim(),
        screeningAnswers: normalizedAnswers,
        jobDocumentUploads
      });
      setApplySuccessVariant(quickResult.existingAuthAccount ? "existing" : "new");
      setApplyModalOpen(false);
      setApplyMode("choice");
      setApplyModalError(null);
      setSuccessOpen(true);
    } catch (err) {
      setApplyModalError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function renderScreeningQuestionsEditor() {
    if (screeningQuestions.length === 0) return null;
    return (
      <section className="stack">
        <h4 style={{ margin: 0 }}>Perguntas da vaga</h4>
        {screeningQuestions.map((question) => {
          const answer = questionAnswers[question.id] ?? {
            answerBoolean: null,
            answerText: "",
            answerFile: ""
          };
          return (
            <div className="card stack" key={question.id} style={{ padding: 12 }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <strong>{question.label}</strong>
                {question.isRequired ? <span className="badge">Obrigatória</span> : null}
              </div>
              {question.notes ? <p className="muted">{question.notes}</p> : null}
              {question.type === "yes_no" ? (
                <div className="row">
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="radio"
                      name={`modal-question-${question.id}`}
                      checked={answer.answerBoolean === true}
                      onChange={() =>
                        setQuestionAnswers((prev) => ({
                          ...prev,
                          [question.id]: { ...answer, answerBoolean: true }
                        }))
                      }
                    />
                    Sim
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="radio"
                      name={`modal-question-${question.id}`}
                      checked={answer.answerBoolean === false}
                      onChange={() =>
                        setQuestionAnswers((prev) => ({
                          ...prev,
                          [question.id]: { ...answer, answerBoolean: false }
                        }))
                      }
                    />
                    Não
                  </label>
                </div>
              ) : null}
              {question.type === "text" ? (
                <textarea
                  value={answer.answerText}
                  placeholder="Digite sua resposta"
                  onChange={(event) =>
                    setQuestionAnswers((prev) => ({
                      ...prev,
                      [question.id]: { ...answer, answerText: event.target.value }
                    }))
                  }
                />
              ) : null}
            </div>
          );
        })}
      </section>
    );
  }

  function renderAuthenticatedDocUploads() {
    if (documentRequirements.length === 0) return null;
    return (
      <div className="stack">
        <strong>Documentos obrigatórios (PDF)</strong>
        {docPresenceLoading ? (
          <p className="muted" style={{ margin: 0 }}>
            Verificando documentos já cadastrados na conta…
          </p>
        ) : null}
        {documentRequirements.map((req) => (
          <div className="stack" key={req.id}>
            <span>
              {req.docType}
              {req.label ? ` — ${req.label}` : ""}
            </span>
            {docPresenceOnAccount[req.id] ? (
              <p className="muted" style={{ margin: 0 }}>
                Documento já cadastrado na conta
              </p>
            ) : (
              <input
                type="file"
                accept="application/pdf"
                disabled={docPresenceLoading}
                onChange={(event) =>
                  setAuthDocFiles((prev) => ({
                    ...prev,
                    [req.id]: event.target.files?.[0] ?? null
                  }))
                }
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <main className="container wide">
        <p>Carregando vaga...</p>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="container wide">
        <p className="error">{error ?? "Vaga não encontrada."}</p>
      </main>
    );
  }

  return (
    <main className="container wide stack">
      <div className="section-header">
        <h1>{job.title}</h1>
        <button className="secondary" onClick={() => router.push(`/vagas/${tenantSlug}`)}>
          Voltar para vagas da empresa
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <section className="card stack" style={{ padding: "30px 50px" }}>
        <p className="muted">{job.tenantDisplayName}</p>

        <div className="tag-list">
          {job.department ? <span className="badge">Área: {job.department}</span> : null}
          {job.employmentType ? <span className="badge">Tipo: {job.employmentType}</span> : null}
          {job.city && job.state ? <span className="badge">Local: {job.city}/{job.state}</span> : null}
          {job.salary != null ? (
            <span className="badge">
              Salário: {job.salary.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          ) : null}
        </div>

        <div
          className="job-description job-rich-content"
          style={{ paddingLeft: 30 }}
          dangerouslySetInnerHTML={{ __html: job.description }}
        />

        {documentRequirements.length > 0 ? (
          <section className="card stack" style={{ gap: 18 }}>
            <h3 style={{ margin: 0 }}>Documentos necessários para a candidatura</h3>
            <p className="muted" style={{ margin: 0, lineHeight: 1.55 }}>
              Separe estes arquivos em PDF antes de iniciar a inscrição. O envio será feito apenas no fluxo de
              candidatura.
            </p>
            <ul style={{ margin: "4px 0 0", paddingLeft: 26, lineHeight: 1.55 }}>
              {documentRequirements.map((req, index) => (
                <li
                  key={req.id}
                  style={{
                    marginBottom: index < documentRequirements.length - 1 ? 14 : 0,
                    paddingTop: 2
                  }}
                >
                  <strong>{req.docType}</strong>
                  {req.label ? <span className="muted"> — {req.label}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="row job-apply-actions">
          {applied ? (
            <button className="secondary" disabled>
              Candidatura enviada
              {applicationStatus ? ` (${statusLabel(applicationStatus)})` : ""}
            </button>
          ) : (
            <button
              onClick={() => {
                setError(null);
                setApplyModalError(null);
                if (!isAuthenticated) {
                  setApplyModalOpen(true);
                  setApplyMode("choice");
                  return;
                }
                if (authProfileReadyForApply === null) {
                  return;
                }
                if (!authProfileReadyForApply) {
                  setApplyModalOpen(true);
                  setApplyMode("choice");
                  return;
                }
                setApplyModalOpen(true);
                setApplyMode("authenticated");
              }}
              disabled={
                submitting || (isAuthenticated && authProfileReadyForApply === null && !applied)
              }
            >
              {isAuthenticated && authProfileReadyForApply === null ? "Carregando…" : "Me candidatar"}
            </button>
          )}
        </div>
      </section>

      {applyModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal-card stack"
            role="dialog"
            aria-modal="true"
            aria-label="Fluxo de candidatura"
            style={{ width: `min(${applyModalMaxWidthPx}px, 100%)`, maxWidth: `${applyModalMaxWidthPx}px` }}
          >
            <div className="section-header">
              <h3>Candidatar-se</h3>
              <button
                className="secondary"
                onClick={() => {
                  setApplyModalOpen(false);
                  setApplyModalError(null);
                }}
              >
                Fechar
              </button>
            </div>

            {applyModalError ? (
              <p className="error" role="alert">
                {applyModalError}
              </p>
            ) : null}

            {applyMode === "choice" ? (
              <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
                <button
                  onClick={() => {
                    setApplyModalError(null);
                    setApplyMode("login");
                  }}
                >
                  Fazer login
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    setApplyModalError(null);
                    setApplyMode("quick");
                  }}
                >
                  Candidatura rápida
                </button>
              </div>
            ) : null}

            {applyMode === "login" ? (
              <div className="stack">
                <label>
                  E-mail
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    placeholder="seu@email.com"
                  />
                </label>
                <label>
                  Senha
                  <div className="input-icon-wrap">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      placeholder="Sua senha"
                    />
                    <button
                      type="button"
                      className="input-icon-btn"
                      aria-label={showPassword ? "Esconder senha" : "Visualizar senha"}
                      onClick={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <button
                    className="secondary"
                    onClick={() => {
                      setApplyModalError(null);
                      setApplyMode("choice");
                    }}
                  >
                    Voltar
                  </button>
                  <button onClick={() => void submitLoginAndApply()} disabled={submitting}>
                    {submitting ? "Entrando..." : "Entrar e candidatar"}
                  </button>
                </div>
              </div>
            ) : null}

            {applyMode === "quick" ? (
              <div className="stack">
                <label>
                  Nome completo
                  <input
                    value={quickName}
                    onChange={(event) => setQuickName(event.target.value)}
                    placeholder="Nome completo"
                  />
                </label>
                <label>
                  E-mail
                  <input
                    type="email"
                    value={quickEmail}
                    onChange={(event) => setQuickEmail(event.target.value)}
                    placeholder="seu@email.com"
                  />
                </label>
                <label>
                  CPF
                  <input
                    value={quickCpf}
                    onChange={(event) => setQuickCpf(formatCpf(event.target.value))}
                    placeholder="000.000.000-00"
                  />
                </label>
                <label>
                  Telefone
                  <input
                    value={quickPhone}
                    onChange={(event) => setQuickPhone(formatPhoneBr(event.target.value))}
                    placeholder="(11) 99999-9999"
                  />
                </label>
                {renderScreeningQuestionsEditor()}
                <label className="stack">
                  <span>Carta de apresentação (obrigatória)</span>
                  <div className="job-detail-editor">
                    <RichTextEditor
                      value={quickCoverLetter}
                      onChange={setQuickCoverLetter}
                      placeholder="Escreva sua apresentação para esta vaga"
                    />
                  </div>
                </label>
                {documentRequirements.length > 0 ? (
                  <div className="stack">
                    <strong>Documentos obrigatórios (PDF)</strong>
                    {documentRequirements.map((req) => (
                      <label className="stack" key={req.id}>
                        <span>{req.docType}</span>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(event) =>
                            setQuickDocFiles((prev) => ({
                              ...prev,
                              [req.id]: event.target.files?.[0] ?? null
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                ) : null}
                <label>
                  Anexar currículo (PDF)
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => setQuickResume(event.target.files?.[0] ?? null)}
                  />
                </label>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <button
                    className="secondary"
                    onClick={() => {
                      setApplyModalError(null);
                      setApplyMode("choice");
                    }}
                  >
                    Voltar
                  </button>
                  <button onClick={() => void submitQuickApply()} disabled={submitting}>
                    {submitting ? "Enviando..." : "Concluir candidatura rápida"}
                  </button>
                </div>
              </div>
            ) : null}

            {applyMode === "authenticated" ? (
              <div className="stack">
                {renderScreeningQuestionsEditor()}
                <label className="stack">
                  <span>Carta de apresentação (obrigatória)</span>
                  <div className="job-detail-editor">
                    <RichTextEditor
                      value={coverLetter}
                      onChange={setCoverLetter}
                      placeholder="Escreva sua apresentação para esta vaga"
                    />
                  </div>
                </label>
                {renderAuthenticatedDocUploads()}
                <div className="row" style={{ justifyContent: "flex-end" }}>
                  <button
                    onClick={() => void submitAuthenticatedApplication()}
                    disabled={
                      submitting ||
                      (documentRequirements.length > 0 && docPresenceLoading)
                    }
                  >
                    {submitting ? "Enviando..." : "Enviar candidatura"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {successOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card stack" role="dialog" aria-modal="true" aria-label="Candidatura efetuada">
            <h3>Candidatura efetuada com sucesso</h3>
            <p className="muted">
              {applySuccessVariant === "existing"
                ? "Sua candidatura foi enviada. Acesse sua conta para mais detalhes."
                : "Sua candidatura foi enviada. Verifique seu e-mail para confirmar o cadastro e definir sua senha de acesso ao portal de vagas."}
            </p>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button onClick={() => router.push(`/vagas/${tenantSlug}`)}>OK</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function normalizeAnswers(
  job: PublicJob,
  answersMap: Record<string, { answerBoolean: boolean | null; answerText: string; answerFile: string }>
): JobQuestionAnswer[] {
  const questions = job.screeningQuestions ?? [];
  return questions.map((question) => {
    const answer = answersMap[question.id] ?? {
      answerBoolean: null,
      answerText: "",
      answerFile: ""
    };
    return {
      questionId: question.id,
      answerBoolean: question.type === "yes_no" ? answer.answerBoolean : null,
      answerText: question.type === "text" ? answer.answerText.trim() || null : null,
      answerFile: null
    };
  });
}

function hasMissingRequiredAnswers(job: PublicJob, normalizedAnswers: JobQuestionAnswer[]): boolean {
  const questions = job.screeningQuestions ?? [];
  return questions.some((question) => {
    if (!question.isRequired) return false;
    const answer = normalizedAnswers.find((item) => item.questionId === question.id);
    if (!answer) return true;
    if (question.type === "yes_no") return answer.answerBoolean === null;
    if (question.type === "text") return !answer.answerText;
    return false;
  });
}

function validateRequiredJobDocs(
  files: Record<string, File | null>,
  requirements: PublicJob["documentRequirements"],
  skipRequirementIds?: Set<string>
): string | null {
  for (const req of requirements) {
    if (skipRequirementIds?.has(req.id)) continue;
    const file = files[req.id];
    if (!file) {
      return `Anexe o documento: ${req.docType}.`;
    }
    const mime = (file.type || "").toLowerCase();
    if (mime !== "application/pdf") {
      return `O documento "${req.docType}" deve ser um arquivo PDF.`;
    }
    if (file.size > MAX_PDF_UPLOAD_BYTES) {
      return `O documento "${req.docType}" excede o tamanho máximo permitido.`;
    }
  }
  return null;
}

async function buildJobDocumentUploadPayloads(
  files: Record<string, File | null>,
  requirements: PublicJob["documentRequirements"],
  skipRequirementIds?: Set<string>
): Promise<JobDocumentUploadPayload[]> {
  const payloads: JobDocumentUploadPayload[] = [];
  for (const req of requirements) {
    if (skipRequirementIds?.has(req.id)) continue;
    const file = files[req.id];
    if (!file) {
      throw new Error("Documentos incompletos.");
    }
    payloads.push({
      requirementId: req.id,
      fileName: file.name,
      mimeType: file.type || "application/pdf",
      base64: await fileToBase64(file)
    });
  }
  return payloads;
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}
