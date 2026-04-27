import type { SupabaseClient } from "@supabase/supabase-js";

import { inferWebBaseUrl } from "../../lib/web-base-url.js";
import { fetchDefaultTenantCompanyId } from "../../lib/tenant-company-default.js";
import type { AppRole } from "../core-auth-tenant/core-auth-tenant.types.js";
import type {
  EmployeeLookupResult,
  PaginatedResult,
  TenantUser,
  TenantUserStatus
} from "./tenant-users.types.js";

type UserRoleRow = {
  user_id: string;
  role: AppRole;
  is_active: boolean;
};

type TenantUserProfileRow = {
  user_id: string;
  company_id: string;
  full_name: string | null;
  cpf: string | null;
  phone: string | null;
  personal_email?: string | null;
  status: TenantUserStatus;
  offboard_reason: string | null;
  offboarded_at: string | null;
  data_purged_at?: string | null;
};

type TenantUserExtendedProfileRow = TenantUserProfileRow & {
  personal_email: string | null;
  department: string | null;
  position_title: string | null;
  contract_type: string | null;
  admission_date: string | null;
  base_salary: number | null;
  employee_tags: string[] | null;
};

type CandidateProfileLookupRow = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  desired_position: string | null;
};

type CandidateLookupRow = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  contract: string | null;
};

type AuthUserRow = {
  id: string;
  email: string | null;
  lastSignInAt: string | null;
};

export class TenantUsersRepository {
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

  async listUsers(input: {
    tenantId: string;
    companyId?: string | null;
    status?: TenantUserStatus;
    search?: string;
    page: number;
    pageSize: number;
    includePurgedProfiles?: boolean;
  }): Promise<PaginatedResult<TenantUser>> {
    const offset = (input.page - 1) * input.pageSize;
    const showPurged = input.includePurgedProfiles === true;

    if (input.companyId) {
      let profileQuery = this.db
        .from("tenant_user_profiles")
        .select(
          "user_id,company_id,full_name,cpf,phone,personal_email,status,offboard_reason,offboarded_at,data_purged_at"
        )
        .eq("tenant_id", input.tenantId)
        .eq("company_id", input.companyId);
      if (!showPurged) {
        profileQuery = profileQuery.is("data_purged_at", null);
      }
      if (input.status) profileQuery = profileQuery.eq("status", input.status);
      profileQuery = profileQuery.order("user_id", { ascending: true });

      const { data: profileData, error: profileError } = await profileQuery.range(
        offset,
        offset + input.pageSize - 1
      );
      if (profileError) throw profileError;
      const profiles = (profileData ?? []) as unknown as TenantUserProfileRow[];
      if (profiles.length === 0) {
        return { items: [], page: input.page, pageSize: input.pageSize };
      }

      const pageUserIds = profiles.map((p) => p.user_id);
      const { data: roleData, error: roleError } = await this.db
        .from("user_tenant_roles")
        .select("user_id,role,is_active")
        .eq("tenant_id", input.tenantId)
        .in("user_id", pageUserIds);
      if (roleError) throw roleError;
      const roleRows = (roleData ?? []) as unknown as UserRoleRow[];

      let items = await this.buildTenantUsersForProfiles(input.tenantId, profiles, roleRows);
      if (input.search) {
        items = this.filterTenantUsersBySearch(items, input.search);
      }
      return { items, page: input.page, pageSize: input.pageSize };
    }

    let query = this.db
      .from("user_tenant_roles")
      .select("user_id,role,is_active")
      .eq("tenant_id", input.tenantId);

    if (input.status) {
      query = query.eq("tenant_user_profiles.status", input.status);
    }

    const { data, error } = await query.range(offset, offset + input.pageSize - 1);
    if (error) throw error;

    const rows = (data ?? []) as unknown as UserRoleRow[];
    const userIds = [...new Set(rows.map((row) => row.user_id))];

    let profiles: TenantUserProfileRow[] = [];
    if (userIds.length > 0) {
      let profilesQuery = this.db
        .from("tenant_user_profiles")
        .select(
          "user_id,company_id,full_name,cpf,phone,personal_email,status,offboard_reason,offboarded_at,data_purged_at"
        )
        .eq("tenant_id", input.tenantId)
        .in("user_id", userIds);
      if (!showPurged) {
        profilesQuery = profilesQuery.is("data_purged_at", null);
      }
      if (input.status) profilesQuery = profilesQuery.eq("status", input.status);

      const { data: profilesData, error: profilesError } = await profilesQuery;
      if (profilesError) throw profilesError;
      profiles = (profilesData ?? []) as unknown as TenantUserProfileRow[];
    }

    const profileByUserId = new Map(profiles.map((profile) => [profile.user_id, profile]));

    const authUsers: AuthUserRow[] = [];
    for (const uid of userIds) {
      const { data: authData, error: authErr } = await this.db.auth.admin.getUserById(uid);
      if (authErr) throw authErr;
      authUsers.push({
        id: uid,
        email: authData.user?.email ?? null,
        lastSignInAt: authData.user?.last_sign_in_at ?? null
      });
    }

    const emailByUserId = new Map(authUsers.map((user) => [user.id, user.email]));
    const grouped = new Map<string, TenantUser>();

    for (const row of rows) {
      const profile = profileByUserId.get(row.user_id);
      if (!profile) continue;

      const authMeta = authUsers.find((u) => u.id === row.user_id);

      const existing = grouped.get(row.user_id);
      if (existing) {
        existing.roles.push(row.role);
        existing.isAccessEnabled = existing.isAccessEnabled || row.is_active;
        existing.lastSignInAt = existing.lastSignInAt ?? authMeta?.lastSignInAt ?? null;
        continue;
      }

      grouped.set(row.user_id, {
        userId: row.user_id,
        tenantId: input.tenantId,
        companyId: profile.company_id,
        email:
          profile.data_purged_at
            ? null
            : (profile.personal_email ?? emailByUserId.get(row.user_id) ?? null),
        fullName: profile.full_name,
        cpf: profile.cpf,
        phone: profile.phone,
        status: profile.status,
        offboardReason: profile.offboard_reason,
        offboardedAt: profile.offboarded_at,
        roles: [row.role],
        isAccessEnabled: row.is_active,
        lastSignInAt: authMeta?.lastSignInAt ?? null
      });
    }

    let items = [...grouped.values()];
    if (input.search) {
      items = this.filterTenantUsersBySearch(items, input.search);
    }

    return {
      items,
      page: input.page,
      pageSize: input.pageSize
    };
  }

