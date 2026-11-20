"use client";

import { AlertTriangle, ArrowLeftRight, Check, Flame, Hand, Scale } from "lucide-react";
import { useState } from "react";
import { addDays, cap, longDate, mondayOf, shortDayName, timeToMinutes, weekdayOf, whenPhrase } from "@/lib/domain/dates";
import { buildTurns, streak } from "@/lib/domain/schedule";
import type { Turn } from "@/lib/domain/types";
import { useFamily } from "@/lib/useFamily";
import { Avatar } from "./Avatar";
import { Dog, type DogCoat } from "./Dog";
import { DeclineSheet, SwapInbox } from "./TurnSheet";
import { IconBadge } from "./ui";

export function hhmm(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("es-AR", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

export function TodayTab({ toast }: { toast: (m: string) => void }) {
  const f = useFamily();
  const { data, now, me } = f;
  const today = buildTurns(data, now.date, now.date, now);
  const yesterday = buildTurns(data, addDays(now.date, -1), addDays(now.date, -1), now).filter((t) => t.status === "missed");
  const myDebts = buildTurns(data, addDays(now.date, 1), addDays(now.date, 21), now).filter((t) => t.override?.kind === "debt" && t.memberId === me.id);
  const days = streak(data, now);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-end justify-between gap-3 pt-3">
        <div>
          <p className="text-ink-3 font-medium">{cap(longDate(now.date))}</p>
          <h1 className="display text-[2.25rem] mt-0.5">Hola, {me.name}</h1>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full pl-2.5 pr-3.5 py-1.5 ${days > 0 ? "bg-sun-soft text-[#8a5a17]" : "bg-sunken text-ink-3"}`} title="Días seguidos con todos los paseos hechos">
          <Flame size={18} strokeWidth={2.2} />
          <span className="font-semibold tabular-nums">{days}</span>
          <span className="text-[0.875rem] font-medium">{days === 1 ? "día" : "días"}</span>
        </div>
      </header>

      <SwapInbox />

      {today.map((t) => (
        <TodayHero key={t.slot} turn={t} toast={toast} />
      ))}

      {yesterday.map((t) => (
        <div key={t.slot} className="card p-4 flex items-start gap-3.5">
          <IconBadge tone="clay">
            <AlertTriangle size={20} />
          </IconBadge>
          <div>
            <p className="font-semibold">Ayer {data.family.dogName} no salió</p>
            <p className="text-ink-2 mt-0.5">
              Le tocaba a {t.memberId === me.id ? "vos" : (f.member(t.memberId)?.name ?? "nadie")} y nadie confirmó el paseo.
              {data.family.settings.penalty ? " Se sumó un paseo de deuda." : ""}
            </p>
          </div>
        </div>
      ))}

      {myDebts.length > 0 && (
        <div className="card p-4 flex items-start gap-3.5">
          <IconBadge tone="sun">
            <Scale size={20} />
          </IconBadge>
          <div>
            <p className="font-semibold">{myDebts.length === 1 ? "Tenés un paseo de deuda" : `Tenés ${myDebts.length} paseos de deuda`}</p>
            <p className="text-ink-2 mt-0.5">
              {cap(myDebts.map((t) => `${whenPhrase(t.date, now.date)} a las ${t.slot}`).join(", "))}, en lugar de otra persona.
            </p>
          </div>
        </div>
      )}

      <WeekStrip />
    </div>
  );
}

function TodayHero({ turn, toast }: { turn: Turn; toast: (m: string) => void }) {
  const f = useFamily();
  const { data, me, now } = f;
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const dog = data.family.dogName;
  const coat = data.family.dogCoat as DogCoat;
  const owner = f.member(turn.memberId);
  const mine = turn.memberId === me.id;
  const minutesLeft = timeToMinutes(turn.slot) - now.minutes;
  const multi = data.family.walkTimes.length > 1;

  async function confirm() {
    setBusy(true);
    try {
      await f.confirm(turn.date, turn.slot);
      toast(`Listo. ${dog} ya salió.`);
      navigator.vibrate?.(40);
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo confirmar.");
    } finally {
      setBusy(false);
    }
  }

  let mood: "happy" | "waiting" | "sad" = "waiting";
  let title: React.ReactNode;
  let sub: string;
  let tone = "bg-pine text-white";

  if (turn.status === "done") {
    const by = f.member(turn.confirmation!.walkedBy);
    mood = "happy";
    title = (
      <>
        Paseo hecho.
        <br />
        {dog}, feliz.
      </>
    );
    sub = `${by?.id === me.id ? "Lo sacaste vos" : `Lo sacó ${by?.name ?? "alguien"}`} a las ${hhmm(turn.confirmation!.at, data.family.timeZone)}.`;
  } else if (turn.status === "unassigned") {
    mood = "sad";
    tone = "bg-[#5a2a22] text-white";
    title = <>Hoy nadie puede sacarlo.</>;
    sub = `El paseo de las ${turn.slot} no tiene responsable. ¿Lo podés sacar vos?`;
  } else if (mine) {
    title = (
      <>
        Hoy te toca
        <br />a vos.
      </>
    );
    sub =
      turn.status === "now"
        ? `${dog} te espera desde las ${turn.slot}.`
        : minutesLeft <= 90
          ? `A las ${turn.slot}. Faltan ${minutesLeft} minutos.`
          : `A las ${turn.slot}.`;
  } else {
    title = (
      <>
        Hoy sale
        <br />
        con {owner?.name}.
      </>
    );
    sub = turn.status === "now" ? `Era a las ${turn.slot} y todavía no lo confirmó.` : `A las ${turn.slot}.`;
  }

  const covering = turn.override?.kind === "exception" && turn.override.fromMemberId ? f.member(turn.override.fromMemberId) : null;

  return (
    <section className={`relative overflow-hidden rounded-[1.75rem] ${tone} shadow-[0_18px_40px_-20px_rgba(30,58,43,0.7)]`}>
      <div className="flex items-start justify-between px-6 pt-6">
        <div className="flex items-center gap-2 text-white/70 text-[0.9375rem] font-medium">
          {multi ? `Paseo de las ${turn.slot}` : "El paseo de hoy"}
        </div>
        {!mine && owner && turn.status !== "done" && <Avatar member={owner} size={40} ring />}
      </div>
      <div className="flex justify-center -mt-2">
        <Dog mood={mood} coat={coat} size={220} />
      </div>
      <div className="px-6 pb-6">
        <h2 className="display text-[2.4rem] leading-[1.02]">{title}</h2>
        <p className="text-white/75 text-lg mt-2">{sub}</p>
        {(turn.override?.kind === "debt" || covering) && (
          <p className="inline-flex items-center gap-1.5 mt-3 rounded-full bg-white/12 px-3 py-1 text-[0.875rem] font-medium text-white/90">
            {turn.override?.kind === "debt" ? (
              <>
                <Scale size={15} /> Paseo de deuda
              </>
            ) : (
              <>
                <ArrowLeftRight size={15} /> Cubre a {covering!.name}
              </>
            )}
          </p>
        )}

        {me.walks && turn.status !== "done" && (
          <div className="flex flex-col gap-2.5 mt-6">
            {turn.status === "unassigned" ? (
              <button className="btn btn-light btn-lg" disabled={busy} onClick={() => void f.take(turn.date, turn.slot).then(() => toast("Gracias. El paseo es tuyo."))}>
                <Hand size={20} /> Lo saco yo
              </button>
            ) : mine ? (
              <>
                <button className="btn btn-light btn-lg" disabled={busy} onClick={() => void confirm()}>
                  <Check size={22} strokeWidth={2.5} /> Ya lo saqué
                </button>
                <button className="btn btn-outline-light" onClick={() => setDeclining(true)}>
                  No puedo hoy
                </button>
              </>
            ) : (
              turn.status === "now" && (
                <button className="btn btn-outline-light" disabled={busy} onClick={() => void confirm()}>
                  Lo saqué yo
                </button>
              )
            )}
          </div>
        )}
      </div>
      <DeclineSheet turn={declining ? turn : null} onClose={() => setDeclining(false)} toast={toast} />
    </section>
  );
}

/** La semana actual de un vistazo: quién saca al perro cada día. */
function WeekStrip() {
  const f = useFamily();
  const { data, now, me } = f;
  const start = mondayOf(now.date);
  const turns = buildTurns(data, start, addDays(start, 6), now);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <section className="card p-4">
      <h2 className="font-semibold px-1">Esta semana</h2>
      <ol className="grid grid-cols-7 gap-1 mt-3">
        {days.map((d) => {
          const t = turns.filter((x) => x.date === d);
          const first = t[0];
          const isToday = d === now.date;
          const done = t.every((x) => x.status === "done");
          const missed = t.some((x) => x.status === "missed");
          return (
            <li key={d} className={`flex flex-col items-center gap-1.5 rounded-2xl py-2 ${isToday ? "bg-pine-soft" : ""}`}>
              <span className={`text-[0.8125rem] font-medium ${isToday ? "text-pine" : "text-ink-3"}`}>{shortDayName(weekdayOf(d))}</span>
              <span className="relative">
                <Avatar member={f.member(first?.memberId)} size={34} dim={d < now.date && !done} />
                {(done || missed) && (
                  <span className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full ring-2 ring-white flex items-center justify-center ${done ? "bg-moss" : "bg-clay"}`}>
                    {done ? <Check size={10} strokeWidth={3.5} color="#fff" /> : <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                )}
              </span>
              <span className={`text-[0.75rem] font-medium truncate max-w-full ${first?.memberId === me.id ? "text-pine" : "text-ink-2"}`}>
                {first?.memberId === me.id ? "Vos" : (f.member(first?.memberId)?.name ?? "—")}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
