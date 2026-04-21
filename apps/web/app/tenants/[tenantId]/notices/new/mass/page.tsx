"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { Breadcrumbs } from "../../../../../../components/breadcrumbs";
import { RichTextEditor } from "../../../../../../components/rich-text-editor";
import { apiFetch } from "../../../../../../lib/api";

type UploadIntent = { path: string; signedUrl: string };
type PendingAttachment = { tempId: string; file: File };
type Paginated<T> = { items: T[] };
type TenantUser = {
  userId: string;
  email: string | null;
  fullName: string | null;
  roles: string[];
};
type EmployeeProfile = {
  userId: string;
  department: string | null;
  positionTitle: string | null;
  contractType: string | null;
};

export default function NewMassNoticePage() {
  const params = useParams<{ tenantId: string }>();
  const router = useRouter();
  const tenantId = params.tenantId;

  const [title, setTitle] = useState("Comunicado RH");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<"all" | "employee" | "manager">("all");
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [profiles, setProfiles] = useState<Record<string, EmployeeProfile>>({});
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [contractFilter, setContractFilter] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Paginated<TenantUser>>(`/v1/tenants/${tenantId}/users?page=1&pageSize=100`)
      .then(async (usersRes) => {
        const employeeUsers = usersRes.items.filter((item) => item.roles.includes("employee"));
        setUsers(employeeUsers);
        const profilePairs = await Promise.all(
          employeeUsers.map(async (item) => {
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
        const profileMap: Record<string, EmployeeProfile> = {};
        for (const [userId, profile] of profilePairs) {
          if (profile) profileMap[userId] = profile;
        }
        setProfiles(profileMap);
      })
      .catch((err: Error) => setError(err.message));
  }, [tenantId]);

  const filteredByDepartment = useMemo(() => {
    if (!departmentFilter.trim()) return users;
    const needle = departmentFilter.trim().toLowerCase();
    return users.filter((user) => (profiles[user.userId]?.department ?? "").toLowerCase() === needle);
  }, [users, profiles, departmentFilter]);

  const filteredByPosition = useMemo(() => {
    if (!positionFilter.trim()) return filteredByDepartment;
    const needle = positionFilter.trim().toLowerCase();
    return filteredByDepartment.filter((user) => (profiles[user.userId]?.positionTitle ?? "").toLowerCase() === needle);
  }, [filteredByDepartment, profiles, positionFilter]);

  const filteredByContract = useMemo(() => {
    if (!contractFilter.trim()) return filteredByPosition;
    const needle = contractFilter.trim().toLowerCase();
    return filteredByPosition.filter((user) => (profiles[user.userId]?.contractType ?? "").toLowerCase() === needle);
  }, [filteredByPosition, profiles, contractFilter]);

  const departments = useMemo(() => {
    return Array.from(
      new Set(
        users
          .map((item) => profiles[item.userId]?.department?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [users, profiles]);

  const positions = useMemo(() => {
    return Array.from(
      new Set(
        filteredByDepartment
          .map((item) => profiles[item.userId]?.positionTitle?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [filteredByDepartment, profiles]);

  const contracts = useMemo(() => {
    return Array.from(
      new Set(
        filteredByPosition
          .map((item) => profiles[item.userId]?.contractType?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [filteredByPosition, profiles]);

  async function uploadNoticeAttachments(): Promise<
    Array<{ fileName: string; filePath: string; mimeType: string; sizeBytes: number }>
  > {
    if (pendingAttachments.length === 0) return [];
    setUploading(true);
    try {
      const results: Array<{ fileName: string; filePath: string; mimeType: string; sizeBytes: number }> = [];
      for (const item of pendingAttachments) {
        const intent = await apiFetch<UploadIntent>(`/v1/tenants/${tenantId}/notices/upload-intent`, {
          method: "POST",
          body: JSON.stringify({
            fileName: item.file.name,
            mimeType: item.file.type || "application/octet-stream",
            sizeBytes: item.file.size
          })
        });
        const uploadResponse = await fetch(intent.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": item.file.type || "application/octet-stream" },
          body: item.file
        });
        if (!uploadResponse.ok) throw new Error("Falha ao enviar anexo para o storage.");
        results.push({
          fileName: item.file.name,
          filePath: intent.path,
          mimeType: item.file.type || "application/octet-stream",
          sizeBytes: item.file.size
        });
      }
      return results;
    } finally {
      setUploading(false);
    }
  }

  function onAddAttachmentFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.currentTarget.value = "";
    if (files.length === 0) return;
    setPendingAttachments((current) => [...current, ...files.map((file) => ({ tempId: crypto.randomUUID(), file }))]);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const recipientUserIds = target === "employee" ? filteredByContract.map((item) => item.userId) : [];
      const attachments = await uploadNoticeAttachments();
      await apiFetch(`/v1/tenants/${tenantId}/notices`, {
        method: "POST",
        body: JSON.stringify({ title, message, target, recipientUserIds, attachments })
      });
      setPendingAttachments([]);
      router.push(`/tenants/${tenantId}/notices?created=mass`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Início", href: `/tenants/${tenantId}/dashboard` },
          { label: "Comunicados", href: `/tenants/${tenantId}/notices` },
          { label: "Novo comunicado em massa" }
        ]}
      />
      <h1>Novo comunicado em massa</h1>
      {error ? <p className="error">{error}</p> : null}

      <div className="card stack">
        <form className="stack" onSubmit={onSubmit}>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Título do comunicado" />
          <div className="notice-editor-section">
            <RichTextEditor
              className="notice-body-editor"
              value={message}
              onChange={setMessage}
              placeholder="Escreva o comunicado"
            />
            <div className="notice-attachments-field stack">
              <label htmlFor="notice-mass-attachments">Anexos (opcional)</label>
              <input id="notice-mass-attachments" type="file" multiple onChange={onAddAttachmentFiles} />
              {pendingAttachments.length > 0 ? (
                <div className="card stack" style={{ marginTop: 4 }}>
                  <strong style={{ fontSize: 14 }}>Arquivos selecionados</strong>
                  {pendingAttachments.map((item) => (
                    <div key={item.tempId} className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                      <span>{item.file.name}</span>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setPendingAttachments((current) => current.filter((x) => x.tempId !== item.tempId))}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <select value={target} onChange={(event) => setTarget(event.target.value as typeof target)}>
            <option value="all">Todos</option>
            <option value="employee">Colaboradores</option>
            <option value="manager">Gestores</option>
          </select>
          {target === "employee" ? (
            <div className="stack">
              <p className="muted" style={{ margin: 0 }}>
                Envio hierárquico para colaboradores: Departamento, Cargo e/ou Tipo de contrato.
              </p>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "minmax(0, 33fr) minmax(0, 34fr) minmax(0, 33fr)" }}>
                <label>
                  Departamento
                  <input
                    list="mass-department-options"
                    placeholder="Departamento"
                    value={departmentFilter}
                    onChange={(event) => {
                      setDepartmentFilter(event.target.value);
                      setPositionFilter("");
                      setContractFilter("");
                    }}
                  />
                  <datalist id="mass-department-options">
                    {departments.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </label>
                <label>
                  Cargo
                  <input
                    list="mass-position-options"
                    placeholder="Cargo"
                    value={positionFilter}
                    onChange={(event) => {
                      setPositionFilter(event.target.value);
                      setContractFilter("");
                    }}
                  />
                  <datalist id="mass-position-options">
                    {positions.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </label>
                <label>
                  Tipo de contrato
                  <input
                    list="mass-contract-options"
                    placeholder="Tipo de contrato"
                    value={contractFilter}
                    onChange={(event) => setContractFilter(event.target.value)}
                  />
                  <datalist id="mass-contract-options">
                    {contracts.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </label>
              </div>
              <p className="muted" style={{ margin: 0 }}>
                Colaboradores no envio: {filteredByContract.length}
              </p>
            </div>
          ) : null}
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Link href={`/tenants/${tenantId}/notices`}><button type="button" className="secondary">Cancelar</button></Link>
            <button type="submit" disabled={uploading}>{uploading ? "Enviando..." : "Publicar"}</button>
          </div>
        </form>
      </div>
    </main>
  );
}
