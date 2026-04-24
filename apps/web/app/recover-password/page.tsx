"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { supabase } from "../../lib/supabase";
import { getPublicWebUrl } from "../../lib/public-web-url";

export default function RecoverPasswordPage() {
  const router = useRouter();
  const search = useSearchParams();
  const initialEmail = useMemo(() => (search?.get("email") ?? "").trim(), [search]);

  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const normalized = email.trim().toLowerCase();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setOkMsg(null);

    if (!normalized) {
      setError("Informe o e-mail para recuperar a senha.");
      return;
    }

    setLoading(true);
    const redirectTo = `${getPublicWebUrl()}/reset-password`;
    const { error: recoverError } = await supabase.auth.resetPasswordForEmail(normalized, { redirectTo });
    setLoading(false);

    if (recoverError) {
      setError(recoverError.message);
      return;
    }

    setOkMsg("Enviamos as instruções de recuperação para seu e-mail.");
  }

  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 520, margin: "60px auto" }}>
        <h1>Recuperar senha</h1>
        <p className="muted">Digite seu e-mail para receber o link de redefinição de senha.</p>

        <form className="stack" onSubmit={onSubmit}>
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
            {loading ? "Enviando..." : "Enviar instruções"}
          </button>
          <button className="secondary" type="button" onClick={() => router.push("/")}>
            Voltar ao login
          </button>
        </form>
      </div>
    </main>
  );
}

