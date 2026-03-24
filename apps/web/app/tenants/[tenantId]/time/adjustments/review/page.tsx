"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TimeAdjustmentsReviewLegacyPage() {
  const params = useParams<{ tenantId: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/tenants/${params.tenantId}/time/register`);
  }, [router, params.tenantId]);

  return null;
}
