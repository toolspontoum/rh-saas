import { CoreAuthTenantService } from "../core-auth-tenant/core-auth-tenant.service.js";
import { randomUUID } from "node:crypto";

import { env } from "../../config/env.js";
import { normalizeSkillList } from "../../lib/skill-tags.js";
import { WorkforceRepository } from "./workforce.repository.js";
import type {
  EmployeeProfile,
  Notice,
  NoticeDetails,
  NoticeRecipient,
  NoticeAttachment,
  OnboardingRequirement,
  OnboardingSubmission,
  OncallEntry,
  OncallShift,
  OncallShiftEvent,
  OncallShiftStatus,
  OncallShiftWithEvents,
  PaginatedResult,
  ShiftAssignment,
  ShiftTemplate,
  TenantWorkRule,
  TimeAdjustmentRequest,
  TimeEntryChangeLog,
  TimeReportClosure,
  TimeReportSummary,
  TimeEntry
} from "./workforce.types.js";

export class WorkforceService {
  constructor(
    private readonly repository: WorkforceRepository,
    private readonly authTenantService: CoreAuthTenantService
  ) {}

  private async resolveListCompanyId(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
  }): Promise<string | null> {
    if (input.companyId) return input.companyId;
    const ctx = await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    const multiCompany = ctx.roles.some((r) => ["owner", "admin", "manager", "analyst"].includes(r));
    if (!multiCompany && ctx.prepostoCompanyId) return ctx.prepostoCompanyId;
    if (multiCompany) return null;
    return this.repository.getTenantUserCompanyId(input.tenantId, input.userId);
  }

  private requireAdminCompany(companyId: string | null | undefined): string {
    if (!companyId) throw new Error("COMPANY_SCOPE_REQUIRED");
    return companyId;
  }

  private async resolveEmployeeCompanyId(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
  }): Promise<string> {
    if (input.companyId) return input.companyId;
    const cid = await this.repository.getTenantUserCompanyId(input.tenantId, input.userId);
    if (!cid) throw new Error("EMPLOYEE_COMPANY_NOT_SET");
    return cid;
  }

  private async resolveWorkRuleCompanyId(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
  }): Promise<string> {
    if (input.companyId) return input.companyId;
    const ctx = await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    if (ctx.prepostoCompanyId) return ctx.prepostoCompanyId;
    const multiCompany = ctx.roles.some((r) => ["owner", "admin", "manager", "analyst"].includes(r));
    if (multiCompany) throw new Error("COMPANY_SCOPE_REQUIRED");
    return this.resolveEmployeeCompanyId(input);
  }

  async listNotices(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    onlyActive?: boolean;
    onlyArchived?: boolean;
  }): Promise<Notice[]> {
    const context = await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    const listCompanyId = await this.resolveListCompanyId(input);
    const notices = await this.repository.listNotices({
      tenantId: input.tenantId,
      companyId: listCompanyId,
      onlyActive: input.onlyActive ?? true,
      onlyArchived: input.onlyArchived ?? false
    });
    const isPrivileged = context.roles.some((role) => ["owner", "admin", "manager", "analyst", "preposto"].includes(role));
    const visibleNotices = isPrivileged
      ? notices
      : notices.filter((notice) => {
          const recipientFilter = notice.recipientUserIds ?? null;
          if (recipientFilter && recipientFilter.length > 0 && !recipientFilter.includes(input.userId)) return false;
          if (notice.target === "all") return true;
          if (notice.target === "employee") {
            return context.roles.some((role) =>
              ["employee", "viewer", "candidate"].includes(role)
            );
          }
          if (notice.target === "manager") return context.roles.includes("manager");
          return true;
        });

    const noticeIds = visibleNotices.map((n) => n.id);
    const attachments = await this.repository.listNoticeAttachments(input.tenantId, noticeIds);
    const attachmentsByNotice = new Map<string, NoticeAttachment[]>();
    for (const attachment of attachments) {
      const group = attachmentsByNotice.get(attachment.noticeId) ?? [];
      group.push(attachment);
      attachmentsByNotice.set(attachment.noticeId, group);
    }

    for (const [noticeId, list] of attachmentsByNotice) {
      for (const item of list) {
        try {
          item.signedUrl = await this.repository.createSignedReadUrl(env.STORAGE_BUCKET_DOCUMENTS, item.filePath);
        } catch {
          item.signedUrl = null;
        }
      }
      attachmentsByNotice.set(noticeId, list);
    }

    const [reads, counts] = await Promise.all([
      this.repository.listNoticeReadsForUser(input.tenantId, input.userId, noticeIds),
      this.repository.listNoticeReadCounts(input.tenantId, noticeIds)
    ]);
    const readById = new Map(reads.map((item) => [item.notice_id, item.read_at]));
    const countById = new Map(counts.map((item) => [item.notice_id, Number(item.count ?? 0)]));
    return visibleNotices.map((notice) => ({
      ...notice,
      attachments: attachmentsByNotice.get(notice.id) ?? [],
      readAt: readById.get(notice.id) ?? null,
      readCount: countById.get(notice.id) ?? 0
    }));
  }

  async getNoticeDetails(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    noticeId: string;
  }): Promise<NoticeDetails> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);

    const companyId = await this.resolveListCompanyId(input);
    const notice = await this.repository.getNoticeById({
      tenantId: input.tenantId,
      companyId,
      noticeId: input.noticeId
    });
    if (!notice) throw new Error("NOTICE_NOT_FOUND");

    const recipientsFromNotice = (notice.recipientUserIds ?? []).filter(Boolean);
    const recipientUserIds =
      recipientsFromNotice.length > 0
        ? Array.from(new Set(recipientsFromNotice))
        : notice.target === "manager"
          ? await this.repository.listActiveTenantUserIdsByRoles({ tenantId: input.tenantId, roles: ["manager"] })
          : notice.target === "employee"
            ? await this.repository.listActiveTenantUserIdsByRoles({
                tenantId: input.tenantId,
                roles: ["employee", "viewer", "candidate"]
              })
            : await this.repository.listActiveTenantUserIdsByRoles({ tenantId: input.tenantId });

    const [attachments, readRows, profiles] = await Promise.all([
      this.repository.listNoticeAttachments(input.tenantId, [notice.id]),
      this.repository.listNoticeReadsForNotice({
        tenantId: input.tenantId,
        noticeId: notice.id,
        userIds: recipientUserIds
      }),
      this.repository.listTenantUserProfilesLite({
        tenantId: input.tenantId,
        companyId,
        userIds: recipientUserIds
      })
    ]);

    for (const item of attachments) {
      try {
        item.signedUrl = await this.repository.createSignedReadUrl(env.STORAGE_BUCKET_DOCUMENTS, item.filePath);
      } catch {
        item.signedUrl = null;
      }
    }

    const readAtByUserId = new Map<string, string>();
    for (const row of readRows) {
      if (row.user_id) readAtByUserId.set(row.user_id, row.read_at);
    }

    const recipients: NoticeRecipient[] = recipientUserIds.map((userId) => {
      const profile = profiles[userId] ?? { fullName: null, email: null };
      return {
        userId,
        fullName: profile.fullName ?? null,
        email: profile.email ?? null,
        readAt: readAtByUserId.get(userId) ?? null
      };
    });

    return {
      ...notice,
      attachments,
      recipients
    };
  }

  async createNotice(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    title: string;
    message: string;
    target: Notice["target"];
    recipientUserIds?: string[];
    attachments?: Array<{
      fileName: string;
      filePath: string;
      mimeType: string;
      sizeBytes: number;
    }>;
  }): Promise<Notice> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
        "analyst",
        "preposto"
      ]);
    const companyId = this.requireAdminCompany(input.companyId);
    const normalizedRecipients = Array.from(new Set((input.recipientUserIds ?? []).filter(Boolean)));
    const attachments = input.attachments ?? [];
    for (const attachment of attachments) {
      if (!attachment.filePath.startsWith(`tenants/${input.tenantId}/notices/`)) {
        throw new Error("INVALID_FILE_PATH");
      }
      await this.repository.checkObjectExists(env.STORAGE_BUCKET_DOCUMENTS, attachment.filePath);
    }

    const notice = await this.repository.createNotice({
      tenantId: input.tenantId,
      companyId,
      createdBy: input.userId,
      title: input.title,
      message: input.message,
      target: input.target,
      recipientUserIds: normalizedRecipients,
      attachments
    });
    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId,
      actorUserId: input.userId,
      action: "workforce.notice.created",
      resourceType: "notice",
      resourceId: notice.id,
      metadata: { target: notice.target }
    });
    return notice;
  }

  async createNoticeAttachmentUploadIntent(input: {
    tenantId: string;
    userId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<{ path: string; token: string; signedUrl: string }> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);

    const normalizedFileName = sanitizeFileName(input.fileName);
    if (input.sizeBytes > env.MAX_PDF_UPLOAD_SIZE_BYTES) {
      throw new Error("FILE_TOO_LARGE");
    }

    const path = `tenants/${input.tenantId}/notices/${input.userId}/${randomUUID()}-${normalizedFileName}`;
    return this.repository.createSignedUploadUrl(env.STORAGE_BUCKET_DOCUMENTS, path);
  }

  async createTimeEntry(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    contract?: string | null;
    entryType: TimeEntry["entryType"];
    recordedAt: string;
    source: string;
    note?: string | null;
  }): Promise<TimeEntry> {
    await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    const companyId = await this.resolveEmployeeCompanyId(input);
    const lastEntry = await this.repository.getLastTimeEntry({
      tenantId: input.tenantId,
      userId: input.userId,
      companyId
    });
    validateTimeEntrySequence(lastEntry?.entryType ?? null, input.entryType);
    return this.repository.createTimeEntry({ ...input, companyId });
  }

  async listTimeEntries(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    targetUserId?: string;
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<TimeEntry>> {
    if (input.targetUserId && input.targetUserId !== input.userId) {
      await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
        "owner",
        "admin",
        "manager",
        "analyst",
        "preposto"
      ]);
    } else {
      await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    }
    const targetUserId = input.targetUserId ?? input.userId;
    let listCompanyId: string | null = input.companyId ?? null;
    if (!listCompanyId && targetUserId === input.userId) {
      listCompanyId = await this.repository.getTenantUserCompanyId(input.tenantId, input.userId);
    }
    return this.repository.listTimeEntries({
      tenantId: input.tenantId,
      companyId: listCompanyId,
      userId: targetUserId,
      page: input.page,
      pageSize: input.pageSize
    });
  }

  async createTimeAdjustmentRequest(input: {
    tenantId: string;
    userId: string;
    targetDate: string;
    requestedTime: string;
    reason: string;
    timeEntryId?: string | null;
    targetEntryType?: TimeEntry["entryType"] | null;
    requestedRecordedAt?: string | null;
  }): Promise<TimeAdjustmentRequest> {
    await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    let originalRecordedAt: string | null = null;
    let targetEntryType = input.targetEntryType ?? null;
    let requestedRecordedAt = input.requestedRecordedAt ?? null;

    if (input.timeEntryId) {
      const entry = await this.repository.getTimeEntryById({
        tenantId: input.tenantId,
        entryId: input.timeEntryId
      });
      if (!entry || entry.userId !== input.userId) {
        throw new Error("TIME_ENTRY_NOT_FOUND");
      }
      originalRecordedAt = entry.recordedAt;
      targetEntryType = entry.entryType;
      if (!requestedRecordedAt && input.requestedTime?.trim()) {
        requestedRecordedAt = toIsoWithFallback(input.targetDate, input.requestedTime);
      }
      if (requestedRecordedAt) {
        await this.assertTimeEntrySequenceBounds({
          tenantId: input.tenantId,
          entry,
          requestedRecordedAt
        });
      }
    }

    const created = await this.repository.createTimeAdjustmentRequest({
      ...input,
      targetEntryType,
      requestedRecordedAt,
      originalRecordedAt
    });

    if (created.timeEntryId && created.requestedRecordedAt) {
      await this.repository.insertTimeEntryChangeLog({
        tenantId: input.tenantId,
        timeEntryId: created.timeEntryId,
        userId: created.userId,
        changedBy: created.userId,
        source: "adjustment_request",
        previousRecordedAt: created.originalRecordedAt ?? created.requestedRecordedAt,
        newRecordedAt: created.requestedRecordedAt,
        reason: created.reason,
        metadata: { adjustmentId: created.id, status: "pending" }
      });
    }

    return created;
  }

  async listTimeAdjustments(input: {
    tenantId: string;
    userId: string;
    targetUserId?: string;
    status?: TimeAdjustmentRequest["status"];
    mineOnly: boolean;
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<TimeAdjustmentRequest>> {
    if (!input.mineOnly) {
      await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
        "owner",
        "admin",
        "manager",
        "analyst",
        "preposto"
      ]);
    } else {
      await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    }
    return this.repository.listTimeAdjustments({
      tenantId: input.tenantId,
      userId: input.mineOnly ? input.userId : input.targetUserId,
      status: input.status,
      page: input.page,
      pageSize: input.pageSize
    });
  }

  async reviewTimeAdjustment(input: {
    tenantId: string;
    userId: string;
    adjustmentId: string;
    status: "approved" | "rejected";
    reviewNote?: string;
  }): Promise<TimeAdjustmentRequest> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
        "analyst",
        "preposto"
      ]);

    const existing = await this.repository.getTimeAdjustmentById({
      tenantId: input.tenantId,
      adjustmentId: input.adjustmentId
    });
    if (!existing) throw new Error("TIME_ADJUSTMENT_NOT_FOUND");
    if (existing.status !== "pending") throw new Error("TIME_ADJUSTMENT_ALREADY_REVIEWED");

    const now = new Date().toISOString();
    const changeLog: Array<Record<string, unknown>> = [...(existing.changeLog ?? [])];

    if (input.status === "approved" && existing.timeEntryId && existing.requestedRecordedAt) {
      const entry = await this.repository.getTimeEntryById({
        tenantId: input.tenantId,
        entryId: existing.timeEntryId
      });
      if (!entry) throw new Error("TIME_ENTRY_NOT_FOUND");
      await this.assertTimeEntrySequenceBounds({
        tenantId: input.tenantId,
        entry,
        requestedRecordedAt: existing.requestedRecordedAt
      });

      await this.repository.updateTimeEntryRecordedAt({
        tenantId: input.tenantId,
        entryId: existing.timeEntryId,
        recordedAt: existing.requestedRecordedAt
      });

      await this.repository.insertTimeEntryChangeLog({
        tenantId: input.tenantId,
        timeEntryId: existing.timeEntryId,
        userId: existing.userId,
        changedBy: input.userId,
        source: "adjustment_approval",
        previousRecordedAt: entry.recordedAt,
        newRecordedAt: existing.requestedRecordedAt,
        reason: existing.reason,
        metadata: { adjustmentId: existing.id }
      });

      changeLog.push({
        at: now,
        action: "approved",
        by: input.userId,
        previousRecordedAt: entry.recordedAt,
        newRecordedAt: existing.requestedRecordedAt
      });
    } else {
      changeLog.push({
        at: now,
        action: "rejected",
        by: input.userId
      });
    }

    const reviewed = await this.repository.reviewTimeAdjustment({
      tenantId: input.tenantId,
      adjustmentId: input.adjustmentId,
      status: input.status,
      reviewedBy: input.userId,
      reviewNote: input.reviewNote ?? null,
      changeLog
    });

    const noticeTitle =
      input.status === "approved" ? "Ajuste de ponto aprovado" : "Ajuste de ponto recusado";
    const noticeMessage =
      input.status === "approved"
        ? "Sua solicitaÃ§Ã£o de ajuste de ponto foi aprovada."
        : `Sua solicitaÃ§Ã£o de ajuste de ponto foi recusada.${input.reviewNote ? ` Motivo: ${input.reviewNote}` : ""}`;
    const noticeCompanyId = await this.repository.getTenantUserCompanyId(input.tenantId, existing.userId);
    if (!noticeCompanyId) throw new Error("EMPLOYEE_COMPANY_NOT_SET");
    const notice = await this.repository.createNotice({
      tenantId: input.tenantId,
      companyId: noticeCompanyId,
      createdBy: input.userId,
      title: noticeTitle,
      message: noticeMessage,
      target: "employee"
    });

    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      actorUserId: input.userId,
      action: "workforce.time_adjustment.reviewed",
      resourceType: "time_adjustment",
      resourceId: reviewed.id,
      metadata: { status: reviewed.status }
    });
    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      actorUserId: input.userId,
      action: "workforce.notice.created",
      resourceType: "notice",
      resourceId: notice.id,
      metadata: { target: notice.target, origin: "time_adjustment_review" }
    });
    return reviewed;
  }

  private async assertTimeEntrySequenceBounds(input: {
    tenantId: string;
    entry: TimeEntry;
    requestedRecordedAt: string;
  }): Promise<void> {
    const requestedMs = new Date(input.requestedRecordedAt).getTime();
    if (!Number.isFinite(requestedMs)) throw new Error("TIME_ADJUSTMENT_OUT_OF_SEQUENCE");

    const adjacent = await this.repository.getAdjacentTimeEntries({
      tenantId: input.tenantId,
      userId: input.entry.userId,
      entryId: input.entry.id,
      recordedAt: input.entry.recordedAt
    });

    if (adjacent.previous) {
      const previousMs = new Date(adjacent.previous.recordedAt).getTime();
      if (requestedMs < previousMs) {
        throw new Error("TIME_ADJUSTMENT_OUT_OF_SEQUENCE");
      }
    }

    if (adjacent.next) {
      const nextMs = new Date(adjacent.next.recordedAt).getTime();
      if (requestedMs > nextMs) {
        throw new Error("TIME_ADJUSTMENT_OUT_OF_SEQUENCE");
      }
    }
  }

  async adminUpdateTimeEntry(input: {
    tenantId: string;
    userId: string;
    entryId: string;
    recordedAt: string;
    reason?: string | null;
  }): Promise<TimeEntry> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
        "analyst",
        "preposto"
      ]);
    const existing = await this.repository.getTimeEntryById({
      tenantId: input.tenantId,
      entryId: input.entryId
    });
    if (!existing) throw new Error("TIME_ENTRY_NOT_FOUND");

    const updated = await this.repository.updateTimeEntryRecordedAt({
      tenantId: input.tenantId,
      entryId: input.entryId,
      recordedAt: input.recordedAt
    });

    await this.repository.insertTimeEntryChangeLog({
      tenantId: input.tenantId,
      timeEntryId: input.entryId,
      userId: existing.userId,
      changedBy: input.userId,
      source: "manual_edit",
      previousRecordedAt: existing.recordedAt,
      newRecordedAt: input.recordedAt,
      reason: input.reason ?? null
    });

    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      actorUserId: input.userId,
      action: "workforce.time_entry.edited",
      resourceType: "time_entry",
      resourceId: input.entryId,
      metadata: {
        previousRecordedAt: existing.recordedAt,
        newRecordedAt: input.recordedAt,
        reason: input.reason ?? null
      }
    });
    return updated;
  }

  async listTimeEntryChangeLogs(input: {
    tenantId: string;
    userId: string;
    entryId: string;
  }): Promise<TimeEntryChangeLog[]> {
    const entry = await this.repository.getTimeEntryById({
      tenantId: input.tenantId,
      entryId: input.entryId
    });
    if (!entry) return [];

    if (entry.userId !== input.userId) {
      await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
        "owner",
        "admin",
        "manager",
        "analyst",
        "preposto"
      ]);
    } else {
      await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    }
    return this.repository.listTimeEntryChangeLogs({
      tenantId: input.tenantId,
      timeEntryId: input.entryId
    });
  }

  private async assertOncallAdminRole(userId: string, tenantId: string): Promise<void> {
    await this.authTenantService.assertUserHasAnyRole(userId, tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);
  }

  private async assertOncallReadAccess(input: {
    tenantId: string;
    userId: string;
    targetUserId: string;
  }): Promise<void> {
    if (input.userId === input.targetUserId) {
      await this.authTenantService.getTenantContext(input.userId, input.tenantId);
      return;
    }
    await this.assertOncallAdminRole(input.userId, input.tenantId);
  }

  async createOncallShift(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    targetUserId: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    note?: string | null;
  }): Promise<OncallShift> {
    await this.assertOncallAdminRole(input.userId, input.tenantId);
    const companyId = this.requireAdminCompany(input.companyId);

    const targetContext = await this.authTenantService.getTenantContext(input.targetUserId, input.tenantId);
    if (!targetContext.roles.includes("employee")) {
      throw new Error("ONCALL_TARGET_NOT_EMPLOYEE");
    }

    const period = buildOncallPeriod({
      scheduledDate: input.scheduledDate,
      startTime: input.startTime,
      endTime: input.endTime
    });

    const overlapping = await this.repository.findOverlappingOncallShift({
      tenantId: input.tenantId,
      companyId,
      userId: input.targetUserId,
      startsAt: period.startsAt,
      endsAt: period.endsAt
    });
    if (overlapping) throw new Error("ONCALL_SHIFT_OVERLAP");

    const entriesInRange = await this.repository.listTimeEntriesInRange({
      tenantId: input.tenantId,
      userId: input.targetUserId,
      companyId,
      from: period.fromDate,
      to: period.toDate
    });
    const hasWorkEntryInWindow = entriesInRange.some((entry) =>
      isIsoWithinRange(entry.recordedAt, period.startsAt, period.endsAt)
    );
    if (hasWorkEntryInWindow) {
      throw new Error("ONCALL_CONFLICT_WITH_WORK_SHIFT");
    }

    const profile = await this.repository.getEmployeeProfile({
      tenantId: input.tenantId,
      userId: input.targetUserId
    });

    const created = await this.repository.createOncallShift({
      tenantId: input.tenantId,
      companyId,
      targetUserId: input.targetUserId,
      scheduledDate: input.scheduledDate,
      startsAt: period.startsAt,
      endsAt: period.endsAt,
      status: "pending_ack",
      note: input.note ?? null,
      employeeFullName: profile?.fullName ?? null,
      employeeEmail: profile?.personalEmail ?? profile?.authEmail ?? null,
      employeeCpf: profile?.cpf ?? null,
      employeePhone: profile?.phone ?? null,
      department: profile?.department ?? null,
      positionTitle: profile?.positionTitle ?? null,
      contractType: profile?.contractType ?? null,
      employeeTags: profile?.employeeTags ?? [],
      createdBy: input.userId,
      updatedBy: input.userId
    });

    await this.repository.createOncallShiftEvent({
      tenantId: input.tenantId,
      oncallShiftId: created.id,
      userId: created.userId,
      actorUserId: input.userId,
      eventType: "created",
      payload: {
        scheduledDate: created.scheduledDate,
        startsAt: created.startsAt,
        endsAt: created.endsAt,
        note: created.note
      }
    });

    await this.repository.createNotice({
      tenantId: input.tenantId,
      companyId: created.companyId,
      createdBy: input.userId,
      title: "Novo sobreaviso cadastrado",
      message: `Um turno de sobreaviso foi cadastrado para ${created.scheduledDate}.`,
      target: "employee",
      recipientUserIds: [created.userId]
    });

    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId: created.companyId,
      actorUserId: input.userId,
      action: "workforce.oncall_shift.created",
      resourceType: "oncall_shift",
      resourceId: created.id,
      metadata: {
        targetUserId: created.userId,
        scheduledDate: created.scheduledDate,
        startsAt: created.startsAt,
        endsAt: created.endsAt
      }
    });

    return created;
  }

  async listOncallShifts(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    targetUserId?: string;
    from?: string;
    to?: string;
    name?: string;
    email?: string;
    cpf?: string;
    department?: string;
    positionTitle?: string;
    contractType?: string;
    status?: OncallShiftStatus;
    tag?: string;
    mineOnly: boolean;
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<OncallShift>> {
    let targetUserId: string | undefined = input.targetUserId;
    if (input.mineOnly) {
      await this.authTenantService.getTenantContext(input.userId, input.tenantId);
      targetUserId = input.userId;
    } else {
      await this.assertOncallAdminRole(input.userId, input.tenantId);
    }

    const listCompanyId = input.mineOnly
      ? await this.repository.getTenantUserCompanyId(input.tenantId, input.userId)
      : await this.resolveListCompanyId(input);

    return this.repository.listOncallShifts({
      tenantId: input.tenantId,
      companyId: listCompanyId,
      targetUserId,
      from: input.from,
      to: input.to,
      name: input.name,
      email: input.email,
      cpf: input.cpf,
      department: input.department,
      positionTitle: input.positionTitle,
      contractType: input.contractType,
      status: input.status,
      tag: input.tag,
      page: input.page,
      pageSize: input.pageSize
    });
  }

  async getOncallShiftById(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    oncallShiftId: string;
  }): Promise<OncallShiftWithEvents> {
    const shift = await this.repository.getOncallShiftById({
      tenantId: input.tenantId,
      companyId: input.companyId,
      oncallShiftId: input.oncallShiftId
    });
    if (!shift) throw new Error("ONCALL_SHIFT_NOT_FOUND");

    await this.assertOncallReadAccess({
      tenantId: input.tenantId,
      userId: input.userId,
      targetUserId: shift.userId
    });

    const detailed = await this.repository.getOncallShiftWithEvents({
      tenantId: input.tenantId,
      companyId: input.companyId,
      oncallShiftId: input.oncallShiftId,
      eventPageSize: 200
    });
    if (!detailed) throw new Error("ONCALL_SHIFT_NOT_FOUND");
    return detailed;
  }

  async updateOncallShift(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    oncallShiftId: string;
    scheduledDate?: string;
    startTime?: string;
    endTime?: string;
    note?: string | null;
  }): Promise<OncallShift> {
    await this.assertOncallAdminRole(input.userId, input.tenantId);
    const existing = await this.repository.getOncallShiftById({
      tenantId: input.tenantId,
      companyId: input.companyId,
      oncallShiftId: input.oncallShiftId
    });
    if (!existing) throw new Error("ONCALL_SHIFT_NOT_FOUND");
    if (existing.status === "cancelled") throw new Error("ONCALL_SHIFT_CANCELLED");

    const nextScheduledDate = input.scheduledDate ?? existing.scheduledDate;
    const nextStartTime = input.startTime ?? extractTimeHHMMSS(existing.startsAt);
    const nextEndTime = input.endTime ?? extractTimeHHMMSS(existing.endsAt);

    const nextPeriod = buildOncallPeriod({
      scheduledDate: nextScheduledDate,
      startTime: nextStartTime,
      endTime: nextEndTime
    });

    const overlapping = await this.repository.findOverlappingOncallShift({
      tenantId: input.tenantId,
      companyId: existing.companyId,
      userId: existing.userId,
      startsAt: nextPeriod.startsAt,
      endsAt: nextPeriod.endsAt,
      excludeOncallShiftId: existing.id
    });
    if (overlapping) throw new Error("ONCALL_SHIFT_OVERLAP");

    const scheduleChanged =
      nextScheduledDate !== existing.scheduledDate ||
      nextPeriod.startsAt !== existing.startsAt ||
      nextPeriod.endsAt !== existing.endsAt;

    if (scheduleChanged && existing.linkedTimeEntryId) {
      await this.repository.setTimeEntryOncallShift({
        tenantId: input.tenantId,
        entryId: existing.linkedTimeEntryId,
        oncallShiftId: null
      });
    }

    const updated = await this.repository.updateOncallShift({
      tenantId: input.tenantId,
      oncallShiftId: existing.id,
      scheduledDate: nextScheduledDate,
      startsAt: nextPeriod.startsAt,
      endsAt: nextPeriod.endsAt,
      note: input.note ?? existing.note,
      status: scheduleChanged ? "pending_ack" : existing.status,
      linkedTimeEntryId: scheduleChanged ? null : existing.linkedTimeEntryId,
      linkedTimeEntryAt: scheduleChanged ? null : existing.linkedTimeEntryAt,
      acknowledgedAt: scheduleChanged ? null : existing.acknowledgedAt,
      acknowledgedByUserId: scheduleChanged ? null : existing.acknowledgedByUserId,
      updatedBy: input.userId
    });

    await this.repository.createOncallShiftEvent({
      tenantId: input.tenantId,
      oncallShiftId: updated.id,
      userId: updated.userId,
      actorUserId: input.userId,
      eventType: "updated",
      payload: {
        before: {
          scheduledDate: existing.scheduledDate,
          startsAt: existing.startsAt,
          endsAt: existing.endsAt,
          status: existing.status
        },
        after: {
          scheduledDate: updated.scheduledDate,
          startsAt: updated.startsAt,
          endsAt: updated.endsAt,
          status: updated.status
        }
      }
    });

    await this.repository.createNotice({
      tenantId: input.tenantId,
      companyId: updated.companyId,
      createdBy: input.userId,
      title: "Sobreaviso atualizado",
      message: scheduleChanged
        ? "Seu sobreaviso foi alterado e requer novo ciente."
        : "Seu sobreaviso foi atualizado.",
      target: "employee",
      recipientUserIds: [updated.userId]
    });

    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId: updated.companyId,
      actorUserId: input.userId,
      action: "workforce.oncall_shift.updated",
      resourceType: "oncall_shift",
      resourceId: updated.id,
      metadata: {
        scheduleChanged
      }
    });

    return updated;
  }

  async deleteOncallShift(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    oncallShiftId: string;
    reason?: string | null;
  }): Promise<{ ok: true }> {
    await this.assertOncallAdminRole(input.userId, input.tenantId);
    const existing = await this.repository.getOncallShiftById({
      tenantId: input.tenantId,
      companyId: input.companyId,
      oncallShiftId: input.oncallShiftId
    });
    if (!existing) throw new Error("ONCALL_SHIFT_NOT_FOUND");

    if (existing.linkedTimeEntryId) {
      await this.repository.setTimeEntryOncallShift({
        tenantId: input.tenantId,
        entryId: existing.linkedTimeEntryId,
        oncallShiftId: null
      });
    }

    await this.repository.deleteOncallShift({
      tenantId: input.tenantId,
      companyId: input.companyId,
      oncallShiftId: input.oncallShiftId
    });

    await this.repository.createNotice({
      tenantId: input.tenantId,
      companyId: existing.companyId,
      createdBy: input.userId,
      title: "Sobreaviso removido",
      message: "Seu turno de sobreaviso foi removido pelo RH/gestao.",
      target: "employee",
      recipientUserIds: [existing.userId]
    });

    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId: existing.companyId,
      actorUserId: input.userId,
      action: "workforce.oncall_shift.deleted",
      resourceType: "oncall_shift",
      resourceId: input.oncallShiftId,
      metadata: {
        reason: input.reason ?? null
      }
    });

    return { ok: true };
  }

  async acknowledgeOncallShift(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    oncallShiftId: string;
  }): Promise<OncallShift> {
    const existing = await this.repository.getOncallShiftById({
      tenantId: input.tenantId,
      companyId: input.companyId,
      oncallShiftId: input.oncallShiftId
    });
    if (!existing) throw new Error("ONCALL_SHIFT_NOT_FOUND");

    if (existing.userId !== input.userId) {
      throw new Error("ONCALL_ACK_NOT_ALLOWED");
    }
    await this.authTenantService.getTenantContext(input.userId, input.tenantId);

    if (existing.status === "cancelled") {
      throw new Error("ONCALL_SHIFT_CANCELLED");
    }

    if (existing.status === "acknowledged" || existing.status === "entry_registered") {
      return existing;
    }

    const acknowledgedAt = new Date().toISOString();
    const updated = await this.repository.updateOncallShift({
      tenantId: input.tenantId,
      oncallShiftId: existing.id,
      status: "acknowledged",
      acknowledgedAt,
      acknowledgedByUserId: input.userId,
      updatedBy: input.userId
    });

    await this.repository.createOncallShiftEvent({
      tenantId: input.tenantId,
      oncallShiftId: updated.id,
      userId: updated.userId,
      actorUserId: input.userId,
      eventType: "acknowledged",
      payload: {
        acknowledgedAt
      }
    });

    await this.repository.createNotice({
      tenantId: input.tenantId,
      companyId: updated.companyId,
      createdBy: input.userId,
      title: "Sobreaviso com ciente do colaborador",
      message: `${updated.employeeFullName ?? "Colaborador"} confirmou ciente do sobreaviso em ${updated.scheduledDate}.`,
      target: "manager"
    });

    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId: updated.companyId,
      actorUserId: input.userId,
      action: "workforce.oncall_shift.acknowledged",
      resourceType: "oncall_shift",
      resourceId: updated.id,
      metadata: {
        acknowledgedAt
      }
    });

    return updated;
  }

  async registerOncallShiftEntry(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    oncallShiftId: string;
    timeEntryId?: string;
    recordedAt?: string;
    source: string;
  }): Promise<OncallShiftWithEvents> {
    const existing = await this.repository.getOncallShiftById({
      tenantId: input.tenantId,
      companyId: input.companyId,
      oncallShiftId: input.oncallShiftId
    });
    if (!existing) throw new Error("ONCALL_SHIFT_NOT_FOUND");

    if (existing.userId !== input.userId) {
      await this.assertOncallAdminRole(input.userId, input.tenantId);
    } else {
      await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    }

    if (existing.status === "cancelled") {
      throw new Error("ONCALL_SHIFT_CANCELLED");
    }
    if (existing.status === "pending_ack") {
      throw new Error("ONCALL_SHIFT_NOT_ACKNOWLEDGED");
    }

    const recordedAt = input.recordedAt ?? new Date().toISOString();
    if (!isIsoWithinRange(recordedAt, existing.startsAt, existing.endsAt)) {
      throw new Error("ONCALL_ENTRY_OUTSIDE_WINDOW");
    }

    let timeEntry: TimeEntry | null = null;
    if (input.timeEntryId) {
      const byId = await this.repository.getTimeEntryById({
        tenantId: input.tenantId,
        entryId: input.timeEntryId
      });
      if (!byId || byId.userId !== existing.userId) {
        throw new Error("TIME_ENTRY_NOT_FOUND");
      }
      if (!isIsoWithinRange(byId.recordedAt, existing.startsAt, existing.endsAt)) {
        throw new Error("ONCALL_ENTRY_OUTSIDE_WINDOW");
      }
      timeEntry = byId;
    } else {
      const period = oncallShiftToDateRange(existing);
      const entries = await this.repository.listTimeEntriesInRange({
        tenantId: input.tenantId,
        userId: existing.userId,
        companyId: existing.companyId,
        from: period.fromDate,
        to: period.toDate
      });
      const inWindow = entries.filter((entry) => isIsoWithinRange(entry.recordedAt, existing.startsAt, existing.endsAt));
      timeEntry =
        inWindow.find((entry) => entry.entryType === "clock_in") ??
        inWindow[0] ??
        null;
    }

    if (timeEntry && timeEntry.oncallShiftId && timeEntry.oncallShiftId !== existing.id) {
      throw new Error("TIME_ENTRY_ALREADY_LINKED_TO_ONCALL");
    }

    if (!timeEntry) {
      const lastEntry = await this.repository.getLastTimeEntry({
        tenantId: input.tenantId,
        userId: existing.userId,
        companyId: existing.companyId
      });
      validateTimeEntrySequence(lastEntry?.entryType ?? null, "clock_in");
      timeEntry = await this.repository.createTimeEntry({
        tenantId: input.tenantId,
        companyId: existing.companyId,
        userId: existing.userId,
        contract: existing.contractType ?? null,
        entryType: "clock_in",
        recordedAt,
        source: input.source,
        note: "Entrada de sobreaviso",
        oncallShiftId: existing.id
      });
    } else if (timeEntry.oncallShiftId !== existing.id) {
      timeEntry = await this.repository.setTimeEntryOncallShift({
        tenantId: input.tenantId,
        entryId: timeEntry.id,
        oncallShiftId: existing.id
      });
    }

    if (existing.linkedTimeEntryId && existing.linkedTimeEntryId !== timeEntry.id) {
      await this.repository.setTimeEntryOncallShift({
        tenantId: input.tenantId,
        entryId: existing.linkedTimeEntryId,
        oncallShiftId: null
      });
    }

    await this.repository.linkOncallShiftToTimeEntry({
      tenantId: input.tenantId,
      oncallShiftId: existing.id,
      timeEntryId: timeEntry.id,
      linkedAt: new Date().toISOString(),
      updatedBy: input.userId
    });

    await this.repository.createOncallShiftEvent({
      tenantId: input.tenantId,
      oncallShiftId: existing.id,
      userId: existing.userId,
      actorUserId: input.userId,
      eventType: "entry_registered",
      payload: {
        timeEntryId: timeEntry.id,
        recordedAt: timeEntry.recordedAt,
        source: input.source
      }
    });

    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      actorUserId: input.userId,
      action: "workforce.oncall_shift.entry_registered",
      resourceType: "oncall_shift",
      resourceId: existing.id,
      metadata: {
        timeEntryId: timeEntry.id,
        recordedAt: timeEntry.recordedAt
      }
    });

    const detailed = await this.repository.getOncallShiftWithEvents({
      tenantId: input.tenantId,
      companyId: input.companyId,
      oncallShiftId: existing.id,
      eventPageSize: 200
    });
    if (!detailed) throw new Error("ONCALL_SHIFT_NOT_FOUND");
    return detailed;
  }

  async listOncallShiftEvents(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    oncallShiftId: string;
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<OncallShiftEvent>> {
    const shift = await this.repository.getOncallShiftById({
      tenantId: input.tenantId,
      companyId: input.companyId,
      oncallShiftId: input.oncallShiftId
    });
    if (!shift) throw new Error("ONCALL_SHIFT_NOT_FOUND");

    await this.assertOncallReadAccess({
      tenantId: input.tenantId,
      userId: input.userId,
      targetUserId: shift.userId
    });

    return this.repository.listOncallShiftEvents({
      tenantId: input.tenantId,
      oncallShiftId: input.oncallShiftId,
      page: input.page,
      pageSize: input.pageSize
    });
  }

  async getTenantWorkRule(input: { tenantId: string; userId: string; companyId?: string | null }): Promise<TenantWorkRule> {
    await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    const companyId = await this.resolveWorkRuleCompanyId(input);
    return this.repository.getOrCreateTenantWorkRule(input.tenantId, companyId);
  }

  async updateTenantWorkRule(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    dailyWorkMinutes: number;
    nightStart: string;
    nightEnd: string;
  }): Promise<TenantWorkRule> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
        "analyst",
        "preposto"
      ]);
    const companyId = this.requireAdminCompany(input.companyId);
    const updated = await this.repository.updateTenantWorkRule({
      tenantId: input.tenantId,
      companyId,
      dailyWorkMinutes: input.dailyWorkMinutes,
      nightStart: input.nightStart,
      nightEnd: input.nightEnd
    });
    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId,
      actorUserId: input.userId,
      action: "workforce.rule.updated",
      resourceType: "tenant_work_rule",
      resourceId: input.tenantId,
      metadata: {
        dailyWorkMinutes: input.dailyWorkMinutes,
        nightStart: input.nightStart,
        nightEnd: input.nightEnd
      }
    });
    return updated;
  }

  async getTimeReportSummary(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    targetUserId?: string;
    from: string;
    to: string;
  }): Promise<TimeReportSummary> {
    const targetUserId = input.targetUserId ?? input.userId;
    if (targetUserId !== input.userId) {
      await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
        "owner",
        "admin",
        "manager",
        "analyst",
        "preposto"
      ]);
    } else {
      await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    }

    const scopeCompanyId =
      targetUserId === input.userId
        ? await this.resolveEmployeeCompanyId({
            tenantId: input.tenantId,
            userId: input.userId,
            companyId: input.companyId
          })
        : this.requireAdminCompany(input.companyId);

    const rule = await this.repository.getOrCreateTenantWorkRule(input.tenantId, scopeCompanyId);
    const [shiftAssignment, employeeProfile] = await Promise.all([
      this.repository.getActiveShiftAssignment({
        tenantId: input.tenantId,
        userId: targetUserId,
        companyId: scopeCompanyId
      }),
      this.repository.getEmployeeProfile({
        tenantId: input.tenantId,
        userId: targetUserId
      })
    ]);

    const effectiveDailyWorkMinutes =
      shiftAssignment?.template.dailyWorkMinutes ?? rule.dailyWorkMinutes;
    const effectiveMonthlyWorkMinutes =
      shiftAssignment?.template.monthlyWorkMinutes ?? 13200;
    const overtimePercent = shiftAssignment?.template.overtimePercent ?? 50;
    const [entries, approvedOncall] = await Promise.all([
      this.repository.listTimeEntriesInRange({
        tenantId: input.tenantId,
        userId: targetUserId,
        companyId: scopeCompanyId,
        from: input.from,
        to: input.to
      }),
      this.repository.listApprovedOncallInRange({
        tenantId: input.tenantId,
        userId: targetUserId,
        companyId: scopeCompanyId,
        from: input.from,
        to: input.to
      })
    ]);

    const workedByDay = buildWorkedMinutesByDay(entries);
    const days = enumerateWeekdays(input.from, input.to);
    const expectedMinutes = days.length * effectiveDailyWorkMinutes;
    const workedMinutes = [...workedByDay.values()].reduce((acc, current) => acc + current, 0);
    const overtimeMinutes = Math.max(0, workedMinutes - expectedMinutes);
    const deficitMinutes = Math.max(0, expectedMinutes - workedMinutes);
    const bankBalanceMinutes = overtimeMinutes - deficitMinutes;

    const nightMinutes = entriesToPairedRanges(entries).reduce(
      (acc, pair) => acc + overlapNightMinutes(pair.start, pair.end, rule.nightStart, rule.nightEnd),
      0
    );
    const oncallMinutes = approvedOncall.reduce((acc, oncall) => {
      return acc + diffMinutesFromTimes(oncall.startTime, oncall.endTime);
    }, 0);

    const hourValue =
      (employeeProfile?.baseSalary ?? 0) > 0
        ? Number(((employeeProfile?.baseSalary ?? 0) / (effectiveMonthlyWorkMinutes / 60)).toFixed(2))
        : 0;
    const overtimeValue = Number(
      (((overtimeMinutes / 60) * hourValue * (1 + overtimePercent / 100))).toFixed(2)
    );
    const deficitValue = Number(((deficitMinutes / 60) * hourValue).toFixed(2));

    return {
      tenantId: input.tenantId,
      userId: targetUserId,
      from: input.from,
      to: input.to,
      expectedMinutes,
      workedMinutes,
      overtimeMinutes,
      deficitMinutes,
      nightMinutes,
      oncallMinutes,
      bankBalanceMinutes,
      hourValue,
      overtimeValue,
      deficitValue,
      shiftTemplateName: shiftAssignment?.template.name ?? null
    };
  }

  async closeMonthlyTimeReport(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    targetUserId: string;
    referenceMonth: string;
  }): Promise<TimeReportClosure> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);
    const companyId = this.requireAdminCompany(input.companyId);
    const { from, to } = getMonthRange(input.referenceMonth);
    const [summary, entries, profile] = await Promise.all([
      this.getTimeReportSummary({
        tenantId: input.tenantId,
        userId: input.userId,
        companyId,
        targetUserId: input.targetUserId,
        from,
        to
      }),
      this.repository.listTimeEntriesInRange({
        tenantId: input.tenantId,
        userId: input.targetUserId,
        companyId,
        from,
        to
      }),
      this.repository.getEmployeeProfile({
        tenantId: input.tenantId,
        userId: input.targetUserId
      })
    ]);
    const created = await this.repository.createTimeReportClosure({
      tenantId: input.tenantId,
      companyId,
      userId: input.targetUserId,
      userName: profile?.fullName ?? null,
      userCpf: profile?.cpf ?? null,
      userEmail: profile?.personalEmail ?? profile?.authEmail ?? null,
      department: profile?.department ?? null,
      positionTitle: profile?.positionTitle ?? null,
      contractType: profile?.contractType ?? null,
      referenceMonth: input.referenceMonth,
      from,
      to,
      summary: summary as unknown as Record<string, unknown>,
      entries: entries.map((entry) => ({ entryType: entry.entryType, recordedAt: entry.recordedAt })),
      closedBy: input.userId
    });
    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId,
      actorUserId: input.userId,
      action: "workforce.time_report.closed",
      resourceType: "time_report_closure",
      resourceId: created.id,
      metadata: { targetUserId: input.targetUserId, referenceMonth: input.referenceMonth }
    });
    return created;
  }

  async listTimeReportClosures(input: {
    tenantId: string;
    userId: string;
    targetUserId?: string;
    referenceMonth?: string;
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<TimeReportClosure>> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);
    return this.repository.listTimeReportClosures({
      tenantId: input.tenantId,
      userId: input.targetUserId,
      referenceMonth: input.referenceMonth,
      page: input.page,
      pageSize: input.pageSize
    });
  }

  async getTimeReportClosure(input: {
    tenantId: string;
    userId: string;
    closureId: string;
  }): Promise<TimeReportClosure> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);
    const closure = await this.repository.getTimeReportClosureById({
      tenantId: input.tenantId,
      closureId: input.closureId
    });
    if (!closure) throw new Error("TIME_REPORT_CLOSURE_NOT_FOUND");
    return closure;
  }

  async getTimeReportClosurePdf(input: {
    tenantId: string;
    userId: string;
    closureId: string;
  }): Promise<{ fileName: string; base64: string }> {
    const closure = await this.getTimeReportClosure(input);
    const rows = groupTimeRowsForReport(
      closure.entries.map((entry, index) => ({
        id: `${closure.id}-${index}`,
        tenantId: closure.tenantId,
        userId: closure.userId,
        contract: null,
        entryType: entry.entryType,
        recordedAt: entry.recordedAt,
        source: "closure_snapshot",
        note: null,
        createdAt: closure.closedAt
      }))
    );
    const targetMinutes = inferDailyTargetMinutes(
      closure.summary.expectedMinutes,
      closure.from,
      closure.to
    );
    const tableLines = buildPartialReportTableLines(rows, targetMinutes);
    const lines = [
      "RELATORIO DE PONTO FECHADO",
      `Mes: ${closure.referenceMonth}`,
      `Colaborador: ${closure.userName ?? closure.userId}`,
      `CPF: ${closure.userCpf ?? "-"}`,
      `Periodo: ${closure.from} a ${closure.to}`,
      "",
      `Minutos esperados: ${closure.summary.expectedMinutes}`,
      `Minutos trabalhados: ${closure.summary.workedMinutes}`,
      `Horas extras (min): ${closure.summary.overtimeMinutes}`,
      `Deficit (min): ${closure.summary.deficitMinutes}`,
      `Saldo banco (min): ${closure.summary.bankBalanceMinutes}`,
      "",
      "Registros:",
      ...tableLines
    ];
    const pdf = buildSimplePdf(lines);
    const userToken = (closure.userName ?? closure.userId).replace(/[^a-zA-Z0-9_-]+/g, "-");
    return {
      fileName: `ponto-fechado-${closure.referenceMonth}-${userToken}.pdf`,
      base64: pdf.toString("base64")
    };
  }

  async getPartialMonthReportPdf(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    targetUserId: string;
    referenceMonth?: string;
  }): Promise<{ fileName: string; base64: string }> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);
    const referenceMonth = input.referenceMonth ?? new Date().toISOString().slice(0, 7);
    const { from, to } = getMonthRange(referenceMonth);
    const scopeCompanyId =
      input.targetUserId === input.userId
        ? await this.resolveEmployeeCompanyId({
            tenantId: input.tenantId,
            userId: input.userId,
            companyId: input.companyId
          })
        : this.requireAdminCompany(input.companyId);
    const [summary, entries, profile, workRule] = await Promise.all([
      this.getTimeReportSummary({
        tenantId: input.tenantId,
        userId: input.userId,
        companyId: input.companyId,
        targetUserId: input.targetUserId,
        from,
        to
      }),
      this.repository.listTimeEntriesInRange({
        tenantId: input.tenantId,
        userId: input.targetUserId,
        companyId: scopeCompanyId,
        from,
        to
      }),
      this.repository.getEmployeeProfile({
        tenantId: input.tenantId,
        userId: input.targetUserId
      }),
      this.repository.getOrCreateTenantWorkRule(input.tenantId, scopeCompanyId)
    ]);
    const rows = groupTimeRowsForReport(entries);
    const targetMinutes = workRule.dailyWorkMinutes;
    const tableLines = buildPartialReportTableLines(rows, targetMinutes);
    const lines = [
      "RELATORIO DE PONTO PARCIAL",
      `Mes: ${referenceMonth}`,
      `Colaborador: ${profile?.fullName ?? input.targetUserId}`,
      `CPF: ${profile?.cpf ?? "-"}`,
      `Periodo: ${from} a ${to}`,
      "",
      `Minutos esperados: ${summary.expectedMinutes}`,
      `Minutos trabalhados: ${summary.workedMinutes}`,
      `Horas extras (min): ${summary.overtimeMinutes}`,
      `Deficit (min): ${summary.deficitMinutes}`,
      `Saldo banco (min): ${summary.bankBalanceMinutes}`,
      "",
      "Registros:",
      ...tableLines
    ];
    const pdf = buildSimplePdf(lines);
    const userToken = (profile?.fullName ?? input.targetUserId).replace(/[^a-zA-Z0-9_-]+/g, "-");
    return {
      fileName: `ponto-parcial-${referenceMonth}-${userToken}.pdf`,
      base64: pdf.toString("base64")
    };
  }

  async markNoticeRead(input: { tenantId: string; userId: string; noticeId: string }): Promise<{ ok: true }> {
    await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    await this.repository.markNoticeRead(input);
    return { ok: true };
  }

  async archiveNotice(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    noticeId: string;
  }): Promise<{ ok: true }> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);
    await this.repository.archiveNotice({
      tenantId: input.tenantId,
      companyId: input.companyId,
      noticeId: input.noticeId
    });
    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId: input.companyId,
      actorUserId: input.userId,
      action: "workforce.notice.archived",
      resourceType: "notice",
      resourceId: input.noticeId,
      metadata: {}
    });
    return { ok: true };
  }

  async unarchiveNotice(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    noticeId: string;
  }): Promise<{ ok: true }> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);
    await this.repository.unarchiveNotice({
      tenantId: input.tenantId,
      companyId: input.companyId,
      noticeId: input.noticeId
    });
    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId: input.companyId,
      actorUserId: input.userId,
      action: "workforce.notice.unarchived",
      resourceType: "notice",
      resourceId: input.noticeId,
      metadata: {}
    });
    return { ok: true };
  }

  async deleteNotice(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    noticeId: string;
  }): Promise<{ ok: true }> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);
    await this.repository.deleteNotice({
      tenantId: input.tenantId,
      companyId: input.companyId,
      noticeId: input.noticeId
    });
    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId: input.companyId,
      actorUserId: input.userId,
      action: "workforce.notice.deleted",
      resourceType: "notice",
      resourceId: input.noticeId,
      metadata: {}
    });
    return { ok: true };
  }

  async listShiftTemplates(input: { tenantId: string; userId: string; companyId?: string | null }): Promise<ShiftTemplate[]> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
        "analyst",
        "preposto"
      ]);
    return this.repository.listShiftTemplates(input.tenantId, await this.resolveListCompanyId(input));
  }

  async createShiftTemplate(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    name: string;
    dailyWorkMinutes: number;
    weeklyWorkMinutes?: number | null;
    lunchBreakMinutes: number;
    overtimePercent: number;
    monthlyWorkMinutes: number;
  }): Promise<ShiftTemplate> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
        "analyst",
        "preposto"
      ]);
    return this.repository.createShiftTemplate({
      tenantId: input.tenantId,
      companyId: this.requireAdminCompany(input.companyId),
      createdBy: input.userId,
      name: input.name,
      dailyWorkMinutes: input.dailyWorkMinutes,
      weeklyWorkMinutes: input.weeklyWorkMinutes ?? null,
      lunchBreakMinutes: input.lunchBreakMinutes,
      overtimePercent: input.overtimePercent,
      monthlyWorkMinutes: input.monthlyWorkMinutes
    });
  }

  async updateShiftTemplate(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    templateId: string;
    name: string;
    dailyWorkMinutes: number;
    weeklyWorkMinutes?: number | null;
    lunchBreakMinutes: number;
    overtimePercent: number;
    monthlyWorkMinutes: number;
  }): Promise<ShiftTemplate> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);
    return this.repository.updateShiftTemplate({
      tenantId: input.tenantId,
      companyId: this.requireAdminCompany(input.companyId),
      templateId: input.templateId,
      name: input.name,
      dailyWorkMinutes: input.dailyWorkMinutes,
      weeklyWorkMinutes: input.weeklyWorkMinutes ?? null,
      lunchBreakMinutes: input.lunchBreakMinutes,
      overtimePercent: input.overtimePercent,
      monthlyWorkMinutes: input.monthlyWorkMinutes
    });
  }

  async assignShiftTemplate(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    targetUserId: string;
    shiftTemplateId: string;
    startsAt: string;
    endsAt?: string | null;
  }): Promise<ShiftAssignment> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
        "analyst",
        "preposto"
      ]);
    return this.repository.assignShiftTemplate({
      tenantId: input.tenantId,
      companyId: this.requireAdminCompany(input.companyId),
      userId: input.targetUserId,
      shiftTemplateId: input.shiftTemplateId,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      createdBy: input.userId
    });
  }

  async getEmployeeProfile(input: { tenantId: string; userId: string; targetUserId?: string }): Promise<EmployeeProfile | null> {
    const targetUserId = input.targetUserId ?? input.userId;
    if (targetUserId !== input.userId) {
      await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
        "owner",
        "admin",
        "manager",
        "analyst",
        "preposto"
      ]);
    } else {
      await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    }
    return this.repository.getEmployeeProfile({
      tenantId: input.tenantId,
      userId: targetUserId
    });
  }

  async bulkEmployeeProfiles(input: {
    tenantId: string;
    companyId?: string | null;
    userId: string;
    targetUserIds: string[];
  }): Promise<{ items: Record<string, { department: string | null; contractType: string | null; positionTitle: string | null }> }> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);
    const ids = Array.from(new Set((input.targetUserIds ?? []).filter(Boolean))).slice(0, 250);
    const items = await this.repository.bulkEmployeeProfilesLite({
      tenantId: input.tenantId,
      companyId: input.companyId ?? null,
      userIds: ids
    });
    return { items };
  }

  async upsertEmployeeProfile(input: {
    tenantId: string;
    companyId?: string | null;
    userId: string;
    targetUserId?: string;
    fullName?: string | null;
    personalEmail?: string | null;
    cpf?: string | null;
    phone?: string | null;
    department?: string | null;
    positionTitle?: string | null;
    contractType?: string | null;
    admissionDate?: string | null;
    baseSalary?: number | null;
    employeeTags?: string[];
  }): Promise<EmployeeProfile> {
    const targetUserId = input.targetUserId ?? input.userId;
    if (targetUserId !== input.userId) {
      await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
        "owner",
        "admin",
        "manager",
        "analyst",
        "preposto"
      ]);
    } else {
      await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    }
    return this.repository.upsertEmployeeProfile({
      tenantId: input.tenantId,
      companyId: input.companyId ?? null,
      userId: targetUserId,
      fullName: input.fullName ?? null,
      personalEmail: input.personalEmail ?? null,
      cpf: input.cpf ?? null,
      phone: input.phone ?? null,
      department: input.department ?? null,
      positionTitle: input.positionTitle ?? null,
      contractType: input.contractType ?? null,
      admissionDate: input.admissionDate ?? null,
      baseSalary: input.baseSalary ?? null,
      employeeTags: normalizeSkillList(input.employeeTags ?? [])
    });
  }

  async createEmployeeProfileImageUploadIntent(input: {
    tenantId: string;
    userId: string;
    targetUserId?: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<{ path: string; token: string; signedUrl: string; expiresIn: number }> {
    const targetUserId = input.targetUserId ?? input.userId;
    if (targetUserId !== input.userId) {
      await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
        "owner",
        "admin",
        "manager",
        "analyst",
        "preposto"
      ]);
    } else {
      await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    }

    validateProfileImageUpload(input.mimeType, input.sizeBytes);
    const normalizedFileName = normalizeImageFileName(input.fileName, input.mimeType);
    const path = `tenants/${input.tenantId}/employees/${targetUserId}/avatar/${randomUUID()}-${normalizedFileName}`;
    const result = await this.repository.createSignedUploadUrl(env.STORAGE_BUCKET_EMPLOYEE_AVATARS, path);
    return {
      ...result,
      expiresIn: 7200
    };
  }

  async confirmEmployeeProfileImageUpload(input: {
    tenantId: string;
    userId: string;
    targetUserId?: string;
    fileName: string;
    filePath: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<EmployeeProfile> {
    const targetUserId = input.targetUserId ?? input.userId;
    if (targetUserId !== input.userId) {
      await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
        "owner",
        "admin",
        "manager",
        "analyst",
        "preposto"
      ]);
    } else {
      await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    }

    validateProfileImageUpload(input.mimeType, input.sizeBytes);
    const expectedPrefix = `tenants/${input.tenantId}/employees/${targetUserId}/avatar/`;
    if (!input.filePath.startsWith(expectedPrefix)) {
      throw new Error("INVALID_FILE_PATH_SCOPE");
    }

    await this.repository.checkObjectExists(env.STORAGE_BUCKET_EMPLOYEE_AVATARS, input.filePath);

    return this.repository.updateEmployeeProfileImage({
      tenantId: input.tenantId,
      userId: targetUserId,
      fileName: normalizeImageFileName(input.fileName, input.mimeType),
      filePath: input.filePath,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes
    });
  }

  async listOnboardingRequirements(input: { tenantId: string; userId: string }): Promise<OnboardingRequirement[]> {
    await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    return this.repository.listOnboardingRequirements(input.tenantId);
  }

  async createOnboardingRequirement(input: {
    tenantId: string;
    userId: string;
    title: string;
    category: string;
    isRequired: boolean;
    appliesToContract?: string | null;
  }): Promise<OnboardingRequirement> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
        "analyst",
        "preposto"
      ]);
    return this.repository.createOnboardingRequirement({
      tenantId: input.tenantId,
      createdBy: input.userId,
      title: input.title,
      category: input.category,
      isRequired: input.isRequired,
      appliesToContract: input.appliesToContract ?? null
    });
  }

  async listOnboardingSubmissions(input: {
    tenantId: string;
    userId: string;
    targetUserId?: string;
  }): Promise<OnboardingSubmission[]> {
    const targetUserId = input.targetUserId ?? input.userId;
    if (targetUserId !== input.userId) {
      await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
        "owner",
        "admin",
        "manager",
        "analyst",
        "preposto"
      ]);
    } else {
      await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    }
    return this.repository.listOnboardingSubmissions({
      tenantId: input.tenantId,
      userId: targetUserId
    });
  }

  async submitOnboardingRequirement(input: {
    tenantId: string;
    userId: string;
    targetUserId?: string;
    requirementId: string;
    documentId?: string | null;
  }): Promise<OnboardingSubmission> {
    const targetUserId = input.targetUserId ?? input.userId;
    if (targetUserId !== input.userId) {
      await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
        "owner",
        "admin",
        "manager",
        "analyst",
        "preposto"
      ]);
    } else {
      await this.authTenantService.getTenantContext(input.userId, input.tenantId);
    }
    return this.repository.upsertOnboardingSubmission({
      tenantId: input.tenantId,
      requirementId: input.requirementId,
      userId: targetUserId,
      documentId: input.documentId ?? null
    });
  }

  async reviewOnboardingSubmission(input: {
    tenantId: string;
    userId: string;
    submissionId: string;
    status: "approved" | "rejected";
    reviewNote?: string | null;
  }): Promise<OnboardingSubmission> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);
    return this.repository.reviewOnboardingSubmission({
      tenantId: input.tenantId,
      submissionId: input.submissionId,
      reviewerUserId: input.userId,
      status: input.status,
      reviewNote: input.reviewNote ?? null
    });
  }
}

const allowedProfileImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxProfileImageSizeBytes = 5 * 1024 * 1024;

function validateProfileImageUpload(mimeType: string, sizeBytes: number): void {
  if (!allowedProfileImageMimeTypes.has(mimeType)) {
    throw new Error("INVALID_FILE_TYPE");
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > maxProfileImageSizeBytes) {
    throw new Error("PROFILE_IMAGE_TOO_LARGE");
  }
}

function normalizeImageFileName(fileName: string, mimeType: string): string {
  const sanitizedBase = fileName
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  return `${sanitizedBase || "avatar"}.${ext}`;
}

function toIsoWithFallback(targetDate: string, requestedTime: string): string {
  const normalizedTime = requestedTime.length === 5 ? `${requestedTime}:00` : requestedTime;
  const candidate = `${targetDate}T${normalizedTime}`;
  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function buildOncallPeriod(input: {
  scheduledDate: string;
  startTime: string;
  endTime: string;
}): { startsAt: string; endsAt: string; fromDate: string; toDate: string } {
  const start = toUtcDate(input.scheduledDate, input.startTime);
  const end = toUtcDate(input.scheduledDate, input.endTime);

  if (end.getTime() <= start.getTime()) {
    end.setUTCDate(end.getUTCDate() + 1);
  }

  return {
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    fromDate: start.toISOString().slice(0, 10),
    toDate: end.toISOString().slice(0, 10)
  };
}

function toUtcDate(dateOnly: string, timeOnly: string): Date {
  const [yearRaw, monthRaw, dayRaw] = dateOnly.split("-");
  const [hourRaw, minuteRaw, secondRaw] = timeOnly.split(":");

  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const second = Number(secondRaw ?? 0);

  const value = new Date(Date.UTC(year, month - 1, day, hour, minute, second, 0));
  if (Number.isNaN(value.getTime())) {
    throw new Error("INVALID_INPUT");
  }
  return value;
}

function extractTimeHHMMSS(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return "00:00:00";
  }
  return parsed.toISOString().slice(11, 19);
}

