"use client";

import DOMPurify from "dompurify";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Breadcrumbs } from "../../../../../../components/breadcrumbs";
import { ConfirmModal } from "../../../../../../components/confirm-modal";
import { apiFetch } from "../../../../../../lib/api";

type JobQuestion = {
  id: string;
  label: string;
  type: "yes_no" | "document_upload" | "text";
  isRequired: boolean;
  isEliminatory: boolean;
  notes: string | null;
};

type TimelineItem = {
  id: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
};

type JobQuestionAnswer = {
  questionId: string;
  answerBoolean: boolean | null;
  answerText: string | null;
  answerFile: string | null;
};

type ApplicationDetails = {
  id: string;
  jobId: string;
  status: "submitted" | "in_review" | "approved" | "rejected" | "archived" | "withdrawn";
  coverLetter: string | null;
  screeningAnswers: JobQuestionAnswer[];
  createdAt: string;
  candidate: {
    fullName: string;
    email: string;
    phone: string | null;
    cpf: string | null;
    contract: string | null;
    source: string | null;
  };
  job: {
    id: string;
    tenantId: string;
    title: string;
    description: string;
    department: string | null;
    location: string | null;
    employmentType: string | null;
    city: string | null;
    state: string | null;
    salary: number | null;
    expiresAt: string | null;
    skills?: string[] | null;
    screeningQuestions: JobQuestion[];
    status: "draft" | "published" | "closed";
  };
  candidateProfile: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
    cpf: string | null;
    city: string | null;
    state: string | null;
    linkedinUrl: string | null;
    portfolioUrl: string | null;
    professionalSummary: string | null;
    desiredPosition: string | null;
    salaryExpectation: number | null;
    yearsExperience: number | null;
    skills: string[];
    education: TimelineItem[];
    experience: TimelineItem[];
    resumeFileName: string | null;
    resumeFilePath: string | null;
    resumeMimeType: string | null;
    resumeSizeBytes: number | null;
  } | null;
};

type ResumeDownloadResult = {
  fileName: string;
  downloadUrl: string;
  expiresIn: number;
};

function applicationStatusLabel(status: ApplicationDetails["status"]): string {
  if (status === "submitted") return "Submetido";
  if (status === "in_review") return "Em analise";
  if (status === "approved") return "Aprovado";
  if (status === "rejected") return "Rejeitado";
  if (status === "withdrawn") return "Candidatura cancelada";
  return "Arquivado";
}

function renderQuestionAnswer(
  question: JobQuestion,
  answers: JobQuestionAnswer[]
): string {
  const answer = answers.find((item) => item.questionId === question.id);
  if (!answer) return "Não respondida";
  if (question.type === "yes_no") {
    if (answer.answerBoolean === true) return "Sim";
    if (answer.answerBoolean === false) return "Não";
    return "Não respondida";
  }
  if (question.type === "text") {
    return answer.answerText?.trim() || "Não respondida";
  }
  return answer.answerFile?.trim() || "Não respondida";
}

function jobStatusLabel(job: ApplicationDetails["job"]): string {
  if (job.status === "closed") return "Encerrada";
  if (job.status === "draft") return "Rascunho";
  if (job.expiresAt && job.expiresAt < new Date().toISOString().slice(0, 10)) return "Inativa";
  return "Ativa";
}

function formatTimelinePeriod(item: TimelineItem): string {
  const start = item.startDate ? new Date(item.startDate).toLocaleDateString("pt-BR") : "Inicio nao informado";
  const end = item.isCurrent
    ? "Atual"
    : item.endDate
      ? new Date(item.endDate).toLocaleDateString("pt-BR")
      : "Fim nao informado";
  return `${start} - ${end}`;
}

