/**
 * Gera PDF no formato "Folha de Ponto" (referência de apuração CLT).
 * Layout tipográfico com Helvetica/WinAnsi, tabela com grade e assinaturas.
 */

export type FolhaPunchRow = {
  baseDate: string;
  clockIn?: string;
  lunchOut?: string;
  lunchIn?: string;
  clockOut?: string;
};

export type FolhaDePontoInput = {
  from: string;
  to: string;
  emittedAt?: Date;
  employer: {
    legalName: string;
    taxId: string | null;
    address: string | null;
  };
  employee: {
    fullName: string;
    admissionDate: string | null;
    department: string | null;
    sector: string | null;
    positionTitle: string | null;
    cpf: string | null;
    ctps: string | null;
    pis: string | null;
    eSocial: string | null;
  };
  scheduleDescription: string | null;
  scheduleEffectiveFrom: string | null;
  dailyTargetMinutes: number;
  weekdayTargetMinutes?: number;
  rows: FolhaPunchRow[];
};

const WEEKDAY_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN_X = 36;
const MARGIN_TOP = 36;
const MARGIN_BOTTOM = 40;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

/** Larguras da tabela de registros (soma = CONTENT_W). */
const COL = {
  dia: 88,
  marks: 214,
  expected: 56,
  worked: 64,
  abonos: 46,
  balance: 55
} as const;

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function parseIsoDate(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00.000Z`);
}

export function formatDateBr(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return "-";
  return `${d}/${m}/${y}`;
}

export function formatCpfBr(cpf: string | null | undefined): string {
  const digits = (cpf ?? "").replace(/\D/g, "");
  if (digits.length !== 11) return cpf?.trim() || "-";
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatCnpjBr(taxId: string | null | undefined): string {
  const digits = (taxId ?? "").replace(/\D/g, "");
  if (digits.length !== 14) return taxId?.trim() || "-";
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function formatDurationHhMm(minutes: number): string {
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(minutes));
  return `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

export function civilDateInSaoPaulo(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(iso));
}

export function formatTimeInSaoPaulo(iso: string): string {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date(iso));
  const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
  const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
}

export function formatEmittedAtBr(date: Date): string {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
}

function weekdayIndexUtc(isoDate: string): number {
  return parseIsoDate(isoDate).getUTCDay();
}

function enumerateDatesInclusive(from: string, to: string): string[] {
  const start = parseIsoDate(from);
  const end = parseIsoDate(to);
  const out: string[] = [];
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return out;
  for (let cursor = new Date(start); cursor <= end; cursor = new Date(cursor.getTime() + 86400000)) {
    out.push(
      `${cursor.getUTCFullYear()}-${pad2(cursor.getUTCMonth() + 1)}-${pad2(cursor.getUTCDate())}`
    );
  }
  return out;
}

function diffMinutesIso(startIso?: string, endIso?: string): number {
  if (!startIso || !endIso) return 0;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.floor((end - start) / 60000);
}

export function workedMinutesForPunchRow(row: FolhaPunchRow): number {
  const gross = diffMinutesIso(row.clockIn, row.clockOut);
  const lunch = diffMinutesIso(row.lunchOut, row.lunchIn);
  return Math.max(0, gross - lunch);
}

function buildMarksLabel(row: FolhaPunchRow | undefined): string {
  if (!row) return "-";
  const parts: string[] = [];
  if (row.clockIn) parts.push(`${formatTimeInSaoPaulo(row.clockIn)}(E)`);
  if (row.lunchOut) parts.push(`${formatTimeInSaoPaulo(row.lunchOut)}(S)`);
  if (row.lunchIn) parts.push(`${formatTimeInSaoPaulo(row.lunchIn)}(E)`);
  if (row.clockOut) parts.push(`${formatTimeInSaoPaulo(row.clockOut)}(S)`);
  return parts.length > 0 ? parts.join("  ") : "-";
}

function groupPunchRowsByCivilDate(rows: FolhaPunchRow[]): Map<string, FolhaPunchRow> {
  const map = new Map<string, FolhaPunchRow>();
  for (const row of rows) {
    const key = row.baseDate;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...row });
      continue;
    }
    map.set(key, {
      baseDate: key,
      clockIn: prev.clockIn ?? row.clockIn,
      lunchOut: prev.lunchOut ?? row.lunchOut,
      lunchIn: prev.lunchIn ?? row.lunchIn,
      clockOut: prev.clockOut ?? row.clockOut
    });
  }
  return map;
}

