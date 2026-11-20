// Solo servidor: lo que corre cada 5 minutos para cada familia.
import { settleDebts } from "../domain/actions";
import { nowInZone } from "../domain/dates";
import { debtPush, planPushes } from "../domain/notifyPlan";
import { timeToMinutes } from "../domain/dates";
import { adminClient, loadFamilyServer } from "./admin";
import { sendToMembers } from "./push";

export async function tickFamily(familyId: string) {
  const sb = adminClient();
  const data = await loadFamilyServer(familyId);
  const now = nowInZone(data.family.timeZone);
  const result = { familyId, debts: 0, pushes: 0 };

  // 1) Cerrar días pasados: paseo de deuda.
  const debts = settleDebts(data, { now, stamp: new Date().toISOString(), newId: () => crypto.randomUUID() });
  for (const d of debts) {
    const { error } = await sb.from("overrides").insert({
      id: d.id,
      family_id: familyId,
      date: d.date,
      slot: d.slot,
      member_id: d.memberId,
      kind: "debt",
      from_member_id: d.fromMemberId ?? null,
      missed_date: d.missedDate,
      missed_slot: d.missedSlot,
    });
    if (error) continue; // ya lo aplicó un celular (índice único)
    result.debts++;
    const p = debtPush(data, d.memberId!, d.missedDate!, d.date !== d.missedDate ? d.date : null, now.date);
    await sendToMembers(familyId, p.to, { title: p.title, body: p.body, tag: `debt-${d.missedDate}` });
  }
  if (debts.length) data.overrides.push(...debts);

  // 2) Avisos del día.
  const [{ data: logRows }, { data: snoozeRows }] = await Promise.all([
    sb.from("notification_log").select("date, slot, step").eq("family_id", familyId).eq("date", now.date),
    sb.from("snoozes").select("member_id, date, slot, until").eq("date", now.date).in("member_id", data.members.map((m) => m.id)),
  ]);
  const sent = new Set((logRows ?? []).map((r) => `${r.date}|${r.slot}|${r.step}`));
  const snoozes = new Map<string, number>();
  for (const s of snoozeRows ?? []) {
    const local = nowInZone(data.family.timeZone, new Date(s.until));
    snoozes.set(`${s.member_id}|${s.date}|${s.slot}`, local.minutes);
  }
  const plan = planPushes(data, now, sent, snoozes);
  if (plan.markSent.length) {
    await sb.from("notification_log").upsert(
      plan.markSent.map((k) => {
        const [date, slot, step] = k.split("|");
        return { family_id: familyId, date, slot, step };
      }),
      { ignoreDuplicates: true },
    );
  }
  for (const p of plan.pushes) {
    // Los botones "Ya lo saqué / 10 min más" van solo a quien tiene el turno.
    const owner = p.actionable ? p.to[0] : undefined;
    result.pushes += await sendToMembers(
      familyId,
      p.to,
      { title: p.title, body: p.body, urgent: p.urgent, tag: `walk-${p.date}-${timeToMinutes(p.slot)}` },
      { date: p.date, slot: p.slot, actionableFor: owner },
    );
  }
  return result;
}

export async function tickAll() {
  const sb = adminClient();
  const { data: fams, error } = await sb.from("families").select("id");
  if (error) throw new Error(error.message);
  const results = [];
  for (const f of fams ?? []) {
    try {
      results.push(await tickFamily(f.id));
    } catch (e) {
      results.push({ familyId: f.id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return results;
}