  private filterTenantUsersBySearch(items: TenantUser[], search: string): TenantUser[] {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => {
      const byEmail = (item.email ?? "").toLowerCase().includes(needle);
      const byName = (item.fullName ?? "").toLowerCase().includes(needle);
      const byCpf = (item.cpf ?? "").toLowerCase().includes(needle);
      const byPhone = (item.phone ?? "").toLowerCase().includes(needle);
      return byEmail || byName || byCpf || byPhone;
    });
  }

  private async buildTenantUsersForProfiles(
    tenantId: string,
    orderedProfiles: TenantUserProfileRow[],
    roleRows: UserRoleRow[]
  ): Promise<TenantUser[]> {
    const rolesByUser = new Map<string, UserRoleRow[]>();
    for (const row of roleRows) {
      const list = rolesByUser.get(row.user_id) ?? [];
      list.push(row);
      rolesByUser.set(row.user_id, list);
    }

    const items: TenantUser[] = [];
    for (const profile of orderedProfiles) {
      const rows = rolesByUser.get(profile.user_id);
      if (!rows?.length) continue;

      const { data: authData, error: authErr } = await this.db.auth.admin.getUserById(profile.user_id);
      if (authErr) throw authErr;
      const email = authData.user?.email ?? null;

      const merged: TenantUser = {
        userId: profile.user_id,
        tenantId,
        companyId: profile.company_id,
        email: profile.data_purged_at ? null : (profile.personal_email ?? email),
        fullName: profile.full_name,
        cpf: profile.cpf,
        phone: profile.phone,
        status: profile.status,
        offboardReason: profile.offboard_reason,
        offboardedAt: profile.offboarded_at,
        roles: [],
        isAccessEnabled: false,
        lastSignInAt: authData.user?.last_sign_in_at ?? null,
        dataPurgedAt: profile.data_purged_at ?? null
      };

      for (const row of rows) {
        merged.roles.push(row.role);
        merged.isAccessEnabled = merged.isAccessEnabled || row.is_active;
      }

      items.push(merged);
    }

    return items;
  }

  async getUserInTenant(
    tenantId: string,
    userId: string,
    companyId?: string | null
  ): Promise<TenantUser | null> {
    let profileQuery = this.db
      .from("tenant_user_profiles")
      .select(
        "user_id,company_id,full_name,cpf,phone,personal_email,status,offboard_reason,offboarded_at,data_purged_at"
      )
      .eq("tenant_id", tenantId)
      .eq("user_id", userId);
    if (companyId) {
      profileQuery = profileQuery.eq("company_id", companyId);
    }

    const { data: profileData, error: profileError } = await profileQuery.maybeSingle();
    if (profileError) throw profileError;
    const profile = profileData as TenantUserProfileRow | null;
    if (!profile) return null;

    const { data: roleData, error: roleError } = await this.db
      .from("user_tenant_roles")
      .select("user_id,role,is_active")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId);
    if (roleError) throw roleError;
    const roleRows = (roleData ?? []) as unknown as UserRoleRow[];
    if (roleRows.length === 0) return null;

    const { data: authData, error: authErr } = await this.db.auth.admin.getUserById(userId);
    if (authErr) throw authErr;

    const merged: TenantUser = {
      userId,
      tenantId,
      companyId: profile.company_id,
      email: profile.data_purged_at ? null : (profile.personal_email ?? authData.user?.email ?? null),
      fullName: profile.full_name,
      cpf: profile.cpf,
      phone: profile.phone,
      status: profile.status,
      offboardReason: profile.offboard_reason,
      offboardedAt: profile.offboarded_at,
      dataPurgedAt: profile.data_purged_at ?? null,
      roles: [],
      isAccessEnabled: false,
      lastSignInAt: authData.user?.last_sign_in_at ?? null
    };

    for (const row of roleRows) {
      merged.roles.push(row.role);
      merged.isAccessEnabled = merged.isAccessEnabled || row.is_active;
    }

    return merged;
  }

  async updateUserStatus(input: {
    tenantId: string;
    userId: string;
    status: TenantUserStatus;
    offboardReason: string | null;
  }): Promise<void> {
    const offboardedAt = input.status === "offboarded" ? new Date().toISOString() : null;

    const { error: profileError } = await this.db.from("tenant_user_profiles").upsert(
      {
        tenant_id: input.tenantId,
        user_id: input.userId,
        status: input.status,
        offboard_reason: input.offboardReason,
        offboarded_at: offboardedAt
      },
      {
        onConflict: "tenant_id,user_id"
      }
    );
    if (profileError) throw profileError;

    const isRoleActive = input.status === "active";
    const { error: rolesError } = await this.db
      .from("user_tenant_roles")
      .update({ is_active: isRoleActive })
      .eq("tenant_id", input.tenantId)
      .eq("user_id", input.userId);
    if (rolesError) throw rolesError;
  }

  async hasLinkedRecords(tenantId: string, userId: string): Promise<boolean> {
    const tables = [
      { table: "documents", column: "uploaded_by" },
      { table: "payslips", column: "uploaded_by" },
      { table: "jobs", column: "created_by" }
    ] as const;

    for (const item of tables) {
      const { data, error } = await this.db
        .from(item.table)
        .select("id")
        .eq("tenant_id", tenantId)
        .eq(item.column, userId)
        .limit(1);
      if (error) throw error;
      if ((data ?? []).length > 0) return true;
    }

    return false;
  }

  async purgeCollaboratorData(input: {
    tenantId: string;
    userId: string;
    companyId: string | null;
    reason: string;
  }): Promise<void> {
    const companyId =
      input.companyId ?? (await fetchDefaultTenantCompanyId(this.db, input.tenantId));
    const { error: pErr } = await this.db
      .from("tenant_user_profiles")
      .update({
        full_name: "Colaborador excluído",
        cpf: null,
        phone: null,
        status: "offboarded",
        offboard_reason: input.reason,
        offboarded_at: new Date().toISOString(),
        data_purged_at: new Date().toISOString()
      })
      .eq("tenant_id", input.tenantId)
      .eq("user_id", input.userId)
      .eq("company_id", companyId);
    if (pErr) throw pErr;

    const { error: rErr } = await this.db
      .from("user_tenant_roles")
      .update({ is_active: false })
      .eq("tenant_id", input.tenantId)
      .eq("user_id", input.userId);
    if (rErr) throw rErr;
  }

  async deleteUserFromTenant(tenantId: string, userId: string): Promise<void> {
    const { error: profileError } = await this.db
      .from("tenant_user_profiles")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("user_id", userId);
    if (profileError) throw profileError;

    const { error: rolesError } = await this.db
      .from("user_tenant_roles")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("user_id", userId);
    if (rolesError) throw rolesError;
  }

  async insertAuditLog(input: {
    tenantId: string;
    companyId?: string | null;
    actorUserId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    result: string;
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
      result: input.result,
      metadata: input.metadata
    });
    if (error) throw error;
  }

  private async findUserIdByEmailUsingAuthAdminList(targetLower: string): Promise<string | null> {
    let page = 1;
    const perPage = 200;
    while (page <= 50) {
      const { data, error } = await this.db.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const users = data.users ?? [];
      const found = users.find((user) => (user.email ?? "").toLowerCase() === targetLower);
      if (found?.id) return found.id;
      if (users.length < perPage) break;
      page += 1;
    }
    return null;
  }

  /**
   * Resolução global (qualquer tenant / auth). Usado em upsert de colaborador e fluxos administrativos.
   */
  async findUserIdByEmail(email: string): Promise<string | null> {
    const target = email.trim().toLowerCase();
    if (!target) return null;

    const { data: tenantProfileData, error: tenantProfileError } = await this.db
      .from("tenant_user_profiles")
      .select("user_id")
      .eq("personal_email", target)
      .limit(1)
      .maybeSingle();
    if (tenantProfileError) throw tenantProfileError;
    if (tenantProfileData?.user_id) return (tenantProfileData as { user_id: string }).user_id;

    const { data: candidateProfileData, error: candidateProfileError } = await this.db
      .from("candidate_profiles")
      .select("user_id")
      .eq("email", target)
      .limit(1)
      .maybeSingle();
    if (candidateProfileError) throw candidateProfileError;
    if (candidateProfileData?.user_id) return (candidateProfileData as { user_id: string }).user_id;

    const { data: candidateData, error: candidateError } = await this.db
      .from("candidates")
      .select("user_id")
      .eq("email", target)
      .not("user_id", "is", null)
      .limit(1)
      .maybeSingle();
    if (candidateError) throw candidateError;
    if (candidateData?.user_id) return (candidateData as { user_id: string }).user_id;

    return this.findUserIdByEmailUsingAuthAdminList(target);
  }

  /**
   * Resolução por e-mail **neste tenant**: perfil/candidatura locais + auth (conta Supabase).
   * Evita falso "utilizador existente" por colisão de e-mail em `tenant_user_profiles` de outro assinante.
   */
  async findUserIdByEmailForTenant(tenantId: string, email: string): Promise<string | null> {
    const target = email.trim().toLowerCase();
    if (!target) return null;

    const { data: tenantProfileData, error: tenantProfileError } = await this.db
      .from("tenant_user_profiles")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("personal_email", target)
      .limit(1)
      .maybeSingle();
    if (tenantProfileError) throw tenantProfileError;
    if (tenantProfileData?.user_id) return (tenantProfileData as { user_id: string }).user_id;

    const { data: candidateData, error: candidateError } = await this.db
      .from("candidates")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("email", target)
      .not("user_id", "is", null)
      .limit(1)
      .maybeSingle();
    if (candidateError) throw candidateError;
    if (candidateData?.user_id) return (candidateData as { user_id: string }).user_id;

    const { data: candidateProfileData, error: candidateProfileError } = await this.db
      .from("candidate_profiles")
      .select("user_id")
      .eq("email", target)
      .limit(1)
      .maybeSingle();
    if (candidateProfileError) throw candidateProfileError;
    const cpUid = (candidateProfileData as { user_id: string } | null)?.user_id;
    if (cpUid) {
      const { data: roleRow, error: roleErr } = await this.db
        .from("user_tenant_roles")
        .select("user_id")
        .eq("tenant_id", tenantId)
        .eq("user_id", cpUid)
        .limit(1)
        .maybeSingle();
      if (roleErr) throw roleErr;
      if (roleRow?.user_id) return cpUid;

      const { data: candSameUser, error: candErr } = await this.db
        .from("candidates")
        .select("user_id")
        .eq("tenant_id", tenantId)
        .eq("user_id", cpUid)
        .limit(1)
        .maybeSingle();
      if (candErr) throw candErr;
      if (candSameUser?.user_id) return cpUid;
    }

    return this.findUserIdByEmailUsingAuthAdminList(target);
  }

  async findUserIdByCpf(cpf: string): Promise<string | null> {
    const normalizedCpf = cpf.replace(/\D/g, "");
    if (!normalizedCpf) return null;

    const { data: profileByCpf, error: profileByCpfError } = await this.db
      .from("tenant_user_profiles")
      .select("user_id")
      .eq("cpf", normalizedCpf)
      .limit(1)
      .maybeSingle();
    if (profileByCpfError) throw profileByCpfError;
    if (profileByCpf) return (profileByCpf as { user_id: string }).user_id;

    const { data: candidateProfileData, error: candidateProfileError } = await this.db
      .from("candidate_profiles")
      .select("user_id")
      .eq("cpf", normalizedCpf)
      .limit(1)
      .maybeSingle();
    if (candidateProfileError) throw candidateProfileError;
    if (candidateProfileData) return (candidateProfileData as { user_id: string }).user_id;

    const { data: candidatesData, error: candidatesError } = await this.db
      .from("candidates")
      .select("user_id")
      .eq("cpf", normalizedCpf)
      .not("user_id", "is", null)
      .limit(1)
      .maybeSingle();
    if (candidatesError) throw candidatesError;
    if (candidatesData?.user_id) return (candidatesData as { user_id: string }).user_id;

    return null;
  }

  /**
   * CPF **neste tenant** (perfil local, candidatura local ou candidato com vínculo ao tenant).
   */
  async findUserIdByCpfForTenant(tenantId: string, cpf: string): Promise<string | null> {
    const normalizedCpf = cpf.replace(/\D/g, "");
    if (normalizedCpf.length !== 11) return null;

    const { data: profileByCpf, error: profileByCpfError } = await this.db
      .from("tenant_user_profiles")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("cpf", normalizedCpf)
      .limit(1)
      .maybeSingle();
    if (profileByCpfError) throw profileByCpfError;
    if (profileByCpf) return (profileByCpf as { user_id: string }).user_id;

    const { data: candidatesData, error: candidatesError } = await this.db
      .from("candidates")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("cpf", normalizedCpf)
      .not("user_id", "is", null)
      .limit(1)
      .maybeSingle();
    if (candidatesError) throw candidatesError;
    if (candidatesData?.user_id) return (candidatesData as { user_id: string }).user_id;

    const { data: candidateProfileData, error: candidateProfileError } = await this.db
      .from("candidate_profiles")
      .select("user_id")
      .eq("cpf", normalizedCpf)
      .limit(1)
      .maybeSingle();
    if (candidateProfileError) throw candidateProfileError;
    const cpUid = (candidateProfileData as { user_id: string } | null)?.user_id;
    if (cpUid) {
      const { data: roleRow, error: roleErr } = await this.db
        .from("user_tenant_roles")
        .select("user_id")
        .eq("tenant_id", tenantId)
        .eq("user_id", cpUid)
        .limit(1)
        .maybeSingle();
      if (roleErr) throw roleErr;
      if (roleRow?.user_id) return cpUid;

      const { data: candSameUser, error: candErr } = await this.db
        .from("candidates")
        .select("user_id")
        .eq("tenant_id", tenantId)
        .eq("user_id", cpUid)
        .limit(1)
        .maybeSingle();
      if (candErr) throw candErr;
      if (candSameUser?.user_id) return cpUid;
    }

    return null;
  }

  async inviteUserByEmail(input: { email: string; fullName: string }): Promise<string> {
    const redirectTo = `${inferWebBaseUrl()}/reset-password`;
    const { data, error } = await this.db.auth.admin.inviteUserByEmail(input.email.toLowerCase(), {
      data: {
        full_name: input.fullName
      },
      redirectTo
    });
    if (error) throw error;
    if (!data.user?.id) throw new Error("USER_INVITE_FAILED");
    return data.user.id;
  }

  async getAuthUserAccessMeta(userId: string): Promise<{
    email: string | null;
    lastSignInAt: string | null;
    emailConfirmedAt: string | null;
  }> {
    const { data, error } = await this.db.auth.admin.getUserById(userId);
    if (error) throw error;
    const u = data.user;
    return {
      email: u?.email ?? null,
      lastSignInAt: u?.last_sign_in_at ?? null,
      emailConfirmedAt: u?.email_confirmed_at ?? null
    };
  }

  async upsertEmployeeInTenant(input: {
    tenantId: string;
    companyId: string;
    userId: string;
    fullName: string;
    email?: string | null;
    cpf?: string | null;
    phone?: string | null;
  }): Promise<void> {
    const normalizedEmail = input.email?.trim().toLowerCase() || null;
    const normalizedCpf = input.cpf ? input.cpf.replace(/\D/g, "") : null;
    const normalizedPhone = input.phone?.trim() || null;

    const { error: roleError } = await this.db.from("user_tenant_roles").upsert(
      {
        tenant_id: input.tenantId,
        user_id: input.userId,
        role: "employee",
        is_active: true
      },
      { onConflict: "tenant_id,user_id,role" }
    );
    if (roleError) throw roleError;

    const { error: profileError } = await this.db.from("tenant_user_profiles").upsert(
      {
        tenant_id: input.tenantId,
        company_id: input.companyId,
        user_id: input.userId,
        full_name: input.fullName,
        status: "active",
        offboard_reason: null,
        offboarded_at: null,
        cpf: normalizedCpf,
        phone: normalizedPhone,
        personal_email: normalizedEmail
      },
      { onConflict: "tenant_id,user_id" }
    );
    if (profileError) throw profileError;
  }

  async upsertBackofficeInTenant(input: {
    tenantId: string;
    companyId: string;
    userId: string;
    role: AppRole;
    fullName: string;
    email?: string | null;
    cpf?: string | null;
    phone?: string | null;
  }): Promise<void> {
    const normalizedEmail = input.email?.trim().toLowerCase() || null;
    const normalizedCpf = input.cpf ? input.cpf.replace(/\D/g, "") : null;
    const normalizedPhone = input.phone?.trim() || null;

    const { error: roleError } = await this.db.from("user_tenant_roles").upsert(
      {
        tenant_id: input.tenantId,
        user_id: input.userId,
        role: input.role,
        is_active: true
      },
      { onConflict: "tenant_id,user_id,role" }
    );
    if (roleError) throw roleError;

    const { error: profileError } = await this.db.from("tenant_user_profiles").upsert(
      {
        tenant_id: input.tenantId,
        company_id: input.companyId,
        user_id: input.userId,
        full_name: input.fullName,
        status: "active",
        offboard_reason: null,
        offboarded_at: null,
        cpf: normalizedCpf,
        phone: normalizedPhone,
        personal_email: normalizedEmail
      },
      { onConflict: "tenant_id,user_id" }
    );
    if (profileError) throw profileError;
  }

  private employeeLookupMissingUser(hintEmail: string | null): EmployeeLookupResult {
    return {
      exists: false,
      userId: null,
      email: hintEmail,
      fullName: null,
      cpf: null,
      phone: null,
      department: null,
      positionTitle: null,
      contractType: null,
      admissionDate: null,
      baseSalary: null,
      employeeTags: []
    };
  }

  private async employeeLookupByResolvedUser(
    tenantId: string,
    userId: string,
    candidateMatch: { type: "email"; value: string } | { type: "cpf"; value: string }
  ): Promise<EmployeeLookupResult> {
    const { data: authUserData, error: authUserError } = await this.db.auth.admin.getUserById(userId);
    if (authUserError) throw authUserError;
    const authUser = authUserData.user;

    const { data: profileData, error: profileError } = await this.db
      .from("tenant_user_profiles")
      .select(
        "user_id,full_name,cpf,phone,status,offboard_reason,offboarded_at,personal_email,department,position_title,contract_type,admission_date,base_salary,employee_tags"
      )
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .maybeSingle();
    if (profileError) throw profileError;

    const { data: candidateProfileData, error: candidateProfileError } = await this.db
      .from("candidate_profiles")
      .select("full_name,email,phone,cpf,desired_position")
      .eq("user_id", userId)
      .maybeSingle();
    if (candidateProfileError) throw candidateProfileError;

    const candidateOr =
      candidateMatch.type === "email"
        ? `user_id.eq.${userId},email.eq.${candidateMatch.value}`
        : `user_id.eq.${userId},cpf.eq.${candidateMatch.value}`;

    const { data: candidateData, error: candidateError } = await this.db
      .from("candidates")
      .select("full_name,email,phone,cpf,contract")
      .eq("tenant_id", tenantId)
      .or(candidateOr)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (candidateError) throw candidateError;

    const profile = (profileData as TenantUserExtendedProfileRow | null) ?? null;
    const candidateProfile = (candidateProfileData as CandidateProfileLookupRow | null) ?? null;
    const candidate = (candidateData as CandidateLookupRow | null) ?? null;
    const metadata = (authUser?.user_metadata ?? {}) as Record<string, unknown>;

    const normalizedEmailHint = candidateMatch.type === "email" ? candidateMatch.value : null;

    const { data: roleRows, error: roleLookupError } = await this.db
      .from("user_tenant_roles")
      .select("role")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId);
    if (roleLookupError) throw roleLookupError;
    const roles = (roleRows ?? []) as { role: string }[];
    const hasEmployeeRole = roles.some((r) => r.role === "employee");
    const hasAnyTenantRole = roles.length > 0;
    /**
     * "Conta encontrada" para pré-cadastro: colaborador (papel employee) ou conta Supabase ainda
     * sem vínculo ao tenant (vincular). Utilizadores só com papéis de backoffice não entram na lista
     * de colaboradores e não devem ativar "Vincular" aqui.
     */
    const existsForEmployeePrereg =
      hasEmployeeRole || (!hasAnyTenantRole && profile === null);

    const outUserId = existsForEmployeePrereg ? userId : null;

    return {
      exists: existsForEmployeePrereg,
      userId: outUserId,
      email: profile?.personal_email ?? authUser?.email ?? normalizedEmailHint,
      fullName:
        profile?.full_name ??
        candidateProfile?.full_name ??
        candidate?.full_name ??
        (typeof metadata.full_name === "string" ? metadata.full_name : null) ??
        null,
      cpf: profile?.cpf ?? candidateProfile?.cpf ?? candidate?.cpf ?? null,
      phone: profile?.phone ?? candidateProfile?.phone ?? candidate?.phone ?? null,
      department: profile?.department ?? null,
      positionTitle: profile?.position_title ?? candidateProfile?.desired_position ?? null,
      contractType: profile?.contract_type ?? candidate?.contract ?? null,
      admissionDate: profile?.admission_date ?? null,
      baseSalary: profile?.base_salary ?? null,
      employeeTags: profile?.employee_tags ?? []
    };
  }

  async lookupEmployeeByEmail(tenantId: string, email: string): Promise<EmployeeLookupResult> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return this.employeeLookupMissingUser(null);
    }

    const userId = await this.findUserIdByEmailForTenant(tenantId, normalizedEmail);
    if (!userId) {
      return this.employeeLookupMissingUser(normalizedEmail);
    }

    return this.employeeLookupByResolvedUser(tenantId, userId, { type: "email", value: normalizedEmail });
  }

  async lookupEmployeeByCpf(tenantId: string, cpf: string): Promise<EmployeeLookupResult> {
    const normalizedCpf = cpf.replace(/\D/g, "");
    if (normalizedCpf.length !== 11) {
      return this.employeeLookupMissingUser(null);
    }

    const userId = await this.findUserIdByCpfForTenant(tenantId, normalizedCpf);
    if (!userId) {
      return this.employeeLookupMissingUser(null);
    }

    return this.employeeLookupByResolvedUser(tenantId, userId, { type: "cpf", value: normalizedCpf });
  }
}
