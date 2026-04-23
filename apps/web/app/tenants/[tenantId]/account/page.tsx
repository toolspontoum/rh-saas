"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { Breadcrumbs } from "../../../../components/breadcrumbs";
import { apiFetch } from "../../../../lib/api";
import { setToken } from "../../../../lib/auth";
import {
  analyzePassword,
  PASSWORD_MIN_LENGTH,
  passwordMeetsPolicy,
  passwordPolicyHint
} from "../../../../lib/password-policy";
import { formatRoleList } from "../../../../lib/role-labels";
import { supabase } from "../../../../lib/supabase";

type TenantContext = {
  roles: string[];
};

type EmployeeProfile = {
  authEmail: string | null;
  fullName: string | null;
  personalEmail: string | null;
  cpf: string | null;
  phone: string | null;
  department: string | null;
  positionTitle: string | null;
};

function mapAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "Senha atual incorreta.";
  }
  return message;
}

export default function TenantAccountPage() {
  const router = useRouter();
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;

  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [authUserId, setAuthUserId] = useState<string>("");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [accountNotice, setAccountNotice] = useState<string | null>(null);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdModalError, setPwdModalError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const [ctx, prof, userRes] = await Promise.all([
          apiFetch<TenantContext>(`/v1/tenants/${tenantId}/context`),
          apiFetch<EmployeeProfile | null>(`/v1/tenants/${tenantId}/employee-profile`).catch(() => null),
          supabase.auth.getUser()
        ]);
        if (cancelled) return;
        const management = ctx.roles.some((r) => ["owner", "admin", "manager", "preposto"].includes(r));
        if (!management) {
          router.replace(`/tenants/${tenantId}/dashboard`);
          return;
        }
        setRoles(ctx.roles);
        setProfile(prof);
        const u = userRes.data.user;
        setAuthUserId(u?.id ?? "");
        setAuthEmail((u?.email ?? "").trim());
        setCreatedAt(u?.created_at ?? null);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Falha ao carregar dados.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [tenantId, router]);

  const closePasswordModal = useCallback(() => {
    setPasswordModalOpen(false);
    setPwdModalError(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }, []);

  const openPasswordModal = useCallback(() => {
    setPwdModalError(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordModalOpen(true);
  }, []);

  useEffect(() => {
    if (!passwordModalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closePasswordModal();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [passwordModalOpen, closePasswordModal]);

  useEffect(() => {
    if (!accountNotice) return;
    const t = window.setTimeout(() => setAccountNotice(null), 5000);
    return () => window.clearTimeout(t);
  }, [accountNotice]);

  const passwordAnalysis = useMemo(() => analyzePassword(newPassword), [newPassword]);

  const passwordFormValid =
    passwordMeetsPolicy(newPassword) &&
    newPassword === confirmPassword &&
    confirmPassword.length > 0 &&
    currentPassword.length > 0;

  async function onChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPwdModalError(null);

    const hint = passwordPolicyHint(newPassword);
    if (hint) {
      setPwdModalError(hint);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdModalError("A nova senha e a confirmação não conferem.");
      return;
    }

    const email = authEmail.trim().toLowerCase();
    if (!email) {
      setPwdModalError("Não foi possível identificar o e-mail da sessão.");
      return;
    }

    setPwdBusy(true);
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword
      });
      if (signErr) {
        setPwdModalError(mapAuthError(signErr.message));
        return;
      }

      const { data, error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) {
        setPwdModalError(updateErr.message);
        return;
      }

      const token = data.session?.access_token;
      if (token) setToken(token);
      else {
        const { data: sessionData } = await supabase.auth.getSession();
        const next = sessionData.session?.access_token;
        if (next) setToken(next);
      }

      closePasswordModal();
      setAccountNotice("Senha alterada com sucesso.");
    } catch (err) {
      setPwdModalError(err instanceof Error ? err.message : "Falha ao alterar senha.");
    } finally {
      setPwdBusy(false);
    }
  }

  const createdLabel =
    createdAt != null
      ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(new Date(createdAt))
      : null;

  if (loading) {
    return (
      <main className="container wide stack" style={{ margin: 0 }}>
        <p className="muted">Carregando…</p>
      </main>
    );
  }

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Visão Geral", href: `/tenants/${tenantId}/dashboard` },
          { label: "Backoffice" },
          { label: "Minha conta" }
        ]}
      />

      <div className="section-header">
        <h1>Minha conta</h1>
        <Link className="btn secondary" href={`/tenants/${tenantId}/dashboard`}>
          Voltar
        </Link>
      </div>

      {loadError ? <p className="error">{loadError}</p> : null}
      {accountNotice ? <p style={{ margin: 0 }}>{accountNotice}</p> : null}

      <div className="card stack" style={{ maxWidth: 640 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Dados do cadastro</h2>
          <button type="button" className="btn" onClick={openPasswordModal}>
            Alterar senha
          </button>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Informações da sua conta de acesso neste projeto.
        </p>
        <dl className="stack" style={{ margin: 0, gap: 10 }}>
          <div>
            <dt className="muted small" style={{ margin: 0 }}>
              E-mail de login
            </dt>
            <dd style={{ margin: "4px 0 0" }}>{authEmail || "—"}</dd>
          </div>
          {profile?.fullName ? (
            <div>
              <dt className="muted small" style={{ margin: 0 }}>
                Nome
              </dt>
              <dd style={{ margin: "4px 0 0" }}>{profile.fullName}</dd>
            </div>
          ) : null}
          {profile?.personalEmail && profile.personalEmail.toLowerCase() !== authEmail.toLowerCase() ? (
            <div>
              <dt className="muted small" style={{ margin: 0 }}>
                E-mail pessoal (cadastro RH)
              </dt>
              <dd style={{ margin: "4px 0 0" }}>{profile.personalEmail}</dd>
            </div>
          ) : null}
          {profile?.phone ? (
            <div>
              <dt className="muted small" style={{ margin: 0 }}>
                Telefone
              </dt>
              <dd style={{ margin: "4px 0 0" }}>{profile.phone}</dd>
            </div>
          ) : null}
          {profile?.cpf ? (
            <div>
              <dt className="muted small" style={{ margin: 0 }}>
                CPF
              </dt>
              <dd style={{ margin: "4px 0 0" }}>{profile.cpf}</dd>
            </div>
          ) : null}
          {profile?.department ? (
            <div>
              <dt className="muted small" style={{ margin: 0 }}>
                Departamento
              </dt>
              <dd style={{ margin: "4px 0 0" }}>{profile.department}</dd>
            </div>
          ) : null}
          {profile?.positionTitle ? (
            <div>
              <dt className="muted small" style={{ margin: 0 }}>
                Cargo
              </dt>
              <dd style={{ margin: "4px 0 0" }}>{profile.positionTitle}</dd>
            </div>
          ) : null}
          <div>
            <dt className="muted small" style={{ margin: 0 }}>
              Perfis neste projeto
            </dt>
            <dd style={{ margin: "4px 0 0" }}>{roles.length ? formatRoleList(roles) : "—"}</dd>
          </div>
          {authUserId ? (
            <div>
              <dt className="muted small" style={{ margin: 0 }}>
                ID do usuário
              </dt>
              <dd className="tenant-id" style={{ margin: "4px 0 0", fontSize: 12 }}>
                {authUserId}
              </dd>
            </div>
          ) : null}
          {createdLabel ? (
            <div>
              <dt className="muted small" style={{ margin: 0 }}>
                Conta criada em
              </dt>
              <dd style={{ margin: "4px 0 0" }}>{createdLabel}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {passwordModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={closePasswordModal}>
          <div
            className="modal-card modal-card--account"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-password-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="account-password-modal-title" style={{ margin: 0 }}>
              Alterar senha
            </h3>
            <p className="muted" style={{ margin: 0 }}>
              Informe a senha atual e escolha uma nova senha. Ela deve ter pelo menos {PASSWORD_MIN_LENGTH} caracteres, incluindo
              maiúscula, minúscula, número e caractere especial.
            </p>

            <form className="stack" onSubmit={onChangePassword}>
              <label>
                Senha atual
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>
              <label>
                Nova senha
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={PASSWORD_MIN_LENGTH}
                  required
                />
              </label>

              {newPassword.length > 0 ? (
                <div className="stack" style={{ gap: 8 }}>
                  <div className="row" style={{ alignItems: "center", gap: 10 }}>
                    <span className="muted small" style={{ whiteSpace: "nowrap" }}>
                      Força:
                    </span>
                    <div
                      role="progressbar"
                      aria-valuenow={passwordAnalysis.metCount}
                      aria-valuemin={0}
                      aria-valuemax={5}
                      style={{
                        flex: 1,
                        display: "grid",
                        gridTemplateColumns: "repeat(5, 1fr)",
                        gap: 4,
                        height: 8,
                        minWidth: 120
                      }}
                    >
                      {[0, 1, 2, 3, 4].map((i) => {
                        const filled = i < passwordAnalysis.metCount;
                        const color =
                          passwordAnalysis.strength === "forte"
                            ? "#1e7e34"
                            : passwordAnalysis.strength === "media"
                              ? "#c9a227"
                              : "#c0392b";
                        return (
                          <span
                            key={i}
                            style={{
                              borderRadius: 2,
                              background: filled ? color : "var(--border)",
                              opacity: filled ? 1 : 0.45
                            }}
                          />
                        );
                      })}
                    </div>
                    <span
                      className="small"
                      style={{
                        fontWeight: 600,
                        color:
                          passwordAnalysis.strength === "forte"
                            ? "#1e7e34"
                            : passwordAnalysis.strength === "media"
                              ? "#9a7b0a"
                              : "var(--danger)",
                        minWidth: 56,
                        textTransform: "capitalize"
                      }}
                    >
                      {passwordAnalysis.strength === "fraca"
                        ? "Fraca"
                        : passwordAnalysis.strength === "media"
                          ? "Média"
                          : "Forte"}
                    </span>
                  </div>
                  <ul className="muted small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
                    <li style={{ color: passwordAnalysis.rules.minLength ? "var(--text)" : undefined }}>
                      {passwordAnalysis.rules.minLength ? "✓" : "○"} Mínimo de {PASSWORD_MIN_LENGTH} caracteres
                    </li>
                    <li style={{ color: passwordAnalysis.rules.lowercase ? "var(--text)" : undefined }}>
                      {passwordAnalysis.rules.lowercase ? "✓" : "○"} Uma letra minúscula
                    </li>
                    <li style={{ color: passwordAnalysis.rules.uppercase ? "var(--text)" : undefined }}>
                      {passwordAnalysis.rules.uppercase ? "✓" : "○"} Uma letra maiúscula
                    </li>
                    <li style={{ color: passwordAnalysis.rules.digit ? "var(--text)" : undefined }}>
                      {passwordAnalysis.rules.digit ? "✓" : "○"} Um número
                    </li>
                    <li style={{ color: passwordAnalysis.rules.special ? "var(--text)" : undefined }}>
                      {passwordAnalysis.rules.special ? "✓" : "○"} Um caractere especial (ex.: !@#$%)
                    </li>
                  </ul>
                </div>
              ) : null}

              <label>
                Confirmar nova senha
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={PASSWORD_MIN_LENGTH}
                  required
                />
              </label>
              {pwdModalError ? <p className="error" style={{ margin: 0 }}>{pwdModalError}</p> : null}
              <div className="row" style={{ justifyContent: "flex-end", flexWrap: "wrap", gap: 8 }}>
                <button type="button" className="secondary" disabled={pwdBusy} onClick={closePasswordModal}>
                  Cancelar
                </button>
                <button type="submit" disabled={pwdBusy || !passwordFormValid}>
                  {pwdBusy ? "Salvando…" : "Salvar nova senha"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
