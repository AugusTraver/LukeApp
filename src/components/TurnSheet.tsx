"use client";

import { useState } from "react";
import { cap, friendlyDate, longDate } from "@/lib/domain/dates";
import type { Swap, Turn } from "@/lib/domain/types";
import { useFamily } from "@/lib/useFamily";
import { Avatar, Pill, Sheet } from "./ui";

const REASONS = ["Tengo facultad / trabajo", "No estoy en casa", "Estoy enfermo/a", "Otro"];

export function DeclineSheet({ turn, onClose, toast }: { turn: Turn | null; onClose: () => void; toast: (m: string) => void }) {
  const f = useFamily();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  if (!turn) return null;
  const before = turn.date > f.now.date || f.now.minutes < Number(turn.slot.slice(0, 2)) * 60 + Number(turn.slot.slice(3));
  return (
    <Sheet open onClose={onClose} title="¿No podés sacarlo?">
      <p className="text-lg text-[var(--ink-soft)] font-semibold">
        {cap(friendlyDate(turn.date, f.now.date))} a las {turn.slot}. El paseo pasa al instante a otra persona, sin que tenga que aceptar.
      </p>
      {!before && f.data.family.settings.penalty && (
        <p className="mt-2 font-bold text-[#8a6100] bg-[var(--yellow-soft)] rounded-xl p-3">
          ⏰ Ya pasó la hora. Avisá igual: así no queda como falta.
        </p>
      )}
      <p className="label mt-5">¿Por qué?</p>
      <div className="flex flex-wrap gap-2">
        {REASONS.map((r) => (
          <button key={r} className={`chip !py-2.5 !px-4 !text-base ${reason === r ? "bg-[var(--orange)] text-white" : "bg-white"}`} onClick={() => setReason(r)} aria-pressed={reason === r}>
            {r}
          </button>
        ))}
      </div>
      {reason === "Otro" && <textarea className="field mt-3" placeholder="Contá brevemente" onChange={(e) => setReason(e.target.value ? `Otro: ${e.target.value}` : "Otro")} />}
      <button
        className="btn btn-primary btn-big mt-6"
        disabled={!reason || busy}
        onClick={async () => {
          setBusy(true);
          try {
            const cover = await f.decline(turn.date, turn.slot, reason);
            toast(cover ? `Listo. Lo saca ${f.member(cover)?.name}.` : "Nadie más puede. Avisamos a la familia.");
            onClose();
          } catch (e) {
            toast(e instanceof Error ? e.message : "No se pudo.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Avisar que no puedo
      </button>
    </Sheet>
  );
}

/** Intercambios esperando respuesta (los que me piden y los que pedí). */
export function SwapInbox() {
  const f = useFamily();
  const [busy, setBusy] = useState(false);
  const pending = f.data.swaps.filter((s) => s.status === "pending" && s.backDate >= f.now.date);
  const incoming = pending.filter((s) => s.partnerId === f.me.id);
  const outgoing = pending.filter((s) => s.proposerId === f.me.id);
  if (incoming.length + outgoing.length === 0) return null;
  const answer = async (s: Swap, ok: boolean) => {
    setBusy(true);
    try {
      await f.answerSwap(s, ok);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-3">
      {incoming.map((s) => (
        <div key={s.id} className="card p-4 border-[3px] border-[var(--orange)]">
          <div className="flex items-center gap-2">
            <Avatar member={f.member(s.proposerId)} size={40} />
            <p className="font-extrabold text-lg">{f.member(s.proposerId)?.name} te pide un cambio</p>
          </div>
          <p className="mt-2 font-semibold">
            Vos lo sacás el <b>{longDate(s.date)}</b> y {f.member(s.proposerId)?.name} te lo devuelve el <b>{longDate(s.backDate)}</b>.
          </p>
          {s.reason && <p className="mt-1 text-[var(--ink-soft)] italic">“{s.reason}”</p>}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button className="btn btn-green" disabled={busy} onClick={() => void answer(s, true)}>
              Dale 👍
            </button>
            <button className="btn btn-white" disabled={busy} onClick={() => void answer(s, false)}>
              No puedo
            </button>
          </div>
        </div>
      ))}
      {outgoing.map((s) => (
        <div key={s.id} className="card p-4 flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            ⏳
          </span>
          <p className="font-semibold flex-1">
            Esperando que {f.member(s.partnerId)?.name} acepte el cambio del {longDate(s.date)}
          </p>
          <button className="btn btn-ghost !min-h-10 !px-3" disabled={busy} onClick={() => void answer(s, false)}>
            Cancelar
          </button>
        </div>
      ))}
    </div>
  );
}

/** Detalle de un día y lo que se puede hacer con él. */
export function TurnSheet({ turn, onClose, toast }: { turn: Turn | null; onClose: () => void; toast: (m: string) => void }) {
  const f = useFamily();
  const [mode, setMode] = useState<"menu" | "decline" | "swap" | "assign">("menu");
  const [partner, setPartner] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  if (!turn) return null;
  const close = () => {
    setMode("menu");
    setPartner(null);
    setReason("");
    onClose();
  };
  if (mode === "decline") return <DeclineSheet turn={turn} onClose={close} toast={toast} />;

  const owner = f.member(turn.memberId);
  const mine = turn.memberId === f.me.id;
  const future = turn.date > f.now.date;
  const open = !turn.confirmation && turn.date >= f.now.date;
  const others = f.data.members.filter((m) => m.walks && m.id !== f.me.id);
  const chosen = partner ?? (others.length === 1 ? others[0].id : null);
  const preview = chosen ? f.previewSwap(chosen, turn.date, turn.slot) : null;

  return (
    <Sheet open onClose={close} title={`${cap(friendlyDate(turn.date, f.now.date))} · ${turn.slot}`}>
      <div className="card p-4 flex items-center gap-3">
        <Avatar member={owner} size={56} />
        <div>
          <p className="text-xl font-extrabold">{owner ? (mine ? "Te toca a vos" : `Le toca a ${owner.name}`) : "Sin responsable"}</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {turn.isFixed && <Pill tone="gray">📌 Día fijo</Pill>}
            {turn.override?.kind === "debt" && <Pill tone="yellow">🐾 Paseo de deuda</Pill>}
            {turn.override?.kind === "swap" && <Pill tone="soft">🔁 Intercambio</Pill>}
            {turn.override?.kind === "exception" && <Pill tone="soft">Cubre a {f.member(turn.override.fromMemberId)?.name ?? "alguien"}</Pill>}
            {turn.override?.kind === "admin" && <Pill tone="gray">Cambiado por admin</Pill>}
            {turn.confirmation && <Pill tone="green">✅ Hecho por {f.member(turn.confirmation.walkedBy)?.name}</Pill>}
          </div>
        </div>
      </div>
      {turn.override?.reason && <p className="mt-2 text-[var(--ink-soft)] italic px-1">Motivo: “{turn.override.reason}”</p>}

      {mode === "menu" && (
        <div className="flex flex-col gap-3 mt-5">
          {mine && open && (
            <button className="btn btn-white btn-big" onClick={() => setMode("decline")}>
              🙅 No puedo ese día
            </button>
          )}
          {mine && future && !turn.isFixed && others.length > 0 && (
            <button className="btn btn-white btn-big" onClick={() => setMode("swap")}>
              🔁 Cambiarlo por otro día
            </button>
          )}
          {mine && future && turn.isFixed && (
            <p className="text-[var(--ink-soft)] font-semibold px-1">Los días fijos no se intercambian. Si no podés, usá “No puedo ese día”.</p>
          )}
          {!turn.memberId && open && f.me.walks && (
            <button className="btn btn-primary btn-big" disabled={busy} onClick={() => void f.take(turn.date, turn.slot).then(close)}>
              🙋 Lo saco yo
            </button>
          )}
          {f.isAdmin && open && (
            <button className="btn btn-ghost" onClick={() => setMode("assign")}>
              ⚙️ Asignar a otra persona (admin)
            </button>
          )}
        </div>
      )}

      {mode === "swap" && (
        <div className="mt-5">
          {others.length > 1 && (
            <>
              <p className="label">¿Con quién?</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {others.map((m) => (
                  <button key={m.id} className={`chip !py-2 !px-3 !text-base ${chosen === m.id ? "bg-[var(--orange)] text-white" : "bg-white"}`} onClick={() => setPartner(m.id)}>
                    {m.avatar} {m.name}
                  </button>
                ))}
              </div>
            </>
          )}
          {chosen && (
            <div className="card p-4">
              {preview ? (
                <p className="text-lg font-semibold">
                  <b>{f.member(chosen)?.name}</b> lo saca el {longDate(turn.date)} y vos le devolvés el <b>{longDate(preview.backDate)}</b>.
                </p>
              ) : (
                <p className="font-semibold text-[var(--red)]">No encontramos un día para devolverle. Probá con “No puedo ese día”.</p>
              )}
            </div>
          )}
          {preview && (
            <>
              <label className="block mt-4">
                <span className="label">Mensaje (opcional)</span>
                <textarea className="field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="¿Me cubrís? Tengo…" />
              </label>
              <button
                className="btn btn-primary btn-big mt-4"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await f.proposeSwap(chosen!, turn.date, turn.slot, reason);
                    toast(`Le avisamos a ${f.member(chosen)?.name}. Tiene que aceptar.`);
                    close();
                  } catch (e) {
                    toast(e instanceof Error ? e.message : "No se pudo.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Pedir el cambio
              </button>
            </>
          )}
        </div>
      )}

      {mode === "assign" && (
        <div className="mt-5 flex flex-col gap-2">
          <p className="label">¿Quién lo saca?</p>
          {f.data.members
            .filter((m) => m.walks)
            .map((m) => (
              <button
                key={m.id}
                className="btn btn-white justify-start"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await f.assign(m.id, turn.date, turn.slot);
                  toast(`Ahora lo saca ${m.name}.`);
                  close();
                }}
              >
                <Avatar member={m} size={32} /> {m.name}
              </button>
            ))}
        </div>
      )}
    </Sheet>
  );
}
