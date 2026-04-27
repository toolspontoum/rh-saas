import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchDefaultTenantCompanyId } from "../../lib/tenant-company-default.js";

import type {
  EmployeeProfile,
  Notice,
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
  TimeReportClosure,
  TimeReportClosureEntry,
  TimeAdjustmentRequest,
  TimeEntryChangeLog,
  TimeEntry
} from "./workforce.types.js";

type NoticeRow = {
  id: string;
  tenant_id: string;
  title: string;
  message: string;
  target: Notice["target"];
  recipient_user_ids: string[] | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

type NoticeAttachmentRow = {
  id: string;
  tenant_id: string;
  notice_id: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

type NoticeReadRow = {
  notice_id: string;
  read_at: string;
};

type NoticeReadCountRow = {
  notice_id: string;
  count: number;
};

type TimeEntryRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  user_name?: string | null;
  user_cpf?: string | null;
  contract: string | null;
  entry_type: TimeEntry["entryType"];
  recorded_at: string;
  source: string;
  note: string | null;
  oncall_shift_id?: string | null;
  created_at: string;
};

type TimeAdjustmentRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  user_name?: string | null;
  user_cpf?: string | null;
  target_date: string;
  requested_time: string;
  time_entry_id?: string | null;
  target_entry_type?: TimeEntry["entryType"] | null;
  requested_recorded_at?: string | null;
  original_recorded_at?: string | null;
  change_log?: Array<Record<string, unknown>> | null;
  reason: string;
  status: TimeAdjustmentRequest["status"];
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
};

type TimeEntryChangeLogRow = {
  id: string;
  tenant_id: string;
  time_entry_id: string;
  user_id: string;
  changed_by: string | null;
  source: string;
  previous_recorded_at: string;
  new_recorded_at: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type OncallRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  contract: string | null;
  oncall_date: string;
  start_time: string;
  end_time: string;
  oncall_type: string;
  note: string | null;
  status: OncallEntry["status"];
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
};

type OncallShiftRow = {
  id: string;
  tenant_id: string;
  company_id: string;
  user_id: string;
  scheduled_date: string;
  starts_at: string;
  ends_at: string;
  status: OncallShiftStatus;
  note: string | null;
  linked_time_entry_id: string | null;
  linked_time_entry_at: string | null;
  acknowledged_at: string | null;
  acknowledged_by_user_id: string | null;
  cancelled_at: string | null;
  cancelled_by_user_id: string | null;
  cancel_reason: string | null;
  employee_full_name: string | null;
  employee_email: string | null;
  employee_cpf: string | null;
  employee_phone: string | null;
  department: string | null;
  position_title: string | null;
  contract_type: string | null;
  employee_tags: string[] | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type OncallShiftEventRow = {
  id: string;
  tenant_id: string;
  oncall_shift_id: string;
  user_id: string;
  actor_user_id: string | null;
  event_type: OncallShiftEvent["eventType"];
  payload: Record<string, unknown> | null;
  created_at: string;
};

type TenantWorkRuleRow = {
  tenant_id: string;
  daily_work_minutes: number;
  night_start: string;
  night_end: string;
};

type TimeReportClosureRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  user_name: string | null;
  user_cpf: string | null;
  user_email: string | null;
  department: string | null;
  position_title: string | null;
  contract_type: string | null;
  reference_month: string;
  from_date: string;
  to_date: string;
  summary_json: Record<string, unknown>;
  entries_json: Array<Record<string, unknown>>;
  closed_by: string;
  closed_at: string;
};

type ShiftTemplateRow = {
  id: string;
  tenant_id: string;
  name: string;
  daily_work_minutes: number;
  weekly_work_minutes: number | null;
  lunch_break_minutes: number;
  overtime_percent: number;
  monthly_work_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ShiftAssignmentRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  shift_template_id: string;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type OnboardingRequirementRow = {
  id: string;
  tenant_id: string;
  title: string;
  category: string;
  is_required: boolean;
  applies_to_contract: string | null;
  created_at: string;
  updated_at: string;
};

type OnboardingSubmissionRow = {
  id: string;
  tenant_id: string;
  requirement_id: string;
  user_id: string;
  document_id: string | null;
  status: "pending" | "submitted" | "approved" | "rejected";
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
};

type EmployeeProfileRow = {
  tenant_id: string;
  user_id: string;
  full_name: string | null;
  personal_email: string | null;
  cpf: string | null;
  phone: string | null;
  department: string | null;
  position_title: string | null;
  contract_type: string | null;
  admission_date: string | null;
  base_salary: number | null;
  profile_image_file_name: string | null;
  profile_image_path: string | null;
  profile_image_mime_type: string | null;
  profile_image_size_bytes: number | null;
  employee_tags: string[] | null;
  status: "active" | "inactive" | "offboarded";
};

type CandidateProfileSourceRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  profile_image_file_name: string | null;
  profile_image_path: string | null;
  profile_image_mime_type: string | null;
  profile_image_size_bytes: number | null;
};

type CandidateSourceRow = {
  id: string;
  tenant_id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  updated_at: string;
};

const mapNotice = (row: NoticeRow): Notice => ({
  id: row.id,
  tenantId: row.tenant_id,
  title: row.title,
  message: row.message,
  target: row.target,
  recipientUserIds: row.recipient_user_ids ?? null,
  isActive: row.is_active,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  createdAt: row.created_at
});

const mapNoticeAttachment = (row: NoticeAttachmentRow): NoticeAttachment => ({
  id: row.id,
  tenantId: row.tenant_id,
  noticeId: row.notice_id,
  fileName: row.file_name,
  filePath: row.file_path,
  mimeType: row.mime_type,
  sizeBytes: Number(row.size_bytes),
  createdAt: row.created_at
});

const mapTimeEntry = (row: TimeEntryRow): TimeEntry => ({
  id: row.id,
  tenantId: row.tenant_id,
  userId: row.user_id,
  userName: row.user_name ?? null,
  userCpf: row.user_cpf ?? null,
  contract: row.contract,
  entryType: row.entry_type,
  recordedAt: row.recorded_at,
  source: row.source,
  note: row.note,
  oncallShiftId: row.oncall_shift_id ?? null,
  createdAt: row.created_at
});

const mapTimeAdjustment = (row: TimeAdjustmentRow): TimeAdjustmentRequest => ({
  id: row.id,
  tenantId: row.tenant_id,
  userId: row.user_id,
  userName: row.user_name ?? null,
  userCpf: row.user_cpf ?? null,
  targetDate: row.target_date,
  requestedTime: row.requested_time,
  timeEntryId: row.time_entry_id ?? null,
  targetEntryType: row.target_entry_type ?? null,
  requestedRecordedAt: row.requested_recorded_at ?? null,
  originalRecordedAt: row.original_recorded_at ?? null,
  changeLog: row.change_log ?? [],
  reason: row.reason,
  status: row.status,
  reviewedBy: row.reviewed_by,
  reviewedAt: row.reviewed_at,
  reviewNote: row.review_note,
  createdAt: row.created_at
});

const mapTimeEntryChangeLog = (row: TimeEntryChangeLogRow): TimeEntryChangeLog => ({
  id: row.id,
  tenantId: row.tenant_id,
  timeEntryId: row.time_entry_id,
  userId: row.user_id,
  changedBy: row.changed_by,
  source: row.source,
  previousRecordedAt: row.previous_recorded_at,
  newRecordedAt: row.new_recorded_at,
  reason: row.reason,
  metadata: row.metadata ?? {},
  createdAt: row.created_at
});

const mapOncall = (row: OncallRow): OncallEntry => ({
  id: row.id,
  tenantId: row.tenant_id,
  userId: row.user_id,
  contract: row.contract,
  oncallDate: row.oncall_date,
  startTime: row.start_time,
  endTime: row.end_time,
  oncallType: row.oncall_type,
  note: row.note,
  status: row.status,
  reviewedBy: row.reviewed_by,
  reviewedAt: row.reviewed_at,
  reviewNote: row.review_note,
  createdAt: row.created_at
});

