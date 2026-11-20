"use client";

import { useState } from "react";
import { addDays, mondayOf, shortDayName, weekdayOf } from "@/lib/domain/dates";
import { buildTurns } from "@/lib/domain/schedule";
import type { Turn } from "@/lib/domain/types";
import { useFamily } from "@/lib/useFamily";
import { SwapInbox, TurnSheet } from "./TurnSheet";
import { Avatar } from "./ui";

export function TurnsTab({ toast }: { toast: (m: string) => void }) {
  const f = useFamily();
  const { data, now, me } = f;
  const [selected, setSelected] = useState<Turn | null>(null);
  const [weeks, setWeeks] = useState(3);
  const start = mondayOf(now.date);
  const turns = buildTurns(data, start, addDays(start, weeks * 7 - 1), now);
  const multi = data.family.walkTimes.length > 1;

  const byWeek: Turn[][] = [];
  for (let w = 0; w < weeks; w++) {
    const from = addDays(start, w * 7);
    const to = addDays(from, 6);
    byWeek.push(turns.filter((t) => t.date >= from && t.date <= to));
  }
  const weekTitle = (i: number) => (i === 0 ? "Esta semana" : i === 1 ? "La semana que viene" : `Semana del ${Number(addDays(start, i * 7).slice(8))}`);
  const mineCount = turns.filter((t) => t.date >= now.date && t.memberId === me.id).length;

  return (
    <div className="flex flex-col gap-4">
      <header className="pt-2">
        <h1 className="text-3xl font-black">Turnos</h1>
        {me.walks && (
          <p className="text-lg text-[var(--ink-soft)] font-semibold">
            Te tocan {mineCount} paseos en las próximas {weeks} semanas. Tocá un día para cambiarlo.
          </p>
        )}
      </header>

      <SwapInbox />

      {byWeek.map((week, i) => (
        <section key={i}>
          <h2 className="font-extrabold text-[var(--ink-soft)] uppercase tracking-wide text-sm mb-2 px-1">{weekTitle(i)}</h2>
          <ul className="card divide-y divide-[var(--line)] overflow-hidden">
            {week.map((t) => {
              const past = t.date < now.date;
              const isToday = t.date === now.date;
              const owner = f.member(t.memberId);
              const mine = t.memberId === me.id;
              return (
                <li key={t.date + t.slot}>
                  <button
                    className={`tap w-full flex items-center gap-3 px-4 py-3 text-left ${isToday ? "bg-[var(--orange-soft)]" : ""} ${past ? "opacity-55" : ""}`}
                    onClick={() => setSelected(t)}
                  >
                    <span className="w-12 shrink-0 text-center">
                      <span className="block text-xs font-extrabold uppercase text-[var(--ink-soft)]">{shortDayName(weekdayOf(t.date))}</span>
                      <span className="block text-2xl font-black leading-none">{Number(t.date.slice(8))}</span>
                    </span>
                    <Avatar member={owner} size={42} />
                    <span className="flex-1 min-w-0">
                      <span className={`block text-lg font-extrabold truncate ${mine ? "text-[var(--orange-deep)]" : ""}`}>
                        {owner ? (mine ? "Vos" : owner.name) : "Nadie"}
                        {multi && <span className="font-bold text-[var(--ink-soft)]"> · {t.slot}</span>}
                      </span>
                      <span className="block text-sm font-bold text-[var(--ink-soft)] truncate">
                        {[
                          isToday && "Hoy",
                          t.isFixed && "📌 Fijo",
                          t.override?.kind === "debt" && "🐾 Deuda",
                          t.override?.kind === "swap" && "🔁 Cambio",
                          t.override?.kind === "exception" && "🤝 Cubre",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="text-2xl" aria-label={t.status}>
                      {t.status === "done" ? "✅" : t.status === "missed" ? "⚠️" : t.status === "unassigned" ? "❗" : t.status === "now" ? "⏰" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {weeks < 8 && (
        <button className="btn btn-soft" onClick={() => setWeeks((w) => w + 2)}>
          Ver más semanas
        </button>
      )}
      <TurnSheet turn={selected} onClose={() => setSelected(null)} toast={toast} />
    </div>
  );
}
