"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Member } from "@/lib/domain/types";

export const AVATARS = ["🧑🏻", "👦🏻", "👧🏻", "👩🏻", "👨🏻", "🧔🏻", "👵🏻", "👴🏻", "🧑🏽", "👩🏽", "👨🏽", "👧🏽", "👦🏽", "🧑🏾", "👩🏼‍🦰", "🧑🏼‍🦱"];
export const COLORS = ["#FDBA74", "#93C5FD", "#C4B5FD", "#86EFAC", "#FCA5A5", "#FDE68A", "#F9A8D4", "#A5F3FC"];
export const DOGS = ["🐕", "🐶", "🦮", "🐩", "🐕‍🦺", "🐾"];

export function Avatar({ member, size = 48, ring = false }: { member?: Pick<Member, "avatar" | "color" | "name">; size?: number; ring?: boolean }) {
  if (!member)
    return (
      <span
        className="inline-flex items-center justify-center rounded-full bg-[var(--line)] shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.5 }}
        aria-label="Sin responsable"
      >
        ❔
      </span>
    );
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full shrink-0 ${ring ? "ring-4 ring-white shadow-md" : ""}`}
      style={{ width: size, height: size, background: member.color, fontSize: size * 0.58, lineHeight: 1 }}
      aria-hidden
    >
      {member.avatar}
    </span>
  );
}

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
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[var(--line)]" aria-hidden />
        <div className="flex items-start justify-between gap-3">
          {title ? <h2 className="text-2xl font-black leading-tight pt-1">{title}</h2> : <span />}
          <button className="tap h-11 w-11 rounded-full bg-white text-xl shrink-0" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
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
      <div className="flex gap-4 my-4" aria-label={`${pin.length} de 4 números`}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-5 w-5 rounded-full border-[3px] transition-colors ${
              i < pin.length ? "bg-[var(--orange)] border-[var(--orange)]" : "border-[var(--ink-soft)]/40"
            }`}
          />
        ))}
      </div>
      <p className={`min-h-6 font-bold text-[var(--red)] ${error ? "" : "invisible"}`} role="alert">
        {error || "."}
      </p>
      <div className="grid grid-cols-3 gap-3 mt-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              className="tap h-[4.5rem] w-[4.5rem] rounded-full bg-white text-3xl font-extrabold shadow-[var(--shadow)] active:scale-95 transition-transform"
              onClick={() => (k === "⌫" ? setPin((p) => p.slice(0, -1)) : press(k))}
              aria-label={k === "⌫" ? "Borrar" : k}
            >
              {k}
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
    <div
      className="fixed left-1/2 -translate-x-1/2 bottom-28 z-[60] max-w-[90vw] rounded-2xl bg-[var(--ink)] px-5 py-3 text-white font-bold shadow-lg pop"
      role="status"
    >
      {message}
    </div>
  );
}

export function Pill({ children, tone = "soft" }: { children: ReactNode; tone?: "soft" | "green" | "red" | "yellow" | "gray" }) {
  const tones = {
    soft: "bg-[var(--orange-soft)] text-[var(--orange-deep)]",
    green: "bg-[var(--green-soft)] text-[var(--green)]",
    red: "bg-[var(--red-soft)] text-[var(--red)]",
    yellow: "bg-[var(--yellow-soft)] text-[#8a6100]",
    gray: "bg-[var(--line)] text-[var(--ink-soft)]",
  };
  return <span className={`chip ${tones[tone]}`}>{children}</span>;
}
