"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cap, friendlyDate, monthName, whenPhrase } from "@/lib/domain/dates";
import { buildTurns, missesByMember, walksByMember } from "@/lib/domain/schedule";
import { useFamily } from "@/lib/useFamily";
import { Avatar } from "./Avatar";
import { hhmm } from "./TodayTab";

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
  const exceptions = data.overrides.filter((o) => o.kind === "exception" && o.fromMemberId);
  const debts = data.overrides.filter((o) => o.kind === "debt");
  const swaps = data.swaps.filter((s) => s.status === "accepted");

  return (
    <div className="flex flex-col gap-6">
      <header className="pt-3 flex items-center gap-2">
        <h1 className="display text-[2.25rem] flex-1">
          {cap(monthName(m))}
          {y !== ty ? ` ${y}` : ""}
        </h1>
        <button className="tap h-11 w-11 rounded-full bg-surface shadow-[var(--shadow-sm)] flex items-center justify-center" onClick={() => setOffset((o) => o - 1)} aria-label="Mes anterior">
          <ChevronLeft size={20} />
        </button>
        <button className="tap h-11 w-11 rounded-full bg-surface shadow-[var(--shadow-sm)] flex items-center justify-center disabled:opacity-30" disabled={offset >= 0} onClick={() => setOffset((o) => o + 1)} aria-label="Mes siguiente">
          <ChevronRight size={20} />
        </button>
      </header>

      <section className="card p-5">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 gap-y-3">
          <span />
          <span className="text-[0.8125rem] font-medium text-ink-3 text-right">Paseos</span>
          <span className="text-[0.8125rem] font-medium text-ink-3 text-right">Faltas</span>
          {walkers.map((w) => (
            <div key={w.id} className="contents">
              <span className="flex items-center gap-3 min-w-0">
                <Avatar member={w} size={36} />
                <span className="font-semibold truncate">{w.name}</span>
              </span>
              <span className="display text-[1.6rem] text-right tabular-nums">{done.get(w.id) ?? 0}</span>
              <span className={`display text-[1.6rem] text-right tabular-nums ${misses.get(w.id) ? "text-clay" : "text-ink-3"}`}>{misses.get(w.id) ?? 0}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
        <button className="option shrink-0" onClick={() => setWho(null)} aria-pressed={!who}>
          Todos
        </button>
        {walkers.map((w) => (
          <button key={w.id} className="option shrink-0 !pl-1.5" onClick={() => setWho(w.id)} aria-pressed={who === w.id}>
            <Avatar member={w} size={30} /> {w.name}
          </button>
        ))}
      </div>

      {shown.length === 0 && <p className="text-center text-ink-3 py-10">Todavía no hay paseos en este mes.</p>}

      <ol className="relative">
        {shown.map((t, i) => {
          const owner = f.member(t.memberId);
          const by = f.member(t.confirmation?.walkedBy);
          const notes: string[] = [];
          for (const o of exceptions.filter((o) => o.date === t.date && o.slot === t.slot))
            notes.push(`${f.member(o.fromMemberId)?.name} avisó que no podía${o.reason ? ` (${o.reason.toLowerCase()})` : ""}. ${o.memberId ? `Lo pasó a ${f.member(o.memberId)?.name}.` : "Nadie más podía."}`);
          for (const o of debts.filter((o) => o.missedDate === t.date && o.missedSlot === t.slot && o.date !== o.missedDate))
            notes.push(`Paseo de deuda: ${f.member(o.memberId)?.name} lo saca ${whenPhrase(o.date, now.date)} en lugar de ${f.member(o.fromMemberId)?.name ?? "otra persona"}.`);
          for (const s of swaps.filter((s) => (s.date === t.date && s.slot === t.slot) || (s.backDate === t.date && s.backSlot === t.slot)))
            notes.push(`Intercambio entre ${f.member(s.proposerId)?.name} y ${f.member(s.partnerId)?.name}${s.reason ? `: “${s.reason}”` : "."}`);
          if (t.coverFor) notes.push(`${f.member(t.coverFor)?.name ?? "Alguien"} estaba de viaje: no cuenta como falta.`);
          const dot = t.status === "done" ? "bg-moss" : t.status === "missed" ? "bg-clay" : "bg-line";
          return (
            <li key={t.date + t.slot} className="relative pl-8 pb-5">
              {i < shown.length - 1 && <span className="absolute left-[7px] top-4 bottom-0 w-0.5 bg-line" aria-hidden />}
              <span className={`absolute left-0 top-1.5 h-4 w-4 rounded-full ring-4 ring-paper ${dot}`} aria-hidden />
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">
                    {cap(friendlyDate(t.date, now.date))}
                    {data.family.walkTimes.length > 1 ? ` a las ${t.slot}` : ""}
                  </p>
                  <p className={t.status === "missed" ? "text-clay" : "text-ink-2"}>
                    {t.status === "done"
                      ? `${by?.name} lo sacó a las ${hhmm(t.confirmation!.at, tz)}${by && t.memberId && by.id !== t.memberId ? `, cubriendo a ${owner?.name}` : ""}.`
                      : t.status === "missed"
                        ? `No salió. Le tocaba a ${owner?.name ?? "nadie"}.`
                        : t.memberId === f.me.id
                          ? "Te toca a vos."
                          : `Le toca a ${owner?.name ?? "nadie"}.`}
                  </p>
                  {notes.map((n) => (
                    <p key={n} className="text-ink-3 text-[0.9375rem] mt-1">
                      {n}
                    </p>
                  ))}
                </div>
                <Avatar member={by ?? owner} size={34} dim={t.status === "missed"} />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
