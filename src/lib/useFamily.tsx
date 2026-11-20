"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ErrorScreen } from "@/components/ErrorScreen";
import * as A from "./domain/actions";
import { activeCalendars, calendarView } from "./domain/calendars";
import { nowInZone, type HHMM, type ISODate } from "./domain/dates";
import type { Now } from "./domain/schedule";
import { MAIN, type FamilyData, type Member, type Swap } from "./domain/types";
import { getStore } from "./store";
import type { Session, Store } from "./store/types";

interface FamilyCtx {
  store: Store;
  session: Session;
  /** Datos vistos desde el calendario elegido (perros que salen juntos). */
  data: FamilyData;
  /** Todos los datos de la familia, sin filtrar por calendario. */
  full: FamilyData;
  calendars: ReturnType<typeof activeCalendars>;
  calendarId: string;
  setCalendar: (id: string) => void;
  me: Member;
  now: Now;
  isAdmin: boolean;
  /** Sin conexión: se muestran los últimos datos guardados. */
  offline: boolean;
  member: (id: string | null | undefined) => Member | undefined;
  confirm: (date: ISODate, slot: HHMM, mood?: string) => Promise<void>;
  decline: (date: ISODate, slot: HHMM, reason: string) => Promise<string | null>;
  take: (date: ISODate, slot: HHMM) => Promise<void>;
  proposeSwap: (partnerId: string, date: ISODate, slot: HHMM, reason: string) => Promise<Swap>;
  previewSwap: (partnerId: string, date: ISODate, slot: HHMM) => Swap | null;
  answerSwap: (swap: Swap, accept: boolean) => Promise<void>;
  assign: (memberId: string | null, date: ISODate, slot: HHMM) => Promise<void>;
  addAbsence: (memberId: string, from: ISODate, to: ISODate, reason?: string) => Promise<void>;
  removeAbsence: (id: string) => Promise<void>;
  leave: () => Promise<void>;
  deleteFamily: () => Promise<void>;
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<FamilyCtx | null>(null);

export function useFamily() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFamily fuera de FamilyProvider");
  return c;
}

function makeCtx(now: Now): A.Ctx {
  return { now, stamp: new Date().toISOString(), newId: () => crypto.randomUUID() };
}

const CAL_KEY = "lukeapp.calendar";
const cacheKey = (familyId: string) => `lukeapp.cache.${familyId}`;

function readLS(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeLS(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* sin almacenamiento */
  }
}

