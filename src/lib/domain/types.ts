import type { HHMM, ISODate } from "./dates";

export type Role = "admin" | "walker" | "observer";

export interface Member {
  id: string;
  name: string;
  /** Emoji de la cara elegida, ej. "🧑" */
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

export interface Family {
  id: string;
  name: string;
  dogName: string;
  dogEmoji: string;
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
}

export interface Confirmation {
  id: string;
  date: ISODate;
  slot: HHMM;
  walkedBy: string;
  at: string; // ISO timestamp
  mood?: string;
}

export interface FamilyData {
  family: Family;
  members: Member[];
  overrides: Override[];
  swaps: Swap[];
  confirmations: Confirmation[];
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
  /** Último cambio aplicado, si hubo. */
  override?: Override;
  confirmation?: Confirmation;
  status: TurnStatus;
}
