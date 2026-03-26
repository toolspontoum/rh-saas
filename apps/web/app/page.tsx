"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { apiFetch } from "../lib/api";
import { setToken } from "../lib/auth";
import { getPublicWebUrl } from "../lib/public-web-url";
import { supabase } from "../lib/supabase";

type TenantSummary = {
  tenantId: string;
  roles: string[];
};

function isManagementRole(role: string): boolean {
  return ["owner", "admin", "manager", "analyst", "viewer"].includes(role);
}

const REMEMBER_EMAIL_KEY = "vv_remember_email";

function mapLoginError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("email not confirmed")) {
    return "E-mail não confirmado. Confirme seu cadastro para entrar.";
  }
  if (normalized.includes("email rate limit exceeded") || normalized.includes("rate limit")) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos para reenviar o link.";
  }
  if (normalized.includes("invalid login credentials")) {
    return "E-mail ou senha inválidos.";
  }
  return message;
}

function mapHashAuthError(errorCode: string | null, description: string | null): string | null {
  if (!errorCode && !description) return null;
  const normalizedCode = (errorCode ?? "").toLowerCase();
  const normalizedDescription = decodeURIComponent(description ?? "").toLowerCase();

  if (normalizedCode.includes("otp_expired")) {
    return "O link de confirmação expirou. Solicite um novo link para confirmar seu e-mail.";
  }

  if (normalizedCode.includes("access_denied") || normalizedDescription.includes("invalid") || normalizedDescription.includes("expired")) {
    return "Não foi possível validar o link de confirmação. Solicite um novo link e tente novamente.";
  }

  if (normalizedDescription) {
    return normalizedDescription;
  }

  return "Falha na confirmação do e-mail.";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(REMEMBER_EMAIL_KEY) ?? "";
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberAccess, setRememberAccess] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.localStorage.getItem(REMEMBER_EMAIL_KEY));
  });
  const [loading, setLoading] = useState(false);
  const [recoveringPassword, setRecoveringPassword] = useState(false);
  const [resendingConfirm, setResendingConfirm] = useState(false);
  const [recoverMsg, setRecoverMsg] = useState<string | null>(null);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allowResendConfirm, setAllowResendConfirm] = useState(false);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash) return;

    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const hashError = mapHashAuthError(params.get("error_code"), params.get("error_description"));

    if (hashError) {
      setError(hashError);
      setAllowResendConfirm(true);
    }

    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setRecoverMsg(null);
    setConfirmMsg(null);
    setAllowResendConfirm(false);
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setLoading(false);

    if (authError || !data.session?.access_token) {
      const mappedError = mapLoginError(authError?.message ?? "Falha no login.");
      setError(mappedError);
      if (mappedError.toLowerCase().includes("não confirmado")) {
        setAllowResendConfirm(true);
      }
      return;
    }

    if (rememberAccess) {
      window.localStorage.setItem(REMEMBER_EMAIL_KEY, normalizedEmail);
    } else {
      window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }

    setToken(data.session.access_token);
    try {
      const platform = await apiFetch<{ isPlatformAdmin: boolean }>("/v1/platform/me");
      if (platform.isPlatformAdmin) {
        router.push("/superadmin");
        return;
      }

      const tenants = await apiFetch<TenantSummary[]>("/v1/me/tenants");
      if (tenants.length === 0) {
        router.push("/candidate");
        return;
      }

      if (tenants.length > 1) {
        router.push("/tenants");
        return;
      }

      const tenant = tenants[0];
      if (!tenant) {
        router.push("/candidate");
        return;
      }

      if (tenant.roles.some((role) => isManagementRole(role))) {
        router.push(`/tenants/${tenant.tenantId}/dashboard`);
        return;
      }

      if (tenant.roles.includes("employee")) {
        router.push(`/tenants/${tenant.tenantId}/dashboard`);
        return;
      }

      router.push("/tenants");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onRecoverPassword() {
    setRecoverMsg(null);
    setConfirmMsg(null);
    setError(null);

    if (!normalizedEmail) {
      setError("Informe o e-mail para recuperar a senha.");
      return;
    }

    setRecoveringPassword(true);
    const redirectTo = `${getPublicWebUrl()}/reset-password`;

    const { error: recoverError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo
    });
    setRecoveringPassword(false);

    if (recoverError) {
      setError(recoverError.message);
      return;
    }

    setRecoverMsg("Enviamos as instruções de recuperação para seu e-mail.");
  }

  async function onResendConfirmLink() {
    setRecoverMsg(null);
    setConfirmMsg(null);
    setError(null);

    if (!normalizedEmail) {
      setError("Informe o e-mail para reenviar o link de confirmação.");
      return;
    }

    setResendingConfirm(true);
    const resendResult = await supabase.auth.resend({
      email: normalizedEmail,
      type: "signup",
      options: {
        emailRedirectTo: `${getPublicWebUrl()}/signup/confirm`
      }
    });
    setResendingConfirm(false);

    if (resendResult.error) {
      setError(mapLoginError(resendResult.error.message));
      return;
    }

    setConfirmMsg("Link reenviado com sucesso. Se não receber, verifique o endereço de e-mail.");
    setAllowResendConfirm(true);
  }

  return (
    <main className="auth-shell">
      <section className="auth-left">
        <div className="auth-card">
          <h1>Acessar conta</h1>
          <form className="stack" onSubmit={onSubmit}>
            <label>
              E-mail
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
              />
            </label>
            <label>
              Senha
              <div className="input-icon-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Sua senha"
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  aria-label={showPassword ? "Esconder senha" : "Visualizar senha"}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <label className="remember-row">
              <input
                type="checkbox"
                checked={rememberAccess}
                onChange={(event) => setRememberAccess(event.target.checked)}
              />
              <span>Lembrar dados de acesso</span>
            </label>
            {error ? <p className="error">{error}</p> : null}
            {recoverMsg ? <p>{recoverMsg}</p> : null}
            {confirmMsg ? <p>{confirmMsg}</p> : null}
            {allowResendConfirm ? (
              <button
                className="secondary"
                type="button"
                onClick={onResendConfirmLink}
                disabled={resendingConfirm}
              >
                {resendingConfirm ? "Reenviando..." : "Reenviar link de confirmação"}
              </button>
            ) : null}
            <button type="submit" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
          <div className="auth-actions-row">
            <button className="secondary" type="button" onClick={() => router.push("/signup")}>
              Criar conta
            </button>
            <button
              className="secondary"
              type="button"
              onClick={onRecoverPassword}
              disabled={recoveringPassword}
            >
              {recoveringPassword ? "Enviando..." : "Recuperar senha"}
            </button>
          </div>
        </div>
      </section>

      <section className="auth-right">
        <div className="auth-brand-mark">VV Consulting</div>
        <p className="auth-brand-subtitle">Gestão de pessoas, operação e recrutamento em um único ecossistema.</p>
        <div className="auth-visual" />
      </section>
    </main>
  );
}
