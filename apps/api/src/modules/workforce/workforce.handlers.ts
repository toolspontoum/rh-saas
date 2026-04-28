import { z } from "zod";

import {
  acknowledgeOncallShiftSchema,
  createOncallShiftSchema,
  deleteOncallShiftSchema,
  getOncallShiftByIdSchema,
  listOncallShiftEventsSchema,
  listOncallShiftsSchema,
  registerOncallShiftEntrySchema,
  updateOncallShiftSchema
} from "./workforce.oncall-shifts.contracts.js";
import { WorkforceService } from "./workforce.service.js";

const booleanFromQuery = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "sim"].includes(normalized)) return true;
  if (["false", "0", "no", "nao", "não"].includes(normalized)) return false;
  return value;
}, z.boolean());

const listNoticesSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  onlyActive: booleanFromQuery.default(true),
  onlyArchived: booleanFromQuery.default(false)
});

const createNoticeSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  title: z.string().min(3).max(200),
  // `message` vem do RichTextEditor (HTML). 5000 chars é baixo para comunicados reais.
  message: z.string().min(3).max(100000),
  target: z.enum(["all", "employee", "manager"]).default("all"),
  recipientUserIds: z.array(z.string().uuid()).max(500).optional(),
  attachments: z
    .array(
      z.object({
        fileName: z.string().min(1).max(255),
        filePath: z.string().min(1).max(2000),
        mimeType: z.string().min(1).max(120),
        sizeBytes: z.coerce.number().int().positive()
      })
    )
    .max(20)
    .optional()
});

const createNoticeAttachmentUploadIntentSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.coerce.number().int().positive()
});

const createTimeEntrySchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  contract: z.string().max(80).nullable().optional(),
  entryType: z.enum(["clock_in", "lunch_out", "lunch_in", "clock_out"]),
  recordedAt: z.string().datetime(),
  source: z.string().max(30).default("web"),
  note: z.string().max(1000).nullable().optional()
});

const listTimeEntriesSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  targetUserId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

const createAdjustmentSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requestedTime: z.string().min(1).max(20),
  reason: z.string().min(3).max(2000),
  timeEntryId: z.string().uuid().nullable().optional(),
  targetEntryType: z.enum(["clock_in", "lunch_out", "lunch_in", "clock_out"]).nullable().optional(),
  requestedRecordedAt: z.string().datetime().nullable().optional()
});

const listAdjustmentsSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  targetUserId: z.string().uuid().optional(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  mineOnly: booleanFromQuery.default(true),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

const reviewAdjustmentSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  adjustmentId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  reviewNote: z.string().max(1000).optional()
});

const updateTimeEntrySchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  entryId: z.string().uuid(),
  recordedAt: z.string().datetime(),
  reason: z.string().max(1000).nullable().optional()
});

const listTimeEntryChangeLogsSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  entryId: z.string().uuid()
});

const getWorkRuleSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid()
});

const updateWorkRuleSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  dailyWorkMinutes: z.coerce.number().int().min(1).max(1440),
  nightStart: z.string().regex(/^\d{2}:\d{2}$/),
  nightEnd: z.string().regex(/^\d{2}:\d{2}$/)
});

const getReportSummarySchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  targetUserId: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

const closeMonthlyReportSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  targetUserId: z.string().uuid(),
  referenceMonth: z.string().regex(/^\d{4}-\d{2}$/)
});

const listTimeReportClosuresSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  targetUserId: z.string().uuid().optional(),
  referenceMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

const getTimeReportClosureSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  closureId: z.string().uuid()
});

const getPartialMonthReportPdfSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  targetUserId: z.string().uuid(),
  referenceMonth: z.string().regex(/^\d{4}-\d{2}$/).optional()
});

const markNoticeReadSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  noticeId: z.string().uuid()
});

const archiveNoticeSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  noticeId: z.string().uuid()
});

const unarchiveNoticeSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  noticeId: z.string().uuid()
});

const deleteNoticeSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  noticeId: z.string().uuid()
});

const listShiftTemplatesSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid()
});

const createShiftTemplateSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  name: z.string().min(2).max(120),
  dailyWorkMinutes: z.coerce.number().int().min(1).max(1440),
  weeklyWorkMinutes: z.coerce.number().int().min(1).max(10080).nullable().optional(),
  lunchBreakMinutes: z.coerce.number().int().min(0).max(600).default(60),
  overtimePercent: z.coerce.number().min(0).max(300).default(50),
  monthlyWorkMinutes: z.coerce.number().int().min(1).max(60000).default(13200)
});

const updateShiftTemplateSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  templateId: z.string().uuid(),
  name: z.string().min(2).max(120),
  dailyWorkMinutes: z.coerce.number().int().min(1).max(1440),
  weeklyWorkMinutes: z.coerce.number().int().min(1).max(10080).nullable().optional(),
  lunchBreakMinutes: z.coerce.number().int().min(0).max(600).default(60),
  overtimePercent: z.coerce.number().min(0).max(300).default(50),
  monthlyWorkMinutes: z.coerce.number().int().min(1).max(60000).default(13200)
});

const assignShiftTemplateSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  targetUserId: z.string().uuid(),
  shiftTemplateId: z.string().uuid(),
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()
});

const getEmployeeProfileSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  targetUserId: z.string().uuid().optional()
});

const bulkEmployeeProfilesSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  targetUserIds: z.array(z.string().uuid()).min(1).max(250)
});

const upsertEmployeeProfileSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  targetUserId: z.string().uuid().optional(),
  fullName: z.string().max(160).nullable().optional(),
  personalEmail: z.string().email().max(255).nullable().optional(),
  cpf: z.string().max(20).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  department: z.string().max(120).nullable().optional(),
  positionTitle: z.string().max(120).nullable().optional(),
  contractType: z.string().max(80).nullable().optional(),
  admissionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  baseSalary: z.coerce.number().nonnegative().nullable().optional(),
  employeeTags: z.array(z.string().min(1).max(80)).max(40).optional()
});

const createEmployeeProfileImageUploadIntentSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  targetUserId: z.string().uuid().optional(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.coerce.number().int().positive()
});

const confirmEmployeeProfileImageUploadSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  targetUserId: z.string().uuid().optional(),
  fileName: z.string().min(1).max(255),
  filePath: z.string().min(1).max(2000),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.coerce.number().int().positive()
});

const listOnboardingRequirementsSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid()
});

const createOnboardingRequirementSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  title: z.string().min(2).max(200),
  category: z.string().min(1).max(80).default("geral"),
  isRequired: z.boolean().default(true),
  appliesToContract: z.string().max(80).nullable().optional()
});

const listOnboardingSubmissionsSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  targetUserId: z.string().uuid().optional()
});

const submitOnboardingRequirementSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  targetUserId: z.string().uuid().optional(),
  requirementId: z.string().uuid(),
  documentId: z.string().uuid().nullable().optional()
});

const reviewOnboardingSubmissionSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid(),
  submissionId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  reviewNote: z.string().max(1000).nullable().optional()
});

export class WorkforceHandlers {
  constructor(private readonly service: WorkforceService) {}

  async listNotices(input: unknown) {
    const payload = listNoticesSchema.parse(input);
    return this.service.listNotices(payload);
  }

  async createNotice(input: unknown) {
    const payload = createNoticeSchema.parse(input);
    return this.service.createNotice(payload);
  }

  async createNoticeAttachmentUploadIntent(input: unknown) {
    const payload = createNoticeAttachmentUploadIntentSchema.parse(input);
    return this.service.createNoticeAttachmentUploadIntent(payload);
  }

  async createTimeEntry(input: unknown) {
    const payload = createTimeEntrySchema.parse(input);
    return this.service.createTimeEntry(payload);
  }

  async listTimeEntries(input: unknown) {
    const payload = listTimeEntriesSchema.parse(input);
    return this.service.listTimeEntries(payload);
  }

  async createAdjustment(input: unknown) {
    const payload = createAdjustmentSchema.parse(input);
    return this.service.createTimeAdjustmentRequest(payload);
  }

  async listAdjustments(input: unknown) {
    const payload = listAdjustmentsSchema.parse(input);
    return this.service.listTimeAdjustments(payload);
  }

  async reviewAdjustment(input: unknown) {
    const payload = reviewAdjustmentSchema.parse(input);
    return this.service.reviewTimeAdjustment(payload);
  }

  async updateTimeEntry(input: unknown) {
    const payload = updateTimeEntrySchema.parse(input);
    return this.service.adminUpdateTimeEntry(payload);
  }

  async listTimeEntryChangeLogs(input: unknown) {
    const payload = listTimeEntryChangeLogsSchema.parse(input);
    return this.service.listTimeEntryChangeLogs(payload);
  }

  async createOncallShift(input: unknown) {
    const payload = createOncallShiftSchema.parse(input);
    return this.service.createOncallShift(payload);
  }

  async listOncallShifts(input: unknown) {
    const payload = listOncallShiftsSchema.parse(input);
    return this.service.listOncallShifts(payload);
  }

  async getOncallShiftById(input: unknown) {
    const payload = getOncallShiftByIdSchema.parse(input);
    return this.service.getOncallShiftById(payload);
  }

  async updateOncallShift(input: unknown) {
    const payload = updateOncallShiftSchema.parse(input);
    return this.service.updateOncallShift(payload);
  }

  async deleteOncallShift(input: unknown) {
    const payload = deleteOncallShiftSchema.parse(input);
    return this.service.deleteOncallShift(payload);
  }

  async acknowledgeOncallShift(input: unknown) {
    const payload = acknowledgeOncallShiftSchema.parse(input);
    return this.service.acknowledgeOncallShift(payload);
  }

