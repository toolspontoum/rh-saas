"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { clearToken } from "../../lib/auth";
import { supabase } from "../../lib/supabase";

const links = [
  { href: "/candidate/dashboard", label: "Painel" },
  { href: "/candidate/profile", label: "Meu perfil" },
  { href: "/candidate/jobs", label: "Vagas disponíveis" },
  { href: "/candidate/applications", label: "Minhas candidaturas" }
];

export default function CandidateLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-title">Portal do Candidato</div>
        <div className="muted small">VV Consulting</div>

        <nav className="nav stack">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "nav-link active" : "nav-link"}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="stack">
          <button className="secondary" onClick={() => router.push("/")}>Trocar conta</button>
          <button
            className="secondary"
            onClick={async () => {
              await supabase.auth.signOut();
              clearToken();
              router.push("/");
            }}
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="content-area">{children}</main>
    </div>
  );
}

