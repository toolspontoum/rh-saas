"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import { AvatarCropModal } from "../../../../../components/avatar-crop-modal";
import { Breadcrumbs } from "../../../../../components/breadcrumbs";
import { EmptyState } from "../../../../../components/empty-state";
import { SkillTagsInput } from "../../../../../components/skill-tags-input";
import { apiFetch } from "../../../../../lib/api";
import {
  currencyToNumber,
  formatCpf,
  formatCurrencyBr,
  formatPhoneBr,
  isValidCpf,
  isValidPhoneBr,
  onlyDigits
} from "../../../../../lib/br-format";

type TenantUser = {
  userId: string;
  email: string | null;
  fullName: string | null;
  cpf: string | null;
  phone: string | null;
  status: "active" | "inactive" | "offboarded";
  roles: string[];
};

type EmployeeProfile = {
  tenantId: string;
  userId: string;
  authEmail: string | null;
  fullName: string | null;
  personalEmail: string | null;
  cpf: string | null;
  phone: string | null;
  department: string | null;
  positionTitle: string | null;
  contractType: string | null;
  admissionDate: string | null;
  baseSalary: number | null;
  profileImageFileName: string | null;
  profileImagePath: string | null;
  profileImageMimeType: string | null;
  profileImageSizeBytes: number | null;
  employeeTags: string[];
  status: "active" | "inactive" | "offboarded";
};

type DocumentRecord = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  fileName: string;
  createdAt: string;
  requestId: string | null;
  docTab: string | null;
  docType: string | null;
  source: string | null;
};

type DocumentRequestRecord = {
  id: string;
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "completed" | "canceled";
  workflow?: "standard" | "signature";
  requestedAt: string;
  resolvedAt: string | null;
  docTab: string;
  docType: string;
  latestDocument: DocumentRecord | null;
};

type PayslipRecord = {
  id: string;
  referenceMonth: string;
  fileName: string;
  createdAt: string;
  acknowledgedAt: string | null;
};

type UploadIntent = {
  path: string;
  signedUrl: string;
};

type OpenFileUrl = {
  signedUrl: string;
};

type Paginated<T> = { items: T[] };

type ProfileForm = {
  fullName: string;
  personalEmail: string;
  cpf: string;
  phone: string;
  department: string;
  positionTitle: string;
  contractType: string;
  admissionDate: string;
  baseSalary: string;
  profileImagePath: string;
  employeeTags: string[];
};

type DocTabKey =
  | "pessoal"
  | "contratacao"
  | "cursos"
  | "propostas"
  | "docs_avulsos"
  | "docs_rescisorios"
  | "baixar_documentos";

type DocModalMode = "request" | "direct" | "signature";

const contractOptions = ["CLT", "PJ", "Estágio", "Freelancer"];
const employeeAvatarBucket =
  process.env.NEXT_PUBLIC_STORAGE_BUCKET_EMPLOYEE_AVATARS ?? "employee-avatars";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function resolveAvatarUrl(path: string): string {
  const raw = path.trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.includes("/storage/v1/object/")) {
    if (!supabaseUrl) return raw.startsWith("/") ? raw : `/${raw.replace(/^\/+/, "")}`;
    return raw.startsWith("/") ? `${supabaseUrl}${raw}` : `${supabaseUrl}/${raw.replace(/^\/+/, "")}`;
  }
  if (!supabaseUrl) return raw;
  return `${supabaseUrl}/storage/v1/object/public/${employeeAvatarBucket}/${raw.replace(/^\/+/, "")}`;
}

const documentTabs: Array<{ key: DocTabKey; label: string }> = [
  { key: "pessoal", label: "Pessoal" },
  { key: "cursos", label: "Certificados" },
  { key: "docs_avulsos", label: "Docs Avulsos" },
  { key: "propostas", label: "Propostas" },
  { key: "contratacao", label: "Contratação" },
  { key: "docs_rescisorios", label: "Docs Rescisórios" },
  { key: "baixar_documentos", label: "Baixar os documentos" }
];

const tabsComAcaoAssinatura: DocTabKey[] = ["contratacao", "propostas", "docs_rescisorios"];

