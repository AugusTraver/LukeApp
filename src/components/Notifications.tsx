"use client";

import { BellOff, BellRing, Share } from "lucide-react";
import { useEffect, useState } from "react";
import { IconBadge } from "./ui";
import { useFamily } from "@/lib/useFamily";

type State = "loading" | "unsupported" | "needs-install" | "off" | "on" | "blocked";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export async function registerSW() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}

export function NotificationsCard({ toast }: { toast: (m: string) => void }) {
  const f = useFamily();
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("Notification" in window)) {
        setState(isIos() && !isStandalone() ? "needs-install" : "unsupported");
        return;
      }
      if (!("PushManager" in window)) {
        setState(isIos() && !isStandalone() ? "needs-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("blocked");
      const reg = await registerSW();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub && Notification.permission === "granted" ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "blocked" : "off");
        return;
      }
      const reg = (await registerSW())!;
      await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (key) {
        const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
        await f.store.savePushSubscription(f.data.family.id, f.me.id, sub.toJSON());
      }
      setState("on");
      await f.store.sendTestPush(f.data.family.id, f.me.id);
      toast("¡Avisos activados! Te mandamos uno de prueba.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudieron activar los avisos.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;

  const on = state === "on";
  return (
    <section className="card p-5">
      <div className="flex items-start gap-3.5">
        <IconBadge tone={on ? "moss" : "sun"}>{on ? <BellRing size={20} /> : <BellOff size={20} />}</IconBadge>
        <div className="flex-1">
          <h2 className="font-semibold text-lg">{on ? "Avisos activados" : "Activá los avisos"}</h2>
          <p className="text-ink-2 mt-0.5">
            {f.me.walks ? "Te avisamos 10 minutos antes y a la hora. Si no confirmás, seguimos insistiendo." : "Te avisamos si un paseo queda sin hacer."}
          </p>
        </div>
      </div>
      {state === "off" && (
        <button className="btn btn-primary btn-lg mt-4" disabled={busy} onClick={() => void enable()}>
          Activar avisos
        </button>
      )}
      {on && (
        <button className="btn btn-outline w-full mt-4" disabled={busy} onClick={() => void f.store.sendTestPush(f.data.family.id, f.me.id).then(() => toast("Enviado. Debería llegarte en unos segundos."))}>
          Mandarme un aviso de prueba
        </button>
      )}
      {state === "needs-install" && (
        <div className="mt-4 rounded-2xl bg-sunken p-4">
          <p className="font-semibold">En iPhone, primero instalá la app</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1.5 text-ink-2">
            <li>
              En Safari, tocá <span className="inline-flex items-center gap-1 font-semibold text-ink"><Share size={15} /> Compartir</span>.
            </li>
            <li>
              Elegí <span className="font-semibold text-ink">Agregar a inicio</span>.
            </li>
            <li>Abrí LukeApp desde el ícono nuevo y volvé a esta pantalla.</li>
          </ol>
        </div>
      )}
      {state === "blocked" && (
        <div className="mt-4 rounded-2xl bg-clay-soft p-4">
          <p className="font-semibold text-clay">Los avisos están bloqueados</p>
          <p className="mt-1 text-ink-2">
            Abrí los ajustes del celular, entrá a Notificaciones, buscá LukeApp (o tu navegador) y activalos. Después volvé a abrir la app.
          </p>
        </div>
      )}
      {state === "unsupported" && <p className="mt-4 text-ink-2">Este navegador no permite avisos. Probá con Chrome o instalando la app.</p>}
    </section>
  );
}
