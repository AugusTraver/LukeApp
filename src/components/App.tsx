"use client";

import { CalendarDays, History, House, Users } from "lucide-react";
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
  const pendingForMe = f.data.swaps.filter((s) => s.status === "pending" && s.partnerId === f.me.id && s.backDate >= f.now.date).length;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);

  return (
    <div className="min-h-dvh max-w-xl mx-auto">
      <main className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-32">
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
