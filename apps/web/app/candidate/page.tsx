"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getToken } from "../../lib/auth";
import { getCandidateProfile, isCandidateProfileComplete } from "../../lib/candidate";

export default function CandidateRootPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.push("/");
      return;
    }

    getCandidateProfile()
      .then((profile) => {
        if (isCandidateProfileComplete(profile)) {
          router.push("/candidate/dashboard");
          return;
        }
        router.push("/candidate/profile");
      })
      .catch(() => router.push("/candidate/profile"));
  }, [router]);

  return (
    <main className="container">
      <p>Carregando portal do candidato...</p>
    </main>
  );
}

