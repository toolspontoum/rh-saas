import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

import {
  DEMO_MARKER,
  DEMO_PASSWORD,
  DEMO_TENANT_SLUG,
  DEMO_USERS,
  type DemoUser
} from "./demo-showcase.shared.js";
import { cleanupDemoShowcase } from "./seed-demo-cleanup.js";

config();

type SupabaseAdmin = ReturnType<typeof createClient>;

type FeatureCode =
  | "mod_recruitment"
  | "mod_documents"
  | "mod_payslips"
  | "mod_time_tracking"
  | "mod_oncall";

const FEATURE_CODES: FeatureCode[] = [
  "mod_recruitment",
  "mod_documents",
  "mod_payslips",
  "mod_time_tracking",
  "mod_oncall"
];

function getClient(): SupabaseAdmin {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

function normalizeTag(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function ensureTenantSetup(db: SupabaseAdmin, tenantSlug: string): Promise<string> {
  const { data: tenantRows, error: tenantError } = await db
    .from("tenants")
    .upsert(
      {
        slug: tenantSlug,
        display_name: "VV Consulting MVP",
        legal_name: "VV Consulting",
        is_active: true
      },
      { onConflict: "slug" }
    )
    .select("id")
    .limit(1);
  if (tenantError) throw tenantError;
  const tenantId = tenantRows?.[0]?.id as string | undefined;
  if (!tenantId) throw new Error("Unable to resolve tenant id.");

  const { data: planRows, error: planError } = await db
    .from("plans")
    .upsert(
      { code: "starter", name: "Starter", description: "Plano base de demonstracao.", is_active: true },
      { onConflict: "code" }
    )
    .select("id")
    .limit(1);
  if (planError) throw planError;
  const planId = planRows?.[0]?.id as string | undefined;
  if (!planId) throw new Error("Unable to resolve starter plan.");

  const { error: featureError } = await db
    .from("feature_flags")
    .upsert(
      FEATURE_CODES.map((code) => ({
        code,
        name: code.replace("mod_", "").replaceAll("_", " ").toUpperCase(),
        description: `Feature ${code}`
      })),
      { onConflict: "code" }
    );
  if (featureError) throw featureError;

  const { data: features, error: featureSelectError } = await db
    .from("feature_flags")
    .select("id, code")
    .in("code", FEATURE_CODES);
  if (featureSelectError) throw featureSelectError;

  if ((features ?? []).length > 0) {
    const { error } = await db
      .from("tenant_features")
      .upsert(
        (features ?? []).map((row) => ({
          tenant_id: tenantId,
          feature_id: row.id,
          is_enabled: true
        })),
        { onConflict: "tenant_id,feature_id" }
      );
    if (error) throw error;
  }

  const { data: subscriptionRows, error: subscriptionSelectError } = await db
    .from("tenant_subscriptions")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("plan_id", planId)
    .order("starts_at", { ascending: false })
    .limit(1);
  if (subscriptionSelectError) throw subscriptionSelectError;
  if ((subscriptionRows ?? []).length === 0) {
    const { error } = await db.from("tenant_subscriptions").insert({
      tenant_id: tenantId,
      plan_id: planId,
      status: "active",
      starts_at: new Date().toISOString(),
      ends_at: null
    });
    if (error) throw error;
  }

  for (const dataType of ["documents", "payslips", "time_entries", "audit_logs"]) {
    const { data: currentRows, error: currentError } = await db
      .from("retention_policies")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("data_type", dataType)
      .limit(1);
    if (currentError) throw currentError;

    if ((currentRows ?? []).length === 0) {
      const { error: insertError } = await db.from("retention_policies").insert({
        tenant_id: tenantId,
        data_type: dataType,
        retention_years: 5,
        is_default: false
      });
      if (insertError) throw insertError;
    } else {
      const { error: updateError } = await db
        .from("retention_policies")
        .update({ retention_years: 5, is_default: false })
        .eq("id", currentRows?.[0]?.id);
      if (updateError) throw updateError;
    }
  }

  return tenantId;
}

async function createAuthUser(db: SupabaseAdmin, user: DemoUser): Promise<string> {
  const { data, error } = await db.auth.admin.createUser({
    email: user.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: user.fullName }
  });
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error(`Failed to create auth user for ${user.email}`);
  return userId;
}

async function main() {
  const db = getClient();
  const tenantSlug = process.env.SEED_TENANT_SLUG ?? DEMO_TENANT_SLUG;

  const tenantId = await ensureTenantSetup(db, tenantSlug);
  await cleanupDemoShowcase({ removeUsers: true });

  const userMap = new Map<string, { id: string; data: DemoUser }>();
  for (const user of DEMO_USERS) {
    const id = await createAuthUser(db, user);
    userMap.set(user.key, { id, data: user });
  }

  const adminId = userMap.get("admin")?.id;
  if (!adminId) throw new Error("Admin user missing in demo setup.");

  const roleRows = DEMO_USERS.filter((user) => user.role).map((user) => ({
    tenant_id: tenantId,
    user_id: userMap.get(user.key)?.id as string,
    role: user.role,
    is_active: true
  }));
  const { error: roleError } = await db
    .from("user_tenant_roles")
    .upsert(roleRows, { onConflict: "tenant_id,user_id,role" });
  if (roleError) throw roleError;

  const profileRows = DEMO_USERS.filter((user) => user.role).map((user) => ({
    tenant_id: tenantId,
    user_id: userMap.get(user.key)?.id as string,
    full_name: user.fullName,
    status: "active",
    cpf: user.cpf ?? null,
    phone: user.phone ?? null,
    personal_email: user.email,
    department: user.department ?? null,
    position_title: user.positionTitle ?? null,
    contract_type: user.contractType ?? null,
    admission_date: "2026-01-15",
    base_salary: user.baseSalary ?? null,
    employee_tags: user.employeeTags ?? []
  }));
  const { error: profileError } = await db
    .from("tenant_user_profiles")
    .upsert(profileRows, { onConflict: "tenant_id,user_id" });
  if (profileError) throw profileError;

  const candidateProfiles = [
    {
      key: "candidate1",
      fullName: "Joao Silva",
      email: "demo.candidate1@vvconsulting.local",
      phone: "11991112222",
      cpf: "12345678901",
      city: "Sao Paulo",
      state: "SP",
      desiredPosition: "Analista de Dados",
      yearsExperience: 6,
      skills: ["sql", "python", "power bi", "analise de dados"]
    },
    {
      key: "candidate2",
      fullName: "Ana Souza",
      email: "demo.candidate2@vvconsulting.local",
      phone: "11993334444",
      cpf: "22345678901",
      city: "Campinas",
      state: "SP",
      desiredPosition: "Analista RH",
      yearsExperience: 4,
      skills: ["rh", "recrutamento", "treinamento"]
    },
    {
      key: "candidate3",
      fullName: "Carlos Lima",
      email: "demo.candidate3@vvconsulting.local",
      phone: "21997776655",
      cpf: "32345678901",
      city: "Rio de Janeiro",
      state: "RJ",
      desiredPosition: "Supervisor de Campo",
      yearsExperience: 8,
      skills: ["operacao", "field", "lideranca"]
    }
  ];

  const { error: candidateProfileError } = await db
    .from("candidate_profiles")
    .upsert(
      candidateProfiles.map((profile) => ({
        user_id: userMap.get(profile.key)?.id as string,
        full_name: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        cpf: profile.cpf,
        city: profile.city,
        state: profile.state,
        desired_position: profile.desiredPosition,
        salary_expectation: 9500,
        years_experience: profile.yearsExperience,
        professional_summary: `${DEMO_MARKER} Perfil de demonstracao de ${profile.fullName}.`,
        skills: profile.skills,
        education: [
          {
            title: "Graduacao",
            institution: "Universidade Demo",
            startDate: "2016-02-01",
            endDate: "2019-12-01"
          }
        ],
        experience: [
          {
            title: "Experiencia principal",
            company: "Empresa Demo",
            startDate: "2020-01-01",
            endDate: null,
            current: true
          }
        ]
      })),
      { onConflict: "user_id" }
    );
  if (candidateProfileError) throw candidateProfileError;

  const { data: candidateRows, error: candidateError } = await db
    .from("candidates")
    .upsert(
      candidateProfiles.map((profile) => ({
        tenant_id: tenantId,
        user_id: userMap.get(profile.key)?.id as string,
        full_name: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        cpf: profile.cpf,
        source: "demo_seed",
        contract: "CLT",
        is_active: true
      })),
      { onConflict: "tenant_id,email" }
    )
    .select("id,email");
  if (candidateError) throw candidateError;

  const candidateIdByEmail = new Map((candidateRows ?? []).map((row) => [row.email as string, row.id as string]));

  const jobSeeds = [
    {
      title: "Analista de Dados Sênior",
      department: "Tecnologia",
      city: "Sao Paulo",
      state: "SP",
      location: "Hibrido",
      employmentType: "CLT",
      status: "published",
      salary: 12000,
      skills: ["sql", "python", "power bi", "analise de dados"],
      screeningQuestions: [
        { id: "q1", question: "Domina SQL avançado?", type: "yes_no", required: true, disqualifying: false },
        { id: "q2", question: "Descreva certificacoes relevantes", type: "text", required: false, disqualifying: false }
      ],
      documentRequirements: [
        { id: "dd111111-1111-1111-1111-111111111111", docTab: "cursos", docType: "Cursos e Treinamentos", label: null }
      ]
    },
    {
      title: "Analista de RH",
      department: "RH",
      city: "Sao Paulo",
      state: "SP",
      location: "Remoto",
      employmentType: "CLT",
      status: "published",
      salary: 8500,
      skills: ["rh", "recrutamento", "treinamento"],
      screeningQuestions: [
        { id: "q1", question: "Ja conduziu processos de triagem?", type: "yes_no", required: true, disqualifying: false }
      ],
      documentRequirements: [] as const
    },
    {
      title: "Supervisor de Campo",
      department: "Operacoes",
      city: "Macae",
      state: "RJ",
      location: "Presencial",
      employmentType: "PJ",
      status: "closed",
      salary: 10000,
      skills: ["operacao", "field", "lideranca"],
      screeningQuestions: [],
      documentRequirements: [] as const
    }
  ] as const;

  const { data: jobRows, error: jobError } = await db
    .from("jobs")
    .insert(
      jobSeeds.map((job) => ({
        tenant_id: tenantId,
        title: `${DEMO_MARKER} ${job.title}`,
        description: `${DEMO_MARKER} Descricao da vaga ${job.title} para demonstracao.`,
        department: job.department,
        city: job.city,
        state: job.state,
        location: job.location,
        employment_type: job.employmentType,
        status: job.status,
        salary: job.salary,
        expires_at: "2026-12-31",
        skills: job.skills,
        screening_questions: job.screeningQuestions,
        document_requirements: "documentRequirements" in job ? [...job.documentRequirements] : [],
        created_by: adminId
      }))
    )
    .select("id,title");
  if (jobError) throw jobError;
  const jobMap = new Map((jobRows ?? []).map((row) => [row.title as string, row.id as string]));

  const skillSet = new Set<string>();
  for (const seed of jobSeeds) {
    for (const tag of seed.skills) skillSet.add(tag);
  }
  for (const profile of candidateProfiles) {
    for (const tag of profile.skills) skillSet.add(tag);
  }
  const { error: skillError } = await db.from("skill_tags").upsert(
    Array.from(skillSet).map((label) => ({
      normalized: normalizeTag(`demo-showcase-${label}`),
      label,
      created_by_user_id: adminId
    })),
    { onConflict: "normalized" }
  );
  if (skillError) throw skillError;

  const applications = [
    {
      candidateEmail: "demo.candidate1@vvconsulting.local",
      jobTitle: `${DEMO_MARKER} Analista de Dados Sênior`,
      status: "approved",
      coverLetter: `${DEMO_MARKER} Candidato 1 para dados.`,
      screeningAnswers: [{ questionId: "q1", type: "yes_no", answer: "Sim" }]
    },
    {
      candidateEmail: "demo.candidate2@vvconsulting.local",
      jobTitle: `${DEMO_MARKER} Analista de RH`,
      status: "in_review",
      coverLetter: `${DEMO_MARKER} Candidato 2 para RH.`,
      screeningAnswers: [{ questionId: "q1", type: "yes_no", answer: "Sim" }]
    },
    {
      candidateEmail: "demo.candidate3@vvconsulting.local",
      jobTitle: `${DEMO_MARKER} Supervisor de Campo`,
      status: "archived",
      coverLetter: `${DEMO_MARKER} Candidato 3 para operacoes.`,
      screeningAnswers: []
    }
  ] as const;

  const { error: applicationError } = await db.from("job_applications").insert(
    applications.map((item) => ({
      tenant_id: tenantId,
      job_id: jobMap.get(item.jobTitle) as string,
      candidate_id: candidateIdByEmail.get(item.candidateEmail) as string,
      status: item.status,
      cover_letter: item.coverLetter,
      screening_answers: item.screeningAnswers
    }))
  );
  if (applicationError) throw applicationError;

  const shiftTemplateRows = [
    {
      tenant_id: tenantId,
      name: `${DEMO_MARKER} Regra padrao 44h`,
      daily_work_minutes: 480,
      weekly_work_minutes: 2400,
      lunch_break_minutes: 60,
      overtime_percent: 50,
      monthly_work_minutes: 13200,
      is_active: true,
      created_by: adminId
    },
    {
      tenant_id: tenantId,
      name: `${DEMO_MARKER} Escala 12x36`,
      daily_work_minutes: 720,
      weekly_work_minutes: null,
      lunch_break_minutes: 60,
      overtime_percent: 80,
      monthly_work_minutes: 12960,
      is_active: true,
      created_by: adminId
    }
  ];
  const { data: shiftRows, error: shiftError } = await db
    .from("employee_shift_templates")
    .insert(shiftTemplateRows)
    .select("id,name");
  if (shiftError) throw shiftError;
  const shiftId = (shiftRows ?? [])[0]?.id as string | undefined;
  if (!shiftId) throw new Error("Shift template seed failed.");

  const employee1Id = userMap.get("employee1")?.id as string;
  const employee2Id = userMap.get("employee2")?.id as string;
  const { error: shiftAssignError } = await db.from("employee_shift_assignments").insert([
    {
      tenant_id: tenantId,
      user_id: employee1Id,
      shift_template_id: shiftId,
      starts_at: "2026-02-01",
      is_active: true,
      created_by: adminId
    },
    {
      tenant_id: tenantId,
      user_id: employee2Id,
      shift_template_id: shiftId,
      starts_at: "2026-02-01",
      is_active: true,
      created_by: adminId
    }
  ]);
  if (shiftAssignError) throw shiftAssignError;

  const entrySeeds = [
    { userId: employee1Id, contract: "CLT", type: "clock_in", at: "2026-03-10T08:00:00-03:00" },
    { userId: employee1Id, contract: "CLT", type: "lunch_out", at: "2026-03-10T12:00:00-03:00" },
    { userId: employee1Id, contract: "CLT", type: "lunch_in", at: "2026-03-10T13:00:00-03:00" },
    { userId: employee1Id, contract: "CLT", type: "clock_out", at: "2026-03-10T18:10:00-03:00" },
    { userId: employee1Id, contract: "CLT", type: "clock_in", at: "2026-03-11T08:07:00-03:00" },
    { userId: employee1Id, contract: "CLT", type: "lunch_out", at: "2026-03-11T12:01:00-03:00" },
    { userId: employee1Id, contract: "CLT", type: "lunch_in", at: "2026-03-11T13:05:00-03:00" },
    { userId: employee1Id, contract: "CLT", type: "clock_out", at: "2026-03-11T17:50:00-03:00" },
    { userId: employee2Id, contract: "PJ", type: "clock_in", at: "2026-03-10T07:50:00-03:00" },
    { userId: employee2Id, contract: "PJ", type: "lunch_out", at: "2026-03-10T12:20:00-03:00" },
    { userId: employee2Id, contract: "PJ", type: "lunch_in", at: "2026-03-10T13:00:00-03:00" },
    { userId: employee2Id, contract: "PJ", type: "clock_out", at: "2026-03-10T18:30:00-03:00" }
  ] as const;

  const { data: timeEntries, error: timeEntryError } = await db
    .from("time_entries")
    .insert(
      entrySeeds.map((entry) => ({
        tenant_id: tenantId,
        user_id: entry.userId,
        contract: entry.contract,
        entry_type: entry.type,
        recorded_at: entry.at,
        source: "demo_seed",
        note: `${DEMO_MARKER} registro de ponto`
      }))
    )
    .select("id,user_id,entry_type,recorded_at");
  if (timeEntryError) throw timeEntryError;

  const entryBy = (userId: string, type: string, datePrefix: string) =>
    (timeEntries ?? []).find(
      (row) =>
        row.user_id === userId &&
        row.entry_type === type &&
        String(row.recorded_at).startsWith(datePrefix)
    );

  const pendingEntry = entryBy(employee1Id, "clock_out", "2026-03-11");
  const approvedEntry = entryBy(employee1Id, "clock_out", "2026-03-10");
  const rejectedEntry = entryBy(employee2Id, "clock_in", "2026-03-10");
  if (!pendingEntry || !approvedEntry || !rejectedEntry) {
    throw new Error("Time entries not found for adjustment seeds.");
  }

  const adjustmentRows = [
    {
      tenant_id: tenantId,
      user_id: employee1Id,
      time_entry_id: pendingEntry.id,
      target_entry_type: "clock_out",
      target_date: "2026-03-11",
      requested_time: "18:20",
      requested_recorded_at: "2026-03-11T18:20:00-03:00",
      original_recorded_at: pendingEntry.recorded_at,
      reason: `${DEMO_MARKER} Ajuste pendente - saida real`,
      status: "pending",
      change_log: [{ status: "pending", at: new Date().toISOString() }]
    },
    {
      tenant_id: tenantId,
      user_id: employee1Id,
      time_entry_id: approvedEntry.id,
      target_entry_type: "clock_out",
      target_date: "2026-03-10",
      requested_time: "18:30",
      requested_recorded_at: "2026-03-10T18:30:00-03:00",
      original_recorded_at: approvedEntry.recorded_at,
      reason: `${DEMO_MARKER} Ajuste aprovado - hora extra`,
      status: "approved",
      reviewed_by: adminId,
      reviewed_at: "2026-03-10T20:00:00-03:00",
      review_note: `${DEMO_MARKER} Aprovado para demonstracao`,
      change_log: [
        { status: "pending", at: "2026-03-10T19:00:00-03:00" },
        { status: "approved", at: "2026-03-10T20:00:00-03:00" }
      ]
    },
    {
      tenant_id: tenantId,
      user_id: employee2Id,
      time_entry_id: rejectedEntry.id,
      target_entry_type: "clock_in",
      target_date: "2026-03-10",
      requested_time: "07:30",
      requested_recorded_at: "2026-03-10T07:30:00-03:00",
      original_recorded_at: rejectedEntry.recorded_at,
      reason: `${DEMO_MARKER} Ajuste recusado - horario divergente`,
      status: "rejected",
      reviewed_by: adminId,
      reviewed_at: "2026-03-10T09:00:00-03:00",
      review_note: `${DEMO_MARKER} Nao confirmado`,
      change_log: [
        { status: "pending", at: "2026-03-10T08:20:00-03:00" },
        { status: "rejected", at: "2026-03-10T09:00:00-03:00" }
      ]
    }
  ];

  const { data: adjustments, error: adjustmentError } = await db
    .from("time_adjustment_requests")
    .insert(adjustmentRows)
    .select("id,time_entry_id,status,requested_recorded_at,original_recorded_at,user_id");
  if (adjustmentError) throw adjustmentError;

  const approvedAdjustment = (adjustments ?? []).find((row) => row.status === "approved");
  if (approvedAdjustment) {
    const { error: patchEntryError } = await db
      .from("time_entries")
      .update({ recorded_at: approvedAdjustment.requested_recorded_at })
      .eq("id", approvedAdjustment.time_entry_id);
    if (patchEntryError) throw patchEntryError;

    const { error: logError } = await db.from("time_entry_change_logs").insert({
      tenant_id: tenantId,
      time_entry_id: approvedAdjustment.time_entry_id,
      user_id: approvedAdjustment.user_id,
      changed_by: adminId,
      source: "adjustment_approved",
      previous_recorded_at: approvedAdjustment.original_recorded_at,
      new_recorded_at: approvedAdjustment.requested_recorded_at,
      reason: `${DEMO_MARKER} Ajuste aprovado`,
      metadata: { adjustmentRequestId: approvedAdjustment.id, status: "approved" }
    });
    if (logError) throw logError;
  }

  const oncallSeeds = [
    {
      userId: employee1Id,
      profile: userMap.get("employee1")?.data as DemoUser,
      date: "2026-03-20",
      startsAt: "2026-03-20T18:00:00-03:00",
      endsAt: "2026-03-20T23:00:00-03:00",
      status: "pending_ack",
      note: `${DEMO_MARKER} Sobreaviso pendente`
    },
    {
      userId: employee2Id,
      profile: userMap.get("employee2")?.data as DemoUser,
      date: "2026-03-21",
      startsAt: "2026-03-21T18:00:00-03:00",
      endsAt: "2026-03-21T23:30:00-03:00",
      status: "acknowledged",
      note: `${DEMO_MARKER} Sobreaviso ciente`,
      acknowledgedAt: "2026-03-20T15:00:00-03:00",
      acknowledgedBy: employee2Id
    },
    {
      userId: employee1Id,
      profile: userMap.get("employee1")?.data as DemoUser,
      date: "2026-03-18",
      startsAt: "2026-03-18T19:00:00-03:00",
      endsAt: "2026-03-18T23:59:00-03:00",
      status: "entry_registered",
      note: `${DEMO_MARKER} Sobreaviso com entrada registrada`,
      acknowledgedAt: "2026-03-18T18:30:00-03:00",
      acknowledgedBy: employee1Id,
      linkedEntryAt: "2026-03-18T19:05:00-03:00"
    }
  ] as const;

  const oncallLinkedTimeEntry = (timeEntries ?? []).find(
    (row) => row.user_id === employee1Id && String(row.recorded_at).startsWith("2026-03-10T08")
  );

  const { data: oncallRows, error: oncallError } = await db
    .from("oncall_shifts")
    .insert(
      oncallSeeds.map((shift) => ({
        tenant_id: tenantId,
        user_id: shift.userId,
        scheduled_date: shift.date,
        starts_at: shift.startsAt,
        ends_at: shift.endsAt,
        status: shift.status,
        note: shift.note,
        linked_time_entry_id: shift.status === "entry_registered" ? oncallLinkedTimeEntry?.id ?? null : null,
        linked_time_entry_at: shift.linkedEntryAt ?? null,
        acknowledged_at: shift.acknowledgedAt ?? null,
        acknowledged_by_user_id: shift.acknowledgedBy ?? null,
        employee_full_name: shift.profile.fullName,
        employee_email: shift.profile.email,
        employee_cpf: shift.profile.cpf ?? null,
        employee_phone: shift.profile.phone ?? null,
        department: shift.profile.department ?? null,
        position_title: shift.profile.positionTitle ?? null,
        contract_type: shift.profile.contractType ?? null,
        employee_tags: shift.profile.employeeTags ?? [],
        created_by: adminId,
        updated_by: adminId
      }))
    )
    .select("id,user_id,status,created_at");
  if (oncallError) throw oncallError;

  const { error: oncallEventsError } = await db.from("oncall_shift_events").insert(
    (oncallRows ?? []).map((shift) => ({
      tenant_id: tenantId,
      oncall_shift_id: shift.id,
      user_id: shift.user_id,
      actor_user_id: adminId,
      event_type: "created",
      payload: { marker: DEMO_MARKER, status: shift.status },
      created_at: shift.created_at
    }))
  );
  if (oncallEventsError) throw oncallEventsError;

  const noticeRows = [
    {
      tenant_id: tenantId,
      title: `${DEMO_MARKER} Comunicado geral`,
      message: `${DEMO_MARKER} Mensagem para todos os colaboradores.`,
      target: "all",
      starts_at: "2026-03-01T00:00:00-03:00",
      ends_at: "2026-03-31T23:59:00-03:00",
      is_active: true,
      created_by: adminId,
      recipient_user_ids: null
    },
    {
      tenant_id: tenantId,
      title: `${DEMO_MARKER} Comunicado RH`,
      message: `${DEMO_MARKER} Mensagem direcionada para RH e operacoes.`,
      target: "manager",
      starts_at: null,
      ends_at: null,
      is_active: true,
      created_by: adminId,
      recipient_user_ids: [employee1Id, employee2Id]
    }
  ];
  const { data: notices, error: noticeError } = await db
    .from("notices")
    .insert(noticeRows)
    .select("id,title");
  if (noticeError) throw noticeError;

  if ((notices ?? []).length > 0) {
    const firstNoticeId = notices?.[0]?.id as string;
    const { error: attachmentError } = await db.from("notice_attachments").insert({
      tenant_id: tenantId,
      notice_id: firstNoticeId,
      file_name: "comunicado-demo.pdf",
      file_path: `tenants/${tenantId}/demo-showcase/notices/comunicado-demo.pdf`,
      mime_type: "application/pdf",
      size_bytes: 20480
    });
    if (attachmentError) throw attachmentError;
  }

  const { data: batchRows, error: batchError } = await db
    .from("payslip_batches")
    .insert({
      tenant_id: tenantId,
      contract: "CLT",
      reference_month: "2026-02",
      source_type: "demo_seed",
      created_by: adminId
    })
    .select("id")
    .limit(1);
  if (batchError) throw batchError;
  const batchId = batchRows?.[0]?.id as string | undefined;

  const { error: payslipError } = await db.from("payslips").insert([
    {
      tenant_id: tenantId,
      batch_id: batchId,
      collaborator_name: "Roberto Pereira",
      collaborator_email: "demo.employee1@vvconsulting.local",
      contract: "CLT",
      reference_month: "2026-02",
      file_name: "holerite-roberto-fev-2026.pdf",
      file_path: `tenants/${tenantId}/demo-showcase/payslips/holerite-roberto-fev-2026.pdf`,
      mime_type: "application/pdf",
      size_bytes: 71234,
      uploaded_by: adminId,
      employee_user_id: employee1Id,
      acknowledged_at: "2026-03-05T10:00:00-03:00",
      acknowledged_by_user_id: employee1Id
    },
    {
      tenant_id: tenantId,
      batch_id: batchId,
      collaborator_name: "Marina Costa",
      collaborator_email: "demo.employee2@vvconsulting.local",
      contract: "PJ",
      reference_month: "2026-02",
      file_name: "holerite-marina-fev-2026.pdf",
      file_path: `tenants/${tenantId}/demo-showcase/payslips/holerite-marina-fev-2026.pdf`,
      mime_type: "application/pdf",
      size_bytes: 70111,
      uploaded_by: adminId,
      employee_user_id: employee2Id
    }
  ]);
  if (payslipError) throw payslipError;

  const requestRows = [
    {
      tenant_id: tenantId,
      collaborator_name: "Roberto Pereira",
      collaborator_email: "demo.employee1@vvconsulting.local",
      contract: "CLT",
      title: `${DEMO_MARKER} Solicitar RG`,
      details: "Enviar RG atualizado",
      status: "open",
      requested_by: adminId,
      employee_user_id: employee1Id,
      doc_tab: "pessoal",
      doc_type: "rg"
    },
    {
      tenant_id: tenantId,
      collaborator_name: "Roberto Pereira",
      collaborator_email: "demo.employee1@vvconsulting.local",
      contract: "CLT",
      title: `${DEMO_MARKER} Contrato assinado`,
      details: "Assinar contrato e reenviar",
      status: "completed",
      requested_by: adminId,
      employee_user_id: employee1Id,
      doc_tab: "contratacao",
      doc_type: "contrato_trabalho_assinado",
      resolved_at: "2026-03-02T15:00:00-03:00"
    },
    {
      tenant_id: tenantId,
      collaborator_name: "Marina Costa",
      collaborator_email: "demo.employee2@vvconsulting.local",
      contract: "PJ",
      title: `${DEMO_MARKER} Certificado curso`,
      details: "Curso NR-10 atualizado",
      status: "in_progress",
      requested_by: adminId,
      employee_user_id: employee2Id,
      doc_tab: "cursos",
      doc_type: "cursos_treinamentos"
    }
  ];
  const { data: requests, error: requestError } = await db
    .from("document_requests")
    .insert(requestRows)
    .select("id,title,collaborator_email");
  if (requestError) throw requestError;
  const contractRequestId = (requests ?? []).find((r) => String(r.title).includes("Contrato"))?.id;

  const { error: documentsError } = await db.from("documents").insert([
    {
      tenant_id: tenantId,
      collaborator_name: "Roberto Pereira",
      collaborator_email: "demo.employee1@vvconsulting.local",
      contract: "CLT",
      category: "pessoal",
      title: `${DEMO_MARKER} RG`,
      description: "Documento pessoal enviado pelo colaborador.",
      file_name: "rg-roberto.pdf",
      file_path: `tenants/${tenantId}/demo-showcase/documents/rg-roberto.pdf`,
      mime_type: "application/pdf",
      size_bytes: 40000,
      uploaded_by: employee1Id,
      employee_user_id: employee1Id,
      doc_tab: "pessoal",
      doc_type: "rg",
      source: "employee_upload"
    },
    {
      tenant_id: tenantId,
      collaborator_name: "Roberto Pereira",
      collaborator_email: "demo.employee1@vvconsulting.local",
      contract: "CLT",
      category: "contratacao",
      title: `${DEMO_MARKER} Contrato assinado`,
      description: "Contrato assinado no onboarding.",
      file_name: "contrato-assinado-roberto.pdf",
      file_path: `tenants/${tenantId}/demo-showcase/documents/contrato-assinado-roberto.pdf`,
      mime_type: "application/pdf",
      size_bytes: 67000,
      uploaded_by: adminId,
      employee_user_id: employee1Id,
      request_id: contractRequestId ?? null,
      doc_tab: "contratacao",
      doc_type: "contrato_trabalho_assinado",
      source: "admin_upload"
    },
    {
      tenant_id: tenantId,
      collaborator_name: "Marina Costa",
      collaborator_email: "demo.employee2@vvconsulting.local",
      contract: "PJ",
      category: "docs_avulsos",
      title: `${DEMO_MARKER} Documento avulso`,
      description: "Documento diverso para demonstracao.",
      file_name: "doc-avulso-marina.pdf",
      file_path: `tenants/${tenantId}/demo-showcase/documents/doc-avulso-marina.pdf`,
      mime_type: "application/pdf",
      size_bytes: 29000,
      uploaded_by: adminId,
      employee_user_id: employee2Id,
      doc_tab: "docs_avulsos",
      doc_type: "documentos_diversos",
      source: "admin_upload"
    },
    {
      tenant_id: tenantId,
      collaborator_name: "Roberto Pereira",
      collaborator_email: "demo.employee1@vvconsulting.local",
      contract: "CLT",
      category: "propostas",
      title: `${DEMO_MARKER} Proposta comercial`,
      description: "Proposta enviada para leitura do colaborador.",
      file_name: "proposta-roberto.pdf",
      file_path: `tenants/${tenantId}/demo-showcase/documents/proposta-roberto.pdf`,
      mime_type: "application/pdf",
      size_bytes: 36000,
      uploaded_by: adminId,
      employee_user_id: employee1Id,
      doc_tab: "propostas",
      doc_type: "proposta",
      source: "admin_upload"
    }
  ]);
  if (documentsError) throw documentsError;

  const loginList = DEMO_USERS.map((user) => user.email);

  console.log(
    JSON.stringify(
      {
        ok: true,
        tenantId,
        tenantSlug,
        password: DEMO_PASSWORD,
        loginEmails: loginList,
        info: "Use `npm run seed:demo:cleanup` para limpar os dados de demonstracao."
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[seed-demo-showcase] failed", error);
  process.exit(1);
});
