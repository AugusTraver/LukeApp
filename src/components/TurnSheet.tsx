"use client";

import { ArrowLeftRight, Check, Clock, Hand, Pin, Scale, Settings2, UserX } from "lucide-react";
import { useState } from "react";
import { cap, friendlyDate, longDate, timeToMinutes } from "@/lib/domain/dates";
import type { Swap, Turn } from "@/lib/domain/types";
import { useFamily } from "@/lib/useFamily";
import { Avatar } from "./Avatar";
import { IconBadge, Sheet, Tag } from "./ui";

const REASONS = ["Facultad o trabajo", "No estoy en casa", "Estoy enfermo", "Otro motivo"];

export function DeclineSheet({ turn, onClose, toast }: { turn: Turn | null; onClose: () => void; toast: (m: string) => void }) {
  const f = useFamily();
  const [reason, setReason] = useState("");
  const [other, setOther] = useState("");
  const [busy, setBusy] = useState(false);
  if (!turn) return null;
  const late = turn.date === f.now.date && f.now.minutes >= timeToMinutes(turn.slot);
  const finalReason = reason === "Otro motivo" ? other.trim() || "Otro motivo" : reason;
  return (
    <Sheet open onClose={onClose} title="¿No podés sacarlo?">
      <p className="text-lg text-ink-2">
        {cap(friendlyDate(turn.date, f.now.date))} a las {turn.slot}. El paseo pasa en el momento a otra persona, sin que tenga que aceptar.
      </p>
      {late && f.data.family.settings.penalty && (
        <p className="mt-4 rounded-2xl bg-sun-soft text-[#7a4f12] p-3.5 font-medium flex gap-2.5">
          <Clock size={20} className="shrink-0 mt-0.5" /> Ya pasó la hora. Avisá igual, así no cuenta como falta.
        </p>
      )}
      <p className="label mt-6">Motivo</p>
      <div className="flex flex-wrap gap-2">
        {REASONS.map((r) => (
          <button key={r} className="option" onClick={() => setReason(r)} aria-pressed={reason === r}>
            {r}
          </button>
        ))}
      </div>
      {reason === "Otro motivo" && <textarea className="field mt-3" placeholder="Contalo en pocas palabras" value={other} onChange={(e) => setOther(e.target.value)} />}
      <button
        className="btn btn-primary btn-lg mt-8"
        disabled={!reason || busy}
        onClick={async () => {
          setBusy(true);
          try {
            const cover = await f.decline(turn.date, turn.slot, finalReason);
            toast(cover ? `Listo. Lo saca ${f.member(cover)?.name}.` : "Nadie más puede. Le avisamos a la familia.");
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
      {incoming.map((s) => {
        const p = f.member(s.proposerId);
        return (
          <div key={s.id} className="card p-5 ring-2 ring-sun">
            <div className="flex items-center gap-3">
              <Avatar member={p} size={44} />
              <p className="font-semibold text-lg leading-snug">{p?.name} te pide cambiar un día</p>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-sunken p-3">
                <dt className="text-[0.8125rem] text-ink-3 font-medium">Vos lo sacás</dt>
                <dd className="font-semibold mt-0.5">{cap(longDate(s.date))}</dd>
              </div>
              <div className="rounded-2xl bg-sunken p-3">
                <dt className="text-[0.8125rem] text-ink-3 font-medium">{p?.name} te devuelve</dt>
                <dd className="font-semibold mt-0.5">{cap(longDate(s.backDate))}</dd>
              </div>
            </dl>
            {s.reason && <p className="mt-3 text-ink-2 font-serif italic text-lg">“{s.reason}”</p>}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button className="btn btn-primary" disabled={busy} onClick={() => void answer(s, true)}>
                Acepto
              </button>
              <button className="btn btn-outline" disabled={busy} onClick={() => void answer(s, false)}>
                No puedo
              </button>
            </div>
          </div>
        );
      })}
      {outgoing.map((s) => (
        <div key={s.id} className="card p-4 flex items-center gap-3">
          <IconBadge tone="sun">
            <Clock size={19} />
          </IconBadge>
          <p className="flex-1 text-ink-2">
            Esperando que <span className="font-semibold text-ink">{f.member(s.partnerId)?.name}</span> acepte el cambio del {longDate(s.date)}.
          </p>
          <button className="btn btn-ghost !min-h-10 !px-3" disabled={busy} onClick={() => void answer(s, false)}>
            Cancelar
          </button>
        </div>
      ))}
    </div>
  );
}

export function TurnTags({ turn }: { turn: Turn }) {
  const f = useFamily();
  return (
    <>
      {turn.isFixed && <Tag icon={<Pin size={13} />}>Día fijo</Tag>}
      {turn.override?.kind === "debt" && (
        <Tag tone="sun" icon={<Scale size={13} />}>
          Deuda
        </Tag>
      )}
      {turn.override?.kind === "swap" && (
        <Tag tone="pine" icon={<ArrowLeftRight size={13} />}>
          Intercambio
        </Tag>
      )}
      {turn.override?.kind === "exception" && (
        <Tag tone="pine" icon={<Hand size={13} />}>
          {turn.override.fromMemberId ? `Cubre a ${f.member(turn.override.fromMemberId)?.name ?? "alguien"}` : "Se ofreció"}
        </Tag>
      )}
      {turn.override?.kind === "admin" && <Tag icon={<Settings2 size={13} />}>Asignado</Tag>}
    </>
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
    <Sheet open onClose={close} title={cap(longDate(turn.date))}>
      <div className="card p-4 flex items-center gap-4">
        <Avatar member={owner} size={56} />
        <div className="min-w-0">
          <p className="text-lg font-semibold">{owner ? (mine ? "Te toca a vos" : `Le toca a ${owner.name}`) : "Sin responsable"}</p>
          <p className="text-ink-3">A las {turn.slot}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <TurnTags turn={turn} />
            {turn.confirmation && (
              <Tag tone="moss" icon={<Check size={13} strokeWidth={3} />}>
                Lo sacó {f.member(turn.confirmation.walkedBy)?.name}
              </Tag>
            )}
          </div>
        </div>
      </div>
      {turn.override?.reason && <p className="mt-3 text-ink-2 px-1">Motivo: {turn.override.reason}</p>}

      {mode === "menu" && (
        <div className="flex flex-col gap-2.5 mt-6">
          {mine && open && (
            <button className="btn btn-outline btn-lg justify-start !px-4" onClick={() => setMode("decline")}>
              <UserX size={20} /> No puedo ese día
            </button>
          )}
          {mine && future && !turn.isFixed && others.length > 0 && (
            <button className="btn btn-outline btn-lg justify-start !px-4" onClick={() => setMode("swap")}>
              <ArrowLeftRight size={20} /> Cambiarlo por otro día
            </button>
          )}
          {mine && future && turn.isFixed && <p className="text-ink-3 px-1">Los días fijos no se intercambian. Si no podés, usá “No puedo ese día”.</p>}
          {!turn.memberId && open && f.me.walks && (
            <button className="btn btn-primary btn-lg" disabled={busy} onClick={() => void f.take(turn.date, turn.slot).then(close)}>
              <Hand size={20} /> Lo saco yo
            </button>
          )}
          {f.isAdmin && open && (
            <button className="btn btn-ghost" onClick={() => setMode("assign")}>
              <Settings2 size={18} /> Asignar a otra persona
            </button>
          )}
          {!mine && !f.isAdmin && open && turn.memberId && <p className="text-ink-3 px-1">Solo {owner?.name} puede cambiar este día.</p>}
        </div>
      )}

      {mode === "swap" && (
        <div className="mt-6">
          {others.length > 1 && (
            <>
              <p className="label">¿Con quién?</p>
              <div className="flex flex-wrap gap-2 mb-5">
                {others.map((m) => (
                  <button key={m.id} className="option !pl-1.5" onClick={() => setPartner(m.id)} aria-pressed={chosen === m.id}>
                    <Avatar member={m} size={30} /> {m.name}
                  </button>
                ))}
              </div>
            </>
          )}
          {chosen &&
            (preview ? (
              <dl className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-surface p-3.5 shadow-[var(--shadow-sm)]">
                  <dt className="text-[0.8125rem] text-ink-3 font-medium">{f.member(chosen)?.name} lo saca</dt>
                  <dd className="font-semibold mt-0.5">{cap(longDate(turn.date))}</dd>
                </div>
                <div className="rounded-2xl bg-surface p-3.5 shadow-[var(--shadow-sm)]">
                  <dt className="text-[0.8125rem] text-ink-3 font-medium">Vos le devolvés</dt>
                  <dd className="font-semibold mt-0.5">{cap(longDate(preview.backDate))}</dd>
                </div>
              </dl>
            ) : (
              <p className="font-medium text-clay">No encontramos un día para devolverle. Probá con “No puedo ese día”.</p>
            ))}
          {preview && (
            <>
              <label className="block mt-5">
                <span className="label">Mensaje (opcional)</span>
                <textarea className="field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="¿Me cubrís? Tengo…" />
              </label>
              <button
                className="btn btn-primary btn-lg mt-5"
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
        <div className="mt-6 flex flex-col gap-2">
          <p className="label">¿Quién lo saca?</p>
          {f.data.members
            .filter((m) => m.walks)
            .map((m) => (
              <button
                key={m.id}
                className="btn btn-outline btn-lg justify-start !px-3"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await f.assign(m.id, turn.date, turn.slot);
                  toast(`Ahora lo saca ${m.name}.`);
                  close();
                }}
              >
                <Avatar member={m} size={36} /> {m.name}
              </button>
            ))}
        </div>
      )}
    </Sheet>
  );
}
