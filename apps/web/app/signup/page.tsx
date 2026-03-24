"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { setToken } from "../../lib/auth";
import { supabase } from "../../lib/supabase";

function mapAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("rate limit")) {
    return "Não foi possível concluir agora. Aguarde alguns minutos e tente novamente.";
  }

  if (normalized.includes("already registered") || normalized.includes("already exists")) {
    return "Este e-mail já possui cadastro.";
  }

  return message;
}

async function detectExistingAccountState(
  email: string,
  password: string
): Promise<"existing_confirmed" | "existing_unconfirmed" | "unknown"> {
  const signIn = await supabase.auth.signInWithPassword({ email, password });

  if (signIn.data.session?.access_token) {
    await supabase.auth.signOut();
    return "existing_confirmed";
  }

  const normalizedError = signIn.error?.message.toLowerCase() ?? "";
  if (normalizedError.includes("email not confirmed")) {
    return "existing_unconfirmed";
  }

  return "unknown";
}

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    const signUp = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/signup/confirm` : undefined,
        data: {
          full_name: fullName
        }
      }
    });

    if (signUp.error) {
      const normalizedMessage = signUp.error.message.toLowerCase();
      if (
        normalizedMessage.includes("already registered") ||
        normalizedMessage.includes("already exists") ||
        normalizedMessage.includes("email exists") ||
        normalizedMessage.includes("user already registered")
      ) {
        const existingState = await detectExistingAccountState(normalizedEmail, password);
        setLoading(false);
        if (existingState === "existing_unconfirmed") {
          setError("e-mail já cadastrado, confira sua caixa de entrada");
          return;
        }
        setError("Este e-mail pertence a uma conta já existente");
        return;
      }

      if (normalizedMessage.includes("rate limit")) {
        const existingState = await detectExistingAccountState(normalizedEmail, password);
        setLoading(false);
        if (existingState === "existing_unconfirmed") {
          setError("e-mail já cadastrado, confira sua caixa de entrada");
          return;
        }
        if (existingState === "existing_confirmed") {
          setError("Este e-mail pertence a uma conta já existente");
          return;
        }
      }

      setLoading(false);
      setError(mapAuthError(signUp.error.message));
      return;
    }

    const tokenFromSignUp = signUp.data.session?.access_token;
    if (tokenFromSignUp) {
      setToken(tokenFromSignUp);
      setLoading(false);
      router.push("/candidate");
      return;
    }

    setLoading(false);
    router.push(`/signup/confirm?email=${encodeURIComponent(normalizedEmail)}`);
  }

  return (
    <main className="auth-shell">
      <section className="auth-left">
        <div className="auth-card">
          <h1>Criar conta</h1>
          <p className="muted">Após cadastro você pode preencher seu perfil e se candidatar nas vagas.</p>

          <form className="stack" onSubmit={onSubmit}>
            <label>
              Nome completo
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Seu nome"
                required
              />
            </label>

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

            <label>
              Senha
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
            </label>

            <label>
              Confirmar senha
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repita a senha"
                minLength={6}
                required
              />
            </label>

            {error ? <p className="error">{error}</p> : null}

            <button type="submit" disabled={loading}>
              {loading ? "Criando conta..." : "Criar conta"}
            </button>
          </form>

          <div className="auth-actions-row" style={{ gridTemplateColumns: "1fr" }}>
            <button className="secondary" type="button" onClick={() => router.push("/")}>
              Entrar
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
