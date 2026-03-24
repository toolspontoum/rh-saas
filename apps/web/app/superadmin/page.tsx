"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "../../lib/api";
import { clearToken, getToken } from "../../lib/auth";

type PlatformTenant = {
  id: string;
  slug: string;
  legal_name: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
  ai_provider: "openai" | "gemini" | null;
};

type PlatformSuperadmin = {
  userId: string;
  email: string | null;
  createdAt: string;
};

type PlatformAiSettings = {
  openai: {
    configuredInDatabase: boolean;
    keyLastFour: string | null;
    model: string | null;
  };
  gemini: {
    configuredInDatabase: boolean;
    keyLastFour: string | null;
    model: string | null;
  };
  environment: {
    openaiKeyPresent: boolean;
    geminiKeyPresent: boolean;
    defaultOpenaiModel: string;
    defaultGeminiModel: string;
  };
};

export default function SuperadminPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [superadmins, setSuperadmins] = useState<PlatformSuperadmin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [newSuperadminEmail, setNewSuperadminEmail] = useState("");

  const [aiSettings, setAiSettings] = useState<PlatformAiSettings | null>(null);
  const [openaiModelInput, setOpenaiModelInput] = useState("");
  const [geminiModelInput, setGeminiModelInput] = useState("");
  const [newOpenaiKey, setNewOpenaiKey] = useState("");
  const [newGeminiKey, setNewGeminiKey] = useState("");
  const [pocketOpenaiOpen, setPocketOpenaiOpen] = useState(false);
  const [pocketGeminiOpen, setPocketGeminiOpen] = useState(false);
  const [confirmRemoveProvider, setConfirmRemoveProvider] = useState<"openai" | "gemini" | null>(null);
  const [tenantAiSavingId, setTenantAiSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push("/");
      return;
    }

    apiFetch<{ isPlatformAdmin: boolean }>("/v1/platform/me")
      .then((me) => {
        if (!me.isPlatformAdmin) {
          setAllowed(false);
          return;
        }
        setAllowed(true);
        return Promise.all([
          apiFetch<PlatformTenant[]>("/v1/platform/tenants"),
          apiFetch<PlatformSuperadmin[]>("/v1/platform/superadmins"),
          apiFetch<PlatformAiSettings>("/v1/platform/ai-settings")
        ])
          .then(([t, s, ai]) => {
            setTenants(t);
            setSuperadmins(s);
            setAiSettings(ai);
            setOpenaiModelInput(ai.openai.model ?? "");
            setGeminiModelInput(ai.gemini.model ?? "");
            setNewOpenaiKey("");
            setNewGeminiKey("");
          })
          .catch((err: Error) => setError(err.message));
      })
      .catch((err: Error) => setError(err.message));
  }, [router]);

  useEffect(() => {
    if (!confirmRemoveProvider) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setConfirmRemoveProvider(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmRemoveProvider]);

  async function refresh() {
    const [t, s, ai] = await Promise.all([
      apiFetch<PlatformTenant[]>("/v1/platform/tenants"),
      apiFetch<PlatformSuperadmin[]>("/v1/platform/superadmins"),
      apiFetch<PlatformAiSettings>("/v1/platform/ai-settings")
    ]);
    setTenants(t);
    setSuperadmins(s);
    setAiSettings(ai);
    setOpenaiModelInput(ai.openai.model ?? "");
    setGeminiModelInput(ai.gemini.model ?? "");
    setNewOpenaiKey("");
    setNewGeminiKey("");
  }

  async function onCreateTenant(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiFetch("/v1/platform/tenants", {
        method: "POST",
        body: JSON.stringify({
          displayName: displayName.trim(),
          legalName: legalName.trim() || null
        })
      });
      setDisplayName("");
      setLegalName("");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onSaveTenantAiProvider(tenantId: string, value: string) {
    setError(null);
    setTenantAiSavingId(tenantId);
    try {
      const provider =
        value === "openai" || value === "gemini" ? (value as "openai" | "gemini") : null;
      await apiFetch(`/v1/platform/tenants/${tenantId}/ai-provider`, {
        method: "PATCH",
        body: JSON.stringify({ provider })
      });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTenantAiSavingId(null);
    }
  }

  async function onGrantAdmin(tenantId: string) {
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/v1/platform/tenants/${tenantId}/grant-admin`, {
        method: "POST",
        body: JSON.stringify({})
      });
      router.push("/tenants");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onSaveAiProvider(event: FormEvent, provider: "openai" | "gemini") {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body: Record<string, unknown> =
        provider === "openai"
          ? { openaiModel: openaiModelInput.trim() || null }
          : { geminiModel: geminiModelInput.trim() || null };
      if (provider === "openai") {
        if (newOpenaiKey.trim()) body.openaiApiKey = newOpenaiKey.trim();
      } else {
        if (newGeminiKey.trim()) body.geminiApiKey = newGeminiKey.trim();
      }

      await apiFetch("/v1/platform/ai-settings", {
        method: "PATCH",
        body: JSON.stringify(body)
      });
      await refresh();
      if (provider === "openai") setPocketOpenaiOpen(false);
      else setPocketGeminiOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function executeRemovePanelKey() {
    if (!confirmRemoveProvider) return;
    setError(null);
    setBusy(true);
    try {
      const body =
        confirmRemoveProvider === "openai"
          ? { clearOpenaiApiKey: true }
          : { clearGeminiApiKey: true };
      await apiFetch("/v1/platform/ai-settings", {
        method: "PATCH",
        body: JSON.stringify(body)
      });
      await refresh();
      setConfirmRemoveProvider(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onAddSuperadmin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiFetch("/v1/platform/superadmins", {
        method: "POST",
        body: JSON.stringify({ email: newSuperadminEmail.trim().toLowerCase() })
      });
      setNewSuperadminEmail("");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (allowed === null) {
    return (
      <main className="container wide">
        <p>Carregando...</p>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="container wide stack">
        <h1>Acesso negado</h1>
        <p className="muted">Sua conta não tem permissão de superadmin da plataforma.</p>
        <Link href="/tenants">Voltar</Link>
      </main>
    );
  }

  return (
    <main className="container wide stack">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1>Plataforma</h1>
        <div className="row">
          <button className="secondary" type="button" onClick={() => router.push("/tenants")}>
            Minhas empresas
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => {
              clearToken();
              router.push("/");
            }}
          >
            Sair
          </button>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <section className="card stack">
        <h2>IA da plataforma (OpenAI / Gemini)</h2>
        <p className="muted small">
          Chaves salvas aqui têm prioridade sobre as variáveis de ambiente da API. Modelos vazios usam o padrão do servidor (
          <code>{aiSettings?.environment.defaultOpenaiModel ?? "—"}</code> /{" "}
          <code>{aiSettings?.environment.defaultGeminiModel ?? "—"}</code>).
        </p>
        {aiSettings ? (
          <div className="stack">
            <div className="ai-provider-grid">
              <div className="ai-pocket">
                <div className="ai-pocket-head">
                  <h3 className="ai-pocket-provider">OpenAI</h3>
                  <button
                    type="button"
                    className="secondary ai-pocket-settings"
                    onClick={() => setPocketOpenaiOpen((v) => !v)}
                  >
                    {pocketOpenaiOpen ? "Fechar" : "Configurações"}
                  </button>
                </div>
                <div className="ai-pocket-keyline">
                  <span className="ai-pocket-keylabel">Chave</span>
                  <div className="ai-status-badges">
                    <span
                      className={`ai-badge ${aiSettings.openai.configuredInDatabase ? "ai-badge--yes" : "ai-badge--no"}`}
                    >
                      {aiSettings.openai.configuredInDatabase ? "Configurado" : "Não configurado"}
                    </span>
                    <span
                      className={`ai-badge ${
                        aiSettings.openai.configuredInDatabase || aiSettings.environment.openaiKeyPresent
                          ? "ai-badge--on"
                          : "ai-badge--off"
                      }`}
                    >
                      {aiSettings.openai.configuredInDatabase || aiSettings.environment.openaiKeyPresent
                        ? "Ativo"
                        : "Inativo"}
                    </span>
                  </div>
                </div>
                {aiSettings.openai.configuredInDatabase && aiSettings.openai.keyLastFour ? (
                  <p className="ai-pocket-hint">
                    Painel: termina em <code>{aiSettings.openai.keyLastFour}</code>
                    {aiSettings.environment.openaiKeyPresent ? " · .env também definido" : ""}
                  </p>
                ) : aiSettings.environment.openaiKeyPresent ? (
                  <p className="ai-pocket-hint">Somente variável de ambiente (.env).</p>
                ) : (
                  <p className="ai-pocket-hint">Nenhuma chave no painel nem no .env.</p>
                )}
                {pocketOpenaiOpen ? (
                  <form
                    className="ai-pocket-body stack"
                    onSubmit={(e) => void onSaveAiProvider(e, "openai")}
                  >
                    <label>
                      Modelo (opcional)
                      <input
                        value={openaiModelInput}
                        onChange={(e) => setOpenaiModelInput(e.target.value)}
                        placeholder={aiSettings.environment.defaultOpenaiModel}
                        autoComplete="off"
                      />
                    </label>
                    <label>
                      Nova chave API (vazio = não alterar)
                      <input
                        type="password"
                        value={newOpenaiKey}
                        onChange={(e) => setNewOpenaiKey(e.target.value)}
                        placeholder="sk-..."
                        autoComplete="new-password"
                      />
                    </label>
                    <div className="ai-remove-key-row">
                      <span className="muted small">
                        Remover a chave salva no painel (o .env da API continua valendo, se existir).
                      </span>
                      <button
                        type="button"
                        className="ai-trash-btn"
                        disabled={!aiSettings.openai.configuredInDatabase || busy}
                        title={
                          aiSettings.openai.configuredInDatabase
                            ? "Remover chave do painel"
                            : "Nenhuma chave no painel para remover"
                        }
                        aria-label="Remover chave OpenAI do painel"
                        onClick={() => setConfirmRemoveProvider("openai")}
                      >
                        <Trash2 size={20} aria-hidden />
                      </button>
                    </div>
                    <button type="submit" disabled={busy}>
                      {busy ? "Salvando..." : "Salvar configurações de IA"}
                    </button>
                  </form>
                ) : null}
              </div>

              <div className="ai-pocket">
                <div className="ai-pocket-head">
                  <h3 className="ai-pocket-provider">Google Gemini</h3>
                  <button
                    type="button"
                    className="secondary ai-pocket-settings"
                    onClick={() => setPocketGeminiOpen((v) => !v)}
                  >
                    {pocketGeminiOpen ? "Fechar" : "Configurações"}
                  </button>
                </div>
                <div className="ai-pocket-keyline">
                  <span className="ai-pocket-keylabel">Chave</span>
                  <div className="ai-status-badges">
                    <span
                      className={`ai-badge ${aiSettings.gemini.configuredInDatabase ? "ai-badge--yes" : "ai-badge--no"}`}
                    >
                      {aiSettings.gemini.configuredInDatabase ? "Configurado" : "Não configurado"}
                    </span>
                    <span
                      className={`ai-badge ${
                        aiSettings.gemini.configuredInDatabase || aiSettings.environment.geminiKeyPresent
                          ? "ai-badge--on"
                          : "ai-badge--off"
                      }`}
                    >
                      {aiSettings.gemini.configuredInDatabase || aiSettings.environment.geminiKeyPresent
                        ? "Ativo"
                        : "Inativo"}
                    </span>
                  </div>
                </div>
                {aiSettings.gemini.configuredInDatabase && aiSettings.gemini.keyLastFour ? (
                  <p className="ai-pocket-hint">
                    Painel: termina em <code>{aiSettings.gemini.keyLastFour}</code>
                    {aiSettings.environment.geminiKeyPresent ? " · .env também definido" : ""}
                  </p>
                ) : aiSettings.environment.geminiKeyPresent ? (
                  <p className="ai-pocket-hint">Somente variável de ambiente (.env).</p>
                ) : (
                  <p className="ai-pocket-hint">Nenhuma chave no painel nem no .env.</p>
                )}
                {pocketGeminiOpen ? (
                  <form
                    className="ai-pocket-body stack"
                    onSubmit={(e) => void onSaveAiProvider(e, "gemini")}
                  >
                    <label>
                      Modelo (opcional)
                      <input
                        value={geminiModelInput}
                        onChange={(e) => setGeminiModelInput(e.target.value)}
                        placeholder={aiSettings.environment.defaultGeminiModel}
                        autoComplete="off"
                      />
                    </label>
                    <label>
                      Nova chave API (vazio = não alterar)
                      <input
                        type="password"
                        value={newGeminiKey}
                        onChange={(e) => setNewGeminiKey(e.target.value)}
                        autoComplete="new-password"
                      />
                    </label>
                    <div className="ai-remove-key-row">
                      <span className="muted small">
                        Remover a chave salva no painel (o .env da API continua valendo, se existir).
                      </span>
                      <button
                        type="button"
                        className="ai-trash-btn"
                        disabled={!aiSettings.gemini.configuredInDatabase || busy}
                        title={
                          aiSettings.gemini.configuredInDatabase
                            ? "Remover chave do painel"
                            : "Nenhuma chave no painel para remover"
                        }
                        aria-label="Remover chave Gemini do painel"
                        onClick={() => setConfirmRemoveProvider("gemini")}
                      >
                        <Trash2 size={20} aria-hidden />
                      </button>
                    </div>
                    <button type="submit" disabled={busy}>
                      {busy ? "Salvando..." : "Salvar configurações de IA"}
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <p className="muted">Carregando configurações de IA...</p>
        )}
      </section>

      <section className="card stack">
        <h2>Novo assinante (empresa)</h2>
        <p className="muted small">
          O slug público é gerado automaticamente a partir do nome (ex.: &quot;VV Consulting&quot; →{" "}
          <code>vv-consulting</code>).
        </p>
        <form className="stack" onSubmit={onCreateTenant}>
          <label>
            Nome de exibição
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nome da empresa"
              required
            />
          </label>
          <label>
            Razão social (opcional)
            <input
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="Igual ao nome de exibição se vazio"
            />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? "Salvando..." : "Criar assinante"}
          </button>
        </form>
      </section>

      <section className="card stack">
        <h2>Assinantes</h2>
        <p className="muted small">
          O provedor de IA (OpenAI ou Gemini) por assinante é definido aqui; administradores do tenant não alteram
          isso no painel.
        </p>
        <div className="stack">
          {tenants.map((t) => (
            <div
              key={t.id}
              className="card row"
              style={{
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 16
              }}
            >
              <div>
                <strong>{t.display_name}</strong>
                <p className="muted small">
                  Slug: <code>{t.slug}</code> · {t.is_active ? "Ativo" : "Inativo"}
                </p>
                <p className="muted small">
                  Página pública:{" "}
                  <Link href={`/vagas/${t.slug}`} target="_blank" rel="noreferrer">
                    /vagas/{t.slug}
                  </Link>
                </p>
              </div>
              <label className="stack" style={{ gap: 6, minWidth: 220 }}>
                <span className="muted small">Provedor de IA do assinante</span>
                <select
                  disabled={busy || tenantAiSavingId === t.id}
                  value={t.ai_provider ?? ""}
                  onChange={(e) => void onSaveTenantAiProvider(t.id, e.target.value)}
                >
                  <option value="">Padrão do ambiente (AI_PROVIDER_DEFAULT)</option>
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </label>
              <div className="row">
                <button type="button" disabled={busy} onClick={() => void onGrantAdmin(t.id)}>
                  Entrar como admin
                </button>
              </div>
            </div>
          ))}
          {tenants.length === 0 ? <p className="muted">Nenhum assinante cadastrado.</p> : null}
        </div>
      </section>

      <section className="card stack">
        <h2>Superadmins da plataforma</h2>
        <form className="stack" onSubmit={onAddSuperadmin}>
          <label>
            Convidar por e-mail
            <input
              type="email"
              value={newSuperadminEmail}
              onChange={(e) => setNewSuperadminEmail(e.target.value)}
              placeholder="email@empresa.com"
              required
            />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? "Enviando..." : "Adicionar superadmin"}
          </button>
        </form>
        <ul className="stack" style={{ listStyle: "none", padding: 0 }}>
          {superadmins.map((s) => (
            <li key={s.userId} className="muted">
              {s.email ?? s.userId}
            </li>
          ))}
        </ul>
      </section>

      {confirmRemoveProvider ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => !busy && setConfirmRemoveProvider(null)}
        >
          <div
            className="modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-remove-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="ai-remove-title">
              Remover chave {confirmRemoveProvider === "openai" ? "OpenAI" : "Gemini"}?
            </h3>
            <p>
              A chave armazenada no painel será apagada. Se existir variável de ambiente na API, ela continuará
              sendo usada como fallback.
            </p>
            <div className="modal-actions">
              <button type="button" className="secondary" disabled={busy} onClick={() => setConfirmRemoveProvider(null)}>
                Cancelar
              </button>
              <button type="button" className="danger" disabled={busy} onClick={() => void executeRemovePanelKey()}>
                {busy ? "Removendo..." : "Remover chave"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
