import Link from "next/link";

export default async function PayslipsImportCsvPage({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;

  return (
    <main className="container stack" style={{ margin: 0 }}>
      <h1>Importação por CSV desativada</h1>
      <p className="muted">
        O fluxo de contracheque em massa agora é feito por upload de arquivos na lista de colaboradores.
      </p>
      <div className="row">
        <Link href={`/tenants/${tenantId}/payslips/upload`}>
          <button>Ir para Upload em lote</button>
        </Link>
        <Link href={`/tenants/${tenantId}/payslips`}>
          <button className="secondary">Voltar para Contracheques</button>
        </Link>
      </div>
    </main>
  );
}
