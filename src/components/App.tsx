"use client";

import { useCallback, useEffect, useState } from "react";
import { getStore } from "@/lib/store";
import type { Session, Store } from "@/lib/store/types";
import { FamilyProvider, Loading, useFamily } from "@/lib/useFamily";
import { FamilyTab } from "./FamilyTab";
import { HistoryTab } from "./HistoryTab";
import { registerSW } from "./Notifications";
import { AdminSignIn, CreateFamily, JoinFlow, Welcome } from "./Onboarding";
import { TodayTab } from "./TodayTab";
import { TurnsTab } from "./TurnsTab";
import { Toast } from "./ui";

type Screen = "welcome" | "join" | "create" | "admin";

export function App() {
  const [store, setStore] = useState<Store | null>(null);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [screen, setScreen] = useState<Screen>("welcome");

  useEffect(() => {
    (async () => {
      const s = await getStore();
      setStore(s);
      setSession(await s.getSession());
      void registerSW();
    })();
  }, []);

  const onSignOut = useCallback(() => {
    setSession(null);
    setScreen("welcome");
  }, []);

  if (!store || session === undefined) return <Loading />;

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
  { id: "today", label: "Hoy", icon: "🐾" },
  { id: "turns", label: "Turnos", icon: "📅" },
  { id: "history", label: "Historial", icon: "📖" },
  { id: "family", label: "Familia", icon: "🏠" },
] as const;
type Tab = (typeof TABS)[number]["id"];

function Shell() {
  const f = useFamily();
  const [tab, setTab] = useState<Tab>("today");
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const pendingForMe = f.data.swaps.filter((s) => s.status === "pending" && s.partnerId === f.me.id && s.backDate >= f.now.date).length;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);

  return (
    <div className="min-h-dvh max-w-xl mx-auto">
      <main className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-32">
        {tab === "today" && <TodayTab toast={setToast} />}
        {tab === "turns" && <TurnsTab toast={setToast} />}
        {tab === "history" && <HistoryTab />}
        {tab === "family" && <FamilyTab toast={setToast} />}
      </main>
      <nav
        className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t-2 border-[var(--line)] pb-[env(safe-area-inset-bottom)]"
        aria-label="Secciones"
      >
        <ul className="max-w-xl mx-auto grid grid-cols-4">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <li key={t.id}>
                <button
                  className={`tap relative w-full flex flex-col items-center gap-0.5 pt-2.5 pb-2 font-extrabold text-sm transition-colors ${active ? "text-[var(--orange-deep)]" : "text-[var(--ink-soft)]"}`}
                  onClick={() => setTab(t.id)}
                  aria-current={active ? "page" : undefined}
                >
                  <span className={`text-2xl leading-none transition-transform ${active ? "scale-115" : "grayscale-[60%] opacity-80"}`} aria-hidden>
                    {t.icon}
                  </span>
                  {t.label}
                  {t.id === "turns" && pendingForMe > 0 && (
                    <span className="absolute top-1.5 right-[calc(50%-1.4rem)] h-5 min-w-5 px-1 rounded-full bg-[var(--red)] text-white text-xs flex items-center justify-center">
                      {pendingForMe}
                    </span>
                  )}
                  {active && <span className="absolute top-0 h-1 w-10 rounded-b-full bg-[var(--orange)]" />}
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
