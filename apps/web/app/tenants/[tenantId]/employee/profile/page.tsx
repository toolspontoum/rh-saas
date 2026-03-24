"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { AvatarCropModal } from "../../../../../components/avatar-crop-modal";
import { Breadcrumbs } from "../../../../../components/breadcrumbs";
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

type EmployeeProfile = {
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
  employeeTags: string[];
  profileImageFileName: string | null;
  profileImagePath: string | null;
  profileImageMimeType: string | null;
  profileImageSizeBytes: number | null;
};

type UploadIntent = {
  path: string;
  signedUrl: string;
};

type FormState = {
  fullName: string;
  personalEmail: string;
  cpf: string;
  phone: string;
  department: string;
  positionTitle: string;
  contractType: string;
  admissionDate: string;
  baseSalary: string;
};

const contractOptions = ["CLT", "PJ", "Estágio", "Freelancer"];
const employeeAvatarBucket =
  process.env.NEXT_PUBLIC_STORAGE_BUCKET_EMPLOYEE_AVATARS ?? "employee-avatars";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function resolveAvatarUrl(path: string): string {
  const raw = path.trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.includes("/storage/v1/object/")) {
    if (raw.startsWith("/")) return `${supabaseUrl}${raw}`;
    return raw;
  }
  return `${supabaseUrl}/storage/v1/object/public/${employeeAvatarBucket}/${raw}`;
}

function moneyFromNumber(value: number | null | undefined): string {
  if (value == null) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function EmployeeProfilePage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;

  const [form, setForm] = useState<FormState>({
    fullName: "",
    personalEmail: "",
    cpf: "",
    phone: "",
    department: "",
    positionTitle: "",
    contractType: "",
    admissionDate: "",
    baseSalary: ""
  });
  const [profileImagePath, setProfileImagePath] = useState<string | null>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [authEmail, setAuthEmail] = useState<string>("");
  const [avatarSource, setAvatarSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<EmployeeProfile | null>(`/v1/tenants/${tenantId}/employee-profile`)
      .then((profile) => {
        if (!profile) return;
        setForm({
          fullName: profile.fullName ?? "",
          personalEmail: profile.authEmail ?? profile.personalEmail ?? "",
          cpf: formatCpf(profile.cpf ?? ""),
          phone: formatPhoneBr(profile.phone ?? ""),
          department: profile.department ?? "",
          positionTitle: profile.positionTitle ?? "",
          contractType: profile.contractType ?? "",
          admissionDate: profile.admissionDate ?? "",
          baseSalary: moneyFromNumber(profile.baseSalary)
        });
        setProfileImagePath(profile.profileImagePath ?? null);
        setAvatarLoadFailed(false);
        setAuthEmail(profile.authEmail ?? "");
      })
      .catch((err: Error) => setError(err.message));
  }, [tenantId]);

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
          fileName: file.name,
          filePath: intent.path,
          mimeType: file.type,
          sizeBytes: file.size
        })
      });

      setProfileImagePath(saved.profileImagePath ?? null);
      setAvatarLoadFailed(false);
      setAvatarSource(null);
      setOkMsg("Imagem de perfil atualizada com sucesso.");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setOkMsg(null);

    if (form.cpf.trim() && !isValidCpf(form.cpf)) {
      setError("CPF inválido.");
      return;
    }
    if (form.phone.trim() && !isValidPhoneBr(form.phone)) {
      setError("Telefone inválido.");
      return;
    }

    try {
      await apiFetch(`/v1/tenants/${tenantId}/employee-profile`, {
        method: "PUT",
        body: JSON.stringify({
          fullName: form.fullName || null,
          personalEmail: (authEmail || form.personalEmail || "").trim().toLowerCase() || null,
          cpf: onlyDigits(form.cpf) || null,
          phone: onlyDigits(form.phone) || null,
          department: form.department || null,
          positionTitle: form.positionTitle || null,
          contractType: form.contractType || null,
          admissionDate: form.admissionDate || null,
          baseSalary: currencyToNumber(form.baseSalary)
        })
      });
      setOkMsg("Perfil atualizado com sucesso.");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Visão Geral", href: `/tenants/${tenantId}/dashboard` },
          { label: "Meu perfil" }
        ]}
      />
      <h1>Meu perfil</h1>
      {error ? <p className="error">{error}</p> : null}
      {okMsg ? <p>{okMsg}</p> : null}

      <div className="card">
        <form className="stack" onSubmit={onSubmit}>
          <div className="row" style={{ alignItems: "center" }}>
            {profileImagePath && !avatarLoadFailed ? (
              <img
                className="avatar-preview"
                src={resolveAvatarUrl(profileImagePath)}
                alt="Imagem de perfil"
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              <div className="avatar-preview" />
            )}
            <label style={{ margin: 0 }}>
              Foto de perfil
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onSelectAvatar} />
            </label>
          </div>

          <div className="form-grid form-grid-2">
            <label>
              Nome completo
              <input value={form.fullName} onChange={(e) => setForm((c) => ({ ...c, fullName: e.target.value }))} />
            </label>
            <label>
              E-mail
              <input
                type="email"
                value={authEmail || form.personalEmail}
                readOnly
                title="E-mail da conta de login"
              />
            </label>
            <label>
              CPF
              <input value={form.cpf} onChange={(e) => setForm((c) => ({ ...c, cpf: formatCpf(e.target.value) }))} />
            </label>
            <label>
              Telefone
              <input value={form.phone} onChange={(e) => setForm((c) => ({ ...c, phone: formatPhoneBr(e.target.value) }))} />
            </label>
            <label>
              Departamento
              <input value={form.department} onChange={(e) => setForm((c) => ({ ...c, department: e.target.value }))} />
            </label>
            <label>
              Cargo
              <input value={form.positionTitle} onChange={(e) => setForm((c) => ({ ...c, positionTitle: e.target.value }))} />
            </label>
            <label>
              Tipo de contrato
              <select value={form.contractType} onChange={(e) => setForm((c) => ({ ...c, contractType: e.target.value }))}>
                <option value="">Selecione</option>
                {contractOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label>
              Admissão
              <input type="date" value={form.admissionDate} onChange={(e) => setForm((c) => ({ ...c, admissionDate: e.target.value }))} />
            </label>
            <label>
              Salário base
              <input value={form.baseSalary} onChange={(e) => setForm((c) => ({ ...c, baseSalary: formatCurrencyBr(e.target.value) }))} />
            </label>
          </div>
          <button type="submit">Salvar perfil</button>
        </form>
      </div>

      <AvatarCropModal
        open={Boolean(avatarSource)}
        imageSrc={avatarSource}
        onCancel={() => setAvatarSource(null)}
        onConfirm={onConfirmAvatarCrop}
      />
    </main>
  );
}
