"use client";

import { BellOff, BellRing, Check, ChevronRight, Download, EllipsisVertical, MonitorSmartphone, PlusSquare, Share, Smartphone, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useFamily } from "@/lib/useFamily";
import { IconBadge, Sheet } from "./ui";

/* ================= Plataforma e instalación ================= */

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferredPrompt: PromptEvent | null = null;
const promptListeners = new Set<() => void>();
if (typeof window !== "undefined") {
  // Android/Chrome: guardamos el pedido de instalación para mostrar nuestro propio botón.
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as PromptEvent;
    promptListeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    promptListeners.forEach((l) => l());
  });
}

export function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
function isAndroid() {
  return /android/i.test(navigator.userAgent);
}
export function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export type Platform = "ios" | "android" | "desktop";

export function usePlatform() {
  const [info, setInfo] = useState<{ platform: Platform; standalone: boolean; canPrompt: boolean; iosOtherBrowser: boolean } | null>(null);
  useEffect(() => {
    const read = () =>
      setInfo({
        platform: isIos() ? "ios" : isAndroid() ? "android" : "desktop",
        standalone: isStandalone(),
        canPrompt: !!deferredPrompt,
        iosOtherBrowser: isIos() && /crios|fxios|edgios/i.test(navigator.userAgent),
      });
    read();
    promptListeners.add(read);
    return () => void promptListeners.delete(read);
  }, []);
  const prompt = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    promptListeners.forEach((l) => l());
    return outcome === "accepted";
  }, []);
  return { info, prompt };
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3.5">
      <span className="h-8 w-8 shrink-0 rounded-full bg-pine text-white font-semibold flex items-center justify-center tabular-nums">{n}</span>
      <div className="pt-1 text-ink-2 leading-relaxed">{children}</div>
    </li>
  );
}
const Strong = ({ children }: { children: React.ReactNode }) => <span className="inline-flex items-center gap-1 font-semibold text-ink align-middle">{children}</span>;