type DayLine = {
  dateLabel: string;
  marks: string;
  expected: string;
  worked: string;
  abonos: string;
  balance: string;
  expectedMinutes: number;
  workedMinutes: number;
  balanceMinutes: number;
  hasMarks: boolean;
  isWeekend: boolean;
};

function buildDayLines(input: FolhaDePontoInput): DayLine[] {
  const byDate = groupPunchRowsByCivilDate(input.rows);
  const weekdayTarget = input.weekdayTargetMinutes ?? input.dailyTargetMinutes;
  const lines: DayLine[] = [];

  for (const date of enumerateDatesInclusive(input.from, input.to)) {
    const dow = weekdayIndexUtc(date);
    const weekday = WEEKDAY_SHORT[dow] ?? "---";
    const row = byDate.get(date);
    const isWeekend = dow === 0 || dow === 6;
    const expectedMinutes = isWeekend ? 0 : weekdayTarget;
    const worked = row ? workedMinutesForPunchRow(row) : 0;
    const hasMarks = Boolean(row && (row.clockIn || row.lunchOut || row.lunchIn || row.clockOut));

    if (!hasMarks) {
      lines.push({
        dateLabel: `${formatDateBr(date)} ${weekday}`,
        marks: "-",
        expected: "-",
        worked: "-",
        abonos: "-",
        balance: "-",
        expectedMinutes: 0,
        workedMinutes: 0,
        balanceMinutes: 0,
        hasMarks: false,
        isWeekend
      });
      continue;
    }

    const balance = worked - expectedMinutes;
    lines.push({
      dateLabel: `${formatDateBr(date)} ${weekday}`,
      marks: buildMarksLabel(row),
      expected: expectedMinutes > 0 ? formatDurationHhMm(expectedMinutes) : "-",
      worked: formatDurationHhMm(worked),
      abonos: "-",
      balance: formatDurationHhMm(balance),
      expectedMinutes,
      workedMinutes: worked,
      balanceMinutes: balance,
      hasMarks: true,
      isWeekend
    });
  }
  return lines;
}

function pdfEscape(text: string): string {
  const buf = Buffer.from(text, "latin1");
  let out = "";
  for (const byte of buf) {
    if (byte === 0x5c) out += "\\\\";
    else if (byte === 0x28) out += "\\(";
    else if (byte === 0x29) out += "\\)";
    else if (byte < 0x20 || byte === 0x7f) out += " ";
    else if (byte < 0x80) out += String.fromCharCode(byte);
    else out += `\\${byte.toString(8).padStart(3, "0")}`;
  }
  return out;
}

/** Largura aproximada Helvetica (avg ~0.5em). */
function approxTextWidth(text: string, fontSize: number, bold = false): number {
  const factor = bold ? 0.55 : 0.5;
  return text.length * fontSize * factor;
}

function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const normalized = text.trim() || "-";
  const maxChars = Math.max(8, Math.floor(maxWidth / (fontSize * 0.5)));
  if (normalized.length <= maxChars) return [normalized];
  const words = normalized.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    if (word.length <= maxChars) current = word;
    else {
      for (let i = 0; i < word.length; i += maxChars) lines.push(word.slice(i, i + maxChars));
      current = "";
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : ["-"];
}

type DrawCmd = string;

class PageCanvas {
  private ops: DrawCmd[] = [];

  fillRect(x: number, y: number, w: number, h: number, rgb: [number, number, number]) {
    const [r, g, b] = rgb;
    this.ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
    this.ops.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
    this.ops.push("0 0 0 rg");
  }

  strokeRect(x: number, y: number, w: number, h: number, lineWidth = 0.6) {
    this.ops.push(`${lineWidth} w`);
    this.ops.push("0 0 0 RG");
    this.ops.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
  }

  line(x1: number, y1: number, x2: number, y2: number, lineWidth = 0.5) {
    this.ops.push(`${lineWidth} w`);
    this.ops.push("0 0 0 RG");
    this.ops.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  }

