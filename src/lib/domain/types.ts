import type { HHMM, ISODate } from "./dates";

export type Role = "admin" | "walker" | "observer";

export interface Member {
  id: string;
  name: string;
  /** Cara elegida (semilla de avatar) */
  avatar: string;
  /** Color de fondo de la cara (hex) */
  color: string;
  role: Role;
  /** Un admin también puede pasear. Los walkers siempre pasean. */
  walks: boolean;
}

export interface FamilySettings {
  /** Castigo "paseo de deuda" cuando nadie confirma. */
  penalty: boolean;
  /** Avisos insistentes cada 5 minutos y escalado a otros. */
  insistent: boolean;
}

/** Un perro de la familia. Los que comparten calendario salen juntos. */
export interface Dog {
  id: string;
  name: string;
  /** black | brown | golden | gray */
  coat: string;
  calendarId: string;
}

/** Reglas de turnos de un grupo de perros que sale junto. */
export interface Calendar {
  id: string;
  walkTimes: HHMM[];
  fixedDays: (string | null)[];
  rotation: string[];
  rotationAnchor: ISODate;
  /** Desde cuándo cuenta (faltas, racha). Sin valor: el inicio de la familia. */
  startDate?: ISODate;
}

/** Calendario principal: el que ya tiene toda familia. */
export const MAIN = "main";

export interface Family {
  id: string;
  name: string;
  /**
   * Los campos de perro y reglas (dogName, dogCoat, walkTimes, fixedDays, rotation, rotationAnchor)
   * describen el calendario activo. Guardados, corresponden al calendario principal.
   */
  dogName: string;
  /** Color del pelaje para la ilustración: black | brown | golden | gray */
  dogCoat: string;
  timeZone: string;
  /** Horarios de paseo de cada día, ej. ["17:20"] */
  walkTimes: HHMM[];
  /** Paseador fijo por día de la semana (0 = lunes). null = rota. */
  fixedDays: (string | null)[];
  /** Orden de rotación de los días que no son fijos (ids de miembros). */
  rotation: string[];
  /** Lunes desde el que se cuenta la rotación. */
  rotationAnchor: ISODate;
  /** Primer día con registro (antes no hay faltas ni racha). */
  startDate: ISODate;
  settings: FamilySettings;
  joinCode: string;
  /** Todos los perros. Vacío en familias viejas: se usa dogName/dogCoat. */
  dogs?: Dog[];
  /** Calendarios además del principal (perros que salen aparte). */
  calendars?: Calendar[];
  /** Calendario que describe esta vista (MAIN si no se indica). */
  calendarId?: string;
}

/** Alguien que no está (vacaciones, viaje): sus turnos se reparten sin contar como falta. */
export interface Absence {
  id: string;
  memberId: string;
  from: ISODate;
  to: ISODate;
  reason?: string;
  createdAt: string;
}

/** Cambio puntual de responsable de un turno. */
export interface Override {
  id: string;
  date: ISODate;
  slot: HHMM;
  memberId: string | null; // null = sin responsable
  kind: "exception" | "swap" | "debt" | "admin";
  /** Quién dejó el turno (para excepciones). */
  fromMemberId?: string | null;
  reason?: string;
  createdAt: string; // ISO timestamp, para ordenar
  /** Para "debt": el día que se faltó. */
  missedDate?: ISODate;
  missedSlot?: HHMM;
  /** Para "swap": id del intercambio. */
  swapId?: string;
  calendarId?: string;
}

export interface Swap {
  id: string;
  proposerId: string;
  partnerId: string;
  /** Turno del que propone y que cubre el compañero. */
  date: ISODate;
  slot: HHMM;
  /** Turno del compañero que devuelve el que propone. */
  backDate: ISODate;
  backSlot: HHMM;
  reason: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  createdAt: string;
  calendarId?: string;
}

export interface Confirmation {
  id: string;
  date: ISODate;
  slot: HHMM;
  walkedBy: string;
  at: string; // ISO timestamp
  mood?: string;
  calendarId?: string;
}

export interface FamilyData {
  family: Family;
  members: Member[];
  overrides: Override[];
  swaps: Swap[];
  confirmations: Confirmation[];
  absences?: Absence[];
}

export type TurnStatus =
  | "done" // confirmado
  | "pending" // todavía no es la hora
  | "now" // ya es la hora y falta confirmar
  | "missed" // terminó el día sin confirmar
  | "unassigned"; // nadie puede

export interface Turn {
  date: ISODate;
  slot: HHMM;
  /** Responsable según la regla, sin cambios. */
  baseMemberId: string | null;
  /** Responsable actual, con excepciones, intercambios y deudas. */
  memberId: string | null;
  isFixed: boolean;
  /** Si el responsable de la regla no está (vacaciones), a quién reemplaza este turno. */
  coverFor?: string;
  /** Último cambio aplicado, si hubo. */
  override?: Override;
  confirmation?: Confirmation;
  status: TurnStatus;
}
