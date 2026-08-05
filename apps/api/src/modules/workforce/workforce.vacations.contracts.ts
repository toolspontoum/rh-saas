import { z } from "zod";

export const vacationPeriodStatusSchema = z.enum(["active", "cancelled"]);

const booleanFromQuery = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "sim"].includes(normalized)) return true;
  if (["false", "0", "no", "nao", "não"].includes(normalized)) return false;
  return value;
}, z.boolean());

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const optionalQueryString = z.preprocess(emptyToUndefined, z.string().max(255).optional());
const optionalQueryDate = z.preprocess(emptyToUndefined, dateOnlySchema.optional());
const optionalQueryUuid = z.preprocess(emptyToUndefined, z.string().uuid().optional());
const optionalQueryStatus = z.preprocess(emptyToUndefined, vacationPeriodStatusSchema.optional());
const pageFromQuery = z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(1));
const pageSizeFromQuery = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().min(1).max(100).default(20)
);

export const createVacationSchema = z
  .object({
    tenantId: z.string().uuid(),
    companyId: z.string().uuid().nullable().optional(),
    userId: z.string().uuid(),
    targetUserId: z.string().uuid(),
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
    note: z.string().max(2000).nullable().optional(),
    allowTimePunch: z.boolean().optional().default(false)
  })
  .refine((input) => input.endDate >= input.startDate, {
    message: "A data fim deve ser igual ou posterior a data inicio.",
    path: ["endDate"]
  });

export const listVacationsSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  targetUserId: optionalQueryUuid,
  from: optionalQueryDate,
  to: optionalQueryDate,
  name: optionalQueryString,
  email: optionalQueryString,
  cpf: optionalQueryString,
  department: optionalQueryString,
  positionTitle: optionalQueryString,
  contractType: optionalQueryString,
  status: optionalQueryStatus,
  tag: optionalQueryString,
  mineOnly: booleanFromQuery.default(false),
  page: pageFromQuery,
  pageSize: pageSizeFromQuery
});

export const getVacationByIdSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  vacationId: z.string().uuid()
});

export const updateVacationSchema = z
  .object({
    tenantId: z.string().uuid(),
    companyId: z.string().uuid().nullable().optional(),
    userId: z.string().uuid(),
    vacationId: z.string().uuid(),
    startDate: dateOnlySchema.optional(),
    endDate: dateOnlySchema.optional(),
    note: z.string().max(2000).nullable().optional(),
    allowTimePunch: z.boolean().optional()
  })
  .refine(
    (input) =>
      input.startDate !== undefined ||
      input.endDate !== undefined ||
      input.note !== undefined ||
      input.allowTimePunch !== undefined,
    {
      message: "Pelo menos um campo deve ser informado para atualizacao.",
      path: ["vacationId"]
    }
  )
  .superRefine((input, ctx) => {
    if (input.startDate && input.endDate && input.endDate < input.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A data fim deve ser igual ou posterior a data inicio.",
        path: ["endDate"]
      });
    }
  });

export const deleteVacationSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  vacationId: z.string().uuid(),
  reason: z.string().max(1000).nullable().optional()
});

export type CreateVacationInput = z.infer<typeof createVacationSchema>;
export type ListVacationsInput = z.infer<typeof listVacationsSchema>;
export type GetVacationByIdInput = z.infer<typeof getVacationByIdSchema>;
export type UpdateVacationInput = z.infer<typeof updateVacationSchema>;
export type DeleteVacationInput = z.infer<typeof deleteVacationSchema>;
