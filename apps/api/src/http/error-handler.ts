import { ZodError } from "zod";

import { env } from "../config/env.js";

function pdfFileTooLargeMessage(): string {
  const mb = env.MAX_PDF_UPLOAD_SIZE_BYTES / (1024 * 1024);
  const mbLabel = Number.isInteger(mb) ? String(mb) : mb.toFixed(1);
  return `O arquivo excede o limite máximo de ${mbLabel} MB. Reduza o tamanho e tente novamente.`;
}

type ApiErrorShape = {
  status: number;
  code: string;
  message: string;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
};

const knownErrors = new Map<string, ApiErrorShape>([
  [
    "PLATFORM_ADMIN_LOOKUP_TIMEOUT",
    {
      status: 504,
      code: "GATEWAY_TIMEOUT",
      message:
        "Consulta de permissões excedeu o tempo limite. Verifique SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY na Vercel e a conectividade com o Supabase."
    }
  ],
  ["USER_NOT_IN_TENANT", { status: 403, code: "FORBIDDEN", message: "Usuario sem acesso a este assinante." }],
  [
    "FEATURE_NOT_ENABLED",
    { status: 403, code: "FEATURE_DISABLED", message: "Funcionalidade nao habilitada para o assinante selecionado." }
  ],
  ["JOB_NOT_FOUND", { status: 404, code: "JOB_NOT_FOUND", message: "Vaga nao encontrada para o assinante selecionado." }],
  [
    "APPLICATION_ALREADY_EXISTS",
    { status: 409, code: "APPLICATION_ALREADY_EXISTS", message: "Voce ja se candidatou para esta vaga." }
  ],
  [
    "ROLE_NOT_ALLOWED",
    { status: 403, code: "ROLE_NOT_ALLOWED", message: "Perfil do usuario nao permitido para executar esta operacao." }
  ],
  [
    "APPLICATION_NOT_FOUND",
    { status: 404, code: "APPLICATION_NOT_FOUND", message: "Candidatura nao encontrada para a vaga e assinante selecionados." }
  ],
  [
    "CANNOT_WITHDRAW_APPROVED_APPLICATION",
    {
      status: 400,
      code: "CANNOT_WITHDRAW_APPROVED_APPLICATION",
      message: "Nao e possivel retirar uma candidatura ja aprovada."
    }
  ],
  ["INVALID_FILE_TYPE", { status: 400, code: "INVALID_FILE_TYPE", message: "Tipo de arquivo invalido para esta operacao." }],
  [
    "UPLOAD_INTENT_FAILED",
    {
      status: 500,
      code: "UPLOAD_INTENT_FAILED",
      message: "Falha ao enviar o arquivo ao armazenamento. Verifique o bucket, politicas de tamanho no Supabase ou tente novamente."
    }
  ],
  [
    "STORAGE_UPLOAD_REJECTED",
    {
      status: 403,
      code: "STORAGE_UPLOAD_REJECTED",
      message:
        "O armazenamento recusou o upload (permissão, política do bucket ou tamanho). Verifique se o PDF tem até o limite configurado e se as políticas do Supabase Storage permitem o envio."
    }
  ],
  ["INVALID_FILE_PATH_SCOPE", { status: 400, code: "INVALID_FILE_PATH_SCOPE", message: "Caminho do arquivo fora do escopo permitido." }],
  ["INVALID_FILE_PATH", { status: 400, code: "INVALID_FILE_PATH", message: "Caminho do arquivo invalido." }],
  [
    "UPLOAD_OBJECT_CHECK_FAILED",
    { status: 500, code: "UPLOAD_OBJECT_CHECK_FAILED", message: "Nao foi possivel validar o arquivo enviado no storage." }
  ],
  ["SIGNED_URL_FAILED", { status: 500, code: "SIGNED_URL_FAILED", message: "Nao foi possivel gerar URL assinada para o anexo." }],
  ["UPLOAD_OBJECT_NOT_FOUND", { status: 404, code: "UPLOAD_OBJECT_NOT_FOUND", message: "Arquivo enviado nao encontrado no bucket." }],
  ["RESUME_NOT_FOUND", { status: 404, code: "RESUME_NOT_FOUND", message: "Curriculo nao encontrado para este candidato." }],
  [
    "SELF_STATUS_CHANGE_NOT_ALLOWED",
    { status: 400, code: "SELF_STATUS_CHANGE_NOT_ALLOWED", message: "Usuario nao pode desativar ou desligar a propria conta." }
  ],
  [
    "TARGET_USER_NOT_IN_TENANT",
    { status: 404, code: "TARGET_USER_NOT_IN_TENANT", message: "Usuario alvo nao encontrado no assinante selecionado." }
  ],
  [
    "OFFBOARD_REASON_REQUIRED",
    { status: 400, code: "OFFBOARD_REASON_REQUIRED", message: "Motivo de desligamento obrigatorio com pelo menos 5 caracteres." }
  ],
  ["SELF_DELETE_NOT_ALLOWED", { status: 400, code: "SELF_DELETE_NOT_ALLOWED", message: "Usuario nao pode remover o proprio acesso." }],
  ["DELETE_REASON_REQUIRED", { status: 400, code: "DELETE_REASON_REQUIRED", message: "Motivo da exclusao obrigatorio com pelo menos 5 caracteres." }],
  [
    "USER_HAS_LINKED_RECORDS",
    { status: 409, code: "USER_HAS_LINKED_RECORDS", message: "Usuario possui registros vinculados e nao pode ser removido do assinante." }
  ],
  ["FILES_REQUIRED", { status: 400, code: "FILES_REQUIRED", message: "Envie ao menos um arquivo para esta operacao." }],
  ["CANDIDATE_NOT_FOUND", { status: 404, code: "CANDIDATE_NOT_FOUND", message: "Candidato nao encontrado para o assinante selecionado." }],
  ["CANDIDATE_MUST_BE_INACTIVE", { status: 400, code: "CANDIDATE_MUST_BE_INACTIVE", message: "Candidato deve estar inativo antes da exclusao." }],
  [
    "CANDIDATE_PROFILE_INCOMPLETE",
    { status: 400, code: "CANDIDATE_PROFILE_INCOMPLETE", message: "Complete o perfil do candidato com nome e e-mail antes de se candidatar." }
  ],
  ["SCREENING_QUESTION_REQUIRED", { status: 400, code: "SCREENING_QUESTION_REQUIRED", message: "Preencha todas as perguntas obrigatorias da vaga." }],
  [
    "COVER_LETTER_REQUIRED",
    { status: 400, code: "COVER_LETTER_REQUIRED", message: "A carta de apresentacao e obrigatoria para esta vaga." }
  ],
  [
    "JOB_DOCUMENTS_REQUIRED",
    { status: 400, code: "JOB_DOCUMENTS_REQUIRED", message: "Anexe todos os documentos solicitados pela vaga (PDF)." }
  ],
  [
    "JOB_DOCUMENT_UPLOAD_INVALID",
    { status: 400, code: "JOB_DOCUMENT_UPLOAD_INVALID", message: "Um ou mais documentos enviados nao correspondem aos solicitados pela vaga." }
  ],
  [
    "JOB_DOCUMENT_UPLOAD_UNEXPECTED",
    { status: 400, code: "JOB_DOCUMENT_UPLOAD_UNEXPECTED", message: "Documentos extras foram enviados mas esta vaga nao exige anexos adicionais." }
  ],
  [
    "JOB_DOCUMENT_REUSE_NOT_FOUND",
    {
      status: 400,
      code: "JOB_DOCUMENT_REUSE_NOT_FOUND",
      message: "Um ou mais documentos nao estao mais disponiveis na sua conta. Atualize os arquivos e tente novamente."
    }
  ],
  [
    "USER_REQUIRED_FOR_JOB_DOCUMENTS",
    {
      status: 500,
      code: "USER_REQUIRED_FOR_JOB_DOCUMENTS",
      message: "Nao foi possivel vincular documentos ao usuario. Tente novamente em instantes ou entre em contato com o suporte."
    }
  ],
  ["INVALID_TIME_ENTRY_SEQUENCE", { status: 400, code: "INVALID_TIME_ENTRY_SEQUENCE", message: "Sequencia de batida de ponto invalida para o momento atual." }],
  [
    "ONCALL_TARGET_NOT_EMPLOYEE",
    { status: 400, code: "ONCALL_TARGET_NOT_EMPLOYEE", message: "O usuario selecionado nao possui perfil de colaborador para receber sobreaviso." }
  ],
  [
    "ONCALL_SHIFT_OVERLAP",
    { status: 409, code: "ONCALL_SHIFT_OVERLAP", message: "Ja existe um sobreaviso no mesmo periodo para este colaborador." }
  ],
  [
    "ONCALL_CONFLICT_WITH_WORK_SHIFT",
    {
      status: 409,
      code: "ONCALL_CONFLICT_WITH_WORK_SHIFT",
      message: "Nao e possivel cadastrar sobreaviso no mesmo horario de um registro de ponto existente."
    }
  ],
  ["ONCALL_SHIFT_NOT_FOUND", { status: 404, code: "ONCALL_SHIFT_NOT_FOUND", message: "Sobreaviso nao encontrado." }],
  ["ONCALL_SHIFT_CANCELLED", { status: 400, code: "ONCALL_SHIFT_CANCELLED", message: "Este sobreaviso ja foi cancelado e nao permite novas acoes." }],
  [
    "ONCALL_ACK_NOT_ALLOWED",
    { status: 403, code: "ONCALL_ACK_NOT_ALLOWED", message: "Somente o colaborador vinculado pode dar ciente neste sobreaviso." }
  ],
  [
    "ONCALL_SHIFT_NOT_ACKNOWLEDGED",
    { status: 400, code: "ONCALL_SHIFT_NOT_ACKNOWLEDGED", message: "O colaborador precisa dar ciente antes de registrar entrada no sobreaviso." }
  ],
  [
    "ONCALL_ENTRY_OUTSIDE_WINDOW",
    { status: 400, code: "ONCALL_ENTRY_OUTSIDE_WINDOW", message: "A data/hora informada esta fora da janela do sobreaviso." }
  ],
  [
    "TIME_ENTRY_ALREADY_LINKED_TO_ONCALL",
    { status: 409, code: "TIME_ENTRY_ALREADY_LINKED_TO_ONCALL", message: "Este registro de ponto ja esta vinculado a outro sobreaviso." }
  ],
  ["CSV_EMPTY", { status: 400, code: "CSV_EMPTY", message: "CSV sem linhas de dados para importacao." }],
  ["CSV_INVALID_HEADER", { status: 400, code: "CSV_INVALID_HEADER", message: "Cabecalho do CSV invalido para importacao de contracheques." }],
  ["CSV_INVALID_ROW", { status: 400, code: "CSV_INVALID_ROW", message: "CSV contem uma linha invalida." }],
  [
    "EMPLOYEE_EMAIL_OR_CPF_REQUIRED",
    { status: 400, code: "EMPLOYEE_EMAIL_OR_CPF_REQUIRED", message: "Informe pelo menos e-mail ou CPF do funcionario." }
  ],
  [
    "EMPLOYEE_USER_NOT_FOUND_BY_CPF",
    {
      status: 404,
      code: "EMPLOYEE_USER_NOT_FOUND_BY_CPF",
      message: "Nenhum usuario encontrado para o CPF informado. Informe e-mail para envio de convite."
    }
  ],
  [
    "INVALID_BACKOFFICE_ROLE",
    {
      status: 400,
      code: "INVALID_BACKOFFICE_ROLE",
      message: "Perfil invalido para usuario de gestao. Use admin, RH, analista ou preposto."
    }
  ],
  [
    "PREPOSTO_PROJECT_REQUIRED",
    {
      status: 400,
      code: "PREPOSTO_PROJECT_REQUIRED",
      message: "Para preposto, selecione a empresa/projeto no painel ou indique o projeto no formulario."
    }
  ],
  [
    "TENANT_HAS_NO_COMPANIES",
    {
      status: 400,
      code: "TENANT_HAS_NO_COMPANIES",
      message: "Nao ha empresas/projetos cadastrados neste assinante."
    }
  ],
  [
    "PREPOSTO_COMPANY_HEADER_REQUIRED",
    {
      status: 400,
      code: "PREPOSTO_COMPANY_HEADER_REQUIRED",
      message:
        "Este utilizador e preposto de varios projetos. Selecione a empresa/projeto no painel ou envie o header X-Tenant-Company-Id."
    }
  ],
  ["USER_INVITE_FAILED", { status: 500, code: "USER_INVITE_FAILED", message: "Nao foi possivel criar/enviar convite para o usuario." }],
  ["INVALID_FILE_BASE64", { status: 400, code: "INVALID_FILE_BASE64", message: "Arquivo do curriculo invalido para upload." }],
  ["SKILL_TAG_CREATION_DISABLED", { status: 400, code: "SKILL_TAG_CREATION_DISABLED", message: "A criacao de novas habilidades esta desativada no momento." }],
  ["DOCUMENT_NOT_FOUND", { status: 404, code: "DOCUMENT_NOT_FOUND", message: "Documento nao encontrado para o assinante selecionado." }],
  ["DOCUMENT_REQUEST_NOT_FOUND", { status: 404, code: "DOCUMENT_REQUEST_NOT_FOUND", message: "Solicitacao de documento nao encontrada." }],
  [
    "SIGNATURE_DOCUMENT_REQUIRES_FILE",
    {
      status: 400,
      code: "SIGNATURE_DOCUMENT_REQUIRES_FILE",
      message: "Envio para assinatura exige um arquivo PDF para o colaborador baixar."
    }
  ],
  ["PAYSLIP_NOT_FOUND", { status: 404, code: "PAYSLIP_NOT_FOUND", message: "Contracheque nao encontrado para o assinante selecionado." }],
  [
    "PAYSLIP_BATCH_NOT_FOUND",
    { status: 404, code: "PAYSLIP_BATCH_NOT_FOUND", message: "Lote de contracheques nao encontrado para o projeto selecionado." }
  ],
  ["FILE_OPEN_URL_FAILED", { status: 500, code: "FILE_OPEN_URL_FAILED", message: "Nao foi possivel gerar URL de visualizacao do arquivo." }],
  [
    "COMPANY_SCOPE_REQUIRED",
    {
      status: 400,
      code: "COMPANY_SCOPE_REQUIRED",
      message: "Selecione a empresa/projeto no painel (cabecalho) ou envie o header X-Tenant-Company-Id."
    }
  ],
  [
    "COMPANY_NOT_IN_TENANT",
    {
      status: 403,
      code: "COMPANY_NOT_IN_TENANT",
      message: "Empresa/projeto nao pertence a este assinante."
    }
  ],
  [
    "EMPLOYEE_COMPANY_NOT_SET",
    { status: 400, code: "EMPLOYEE_COMPANY_NOT_SET", message: "Perfil do colaborador sem empresa/projeto vinculado. Contate o administrador." }
  ],
  [
    "TENANT_COMPANY_NOT_FOUND",
    { status: 404, code: "TENANT_COMPANY_NOT_FOUND", message: "Empresa/projeto nao encontrada para este assinante." }
  ],
  [
    "USER_NOT_IN_COMPANY",
    {
      status: 400,
      code: "USER_NOT_IN_COMPANY",
      message: "O utilizador indicado nao esta vinculado como colaborador desta empresa/projeto."
    }
  ],
  [
    "PREPOSTO_SCOPE_MISMATCH",
    {
      status: 403,
      code: "PREPOSTO_SCOPE_MISMATCH",
      message: "Preposto so pode aceder ao contrato para o qual foi designado."
    }
  ],
  [
    "TENANT_DEFAULT_COMPANY_MISSING",
    {
      status: 500,
      code: "TENANT_DEFAULT_COMPANY_MISSING",
      message: "Nenhuma empresa/projeto padrao no assinante. Aplique migrations ou cadastre uma empresa."
    }
  ],
  [
    "INVALID_COMPANY_NAME",
    { status: 400, code: "INVALID_INPUT", message: "Informe um nome de empresa/projeto valido (minimo 2 caracteres)." }
  ],
  [
    "TENANT_COMPANY_IN_USE",
    {
      status: 409,
      code: "TENANT_COMPANY_IN_USE",
      message: "Nao e possivel excluir: ha dados vinculados a esta empresa/projeto."
    }
  ],
  [
    "TENANT_COMPANY_LAST_ONE",
    {
      status: 400,
      code: "TENANT_COMPANY_LAST_ONE",
      message: "E obrigatorio manter pelo menos uma empresa/projeto no assinante."
    }
  ],
  ["TIME_ENTRY_NOT_FOUND", { status: 404, code: "TIME_ENTRY_NOT_FOUND", message: "Registro de ponto nao encontrado." }],
  ["TIME_ADJUSTMENT_NOT_FOUND", { status: 404, code: "TIME_ADJUSTMENT_NOT_FOUND", message: "Solicitacao de ajuste nao encontrada." }],
  ["TIME_REPORT_CLOSURE_NOT_FOUND", { status: 404, code: "TIME_REPORT_CLOSURE_NOT_FOUND", message: "Relatorio fechado nao encontrado." }],
  [
    "TIME_REPORT_CLOSURES_NOT_MIGRATED",
    {
      status: 500,
      code: "DB_SCHEMA_OUTDATED",
      message: "Schema do banco desatualizado para Arquivos de Ponto. Aplique as migrations mais recentes."
    }
  ],
  ["TIME_ADJUSTMENT_ALREADY_REVIEWED", { status: 400, code: "TIME_ADJUSTMENT_ALREADY_REVIEWED", message: "Esta solicitacao de ajuste ja foi analisada." }],
  [
    "TIME_ADJUSTMENT_OUT_OF_SEQUENCE",
    {
      status: 400,
      code: "TIME_ADJUSTMENT_OUT_OF_SEQUENCE",
      message: "Data/hora solicitada invalida: o ajuste deve respeitar a sequencia do mesmo registro."
    }
  ],
  ["INVALID_DISPLAY_NAME", { status: 400, code: "INVALID_INPUT", message: "Informe um nome de exibicao valido." }],
  [
    "SLUG_GENERATION_FAILED",
    { status: 500, code: "SLUG_GENERATION_FAILED", message: "Nao foi possivel gerar um slug unico para o assinante." }
  ],
  ["INVALID_EMAIL", { status: 400, code: "INVALID_INPUT", message: "E-mail invalido." }],
  ["TENANT_NOT_FOUND", { status: 404, code: "TENANT_NOT_FOUND", message: "Assinante nao encontrado." }],
  [
    "AUTH_USER_NOT_FOUND",
    {
      status: 500,
      code: "AUTH_USER_NOT_FOUND",
      message: "Nao foi possivel carregar os dados da conta. Tente fazer login novamente."
    }
  ],
  [
    "EMAIL_ALREADY_IN_USE",
    {
      status: 409,
      code: "EMAIL_ALREADY_IN_USE",
      message: "Este e-mail ja esta em uso por outra conta. Escolha outro endereco."
    }
  ],
  [
    "CANDIDATE_PROFILE_NOT_FOUND",
    {
      status: 404,
      code: "CANDIDATE_PROFILE_NOT_FOUND",
      message: "Perfil de candidato nao encontrado. Atualize a pagina ou salve seus dados e tente novamente."
    }
  ],
  [
    "AI_PROVIDER_DISABLED",
    {
      status: 503,
      code: "AI_PROVIDER_DISABLED",
      message: "Preenchimento por IA nao esta disponivel no momento. Configure o provedor de IA ou tente mais tarde."
    }
  ],
  [
    "NO_PDF_TEXT",
    {
      status: 400,
      code: "NO_PDF_TEXT",
      message:
        "Nao foi possivel ler o conteudo do arquivo. Envie um PDF com texto selecionavel, outro PDF, ou uma imagem nitida do curriculo."
    }
  ],
  [
    "EMPLOYEE_IMPORT_UNREADABLE_FILE",
    {
      status: 400,
      code: "EMPLOYEE_IMPORT_UNREADABLE_FILE",
      message:
        "Nao foi possivel ler o arquivo. Envie PDF com texto, imagem nitida (JPG/PNG/WEBP), ou planilha CSV/XLS/XLSX com dados."
    }
  ],
  [
    "EMPTY_SPREADSHEET",
    { status: 400, code: "EMPTY_SPREADSHEET", message: "A planilha esta vazia ou sem dados legiveis." }
  ],
  [
    "AI_JSON_PARSE_FAILED",
    { status: 502, code: "AI_JSON_PARSE_FAILED", message: "A IA retornou uma resposta invalida. Tente novamente ou use outro arquivo." }
  ],
  [
    "EMPLOYEE_PREREG_NOT_FOUND",
    { status: 404, code: "EMPLOYEE_PREREG_NOT_FOUND", message: "Pre-cadastro nao encontrado ou fora do escopo da empresa selecionada." }
  ],
  [
    "EMPLOYEE_PREREG_WRONG_STATUS",
    {
      status: 409,
      code: "EMPLOYEE_PREREG_WRONG_STATUS",
      message: "Este pre-cadastro nao esta mais pendente (ja confirmado ou removido)."
    }
  ],
  [
    "EMPLOYEE_PREREG_EMAIL_REQUIRED",
    {
      status: 400,
      code: "EMPLOYEE_PREREG_EMAIL_REQUIRED",
      message: "Informe um e-mail valido no pre-cadastro antes de cadastrar."
    }
  ],
  [
    "EMPLOYEE_PREREG_LINK_IDENTIFIERS_MISSING",
    {
      status: 400,
      code: "EMPLOYEE_PREREG_LINK_IDENTIFIERS_MISSING",
      message: "Para vincular, informe um e-mail valido ou um CPF completo (11 digitos) que exista na base."
    }
  ],
  [
    "EMPLOYEE_PREREG_FULL_NAME_REQUIRED",
    {
      status: 400,
      code: "EMPLOYEE_PREREG_FULL_NAME_REQUIRED",
      message: "Informe o nome completo (minimo 3 caracteres) antes de confirmar."
    }
  ],
  [
    "EMPLOYEE_PREREG_REGISTER_USER_EXISTS",
    {
      status: 409,
      code: "EMPLOYEE_PREREG_REGISTER_USER_EXISTS",
      message: "Ja existe usuario com este e-mail ou CPF. Use a acao Vincular usuario."
    }
  ],
  [
    "EMPLOYEE_PREREG_LINK_USER_MISSING",
    {
      status: 400,
      code: "EMPLOYEE_PREREG_LINK_USER_MISSING",
      message: "Nao ha usuario cadastrado com o e-mail ou CPF informados. Use a acao Cadastrar."
    }
  ],
  [
    "EMPLOYEE_PREREG_BATCH_NOT_FOUND",
    { status: 404, code: "EMPLOYEE_PREREG_BATCH_NOT_FOUND", message: "Lote de importacao nao encontrado." }
  ],
  [
    "EMPLOYEE_EMAIL_REQUIRED_FOR_INVITE",
    {
      status: 400,
      code: "EMPLOYEE_EMAIL_REQUIRED_FOR_INVITE",
      message: "Este utilizador nao tem e-mail na conta de autenticacao; nao e possivel enviar convite ou reset."
    }
  ],
  [
    "EMPLOYEE_RESEND_INVITE_NOT_APPLICABLE",
    {
      status: 400,
      code: "EMPLOYEE_RESEND_INVITE_NOT_APPLICABLE",
      message: "Reenvio de convite apenas para quem ainda nao iniciou sessao pela primeira vez."
    }
  ],
  [
    "EMPLOYEE_ACTION_ONLY",
    {
      status: 400,
      code: "EMPLOYEE_ACTION_ONLY",
      message: "Esta accao aplica-se apenas a colaboradores (perfil employee)."
    }
  ],
  [
    "PASSWORD_RESET_TARGET_NOT_ALLOWED",
    {
      status: 400,
      code: "PASSWORD_RESET_TARGET_NOT_ALLOWED",
      message: "Redefinicao de senha nao disponivel para este perfil de utilizador."
    }
  ],
  [
    "AUTH_EMAIL_DISPATCH_FAILED",
    {
      status: 502,
      code: "AUTH_EMAIL_DISPATCH_FAILED",
      message:
        "Falha ao pedir envio de e-mail ao Supabase Auth. Verifique SMTP/templates no painel Supabase e a variavel WEB_APP_URL (redirect permitido)."
    }
  ]
]);

