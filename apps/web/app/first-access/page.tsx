"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { clearToken, setToken } from "../../lib/auth";
import { supabase } from "../../lib/supabase";

export default function FirstAccessPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    async function prepareRecoverySession() {
      setPreparing(true);
      setError(null);

      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const typeRaw = url.searchParams.get("type");

        if (code) {
          const exchanged = await supabase.auth.exchangeCodeForSession(code);
          if (exchanged.error) {
            setError(exchanged.error.message);
            setPreparing(false);
            return;
          }
        } else if (tokenHash && typeRaw) {
          const type =
            typeRaw === "invite" ||
            typeRaw === "recovery" ||
            typeRaw === "signup" ||
            typeRaw === "magiclink" ||
            typeRaw === "email_change"
              ? typeRaw
              : null;
          if (!type) {
            setError("Link inválido. Solicite um novo e-mail para criar sua senha.");
            setPreparing(false);
            return;
          }

          const verified = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
          if (verified.error) {
            setError(verified.error.message);
            setPreparing(false);
            return;
          }
        }

        const sessionResponse = await supabase.auth.getSession();
        const token = sessionResponse.data.session?.access_token;
        if (token) {
          setToken(token);
        }
      } catch (err) {
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
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setOkMsg("Senha criada com sucesso. Agora você já pode entrar.");
    clearToken();
    await supabase.auth.signOut();
    setTimeout(() => router.push("/"), 1200);
  }

  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 520, margin: "60px auto" }}>
        <h1>Criar senha</h1>
        <p className="muted">Defina uma senha para concluir seu primeiro acesso.</p>

        {preparing ? <p>Validando link...</p> : null}

        <form className="stack" onSubmit={onSubmit}>
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
          {okMsg ? <p>{okMsg}</p> : null}

          <button type="submit" disabled={loading || preparing}>
            {loading ? "Salvando..." : "Criar senha"}
          </button>
          <button className="secondary" type="button" onClick={() => router.push("/")}>
            Voltar ao login
          </button>
        </form>
      </div>
    </main>
  );
}