  text(
    value: string,
    x: number,
    y: number,
    fontSize: number,
    opts?: { bold?: boolean; color?: [number, number, number] }
  ) {
    const bold = opts?.bold ?? false;
    const font = bold ? "/F2" : "/F1";
    const [r, g, b] = opts?.color ?? [0, 0, 0];
    this.ops.push("BT");
    this.ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
    this.ops.push(`${font} ${fontSize} Tf`);
    this.ops.push(`${x.toFixed(2)} ${y.toFixed(2)} Td`);
    this.ops.push(`(${pdfEscape(value)}) Tj`);
    this.ops.push("ET");
    this.ops.push("0 0 0 rg");
  }

  textRight(
    value: string,
    rightX: number,
    y: number,
    fontSize: number,
    opts?: { bold?: boolean; color?: [number, number, number] }
  ) {
    const bold = opts?.bold ?? false;
    const w = approxTextWidth(value, fontSize, bold);
    this.text(value, rightX - w, y, fontSize, opts);
  }

  toStream(): string {
    return this.ops.join("\n");
  }
}

function colXs(): number[] {
  const start = MARGIN_X;
  return [
    start,
    start + COL.dia,
    start + COL.dia + COL.marks,
    start + COL.dia + COL.marks + COL.expected,
    start + COL.dia + COL.marks + COL.expected + COL.worked,
    start + COL.dia + COL.marks + COL.expected + COL.worked + COL.abonos
  ];
}

function drawTableHeader(canvas: PageCanvas, yTop: number, rowH: number): number {
  const y = yTop - rowH;
  canvas.fillRect(MARGIN_X, y, CONTENT_W, rowH, [0.18, 0.27, 0.4]);
  const xs = colXs();
  const labels = ["Dia", "Marcações", "Previstas", "Trabalhadas", "Abonos", "Saldo"];
  const widths = [COL.dia, COL.marks, COL.expected, COL.worked, COL.abonos, COL.balance];
  const textY = y + 5;
  for (let i = 0; i < labels.length; i += 1) {
    canvas.text(labels[i]!, xs[i]! + 4, textY, 7.5, { bold: true, color: [1, 1, 1] });
    if (i > 0) canvas.line(xs[i]!, y, xs[i]!, y + rowH, 0.4);
  }
  canvas.strokeRect(MARGIN_X, y, CONTENT_W, rowH, 0.7);
  void widths;
  return y;
}

function drawTableRow(
  canvas: PageCanvas,
  day: DayLine,
  yTop: number,
  rowH: number,
  zebra: boolean,
  bold = false
): number {
  const y = yTop - rowH;
  if (zebra) canvas.fillRect(MARGIN_X, y, CONTENT_W, rowH, [0.96, 0.97, 0.98]);
  if (!day.hasMarks && day.isWeekend) {
    canvas.fillRect(MARGIN_X, y, CONTENT_W, rowH, [0.94, 0.94, 0.94]);
  }
  const xs = colXs();
  const values = [day.dateLabel, day.marks, day.expected, day.worked, day.abonos, day.balance];
  const textY = y + 4.5;
  const color: [number, number, number] =
    day.balanceMinutes < 0 ? [0.55, 0.1, 0.1] : day.balanceMinutes > 0 ? [0.05, 0.4, 0.2] : [0, 0, 0];
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i]!;
    const truncated =
      i === 1 && value.length > 42 ? `${value.slice(0, 39)}...` : value;
    const isBalance = i === 5;
    canvas.text(truncated, xs[i]! + 4, textY, bold ? 7.5 : 7, {
      bold: bold || i === 0,
      color: isBalance && day.hasMarks ? color : [0.15, 0.15, 0.15]
    });
    if (i > 0) canvas.line(xs[i]!, y, xs[i]!, y + rowH, 0.35);
  }
  canvas.line(MARGIN_X, y, MARGIN_X + CONTENT_W, y, 0.35);
  canvas.line(MARGIN_X, y + rowH, MARGIN_X + CONTENT_W, y + rowH, 0.35);
  canvas.line(MARGIN_X, y, MARGIN_X, y + rowH, 0.5);
  canvas.line(MARGIN_X + CONTENT_W, y, MARGIN_X + CONTENT_W, y + rowH, 0.5);
  return y;
}

function drawSectionTitle(canvas: PageCanvas, title: string, y: number): number {
  canvas.text(title, MARGIN_X, y - 12, 9, { bold: true, color: [0.12, 0.2, 0.32] });
  canvas.line(MARGIN_X, y - 16, MARGIN_X + CONTENT_W, y - 16, 0.8);
  return y - 28;
}