function isIsoWithinRange(candidateIso: string, startsAtIso: string, endsAtIso: string): boolean {
  const candidate = new Date(candidateIso).getTime();
  const startsAt = new Date(startsAtIso).getTime();
  const endsAt = new Date(endsAtIso).getTime();
  if (!Number.isFinite(candidate) || !Number.isFinite(startsAt) || !Number.isFinite(endsAt)) {
    return false;
  }
  return candidate >= startsAt && candidate <= endsAt;
}

function oncallShiftToDateRange(shift: OncallShift): { fromDate: string; toDate: string } {
  return {
    fromDate: shift.startsAt.slice(0, 10),
    toDate: shift.endsAt.slice(0, 10)
  };
}

function validateTimeEntrySequence(
  lastEntryType: TimeEntry["entryType"] | null,
  nextType: TimeEntry["entryType"]
) {
  const allowedByLast: Record<string, TimeEntry["entryType"][]> = {
    none: ["clock_in"],
    clock_in: ["lunch_out", "clock_out"],
    lunch_out: ["lunch_in"],
    lunch_in: ["clock_out"],
    clock_out: ["clock_in"]
  };
  const key = lastEntryType ?? "none";
  const allowed = allowedByLast[key] ?? [];
  if (!allowed.includes(nextType)) {
    throw new Error("INVALID_TIME_ENTRY_SEQUENCE");
  }
}

