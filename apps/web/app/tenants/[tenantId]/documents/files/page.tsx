import { redirect } from "next/navigation";

export default async function DocumentsFilesPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  redirect(`/tenants/${tenantId}/collaborator`);
}