const tabDocTypes: Record<Exclude<DocTabKey, "baixar_documentos">, string[]> = {
  pessoal: [
    "Carteira de Trabalho",
    "Comprovante de residência",
    "CPF",
    "RG",
    "Título de Eleitor",
    "CNH"
  ],
  contratacao: [
    "Contrato de Trabalho Assinado",
    "Declarações diversas",
    "Documentos ASO / exames ocupacionais"
  ],
  cursos: [
    "Cursos e Treinamentos",
    "Certificado nível superior",
    "Certificado nível técnico"
  ],
  propostas: ["Proposta"],
  docs_avulsos: ["Documentos Diversos"],
  docs_rescisorios: [
    "Documento Rescisório",
    "Aviso Prévio de Trabalho Assinado",
    "Termo de Rescisão Contratual Assinado"
  ]
};

const emptyProfile: ProfileForm = {
  fullName: "",
  personalEmail: "",
  cpf: "",
  phone: "",
  department: "",
  positionTitle: "",
  contractType: "",
  admissionDate: "",
  baseSalary: "",
  profileImagePath: "",
  employeeTags: []
};

function moneyFromNumber(value: number | null | undefined): string {
  if (value == null) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function requestStatusLabel(request: DocumentRequestRecord): "Solicitado" | "Recebido" | "Aguardando assinatura" {
  if (request.status === "completed") return "Recebido";
  if (request.status === "in_progress" && request.workflow === "signature") return "Aguardando assinatura";
  return "Solicitado";
}

function isRequestResolved(status: DocumentRequestRecord["status"]): boolean {
  return status === "completed";
}

function normalizeTabForFilter(tab: Exclude<DocTabKey, "baixar_documentos">): string {
  return tab;
}

export default function CollaboratorDetailsPage() {
  const params = useParams<{ tenantId: string; userId: string }>();
  const searchParams = useSearchParams();
  const tenantId = params.tenantId;
  const userId = params.userId;
  const mode = searchParams.get("mode");
  const isEditing = mode === "edit";

  const [user, setUser] = useState<TenantUser | null>(null);
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [documentRequests, setDocumentRequests] = useState<DocumentRequestRecord[]>([]);
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
  const [avatarSource, setAvatarSource] = useState<string | null>(null);
  const [payslipMonth, setPayslipMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payslipFile, setPayslipFile] = useState<File | null>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [activeTab, setActiveTab] = useState<DocTabKey>("pessoal");
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docModalMode, setDocModalMode] = useState<DocModalMode>("request");
  const [docModalType, setDocModalType] = useState("");
  const [docModalDescription, setDocModalDescription] = useState("");
  const [docModalFile, setDocModalFile] = useState<File | null>(null);
  const [docModalError, setDocModalError] = useState<string | null>(null);

  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [replyRequest, setReplyRequest] = useState<DocumentRequestRecord | null>(null);
  const [replyDescription, setReplyDescription] = useState("");
  const [replyFile, setReplyFile] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);

  const collaboratorName = useMemo(() => profile.fullName || user?.fullName || "", [profile.fullName, user?.fullName]);
  const collaboratorEmail = useMemo(
    () => (profile.personalEmail || user?.email || "").toLowerCase(),
    [profile.personalEmail, user?.email]
  );

  const availableDocTypes = useMemo(() => {
    if (activeTab === "baixar_documentos") return [];
    return tabDocTypes[activeTab];
  }, [activeTab]);

  const requestsByActiveTab = useMemo(() => {
    if (activeTab === "baixar_documentos") return [];
    return documentRequests.filter((item) => item.docTab === normalizeTabForFilter(activeTab));
  }, [activeTab, documentRequests]);

  const looseDocumentsByActiveTab = useMemo(() => {
    if (activeTab === "baixar_documentos") return [];
    return documents.filter((item) => {
      if (item.docTab) return item.docTab === normalizeTabForFilter(activeTab);
      return item.category === normalizeTabForFilter(activeTab);
    });
  }, [activeTab, documents]);

  const requestsForDownload = useMemo(() => {
    return documentRequests.filter((item) => item.docTab !== "contracheques");
  }, [documentRequests]);

  async function loadData() {
    const [usersData, profileData, docsData, requestData, paysData] = await Promise.all([
      apiFetch<Paginated<TenantUser>>(`/v1/tenants/${tenantId}/users?page=1&pageSize=100`),
      apiFetch<EmployeeProfile | null>(`/v1/tenants/${tenantId}/employee-profile?targetUserId=${userId}`),
      apiFetch<Paginated<DocumentRecord>>(`/v1/tenants/${tenantId}/documents?page=1&pageSize=100&employeeUserId=${userId}`),
      apiFetch<Paginated<DocumentRequestRecord>>(
        `/v1/tenants/${tenantId}/document-requests?page=1&pageSize=100&employeeUserId=${userId}`
      ),
      apiFetch<Paginated<PayslipRecord>>(`/v1/tenants/${tenantId}/payslips?page=1&pageSize=50&employeeUserId=${userId}`)
    ]);

    const found = usersData.items.find((item) => item.userId === userId) ?? null;
    setUser(found);
    setDocuments(docsData.items);
    setDocumentRequests(requestData.items);
    setPayslips(paysData.items);

    const mergedFullName = profileData?.fullName ?? found?.fullName ?? "";
    const mergedEmail = profileData?.authEmail ?? profileData?.personalEmail ?? found?.email ?? "";
    const mergedCpf = profileData?.cpf ?? found?.cpf ?? "";
    const mergedPhone = profileData?.phone ?? found?.phone ?? "";

    setProfile({
      fullName: mergedFullName,
      personalEmail: mergedEmail,
      cpf: formatCpf(mergedCpf),
      phone: formatPhoneBr(mergedPhone),
      department: profileData?.department ?? "",
      positionTitle: profileData?.positionTitle ?? "",
      contractType: profileData?.contractType ?? "",
      admissionDate: profileData?.admissionDate ?? "",
      baseSalary: moneyFromNumber(profileData?.baseSalary),
      profileImagePath: profileData?.profileImagePath ?? "",
      employeeTags: profileData?.employeeTags ?? []
    });
    setAvatarLoadFailed(false);
  }

  useEffect(() => {
    loadData().catch((err: Error) => setError(err.message));
  }, [tenantId, userId]);

  function validateProfile(): string | null {
    if (profile.cpf.trim()) {
      if (onlyDigits(profile.cpf).length !== 11) return "CPF deve conter 11 dígitos.";
      if (!isValidCpf(profile.cpf)) return "CPF inválido.";
    }
    if (profile.phone.trim() && !isValidPhoneBr(profile.phone)) return "Telefone inválido.";
    return null;
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setOkMsg(null);

    const validation = validateProfile();
    if (validation) {
      setError(validation);
      return;
    }

    try {
      await apiFetch(`/v1/tenants/${tenantId}/employee-profile`, {
        method: "PUT",
        body: JSON.stringify({
          targetUserId: userId,
          fullName: profile.fullName || null,
          personalEmail: profile.personalEmail || null,
          cpf: onlyDigits(profile.cpf) || null,
          phone: onlyDigits(profile.phone) || null,
          department: profile.department || null,
          positionTitle: profile.positionTitle || null,
          contractType: profile.contractType || null,
          admissionDate: profile.admissionDate || null,
          baseSalary: currencyToNumber(profile.baseSalary),
          employeeTags: profile.employeeTags
        })
      });
      setOkMsg("Dados do colaborador atualizados.");
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    }
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

  async function onConfirmAvatarCrop(file: File) {
    setError(null);
    setOkMsg(null);

    try {
      const intent = await apiFetch<UploadIntent>(`/v1/tenants/${tenantId}/employee-profile/avatar/upload-intent`, {
        method: "POST",
        body: JSON.stringify({
          targetUserId: userId,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size
        })
      });

      const uploadResponse = await fetch(intent.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error(`Falha no upload da imagem (${uploadResponse.status}).`);
      }

      const saved = await apiFetch<EmployeeProfile>(`/v1/tenants/${tenantId}/employee-profile/avatar/confirm-upload`, {
        method: "POST",
        body: JSON.stringify({
          targetUserId: userId,
          fileName: file.name,
          filePath: intent.path,
          mimeType: file.type,
          sizeBytes: file.size
        })
      });

      setProfile((current) => ({
        ...current,
        profileImagePath: saved.profileImagePath ?? ""
      }));
      setAvatarLoadFailed(false);
      setAvatarSource(null);
      setOkMsg("Imagem de perfil atualizada com sucesso.");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function openDocModal() {
    if (activeTab === "baixar_documentos") return;
    setDocModalType(tabDocTypes[activeTab][0] ?? "");
    setDocModalDescription("");
    setDocModalFile(null);
    setDocModalError(null);
    setDocModalMode("request");
    setIsDocModalOpen(true);
  }

  async function submitDocumentModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeTab === "baixar_documentos") return;

    setDocModalError(null);
    const docType = docModalType.trim();
    if (!docType) {
      setDocModalError("Selecione o tipo do documento.");
      return;
    }

    if (!collaboratorName || !collaboratorEmail) {
      setDocModalError("Preencha nome e e-mail do colaborador antes de criar a solicitação.");
      return;
    }

    const shouldUploadFile = docModalMode === "direct" || docModalMode === "signature";
    if (shouldUploadFile && !docModalFile) {
      setDocModalError("Selecione o arquivo PDF.");
      return;
    }

    setSaving(true);
    setError(null);
    setOkMsg(null);

    try {
      let filePayload:
        | {
            filePath: string;
            fileName: string;
            mimeType: "application/pdf";
            sizeBytes: number;
          }
        | undefined;

      if (shouldUploadFile && docModalFile) {
        if (docModalFile.type !== "application/pdf") {
          throw new Error("Apenas PDF é permitido.");
        }
        const intent = await apiFetch<UploadIntent>(`/v1/tenants/${tenantId}/documents/upload-intent`, {
          method: "POST",
          body: JSON.stringify({
            fileName: docModalFile.name,
            mimeType: "application/pdf",
            sizeBytes: docModalFile.size
          })
        });

        const put = await fetch(intent.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/pdf" },
          body: docModalFile
        });
        if (!put.ok) throw new Error(`Falha no upload (${put.status})`);

        filePayload = {
          filePath: intent.path,
          fileName: docModalFile.name,
          mimeType: "application/pdf",
          sizeBytes: docModalFile.size
        };
      }

      await apiFetch(`/v1/tenants/${tenantId}/document-requests`, {
        method: "POST",
        body: JSON.stringify({
          collaboratorName,
          collaboratorEmail,
          contract: profile.contractType || null,
          docTab: activeTab,
          docType,
          description: docModalDescription.trim() || null,
          filePath: filePayload?.filePath ?? null,
          fileName: filePayload?.fileName ?? null,
          mimeType: filePayload?.mimeType ?? null,
          sizeBytes: filePayload?.sizeBytes ?? null,
          workflow: docModalMode === "signature" ? "signature" : "standard"
        })
      });

      setIsDocModalOpen(false);
      setOkMsg(
        docModalMode === "signature"
          ? "Documento enviado para assinatura do colaborador."
          : filePayload
            ? "Documento enviado com sucesso."
            : "Solicitação criada com sucesso."
      );
      await loadData();
    } catch (err) {
      const message = (err as Error).message || "Não foi possível concluir a ação.";
      setDocModalError(message);
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  function openReplyModal(request: DocumentRequestRecord) {
    setReplyRequest(request);
    setReplyDescription(request.description ?? "");
    setReplyFile(null);
    setIsReplyModalOpen(true);
  }

  async function submitRequestReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!replyRequest) return;
    if (!replyFile) {
      setError("Selecione o arquivo PDF para enviar a resposta.");
      return;
    }
    if (replyFile.type !== "application/pdf") {
      setError("Apenas PDF é permitido.");
      return;
    }

    setSaving(true);
    setError(null);
    setOkMsg(null);

    try {
      const intent = await apiFetch<UploadIntent>(
        `/v1/tenants/${tenantId}/document-requests/${replyRequest.id}/upload-intent`,
        {
          method: "POST",
          body: JSON.stringify({
            fileName: replyFile.name,
            mimeType: "application/pdf",
            sizeBytes: replyFile.size
          })
        }
      );

      const put = await fetch(intent.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: replyFile
      });
      if (!put.ok) throw new Error(`Falha no upload (${put.status})`);

      await apiFetch(`/v1/tenants/${tenantId}/document-requests/${replyRequest.id}/confirm-upload`, {
        method: "POST",
        body: JSON.stringify({
          filePath: intent.path,
          fileName: replyFile.name,
          mimeType: "application/pdf",
          sizeBytes: replyFile.size,
          description: replyDescription.trim() || null
        })
      });

      setIsReplyModalOpen(false);
      setReplyRequest(null);
      setOkMsg("Documento da solicitação enviado com sucesso.");
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadPayslip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payslipFile) {
      setError("Selecione um PDF para contracheque.");
      return;
    }
    if (!collaboratorName || !collaboratorEmail) {
      setError("Nome e e-mail do colaborador são obrigatórios para upload.");
      return;
    }

    setError(null);
    setOkMsg(null);
    try {
      const intent = await apiFetch<UploadIntent>(`/v1/tenants/${tenantId}/payslips/upload-intent`, {
        method: "POST",
        body: JSON.stringify({
          referenceMonth: payslipMonth,
          fileName: payslipFile.name,
          mimeType: payslipFile.type || "application/pdf",
          sizeBytes: payslipFile.size
        })
      });

      const put = await fetch(intent.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": payslipFile.type || "application/pdf" },
        body: payslipFile
      });
      if (!put.ok) throw new Error(`Falha no upload (${put.status})`);

      await apiFetch(`/v1/tenants/${tenantId}/payslips/confirm-upload`, {
        method: "POST",
        body: JSON.stringify({
          collaboratorName,
          collaboratorEmail,
          contract: profile.contractType || null,
          referenceMonth: payslipMonth,
          filePath: intent.path,
          fileName: payslipFile.name,
          mimeType: payslipFile.type || "application/pdf",
          sizeBytes: payslipFile.size
        })
      });

      setPayslipFile(null);
      setIsPayslipModalOpen(false);
      setOkMsg("Contracheque enviado e associado ao colaborador.");
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function openDocumentInNewTab(documentId: string) {
    setError(null);
    try {
      const result = await apiFetch<OpenFileUrl>(`/v1/tenants/${tenantId}/documents/${documentId}/open`);
      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function openPayslipInNewTab(payslipId: string) {
    setError(null);
    try {
      const result = await apiFetch<OpenFileUrl>(`/v1/tenants/${tenantId}/payslips/${payslipId}/open`);
      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function downloadSelectedDocuments() {
    const selected = requestsForDownload.filter(
      (item) => selectedRequestIds.includes(item.id) && item.latestDocument
    );
    if (selected.length === 0) {
      setError("Selecione ao menos um documento recebido para baixar.");
      return;
    }

    for (const request of selected) {
      const documentId = request.latestDocument?.id;
      if (!documentId) continue;
      // eslint-disable-next-line no-await-in-loop
      await openDocumentInNewTab(documentId);
    }
  }

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Visão Geral", href: `/tenants/${tenantId}/dashboard` },
          { label: "Colaboradores", href: `/tenants/${tenantId}/collaborator` },
          { label: "Detalhes" }
        ]}
      />

      <div className="section-header">
        <h1>Detalhes do colaborador</h1>
        <div className="row">
          {isEditing ? (
            <Link href={`/tenants/${tenantId}/time/rules/assign?targetUserId=${userId}`}>
              <button className="secondary">Vincular jornada</button>
            </Link>
          ) : null}
          <Link href={`/tenants/${tenantId}/collaborator`}>
            <button className="secondary">Voltar</button>
          </Link>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {okMsg ? <p>{okMsg}</p> : null}

      <div className="card stack">
        <h3>Dados do colaborador</h3>
        <form className="stack" onSubmit={saveProfile}>
          <div className="row" style={{ alignItems: "center" }}>
            {profile.profileImagePath && !avatarLoadFailed ? (
              <img
                className="avatar-preview"
                src={resolveAvatarUrl(profile.profileImagePath)}
                alt="Imagem de perfil"
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              <div className="avatar-preview" />
            )}
            <label style={{ margin: 0 }}>
              Foto de perfil
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={!isEditing}
                onChange={onSelectAvatar}
              />
            </label>
          </div>
          <div className="onboarding-profile-fields">
            <div className="onboarding-row-2-60-40">
              <label>
                Nome completo
                <input
                  value={profile.fullName}
                  disabled={!isEditing}
                  onChange={(e) => setProfile((c) => ({ ...c, fullName: e.target.value }))}
                />
              </label>
              <label>
                CPF
                <input
                  value={profile.cpf}
                  disabled={!isEditing}
                  onChange={(e) => setProfile((c) => ({ ...c, cpf: formatCpf(e.target.value) }))}
                />
              </label>
            </div>

            <div className="onboarding-row-2-40-60">
              <label>
                Telefone
                <input
                  value={profile.phone}
                  disabled={!isEditing}
                  onChange={(e) => setProfile((c) => ({ ...c, phone: formatPhoneBr(e.target.value) }))}
                />
              </label>
              <label>
                E-mail pessoal
                <input
                  type="email"
                  value={profile.personalEmail}
                  disabled={!isEditing}
                  onChange={(e) => setProfile((c) => ({ ...c, personalEmail: e.target.value }))}
                />
              </label>
            </div>

            <div className="onboarding-row-3-33-34-33">
              <label>
                Departamento
                <input
                  value={profile.department}
                  disabled={!isEditing}
                  onChange={(e) => setProfile((c) => ({ ...c, department: e.target.value }))}
                />
              </label>
              <label>
                Cargo
                <input
                  value={profile.positionTitle}
                  disabled={!isEditing}
                  onChange={(e) => setProfile((c) => ({ ...c, positionTitle: e.target.value }))}
                />
              </label>
              <label>
                Tipo de contrato
                <select
                  value={profile.contractType}
                  disabled={!isEditing}
                  onChange={(e) => setProfile((c) => ({ ...c, contractType: e.target.value }))}
                >
                  <option value="">Selecione</option>
                  {contractOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="onboarding-row-3-20-20-60">
              <label>
                Admissão
                <input
                  type="date"
                  value={profile.admissionDate}
                  disabled={!isEditing}
                  onChange={(e) => setProfile((c) => ({ ...c, admissionDate: e.target.value }))}
                />
              </label>
              <label>
                Salário base
                <input
                  value={profile.baseSalary}
                  placeholder="R$ 0,00"
                  disabled={!isEditing}
                  onChange={(e) => setProfile((c) => ({ ...c, baseSalary: formatCurrencyBr(e.target.value) }))}
                />
              </label>
              <label>
                Tags do colaborador
                {isEditing ? (
                  <SkillTagsInput
                    value={profile.employeeTags}
                    onChange={(next) => setProfile((c) => ({ ...c, employeeTags: next }))}
                    placeholder="Digite uma tag e pressione Enter"
                    allowCreate
                  />
                ) : (
                  <div className="tag-list">
                    {profile.employeeTags.length === 0 ? <span className="muted">Sem tags</span> : null}
                    {profile.employeeTags.map((tag) => (
                      <span key={tag} className="badge">{tag.replace(/-/g, " ")}</span>
                    ))}
                  </div>
                )}
              </label>
            </div>
          </div>
          {isEditing ? <button type="submit">Salvar alterações</button> : null}
        </form>
      </div>

      <div className="card stack">
        <div className="doc-tabs">
          {documentTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={tab.key === activeTab ? "doc-tab active" : "doc-tab"}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "baixar_documentos" ? (
          <div className="stack">
            <div className="section-header">
              <h3>Baixar documentos</h3>
              <div className="row">
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    setSelectedRequestIds(
                      requestsForDownload
                        .filter((item) => item.latestDocument)
                        .map((item) => item.id)
                    )
                  }
                >
                  Selecionar todos recebidos
                </button>
                <button type="button" onClick={downloadSelectedDocuments}>Baixar selecionados</button>
              </div>
            </div>

            {requestsForDownload.length === 0 ? (
              <EmptyState title="Sem solicitações" description="Ainda não há solicitações de documentos para este colaborador." />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 38 }}>#</th>
                      <th>Tipo</th>
                      <th>Descrição</th>
                      <th>Status</th>
                      <th>Arquivo</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requestsForDownload.map((request) => (
                      <tr key={request.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedRequestIds.includes(request.id)}
                            onChange={(event) => {
                              if (event.target.checked) {
                                setSelectedRequestIds((current) => [...new Set([...current, request.id])]);
                              } else {
                                setSelectedRequestIds((current) => current.filter((id) => id !== request.id));
                              }
                            }}
                          />
                        </td>
                        <td>{request.docType}</td>
                        <td>{request.description ?? "-"}</td>
                        <td>
                          <span className={isRequestResolved(request.status) ? "status-pill success" : "status-pill warning"}>
                            {requestStatusLabel(request)}
                          </span>
                        </td>
                        <td>
                          {request.latestDocument ? (
                            <button
                              type="button"
                              className="link-button"
                              onClick={() => openDocumentInNewTab(request.latestDocument!.id)}
                            >
                              {request.latestDocument.fileName}
                            </button>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>{new Date(request.requestedAt).toLocaleString("pt-BR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="stack">
            <div className="section-header">
              <h3>Documentos - {documentTabs.find((item) => item.key === activeTab)?.label}</h3>
              <button type="button" className="secondary" onClick={openDocModal}>
                + Adicionar documento
              </button>
            </div>

            {requestsByActiveTab.length === 0 && looseDocumentsByActiveTab.length === 0 ? (
              <EmptyState title="Sem documentos" description="Nenhuma solicitação ou documento nesta aba." />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Solicitação</th>
                      <th>Tipo</th>
                      <th>Descrição</th>
                      <th>Cadastro</th>
                      <th>Resposta</th>
                      <th>Status</th>
                      <th>Arquivo</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requestsByActiveTab.map((request) => (
                      <tr key={request.id}>
                        <td>{request.id.slice(0, 8)}</td>
                        <td>{request.docType}</td>
                        <td>{request.description ?? "-"}</td>
                        <td>{new Date(request.requestedAt).toLocaleString("pt-BR")}</td>
                        <td>{request.resolvedAt ? new Date(request.resolvedAt).toLocaleString("pt-BR") : "-"}</td>
                        <td>
                          <span className={isRequestResolved(request.status) ? "status-pill success" : "status-pill warning"}>
                            {requestStatusLabel(request)}
                          </span>
                        </td>
                        <td>
                          {request.latestDocument ? (
                            <button
                              type="button"
                              className="link-button"
                              onClick={() => openDocumentInNewTab(request.latestDocument!.id)}
                            >
                              {request.latestDocument.fileName}
                            </button>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>
                          {!isRequestResolved(request.status) ? (
                            request.workflow === "signature" ? (
                              <span className="muted">Aguardando colaborador</span>
                            ) : (
                              <button
                                type="button"
                                className="secondary"
                                onClick={() => openReplyModal(request)}
                              >
                                Enviar arquivo
                              </button>
                            )
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                    {looseDocumentsByActiveTab.map((doc) => (
                      <tr key={doc.id}>
                        <td>-</td>
                        <td>{doc.docType ?? doc.title}</td>
                        <td>{doc.description ?? "-"}</td>
                        <td>{new Date(doc.createdAt).toLocaleString("pt-BR")}</td>
                        <td>{new Date(doc.createdAt).toLocaleString("pt-BR")}</td>
                        <td>
                          <span className="status-pill success">Recebido</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="link-button"
                            onClick={() => openDocumentInNewTab(doc.id)}
                          >
                            {doc.fileName}
                          </button>
                        </td>
                        <td>-</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card table-wrap">
        <div className="section-header">
          <h3>Contracheques do colaborador</h3>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setPayslipMonth(new Date().toISOString().slice(0, 7));
              setPayslipFile(null);
              setIsPayslipModalOpen(true);
            }}
          >
            + Adicionar contracheque
          </button>
        </div>
        {payslips.length === 0 ? (
          <EmptyState title="Sem contracheques" description="Nenhum contracheque associado ao colaborador." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Mês</th>
                <th>Arquivo</th>
                <th>Ciência</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {payslips.map((pay) => (
                <tr key={pay.id}>
                  <td>{pay.referenceMonth}</td>
                  <td>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => openPayslipInNewTab(pay.id)}
                      title="Abrir contracheque em nova aba"
                    >
                      {pay.fileName}
                    </button>
                  </td>
                  <td>{pay.acknowledgedAt ? `Ciente em ${new Date(pay.acknowledgedAt).toLocaleDateString("pt-BR")}` : "Pendente"}</td>
                  <td>{new Date(pay.createdAt).toLocaleString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isDocModalOpen ? (
        <div className="modal-backdrop" onClick={() => setIsDocModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="section-header">
              <h3>Adicionar documento</h3>
              <button type="button" className="secondary" onClick={() => setIsDocModalOpen(false)}>
                Fechar
              </button>
            </div>

            {activeTab !== "baixar_documentos" && !tabsComAcaoAssinatura.includes(activeTab) ? (
              <label>
                Ação
                <select
                  value={docModalMode}
                  onChange={(e) => {
                    setDocModalMode(e.target.value as DocModalMode);
                    setDocModalFile(null);
                    setDocModalError(null);
                  }}
                >
                  <option value="request">Criar solicitação</option>
                  <option value="direct">Adicionar documento agora</option>
                </select>
              </label>
            ) : null}
            {activeTab !== "baixar_documentos" && tabsComAcaoAssinatura.includes(activeTab) ? (
              <label>
                Ação
                <select
                  value={docModalMode}
                  onChange={(e) => {
                    setDocModalMode(e.target.value as DocModalMode);
                    setDocModalFile(null);
                    setDocModalError(null);
                  }}
                >
                  <option value="request">Criar solicitação</option>
                  <option value="direct">Adicionar documento agora</option>
                  <option value="signature">Enviar documento para assinatura</option>
                </select>
              </label>
            ) : null}

            <form className="stack" onSubmit={submitDocumentModal}>
              {docModalError ? <p className="error">{docModalError}</p> : null}
              <label>
                Tipo do documento
                <select value={docModalType} onChange={(e) => setDocModalType(e.target.value)}>
                  {availableDocTypes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Descrição
                <textarea
                  value={docModalDescription}
                  onChange={(e) => setDocModalDescription(e.target.value)}
                />
              </label>

              {docModalMode === "direct" || docModalMode === "signature" ? (
                <label>
                  {docModalMode === "signature"
                    ? "Arquivo para o colaborador baixar e assinar (PDF)"
                    : "Arquivo (PDF) (obrigatório)"}
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setDocModalFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              ) : null}

              <button type="submit" disabled={saving}>
                {saving
                  ? "Salvando..."
                  : docModalMode === "direct"
                    ? "Adicionar documento"
                    : docModalMode === "signature"
                      ? "Enviar para assinatura"
                      : "Criar solicitação"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {isReplyModalOpen && replyRequest ? (
        <div className="modal-backdrop" onClick={() => setIsReplyModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="section-header">
              <h3>Responder solicitação</h3>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setIsReplyModalOpen(false);
                  setReplyRequest(null);
                }}
              >
                Fechar
              </button>
            </div>
            <form className="stack" onSubmit={submitRequestReply}>
              <p className="muted">Tipo: {replyRequest.docType}</p>
              <label>
                Descrição
                <textarea
                  value={replyDescription}
                  onChange={(e) => setReplyDescription(e.target.value)}
                />
              </label>
              <label>
                Arquivo (PDF)
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setReplyFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <button type="submit" disabled={saving}>
                {saving ? "Enviando..." : "Enviar documento"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {isPayslipModalOpen ? (
        <div className="modal-backdrop" onClick={() => setIsPayslipModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="section-header">
              <h3>Adicionar contracheque</h3>
              <button type="button" className="secondary" onClick={() => setIsPayslipModalOpen(false)}>
                Fechar
              </button>
            </div>
            <form className="stack" onSubmit={uploadPayslip}>
              <label>
                Mês de referência
                <input
                  value={payslipMonth}
                  onChange={(e) => setPayslipMonth(e.target.value)}
                  placeholder="Mês (YYYY-MM)"
                />
              </label>
              <label>
                Arquivo (PDF)
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPayslipFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <button type="submit">Enviar contracheque</button>
            </form>
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

