import { z } from "zod";

import { isPlatformAdminUser, type AuthenticatedRequest } from "../../http/auth.js";
import { PlatformService } from "./platform.service.js";

const createTenantSchema = z.object({
  displayName: z.string().min(2).max(200),
  legalName: z.string().min(2).max(200).optional().nullable()
});

const grantAdminSchema = z.object({
  tenantId: z.string().uuid()
});

const addSuperadminSchema = z.object({
  email: z.string().email()
});

const patchAiSettingsSchema = z
  .object({
    clearOpenaiApiKey: z.boolean().optional(),
    openaiApiKey: z.string().max(4000).optional(),
    openaiModel: z.string().max(200).optional().nullable(),
    clearGeminiApiKey: z.boolean().optional(),
    geminiApiKey: z.string().max(4000).optional(),
    geminiModel: z.string().max(200).optional().nullable()
  })
  .strict();

const patchTenantAiProviderSchema = z
  .object({
    provider: z.enum(["openai", "gemini"]).nullable()
  })
  .strict();

export class PlatformHandlers {
  constructor(private readonly service: PlatformService) {}

  async me(auth: { userId: string; email: string | null }) {
    const isPlatformAdmin = await isPlatformAdminUser(auth.userId, auth.email);
    return { isPlatformAdmin };
  }

  async listTenants() {
    return this.service.listTenants();
  }

  async createTenant(input: unknown) {
    const payload = createTenantSchema.parse(input);
    return this.service.createTenant({
      displayName: payload.displayName,
      legalName: payload.legalName ?? null
    });
  }

  async grantAdminAccess(input: unknown, auth: AuthenticatedRequest["auth"]) {
    const payload = grantAdminSchema.parse(input);
    return this.service.grantAdminAccess({
      tenantId: payload.tenantId,
      userId: auth.userId
    });
  }

  async listSuperadmins() {
    return this.service.listSuperadminsWithEmails();
  }

  async addSuperadmin(input: unknown, auth: AuthenticatedRequest["auth"]) {
    const payload = addSuperadminSchema.parse(input);
    return this.service.addSuperadminByEmail({
      email: payload.email,
      invitedByUserId: auth.userId
    });
  }

  async getAiSettings() {
    return this.service.getAiSettingsForPanel();
  }

  async patchAiSettings(input: unknown) {
    const payload = patchAiSettingsSchema.parse(input);
    return this.service.updateAiSettingsFromPanel({
      clearOpenaiApiKey: payload.clearOpenaiApiKey,
      openaiApiKey: payload.openaiApiKey,
      openaiModel: payload.openaiModel,
      clearGeminiApiKey: payload.clearGeminiApiKey,
      geminiApiKey: payload.geminiApiKey,
      geminiModel: payload.geminiModel
    });
  }

  async patchTenantAiProvider(tenantId: string, input: unknown) {
    const id = z.string().uuid().parse(tenantId);
    const payload = patchTenantAiProviderSchema.parse(input);
    return this.service.updateTenantAiProvider({ tenantId: id, provider: payload.provider });
  }
}
