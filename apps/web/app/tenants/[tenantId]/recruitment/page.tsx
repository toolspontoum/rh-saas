"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function RecruitmentLegacyPage() {
  const router = useRouter();
  const params = useParams<{ tenantId: string }>();

  useEffect(() => {
    router.replace(`/tenants/${params.tenantId}/recruitment/jobs`);
  }, [router, params.tenantId]);

  return null;
}
