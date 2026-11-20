"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as A from "./domain/actions";
import { nowInZone, type HHMM, type ISODate } from "./domain/dates";
import type { Now } from "./domain/schedule";
import type { FamilyData, Member, Swap } from "./domain/types";
import { getStore } from "./store";
import type { Session, Store } from "./store/types";

interface FamilyCtx {
  store: Store;
  session: Session;
  data: FamilyData;
  me: Member;
  now: Now;
  isAdmin: boolean;
  member: (id: string | null | undefined) => Member | undefined;
  confirm: (date: ISODate, slot: HHMM, mood?: string) => Promise<void>;
  decline: (date: ISODate, slot: HHMM, reason: string) => Promise<string | null>;
  take: (date: ISODate, slot: HHMM) => Promise<void>;
  proposeSwap: (partnerId: string, date: ISODate, slot: HHMM, reason: string) => Promise<Swap>;
  previewSwap: (partnerId: string, date: ISODate, slot: HHMM) => Swap | null;
  answerSwap: (swap: Swap, accept: boolean) => Promise<void>;
  assign: (memberId: string | null, date: ISODate, slot: HHMM) => Promise<void>;
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
  const [tick, setTick] = useState(0);
  const settling = useRef(false);

  const reload = useCallback(async () => {
    try {
      setData(await store.load(session.familyId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos cargar la familia.");
    }
  }, [store, session.familyId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos externos
    void reload();
    const unsub = store.subscribe(session.familyId, () => void reload());
    const onFocus = () => void reload();
    window.addEventListener("focus", onFocus);
    const t = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => {
      unsub();
      window.removeEventListener("focus", onFocus);
      clearInterval(t);
    };
  }, [store, session.familyId, reload]);

  const now = useMemo<Now>(
    () => nowInZone(data?.family.timeZone ?? "America/Argentina/Buenos_Aires"),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick fuerza recalcular la hora
    [data?.family.timeZone, tick],
  );

  // Aplica el "paseo de deuda" de los días que terminaron sin confirmar.
  // El servidor también lo hace; esto cubre el modo demo y adelanta el cambio.
  useEffect(() => {
    if (!data || settling.current) return;
    const debts = A.settleDebts(data, makeCtx(now));
    if (debts.length === 0) return;
    settling.current = true;
    store
      .addOverrides(session.familyId, debts)
      .then(reload)
      .catch(() => {})
      .finally(() => {
        settling.current = false;
      });
  }, [data, now, store, session.familyId, reload]);

  const value = useMemo<FamilyCtx | null>(() => {
    if (!data) return null;
    const me = data.members.find((m) => m.id === session.memberId);
    if (!me) return null;
    const run = async <T,>(fn: () => Promise<T>) => {
      const r = await fn();
      await reload();
      return r;
    };
    return {
      store,
      session,
      data,
      me,
      now,
      isAdmin: me.role === "admin",
      member: (id) => data.members.find((m) => m.id === id),
      confirm: (date, slot, mood) =>
        run(() => store.addConfirmation(data.family.id, A.confirmWalk(data, me.id, date, slot, makeCtx(now), mood))),
      decline: (date, slot, reason) =>
        run(async () => {
          const o = A.declineTurn(data, me.id, date, slot, reason, makeCtx(now));
          await store.addOverrides(data.family.id, [o]);
          return o.memberId;
        }),
      take: (date, slot) => run(() => store.addOverrides(data.family.id, [A.takeTurn(data, me.id, date, slot, makeCtx(now))])),
      previewSwap: (partnerId, date, slot) => {
        try {
          return A.proposeSwap(data, me.id, partnerId, date, slot, "", makeCtx(now));
        } catch {
          return null;
        }
      },
      proposeSwap: (partnerId, date, slot, reason) =>
        run(async () => {
          const s = A.proposeSwap(data, me.id, partnerId, date, slot, reason, makeCtx(now));
          await store.saveSwap(data.family.id, s);
          return s;
        }),
      answerSwap: (swap, accept) =>
        run(async () => {
          if (accept) {
            const r = A.acceptSwap(data, swap, me.id, makeCtx(now));
            await store.addOverrides(data.family.id, r.overrides);
            await store.saveSwap(data.family.id, r.swap);
          } else {
            await store.saveSwap(data.family.id, A.rejectSwap(swap, me.id));
          }
        }),
      assign: (memberId, date, slot) =>
        run(() => store.addOverrides(data.family.id, [A.adminAssign(data, memberId, date, slot, makeCtx(now))])),
      reload,
      signOut: async () => {
        await store.signOut();
        onSignOut();
      },
    };
  }, [data, session, store, now, reload, onSignOut]);

  if (error)
    return (
      <div className="screen-center">
        <p className="text-lg text-ink-2 max-w-xs">{error}</p>
        <button className="btn btn-primary mt-4" onClick={() => void reload()}>
          Reintentar
        </button>
        <button className="btn btn-ghost mt-2" onClick={() => void store.signOut().then(onSignOut)}>
          Salir
        </button>
      </div>
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