  async registerOncallShiftEntry(input: unknown) {
    const payload = registerOncallShiftEntrySchema.parse(input);
    return this.service.registerOncallShiftEntry(payload);
  }

  async listOncallShiftEvents(input: unknown) {
    const payload = listOncallShiftEventsSchema.parse(input);
    return this.service.listOncallShiftEvents(payload);
  }

  async getWorkRule(input: unknown) {
    const payload = getWorkRuleSchema.parse(input);
    return this.service.getTenantWorkRule(payload);
  }

  async updateWorkRule(input: unknown) {
    const payload = updateWorkRuleSchema.parse(input);
    return this.service.updateTenantWorkRule(payload);
  }

  async getReportSummary(input: unknown) {
    const payload = getReportSummarySchema.parse(input);
    return this.service.getTimeReportSummary(payload);
  }

  async closeMonthlyReport(input: unknown) {
    const payload = closeMonthlyReportSchema.parse(input);
    return this.service.closeMonthlyTimeReport(payload);
  }

  async listTimeReportClosures(input: unknown) {
    const payload = listTimeReportClosuresSchema.parse(input);
    return this.service.listTimeReportClosures(payload);
  }

  async getTimeReportClosure(input: unknown) {
    const payload = getTimeReportClosureSchema.parse(input);
    return this.service.getTimeReportClosure(payload);
  }

  async getTimeReportClosurePdf(input: unknown) {
    const payload = getTimeReportClosureSchema.parse(input);
    return this.service.getTimeReportClosurePdf(payload);
  }

  async getPartialMonthReportPdf(input: unknown) {
    const payload = getPartialMonthReportPdfSchema.parse(input);
    return this.service.getPartialMonthReportPdf(payload);
  }

  async markNoticeRead(input: unknown) {
    const payload = markNoticeReadSchema.parse(input);
    return this.service.markNoticeRead(payload);
  }

  async archiveNotice(input: unknown) {
    const payload = archiveNoticeSchema.parse(input);
    return this.service.archiveNotice(payload);
  }

  async unarchiveNotice(input: unknown) {
    const payload = unarchiveNoticeSchema.parse(input);
    return this.service.unarchiveNotice(payload);
  }

  async deleteNotice(input: unknown) {
    const payload = deleteNoticeSchema.parse(input);
    return this.service.deleteNotice(payload);
  }

  async listShiftTemplates(input: unknown) {
    const payload = listShiftTemplatesSchema.parse(input);
    return this.service.listShiftTemplates(payload);
  }

  async createShiftTemplate(input: unknown) {
    const payload = createShiftTemplateSchema.parse(input);
    return this.service.createShiftTemplate(payload);
  }

  async updateShiftTemplate(input: unknown) {
    const payload = updateShiftTemplateSchema.parse(input);
    return this.service.updateShiftTemplate(payload);
  }

  async assignShiftTemplate(input: unknown) {
    const payload = assignShiftTemplateSchema.parse(input);
    return this.service.assignShiftTemplate(payload);
  }

  async getEmployeeProfile(input: unknown) {
    const payload = getEmployeeProfileSchema.parse(input);
    return this.service.getEmployeeProfile(payload);
  }

  async bulkEmployeeProfiles(input: unknown) {
    const payload = bulkEmployeeProfilesSchema.parse(input);
    return this.service.bulkEmployeeProfiles(payload);
  }

  async upsertEmployeeProfile(input: unknown) {
    const payload = upsertEmployeeProfileSchema.parse(input);
    return this.service.upsertEmployeeProfile(payload);
  }

  async createEmployeeProfileImageUploadIntent(input: unknown) {
    const payload = createEmployeeProfileImageUploadIntentSchema.parse(input);
    return this.service.createEmployeeProfileImageUploadIntent(payload);
  }

  async confirmEmployeeProfileImageUpload(input: unknown) {
    const payload = confirmEmployeeProfileImageUploadSchema.parse(input);
    return this.service.confirmEmployeeProfileImageUpload(payload);
  }

  async listOnboardingRequirements(input: unknown) {
    const payload = listOnboardingRequirementsSchema.parse(input);
    return this.service.listOnboardingRequirements(payload);
  }

  async createOnboardingRequirement(input: unknown) {
    const payload = createOnboardingRequirementSchema.parse(input);
    return this.service.createOnboardingRequirement(payload);
  }

  async listOnboardingSubmissions(input: unknown) {
    const payload = listOnboardingSubmissionsSchema.parse(input);
    return this.service.listOnboardingSubmissions(payload);
  }

  async submitOnboardingRequirement(input: unknown) {
    const payload = submitOnboardingRequirementSchema.parse(input);
    return this.service.submitOnboardingRequirement(payload);
  }

  async reviewOnboardingSubmission(input: unknown) {
    const payload = reviewOnboardingSubmissionSchema.parse(input);
    return this.service.reviewOnboardingSubmission(payload);
  }
}
