"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "../../../lib/api";
import { setToken } from "../../../lib/auth";
import { supabase } from "../../../lib/supabase";

type TenantSummary = {
  tenantId: string;
  roles: string[];
};

function isManagementRole(role: string): boolean {
  return ["owner", "admin", "manager", "analyst", "viewer"].includes(role);
}

function mapVerifyError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid token") || normalized.includes("otp")) {
    return "Link inválido ou expirado. Solicite um novo link de confirmação.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Seu e-mail ainda não foi confirmado.";
  }
  if (normalized.includes("rate limit")) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  }
  return message;
}

async function routeAfterAuth(router: ReturnType<typeof useRouter>) {
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
}

export default function ConfirmSignupPage() {
  const router = useRouter();
  const initialEmail = useMemo(() => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    return url.searchParams.get("email") ?? "";
  }, []);
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    async function tryExchangeLinkCode() {
      const url = new URL(window.location.href);
      const authCode = url.searchParams.get("code");
      if (!authCode) return;

      setError(null);
      setOkMsg(null);
      const exchanged = await supabase.auth.exchangeCodeForSession(authCode);
      if (exchanged.error || !exchanged.data.session?.access_token) {
        setError(mapVerifyError(exchanged.error?.message ?? "Nao foi possivel confirmar o e-mail."));
        return;
      }

      setToken(exchanged.data.session.access_token);
      setOkMsg("E-mail confirmado com sucesso. Redirecionando...");
      await routeAfterAuth(router);
    }

    tryExchangeLinkCode().catch((err: Error) => setError(err.message));
  }, [router]);

  async function onVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setOkMsg(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Informe o e-mail.");
      return;
    }
    setLoading(false);
    setOkMsg("Verifique sua caixa de entrada e clique no link de confirmação do e-mail.");
  }

  async function onResendCode() {
    setError(null);
    setOkMsg(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Informe o e-mail para reenviar o codigo.");
      return;
    }

    setResending(true);
    const resendResult = await supabase.auth.resend({
      email: normalizedEmail,
      type: "signup"
    });
    setResending(false);

    if (resendResult.error) {
      setError(mapVerifyError(resendResult.error.message));
      return;
    }

    setOkMsg("Enviamos um novo codigo para seu e-mail.");
  }

  return (
    <main className="auth-shell">
      <section className="auth-left">
        <div className="auth-card">
          <h1>Confirmar e-mail</h1>
          <p className="muted">Enviamos um link de confirmação para seu e-mail. Abra sua caixa de entrada e confirme seu endereço.</p>

          <form className="stack" onSubmit={onVerify}>
            <label>
              E-mail
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
                required
              />
            </label>

            {error ? <p className="error">{error}</p> : null}
            {okMsg ? <p>{okMsg}</p> : null}

            <button type="submit" disabled={loading}>
              {loading ? "Aguarde..." : "Já enviei, vou verificar o e-mail"}
            </button>
          </form>

          <div className="auth-actions-row">
            <button className="secondary" type="button" onClick={onResendCode} disabled={resending}>
              {resending ? "Reenviando..." : "Reenviar link"}
            </button>
            <button className="secondary" type="button" onClick={() => router.push("/")}>
              Voltar ao login
            </button>
          </div>
        </div>
      </section>

      <section className="auth-right">
        <div className="auth-brand-mark">VV Consulting</div>
        <p className="auth-brand-subtitle">Gestao de pessoas, operacao e recrutamento em um unico ecossistema.</p>
        <div className="auth-visual" />
      </section>
    </main>
  );
}