export function toHttpError(error: unknown): ApiErrorShape {
  if (error instanceof ZodError) {
    return {
      status: 400,
      code: "INVALID_INPUT",
      message: "Payload da requisicao invalido."
    };
  }

  if (error instanceof Error && error.message === "FILE_TOO_LARGE") {
    return {
      status: 400,
      code: "FILE_TOO_LARGE",
      message: pdfFileTooLargeMessage()
    };
  }

  if (error instanceof Error && error.message === "PROFILE_IMAGE_TOO_LARGE") {
    return {
      status: 400,
      code: "PROFILE_IMAGE_TOO_LARGE",
      message: "A imagem excede o limite de 5 MB. Escolha um arquivo menor."
    };
  }

  if (error instanceof Error && knownErrors.has(error.message)) {
    return knownErrors.get(error.message)!;
  }

  if (typeof error === "object" && error !== null && ("message" in error || "code" in error)) {
    const dbError = error as SupabaseLikeError;
    const message = dbError.message?.trim();

    if (dbError.code === "42703") {
      return {
        status: 500,
        code: "DB_SCHEMA_OUTDATED",
        message: "Schema do banco desatualizado. Aplique as ultimas migrations e tente novamente."
      };
    }

    if (message) {
      return {
        status: 500,
        code: "INTERNAL_ERROR",
        message
      };
    }
  }

  return {
    status: 500,
    code: "INTERNAL_ERROR",
    message: "Erro interno inesperado no servidor."
  };
}
