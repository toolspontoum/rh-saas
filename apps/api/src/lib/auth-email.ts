import type { SupabaseClient } from "@supabase/supabase-js";

export function isAuthEmailAlreadyTaken(error: { message?: string }): boolean {
  const m = (error.message ?? "").toLowerCase();
  return (
    m.includes("already been registered") ||
    m.includes("already registered") ||
    m.includes("user already registered") ||
    (m.includes("email") && m.includes("already"))
  );
}

export async function updateAuthUserAccountEmail(
  db: SupabaseClient,
  userId: string,
  newEmail: string
): Promise<{ changed: boolean; previousEmail: string | null; email: string }> {
  const normalizedEmail = newEmail.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("INVALID_EMAIL");
  }

  const { data: authData, error: authErr } = await db.auth.admin.getUserById(userId);
  if (authErr || !authData.user) {
    throw new Error("AUTH_USER_NOT_FOUND");
  }

  const previousEmail = authData.user.email?.trim().toLowerCase() ?? null;
  if (normalizedEmail === previousEmail) {
    return { changed: false, previousEmail, email: normalizedEmail };
  }

  const { error: updateErr } = await db.auth.admin.updateUserById(userId, {
    email: normalizedEmail
  });
  if (updateErr) {
    if (isAuthEmailAlreadyTaken(updateErr)) {
      throw new Error("EMAIL_ALREADY_IN_USE");
    }
    throw updateErr;
  }

  return { changed: true, previousEmail, email: normalizedEmail };
}