function drawLabeledLines(
  canvas: PageCanvas,
  lines: string[],
  y: number,
  fontSize = 8.5
): number {
  let cursor = y;
  for (const line of lines) {
    canvas.text(line, MARGIN_X, cursor - fontSize, fontSize, { color: [0.15, 0.15, 0.15] });
    cursor -= fontSize + 3;
  }
  return cursor - 4;
}

type PageBlock =
  | { kind: "header"; from: string; to: string; emitted: string }
  | { kind: "legend" }
  | { kind: "section"; title: string }
  | { kind: "paragraphs"; lines: string[] }
  | { kind: "table-header" }
  | { kind: "table-row"; day: DayLine; zebra: boolean; bold?: boolean }
  | { kind: "summary"; positive: string; negative: string }
  | { kind: "ack" }
  | { kind: "signatures"; employer: string; employee: string };

function estimateBlockHeight(block: PageBlock): number {
  switch (block.kind) {
    case "header":
      return 58;
    case "legend":
      return 18;
    case "section":
      return 28;
    case "paragraphs":
      return block.lines.length * 11.5 + 8;
    case "table-header":
      return 16;
    case "table-row":
      return 14;
    case "summary":
      return 22;
    case "ack":
      return 36;
    case "signatures":
      return 78;
    default:
      return 12;
  }
}

function buildBlocks(input: FolhaDePontoInput): PageBlock[] {
  const emitted = formatEmittedAtBr(input.emittedAt ?? new Date());
  const dayLines = buildDayLines(input);

  let totalExpected = 0;
  let totalWorked = 0;
  let positiveBalance = 0;
  let negativeBalance = 0;
  for (const day of dayLines) {
    totalExpected += day.expectedMinutes;
    totalWorked += day.workedMinutes;
    if (day.balanceMinutes > 0) positiveBalance += day.balanceMinutes;
    if (day.balanceMinutes < 0) negativeBalance += Math.abs(day.balanceMinutes);
  }
  const totalBalance = totalWorked - totalExpected;

  const blocks: PageBlock[] = [
    { kind: "header", from: input.from, to: input.to, emitted },
    { kind: "legend" },
    { kind: "section", title: "DADOS DO EMPREGADOR" },
    {
      kind: "paragraphs",
      lines: [
        `Razão Social: ${input.employer.legalName || "-"}`,
        `CNPJ: ${formatCnpjBr(input.employer.taxId)}`,
        ...wrapText(`Endereço: ${input.employer.address?.trim() || "-"}`, CONTENT_W - 8, 8.5)
      ]
    },
    { kind: "section", title: "DADOS DO TRABALHADOR" },
    {
      kind: "paragraphs",
      lines: [
        `Nome: ${input.employee.fullName || "-"}`,
        `Data de admissão: ${
          input.employee.admissionDate ? formatDateBr(input.employee.admissionDate) : "-"
        }`,
        `Departamento: ${input.employee.department || "-"}    Setor: ${
          input.employee.sector || input.employee.department || "-"
        }`,
        `Cargo: ${input.employee.positionTitle || "-"}`,
        `CPF: ${formatCpfBr(input.employee.cpf)}    CTPS: ${input.employee.ctps || "-"}    Série: -`,
        `PIS / PASEP: ${input.employee.pis || "-"}    eSocial: ${input.employee.eSocial || "-"}`
      ]
    },
    { kind: "section", title: "EXPEDIENTE(S)" },
    {
      kind: "paragraphs",
      lines: [
        ...wrapText(input.scheduleDescription?.trim() || "-", CONTENT_W - 8, 8.5),
        ...(input.scheduleEffectiveFrom
          ? [`Vigente a partir do dia ${formatDateBr(input.scheduleEffectiveFrom)}.`]
          : [])
      ]
    },
    { kind: "section", title: "REGISTROS" },
    { kind: "table-header" }
  ];

  dayLines.forEach((day, idx) => {
    blocks.push({ kind: "table-row", day, zebra: idx % 2 === 1 });
  });
  blocks.push({
    kind: "table-row",
    day: {
      dateLabel: "TOTAL",
      marks: "",
      expected: formatDurationHhMm(totalExpected),
      worked: formatDurationHhMm(totalWorked),
      abonos: "-",
      balance: formatDurationHhMm(totalBalance),
      expectedMinutes: totalExpected,
      workedMinutes: totalWorked,
      balanceMinutes: totalBalance,
      hasMarks: true,
      isWeekend: false
    },
    zebra: false,
    bold: true
  });
  blocks.push({
    kind: "summary",
    positive: formatDurationHhMm(positiveBalance),
    negative: formatDurationHhMm(negativeBalance)
  });
  blocks.push({ kind: "ack" });
  blocks.push({
    kind: "signatures",
    employer: input.employer.legalName || "Empregador",
    employee: input.employee.fullName || "Trabalhador"
  });
  return blocks;
}

