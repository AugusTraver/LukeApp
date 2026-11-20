"use client";

import { useEffect, useState } from "react";
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

  return (
    <section className={`card p-4 ${state === "on" ? "" : "border-[3px] border-[var(--orange)]"}`}>
      <div className="flex items-center gap-3">
        <span className="text-4xl" aria-hidden>
          {state === "on" ? "🔔" : "🔕"}
        </span>
        <div className="flex-1">
          <h2 className="text-xl font-black">{state === "on" ? "Avisos activados" : "Activá los avisos"}</h2>
          <p className="text-[var(--ink-soft)] font-semibold text-sm">
            {f.me.walks ? "Te avisamos 10 minutos antes, a la hora, y seguimos insistiendo hasta que confirmes." : "Te avisamos si un paseo queda sin hacer."}
          </p>
        </div>
      </div>
      {state === "off" && (
        <button className="btn btn-primary btn-big mt-3" disabled={busy} onClick={() => void enable()}>
          🔔 Activar avisos
        </button>
      )}
      {state === "on" && (
        <button className="btn btn-white w-full mt-3" disabled={busy} onClick={() => void f.store.sendTestPush(f.data.family.id, f.me.id).then(() => toast("Enviado. Debería llegarte en unos segundos."))}>
          Probar un aviso
        </button>
      )}
      {state === "needs-install" && (
        <div className="mt-3 rounded-2xl bg-[var(--bg-deep)] p-3 font-semibold">
          <p className="font-extrabold">En iPhone, primero instalá la app:</p>
          <ol className="list-decimal pl-5 mt-1 space-y-1">
            <li>
              Tocá el botón <b>Compartir</b> (el cuadrado con la flecha ⬆️) abajo en Safari.
            </li>
            <li>
              Elegí <b>“Agregar a inicio”</b>.
            </li>
            <li>Abrí LukeApp desde el ícono nuevo y volvé acá.</li>
          </ol>
        </div>
      )}
      {state === "blocked" && (
        <div className="mt-3 rounded-2xl bg-[var(--red-soft)] p-3 font-semibold">
          <p className="font-extrabold">Los avisos están bloqueados</p>
          <p className="mt-1">
            Entrá a los <b>Ajustes</b> del celular → <b>Notificaciones</b> → buscá <b>LukeApp</b> (o tu navegador) y activalos. Después volvé a abrir la app.
          </p>
        </div>
      )}
      {state === "unsupported" && <p className="mt-3 font-semibold text-[var(--ink-soft)]">Este navegador no permite avisos. Probá con Chrome o instalando la app.</p>}
    </section>
  );
}
