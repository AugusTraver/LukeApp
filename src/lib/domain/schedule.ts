import { addDays, daysBetween, timeToMinutes, weekdayOf, type HHMM, type ISODate } from "./dates";
import type { Family, FamilyData, Member, Override, Turn } from "./types";

export interface Now {
  date: ISODate;
  minutes: number;
}

function mod(a: number, n: number) {
  return ((a % n) + n) % n;
}

export function sortedSlots(family: Family): HHMM[] {
  return [...family.walkTimes].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

/**
 * Responsable según la regla de la familia, sin excepciones.
 * - Días fijos: siempre la misma persona.
 * - Días que rotan: se reparten en orden (A, B, C, A…) contando desde el lunes ancla,
 *   continuando de una semana a la otra. Cada horario del día cuenta como un paso.
 */
export function baseAssignee(family: Family, date: ISODate, slot: HHMM): { memberId: string | null; isFixed: boolean } {
  const wd = weekdayOf(date);
  const fixed = family.fixedDays[wd];
  if (fixed) return { memberId: fixed, isFixed: true };
  const n = family.rotation.length;
  if (n === 0) return { memberId: null, isFixed: false };

  const rotatingWeekdays = family.fixedDays.map((f, i) => (f ? -1 : i)).filter((i) => i >= 0);
  const perWeek = rotatingWeekdays.length;
  const slots = sortedSlots(family);
  const slotIndex = Math.max(0, slots.indexOf(slot));

  const diff = daysBetween(family.rotationAnchor, date);
  const weeks = Math.floor(diff / 7);
  const before = rotatingWeekdays.filter((i) => i < wd).length;
  const step = (weeks * perWeek + before) * slots.length + slotIndex;
  return { memberId: family.rotation[mod(step, n)], isFixed: false };
}

/** Último cambio (por fecha de creación) de cada turno. */
function latestOverrides(overrides: Override[]): Map<string, Override> {
  const map = new Map<string, Override>();
  const sorted = [...overrides].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const o of sorted) map.set(key(o.date, o.slot), o);
  return map;
}

export function key(date: ISODate, slot: HHMM) {
  return `${date}|${slot}`;
}

/** Calcula los turnos de un rango de días (incluye ambos extremos). */
export function buildTurns(data: FamilyData, from: ISODate, to: ISODate, now: Now): Turn[] {
  const { family } = data;
  const slots = sortedSlots(family);
  const overrides = latestOverrides(data.overrides);
  const confirmations = new Map(data.confirmations.map((c) => [key(c.date, c.slot), c]));
  const turns: Turn[] = [];

  for (let d = from; d <= to; d = addDays(d, 1)) {
    for (const slot of slots) {
      const base = baseAssignee(family, d, slot);
      const override = overrides.get(key(d, slot));
      const memberId = override ? override.memberId : base.memberId;
      const confirmation = confirmations.get(key(d, slot));
      turns.push({
        date: d,
        slot,
        baseMemberId: base.memberId,
        memberId,
        isFixed: base.isFixed,
        override,
        confirmation,
        status: statusOf(d, slot, memberId, !!confirmation, now, family.startDate),
      });
    }
  }
  return turns;
}

export function statusOf(
  date: ISODate,
  slot: HHMM,
  memberId: string | null,
  confirmed: boolean,
  now: Now,
  startDate: ISODate,
): Turn["status"] {
  if (confirmed) return "done";
  if (date < startDate) return "pending";
  if (date < now.date) return "missed";
  if (!memberId) return "unassigned";
  if (date === now.date && now.minutes >= timeToMinutes(slot)) return "now";
  return "pending";
}

export function getTurn(data: FamilyData, date: ISODate, slot: HHMM, now: Now): Turn {
  return buildTurns(data, date, date, now).find((t) => t.slot === slot)!;
}

export function walkers(data: FamilyData): Member[] {
  return data.members.filter((m) => m.walks);
}

/**
 * Quién cubre cuando alguien avisa "No puedo".
 * Entre los paseadores que no son el responsable y que no avisaron ya que no pueden ese turno,
 * elige al que tiene menos turnos en los próximos 14 días (empate: orden de rotación).
 * Devuelve null si nadie puede.
 */