function paginateBlocks(blocks: PageBlock[]): PageBlock[][] {
  const usable = PAGE_H - MARGIN_TOP - MARGIN_BOTTOM;
  const pages: PageBlock[][] = [];
  let current: PageBlock[] = [];
  let used = 0;

  for (const block of blocks) {
    const h = estimateBlockHeight(block);
    const isTableContinuation =
      block.kind === "table-row" && current.length > 0 && used + h > usable;

    if (isTableContinuation || (current.length > 0 && used + h > usable && block.kind !== "header")) {
      pages.push(current);
      current = [];
      used = 0;
      // Repete cabeçalho da tabela ao partir páginas no meio dos registros.
      if (block.kind === "table-row") {
        current.push({ kind: "table-header" });
        used += estimateBlockHeight({ kind: "table-header" });
      }
    }
    current.push(block);
    used += h;
  }
  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [[{ kind: "legend" }]];
}

function renderPageBlocks(blocks: PageBlock[], pageIndex: number, pageCount: number): string {
  const canvas = new PageCanvas();
  let y = PAGE_H - MARGIN_TOP;

  // Faixa superior
  canvas.fillRect(0, PAGE_H - 8, PAGE_W, 8, [0.12, 0.22, 0.38]);

  for (const block of blocks) {
    switch (block.kind) {
      case "header": {
        canvas.text("Folha de Ponto", MARGIN_X, y - 22, 18, {
          bold: true,
          color: [0.1, 0.18, 0.3]
        });
        canvas.textRight(`Página ${pageIndex + 1}/${pageCount}`, MARGIN_X + CONTENT_W, y - 14, 8, {
          color: [0.4, 0.4, 0.4]
        });
        canvas.text(
          `Apuração: de ${formatDateBr(block.from)} a ${formatDateBr(block.to)}`,
          MARGIN_X,
          y - 38,
          9,
          { color: [0.25, 0.25, 0.25] }
        );
        canvas.text(`Emitido em ${block.emitted}`, MARGIN_X, y - 51, 8, {
          color: [0.4, 0.4, 0.4]
        });
        canvas.line(MARGIN_X, y - 58, MARGIN_X + CONTENT_W, y - 58, 1);
        y -= 66;
        break;
      }
      case "legend": {
        canvas.fillRect(MARGIN_X, y - 16, CONTENT_W, 14, [0.94, 0.96, 0.98]);
        canvas.text("Legenda: (E) = Entrada     (S) = Saída", MARGIN_X + 6, y - 12, 7.5, {
          color: [0.25, 0.3, 0.38]
        });
        y -= 22;
        break;
      }
      case "section":
        y = drawSectionTitle(canvas, block.title, y);
        break;
      case "paragraphs":
        y = drawLabeledLines(canvas, block.lines, y);
        break;
      case "table-header":
        y = drawTableHeader(canvas, y, 14);
        break;
      case "table-row":
        y = drawTableRow(canvas, block.day, y, 13, block.zebra, block.bold);
        break;
      case "summary": {
        y -= 10;
        canvas.fillRect(MARGIN_X, y - 16, CONTENT_W, 16, [0.93, 0.95, 0.92]);
        canvas.text(
          `Neste período: saldo positivo de ${block.positive} e saldo negativo de ${block.negative}.`,
          MARGIN_X + 6,
          y - 12,
          8,
          { bold: true, color: [0.15, 0.28, 0.18] }
        );
        y -= 26;
        break;
      }
      case "ack": {
        y -= 6;
        for (const line of wrapText(
          "Reconheço com exatidão todos os registros constantes neste documento, pois representam o ocorrido neste período.",
          CONTENT_W - 8,
          8
        )) {
          canvas.text(line, MARGIN_X, y - 10, 8, { color: [0.25, 0.25, 0.25] });
          y -= 12;
        }
        y -= 8;
        break;
      }
      case "signatures": {
        const colW = (CONTENT_W - 24) / 2;
        const leftX = MARGIN_X;
        const rightX = MARGIN_X + colW + 24;
        const lineY = y - 36;
        canvas.line(leftX, lineY, leftX + colW, lineY, 0.8);
        canvas.line(rightX, lineY, rightX + colW, lineY, 0.8);
        canvas.text(block.employer, leftX, lineY - 14, 8, { bold: true });
        canvas.text("Responsável", leftX, lineY - 26, 7.5, { color: [0.4, 0.4, 0.4] });
        canvas.text(block.employee, rightX, lineY - 14, 8, { bold: true });
        canvas.text("Trabalhador", rightX, lineY - 26, 7.5, { color: [0.4, 0.4, 0.4] });
        y -= 70;
        break;
      }
    }
  }

  return canvas.toStream();
}