export function InstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { info, prompt } = usePlatform();
  const [tab, setTab] = useState<Platform | null>(null);
  const platform = tab ?? info?.platform ?? "android";
  return (
    <Sheet open={open} onClose={onClose} title="Instalar LukeApp">
      <p className="text-ink-2">Queda como una app más en la pantalla de inicio. Así se abre al toque y los avisos llegan aunque no la tengas abierta.</p>
      <div className="segmented mt-5" role="tablist" aria-label="Tipo de celular">
        {(
          [
            ["ios", "iPhone"],
            ["android", "Android"],
            ["desktop", "Computadora"],
          ] as [Platform, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={platform === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {info?.standalone ? (
        <div className="mt-6 rounded-2xl bg-moss-soft p-4 flex items-center gap-3">
          <Check size={20} className="text-moss" />
          <p className="font-medium">Ya la estás usando instalada. No hace falta nada más.</p>
        </div>
      ) : platform === "ios" ? (
        <ol className="flex flex-col gap-4 mt-6">
          {info?.iosOtherBrowser && <p className="rounded-2xl bg-sun-soft p-3.5 text-[0.9375rem]">Si estás en Chrome, el botón Compartir está arriba a la derecha. En Safari está abajo, en el medio.</p>}
          <Step n={1}>
            Tocá el botón{" "}
            <Strong>
              <Share size={16} /> Compartir
            </Strong>
            .
          </Step>
          <Step n={2}>
            Deslizá hacia abajo y elegí{" "}
            <Strong>
              <PlusSquare size={16} /> Agregar a inicio
            </Strong>
            . Después tocá <Strong>Agregar</Strong>.
          </Step>
          <Step n={3}>
            Abrí <Strong>LukeApp</Strong> desde el ícono nuevo de la pantalla de inicio y activá los avisos. En iPhone, los avisos solo funcionan así.
          </Step>
        </ol>
      ) : platform === "android" ? (
        <>
          {info?.canPrompt ? (
            <button
              className="btn btn-primary btn-lg mt-6"
              onClick={async () => {
                if (await prompt()) onClose();
              }}
            >
              <Download size={19} /> Instalar ahora
            </button>
          ) : null}
          <ol className="flex flex-col gap-4 mt-6">
            <Step n={1}>
              En Chrome, tocá el menú{" "}
              <Strong>
                <EllipsisVertical size={16} />
              </Strong>{" "}
              arriba a la derecha.
            </Step>
            <Step n={2}>
              Elegí <Strong>Instalar aplicación</Strong> (o <Strong>Agregar a la pantalla principal</Strong>) y confirmá.
            </Step>
            <Step n={3}>
              Abrí <Strong>LukeApp</Strong> desde el ícono nuevo y activá los avisos.
            </Step>
          </ol>
        </>
      ) : (
        <ol className="flex flex-col gap-4 mt-6">
          {info?.canPrompt && (
            <button
              className="btn btn-primary btn-lg"
              onClick={async () => {
                if (await prompt()) onClose();
              }}
            >
              <Download size={19} /> Instalar ahora
            </button>
          )}
          <Step n={1}>
            En Chrome o Edge, buscá el ícono{" "}
            <Strong>
              <MonitorSmartphone size={16} /> Instalar
            </Strong>{" "}
            a la derecha de la barra de direcciones.
          </Step>
          <Step n={2}>Tocá Instalar. LukeApp se abre en su propia ventana.</Step>
          <Step n={3}>Para los avisos del paseo, lo mejor es instalarla también en el celular.</Step>
        </ol>
      )}
      <button className="btn btn-outline btn-lg mt-7" onClick={onClose}>
        Listo
      </button>
    </Sheet>
  );
}

/* ================= Avisos (push) ================= */

type PushState = "loading" | "unsupported" | "needs-install" | "off" | "on" | "blocked";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function registerSW() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}

const testedKey = (memberId: string) => `lukeapp.pushTested.${memberId}`;
function readFlag(key: string) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function usePush() {
  const f = useFamily();
  const [state, setState] = useState<PushState>("loading");
  const [tested, setTestedState] = useState(() => readFlag(testedKey(f.me.id)));

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("Notification" in window) || !("PushManager" in window)) {
        setState(isIos() && !isStandalone() ? "needs-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("blocked");
      const reg = await registerSW();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub && Notification.permission === "granted" ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, [f.me.id]);

  const setTested = useCallback(
    (v: boolean) => {
      setTestedState(v);
      try {
        localStorage.setItem(testedKey(f.me.id), v ? "1" : "0");
      } catch {
        /* sin almacenamiento */
      }
    },
    [f.me.id],
  );

  const enable = useCallback(async () => {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setState(perm === "denied" ? "blocked" : "off");
      return false;
    }
    const reg = (await registerSW())!;
    await navigator.serviceWorker.ready;
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (key) {
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
      await f.store.savePushSubscription(f.data.family.id, f.me.id, sub.toJSON());
    }
    setState("on");
    return true;
  }, [f.store, f.data.family.id, f.me.id]);

  const test = useCallback(() => f.store.sendTestPush(f.data.family.id, f.me.id), [f.store, f.data.family.id, f.me.id]);

  return { state, enable, test, tested, setTested };
}

/** Qué hacer si el aviso de prueba no llegó. */
function NotArrivedTips({ platform }: { platform?: Platform }) {
  return (
    <div className="mt-3 rounded-2xl bg-sun-soft p-4 text-[0.9375rem]">
      <p className="font-semibold">Si no te llegó, revisá:</p>
      <ul className="list-disc pl-5 mt-1.5 space-y-1 text-ink-2">
        <li>Que el celular no esté en modo No molestar o Concentración.</li>
        <li>En Ajustes → Notificaciones → {platform === "ios" ? "LukeApp" : "Chrome o LukeApp"}: que estén permitidas, con sonido.</li>
        {platform === "android" && <li>Que el ahorro de batería no tenga restringida la app.</li>}
        <li>Esperá un minuto y probá de nuevo: a veces tarda.</li>
      </ul>
    </div>
  );
}

/** Tarjeta en Familia: estado de los avisos y prueba. */
export function NotificationsCard({ toast }: { toast: (m: string) => void }) {
  const f = useFamily();
  const { state, enable, test } = usePush();
  const [busy, setBusy] = useState(false);
  const [installing, setInstalling] = useState(false);

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
        <button
          className="btn btn-primary btn-lg mt-4"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              if (await enable()) {
                await test();
                toast("Avisos activados. Te mandamos uno de prueba.");
              }
            } catch (e) {
              toast(e instanceof Error ? e.message : "No se pudieron activar los avisos.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Activar avisos
        </button>
      )}
      {on && (
        <button className="btn btn-outline w-full mt-4" disabled={busy} onClick={() => void test().then(() => toast("Enviado. Debería llegarte en unos segundos."))}>
          Mandarme un aviso de prueba
        </button>
      )}
      {state === "needs-install" && (
        <button className="btn btn-primary btn-lg mt-4" onClick={() => setInstalling(true)}>
          <Smartphone size={19} /> Primero, instalar la app
        </button>
      )}
      {state === "blocked" && <BlockedHelp />}
      {state === "unsupported" && <p className="mt-4 text-ink-2">Este navegador no permite avisos. Probá con Chrome o instalando la app.</p>}
      <InstallSheet open={installing} onClose={() => setInstalling(false)} />
    </section>
  );
}

