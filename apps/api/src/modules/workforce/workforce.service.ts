import { CoreAuthTenantService } from "../core-auth-tenant/core-auth-tenant.service.js";
import { randomUUID } from "node:crypto";

import { env } from "../../config/env.js";
import { normalizeSkillList } from "../../lib/skill-tags.js";
import {
  buildFolhaDePontoPdf,
  buildScheduleDescription,
  civilDateInSaoPaulo,
  groupEntriesToFolhaRows,
  type FolhaPunchRow
} from "./folha-de-ponto-pdf.js";
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
  ShiftAssignmentListItem,
  ShiftTemplate,
  TenantWorkRule,
  TimeAdjustmentRequest,
  TimeEntryChangeLog,
  TimeReportClosure,
  TimeReportSummary,
  TimeEntry,
  VacationPeriod,
  VacationPeriodStatus
} from "./workforce.types.js";

const VACATION_AUTO_ARCHIVE_REASON =
  "Arquivado automaticamente na criação retroativa do registro de férias";

function enumerateInclusiveDates(from: string, to: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${from}T12:00:00.000Z`);
  const end = new Date(`${to}T12:00:00.000Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime()) || cursor > end) return dates;
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function clampDateRangeOverlap(
  startDate: string,
  endDate: string,
  from: string,
  to: string
): { from: string; to: string } | null {
  const overlapFrom = startDate > from ? startDate : from;
  const overlapTo = endDate < to ? endDate : to;
  if (overlapFrom > overlapTo) return null;
  return { from: overlapFrom, to: overlapTo };
}

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

    const audienceCompanyId = notice.companyId;
    const recipientsFromNotice = (notice.recipientUserIds ?? []).filter(Boolean);
    const recipientUserIds =
      recipientsFromNotice.length > 0
        ? Array.from(new Set(recipientsFromNotice))
        : await this.repository.listUserIdsForNoticeAudience({
            tenantId: input.tenantId,
            companyId: audienceCompanyId,
            target: notice.target
          });

    const [attachments, readRows, profiles] = await Promise.all([
      this.repository.listNoticeAttachments(input.tenantId, [notice.id]),
      this.repository.listNoticeReadsForNotice({
        tenantId: input.tenantId,
        noticeId: notice.id,
        userIds: recipientUserIds
      }),
      this.repository.listTenantUserProfilesLite({
        tenantId: input.tenantId,
        companyId: audienceCompanyId,
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

  async createTimeSelfieUploadIntent(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    targetUserId?: string | null;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<{ path: string; token: string; signedUrl: string }> {
    const actorUserId = input.userId;
    const subjectUserId = input.targetUserId?.trim() || actorUserId;

    await this.authTenantService.getTenantContext(actorUserId, input.tenantId);
    if (subjectUserId !== actorUserId) {
      await this.authTenantService.assertUserHasAnyRole(actorUserId, input.tenantId, [
        "owner",
        "admin",
        "manager",
        "analyst",
        "preposto"
      ]);
    }

    const normalizedFileName = sanitizeFileName(input.fileName);
    const mime = (input.mimeType ?? "").trim().toLowerCase();
    if (!mime.startsWith("image/")) throw new Error("INVALID_FILE_TYPE");
    if (input.sizeBytes > 3 * 1024 * 1024) {
      throw new Error("FILE_TOO_LARGE");
    }

    // Armazenar no bucket de documentos para evitar dependência de bucket novo em produção.
    const path = `tenants/${input.tenantId}/time-selfies/${Date.now()}-${subjectUserId}-${randomUUID()}-${normalizedFileName}`;
    return this.repository.createSignedUploadUrl(env.STORAGE_BUCKET_DOCUMENTS, path);
  }

  async createTimeEntry(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    targetUserId?: string | null;
    contract?: string | null;
    entryType: TimeEntry["entryType"];
    recordedAt: string;
    source: string;
    note?: string | null;
  }): Promise<TimeEntry> {
    const actorUserId = input.userId;
    const subjectUserId = input.targetUserId?.trim() || actorUserId;

    await this.authTenantService.getTenantContext(actorUserId, input.tenantId);
    if (subjectUserId !== actorUserId) {
      await this.authTenantService.assertUserHasAnyRole(actorUserId, input.tenantId, [
        "owner",
        "admin",
        "manager",
        "analyst",
        "preposto"
      ]);
    }

    const companyId = await this.resolveEmployeeCompanyId({
      tenantId: input.tenantId,
      userId: subjectUserId,
      companyId: input.companyId ?? null
    });

    const civilDate = civilDateInSaoPaulo(input.recordedAt);
    const blockingVacation = await this.repository.findActiveVacationCoveringDate({
      tenantId: input.tenantId,
      userId: subjectUserId,
      companyId,
      civilDate
    });
    if (blockingVacation && !blockingVacation.allowTimePunch) {
      throw new Error("VACATION_BLOCKS_TIME_ENTRY");
    }

    const lastEntry = await this.repository.getLastTimeEntryBefore({
      tenantId: input.tenantId,
      userId: subjectUserId,
      companyId,
      beforeRecordedAt: input.recordedAt
    });
    validateTimeEntrySequence(lastEntry?.entryType ?? null, input.entryType);
    return this.repository.createTimeEntry({
      tenantId: input.tenantId,
      companyId,
      userId: subjectUserId,
      contract: input.contract ?? null,
      entryType: input.entryType,
      recordedAt: input.recordedAt,
      source: input.source,
      note: input.note ?? null
    });
  }

  async listTimeEntries(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    targetUserId?: string;
    from?: string;
    to?: string;
    archivedMode?: "active" | "archived";
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<TimeEntry>> {
    const archivedMode = input.archivedMode ?? "active";
    if (archivedMode === "archived" || (input.targetUserId && input.targetUserId !== input.userId)) {
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
    if (input.from && input.to) {
      const items = await this.repository.listTimeEntriesInRange({
        tenantId: input.tenantId,
        companyId: listCompanyId,
        userId: targetUserId,
        from: input.from,
        to: input.to,
        archivedMode
      });
      return { items, page: 1, pageSize: items.length };
    }
    return this.repository.listTimeEntries({
      tenantId: input.tenantId,
      companyId: listCompanyId,
      userId: targetUserId,
      page: input.page,
      pageSize: input.pageSize,
      archivedMode
    });
  }

  private async assertCanArchiveTimeEntries(userId: string, tenantId: string): Promise<void> {
    await this.authTenantService.assertUserHasAnyRole(userId, tenantId, [
      "owner",
      "admin",
      "manager",
      "preposto"
    ]);
  }

  async archiveTimeEntries(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    entryIds: string[];
    reason: string;
  }): Promise<{ archivedCount: number; items: TimeEntry[] }> {
    await this.assertCanArchiveTimeEntries(input.userId, input.tenantId);
    const reason = input.reason.trim();
    if (reason.length < 3) throw new Error("TIME_ENTRY_ARCHIVE_REASON_REQUIRED");

    const uniqueIds = Array.from(new Set(input.entryIds));
    if (uniqueIds.length === 0) throw new Error("TIME_ENTRY_ARCHIVE_EMPTY");

    const existing = await this.repository.listTimeEntriesByIds({
      tenantId: input.tenantId,
      entryIds: uniqueIds
    });
    if (existing.length === 0) throw new Error("TIME_ENTRY_NOT_FOUND");
    if (existing.some((e) => e.archivedAt)) throw new Error("TIME_ENTRY_ALREADY_ARCHIVED");
    if (existing.length !== uniqueIds.length) throw new Error("TIME_ENTRY_NOT_FOUND");

    const userIds = new Set(existing.map((e) => e.userId));
    if (userIds.size !== 1) throw new Error("TIME_ENTRY_ARCHIVE_MIXED_USERS");

    const archived = await this.repository.archiveTimeEntries({
      tenantId: input.tenantId,
      entryIds: uniqueIds,
      archivedBy: input.userId,
      reason
    });

    const primaryId = uniqueIds[0]!;
    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      actorUserId: input.userId,
      action: "workforce.time_entry.archived",
      resourceType: "time_entry",
      resourceId: primaryId,
      metadata: {
        entryIds: uniqueIds,
        reason,
        archivedCount: archived.length,
        targetUserId: existing[0]?.userId ?? null
      }
    });

    return { archivedCount: archived.length, items: archived };
  }

  async unarchiveTimeEntries(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    entryIds: string[];
  }): Promise<{ unarchivedCount: number; items: TimeEntry[] }> {
    await this.assertCanArchiveTimeEntries(input.userId, input.tenantId);

    const uniqueIds = Array.from(new Set(input.entryIds));
    if (uniqueIds.length === 0) throw new Error("TIME_ENTRY_ARCHIVE_EMPTY");

    const existing = await this.repository.listTimeEntriesByIds({
      tenantId: input.tenantId,
      entryIds: uniqueIds
    });
    if (existing.length === 0) throw new Error("TIME_ENTRY_NOT_FOUND");
    if (existing.some((e) => !e.archivedAt)) throw new Error("TIME_ENTRY_NOT_ARCHIVED");
    if (existing.length !== uniqueIds.length) throw new Error("TIME_ENTRY_NOT_FOUND");

    const unarchived = await this.repository.unarchiveTimeEntries({
      tenantId: input.tenantId,
      entryIds: uniqueIds
    });

    const primaryId = uniqueIds[0]!;
    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      actorUserId: input.userId,
      action: "workforce.time_entry.unarchived",
      resourceType: "time_entry",
      resourceId: primaryId,
      metadata: {
        entryIds: uniqueIds,
        unarchivedCount: unarchived.length,
        targetUserId: existing[0]?.userId ?? null
      }
    });

    return { unarchivedCount: unarchived.length, items: unarchived };
  }

  async createTimeAdjustmentRequest(input: {
    tenantId: string;
    companyId?: string | null;
    userId: string;
    targetDate: string;
    requestedTime: string;
    reason: string;
    timeEntryId?: string | null;
    targetEntryType?: TimeEntry["entryType"] | null;
    requestedRecordedAt?: string | null;
    isRetroactive?: boolean;
    retroEntries?: Array<{ entryType: TimeEntry["entryType"]; recordedAt: string }>;
  }): Promise<TimeAdjustmentRequest> {
    await this.authTenantService.getTenantContext(input.userId, input.tenantId);

    if (input.isRetroactive) {
      return this.createRetroactivePunchRequestInternal(input);
    }

    let originalRecordedAt: string | null = null;
    let targetEntryType = input.targetEntryType ?? null;
    let requestedRecordedAt = input.requestedRecordedAt ?? null;

    // Resolve a empresa preferindo, nesta ordem:
    //   1. company_id explicito (header X-Tenant-Company-Id, painel)
    //   2. company_id da batida alvo (garante consistencia com time_entries)
    //   3. company_id do perfil do colaborador (resolveEmployeeCompanyId)
    let resolvedCompanyId: string | null = input.companyId ?? null;

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
      if (!resolvedCompanyId && entry.companyId) {
        resolvedCompanyId = entry.companyId;
      }
    }

    if (!resolvedCompanyId) {
      resolvedCompanyId = await this.resolveEmployeeCompanyId({
        tenantId: input.tenantId,
        userId: input.userId,
        companyId: null
      });
    }

    const created = await this.repository.createTimeAdjustmentRequest({
      ...input,
      companyId: resolvedCompanyId,
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

  /**
   * Cria um pedido retroativo (criação de batidas em data passada onde o
   * colaborador ainda não tem registos). Validações:
   *   • `targetDate` no mês anterior ou em dias já passados do mês actual.
   *   • `targetDate` ≤ ontem (não permite hoje nem datas futuras).
   *   • Sem `time_entries` existentes nessa data para o utilizador.
   *   • Sem outro pedido retroativo PENDENTE/APROVADO na mesma data.
   *   • `retroEntries` formam uma sequência válida do ciclo de trabalho
   *     (clock_in → lunch_out → lunch_in → clock_out, em ordem cronológica
   *     dentro do mesmo dia).
   */
  private async createRetroactivePunchRequestInternal(input: {
    tenantId: string;
    companyId?: string | null;
    userId: string;
    targetDate: string;
    requestedTime: string;
    reason: string;
    retroEntries?: Array<{ entryType: TimeEntry["entryType"]; recordedAt: string }>;
  }): Promise<TimeAdjustmentRequest> {
    const entries = (input.retroEntries ?? []).slice();
    if (entries.length === 0) {
      throw new Error("RETROACTIVE_ENTRIES_REQUIRED");
    }

    // Garantir formato YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.targetDate)) {
      throw new Error("RETROACTIVE_TARGET_DATE_INVALID");
    }

    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const targetMidnight = new Date(`${input.targetDate}T00:00:00`);
    if (!Number.isFinite(targetMidnight.getTime())) {
      throw new Error("RETROACTIVE_TARGET_DATE_INVALID");
    }
    const latest = new Date(todayMidnight);
    latest.setDate(latest.getDate() - 1);
    if (targetMidnight.getTime() > latest.getTime()) {
      throw new Error("RETROACTIVE_TARGET_DATE_FUTURE");
    }

    // Janela: dia 1 do mês anterior até ontem (dias já passados do mês actual).
    const earliest = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    if (targetMidnight.getTime() < earliest.getTime() || targetMidnight.getTime() > latest.getTime()) {
      throw new Error("RETROACTIVE_TARGET_DATE_OUT_OF_WINDOW");
    }

    // Validar que cada entrada cai dentro da janela do dia civil indicado.
    // Tolerância de ±24h no UTC para acomodar diferenças de fuso entre o
    // browser do utilizador e o servidor (ex.: Brasil GMT-3 grava 22:00 local
    // como 01:00Z do dia seguinte).
    const targetMs = targetMidnight.getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    for (const e of entries) {
      const ms = new Date(e.recordedAt).getTime();
      if (!Number.isFinite(ms)) throw new Error("RETROACTIVE_ENTRY_DATE_INVALID");
      const delta = ms - targetMs;
      if (delta < -dayMs || delta > 2 * dayMs) {
        throw new Error("RETROACTIVE_ENTRY_OUT_OF_TARGET_DATE");
      }
    }

    // Validar ordem cronológica e sequência de transições válidas.
    entries.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
    let last: TimeEntry["entryType"] | null = null;
    for (const e of entries) {
      validateTimeEntrySequence(last, e.entryType);
      last = e.entryType;
    }

    const resolvedCompanyId = await this.resolveEmployeeCompanyId({
      tenantId: input.tenantId,
      userId: input.userId,
      companyId: input.companyId ?? null
    });

    // Bloquear se já existirem batidas reais na mesma data civil.
    const existing = await this.repository.listTimeEntriesOnCivilDate({
      tenantId: input.tenantId,
      userId: input.userId,
      companyId: resolvedCompanyId,
      civilDate: input.targetDate
    });
    if (existing.length > 0) {
      throw new Error("RETROACTIVE_TARGET_DATE_HAS_ENTRIES");
    }

    // Bloquear se já existir outro pedido retroativo activo (pendente/aprovado).
    const existingRequests = await this.repository.listRetroactiveRequestsByDateRange({
      tenantId: input.tenantId,
      userId: input.userId,
      fromDate: input.targetDate,
      toDate: input.targetDate
    });
    if (existingRequests.some((r) => r.status === "pending" || r.status === "approved")) {
      throw new Error("RETROACTIVE_REQUEST_ALREADY_EXISTS");
    }

    const created = await this.repository.createTimeAdjustmentRequest({
      tenantId: input.tenantId,
      companyId: resolvedCompanyId,
      userId: input.userId,
      targetDate: input.targetDate,
      requestedTime: entries[0]!.recordedAt.slice(11, 16),
      reason: input.reason,
      timeEntryId: null,
      targetEntryType: entries[0]!.entryType,
      requestedRecordedAt: entries[0]!.recordedAt,
      originalRecordedAt: null,
      isRetroactive: true,
      retroEntries: entries
    });

    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      actorUserId: input.userId,
      action: "workforce.time_adjustment.retroactive_requested",
      resourceType: "time_adjustment",
      resourceId: created.id,
      metadata: {
        targetDate: created.targetDate,
        retroEntries: entries
      }
    });

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
    const createdEntryIds: string[] = [];

    if (input.status === "approved" && existing.isRetroactive) {
      // Aprovação de pedido retroativo: cria todas as batidas previstas
      // em `retro_entries`, em ordem cronológica. A trigger SQL valida a
      // sequência por (tenant, user) — defesa em profundidade.
      if (!existing.retroEntries || existing.retroEntries.length === 0) {
        throw new Error("RETROACTIVE_ENTRIES_REQUIRED");
      }
      const entryCompanyId =
        existing.companyId ??
        (await this.resolveEmployeeCompanyId({
          tenantId: input.tenantId,
          userId: existing.userId,
          companyId: null
        }));

      // Garante que ainda não há batidas reais no dia (defesa contra criações
      // manuais entre o pedido e a aprovação), usando a mesma empresa do pedido.
      const existingDay = await this.repository.listTimeEntriesOnCivilDate({
        tenantId: input.tenantId,
        userId: existing.userId,
        companyId: entryCompanyId,
        civilDate: existing.targetDate
      });
      if (existingDay.length > 0) {
        throw new Error("RETROACTIVE_TARGET_DATE_HAS_ENTRIES");
      }

      const sorted = [...existing.retroEntries].sort(
        (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
      );

      for (const e of sorted) {
        const created = await this.repository.createTimeEntry({
          tenantId: input.tenantId,
          companyId: entryCompanyId,
          userId: existing.userId,
          contract: null,
          entryType: e.entryType,
          recordedAt: e.recordedAt,
          source: "retroactive_approval",
          note: existing.reason
        });
        createdEntryIds.push(created.id);

        await this.repository.insertTimeEntryChangeLog({
          tenantId: input.tenantId,
          timeEntryId: created.id,
          userId: existing.userId,
          changedBy: input.userId,
          source: "retroactive_approval",
          previousRecordedAt: e.recordedAt,
          newRecordedAt: e.recordedAt,
          reason: existing.reason,
          metadata: { adjustmentId: existing.id, retroactive: true }
        });
      }

      await this.repository.setRetroactiveCreatedTimeEntryIds({
        tenantId: input.tenantId,
        adjustmentId: existing.id,
        timeEntryIds: createdEntryIds
      });

      changeLog.push({
        at: now,
        action: "approved",
        by: input.userId,
        retroactive: true,
        createdTimeEntryIds: createdEntryIds
      });
    } else if (
      input.status === "approved" &&
      existing.timeEntryId &&
      existing.requestedRecordedAt
    ) {
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

    const isRetro = existing.isRetroactive;
    const noticeTitle = isRetro
      ? input.status === "approved"
        ? "Registro de ponto retroativo aprovado"
        : "Registro de ponto retroativo recusado"
      : input.status === "approved"
        ? "Ajuste de ponto aprovado"
        : "Ajuste de ponto recusado";
    const noticeMessage = isRetro
      ? input.status === "approved"
        ? `Sua solicitação de registro de ponto retroativo (${existing.targetDate}) foi aprovada.`
        : `Sua solicitação de registro de ponto retroativo (${existing.targetDate}) foi recusada.${input.reviewNote ? ` Motivo: ${input.reviewNote}` : ""}`
      : input.status === "approved"
        ? "Sua solicitação de ajuste de ponto foi aprovada."
        : `Sua solicitação de ajuste de ponto foi recusada.${input.reviewNote ? ` Motivo: ${input.reviewNote}` : ""}`;
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
      action: isRetro
        ? "workforce.time_adjustment.retroactive_reviewed"
        : "workforce.time_adjustment.reviewed",
      resourceType: "time_adjustment",
      resourceId: reviewed.id,
      metadata: {
        status: reviewed.status,
        retroactive: isRetro,
        createdTimeEntryIds: createdEntryIds
      }
    });
    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      actorUserId: input.userId,
      action: "workforce.notice.created",
      resourceType: "notice",
      resourceId: notice.id,
      metadata: {
        target: notice.target,
        origin: isRetro ? "time_retroactive_review" : "time_adjustment_review"
      }
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
    if (existing.archivedAt) throw new Error("TIME_ENTRY_ARCHIVED");

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
      employeeEmail: profile?.authEmail ?? profile?.personalEmail ?? null,
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

  private async assertVacationAdminRole(userId: string, tenantId: string): Promise<void> {
    await this.authTenantService.assertUserHasAnyRole(userId, tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);
  }

  private async assertVacationReadAccess(input: {
    tenantId: string;
    userId: string;
    targetUserId: string;
  }): Promise<void> {
    if (input.userId === input.targetUserId) {
      await this.authTenantService.getTenantContext(input.userId, input.tenantId);
      return;
    }
    await this.assertVacationAdminRole(input.userId, input.tenantId);
  }

  private async archiveEntriesInDateRangeForVacation(input: {
    tenantId: string;
    actorUserId: string;
    companyId: string;
    targetUserId: string;
    startDate: string;
    endDate: string;
  }): Promise<number> {
    const entries = await this.repository.listTimeEntriesInRange({
      tenantId: input.tenantId,
      userId: input.targetUserId,
      companyId: input.companyId,
      from: input.startDate,
      to: input.endDate,
      archivedMode: "active"
    });
    if (entries.length === 0) return 0;

    const ids = entries.map((e) => e.id);
    let archivedCount = 0;
    for (let i = 0; i < ids.length; i += 20) {
      const batch = ids.slice(i, i + 20);
      const archived = await this.repository.archiveTimeEntries({
        tenantId: input.tenantId,
        entryIds: batch,
        archivedBy: input.actorUserId,
        reason: VACATION_AUTO_ARCHIVE_REASON
      });
      archivedCount += archived.length;
    }

    if (archivedCount > 0) {
      await this.repository.insertAuditLog({
        tenantId: input.tenantId,
        companyId: input.companyId,
        actorUserId: input.actorUserId,
        action: "workforce.time_entry.archived",
        resourceType: "time_entry",
        resourceId: ids[0]!,
        metadata: {
          entryIds: ids,
          reason: VACATION_AUTO_ARCHIVE_REASON,
          archivedCount,
          targetUserId: input.targetUserId,
          source: "vacation_retroactive"
        }
      });
    }
    return archivedCount;
  }

  private mergeVacationDayLabels(
    rows: FolhaPunchRow[],
    vacations: VacationPeriod[],
    from: string,
    to: string
  ): FolhaPunchRow[] {
    const byDate = new Map<string, FolhaPunchRow>();
    for (const row of rows) {
      const prev = byDate.get(row.baseDate);
      if (!prev) {
        byDate.set(row.baseDate, { ...row });
        continue;
      }
      byDate.set(row.baseDate, {
        baseDate: row.baseDate,
        clockIn: prev.clockIn ?? row.clockIn,
        lunchOut: prev.lunchOut ?? row.lunchOut,
        lunchIn: prev.lunchIn ?? row.lunchIn,
        clockOut: prev.clockOut ?? row.clockOut,
        dayLabel: prev.dayLabel ?? row.dayLabel
      });
    }

    for (const vacation of vacations) {
      const overlap = clampDateRangeOverlap(vacation.startDate, vacation.endDate, from, to);
      if (!overlap) continue;
      for (const date of enumerateInclusiveDates(overlap.from, overlap.to)) {
        const existing = byDate.get(date);
        const hasMarks = Boolean(
          existing && (existing.clockIn || existing.lunchOut || existing.lunchIn || existing.clockOut)
        );
        if (hasMarks) continue;
        byDate.set(date, { baseDate: date, dayLabel: "Férias" });
      }
    }

    return Array.from(byDate.values()).sort((a, b) => a.baseDate.localeCompare(b.baseDate));
  }

  async createVacation(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    targetUserId: string;
    startDate: string;
    endDate: string;
    note?: string | null;
    allowTimePunch?: boolean;
  }): Promise<VacationPeriod> {
    await this.assertVacationAdminRole(input.userId, input.tenantId);
    const companyId = this.requireAdminCompany(input.companyId);

    if (input.endDate < input.startDate) throw new Error("VACATION_INVALID_DATE_RANGE");

    const targetContext = await this.authTenantService.getTenantContext(input.targetUserId, input.tenantId);
    if (!targetContext.roles.includes("employee")) {
      throw new Error("VACATION_TARGET_NOT_EMPLOYEE");
    }

    const overlapping = await this.repository.findOverlappingVacationPeriod({
      tenantId: input.tenantId,
      companyId,
      userId: input.targetUserId,
      startDate: input.startDate,
      endDate: input.endDate
    });
    if (overlapping) throw new Error("VACATION_PERIOD_OVERLAP");

    await this.archiveEntriesInDateRangeForVacation({
      tenantId: input.tenantId,
      actorUserId: input.userId,
      companyId,
      targetUserId: input.targetUserId,
      startDate: input.startDate,
      endDate: input.endDate
    });

    const profile = await this.repository.getEmployeeProfile({
      tenantId: input.tenantId,
      userId: input.targetUserId
    });

    const created = await this.repository.createVacationPeriod({
      tenantId: input.tenantId,
      companyId,
      targetUserId: input.targetUserId,
      startDate: input.startDate,
      endDate: input.endDate,
      allowTimePunch: input.allowTimePunch ?? false,
      status: "active",
      note: input.note ?? null,
      employeeFullName: profile?.fullName ?? null,
      employeeEmail: profile?.authEmail ?? profile?.personalEmail ?? null,
      employeeCpf: profile?.cpf ?? null,
      employeePhone: profile?.phone ?? null,
      department: profile?.department ?? null,
      positionTitle: profile?.positionTitle ?? null,
      contractType: profile?.contractType ?? null,
      employeeTags: profile?.employeeTags ?? [],
      createdBy: input.userId,
      updatedBy: input.userId
    });

    await this.repository.createNotice({
      tenantId: input.tenantId,
      companyId: created.companyId,
      createdBy: input.userId,
      title: "Férias cadastradas",
      message: `Foi cadastrado um período de férias de ${created.startDate} a ${created.endDate}.`,
      target: "employee",
      recipientUserIds: [created.userId]
    });

    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId: created.companyId,
      actorUserId: input.userId,
      action: "workforce.vacation.created",
      resourceType: "vacation_period",
      resourceId: created.id,
      metadata: {
        targetUserId: created.userId,
        startDate: created.startDate,
        endDate: created.endDate,
        allowTimePunch: created.allowTimePunch
      }
    });

    return created;
  }

  async listVacations(input: {
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
    status?: VacationPeriodStatus;
    tag?: string;
    mineOnly: boolean;
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<VacationPeriod>> {
    let targetUserId: string | undefined = input.targetUserId;
    if (input.mineOnly) {
      await this.authTenantService.getTenantContext(input.userId, input.tenantId);
      targetUserId = input.userId;
    } else {
      await this.assertVacationAdminRole(input.userId, input.tenantId);
    }

    const listCompanyId = input.mineOnly
      ? await this.repository.getTenantUserCompanyId(input.tenantId, input.userId)
      : await this.resolveListCompanyId(input);

    return this.repository.listVacationPeriods({
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

  async getVacationById(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    vacationId: string;
  }): Promise<VacationPeriod> {
    const vacation = await this.repository.getVacationPeriodById({
      tenantId: input.tenantId,
      companyId: input.companyId,
      vacationId: input.vacationId
    });
    if (!vacation) throw new Error("VACATION_PERIOD_NOT_FOUND");

    await this.assertVacationReadAccess({
      tenantId: input.tenantId,
      userId: input.userId,
      targetUserId: vacation.userId
    });

    return vacation;
  }

  async updateVacation(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    vacationId: string;
    startDate?: string;
    endDate?: string;
    note?: string | null;
    allowTimePunch?: boolean;
  }): Promise<VacationPeriod> {
    await this.assertVacationAdminRole(input.userId, input.tenantId);

    const existing = await this.repository.getVacationPeriodById({
      tenantId: input.tenantId,
      companyId: input.companyId,
      vacationId: input.vacationId
    });
    if (!existing) throw new Error("VACATION_PERIOD_NOT_FOUND");
    if (existing.status === "cancelled") throw new Error("VACATION_PERIOD_CANCELLED");

    const nextStart = input.startDate ?? existing.startDate;
    const nextEnd = input.endDate ?? existing.endDate;
    if (nextEnd < nextStart) throw new Error("VACATION_INVALID_DATE_RANGE");

    const overlapping = await this.repository.findOverlappingVacationPeriod({
      tenantId: input.tenantId,
      companyId: existing.companyId,
      userId: existing.userId,
      startDate: nextStart,
      endDate: nextEnd,
      excludeVacationId: existing.id
    });
    if (overlapping) throw new Error("VACATION_PERIOD_OVERLAP");

    // Arquiva batidas ativas no intervalo atualizado (idempotente se já estiverem arquivadas).
    await this.archiveEntriesInDateRangeForVacation({
      tenantId: input.tenantId,
      actorUserId: input.userId,
      companyId: existing.companyId,
      targetUserId: existing.userId,
      startDate: nextStart,
      endDate: nextEnd
    });

    const updated = await this.repository.updateVacationPeriod({
      tenantId: input.tenantId,
      vacationId: existing.id,
      startDate: input.startDate,
      endDate: input.endDate,
      note: input.note,
      allowTimePunch: input.allowTimePunch,
      updatedBy: input.userId
    });

    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId: updated.companyId,
      actorUserId: input.userId,
      action: "workforce.vacation.updated",
      resourceType: "vacation_period",
      resourceId: updated.id,
      metadata: {
        startDate: updated.startDate,
        endDate: updated.endDate,
        allowTimePunch: updated.allowTimePunch
      }
    });

    return updated;
  }

  async deleteVacation(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    vacationId: string;
    reason?: string | null;
  }): Promise<{ ok: true }> {
    await this.assertVacationAdminRole(input.userId, input.tenantId);

    const existing = await this.repository.getVacationPeriodById({
      tenantId: input.tenantId,
      companyId: input.companyId,
      vacationId: input.vacationId
    });
    if (!existing) throw new Error("VACATION_PERIOD_NOT_FOUND");
    if (existing.status === "cancelled") throw new Error("VACATION_PERIOD_CANCELLED");

    await this.repository.updateVacationPeriod({
      tenantId: input.tenantId,
      vacationId: existing.id,
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
      cancelledByUserId: input.userId,
      cancelReason: input.reason ?? null,
      updatedBy: input.userId
    });

    await this.repository.createNotice({
      tenantId: input.tenantId,
      companyId: existing.companyId,
      createdBy: input.userId,
      title: "Férias canceladas",
      message: `Seu período de férias (${existing.startDate} a ${existing.endDate}) foi cancelado.`,
      target: "employee",
      recipientUserIds: [existing.userId]
    });

    await this.repository.insertAuditLog({
      tenantId: input.tenantId,
      companyId: existing.companyId,
      actorUserId: input.userId,
      action: "workforce.vacation.cancelled",
      resourceType: "vacation_period",
      resourceId: existing.id,
      metadata: {
        reason: input.reason ?? null,
        startDate: existing.startDate,
        endDate: existing.endDate
      }
    });

    return { ok: true };
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
      userEmail: profile?.authEmail ?? profile?.personalEmail ?? null,
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
    const companyId =
      (await this.repository.getTenantUserCompanyId(input.tenantId, closure.userId)) ??
      null;
    const [profile, company, shiftAssignment, workRule] = await Promise.all([
      this.repository.getEmployeeProfile({
        tenantId: input.tenantId,
        userId: closure.userId
      }),
      companyId ? this.repository.getTenantCompanyLite(input.tenantId, companyId) : Promise.resolve(null),
      companyId
        ? this.repository.getActiveShiftAssignment({
            tenantId: input.tenantId,
            userId: closure.userId,
            companyId
          })
        : Promise.resolve(null),
      companyId
        ? this.repository.getOrCreateTenantWorkRule(input.tenantId, companyId)
        : Promise.resolve(null)
    ]);

    const dailyTargetMinutes =
      shiftAssignment?.template.dailyWorkMinutes ??
      workRule?.dailyWorkMinutes ??
      inferDailyTargetMinutes(closure.summary.expectedMinutes, closure.from, closure.to);
    const lunchBreakMinutes = shiftAssignment?.template.lunchBreakMinutes ?? 60;
    const vacations = await this.repository.listActiveVacationsOverlappingRange({
      tenantId: input.tenantId,
      companyId,
      userId: closure.userId,
      from: closure.from,
      to: closure.to
    });
    const rows = this.mergeVacationDayLabels(
      groupEntriesToFolhaRows(closure.entries),
      vacations,
      closure.from,
      closure.to
    );
    const pdf = buildFolhaDePontoPdf({
      from: closure.from,
      to: closure.to,
      emittedAt: new Date(closure.closedAt),
      employer: {
        legalName: company?.name ?? "Empregador",
        taxId: company?.taxId ?? null,
        address: null
      },
      employee: {
        fullName: profile?.fullName ?? closure.userName ?? closure.userId,
        admissionDate: profile?.admissionDate ?? null,
        department: profile?.department ?? closure.department ?? null,
        sector: profile?.department ?? closure.department ?? null,
        positionTitle: profile?.positionTitle ?? closure.positionTitle ?? null,
        cpf: profile?.cpf ?? closure.userCpf ?? null,
        ctps: null,
        pis: null,
        eSocial: null
      },
      scheduleDescription: buildScheduleDescription({
        templateName: shiftAssignment?.template.name ?? closure.summary.shiftTemplateName ?? null,
        dailyWorkMinutes: dailyTargetMinutes,
        lunchBreakMinutes
      }),
      scheduleEffectiveFrom: shiftAssignment?.startsAt?.slice(0, 10) ?? null,
      dailyTargetMinutes,
      rows
    });
    const userToken = (closure.userName ?? closure.userId).replace(/[^a-zA-Z0-9_-]+/g, "-");
    return {
      fileName: `folha-de-ponto-${closure.referenceMonth}-${userToken}.pdf`,
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
    const [entries, profile, workRule, company, shiftAssignment] = await Promise.all([
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
      this.repository.getOrCreateTenantWorkRule(input.tenantId, scopeCompanyId),
      this.repository.getTenantCompanyLite(input.tenantId, scopeCompanyId),
      this.repository.getActiveShiftAssignment({
        tenantId: input.tenantId,
        userId: input.targetUserId,
        companyId: scopeCompanyId
      })
    ]);

    const dailyTargetMinutes =
      shiftAssignment?.template.dailyWorkMinutes ?? workRule.dailyWorkMinutes;
    const lunchBreakMinutes = shiftAssignment?.template.lunchBreakMinutes ?? 60;
    const vacations = await this.repository.listActiveVacationsOverlappingRange({
      tenantId: input.tenantId,
      companyId: scopeCompanyId,
      userId: input.targetUserId,
      from,
      to
    });
    const rows = this.mergeVacationDayLabels(groupEntriesToFolhaRows(entries), vacations, from, to);
    const pdf = buildFolhaDePontoPdf({
      from,
      to,
      employer: {
        legalName: company?.name ?? "Empregador",
        taxId: company?.taxId ?? null,
        address: null
      },
      employee: {
        fullName: profile?.fullName ?? input.targetUserId,
        admissionDate: profile?.admissionDate ?? null,
        department: profile?.department ?? null,
        sector: profile?.department ?? null,
        positionTitle: profile?.positionTitle ?? null,
        cpf: profile?.cpf ?? null,
        ctps: null,
        pis: null,
        eSocial: null
      },
      scheduleDescription: buildScheduleDescription({
        templateName: shiftAssignment?.template.name ?? null,
        dailyWorkMinutes: dailyTargetMinutes,
        lunchBreakMinutes
      }),
      scheduleEffectiveFrom: shiftAssignment?.startsAt?.slice(0, 10) ?? null,
      dailyTargetMinutes,
      rows
    });
    const userToken = (profile?.fullName ?? input.targetUserId).replace(/[^a-zA-Z0-9_-]+/g, "-");
    return {
      fileName: `folha-de-ponto-${referenceMonth}-${userToken}.pdf`,
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

  async listActiveShiftAssignments(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
  }): Promise<ShiftAssignmentListItem[]> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);
    return this.repository.listActiveShiftAssignmentsWithTemplates({
      tenantId: input.tenantId,
      companyId: this.requireAdminCompany(input.companyId)
    });
  }

  async deactivateShiftAssignment(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    assignmentId: string;
  }): Promise<void> {
    await this.authTenantService.assertUserHasAnyRole(input.userId, input.tenantId, [
      "owner",
      "admin",
      "manager",
      "analyst",
      "preposto"
    ]);
    await this.repository.deactivateShiftAssignment({
      tenantId: input.tenantId,
      companyId: this.requireAdminCompany(input.companyId),
      assignmentId: input.assignmentId
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
  }): Promise<{
    items: Record<
      string,
      {
        fullName: string | null;
        personalEmail: string | null;
        cpf: string | null;
        department: string | null;
        contractType: string | null;
        positionTitle: string | null;
        employeeTags: string[];
        status: "active" | "inactive" | "offboarded";
        baseSalary: number | null;
      }
    >;
  }> {
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
    accountEmail?: string;
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
      accountEmail: input.accountEmail,
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


