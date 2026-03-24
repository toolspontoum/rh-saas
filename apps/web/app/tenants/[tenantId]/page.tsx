"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TenantHomeRedirectPage() {
  const router = useRouter();
  const params = useParams<{ tenantId: string }>();

  useEffect(() => {
    router.replace(`/tenants/${params.tenantId}/dashboard`);
  }, [router, params.tenantId]);

  return null;
}