const mapOncallShift = (row: OncallShiftRow): OncallShift => ({
  id: row.id,
  tenantId: row.tenant_id,
  companyId: row.company_id,
  userId: row.user_id,
  scheduledDate: row.scheduled_date,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  status: row.status,
  note: row.note,
  linkedTimeEntryId: row.linked_time_entry_id,
  linkedTimeEntryAt: row.linked_time_entry_at,
  acknowledgedAt: row.acknowledged_at,
  acknowledgedByUserId: row.acknowledged_by_user_id,
  cancelledAt: row.cancelled_at,
  cancelledByUserId: row.cancelled_by_user_id,
  cancelReason: row.cancel_reason,
  employeeFullName: row.employee_full_name,
  employeeEmail: row.employee_email,
  employeeCpf: row.employee_cpf,
  employeePhone: row.employee_phone,
  department: row.department,
  positionTitle: row.position_title,
  contractType: row.contract_type,
  employeeTags: row.employee_tags ?? [],
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapOncallShiftEvent = (row: OncallShiftEventRow): OncallShiftEvent => ({
  id: row.id,
  tenantId: row.tenant_id,
  oncallShiftId: row.oncall_shift_id,
  userId: row.user_id,
  actorUserId: row.actor_user_id,
  eventType: row.event_type,
  payload: row.payload ?? {},
  createdAt: row.created_at
});

const mapTenantWorkRule = (row: TenantWorkRuleRow): TenantWorkRule => ({
  tenantId: row.tenant_id,
  dailyWorkMinutes: row.daily_work_minutes,
  nightStart: row.night_start,
  nightEnd: row.night_end
});

const mapShiftTemplate = (row: ShiftTemplateRow): ShiftTemplate => ({
  id: row.id,
  tenantId: row.tenant_id,
  name: row.name,
  dailyWorkMinutes: row.daily_work_minutes,
  weeklyWorkMinutes: row.weekly_work_minutes,
  lunchBreakMinutes: row.lunch_break_minutes,
  overtimePercent: Number(row.overtime_percent),
  monthlyWorkMinutes: row.monthly_work_minutes,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapShiftAssignment = (row: ShiftAssignmentRow): ShiftAssignment => ({
  id: row.id,
  tenantId: row.tenant_id,
  userId: row.user_id,
  shiftTemplateId: row.shift_template_id,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapOnboardingRequirement = (row: OnboardingRequirementRow): OnboardingRequirement => ({
  id: row.id,
  tenantId: row.tenant_id,
  title: row.title,
  category: row.category,
  isRequired: row.is_required,
  appliesToContract: row.applies_to_contract,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapOnboardingSubmission = (row: OnboardingSubmissionRow): OnboardingSubmission => ({
  id: row.id,
  tenantId: row.tenant_id,
  requirementId: row.requirement_id,
  userId: row.user_id,
  documentId: row.document_id,
  status: row.status,
  submittedAt: row.submitted_at,
  reviewedAt: row.reviewed_at,
  reviewedBy: row.reviewed_by,
  reviewNote: row.review_note,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapEmployeeProfile = (row: EmployeeProfileRow): EmployeeProfile => ({
  tenantId: row.tenant_id,
  userId: row.user_id,
  authEmail: null,
  fullName: row.full_name,
  personalEmail: row.personal_email,
  cpf: row.cpf,
  phone: row.phone,
  department: row.department,
  positionTitle: row.position_title,
  contractType: row.contract_type,
  admissionDate: row.admission_date,
  baseSalary: row.base_salary,
  profileImageFileName: row.profile_image_file_name,
  profileImagePath: row.profile_image_path,
  profileImageMimeType: row.profile_image_mime_type,
  profileImageSizeBytes: row.profile_image_size_bytes,
  employeeTags: row.employee_tags ?? [],
  status: row.status
});

const mapTimeReportClosureEntry = (row: Record<string, unknown>): TimeReportClosureEntry => ({
  entryType: String(row.entryType ?? "clock_in") as TimeEntry["entryType"],
  recordedAt: String(row.recordedAt ?? new Date().toISOString())
});

const mapTimeReportClosure = (row: TimeReportClosureRow): TimeReportClosure => ({
  id: row.id,
  tenantId: row.tenant_id,
  userId: row.user_id,
  userName: row.user_name,
  userCpf: row.user_cpf,
  userEmail: row.user_email,
  department: row.department,
  positionTitle: row.position_title,
  contractType: row.contract_type,
  referenceMonth: row.reference_month,
  from: row.from_date,
  to: row.to_date,
  summary: row.summary_json as unknown as TimeReportClosure["summary"],
  entries: (row.entries_json ?? []).map(mapTimeReportClosureEntry),
  closedBy: row.closed_by,
  closedAt: row.closed_at
});

function withCompany<T extends { eq: (col: string, val: string) => T }>(
  query: T,
  companyId: string | null | undefined
): T {
  return companyId ? query.eq("company_id", companyId) : query;
}

export class WorkforceRepository {
  constructor(private readonly db: SupabaseClient) {}

  async getTenantUserCompanyId(tenantId: string, userId: string): Promise<string | null> {
    const { data, error } = await this.db
      .from("tenant_user_profiles")
      .select("company_id")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data as { company_id: string } | null)?.company_id ?? null;
  }

  async createSignedUploadUrl(bucket: string, path: string): Promise<{ path: string; token: string; signedUrl: string }> {
    const { data, error } = await this.db.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data) throw new Error("UPLOAD_INTENT_FAILED");
    return data;
  }

  async createSignedReadUrl(bucket: string, path: string, expiresInSeconds = 3600): Promise<string> {
    const { data, error } = await this.db.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (error || !data?.signedUrl) throw new Error("SIGNED_URL_FAILED");
    return data.signedUrl;
  }

  async checkObjectExists(bucket: string, path: string): Promise<void> {
    const segments = path.split("/").filter(Boolean);
    if (segments.length < 2) throw new Error("INVALID_FILE_PATH");
    const fileName = segments.pop();
    if (!fileName) throw new Error("INVALID_FILE_PATH");
    const folder = segments.join("/");

    const { data, error } = await this.db.storage.from(bucket).list(folder, {
      search: fileName,
      limit: 1,
      offset: 0
    });

    if (error) throw new Error("UPLOAD_OBJECT_CHECK_FAILED");
    const found = (data ?? []).some((item) => item.name === fileName);
    if (!found) throw new Error("UPLOAD_OBJECT_NOT_FOUND");
  }

  async listNotices(input: {
    tenantId: string;
    companyId?: string | null;
    onlyActive?: boolean;
    onlyArchived?: boolean;
  }): Promise<Notice[]> {
    let query = withCompany(
      this.db.from("notices").select("*").eq("tenant_id", input.tenantId),
      input.companyId
    ).order("created_at", { ascending: false });
    if (input.onlyArchived) {
      query = query.eq("is_active", false);
    } else if (input.onlyActive ?? true) {
      query = query.eq("is_active", true);
    }
    const { data, error } = await query.limit(50);
    if (error) throw error;
    return ((data ?? []) as NoticeRow[]).map(mapNotice);
  }

  async listNoticeAttachments(tenantId: string, noticeIds: string[]): Promise<NoticeAttachment[]> {
    if (noticeIds.length === 0) return [];
    const { data, error } = await this.db
      .from("notice_attachments")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("notice_id", noticeIds)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as NoticeAttachmentRow[]).map(mapNoticeAttachment);
  }

  async listNoticeReadsForUser(tenantId: string, userId: string, noticeIds: string[]): Promise<NoticeReadRow[]> {
    if (noticeIds.length === 0) return [];
    const { data, error } = await this.db
      .from("notice_reads")
      .select("notice_id,read_at")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .in("notice_id", noticeIds);
    if (error) throw error;
    return (data ?? []) as NoticeReadRow[];
  }

  async listNoticeReadCounts(tenantId: string, noticeIds: string[]): Promise<NoticeReadCountRow[]> {
    if (noticeIds.length === 0) return [];
    const { data, error } = await this.db
      .from("notice_reads")
      .select("notice_id")
      .eq("tenant_id", tenantId)
      .in("notice_id", noticeIds);
    if (error) throw error;
    const counts = new Map<string, number>();
    for (const row of (data ?? []) as Array<{ notice_id: string }>) {
      counts.set(row.notice_id, (counts.get(row.notice_id) ?? 0) + 1);
    }
    return [...counts.entries()].map(([notice_id, count]) => ({ notice_id, count }));
  }

  async markNoticeRead(input: { tenantId: string; userId: string; noticeId: string }): Promise<void> {
    const { data: noticeRow, error: noticeErr } = await this.db
      .from("notices")
      .select("company_id")
      .eq("tenant_id", input.tenantId)
      .eq("id", input.noticeId)
      .maybeSingle();
    if (noticeErr) throw noticeErr;
    const companyId = (noticeRow as { company_id: string } | null)?.company_id;
    if (!companyId) throw new Error("NOTICE_NOT_FOUND");

    const { error } = await this.db.from("notice_reads").upsert(
      {
        tenant_id: input.tenantId,
        company_id: companyId,
        notice_id: input.noticeId,
        user_id: input.userId,
        read_at: new Date().toISOString()
      },
      { onConflict: "tenant_id,notice_id,user_id" }
    );
    if (error) throw error;
  }

  async archiveNotice(input: { tenantId: string; noticeId: string; companyId?: string | null }): Promise<void> {
    let q = this.db
      .from("notices")
      .update({
        is_active: false,
        ends_at: new Date().toISOString()
      })
      .eq("tenant_id", input.tenantId)
      .eq("id", input.noticeId);
    q = withCompany(q, input.companyId);
    const { error } = await q;
    if (error) throw error;
  }

  async unarchiveNotice(input: { tenantId: string; noticeId: string; companyId?: string | null }): Promise<void> {
    let q = this.db
      .from("notices")
      .update({
        is_active: true,
        ends_at: null
      })
      .eq("tenant_id", input.tenantId)
      .eq("id", input.noticeId);
    q = withCompany(q, input.companyId);
    const { error } = await q;
    if (error) throw error;
  }

  async deleteNotice(input: { tenantId: string; noticeId: string; companyId?: string | null }): Promise<void> {
    let q = this.db.from("notices").delete().eq("tenant_id", input.tenantId).eq("id", input.noticeId);
    q = withCompany(q, input.companyId);
    const { error } = await q;
    if (error) throw error;
  }

  async createNotice(input: {
    tenantId: string;
    companyId: string;
    createdBy: string;
    title: string;
    message: string;
    target: Notice["target"];
    recipientUserIds?: string[] | null;
    attachments?: Array<{
      fileName: string;
      filePath: string;
      mimeType: string;
      sizeBytes: number;
    }>;
  }): Promise<Notice> {
    const { data, error } = await this.db
      .from("notices")
      .insert({
        tenant_id: input.tenantId,
        company_id: input.companyId,
        created_by: input.createdBy,
        title: input.title,
        message: input.message,
        target: input.target,
        recipient_user_ids:
          input.recipientUserIds && input.recipientUserIds.length > 0 ? input.recipientUserIds : null
      })
      .select("*")
      .single();
    if (error) throw error;
    const notice = mapNotice(data as NoticeRow);

    const attachments = input.attachments ?? [];
    if (attachments.length > 0) {
      const { error: attachmentError } = await this.db.from("notice_attachments").insert(
        attachments.map((item) => ({
          tenant_id: input.tenantId,
          company_id: input.companyId,
          notice_id: notice.id,
          file_name: item.fileName,
          file_path: item.filePath,
          mime_type: item.mimeType,
          size_bytes: item.sizeBytes
        }))
      );
      if (attachmentError) throw attachmentError;
    }

    return notice;
  }

  async createTimeEntry(input: {
    tenantId: string;
    companyId: string;
    userId: string;
    contract?: string | null;
    entryType: TimeEntry["entryType"];
    recordedAt: string;
    source: string;
    note?: string | null;
    oncallShiftId?: string | null;
  }): Promise<TimeEntry> {
    const { data, error } = await this.db
      .from("time_entries")
      .insert({
        tenant_id: input.tenantId,
        company_id: input.companyId,
        user_id: input.userId,
        contract: input.contract ?? null,
        entry_type: input.entryType,
        recorded_at: input.recordedAt,
        source: input.source,
        note: input.note ?? null,
        oncall_shift_id: input.oncallShiftId ?? null
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapTimeEntry(data as TimeEntryRow);
  }

  async getLastTimeEntry(input: { tenantId: string; userId: string; companyId?: string | null }): Promise<TimeEntry | null> {
    const { data, error } = await withCompany(
      this.db.from("time_entries").select("*").eq("tenant_id", input.tenantId).eq("user_id", input.userId),
      input.companyId
    )
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapTimeEntry(data as TimeEntryRow);
  }

  async listTimeEntries(input: {
    tenantId: string;
    companyId?: string | null;
    userId?: string;
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<TimeEntry>> {
    let query = withCompany(
      this.db.from("time_entries").select("*").eq("tenant_id", input.tenantId),
      input.companyId
    ).order("recorded_at", { ascending: false });
    if (input.userId) query = query.eq("user_id", input.userId);
    const offset = (input.page - 1) * input.pageSize;
    const { data, error } = await query.range(offset, offset + input.pageSize - 1);
    if (error) throw error;
    return {
      items: ((data ?? []) as TimeEntryRow[]).map(mapTimeEntry),
      page: input.page,
      pageSize: input.pageSize
    };
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
    originalRecordedAt?: string | null;
  }): Promise<TimeAdjustmentRequest> {
    const { data, error } = await this.db
      .from("time_adjustment_requests")
      .insert({
        tenant_id: input.tenantId,
        user_id: input.userId,
        target_date: input.targetDate,
        requested_time: input.requestedTime,
        reason: input.reason,
        time_entry_id: input.timeEntryId ?? null,
        target_entry_type: input.targetEntryType ?? null,
        requested_recorded_at: input.requestedRecordedAt ?? null,
        original_recorded_at: input.originalRecordedAt ?? null
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapTimeAdjustment(data as TimeAdjustmentRow);
  }

  async listTimeAdjustments(input: {
    tenantId: string;
    userId?: string;
    status?: TimeAdjustmentRequest["status"];
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<TimeAdjustmentRequest>> {
    let query = this.db
      .from("time_adjustment_requests")
      .select("*")
      .eq("tenant_id", input.tenantId)
      .order("created_at", { ascending: false });
    if (input.userId) query = query.eq("user_id", input.userId);
    if (input.status) query = query.eq("status", input.status);
    const offset = (input.page - 1) * input.pageSize;
    const { data, error } = await query.range(offset, offset + input.pageSize - 1);
    if (error) throw error;
    return {
      items: ((data ?? []) as TimeAdjustmentRow[]).map(mapTimeAdjustment),
      page: input.page,
      pageSize: input.pageSize
    };
  }

  async getTimeAdjustmentById(input: {
    tenantId: string;
    adjustmentId: string;
  }): Promise<TimeAdjustmentRequest | null> {
    const { data, error } = await this.db
      .from("time_adjustment_requests")
      .select("*")
      .eq("tenant_id", input.tenantId)
      .eq("id", input.adjustmentId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapTimeAdjustment(data as TimeAdjustmentRow);
  }

  async reviewTimeAdjustment(input: {
    tenantId: string;
    adjustmentId: string;
    status: "approved" | "rejected";
    reviewedBy: string;
    reviewNote?: string | null;
    changeLog?: Array<Record<string, unknown>>;
  }): Promise<TimeAdjustmentRequest> {
    const { data, error } = await this.db
      .from("time_adjustment_requests")
      .update({
        status: input.status,
        reviewed_by: input.reviewedBy,
        reviewed_at: new Date().toISOString(),
        review_note: input.reviewNote ?? null,
        change_log: input.changeLog ?? []
      })
      .eq("tenant_id", input.tenantId)
      .eq("id", input.adjustmentId)
      .select("*")
      .single();
    if (error) throw error;
    return mapTimeAdjustment(data as TimeAdjustmentRow);
  }

  async getTimeEntryById(input: { tenantId: string; entryId: string }): Promise<TimeEntry | null> {
    const { data, error } = await this.db
      .from("time_entries")
      .select("*")
      .eq("tenant_id", input.tenantId)
      .eq("id", input.entryId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapTimeEntry(data as TimeEntryRow);
  }

  async getAdjacentTimeEntries(input: {
    tenantId: string;
    userId: string;
    entryId: string;
    recordedAt: string;
  }): Promise<{ previous: TimeEntry | null; next: TimeEntry | null }> {
    const [previousRes, nextRes] = await Promise.all([
      this.db
        .from("time_entries")
        .select("*")
        .eq("tenant_id", input.tenantId)
        .eq("user_id", input.userId)
        .lt("recorded_at", input.recordedAt)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      this.db
        .from("time_entries")
        .select("*")
        .eq("tenant_id", input.tenantId)
        .eq("user_id", input.userId)
        .gt("recorded_at", input.recordedAt)
        .order("recorded_at", { ascending: true })
        .limit(1)
        .maybeSingle()
    ]);

    if (previousRes.error) throw previousRes.error;
    if (nextRes.error) throw nextRes.error;

    const previousRow = previousRes.data as TimeEntryRow | null;
    const nextRow = nextRes.data as TimeEntryRow | null;

    const previous = previousRow && previousRow.id !== input.entryId ? mapTimeEntry(previousRow) : null;
    const next = nextRow && nextRow.id !== input.entryId ? mapTimeEntry(nextRow) : null;

    return { previous, next };
  }

  async updateTimeEntryRecordedAt(input: {
    tenantId: string;
    entryId: string;
    recordedAt: string;
  }): Promise<TimeEntry> {
    const { data, error } = await this.db
      .from("time_entries")
      .update({ recorded_at: input.recordedAt })
      .eq("tenant_id", input.tenantId)
      .eq("id", input.entryId)
      .select("*")
      .single();
    if (error) throw error;
    return mapTimeEntry(data as TimeEntryRow);
  }

  async setTimeEntryOncallShift(input: {
    tenantId: string;
    entryId: string;
    oncallShiftId?: string | null;
  }): Promise<TimeEntry> {
    const { data, error } = await this.db
      .from("time_entries")
      .update({
        oncall_shift_id: input.oncallShiftId ?? null
      })
      .eq("tenant_id", input.tenantId)
      .eq("id", input.entryId)
      .select("*")
      .single();
    if (error) throw error;
    return mapTimeEntry(data as TimeEntryRow);
  }

  async insertTimeEntryChangeLog(input: {
    tenantId: string;
    timeEntryId: string;
    userId: string;
    changedBy: string | null;
    source: string;
    previousRecordedAt: string;
    newRecordedAt: string;
    reason?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<TimeEntryChangeLog> {
    const { data: entryRow, error: entryErr } = await this.db
      .from("time_entries")
      .select("company_id")
      .eq("tenant_id", input.tenantId)
      .eq("id", input.timeEntryId)
      .maybeSingle();
    if (entryErr) throw entryErr;
    const companyId = (entryRow as { company_id: string } | null)?.company_id;
    if (!companyId) throw new Error("TIME_ENTRY_NOT_FOUND");

    const { data, error } = await this.db
      .from("time_entry_change_logs")
      .insert({
        tenant_id: input.tenantId,
        company_id: companyId,
        time_entry_id: input.timeEntryId,
        user_id: input.userId,
        changed_by: input.changedBy,
        source: input.source,
        previous_recorded_at: input.previousRecordedAt,
        new_recorded_at: input.newRecordedAt,
        reason: input.reason ?? null,
        metadata: input.metadata ?? {}
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapTimeEntryChangeLog(data as TimeEntryChangeLogRow);
  }

  async listTimeEntryChangeLogs(input: {
    tenantId: string;
    timeEntryId: string;
  }): Promise<TimeEntryChangeLog[]> {
    const { data, error } = await this.db
      .from("time_entry_change_logs")
      .select("*")
      .eq("tenant_id", input.tenantId)
      .eq("time_entry_id", input.timeEntryId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as TimeEntryChangeLogRow[]).map(mapTimeEntryChangeLog);
  }

  async createOncallEntry(input: {
    tenantId: string;
    userId: string;
    contract?: string | null;
    oncallDate: string;
    startTime: string;
    endTime: string;
    oncallType: string;
    note?: string | null;
  }): Promise<OncallEntry> {
    const { data, error } = await this.db
      .from("oncall_entries")
      .insert({
        tenant_id: input.tenantId,
        user_id: input.userId,
        contract: input.contract ?? null,
        oncall_date: input.oncallDate,
        start_time: input.startTime,
        end_time: input.endTime,
        oncall_type: input.oncallType,
        note: input.note ?? null
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapOncall(data as OncallRow);
  }

  async listOncallEntries(input: {
    tenantId: string;
    userId?: string;
    status?: OncallEntry["status"];
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<OncallEntry>> {
    let query = this.db
      .from("oncall_entries")
      .select("*")
      .eq("tenant_id", input.tenantId)
      .order("created_at", { ascending: false });
    if (input.userId) query = query.eq("user_id", input.userId);
    if (input.status) query = query.eq("status", input.status);
    const offset = (input.page - 1) * input.pageSize;
    const { data, error } = await query.range(offset, offset + input.pageSize - 1);
    if (error) throw error;
    return {
      items: ((data ?? []) as OncallRow[]).map(mapOncall),
      page: input.page,
      pageSize: input.pageSize
    };
  }

  async reviewOncallEntry(input: {
    tenantId: string;
    oncallId: string;
    status: "approved" | "rejected";
    reviewedBy: string;
    reviewNote?: string | null;
  }): Promise<OncallEntry> {
    const { data, error } = await this.db
      .from("oncall_entries")
      .update({
        status: input.status,
        reviewed_by: input.reviewedBy,
        reviewed_at: new Date().toISOString(),
        review_note: input.reviewNote ?? null
      })
      .eq("tenant_id", input.tenantId)
      .eq("id", input.oncallId)
      .select("*")
      .single();
    if (error) throw error;
    return mapOncall(data as OncallRow);
  }

  async createOncallShift(input: {
    tenantId: string;
    companyId: string;
    targetUserId: string;
    scheduledDate: string;
    startsAt: string;
    endsAt: string;
    status?: OncallShiftStatus;
    note?: string | null;
    linkedTimeEntryId?: string | null;
    linkedTimeEntryAt?: string | null;
    acknowledgedAt?: string | null;
    acknowledgedByUserId?: string | null;
    cancelledAt?: string | null;
    cancelledByUserId?: string | null;
    cancelReason?: string | null;
    employeeFullName?: string | null;
    employeeEmail?: string | null;
    employeeCpf?: string | null;
    employeePhone?: string | null;
    department?: string | null;
    positionTitle?: string | null;
    contractType?: string | null;
    employeeTags?: string[];
    createdBy?: string | null;
    updatedBy?: string | null;
  }): Promise<OncallShift> {
    const { data, error } = await this.db
      .from("oncall_shifts")
      .insert({
        tenant_id: input.tenantId,
        company_id: input.companyId,
        user_id: input.targetUserId,
        scheduled_date: input.scheduledDate,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        status: input.status ?? "pending_ack",
        note: input.note ?? null,
        linked_time_entry_id: input.linkedTimeEntryId ?? null,
        linked_time_entry_at: input.linkedTimeEntryAt ?? null,
        acknowledged_at: input.acknowledgedAt ?? null,
        acknowledged_by_user_id: input.acknowledgedByUserId ?? null,
        cancelled_at: input.cancelledAt ?? null,
        cancelled_by_user_id: input.cancelledByUserId ?? null,
        cancel_reason: input.cancelReason ?? null,
        employee_full_name: input.employeeFullName ?? null,
        employee_email: input.employeeEmail?.trim().toLowerCase() ?? null,
        employee_cpf: input.employeeCpf?.replace(/\D/g, "") ?? null,
        employee_phone: input.employeePhone?.replace(/\D/g, "") ?? null,
        department: input.department ?? null,
        position_title: input.positionTitle ?? null,
        contract_type: input.contractType ?? null,
        employee_tags: input.employeeTags ?? [],
        created_by: input.createdBy ?? null,
        updated_by: input.updatedBy ?? input.createdBy ?? null
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapOncallShift(data as OncallShiftRow);
  }

  async listOncallShifts(input: {
    tenantId: string;
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
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<OncallShift>> {
    let query = withCompany(
      this.db.from("oncall_shifts").select("*").eq("tenant_id", input.tenantId),
      input.companyId
    )
      .order("scheduled_date", { ascending: false })
      .order("starts_at", { ascending: false });

    if (input.targetUserId) query = query.eq("user_id", input.targetUserId);
    if (input.from) query = query.gte("scheduled_date", input.from);
    if (input.to) query = query.lte("scheduled_date", input.to);
    if (input.name) query = query.ilike("employee_full_name", `%${input.name}%`);
    if (input.email) query = query.ilike("employee_email", `%${input.email.trim().toLowerCase()}%`);
    if (input.cpf) {
      const normalizedCpf = input.cpf.replace(/\D/g, "");
      query = query.ilike("employee_cpf", `%${normalizedCpf}%`);
    }
    if (input.department) query = query.ilike("department", `%${input.department}%`);
    if (input.positionTitle) query = query.ilike("position_title", `%${input.positionTitle}%`);
    if (input.contractType) query = query.ilike("contract_type", `%${input.contractType}%`);
    if (input.status) query = query.eq("status", input.status);
    if (input.tag) query = query.contains("employee_tags", [input.tag]);

    const offset = (input.page - 1) * input.pageSize;
    const { data, error } = await query.range(offset, offset + input.pageSize - 1);
    if (error) throw error;
    return {
      items: ((data ?? []) as OncallShiftRow[]).map(mapOncallShift),
      page: input.page,
      pageSize: input.pageSize
    };
  }

  async getOncallShiftById(input: {
    tenantId: string;
    oncallShiftId: string;
    companyId?: string | null;
  }): Promise<OncallShift | null> {
    const { data, error } = await withCompany(
      this.db.from("oncall_shifts").select("*").eq("tenant_id", input.tenantId).eq("id", input.oncallShiftId),
      input.companyId
    ).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapOncallShift(data as OncallShiftRow);
  }

  async updateOncallShift(input: {
    tenantId: string;
    oncallShiftId: string;
    scheduledDate?: string;
    startsAt?: string;
    endsAt?: string;
    status?: OncallShiftStatus;
    note?: string | null;
    linkedTimeEntryId?: string | null;
    linkedTimeEntryAt?: string | null;
    acknowledgedAt?: string | null;
    acknowledgedByUserId?: string | null;
    cancelledAt?: string | null;
    cancelledByUserId?: string | null;
    cancelReason?: string | null;
    employeeFullName?: string | null;
    employeeEmail?: string | null;
    employeeCpf?: string | null;
    employeePhone?: string | null;
    department?: string | null;
    positionTitle?: string | null;
    contractType?: string | null;
    employeeTags?: string[];
    updatedBy?: string | null;
  }): Promise<OncallShift> {
    const patch: Record<string, unknown> = {
      updated_by: input.updatedBy ?? null
    };

    if (input.scheduledDate !== undefined) patch.scheduled_date = input.scheduledDate;
    if (input.startsAt !== undefined) patch.starts_at = input.startsAt;
    if (input.endsAt !== undefined) patch.ends_at = input.endsAt;
    if (input.status !== undefined) patch.status = input.status;
    if (input.note !== undefined) patch.note = input.note;
    if (input.linkedTimeEntryId !== undefined) patch.linked_time_entry_id = input.linkedTimeEntryId;
    if (input.linkedTimeEntryAt !== undefined) patch.linked_time_entry_at = input.linkedTimeEntryAt;
    if (input.acknowledgedAt !== undefined) patch.acknowledged_at = input.acknowledgedAt;
    if (input.acknowledgedByUserId !== undefined) patch.acknowledged_by_user_id = input.acknowledgedByUserId;
    if (input.cancelledAt !== undefined) patch.cancelled_at = input.cancelledAt;
    if (input.cancelledByUserId !== undefined) patch.cancelled_by_user_id = input.cancelledByUserId;
    if (input.cancelReason !== undefined) patch.cancel_reason = input.cancelReason;
    if (input.employeeFullName !== undefined) patch.employee_full_name = input.employeeFullName;
    if (input.employeeEmail !== undefined) patch.employee_email = input.employeeEmail?.trim().toLowerCase() ?? null;
    if (input.employeeCpf !== undefined) patch.employee_cpf = input.employeeCpf?.replace(/\D/g, "") ?? null;
    if (input.employeePhone !== undefined) patch.employee_phone = input.employeePhone?.replace(/\D/g, "") ?? null;
    if (input.department !== undefined) patch.department = input.department;
    if (input.positionTitle !== undefined) patch.position_title = input.positionTitle;
    if (input.contractType !== undefined) patch.contract_type = input.contractType;
    if (input.employeeTags !== undefined) patch.employee_tags = input.employeeTags;

    const { data, error } = await this.db
      .from("oncall_shifts")
      .update(patch)
      .eq("tenant_id", input.tenantId)
      .eq("id", input.oncallShiftId)
      .select("*")
      .single();
    if (error) throw error;
    return mapOncallShift(data as OncallShiftRow);
  }

  async deleteOncallShift(input: {
    tenantId: string;
    oncallShiftId: string;
    companyId?: string | null;
  }): Promise<void> {
    let query = this.db
      .from("oncall_shifts")
      .delete()
      .eq("tenant_id", input.tenantId)
      .eq("id", input.oncallShiftId);
    query = withCompany(query, input.companyId);
    const { error } = await query;
    if (error) throw error;
  }

  async createOncallShiftEvent(input: {
    tenantId: string;
    oncallShiftId: string;
    userId: string;
    actorUserId?: string | null;
    eventType: OncallShiftEvent["eventType"];
    payload?: Record<string, unknown>;
    createdAt?: string;
  }): Promise<OncallShiftEvent> {
    const { data, error } = await this.db
      .from("oncall_shift_events")
      .insert({
        tenant_id: input.tenantId,
        oncall_shift_id: input.oncallShiftId,
        user_id: input.userId,
        actor_user_id: input.actorUserId ?? null,
        event_type: input.eventType,
        payload: input.payload ?? {},
        created_at: input.createdAt ?? new Date().toISOString()
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapOncallShiftEvent(data as OncallShiftEventRow);
  }

  async listOncallShiftEvents(input: {
    tenantId: string;
    oncallShiftId: string;
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<OncallShiftEvent>> {
    const offset = (input.page - 1) * input.pageSize;
    const { data, error } = await this.db
      .from("oncall_shift_events")
      .select("*")
      .eq("tenant_id", input.tenantId)
      .eq("oncall_shift_id", input.oncallShiftId)
      .order("created_at", { ascending: false })
      .range(offset, offset + input.pageSize - 1);
    if (error) throw error;
    return {
      items: ((data ?? []) as OncallShiftEventRow[]).map(mapOncallShiftEvent),
      page: input.page,
      pageSize: input.pageSize
    };
  }

  async getOncallShiftWithEvents(input: {
    tenantId: string;
    companyId?: string | null;
    oncallShiftId: string;
    eventPageSize?: number;
  }): Promise<OncallShiftWithEvents | null> {
    const shift = await this.getOncallShiftById({
      tenantId: input.tenantId,
      companyId: input.companyId,
      oncallShiftId: input.oncallShiftId
    });
    if (!shift) return null;

    const eventsRes = await this.listOncallShiftEvents({
      tenantId: input.tenantId,
      oncallShiftId: input.oncallShiftId,
      page: 1,
      pageSize: input.eventPageSize ?? 100
    });

    const linkedTimeEntry = shift.linkedTimeEntryId
      ? await this.getTimeEntryById({
          tenantId: input.tenantId,
          entryId: shift.linkedTimeEntryId
        })
      : null;

    return {
      ...shift,
      events: eventsRes.items,
      linkedTimeEntry
    };
  }

  async findOverlappingOncallShift(input: {
    tenantId: string;
    companyId: string;
    userId: string;
    startsAt: string;
    endsAt: string;
    excludeOncallShiftId?: string;
  }): Promise<OncallShift | null> {
    let query = this.db
      .from("oncall_shifts")
      .select("*")
      .eq("tenant_id", input.tenantId)
      .eq("company_id", input.companyId)
      .eq("user_id", input.userId)
      .neq("status", "cancelled")
      .lt("starts_at", input.endsAt)
      .gt("ends_at", input.startsAt)
      .order("starts_at", { ascending: true })
      .limit(1);

    if (input.excludeOncallShiftId) query = query.neq("id", input.excludeOncallShiftId);

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapOncallShift(data as OncallShiftRow);
  }

  async linkOncallShiftToTimeEntry(input: {
    tenantId: string;
    oncallShiftId: string;
    timeEntryId: string;
    linkedAt?: string;
    updatedBy?: string | null;
  }): Promise<OncallShift> {
    const { data, error } = await this.db
      .from("oncall_shifts")
      .update({
        linked_time_entry_id: input.timeEntryId,
        linked_time_entry_at: input.linkedAt ?? new Date().toISOString(),
        status: "entry_registered",
        updated_by: input.updatedBy ?? null
      })
      .eq("tenant_id", input.tenantId)
      .eq("id", input.oncallShiftId)
      .select("*")
      .single();
    if (error) throw error;
    return mapOncallShift(data as OncallShiftRow);
  }

  async unlinkOncallShiftTimeEntry(input: {
    tenantId: string;
    oncallShiftId: string;
    updatedBy?: string | null;
  }): Promise<OncallShift> {
    const { data, error } = await this.db
      .from("oncall_shifts")
      .update({
        linked_time_entry_id: null,
        linked_time_entry_at: null,
        updated_by: input.updatedBy ?? null
      })
      .eq("tenant_id", input.tenantId)
      .eq("id", input.oncallShiftId)
      .select("*")
      .single();
    if (error) throw error;
    return mapOncallShift(data as OncallShiftRow);
  }

  async listConfirmedOncallShiftsInRange(input: {
    tenantId: string;
    userId: string;
    from: string;
    to: string;
  }): Promise<OncallShift[]> {
    const { data, error } = await this.db
      .from("oncall_shifts")
      .select("*")
      .eq("tenant_id", input.tenantId)
      .eq("user_id", input.userId)
      .in("status", ["acknowledged", "entry_registered"])
      .gte("scheduled_date", input.from)
      .lte("scheduled_date", input.to)
      .order("scheduled_date", { ascending: true })
      .order("starts_at", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as OncallShiftRow[]).map(mapOncallShift);
  }

  async insertAuditLog(input: {
    tenantId: string;
    companyId?: string | null;
    actorUserId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    const companyId =
      input.companyId ?? (await fetchDefaultTenantCompanyId(this.db, input.tenantId));
    const { error } = await this.db.from("audit_logs").insert({
      tenant_id: input.tenantId,
      company_id: companyId,
      actor_user_id: input.actorUserId,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      result: "success",
      metadata: input.metadata
    });
    if (error) throw error;
  }

  async getOrCreateTenantWorkRule(tenantId: string, companyId: string): Promise<TenantWorkRule> {
    const { data, error } = await this.db
      .from("tenant_work_rules")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (error) throw error;
    if (data) return mapTenantWorkRule(data as TenantWorkRuleRow);

    const { data: created, error: createError } = await this.db
      .from("tenant_work_rules")
      .insert({ tenant_id: tenantId, company_id: companyId })
      .select("*")
      .single();
    if (createError) throw createError;
    return mapTenantWorkRule(created as TenantWorkRuleRow);
  }

  async listShiftTemplates(tenantId: string, companyId?: string | null): Promise<ShiftTemplate[]> {
    let q = this.db.from("employee_shift_templates").select("*").eq("tenant_id", tenantId);
    q = withCompany(q, companyId ?? null);
    const { data, error } = await q
      .order("created_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as ShiftTemplateRow[]).map(mapShiftTemplate);
  }

  async createShiftTemplate(input: {
    tenantId: string;
    companyId: string;
    createdBy: string;
    name: string;
    dailyWorkMinutes: number;
    weeklyWorkMinutes?: number | null;
    lunchBreakMinutes: number;
    overtimePercent: number;
    monthlyWorkMinutes: number;
  }): Promise<ShiftTemplate> {
    const { data, error } = await this.db
      .from("employee_shift_templates")
      .insert({
        tenant_id: input.tenantId,
        company_id: input.companyId,
        created_by: input.createdBy,
        name: input.name,
        daily_work_minutes: input.dailyWorkMinutes,
        weekly_work_minutes: input.weeklyWorkMinutes ?? null,
        lunch_break_minutes: input.lunchBreakMinutes,
        overtime_percent: input.overtimePercent,
        monthly_work_minutes: input.monthlyWorkMinutes
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapShiftTemplate(data as ShiftTemplateRow);
  }

  async updateShiftTemplate(input: {
    tenantId: string;
    companyId?: string | null;
    templateId: string;
    name: string;
    dailyWorkMinutes: number;
    weeklyWorkMinutes?: number | null;
    lunchBreakMinutes: number;
    overtimePercent: number;
    monthlyWorkMinutes: number;
  }): Promise<ShiftTemplate> {
    let q = this.db
      .from("employee_shift_templates")
      .update({
        name: input.name,
        daily_work_minutes: input.dailyWorkMinutes,
        weekly_work_minutes: input.weeklyWorkMinutes ?? null,
        lunch_break_minutes: input.lunchBreakMinutes,
        overtime_percent: input.overtimePercent,
        monthly_work_minutes: input.monthlyWorkMinutes
      })
      .eq("tenant_id", input.tenantId)
      .eq("id", input.templateId);
    q = withCompany(q, input.companyId);
    const { data, error } = await q
      .select("*")
      .single();
    if (error) throw error;
    return mapShiftTemplate(data as ShiftTemplateRow);
  }

  async assignShiftTemplate(input: {
    tenantId: string;
    companyId: string;
    userId: string;
    shiftTemplateId: string;
    startsAt: string;
    endsAt?: string | null;
    createdBy: string;
  }): Promise<ShiftAssignment> {
    const { error: disableError } = await this.db
      .from("employee_shift_assignments")
      .update({ is_active: false, ends_at: input.startsAt })
      .eq("tenant_id", input.tenantId)
      .eq("company_id", input.companyId)
      .eq("user_id", input.userId)
      .eq("is_active", true);
    if (disableError) throw disableError;

    const { data, error } = await this.db
      .from("employee_shift_assignments")
      .insert({
        tenant_id: input.tenantId,
        company_id: input.companyId,
        user_id: input.userId,
        shift_template_id: input.shiftTemplateId,
        starts_at: input.startsAt,
        ends_at: input.endsAt ?? null,
        is_active: true,
        created_by: input.createdBy
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapShiftAssignment(data as ShiftAssignmentRow);
  }

  async getActiveShiftAssignment(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
  }): Promise<(ShiftAssignment & { template: ShiftTemplate }) | null> {
    const { data, error } = await withCompany(
      this.db
        .from("employee_shift_assignments")
        .select(
          `
        *,
        employee_shift_templates!inner (*)
      `
        )
        .eq("tenant_id", input.tenantId)
        .eq("user_id", input.userId),
      input.companyId
    )
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as ShiftAssignmentRow & { employee_shift_templates: ShiftTemplateRow | ShiftTemplateRow[] };
    const template = Array.isArray(row.employee_shift_templates)
      ? row.employee_shift_templates[0]
      : row.employee_shift_templates;
    if (!template) return null;
    return {
      ...mapShiftAssignment(row),
      template: mapShiftTemplate(template)
    };
  }

  async getEmployeeProfile(input: { tenantId: string; userId: string }): Promise<EmployeeProfile | null> {
    const [profileRes, candidateProfileRes, authRes] = await Promise.all([
      this.db
        .from("tenant_user_profiles")
        .select(
          "tenant_id,user_id,full_name,personal_email,cpf,phone,department,position_title,contract_type,admission_date,base_salary,profile_image_file_name,profile_image_path,profile_image_mime_type,profile_image_size_bytes,employee_tags,status"
        )
        .eq("tenant_id", input.tenantId)
        .eq("user_id", input.userId)
        .maybeSingle(),
      this.db
        .from("candidate_profiles")
        .select(
          "user_id,full_name,email,phone,cpf,profile_image_file_name,profile_image_path,profile_image_mime_type,profile_image_size_bytes"
        )
        .eq("user_id", input.userId)
        .maybeSingle(),
      this.db.auth.admin.getUserById(input.userId)
    ]);

    if (profileRes.error) throw profileRes.error;
    if (candidateProfileRes.error) throw candidateProfileRes.error;
    if (authRes.error) throw authRes.error;

    const profile = profileRes.data as EmployeeProfileRow | null;
    const candidateProfile = candidateProfileRes.data as CandidateProfileSourceRow | null;
    const authUser = authRes.data.user;
    const authMetadata = (authUser?.user_metadata ?? {}) as Record<string, unknown>;
    const normalizedAuthEmail = authUser?.email?.trim().toLowerCase() ?? null;
    const personalEmail = profile?.personal_email ?? candidateProfile?.email ?? normalizedAuthEmail;

    const candidate = await this.getTenantCandidateSource({
      tenantId: input.tenantId,
      userId: input.userId,
      email: personalEmail
    });

    if (!profile && !candidateProfile && !candidate && !authUser) return null;

    return {
      tenantId: input.tenantId,
      userId: input.userId,
      authEmail: normalizedAuthEmail,
      fullName:
        profile?.full_name ??
        candidateProfile?.full_name ??
        candidate?.full_name ??
        (typeof authMetadata.full_name === "string" ? authMetadata.full_name : null) ??
        null,
      personalEmail,
      cpf: profile?.cpf ?? candidateProfile?.cpf ?? candidate?.cpf ?? null,
      phone: profile?.phone ?? candidateProfile?.phone ?? candidate?.phone ?? null,
      department: profile?.department ?? null,
      positionTitle: profile?.position_title ?? null,
      contractType: profile?.contract_type ?? null,
      admissionDate: profile?.admission_date ?? null,
      baseSalary: profile?.base_salary ?? null,
      profileImageFileName: profile?.profile_image_file_name ?? candidateProfile?.profile_image_file_name ?? null,
      profileImagePath: profile?.profile_image_path ?? candidateProfile?.profile_image_path ?? null,
      profileImageMimeType: profile?.profile_image_mime_type ?? candidateProfile?.profile_image_mime_type ?? null,
      profileImageSizeBytes: profile?.profile_image_size_bytes ?? candidateProfile?.profile_image_size_bytes ?? null,
      employeeTags: profile?.employee_tags ?? [],
      status: profile?.status ?? "active"
    };
  }

  async bulkEmployeeProfilesLite(input: {
    tenantId: string;
    companyId: string | null;
    userIds: string[];
  }): Promise<Record<string, { department: string | null; contractType: string | null; positionTitle: string | null }>> {
    const userIds = Array.from(new Set((input.userIds ?? []).filter(Boolean)));
    if (userIds.length === 0) return {};

    let query = this.db
      .from("tenant_user_profiles")
      .select("user_id,department,contract_type,position_title")
      .eq("tenant_id", input.tenantId)
      .in("user_id", userIds);

    if (input.companyId) {
      query = query.eq("company_id", input.companyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      user_id: string;
      department: string | null;
      contract_type: string | null;
      position_title: string | null;
    }>;

    const out: Record<string, { department: string | null; contractType: string | null; positionTitle: string | null }> = {};
    for (const row of rows) {
      if (!row.user_id) continue;
      out[row.user_id] = {
        department: row.department ?? null,
        contractType: row.contract_type ?? null,
        positionTitle: row.position_title ?? null
      };
    }
    return out;
  }

  async upsertEmployeeProfile(input: {
    tenantId: string;
    companyId?: string | null;
    userId: string;
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
    const normalizedEmail = input.personalEmail?.trim().toLowerCase() || null;
    const normalizedCpf = input.cpf?.replace(/\D/g, "") || null;
    const normalizedPhone = input.phone?.replace(/\D/g, "") || null;
    const companyId =
      input.companyId ??
      (await this.getTenantUserCompanyId(input.tenantId, input.userId)) ??
      (await fetchDefaultTenantCompanyId(this.db, input.tenantId));

    const { data, error } = await this.db
      .from("tenant_user_profiles")
      .upsert(
        {
          tenant_id: input.tenantId,
          company_id: companyId,
          user_id: input.userId,
          full_name: input.fullName ?? null,
          personal_email: normalizedEmail,
          cpf: normalizedCpf,
          phone: normalizedPhone,
          department: input.department ?? null,
          position_title: input.positionTitle ?? null,
          contract_type: input.contractType ?? null,
          admission_date: input.admissionDate ?? null,
          base_salary: input.baseSalary ?? null,
          employee_tags: input.employeeTags ?? []
        },
        { onConflict: "tenant_id,user_id" }
      )
      .select(
        "tenant_id,user_id,full_name,personal_email,cpf,phone,department,position_title,contract_type,admission_date,base_salary,profile_image_file_name,profile_image_path,profile_image_mime_type,profile_image_size_bytes,employee_tags,status"
      )
      .single();
    if (error) throw error;

    const profile = mapEmployeeProfile(data as EmployeeProfileRow);
    await this.syncCoreProfileToCandidateSources({
      tenantId: input.tenantId,
      userId: input.userId,
      fullName: profile.fullName,
      personalEmail: profile.personalEmail,
      cpf: profile.cpf,
      phone: profile.phone
    });

    return this.enrichEmployeeProfileWithAuthEmail(profile);
  }

  async updateEmployeeProfileImage(input: {
    tenantId: string;
    companyId?: string | null;
    userId: string;
    fileName: string;
    filePath: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<EmployeeProfile> {
    const companyId =
      input.companyId ??
      (await this.getTenantUserCompanyId(input.tenantId, input.userId)) ??
      (await fetchDefaultTenantCompanyId(this.db, input.tenantId));
    const { data, error } = await this.db
      .from("tenant_user_profiles")
      .upsert(
        {
          tenant_id: input.tenantId,
          company_id: companyId,
          user_id: input.userId,
          profile_image_file_name: input.fileName,
          profile_image_path: input.filePath,
          profile_image_mime_type: input.mimeType,
          profile_image_size_bytes: input.sizeBytes
        },
        { onConflict: "tenant_id,user_id" }
      )
      .select(
        "tenant_id,user_id,full_name,personal_email,cpf,phone,department,position_title,contract_type,admission_date,base_salary,profile_image_file_name,profile_image_path,profile_image_mime_type,profile_image_size_bytes,employee_tags,status"
      )
      .single();
    if (error) throw error;
    return this.enrichEmployeeProfileWithAuthEmail(mapEmployeeProfile(data as EmployeeProfileRow));
  }

  private async enrichEmployeeProfileWithAuthEmail(profile: EmployeeProfile): Promise<EmployeeProfile> {
    const { data, error } = await this.db.auth.admin.getUserById(profile.userId);
    if (error) throw error;
    return {
      ...profile,
      authEmail: data.user?.email ?? null
    };
  }

  private async getTenantCandidateSource(input: {
    tenantId: string;
    userId: string;
    email: string | null;
  }): Promise<CandidateSourceRow | null> {
    let query = this.db
      .from("candidates")
      .select("id,tenant_id,user_id,full_name,email,phone,cpf,updated_at")
      .eq("tenant_id", input.tenantId)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (input.email) {
      query = query.or(`user_id.eq.${input.userId},email.eq.${input.email}`);
    } else {
      query = query.eq("user_id", input.userId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return (data as CandidateSourceRow | null) ?? null;
  }

  private async syncCoreProfileToCandidateSources(input: {
    tenantId: string;
    userId: string;
    fullName: string | null;
    personalEmail: string | null;
    cpf: string | null;
    phone: string | null;
  }): Promise<void> {
    const profilePatch: Record<string, unknown> = {};
    if (input.fullName) profilePatch.full_name = input.fullName;
    if (input.personalEmail) profilePatch.email = input.personalEmail;
    if (input.cpf) profilePatch.cpf = input.cpf;
    if (input.phone) profilePatch.phone = input.phone;

    if (Object.keys(profilePatch).length === 0) return;

    const { error: candidateProfileError } = await this.db
      .from("candidate_profiles")
      .upsert(
        {
          user_id: input.userId,
          ...profilePatch
        },
        { onConflict: "user_id" }
      );
    if (candidateProfileError) throw candidateProfileError;

    const { error: candidateByUserError } = await this.db
      .from("candidates")
      .update(profilePatch)
      .eq("tenant_id", input.tenantId)
      .eq("user_id", input.userId);
    if (candidateByUserError) throw candidateByUserError;

    if (input.personalEmail) {
      const { error: candidateByEmailError } = await this.db
        .from("candidates")
        .update({
          ...profilePatch,
          user_id: input.userId
        })
        .eq("tenant_id", input.tenantId)
        .eq("email", input.personalEmail)
        .is("user_id", null);
      if (candidateByEmailError) throw candidateByEmailError;
    }
  }

  async listOnboardingRequirements(tenantId: string): Promise<OnboardingRequirement[]> {
    const { data, error } = await this.db
      .from("employee_onboarding_requirements")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as OnboardingRequirementRow[]).map(mapOnboardingRequirement);
  }

  async createOnboardingRequirement(input: {
    tenantId: string;
    createdBy: string;
    title: string;
    category: string;
    isRequired: boolean;
    appliesToContract?: string | null;
  }): Promise<OnboardingRequirement> {
    const { data, error } = await this.db
      .from("employee_onboarding_requirements")
      .insert({
        tenant_id: input.tenantId,
        created_by: input.createdBy,
        title: input.title,
        category: input.category,
        is_required: input.isRequired,
        applies_to_contract: input.appliesToContract ?? null
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapOnboardingRequirement(data as OnboardingRequirementRow);
  }

  async listOnboardingSubmissions(input: {
    tenantId: string;
    userId?: string;
  }): Promise<OnboardingSubmission[]> {
    let query = this.db
      .from("employee_onboarding_submissions")
      .select("*")
      .eq("tenant_id", input.tenantId)
      .order("created_at", { ascending: false });
    if (input.userId) query = query.eq("user_id", input.userId);
    const { data, error } = await query;
    if (error) throw error;
    return ((data ?? []) as OnboardingSubmissionRow[]).map(mapOnboardingSubmission);
  }

  async upsertOnboardingSubmission(input: {
    tenantId: string;
    requirementId: string;
    userId: string;
    documentId?: string | null;
  }): Promise<OnboardingSubmission> {
    const { data, error } = await this.db
      .from("employee_onboarding_submissions")
      .upsert(
        {
          tenant_id: input.tenantId,
          requirement_id: input.requirementId,
          user_id: input.userId,
          document_id: input.documentId ?? null,
          status: "submitted",
          submitted_at: new Date().toISOString()
        },
        { onConflict: "tenant_id,requirement_id,user_id" }
      )
      .select("*")
      .single();
    if (error) throw error;
    return mapOnboardingSubmission(data as OnboardingSubmissionRow);
  }

  async reviewOnboardingSubmission(input: {
    tenantId: string;
    submissionId: string;
    reviewerUserId: string;
    status: "approved" | "rejected";
    reviewNote?: string | null;
  }): Promise<OnboardingSubmission> {
    const { data, error } = await this.db
      .from("employee_onboarding_submissions")
      .update({
        status: input.status,
        reviewed_by: input.reviewerUserId,
        reviewed_at: new Date().toISOString(),
        review_note: input.reviewNote ?? null
      })
      .eq("tenant_id", input.tenantId)
      .eq("id", input.submissionId)
      .select("*")
      .single();
    if (error) throw error;
    return mapOnboardingSubmission(data as OnboardingSubmissionRow);
  }

  async updateTenantWorkRule(input: {
    tenantId: string;
    companyId: string;
    dailyWorkMinutes: number;
    nightStart: string;
    nightEnd: string;
  }): Promise<TenantWorkRule> {
    const { data, error } = await this.db
      .from("tenant_work_rules")
      .upsert(
        {
          tenant_id: input.tenantId,
          company_id: input.companyId,
          daily_work_minutes: input.dailyWorkMinutes,
          night_start: input.nightStart,
          night_end: input.nightEnd
        },
        { onConflict: "tenant_id,company_id" }
      )
      .select("*")
      .single();
    if (error) throw error;
    return mapTenantWorkRule(data as TenantWorkRuleRow);
  }

  async listTimeEntriesInRange(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    from: string;
    to: string;
  }): Promise<TimeEntry[]> {
    const fromIso = `${input.from}T00:00:00.000Z`;
    const toIso = `${input.to}T23:59:59.999Z`;
    const { data, error } = await withCompany(
      this.db.from("time_entries").select("*").eq("tenant_id", input.tenantId).eq("user_id", input.userId),
      input.companyId
    )
      .gte("recorded_at", fromIso)
      .lte("recorded_at", toIso)
      .order("recorded_at", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as TimeEntryRow[]).map(mapTimeEntry);
  }

  async listApprovedOncallInRange(input: {
    tenantId: string;
    userId: string;
    companyId?: string | null;
    from: string;
    to: string;
  }): Promise<OncallEntry[]> {
    const { data, error } = await withCompany(
      this.db.from("oncall_entries").select("*").eq("tenant_id", input.tenantId).eq("user_id", input.userId),
      input.companyId
    )
      .eq("status", "approved")
      .gte("oncall_date", input.from)
      .lte("oncall_date", input.to)
      .order("oncall_date", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as OncallRow[]).map(mapOncall);
  }

  async createTimeReportClosure(input: {
    tenantId: string;
    companyId: string;
    userId: string;
    userName: string | null;
    userCpf: string | null;
    userEmail: string | null;
    department: string | null;
    positionTitle: string | null;
    contractType: string | null;
    referenceMonth: string;
    from: string;
    to: string;
    summary: Record<string, unknown>;
    entries: Array<Record<string, unknown>>;
    closedBy: string;
  }): Promise<TimeReportClosure> {
    try {
      const { data, error } = await this.db
        .from("time_report_closures")
        .insert({
          tenant_id: input.tenantId,
          company_id: input.companyId,
          user_id: input.userId,
          user_name: input.userName,
          user_cpf: input.userCpf,
          user_email: input.userEmail,
          department: input.department,
          position_title: input.positionTitle,
          contract_type: input.contractType,
          reference_month: input.referenceMonth,
          from_date: input.from,
          to_date: input.to,
          summary_json: input.summary,
          entries_json: input.entries,
          closed_by: input.closedBy
        })
        .select("*")
        .single();
      if (error) throw error;
      return mapTimeReportClosure(data as TimeReportClosureRow);
    } catch (error) {
      if (isTimeReportClosureTableMissing(error)) throw new Error("TIME_REPORT_CLOSURES_NOT_MIGRATED");
      throw error;
    }
  }

  async listTimeReportClosures(input: {
    tenantId: string;
    userId?: string;
    referenceMonth?: string;
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<TimeReportClosure>> {
    try {
      let query = this.db
        .from("time_report_closures")
        .select("*")
        .eq("tenant_id", input.tenantId)
        .order("closed_at", { ascending: false });
      if (input.userId) query = query.eq("user_id", input.userId);
      if (input.referenceMonth) query = query.eq("reference_month", input.referenceMonth);
      const offset = (input.page - 1) * input.pageSize;
      const { data, error } = await query.range(offset, offset + input.pageSize - 1);
      if (error) throw error;
      return {
        items: ((data ?? []) as TimeReportClosureRow[]).map(mapTimeReportClosure),
        page: input.page,
        pageSize: input.pageSize
      };
    } catch (error) {
      if (isTimeReportClosureTableMissing(error)) throw new Error("TIME_REPORT_CLOSURES_NOT_MIGRATED");
      throw error;
    }
  }

  async getTimeReportClosureById(input: {
    tenantId: string;
    closureId: string;
  }): Promise<TimeReportClosure | null> {
    try {
      const { data, error } = await this.db
        .from("time_report_closures")
        .select("*")
        .eq("tenant_id", input.tenantId)
        .eq("id", input.closureId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return mapTimeReportClosure(data as TimeReportClosureRow);
    } catch (error) {
      if (isTimeReportClosureTableMissing(error)) throw new Error("TIME_REPORT_CLOSURES_NOT_MIGRATED");
      throw error;
    }
  }
}

function isTimeReportClosureTableMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return message.includes("time_report_closures");
}
