import { z } from "zod";

export const oncallShiftStatusSchema = z.enum([
  "pending_ack",
  "acknowledged",
  "entry_registered",
  "cancelled"
]);

export const oncallShiftEventTypeSchema = z.enum([
  "created",
  "updated",
  "deleted",
  "acknowledged",
  "entry_registered",
  "entry_linked",
  "entry_unlinked",
  "status_changed",
  "note"
]);

const booleanFromQuery = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "sim"].includes(normalized)) return true;
  if (["false", "0", "no", "nao", "não"].includes(normalized)) return false;
  return value;
}, z.boolean());

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeOnlySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/);

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const optionalQueryString = z.preprocess(emptyToUndefined, z.string().max(255).optional());
const optionalQueryDate = z.preprocess(emptyToUndefined, dateOnlySchema.optional());
const optionalQueryUuid = z.preprocess(emptyToUndefined, z.string().uuid().optional());
const optionalQueryStatus = z.preprocess(emptyToUndefined, oncallShiftStatusSchema.optional());
const pageFromQuery = z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(1));
const pageSizeFromQuery = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().min(1).max(100).default(20)
);

export const createOncallShiftSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  targetUserId: z.string().uuid(),
  scheduledDate: dateOnlySchema,
  startTime: timeOnlySchema,
  endTime: timeOnlySchema,
  note: z.string().max(2000).nullable().optional()
});

export const listOncallShiftsSchema = z.object({
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

export const getOncallShiftByIdSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  oncallShiftId: z.string().uuid()
});

export const updateOncallShiftSchema = z
  .object({
    tenantId: z.string().uuid(),
    companyId: z.string().uuid().nullable().optional(),
    userId: z.string().uuid(),
    oncallShiftId: z.string().uuid(),
    scheduledDate: dateOnlySchema.optional(),
    startTime: timeOnlySchema.optional(),
    endTime: timeOnlySchema.optional(),
    note: z.string().max(2000).nullable().optional()
  })
  .refine(
    (input) =>
      input.scheduledDate !== undefined ||
      input.startTime !== undefined ||
      input.endTime !== undefined ||
      input.note !== undefined,
    {
      message: "Pelo menos um campo deve ser informado para atualização.",
      path: ["oncallShiftId"]
    }
  );

export const deleteOncallShiftSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  oncallShiftId: z.string().uuid(),
  reason: z.string().max(1000).nullable().optional()
});

export const acknowledgeOncallShiftSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  oncallShiftId: z.string().uuid()
});

export const registerOncallShiftEntrySchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  oncallShiftId: z.string().uuid(),
  timeEntryId: z.string().uuid().optional(),
  recordedAt: z.string().datetime().optional(),
  source: z.string().max(30).default("oncall")
});

export const listOncallShiftEventsSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  oncallShiftId: z.string().uuid(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export type CreateOncallShiftInput = z.infer<typeof createOncallShiftSchema>;
export type ListOncallShiftsInput = z.infer<typeof listOncallShiftsSchema>;
export type GetOncallShiftByIdInput = z.infer<typeof getOncallShiftByIdSchema>;
export type UpdateOncallShiftInput = z.infer<typeof updateOncallShiftSchema>;
export type DeleteOncallShiftInput = z.infer<typeof deleteOncallShiftSchema>;
export type AcknowledgeOncallShiftInput = z.infer<typeof acknowledgeOncallShiftSchema>;
export type RegisterOncallShiftEntryInput = z.infer<typeof registerOncallShiftEntrySchema>;
export type ListOncallShiftEventsInput = z.infer<typeof listOncallShiftEventsSchema>;
