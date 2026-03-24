"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Breadcrumbs } from "../../../../../../components/breadcrumbs";
import {
  JobDocumentRequirementsField,
  type JobDocumentRequirementValue
} from "../../../../../../components/job-document-requirements-field";
import { RichTextEditor } from "../../../../../../components/rich-text-editor";
import { SkillTagsInput } from "../../../../../../components/skill-tags-input";
import { apiFetch } from "../../../../../../lib/api";
import { listBrazilCitiesByState, listBrazilStates } from "../../../../../../lib/brazil-locations";

type JobQuestion = {
  id: string;
  label: string;
  type: "yes_no" | "text";
  isRequired: boolean;
  isEliminatory: boolean;
  expectedAnswer: "yes" | "no" | null;
  notes: string | null;
};

type ExperienceCriterion = {
  id: string;
  role: string;
  months: number | null;
};

function createQuestion(): JobQuestion {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `q-${Date.now()}`,
    label: "",
    type: "yes_no",
    isRequired: false,
    isEliminatory: false,
    expectedAnswer: "yes",
    notes: null
  };
}

function createExperienceCriterion(role: string, months: string): ExperienceCriterion {
  const parsedMonths = Number(months.trim());
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `exp-${Date.now()}`,
    role: role.trim(),
    months: Number.isFinite(parsedMonths) && parsedMonths > 0 ? Math.round(parsedMonths) : null
  };
}

function formatSalaryCurrency(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  const cents = digits.slice(-2).padStart(2, "0");
  const integerRaw = (digits.length > 2 ? digits.slice(0, -2) : "0").replace(/^0+(?=\d)/, "");
  const integerWithThousands = integerRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${integerWithThousands},${cents}`;
}

function parseSalaryToNumber(maskedSalary: string): number | null {
  const digits = maskedSalary.replace(/\D/g, "");
  if (!digits) return null;
  return Number(digits) / 100;
}

function formatDateBr(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDateBrToIso(maskedDate: string): string | null {
  const cleaned = maskedDate.trim();
  if (!cleaned) return null;
  const match = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${yyyy}-${mm}-${dd}`;
}

function getQuestionRequirementValue(question: JobQuestion): "required" | "optional" | "eliminatory" {
  if (question.isEliminatory) return "eliminatory";
  return question.isRequired ? "required" : "optional";
}

