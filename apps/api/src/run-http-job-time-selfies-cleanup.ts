import { env } from "./config/env.js";
import { supabaseAdmin } from "./lib/supabase.js";

const RETENTION_DAYS = 60;
const LIST_LIMIT = 1000;
const DELETE_BATCH = 100;
const MAX_TENANTS = 5000;

function isoDaysAgo(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function runTimeSelfiesCleanupFromHttpJob() {
  void (async () => {
    const bucket = env.STORAGE_BUCKET_DOCUMENTS;
    const cutoffMs = isoDaysAgo(RETENTION_DAYS);

    // Estrutura esperada: tenants/{tenantId}/time-selfies/<arquivo>.jpg
    const { data: tenantFolders, error: listTenantsErr } = await supabaseAdmin.storage.from(bucket).list("tenants", {
      limit: LIST_LIMIT,
      offset: 0,
      sortBy: { column: "name", order: "asc" }
    });
    if (listTenantsErr) {
      console.error("[time-selfies-cleanup] list tenants failed", listTenantsErr);
      return;
    }
    const tenants = (tenantFolders ?? [])
      .map((item) => (item as { name?: string }).name ?? "")
      .filter(Boolean)
      .slice(0, MAX_TENANTS);

    let deleted = 0;
    for (const tenantId of tenants) {
      const folder = `tenants/${tenantId}/time-selfies`;
      const { data: files, error: listErr } = await supabaseAdmin.storage.from(bucket).list(folder, {
        limit: LIST_LIMIT,
        offset: 0,
        sortBy: { column: "name", order: "asc" }
      });
      if (listErr) continue;

      const targets = (files ?? [])
        .filter((f) => {
          const createdAt = (f as { created_at?: string }).created_at;
          if (!createdAt) return false;
          const t = new Date(createdAt).getTime();
          return Number.isFinite(t) && t < cutoffMs;
        })
        .map((f) => `${folder}/${(f as { name?: string }).name ?? ""}`)
        .filter((p) => !p.endsWith("/"));

      for (const batch of chunk(targets, DELETE_BATCH)) {
        const { error: delErr } = await supabaseAdmin.storage.from(bucket).remove(batch);
        if (!delErr) deleted += batch.length;
      }
    }

    console.log("[time-selfies-cleanup] completed", { deleted, retentionDays: RETENTION_DAYS });
  })();
}

