"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { apiFetch } from "../../../../lib/api";
import { getToken, parseJwtPayload } from "../../../../lib/auth";
import { formatRoleList } from "../../../../lib/role-labels";

type Context = { roles: string[]; features: Array<{ code: string; isEnabled: boolean }> };
type Paginated<T> = { items: T[] };

type EmployeeProfile = {
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
};

type DocumentItem = {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  createdAt: string;
};

type TenantUser = {
  userId: string;
  fullName: string | null;
  email: string | null;
};

function initials(name: string | null | undefined): string {
  if (!name) return "--";
  return name
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function firstName(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return "visitante";
  return fullName.trim().split(/\s+/)[0] ?? "visitante";
}

export default function TenantDashboardPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;
  const [context, setContext] = useState<Context | null>(null);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selfUser, setSelfUser] = useState<TenantUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Context>(`/v1/tenants/${tenantId}/context`)
      .then(setContext)
      .catch((err: Error) => setError(err.message));
  }, [tenantId]);

  useEffect(() => {
    const payload = parseJwtPayload(getToken());
    const uid = payload?.sub;
    if (!uid) return;
    apiFetch<Paginated<TenantUser>>(`/v1/tenants/${tenantId}/users?page=1&pageSize=200`)
      .then((res) => {
        const me = res.items.find((u) => u.userId === uid) ?? null;
        setSelfUser(me);
      })
      .catch(() => setSelfUser(null));
  }, [tenantId]);

  const isEmployeeOnly = useMemo(() => {
    const roles = context?.roles ?? [];
    return roles.length > 0 && roles.every((role) => role === "employee");
  }, [context]);

  useEffect(() => {
    if (!isEmployeeOnly) return;
    Promise.all([
      apiFetch<EmployeeProfile | null>(`/v1/tenants/${tenantId}/employee-profile`),
      apiFetch<Paginated<DocumentItem>>(`/v1/tenants/${tenantId}/documents?mineOnly=true&page=1&pageSize=20`)
    ])
      .then(([profileData, docsData]) => {
        setProfile(profileData);
        setDocuments(docsData.items ?? []);
      })
      .catch((err: Error) => setError(err.message));
  }, [tenantId, isEmployeeOnly]);

  const welcomeName = useMemo(() => {
    return firstName(selfUser?.fullName ?? profile?.fullName ?? null);
  }, [selfUser, profile]);

  const roleLine = useMemo(() => formatRoleList(context?.roles ?? []), [context]);

  const features = useMemo(() => new Set((context?.features ?? []).filter((f) => f.isEnabled).map((f) => f.code)), [context]);

  const canPublishNotices = useMemo(
    () => (context?.roles ?? []).some((r) => ["owner", "admin", "manager"].includes(r)),
    [context]
  );

  const canManageOncall = useMemo(
    () => (context?.roles ?? []).some((r) => ["owner", "admin", "manager", "analyst"].includes(r)),
    [context]
  );

  if (isEmployeeOnly) {
    return (
      <main className="container wide stack" style={{ margin: 0 }}>
        <div className="section-header">
          <h1>Início</h1>
          <Link href={`/tenants/${tenantId}/employee/profile`}>
            <button>Atualizar perfil</button>
          </Link>
        </div>

        {error ? <p className="error">{error}</p> : null}

        <p className="muted" style={{ marginTop: 0 }}>
          Olá, {welcomeName}. Você está logado como {roleLine}.
        </p>

        <div className="card stack">
          <div className="row" style={{ alignItems: "center", gap: 16 }}>
            <div className="avatar-preview" style={{ display: "grid", placeItems: "center", fontWeight: 700 }}>
              {initials(profile?.fullName)}
            </div>
            <div className="stack" style={{ gap: 4 }}>
              <h3 style={{ margin: 0 }}>{profile?.fullName || "Colaborador"}</h3>
              <p className="muted" style={{ margin: 0 }}>
                {profile?.positionTitle || "Cargo não informado"}
              </p>
            </div>
          </div>

          <div className="form-grid form-grid-3">
            <div><strong>E-mail:</strong> {profile?.personalEmail || "-"}</div>
            <div><strong>CPF:</strong> {profile?.cpf || "-"}</div>
            <div><strong>Telefone:</strong> {profile?.phone || "-"}</div>
            <div><strong>Departamento:</strong> {profile?.department || "-"}</div>
            <div><strong>Contrato:</strong> {profile?.contractType || "-"}</div>
            <div><strong>Admissão:</strong> {profile?.admissionDate ? new Date(profile.admissionDate).toLocaleDateString("pt-BR") : "-"}</div>
          </div>

          <div className="tag-list">
            {(profile?.employeeTags ?? []).map((tag) => (
              <span key={tag} className="badge">{tag.replace(/-/g, " ")}</span>
            ))}
            {(profile?.employeeTags ?? []).length === 0 ? <span className="muted">Sem tags cadastradas</span> : null}
          </div>
        </div>

        <div className="card table-wrap">
          <div className="section-header">
            <h3>Documentos anexados</h3>
            <Link href={`/tenants/${tenantId}/employee/documents`}>
              <button className="secondary">Gerenciar documentos</button>
            </Link>
          </div>
          {documents.length === 0 ? (
            <p className="muted">Nenhum documento anexado ao seu perfil.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Descrição</th>
                  <th>Arquivo</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.title}</td>
                    <td>{doc.description || "-"}</td>
                    <td>{doc.fileName}</td>
                    <td>{new Date(doc.createdAt).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="dashboard-shortcuts-grid">
          <div className="card stack">
            <h3 style={{ margin: 0 }}>Registro de ponto</h3>
            <Link href={`/tenants/${tenantId}/time/register`}><button className="secondary">Abrir</button></Link>
          </div>
          <div className="card stack">
            <h3 style={{ margin: 0 }}>Contracheques</h3>
            <Link href={`/tenants/${tenantId}/payslips`}><button className="secondary">Abrir</button></Link>
          </div>
          <div className="card stack">
            <h3 style={{ margin: 0 }}>Comunicados</h3>
            <Link href={`/tenants/${tenantId}/notices`}><button className="secondary">Abrir</button></Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <h1>Início</h1>
      {error ? <p className="error">{error}</p> : null}

      <p className="muted" style={{ marginTop: 0 }}>
        Olá, {welcomeName}. Você está logado como {roleLine}.
      </p>

      <div className="dashboard-shortcuts-grid">
        {features.has("mod_recruitment") ? (
          <div className="card stack">
            <h3 style={{ margin: 0 }}>Vagas</h3>
            <div className="dashboard-card-actions row">
              <Link href={`/tenants/${tenantId}/recruitment/jobs`}><button className="secondary">Ver vagas</button></Link>
              <Link href={`/tenants/${tenantId}/recruitment/jobs/new`}><button>Adicionar vaga</button></Link>
            </div>
          </div>
        ) : null}

        {features.has("mod_recruitment") ? (
          <div className="card stack">
            <h3 style={{ margin: 0 }}>Candidatos</h3>
            <Link href={`/tenants/${tenantId}/recruitment/candidates`}><button className="secondary">Abrir lista</button></Link>
          </div>
        ) : null}

        {features.has("mod_documents") ? (
          <div className="card stack">
            <h3 style={{ margin: 0 }}>Colaboradores</h3>
            <Link href={`/tenants/${tenantId}/collaborator`}><button className="secondary">Abrir lista</button></Link>
          </div>
        ) : null}

        {features.has("mod_payslips") ? (
          <div className="card stack">
            <h3 style={{ margin: 0 }}>Contracheques</h3>
            <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
              <Link href={`/tenants/${tenantId}/payslips`}><button className="secondary">Abrir lista</button></Link>
              <Link href={`/tenants/${tenantId}/payslips/upload`}><button>Upload em lote</button></Link>
            </div>
          </div>
        ) : null}

        <div className="card stack">
          <h3 style={{ margin: 0 }}>Comunicados</h3>
          <div className="dashboard-card-actions row">
            <Link href={`/tenants/${tenantId}/notices`}><button className="secondary">Abrir comunicados</button></Link>
            {canPublishNotices ? (
              <Link href={`/tenants/${tenantId}/notices`}><button>Novo comunicado</button></Link>
            ) : null}
          </div>
        </div>

        <div className="card stack">
          <h3 style={{ margin: 0 }}>Ponto</h3>
          <div className="dashboard-card-actions row">
            <Link href={`/tenants/${tenantId}/time/register`}><button className="secondary">Registro de Ponto</button></Link>
            <Link href={`/tenants/${tenantId}/time/rules`}><button>Regras de Ponto</button></Link>
          </div>
        </div>

        <div className="card stack">
          <h3 style={{ margin: 0 }}>Sobreaviso</h3>
          <div className="dashboard-card-actions row">
            <Link href={`/tenants/${tenantId}/oncall`}><button className="secondary">Abrir lista</button></Link>
            {canManageOncall ? (
              <Link href={`/tenants/${tenantId}/oncall`}><button>Adicionar sobreaviso</button></Link>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
