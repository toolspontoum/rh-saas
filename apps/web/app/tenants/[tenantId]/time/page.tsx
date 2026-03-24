"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TimeLegacyPage() {
  const router = useRouter();
  const params = useParams<{ tenantId: string }>();

  useEffect(() => {
    router.replace(`/tenants/${params.tenantId}/time/register`);
  }, [router, params.tenantId]);

  return null;
}
