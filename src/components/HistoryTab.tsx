"use client";

import { useState } from "react";
import { cap, friendlyDate, monthName, whenPhrase } from "@/lib/domain/dates";
import { buildTurns, missesByMember, walksByMember } from "@/lib/domain/schedule";
import { useFamily } from "@/lib/useFamily";
import { Avatar } from "./ui";

function lastDayOfMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function HistoryTab() {
  const f = useFamily();
  const { data, now } = f;
  const [offset, setOffset] = useState(0);
  const [who, setWho] = useState<string | null>(null);

  const [ty, tm] = now.date.split("-").map(Number);
  const d = new Date(Date.UTC(ty, tm - 1 + offset, 1));
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  let last = `${y}-${String(m).padStart(2, "0")}-${lastDayOfMonth(y, m)}`;
  if (last > now.date) last = now.date;
  const from = first < data.family.startDate ? data.family.startDate : first;
  const turns = from <= last ? buildTurns(data, from, last, now).reverse() : [];
  const done = walksByMember(turns);
  const misses = missesByMember(turns);
  const walkers = data.members.filter((x) => x.walks);
  const shown = who ? turns.filter((t) => t.memberId === who || t.confirmation?.walkedBy === who) : turns;
  const tz = data.family.timeZone;
  const hhmm = (iso: string) => new Intl.DateTimeFormat("es-AR", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));

  const events = [...data.overrides.filter((o) => o.kind === "exception" && o.fromMemberId), ...data.overrides.filter((o) => o.kind === "debt")];
  const swaps = data.swaps.filter((s) => s.status === "accepted");

  return (
    <div className="flex flex-col gap-4">
      <header className="pt-2 flex items-center gap-2">
        <h1 className="text-3xl font-black flex-1 capitalize">
          {monthName(m)} {y !== ty ? y : ""}
        </h1>
        <button className="tap h-12 w-12 rounded-full bg-white text-xl shadow-[var(--shadow)]" onClick={() => setOffset((o) => o - 1)} aria-label="Mes anterior">
          ←
        </button>
        <button className="tap h-12 w-12 rounded-full bg-white text-xl shadow-[var(--shadow)] disabled:opacity-30" disabled={offset >= 0} onClick={() => setOffset((o) => o + 1)} aria-label="Mes siguiente">
          →
        </button>
      </header>

      <section className="card p-4">
        <p className="font-extrabold text-[var(--ink-soft)] uppercase text-sm tracking-wide mb-2">El mes en números</p>
        <div className="flex flex-col gap-2">
          {walkers.map((w) => (
            <div key={w.id} className="flex items-center gap-3">
              <Avatar member={w} size={36} />
              <span className="font-extrabold flex-1">{w.name}</span>
              <span className="font-bold">🐾 {done.get(w.id) ?? 0}</span>
              <span className={`font-bold w-14 text-right ${misses.get(w.id) ? "text-[var(--red)]" : "text-[var(--ink-soft)]"}`}>⚠️ {misses.get(w.id) ?? 0}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-[var(--ink-soft)] mt-2 font-semibold">🐾 paseos hechos · ⚠️ faltas</p>
      </section>

      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        <button className={`chip !py-2 !px-4 shrink-0 ${!who ? "bg-[var(--orange)] text-white" : "bg-white"}`} onClick={() => setWho(null)}>
          Todos
        </button>
        {walkers.map((w) => (
          <button key={w.id} className={`chip !py-2 !px-4 shrink-0 ${who === w.id ? "bg-[var(--orange)] text-white" : "bg-white"}`} onClick={() => setWho(w.id)}>
            {w.avatar} {w.name}
          </button>
        ))}
      </div>

      {shown.length === 0 && <p className="text-center text-[var(--ink-soft)] font-semibold py-8">Todavía no hay paseos este mes.</p>}

      <ol className="flex flex-col gap-2">
        {shown.map((t) => {
          const owner = f.member(t.memberId);
          const by = f.member(t.confirmation?.walkedBy);
          const notes = events.filter((o) => (o.kind === "exception" ? o.date === t.date && o.slot === t.slot : o.missedDate === t.date && o.missedSlot === t.slot));
          const swap = swaps.find((s) => (s.date === t.date && s.slot === t.slot) || (s.backDate === t.date && s.backSlot === t.slot));
          return (
            <li key={t.date + t.slot} className={`card p-4 ${t.status === "missed" ? "bg-[var(--red-soft)]" : ""}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden>
                  {t.status === "done" ? "✅" : t.status === "missed" ? "⚠️" : "⏳"}
                </span>
                <div className="flex-1">
                  <p className="font-extrabold">
                    {cap(friendlyDate(t.date, now.date))}
                    {data.family.walkTimes.length > 1 ? ` · ${t.slot}` : ""}
                  </p>
                  <p className="font-semibold text-[var(--ink-soft)]">
                    {t.status === "done"
                      ? `${by?.name} lo sacó a las ${hhmm(t.confirmation!.at)}${by && t.memberId && by.id !== t.memberId ? ` (cubrió a ${owner?.name})` : ""}`
                      : t.status === "missed"
                        ? `Nadie confirmó. Le tocaba a ${owner?.name ?? "nadie"}.`
                        : `Le toca a ${owner?.name ?? "nadie"}`}
                  </p>
                </div>
                <Avatar member={by ?? owner} size={36} />
              </div>
              {notes.map((o) => (
                <p key={o.id} className="mt-2 text-sm font-semibold text-[var(--ink-soft)] pl-10">
                  {o.kind === "exception"
                    ? `🙅 ${f.member(o.fromMemberId)?.name} avisó que no podía${o.reason ? `: “${o.reason}”` : ""}. ${o.memberId ? `Lo pasó a ${f.member(o.memberId)?.name}.` : "Nadie más podía."}`
                    : `🐾 Castigo: ${f.member(o.memberId)?.name} saca a ${data.family.dogName} ${whenPhrase(o.date, now.date)} en lugar de ${f.member(o.fromMemberId)?.name ?? "otro"}.`}
                </p>
              ))}
              {swap && (
                <p className="mt-2 text-sm font-semibold text-[var(--ink-soft)] pl-10">
                  🔁 Intercambio entre {f.member(swap.proposerId)?.name} y {f.member(swap.partnerId)?.name}
                  {swap.reason ? `: “${swap.reason}”` : ""}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
