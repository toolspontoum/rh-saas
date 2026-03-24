import { redirect } from "next/navigation";

/** Rota legada: painel de recrutamento unificado em `/recruitment/jobs`. */
export default async function RecruitmentDashboardRedirectPage({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  redirect(`/tenants/${tenantId}/recruitment/jobs`);
}
