"use client";

import { useState } from "react";
import { addDays, cap, friendlyDate, longDate, timeToMinutes } from "@/lib/domain/dates";
import { buildTurns, streak } from "@/lib/domain/schedule";
import type { Turn } from "@/lib/domain/types";
import { useFamily } from "@/lib/useFamily";
import { Luke } from "./Luke";
import { DeclineSheet, SwapInbox } from "./TurnSheet";
import { Avatar, Pill } from "./ui";

function timeOf(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("es-AR", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

export function TodayTab({ toast }: { toast: (m: string) => void }) {
  const f = useFamily();
  const { data, now, me } = f;
  const today = buildTurns(data, now.date, now.date, now);
  const tomorrow = buildTurns(data, addDays(now.date, 1), addDays(now.date, 1), now);
  const yesterday = buildTurns(data, addDays(now.date, -1), addDays(now.date, -1), now).filter((t) => t.status === "missed");
  const myDebts = buildTurns(data, addDays(now.date, 1), addDays(now.date, 21), now).filter((t) => t.override?.kind === "debt" && t.memberId === me.id);
  const days = streak(data, now);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between pt-2">
        <div>
          <p className="text-[var(--ink-soft)] font-bold">{cap(longDate(now.date))}</p>
          <h1 className="text-3xl font-black">Hola, {me.name}</h1>
        </div>
        <Pill tone={days > 0 ? "soft" : "gray"}>
          <span className="text-lg">🔥</span> {days} {days === 1 ? "día" : "días"}
        </Pill>
      </header>

      <SwapInbox />

      {today.map((t) => (
        <TodayCard key={t.slot} turn={t} toast={toast} />
      ))}

      {yesterday.map((t) => (
        <div key={t.slot} className="card p-4 flex items-center gap-3 bg-[var(--red-soft)]">
          <Luke mood="sad" size={64} />
          <p className="font-bold">
            Ayer {data.family.dogName} se quedó esperando 😢
            <br />
            <span className="font-semibold text-[var(--ink-soft)]">
              Le tocaba a {f.member(t.memberId)?.name ?? "nadie"}
              {data.family.settings.penalty ? " · tiene un paseo de deuda" : ""}
            </span>
          </p>
        </div>
      ))}

      {myDebts.length > 0 && (
        <div className="card p-4 bg-[var(--yellow-soft)]">
          <p className="font-extrabold">🐾 Tenés {myDebts.length === 1 ? "un paseo de deuda" : `${myDebts.length} paseos de deuda`}</p>
          <p className="text-[var(--ink-soft)] font-semibold mt-1">
            {myDebts.map((t) => `${friendlyDate(t.date, now.date)} a las ${t.slot}`).join(", ")}. Es lo que pasa cuando nadie confirma el paseo.
          </p>
        </div>
      )}

      <div className="card p-4 flex items-center gap-3">
        <span className="text-[var(--ink-soft)] font-bold">Mañana</span>
        <div className="flex -space-x-2">
          {tomorrow.map((t) => (
            <Avatar key={t.slot} member={f.member(t.memberId)} size={40} ring />
          ))}
        </div>
        <span className="font-extrabold">
          {[...new Set(tomorrow.map((t) => (t.memberId === me.id ? "vos" : f.member(t.memberId)?.name ?? "nadie")))].join(" y ")}
        </span>
        <span className="ml-auto text-[var(--ink-soft)] font-bold">{tomorrow.map((t) => t.slot).join(" · ")}</span>
      </div>
    </div>
  );
}

function TodayCard({ turn, toast }: { turn: Turn; toast: (m: string) => void }) {
  const f = useFamily();
  const { data, me, now } = f;
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const dog = data.family.dogName;
  const owner = f.member(turn.memberId);
  const mine = turn.memberId === me.id;
  const minutesLeft = timeToMinutes(turn.slot) - now.minutes;

  async function confirm() {
    setBusy(true);
    try {
      await f.confirm(turn.date, turn.slot);
      toast(`¡Gracias! ${dog} está feliz 🐾`);
      navigator.vibrate?.(60);
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo confirmar.");
    } finally {
      setBusy(false);
    }
  }

  if (turn.status === "done") {
    const by = f.member(turn.confirmation!.walkedBy);
    return (
      <section className="card p-6 flex flex-col items-center text-center bg-[var(--green-soft)]">
        <Luke mood="happy" size={170} />
        <h2 className="text-3xl font-black mt-1 pop">¡Paseo hecho!</h2>
        <p className="text-lg font-bold mt-1">
          {by?.id === me.id ? "Lo sacaste vos" : `Lo sacó ${by?.name ?? "alguien"}`} a las {timeOf(turn.confirmation!.at, data.family.timeZone)}
        </p>
        {data.family.walkTimes.length > 1 && <Pill tone="green">Paseo de las {turn.slot}</Pill>}
      </section>
    );
  }

  if (turn.status === "unassigned") {
    return (
      <section className="card p-6 flex flex-col items-center text-center bg-[var(--red-soft)]">
        <Luke mood="sad" size={150} />
        <h2 className="text-2xl font-black">Hoy a las {turn.slot} nadie puede</h2>
        <p className="text-lg text-[var(--ink-soft)] font-semibold mt-1">¿Alguien lo puede sacar?</p>
        {me.walks && (
          <button className="btn btn-primary btn-big mt-4" disabled={busy} onClick={() => void f.take(turn.date, turn.slot).then(() => toast("¡Sos un genio! El paseo es tuyo."))}>
            🙋 Lo saco yo
          </button>
        )}
      </section>
    );
  }

  const isNow = turn.status === "now";
  return (
    <section className={`card p-6 flex flex-col items-center text-center ${mine && isNow ? "bg-[var(--orange-soft)]" : ""}`}>
      <Luke mood="waiting" size={170} />
      {mine ? (
        <>
          <h2 className="text-4xl font-black mt-1">¡Hoy te toca a vos!</h2>
          <p className="text-xl font-bold mt-1 text-[var(--ink-soft)]">
            {isNow ? `${dog} te está esperando desde las ${turn.slot}` : `A las ${turn.slot}${minutesLeft <= 60 ? ` · faltan ${minutesLeft} min` : ""}`}
          </p>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 mt-2">
            <Avatar member={owner} size={56} />
            <h2 className="text-3xl font-black text-left leading-tight">
              Hoy le toca
              <br />a {owner?.name}
            </h2>
          </div>
          <p className="text-lg font-bold mt-2 text-[var(--ink-soft)]">{isNow ? "Todavía no confirmó el paseo" : `A las ${turn.slot}`}</p>
        </>
      )}
      {turn.override?.kind === "debt" && <Pill tone="yellow">🐾 Paseo de deuda</Pill>}
      {turn.override?.kind === "exception" && turn.override.fromMemberId && (
        <Pill tone="soft">Cubre a {f.member(turn.override.fromMemberId)?.name}</Pill>
      )}

      {me.walks && (
        <div className="w-full mt-5 flex flex-col gap-3">
          {mine ? (
            <>
              <button className="btn btn-green btn-big" disabled={busy} onClick={() => void confirm()}>
                ✅ Ya lo saqué
              </button>
              <button className="btn btn-white" onClick={() => setDeclining(true)}>
                No puedo hoy
              </button>
            </>
          ) : (
            isNow && (
              <button className="btn btn-white" disabled={busy} onClick={() => void confirm()}>
                🙋 Lo saqué yo
              </button>
            )
          )}
        </div>
      )}
      <DeclineSheet turn={declining ? turn : null} onClose={() => setDeclining(false)} toast={toast} />
    </section>
  );
}
