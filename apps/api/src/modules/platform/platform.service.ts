import { env } from "../../config/env.js";
import { invalidatePlatformAiSettingsCache } from "../ai/platform-ai-runtime.js";
import {
  PlatformRepository,
  type PlatformAiSettingsRow,
  type PlatformTenantRow
} from "./platform.repository.js";
import { slugifyCompanyName } from "./platform.slugify.js";

function keyHint(dbKey: string | null): { configuredInDatabase: boolean; lastFour: string | null } {
  if (!dbKey?.trim()) return { configuredInDatabase: false, lastFour: null };
  const s = dbKey.trim();
  return { configuredInDatabase: true, lastFour: s.length <= 4 ? "****" : s.slice(-4) };
}

export class PlatformService {
  constructor(private readonly repository: PlatformRepository) {}

  async listTenants(): Promise<PlatformTenantRow[]> {
    return this.repository.listAllTenants();
  }

  async createTenant(input: {
    displayName: string;
    legalName?: string | null;
  }): Promise<PlatformTenantRow> {
    const displayName = input.displayName.trim();
    if (displayName.length < 2) throw new Error("INVALID_DISPLAY_NAME");
    const legalName = (input.legalName ?? displayName).trim();

    const baseSlug = slugifyCompanyName(displayName);
    const slug = await this.repository.ensureUniqueSlug(baseSlug);

    const tenantId = await this.repository.createTenantRecord({
      slug,
      legalName,
      displayName
    });

    await this.repository.createDefaultTenantCompany({
      tenantId,
      name: displayName
    });

    await this.repository.ensureStarterPlanAndFeatures(tenantId);

    const row = await this.repository.findTenantBySlug(slug);
    if (!row) throw new Error("TENANT_NOT_FOUND");
    return row;
  }

  async grantAdminAccess(input: { tenantId: string; userId: string }): Promise<{ ok: true }> {
    await this.repository.upsertUserTenantRole({
      tenantId: input.tenantId,
      userId: input.userId,
      role: "admin"
    });
    return { ok: true };
  }

  async listSuperadminsWithEmails(): Promise<
    { userId: string; email: string | null; createdAt: string }[]
  > {
    const rows = await this.repository.listPlatformSuperadmins();
    const result: { userId: string; email: string | null; createdAt: string }[] = [];
    for (const row of rows) {
      const email = await this.repository.getAuthUserEmailById(row.user_id);
      result.push({
        userId: row.user_id,
        email,
        createdAt: row.created_at
      });
    }
    return result;
  }

  async addSuperadminByEmail(input: {
    email: string;
    invitedByUserId: string;
  }): Promise<{ userId: string; created: boolean }> {
    const email = input.email.trim().toLowerCase();
    if (!email.includes("@")) throw new Error("INVALID_EMAIL");

    let userId = await this.repository.findAuthUserIdByEmail(email);
    let created = false;
    if (!userId) {
      userId = await this.repository.inviteUserByEmail(email, "Superadmin plataforma");
      created = true;
    }

    await this.repository.insertPlatformSuperadmin({
      userId,
      invitedByUserId: input.invitedByUserId
    });

    return { userId, created };
  }

  async getAiSettingsForPanel(): Promise<{
    openai: { configuredInDatabase: boolean; keyLastFour: string | null; model: string | null };
    gemini: { configuredInDatabase: boolean; keyLastFour: string | null; model: string | null };
    environment: {
      openaiKeyPresent: boolean;
      geminiKeyPresent: boolean;
      defaultOpenaiModel: string;
      defaultGeminiModel: string;
    };
  }> {
    const row = await this.repository.getPlatformAiSettingsRow();
    const o = keyHint(row?.openai_api_key ?? null);
    const g = keyHint(row?.gemini_api_key ?? null);
    return {
      openai: {
        configuredInDatabase: o.configuredInDatabase,
        keyLastFour: o.lastFour,
        model: row?.openai_model?.trim() || null
      },
      gemini: {
        configuredInDatabase: g.configuredInDatabase,
        keyLastFour: g.lastFour,
        model: row?.gemini_model?.trim() || null
      },
      environment: {
        openaiKeyPresent: Boolean(env.OPENAI_API_KEY?.trim()),
        geminiKeyPresent: Boolean(env.GEMINI_API_KEY?.trim()),
        defaultOpenaiModel: env.OPENAI_MODEL,
        defaultGeminiModel: env.GEMINI_MODEL
      }
    };
  }

  async updateAiSettingsFromPanel(input: {
    clearOpenaiApiKey?: boolean;
    openaiApiKey?: string;
    openaiModel?: string | null;
    clearGeminiApiKey?: boolean;
    geminiApiKey?: string;
    geminiModel?: string | null;
  }): Promise<{ ok: true }> {
    const current =
      (await this.repository.getPlatformAiSettingsRow()) ??
      ({
        openai_api_key: null,
        openai_model: null,
        gemini_api_key: null,
        gemini_model: null
      } satisfies PlatformAiSettingsRow);

    const next: PlatformAiSettingsRow = { ...current };

    if (typeof input.openaiApiKey === "string" && input.openaiApiKey.trim().length > 0) {
      next.openai_api_key = input.openaiApiKey.trim();
    } else if (input.clearOpenaiApiKey) {
      next.openai_api_key = null;
    }

    if (input.openaiModel !== undefined) {
      const m = input.openaiModel === null ? "" : input.openaiModel.trim();
      next.openai_model = m.length > 0 ? m : null;
    }

    if (typeof input.geminiApiKey === "string" && input.geminiApiKey.trim().length > 0) {
      next.gemini_api_key = input.geminiApiKey.trim();
    } else if (input.clearGeminiApiKey) {
      next.gemini_api_key = null;
    }

    if (input.geminiModel !== undefined) {
      const m = input.geminiModel === null ? "" : input.geminiModel.trim();
      next.gemini_model = m.length > 0 ? m : null;
    }

    await this.repository.upsertPlatformAiSettingsRow(next);
    invalidatePlatformAiSettingsCache();
    return { ok: true };
  }

  async updateTenantAiProvider(input: {
    tenantId: string;
    provider: "openai" | "gemini" | null;
  }): Promise<{ ok: true }> {
    const row = await this.repository.findTenantById(input.tenantId);
    if (!row) throw new Error("TENANT_NOT_FOUND");
    await this.repository.updateTenantAiProvider(input.tenantId, input.provider);
    return { ok: true };
  }
}
