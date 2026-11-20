import { describe, expect, it } from "vitest";
import { planPushes } from "./notifyPlan";
import { augusFamily } from "./seed";

const at = (h: number, m: number) => ({ date: "2026-11-19", minutes: h * 60 + m }); // jueves: Augus

function run(times: [number, number][], opts: { insistent?: boolean; snooze?: number } = {}) {
  const data = augusFamily();
  data.family.settings.insistent = opts.insistent ?? true;
  const sent = new Set<string>();
  const out: { at: string; step: string; to: string[] }[] = [];
  for (const [h, m] of times) {
    const snoozes = new Map<string, number>();
    if (opts.snooze) snoozes.set("augus|2026-11-19|17:20", opts.snooze);
    const r = planPushes(data, at(h, m), sent, snoozes);
    r.markSent.forEach((k) => sent.add(k));
    r.pushes.forEach((p) => out.push({ at: `${h}:${m}`, step: p.step, to: p.to }));
  }
  return out;
}

const every5 = (fromH: number, fromM: number, toH: number, toM: number) => {
  const r: [number, number][] = [];
  for (let t = fromH * 60 + fromM; t <= toH * 60 + toM; t += 5) r.push([Math.floor(t / 60), t % 60]);
  return r;
};

describe("plan de avisos", () => {
  it("avisa a las 17:10 y a las 17:20", () => {
    const out = run([[17, 5], [17, 10], [17, 15], [17, 20]]);
    expect(out.map((o) => o.step)).toEqual(["pre", "now"]);
    expect(out[0].to).toEqual(["augus"]);
  });

  it("insiste cada 5 minutos y escala a los demás", () => {
    const out = run(every5(17, 0, 20, 30));
    const steps = out.map((o) => o.step);
    expect(steps.slice(0, 9)).toEqual(["pre", "now", "r5", "r10", "r15", "r20", "r25", "r30", "r35"]);
    expect(steps).toContain("late");
    const others = out.find((o) => o.step === "others")!;
    expect(others.at).toBe("19:0");
    expect(others.to).toContain("lucio");
    const fam = out.find((o) => o.step === "family")!;
    expect(fam.at).toBe("20:0");
    expect(fam.to).toEqual(["augus", "silhect"]);
  });

  it("sin avisos insistentes solo manda los dos primeros", () => {
    const out = run(every5(17, 0, 20, 30), { insistent: false });
    expect(out.map((o) => o.step)).toEqual(["pre", "now"]);
  });

  it("si el servidor se atrasa, manda solo el último aviso", () => {
    const out = run([[17, 32]]);
    expect(out.map((o) => o.step)).toEqual(["r10"]);
  });

  it("'10 min más' frena las repeticiones", () => {
    const out = run(every5(17, 20, 17, 40), { snooze: 17 * 60 + 31 });
    expect(out.map((o) => `${o.at} ${o.step}`)).toEqual(["17:20 now", "17:35 r15", "17:40 r20"]);
  });

  it("no avisa si ya se confirmó", () => {
    const data = augusFamily();
    data.confirmations.push({ id: "c", date: "2026-11-19", slot: "17:20", walkedBy: "augus", at: "x" });
    expect(planPushes(data, at(17, 20), new Set()).pushes).toHaveLength(0);
  });
});
