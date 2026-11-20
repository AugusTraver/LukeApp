import { calendarView, calOf } from "@/lib/domain/calendars";
import { nowInZone, whenPhrase } from "@/lib/domain/dates";
import { loadFamilyServer, memberFromToken } from "@/lib/server/admin";
import { sendToMembers } from "@/lib/server/push";

// Avisos inmediatos después de una acción en la app: excepciones, intercambios y pruebas.
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? null;
  const me = await memberFromToken(token);
  if (!me) return Response.json({ error: "unauthorized", message: "El servidor no pudo validar tu sesión." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { familyId?: string; type?: string; id?: string; ids?: string[] };
  if (body.familyId !== me.familyId) return Response.json({ error: "forbidden" }, { status: 403 });

  const data = await loadFamilyServer(me.familyId);
  const today = nowInZone(data.family.timeZone).date;
  const name = (id: string | null | undefined) => data.members.find((m) => m.id === id)?.name ?? "Alguien";
  const dogOf = (x: { calendarId?: string }) => calendarView(data, calOf(x)).family.dogName;
  const when = (d: string) => whenPhrase(d, today);
  let sent = 0;

  if (body.type === "test") {
    sent = await sendToMembers(me.familyId, [me.memberId], { title: "Prueba de LukeApp", body: "¡Así te van a llegar los avisos del paseo!", tag: "test", urgent: true });
  }

  if (body.type === "overrides" && body.ids?.length) {
    for (const o of data.overrides.filter((x) => body.ids!.includes(x.id))) {
      const dog = dogOf(o);
      if (o.kind === "exception" && o.fromMemberId) {
        if (o.memberId) {
          sent += await sendToMembers(me.familyId, [o.memberId], {
            title: `Te toca cubrir a ${name(o.fromMemberId)}`,
            body: `Sacás a ${dog} ${when(o.date)} a las ${o.slot}. Motivo: ${o.reason || "no puede"}.`,
            tag: `cover-${o.date}`,
            urgent: true,
          });
        } else {
          sent += await sendToMembers(
            me.familyId,
            data.members.map((m) => m.id).filter((id) => id !== o.fromMemberId),
            { title: `Nadie puede sacar a ${dog} ${when(o.date)}`, body: `Es a las ${o.slot}. Si podés, abrí la app y tocá “Lo saco yo”.`, tag: `nobody-${o.date}`, urgent: true },
          );
        }
      }
      if (o.kind === "admin" && o.memberId) {
        sent += await sendToMembers(me.familyId, [o.memberId], { title: `Te asignaron un paseo`, body: `${when(o.date)} a las ${o.slot}.`, tag: `assign-${o.date}` });
      }
    }
  }

  if (body.type === "swap" && body.id) {
    const s = data.swaps.find((x) => x.id === body.id);
    if (s?.status === "pending" && s.proposerId === me.memberId) {
      sent = await sendToMembers(me.familyId, [s.partnerId], {
        title: `${name(s.proposerId)} te pide un cambio`,
        body: `Vos lo sacás ${when(s.date)} y te devuelve ${when(s.backDate)}. Abrí la app para responder.`,
        tag: `swap-${s.id}`,
        urgent: true,
      });
    } else if (s && (s.status === "accepted" || s.status === "rejected") && s.partnerId === me.memberId) {
      sent = await sendToMembers(me.familyId, [s.proposerId], {
        title: s.status === "accepted" ? `${name(s.partnerId)} aceptó el cambio` : `${name(s.partnerId)} no puede hacer el cambio`,
        body: s.status === "accepted" ? `Lo saca ${when(s.date)} y vos ${when(s.backDate)}.` : `Seguís con el turno de ${when(s.date)}. Podés usar “No puedo”.`,
        tag: `swap-${s.id}`,
      });
    }
  }

  if (body.type === "test" && sent === 0) console.error("[push] la prueba no llegó a ningún celular de", me.memberId);
  return Response.json({ ok: true, sent });
}
