/** Abas/tipos alinhados ao módulo de documentos do colaborador (sem "Baixar os documentos"). */
export type JobDocTabKey =
  | "pessoal"
  | "contratacao"
  | "cursos"
  | "propostas"
  | "docs_avulsos"
  | "docs_rescisorios";

export const jobDocumentTabs: Array<{ key: JobDocTabKey; label: string }> = [
  { key: "pessoal", label: "Pessoal" },
  { key: "cursos", label: "Certificados" },
  { key: "docs_avulsos", label: "Docs Avulsos" },
  { key: "propostas", label: "Propostas" },
  { key: "contratacao", label: "Contratação" },
  { key: "docs_rescisorios", label: "Docs Rescisórios" }
];

/** Abas ocultas na criação/edição da vaga (candidatura); tipos continuam no sistema para dados legados. */
export const jobFormHiddenDocTabs: JobDocTabKey[] = ["contratacao", "propostas", "docs_rescisorios"];

/** Abas visíveis ao RH ao montar documentos exigidos na candidatura. */
export const jobDocumentTabsForJobForm = jobDocumentTabs.filter((t) => !jobFormHiddenDocTabs.includes(t.key));

export const jobTabDocTypes: Record<JobDocTabKey, string[]> = {
  pessoal: [
    "Carteira de Trabalho",
    "Comprovante de residência",
    "CPF",
    "RG",
    "Título de Eleitor",
    "CNH"
  ],
  contratacao: [
    "Contrato de Trabalho Assinado",
    "Declarações diversas",
    "Documentos ASO / exames ocupacionais"
  ],
  cursos: [
    "Cursos e Treinamentos",
    "Certificado nível superior",
    "Certificado nível técnico"
  ],
  propostas: ["Proposta"],
  docs_avulsos: ["Documentos Diversos"],
  docs_rescisorios: [
    "Documento Rescisório",
    "Aviso Prévio de Trabalho Assinado",
    "Termo de Rescisão Contratual Assinado"
  ]
};
