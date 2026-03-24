"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function OncallReviewLegacyRedirectPage() {
  const router = useRouter();
  const params = useParams<{ tenantId: string }>();

  useEffect(() => {
    router.replace(`/tenants/${params.tenantId}/oncall`);
  }, [router, params.tenantId]);

  return null;
}
