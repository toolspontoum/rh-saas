"use client";

import { type CSSProperties, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarPlus, Camera, CheckCircle2, Clock3, Info, Lock, Pencil, XCircle } from "lucide-react";

import { Breadcrumbs } from "../../../../../components/breadcrumbs";
import { ConfirmModal } from "../../../../../components/confirm-modal";
import { apiFetch } from "../../../../../lib/api";
import { fetchEmployeeProfilesBulk } from "../../../../../lib/employee-profiles-bulk";
import { getStoredTenantCompanyId } from "../../../../../lib/tenant-company-scope";

type Context = { roles: string[] };
type Paginated<T> = { items: T[] };

type TimeEntry = {
  id: string;
  userId: string;
  userName?: string | null;
  userCpf?: string | null;
  entryType: "clock_in" | "lunch_out" | "lunch_in" | "clock_out";
  recordedAt: string;
  note: string | null;
};

type TimeAdjustment = {
  id: string;
  userId: string;
  targetDate: string;
  requestedTime: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewNote: string | null;
  timeEntryId: string | null;
  targetEntryType: TimeEntry["entryType"] | null;
  requestedRecordedAt: string | null;
  originalRecordedAt: string | null;
  changeLog: Array<Record<string, unknown>>;
  isRetroactive?: boolean;
  retroEntries?: Array<{ entryType: TimeEntry["entryType"]; recordedAt: string }>;
  createdTimeEntryIds?: string[];
  createdAt: string;
};

type TimeLog = {
  id: string;
  source: string;
  previousRecordedAt: string;
  newRecordedAt: string;
  reason: string | null;
  createdAt: string;
};

type TenantUser = {
  userId: string;
  fullName: string | null;
  email: string | null;
  cpf: string | null;
  roles: string[];
};

type EmployeeProfile = {
  fullName: string | null;
  cpf: string | null;
  department?: string | null;
  positionTitle?: string | null;
  contractType?: string | null;
  status?: "active" | "inactive" | "offboarded";
  employeeTags?: string[];
};

type WorkRule = {
  dailyWorkMinutes: number;
};

