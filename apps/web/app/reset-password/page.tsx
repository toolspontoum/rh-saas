"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { clearToken, setToken } from "../../lib/auth";
import { describeMissingRecoverySession, establishSupabaseRedirectSession } from "../../lib/supabase-redirect-session";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"create" | "reset">("reset");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    async function prepareRecoverySession() {
      setPreparing(true);
      setError(null);

      try {
        const href = window.location.href;
        const url = new URL(href);
        const typeRawSearch = url.searchParams.get("type");
        const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
        const typeRawHash = hashParams.get("type");
        const inviteLike =
          typeRawSearch === "invite" ||
          typeRawSearch === "signup" ||
          typeRawHash === "invite" ||
          typeRawHash === "signup";
        if (inviteLike) {
          setMode("create");
        }

        const { session, setupError } = await establishSupabaseRedirectSession(supabase, href);
        if (setupError) {
          setSessionReady(false);
          setError(setupError.message);
          return;
        }
        if (!session) {
          setSessionReady(false);
          setError(describeMissingRecoverySession(href));
          return;
        }
        setSessionReady(true);
        const token = session.access_token;
        if (token) {
          setToken(token);
        }
      } catch (err) {
        setSessionReady(false);
        setError((err as Error).message);
      } finally {
        setPreparing(false);
      }
    }

    prepareRecoverySession();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setOkMsg(null);

    if (password.length < 6) {
      setError("A nova senha deve ter no minimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas nao conferem.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setOkMsg("Senha redefinida com sucesso. Voce ja pode entrar.");
    clearToken();
    await supabase.auth.signOut();
    setTimeout(() => router.push("/"), 1200);
  }

  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 520, margin: "60px auto" }}>
        <h1>{mode === "create" ? "Criar senha" : "Redefinir senha"}</h1>
        <p className="muted">
          {mode === "create"
            ? "Defina uma senha para concluir seu primeiro acesso."
            : "Digite sua nova senha para concluir a recuperacao de acesso."}
        </p>

        {preparing ? <p>Validando link de recuperacao...</p> : null}

        <form className="stack" onSubmit={onSubmit}>
          <label>
            Nova senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimo 6 caracteres"
              minLength={6}
              required
            />
          </label>

          <label>
            Confirmar nova senha
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repita a nova senha"
              minLength={6}
              required
            />
          </label>

          {error ? <p className="error">{error}</p> : null}
          {okMsg ? <p>{okMsg}</p> : null}

          <button type="submit" disabled={loading || preparing || !sessionReady}>
            {loading ? "Salvando..." : "Salvar nova senha"}
          </button>
          <button className="secondary" type="button" onClick={() => router.push("/")}>Voltar ao login</button>
        </form>
      </div>
    </main>
  );
}