export function pickCover(data: FamilyData, date: ISODate, slot: HHMM, now: Now): string | null {
  const turn = getTurn(data, date, slot, now);
  const declined = new Set(
    data.overrides
      .filter((o) => o.kind === "exception" && o.date === date && o.slot === slot && o.fromMemberId)
      .map((o) => o.fromMemberId!),
  );
  if (turn.memberId) declined.add(turn.memberId);
  const candidates = walkers(data).filter((m) => !declined.has(m.id));
  if (candidates.length === 0) return null;

  const window = buildTurns(data, date, addDays(date, 13), now);
  const load = (id: string) => window.filter((t) => t.memberId === id).length;
  const order = (id: string) => {
    const i = data.family.rotation.indexOf(id);
    return i < 0 ? 999 : i;
  };
  candidates.sort((a, b) => load(a.id) - load(b.id) || order(a.id) - order(b.id));
  return candidates[0].id;
}

/**
 * Para un intercambio: el próximo turno del compañero (no fijo, posterior al turno a cambiar
 * y a hoy, sin confirmar) que el que propone le devuelve.
 */
export function findSwapBack(
  data: FamilyData,
  partnerId: string,
  after: ISODate,
  now: Now,
): Turn | null {
  const start = addDays(after > now.date ? after : now.date, 1);
  const turns = buildTurns(data, start, addDays(start, 60), now);
  const pendingSwapDates = new Set(
    data.swaps.filter((s) => s.status === "pending").flatMap((s) => [key(s.date, s.slot), key(s.backDate, s.backSlot)]),
  );
  return (
    turns.find(
      (t) =>
        t.memberId === partnerId &&
        !t.isFixed &&
        !t.confirmation &&
        !pendingSwapDates.has(key(t.date, t.slot)),
    ) ?? null
  );
}

/** Turnos pasados sin confirmar que todavía no generaron su castigo. */
export function missedWithoutDebt(data: FamilyData, now: Now, lookbackDays = 14): Turn[] {
  if (!data.family.settings.penalty) return [];
  const from = addDays(now.date, -lookbackDays);
  const start = from < data.family.startDate ? data.family.startDate : from;
  const yesterday = addDays(now.date, -1);
  if (start > yesterday) return [];
  const settled = new Set(
    data.overrides
      .filter((o) => o.kind === "debt" && o.missedDate && o.missedSlot)
      .map((o) => key(o.missedDate!, o.missedSlot!)),
  );
  return buildTurns(data, start, yesterday, now).filter(
    (t) => t.status === "missed" && t.memberId && !settled.has(key(t.date, t.slot)),
  );
}

/**
 * El castigo: el próximo turno futuro de otra persona pasa a quien faltó.
 * Devuelve el turno que se le asigna, o null si no hay ninguno disponible.
 */
export function findDebtTarget(data: FamilyData, debtorId: string, now: Now): Turn | null {
  const start = addDays(now.date, 1);
  const turns = buildTurns(data, start, addDays(start, 60), now);
  return turns.find((t) => t.memberId && t.memberId !== debtorId && !t.confirmation && t.override?.kind !== "debt") ?? null;
}

/**
 * Racha: días seguidos con todos los paseos confirmados.
 * Hoy cuenta solo si ya está completo; si no, se cuenta desde ayer.
 */
export function streak(data: FamilyData, now: Now): number {
  const { startDate } = data.family;
  const confirmed = new Set(data.confirmations.map((c) => key(c.date, c.slot)));
  const slots = sortedSlots(data.family);
  const dayDone = (d: ISODate) => slots.every((s) => confirmed.has(key(d, s)));
  let count = 0;
  let d = dayDone(now.date) ? now.date : addDays(now.date, -1);
  while (d >= startDate && dayDone(d)) {
    count++;
    d = addDays(d, -1);
  }
  return count;
}

/** Faltas (turnos no realizados) por persona en un rango. */
export function missesByMember(turns: Turn[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of turns) {
    if (t.status === "missed" && t.memberId) map.set(t.memberId, (map.get(t.memberId) ?? 0) + 1);
  }
  return map;
}

/** Paseos hechos por persona en un rango. */
export function walksByMember(turns: Turn[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of turns) {
    if (t.confirmation) map.set(t.confirmation.walkedBy, (map.get(t.confirmation.walkedBy) ?? 0) + 1);
  }
  return map;
}
