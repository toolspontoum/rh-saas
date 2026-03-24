"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "../../lib/api";
import { clearToken, getToken } from "../../lib/auth";
import { formatRoleList } from "../../lib/role-labels";

type TenantSummary = {
  tenantId: string;
  slug: string;
  displayName: string;
  legalName: string;
  roles: string[];
};

export default function TenantsPage() {
  const router = useRouter();
  const [items, setItems] = useState<TenantSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.push("/");
      return;
    }

    apiFetch<{ isPlatformAdmin: boolean }>("/v1/platform/me")
      .then((me) => setIsPlatformAdmin(me.isPlatformAdmin))
      .catch(() => setIsPlatformAdmin(false));

    apiFetch<TenantSummary[]>("/v1/me/tenants")
      .then(setItems)
      .catch((err: Error) => setError(err.message));
  }, [router]);

  return (
    <main className="container stack">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1>Assinantes</h1>
        <div className="row">
          {isPlatformAdmin ? (
            <button className="secondary" onClick={() => router.push("/superadmin")}>
              Plataforma
            </button>
          ) : null}
          <button className="secondary" onClick={() => router.push("/candidate")}>
            Area do candidato
          </button>
          <button
            className="secondary"
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
      <div className="stack">
        {items.map((tenant) => (
          <div className="card" key={tenant.tenantId}>
            <h3>{tenant.displayName}</h3>
            <p className="muted">
              {tenant.legalName} | perfis: {formatRoleList(tenant.roles)}
            </p>
            <div className="row">
              <Link href={`/tenants/${tenant.tenantId}`}>
                <button>Abrir modulo</button>
              </Link>
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 ? (
        <div className="card stack">
          <h3>Nenhum assinante vinculado</h3>
          <p className="muted">
            Sua conta pode ser usada normalmente na area do candidato para buscar vagas e se candidatar.
          </p>
          <div className="row">
            <button onClick={() => router.push("/candidate")}>Abrir area do candidato</button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
