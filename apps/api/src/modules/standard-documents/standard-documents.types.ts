export type PlatformDocumentType = {
  id: string;
  docClass: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TenantDocumentTypeSetting = {
  tenantId: string;
  platformDocumentTypeId: string;
  isEnabled: boolean;
  requiredForHire: boolean;
  requiredForRecruitment: boolean;
  updatedAt: string;
};

export type TenantDocumentTypeRow = PlatformDocumentType & {
  isEnabled: boolean;
  requiredForHire: boolean;
  requiredForRecruitment: boolean;
};
