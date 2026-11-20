"use client";

import { AlertTriangle, CheckCircle2, CircleAlert, Clock } from "lucide-react";
import { useState } from "react";
import { addDays, mondayOf, shortDayName, weekdayOf } from "@/lib/domain/dates";
import { buildTurns } from "@/lib/domain/schedule";
import type { Turn } from "@/lib/domain/types";
import { useFamily } from "@/lib/useFamily";
import { Avatar } from "./Avatar";
import { SwapInbox, TurnSheet, TurnTags } from "./TurnSheet";

function StatusIcon({ t }: { t: Turn }) {
  if (t.status === "done") return <CheckCircle2 size={22} className="text-moss" aria-label="Hecho" />;
  if (t.status === "missed") return <AlertTriangle size={20} className="text-clay" aria-label="No salió" />;
  if (t.status === "unassigned") return <CircleAlert size={20} className="text-clay" aria-label="Sin responsable" />;
  if (t.status === "now") return <Clock size={20} className="text-sun" aria-label="Es ahora" />;
  return null;
}

export function TurnsTab({ toast }: { toast: (m: string) => void }) {
  const f = useFamily();
  const { data, now, me } = f;
  const [selected, setSelected] = useState<Turn | null>(null);
  const [weeks, setWeeks] = useState(3);
  const start = mondayOf(now.date);
  const turns = buildTurns(data, start, addDays(start, weeks * 7 - 1), now);
  const multi = data.family.walkTimes.length > 1;
  const mineCount = turns.filter((t) => t.date >= now.date && t.memberId === me.id && t.status !== "done").length;
  const weekTitle = (i: number) => (i === 0 ? "Esta semana" : i === 1 ? "La semana que viene" : `Desde el lunes ${Number(addDays(start, i * 7).slice(8))}`);

  return (
    <div className="flex flex-col gap-6">
      <header className="pt-3">
        <h1 className="display text-[2.25rem]">Turnos</h1>
        {me.walks && (
          <p className="text-ink-2 text-lg mt-1">
            Te {mineCount === 1 ? "queda 1 paseo" : `quedan ${mineCount} paseos`} en estas {weeks} semanas. Tocá un día para cambiarlo.
          </p>
        )}
      </header>

      <SwapInbox />

      {Array.from({ length: weeks }, (_, w) => {
        const from = addDays(start, w * 7);
        const week = turns.filter((t) => t.date >= from && t.date <= addDays(from, 6));
        return (
          <section key={w}>
            <h2 className="font-semibold text-ink-2 mb-2.5 px-1">{weekTitle(w)}</h2>
            <ul className="card overflow-hidden divide-y divide-line">
              {week.map((t) => {
                const past = t.date < now.date;
                const isToday = t.date === now.date;
                const owner = f.member(t.memberId);
                const mine = t.memberId === me.id;
                return (
                  <li key={t.date + t.slot}>
                    <button className={`tap w-full flex items-center gap-3.5 px-4 py-3 text-left transition-colors active:bg-sunken ${isToday ? "bg-pine-soft" : ""}`} onClick={() => setSelected(t)}>
                      <span className={`w-10 shrink-0 text-center ${past ? "opacity-50" : ""}`}>
                        <span className={`block text-[0.75rem] font-semibold ${isToday ? "text-pine" : "text-ink-3"}`}>{shortDayName(weekdayOf(t.date))}</span>
                        <span className="block display text-[1.6rem] leading-none mt-0.5">{Number(t.date.slice(8))}</span>
                      </span>
                      <Avatar member={owner} size={40} dim={past && t.status !== "done"} />
                      <span className="flex-1 min-w-0">
                        <span className={`block font-semibold truncate ${mine ? "text-pine" : ""} ${past ? "opacity-60" : ""}`}>
                          {owner ? (mine ? "Vos" : owner.name) : "Sin responsable"}
                          {multi && <span className="font-normal text-ink-3"> a las {t.slot}</span>}
                        </span>
                        <span className="flex flex-wrap gap-1 mt-1 empty:hidden">
                          {isToday && <span className="tag bg-pine text-white">Hoy</span>}
                          <TurnTags turn={t} />
                        </span>
                      </span>
                      <StatusIcon t={t} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {weeks < 8 && (
        <button className="btn btn-soft" onClick={() => setWeeks((w) => w + 2)}>
          Ver más semanas
        </button>
      )}
      <TurnSheet turn={selected} onClose={() => setSelected(null)} toast={toast} />
    </div>
  );
}
