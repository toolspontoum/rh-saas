"use client";

import Link from "next/link";

/**
 * Listagem global de vagas foi desativada: cada empresa publica apenas em /vagas/[slug].
 */
export default function PublicJobsDisabledPage() {
  return (
    <main className="container wide stack">
      <h1>Vagas por empresa</h1>
      <p className="muted">
        Não há listagem única com todas as vagas do sistema. Cada empresa divulga o próprio link público no formato{" "}
        <code>/vagas/nome-da-empresa</code>.
      </p>
      <p>
        <Link href="/">Voltar ao início</Link>
      </p>
    </main>
  );
}