function BlockedHelp() {
  return (
    <div className="mt-4 rounded-2xl bg-clay-soft p-4">
      <p className="font-semibold text-clay">Los avisos están bloqueados</p>
      <p className="mt-1 text-ink-2">Abrí los ajustes del celular, entrá a Notificaciones, buscá LukeApp (o tu navegador) y activalos. Después volvé a abrir la app.</p>
    </div>
  );
}

/* ================= "Prepará tu celular" (antes del primer paseo) ================= */

const dismissKey = (memberId: string) => `lukeapp.setupDone.${memberId}`;

/** Lista de 3 pasos en Hoy: instalar, activar avisos y probar que llegan. Se va sola al terminar. */
export function SetupChecklist({ toast }: { toast: (m: string) => void }) {
  const f = useFamily();
  const { info } = usePlatform();
  const push = usePush();
  const [installing, setInstalling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [notArrived, setNotArrived] = useState(false);
  const [dismissed, setDismissed] = useState(() => readFlag(dismissKey(f.me.id)));

  if (!info || push.state === "loading" || dismissed) return null;

  const needsInstall = info.platform !== "desktop" && !info.standalone;
  const installed = !needsInstall;
  const on = push.state === "on";
  const allDone = installed && on && push.tested;
  if (allDone || push.state === "unsupported") return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(dismissKey(f.me.id), "1");
    } catch {
      /* sin almacenamiento */
    }
  };

  const row = (done: boolean, current: boolean, title: string, text: string, action?: React.ReactNode) => (
    <li className="flex gap-3.5 py-3.5 first:pt-0 last:pb-0">
      <span className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center ${done ? "bg-moss text-white" : current ? "ring-2 ring-pine" : "ring-1 ring-line"}`}>{done && <Check size={15} strokeWidth={3} />}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold ${done ? "text-ink-3 line-through decoration-1" : ""}`}>{title}</p>
        {!done && <p className="text-ink-2 text-[0.9375rem] mt-0.5">{text}</p>}
        {!done && current && action}
      </div>
    </li>
  );

  const step = !installed ? 0 : !on ? 1 : 2;

  return (
    <section className="card p-5" aria-label="Prepará tu celular">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h2 className="display text-[1.5rem]">Prepará tu celular</h2>
          <p className="text-ink-2 mt-1">Antes del primer paseo, asegurate de que te lleguen los avisos.</p>
        </div>
        <button className="tap h-9 w-9 -mr-1 -mt-1 rounded-full text-ink-3 flex items-center justify-center" onClick={dismiss} aria-label="Ocultar">
          <X size={18} />
        </button>
      </div>
      <ol className="mt-4 divide-y divide-line">
        {row(
          installed,
          step === 0,
          "Instalar la app",
          info.platform === "ios" ? "En iPhone, los avisos solo llegan con la app instalada." : "Queda en la pantalla de inicio y los avisos llegan mejor.",
          <button className="btn btn-primary mt-3 w-full" onClick={() => setInstalling(true)}>
            Ver cómo se instala <ChevronRight size={18} />
          </button>,
        )}
        {row(
          on,
          step === 1,
          "Activar los avisos",
          "Te avisamos antes del paseo y si alguien no puede.",
          push.state === "blocked" ? (
            <BlockedHelp />
          ) : (
            <button
              className="btn btn-primary mt-3 w-full"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await push.enable();
                } catch (e) {
                  toast(e instanceof Error ? e.message : "No se pudieron activar los avisos.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Activar avisos
            </button>
          ),
        )}
        {row(
          push.tested,
          step === 2,
          "Probar que llegan",
          "Te mandamos un aviso de prueba, igual a los del paseo.",
          waiting ? (
            <div className="mt-3">
              <p className="font-medium">¿Te llegó el aviso?</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    push.setTested(true);
                    setWaiting(false);
                    toast("Listo. Ya estás para el primer paseo.");
                  }}
                >
                  Sí, llegó
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    setNotArrived(true);
                    setWaiting(false);
                  }}
                >
                  No llegó
                </button>
              </div>
            </div>
          ) : (
            <>
              {notArrived && <NotArrivedTips platform={info.platform} />}
              <button
                className="btn btn-primary mt-3 w-full"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await push.test();
                    setWaiting(true);
                  } catch {
                    toast("No se pudo mandar. Revisá la conexión.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {notArrived ? "Probar de nuevo" : "Mandarme una prueba"}
              </button>
            </>
          ),
        )}
      </ol>
      <InstallSheet open={installing} onClose={() => setInstalling(false)} />
    </section>
  );
}
