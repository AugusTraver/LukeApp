// Qué avisos corresponde mandar ahora. Lógica pura: el servidor la corre cada 5 minutos.
import { addDays, timeToMinutes, type HHMM, type ISODate } from "./dates";
import { buildTurns, type Now } from "./schedule";
import type { FamilyData, Turn } from "./types";

export type Audience = "assignee" | "walkers" | "watchers" | "everyone";

export interface Step {
  key: string;
  /** Minutos respecto del horario del paseo. */
  at: number;
  to: Audience;
  urgent: boolean;
  insistentOnly: boolean;
  /** Avisos repetidos (se saltean si la persona tocó "10 min más"). */
  repeat?: boolean;
}

/** Ejemplo con paseo a las 17:20: 17:10, 17:20, cada 5 min hasta 18:00, 18:00, cada 15 min, 19:00 a los demás, 20:00 a toda la familia. */
export const STEPS: Step[] = [
  { key: "pre", at: -10, to: "assignee", urgent: false, insistentOnly: false },
  { key: "now", at: 0, to: "assignee", urgent: true, insistentOnly: false },
  ...[5, 10, 15, 20, 25, 30, 35].map((m) => ({ key: `r${m}`, at: m, to: "assignee" as const, urgent: true, insistentOnly: true, repeat: true })),
  { key: "late", at: 40, to: "assignee", urgent: true, insistentOnly: true },
  ...[55, 70, 85].map((m) => ({ key: `r${m}`, at: m, to: "assignee" as const, urgent: true, insistentOnly: true, repeat: true })),
  { key: "others", at: 100, to: "walkers", urgent: true, insistentOnly: true },
  ...[115, 130, 145].map((m) => ({ key: `r${m}`, at: m, to: "assignee" as const, urgent: true, insistentOnly: true, repeat: true })),
  { key: "family", at: 160, to: "watchers", urgent: true, insistentOnly: true },
];

export interface PlannedPush {
  date: ISODate;
  slot: HHMM;
  step: string;
  /** ids de miembros */
  to: string[];
  title: string;
  body: string;
  urgent: boolean;
  /** Si incluye los botones "Ya lo saqué / 10 min más" (para quien tiene el turno). */
  actionable: boolean;
}

/**
 * @param sent pasos ya enviados, como "fecha|horario|paso"
 * @param snoozedUntil por miembro y turno, minutos del día hasta los que no se repite
 */
export function planPushes(
  data: FamilyData,
  now: Now,
  sent: Set<string>,
  snoozedUntil: Map<string, number> = new Map(),
): { pushes: PlannedPush[]; markSent: string[] } {
  const { family, members } = data;
  const dog = family.dogName;
  const pushes: PlannedPush[] = [];
  const markSent: string[] = [];
  const turns = buildTurns(data, now.date, now.date, now);
  const walkersIds = members.filter((m) => m.walks).map((m) => m.id);
  const watchers = members.filter((m) => m.role !== "walker" || !m.walks).map((m) => m.id);
  const name = (id: string | null) => members.find((m) => m.id === id)?.name ?? "alguien";

  for (const t of turns) {
    if (t.status === "done") continue;
    const since = now.minutes - timeToMinutes(t.slot);
    const due = STEPS.filter((s) => s.at <= since && (!s.insistentOnly || family.settings.insistent) && !sent.has(`${t.date}|${t.slot}|${s.key}`));
    if (due.length === 0) continue;
    // Todos los pasos atrasados se marcan como enviados; se manda solo el último de cada público.
    for (const s of due) markSent.push(`${t.date}|${t.slot}|${s.key}`);
    const snooze = t.memberId ? snoozedUntil.get(`${t.memberId}|${t.date}|${t.slot}`) : undefined;
    const latest = new Map<Audience, Step>();
    for (const s of due) latest.set(s.to, s);
    for (const s of latest.values()) {
      if (since - s.at > 30) continue; // muy viejo (el servidor estuvo caído): no molestar
      if (s.to === "assignee" && s.repeat && snooze !== undefined && now.minutes < snooze) continue;
      const p = render(s, t, dog, name, walkersIds, watchers);
      if (p) pushes.push(p);
    }
  }
  return { pushes, markSent };
}

function render(s: Step, t: Turn, dog: string, name: (id: string | null) => string, walkers: string[], watchers: string[]): PlannedPush | null {
  const base = { date: t.date, slot: t.slot, step: s.key, urgent: s.urgent };
  const who = t.memberId;
  if (!who) {
    // Turno sin responsable: se avisa a todos los que pasean a la hora del paseo.
    if (s.key !== "pre" && s.key !== "now" && s.key !== "others") return null;
    return { ...base, to: walkers, title: `🆘 Nadie puede sacar a ${dog}`, body: `Es a las ${t.slot}. ¿Lo podés sacar vos? Abrí la app.`, actionable: false };
  }
  const n = name(who);
  switch (s.to) {
    case "assignee":
      if (s.key === "pre") return { ...base, to: [who], title: `🐕 En 10 minutos, ${dog} te espera`, body: `${n}, hoy te toca a las ${t.slot}.`, actionable: false };
      if (s.key === "now") return { ...base, to: [who], title: `🦮 ¡Es hora del paseo de ${dog}!`, body: `${n}, sacalo y tocá “Ya lo saqué”.`, actionable: true };
      if (s.key === "late") return { ...base, to: [who], title: `⚠️ ${dog} sigue esperando`, body: `${n}, todavía no confirmaste el paseo de las ${t.slot}. Si ya lo sacaste, tocá “Ya lo saqué”.`, actionable: true };
      return { ...base, to: [who], title: `🐾 ${dog} te mira con la correa en la boca`, body: `${n}, ¿ya lo sacaste? Confirmalo para que dejemos de insistir.`, actionable: true };
    case "walkers": {
      const others = walkers.filter((id) => id !== who);
      return { ...base, to: [...others, who], title: `🆘 ${dog} todavía no salió`, body: `A ${n} le tocaba a las ${t.slot} y no confirmó. ¿Alguien lo puede sacar?`, actionable: false };
    }
    case "watchers":
      return watchers.length ? { ...base, to: watchers, title: `😢 ${dog} no salió a pasear`, body: `A ${n} le tocaba a las ${t.slot} y todavía no lo confirmó.`, actionable: false } : null;
    default:
      return null;
  }
}

/** Aviso de la mañana siguiente cuando se aplicó un castigo. */
export function debtPush(data: FamilyData, debtorId: string, missedDate: ISODate, targetDate: ISODate | null, today: ISODate): { to: string[]; title: string; body: string } {
  const n = data.members.find((m) => m.id === debtorId)?.name ?? "Alguien";
  const when = targetDate ? (targetDate === addDays(today, 1) ? "mañana" : `el ${targetDate.slice(8)}/${targetDate.slice(5, 7)}`) : null;
  return {
    to: data.members.map((m) => m.id),
    title: `🐾 Paseo de deuda para ${n}`,
    body: `${missedDate === addDays(today, -1) ? "Ayer" : "Un día"} nadie confirmó el paseo de ${data.family.dogName}.${when ? ` ${n} lo saca ${when} en lugar de otra persona.` : ""}`,
  };
}
