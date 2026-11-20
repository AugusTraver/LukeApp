import type { Absence, Confirmation, Family, FamilyData, Member, Override, Swap } from "../domain/types";

export interface Session {
  familyId: string;
  memberId: string;
}

export interface FamilyPreview {
  familyId: string;
  familyName: string;
  dogName: string;
  dogCoat: string;
  members: { id: string; name: string; avatar: string; color: string; hasPin: boolean }[];
}

export interface NewFamilyInput {
  family: Omit<Family, "id" | "joinCode" | "rotationAnchor" | "startDate" | "fixedDays" | "rotation"> & {
    /** Índices de members; null = rota */
    fixedDays: (number | null)[];
    /** Índices de members en orden de rotación */
    rotation: number[];
  };
  /** El primero es quien crea la familia (admin). */
  members: Omit<Member, "id">[];
  adminPin: string;
  /** Solo en modo Supabase: cuenta del admin para recuperar el acceso. */
  account?: { email: string; password: string };
}

export interface Store {
  readonly mode: "demo" | "supabase";
  getSession(): Promise<Session | null>;
  signOut(): Promise<void>;

  createFamily(input: NewFamilyInput): Promise<Session>;
  previewFamily(joinCode: string): Promise<FamilyPreview | null>;
  /** Entra como un miembro. Si todavía no tiene PIN, lo crea. */
  joinFamily(joinCode: string, memberId: string, pin: string): Promise<Session>;
  /** Admin: entrar de nuevo con email y contraseña. */
  signInAdmin?(email: string, password: string): Promise<Session>;
  /** Admin: "Olvidé mi contraseña" (manda un email con un enlace). */
  requestPasswordReset?(email: string): Promise<void>;
  /** Después de abrir el enlace del email: elegir la contraseña nueva. */
  updatePassword?(password: string): Promise<Session>;
  /** Avisa cuando la app se abrió desde el enlace de recuperación. */
  onPasswordRecovery?(cb: () => void): () => void;

  load(familyId: string): Promise<FamilyData>;
  subscribe(familyId: string, onChange: () => void): () => void;

  addConfirmation(familyId: string, c: Confirmation): Promise<void>;
  addOverrides(familyId: string, os: Override[]): Promise<void>;
  saveSwap(familyId: string, s: Swap): Promise<void>;

  updateFamily(family: Family): Promise<void>;
  saveMember(familyId: string, m: Member): Promise<Member>;
  removeMember(familyId: string, memberId: string): Promise<void>;
  resetPin(familyId: string, memberId: string): Promise<void>;

  addAbsence(familyId: string, a: Absence): Promise<void>;
  removeAbsence(familyId: string, id: string): Promise<void>;
  /** Salir de la familia (y de la app en este celular). */
  leaveFamily(familyId: string): Promise<void>;
  /** Admin: borrar la familia con todo su historial. */
  deleteFamily(familyId: string): Promise<void>;

  savePushSubscription(familyId: string, memberId: string, sub: PushSubscriptionJSON): Promise<void>;
  sendTestPush(familyId: string, memberId: string): Promise<void>;
}

export class StoreError extends Error {}
