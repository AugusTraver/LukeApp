// Solo servidor: envío de Web Push y tokens firmados para los botones de la notificación.
import { createHmac, timingSafeEqual } from "node:crypto";
import * as webpush from "web-push";
import { adminClient } from "./admin";

let configured = false;
function configure() {
  if (configured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("Faltan las claves VAPID");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:lukeapp@example.com", pub, priv);
  configured = true;
}

export interface TurnRef {
  familyId: string;
  memberId: string;
  date: string;
  slot: string;
  calendarId?: string;
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  urgent?: boolean;
  url?: string;
  turn?: TurnRef;
  token?: string;
}

/**
 * "Topic" del aviso (uno nuevo reemplaza al anterior con el mismo topic).
 * Apple rechaza todo lo que no sea letras y números (400 BadWebPushTopic), así que se limpia.
 */
export function pushTopic(tag?: string) {
  const t = tag?.replace(/[^A-Za-z0-9]/g, "").slice(0, 32);
  return t || undefined;
}

/** Envía a todos los celulares de esos miembros. Borra suscripciones vencidas. */
export async function sendToMembers(familyId: string, memberIds: string[], payload: Omit<PushPayload, "token" | "turn">, turn?: { date: string; slot: string; calendarId?: string; actionableFor?: string }) {
  if (memberIds.length === 0) return 0;
  configure();
  const sb = adminClient();
  const { data: subs } = await sb.from("push_subscriptions").select("*").eq("family_id", familyId).in("member_id", memberIds);
  let ok = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      const withActions = turn && turn.actionableFor === s.member_id;
      const body: PushPayload = {
        ...payload,
        ...(withActions
          ? (() => {
              const ref: TurnRef = { familyId, memberId: s.member_id, date: turn.date, slot: turn.slot, calendarId: turn.calendarId ?? "main" };
              return { turn: ref, token: signTurn(ref) };
            })()
          : {}),
      };
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(body), {
          TTL: 60 * 60,
          urgency: payload.urgent ? "high" : "normal",
          topic: pushTopic(payload.tag),
        });
        ok++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        const body = (e as { body?: string }).body;
        console.error("[push] falló el envío", code, String(body ?? (e as Error).message).slice(0, 200), new URL(s.endpoint).host);
        if (code === 404 || code === 410) await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }),
  );
  return ok;
}

function secret() {
  const s = process.env.PUSH_ACTION_SECRET;
  if (!s || s.length < 16) throw new Error("Falta PUSH_ACTION_SECRET");
  return s;
}

export function signTurn(t: TurnRef) {
  return createHmac("sha256", secret())
    .update(`${t.familyId}|${t.memberId}|${t.date}|${t.slot}|${t.calendarId ?? "main"}`)
    .digest("base64url");
}

export function verifyTurn(t: TurnRef, token: string) {
  const expected = Buffer.from(signTurn(t));
  const got = Buffer.from(token);
  return expected.length === got.length && timingSafeEqual(expected, got);
}
