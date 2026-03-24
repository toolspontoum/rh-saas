export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
};

export type Notice = {
  id: string;
  tenantId: string;
  title: string;
  message: string;
  target: "all" | "employee" | "manager";
  recipientUserIds?: string[] | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  attachments?: NoticeAttachment[];
  readAt?: string | null;
  readCount?: number;
};

export type NoticeAttachment = {
  id: string;
  tenantId: string;
  noticeId: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  signedUrl?: string | null;
};

export type TimeEntry = {
  id: string;
  tenantId: string;
  userId: string;
  userName?: string | null;
  userCpf?: string | null;
  contract: string | null;
  entryType: "clock_in" | "lunch_out" | "lunch_in" | "clock_out";
  recordedAt: string;
  source: string;
  note: string | null;
  oncallShiftId?: string | null;
  createdAt: string;
};

export type TimeAdjustmentRequest = {
  id: string;
  tenantId: string;
  userId: string;
  userName?: string | null;
  userCpf?: string | null;
  targetDate: string;
  requestedTime: string;
  timeEntryId: string | null;
  targetEntryType: TimeEntry["entryType"] | null;
  requestedRecordedAt: string | null;
  originalRecordedAt: string | null;
  changeLog: Array<Record<string, unknown>>;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
};

export type TimeEntryChangeLog = {
  id: string;
  tenantId: string;
  timeEntryId: string;
  userId: string;
  changedBy: string | null;
  source: string;
  previousRecordedAt: string;
  newRecordedAt: string;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type OncallShiftStatus = "pending_ack" | "acknowledged" | "entry_registered" | "cancelled";

export type OncallShiftEventType =
  | "created"
  | "updated"
  | "deleted"
  | "acknowledged"
  | "entry_registered"
  | "entry_linked"
  | "entry_unlinked"
  | "status_changed"
  | "note";

export type OncallShift = {
  id: string;
  tenantId: string;
  companyId: string;
  userId: string;
  scheduledDate: string;
  startsAt: string;
  endsAt: string;
  status: OncallShiftStatus;
  note: string | null;
  linkedTimeEntryId: string | null;
  linkedTimeEntryAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedByUserId: string | null;
  cancelledAt: string | null;
  cancelledByUserId: string | null;
  cancelReason: string | null;
  employeeFullName: string | null;
  employeeEmail: string | null;
  employeeCpf: string | null;
  employeePhone: string | null;
  department: string | null;
  positionTitle: string | null;
  contractType: string | null;
  employeeTags: string[];
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OncallShiftEvent = {
  id: string;
  tenantId: string;
  oncallShiftId: string;
  userId: string;
  actorUserId: string | null;
  eventType: OncallShiftEventType;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type OncallShiftWithEvents = OncallShift & {
  events: OncallShiftEvent[];
  linkedTimeEntry: TimeEntry | null;
};

// LEGACY (remover quando o fluxo antigo de oncall_entries for desativado)
export type OncallEntry = {
  id: string;
  tenantId: string;
  userId: string;
  contract: string | null;
  oncallDate: string;
  startTime: string;
  endTime: string;
  oncallType: string;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
};

export type TenantWorkRule = {
  tenantId: string;
  dailyWorkMinutes: number;
  nightStart: string;
  nightEnd: string;
};

export type ShiftTemplate = {
  id: string;
  tenantId: string;
  name: string;
  dailyWorkMinutes: number;
  weeklyWorkMinutes: number | null;
  lunchBreakMinutes: number;
  overtimePercent: number;
  monthlyWorkMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ShiftAssignment = {
  id: string;
  tenantId: string;
  userId: string;
  shiftTemplateId: string;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OnboardingRequirement = {
  id: string;
  tenantId: string;
  title: string;
  category: string;
  isRequired: boolean;
  appliesToContract: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OnboardingSubmission = {
  id: string;
  tenantId: string;
  requirementId: string;
  userId: string;
  documentId: string | null;
  status: "pending" | "submitted" | "approved" | "rejected";
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeProfile = {
  tenantId: string;
  userId: string;
  authEmail: string | null;
  fullName: string | null;
  personalEmail: string | null;
  cpf: string | null;
  phone: string | null;
  department: string | null;
  positionTitle: string | null;
  contractType: string | null;
  admissionDate: string | null;
  baseSalary: number | null;
  profileImageFileName: string | null;
  profileImagePath: string | null;
  profileImageMimeType: string | null;
  profileImageSizeBytes: number | null;
  employeeTags: string[];
  status: "active" | "inactive" | "offboarded";
};

export type TimeReportSummary = {
  tenantId: string;
  userId: string;
  from: string;
  to: string;
  expectedMinutes: number;
  workedMinutes: number;
  overtimeMinutes: number;
  deficitMinutes: number;
  nightMinutes: number;
  oncallMinutes: number;
  bankBalanceMinutes: number;
  hourValue: number;
  overtimeValue: number;
  deficitValue: number;
  shiftTemplateName: string | null;
};

export type TimeReportClosureEntry = {
  entryType: TimeEntry["entryType"];
  recordedAt: string;
};

export type TimeReportClosure = {
  id: string;
  tenantId: string;
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
  summary: TimeReportSummary;
  entries: TimeReportClosureEntry[];
  closedBy: string;
  closedAt: string;
};
