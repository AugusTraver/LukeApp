// Modo demo: guarda todo en este navegador (localStorage).
// Sirve para probar la app sin servidor. No comparte datos entre celulares.
import { settleDebts } from "../domain/actions";
import { addDays, mondayOf, nowInZone } from "../domain/dates";
import { getTurn } from "../domain/schedule";
import { augusFamily } from "../domain/seed";
import type { FamilyData, Member } from "../domain/types";
import { StoreError, type FamilyPreview, type NewFamilyInput, type Session, type Store } from "./types";

const DB_KEY = "lukeapp.demo.db.v2";
const SESSION_KEY = "lukeapp.session";

interface DemoDB {
  families: Record<string, FamilyData>;
  pins: Record<string, string>; // memberId -> pin
}

function uid() {
  return crypto.randomUUID();
}

export function makeJoinCode(dogName: string) {
  const prefix = (dogName.normalize("NFD").replace(/[^A-Za-z]/g, "").toUpperCase() + "LUKE").slice(0, 4);
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* sin almacenamiento disponible */
  }
}

export class DemoStore implements Store {
  readonly mode = "demo" as const;
  private listeners = new Set<() => void>();

  private read(): DemoDB {
    const raw = safeGet(DB_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as DemoDB;
      } catch {
        /* datos corruptos: se regeneran */
      }
    }
    // Familia de ejemplo: la de Augus, con 10 días de historial ya resueltos.
    const now = nowInZone("America/Argentina/Buenos_Aires");
    const seed = augusFamily(addDays(now.date, -10));
    for (let d = seed.family.startDate; d < now.date; d = addDays(d, 1)) {
      const t = getTurn(seed, d, "17:20", now);
      if (d === addDays(now.date, -4)) continue; // un día que nadie confirmó
      // Una vez lo cubrió el otro
      const walkedBy = d === addDays(now.date, -6) ? (t.memberId === "augus" ? "lucio" : "augus") : t.memberId!;
      const minute = 22 + ((d.charCodeAt(9) * 7) % 35);
      seed.confirmations.push({ id: uid(), date: d, slot: "17:20", walkedBy, at: `${d}T20:${String(minute).padStart(2, "0")}:00.000Z` });
    }
    const missed = addDays(now.date, -4);
    seed.overrides.push(
      ...settleDebts(
        { ...seed, family: { ...seed.family, startDate: missed } },
        { now: { date: addDays(missed, 1), minutes: 10 }, stamp: new Date(Date.now() - 3 * 86_400_000).toISOString(), newId: uid },
      ),
    );
    const db: DemoDB = { families: { [seed.family.id]: seed }, pins: {} };
    this.write(db);
    return db;
  }

  private write(db: DemoDB) {
    safeSet(DB_KEY, JSON.stringify(db));
    this.listeners.forEach((l) => l());
  }

  private mutate(familyId: string, fn: (d: FamilyData) => void) {
    const db = this.read();
    const data = db.families[familyId];
    if (!data) throw new StoreError("No encontramos la familia.");
    fn(data);
    this.write(db);
  }

  async getSession(): Promise<Session | null> {
    const raw = safeGet(SESSION_KEY);
    if (!raw) return null;
    try {
      const s = JSON.parse(raw) as Session;
      const db = this.read();
      return db.families[s.familyId]?.members.some((m) => m.id === s.memberId) ? s : null;
    } catch {
      return null;
    }
  }

  async signOut() {
    safeSet(SESSION_KEY, null);
  }

  private setSession(s: Session) {
    safeSet(SESSION_KEY, JSON.stringify(s));
    return s;
  }

  async createFamily(input: NewFamilyInput): Promise<Session> {
    const db = this.read();
    const familyId = uid();
    const members: Member[] = input.members.map((m) => ({ ...m, id: uid() }));
    const today = nowInZone(input.family.timeZone).date;
    const { fixedDays, rotation, ...rest } = input.family;
    db.families[familyId] = {
      family: {
        ...rest,
        id: familyId,
        joinCode: makeJoinCode(input.family.dogName),
        fixedDays: fixedDays.map((i) => (i === null ? null : members[i].id)),
        rotation: rotation.map((i) => members[i].id),
        rotationAnchor: mondayOf(today),
        startDate: today,
      },
      members,
      overrides: [],
      swaps: [],
      confirmations: [],
    };
    db.pins[members[0].id] = input.adminPin;
    this.write(db);
    return this.setSession({ familyId, memberId: members[0].id });
  }

  async previewFamily(joinCode: string): Promise<FamilyPreview | null> {
    const db = this.read();
    const code = joinCode.trim().toUpperCase();
    const data = Object.values(db.families).find((f) => f.family.joinCode === code);
    if (!data) return null;
    return {
      familyId: data.family.id,
      familyName: data.family.name,
      dogName: data.family.dogName,
      dogCoat: data.family.dogCoat,
      members: data.members.map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, color: m.color, hasPin: !!db.pins[m.id] })),
    };
  }

  async joinFamily(joinCode: string, memberId: string, pin: string): Promise<Session> {
    const preview = await this.previewFamily(joinCode);
    if (!preview) throw new StoreError("Ese código no existe.");
    const db = this.read();
    const saved = db.pins[memberId];
    if (saved && saved !== pin) throw new StoreError("El PIN no es correcto.");
    if (!saved) {
      db.pins[memberId] = pin;
      this.write(db);
    }
    return this.setSession({ familyId: preview.familyId, memberId });
  }

  async load(familyId: string): Promise<FamilyData> {
    const data = this.read().families[familyId];
    if (!data) throw new StoreError("No encontramos la familia.");
    return structuredClone(data);
  }

  subscribe(_familyId: string, onChange: () => void) {
    this.listeners.add(onChange);
    const onStorage = (e: StorageEvent) => e.key === DB_KEY && onChange();
    window.addEventListener("storage", onStorage);
    return () => {
      this.listeners.delete(onChange);
      window.removeEventListener("storage", onStorage);
    };
  }

  async addConfirmation(familyId: string, c: FamilyData["confirmations"][number]) {
    this.mutate(familyId, (d) => {
      if (d.confirmations.some((x) => x.date === c.date && x.slot === c.slot)) throw new StoreError("Ya estaba confirmado.");
      d.confirmations.push(c);
    });
  }

  async addOverrides(familyId: string, os: FamilyData["overrides"]) {
    this.mutate(familyId, (d) => d.overrides.push(...os));
  }

  async saveSwap(familyId: string, s: FamilyData["swaps"][number]) {
    this.mutate(familyId, (d) => {
      const i = d.swaps.findIndex((x) => x.id === s.id);
      if (i >= 0) d.swaps[i] = s;
      else d.swaps.push(s);
    });
  }

  async updateFamily(family: FamilyData["family"]) {
    this.mutate(family.id, (d) => {
      d.family = family;
    });
  }

  async saveMember(familyId: string, m: Member) {
    const member = { ...m, id: m.id || uid() };
    this.mutate(familyId, (d) => {
      const i = d.members.findIndex((x) => x.id === member.id);
      if (i >= 0) d.members[i] = member;
      else d.members.push(member);
    });
    return member;
  }

  async removeMember(familyId: string, memberId: string) {
    this.mutate(familyId, (d) => {
      d.members = d.members.filter((m) => m.id !== memberId);
      d.family.rotation = d.family.rotation.filter((id) => id !== memberId);
      d.family.fixedDays = d.family.fixedDays.map((id) => (id === memberId ? null : id));
    });
  }

  async resetPin(_familyId: string, memberId: string) {
    const db = this.read();
    delete db.pins[memberId];
    this.write(db);
  }

  async savePushSubscription() {
    // En modo demo no hay servidor que envíe avisos.
  }

  async sendTestPush() {
    const reg = await navigator.serviceWorker?.ready;
    await reg?.showNotification("Prueba de LukeApp", {
      body: "¡Así te van a llegar los avisos del paseo!",
      icon: "/icon-192.png",
      badge: "/badge.png",
      tag: "lukeapp-test",
    });
  }
}
