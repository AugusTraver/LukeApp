"use client";

import { RefreshCw, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Dog } from "./Dog";

/** Pantalla completa cuando no se puede cargar nada (sin internet o error del servidor). */
export function ErrorScreen({ kind, message, onRetry, onSignOut }: { kind: "offline" | "error"; message?: string; onRetry: () => void; onSignOut?: () => void }) {
  const [busy, setBusy] = useState(false);

  // Sin conexión: reintenta solo apenas vuelve internet.
  useEffect(() => {
    if (kind !== "offline") return;
    const on = () => onRetry();
    window.addEventListener("online", on);
    return () => window.removeEventListener("online", on);
  }, [kind, onRetry]);

  return (
    <main className="screen-center max-w-sm mx-auto">
      <Dog mood={kind === "offline" ? "sleep" : "sad"} size={180} sun={false} />
      <h1 className="display text-[2rem] mt-4">{kind === "offline" ? "Sin conexión" : "Algo no salió bien"}</h1>
      <p className="text-lg text-ink-2 mt-2 leading-relaxed">
        {kind === "offline"
          ? "Revisá que el celular tenga internet (wifi o datos). Apenas vuelva, la app se actualiza sola."
          : (message ?? "No pudimos cargar los datos de la familia.") + " Probá de nuevo en un momento."}
      </p>
      <div className="w-full flex flex-col gap-2 mt-8">
        <button
          className="btn btn-primary btn-lg"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            onRetry();
            setTimeout(() => setBusy(false), 1200);
          }}
        >
          <RefreshCw size={19} className={busy ? "animate-spin" : ""} /> Reintentar
        </button>
        {onSignOut && kind === "error" && (
          <button className="btn btn-ghost" onClick={onSignOut}>
            Salir y volver a entrar
          </button>
        )}
      </div>
    </main>
  );
}

/** Franja fija arriba cuando se muestran datos guardados porque no hay conexión. */
export function OfflineBanner() {
  return (
    <div className="sticky top-0 z-40 -mx-4 mb-3 px-4 py-2.5 bg-ink text-white text-[0.9375rem] flex items-center gap-2.5" role="status">
      <WifiOff size={18} className="shrink-0" />
      <span className="flex-1">Sin conexión. Ves lo último que se guardó; los cambios van a esperar a que vuelva internet.</span>
    </div>
  );
}
