"use client";

import { Delete, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export { Avatar } from "./Avatar";

export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" aria-hidden />
        <div className="flex items-start justify-between gap-3">
          {title ? <h2 className="display text-[1.75rem] pt-0.5">{title}</h2> : <span />}
          <button className="tap h-10 w-10 rounded-full bg-sunken flex items-center justify-center shrink-0" onClick={onClose} aria-label="Cerrar">
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </>
  );
}

/** Teclado numérico grande para el PIN de 4 números. */
export function PinPad({ onDone, error, busy }: { onDone: (pin: string) => void; error?: string | null; busy?: boolean }) {
  const [pin, setPin] = useState("");
  const press = (d: string) => {
    if (busy || pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      onDone(next);
      setTimeout(() => setPin(""), 350);
    }
  };
  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-4 mt-6 mb-2" aria-label={`${pin.length} de 4 números`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-3.5 w-3.5 rounded-full transition-colors ${i < pin.length ? "bg-pine" : "bg-line"}`} />
        ))}
      </div>
      <p className={`min-h-6 text-[0.9375rem] font-medium text-clay ${error ? "" : "invisible"}`} role="alert">
        {error || "."}
      </p>
      <div className="grid grid-cols-3 gap-x-6 gap-y-3 mt-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              className="tap h-[4.5rem] w-[4.5rem] rounded-full bg-surface text-[1.75rem] font-medium shadow-[var(--shadow-sm)] active:bg-sunken transition-colors flex items-center justify-center"
              onClick={() => (k === "del" ? setPin((p) => p.slice(0, -1)) : press(k))}
              aria-label={k === "del" ? "Borrar" : k}
            >
              {k === "del" ? <Delete size={24} strokeWidth={1.75} /> : k}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-28 z-[60] max-w-[90vw] rounded-2xl bg-ink px-5 py-3.5 text-white font-medium shadow-lg rise" role="status">
      {message}
    </div>
  );
}

export function Tag({ children, tone = "neutral", icon }: { children: ReactNode; tone?: "neutral" | "moss" | "clay" | "sun" | "pine"; icon?: ReactNode }) {
  const tones = {
    neutral: "bg-sunken text-ink-2",
    moss: "bg-moss-soft text-moss",
    clay: "bg-clay-soft text-clay",
    sun: "bg-sun-soft text-[#8a5a17]",
    pine: "bg-pine-soft text-pine",
  };
  return (
    <span className={`tag ${tones[tone]}`}>
      {icon}
      {children}
    </span>
  );
}

/** Ícono dentro de un círculo suave, para encabezar avisos y opciones. */
export function IconBadge({ children, tone = "pine", size = 40 }: { children: ReactNode; tone?: "pine" | "moss" | "clay" | "sun"; size?: number }) {
  const tones = { pine: "bg-pine-soft text-pine", moss: "bg-moss-soft text-moss", clay: "bg-clay-soft text-clay", sun: "bg-sun-soft text-[#8a5a17]" };
  return (
    <span className={`inline-flex items-center justify-center rounded-full shrink-0 ${tones[tone]}`} style={{ width: size, height: size }} aria-hidden>
      {children}
    </span>
  );
}
