"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AvatarCropModal } from "../../../components/avatar-crop-modal";
import { RichTextEditor } from "../../../components/rich-text-editor";
import { SkillTagsInput } from "../../../components/skill-tags-input";
import { listBrazilCitiesByState, listBrazilStates } from "../../../lib/brazil-locations";
import {
  confirmCandidateAvatarUpload,
  createCandidateAvatarUploadIntent,
  getCandidateProfile,
  processCandidateResumeWithAi,
  saveCandidateProfile,
  type CandidateProfile,
  type TimelineItem
} from "../../../lib/candidate";
import { formatCpf, formatCurrencyBRL, formatPhoneBr, parseCurrencyBRL } from "../../../lib/masks";
import { apiFetch } from "../../../lib/api";
import { MAX_PDF_UPLOAD_BYTES } from "../../../lib/upload-limits";

type UploadIntent = {
  path: string;
  signedUrl: string;
};

type ProfileForm = {
  fullName: string;
  email: string;
  phone: string;
  cpf: string;
  state: string;
  city: string;
  linkedinUrl: string;
  portfolioUrl: string;
  professionalSummary: string;
  desiredPosition: string;
  salaryExpectation: string;
  yearsExperience: string;
  skills: string[];
  education: TimelineItem[];
  experience: TimelineItem[];
};

const defaultForm: ProfileForm = {
  fullName: "",
  email: "",
  phone: "",
  cpf: "",
  state: "",
  city: "",
  linkedinUrl: "",
  portfolioUrl: "",
  professionalSummary: "",
  desiredPosition: "",
  salaryExpectation: "",
  yearsExperience: "",
  skills: [],
  education: [],
  experience: []
};

const candidateAvatarBucket =
  process.env.NEXT_PUBLIC_STORAGE_BUCKET_CANDIDATE_AVATARS ?? "candidate-avatars";

const candidateResumeBucket =
  process.env.NEXT_PUBLIC_STORAGE_BUCKET_CANDIDATE_RESUMES ?? "candidate-resumes";

function candidateResumePublicUrl(filePath: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  if (!base) return "#";
  return `${base}/storage/v1/object/public/${candidateResumeBucket}/${filePath}`;
}

/** Nome salvo no storage costuma ser normalizado; melhora leitura para exibição como título. */
function resumeTitleForDisplay(fileName: string): string {
  return fileName.replace(/_+/g, " ").replace(/\s+/g, " ").trim() || fileName;
}

function createTimelineItem(): TimelineItem {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `item-${Date.now()}`,
    title: "",
    startDate: null,
    endDate: null,
    isCurrent: false,
    description: null
  };
}

