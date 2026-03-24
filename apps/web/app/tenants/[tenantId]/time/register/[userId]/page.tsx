"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TimeRegisterDetailsRedirectPage() {
  const params = useParams<{ tenantId: string; userId: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/tenants/${params.tenantId}/time/register?detail=1&userId=${params.userId}`);
  }, [router, params.tenantId, params.userId]);

  return null;
}
