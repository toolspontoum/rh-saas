import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3333),
  WEB_ALLOWED_ORIGINS: z
    .string()
    .default("http://127.0.0.1:3000,http://localhost:3000,http://127.0.0.1:3200,http://localhost:3200"),
  MAX_PDF_UPLOAD_SIZE_BYTES: z.coerce.number().int().positive().default(15 * 1024 * 1024),
  STORAGE_BUCKET_DOCUMENTS: z.string().min(1).default("documents"),
  STORAGE_BUCKET_PAYSLIPS: z.string().min(1).default("payslips"),
  STORAGE_BUCKET_CANDIDATE_RESUMES: z.string().min(1).default("candidate-resumes"),
  STORAGE_BUCKET_CANDIDATE_AVATARS: z.string().min(1).default("candidate-avatars"),
  STORAGE_BUCKET_EMPLOYEE_AVATARS: z.string().min(1).default("employee-avatars"),
  CANDIDATE_CAN_CREATE_SKILL_TAGS: z
    .string()
    .default("true")
    .transform((value) => value.toLowerCase() !== "false"),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().email().optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_PROJECT_REF: z.string().min(1),
  PLATFORM_SUPERADMIN_EMAILS: z
    .string()
    .default("tools@pontoumdigital.com.br")
    .transform((raw) =>
      raw
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    ),
  /** Provedor padrão quando o tenant não define override (openai | gemini | none). */
  AI_PROVIDER_DEFAULT: z.enum(["openai", "gemini", "none"]).default("none"),
  OPENAI_API_KEY: z.string().optional(),
  /** Preferir gpt-4o para visão (PDF escaneado, imagens de certificados); gpt-4o-mini reduz custo só com texto. */
  OPENAI_MODEL: z.string().min(1).default("gpt-4o"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.0-flash"),
  /** Intervalo em ms para processar fila de contracheques IA (0 = desliga apenas o timer; confirmação ainda dispara um tick). */
  AI_PAYSLIP_QUEUE_MS: z.coerce.number().int().min(0).default(15000),
  /** Intervalo em ms para reprocessar candidaturas com análise IA em pending (0 = desliga). */
  AI_RESUME_QUEUE_MS: z.coerce.number().int().min(0).default(25000)
});

export type AppEnv = z.infer<typeof envSchema>;

const rawEnv = {
  ...process.env,
  SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
};

export const env: AppEnv = envSchema.parse(rawEnv);
