import { describe, expect, it } from "vitest";
import { acceptSwap, ActionError, confirmWalk, declineTurn, proposeSwap, settleDebts, type Ctx } from "./actions";
import { addDays, nowInZone, weekdayOf } from "./dates";
import { baseAssignee, buildTurns, getTurn, streak } from "./schedule";
import { augusFamily } from "./seed";
import type { FamilyData } from "./types";

let n = 0;
const ctx = (date: string, minutes = 12 * 60): Ctx => ({
  now: { date, minutes },
  stamp: `${date}T${String(Math.floor(minutes / 60)).padStart(2, "0")}:00:00.${String(n).padStart(3, "0")}Z`,
  newId: () => `id-${++n}`,
});

const who = (data: FamilyData, date: string) => baseAssignee(data.family, date, "17:20").memberId;

describe("regla de turnos (igual a la app anterior)", () => {
  const data = augusFamily();

  it("reproduce el calendario de noviembre de 2026", () => {
    const expected: Record<string, string> = {
      "2026-11-09": "augus", "2026-11-10": "lucio", "2026-11-11": "augus", "2026-11-12": "lucio",
      "2026-11-13": "augus", "2026-11-14": "lucio", "2026-11-15": "augus",
      "2026-11-16": "augus", "2026-11-17": "lucio", "2026-11-18": "lucio", "2026-11-19": "augus",
      "2026-11-20": "lucio", "2026-11-21": "augus", "2026-11-22": "lucio",
      "2026-11-23": "augus", "2026-11-24": "lucio", "2026-11-25": "augus", "2026-11-26": "lucio",
      "2026-11-27": "augus", "2026-11-28": "lucio", "2026-11-29": "augus",
      "2026-11-30": "augus", "2026-12-01": "lucio", "2026-12-02": "lucio", "2026-12-03": "augus",
    };
    for (const [date, member] of Object.entries(expected)) expect(who(data, date), date).toBe(member);
  });

  it("da 7 turnos a cada uno cada dos semanas", () => {
    const turns = buildTurns(data, "2026-11-16", "2026-11-29", { date: "2026-11-01", minutes: 0 });
    expect(turns.filter((t) => t.memberId === "augus")).toHaveLength(7);
    expect(turns.filter((t) => t.memberId === "lucio")).toHaveLength(7);
  });

  it("reparte entre tres paseadores en orden", () => {
    const d = augusFamily();
    d.family.fixedDays = [null, null, null, null, null, null, null];
    d.family.rotation = ["a", "b", "c"];
    const seq = Array.from({ length: 6 }, (_, i) => who(d, addDays("2026-11-16", i)));
    expect(seq).toEqual(["a", "b", "c", "a", "b", "c"]);
  });

  it("con dos horarios por día, cada horario es un turno distinto", () => {
    const d = augusFamily();
    d.family.walkTimes = ["17:20", "08:00"];
    const turns = buildTurns(d, "2026-11-18", "2026-11-18", { date: "2026-11-01", minutes: 0 });
    expect(turns.map((t) => [t.slot, t.memberId])).toEqual([["08:00", "lucio"], ["17:20", "augus"]]);
  });
});

describe("estados", () => {
  it("pendiente, ahora, hecho y no realizado", () => {
    const data = augusFamily();
    expect(getTurn(data, "2026-11-19", "17:20", { date: "2026-11-19", minutes: 17 * 60 }).status).toBe("pending");
    expect(getTurn(data, "2026-11-19", "17:20", { date: "2026-11-19", minutes: 17 * 60 + 25 }).status).toBe("now");
    expect(getTurn(data, "2026-11-19", "17:20", { date: "2026-11-20", minutes: 0 }).status).toBe("missed");
    data.confirmations.push(confirmWalk(data, "augus", "2026-11-19", "17:20", ctx("2026-11-19", 17 * 60 + 30)));
    expect(getTurn(data, "2026-11-19", "17:20", { date: "2026-11-20", minutes: 0 }).status).toBe("done");
  });

  it("el observador no puede confirmar", () => {
    const data = augusFamily();
    expect(() => confirmWalk(data, "silhect", "2026-11-19", "17:20", ctx("2026-11-19"))).toThrow(ActionError);
  });
});

