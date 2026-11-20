"use client";

import { CalendarDays, History, House, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getStore } from "@/lib/store";
import type { Session, Store } from "@/lib/store/types";
import { FamilyProvider, Loading, useFamily } from "@/lib/useFamily";
import { DogPack } from "./Dog";
import { ErrorScreen, OfflineBanner } from "./ErrorScreen";
import { FamilyTab } from "./FamilyTab";
import { HistoryTab } from "./HistoryTab";
import { registerSW } from "./Notifications";
import { AdminSignIn, CreateFamily, JoinFlow, NewPassword, Welcome } from "./Onboarding";
import { TodayTab } from "./TodayTab";
import { TurnsTab } from "./TurnsTab";
import { Toast } from "./ui";

type Screen = "welcome" | "join" | "create" | "admin";

const LAST_SESSION = "lukeapp.lastSession";
function remember(s: Session | null) {
  try {
    if (s) localStorage.setItem(LAST_SESSION, JSON.stringify(s));
    else localStorage.removeItem(LAST_SESSION);
  } catch {
    /* sin almacenamiento */
  }
}
function lastSession(): Session | null {
  try {
    const raw = localStorage.getItem(LAST_SESSION);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function App() {
  const [store, setStore] = useState<Store | null>(null);
  const [session, setSessionState] = useState<Session | null | undefined>(undefined);
  const [screen, setScreen] = useState<Screen>("welcome");
  const [bootError, setBootError] = useState<"offline" | "error" | null>(null);
  const [recovering, setRecovering] = useState(false);

  const setSession = useCallback((s: Session | null) => {
    remember(s);
    setSessionState(s);
  }, []);

  const boot = useCallback(async () => {
    setBootError(null);
    let s: Store | null = null;
    try {
      s = await getStore();
      setStore(s);
      setSession(await s.getSession());
    } catch {
      // Sin internet: si este celular ya estaba en una familia, mostramos lo guardado.
      const last = lastSession();
      if (s && last) setSessionState(last);
      else setBootError(navigator.onLine === false ? "offline" : "error");
    }
  }, [setSession]);

  useEffect(() => {
    // Se abrió desde el email de "Olvidé mi contraseña".
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lee la URL una sola vez al abrir
    if (new URLSearchParams(location.search).has("recuperar")) setRecovering(true);
    void boot();
    void registerSW();
  }, [boot]);

  useEffect(() => store?.onPasswordRecovery?.(() => setRecovering(true)), [store]);

  const onSignOut = useCallback(() => {
    setSession(null);
    setScreen("welcome");
  }, [setSession]);

  if (bootError) return <ErrorScreen kind={bootError} onRetry={() => void boot()} />;
  if (!store || session === undefined) return <Loading />;

  if (recovering)
    return (
      <NewPassword
        store={store}
        onDone={(s) => {
          history.replaceState(null, "", "/");
          setRecovering(false);
          setSession(s);
        }}
        onCancel={() => {
          history.replaceState(null, "", "/");
          setRecovering(false);
          void store.signOut().then(() => setSession(null));
        }}
      />
    );

  if (!session) {
    const back = () => setScreen("welcome");
    if (screen === "join") return <JoinFlow store={store} onBack={back} onSession={setSession} />;
    if (screen === "create") return <CreateFamily store={store} onBack={back} onSession={setSession} />;
    if (screen === "admin") return <AdminSignIn store={store} onBack={back} onSession={setSession} />;
    return <Welcome store={store} onJoin={() => setScreen("join")} onCreate={() => setScreen("create")} onAdmin={() => setScreen("admin")} />;
  }

  return (
    <FamilyProvider store={store} session={session} onSignOut={onSignOut}>
      <Shell />
    </FamilyProvider>
  );
}

const TABS = [
  { id: "today", label: "Hoy", Icon: House },
  { id: "turns", label: "Turnos", Icon: CalendarDays },
  { id: "history", label: "Historial", Icon: History },
  { id: "family", label: "Familia", Icon: Users },
] as const;
type Tab = (typeof TABS)[number]["id"];

function Shell() {
  const f = useFamily();
  const [tab, setTab] = useState<Tab>("today");
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const pendingForMe = f.full.swaps.filter((s) => s.status === "pending" && s.partnerId === f.me.id && s.backDate >= f.now.date).length;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);

  return (
    <div className="min-h-dvh max-w-xl mx-auto">
      <main className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-32">
        {f.offline && <OfflineBanner />}
        {tab !== "family" && <CalendarSwitcher />}
        {tab === "today" && <TodayTab toast={setToast} />}
        {tab === "turns" && <TurnsTab toast={setToast} />}
        {tab === "history" && <HistoryTab />}
        {tab === "family" && <FamilyTab toast={setToast} />}
      </main>
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-surface/92 backdrop-blur-md border-t border-line pb-[env(safe-area-inset-bottom)]" aria-label="Secciones">
        <ul className="max-w-xl mx-auto grid grid-cols-4 px-2">
          {TABS.map(({ id, label, Icon }) => {
            const active = tab === id;
            return (
              <li key={id}>
                <button
                  className={`tap relative w-full flex flex-col items-center gap-1 pt-2 pb-2.5 text-[0.8125rem] font-medium transition-colors ${active ? "text-pine" : "text-ink-3"}`}
                  onClick={() => setTab(id)}
                  aria-current={active ? "page" : undefined}
                >
                  <span className={`flex items-center justify-center h-8 w-14 rounded-full transition-colors ${active ? "bg-pine-soft" : ""}`}>
                    <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                  </span>
                  {label}
                  {id === "turns" && pendingForMe > 0 && (
                    <span className="absolute top-1 left-[calc(50%+0.6rem)] h-5 min-w-5 px-1 rounded-full bg-clay text-white text-[0.75rem] font-semibold flex items-center justify-center ring-2 ring-surface">
                      {pendingForMe}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}

/** Con perros que salen por separado: elegir de cuál se ven los turnos. */
function CalendarSwitcher() {
  const f = useFamily();
  if (f.calendars.length < 2) return null;
  return (
    <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pt-2 pb-1" role="tablist" aria-label="Perro">
      {f.calendars.map((c) => {
        const on = c.calendar.id === f.calendarId;
        return (
          <button
            key={c.calendar.id}
            role="tab"
            aria-selected={on}
            className={`tap shrink-0 flex items-center gap-2 rounded-full pl-1.5 pr-4 h-12 transition-colors ${on ? "bg-pine text-white" : "bg-surface text-ink ring-1 ring-line"}`}
            onClick={() => f.setCalendar(c.calendar.id)}
          >
            <span className={`h-9 rounded-full flex items-center justify-center overflow-hidden ${on ? "bg-white/15" : "bg-sunken"}`} style={{ width: c.dogs.length > 1 ? 52 : 36 }}>
              <DogPack coats={c.dogs.map((d) => d.coat)} size={c.dogs.length > 1 ? 40 : 34} sun={false} />
            </span>
            <span className="font-semibold">{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}