function entriesToPairedRanges(entries: TimeEntry[]): Array<{ start: Date; end: Date }> {
  const pairs: Array<{ start: Date; end: Date }> = [];
  let open: Date | null = null;
  for (const entry of entries) {
    const at = new Date(entry.recordedAt);
    if (entry.entryType === "clock_in") {
      open = at;
      continue;
    }
    if (entry.entryType === "clock_out" && open && at > open) {
      pairs.push({ start: open, end: at });
      open = null;
    }
  }
  return pairs;
}

function buildWorkedMinutesByDay(entries: TimeEntry[]): Map<string, number> {
  const byDay = new Map<string, number>();
  for (const pair of entriesToPairedRanges(entries)) {
    const day = pair.start.toISOString().slice(0, 10);
    const minutes = Math.floor((pair.end.getTime() - pair.start.getTime()) / 60000);
    byDay.set(day, (byDay.get(day) ?? 0) + Math.max(0, minutes));
  }
  return byDay;
}

function enumerateWeekdays(from: string, to: string): string[] {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  const days: string[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor = new Date(cursor.getTime() + 86400000)) {
    const dayOfWeek = cursor.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days.push(cursor.toISOString().slice(0, 10));
    }
  }
  return days;
}

function overlapNightMinutes(start: Date, end: Date, nightStart: string, nightEnd: string): number {
  const { hour: nightStartHour, minute: nightStartMinute } = parseTimeParts(nightStart);
  const { hour: nightEndHour, minute: nightEndMinute } = parseTimeParts(nightEnd);
  let total = 0;

  const dayStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const dayEnd = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

  for (let cursor = new Date(dayStart); cursor <= dayEnd; cursor = new Date(cursor.getTime() + 86400000)) {
    const nightAStart = new Date(cursor);
    nightAStart.setUTCHours(0, 0, 0, 0);
    const nightAEnd = new Date(cursor);
    nightAEnd.setUTCHours(nightEndHour, nightEndMinute, 0, 0);

    const nightBStart = new Date(cursor);
    nightBStart.setUTCHours(nightStartHour, nightStartMinute, 0, 0);
    const nightBEnd = new Date(cursor);
    nightBEnd.setUTCHours(23, 59, 59, 999);

    total += overlapMinutes(start, end, nightAStart, nightAEnd);
    total += overlapMinutes(start, end, nightBStart, nightBEnd);
  }

  return total;
}