export default function RecruitmentCandidateApplicationDetailsPage() {
  const params = useParams<{ tenantId: string; applicationId: string }>();
  const router = useRouter();

  const tenantId = params.tenantId;
  const applicationId = params.applicationId;

  const [item, setItem] = useState<ApplicationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingDecision, setSavingDecision] = useState(false);
  const [openOnboardingModal, setOpenOnboardingModal] = useState(false);

  const safeJobDescription = useMemo(
    () => DOMPurify.sanitize(item?.job.description ?? ""),
    [item?.job.description]
  );
  const safeSummary = useMemo(
    () => DOMPurify.sanitize(item?.candidateProfile?.professionalSummary ?? ""),
    [item?.candidateProfile?.professionalSummary]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ApplicationDetails>(
        `/v1/tenants/${tenantId}/recruitment/applications/${applicationId}`
      );
      setItem(data);
    } catch (err) {
      setItem(null);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [tenantId, applicationId]);

  function openOnboardingPrompt() {
    if (!item) return;
    setError(null);
    setOkMsg(null);
    setOpenOnboardingModal(true);
  }

  async function markApprovedOnly() {
    if (!item) return;
    setError(null);
    setOkMsg(null);

    setSavingDecision(true);
    try {
      await apiFetch(`/v1/tenants/${tenantId}/jobs/${item.jobId}/applications/${item.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "approved" })
      });
      setOpenOnboardingModal(false);
      setOkMsg("Candidato aprovado. Você pode iniciar o onboarding depois.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingDecision(false);
    }
  }

  async function startOnboardingNow() {
    if (!item) return;
    setError(null);
    setOkMsg(null);

    setSavingDecision(true);
    try {
      const fullName = (item.candidateProfile?.fullName ?? item.candidate.fullName).trim();
      const email = (item.candidateProfile?.email ?? item.candidate.email).trim().toLowerCase();
      const cpf = (item.candidateProfile?.cpf ?? item.candidate.cpf ?? "").trim();
      const phone = (item.candidateProfile?.phone ?? item.candidate.phone ?? "").trim();

      // Garantir status aprovado (mesmo se já estiver aprovado)
      await apiFetch(`/v1/tenants/${tenantId}/jobs/${item.jobId}/applications/${item.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "approved" })
      });

      // Converte candidato em colaborador e dispara convite (backend)
      await apiFetch(`/v1/tenants/${tenantId}/employees`, {
        method: "POST",
        body: JSON.stringify({
          fullName,
          email,
          cpf: cpf || undefined,
          phone: phone || undefined
        })
      });

      setOpenOnboardingModal(false);
      setOkMsg("Onboarding iniciado: colaborador criado e convite enviado.");
      await load();
      router.push(`/tenants/${tenantId}/collaborator`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingDecision(false);
    }
  }

  async function reject() {
    if (!item) return;
    setError(null);
    setOkMsg(null);

    setSavingDecision(true);
    try {
      await apiFetch(`/v1/tenants/${tenantId}/jobs/${item.jobId}/applications/${item.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected" })
      });
      setOkMsg("Candidato reprovado com sucesso.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingDecision(false);
    }
  }

  async function downloadResume() {
    setError(null);
    try {
      const result = await apiFetch<ResumeDownloadResult>(
        `/v1/tenants/${tenantId}/recruitment/applications/${applicationId}/resume-download`
      );
      window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Início", href: `/tenants/${tenantId}/dashboard` },
          { label: "Painel de Recrutamento", href: `/tenants/${tenantId}/recruitment/jobs` },
          { label: "Candidatos", href: `/tenants/${tenantId}/recruitment/candidates` },
          { label: "Detalhes" }
        ]}
      />

      <div className="section-header">
        <h1>Detalhes da candidatura</h1>
        <div className="row">
          <button
            type="button"
            className="secondary"
            onClick={() => router.push(`/tenants/${tenantId}/recruitment/candidates`)}
          >
            Voltar
          </button>
          {item?.status === "approved" ? (
            <button type="button" onClick={openOnboardingPrompt} disabled={!item || savingDecision}>
              Iniciar Onboarding
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={openOnboardingPrompt}
                disabled={
                  !item ||
                  savingDecision ||
                  item.status === "archived" ||
                  item.status === "rejected" ||
                  item.status === "withdrawn"
                }
              >
                Aprovar candidato
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => void reject()}
                disabled={
                  !item ||
                  savingDecision ||
                  item.status === "rejected" ||
                  item.status === "archived" ||
                  item.status === "withdrawn"
                }
              >
                Reprovar candidato
              </button>
            </>
          )}
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {okMsg ? <p>{okMsg}</p> : null}

      {loading ? <p className="muted">Carregando detalhes da candidatura...</p> : null}

      {item ? (
        <>
          <section className="card stack">
            <h2>{item.job.title}</h2>
            <div className="job-rich-content" dangerouslySetInnerHTML={{ __html: safeJobDescription }} />
            <div className="row">
              <span className="badge">Status: {jobStatusLabel(item.job)}</span>
              <span className="badge">Area: {item.job.department ?? "Nao informada"}</span>
              <span className="badge">Modalidade: {item.job.location ?? "Nao informada"}</span>
              <span className="badge">Tipo: {item.job.employmentType ?? "Nao informado"}</span>
              <span className="badge">Cidade: {item.job.city ?? "Nao informada"}</span>
              <span className="badge">Estado: {item.job.state ?? "Nao informado"}</span>
              <span className="badge">Salario: {item.job.salary == null ? "Nao informado" : `R$ ${item.job.salary.toFixed(2)}`}</span>
              <span className="badge">Validade: {item.job.expiresAt ?? "Sem validade"}</span>
              <span className="badge">Status candidatura: {applicationStatusLabel(item.status)}</span>
              {(item.job.skills ?? []).map((skill) => (
                <span className="badge" key={skill}>Habilidade: {skill.replace(/-/g, " ")}</span>
              ))}
            </div>
          </section>

          {item.coverLetter ? (
            <section className="card stack">
              <h3>Carta de apresentação</h3>
              <div className="job-rich-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.coverLetter) }} />
            </section>
          ) : null}

          <section className="card stack">
            <h3>Perguntas da vaga</h3>
            {(item.job.screeningQuestions ?? []).length === 0 ? (
              <p className="muted">Esta vaga nao possui perguntas especificas.</p>
            ) : (
              (item.job.screeningQuestions ?? []).map((q) => (
                <div className="card" key={q.id}>
                  <strong>{q.label}</strong>
                  <div className="tag-list" style={{ marginTop: 8 }}>
                    <span className="badge">
                      Tipo: {q.type === "yes_no" ? "Sim/Não" : q.type === "document_upload" ? "Upload de documento" : "Texto livre"}
                    </span>
                    <span className="badge">Obrigatoria: {q.isRequired ? "Sim" : "Nao"}</span>
                    <span className="badge">Eliminatoria: {q.isEliminatory ? "Sim" : "Nao"}</span>
                  </div>
                  <p style={{ marginTop: 8 }}>
                    <strong>Resposta:</strong> {renderQuestionAnswer(q, item.screeningAnswers ?? [])}
                  </p>
                  {q.notes ? <p>{q.notes}</p> : null}
                </div>
              ))
            )}
          </section>

          <section className="card stack">
            <div className="section-header">
              <h3>Informacoes do candidato</h3>
              {item.candidateProfile?.resumeFilePath ? (
                <button className="secondary" onClick={downloadResume}>Baixar curriculo</button>
              ) : null}
            </div>

            <div className="row">
              <span className="badge">Nome: {item.candidateProfile?.fullName ?? item.candidate.fullName}</span>
              <span className="badge">E-mail: {item.candidateProfile?.email ?? item.candidate.email}</span>
              <span className="badge">Telefone: {item.candidateProfile?.phone ?? item.candidate.phone ?? "Nao informado"}</span>
              <span className="badge">CPF: {item.candidateProfile?.cpf ?? item.candidate.cpf ?? "Nao informado"}</span>
              <span className="badge">Contrato: {item.candidate.contract ?? "Nao informado"}</span>
              <span className="badge">Origem: {item.candidate.source ?? "Nao informada"}</span>
              <span className="badge">
                Local: {item.candidateProfile?.city ? `${item.candidateProfile.city}/${item.candidateProfile.state ?? "-"}` : "Nao informado"}
              </span>
              <span className="badge">Cargo desejado: {item.candidateProfile?.desiredPosition ?? "Nao informado"}</span>
              <span className="badge">Anos de experiencia: {item.candidateProfile?.yearsExperience ?? "Nao informado"}</span>
              <span className="badge">
                Pretensao: {item.candidateProfile?.salaryExpectation == null ? "Nao informada" : `R$ ${item.candidateProfile.salaryExpectation.toFixed(2)}`}
              </span>
            </div>

            {item.candidateProfile?.professionalSummary ? (
              <div className="card stack">
                <h4>Resumo profissional</h4>
                <div className="job-rich-content" dangerouslySetInnerHTML={{ __html: safeSummary }} />
              </div>
            ) : null}

            <div className="row">
              {item.candidateProfile?.linkedinUrl ? (
                <a href={item.candidateProfile.linkedinUrl} target="_blank" rel="noreferrer">
                  <button className="secondary">LinkedIn</button>
                </a>
              ) : null}
              {item.candidateProfile?.portfolioUrl ? (
                <a href={item.candidateProfile.portfolioUrl} target="_blank" rel="noreferrer">
                  <button className="secondary">Portfólio</button>
                </a>
              ) : null}
            </div>

            <div className="card stack">
              <h4>Formacao</h4>
              {(item.candidateProfile?.education ?? []).length ? (
                (item.candidateProfile?.education ?? []).map((ed) => (
                  <div key={ed.id} className="card stack">
                    <strong>{ed.title}</strong>
                    <span className="muted">{formatTimelinePeriod(ed)}</span>
                    {ed.description ? <p>{ed.description}</p> : null}
                  </div>
                ))
              ) : (
                <p className="muted">Sem formacao cadastrada.</p>
              )}
            </div>

            <div className="card stack">
              <h4>Experiencia profissional</h4>
              {(item.candidateProfile?.experience ?? []).length ? (
                (item.candidateProfile?.experience ?? []).map((exp) => (
                  <div key={exp.id} className="card stack">
                    <strong>{exp.title}</strong>
                    <span className="muted">{formatTimelinePeriod(exp)}</span>
                    {exp.description ? <p>{exp.description}</p> : null}
                  </div>
                ))
              ) : (
                <p className="muted">Sem experiencia cadastrada.</p>
              )}
            </div>
          </section>
        </>
      ) : null}

      {openOnboardingModal ? (
        <div className="modal-backdrop" onClick={() => (savingDecision ? null : setOpenOnboardingModal(false))}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0 }}>Iniciar onboarding</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Deseja iniciar o processo de onboarding do candidato?
            </p>
            {error ? <p className="error">{error}</p> : null}
            <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="secondary"
                disabled={savingDecision}
                onClick={() => setOpenOnboardingModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="secondary"
                disabled={savingDecision}
                onClick={() => void markApprovedOnly()}
              >
                Iniciar onboarding posteriormente
              </button>
              <button type="button" disabled={savingDecision} onClick={() => void startOnboardingNow()}>
                Sim
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