describe("No puedo (excepción)", () => {
  it("pasa el turno al otro al instante", () => {
    const data = augusFamily();
    data.overrides.push(declineTurn(data, "augus", "2026-11-21", "17:20", "Tengo facultad", ctx("2026-11-19")));
    expect(getTurn(data, "2026-11-21", "17:20", { date: "2026-11-19", minutes: 0 }).memberId).toBe("lucio");
    // El resto no cambia
    expect(getTurn(data, "2026-11-23", "17:20", { date: "2026-11-19", minutes: 0 }).memberId).toBe("augus");
  });

  it("si el otro tampoco puede, queda sin responsable", () => {
    const data = augusFamily();
    data.overrides.push(declineTurn(data, "augus", "2026-11-21", "17:20", "a", ctx("2026-11-19")));
    data.overrides.push(declineTurn(data, "lucio", "2026-11-21", "17:20", "b", ctx("2026-11-19", 13 * 60)));
    const t = getTurn(data, "2026-11-21", "17:20", { date: "2026-11-19", minutes: 0 });
    expect(t.memberId).toBeNull();
    expect(t.status).toBe("unassigned");
  });

  it("solo el responsable puede avisar", () => {
    const data = augusFamily();
    expect(() => declineTurn(data, "lucio", "2026-11-21", "17:20", "x", ctx("2026-11-19"))).toThrow(ActionError);
  });
});

describe("intercambio", () => {
  it("el compañero cubre y se devuelve su próximo día no fijo", () => {
    const data = augusFamily();
    const swap = proposeSwap(data, "augus", "lucio", "2026-11-21", "17:20", "Cumpleaños", ctx("2026-11-19"));
    expect(swap.backDate).toBe("2026-11-22"); // domingo de Lucio
    const res = acceptSwap(data, swap, "lucio", ctx("2026-11-19", 13 * 60));
    data.overrides.push(...res.overrides);
    const now = { date: "2026-11-19", minutes: 0 };
    expect(getTurn(data, "2026-11-21", "17:20", now).memberId).toBe("lucio");
    expect(getTurn(data, "2026-11-22", "17:20", now).memberId).toBe("augus");
  });

  it("los días fijos no se intercambian", () => {
    const data = augusFamily();
    expect(() => proposeSwap(data, "augus", "lucio", "2026-11-23", "17:20", "x", ctx("2026-11-19"))).toThrow(/fijos/);
  });
});

describe("castigo: paseo de deuda", () => {
  it("quien faltó toma el próximo turno del otro", () => {
    const data = augusFamily("2026-11-20");
    // Lucio no confirma el viernes 20
    const debts = settleDebts(data, ctx("2026-11-21", 10));
    expect(debts).toHaveLength(1);
    expect(debts[0]).toMatchObject({ date: "2026-11-23", memberId: "lucio", fromMemberId: "augus", missedDate: "2026-11-20" });
    data.overrides.push(...debts);
    expect(getTurn(data, "2026-11-23", "17:20", { date: "2026-11-21", minutes: 10 }).memberId).toBe("lucio");
  });

  it("no se aplica dos veces", () => {
    const data = augusFamily("2026-11-20");
    data.overrides.push(...settleDebts(data, ctx("2026-11-21", 10)));
    expect(settleDebts(data, ctx("2026-11-21", 20))).toHaveLength(0);
  });

  it("si avisó a tiempo y el otro lo cubrió, la falta es del que cubre", () => {
    const data = augusFamily("2026-11-20");
    data.overrides.push(declineTurn(data, "lucio", "2026-11-20", "17:20", "x", ctx("2026-11-20")));
    const debts = settleDebts(data, ctx("2026-11-21", 10));
    expect(debts[0].memberId).toBe("augus");
  });

  it("se puede desactivar", () => {
    const data = augusFamily("2026-11-20");
    data.family.settings.penalty = false;
    expect(settleDebts(data, ctx("2026-11-21", 10))).toHaveLength(0);
  });
});

describe("racha", () => {
  it("cuenta días seguidos completos", () => {
    const data = augusFamily();
    for (const d of ["2026-11-16", "2026-11-17", "2026-11-18"]) {
      const m = getTurn(data, d, "17:20", { date: d, minutes: 0 }).memberId!;
      data.confirmations.push(confirmWalk(data, m, d, "17:20", ctx(d, 18 * 60)));
    }
    expect(streak(data, { date: "2026-11-19", minutes: 10 * 60 })).toBe(3);
    expect(streak(data, { date: "2026-11-20", minutes: 10 * 60 })).toBe(0);
  });
});

describe("fechas", () => {
  it("lunes es 0", () => {
    expect(weekdayOf("2026-11-16")).toBe(0);
    expect(weekdayOf("2026-11-22")).toBe(6);
  });
  it("hora de Argentina", () => {
    expect(nowInZone("America/Argentina/Buenos_Aires", new Date("2026-11-19T20:20:00Z"))).toEqual({ date: "2026-11-19", minutes: 17 * 60 + 20 });
  });
});