function overlapMinutes(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): number {
  const start = Math.max(aStart.getTime(), bStart.getTime());
  const end = Math.min(aEnd.getTime(), bEnd.getTime());
  if (end <= start) return 0;
  return Math.floor((end - start) / 60000);
}

function diffMinutesFromTimes(start: string, end: string): number {
  const { hour: sh, minute: sm } = parseTimeParts(start);
  const { hour: eh, minute: em } = parseTimeParts(end);
  const startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes < startMinutes) endMinutes += 24 * 60;
  return Math.max(0, endMinutes - startMinutes);
}

function parseTimeParts(value: string): { hour: number; minute: number } {
  const [hRaw, mRaw] = value.split(":");
  const hour = Number(hRaw ?? 0);
  const minute = Number(mRaw ?? 0);
  return {
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0
  };
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function getMonthRange(referenceMonth: string): { from: string; to: string } {
  const [yearRaw, monthRaw] = referenceMonth.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error("INVALID_REFERENCE_MONTH");
  }
  const from = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-01`;
  const end = new Date(Date.UTC(year, month, 0, 0, 0, 0, 0));
  const to = `${end.getUTCFullYear().toString().padStart(4, "0")}-${(end.getUTCMonth() + 1).toString().padStart(2, "0")}-${end.getUTCDate().toString().padStart(2, "0")}`;
  return { from, to };
}

function buildSimplePdf(lines: string[]): Buffer {
  const safeLines = lines.map((line) =>
    line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
  );
  const content = [
    "BT",
    "/F1 10 Tf",
    "50 790 Td",
    "14 TL",
    ...safeLines.map((line, index) => `${index === 0 ? "" : "T* " }(${line}) Tj`.trim()),
    "ET"
  ].join("\n");
  const contentLength = Buffer.byteLength(content, "utf8");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${contentLength} >> stream\n${content}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Courier >> endobj"
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${obj}\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    const offset = offsets[i] ?? 0;
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

type TimeReportRow = {
  baseDate: string;
  clockIn?: string;
  lunchOut?: string;
  lunchIn?: string;
  clockOut?: string;
};

function groupTimeRowsForReport(entries: TimeEntry[]): TimeReportRow[] {
  const sorted = [...entries].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  const rows: TimeReportRow[] = [];
  let current: TimeReportRow | null = null;
  for (const entry of sorted) {
    if (entry.entryType === "clock_in") {
      if (current) rows.push(current);
      current = { baseDate: entry.recordedAt.slice(0, 10), clockIn: entry.recordedAt };
      continue;
    }
    if (!current) current = { baseDate: entry.recordedAt.slice(0, 10) };
    if (entry.entryType === "lunch_out") current.lunchOut = entry.recordedAt;
    if (entry.entryType === "lunch_in") current.lunchIn = entry.recordedAt;
    if (entry.entryType === "clock_out") {
      current.clockOut = entry.recordedAt;
      rows.push(current);
      current = null;
    }
  }
  if (current) rows.push(current);
  return rows;
}

function buildPartialReportTableLines(rows: TimeReportRow[], targetMinutes: number): string[] {
  const header = ["Data base", "Entrada", "Inicio almoco", "Retorno almoco", "Saida", "Banco horas"];
  const widths = [10, 10, 10, 10, 10, 11];
  const border = `+${widths.map((w) => "-".repeat(w + 2)).join("+")}+`;
  const lines = [border, formatBorderedColumns(header, widths), border];
  for (const row of rows) {
    const worked = workedMinutesForRow(row);
    const balance = worked - targetMinutes;
    const clockIn = splitDateTimeParts(row.clockIn);
    const lunchOut = splitDateTimeParts(row.lunchOut);
    const lunchIn = splitDateTimeParts(row.lunchIn);
    const clockOut = splitDateTimeParts(row.clockOut);
    lines.push(
      formatBorderedColumns(
        [formatDateOnly(row.baseDate), clockIn.date, lunchOut.date, lunchIn.date, clockOut.date, formatBalanceShort(balance)],
        widths
      )
    );
    lines.push(
      formatBorderedColumns(
        ["", clockIn.time, lunchOut.time, lunchIn.time, clockOut.time, ""],
        widths
      )
    );
    lines.push(border);
  }
  if (rows.length === 0) {
    lines.push(formatBorderedColumns(["Sem registros no periodo.", "", "", "", "", ""], widths));
    lines.push(border);
  }
  return lines;
}

function formatFixedColumns(values: string[], widths: number[]): string {
  return values
    .map((value, idx) => {
      const width = widths[idx] ?? 10;
      const safe = value.length > width ? `${value.slice(0, Math.max(0, width - 3))}...` : value;
      return safe.padEnd(width, " ");
    })
    .join(" | ");
}

function formatBorderedColumns(values: string[], widths: number[]): string {
  const inner = values
    .map((value, idx) => {
      const width = widths[idx] ?? 10;
      const safe = value.length > width ? `${value.slice(0, Math.max(0, width - 3))}...` : value;
      return ` ${safe.padEnd(width, " ")} `;
    })
    .join("|");
  return `|${inner}|`;
}

function formatDateOnly(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return "-";
  return `${day}/${month}/${year}`;
}

function formatDateTime(value?: string): string {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  const dd = dt.getDate().toString().padStart(2, "0");
  const mm = (dt.getMonth() + 1).toString().padStart(2, "0");
  const yyyy = dt.getFullYear().toString().padStart(4, "0");
  const hh = dt.getHours().toString().padStart(2, "0");
  const mi = dt.getMinutes().toString().padStart(2, "0");
  const ss = dt.getSeconds().toString().padStart(2, "0");
  return `${dd}/${mm}/${yyyy}, ${hh}:${mi}:${ss}`;
}

function splitDateTimeParts(value?: string): { date: string; time: string } {
  if (!value) return { date: "-", time: "" };
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return { date: "-", time: "" };
  const dd = dt.getDate().toString().padStart(2, "0");
  const mm = (dt.getMonth() + 1).toString().padStart(2, "0");
  const yyyy = dt.getFullYear().toString().padStart(4, "0");
  const hh = dt.getHours().toString().padStart(2, "0");
  const mi = dt.getMinutes().toString().padStart(2, "0");
  const ss = dt.getSeconds().toString().padStart(2, "0");
  return { date: `${dd}/${mm}/${yyyy}`, time: `${hh}:${mi}:${ss}` };
}

function inferDailyTargetMinutes(expectedMinutes: number, from: string, to: string): number {
  const weekdays = countWeekdaysInRange(from, to);
  if (weekdays <= 0) return 480;
  const inferred = Math.round(expectedMinutes / weekdays);
  return Number.isFinite(inferred) && inferred > 0 ? inferred : 480;
}

function countWeekdaysInRange(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  let count = 0;
  for (let cursor = new Date(start); cursor <= end; cursor = new Date(cursor.getTime() + 86400000)) {
    const dayOfWeek = cursor.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count += 1;
  }
  return count;
}

function workedMinutesForRow(row: TimeReportRow): number {
  const gross = diffMinutesIso(row.clockIn, row.clockOut);
  const lunch = diffMinutesIso(row.lunchOut, row.lunchIn);
  return Math.max(0, gross - lunch);
}

function diffMinutesIso(startIso?: string, endIso?: string): number {
  if (!startIso || !endIso) return 0;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.floor((end - start) / 60000);
}

function formatBalanceShort(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60)
    .toString()
    .padStart(2, "0");
  const m = (abs % 60).toString().padStart(2, "0");
  return `${sign}${h}:${m}`;
}