export default function RecruitmentCreateJobPage() {
  const params = useParams<{ tenantId: string }>();
  const router = useRouter();
  const tenantId = params.tenantId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [salary, setSalary] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [status, setStatus] = useState("published");
  const [questions, setQuestions] = useState<JobQuestion[]>([]);
  const [documentRequirements, setDocumentRequirements] = useState<JobDocumentRequirementValue[]>([]);
  const [aiKeywords, setAiKeywords] = useState<string[]>([]);
  const [aiFormation, setAiFormation] = useState<string[]>([]);
  const [aiCertificates, setAiCertificates] = useState<string[]>([]);
  const [aiExperienceRoleDraft, setAiExperienceRoleDraft] = useState("");
  const [aiExperienceMonthsDraft, setAiExperienceMonthsDraft] = useState("");
  const [aiExperienceList, setAiExperienceList] = useState<ExperienceCriterion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const states = listBrazilStates();
  const cities = listBrazilCitiesByState(state);
  const filteredCities = city.trim()
    ? cities.filter((item) => item.toLowerCase().includes(city.toLowerCase()))
    : cities;

  function updateQuestion(index: number, patch: Partial<JobQuestion>) {
    setQuestions((current) =>
      current.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, ...patch };

        // Texto livre nunca é eliminatório.
        if (next.type === "text") {
          next.isEliminatory = false;
          next.expectedAnswer = null;
        } else if (!next.expectedAnswer) {
          next.expectedAnswer = "yes";
        }
        // Eliminatória implica obrigatória.
        if (next.isEliminatory) {
          next.isRequired = true;
        }

        return next;
      })
    );
  }

  function removeQuestion(index: number) {
    setQuestions((current) => current.filter((_, i) => i !== index));
  }

  function addExperienceCriterion() {
    const role = aiExperienceRoleDraft.trim();
    if (!role) return;
    const next = createExperienceCriterion(role, aiExperienceMonthsDraft);
    setAiExperienceList((current) => [...current, next]);
    setAiExperienceRoleDraft("");
    setAiExperienceMonthsDraft("");
  }

  function removeExperienceCriterion(id: string) {
    setAiExperienceList((current) => current.filter((item) => item.id !== id));
  }

  function buildAiScreeningCriteria() {
    const keywords = aiKeywords.filter(Boolean);
    const formation = aiFormation.filter(Boolean);
    const certificates = aiCertificates.filter(Boolean);
    const experienceParts = aiExperienceList
      .map((item) => (item.months != null ? `${item.role} (${item.months} meses)` : item.role))
      .filter(Boolean);
    return {
      keywords,
      formation: formation.length > 0 ? formation.join(", ") : null,
      certificates,
      experienceRole: experienceParts.length > 0 ? experienceParts.join("; ") : null,
      experienceMonths: null
    };
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const cleanQuestions = questions
      .map((item) => {
        const normalized: JobQuestion = {
          ...item,
          label: item.label.trim(),
          notes: item.notes?.trim() || null
        };
        if (normalized.type === "text") {
          normalized.isEliminatory = false;
          normalized.expectedAnswer = null;
        } else if (!normalized.expectedAnswer) {
          normalized.expectedAnswer = "yes";
        }
        if (normalized.isEliminatory) {
          normalized.isRequired = true;
        }
        return normalized;
      })
      .filter((item) => item.label.length > 0);

    try {
      const result = await apiFetch<{ id: string }>(`/v1/tenants/${tenantId}/jobs`, {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          department: department.trim() || null,
          location: location.trim() || null,
          employmentType: employmentType || null,
          city: city.trim() || null,
          state: state.trim() || null,
          salary: parseSalaryToNumber(salary),
          expiresAt: parseDateBrToIso(expiresAt),
          skills,
          screeningQuestions: cleanQuestions,
          documentRequirements: documentRequirements.map((item) => ({
            id: item.id,
            docTab: item.docTab,
            docType: item.docType,
            label: item.label ?? null
          })),
          aiScreeningCriteria: buildAiScreeningCriteria(),
          status
        })
      });
      router.push(`/tenants/${tenantId}/recruitment/jobs/${result.id}`);
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
          { label: "Vagas", href: `/tenants/${tenantId}/recruitment/jobs` },
          { label: "Nova vaga" }
        ]}
      />
      <h1>Criar vaga</h1>
      {error ? <p className="error">{error}</p> : null}

      <div className="card">
        <form className="stack" onSubmit={onSubmit}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título da vaga" />
          <RichTextEditor
            className="job-detail-editor"
            value={description}
            onChange={setDescription}
            placeholder="Descrição da vaga"
          />
          <div style={{ display: "grid", gridTemplateColumns: "33fr 34fr 33fr", gap: 12, alignItems: "start" }}>
            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Área (Departamento)"
            />
            <select value={location} onChange={(e) => setLocation(e.target.value)}>
              <option value="">Modalidade</option>
              <option value="Presencial">Presencial</option>
              <option value="Hibrido">Hibrido</option>
              <option value="Remoto">Remoto</option>
            </select>
            <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
              <option value="">Tipo</option>
              <option value="CLT">CLT</option>
              <option value="Freelancer">Freelancer</option>
              <option value="PJ">PJ</option>
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "20fr 45fr 35fr", gap: 12, alignItems: "start" }}>
            <select
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setCity("");
              }}
            >
              <option value="">Estado</option>
              {states.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
            <input list="city-options-new" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Cidade" disabled={!state} />
            <datalist id="city-options-new">
              {filteredCities.map((name) => <option key={name} value={name} />)}
            </datalist>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "nowrap", minWidth: 0 }}>
              <span style={{ whiteSpace: "nowrap", flex: "0 0 auto" }}>Salário</span>
              <input
                style={{ flex: "1 1 auto", minWidth: 0 }}
                type="text"
                inputMode="numeric"
                value={salary}
                onChange={(e) => setSalary(formatSalaryCurrency(e.target.value))}
                placeholder="R$ 0,00"
              />
            </div>
          </div>

          <div className="card stack" style={{ padding: 12 }}>
            <h3 style={{ margin: 0 }}>Critérios para triagem</h3>
            <p className="muted" style={{ margin: 0 }}>
              A IA compara currículo e documentos enviados na candidatura com estes critérios e calcula o match (visível
              apenas para admin, gestor e analista).
            </p>
            <label>
              Habilidades da vaga
              <SkillTagsInput
                value={skills}
                onChange={setSkills}
                placeholder="Digite e pressione Enter (ex.: excel, atendimento)"
                allowCreate
              />
            </label>
            <label>
              Palavras-chave para triagem
              <SkillTagsInput
                value={aiKeywords}
                onChange={setAiKeywords}
                placeholder="Digite e pressione Enter"
                allowCreate
              />
            </label>
            <label>
              Formação esperada
              <SkillTagsInput
                value={aiFormation}
                onChange={setAiFormation}
                placeholder="Digite e pressione Enter"
                allowCreate
              />
            </label>
            <label>
              Certificados desejados
              <SkillTagsInput
                value={aiCertificates}
                onChange={setAiCertificates}
                placeholder="Digite e pressione Enter"
                allowCreate
              />
            </label>
            <div
              className="stack"
              style={{
                gap: 12,
                padding: 14,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg)"
              }}
            >
              <div className="stack" style={{ gap: 4 }}>
                <span style={{ fontWeight: 600 }}>Função/cargo para experiência</span>
                <p className="muted small" style={{ margin: 0 }}>
                  Informe a função; se quiser exigir tempo mínimo, preencha os meses e clique em adicionar.
                </p>
              </div>
              <label className="stack" style={{ gap: 6 }}>
                <span className="muted small">Função ou cargo</span>
                <input
                  value={aiExperienceRoleDraft}
                  onChange={(e) => setAiExperienceRoleDraft(e.target.value)}
                  placeholder="Ex.: Desenvolvedor backend"
                />
              </label>
              {aiExperienceRoleDraft.trim() ? (
                <label className="stack" style={{ gap: 6 }}>
                  <span className="muted small">Tempo mínimo (meses)</span>
                  <input
                    type="number"
                    min={1}
                    value={aiExperienceMonthsDraft}
                    onChange={(e) => setAiExperienceMonthsDraft(e.target.value)}
                    placeholder="Opcional"
                  />
                </label>
              ) : null}
              <div className="row" style={{ justifyContent: "flex-start" }}>
                <button type="button" className="secondary" onClick={addExperienceCriterion}>
                  + Adicionar função
                </button>
              </div>
              {aiExperienceList.length > 0 ? (
                <div className="stack" style={{ gap: 8 }}>
                  {aiExperienceList.map((item) => (
                    <div
                      key={item.id}
                      className="card row"
                      style={{ padding: 10, justifyContent: "space-between", alignItems: "center" }}
                    >
                      <span>
                        {item.role}
                        {item.months != null ? ` - ${item.months} meses` : ""}
                      </span>
                      <button type="button" className="danger" onClick={() => removeExperienceCriterion(item.id)}>
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <JobDocumentRequirementsField value={documentRequirements} onChange={setDocumentRequirements} />

          <div className="card stack" style={{ padding: 12 }}>
            <div className="section-header">
              <h3>Perguntas</h3>
              <button type="button" className="secondary" onClick={() => setQuestions((c) => [...c, createQuestion()])}>+ Adicionar pergunta</button>
            </div>

            {questions.map((question, index) => (
              <div className="card stack" key={question.id} style={{ padding: 12 }}>
                <label className="stack">
                  <span>Formato da pergunta</span>
                  <select
                    value={question.type}
                    onChange={(e) => updateQuestion(index, { type: e.target.value as JobQuestion["type"] })}
                  >
                    <option value="yes_no">Sim/Não</option>
                    <option value="text">Texto livre</option>
                  </select>
                </label>
                <label className="stack">
                  <span>Tipo da pergunta</span>
                  <select
                    value={getQuestionRequirementValue(question)}
                    onChange={(e) => {
                      const value = e.target.value as "required" | "optional" | "eliminatory";
                      if (value === "eliminatory") {
                        updateQuestion(index, { isEliminatory: true, isRequired: true });
                        return;
                      }
                      updateQuestion(index, { isEliminatory: false, isRequired: value === "required" });
                    }}
                  >
                    <option value="required">Obrigatória</option>
                    <option value="optional">Não obrigatória</option>
                    {question.type === "yes_no" ? <option value="eliminatory">Eliminatória</option> : null}
                  </select>
                </label>
                {question.type === "yes_no" ? (
                  <label className="stack">
                    <span>Resposta esperada</span>
                    <select
                      value={question.expectedAnswer ?? "yes"}
                      onChange={(e) => updateQuestion(index, { expectedAnswer: e.target.value as "yes" | "no" })}
                    >
                      <option value="yes">Sim</option>
                      <option value="no">Não</option>
                    </select>
                  </label>
                ) : null}
                <div className="row">
                  <input
                    value={question.label}
                    onChange={(e) => updateQuestion(index, { label: e.target.value })}
                    placeholder="Pergunta"
                  />
                </div>
                <input
                  value={question.notes ?? ""}
                  onChange={(e) => updateQuestion(index, { notes: e.target.value || null })}
                  placeholder="Observação (opcional)"
                />
                <div className="row" style={{ justifyContent: "flex-end" }}>
                  <button type="button" className="danger" onClick={() => removeQuestion(index)}>Remover</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
            <label>
              Status da vaga
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="draft">Rascunho</option>
                <option value="published">Ativa</option>
                <option value="closed">Encerrada</option>
              </select>
            </label>
            <label>
              Data limite da vaga
              <input
                type="text"
                inputMode="numeric"
                value={expiresAt}
                onChange={(e) => setExpiresAt(formatDateBr(e.target.value))}
                placeholder="dd/mm/aaaa"
              />
            </label>
          </div>

          <button type="submit">Salvar vaga</button>
        </form>
      </div>
    </main>
  );
}