export default function CandidateProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [selectedResume, setSelectedResume] = useState<File | null>(null);
  const [avatarSource, setAvatarSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>(defaultForm);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [processingAi, setProcessingAi] = useState(false);

  const states = listBrazilStates();
  const cities = listBrazilCitiesByState(form.state);
  const filteredCities = useMemo(() => {
    const current = form.city.trim().toLowerCase();
    if (!current) return cities;
    return cities.filter((city) => city.toLowerCase().includes(current));
  }, [cities, form.city]);

  useEffect(() => {
    getCandidateProfile()
      .then((data) => {
        if (data) {
          setProfile(data);
          setForm(profileToForm(data));
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function updateForm<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateTimeline(
    group: "education" | "experience",
    index: number,
    patch: Partial<TimelineItem>
  ) {
    setForm((current) => ({
      ...current,
      [group]: current[group].map((item, i) => (i === index ? { ...item, ...patch } : item))
    }));
  }

  function addTimeline(group: "education" | "experience") {
    setForm((current) => ({
      ...current,
      [group]: [...current[group], createTimelineItem()]
    }));
  }

  function removeTimeline(group: "education" | "experience", index: number) {
    setForm((current) => ({
      ...current,
      [group]: current[group].filter((_, i) => i !== index)
    }));
  }

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setOkMsg(null);

    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        cpf: form.cpf.trim() || null,
        state: form.state || null,
        city: form.city.trim() || null,
        linkedinUrl: form.linkedinUrl.trim() || null,
        portfolioUrl: form.portfolioUrl.trim() || null,
        professionalSummary: form.professionalSummary || null,
        desiredPosition: form.desiredPosition.trim() || null,
        salaryExpectation: parseCurrencyBRL(form.salaryExpectation),
        yearsExperience: form.yearsExperience.trim() ? Number(form.yearsExperience) : null,
        skills: form.skills,
        education: sanitizeTimeline(form.education),
        experience: sanitizeTimeline(form.experience)
      };

      const saved = await saveCandidateProfile(payload);
      setProfile(saved);
      setForm(profileToForm(saved));
      setOkMsg("Perfil salvo com sucesso.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function onSelectResume(event: ChangeEvent<HTMLInputElement>) {
    setSelectedResume(event.target.files?.[0] ?? null);
  }

  function onSelectAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Selecione uma imagem JPG, PNG ou WEBP.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarSource(typeof reader.result === "string" ? reader.result : null);
    };
    reader.readAsDataURL(file);
  }

  async function onUploadResume() {
    if (!selectedResume) {
      setError("Selecione um arquivo PDF para currículo.");
      return;
    }

    if (selectedResume.size > MAX_PDF_UPLOAD_BYTES) {
      setError(
        `O PDF pode ter no máximo ${MAX_PDF_UPLOAD_BYTES / (1024 * 1024)} MB. Escolha um arquivo menor.`
      );
      return;
    }

    setUploadingResume(true);
    setError(null);
    setOkMsg(null);

    try {
      const intent = await apiFetch<UploadIntent>("/v1/me/candidate-profile/resume/upload-intent", {
        method: "POST",
        body: JSON.stringify({
          fileName: selectedResume.name,
          mimeType: selectedResume.type,
          sizeBytes: selectedResume.size
        })
      });

      const uploadResponse = await fetch(intent.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": selectedResume.type
        },
        body: selectedResume
      });

      if (!uploadResponse.ok) {
        throw new Error(`Falha no upload do currículo (${uploadResponse.status}).`);
      }

      const saved = await apiFetch<CandidateProfile>("/v1/me/candidate-profile/resume/confirm-upload", {
        method: "POST",
        body: JSON.stringify({
          fileName: selectedResume.name,
          filePath: intent.path,
          mimeType: selectedResume.type,
          sizeBytes: selectedResume.size
        })
      });

      setProfile(saved);
      setSelectedResume(null);
      setOkMsg("Currículo anexado com sucesso.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingResume(false);
    }
  }

  function onSelectAiResume(event: ChangeEvent<HTMLInputElement>) {
    setAiFile(event.target.files?.[0] ?? null);
  }

  async function onProcessResumeWithAi() {
    if (!aiFile) {
      setError("Selecione um arquivo de currículo (PDF ou imagem).");
      return;
    }

    if (aiFile.size > MAX_PDF_UPLOAD_BYTES) {
      setError(
        `O arquivo pode ter no máximo ${MAX_PDF_UPLOAD_BYTES / (1024 * 1024)} MB. Escolha um arquivo menor.`
      );
      return;
    }

    setProcessingAi(true);
    setError(null);
    setOkMsg(null);

    try {
      const saved = await processCandidateResumeWithAi(aiFile);
      setProfile(saved);
      setForm(profileToForm(saved));
      setAiModalOpen(false);
      setAiFile(null);
      setSelectedResume(null);
      setOkMsg("Currículo processado: dados e anexo atualizados. Revise os campos se quiser ajustar algo.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProcessingAi(false);
    }
  }

  async function onConfirmAvatarCrop(file: File) {
    setError(null);
    setOkMsg(null);

    try {
      const intent = await createCandidateAvatarUploadIntent({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size
      });

      const uploadResponse = await fetch(intent.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type
        },
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error(`Falha no upload da imagem (${uploadResponse.status}).`);
      }

      const saved = await confirmCandidateAvatarUpload({
        fileName: file.name,
        filePath: intent.path,
        mimeType: file.type,
        sizeBytes: file.size
      });

      setProfile(saved);
      setAvatarSource(null);
      setOkMsg("Imagem de perfil atualizada com sucesso.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
    }
  }

  if (loading) {
    return <p>Carregando perfil...</p>;
  }

  return (
    <main className="container stack apply-flow-main" style={{ margin: 0 }}>
      <div className="section-header">
        <h1>Meu perfil</h1>
        <button className="secondary" onClick={() => router.push("/candidate/dashboard")}>Ir para painel</button>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {okMsg ? <p>{okMsg}</p> : null}

      <section className="card stack">
        <div className="section-header">
          <h2 style={{ margin: 0 }}>Dados profissionais</h2>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setError(null);
              setAiModalOpen(true);
            }}
          >
            Preencher e atualizar dados por IA
          </button>
        </div>
        <div className="row" style={{ alignItems: "center" }}>
          {profile?.profileImagePath ? (
            <img
              className="avatar-preview"
              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${candidateAvatarBucket}/${profile.profileImagePath}`}
              alt="Imagem de perfil"
            />
          ) : (
            <div className="avatar-preview" />
          )}
          <label style={{ margin: 0 }}>
            Imagem de perfil
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onSelectAvatar} />
          </label>
        </div>
        <form className="stack" onSubmit={onSave}>
          <div className="row">
            <label style={{ flex: 1 }}>
              Nome completo
              <input value={form.fullName} onChange={(e) => updateForm("fullName", e.target.value)} required />
            </label>
            <label style={{ flex: 1 }}>
              E-mail
              <input type="email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} required />
            </label>
          </div>

          <div className="row">
            <label style={{ flex: 1 }}>
              Telefone
              <input
                value={form.phone}
                onChange={(e) => updateForm("phone", formatPhoneBr(e.target.value))}
                placeholder="(11) 99999-9999"
              />
            </label>
            <label style={{ flex: 1 }}>
              CPF
              <input
                value={form.cpf}
                onChange={(e) => updateForm("cpf", formatCpf(e.target.value))}
                placeholder="000.000.000-00"
              />
            </label>
          </div>

          <div className="row">
            <label style={{ flex: 1 }}>
              Estado
              <select value={form.state} onChange={(e) => { updateForm("state", e.target.value); updateForm("city", ""); }}>
                <option value="">Selecione</option>
                {states.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </label>
            <label style={{ flex: 1 }}>
              Cidade
              <input
                list="candidate-city-options"
                value={form.city}
                onChange={(e) => updateForm("city", e.target.value)}
                placeholder="Digite para filtrar"
                disabled={!form.state}
              />
              <datalist id="candidate-city-options">
                {filteredCities.map((city) => <option key={city} value={city} />)}
              </datalist>
            </label>
          </div>

          <div className="row">
            <label style={{ flex: 1 }}>
              Cargo desejado
              <input value={form.desiredPosition} onChange={(e) => updateForm("desiredPosition", e.target.value)} />
            </label>
            <label style={{ flex: 1 }}>
              Pretensão salarial
              <input
                value={form.salaryExpectation}
                onChange={(e) => updateForm("salaryExpectation", formatCurrencyBRL(e.target.value))}
                placeholder="R$ 0,00"
              />
            </label>
            <label style={{ flex: 1 }}>
              Anos de experiência
              <input
                type="number"
                min={0}
                value={form.yearsExperience}
                onChange={(e) => updateForm("yearsExperience", e.target.value)}
              />
            </label>
          </div>

          <div className="row">
            <label style={{ flex: 1 }}>
              LinkedIn
              <input value={form.linkedinUrl} onChange={(e) => updateForm("linkedinUrl", e.target.value)} placeholder="https://" />
            </label>
            <label style={{ flex: 1 }}>
              Portfólio
              <input value={form.portfolioUrl} onChange={(e) => updateForm("portfolioUrl", e.target.value)} placeholder="https://" />
            </label>
          </div>

          <label>
            Resumo profissional
            <div className="job-detail-editor">
              <RichTextEditor
                value={form.professionalSummary}
                onChange={(value) => updateForm("professionalSummary", value)}
                placeholder="Resumo profissional"
              />
            </div>
          </label>

          <label>
            Habilidades
            <SkillTagsInput
              value={form.skills}
              onChange={(next) => updateForm("skills", next)}
              placeholder="Digite a habilidade e pressione Enter"
              allowCreate
            />
          </label>

          <div className="card stack" style={{ padding: 12 }}>
            <div className="section-header">
              <h3>Formação</h3>
              <button type="button" className="secondary" onClick={() => addTimeline("education")}>+ Adicionar</button>
            </div>
            {form.education.map((item, index) => (
              <div key={item.id} className="card stack" style={{ padding: 12 }}>
                <div className="row">
                  <input value={item.title} onChange={(e) => updateTimeline("education", index, { title: e.target.value })} placeholder="Título" />
                  <input type="date" value={item.startDate ?? ""} onChange={(e) => updateTimeline("education", index, { startDate: e.target.value || null })} />
                  {!item.isCurrent ? (
                    <input type="date" value={item.endDate ?? ""} onChange={(e) => updateTimeline("education", index, { endDate: e.target.value || null })} />
                  ) : null}
                </div>
                <label className="remember-row" style={{ color: "var(--text)" }}>
                  <input
                    type="checkbox"
                    checked={item.isCurrent}
                    onChange={(e) =>
                      updateTimeline("education", index, {
                        isCurrent: e.target.checked,
                        endDate: e.target.checked ? null : item.endDate
                      })
                    }
                  />
                  <span>Atualmente (formação em curso)</span>
                </label>
                <textarea value={item.description ?? ""} onChange={(e) => updateTimeline("education", index, { description: e.target.value || null })} placeholder="Descrição" rows={3} />
                <div className="row" style={{ justifyContent: "flex-end" }}>
                  <button type="button" className="danger" onClick={() => removeTimeline("education", index)}>Remover</button>
                </div>
              </div>
            ))}
          </div>

          <div className="card stack" style={{ padding: 12 }}>
            <div className="section-header">
              <h3>Experiência profissional</h3>
              <button type="button" className="secondary" onClick={() => addTimeline("experience")}>+ Adicionar</button>
            </div>
            {form.experience.map((item, index) => (
              <div key={item.id} className="card stack" style={{ padding: 12 }}>
                <div className="row">
                  <input value={item.title} onChange={(e) => updateTimeline("experience", index, { title: e.target.value })} placeholder="Título" />
                  <input type="date" value={item.startDate ?? ""} onChange={(e) => updateTimeline("experience", index, { startDate: e.target.value || null })} />
                  {!item.isCurrent ? (
                    <input type="date" value={item.endDate ?? ""} onChange={(e) => updateTimeline("experience", index, { endDate: e.target.value || null })} />
                  ) : null}
                </div>
                <label className="remember-row" style={{ color: "var(--text)" }}>
                  <input
                    type="checkbox"
                    checked={item.isCurrent}
                    onChange={(e) =>
                      updateTimeline("experience", index, {
                        isCurrent: e.target.checked,
                        endDate: e.target.checked ? null : item.endDate
                      })
                    }
                  />
                  <span>Atualmente (cargo atual)</span>
                </label>
                <textarea value={item.description ?? ""} onChange={(e) => updateTimeline("experience", index, { description: e.target.value || null })} placeholder="Descrição" rows={4} />
                <div className="row" style={{ justifyContent: "flex-end" }}>
                  <button type="button" className="danger" onClick={() => removeTimeline("experience", index)}>Remover</button>
                </div>
              </div>
            ))}
          </div>

          <button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar perfil"}</button>
        </form>
      </section>

      <section className="card stack">
        <h2>Currículo</h2>
        {profile?.resumeFileName && profile.resumeFilePath ? (
          <div
            className="row"
            style={{
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              padding: "12px 0",
              borderBottom: "1px solid var(--border)"
            }}
          >
            <div>
              <p className="muted" style={{ margin: "0 0 4px", fontSize: 13 }}>
                Título do currículo
              </p>
              <p style={{ margin: 0, fontWeight: 600 }}>{resumeTitleForDisplay(profile.resumeFileName)}</p>
            </div>
            <a
              className="btn secondary"
              href={candidateResumePublicUrl(profile.resumeFilePath)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visualizar
            </a>
          </div>
        ) : profile?.resumeFileName ? (
          <p className="muted">Currículo registrado, mas o link de visualização não está disponível.</p>
        ) : (
          <p className="muted">Nenhum currículo anexado.</p>
        )}
        <label className="stack" style={{ marginTop: 12 }}>
          <span className="muted" style={{ fontSize: 14 }}>
            Substituir ou enviar (PDF)
          </span>
          <input type="file" accept="application/pdf" onChange={onSelectResume} />
        </label>
        <button type="button" onClick={onUploadResume} disabled={uploadingResume || !selectedResume}>
          {uploadingResume ? "Enviando..." : "Anexar currículo"}
        </button>
      </section>

      {aiModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => !processingAi && setAiModalOpen(false)}>
          <div
            className="modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-resume-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="ai-resume-title">Preencher com IA</h3>
            <p>
              Envie o currículo em PDF ou imagem (JPG, PNG, WEBP). A IA extrai dados para o cadastro, habilidades,
              formação e experiência, e anexa o arquivo na seção Currículo.
            </p>
            <label>
              Arquivo
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
                onChange={onSelectAiResume}
                disabled={processingAi}
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setAiModalOpen(false)} disabled={processingAi}>
                Cancelar
              </button>
              <button type="button" onClick={() => void onProcessResumeWithAi()} disabled={processingAi || !aiFile}>
                {processingAi ? "Processando..." : "Processar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AvatarCropModal
        open={Boolean(avatarSource)}
        imageSrc={avatarSource}
        onCancel={() => setAvatarSource(null)}
        onConfirm={onConfirmAvatarCrop}
      />
    </main>
  );
}

function profileToForm(profile: CandidateProfile): ProfileForm {
  return {
    fullName: profile.fullName ?? "",
    email: profile.email ?? "",
    phone: profile.phone ? formatPhoneBr(profile.phone) : "",
    cpf: profile.cpf ? formatCpf(profile.cpf) : "",
    state: profile.state ?? "",
    city: profile.city ?? "",
    linkedinUrl: profile.linkedinUrl ?? "",
    portfolioUrl: profile.portfolioUrl ?? "",
    professionalSummary: profile.professionalSummary ?? "",
    desiredPosition: profile.desiredPosition ?? "",
    salaryExpectation: profile.salaryExpectation != null ? formatCurrencyBRL(String(Math.round(profile.salaryExpectation * 100))) : "",
    yearsExperience: profile.yearsExperience != null ? String(profile.yearsExperience) : "",
    skills: profile.skills ?? [],
    education: (profile.education ?? []).map((item) => ({ ...item, isCurrent: item.isCurrent ?? false })),
    experience: (profile.experience ?? []).map((item) => ({ ...item, isCurrent: item.isCurrent ?? false }))
  };
}

function sanitizeTimeline(items: TimelineItem[]): TimelineItem[] {
  return items
    .map((item) => ({
      ...item,
      title: item.title.trim(),
      description: item.description?.trim() || null,
      startDate: item.startDate || null,
      endDate: item.isCurrent ? null : (item.endDate || null),
      isCurrent: item.isCurrent ?? false
    }))
    .filter((item) => item.title.length > 0);
}