function assemblePdf(pageStreams: string[]): Buffer {
  type PdfObject = { id: number; body: string };
  const objects: PdfObject[] = [];
  const catalogId = 1;
  const pagesId = 2;
  const fontRegularId = 3;
  const fontBoldId = 4;

  objects.push({ id: catalogId, body: `<< /Type /Catalog /Pages ${pagesId} 0 R >>` });
  objects.push({
    id: fontRegularId,
    body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
  });
  objects.push({
    id: fontBoldId,
    body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
  });

  const pageObjectIds: number[] = [];
  let nextId = 5;

  for (const stream of pageStreams) {
    const contentId = nextId++;
    const pageId = nextId++;
    pageObjectIds.push(pageId);
    const contentLength = Buffer.byteLength(stream, "latin1");
    objects.push({
      id: contentId,
      body: `<< /Length ${contentLength} >>\nstream\n${stream}\nendstream`
    });
    objects.push({
      id: pageId,
      body: `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> >>`
    });
  }

  objects.push({
    id: pagesId,
    body: `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`
  });

  objects.sort((a, b) => a.id - b.id);

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  const maxId = objects[objects.length - 1]?.id ?? 0;
  const byId = new Map(objects.map((o) => [o.id, o]));
  for (let id = 1; id <= maxId; id += 1) {
    const obj = byId.get(id);
    if (!obj) continue;
    offsets[id] = Buffer.byteLength(pdf, "latin1");
    pdf += `${id} 0 obj\n${obj.body}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${maxId + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let id = 1; id <= maxId; id += 1) {
    const offset = offsets[id] ?? 0;
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${maxId + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

export function buildFolhaDePontoPdf(input: FolhaDePontoInput): Buffer {
  const pages = paginateBlocks(buildBlocks(input));
  const streams = pages.map((blocks, idx) => renderPageBlocks(blocks, idx, pages.length));
  return assemblePdf(streams);
}

export function groupEntriesToFolhaRows(
  entries: Array<{ entryType: string; recordedAt: string }>
): FolhaPunchRow[] {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );
  const rows: FolhaPunchRow[] = [];
  let current: FolhaPunchRow | null = null;
  for (const entry of sorted) {
    const baseDate = civilDateInSaoPaulo(entry.recordedAt);
    if (entry.entryType === "clock_in") {
      if (current) rows.push(current);
      current = { baseDate, clockIn: entry.recordedAt };
      continue;
    }
    if (!current) current = { baseDate };
    if (entry.entryType === "lunch_out") current.lunchOut = entry.recordedAt;
    if (entry.entryType === "lunch_in") current.lunchIn = entry.recordedAt;
    if (entry.entryType === "clock_out") {
      current.clockOut = entry.recordedAt;
      rows.push(current);
      current = null;
    }
  }
  if (current) rows.push(current);
  return rows;
}

export function buildScheduleDescription(input: {
  templateName: string | null;
  dailyWorkMinutes: number;
  lunchBreakMinutes: number | null;
}): string {
  const hours = formatDurationHhMm(input.dailyWorkMinutes);
  const lunch =
    input.lunchBreakMinutes && input.lunchBreakMinutes > 0
      ? ` com intervalo de ${formatDurationHhMm(input.lunchBreakMinutes)}`
      : "";
  if (input.templateName?.trim()) {
    return `${input.templateName.trim()} — jornada prevista de ${hours} por dia útil${lunch}.`;
  }
  return `Jornada prevista de ${hours} por dia útil${lunch}.`;
}