type ReportSummary = {
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

type PdfPayload = {
  fileName: string;
  base64: string;
};

type PunchAction = TimeEntry["entryType"];

type WorkRow = {
  key: string;
  userId: string;
  baseDate: string;
  clockIn?: TimeEntry;
  lunchOut?: TimeEntry;
  lunchIn?: TimeEntry;
  clockOut?: TimeEntry;
  /** Pedido retroativo associado (pendente: ainda não há entries; aprovado: linkado pelos IDs criados). */
  retroactiveRequest?: TimeAdjustment;
  /** Quando true, esta linha é virtual (pedido pendente, sem entries reais). */
  isPendingRetroactive?: boolean;
  /** Datas das batidas pretendidas no pedido pendente, indexadas por entryType. */
  pendingRetroEntries?: Partial<Record<PunchAction, string>>;
};

const actionLabel: Record<PunchAction, string> = {
  clock_in: "Registrar entrada",
  lunch_out: "Saída para almoço",
  lunch_in: "Retorno do almoço",
  clock_out: "Registrar saída"
};

const entryLabel: Record<PunchAction, string> = {
  clock_in: "Entrada",
  lunch_out: "Início do almoço",
  lunch_in: "Retorno do almoço",
  clock_out: "Saída"
};

function toDateLabel(value: string | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function toLocalInput(value: string | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

function diffMinutes(startIso: string | undefined, endIso: string | undefined): number {
  if (!startIso || !endIso) return 0;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.floor((end - start) / 60000);
}

function formatBalance(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60)
    .toString()
    .padStart(2, "0");
  const m = (abs % 60).toString().padStart(2, "0");
  return `${sign}${h}:${m}`;
}

/**
 * Calcula quais batidas podem ser registradas a seguir, considerando o
 * ciclo de trabalho aberto (jornada nocturna pode atravessar dias).
 * Regra: clock_in → (lunch_out | clock_out); lunch_out → lunch_in;
 *        lunch_in → clock_out; clock_out → clock_in.
 */
function nextAllowedActions(lastType: PunchAction | null | undefined): PunchAction[] {
  switch (lastType ?? null) {
    case null:
    case "clock_out":
      return ["clock_in"];
    case "clock_in":
      return ["lunch_out", "clock_out"];
    case "lunch_out":
      return ["lunch_in"];
    case "lunch_in":
      return ["clock_out"];
    default:
      return [];
  }
}

function nextActionHint(lastType: PunchAction | null | undefined): string {
  switch (lastType ?? null) {
    case null:
      return "Registre a entrada para iniciar o ciclo de trabalho.";
    case "clock_in":
      return "Em jornada de trabalho. Registre saída para o almoço ou saída final.";
    case "lunch_out":
      return "Em horário de almoço. Registre o retorno do almoço quando voltar.";
    case "lunch_in":
      return "Após o almoço. Registre a saída final para encerrar a jornada.";
    case "clock_out":
      return "Jornada encerrada. Você pode registrar uma nova entrada quando voltar ao trabalho.";
    default:
      return "";
  }
}

function lastEntryOf(entries: TimeEntry[]): TimeEntry | null {
  if (!entries.length) return null;
  let last = entries[0];
  for (const e of entries) {
    if (new Date(e.recordedAt).getTime() > new Date(last.recordedAt).getTime()) last = e;
  }
  return last;
}

function groupRows(entries: TimeEntry[]): WorkRow[] {
  const sorted = [...entries].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  const rows: WorkRow[] = [];
  let current: WorkRow | null = null;

  for (const entry of sorted) {
    if (entry.entryType === "clock_in") {
      if (current) rows.push(current);
      current = {
        key: `${entry.userId}-${entry.recordedAt}`,
        userId: entry.userId,
        baseDate: entry.recordedAt.slice(0, 10),
        clockIn: entry
      };
      continue;
    }

    if (!current) {
      current = {
        key: `${entry.userId}-${entry.recordedAt}`,
        userId: entry.userId,
        baseDate: entry.recordedAt.slice(0, 10)
      };
    }

    if (entry.entryType === "lunch_out") current.lunchOut = entry;
    if (entry.entryType === "lunch_in") current.lunchIn = entry;
    if (entry.entryType === "clock_out") {
      current.clockOut = entry;
      rows.push(current);
      current = null;
    }
  }

  if (current) rows.push(current);
  return rows.reverse();
}

/** Constrói linha virtual para um pedido retroativo PENDENTE (sem entries reais). */
function buildPendingRetroactiveRow(adj: TimeAdjustment): WorkRow {
  const indexed: Partial<Record<PunchAction, string>> = {};
  for (const e of adj.retroEntries ?? []) {
    indexed[e.entryType] = e.recordedAt;
  }
  return {
    key: `retro-${adj.id}`,
    userId: adj.userId,
    baseDate: adj.targetDate,
    retroactiveRequest: adj,
    isPendingRetroactive: true,
    pendingRetroEntries: indexed
  };
}

/** Lista os primeiros dias dos últimos 2 meses até hoje (datas elegíveis para o pedido retroativo). */
function buildRetroactiveEligibleDates(blockedDates: Set<string>): string[] {
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  const out: string[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= todayMidnight.getTime()) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    if (!blockedDates.has(iso)) out.push(iso);
    cursor.setDate(cursor.getDate() + 1);
  }
  return out.reverse();
}

export default function TimeRegisterPage() {
  const params = useParams<{ tenantId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = params.tenantId;
  const selectedUserIdFromQuery = searchParams.get("userId") ?? "";
  const detailMode = searchParams.get("detail") === "1";
  const oncallShiftIdFromQuery = searchParams.get("oncallShiftId") ?? "";
  const oncallModalOpenedRef = useRef(false);

  const [roles, setRoles] = useState<string[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [employeeProfiles, setEmployeeProfiles] = useState<Record<string, EmployeeProfile>>({});
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userSearch, setUserSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [contractFilter, setContractFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [targetProfile, setTargetProfile] = useState<EmployeeProfile | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [adjustments, setAdjustments] = useState<TimeAdjustment[]>([]);
  const [workRule, setWorkRule] = useState<WorkRule | null>(null);
  const [summary, setSummary] = useState<ReportSummary | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [activePunch, setActivePunch] = useState<PunchAction | null>(null);
  const [punchAt, setPunchAt] = useState<string>(new Date().toISOString());
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [selfiePath, setSelfiePath] = useState<string | null>(null);
  const [selfieUploading, setSelfieUploading] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  const [adjustRow, setAdjustRow] = useState<WorkRow | null>(null);
  const [adjustType, setAdjustType] = useState<PunchAction>("clock_in");
  const [adjustDateTime, setAdjustDateTime] = useState<string>("");
  const [adjustReason, setAdjustReason] = useState<string>("");

  const [reviewing, setReviewing] = useState<TimeAdjustment | null>(null);
  const [reviewNote, setReviewNote] = useState<string>("");
  const [confirmCloseMonth, setConfirmCloseMonth] = useState(false);

  const [editingRow, setEditingRow] = useState<WorkRow | null>(null);
  const [editingValues, setEditingValues] = useState<Record<PunchAction, string>>({
    clock_in: "",
    lunch_out: "",
    lunch_in: "",
    clock_out: ""
  });
  const [editReason, setEditReason] = useState<string>("");

  const [logsModal, setLogsModal] = useState<{ entryId: string; logs: TimeLog[] } | null>(null);

  // Estado do modal "Registrar Ponto Retroativo".
  const [retroactiveOpen, setRetroactiveOpen] = useState(false);
  const [retroactiveTargetDate, setRetroactiveTargetDate] = useState<string>("");
  const [retroactiveTimes, setRetroactiveTimes] = useState<Record<PunchAction, string>>({
    clock_in: "",
    lunch_out: "",
    lunch_in: "",
    clock_out: ""
  });
  const [retroactiveReason, setRetroactiveReason] = useState<string>("");
  const [retroactiveSubmitting, setRetroactiveSubmitting] = useState(false);
  const [retroactiveBlockedDates, setRetroactiveBlockedDates] = useState<Set<string>>(new Set());

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const canRegister = roles.some((role) => ["employee", "viewer"].includes(role));
  const canManage = roles.some((role) =>
    ["owner", "admin", "manager", "analyst", "preposto"].includes(role)
  );

  const rows = useMemo(() => {
    const realRows = groupRows(entries);
    // Para cada linha real, anexa o pedido retroativo APROVADO que originou as
    // batidas (link via `createdTimeEntryIds`), permitindo apresentar a tag
    // "Aprovado" sem outra busca.
    const retroApprovedById = new Map<string, TimeAdjustment>();
    for (const adj of adjustments) {
      if (adj.isRetroactive && adj.status === "approved" && (adj.createdTimeEntryIds ?? []).length > 0) {
        for (const id of adj.createdTimeEntryIds!) retroApprovedById.set(id, adj);
      }
    }
    for (const row of realRows) {
      const ids = [row.clockIn?.id, row.lunchOut?.id, row.lunchIn?.id, row.clockOut?.id].filter(
        (v): v is string => Boolean(v)
      );
      const linked = ids.map((id) => retroApprovedById.get(id)).find((v) => Boolean(v));
      if (linked) row.retroactiveRequest = linked;
    }
    // Adiciona linhas virtuais para pedidos retroativos PENDENTES (ainda sem
    // batidas reais). Pedidos rejeitados não aparecem na lista.
    const pendingVirtualRows: WorkRow[] = adjustments
      .filter((adj) => adj.isRetroactive && adj.status === "pending")
      .map(buildPendingRetroactiveRow);
    const merged = [...realRows, ...pendingVirtualRows];
    merged.sort((a, b) => (a.baseDate < b.baseDate ? 1 : a.baseDate > b.baseDate ? -1 : 0));
    return merged;
  }, [entries, adjustments]);

  // Estado do ciclo de trabalho aberto: usamos a última batida real (independente do dia
  // civil) para tolerar jornada nocturna e turnos que cruzam a meia-noite.
  const lastEntry = useMemo(() => lastEntryOf(entries), [entries]);
  const lastEntryType = lastEntry?.entryType ?? null;
  const allowedActions = useMemo(() => new Set(nextAllowedActions(lastEntryType)), [lastEntryType]);
  const cycleHint = useMemo(() => nextActionHint(lastEntryType), [lastEntryType]);
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const profile = employeeProfiles[u.userId];
      if (departmentFilter !== "all" && (profile?.department ?? "") !== departmentFilter) return false;
      if (positionFilter !== "all" && (profile?.positionTitle ?? "") !== positionFilter) return false;
      if (contractFilter !== "all" && (profile?.contractType ?? "") !== contractFilter) return false;
      if (statusFilter !== "all" && (profile?.status ?? "active") !== statusFilter) return false;
      if (tagFilter !== "all" && !(profile?.employeeTags ?? []).includes(tagFilter)) return false;

      if (!userSearch.trim()) return true;
      const haystack = `${profile?.fullName ?? u.fullName ?? ""} ${u.email ?? ""} ${profile?.cpf ?? u.cpf ?? ""}`.toLowerCase();
      return haystack.includes(userSearch.trim().toLowerCase());
    });
  }, [users, employeeProfiles, departmentFilter, positionFilter, contractFilter, statusFilter, tagFilter, userSearch]);

  const departments = useMemo(
    () =>
      Array.from(
        new Set(
          Object.values(employeeProfiles)
            .map((p) => p.department?.trim())
            .filter((v): v is string => Boolean(v))
        )
      ).sort(),
    [employeeProfiles]
  );
  const positions = useMemo(
    () =>
      Array.from(
        new Set(
          Object.values(employeeProfiles)
            .map((p) => p.positionTitle?.trim())
            .filter((v): v is string => Boolean(v))
        )
      ).sort(),
    [employeeProfiles]
  );
  const contracts = useMemo(
    () =>
      Array.from(
        new Set(
          Object.values(employeeProfiles)
            .map((p) => p.contractType?.trim())
            .filter((v): v is string => Boolean(v))
        )
      ).sort(),
    [employeeProfiles]
  );
  const tags = useMemo(() => {
    const out = new Set<string>();
    Object.values(employeeProfiles).forEach((p) => (p.employeeTags ?? []).forEach((t) => out.add(t)));
    return Array.from(out).sort();
  }, [employeeProfiles]);

  function selectUser(targetUserId: string) {
    if (!targetUserId) return;
    setSelectedUserId(targetUserId);
    if (canManage && !detailMode) {
      router.push(`/tenants/${tenantId}/time/register/${targetUserId}`);
      return;
    }
    const next = new URLSearchParams(searchParams.toString());
    next.set("userId", targetUserId);
    if (canManage) next.set("detail", "1");
    const query = next.toString();
    router.replace(`${pathname}?${query}`);
  }

  async function startCamera() {
    if (streamRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Câmera indisponível neste contexto. Use HTTPS e um navegador atualizado.");
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        throw new Error(
          "Permissão da câmera negada. Permita câmera nas configurações do site ou do sistema e tente de novo."
        );
      }
      throw new Error("Não foi possível iniciar a câmera.");
    }
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function requestDevicePermissions() {
    await startCamera();
  }

  /** Nova tentativa de permissões (gesto do utilizador ou reentrada na página). */
  function promptPermissionsAgain() {
    setError(null);
    stopCamera();
    requestDevicePermissions().catch((err: Error) => setError(err.message));
  }

  /** Nova tentativa silenciosa (sem apagar outros erros do ecrã) — câmera. */
  async function tryRequestDevicePermissionsQuiet() {
    stopCamera();
    try {
      await requestDevicePermissions();
    } catch {
      // Pode continuar negado; o modal ou o botão voltam a tentar.
    }
  }

  function dataUrlToBlob(dataUrl: string): Blob {
    const [header, base64] = dataUrl.split(",");
    const mimeMatch = header?.match(/data:(.*?);base64/);
    const mime = mimeMatch?.[1] ?? "image/jpeg";
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  useEffect(() => {
    apiFetch<{ isPlatformAdmin: boolean }>("/v1/platform/me")
      .then((me) => setIsPlatformAdmin(Boolean(me.isPlatformAdmin)))
      .catch(() => setIsPlatformAdmin(false));
  }, []);

  async function uploadSelfieIfNeeded(): Promise<string | null> {
    if (selfiePath) return selfiePath;
    if (!selfieBlob) throw new Error("Capture a selfie antes de confirmar o registro.");

    setSelfieUploading(true);
    try {
      // Alguns browsers (ex.: iOS) lidam melhor com `File` do que `Blob` em `PUT`.
      const file = new File([selfieBlob], "selfie.jpg", { type: selfieBlob.type || "image/jpeg" });
      const intent = await apiFetch<{ path: string; signedUrl: string }>(`/v1/tenants/${tenantId}/time-selfies/upload-intent`, {
        method: "POST",
        body: JSON.stringify({
          fileName: "selfie.jpg",
          mimeType: file.type || "image/jpeg",
          sizeBytes: file.size
        })
      });
      const put = await fetch(intent.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file
      });
      if (!put.ok) {
        const details = await put.text().catch(() => "");
        console.error("[time-selfie-upload] storage error", { status: put.status, details });
        // Não bloqueia o registro do ponto: seguimos registrando mesmo com falha de upload.
        return null;
      }
      setSelfiePath(intent.path);
      return intent.path;
    } catch (e) {
      console.error("[time-selfie-upload] upload flow failed", e);
      return null;
    } finally {
      setSelfieUploading(false);
    }
  }

  async function loadData(targetUserId?: string, manageModeOverride?: boolean) {
    const qTarget = targetUserId ? `&targetUserId=${targetUserId}` : "";
    const manageMode = manageModeOverride ?? canManage;
    const companySelected = Boolean(getStoredTenantCompanyId(tenantId));
    const qAdjust = manageMode
      ? `mineOnly=false${targetUserId ? `&targetUserId=${targetUserId}` : ""}`
      : "mineOnly=true";
    const from = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const to = new Date().toISOString().slice(0, 10);

    const [entriesRes, adjustmentsRes, ruleRes, profileRes, summaryRes] = await Promise.all([
      apiFetch<Paginated<TimeEntry>>(`/v1/tenants/${tenantId}/time-entries?page=1&pageSize=100${qTarget}`),
      apiFetch<Paginated<TimeAdjustment>>(`/v1/tenants/${tenantId}/time-adjustments?${qAdjust}&page=1&pageSize=100`),
      // Quando o backoffice está em "Todos" (sem empresa/projeto selecionado), algumas instâncias exigem escopo.
      // Nesse caso, mantém UI funcional com regra padrão.
      companySelected
        ? apiFetch<WorkRule>(`/v1/tenants/${tenantId}/work-rules`)
        : (Promise.resolve({ dailyWorkMinutes: 480 } as WorkRule) as Promise<WorkRule>),
      apiFetch<EmployeeProfile | null>(
        `/v1/tenants/${tenantId}/employee-profile${targetUserId ? `?targetUserId=${targetUserId}` : ""}`
      ),
      apiFetch<ReportSummary>(
        `/v1/tenants/${tenantId}/time-reports/summary?from=${from}&to=${to}${targetUserId ? `&targetUserId=${targetUserId}` : ""}`
      ).catch(() => null as unknown as ReportSummary)
    ]);

    setEntries(entriesRes.items ?? []);
    setAdjustments(adjustmentsRes.items ?? []);
    setWorkRule(ruleRes);
    setTargetProfile(profileRes);
    setSummary(summaryRes ?? null);
  }

  useEffect(() => {
    apiFetch<Context>(`/v1/tenants/${tenantId}/context`)
      .then(async (ctx) => {
        setRoles(ctx.roles);
        const isManager = ctx.roles.some((role) =>
          ["owner", "admin", "manager", "analyst", "preposto"].includes(role)
        );

        if (isManager) {
          setUsersLoading(true);
          setError(null);
          const usersRes = await apiFetch<Paginated<TenantUser>>(
            `/v1/tenants/${tenantId}/users?page=1&pageSize=100&includeAuthMeta=false`
          );
          const allUsers = usersRes.items ?? [];
          const bulk = await fetchEmployeeProfilesBulk(
            tenantId,
            allUsers.map((u) => u.userId)
          );
          const nextProfiles: Record<string, EmployeeProfile> = {};
          for (const user of allUsers) {
            const b = bulk[user.userId];
            if (!b) continue;
            nextProfiles[user.userId] = {
              fullName: b.fullName ?? user.fullName,
              cpf: b.cpf ?? user.cpf,
              department: b.department,
              positionTitle: b.positionTitle,
              contractType: b.contractType,
              status: b.status,
              employeeTags: b.employeeTags
            };
          }
          setEmployeeProfiles(nextProfiles);
          const employeeUsers = allUsers.filter((user) => user.roles.includes("employee") || Boolean(nextProfiles[user.userId]));
          setUsers(employeeUsers);
          const defaultUser =
            employeeUsers.find((user) => user.userId === selectedUserIdFromQuery)?.userId ?? employeeUsers[0]?.userId ?? "";
          setSelectedUserId(defaultUser);
          await loadData(defaultUser || undefined, true);
          setUsersLoading(false);
          return;
        }

        await loadData(undefined, false);
        if (ctx.roles.some((role) => ["employee", "viewer"].includes(role))) {
          try {
            await requestDevicePermissions();
          } catch {
            // Mantém fluxo: o pedido será repetido ao registrar ponto ou ao voltar ao separador.
          }
        }
      })
      .catch((err: Error) => {
        setUsersLoading(false);
        // Sem empresa/projeto selecionado, alguns endpoints podem devolver COMPANY_SCOPE_REQUIRED.
        // O comportamento esperado aqui é manter a tela aberta (modo "Todos") sem bloquear com erro.
        if ((err.message ?? "").includes("Selecione a empresa/projeto no painel")) return;
        setError(err.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  /** Ao voltar ao separador/janela, volta a pedir localização e câmera (se o browser permitir novo prompt). */
  useEffect(() => {
    if (!canRegister || canManage) return;
    const onFocus = () => {
      void tryRequestDevicePermissionsQuiet();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void tryRequestDevicePermissionsQuiet();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [tenantId, canRegister, canManage]);

  /** Se o utilizador alterar permissões nas definições do browser, tentar de imediato. */
  useEffect(() => {
    if (!canRegister || canManage) return;
    if (!navigator.permissions?.query) return;
    const cleanups: Array<() => void> = [];
    const watch = async (descriptor: PermissionDescriptor) => {
      try {
        const status = await navigator.permissions.query(descriptor);
        const onChange = () => {
          void tryRequestDevicePermissionsQuiet();
        };
        status.addEventListener("change", onChange);
        cleanups.push(() => status.removeEventListener("change", onChange));
      } catch {
        // Permissão não suportada neste browser
      }
    };
    void watch({ name: "camera" as PermissionName });
    void watch({ name: "geolocation" as PermissionName });
    return () => cleanups.forEach((fn) => fn());
  }, [tenantId, canRegister, canManage]);

  useEffect(() => {
    if (!canManage || !selectedUserId) return;
    loadData(selectedUserId, true).catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  useEffect(() => {
    if (canManage) return;
    if (!oncallShiftIdFromQuery) return;
    if (!canRegister) return;
    if (oncallModalOpenedRef.current) return;
    oncallModalOpenedRef.current = true;
    setActivePunch("clock_in");
  }, [canManage, oncallShiftIdFromQuery, canRegister]);

  useEffect(() => {
    if (!canManage) return;
    if (selectedUserIdFromQuery === selectedUserId) return;
    if (selectedUserIdFromQuery && users.some((user) => user.userId === selectedUserIdFromQuery)) {
      setSelectedUserId(selectedUserIdFromQuery);
      return;
    }
    if (!selectedUserIdFromQuery && selectedUserId) {
      setSelectedUserId("");
    }
  }, [canManage, selectedUserIdFromQuery, selectedUserId, users]);

  useEffect(() => {
    if (!activePunch) {
      stopCamera();
      return;
    }
    stopCamera();
    requestDevicePermissions().catch((err: Error) => setError(err.message));
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePunch]);

  function captureSelfie() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    // Reduz resolução para ocupar menos espaço (armazenamento) mantendo legibilidade.
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.65);
    setSelfieData(dataUrl);
    setSelfieBlob(dataUrlToBlob(dataUrl));
    setSelfiePath(null);
  }

  async function submitPunch() {
    if (!activePunch) return;
    setError(null);
    setOkMsg(null);

    try {
      if (!selfieData) {
        setError("Capture a selfie antes de confirmar o registro.");
        return;
      }
      const uploadedPath = await uploadSelfieIfNeeded();

      const created = await apiFetch<TimeEntry>(`/v1/tenants/${tenantId}/time-entries`, {
        method: "POST",
        body: JSON.stringify({
          entryType: activePunch,
          recordedAt: new Date().toISOString(),
          source: "web_selfie",
          note: JSON.stringify({
            selfieCaptured: true,
            selfiePath: uploadedPath,
            selfieUploadOk: Boolean(uploadedPath)
          })
        })
      });

      if (oncallShiftIdFromQuery && activePunch === "clock_in") {
        await apiFetch(
          `/v1/tenants/${tenantId}/oncall-shifts/${oncallShiftIdFromQuery}/register-entry`,
          {
            method: "POST",
            body: JSON.stringify({
              timeEntryId: created.id,
              source: "oncall_web_selfie"
            })
          }
        );
        router.replace(pathname);
        oncallModalOpenedRef.current = false;
      }

      if (!uploadedPath && isPlatformAdmin) {
        setOkMsg(`${entryLabel[activePunch]} registrada. (Selfie pendente — falha no upload)`);
      } else {
        setOkMsg(`${entryLabel[activePunch]} registrada com sucesso.`);
      }
      setActivePunch(null);
      setSelfieData(null);
      setSelfieBlob(null);
      setSelfiePath(null);
      await loadData(canManage ? selectedUserId || undefined : undefined, canManage);
    } catch (err) {
      setError((err as Error).message);
      // Recarrega o histórico para reflectir o estado real e desabilitar o
      // botão correto caso o backend tenha rejeitado por sequência inválida.
      try {
        await loadData(canManage ? selectedUserId || undefined : undefined, canManage);
      } catch {
        /* ignora falha de refresh */
      }
    }
  }

  function openAdjustModal(row: WorkRow) {
    setAdjustRow(row);
    setAdjustType(row.clockIn ? "clock_in" : "clock_out");
    setAdjustDateTime(toLocalInput(row.clockIn?.recordedAt || row.clockOut?.recordedAt));
    setAdjustReason("");
  }

  function getRowBoundsForType(row: WorkRow, type: PunchAction): { previous?: string; next?: string } {
    if (type === "clock_in") {
      return {
        next: row.lunchOut?.recordedAt ?? row.lunchIn?.recordedAt ?? row.clockOut?.recordedAt
      };
    }
    if (type === "lunch_out") {
      return {
        previous: row.clockIn?.recordedAt,
        next: row.lunchIn?.recordedAt ?? row.clockOut?.recordedAt
      };
    }
    if (type === "lunch_in") {
      return {
        previous: row.lunchOut?.recordedAt ?? row.clockIn?.recordedAt,
        next: row.clockOut?.recordedAt
      };
    }
    return {
      previous: row.lunchIn?.recordedAt ?? row.lunchOut?.recordedAt ?? row.clockIn?.recordedAt
    };
  }

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adjustRow) return;

    const entryMap: Record<PunchAction, TimeEntry | undefined> = {
      clock_in: adjustRow.clockIn,
      lunch_out: adjustRow.lunchOut,
      lunch_in: adjustRow.lunchIn,
      clock_out: adjustRow.clockOut
    };
    const entry = entryMap[adjustType];
    if (!entry) {
      setError("Não existe registro dessa etapa para solicitar ajuste.");
      return;
    }
    if (!adjustDateTime) {
      setError("Informe a data e horário corretos.");
      return;
    }
    if (!adjustReason.trim()) {
      setError("Informe a justificativa do ajuste.");
      return;
    }
    const requestedIso = fromLocalInput(adjustDateTime);
    const requestedMs = new Date(requestedIso).getTime();
    const bounds = getRowBoundsForType(adjustRow, adjustType);
    if (bounds.previous) {
      const previousMs = new Date(bounds.previous).getTime();
      if (Number.isFinite(previousMs) && requestedMs < previousMs) {
        setError("Data/hora inválida: não pode ser anterior à etapa anterior do mesmo registro.");
        return;
      }
    }
    if (bounds.next) {
      const nextMs = new Date(bounds.next).getTime();
      if (Number.isFinite(nextMs) && requestedMs > nextMs) {
        setError("Data/hora inválida: não pode ser posterior à próxima etapa do mesmo registro.");
        return;
      }
    }

    try {
      await apiFetch(`/v1/tenants/${tenantId}/time-adjustments`, {
        method: "POST",
        body: JSON.stringify({
          targetDate: adjustRow.baseDate,
          requestedTime: adjustDateTime.slice(11, 16),
          reason: adjustReason,
          timeEntryId: entry.id,
          targetEntryType: adjustType,
          requestedRecordedAt: requestedIso
        })
      });
      setOkMsg("Solicitação de ajuste enviada com sucesso.");
      setAdjustRow(null);
      await loadData(canManage ? selectedUserId || undefined : undefined, canManage);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  /**
   * Abre o modal para "Registrar Ponto Retroativo".
   * Carrega previamente as batidas e pedidos retroativos dos últimos 2 meses
   * para que o seletor de data oculte/desabilite datas com registro existente
   * ou pedido pendente/aprovado.
   */
  async function openRetroactiveModal() {
    setError(null);
    setRetroactiveTimes({ clock_in: "", lunch_out: "", lunch_in: "", clock_out: "" });
    setRetroactiveReason("");
    setRetroactiveTargetDate("");
    setRetroactiveOpen(true);

    // Buscamos várias páginas de batidas (limite do servidor é 100/página) para
    // cobrir os 2 meses anteriores. Para um colaborador típico, 300 batidas
    // são suficientes (~5 batidas/dia × 60 dias).
    try {
      const [entriesP1, entriesP2, entriesP3, adjustmentsRes] = await Promise.all([
        apiFetch<Paginated<TimeEntry>>(`/v1/tenants/${tenantId}/time-entries?page=1&pageSize=100`),
        apiFetch<Paginated<TimeEntry>>(`/v1/tenants/${tenantId}/time-entries?page=2&pageSize=100`),
        apiFetch<Paginated<TimeEntry>>(`/v1/tenants/${tenantId}/time-entries?page=3&pageSize=100`),
        apiFetch<Paginated<TimeAdjustment>>(
          `/v1/tenants/${tenantId}/time-adjustments?mineOnly=true&page=1&pageSize=100`
        )
      ]);
      const winEntries = [
        ...(entriesP1.items ?? []),
        ...(entriesP2.items ?? []),
        ...(entriesP3.items ?? [])
      ];
      const winAdjustments = adjustmentsRes.items ?? [];
      const blocked = new Set<string>();
      for (const e of winEntries) blocked.add(e.recordedAt.slice(0, 10));
      for (const adj of winAdjustments) {
        if (adj.isRetroactive && (adj.status === "pending" || adj.status === "approved")) {
          blocked.add(adj.targetDate);
        }
      }
      setRetroactiveBlockedDates(blocked);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function closeRetroactiveModal() {
    setRetroactiveOpen(false);
    setRetroactiveTimes({ clock_in: "", lunch_out: "", lunch_in: "", clock_out: "" });
    setRetroactiveReason("");
    setRetroactiveTargetDate("");
  }

  async function submitRetroactiveRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!retroactiveTargetDate) {
      setError("Selecione a data base do pedido retroativo.");
      return;
    }
    if (retroactiveBlockedDates.has(retroactiveTargetDate)) {
      setError("Esta data já tem registro de ponto. Selecione outra data.");
      return;
    }
    if (!retroactiveReason.trim()) {
      setError("Informe a justificativa do pedido retroativo.");
      return;
    }

    // Monta lista de batidas em ordem do ciclo. Cada hora informada (HH:MM) é
    // combinada com a data base para gerar um ISO local. Pelo menos uma batida
    // deve ser informada e a sequência precisa começar em clock_in.
    const order: PunchAction[] = ["clock_in", "lunch_out", "lunch_in", "clock_out"];
    const entries: Array<{ entryType: PunchAction; recordedAt: string }> = [];
    for (const t of order) {
      const raw = retroactiveTimes[t]?.trim();
      if (!raw) continue;
      // Aceita "HH:MM" ou "HH:MM:SS"
      if (!/^\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
        setError(`Hora inválida para "${entryLabel[t]}". Use o formato HH:MM.`);
        return;
      }
      const isoLocal = `${retroactiveTargetDate}T${raw.length === 5 ? `${raw}:00` : raw}`;
      const localDate = new Date(isoLocal);
      if (Number.isNaN(localDate.getTime())) {
        setError(`Hora inválida para "${entryLabel[t]}".`);
        return;
      }
      entries.push({ entryType: t, recordedAt: localDate.toISOString() });
    }

    if (entries.length === 0) {
      setError("Informe pelo menos a entrada para registrar o ponto retroativo.");
      return;
    }
    if (entries[0]!.entryType !== "clock_in") {
      setError("A primeira batida deve ser a entrada (clock_in).");
      return;
    }

    // Validação local da sequência cronológica e de transições.
    let last: PunchAction | null = null;
    let lastMs = -Infinity;
    for (const e of entries) {
      const ms = new Date(e.recordedAt).getTime();
      if (ms <= lastMs) {
        setError("As horas das batidas devem estar em ordem cronológica.");
        return;
      }
      const allowedNext = nextAllowedActions(last);
      if (!allowedNext.includes(e.entryType)) {
        setError(`Sequência inválida em "${entryLabel[e.entryType]}". Verifique a ordem das batidas.`);
        return;
      }
      last = e.entryType;
      lastMs = ms;
    }

    setRetroactiveSubmitting(true);
    try {
      await apiFetch(`/v1/tenants/${tenantId}/time-adjustments`, {
        method: "POST",
        body: JSON.stringify({
          targetDate: retroactiveTargetDate,
          requestedTime: entries[0]!.recordedAt.slice(11, 16),
          reason: retroactiveReason.trim(),
          isRetroactive: true,
          retroEntries: entries
        })
      });
      setOkMsg("Pedido de registro de ponto retroativo enviado para aprovação.");
      closeRetroactiveModal();
      await loadData(canManage ? selectedUserId || undefined : undefined, canManage);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRetroactiveSubmitting(false);
    }
  }

  function rowWorkedMinutes(row: WorkRow): number {
    const gross = diffMinutes(row.clockIn?.recordedAt, row.clockOut?.recordedAt);
    const lunch = diffMinutes(row.lunchOut?.recordedAt, row.lunchIn?.recordedAt);
    return Math.max(0, gross - lunch);
  }

  function rowRelatedAdjustments(row: WorkRow): TimeAdjustment[] {
    const entryIds = [row.clockIn?.id, row.lunchOut?.id, row.lunchIn?.id, row.clockOut?.id].filter(Boolean);
    return adjustments
      .filter((adj) => {
        // Pedidos retroativos têm fluxo próprio (linha virtual + tag "Pendente/Aprovado"),
        // não devem aparecer como ajustes desta linha.
        if (adj.isRetroactive) return false;
        if (adj.timeEntryId && entryIds.includes(adj.timeEntryId)) return true;
        // Fallback para registros legados que possam nao ter timeEntryId preenchido.
        return !adj.timeEntryId && adj.userId === row.userId && adj.targetDate === row.baseDate;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  function rowLatestAdjustment(row: WorkRow): TimeAdjustment | null {
    return rowRelatedAdjustments(row)[0] ?? null;
  }

  function rowAdjustments(row: WorkRow): TimeAdjustment[] {
    return rowRelatedAdjustments(row);
  }

  function statusMeta(status: TimeAdjustment["status"]) {
    if (status === "approved") return { label: "Aprovado", kind: "success" as const };
    if (status === "rejected") return { label: "Reprovado", kind: "danger" as const };
    return { label: "Pendente", kind: "warning" as const };
  }

  function statusIconStyle(status?: TimeAdjustment["status"]): CSSProperties {
    if (status === "approved") {
      return {
        backgroundColor: "#1f8f4c",
        borderColor: "#1f8f4c",
        color: "#ffffff"
      };
    }
    if (status === "rejected") {
      return {
        backgroundColor: "#c0392b",
        borderColor: "#c0392b",
        color: "#ffffff"
      };
    }
    if (status === "pending") {
      return {
        backgroundColor: "#c27b00",
        borderColor: "#c27b00",
        color: "#ffffff"
      };
    }
    return {};
  }

  function openEditRow(row: WorkRow) {
    setEditingRow(row);
    setEditingValues({
      clock_in: toLocalInput(row.clockIn?.recordedAt),
      lunch_out: toLocalInput(row.lunchOut?.recordedAt),
      lunch_in: toLocalInput(row.lunchIn?.recordedAt),
      clock_out: toLocalInput(row.clockOut?.recordedAt)
    });
    setEditReason("");
  }

  async function submitEditRow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingRow) return;
    if (!selectedUserId) {
      setError("Selecione um colaborador.");
      return;
    }

    const map: Record<PunchAction, TimeEntry | undefined> = {
      clock_in: editingRow.clockIn,
      lunch_out: editingRow.lunchOut,
      lunch_in: editingRow.lunchIn,
      clock_out: editingRow.clockOut
    };

    const patchOps: Array<{ id: string; value: string }> = [];
    const createOps: Array<{ type: PunchAction; at: string }> = [];

    for (const key of Object.keys(map) as PunchAction[]) {
      const entry = map[key];
      const raw = editingValues[key]?.trim();
      if (!raw) continue;
      const iso = fromLocalInput(raw);
      if (entry) {
        const currentValue = toLocalInput(entry.recordedAt);
        if (raw !== currentValue) {
          patchOps.push({ id: entry.id, value: iso });
        }
      } else {
        createOps.push({ type: key, at: iso });
      }
    }

    if (patchOps.length === 0 && createOps.length === 0) {
      setEditingRow(null);
      return;
    }

    if (createOps.length > 0 && !editReason.trim()) {
      setError("Informe o motivo da edição ao incluir batidas em branco.");
      return;
    }

    setError(null);
    try {
      await Promise.all(
        patchOps.map((change) =>
          apiFetch(`/v1/tenants/${tenantId}/time-entries/${change.id}`, {
            method: "PATCH",
            body: JSON.stringify({ recordedAt: change.value, reason: editReason.trim() || null })
          })
        )
      );

      const sortedCreates = [...createOps].sort((a, b) => a.at.localeCompare(b.at));
      const noteBase = editReason.trim() || "Inclusão manual de batidas pelo gestor.";
      for (const c of sortedCreates) {
        await apiFetch<TimeEntry>(`/v1/tenants/${tenantId}/time-entries`, {
          method: "POST",
          body: JSON.stringify({
            targetUserId: selectedUserId,
            entryType: c.type,
            recordedAt: c.at,
            source: "admin_manual",
            contract: targetProfile?.contractType ?? null,
            note: noteBase.slice(0, 1000)
          })
        });
      }

      setOkMsg("Registro de ponto atualizado com sucesso.");
      setEditingRow(null);
      await loadData(selectedUserId || undefined, true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function reviewAdjustment(status: "approved" | "rejected") {
    if (!reviewing) return;
    try {
      await apiFetch(`/v1/tenants/${tenantId}/time-adjustments/${reviewing.id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status, reviewNote: reviewNote || null })
      });
      setOkMsg(status === "approved" ? "Ajuste aprovado." : "Ajuste rejeitado.");
      setReviewing(null);
      setReviewNote("");
      await loadData(selectedUserId || undefined, true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function openLogs(entryId: string) {
    try {
      const logs = await apiFetch<TimeLog[]>(`/v1/tenants/${tenantId}/time-entries/${entryId}/change-logs`);
      setLogsModal({ entryId, logs });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function closeMonthReport() {
    if (!selectedUserId) return;
    const referenceMonth = (summary?.from ?? new Date().toISOString().slice(0, 7)).slice(0, 7);
    try {
      await apiFetch(`/v1/tenants/${tenantId}/time-reports/closures`, {
        method: "POST",
        body: JSON.stringify({ targetUserId: selectedUserId, referenceMonth })
      });
      setConfirmCloseMonth(false);
      router.push(`/tenants/${tenantId}/time/reports`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function printPartialMonthReport() {
    if (!selectedUserId) return;
    const referenceMonth = (summary?.from ?? new Date().toISOString().slice(0, 10)).slice(0, 7);
    try {
      const payload = await apiFetch<PdfPayload>(
        `/v1/tenants/${tenantId}/time-reports/partial-pdf?targetUserId=${encodeURIComponent(selectedUserId)}&referenceMonth=${encodeURIComponent(referenceMonth)}`
      );
      const binary = atob(payload.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = payload.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="container wide stack" style={{ margin: 0 }}>
      <Breadcrumbs
        items={[
          { label: "Visão Geral", href: `/tenants/${tenantId}/dashboard` },
          { label: "Ponto" },
          { label: "Registro de Ponto" }
        ]}
      />
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Registro de Ponto</h1>
        {canRegister && !canManage ? (
          <button
            type="button"
            className="secondary punch-action-btn retroactive-register-btn"
            onClick={openRetroactiveModal}
            title="Abrir formulário para registro de ponto retroativo (até 2 meses anteriores)"
          >
            <CalendarPlus size={16} aria-hidden />
            <span>Registrar Ponto Retroativo</span>
          </button>
        ) : null}
      </div>
      {error ? <p className="error">{error}</p> : null}
      {okMsg ? <p>{okMsg}</p> : null}

      {canManage && !detailMode ? (
        <div className="card stack">
          <h3>Colaboradores</h3>
          <div
            className="form-grid"
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(100, minmax(0, 1fr))",
              alignItems: "end"
            }}
          >
            <label style={{ gridColumn: "span 100" }}>
              Buscar
              <input
                placeholder="Nome, e-mail ou CPF"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </label>
            <label style={{ gridColumn: "span 33" }}>
              Departamento
              <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
                <option value="all">Todos</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            <label style={{ gridColumn: "span 34" }}>
              Cargo
              <select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)}>
                <option value="all">Todos</option>
                {positions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label style={{ gridColumn: "span 33" }}>
              Contrato
              <select value={contractFilter} onChange={(e) => setContractFilter(e.target.value)}>
                <option value="all">Todos</option>
                {contracts.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label style={{ gridColumn: "span 25" }}>
              Status
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Todos</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="offboarded">Desligado</option>
              </select>
            </label>
            <label style={{ gridColumn: "span 75" }}>
              Tag
              <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
                <option value="all">Todas</option>
                {tags.map((t) => (
                  <option key={t} value={t}>{t.replace(/-/g, " ")}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>CPF</th>
                  <th>Departamento</th>
                  <th>Cargo</th>
                  <th>Contrato</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const profile = employeeProfiles[u.userId];
                  return (
                    <tr key={u.userId}>
                      <td>{profile?.fullName ?? u.fullName ?? "-"}</td>
                      <td>{u.email ?? "-"}</td>
                      <td>{profile?.cpf ?? u.cpf ?? "-"}</td>
                      <td>{profile?.department ?? "-"}</td>
                      <td>{profile?.positionTitle ?? "-"}</td>
                      <td>{profile?.contractType ?? "-"}</td>
                      <td>
                        <button className="secondary" onClick={() => selectUser(u.userId)}>
                          Abrir ponto
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {usersLoading ? (
                  <tr>
                    <td colSpan={7} className="muted">Carregando colaboradores...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted">Nenhum colaborador encontrado.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {canManage && detailMode ? (
        <div className="card stack">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Detalhes do ponto do colaborador</h3>
            <div className="row">
              <button className="secondary" onClick={printPartialMonthReport} disabled={!selectedUserId}>
                Imprimir relatório parcial
              </button>
              <button className="secondary" onClick={() => setConfirmCloseMonth(true)} disabled={!selectedUserId}>
                Fechar relatório do mês
              </button>
              <button className="secondary" onClick={() => router.push(`/tenants/${tenantId}/time/register`)}>
                Voltar para lista
              </button>
            </div>
          </div>
          <div className="form-grid form-grid-3">
            <div>
              <strong>Nome</strong>
              <p>{targetProfile?.fullName ?? users.find((u) => u.userId === selectedUserId)?.fullName ?? "-"}</p>
            </div>
            <div>
              <strong>CPF</strong>
              <p>{targetProfile?.cpf ?? users.find((u) => u.userId === selectedUserId)?.cpf ?? "-"}</p>
            </div>
            <div>
              <strong>Jornada ativa</strong>
              <p>{summary?.shiftTemplateName ?? "Regra padrão"}</p>
            </div>
          </div>
          {summary ? (
            <div className="table-wrap">
              <table className="table">
                <tbody>
                  <tr><td>Período</td><td>{summary.from} a {summary.to}</td></tr>
                  <tr><td>Minutos esperados</td><td>{summary.expectedMinutes}</td></tr>
                  <tr><td>Minutos trabalhados</td><td>{summary.workedMinutes}</td></tr>
                  <tr><td>Horas extras (min)</td><td>{summary.overtimeMinutes}</td></tr>
                  <tr><td>Déficit (min)</td><td>{summary.deficitMinutes}</td></tr>
                  <tr><td>Saldo banco (min)</td><td>{summary.bankBalanceMinutes}</td></tr>
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {(canManage ? detailMode && Boolean(selectedUserId) : true) ? (
      <div className="card table-wrap">
        <h3>Registros</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>CPF</th>
              <th>Data base</th>
              <th>Entrada</th>
              <th>Início almoço</th>
              <th>Retorno almoço</th>
              <th>Saída</th>
              <th>Banco de horas</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const worked = rowWorkedMinutes(row);
              const target = workRule?.dailyWorkMinutes ?? 480;
              const balance = worked - target;
              const latestAdj = rowLatestAdjustment(row);
              const currentProfile = selectedUserId ? employeeProfiles[selectedUserId] : targetProfile;

              // Pedido retroativo associado a esta linha:
              //   • linha PENDENTE virtual → row.retroactiveRequest (status pending)
              //   • linha APROVADA real    → row.retroactiveRequest (status approved, com createdTimeEntryIds)
              const retroAdj = row.retroactiveRequest;
              const isPendingRetro = Boolean(row.isPendingRetroactive);
              const retroEntries = row.pendingRetroEntries ?? {};

              const clockInLabel = isPendingRetro
                ? toDateLabel(retroEntries.clock_in)
                : toDateLabel(row.clockIn?.recordedAt);
              const lunchOutLabel = isPendingRetro
                ? toDateLabel(retroEntries.lunch_out)
                : toDateLabel(row.lunchOut?.recordedAt);
              const lunchInLabel = isPendingRetro
                ? toDateLabel(retroEntries.lunch_in)
                : toDateLabel(row.lunchIn?.recordedAt);
              const clockOutLabel = isPendingRetro
                ? toDateLabel(retroEntries.clock_out)
                : toDateLabel(row.clockOut?.recordedAt);

              const statusClass =
                latestAdj?.status === "approved"
                  ? "success"
                  : latestAdj?.status === "rejected"
                    ? "danger"
                    : latestAdj?.status === "pending"
                      ? "warning"
                      : "neutral";

              const retroStatusClass =
                retroAdj?.status === "approved"
                  ? "success"
                  : retroAdj?.status === "pending"
                    ? "warning"
                    : "danger";

              return (
                <tr key={row.key}>
                  <td>{currentProfile?.fullName || row.clockIn?.userName || row.clockOut?.userName || "-"}</td>
                  <td>{currentProfile?.cpf || row.clockIn?.userCpf || row.clockOut?.userCpf || "-"}</td>
                  <td>{new Date(`${row.baseDate}T00:00:00`).toLocaleDateString("pt-BR")}</td>
                  <td>
                    {clockInLabel}{" "}
                    {row.clockIn ? (
                      <button
                        className="icon-btn"
                        title="Ver histórico da entrada"
                        aria-label="Ver histórico da entrada"
                        onClick={() => openLogs(row.clockIn!.id)}
                      >
                        <Info size={14} />
                      </button>
                    ) : null}
                  </td>
                  <td>
                    {lunchOutLabel}{" "}
                    {row.lunchOut ? (
                      <button
                        className="icon-btn"
                        title="Ver histórico da saída para almoço"
                        aria-label="Ver histórico da saída para almoço"
                        onClick={() => openLogs(row.lunchOut!.id)}
                      >
                        <Info size={14} />
                      </button>
                    ) : null}
                  </td>
                  <td>
                    {lunchInLabel}{" "}
                    {row.lunchIn ? (
                      <button
                        className="icon-btn"
                        title="Ver histórico do retorno do almoço"
                        aria-label="Ver histórico do retorno do almoço"
                        onClick={() => openLogs(row.lunchIn!.id)}
                      >
                        <Info size={14} />
                      </button>
                    ) : null}
                  </td>
                  <td>
                    {clockOutLabel}{" "}
                    {row.clockOut ? (
                      <button
                        className="icon-btn"
                        title="Ver histórico da saída"
                        aria-label="Ver histórico da saída"
                        onClick={() => openLogs(row.clockOut!.id)}
                      >
                        <Info size={14} />
                      </button>
                    ) : null}
                  </td>
                  <td>
                    {isPendingRetro ? (
                      <span className="muted">—</span>
                    ) : (
                      <span className={`status-pill ${balance >= 0 ? "success" : "danger"}`}>{formatBalance(balance)}</span>
                    )}
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                      {!canManage ? (
                        <>
                          {!isPendingRetro ? (
                            <button className="secondary" onClick={() => openAdjustModal(row)}>Solicitar ajuste</button>
                          ) : null}
                          {retroAdj ? (
                            <span
                              className={`status-pill ${retroStatusClass}`}
                              title="Pedido de registro de ponto retroativo"
                            >
                              {retroAdj.status === "approved"
                                ? "Aprovado"
                                : retroAdj.status === "rejected"
                                  ? "Reprovado"
                                  : "Pendente"}
                            </span>
                          ) : null}
                          {latestAdj && !retroAdj ? (
                            <span className={`status-pill ${statusClass}`}>
                              {latestAdj.status === "pending" ? "Pendente" : latestAdj.status === "approved" ? "Aprovado" : "Reprovado"}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <>
                          {/* Para linhas virtuais retroativas, o admin abre directamente o modal de revisão do pedido. */}
                          {isPendingRetro && retroAdj ? (
                            <>
                              <button
                                className="icon-btn"
                                style={statusIconStyle(retroAdj.status)}
                                title="Analisar pedido de registro retroativo"
                                onClick={() => setReviewing(retroAdj)}
                              >
                                <Clock3 size={14} />
                              </button>
                              <span className="status-pill warning">Pendente (retroativo)</span>
                            </>
                          ) : (
                            <>
                              <button
                                className="icon-btn"
                                style={statusIconStyle(latestAdj?.status)}
                                title={
                                  latestAdj
                                    ? latestAdj.status === "pending"
                                      ? "Analisar solicitação pendente"
                                      : latestAdj.status === "approved"
                                        ? "Última solicitação aprovada"
                                        : "Última solicitação recusada"
                                    : "Sem solicitação"
                                }
                                onClick={() => latestAdj && setReviewing(latestAdj)}
                                disabled={!latestAdj}
                              >
                                {latestAdj?.status === "approved" ? <CheckCircle2 size={14} /> : latestAdj?.status === "rejected" ? <XCircle size={14} /> : <Clock3 size={14} />}
                              </button>
                              <button
                                className="icon-btn"
                                title="Editar"
                                aria-label="Editar registro de ponto"
                                onClick={() => openEditRow(row)}
                              >
                                <Pencil size={14} />
                              </button>
                              {retroAdj && retroAdj.status === "approved" ? (
                                <span className="status-pill success" title="Originado de pedido retroativo aprovado">
                                  Retroativo aprovado
                                </span>
                              ) : null}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="muted">Sem registros para exibir.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      ) : null}
      {canRegister ? (
        <div className="card stack">
          {cycleHint ? (
            <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
              {cycleHint}
              {lastEntry ? (
                <>
                  {" "}Última batida:{" "}
                  <strong>{entryLabel[lastEntry.entryType]}</strong>{" "}
                  às {new Date(lastEntry.recordedAt).toLocaleString("pt-BR")}.
                </>
              ) : null}
            </p>
          ) : null}
          <div className="punch-actions" role="group" aria-label="Registrar batida de ponto">
            {(Object.keys(actionLabel) as PunchAction[]).map((action) => {
              const isAllowed = allowedActions.has(action);
              const variantClass =
                action === "lunch_out" || action === "lunch_in" ? "secondary" : "";
              return (
                <button
                  key={action}
                  type="button"
                  className={`punch-action-btn ${variantClass}`.trim()}
                  disabled={!isAllowed}
                  aria-disabled={!isAllowed}
                  title={
                    isAllowed
                      ? actionLabel[action]
                      : `${actionLabel[action]} — indisponível no momento (aguarde a etapa anterior).`
                  }
                  onClick={() => {
                    if (!isAllowed) return;
                    setActivePunch(action);
                    setPunchAt(new Date().toISOString());
                    setSelfieData(null);
                  }}
                >
                  {!isAllowed ? <Lock size={14} strokeWidth={2.25} aria-hidden /> : null}
                  {actionLabel[action]}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={Boolean(activePunch)}
        title={activePunch ? actionLabel[activePunch] : "Registro de ponto"}
        message="Confirme os dados abaixo e capture uma selfie para concluir a batida."
        confirmLabel="Confirmar registro"
        cancelLabel="Cancelar"
        onCancel={() => {
          setActivePunch(null);
          setSelfieData(null);
        }}
        onConfirm={submitPunch}
      >
        <div className="card stack">
          <p><strong>Data e horário:</strong> {new Date(punchAt).toLocaleString("pt-BR")}</p>
          <p className="muted" style={{ fontSize: "0.9rem" }}>
            Se já negou o acesso antes, altere nas definições do site ou do sistema e toque em &quot;Pedir permissões
            novamente&quot;.
          </p>
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            <button type="button" className="secondary" onClick={promptPermissionsAgain}>
              Pedir permissões novamente
            </button>
            {selfieUploading ? <span className="muted">Enviando selfie…</span> : null}
          </div>
          <video ref={videoRef} muted playsInline style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)" }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          {selfieData ? <img src={selfieData} alt="Selfie" style={{ width: 180, borderRadius: 8, border: "1px solid var(--border)" }} /> : null}
          <div className="row">
            <button type="button" className="secondary" onClick={captureSelfie}>
              <Camera size={16} /> Capturar selfie
            </button>
          </div>
        </div>
      </ConfirmModal>

      {adjustRow ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-label="Solicitar ajuste de ponto">
            <h3>Solicitar ajuste de ponto</h3>
            <p className="muted">Selecione qual marcação deseja ajustar, informe data/hora correta e justificativa.</p>
            <form className="stack" onSubmit={submitAdjustment}>
              <label>
                Tipo de ajuste
                <select value={adjustType} onChange={(e) => setAdjustType(e.target.value as PunchAction)}>
                  {(Object.keys(entryLabel) as PunchAction[]).map((key) => (
                    <option key={key} value={key}>{entryLabel[key]}</option>
                  ))}
                </select>
              </label>
              <label>
                Data e horário corretos
                <input type="datetime-local" value={adjustDateTime} onChange={(e) => setAdjustDateTime(e.target.value)} />
              </label>
              <label>
                Justificativa
                <textarea value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} />
              </label>
              <div className="row" style={{ justifyContent: "flex-end" }}>
                <button type="button" className="secondary" onClick={() => setAdjustRow(null)}>Cancelar</button>
                <button type="submit">Enviar solicitação</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={Boolean(reviewing)}
        title={
          reviewing?.isRetroactive
            ? "Analisar pedido de registro retroativo"
            : "Analisar solicitação de ajuste"
        }
        message={
          reviewing
            ? reviewing.isRetroactive
              ? `Data base ${reviewing.targetDate} | Solicitado por ${reviewing.userId}`
              : `${entryLabel[(reviewing.targetEntryType ?? "clock_in") as PunchAction]} | Solicitado por ${reviewing.userId}`
            : ""
        }
        confirmLabel="Aprovar"
        cancelLabel="Fechar"
        onCancel={() => {
          setReviewing(null);
          setReviewNote("");
        }}
        onConfirm={() => reviewAdjustment("approved")}
      >
        {reviewing ? (
          <div className="stack">
            <p><strong>Status:</strong> {reviewing.status}</p>
            <p><strong>Motivo:</strong> {reviewing.reason}</p>
            {reviewing.isRetroactive ? (
              <>
                <p><strong>Data base:</strong> {new Date(`${reviewing.targetDate}T00:00:00`).toLocaleDateString("pt-BR")}</p>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Etapa</th>
                        <th>Horário pretendido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reviewing.retroEntries ?? []).map((re, idx) => (
                        <tr key={`${re.entryType}-${idx}`}>
                          <td>{entryLabel[re.entryType]}</td>
                          <td>{new Date(re.recordedAt).toLocaleString("pt-BR")}</td>
                        </tr>
                      ))}
                      {(reviewing.retroEntries ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={2} className="muted">Sem batidas no pedido.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <p><strong>Original:</strong> {toDateLabel(reviewing.originalRecordedAt ?? undefined)}</p>
                <p><strong>Sugerido:</strong> {toDateLabel(reviewing.requestedRecordedAt ?? undefined)}</p>
              </>
            )}
            <label>
              Justificativa da recusa (opcional)
              <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} />
            </label>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button className="secondary" type="button" onClick={() => reviewAdjustment("rejected")}>Rejeitar</button>
            </div>
          </div>
        ) : null}
      </ConfirmModal>

      <ConfirmModal
        open={confirmCloseMonth}
        title="Fechar relatório de ponto"
        message={`Deseja fechar o relatório do mês ${(summary?.from ?? new Date().toISOString().slice(0, 10)).slice(0, 7)}? Após fechado, ele ficará disponível em Arquivos de Ponto.`}
        confirmLabel="Fechar mês"
        cancelLabel="Cancelar"
        onCancel={() => setConfirmCloseMonth(false)}
        onConfirm={closeMonthReport}
      />

      {editingRow ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-label="Editar registro de ponto">
            <h3>Editar registro de ponto</h3>
            <p className="muted">
              Atualize os horários existentes ou preencha campos em branco para criar a batida em falta (entrada, almoço,
              retorno ou saída). Use horários na ordem cronológica do dia.
            </p>
            <form className="stack" onSubmit={submitEditRow}>
              {(Object.keys(entryLabel) as PunchAction[]).map((key) => (
                <label key={key}>
                  {entryLabel[key]}
                  <input
                    type="datetime-local"
                    value={editingValues[key]}
                    onChange={(e) => setEditingValues((current) => ({ ...current, [key]: e.target.value }))}
                  />
                </label>
              ))}
              <label>
                Motivo da edição
                <textarea value={editReason} onChange={(e) => setEditReason(e.target.value)} />
              </label>
              <div className="row" style={{ justifyContent: "flex-end" }}>
                <button className="secondary" type="button" onClick={() => setEditingRow(null)}>Cancelar</button>
                <button type="submit">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {logsModal ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-label="Log de alterações">
            <div className="section-header">
              <h3>Log de alterações</h3>
              <button className="secondary" onClick={() => setLogsModal(null)}>Fechar</button>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Origem</th>
                    <th>Antes</th>
                    <th>Depois</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {(logsModal.logs ?? []).map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.createdAt).toLocaleString("pt-BR")}</td>
                      <td>{log.source}</td>
                      <td>{toDateLabel(log.previousRecordedAt)}</td>
                      <td>{toDateLabel(log.newRecordedAt)}</td>
                      <td>{log.reason || "-"}</td>
                    </tr>
                  ))}
                  {(logsModal.logs ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="muted">Sem logs para este registro.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="stack" style={{ marginTop: 12 }}>
              <h4>Solicitações de ajuste relacionadas</h4>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tipo</th>
                      <th>Status</th>
                      <th>Motivo</th>
                      <th>Parecer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows
                      .flatMap((row) => rowAdjustments(row))
                      .filter((adj) => adj.timeEntryId === logsModal.entryId)
                      .map((adj) => {
                        const meta = statusMeta(adj.status);
                        return (
                          <tr key={adj.id}>
                            <td>{new Date(adj.createdAt).toLocaleString("pt-BR")}</td>
                            <td>{entryLabel[(adj.targetEntryType ?? "clock_in") as PunchAction]}</td>
                            <td><span className={`status-pill ${meta.kind}`}>{meta.label}</span></td>
                            <td>{adj.reason}</td>
                            <td>{adj.reviewNote ?? "-"}</td>
                          </tr>
                        );
                      })}
                    {rows.flatMap((row) => rowAdjustments(row)).filter((adj) => adj.timeEntryId === logsModal.entryId).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="muted">Sem solicitações para este registro.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {retroactiveOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-label="Registrar ponto retroativo">
            <div className="section-header">
              <h3 style={{ margin: 0 }}>Registrar Ponto Retroativo</h3>
              <button type="button" className="secondary" onClick={closeRetroactiveModal}>Fechar</button>
            </div>
            <p className="muted">
              Selecione a data base e informe os horários da jornada. O pedido fica em estado&nbsp;
              <span className="status-pill warning">Pendente</span> até a aprovação do gestor.
              Apenas datas dos últimos 2 meses sem registro de ponto ficam disponíveis.
            </p>
            <form className="stack" onSubmit={submitRetroactiveRequest}>
              <label>
                Data base
                <select
                  value={retroactiveTargetDate}
                  onChange={(e) => setRetroactiveTargetDate(e.target.value)}
                  required
                >
                  <option value="">Selecione a data...</option>
                  {buildRetroactiveEligibleDates(retroactiveBlockedDates).map((iso) => (
                    <option key={iso} value={iso}>
                      {new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                      })}
                    </option>
                  ))}
                </select>
              </label>
              {retroactiveTargetDate ? (
                <div className="card stack" style={{ padding: 12 }}>
                  <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
                    Informe os horários (HH:MM) na sequência da jornada. Pelo menos a entrada
                    é obrigatória. Almoço (saída/retorno) é opcional, mas se preenchido
                    deve respeitar a ordem.
                  </p>
                  {(Object.keys(actionLabel) as PunchAction[]).map((key) => (
                    <label key={key}>
                      {actionLabel[key]}
                      <input
                        type="time"
                        step={60}
                        value={retroactiveTimes[key]}
                        onChange={(e) =>
                          setRetroactiveTimes((current) => ({ ...current, [key]: e.target.value }))
                        }
                      />
                    </label>
                  ))}
                </div>
              ) : null}
              <label>
                Justificativa
                <textarea
                  value={retroactiveReason}
                  onChange={(e) => setRetroactiveReason(e.target.value)}
                  placeholder="Ex.: Esqueci de bater o ponto no celular ao chegar à obra."
                  required
                />
              </label>
              <div className="row" style={{ justifyContent: "flex-end" }}>
                <button type="button" className="secondary" onClick={closeRetroactiveModal}>
                  Cancelar
                </button>
                <button type="submit" disabled={retroactiveSubmitting}>
                  {retroactiveSubmitting ? "Enviando..." : "Enviar pedido"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}