function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function FamilyProvider({
  store,
  session,
  onSignOut,
  children,
}: {
  store: Store;
  session: Session;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const [data, setData] = useState<FamilyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [tick, setTick] = useState(0);
  const [calendarId, setCalendarId] = useState<string>(() => readLS(CAL_KEY) ?? MAIN);
  const settling = useRef(false);

  const reload = useCallback(async () => {
    try {
      const d = await store.load(session.familyId);
      setData(d);
      setError(null);
      setOffline(false);
      writeLS(cacheKey(session.familyId), JSON.stringify(d));
    } catch (e) {
      // Sin conexión: seguimos mostrando lo último que sabíamos.
      const cached = readLS(cacheKey(session.familyId));
      if (cached && (isOffline() || !(e instanceof Error && e.message.includes("ya no existe")))) {
        setData((cur) => cur ?? (JSON.parse(cached) as FamilyData));
        setOffline(true);
        return;
      }
      setError(isOffline() ? "offline" : e instanceof Error ? e.message : "No pudimos cargar la familia.");
    }
  }, [store, session.familyId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos externos
    void reload();
    const unsub = store.subscribe(session.familyId, () => void reload());
    const onFocus = () => void reload();
    const onOnline = () => void reload();
    const onOffline = () => setOffline(true);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const t = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => {
      unsub();
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(t);
    };
  }, [store, session.familyId, reload]);

  // Mientras no hay conexión, reintenta cada 15 segundos.
  useEffect(() => {
    if (!offline) return;
    const t = setInterval(() => void reload(), 15_000);
    return () => clearInterval(t);
  }, [offline, reload]);

  const now = useMemo<Now>(
    () => nowInZone(data?.family.timeZone ?? "America/Argentina/Buenos_Aires"),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick fuerza recalcular la hora
    [data?.family.timeZone, tick],
  );

  // Aplica el "paseo de deuda" de los días que terminaron sin confirmar, en cada calendario.
  // El servidor también lo hace; esto cubre el modo demo y adelanta el cambio.
  useEffect(() => {
    if (!data || settling.current || offline) return;
    const debts = activeCalendars(data.family).flatMap(({ calendar }) =>
      A.settleDebts(calendarView(data, calendar.id), makeCtx(now)).map((o) => ({ ...o, calendarId: calendar.id })),
    );
    if (debts.length === 0) return;
    settling.current = true;
    store
      .addOverrides(session.familyId, debts)
      .then(reload)
      .catch(() => {})
      .finally(() => {
        settling.current = false;
      });
  }, [data, now, store, session.familyId, reload, offline]);

  const setCalendar = useCallback((id: string) => {
    setCalendarId(id);
    writeLS(CAL_KEY, id);
  }, []);

  const value = useMemo<FamilyCtx | null>(() => {
    if (!data) return null;
    const me = data.members.find((m) => m.id === session.memberId);
    if (!me) return null;
    const calendars = activeCalendars(data.family);
    const view = calendarView(data, calendarId);
    const cal = view.family.calendarId ?? MAIN;
    const tag = <T extends object>(x: T): T & { calendarId: string } => ({ ...x, calendarId: cal });
    const run = async <T,>(fn: () => Promise<T>) => {
      if (isOffline()) throw new A.ActionError("Sin conexión. Probá de nuevo cuando vuelva internet.");
      const r = await fn();
      await reload();
      return r;
    };
    const fid = data.family.id;
    return {
      store,
      session,
      data: view,
      full: data,
      calendars,
      calendarId: cal,
      setCalendar,
      me,
      now,
      offline,
      isAdmin: me.role === "admin",
      member: (id) => data.members.find((m) => m.id === id),
      confirm: (date, slot, mood) => run(() => store.addConfirmation(fid, tag(A.confirmWalk(view, me.id, date, slot, makeCtx(now), mood)))),
      decline: (date, slot, reason) =>
        run(async () => {
          const o = tag(A.declineTurn(view, me.id, date, slot, reason, makeCtx(now)));
          await store.addOverrides(fid, [o]);
          return o.memberId;
        }),
      take: (date, slot) => run(() => store.addOverrides(fid, [tag(A.takeTurn(view, me.id, date, slot, makeCtx(now)))])),
      previewSwap: (partnerId, date, slot) => {
        try {
          return A.proposeSwap(view, me.id, partnerId, date, slot, "", makeCtx(now));
        } catch {
          return null;
        }
      },
      proposeSwap: (partnerId, date, slot, reason) =>
        run(async () => {
          const s = tag(A.proposeSwap(view, me.id, partnerId, date, slot, reason, makeCtx(now)));
          await store.saveSwap(fid, s);
          return s;
        }),
      answerSwap: (swap, accept) =>
        run(async () => {
          const swapCal = swap.calendarId ?? MAIN;
          const v = calendarView(data, swapCal);
          if (accept) {
            const r = A.acceptSwap(v, swap, me.id, makeCtx(now));
            await store.addOverrides(
              fid,
              r.overrides.map((o) => ({ ...o, calendarId: swapCal })),
            );
            await store.saveSwap(fid, { ...r.swap, calendarId: swapCal });
          } else {
            await store.saveSwap(fid, { ...A.rejectSwap(swap, me.id), calendarId: swapCal });
          }
        }),
      assign: (memberId, date, slot) => run(() => store.addOverrides(fid, [tag(A.adminAssign(view, memberId, date, slot, makeCtx(now)))])),
      addAbsence: (memberId, from, to, reason) =>
        run(() => {
          if (to < from) throw new A.ActionError("La fecha de vuelta tiene que ser después de la de ida.");
          if (to < now.date) throw new A.ActionError("Ese período ya pasó.");
          return store.addAbsence(fid, { id: crypto.randomUUID(), memberId, from, to, reason: reason?.trim() || undefined, createdAt: new Date().toISOString() });
        }),
      removeAbsence: (id) => run(() => store.removeAbsence(fid, id)),
      leave: async () => {
        await store.leaveFamily(fid);
        writeLS(cacheKey(fid), null);
        onSignOut();
      },
      deleteFamily: async () => {
        await store.deleteFamily(fid);
        writeLS(cacheKey(fid), null);
        onSignOut();
      },
      reload,
      signOut: async () => {
        await store.signOut();
        writeLS(cacheKey(fid), null);
        onSignOut();
      },
    };
  }, [data, session, store, now, reload, onSignOut, calendarId, setCalendar, offline]);

  if (error)
    return (
      <ErrorScreen
        kind={error === "offline" ? "offline" : "error"}
        message={error === "offline" ? undefined : error}
        onRetry={() => void reload()}
        onSignOut={() => void store.signOut().then(onSignOut)}
      />
    );
  if (!value) return <Loading />;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function Loading() {
  return (
    <div className="screen-center" role="status" aria-label="Cargando">
      <span className="h-9 w-9 rounded-full border-[3px] border-line border-t-pine animate-spin" />
    </div>
  );
}

export { getStore };
