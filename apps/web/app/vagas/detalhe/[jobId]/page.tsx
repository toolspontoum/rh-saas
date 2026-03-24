"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { getPublicJobByIdForGuest } from "../../../../lib/candidate";

/**
 * Compatibilidade: redireciona URLs antigas /vagas/detalhe/[jobId] para /vagas/[tenantSlug]/[jobId].
 */
export default function LegacyPublicJobDetailRedirect() {
  const params = useParams<{ jobId: string }>();
  const router = useRouter();
  const jobId = params.jobId;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPublicJobByIdForGuest(jobId)
      .then((job) => {
        router.replace(`/vagas/${encodeURIComponent(job.tenantSlug)}/${encodeURIComponent(jobId)}`);
      })
      .catch((err: Error) => setError(err.message));
  }, [jobId, router]);

  if (error) {
    return (
      <main className="container wide">
        <p className="error">{error}</p>
      </main>
    );
  }

  return (
    <main className="container wide">
      <p>Carregando vaga...</p>
    </main>
  );
}
