"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { ConfirmModal } from "../../../../components/confirm-modal";
import { RichTextEditor } from "../../../../components/rich-text-editor";
import {
  applyToJob,
  getMyApplicationByJob,
  getPublicJobById,
  isCoverLetterNonEmpty,
  type JobDocumentUploadPayload,
  type JobQuestionAnswer,
  type MyApplication,
  type PublicJob,
  statusLabel,
  withdrawMyApplication
} from "../../../../lib/candidate";
import { MAX_PDF_UPLOAD_BYTES } from "../../../../lib/upload-limits";

export default function CandidateJobDetailPage() {
  const params = useParams<{ jobId: string }>();
  const router = useRouter();
  const jobId = params?.jobId ?? "";

  const [job, setJob] = useState<PublicJob | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmWithdrawOpen, setConfirmWithdrawOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({});

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getPublicJobById(jobId)
      .then((data) => {
        if (!cancelled) setJob(data);
        return getMyApplicationByJob(jobId);
      })
      .then((data) => {
        if (cancelled) return;
        setApplied(data.applied);
        setApplicationStatus(data.status ?? null);
        if (data.coverLetter) {
          setCoverLetter(data.coverLetter);
        }
        if (data.screeningAnswers?.length) {
          const next: typeof questionAnswers = {};
          for (const ans of data.screeningAnswers) {
            next[ans.questionId] = {
              answerBoolean: ans.answerBoolean ?? null,
              answerText: ans.answerText ?? "",
              answerFile: ans.answerFile ?? ""
            };
          }
          setQuestionAnswers(next);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  async function confirmApply() {
    if (!job) return;
    const normalizedAnswers: JobQuestionAnswer[] = job.screeningQuestions.map((question) => {
      const answer = questionAnswers[question.id] ?? {
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

    const hasMissingRequired = job.screeningQuestions.some((question) => {
      if (!question.isRequired) return false;
      const answer = normalizedAnswers.find((item) => item.questionId === question.id);
      if (!answer) return true;
      if (question.type === "yes_no") return answer.answerBoolean === null;
      if (question.type === "text") return !answer.answerText;
      return false;
    });

    if (hasMissingRequired) {
      setError("Preencha todas as perguntas obrigatórias da vaga antes de se candidatar.");
      setConfirmOpen(false);
      return;
    }

    if (!isCoverLetterNonEmpty(coverLetter)) {
      setError("A carta de apresentação é obrigatória.");
      setConfirmOpen(false);
      return;
    }

    const requirements = job.documentRequirements ?? [];
    const docErr = validateRequiredJobDocs(docFiles, requirements);
    if (docErr) {
      setError(docErr);
      setConfirmOpen(false);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const jobDocumentUploads =
        requirements.length > 0 ? await buildJobDocumentUploadPayloads(docFiles, requirements) : undefined;
      await applyToJob(job.id, coverLetter.trim(), normalizedAnswers, jobDocumentUploads);
      setConfirmOpen(false);
      setApplied(true);
      setApplicationStatus("submitted");
      setSuccessOpen(true);
    } catch (err) {
      setError((err as Error).message);
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmWithdraw() {
    if (!job) return;
    setWithdrawing(true);
    setError(null);
    try {
      await withdrawMyApplication(job.id);
      setApplied(false);
      setApplicationStatus("withdrawn");
      setConfirmWithdrawOpen(false);
    } catch (err) {
      setError((err as Error).message);
      setConfirmWithdrawOpen(false);
    } finally {
      setWithdrawing(false);
    }
  }

  if (loading) {
    return (
      <main className="container wide apply-flow-main">
        <p>Carregando vaga...</p>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="container wide apply-flow-main">
        <p className="error">Vaga não encontrada.</p>
      </main>
    );
  }

  const isWithdrawn = applicationStatus === "withdrawn";
  const fieldReadOnly = applicationStatus === "approved";
  const showWithdraw =
    applicationStatus != null &&
    !isWithdrawn &&
    ["submitted", "in_review", "approved", "rejected"].includes(applicationStatus);

  return (
    <main className="container wide stack apply-flow-main" style={{ margin: 0 }}>
      <div className="section-header">
        <h1>{job.title}</h1>
        <button className="secondary" onClick={() => router.push("/candidate/jobs")}>Voltar para vagas</button>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <section className="card stack">
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

        <div className="job-description job-rich-content" dangerouslySetInnerHTML={{ __html: job.description }} />
        {(job.documentRequirements ?? []).length > 0 ? (
          <section className="card stack">
            <h3>Documentos obrigatórios</h3>
            <p className="muted">Envie um PDF para cada item.</p>
            {(job.documentRequirements ?? []).map((req) => (
              <label className="stack" key={req.id}>
                <span>{req.docType}</span>
                <input
                  type="file"
                  accept="application/pdf"
                  disabled={fieldReadOnly || applied}
                  onChange={(event) =>
                    setDocFiles((prev) => ({
                      ...prev,
                      [req.id]: event.target.files?.[0] ?? null
                    }))
                  }
                />
              </label>
            ))}
          </section>
        ) : null}

        {job.screeningQuestions.length > 0 ? (
          <section className="card stack">
            <h3>Perguntas da vaga</h3>
            {job.screeningQuestions.map((question) => {
              const answer = questionAnswers[question.id] ?? {
                answerBoolean: null,
                answerText: "",
                answerFile: ""
              };
              return (
                <div className="card stack" key={question.id}>
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
                          name={`question-${question.id}`}
                          checked={answer.answerBoolean === true}
                          disabled={fieldReadOnly}
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
                          name={`question-${question.id}`}
                          checked={answer.answerBoolean === false}
                          disabled={fieldReadOnly}
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
                      readOnly={fieldReadOnly}
                      disabled={fieldReadOnly}
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
        ) : null}

        <label className="stack">
          <span>Carta de apresentação (obrigatória)</span>
          <div className="job-detail-editor">
            <RichTextEditor
              value={coverLetter}
              onChange={setCoverLetter}
              readOnly={fieldReadOnly}
              placeholder="Escreva sua apresentação para esta vaga"
            />
          </div>
        </label>

        {isWithdrawn ? (
          <p className="muted">
            A sua candidatura consta como cancelada. Use «Refazer candidatura» para enviar novamente e voltar ao fluxo de
            análise.
          </p>
        ) : null}

        <div className="row job-apply-actions">
          {applied ? (
            <>
              <button className="secondary" disabled>
                Candidatura enviada
                {applicationStatus ? ` (${statusLabel(applicationStatus)})` : ""}
              </button>
              {showWithdraw ? (
                <button
                  className="secondary"
                  onClick={() => setConfirmWithdrawOpen(true)}
                  disabled={withdrawing}
                >
                  Retirar candidatura
                </button>
              ) : null}
            </>
          ) : (
            <button onClick={() => setConfirmOpen(true)} disabled={submitting}>
              {isWithdrawn ? "Refazer candidatura" : "Candidatar-se"}
            </button>
          )}
        </div>
      </section>

      <ConfirmModal
        open={confirmOpen}
        title="Confirmar candidatura"
        message="Deseja confirmar sua candidatura para esta vaga?"
        confirmLabel={submitting ? "Enviando..." : "Confirmar candidatura"}
        cancelLabel="Cancelar"
        onCancel={() => (submitting ? null : setConfirmOpen(false))}
        onConfirm={confirmApply}
      />
      <ConfirmModal
        open={confirmWithdrawOpen}
        title="Retirar candidatura"
        message="Deseja retirar sua candidatura desta vaga?"
        confirmLabel={withdrawing ? "Removendo..." : "Confirmar retirada"}
        cancelLabel="Cancelar"
        onCancel={() => (withdrawing ? null : setConfirmWithdrawOpen(false))}
        onConfirm={confirmWithdraw}
      />

      {successOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-label="Candidatura efetuada">
            <h3>Candidatura efetuada com sucesso</h3>
            <p className="muted">Sua candidatura foi enviada para análise.</p>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button onClick={() => router.push("/candidate/dashboard")}>OK</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function validateRequiredJobDocs(
  files: Record<string, File | null>,
  requirements: PublicJob["documentRequirements"]
): string | null {
  for (const req of requirements) {
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

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}

async function buildJobDocumentUploadPayloads(
  files: Record<string, File | null>,
  requirements: PublicJob["documentRequirements"]
): Promise<JobDocumentUploadPayload[]> {
  const payloads: JobDocumentUploadPayload[] = [];
  for (const req of requirements) {
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
