export type DocumentRecord = {
  id: string;
  tenantId: string;
  collaboratorName: string;
  collaboratorEmail: string;
  contract: string | null;
  title: string;
  description: string | null;
  category: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string | null;
  employeeUserId: string | null;
  requestId: string | null;
  docTab: string | null;
  docType: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentRequestRecord = {
  id: string;
  tenantId: string;
  collaboratorName: string;
  collaboratorEmail: string;
  contract: string | null;
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "completed" | "canceled";
  workflow: "standard" | "signature";
  requestedBy: string | null;
  requestedAt: string;
  resolvedAt: string | null;
  employeeUserId: string | null;
  docTab: string;
  docType: string;
  createdAt: string;
  updatedAt: string;
  latestDocument: DocumentRecord | null;
};

export type PayslipRecord = {
  id: string;
  tenantId: string;
  batchId: string | null;
  collaboratorName: string;
  collaboratorEmail: string;
  contract: string | null;
  referenceMonth: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string | null;
  employeeUserId: string | null;
  acknowledgedAt: string | null;
  acknowledgedByUserId: string | null;
  aiLinkStatus: string | null;
  aiLinkError: string | null;
  extractedCpf: string | null;
  aiProcessedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PayslipBatchMeta = {
  id: string;
  tenantId: string;
  title: string | null;
  referenceMonth: string;
  sourceType: string;
  createdAt: string;
  createdBy: string | null;
};

export type PayslipBatchListItem = PayslipBatchMeta & { fileCount: number };

export type PayslipBatchDetailPayload = {
  batch: PayslipBatchMeta;
  items: PayslipRecord[];
};

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
};

export type UploadIntent = {
  bucket: string;
  path: string;
  token: string;
  signedUrl: string;
  expiresIn: number;
};

export type OpenFileUrl = {
  signedUrl: string;
  expiresIn: number;
};
