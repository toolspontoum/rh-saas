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
  positionTitle: string | null;
  contractType: string | null;
};

export default function NewSpecificNoticePage() {
  const params = useParams<{ tenantId: string }>();
  const router = useRouter();
  const tenantId = params.tenantId;

  const [users, setUsers] = useState<TenantUser[]>([]);
  const [profiles, setProfiles] = useState<Record<string, EmployeeProfile>>({});
  const [title, setTitle] = useState("Comunicado RH");
  const [message, setMessage] = useState("<p>Novo comunicado interno.</p>");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientPositionFilter, setRecipientPositionFilter] = useState("all");
  const [recipientContractFilter, setRecipientContractFilter] = useState("all");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Paginated<TenantUser>>(`/v1/tenants/${tenantId}/users?page=1&pageSize=100`)
      .then(async (usersRes: Paginated<TenantUser>) => {
        const employeeUsers = usersRes.items.filter((item: TenantUser) => item.roles.includes("employee"));
        setUsers(employeeUsers);
        const profilePairs = await Promise.all(
          employeeUsers.map(async (item: TenantUser) => {
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
        for (const [userId, profile] of profilePairs) if (profile) profileMap[userId] = profile;
        setProfiles(profileMap);
      })
      .catch((err: Error) => setError(err.message));
  }, [tenantId]);

  const positionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          users
            .map((item) => profiles[item.userId]?.positionTitle?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [users, profiles]
  );

  const contractOptions = useMemo(
    () =>
      Array.from(
        new Set(
          users
            .map((item) => profiles[item.userId]?.contractType?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [users, profiles]
  );

  const filteredRecipients = useMemo(() => {
    return users.filter((item) => {
      const profile = profiles[item.userId];
      const fullText = `${item.fullName ?? ""} ${item.email ?? ""} ${profile?.positionTitle ?? ""} ${profile?.contractType ?? ""}`;
      if (recipientSearch.trim() && !fullText.toLowerCase().includes(recipientSearch.toLowerCase())) return false;
      if (recipientPositionFilter !== "all" && (profile?.positionTitle ?? "") !== recipientPositionFilter) return false;
      if (recipientContractFilter !== "all" && (profile?.contractType ?? "") !== recipientContractFilter) return false;
      return true;
    });
  }, [users, profiles, recipientSearch, recipientPositionFilter, recipientContractFilter]);

  const allFilteredSelected =
    filteredRecipients.length > 0 && filteredRecipients.every((item) => selectedRecipients.includes(item.userId));

  function toggleRecipient(userId: string) {
    setSelectedRecipients((current) =>
      current.includes(userId) ? current.filter((item) => item !== userId) : [...current, userId]
    );
  }

  function toggleAllFilteredRecipients() {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredRecipients.map((item) => item.userId));
      setSelectedRecipients((current) => current.filter((id) => !filteredIds.has(id)));
      return;
    }
    setSelectedRecipients((current) => {
      const next = new Set(current);
      filteredRecipients.forEach((item) => next.add(item.userId));
      return Array.from(next);
    });
  }

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
    if (selectedRecipients.length === 0) {
      setError("Selecione ao menos um destinatário.");
      return;
    }
    try {
      const attachments = await uploadNoticeAttachments();
      await apiFetch(`/v1/tenants/${tenantId}/notices`, {
        method: "POST",
        body: JSON.stringify({
          title,
          message,
          target: "employee",
          recipientUserIds: selectedRecipients,
          attachments
        })
      });
      setPendingAttachments([]);
      router.push(`/tenants/${tenantId}/notices?created=specific`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="container stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Início", href: `/tenants/${tenantId}/dashboard` },
          { label: "Comunicados", href: `/tenants/${tenantId}/notices` },
          { label: "Novo comunicado específico" }
        ]}
      />
      <h1>Novo comunicado específico</h1>
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
              <label htmlFor="notice-specific-attachments">Anexos (opcional)</label>
              <input
                id="notice-specific-attachments"
                type="file"
                multiple
                onChange={onAddAttachmentFiles}
              />
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
          <div className="card stack">
            <h4>Destinatários específicos</h4>
            <p className="muted">Filtre por cargo, contrato e selecione colaboradores em massa ou individualmente.</p>
            <div className="row">
              <input
                placeholder="Buscar colaborador por nome ou e-mail"
                value={recipientSearch}
                onChange={(event) => setRecipientSearch(event.target.value)}
              />
              <select value={recipientPositionFilter} onChange={(event) => setRecipientPositionFilter(event.target.value)}>
                <option value="all">Cargo (todos)</option>
                {positionOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={recipientContractFilter} onChange={(event) => setRecipientContractFilter(event.target.value)}>
                <option value="all">Contrato (todos)</option>
                {contractOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="row">
              <button type="button" className="secondary" onClick={toggleAllFilteredRecipients}>
                {allFilteredSelected ? "Desmarcar filtrados" : "Selecionar filtrados"}
              </button>
              <button type="button" className="secondary" onClick={() => setSelectedRecipients([])}>
                Limpar seleção
              </button>
              <span className="muted">Selecionados: {selectedRecipients.length}</span>
            </div>
            <div style={{ maxHeight: 240, overflow: "auto", border: "1px solid var(--line)", borderRadius: 12, padding: 8 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input type="checkbox" checked={allFilteredSelected} onChange={toggleAllFilteredRecipients} />
                    </th>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Cargo</th>
                    <th>Contrato</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecipients.map((item) => {
                    const profile = profiles[item.userId];
                    const checked = selectedRecipients.includes(item.userId);
                    return (
                      <tr key={item.userId}>
                        <td><input type="checkbox" checked={checked} onChange={() => toggleRecipient(item.userId)} /></td>
                        <td>{item.fullName ?? "-"}</td>
                        <td>{item.email ?? "-"}</td>
                        <td>{profile?.positionTitle ?? "-"}</td>
                        <td>{profile?.contractType ?? "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Link href={`/tenants/${tenantId}/notices`}><button type="button" className="secondary">Cancelar</button></Link>
            <button type="submit" disabled={uploading}>{uploading ? "Enviando..." : "Publicar"}</button>
          </div>
        </form>
      </div>
    </main>
  );
}
