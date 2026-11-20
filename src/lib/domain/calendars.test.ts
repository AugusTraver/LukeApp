import { describe, expect, it } from "vitest";
import { confirmWalk, settleDebts, type Ctx } from "./actions";
import { activeCalendars, allCalendars, allDogs, calendarView, joinNames, newCalendarFrom, setWalksEverywhere, storedFamily, withCalendars } from "./calendars";
import { buildTurns, getTurn, missesByMember } from "./schedule";
import { augusFamily } from "./seed";
import { MAIN, type FamilyData } from "./types";

let n = 0;
const ctx = (date: string, minutes = 12 * 60): Ctx => ({ now: { date, minutes }, stamp: `${date}T12:00:00.${String(++n).padStart(3, "0")}Z`, newId: () => `id-${n}-${Math.random()}` });
const far = { date: "2026-11-01", minutes: 0 };

describe("vacaciones (no estoy)", () => {
  it("los turnos de quien no está los saca otro y no cuentan como falta", () => {
    const data: FamilyData = { ...augusFamily("2026-11-16"), absences: [{ id: "a1", memberId: "lucio", from: "2026-11-17", to: "2026-11-20", createdAt: "x" }] };
    const turns = buildTurns(data, "2026-11-16", "2026-11-22", far);
    const byDate = Object.fromEntries(turns.map((t) => [t.date, t]));
    expect(byDate["2026-11-17"].memberId).toBe("augus"); // martes fijo de Lucio
    expect(byDate["2026-11-17"].coverFor).toBe("lucio");
    expect(byDate["2026-11-18"].memberId).toBe("augus");
    expect(byDate["2026-11-20"].memberId).toBe("augus");
    expect(byDate["2026-11-21"].memberId).toBe("augus"); // sábado: le tocaba a Augus igual
    expect(byDate["2026-11-22"].memberId).toBe("lucio"); // ya volvió
    expect(byDate["2026-11-22"].coverFor).toBeUndefined();

    // Si nadie confirma un día de vacaciones, la falta es de quien cubría, no de Lucio.
    const past = buildTurns(data, "2026-11-17", "2026-11-17", { date: "2026-11-25", minutes: 0 });
    expect(missesByMember(past).get("lucio")).toBeUndefined();
    expect(missesByMember(past).get("augus")).toBe(1);
  });

  it("si no queda nadie, el turno queda sin responsable", () => {
    const data: FamilyData = {
      ...augusFamily("2026-11-16"),
      absences: [
        { id: "a1", memberId: "lucio", from: "2026-11-17", to: "2026-11-17", createdAt: "x" },
        { id: "a2", memberId: "augus", from: "2026-11-17", to: "2026-11-17", createdAt: "x" },
      ],
    };
    expect(getTurn(data, "2026-11-17", "17:20", far).memberId).toBeNull();
  });

  it("el paseo de deuda no cae en días en que el deudor no está", () => {
    const base = augusFamily("2026-11-18");
    // 18/11 le tocaba a Lucio y nadie confirmó; Lucio no está del 19 al 21.
    const data: FamilyData = { ...base, absences: [{ id: "a", memberId: "lucio", from: "2026-11-19", to: "2026-11-21", createdAt: "x" }] };
    const [debt] = settleDebts(data, ctx("2026-11-19"));
    expect(debt.memberId).toBe("lucio");
    expect(debt.date >= "2026-11-22").toBe(true);
  });
});

