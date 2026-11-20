// Acciones de la familia como funciones puras: reciben los datos y devuelven los registros
// nuevos que hay que guardar. Así la misma lógica corre en el celular y en el servidor.
import type { HHMM, ISODate } from "./dates";
import { findDebtTarget, findSwapBack, getTurn, missedWithoutDebt, pickCover, type Now } from "./schedule";
import type { Confirmation, FamilyData, Override, Swap } from "./types";

export class ActionError extends Error {}

export interface Ctx {
  now: Now;
  /** Marca de tiempo ISO actual */
  stamp: string;
  newId: () => string;
}

export function confirmWalk(data: FamilyData, memberId: string, date: ISODate, slot: HHMM, ctx: Ctx, mood?: string): Confirmation {
  const turn = getTurn(data, date, slot, ctx.now);
  if (turn.confirmation) throw new ActionError("Este paseo ya fue confirmado.");
  if (date > ctx.now.date) throw new ActionError("Todavía no llegó ese día.");
  const member = data.members.find((m) => m.id === memberId);
  if (!member?.walks) throw new ActionError("Solo quien pasea puede confirmar.");
  return { id: ctx.newId(), date, slot, walkedBy: memberId, at: ctx.stamp, mood };
}

/** "No puedo": el turno pasa al instante a otro paseador (o queda sin responsable). */
export function declineTurn(data: FamilyData, memberId: string, date: ISODate, slot: HHMM, reason: string, ctx: Ctx): Override {
  const turn = getTurn(data, date, slot, ctx.now);
  if (turn.memberId !== memberId) throw new ActionError("Este turno no es tuyo.");
  if (turn.confirmation) throw new ActionError("Este paseo ya se hizo.");
  if (date < ctx.now.date) throw new ActionError("Ese día ya pasó.");
  const cover = pickCover(data, date, slot, ctx.now);
  return {
    id: ctx.newId(),
    date,
    slot,
    memberId: cover,
    kind: "exception",
    fromMemberId: memberId,
    reason: reason.trim(),
    createdAt: ctx.stamp,
  };
}

/** Alguien sin turno se ofrece para un turno que quedó sin responsable. */
export function takeTurn(data: FamilyData, memberId: string, date: ISODate, slot: HHMM, ctx: Ctx): Override {
  const turn = getTurn(data, date, slot, ctx.now);
  if (turn.memberId) throw new ActionError("Ese turno ya tiene responsable.");
  return { id: ctx.newId(), date, slot, memberId, kind: "exception", fromMemberId: null, reason: "Se ofreció", createdAt: ctx.stamp };
}

/** El admin asigna un turno a mano. */
export function adminAssign(data: FamilyData, memberId: string | null, date: ISODate, slot: HHMM, ctx: Ctx): Override {
  return { id: ctx.newId(), date, slot, memberId, kind: "admin", createdAt: ctx.stamp };
}

export function proposeSwap(
  data: FamilyData,
  proposerId: string,
  partnerId: string,
  date: ISODate,
  slot: HHMM,
  reason: string,
  ctx: Ctx,
): Swap {
  const turn = getTurn(data, date, slot, ctx.now);
  if (turn.memberId !== proposerId) throw new ActionError("Este turno no es tuyo.");
  if (turn.isFixed) throw new ActionError("Los días fijos solo se cambian con “No puedo”.");
  if (date <= ctx.now.date) throw new ActionError("Solo se pueden intercambiar días que todavía no llegaron.");
  if (proposerId === partnerId) throw new ActionError("Elegí a otra persona.");
  const back = findSwapBack(data, partnerId, date, ctx.now);
  if (!back) throw new ActionError("No encontramos un día para devolverle el turno.");
  return {
    id: ctx.newId(),
    proposerId,
    partnerId,
    date,
    slot,
    backDate: back.date,
    backSlot: back.slot,
    reason: reason.trim(),
    status: "pending",
    createdAt: ctx.stamp,
  };
}

/** Al aceptar: el compañero cubre el turno y el que propuso devuelve el otro. */
export function acceptSwap(data: FamilyData, swap: Swap, memberId: string, ctx: Ctx): { swap: Swap; overrides: Override[] } {
  if (swap.status !== "pending") throw new ActionError("Este intercambio ya fue respondido.");
  if (swap.partnerId !== memberId) throw new ActionError("Este intercambio no es para vos.");
  const a = getTurn(data, swap.date, swap.slot, ctx.now);
  const b = getTurn(data, swap.backDate, swap.backSlot, ctx.now);
  if (a.memberId !== swap.proposerId || b.memberId !== swap.partnerId || a.confirmation || b.confirmation) {
    throw new ActionError("Los turnos cambiaron desde que se propuso. Pedí uno nuevo.");
  }
  return {
    swap: { ...swap, status: "accepted" },
    overrides: [
      { id: ctx.newId(), date: swap.date, slot: swap.slot, memberId: swap.partnerId, kind: "swap", swapId: swap.id, createdAt: ctx.stamp },
      { id: ctx.newId(), date: swap.backDate, slot: swap.backSlot, memberId: swap.proposerId, kind: "swap", swapId: swap.id, createdAt: ctx.stamp },
    ],
  };
}

export function rejectSwap(swap: Swap, memberId: string): Swap {
  if (swap.status !== "pending") throw new ActionError("Este intercambio ya fue respondido.");
  if (swap.partnerId === memberId) return { ...swap, status: "rejected" };
  if (swap.proposerId === memberId) return { ...swap, status: "cancelled" };
  throw new ActionError("Este intercambio no es tuyo.");
}

/**
 * Cierra los días pasados: por cada paseo no realizado, crea el "paseo de deuda".
 * Es idempotente: si ya se aplicó, no lo repite.
 */
export function settleDebts(data: FamilyData, ctx: Ctx): Override[] {
  const created: Override[] = [];
  let working = data;
  for (const missed of missedWithoutDebt(data, ctx.now)) {
    const target = findDebtTarget(working, missed.memberId!, ctx.now);
    const o: Override = target
      ? {
          id: ctx.newId(),
          date: target.date,
          slot: target.slot,
          memberId: missed.memberId,
          fromMemberId: target.memberId,
          kind: "debt",
          missedDate: missed.date,
          missedSlot: missed.slot,
          createdAt: ctx.stamp,
        }
      : {
          // Sin turno disponible: igual se registra para no reintentar.
          id: ctx.newId(),
          date: missed.date,
          slot: missed.slot,
          memberId: missed.memberId,
          kind: "debt",
          missedDate: missed.date,
          missedSlot: missed.slot,
          createdAt: ctx.stamp,
        };
    created.push(o);
    working = { ...working, overrides: [...working.overrides, o] };
  }
  return created;
}
