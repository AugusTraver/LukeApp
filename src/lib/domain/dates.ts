// Fechas como texto "YYYY-MM-DD" (día civil de la familia) y horas "HH:MM".
// Todo el cálculo de días se hace en UTC para evitar problemas de horario de verano.

export type ISODate = string; // "2026-11-19"
export type HHMM = string; // "17:20"

/** Lunes = 0 … Domingo = 6 */
export function weekdayOf(date: ISODate): number {
  const d = new Date(date + "T00:00:00Z");
  return (d.getUTCDay() + 6) % 7;
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: ISODate, to: ISODate): number {
  const a = Date.parse(from + "T00:00:00Z");
  const b = Date.parse(to + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

export function mondayOf(date: ISODate): ISODate {
  return addDays(date, -weekdayOf(date));
}

export function timeToMinutes(t: HHMM): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(min: number): HHMM {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Fecha y hora actuales en la zona horaria de la familia. */
export function nowInZone(timeZone: string, now: Date = new Date()): { date: ISODate; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

const DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function dayName(weekday: number): string {
  return DIAS[weekday];
}
export function shortDayName(weekday: number): string {
  return DIAS_CORTOS[weekday];
}

/** "jueves 19 de noviembre" */
export function longDate(date: ISODate): string {
  const [, m, d] = date.split("-").map(Number);
  return `${DIAS[weekdayOf(date)]} ${d} de ${MESES[m - 1]}`;
}

/** "Hoy", "Mañana", "Ayer" o "jueves 19 de noviembre" */
export function friendlyDate(date: ISODate, today: ISODate): string {
  const diff = daysBetween(today, date);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  return longDate(date);
}

/** Para usar dentro de una frase: "hoy", "mañana", "ayer" o "el jueves 19 de noviembre". */
export function whenPhrase(date: ISODate, today: ISODate): string {
  const diff = daysBetween(today, date);
  if (diff === 0) return "hoy";
  if (diff === 1) return "mañana";
  if (diff === -1) return "ayer";
  return `el ${longDate(date)}`;
}

/** Primera letra en mayúscula. */
export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function monthName(month1: number): string {
  return MESES[month1 - 1];
}
