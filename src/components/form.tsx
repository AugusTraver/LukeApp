"use client";

import { Check, Eye, EyeOff, Plus, Repeat, X } from "lucide-react";
import { useId, useState } from "react";
import { cap, dayName } from "@/lib/domain/dates";
import type { Member } from "@/lib/domain/types";
import { Avatar } from "./Avatar";
import { COATS, Dog, type DogCoat } from "./Dog";

/** Etiqueta + control + ayuda opcional. */
export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

/** Campo de texto con ícono a la izquierda. */
export function IconInput({ icon, ...props }: { icon: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className="field-wrap">
      <span className="field-icon" aria-hidden>
        {icon}
      </span>
      <input {...props} className={`field ${props.className ?? ""}`} />
    </span>
  );
}

export function PasswordInput({ icon, ...props }: { icon: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <span className="field-wrap">
      <span className="field-icon" aria-hidden>
        {icon}
      </span>
      <input {...props} type={show ? "text" : "password"} className="field !pr-12" />
      <button type="button" className="field-action" onClick={() => setShow((s) => !s)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}>
        {show ? <EyeOff size={19} /> : <Eye size={19} />}
      </button>
    </span>
  );
}

/** Control segmentado (dos o tres opciones excluyentes). */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string; icon?: React.ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)}>
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Tarjetas para elegir el pelaje del perro. */
export function CoatPicker({ value, onChange, compact = false }: { value: DogCoat; onChange: (c: DogCoat) => void; compact?: boolean }) {
  return (
    <div className={`grid gap-2.5 ${compact ? "grid-cols-4" : "grid-cols-2"}`} role="radiogroup" aria-label="Pelaje">
      {COATS.map((c) => {
        const on = value === c.id;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={c.label}
            className={`tap relative rounded-2xl bg-surface flex flex-col items-center transition-shadow ${compact ? "p-1" : "p-3 pb-3.5 gap-1"} ${on ? "ring-2 ring-pine shadow-[var(--shadow)]" : "ring-1 ring-line"}`}
            onClick={() => onChange(c.id)}
          >
            {on && (
              <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-pine text-white flex items-center justify-center">
                <Check size={13} strokeWidth={3} />
              </span>
            )}
            <Dog mood="happy" coat={c.id} size={compact ? 60 : 88} sun={false} />
            {!compact && <span className={`text-[0.9375rem] ${on ? "font-semibold text-ink" : "font-medium text-ink-2"}`}>{c.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Lista editable de horarios. */
export function TimesEditor({ times, onChange, large = false }: { times: string[]; onChange: (t: string[]) => void; large?: boolean }) {
  return (
    <div className="flex flex-col gap-2.5">
      {times.map((t, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="time"
            className={`field flex-1 tabular-nums font-semibold ${large ? "!text-[1.75rem] !min-h-16 text-center" : "!text-xl"}`}
            value={t}
            onChange={(e) => onChange(times.map((x, j) => (j === i ? e.target.value : x)))}
            aria-label={`Horario ${i + 1}`}
          />
          {times.length > 1 && (
            <button type="button" className="tap shrink-0 w-14 rounded-2xl bg-surface ring-1 ring-line text-ink-3 flex items-center justify-center" onClick={() => onChange(times.filter((_, j) => j !== i))} aria-label="Quitar horario">
              <X size={20} />
            </button>
          )}
        </div>
      ))}
      <button type="button" className="btn btn-dashed" onClick={() => onChange([...times, "08:00"])}>
        <Plus size={18} /> Sumar otro horario
      </button>
    </div>
  );
}

type Who = Pick<Member, "avatar" | "color" | "name">;

/** Para cada día: se turnan o lo saca siempre alguien. Se elige tocando la cara. */
export function FixedDaysEditor({ days, walkers, onChange }: { days: (string | null)[]; walkers: { key: string; member: Who }[]; onChange: (wd: number, key: string | null) => void }) {
  const id = useId();
  return (
    <div className="card divide-y divide-line">
      {days.map((sel, wd) => {
        const who = walkers.find((w) => w.key === sel);
        return (
          <div key={wd} className="flex items-center gap-3 px-4 py-3" role="radiogroup" aria-labelledby={`${id}-${wd}`}>
            <div className="w-[5.5rem] shrink-0">
              <p id={`${id}-${wd}`} className="font-semibold leading-tight">
                {cap(dayName(wd))}
              </p>
              <p className={`text-[0.8125rem] leading-tight mt-0.5 truncate ${who ? "text-pine font-medium" : "text-ink-3"}`}>{who ? who.member.name || "Sin nombre" : "Se turnan"}</p>
            </div>
            <div className="flex-1 flex items-center justify-end gap-1.5 overflow-x-auto -my-1 py-1 -mr-1 pr-1">
              <button
                type="button"
                role="radio"
                aria-checked={!who}
                aria-label="Se turnan"
                className={`tap h-10 w-10 shrink-0 rounded-full flex items-center justify-center transition-colors ${!who ? "bg-pine text-white" : "bg-sunken text-ink-3"}`}
                onClick={() => onChange(wd, null)}
              >
                <Repeat size={17} />
              </button>
              {walkers.map((w) => {
                const on = w.key === sel;
                return (
                  <button
                    key={w.key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={w.member.name || "Sin nombre"}
                    className={`tap shrink-0 rounded-full transition-[opacity,box-shadow] ${on ? "ring-2 ring-pine ring-offset-2 ring-offset-white" : who ? "opacity-45" : ""}`}
                    onClick={() => onChange(wd, w.key)}
                  >
                    <Avatar member={w.member} size={40} />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