describe("varios perros", () => {
  it("una familia vieja tiene un solo calendario con su perro", () => {
    const f = augusFamily().family;
    expect(allCalendars(f).map((c) => c.id)).toEqual([MAIN]);
    expect(allDogs(f)).toEqual([{ id: "dog-1", name: "Luke", coat: "black", calendarId: MAIN }]);
  });

  it("los que salen juntos comparten turnos y nombre", () => {
    const base = augusFamily();
    const f = withCalendars(base.family, allCalendars(base.family), [
      { id: "d1", name: "Luke", coat: "black", calendarId: MAIN },
      { id: "d2", name: "Mora", coat: "golden", calendarId: MAIN },
    ]);
    const view = calendarView({ ...base, family: f });
    expect(view.family.dogName).toBe("Luke y Mora");
    expect(activeCalendars(f)).toHaveLength(1);
  });

  it("un perro aparte tiene su calendario, y lo de uno no afecta al otro", () => {
    const base = augusFamily("2026-11-16");
    const tito = newCalendarFrom(allCalendars(base.family)[0], "c-tito");
    tito.walkTimes = ["08:00"];
    tito.fixedDays = [null, null, null, null, null, null, null];
    const f = withCalendars(base.family, [...allCalendars(base.family), tito], [
      { id: "d1", name: "Luke", coat: "black", calendarId: MAIN },
      { id: "d2", name: "Tito", coat: "gray", calendarId: "c-tito" },
    ]);
    const data: FamilyData = { ...base, family: f };
    expect(f.dogName).toBe("Luke");
    expect(f.calendars).toHaveLength(1);

    const titoView = calendarView(data, "c-tito");
    expect(titoView.family.dogName).toBe("Tito");
    expect(titoView.family.walkTimes).toEqual(["08:00"]);

    // Confirmar a Tito no confirma a Luke.
    const c = { ...confirmWalk(titoView, "augus", "2026-11-16", "08:00", ctx("2026-11-16", 9 * 60)), calendarId: "c-tito" };
    const withConf: FamilyData = { ...data, confirmations: [c] };
    expect(getTurn(calendarView(withConf, "c-tito"), "2026-11-16", "08:00", far).confirmation).toBeDefined();
    expect(calendarView(withConf, MAIN).confirmations).toHaveLength(0);
  });

  it("un calendario sin perros se descarta y sumar a alguien lo agrega en todos", () => {
    const base = augusFamily();
    const extra = newCalendarFrom(allCalendars(base.family)[0], "c-x");
    const f = withCalendars(base.family, [...allCalendars(base.family), extra], [{ id: "d1", name: "Luke", coat: "black", calendarId: MAIN }]);
    expect(f.calendars).toEqual([]);

    const two = withCalendars(base.family, [...allCalendars(base.family), extra], [
      { id: "d1", name: "Luke", coat: "black", calendarId: MAIN },
      { id: "d2", name: "Tito", coat: "gray", calendarId: "c-x" },
    ]);
    const added = setWalksEverywhere(two, "nuevo", true);
    expect(allCalendars(added).every((c) => c.rotation.includes("nuevo"))).toBe(true);
    const removed = setWalksEverywhere({ ...added, fixedDays: ["nuevo", null, null, null, null, null, null] }, "nuevo", false);
    expect(allCalendars(removed).some((c) => c.rotation.includes("nuevo") || c.fixedDays.includes("nuevo"))).toBe(false);
  });

  it("un perro que se suma hoy no arrastra faltas ni deudas de días anteriores", () => {
    const base = augusFamily("2026-11-10");
    const tito = newCalendarFrom(allCalendars(base.family)[0], "c-tito", "2026-11-19");
    const f = withCalendars(base.family, [...allCalendars(base.family), tito], [
      { id: "d1", name: "Luke", coat: "black", calendarId: MAIN },
      { id: "d2", name: "Tito", coat: "gray", calendarId: "c-tito" },
    ]);
    const view = calendarView({ ...base, family: f }, "c-tito");
    expect(view.family.startDate).toBe("2026-11-19");
    expect(settleDebts(view, ctx("2026-11-19"))).toHaveLength(0);
    // Luke sigue contando desde el inicio de la familia.
    expect(calendarView({ ...base, family: f }, MAIN).family.startDate).toBe("2026-11-10");
  });

  it("guardar desde una vista vuelve a la forma guardada", () => {
    const base = augusFamily();
    const v = calendarView(base);
    expect(storedFamily(v.family).calendarId).toBeUndefined();
    expect(joinNames(["A", "B", "C"])).toBe("A, B y C");
  });
});
