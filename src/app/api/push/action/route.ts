import { confirmWalk, ActionError } from "@/lib/domain/actions";
import { calendarView } from "@/lib/domain/calendars";
import { nowInZone } from "@/lib/domain/dates";
import { adminClient, loadFamilyServer } from "@/lib/server/admin";
import { verifyTurn, type TurnRef } from "@/lib/server/push";

// Botones de la notificación: "Ya lo saqué" y "10 min más", sin abrir la app.
export async function POST(request: Request) {
  let body: { action?: string; token?: string; turn?: TurnRef };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Pedido inválido" }, { status: 400 });
  }
  const { action, token, turn } = body;
  if (!turn || !token || !verifyTurn(turn, token)) return Response.json({ ok: false, message: "Abrí la app para confirmar." }, { status: 403 });

  const sb = adminClient();
  const cal = turn.calendarId ?? "main";
  const data = calendarView(await loadFamilyServer(turn.familyId), cal);
  const dog = data.family.dogName;

  if (action === "snooze") {
    await sb.from("snoozes").upsert({ member_id: turn.memberId, calendar_id: cal, date: turn.date, slot: turn.slot, until: new Date(Date.now() + 10 * 60_000).toISOString() });
    return Response.json({ ok: true, message: `${dog} te espera. Te volvemos a avisar en 10 minutos.` });
  }

  if (action === "done") {
    try {
      const now = nowInZone(data.family.timeZone);
      const c = confirmWalk(data, turn.memberId, turn.date, turn.slot, { now, stamp: new Date().toISOString(), newId: () => crypto.randomUUID() });
      const { error } = await sb.from("confirmations").insert({ id: c.id, family_id: turn.familyId, calendar_id: cal, date: c.date, slot: c.slot, walked_by: c.walkedBy, at: c.at });
      if (error && error.code !== "23505") throw new Error(error.message);
      return Response.json({ ok: true, message: `${dog} está feliz. ¡Gracias!` });
    } catch (e) {
      const msg = e instanceof ActionError ? e.message : "No se pudo confirmar. Abrí la app.";
      return Response.json({ ok: msg.includes("ya fue confirmado"), message: msg });
    }
  }
  return Response.json({ ok: false, message: "Acción desconocida" }, { status: 400 });
}
